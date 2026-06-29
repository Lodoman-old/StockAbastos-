import { FastifyInstance } from "fastify";
import { query } from "../db.js";

export async function proveedoresRoutes(app: FastifyInstance) {
    app.get("/", async () => {
        const r = await query("SELECT * FROM proveedores ORDER BY nombre");
        return r.rows;
    });

    app.get("/:id", async (request: any) => {
        const r = await query("SELECT * FROM proveedores WHERE id = $1", [request.params.id]);
        if (!r.rows.length) return { error: "No encontrado" };
        return r.rows[0];
    });

    app.post("/", async (request: any, reply) => {
        const { nombre, contacto, telefono, email, direccion, rfc } = request.body;
        if (!nombre) return reply.status(400).send({ error: "Nombre requerido" });
        const r = await query(
            `INSERT INTO proveedores (nombre, contacto, telefono, email, direccion, rfc)
             VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
            [nombre, contacto || "", telefono || "", email || "", direccion || "", rfc || ""]
        );
        return r.rows[0];
    });

    app.put("/:id", async (request: any, reply) => {
        const { nombre, contacto, telefono, email, direccion, rfc } = request.body;
        const r = await query(
            `UPDATE proveedores SET nombre=$1, contacto=$2, telefono=$3, email=$4, direccion=$5, rfc=$6, updated_at=NOW()
             WHERE id=$7 RETURNING *`,
            [nombre, contacto || "", telefono || "", email || "", direccion || "", rfc || "", request.params.id]
        );
        if (!r.rows.length) return reply.status(404).send({ error: "No encontrado" });
        return r.rows[0];
    });

    app.delete("/:id", async (request: any, reply) => {
        const r = await query("DELETE FROM proveedores WHERE id=$1 RETURNING id", [request.params.id]);
        if (!r.rows.length) return reply.status(404).send({ error: "No encontrado" });
        return { ok: true };
    });
}
