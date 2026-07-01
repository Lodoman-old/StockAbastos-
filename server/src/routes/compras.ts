import { FastifyInstance } from "fastify";
import { query, transaction } from "../db.js";

export async function comprasRoutes(app: FastifyInstance) {
    app.get("/", async (request) => {
        const q = request.query as { desde?: string; hasta?: string };
        const hoy = new Date().toISOString().substring(0, 10);
        const params: any[] = [q.desde || hoy];
        let where = "WHERE c.fecha >= $1::date";
        if (q.hasta) {
            params.push(q.hasta);
            where += " AND c.fecha <= $2::date";
        }
        const r = await query(`
            SELECT c.*, COALESCE(
                json_agg(json_build_object(
                    'id', cd.id, 'producto_id', cd.producto_id, 'producto_nombre', p.nombre,
                    'lote_id', cd.lote_id, 'codigo_lote', l.codigo_lote,
                    'precio_compra', cd.precio_compra, 'modalidad_unidad', p.modalidad_unidad,
                    'lote_padre_id', l.lote_padre_id
                )) FILTER (WHERE cd.id IS NOT NULL),
                '[]'
            ) AS detalles
            FROM compras c
            LEFT JOIN compra_detalles cd ON cd.compra_id = c.id
            LEFT JOIN productos p ON p.id = cd.producto_id
            LEFT JOIN lotes l ON l.id = cd.lote_id
            ${where}
            GROUP BY c.id ORDER BY c.fecha DESC
        `, params);
        return r.rows;
    });

    app.get("/reporte", async (request) => {
        const q = request.query as { desde?: string; hasta?: string; proveedor?: string };
        const params: any[] = [];
        const condiciones: string[] = [];
        if (q.desde) { params.push(q.desde); condiciones.push(`c.fecha >= $${params.length}::date`); }
        if (q.hasta) { params.push(q.hasta); condiciones.push(`c.fecha <= $${params.length}::date`); }
        if (q.proveedor) { params.push(`%${q.proveedor}%`); condiciones.push(`c.proveedor ILIKE $${params.length}`); }
        const where = condiciones.length ? "WHERE " + condiciones.join(" AND ") : "";
        const r = await query(`
            SELECT c.*, COALESCE(
                json_agg(json_build_object(
                    'id', cd.id, 'producto_id', cd.producto_id, 'producto_nombre', p.nombre,
                    'lote_id', cd.lote_id, 'codigo_lote', l.codigo_lote,
                    'precio_compra', cd.precio_compra, 'modalidad_unidad', p.modalidad_unidad
                )) FILTER (WHERE cd.id IS NOT NULL),
                '[]'
            ) AS detalles
            FROM compras c
            LEFT JOIN compra_detalles cd ON cd.compra_id = c.id
            LEFT JOIN productos p ON p.id = cd.producto_id
            LEFT JOIN lotes l ON l.id = cd.lote_id
            ${where}
            GROUP BY c.id ORDER BY c.fecha DESC
        `, params);
        return r.rows;
    });

    app.post<{ Body: {
        proveedor?: string;
        fecha?: string;
        costo_total?: number;
        tarimas: Array<{
            producto_id: string;
            tarima_tipo_id?: string;
            cantidad: number;
            peso_kg?: number;
            costo_por_kg?: number;
            compra_por_cajas?: boolean;
            cajas_directas?: number;
            fecha_caducidad?: string;
            bodega_id: string;
        }>;
    } }>("/", async (request, reply) => {
        const { proveedor, fecha, costo_total, tarimas } = request.body;
        if (!tarimas || !tarimas.length) return reply.status(400).send({ error: "Agrega al menos una tarima" });
        return transaction(async (client) => {
            const hoy = new Date().toISOString().substring(0, 10).replace(/-/g, "");
            const abrev = proveedor ? proveedor.substring(0, 4).toUpperCase() : "LOTE";
            const padreCodigo = `${abrev}-${hoy}-${Math.floor(Math.random() * 900) + 100}`;

            const padre = await client.query(`
                INSERT INTO lotes (codigo_lote, estado, proveedor_nombre, fecha_recepcion, cantidad_recibida_kg, cantidad_actual_kg)
                VALUES ($1, 'PENDIENTE', $2, $3, 0.001, 0.001) RETURNING *
            `, [padreCodigo, proveedor || null, fecha || new Date().toISOString().substring(0, 10)]);

            const totalCost = costo_total || 0;
            const compra = await client.query(
                "INSERT INTO compras (proveedor, total, fecha) VALUES ($1, $2, $3) RETURNING *",
                [proveedor || null, totalCost, fecha || new Date().toISOString().substring(0, 10)]
            );
            const compraId = compra.rows[0].id;
            let tarimaSeq = 1;
            const lotes: any[] = [];
            let hijoIndex = 1;

            const grouped = tarimas.reduce((acc, t) => {
                if (!acc[t.producto_id]) acc[t.producto_id] = [];
                acc[t.producto_id].push(t);
                return acc;
            }, {} as Record<string, typeof tarimas>);

            for (const [productoId, items] of Object.entries(grouped)) {
                const codigoHijo = `${padreCodigo}-${hijoIndex}`;
                const bodegaId = items[0].bodega_id;

                const prodData = await client.query("SELECT modalidad_unidad FROM productos WHERE id = $1", [productoId]);
                const esUnidad = prodData.rows[0]?.modalidad_unidad === true;

                let pesoTotalLote = 0;
                for (const t of items) {
                    if (esUnidad) {
                        pesoTotalLote += (t.cajas_directas || t.cantidad || 1) * 1;
                    } else if (t.compra_por_cajas) {
                        pesoTotalLote += t.peso_kg ? Number(t.peso_kg) : 0;
                    } else {
                        const tp = await client.query("SELECT cantidad_cajas FROM tarimas_tipos WHERE id = $1", [t.tarima_tipo_id]);
                        const pesoPorTarima = t.peso_kg ? Number(t.peso_kg) : 0;
                        const numTarimas = t.cantidad || 1;
                        pesoTotalLote += pesoPorTarima * numTarimas;
                    }
                }

                const lote = await client.query(`
                    INSERT INTO lotes (producto_id, bodega_id, estado, codigo_lote, lote_padre_id, fecha_caducidad, cantidad_recibida_kg, cantidad_actual_kg)
                    VALUES ($1, $2, 'PENDIENTE', $3, $4, $5, $6, $6) RETURNING *
                `, [productoId, bodegaId, codigoHijo, padre.rows[0].id, items[0].fecha_caducidad || null, pesoTotalLote || 0.001]);
                lotes.push(lote.rows[0]);
                hijoIndex++;

                const tipoCajaSuelta = await client.query("SELECT id FROM tarimas_tipos WHERE cantidad_cajas = 0 AND activo = true LIMIT 1");
                const tipoDefault = tipoCajaSuelta.rows[0]?.id;
                for (const t of items) {
                    let cajasPorItem = 0;
                    let tarimaTipoId = t.tarima_tipo_id && t.tarima_tipo_id.length >= 36 ? t.tarima_tipo_id : (tipoDefault || (await client.query("SELECT id FROM tarimas_tipos WHERE activo = true ORDER BY cantidad_cajas ASC LIMIT 1")).rows[0]?.id);
                    let numTarimas = t.compra_por_cajas ? 1 : t.cantidad;
                    let itemPeso = 0;

                    if (esUnidad) {
                        cajasPorItem = t.cajas_directas || 1;
                        itemPeso = t.cajas_directas || t.cantidad || 1;
                    } else if (t.compra_por_cajas) {
                        cajasPorItem = t.cajas_directas || 1;
                        itemPeso = t.peso_kg ? Number(t.peso_kg) : 0;
                    } else {
                        const tp = await client.query("SELECT cantidad_cajas FROM tarimas_tipos WHERE id = $1", [t.tarima_tipo_id]);
                        cajasPorItem = parseInt(tp.rows[0]?.cantidad_cajas, 10) || 1;
                        itemPeso = (t.peso_kg ? Number(t.peso_kg) : 0) * t.cantidad;
                    }

                    for (let i = 1; i <= numTarimas; i++) {
                        const pesoKgTarima = t.peso_kg ? Number(t.peso_kg) : null;
                        const codigoQr = `TAR${tarimaSeq}-${abrev}-${hoy}-${i}`;
                        await client.query(`
                            INSERT INTO tarimas (lote_id, producto_id, tarima_tipo_id, numero_tarima, peso_kg, codigo_qr, estado, bodega_id, fecha_caducidad, cajas_originales, cajas_restantes)
                            VALUES ($1, $2, $3, $4, $5, $6, 'PENDIENTE', $7, $8, $9, $9)
                        `, [lote.rows[0].id, t.producto_id, tarimaTipoId, i, pesoKgTarima, codigoQr, t.bodega_id, t.fecha_caducidad || null, cajasPorItem]);
                        tarimaSeq++;
                    }

                    const det = await client.query(
                        "INSERT INTO compra_detalles (compra_id, producto_id, lote_id, precio_compra) VALUES ($1, $2, $3, $4) RETURNING id",
                        [compraId, t.producto_id, lote.rows[0].id, t.costo_por_kg || null]
                    );
                }
            }

            if (totalCost > 0) {
                await client.query("UPDATE compras SET total = $1 WHERE id = $2", [totalCost, compraId]);
            }

            const result = await client.query("SELECT * FROM compras WHERE id = $1", [compraId]);
            return {
                ...result.rows[0],
                lote_padre: { lote_id: padre.rows[0].id, codigo_lote: padre.rows[0].codigo_lote },
                lotes: lotes.map(l => ({ lote_id: l.id, codigo_lote: l.codigo_lote, producto_id: l.producto_id })),
            };
        });
    });

    app.put<{ Params: { id: string }; Body: { proveedor?: string; fecha?: string; costo_total?: number; detalles?: Array<{ detalle_id: string; precio_compra: number | null }> } }>("/:id", async (request, reply) => {
        const { id } = request.params;
        const { proveedor, fecha, costo_total, detalles: detallesBody } = request.body;
        if (!proveedor && !fecha && costo_total === undefined && !detallesBody?.length) return reply.status(400).send({ error: "Nada que actualizar" });
        return transaction(async (client) => {
            const c = await client.query("SELECT * FROM compras WHERE id = $1", [id]);
            if (!c.rows.length) return reply.status(404).send({ error: "Compra no encontrada" });
            const updates: string[] = [];
            const params: any[] = [];
            if (proveedor !== undefined) {
                updates.push("proveedor = $" + (params.length + 1));
                params.push(proveedor);
            }
            if (fecha !== undefined) {
                updates.push("fecha = $" + (params.length + 1));
                params.push(fecha);
            }
            if (costo_total !== undefined) {
                updates.push("total = $" + (params.length + 1));
                params.push(costo_total);
            }
            params.push(id);
            await client.query(`UPDATE compras SET ${updates.join(", ")} WHERE id = $${params.length}`, params);

            const detalles = await client.query("SELECT lote_id FROM compra_detalles WHERE compra_id = $1", [id]);
            const padreIds = new Set<string>();
            for (const d of detalles.rows) {
                const l = await client.query("SELECT lote_padre_id FROM lotes WHERE id = $1", [d.lote_id]);
                if (l.rows[0]?.lote_padre_id) padreIds.add(l.rows[0].lote_padre_id);
            }
            const loteUpdates: string[] = [];
            const loteParams: any[] = [];
            if (proveedor !== undefined) {
                loteUpdates.push("proveedor_nombre = $" + (loteParams.length + 1));
                loteParams.push(proveedor);
            }
            if (fecha !== undefined) {
                loteUpdates.push("fecha_recepcion = $" + (loteParams.length + 1));
                loteParams.push(fecha);
            }
            if (loteUpdates.length) {
                for (const pid of padreIds) {
                    await client.query(`UPDATE lotes SET ${loteUpdates.join(", ")} WHERE id = $${loteParams.length + 1}`, [...loteParams, pid]);
                }
            }

            if (detallesBody?.length) {
                for (const d of detallesBody) {
                    await client.query("UPDATE compra_detalles SET precio_compra = $1 WHERE id = $2", [d.precio_compra, d.detalle_id]);
                }
            }

            const result = await client.query("SELECT * FROM compras WHERE id = $1", [id]);
            return result.rows[0];
        });
    });

    app.delete<{ Params: { id: string } }>("/:id", async (request, reply) => {
        const { id } = request.params;
        return transaction(async (client) => {
            const detalles = await client.query("SELECT lote_id FROM compra_detalles WHERE compra_id = $1", [id]);
            const padreIds = new Set<string>();
            for (const d of detalles.rows) {
                const l = await client.query("SELECT lote_padre_id FROM lotes WHERE id = $1", [d.lote_id]);
                const padreId = l.rows[0]?.lote_padre_id;
                if (padreId) padreIds.add(padreId);
                await client.query("DELETE FROM movimientos WHERE lote_id = $1", [d.lote_id]);
                await client.query("DELETE FROM compra_detalles WHERE lote_id = $1", [d.lote_id]);
                await client.query("DELETE FROM tarimas WHERE lote_id = $1", [d.lote_id]);
                await client.query("DELETE FROM lotes WHERE id = $1", [d.lote_id]);
            }
            for (const pid of padreIds) {
                await client.query("DELETE FROM lotes WHERE id = $1", [pid]);
            }
            await client.query("DELETE FROM compras WHERE id = $1", [id]);
            return { ok: true };
        });
    });
}
