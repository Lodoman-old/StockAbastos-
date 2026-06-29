import { query, execute } from "../db";

interface EscaneoResult {
    valido: boolean;
    lote?: any;
    error?: string;
}

export async function validarEscaneoLocal(
    codigoBarras: string,
    bodegaId: string
): Promise<EscaneoResult> {
    if (!codigoBarras || !codigoBarras.trim()) {
        return { valido: false, error: "Código vacío" };
    }

    const lotes = await query(
        `SELECT l.*, p.nombre AS producto_nombre, p.sku
         FROM lotes_snapshot l
         JOIN productos p ON p.id = l.producto_id
         WHERE l.codigo_lote = ? AND l.bodega_id = ?`,
        [codigoBarras.trim(), bodegaId]
    );

    if (!lotes.length) {
        return { valido: false, error: "Lote no encontrado en este almacén" };
    }

    const lote = lotes[0];

    if (lote.estado !== "DISPONIBLE" && lote.estado !== "APARTADO") {
        return {
            valido: false,
            error: `Lote no disponible (estado: ${lote.estado})`,
        };
    }

    if (parseFloat(lote.cantidad_actual_kg) <= 0) {
        return {
            valido: false,
            error: "Lote sin inventario disponible",
        };
    }

    return { valido: true, lote };
}

export async function registrarEscaneoOffline(params: {
    batchUuid: string;
    loteId: string;
    codigoLote: string;
    cantidadKg: number;
    bodegaOrigenId: string;
    bodegaDestinoId: string;
}) {
    await execute(
        `INSERT INTO sync_queue (batch_uuid, tipo_operacion, lote_id, codigo_lote,
         cantidad_kg, bodega_origen_id, bodega_destino_id, timestamp, procesado)
         VALUES (?, 'TRASPASO', ?, ?, ?, ?, ?, datetime('now'), 0)`,
        [
            params.batchUuid,
            params.loteId,
            params.codigoLote,
            params.cantidadKg,
            params.bodegaOrigenId,
            params.bodegaDestinoId,
        ]
    );

    // Actualizar estado local de forma optimista
    await execute(
        "UPDATE lotes_snapshot SET estado = 'APARTADO' WHERE id = ?",
        [params.loteId]
    );
}

export async function registrarRecepcionOffline(params: {
    batchUuid: string;
    loteId: string;
    codigoLote: string;
    cantidadKg: number;
    bodegaOrigenId: string;
    bodegaDestinoId: string;
}) {
    await execute(
        `INSERT INTO sync_queue (batch_uuid, tipo_operacion, lote_id, codigo_lote,
         cantidad_kg, bodega_origen_id, bodega_destino_id, timestamp, procesado)
         VALUES (?, 'TRASPASO_RECEPCION', ?, ?, ?, ?, ?, datetime('now'), 0)`,
        [
            params.batchUuid,
            params.loteId,
            params.codigoLote,
            params.cantidadKg,
            params.bodegaOrigenId,
            params.bodegaDestinoId,
        ]
    );

    await execute(
        "UPDATE lotes_snapshot SET estado = 'DISPONIBLE' WHERE id = ?",
        [params.loteId]
    );
}

export async function getLotesDisponibles(bodegaId: string) {
    return query(
        `SELECT l.*, p.nombre AS producto_nombre, p.sku
         FROM lotes_snapshot l
         JOIN productos p ON p.id = l.producto_id
         WHERE l.bodega_id = ? AND l.estado IN ('DISPONIBLE')
         ORDER BY l.fecha_caducidad ASC`,
        [bodegaId]
    );
}
