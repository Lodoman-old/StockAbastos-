import { PoolClient } from "pg";
import { query, transaction } from "../db.js";

interface BatchPayload {
    batch_uuid: string;
    dispositivo_id: string;
    snapshot_version: number;
    operacion: string;
    movimientos: Array<{
        lote_id: string;
        codigo_lote: string;
        cantidad_kg: number;
        bodega_origen?: string;
        bodega_destino?: string;
        timestamp: string;
    }>;
}

interface Conflicto {
    lote_id: string;
    codigo_lote: string;
    cantidad_solicitada: number;
    cantidad_disponible: number;
}

export async function generarSnapshot(bodega_id: string) {
    const version = await query<{ max: number | null }>(
        "SELECT COALESCE(MAX(version), 0) + 1 AS max FROM sync_snapshots"
    );
    const nuevaVersion = version.rows[0].max;

    await query("INSERT INTO sync_snapshots (version, bodega_id) VALUES ($1, $2)", [nuevaVersion, bodega_id]);

    const lotes = await query(`
        SELECT l.id, l.codigo_lote, l.producto_id, p.sku, p.nombre AS producto_nombre,
               l.cantidad_actual_kg, l.estado, l.fecha_caducidad, l.bodega_id
        FROM lotes l
        JOIN productos p ON p.id = l.producto_id
        WHERE l.bodega_id = $1
          AND l.estado IN ('DISPONIBLE', 'APARTADO')
          AND l.cantidad_actual_kg > 0
        ORDER BY l.fecha_caducidad ASC
    `, [bodega_id]);

    const productos = await query(
        "SELECT * FROM productos WHERE activo = TRUE ORDER BY nombre"
    );

    return {
        version: nuevaVersion,
        bodega_id,
        lotes: lotes.rows,
        productos: productos.rows,
        generado_en: new Date().toISOString(),
    };
}

