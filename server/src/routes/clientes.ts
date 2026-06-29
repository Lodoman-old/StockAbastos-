import { FastifyInstance } from "fastify";
import { query } from "../db.js";

export async function clientesRoutes(app: FastifyInstance) {
    app.get("/", async () => {
        const r = await query("SELECT * FROM clientes ORDER BY nombre");
        return r.rows;
    });

    app.post<{ Body: { nombre: string; telefono?: string; direccion?: string; limite_credito?: number } }>("/", async (request, reply) => {
        const { nombre, telefono, direccion, limite_credito } = request.body;
        if (!nombre) return reply.status(400).send({ error: "Nombre requerido" });
        const r = await query(
            "INSERT INTO clientes (nombre, telefono, direccion, limite_credito) VALUES ($1, $2, $3, $4) RETURNING *",
            [nombre, telefono || null, direccion || null, limite_credito || 0]
        );
        return r.rows[0];
    });

    app.put<{ Params: { id: string }; Body: { nombre?: string; telefono?: string; direccion?: string; limite_credito?: number } }>("/:id", async (request, reply) => {
        const { nombre, telefono, direccion, limite_credito } = request.body;
        const r = await query(
            "UPDATE clientes SET nombre = COALESCE($1, nombre), telefono = COALESCE($2, telefono), direccion = COALESCE($3, direccion), limite_credito = COALESCE($4, limite_credito), updated_at = NOW() WHERE id = $5 RETURNING *",
            [nombre, telefono, direccion, limite_credito, request.params.id]
        );
        if (!r.rows.length) return reply.status(404).send({ error: "Cliente no encontrado" });
        return r.rows[0];
    });
}
