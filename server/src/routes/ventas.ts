import { FastifyInstance } from "fastify";
import { query } from "../db.js";
import { cascadeLoteEstado } from "./tarimas.js";

export async function ventasRoutes(app: FastifyInstance) {

    // --- Pausar / reanudar ventas ---
    app.get("/pausadas", async (request) => {
        const user = (request as any).user;
        const r = await query(
            "SELECT * FROM ventas_pausadas WHERE usuario_id = $1 ORDER BY created_at DESC",
            [user.id]
        );
        return r.rows;
    });

    app.post("/pausar", async (request, reply) => {
        const user = (request as any).user;
        const body = request.body as any;
        if (!body?.items?.length) return reply.status(400).send({ error: "Sin productos" });
        const r = await query(
            "INSERT INTO ventas_pausadas (usuario_id, datos_json) VALUES ($1, $2) RETURNING *",
            [user.id, JSON.stringify(body)]
        );
        return r.rows[0];
    });

    app.delete("/pausadas/:id", async (request, reply) => {
        const user = (request as any).user;
        const { id } = request.params as any;
        const r = await query(
            "DELETE FROM ventas_pausadas WHERE id = $1 AND usuario_id = $2 RETURNING id",
            [id, user.id]
        );
        if (!r.rows.length) return reply.status(404).send({ error: "No encontrada" });
        return { ok: true };
    });

    // --- Tarimas disponibles para venta (mayoreo) ---
    app.get("/tarimas-disponibles", async (request) => {
        const q = request.query as { bodega_id?: string };
        const params: any[] = [];
        const hoy = new Date().toISOString().substring(0, 10);
        let where = "WHERE t.estado IN ('RECIBIDA','PARCIAL') AND (p.modalidad_caja_pesada = TRUE OR p.modalidad_caja_sellada = TRUE OR p.modalidad_unidad = TRUE)";
        if (q.bodega_id) { params.push(q.bodega_id); where += ` AND t.bodega_id = $${params.length}`; }
        const r = await query(`
            SELECT t.id AS tarima_id, t.codigo_qr, t.peso_kg, t.cajas_restantes, t.cajas_originales,
                   p.id AS producto_id, p.nombre AS producto_nombre, p.sku, p.codigo_de_barras,
                   p.unidad_compra,
                   p.modalidad_caja_pesada, p.precio_mayoreo_kg, p.destare_kg,
                   p.modalidad_caja_sellada, p.precio_caja_sellada, p.peso_caja_sellada_kg,
                   p.modalidad_unidad, p.precio_por_unidad,
                   l.codigo_lote, l.id AS lote_id,
                   COALESCE(pd.precio_mayoreo_kg, p.precio_mayoreo_kg) AS precio_mayoreo_kg_hoy,
                   COALESCE(pd.precio_caja_sellada, p.precio_caja_sellada) AS precio_caja_sellada_hoy,
                   COALESCE(pd.precio_unidad, p.precio_por_unidad) AS precio_unidad_hoy
            FROM tarimas t
            JOIN productos p ON p.id = t.producto_id
            JOIN lotes l ON l.id = t.lote_id
            LEFT JOIN precios_diarios pd ON pd.producto_id = p.id AND pd.fecha = $${params.length + 1}::date
            ${where}
            ORDER BY p.nombre
        `, [...params, hoy]);
        return r.rows;
    });

    // --- Productos disponibles para venta (agrupados por producto) ---
    app.get("/productos-disponibles", async (request) => {
        const q = request.query as { bodega_id?: string };
        if (!q.bodega_id) return [];
        const hoy = new Date().toISOString().substring(0, 10);
        const r = await query(`
            SELECT p.id AS producto_id, p.nombre AS producto_nombre, p.sku, p.codigo_de_barras,
                   p.modalidad_caja_pesada, p.precio_mayoreo_kg, p.destare_kg,
                   p.modalidad_caja_sellada, p.precio_caja_sellada, p.peso_caja_sellada_kg,
                   p.modalidad_unidad, p.precio_por_unidad,
                   COUNT(t.id)::int AS tarimas_disponibles,
                   COALESCE(SUM(t.cajas_restantes) FILTER (WHERE t.estado = 'RECIBIDA'), 0)::numeric(10,2) AS cajas_disponibles,
                   COALESCE(SUM(t.cajas_restantes) FILTER (WHERE t.estado = 'PARCIAL'), 0)::numeric(10,2) AS cajas_parciales,
                   COUNT(*) FILTER (WHERE t.estado = 'PARCIAL') AS tarimas_parciales,
                   COALESCE(pd.precio_mayoreo_kg, p.precio_mayoreo_kg) AS precio_mayoreo_kg_hoy,
                   COALESCE(pd.precio_caja_sellada, p.precio_caja_sellada) AS precio_caja_sellada_hoy,
                   COALESCE(pd.precio_unidad, p.precio_por_unidad) AS precio_unidad_hoy,
                   MIN(t.fecha_caducidad) AS proxima_caducidad,
                   MIN(t.peso_kg) AS peso_min_kg, MAX(t.peso_kg) AS peso_max_kg
            FROM tarimas t
            JOIN productos p ON p.id = t.producto_id
            LEFT JOIN precios_diarios pd ON pd.producto_id = p.id AND pd.fecha = $2::date
            WHERE t.estado IN ('RECIBIDA','PARCIAL') AND t.bodega_id = $1
              AND (p.modalidad_caja_pesada = TRUE OR p.modalidad_caja_sellada = TRUE OR p.modalidad_unidad = TRUE)
            GROUP BY p.id, p.nombre, p.sku, p.codigo_de_barras,
                     p.modalidad_caja_pesada, p.precio_mayoreo_kg, p.destare_kg,
                     p.modalidad_caja_sellada, p.precio_caja_sellada, p.peso_caja_sellada_kg,
                     p.modalidad_unidad, p.precio_por_unidad,
                     pd.precio_mayoreo_kg, pd.precio_caja_sellada, pd.precio_unidad
            ORDER BY p.nombre
        `, [q.bodega_id, hoy]);
        return r.rows;
    });

    app.get("/tarima-completa-info", async (request) => {
        const q = request.query as { producto_id: string; bodega_id: string };
        if (!q.producto_id || !q.bodega_id) return { cajas_restantes: 0 };
        const r = await query(`
            SELECT id, cajas_restantes, cajas_originales
            FROM tarimas
            WHERE estado = 'RECIBIDA' AND bodega_id = $1 AND producto_id = $2 AND cajas_restantes = cajas_originales
            ORDER BY fecha_caducidad ASC NULLS LAST, created_at ASC
            LIMIT 1
        `, [q.bodega_id, q.producto_id]);
        return r.rows[0] || { cajas_restantes: 0 };
    });

    // --- Ventas normales ---
    app.get("/", async (request) => {
        const q = request.query as { desde?: string; hasta?: string };
        const params: any[] = [];
        const condiciones: string[] = [];
        if (q.desde) {
            params.push(q.desde);
            condiciones.push(`v.created_at::date >= $${params.length}::date`);
        }
        if (q.hasta) {
            params.push(q.hasta);
            condiciones.push(`v.created_at::date <= $${params.length}::date`);
        }
        const where = condiciones.length ? "WHERE " + condiciones.join(" AND ") : "";
        const result = await query(`
            SELECT v.*, b.nombre AS bodega_nombre
            FROM ventas v
            JOIN bodegas b ON b.id = v.bodega_id
            ${where}
            ORDER BY v.created_at DESC
            LIMIT 50
        `, params);
        return result.rows;
    });

    app.get("/credito-pendiente", async (request) => {
        const q = request.query as { cliente?: string };
        const params: any[] = [];
        let where = "WHERE v.saldo_pendiente > 0 AND v.saldo_pendiente IS NOT NULL";
        if (q.cliente) {
            params.push(`%${q.cliente}%`);
            where += ` AND c.nombre ILIKE $${params.length}`;
        }
        const result = await query(`
            SELECT v.*, c.nombre AS cliente_nombre, c.telefono, b.nombre AS bodega_nombre
            FROM ventas v
            LEFT JOIN clientes c ON c.id = v.cliente_id
            JOIN bodegas b ON b.id = v.bodega_id
            ${where}
            ORDER BY v.fecha_vencimiento ASC NULLS LAST
        `, params);
        return result.rows;
    });

    app.get("/resumen", async (request) => {
        return handleResumen(request);
    });
    app.get("/totales", async (request) => {
        return handleResumen(request);
    });

    async function handleResumen(request: any) {
        const q = request.query as { desde?: string; hasta?: string; cliente?: string };
        const params: any[] = [];
        const condiciones: string[] = [];
        if (q.desde) { params.push(q.desde); condiciones.push(`v.created_at::date >= $${params.length}::date`); }
        if (q.hasta) { params.push(q.hasta); condiciones.push(`v.created_at::date <= $${params.length}::date`); }
        if (q.cliente) { params.push(`%${q.cliente}%`); condiciones.push(`c.nombre ILIKE $${params.length}`); }
        const where = condiciones.length ? "WHERE " + condiciones.join(" AND ") : "";
        const result = await query(`
            SELECT
                COALESCE(COUNT(v.id), 0) AS total_ventas,
                COALESCE(SUM(v.total), 0) AS total_ingresos,
                COALESCE(SUM(v.total) FILTER (WHERE v.tipo_pago = 'contado'), 0) AS total_contado,
                COALESCE(SUM(v.total) FILTER (WHERE v.tipo_pago = 'credito'), 0) AS total_credito,
                COALESCE(SUM(v.saldo_pendiente), 0) AS total_pendiente
            FROM ventas v
            LEFT JOIN clientes c ON c.id = v.cliente_id
            ${where}
        `, params);
        return result.rows[0];
    }

    app.get<{ Params: { id: string } }>("/:id/detalles", async (request) => {
        const result = await query(`
            SELECT vd.*, p.nombre AS producto_nombre
            FROM venta_detalles vd
            JOIN productos p ON p.id = vd.producto_id
            WHERE vd.venta_id = $1
        `, [request.params.id]);
        return result.rows;
    });

    app.post<{
        Body: {
            bodega_id: string;
            items: { tarima_id?: string; producto_id?: string; modalidad: string; cantidad: number; cajas?: number; destare_kg?: number; precio_unitario: number; subtotal: number; bodega_id?: string; vender_completa?: boolean }[];
            tipo_pago: string;
            cliente_id?: string;
            fecha_vencimiento?: string;
            monto_efectivo?: number;
            monto_cambio?: number;
        }
    }>("/", async (request, reply) => {
        const { bodega_id, items, tipo_pago, cliente_id, fecha_vencimiento, monto_efectivo, monto_cambio } = request.body;
        if (!items.length) return reply.status(400).send({ error: "Sin productos" });

        const total = items.reduce((s, i) => s + i.subtotal, 0);

        // Compute total kg from items
        let totalKg = 0;
        for (const item of items) {
            if (item.modalidad === "caja_pesada") {
                totalKg += item.cantidad || 0;
            } else if (item.modalidad === "caja_sellada_entera" || item.modalidad === "caja_sellada_media") {
                const prod = await query("SELECT peso_caja_sellada_kg FROM productos WHERE id = $1", [item.producto_id]);
                const pesoKg = parseFloat(prod.rows[0]?.peso_caja_sellada_kg || "0");
                const cajas = item.modalidad === "caja_sellada_media" ? (item.cantidad || 0) * 0.5 : (item.cantidad || 0);
                totalKg += cajas * pesoKg;
            }
        }

        const fecha = new Date().toISOString().substring(0, 10);
        const seq = await query(
            `SELECT COALESCE(MAX(CAST(SPLIT_PART(folio, '-', 3) AS INTEGER)), 0) + 1 AS seq
             FROM ventas WHERE folio LIKE $1`,
            [`MAY-${fecha.replace(/-/g, "")}-%`]
        );
        const folio = `MAY-${fecha.replace(/-/g, "")}-${String(seq.rows[0].seq).padStart(4, "0")}`;

        const venta = await query(`
            INSERT INTO ventas (folio, bodega_id, total_kg, total, tipo_pago, cliente_id, fecha_vencimiento, saldo_pendiente, monto_efectivo, monto_cambio)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *
        `, [
            folio, bodega_id, totalKg, total, tipo_pago || "contado",
            cliente_id || null, fecha_vencimiento || null,
            tipo_pago === "credito" ? total : 0,
            monto_efectivo || total, monto_cambio || 0,
        ]);

        for (const item of items) {
            const itemBodegaId = (item as any).bodega_id || bodega_id;
            let tarimaId = item.tarima_id;

            if (!tarimaId && item.producto_id) {
                // Auto-assign: always filter by cajas_restantes > 0
                const params: any[] = [itemBodegaId, item.producto_id];
                let extraWhere = "AND cajas_restantes > 0";

                // For CP/CS with a known cajas count, require enough stock in one tarima
                if (item.modalidad !== "unidad" && !(item as any).vender_completa) {
                    const cajasRequeridas = item.modalidad === "caja_pesada"
                        ? ((item as any).cajas || 0)
                        : item.modalidad === "caja_sellada_media"
                            ? ((item.cantidad || 0) * 0.5)
                            : (item.cantidad || 0);
                    if (cajasRequeridas > 0) {
                        params.push(cajasRequeridas);
                        extraWhere += ` AND cajas_restantes >= $${params.length}`;
                    }
                }

                const t = await query(`
                    SELECT id, lote_id, producto_id, cajas_restantes, cajas_originales
                    FROM tarimas
                    WHERE estado IN ('RECIBIDA','PARCIAL') AND bodega_id = $1 AND producto_id = $2 ${extraWhere}
                    ORDER BY CASE WHEN estado = 'PARCIAL' THEN 0 ELSE 1 END, fecha_caducidad ASC NULLS LAST, created_at ASC
                    LIMIT 1
                `, params);

                if (!t.rows.length) {
                    await query("DELETE FROM venta_detalles WHERE venta_id = $1", [venta.rows[0].id]);
                    await query("DELETE FROM ventas WHERE id = $1", [venta.rows[0].id]);
                    return reply.status(400).send({ error: `Sin tarimas disponibles para producto ${item.producto_id}` });
                }
                tarimaId = t.rows[0].id;
            }

            if (!tarimaId) {
                await query("DELETE FROM venta_detalles WHERE venta_id = $1", [venta.rows[0].id]);
                await query("DELETE FROM ventas WHERE id = $1", [venta.rows[0].id]);
                return reply.status(400).send({ error: "Item sin producto_id ni tarima_id" });
            }

            const tarima = await query("SELECT * FROM tarimas WHERE id = $1", [tarimaId]);
            if (!tarima.rows.length) {
                await query("DELETE FROM venta_detalles WHERE venta_id = $1", [venta.rows[0].id]);
                await query("DELETE FROM ventas WHERE id = $1", [venta.rows[0].id]);
                return reply.status(400).send({ error: `Tarima ${tarimaId} no encontrada` });
            }

            const t = tarima.rows[0];
            const cajasRestantes = parseFloat(t.cajas_restantes) || 1;
            const cajasOriginales = parseFloat(t.cajas_originales) || 1;

            // Calculate cajas to deduct
            let cajasDescontar: number;
            if ((item as any).vender_completa) {
                cajasDescontar = cajasRestantes;
            } else if (item.modalidad === "caja_pesada") {
                cajasDescontar = (item as any).cajas || item.cantidad || 0;
            } else if (item.modalidad === "caja_sellada_media") {
                cajasDescontar = (item.cantidad || 0) * 0.5;
            } else if (item.modalidad === "unidad") {
                cajasDescontar = cajasRestantes;
            } else {
                cajasDescontar = item.cantidad || 0;
            }

            const cajasFinales = Math.min(cajasDescontar, cajasRestantes);
            const nuevasRestantes = Math.max(0, cajasRestantes - cajasFinales);

            let nuevoEstado: string;
            if (nuevasRestantes <= 0) {
                nuevoEstado = 'VENDIDA';
            } else if (nuevasRestantes < cajasOriginales) {
                nuevoEstado = 'PARCIAL';
            } else {
                nuevoEstado = 'RECIBIDA';
            }

            await query(`
                UPDATE tarimas SET cajas_restantes = $1, estado = $2, updated_at = NOW()
                WHERE id = $3
            `, [nuevasRestantes, nuevoEstado, tarimaId]);

            await query(`
                INSERT INTO venta_detalles (venta_id, producto_id, lote_id, cantidad_kg, cantidad_cajas, cantidad_unidades, destare_kg, precio_unitario, subtotal, bodega_id)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            `, [
                venta.rows[0].id, t.producto_id, t.lote_id,
                item.modalidad === "caja_pesada" ? item.cantidad : null,
                item.modalidad === "caja_pesada" ? (item as any).cajas || null : item.modalidad === "caja_sellada_entera" ? item.cantidad : item.modalidad === "caja_sellada_media" ? (item.cantidad || 0) * 0.5 : null,
                item.modalidad === "unidad" ? item.cantidad : null,
                item.modalidad === "caja_pesada" ? (item as any).destare_kg || null : null,
                item.precio_unitario, item.subtotal, itemBodegaId,
            ]);

            await cascadeLoteEstado(t.lote_id);
        }

        return venta.rows[0];
    });

    app.post<{
        Body: {
            items: { producto_id: string; cantidad_kg?: number; cantidad_piezas?: number; precio_unitario: number; subtotal: number }[];
            tipo_pago: string;
            monto_efectivo?: number;
            monto_cambio?: number;
        }
    }>("/menudeo", async (request, reply) => {
        const { items, tipo_pago, monto_efectivo, monto_cambio } = request.body;
        if (!items.length) return reply.status(400).send({ error: "Sin productos" });

        const total = items.reduce((s, i) => s + i.subtotal, 0);
        const totalKg = items.reduce((s, i) => s + (i.cantidad_kg || 0), 0);

        const fecha = new Date().toISOString().substring(0, 10);
        const seq = await query(
            `SELECT COALESCE(MAX(CAST(SPLIT_PART(folio, '-', 3) AS INTEGER)), 0) + 1 AS seq
             FROM ventas WHERE folio LIKE $1`,
            [`MENU-${fecha.replace(/-/g, "")}-%`]
        );
        const folio = `MENU-${fecha.replace(/-/g, "")}-${String(seq.rows[0].seq).padStart(4, "0")}`;

        const mostrador = await query("SELECT id FROM bodegas WHERE es_mostrador = TRUE LIMIT 1");
        if (!mostrador.rows.length) return reply.status(400).send({ error: "No hay bodega de mostrador configurada" });
        const bodegaId = mostrador.rows[0].id;

        const venta = await query(`
            INSERT INTO ventas (folio, bodega_id, total_kg, total, tipo_pago, monto_efectivo, monto_cambio)
            VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *
        `, [
            folio, bodegaId, totalKg || 0, total, tipo_pago || "contado",
            monto_efectivo || total, monto_cambio || 0,
        ]);

        for (const item of items) {
            await query(`
                INSERT INTO venta_detalles (venta_id, producto_id, lote_id, cantidad_kg, cantidad_unidades, precio_unitario, subtotal)
                VALUES ($1, $2, NULL, $3, $4, $5, $6)
            `, [venta.rows[0].id, item.producto_id, item.cantidad_kg || null, item.cantidad_piezas || null, item.precio_unitario, item.subtotal]);

            const kg = item.cantidad_kg || 0;
            const pz = item.cantidad_piezas || 0;

            const updated = await query(`
                UPDATE mostrador_stock
                SET cantidad_kg = GREATEST(COALESCE(cantidad_kg, 0) - $1, 0),
                    cantidad_piezas = GREATEST(COALESCE(cantidad_piezas, 0) - $2, 0),
                    updated_at = NOW()
                WHERE producto_id = $3 RETURNING *
            `, [kg, pz, item.producto_id]);

            if (!updated.rows.length) {
                await query("DELETE FROM venta_detalles WHERE venta_id = $1", [venta.rows[0].id]);
                await query("DELETE FROM ventas WHERE id = $1", [venta.rows[0].id]);
                return reply.status(400).send({ error: `Stock insuficiente para ${item.producto_id}` });
            }
        }

        return venta.rows[0];
    });
}
