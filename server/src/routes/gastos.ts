import { FastifyInstance } from "fastify";
import { query } from "../db.js";

export async function gastosRoutes(app: FastifyInstance) {
    app.get<{ Querystring: { all?: string } }>("/", async (request) => {
        const { all } = request.query;
        const filter = all === "true" ? "" : " WHERE fecha = CURRENT_DATE";
        const r = await query(`SELECT * FROM gastos${filter} ORDER BY fecha DESC, created_at DESC`);
        return r.rows;
    });

    app.post<{ Body: { concepto: string; monto: number; categoria?: string; fecha?: string } }>("/", async (request, reply) => {
        const { concepto, monto, categoria, fecha } = request.body;
        if (!concepto || !monto) return reply.status(400).send({ error: "Concepto y monto requeridos" });
        const r = await query(
            "INSERT INTO gastos (concepto, monto, categoria, fecha) VALUES ($1, $2, $3, $4) RETURNING *",
            [concepto, monto, categoria || null, fecha || new Date().toISOString().substring(0, 10)]
        );
        return r.rows[0];
    });

    app.delete<{ Params: { id: string } }>("/:id", async (request, reply) => {
        const r = await query("DELETE FROM gastos WHERE id = $1 RETURNING *", [request.params.id]);
        if (!r.rows.length) return reply.status(404).send({ error: "Gasto no encontrado" });
        return { ok: true };
    });
}
