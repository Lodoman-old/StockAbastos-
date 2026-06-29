import { FastifyInstance } from "fastify";
import { query } from "../db.js";

export async function tarimasTiposRoutes(app: FastifyInstance) {
    app.get("/", async () => {
        const r = await query("SELECT * FROM tarimas_tipos WHERE activo = TRUE ORDER BY nombre");
        return r.rows;
    });

    app.get("/todas", async () => {
        const r = await query("SELECT * FROM tarimas_tipos ORDER BY nombre");
        return r.rows;
    });

    app.post<{ Body: { nombre: string; cantidad_cajas: number } }>("/", async (request, reply) => {
        const { nombre, cantidad_cajas } = request.body;
        if (!nombre || !cantidad_cajas) return reply.status(400).send({ error: "Nombre y cantidad de cajas requeridos" });
        const r = await query("INSERT INTO tarimas_tipos (nombre, cantidad_cajas) VALUES ($1, $2) RETURNING *", [nombre, cantidad_cajas]);
        return r.rows[0];
    });

    app.put<{ Params: { id: string }; Body: { nombre?: string; cantidad_cajas?: number; activo?: boolean } }>("/:id", async (request, reply) => {
        const { id } = request.params;
        const { nombre, cantidad_cajas, activo } = request.body;
        const sets: string[] = [];
        const vals: any[] = [];
        if (nombre !== undefined) { sets.push(`nombre = $${vals.length + 1}`); vals.push(nombre); }
        if (cantidad_cajas !== undefined) { sets.push(`cantidad_cajas = $${vals.length + 1}`); vals.push(cantidad_cajas); }
        if (activo !== undefined) { sets.push(`activo = $${vals.length + 1}`); vals.push(activo); }
        if (!sets.length) return reply.status(400).send({ error: "Sin campos" });
        vals.push(id);
        const r = await query(`UPDATE tarimas_tipos SET ${sets.join(", ")} WHERE id = $${vals.length} RETURNING *`, vals);
        if (!r.rows.length) return reply.status(404).send({ error: "No encontrado" });
        return r.rows[0];
    });

    app.delete<{ Params: { id: string } }>("/:id", async (request, reply) => {
        const r = await query("UPDATE tarimas_tipos SET activo = FALSE WHERE id = $1 RETURNING *", [request.params.id]);
        if (!r.rows.length) return reply.status(404).send({ error: "No encontrado" });
        return { ok: true };
    });
}
