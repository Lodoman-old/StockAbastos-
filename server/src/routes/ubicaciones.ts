import { FastifyInstance } from "fastify";
import { query, transaction } from "../db.js";

export async function ubicacionesRoutes(app: FastifyInstance) {
    app.get("/", async () => {
        const result = await query(`
            SELECT u.*,
                   COALESCE(json_agg(json_build_object(
                       'id', b.id, 'codigo', b.codigo, 'nombre', b.nombre, 'activa', b.activa
                   ) ORDER BY b.codigo) FILTER (WHERE b.id IS NOT NULL), '[]') AS bodegas
            FROM ubicaciones u
            LEFT JOIN bodegas b ON b.ubicacion_id = u.id
            WHERE u.activa = TRUE
            GROUP BY u.id, u.nombre, u.direccion, u.activa, u.es_venta_principal, u.created_at
            ORDER BY u.nombre
        `);
        return result.rows;
    });

    app.get("/principal", async () => {
        const result = await query(`
            SELECT u.*,
                   COALESCE(json_agg(json_build_object(
                       'id', b.id, 'codigo', b.codigo, 'nombre', b.nombre, 'activa', b.activa
                   ) ORDER BY b.codigo) FILTER (WHERE b.id IS NOT NULL), '[]') AS bodegas
            FROM ubicaciones u
            LEFT JOIN bodegas b ON b.ubicacion_id = u.id
            WHERE u.es_venta_principal = TRUE
            GROUP BY u.id, u.nombre, u.direccion, u.activa, u.es_venta_principal, u.created_at
            LIMIT 1
        `);
        if (!result.rows.length) return { error: "No hay ubicación principal configurada" };
        return result.rows[0];
    });

    app.get<{ Params: { id: string } }>("/:id", async (request) => {
        const result = await query(`
            SELECT u.*,
                   COALESCE(json_agg(json_build_object(
                       'id', b.id, 'codigo', b.codigo, 'nombre', b.nombre, 'activa', b.activa
                   ) ORDER BY b.codigo) FILTER (WHERE b.id IS NOT NULL), '[]') AS bodegas
            FROM ubicaciones u
            LEFT JOIN bodegas b ON b.ubicacion_id = u.id
            WHERE u.id = $1
            GROUP BY u.id, u.nombre, u.direccion, u.activa, u.es_venta_principal, u.created_at
        `, [request.params.id]);
        if (!result.rows.length) return { error: "Ubicación no encontrada" };
        return result.rows[0];
    });

    app.post<{ Body: { nombre: string; direccion?: string; es_venta_principal?: boolean } }>("/", async (request) => {
        const { nombre, direccion, es_venta_principal } = request.body;
        if (es_venta_principal) {
            await query("UPDATE ubicaciones SET es_venta_principal = FALSE WHERE es_venta_principal = TRUE");
        }
        const result = await query(
            "INSERT INTO ubicaciones (nombre, direccion, es_venta_principal) VALUES ($1, $2, $3) RETURNING *",
            [nombre, direccion || null, es_venta_principal || false]
        );
        return { ...result.rows[0], bodegas: [] };
    });

    app.put<{ Params: { id: string }; Body: { nombre?: string; direccion?: string; activa?: boolean; es_venta_principal?: boolean } }>("/:id", async (request) => {
        const { nombre, direccion, activa, es_venta_principal } = request.body;
        const sets: string[] = [];
        const params: any[] = [];
        let idx = 1;
        if (nombre !== undefined) { sets.push(`nombre = $${idx++}`); params.push(nombre); }
        if (direccion !== undefined) { sets.push(`direccion = $${idx++}`); params.push(direccion); }
        if (activa !== undefined) { sets.push(`activa = $${idx++}`); params.push(activa); }
        if (es_venta_principal !== undefined) { sets.push(`es_venta_principal = $${idx++}`); params.push(es_venta_principal); }
        if (!sets.length) return { error: "Sin campos para actualizar" };
        if (es_venta_principal === true) {
            await query("UPDATE ubicaciones SET es_venta_principal = FALSE WHERE id != $1", [request.params.id]);
        }
        params.push(request.params.id);
        const result = await query(
            `UPDATE ubicaciones SET ${sets.join(", ")} WHERE id = $${idx} RETURNING *`,
            params
        );
        if (!result.rows.length) return { error: "Ubicación no encontrada" };
        return result.rows[0];
    });

    app.delete<{ Params: { id: string } }>("/:id", async (request) => {
        const bodegas = await query("SELECT id FROM bodegas WHERE ubicacion_id = $1", [request.params.id]);
        if (bodegas.rows.length) return { error: `No se puede eliminar: tiene ${bodegas.rows.length} bodega(s) asignada(s)` };
        const result = await query("DELETE FROM ubicaciones WHERE id = $1 RETURNING id", [request.params.id]);
        if (!result.rows.length) return { error: "Ubicación no encontrada" };
        return { deleted: true };
    });
}
