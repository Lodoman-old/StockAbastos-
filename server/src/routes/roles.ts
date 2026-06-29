import { FastifyInstance } from "fastify";
import { query } from "../db.js";

export async function rolesRoutes(app: FastifyInstance) {
    app.get("/", async () => {
        const result = await query("SELECT * FROM roles ORDER BY nombre");
        return result.rows;
    });

    app.get("/permisos/list", async () => {
        const result = await query("SELECT * FROM permisos ORDER BY nombre");
        return result.rows;
    });

    app.get("/:id", async (request: any) => {
        const rol = await query("SELECT * FROM roles WHERE id = $1", [request.params.id]);
        if (!rol.rows.length) return { error: "Rol no encontrado" };
        const permisos = await query(`
            SELECT p.* FROM permisos p
            JOIN rol_permisos rp ON rp.permiso_id = p.id
            WHERE rp.rol_id = $1
            ORDER BY p.clave
        `, [request.params.id]);
        return { ...rol.rows[0], permisos: permisos.rows };
    });

    app.post<{ Body: { nombre: string; descripcion?: string; permisos?: string[] } }>("/", async (request) => {
        const { nombre, descripcion, permisos } = request.body;
        const result = await query(
            "INSERT INTO roles (nombre, descripcion) VALUES ($1, $2) RETURNING *",
            [nombre, descripcion || null]
        );
        const rolId = result.rows[0].id;
        if (permisos && permisos.length) {
            for (const clave of permisos) {
                await query(
                    "INSERT INTO rol_permisos (rol_id, permiso_id) SELECT $1, id FROM permisos WHERE clave = $2 ON CONFLICT DO NOTHING",
                    [rolId, clave]
                );
            }
        }
        return { ...result.rows[0], permisos: permisos || [] };
    });

    app.put<{ Params: { id: string }; Body: { nombre?: string; descripcion?: string; permisos?: string[] } }>("/:id", async (request) => {
        const { nombre, descripcion, permisos } = request.body;
        if (nombre) await query("UPDATE roles SET nombre = $1 WHERE id = $2", [nombre, request.params.id]);
        if (descripcion !== undefined) await query("UPDATE roles SET descripcion = $1 WHERE id = $2", [descripcion, request.params.id]);
        if (permisos) {
            await query("DELETE FROM rol_permisos WHERE rol_id = $1", [request.params.id]);
            for (const clave of permisos) {
                await query(
                    "INSERT INTO rol_permisos (rol_id, permiso_id) SELECT $1, id FROM permisos WHERE clave = $2 ON CONFLICT DO NOTHING",
                    [request.params.id, clave]
                );
            }
        }
        const result = await query("SELECT * FROM roles WHERE id = $1", [request.params.id]);
        if (!result.rows.length) return { error: "Rol no encontrado" };
        const rolPermisos = await query(`
            SELECT p.clave FROM permisos p
            JOIN rol_permisos rp ON rp.permiso_id = p.id
            WHERE rp.rol_id = $1
        `, [request.params.id]);
        return { ...result.rows[0], permisos: rolPermisos.rows.map((r: any) => r.clave) };
    });

    app.delete<{ Params: { id: string } }>("/:id", async (request) => {
        const users = await query("SELECT id FROM usuarios WHERE rol_id = $1", [request.params.id]);
        if (users.rows.length) return { error: `No se puede eliminar: ${users.rows.length} usuario(s) tienen este rol` };
        const result = await query("DELETE FROM roles WHERE id = $1 RETURNING id", [request.params.id]);
        if (!result.rows.length) return { error: "Rol no encontrado" };
        return { deleted: true };
    });

}
