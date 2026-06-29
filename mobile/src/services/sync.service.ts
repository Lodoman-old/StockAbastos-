import { getApiBase } from "./api.config";
import { query, execute } from "../db";

export async function descargarSnapshot(bodegaId: string) {
    const res = await fetch(`${getApiBase()}/sync/snapshot`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ bodega_id: bodegaId }),
    });

    if (!res.ok) throw new Error("Error al descargar snapshot");
    const data = await res.json();

    await execute("DELETE FROM lotes_sync");
    for (const lote of data.lotes) {
        await execute(
            "INSERT INTO lotes_sync (id, codigo_lote, producto_id, producto_nombre, cantidad_actual_kg, bodega_id, fecha_caducidad) VALUES (?,?,?,?,?,?,?)",
            [lote.id, lote.codigo_lote, lote.producto_id, lote.producto_nombre, lote.cantidad_actual_kg, lote.bodega_id, lote.fecha_caducidad]
        );
    }

    return data;
}

export async function enviarBatch(payload: any) {
    const res = await fetch(`${getApiBase()}/sync/batch`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Error de conexión" }));
        throw new Error(err.message || `Error ${res.status}`);
    }

    return res.json();
}

export async function sincronizarPendientes() {
    const pendientes = await query(
        "SELECT * FROM sync_queue WHERE procesado = 0 ORDER BY created_at ASC LIMIT 10"
    );

    if (pendientes.length === 0) return [];

    const grupos: Record<string, any[]> = {};
    for (const row of pendientes) {
        if (!grupos[row.batch_uuid]) grupos[row.batch_uuid] = [];
        grupos[row.batch_uuid].push(row);
    }

    const resultados = [];

    for (const [batchUuid, movimientos] of Object.entries(grupos)) {
        const operacion = movimientos[0].tipo_operacion;
        try {
            const payload = {
                batch_uuid: batchUuid,
                dispositivo_id: "mobile",
                snapshot_version: 1,
                operacion,
                movimientos: movimientos.map((m: any) => ({
                    lote_id: m.lote_id,
                    codigo_lote: m.codigo_lote,
                    cantidad_kg: m.cantidad_kg || 0,
                    bodega_origen: m.bodega_origen_id,
                    bodega_destino: m.bodega_destino_id,
                    timestamp: m.timestamp || new Date().toISOString(),
                })),
            };

            const res = await enviarBatch(payload);
            const ids = movimientos.map(m => m.id);

            if (res.status === "OK" || res.status === "DUPLICATE") {
                await execute(
                    `UPDATE sync_queue SET procesado = 1, error = NULL WHERE id IN (${ids.map(() => "?").join(",")})`,
                    ids
                );
                resultados.push({ batchUuid, status: "OK", res });
            } else if (res.status === "CONFLICT") {
                for (const m of movimientos) {
                    await execute(
                        "UPDATE sync_queue SET error = ?, intentos = intentos + 1 WHERE id = ?",
                        [JSON.stringify(res.conflictos), m.id]
                    );
                }
                resultados.push({ batchUuid, status: "CONFLICT", conflictos: res.conflictos });
            }
        } catch (err: any) {
            for (const m of movimientos) {
                await execute(
                    "UPDATE sync_queue SET error = ?, intentos = intentos + 1 WHERE id = ?",
                    [err.message, m.id]
                );
            }
            resultados.push({ batchUuid, status: "ERROR", error: err.message });
        }
    }

    return resultados;
}
