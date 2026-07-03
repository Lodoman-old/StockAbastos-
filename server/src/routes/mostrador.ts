import { FastifyInstance } from "fastify";
import { query } from "../db.js";
import { hoyMexico } from "../date-utils.js";

export async function mostradorRoutes(app: FastifyInstance) {

    app.get("/tarimas-disponibles/:bodegaId", async (request, reply) => {
        const { bodegaId } = request.params as any;
        const r = await query(`
            SELECT t.id AS tarima_id, t.codigo_qr, t.cajas_restantes, t.cajas_originales,
                   p.id AS producto_id, p.nombre AS producto_nombre,
                   p.modalidad_caja_pesada, p.modalidad_caja_sellada,
                   p.modalidad_kilo_suelto, p.modalidad_unidad,
                   p.destare_kg, p.peso_caja_sellada_kg,
                   p.precio_mayoreo_kg, p.precio_caja_sellada,
                   p.precio_menudeo_kg, p.precio_por_unidad,
                   l.codigo_lote
            FROM tarimas t
            JOIN productos p ON p.id = t.producto_id
            JOIN lotes l ON l.id = t.lote_id
            WHERE t.estado IN ('RECIBIDA','PARCIAL') AND t.bodega_id = $1
              AND t.cajas_restantes > 0
              AND (p.modalidad_caja_pesada = TRUE OR p.modalidad_caja_sellada = TRUE)
            ORDER BY CASE WHEN t.estado = 'PARCIAL' THEN 0 ELSE 1 END, t.fecha_caducidad ASC NULLS LAST, t.created_at ASC
        `, [bodegaId]);
        return r.rows;
    });

    app.get("/stock", async () => {
        const hoy = hoyMexico();
        const r = await query(`
            SELECT ms.*, p.nombre AS producto_nombre, p.sku,
                   p.modalidad_kilo_suelto, p.modalidad_unidad,
                   p.precio_menudeo_kg, p.precio_por_unidad,
                   COALESCE(pd.precio_menudeo_kg, p.precio_menudeo_kg) AS precio_menudeo_kg_hoy,
                   COALESCE(pd.precio_unidad, p.precio_por_unidad) AS precio_unidad_hoy
            FROM mostrador_stock ms
            JOIN productos p ON p.id = ms.producto_id
            LEFT JOIN precios_diarios pd ON pd.producto_id = p.id AND pd.fecha = $1::date
            WHERE (ms.cantidad_kg > 0 OR ms.cantidad_piezas > 0)
              AND p.activo = TRUE
            ORDER BY p.nombre
        `, [hoy]);
        return r.rows;
    });

    app.post("/surtir", async (request, reply) => {
        const { producto_id, cantidad_kg, cantidad_piezas } = request.body as any;
        if (!producto_id) return reply.status(400).send({ error: "producto_id requerido" });
        if (!cantidad_kg && !cantidad_piezas) return reply.status(400).send({ error: "cantidad_kg o cantidad_piezas requerido" });

        const prod = await query("SELECT id FROM productos WHERE id = $1 AND activo = TRUE", [producto_id]);
        if (!prod.rows.length) return reply.status(404).send({ error: "Producto no encontrado" });

        const result = await query(`
            INSERT INTO mostrador_stock (producto_id, cantidad_kg, cantidad_piezas)
            VALUES ($1, $2, $3)
            ON CONFLICT (producto_id) DO UPDATE
            SET cantidad_kg = COALESCE(mostrador_stock.cantidad_kg, 0) + COALESCE($2, 0),
                cantidad_piezas = COALESCE(mostrador_stock.cantidad_piezas, 0) + COALESCE($3, 0),
                updated_at = NOW()
            RETURNING *
        `, [producto_id, cantidad_kg || 0, cantidad_piezas || 0]);

        return result.rows[0];
    });

    app.post("/surtir-desde-tarima", async (request, reply) => {
        const { tarima_id, cajas, peso_bruto } = request.body as any;
        if (!tarima_id || !cajas || cajas <= 0) return reply.status(400).send({ error: "tarima_id y cajas requeridos" });

        const tarima = await query(`
            SELECT t.*, p.id AS producto_id, p.nombre AS producto_nombre,
                   p.modalidad_caja_pesada, p.modalidad_caja_sellada,
                   p.destare_kg, p.peso_caja_sellada_kg,
                   p.precio_mayoreo_kg, p.precio_caja_sellada
            FROM tarimas t
            JOIN productos p ON p.id = t.producto_id
            WHERE t.id = $1
        `, [tarima_id]);

        if (!tarima.rows.length) return reply.status(404).send({ error: "Tarima no encontrada" });

        const t = tarima.rows[0];
        const cajasARestar = Math.min(cajas, parseFloat(t.cajas_restantes));
        let kgCalculados = 0;

        if (t.modalidad_caja_pesada) {
            const destareTotal = (parseFloat(t.destare_kg) || 0) * cajasARestar;
            const pb = peso_bruto || 0;
            kgCalculados = Math.max(0, pb - destareTotal);
        } else if (t.modalidad_caja_sellada) {
            kgCalculados = cajasARestar * (parseFloat(t.peso_caja_sellada_kg) || 0);
        }

        const nuevasRestantes = parseFloat(t.cajas_restantes) - cajasARestar;
        let nuevoEstado = t.estado;
        if (nuevasRestantes <= 0) {
            nuevoEstado = 'VENDIDA';
        } else if (nuevasRestantes < parseFloat(t.cajas_originales)) {
            nuevoEstado = 'PARCIAL';
        }

        await query(`
            UPDATE tarimas SET cajas_restantes = $1, estado = $2, updated_at = NOW()
            WHERE id = $3
        `, [nuevasRestantes, nuevoEstado, tarima_id]);

        const result = await query(`
            INSERT INTO mostrador_stock (producto_id, cantidad_kg, cantidad_piezas)
            VALUES ($1, $2, 0)
            ON CONFLICT (producto_id) DO UPDATE
            SET cantidad_kg = COALESCE(mostrador_stock.cantidad_kg, 0) + COALESCE($2, 0),
                updated_at = NOW()
            RETURNING *
        `, [t.producto_id, kgCalculados]);

        return {
            kg_calculados: kgCalculados,
            cajas_descontadas: cajasARestar,
            tarima_estado: nuevoEstado,
            mostrador: result.rows[0],
        };
    });

    app.post("/ajustar-stock", async (request, reply) => {
        const { id, cantidad_kg, cantidad_piezas } = request.body as any;
        if (!id) return reply.status(400).send({ error: "id requerido" });

        const result = await query(`
            UPDATE mostrador_stock SET cantidad_kg = $1, cantidad_piezas = $2, updated_at = NOW()
            WHERE id = $3 RETURNING *
        `, [cantidad_kg || 0, cantidad_piezas || 0, id]);

        if (!result.rows.length) return reply.status(404).send({ error: "Registro no encontrado" });
        return result.rows[0];
    });
}