export async function procesarBatch(payload: BatchPayload) {
    const existente = await query(
        "SELECT * FROM sync_batches WHERE batch_uuid = $1",
        [payload.batch_uuid]
    );

    if (existente.rows.length > 0) {
        const batch = existente.rows[0];
        if (batch.estado === "CONFIRMADO") {
            return { status: "DUPLICATE", mensaje: "Batch ya procesado" };
        }
        return { status: "OK", mensaje: "Batch ya registrado" };
    }

    await query(
        `INSERT INTO sync_batches (batch_uuid, dispositivo_id, snapshot_version, operacion, payload, estado)
         VALUES ($1, $2, $3, $4, $5, 'PROCESANDO')`,
        [payload.batch_uuid, payload.dispositivo_id, payload.snapshot_version, payload.operacion, JSON.stringify(payload)]
    );

    const conflictos: Conflicto[] = [];

    try {
        await transaction(async (client) => {
            for (const mov of payload.movimientos) {
                const loteRes = await client.query(
                    "SELECT * FROM lotes WHERE id = $1 FOR UPDATE",
                    [mov.lote_id]
                );

                if (!loteRes.rows.length) {
                    conflictos.push({
                        lote_id: mov.lote_id,
                        codigo_lote: mov.codigo_lote,
                        cantidad_solicitada: mov.cantidad_kg,
                        cantidad_disponible: 0,
                    });
                    continue;
                }

                const lote = loteRes.rows[0];

                if (payload.operacion === "TRASPASO_RECEPCION") {
                    if (lote.estado !== "TRANSITO") {
                        conflictos.push({
                            lote_id: mov.lote_id,
                            codigo_lote: mov.codigo_lote,
                            cantidad_solicitada: mov.cantidad_kg,
                            cantidad_disponible: parseFloat(lote.cantidad_actual_kg),
                        });
                        continue;
                    }

                    const kgAceptados = mov.cantidad_kg > 0 ? mov.cantidad_kg : parseFloat(lote.cantidad_actual_kg);

                    await client.query(
                        "UPDATE lotes SET estado = 'DISPONIBLE', bodega_id = $1, updated_at = NOW() WHERE id = $2",
                        [mov.bodega_destino, mov.lote_id]
                    );

                    const pesoResult = await client.query(
                        "SELECT peso_estimado_kg FROM productos WHERE id = $1",
                        [lote.producto_id]
                    );
                    const peso_estimado_kg = pesoResult.rows[0]?.peso_estimado_kg
                        ? parseFloat(pesoResult.rows[0].peso_estimado_kg)
                        : null;
                    const total_cajas = peso_estimado_kg && peso_estimado_kg > 0
                        ? Math.ceil(kgAceptados / peso_estimado_kg)
                        : 0;

                    await client.query(
                        `INSERT INTO stock_bodega (bodega_id, producto_id, cantidad_kg, cantidad_cajas)
                         VALUES ($1, $2, $3, $4)
                         ON CONFLICT (bodega_id, producto_id)
                         DO UPDATE SET cantidad_kg = stock_bodega.cantidad_kg + $3,
                                       cantidad_cajas = stock_bodega.cantidad_cajas + $4`,
                        [mov.bodega_destino, lote.producto_id, kgAceptados, total_cajas]
                    );

                    await client.query(
                        `UPDATE stock_bodega SET cantidad_kg = GREATEST(cantidad_kg - $1, 0),
                                cantidad_cajas = GREATEST(cantidad_cajas - $2, 0), updated_at = NOW()
                         WHERE bodega_id = $3 AND producto_id = $4`,
                        [kgAceptados, total_cajas, mov.bodega_origen, lote.producto_id]
                    );

                    await client.query(
                        `INSERT INTO movimientos (lote_id, tipo, bodega_origen_id, bodega_destino_id, cantidad_kg, referencia)
                         VALUES ($1, 'TRASPASO_ENTRADA', $2, $3, $4, $5)`,
                        [mov.lote_id, mov.bodega_origen, mov.bodega_destino, kgAceptados, payload.batch_uuid]
                    );
                } else {
                    const disponible = parseFloat(lote.cantidad_actual_kg);

                    if (disponible < mov.cantidad_kg) {
                        conflictos.push({
                            lote_id: mov.lote_id,
                            codigo_lote: mov.codigo_lote,
                            cantidad_solicitada: mov.cantidad_kg,
                            cantidad_disponible: disponible,
                        });
                        continue;
                    }

                    const nuevaCantidad = disponible - mov.cantidad_kg;
                    const nuevoEstado = nuevaCantidad <= 0 ? "VENDIDO" : "TRANSITO";

                    await client.query(
                        "UPDATE lotes SET cantidad_actual_kg = $1, estado = $2, updated_at = NOW() WHERE id = $3",
                        [Math.max(0, nuevaCantidad), nuevoEstado, mov.lote_id]
                    );

                    await client.query(
                        `INSERT INTO movimientos (lote_id, tipo, bodega_origen_id, bodega_destino_id, cantidad_kg, referencia)
                         VALUES ($1, 'TRASPASO_SALIDA', $2, $3, $4, $5)`,
                        [mov.lote_id, mov.bodega_origen, mov.bodega_destino, mov.cantidad_kg, payload.batch_uuid]
                    );

                    if (nuevaCantidad <= 0) {
                        await client.query(
                            `UPDATE stock_bodega SET cantidad_kg = GREATEST(cantidad_kg - $1, 0), updated_at = NOW()
                             WHERE bodega_id = $2 AND producto_id = $3`,
                            [mov.cantidad_kg, mov.bodega_origen, lote.producto_id]
                        );
                    }
                }
            }

            if (conflictos.length === 0) {
                await client.query(
                    "UPDATE sync_batches SET estado = 'CONFIRMADO', processed_at = NOW() WHERE batch_uuid = $1",
                    [payload.batch_uuid]
                );
            } else {
                await client.query(
                    "UPDATE sync_batches SET estado = 'RECHAZADO', conflictos = $1, processed_at = NOW() WHERE batch_uuid = $2",
                    [JSON.stringify(conflictos), payload.batch_uuid]
                );
            }
        });

        if (conflictos.length > 0) {
            return { status: "CONFLICT", conflictos };
        }

        return { status: "OK" };
    } catch (error: any) {
        await query(
            "UPDATE sync_batches SET estado = 'RECHAZADO', conflictos = $1 WHERE batch_uuid = $2",
            [JSON.stringify([{ error: error.message }]), payload.batch_uuid]
        );
        throw error;
    }
}

export async function consultarBatch(batchUuid: string) {
    const result = await query("SELECT * FROM sync_batches WHERE batch_uuid = $1", [batchUuid]);
    return result.rows[0] || null;
}
