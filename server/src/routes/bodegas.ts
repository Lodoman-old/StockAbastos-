import { FastifyInstance } from "fastify";
import { query } from "../db.js";

export async function bodegasRoutes(app: FastifyInstance) {
    app.get("/", async () => {
        const result = await query(`
            SELECT b.*, u.nombre AS ubicacion_nombre
            FROM bodegas b
            LEFT JOIN ubicaciones u ON u.id = b.ubicacion_id
            WHERE b.activa = TRUE
            ORDER BY b.nombre
        `);
        return result.rows;
    });

    app.get("/todas", async () => {
        const result = await query(`
            SELECT b.*, u.nombre AS ubicacion_nombre
            FROM bodegas b
            LEFT JOIN ubicaciones u ON u.id = b.ubicacion_id
            ORDER BY b.nombre
        `);
        return result.rows;
    });

    app.get<{ Params: { id: string } }>("/:id", async (request) => {
        const result = await query(`
            SELECT b.*, u.nombre AS ubicacion_nombre
            FROM bodegas b
            LEFT JOIN ubicaciones u ON u.id = b.ubicacion_id
            WHERE b.id = $1
        `, [request.params.id]);
        if (!result.rows.length) return { error: "Bodega no encontrada" };
        return result.rows[0];
    });

    app.post<{ Body: { codigo: string; nombre: string; ubicacion_id?: string; es_default?: boolean } }>("/", async (request) => {
        const { codigo, nombre, ubicacion_id, es_default } = request.body;
        const result = await query(
            "INSERT INTO bodegas (codigo, nombre, ubicacion_id, es_default) VALUES ($1, $2, $3, $4) RETURNING *",
            [codigo, nombre, ubicacion_id || null, es_default || false]
        );
        return result.rows[0];
    });

    app.put<{ Params: { id: string }; Body: { codigo?: string; nombre?: string; ubicacion_id?: string | null; activa?: boolean; es_default?: boolean } }>("/:id", async (request) => {
        const { codigo, nombre, ubicacion_id, activa, es_default } = request.body;
        const sets: string[] = [];
        const params: any[] = [];
        let idx = 1;
        if (codigo !== undefined) { sets.push(`codigo = $${idx++}`); params.push(codigo); }
        if (nombre !== undefined) { sets.push(`nombre = $${idx++}`); params.push(nombre); }
        if (ubicacion_id !== undefined) { sets.push(`ubicacion_id = $${idx++}`); params.push(ubicacion_id); }
        if (activa !== undefined) { sets.push(`activa = $${idx++}`); params.push(activa); }
        if (es_default !== undefined) { sets.push(`es_default = $${idx++}`); params.push(es_default); }
        if (!sets.length) return { error: "Sin campos para actualizar" };
        params.push(request.params.id);
        const result = await query(
            `UPDATE bodegas SET ${sets.join(", ")} WHERE id = $${idx} RETURNING *`,
            params
        );
        if (!result.rows.length) return { error: "Bodega no encontrada" };
        return result.rows[0];
    });

    app.delete<{ Params: { id: string } }>("/:id", async (request) => {
        const lotes = await query("SELECT id FROM lotes WHERE bodega_id = $1 AND estado NOT IN ('VENDIDO','MERMA')", [request.params.id]);
        if (lotes.rows.length) return { error: `Tiene ${lotes.rows.length} lote(s) activo(s). Desactívela en lugar de eliminarla.` };
        await query("UPDATE bodegas SET activa = FALSE WHERE id = $1", [request.params.id]);
        return { deleted: true };
    });
}
