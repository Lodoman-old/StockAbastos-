import { FastifyInstance } from "fastify";
import { query, transaction } from "../db.js";

export async function lotesRoutes(app: FastifyInstance) {
    app.get("/", async () => {
        const result = await query(`
            SELECT l.*,
                   p.nombre AS producto_nombre, p.sku,
                   b.nombre AS bodega_nombre, b.codigo AS bodega_codigo,
                   u.nombre AS ubicacion_nombre, b.ubicacion_id,
                    (SELECT COUNT(*) FROM tarimas WHERE lote_id = l.id) AS total_tarimas,
                    (SELECT COUNT(*) FROM tarimas WHERE lote_id = l.id AND estado = 'PENDIENTE') AS pendientes,
                     (SELECT COUNT(*) FROM tarimas WHERE lote_id = l.id AND estado = 'RECIBIDA') AS recibidas,
                     (SELECT COUNT(*) FROM tarimas WHERE lote_id = l.id AND estado = 'PARCIAL') AS parcial,
                     (SELECT COUNT(*) FROM tarimas WHERE lote_id = l.id AND estado = 'EN_TRANSITO') AS en_transito,
                   padre.codigo_lote AS padre_codigo
            FROM lotes l
            LEFT JOIN productos p ON p.id = l.producto_id
            LEFT JOIN bodegas b ON b.id = l.bodega_id
            LEFT JOIN ubicaciones u ON u.id = b.ubicacion_id
            LEFT JOIN lotes padre ON padre.id = l.lote_padre_id
            ORDER BY l.created_at DESC
        `);
        return result.rows;
    });

    app.get("/pendientes", async () => {
        const result = await query(`
            SELECT l.*, p.nombre AS producto_nombre, p.sku, b.nombre AS bodega_nombre
            FROM lotes l
            JOIN productos p ON p.id = l.producto_id
            JOIN bodegas b ON b.id = l.bodega_id
            WHERE l.estado = 'RECIBIDO'
            ORDER BY l.created_at DESC
        `);
        return result.rows;
    });

    app.get<{ Params: { codigo: string } }>("/codigo/:codigo", async (request) => {
        const result = await query(`
            SELECT l.*, p.nombre AS producto_nombre, p.sku, b.nombre AS bodega_nombre,
                   b.codigo AS bodega_codigo
            FROM lotes l
            JOIN productos p ON p.id = l.producto_id
            JOIN bodegas b ON b.id = l.bodega_id
            WHERE l.codigo_lote = $1
        `, [request.params.codigo]);
        if (!result.rows.length) return { error: "Lote no encontrado" };
        return result.rows[0];
    });

    app.get<{ Params: { id: string } }>("/:id", async (request) => {
        const result = await query(`
            SELECT l.*, p.nombre AS producto_nombre, p.sku,
                   padre.codigo_lote AS padre_codigo
            FROM lotes l
            LEFT JOIN productos p ON p.id = l.producto_id
            LEFT JOIN lotes padre ON padre.id = l.lote_padre_id
            WHERE l.id = $1
        `, [request.params.id]);
        if (!result.rows.length) return { error: "Lote no encontrado" };
        return result.rows[0];
    });

    app.get<{ Params: { id: string } }>("/:id/movimientos", async (request) => {
        const result = await query(
            "SELECT * FROM movimientos WHERE lote_id = $1 ORDER BY created_at DESC",
            [request.params.id]
        );
        return result.rows;
    });

    app.put<{ Params: { id: string }; Body: { estado: string; bodega_id?: string } }>("/:id/estado", async (request, reply) => {
        const { estado, bodega_id } = request.body;
        const sets = ["estado = $1", "updated_at = NOW()"];
        const params: any[] = [estado];
        let idx = 2;
        if (bodega_id !== undefined) { sets.push(`bodega_id = $${idx++}`); params.push(bodega_id); }
        params.push(request.params.id);
        const result = await query(
            `UPDATE lotes SET ${sets.join(", ")} WHERE id = $${idx} RETURNING *`,
            params
        );
        if (!result.rows.length) return reply.status(404).send({ error: "Lote no encontrado" });
        if (bodega_id !== undefined) {
            await query("UPDATE tarimas SET bodega_id = $1 WHERE lote_id = $2 AND estado = 'PENDIENTE'", [bodega_id, request.params.id]);
        }
        return result.rows[0];
    });

    app.delete<{ Params: { id: string } }>("/:id", async (request, reply) => {
        const { id } = request.params;
        return transaction(async (client) => {
            await client.query("DELETE FROM movimientos WHERE lote_id = $1", [id]);
            await client.query("DELETE FROM tarimas WHERE lote_id = $1", [id]);
            await client.query("DELETE FROM compra_detalles WHERE lote_id = $1", [id]);
            await client.query("DELETE FROM lotes WHERE id = $1", [id]);
            return { ok: true };
        });
    });
}
