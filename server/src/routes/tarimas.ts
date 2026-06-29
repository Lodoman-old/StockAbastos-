import { FastifyInstance } from "fastify";
import { query } from "../db.js";
import QRCode from "qrcode";

export async function cascadeLoteEstado(loteId: string) {
    const lote = (await query("SELECT lote_padre_id FROM lotes WHERE id = $1", [loteId])).rows[0];
    if (!lote) return;

    const pendientes = await query("SELECT COUNT(*)::int AS count FROM tarimas WHERE lote_id = $1 AND estado = 'PENDIENTE'", [loteId]);
    const parcial = await query("SELECT COUNT(*)::int AS count FROM tarimas WHERE lote_id = $1 AND estado = 'PARCIAL'", [loteId]);
    const recibidas = await query("SELECT COUNT(*)::int AS count FROM tarimas WHERE lote_id = $1 AND estado = 'RECIBIDA'", [loteId]);
    const enTransito = await query("SELECT COUNT(*)::int AS count FROM tarimas WHERE lote_id = $1 AND estado IN ('EN_TRANSITO')", [loteId]);
    const vendidasMerma = await query("SELECT COUNT(*)::int AS count FROM tarimas WHERE lote_id = $1 AND estado IN ('VENDIDA','MERMA')", [loteId]);

    const totalDisponibles = parcial.rows[0]?.count + recibidas.rows[0]?.count + pendientes.rows[0]?.count + enTransito.rows[0]?.count;

    let nuevoEstado = null;
    if (totalDisponibles === 0 && vendidasMerma.rows[0]?.count > 0) {
        nuevoEstado = 'VENDIDO';
    } else if (pendientes.rows[0]?.count === 0 && (recibidas.rows[0]?.count > 0 || parcial.rows[0]?.count > 0)) {
        nuevoEstado = 'RECIBIDO';
    } else if (pendientes.rows[0]?.count === 0 && recibidas.rows[0]?.count === 0 && parcial.rows[0]?.count === 0 && enTransito.rows[0]?.count > 0) {
        nuevoEstado = 'TRASPASADO';
    }

    if (nuevoEstado) {
        await query("UPDATE lotes SET estado = $1 WHERE id = $2 AND estado != $1", [nuevoEstado, loteId]);
    }

    if (lote.lote_padre_id) {
        // Check if all hijos of this padre are done → COMPLETADO
        const hijosIncompletos = await query(`
            SELECT COUNT(*)::int AS count FROM lotes WHERE lote_padre_id = $1 AND estado NOT IN ('VENDIDO','TRASPASADO','COMPLETADO')
        `, [lote.lote_padre_id]);
        if (hijosIncompletos.rows[0]?.count === 0) {
            await query("UPDATE lotes SET estado = 'COMPLETADO' WHERE id = $1 AND estado != 'COMPLETADO'", [lote.lote_padre_id]);
        } else {
            // Check if no hijos are PENDIENTE → padre can be RECIBIDO
            const hijosPendientes = await query(`
                SELECT COUNT(*)::int AS count FROM lotes WHERE lote_padre_id = $1 AND estado = 'PENDIENTE'
            `, [lote.lote_padre_id]);
            if (hijosPendientes.rows[0]?.count === 0) {
                await query("UPDATE lotes SET estado = 'RECIBIDO' WHERE id = $1 AND estado = 'PENDIENTE'", [lote.lote_padre_id]);
            }
        }
    } else {
        // Es un lote padre (sin lote_padre_id) — verificar si todos sus hijos están completados
        const hijosActivos = await query(`
            SELECT COUNT(*)::int FROM lotes WHERE lote_padre_id = $1 AND estado NOT IN ('COMPLETADO')
        `, [loteId]);
        if (hijosActivos.rows[0]?.count === 0) {
            const hijosConTarimas = await query(`
                SELECT COUNT(*)::int FROM lotes WHERE lote_padre_id = $1
            `, [loteId]);
            if (hijosConTarimas.rows[0]?.count > 0) {
                await query("UPDATE lotes SET estado = 'COMPLETADO' WHERE id = $1 AND estado != 'COMPLETADO'", [loteId]);
            }
        }
    }
}

