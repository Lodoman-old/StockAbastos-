import { FastifyInstance } from "fastify";
import { query } from "../db.js";

export async function preciosDiariosRoutes(app: FastifyInstance) {
    app.get("/pendientes", async () => {
        const hoy = new Date().toISOString().substring(0, 10);
        const r = await query(`
            SELECT p.id, p.nombre, p.sku,
                   p.precio_mayoreo_kg, p.precio_caja_sellada, p.precio_menudeo_kg, p.precio_por_unidad,
                   p.modalidad_caja_pesada, p.modalidad_caja_sellada, p.modalidad_kilo_suelto, p.modalidad_unidad,
                   pd.precio_mayoreo_kg AS precio_hoy_mayoreo_kg,
                   pd.precio_caja_sellada AS precio_hoy_caja_sellada,
                   pd.precio_menudeo_kg AS precio_hoy_menudeo_kg,
                   pd.precio_unidad AS precio_hoy_unidad
            FROM productos p
            LEFT JOIN precios_diarios pd ON pd.producto_id = p.id AND pd.fecha = $1::date
            WHERE p.activo = TRUE
            ORDER BY p.nombre
        `, [hoy]);
        return r.rows;
    });

    app.get("/historial", async () => {
        const r = await query(`
            SELECT pd.fecha, pd.precio_mayoreo_kg, pd.precio_caja_sellada, pd.precio_menudeo_kg, pd.precio_unidad,
                   pd.producto_id, p.nombre AS producto_nombre,
                   p.precio_mayoreo_kg AS precio_base_mayoreo_kg
            FROM precios_diarios pd
            JOIN productos p ON p.id = pd.producto_id
            ORDER BY pd.fecha DESC, p.nombre ASC
        `);
        return r.rows;
    });

    app.get("/historial/:productoId", async (request: any) => {
        const { productoId } = request.params;
        const r = await query(`
            SELECT pd.fecha, pd.precio_mayoreo_kg, pd.precio_caja_sellada, pd.precio_menudeo_kg, pd.precio_unidad,
                   p.nombre AS producto_nombre,
                   p.precio_mayoreo_kg AS precio_base_mayoreo_kg,
                   p.precio_caja_sellada AS precio_base_caja_sellada
            FROM precios_diarios pd
            JOIN productos p ON p.id = pd.producto_id
            WHERE pd.producto_id = $1
            ORDER BY pd.fecha ASC
        `, [productoId]);
        return r.rows;
    });

    app.get("/:fecha?", async (request: any) => {
        const fecha = request.params.fecha || new Date().toISOString().substring(0, 10);
        const r = await query(`
            SELECT pd.*, p.nombre AS producto_nombre, p.sku
            FROM precios_diarios pd
            JOIN productos p ON p.id = pd.producto_id
            WHERE pd.fecha = $1::date
            ORDER BY p.nombre
        `, [fecha]);
        return r.rows;
    });

    app.put("/", async (request: any, reply) => {
        const { items } = request.body;
        if (!items || !items.length) return reply.status(400).send({ error: "Sin productos" });

        const hoy = new Date().toISOString().substring(0, 10);
        for (const item of items) {
            await query(
                `INSERT INTO precios_diarios (producto_id, precio_mayoreo_kg, precio_caja_sellada, precio_menudeo_kg, precio_unidad, fecha)
                 VALUES ($1, $2, $3, $4, $5, $6::date)
                 ON CONFLICT (producto_id, fecha) DO UPDATE SET
                     precio_mayoreo_kg = $2, precio_caja_sellada = $3, precio_menudeo_kg = $4, precio_unidad = $5`,
                [item.producto_id,
                 item.precio_mayoreo_kg || null,
                 item.precio_caja_sellada || null,
                 item.precio_menudeo_kg || null,
                 item.precio_unidad || null,
                 hoy]
            );
        }
        return { ok: true };
    });
}