export async function tarimasRoutes(app: FastifyInstance) {
    app.get("/lote/:loteId", async (request) => {
        const { loteId } = request.params as any;
        const r = await query(`
            SELECT t.*, tp.nombre AS tarima_tipo_nombre, tp.cantidad_cajas,
                   p.nombre AS producto_nombre, l.codigo_lote, l.proveedor_nombre,
                   b_dest.nombre AS bodega_destino_nombre, b_dest.codigo AS bodega_destino_codigo
            FROM tarimas t
            JOIN tarimas_tipos tp ON tp.id = t.tarima_tipo_id
            JOIN productos p ON p.id = t.producto_id
            JOIN lotes l ON l.id = t.lote_id
            LEFT JOIN bodegas b_dest ON b_dest.id = t.bodega_destino_id
            WHERE t.lote_id = $1
            ORDER BY t.producto_id, t.tarima_tipo_id, t.numero_tarima
        `, [loteId]);
        return r.rows;
    });

    app.get("/pendientes", async () => {
        const r = await query(`
            SELECT t.*, tp.nombre AS tarima_tipo_nombre, tp.cantidad_cajas,
                   p.nombre AS producto_nombre, l.codigo_lote, l.proveedor_nombre,
                   l.lote_padre_id, padre.codigo_lote AS padre_codigo
            FROM tarimas t
            JOIN tarimas_tipos tp ON tp.id = t.tarima_tipo_id
            JOIN productos p ON p.id = t.producto_id
            JOIN lotes l ON l.id = t.lote_id
            LEFT JOIN lotes padre ON padre.id = l.lote_padre_id
            WHERE t.estado = 'PENDIENTE'
            ORDER BY t.created_at
        `);
        return r.rows;
    });

    app.get("/qr/:codigoQr", async (request, reply) => {
        const { codigoQr } = request.params as any;
        const r = await query(`
            SELECT t.*, tp.nombre AS tarima_tipo_nombre, tp.cantidad_cajas,
                   p.nombre AS producto_nombre, p.sku,
                   l.codigo_lote, l.proveedor_nombre, l.fecha_recepcion
            FROM tarimas t
            JOIN tarimas_tipos tp ON tp.id = t.tarima_tipo_id
            JOIN productos p ON p.id = t.producto_id
            JOIN lotes l ON l.id = t.lote_id
            WHERE t.codigo_qr = $1
        `, [codigoQr]);
        if (!r.rows.length) return reply.status(404).send({ error: "Tarima no encontrada" });
        return r.rows[0];
    });

    app.get("/qr-img/:codigoQr", async (request, reply) => {
        const { codigoQr } = request.params as any;
        const r = await query(`
            SELECT t.id, tp.nombre AS tarima_tipo_nombre, p.nombre AS producto_nombre,
                   l.codigo_lote, t.numero_tarima
            FROM tarimas t
            JOIN tarimas_tipos tp ON tp.id = t.tarima_tipo_id
            JOIN productos p ON p.id = t.producto_id
            JOIN lotes l ON l.id = t.lote_id
            WHERE t.codigo_qr = $1
        `, [codigoQr]);
        if (!r.rows.length) return reply.status(404).send({ error: "No encontrada" });

        const qrPng = await QRCode.toBuffer(codigoQr, { width: 300, margin: 1 });
        reply.header("Content-Type", "image/png");
        return reply.send(qrPng);
    });

    app.post<{ Params: { codigoQr: string }; Body: { bodega_id?: string } }>("/recibir/:codigoQr", async (request, reply) => {
        const { codigoQr } = request.params;
        let { bodega_id } = request.body;

        const tarima = await query("SELECT * FROM tarimas WHERE codigo_qr = $1 AND estado = 'PENDIENTE'", [codigoQr]);
        if (!tarima.rows.length) return reply.status(404).send({ error: "Tarima no encontrada o ya recibida" });

        const t = tarima.rows[0];
        if (!bodega_id) bodega_id = t.bodega_id;
        if (!bodega_id) return reply.status(400).send({ error: "Tarima sin bodega asignada. Especifique bodega_id o asigne una bodega primero." });

        const cajasOrig = t.cajas_originales != null ? Number(t.cajas_originales) : 1;
        const pesoKg = t.peso_kg != null ? Number(t.peso_kg) : null;

        const result = await query(`
            UPDATE tarimas SET estado = 'RECIBIDA', bodega_id = $1, recibida_at = NOW(), updated_at = NOW()
            WHERE id = $2 RETURNING *
        `, [bodega_id, t.id]);

        await query(`
            INSERT INTO movimientos (lote_id, tipo, bodega_destino_id, cantidad_kg, cantidad_cajas, referencia)
            VALUES ($1, 'ENTRADA', $2, COALESCE($3::numeric, 0), $4, $5)
        `, [t.lote_id, bodega_id, pesoKg, cajasOrig, `RECEPCION_TARIMA:${t.codigo_qr}`]);

        await query(`
            INSERT INTO stock_bodega (bodega_id, producto_id, cantidad_kg, cantidad_cajas)
            VALUES ($1, $2, COALESCE($3::numeric, 0), $4)
            ON CONFLICT (bodega_id, producto_id) DO UPDATE SET
                cantidad_kg = stock_bodega.cantidad_kg + COALESCE($3::numeric, 0),
                cantidad_cajas = stock_bodega.cantidad_cajas + $4,
                updated_at = NOW()
        `, [bodega_id, t.producto_id, pesoKg, cajasOrig]);

        await cascadeLoteEstado(t.lote_id);

        return { success: true, tarima: result.rows[0] };
    });

    app.post<{ Params: { codigoQr: string }; Body: { bodega_destino_id: string } }>("/transitar/:codigoQr", async (request, reply) => {
        const { codigoQr } = request.params;
        const { bodega_destino_id } = request.body;

        const tarima = await query("SELECT * FROM tarimas WHERE codigo_qr = $1 AND estado IN ('RECIBIDA','PARCIAL')", [codigoQr]);
        if (!tarima.rows.length) return reply.status(404).send({ error: "Tarima no encontrada o no disponible" });

        const t = tarima.rows[0];
        const cajas = parseFloat(t.cajas_restantes) || 1;
        const pesoKg = t.peso_kg != null ? Number(t.peso_kg) : null;

        const result = await query(`
            UPDATE tarimas SET estado = 'EN_TRANSITO', updated_at = NOW() WHERE id = $1 RETURNING *
        `, [t.id]);

        await query(`
            INSERT INTO movimientos (lote_id, tipo, bodega_origen_id, bodega_destino_id, cantidad_kg, cantidad_cajas, referencia)
            VALUES ($1, 'TRASPASO_SALIDA', $2, $3, COALESCE($4::numeric, 0), $5, $6)
        `, [t.lote_id, t.bodega_id, bodega_destino_id, pesoKg, cajas, `TRANSITO_TARIMA:${t.codigo_qr}`]);

        await query(`
            UPDATE stock_bodega SET cantidad_kg = GREATEST(cantidad_kg - COALESCE($1::numeric, 0), 0),
                cantidad_cajas = GREATEST(cantidad_cajas - $2::numeric, 0), updated_at = NOW()
            WHERE bodega_id = $3 AND producto_id = $4
        `, [pesoKg, cajas, t.bodega_id, t.producto_id]);

        return { success: true, tarima: result.rows[0] };
    });

    app.post<{ Params: { codigoQr: string }; Body: { bodega_destino_id?: string } }>("/entregar/:codigoQr", async (request, reply) => {
        const { codigoQr } = request.params;
        let { bodega_destino_id } = request.body;

        const tarima = await query("SELECT * FROM tarimas WHERE codigo_qr = $1 AND estado = 'EN_TRANSITO'", [codigoQr]);
        if (!tarima.rows.length) return reply.status(404).send({ error: "Tarima no encontrada o no en tránsito" });

        const t = tarima.rows[0];
        if (!bodega_destino_id) bodega_destino_id = t.bodega_destino_id;
        if (!bodega_destino_id) return reply.status(400).send({ error: "bodega_destino_id requerido y la tarima no tiene bodega destino asignada" });
        const cajas = parseFloat(t.cajas_restantes) || 1;
        const pesoKg = t.peso_kg != null ? Number(t.peso_kg) : null;

        const result = await query(`
            UPDATE tarimas SET estado = 'RECIBIDA', bodega_id = $1, bodega_destino_id = NULL, updated_at = NOW() WHERE id = $2 RETURNING *
        `, [bodega_destino_id, t.id]);

        await query(`
            INSERT INTO movimientos (lote_id, tipo, bodega_destino_id, cantidad_kg, cantidad_cajas, referencia)
            VALUES ($1, 'TRASPASO_ENTRADA', $2, COALESCE($3::numeric, 0), $4, $5)
        `, [t.lote_id, bodega_destino_id, pesoKg, cajas, `ENTREGA_TARIMA:${t.codigo_qr}`]);

        await query(`
            INSERT INTO stock_bodega (bodega_id, producto_id, cantidad_kg, cantidad_cajas)
            VALUES ($1, $2, COALESCE($3::numeric, 0), $4)
            ON CONFLICT (bodega_id, producto_id) DO UPDATE SET
                cantidad_kg = stock_bodega.cantidad_kg + COALESCE($3::numeric, 0),
                cantidad_cajas = stock_bodega.cantidad_cajas + $4,
                updated_at = NOW()
        `, [bodega_destino_id, t.producto_id, pesoKg, cajas]);

        return { success: true, tarima: result.rows[0] };
    });

    app.get("/scan/:codigoQr", async (request, reply) => {
        const { codigoQr } = request.params as any;
        const r = await query(`
            SELECT t.*, tp.nombre AS tarima_tipo_nombre, tp.cantidad_cajas,
                   p.nombre AS producto_nombre, p.sku,
                   l.codigo_lote, l.proveedor_nombre, l.fecha_recepcion
            FROM tarimas t
            JOIN tarimas_tipos tp ON tp.id = t.tarima_tipo_id
            JOIN productos p ON p.id = t.producto_id
            JOIN lotes l ON l.id = t.lote_id
            WHERE t.codigo_qr = $1
        `, [codigoQr]);
        if (!r.rows.length) return reply.status(404).send({ error: "Tarima no encontrada" });
        return r.rows[0];
    });

    app.get("/qr-lote/:loteId", async (request, reply) => {
        const { loteId } = request.params as any;
        const cfg = await query("SELECT valor FROM configuracion WHERE clave = 'ancho_tarimas'");
        const ancho = cfg.rows[0]?.valor || "80mm";
        const is58 = ancho.includes("58");
        const pw = is58 ? "58mm" : "80mm";
        const cw = is58 ? "54mm" : "76mm";
        const qs = is58 ? "48mm" : "60mm";

        const info = (await query("SELECT lote_padre_id IS NULL AS es_padre, codigo_lote FROM lotes WHERE id = $1", [loteId])).rows[0];
        if (!info) return reply.status(404).send({ error: "Lote no encontrado" });

        const r = await query(`
            SELECT t.*, tp.nombre AS tarima_tipo_nombre, tp.cantidad_cajas,
                   p.nombre AS producto_nombre,
                   l.codigo_lote, l.proveedor_nombre
            FROM tarimas t
            JOIN tarimas_tipos tp ON tp.id = t.tarima_tipo_id
            JOIN productos p ON p.id = t.producto_id
            JOIN lotes l ON l.id = t.lote_id
            WHERE ${info.es_padre ? "l.lote_padre_id = $1" : "t.lote_id = $1"}
            ORDER BY l.codigo_lote, t.codigo_qr
        `, [loteId]);
        if (!r.rows.length) return reply.status(404).send({ error: "Lote sin tarimas" });

        const rows = r.rows;

        const groupedByLote: Record<string, any[]> = {};
        for (const tarima of rows) {
            if (!groupedByLote[tarima.codigo_lote]) groupedByLote[tarima.codigo_lote] = [];
            groupedByLote[tarima.codigo_lote].push(tarima);
        }

        let allCards = "";
        for (const [codigoLote, tarimas] of Object.entries(groupedByLote)) {
            const qrSvgs = await Promise.all(
                tarimas.map(t => QRCode.toString(t.codigo_qr, { type: "svg", width: 200, margin: 1 }))
            );
            const loteCards = tarimas.map((tarima, i) => `
            <div class="card">
                <div class="qr-wrap">${qrSvgs[i]}</div>
                <div class="code">${tarima.codigo_qr}</div>
                <div class="info">${tarima.producto_nombre}</div>
                <div class="info">${tarima.tarima_tipo_nombre} (${tarima.cantidad_cajas} cajas)</div>
            </div>
            `).join("");
            allCards += `
            <div class="lote-section">
                <div class="lote-header">${codigoLote} — ${tarimas[0].producto_nombre}</div>
                <div class="lote-cards">${loteCards}</div>
            </div>`;
        }

        const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>QR ${rows[0].codigo_lote}</title>
<style>
    @page { width: ${pw}; margin: 2mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; width: ${pw}; padding: 2mm; }
    .lote-section { margin-bottom: 4mm; }
    .lote-header { font-weight: bold; font-size: ${is58 ? "9px" : "11px"}; padding: 2mm 0 1mm; border-bottom: 1px solid #ccc; margin-bottom: 2mm; }
    .lote-cards { display: flex; flex-wrap: wrap; gap: 1mm; }
    .card { width: ${cw}; border-bottom: 1px dashed #ccc; padding: 4mm 0; text-align: center; page-break-after: always; }
    .card:last-child { border: none; }
    .qr-wrap svg { width: ${qs}; height: ${qs}; display: block; margin: 0 auto; }
    .code { font-family: monospace; font-size: ${is58 ? "10px" : "12px"}; font-weight: bold; margin-top: 2px; }
    .info { font-size: ${is58 ? "8px" : "10px"}; color: #555; margin-top: 1px; }
    @media print { body { width: ${pw}; } }
</style></head><body>${allCards}</body></html>`;
        reply.header("Content-Type", "text/html");
        return reply.send(html);
    });

    app.get("/qr-tarima/:codigoQr", async (request, reply) => {
        const { codigoQr } = request.params as any;
        const cfg = await query("SELECT valor FROM configuracion WHERE clave = 'ancho_tarimas'");
        const ancho = cfg.rows[0]?.valor || "80mm";
        const is58 = ancho.includes("58");

        const r = await query(`
            SELECT t.*, tp.nombre AS tarima_tipo_nombre, tp.cantidad_cajas,
                   p.nombre AS producto_nombre,
                   l.codigo_lote, l.proveedor_nombre
            FROM tarimas t
            JOIN tarimas_tipos tp ON tp.id = t.tarima_tipo_id
            JOIN productos p ON p.id = t.producto_id
            JOIN lotes l ON l.id = t.lote_id
            WHERE t.codigo_qr = $1
        `, [codigoQr]);
        if (!r.rows.length) return reply.status(404).send({ error: "Tarima no encontrada" });

        const t = r.rows[0];
        const qrSvg = await QRCode.toString(codigoQr, { type: "svg", width: 200, margin: 1 });

        const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${codigoQr}</title>
<style>
    @page { width: ${is58 ? "58mm" : "80mm"}; height: ${is58 ? "40mm" : "50mm"}; margin: 1mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; width: ${is58 ? "56mm" : "78mm"}; padding: 1mm; text-align: center; }
    svg { width: ${is58 ? "30mm" : "40mm"}; height: ${is58 ? "30mm" : "40mm"}; display: block; margin: 0 auto; }
    .code { font-family: monospace; font-size: ${is58 ? "10px" : "12px"}; font-weight: bold; margin-top: 1px; }
    .info { font-size: ${is58 ? "8px" : "10px"}; color: #555; }
</style></head>
<body>
    ${qrSvg}
    <div class="code">${t.codigo_qr}</div>
    <div class="info">${t.producto_nombre} — ${t.tarima_tipo_nombre}</div>
    <div class="info">${t.codigo_lote}</div>
</body></html>`;
        reply.header("Content-Type", "text/html");
        return reply.send(html);
    });

    app.put<{ Params: { id: string }; Body: { bodega_id?: string; peso_kg?: number; fecha_caducidad?: string } }>("/:id", async (request, reply) => {
        const { id } = request.params;
        const { bodega_id, peso_kg, fecha_caducidad } = request.body;
        const sets: string[] = [];
        const params: any[] = [];
        let idx = 1;
        if (bodega_id !== undefined) { sets.push(`bodega_id = $${idx++}`); params.push(bodega_id); }
        if (peso_kg !== undefined) { sets.push(`peso_kg = $${idx++}`); params.push(peso_kg); }
        if (fecha_caducidad !== undefined) { sets.push(`fecha_caducidad = $${idx++}`); params.push(fecha_caducidad); }
        if (!sets.length) return reply.status(400).send({ error: "Sin campos para actualizar" });
        params.push(id);
        const r = await query(`UPDATE tarimas SET ${sets.join(", ")}, updated_at = NOW() WHERE id = $${idx} RETURNING *`, params);
        if (!r.rows.length) return reply.status(404).send({ error: "Tarima no encontrada" });
        return r.rows[0];
    });

    app.get("/resumen-lotes", async () => {
        const r = await query(`
            SELECT p.id AS padre_id, p.codigo_lote AS padre_codigo, p.estado AS padre_estado,
                   p.proveedor_nombre,
                   l.id AS lote_id, l.codigo_lote, l.producto_id, l.estado AS lote_estado,
                   pr.nombre AS producto_nombre,
                   COUNT(t.id) AS total_tarimas,
                    COUNT(*) FILTER (WHERE t.estado = 'PENDIENTE') AS pendientes,
                    COUNT(*) FILTER (WHERE t.estado = 'RECIBIDA') AS recibidas,
                    COUNT(*) FILTER (WHERE t.estado = 'PARCIAL') AS parcial,
                    COUNT(*) FILTER (WHERE t.estado IN ('RECIBIDA','PARCIAL') AND t.bodega_destino_id IS NOT NULL) AS asignadas,
                    COUNT(*) FILTER (WHERE t.estado = 'EN_TRANSITO') AS en_transito
            FROM lotes p
            JOIN lotes l ON l.lote_padre_id = p.id
            JOIN tarimas t ON t.lote_id = l.id
            LEFT JOIN productos pr ON pr.id = l.producto_id
            WHERE p.lote_padre_id IS NULL
            GROUP BY p.id, p.codigo_lote, p.estado, p.proveedor_nombre,
                     l.id, l.codigo_lote, l.producto_id, l.estado, pr.nombre
            ORDER BY p.updated_at DESC, l.codigo_lote
        `);
        const agrupados: Record<string, any> = {};
        for (const row of r.rows) {
            const key = row.padre_id;
            if (!agrupados[key]) {
                agrupados[key] = {
                    padre_id: row.padre_id,
                    padre_codigo: row.padre_codigo,
                    padre_estado: row.padre_estado,
                    proveedor_nombre: row.proveedor_nombre,
                    hijos: [],
                };
            }
            agrupados[key].hijos.push({
                lote_id: row.lote_id,
                codigo_lote: row.codigo_lote,
                producto_id: row.producto_id,
                producto_nombre: row.producto_nombre,
                lote_estado: row.lote_estado,
                total_tarimas: row.total_tarimas,
                pendientes: row.pendientes,
                recibidas: row.recibidas,
                parcial: row.parcial,
                asignadas: row.asignadas,
                en_transito: row.en_transito,
            });
        }
        return Object.values(agrupados);
    });

    app.post<{ Body: { tarima_ids: string[]; bodega_destino_id: string } }>("/traspasar", async (request, reply) => {
        const { tarima_ids, bodega_destino_id } = request.body;
        if (!tarima_ids?.length || !bodega_destino_id) {
            return reply.status(400).send({ error: "tarima_ids y bodega_destino_id requeridos" });
        }

        const asignadas: any[] = [];
        const saltadas: any[] = [];
        for (const id of tarima_ids) {
            const tarima = await query("SELECT * FROM tarimas WHERE id = $1 AND estado IN ('RECIBIDA','PARCIAL')", [id]);
            if (!tarima.rows.length) continue;
            if (tarima.rows[0].bodega_id === bodega_destino_id) {
                saltadas.push({ id, codigo_qr: tarima.rows[0].codigo_qr });
            } else {
                await query("UPDATE tarimas SET bodega_destino_id = $1, updated_at = NOW() WHERE id = $2", [bodega_destino_id, id]);
                asignadas.push({ id, codigo_qr: tarima.rows[0].codigo_qr });
            }
        }

        if (!asignadas.length) {
            return reply.status(400).send({
                error: "Todas las tarimas seleccionadas ya están en la bodega destino",
                saltadas,
            });
        }

        return { success: true, asignadas: asignadas.length, tarimas: asignadas, saltadas };
    });

    app.post<{ Body: { tarima_id: string; cajas: number; bodega_destino_id: string } }>("/partir", async (request, reply) => {
        const { tarima_id, cajas, bodega_destino_id } = request.body;
        if (!tarima_id || !cajas || cajas <= 0 || !bodega_destino_id) {
            return reply.status(400).send({ error: "tarima_id, cajas (>0) y bodega_destino_id requeridos" });
        }

        const tarima = await query("SELECT * FROM tarimas WHERE id = $1 AND estado IN ('RECIBIDA','PARCIAL')", [tarima_id]);
        if (!tarima.rows.length) return reply.status(404).send({ error: "Tarima no encontrada o no disponible" });

        const t = tarima.rows[0];
        const restantes = parseFloat(t.cajas_restantes);

        if (cajas > restantes) {
            return reply.status(400).send({ error: `La tarima solo tiene ${restantes} cajas disponibles` });
        }
        if (cajas === restantes) {
            return reply.status(400).send({ error: "Usa /traspasar para transferir la tarima completa" });
        }

        const numTarima = await query("SELECT COALESCE(MAX(numero_tarima), 0) + 1 AS next FROM tarimas WHERE lote_id = $1 AND producto_id = $2 AND tarima_tipo_id = $3", [t.lote_id, t.producto_id, t.tarima_tipo_id]);
        const nextNum = numTarima.rows[0]?.next || 1;

        const lote = await query("SELECT codigo_lote, proveedor_nombre FROM lotes WHERE id = $1", [t.lote_id]);
        const abrev = lote.rows[0]?.proveedor_nombre ? lote.rows[0].proveedor_nombre.substring(0, 4).toUpperCase() : "LOTE";
        const hoy = new Date().toISOString().substring(0, 10).replace(/-/g, "");
        const tarimaSeq = await query("SELECT COALESCE(MAX(CAST(SPLIT_PART(codigo_qr, '-', 1) AS VARCHAR)), 'TAR0') FROM tarimas");
        const seqMatch = tarimaSeq.rows[0]?.coalesce?.match(/TAR(\d+)/);
        const nextSeq = seqMatch ? parseInt(seqMatch[1], 10) + 1 : 1;
        const codigoQr = `TAR${nextSeq}-${abrev}-${hoy}-1`;

        const nuevoPesoKg = t.peso_kg != null
            ? (cajas / Number(t.cajas_originales)) * Number(t.peso_kg)
            : null;
        const pesoRestante = t.peso_kg != null ? Number(t.peso_kg) - (nuevoPesoKg ?? 0) : null;

        await query(`
            UPDATE tarimas SET cajas_restantes = cajas_restantes - $1,
                peso_kg = $2,
                estado = CASE WHEN cajas_restantes - $1 <= 0 THEN 'VENDIDA' WHEN cajas_originales - (cajas_restantes - $1) > 0 THEN 'PARCIAL' ELSE estado END,
                updated_at = NOW()
            WHERE id = $3
        `, [cajas, pesoRestante, t.id]);

        const result = await query(`
            INSERT INTO tarimas (lote_id, producto_id, tarima_tipo_id, numero_tarima, peso_kg, codigo_qr, estado, bodega_id, bodega_destino_id, fecha_caducidad, cajas_originales, cajas_restantes)
            VALUES ($1, $2, $3, $4, $5, $6, 'RECIBIDA', $7, $8, $9, $10, $10)
            RETURNING *
        `, [t.lote_id, t.producto_id, t.tarima_tipo_id, nextNum, nuevoPesoKg, codigoQr, t.bodega_id, bodega_destino_id, t.fecha_caducidad, cajas]);

        await cascadeLoteEstado(t.lote_id);

        return { success: true, tarima_original: { ...t, cajas_restantes: restantes - cajas }, nueva_tarima: result.rows[0] };
    });

    app.get("/pendientes-confirmar", async (request) => {
        const q = request.query as { bodega_id?: string };
        const params: any[] = [];
        let where = "WHERE t.bodega_destino_id IS NOT NULL AND t.estado IN ('RECIBIDA','PARCIAL')";
        if (q.bodega_id) {
            params.push(q.bodega_id);
            where += ` AND t.bodega_id = $${params.length}`;
        }
        const r = await query(`
            SELECT t.*, tp.nombre AS tarima_tipo_nombre, tp.cantidad_cajas,
                   p.nombre AS producto_nombre, p.sku,
                   l.codigo_lote, l.proveedor_nombre,
                   b_origen.nombre AS bodega_origen_nombre, b_origen.codigo AS bodega_origen_codigo,
                   b_dest.nombre AS bodega_destino_nombre, b_dest.codigo AS bodega_destino_codigo
            FROM tarimas t
            JOIN tarimas_tipos tp ON tp.id = t.tarima_tipo_id
            JOIN productos p ON p.id = t.producto_id
            JOIN lotes l ON l.id = t.lote_id
            LEFT JOIN bodegas b_origen ON b_origen.id = t.bodega_id
            LEFT JOIN bodegas b_dest ON b_dest.id = t.bodega_destino_id
            ${where}
            ORDER BY b_origen.codigo, l.codigo_lote, t.codigo_qr
        `, params);
        return r.rows;
    });

    app.post<{ Params: { codigoQr: string } }>("/confirmar-traspaso/:codigoQr", async (request, reply) => {
        const { codigoQr } = request.params;
        const tarima = await query("SELECT * FROM tarimas WHERE codigo_qr = $1 AND estado IN ('RECIBIDA','PARCIAL') AND bodega_destino_id IS NOT NULL", [codigoQr]);
        if (!tarima.rows.length) {
            return reply.status(404).send({ error: "Tarima no encontrada, ya no está disponible o no tiene asignación de traspaso" });
        }

        const t = tarima.rows[0];
        const bodega_destino_id = t.bodega_destino_id;
        const cajas = parseFloat(t.cajas_restantes) || 1;
        const pesoKg = t.peso_kg != null ? Number(t.peso_kg) : null;

        const result = await query(`
            UPDATE tarimas SET estado = 'EN_TRANSITO', updated_at = NOW()
            WHERE id = $1 RETURNING *
        `, [t.id]);

        await query(`
            INSERT INTO movimientos (lote_id, tipo, bodega_origen_id, bodega_destino_id, cantidad_kg, cantidad_cajas, referencia)
            VALUES ($1, 'TRASPASO_SALIDA', $2, $3, COALESCE($4::numeric, 0), $5, $6)
        `, [t.lote_id, t.bodega_id, bodega_destino_id, pesoKg, cajas, `CONFIRMA_TRASPASO:${t.codigo_qr}`]);

        await query(`
            UPDATE stock_bodega SET cantidad_kg = GREATEST(cantidad_kg - COALESCE($1::numeric, 0), 0),
                cantidad_cajas = GREATEST(cantidad_cajas - $2::numeric, 0), updated_at = NOW()
            WHERE bodega_id = $3 AND producto_id = $4
        `, [pesoKg, cajas, t.bodega_id, t.producto_id]);

        await cascadeLoteEstado(t.lote_id);

        return { success: true, tarima: result.rows[0] };
    });

    app.post<{ Body: { tarima_ids: string[] } }>("/confirmar-traspaso-batch", async (request, reply) => {
        const { tarima_ids } = request.body;
        if (!tarima_ids?.length) return reply.status(400).send({ error: "tarima_ids requerido" });

        let confirmadas = 0;
        for (const id of tarima_ids) {
            const tarima = await query("SELECT * FROM tarimas WHERE id = $1 AND estado IN ('RECIBIDA','PARCIAL') AND bodega_destino_id IS NOT NULL", [id]);
            if (!tarima.rows.length) continue;

            const t = tarima.rows[0];
            const bodega_destino_id = t.bodega_destino_id;
            const cajas = parseFloat(t.cajas_restantes) || 1;
            const pesoKg = t.peso_kg != null ? Number(t.peso_kg) : null;

            await query(`
                UPDATE tarimas SET estado = 'EN_TRANSITO', updated_at = NOW() WHERE id = $1
            `, [t.id]);

            await query(`
                INSERT INTO movimientos (lote_id, tipo, bodega_origen_id, bodega_destino_id, cantidad_kg, cantidad_cajas, referencia)
                VALUES ($1, 'TRASPASO_SALIDA', $2, $3, COALESCE($4::numeric, 0), $5, $6)
            `, [t.lote_id, t.bodega_id, bodega_destino_id, pesoKg, cajas, `CONFIRMA_TRASPASO:${t.codigo_qr}`]);

            await query(`
                UPDATE stock_bodega SET cantidad_kg = GREATEST(cantidad_kg - COALESCE($1::numeric, 0), 0),
                    cantidad_cajas = GREATEST(cantidad_cajas - $2::numeric, 0), updated_at = NOW()
                WHERE bodega_id = $3 AND producto_id = $4
            `, [pesoKg, cajas, t.bodega_id, t.producto_id]);

            await cascadeLoteEstado(t.lote_id);
            confirmadas++;
        }

        return { success: true, confirmadas };
    });

    app.post<{ Body: { tarima_ids: string[] } }>("/cancelar-asignacion", async (request, reply) => {
        const { tarima_ids } = request.body;
        if (!tarima_ids?.length) return reply.status(400).send({ error: "tarima_ids requerido" });
        const r = await query(
            `UPDATE tarimas SET bodega_destino_id = NULL, updated_at = NOW() WHERE id = ANY($1::uuid[]) AND estado IN ('RECIBIDA','PARCIAL') RETURNING id`,
            [tarima_ids]
        );
        return { success: true, canceladas: r.rows.length };
    });

    app.get("/en-transito", async (request) => {
        const q = request.query as { bodega_destino_id?: string };
        const params: any[] = [];
        let where = "WHERE t.estado = 'EN_TRANSITO'";
        if (q.bodega_destino_id) {
            params.push(q.bodega_destino_id);
            where += ` AND t.bodega_destino_id = $${params.length}`;
        }
        const r = await query(`
            SELECT t.*, tp.nombre AS tarima_tipo_nombre, tp.cantidad_cajas,
                   p.nombre AS producto_nombre, p.sku,
                   l.codigo_lote, l.proveedor_nombre,
                   b_origen.nombre AS bodega_origen_nombre, b_origen.codigo AS bodega_origen_codigo,
                   b_dest.nombre AS bodega_destino_nombre, b_dest.codigo AS bodega_destino_codigo
            FROM tarimas t
            JOIN tarimas_tipos tp ON tp.id = t.tarima_tipo_id
            JOIN productos p ON p.id = t.producto_id
            JOIN lotes l ON l.id = t.lote_id
            LEFT JOIN bodegas b_origen ON b_origen.id = t.bodega_id
            LEFT JOIN bodegas b_dest ON b_dest.id = t.bodega_destino_id
            ${where}
            ORDER BY b_dest.codigo, l.codigo_lote, t.codigo_qr
        `, params);
        return r.rows;
    });

    app.get("/bodega/:bodegaId", async (request) => {
        const { bodegaId } = request.params as any;
        const r = await query(`
            SELECT t.*, tp.nombre AS tarima_tipo_nombre, tp.cantidad_cajas,
                   p.nombre AS producto_nombre,
                   l.codigo_lote, l.proveedor_nombre, b.nombre AS bodega_nombre, b.codigo AS bodega_codigo
            FROM tarimas t
            JOIN tarimas_tipos tp ON tp.id = t.tarima_tipo_id
            JOIN productos p ON p.id = t.producto_id
            JOIN lotes l ON l.id = t.lote_id
            LEFT JOIN bodegas b ON b.id = t.bodega_id
            WHERE t.bodega_id = $1
            ORDER BY t.codigo_qr
        `, [bodegaId]);
        return r.rows;
    });

    app.get("/stock-detalle/:bodegaId", async (request) => {
        const { bodegaId } = request.params as any;
        const r = await query(`
            SELECT p.id AS producto_id, p.sku, p.nombre AS producto_nombre,
                   COUNT(t.id) FILTER (WHERE t.estado IN ('RECIBIDA','PARCIAL')) AS total,
                   COUNT(*) FILTER (WHERE t.estado = 'PENDIENTE') AS pendientes,
                   COUNT(*) FILTER (WHERE t.estado = 'RECIBIDA') AS recibidas,
                   COUNT(*) FILTER (WHERE t.estado = 'PARCIAL') AS parcial,
                   COUNT(*) FILTER (WHERE t.estado = 'EN_TRANSITO') AS en_transito,
                    COALESCE(SUM(t.cajas_restantes) FILTER (WHERE t.estado = 'RECIBIDA'), 0)::numeric(10,2) AS cajas_recibidas,
                    COALESCE(SUM(t.cajas_restantes) FILTER (WHERE t.estado = 'PARCIAL'), 0)::numeric(10,2) AS cajas_parciales,
                   MIN(t.fecha_caducidad) AS proxima_caducidad,
                   COUNT(*) FILTER (WHERE t.fecha_caducidad IS NOT NULL AND t.fecha_caducidad <= CURRENT_DATE + 5 AND t.fecha_caducidad >= CURRENT_DATE AND t.estado IN ('RECIBIDA','PENDIENTE','PARCIAL')) AS por_vencer
            FROM tarimas t
            JOIN productos p ON p.id = t.producto_id
            WHERE t.bodega_id = $1
            GROUP BY p.id, p.sku, p.nombre
            ORDER BY MIN(t.fecha_caducidad) NULLS LAST, p.nombre
        `, [bodegaId]);
        return r.rows;
    });

    app.get("/por-vencer", async () => {
        const r = await query(`
            SELECT t.id, t.codigo_qr, t.fecha_caducidad,
                   p.id AS producto_id, p.nombre AS producto_nombre, p.sku,
                   l.codigo_lote,
                   b.codigo AS bodega_codigo, b.nombre AS bodega_nombre
            FROM tarimas t
            JOIN productos p ON p.id = t.producto_id
            JOIN lotes l ON l.id = t.lote_id
            JOIN bodegas b ON b.id = t.bodega_id
            WHERE t.fecha_caducidad IS NOT NULL
              AND t.fecha_caducidad <= CURRENT_DATE + 5
              AND t.fecha_caducidad >= CURRENT_DATE
              AND t.estado IN ('RECIBIDA','PENDIENTE','PARCIAL')
            ORDER BY t.fecha_caducidad, p.nombre
        `);
        return r.rows;
    });

    app.get("/por-bodega", async () => {
        const r = await query(`
            SELECT b.id AS bodega_id, b.codigo AS bodega_codigo, b.nombre AS bodega_nombre,
                   COUNT(t.id) FILTER (WHERE t.estado IN ('RECIBIDA','PARCIAL')) AS disponibles,
                   COUNT(*) FILTER (WHERE t.estado = 'PENDIENTE') AS pendientes,
                   COUNT(*) FILTER (WHERE t.estado = 'RECIBIDA') AS recibidas,
                   COUNT(*) FILTER (WHERE t.estado = 'PARCIAL') AS parcial,
                   COUNT(*) FILTER (WHERE t.estado = 'EN_TRANSITO') AS en_transito,
                   COUNT(t.id) AS total
            FROM bodegas b
            LEFT JOIN tarimas t ON t.bodega_id = b.id
            WHERE b.activa = true
            GROUP BY b.id, b.codigo, b.nombre
            ORDER BY b.codigo
        `);
        return r.rows;
    });
}
