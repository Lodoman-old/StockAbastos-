import { FastifyInstance } from "fastify";
import { query, transaction } from "../db.js";

export async function pagosRoutes(app: FastifyInstance) {
    app.get<{ Params: { ventaId: string } }>("/venta/:ventaId", async (request) => {
        const r = await query(
            "SELECT * FROM pagos WHERE venta_id = $1 ORDER BY fecha ASC",
            [request.params.ventaId]
        );
        return r.rows;
    });

    app.post<{ Body: { venta_id: string; monto: number; fecha?: string } }>("/", async (request, reply) => {
        const { venta_id, monto, fecha } = request.body;
        if (!venta_id || !monto || monto <= 0) {
            return reply.status(400).send({ error: "Monto inválido" });
        }
        return transaction(async (client) => {
            const venta = await client.query("SELECT * FROM ventas WHERE id = $1 FOR UPDATE", [venta_id]);
            if (!venta.rows.length) throw new Error("Venta no encontrada");
            const v = venta.rows[0];
            if (parseFloat(v.saldo_pendiente || 0) < monto) {
                throw new Error(`El saldo pendiente es $${parseFloat(v.saldo_pendiente).toFixed(2)}, no puedes pagar más`);
            }
            const pago = await client.query(
                "INSERT INTO pagos (venta_id, monto, fecha) VALUES ($1, $2, $3) RETURNING *",
                [venta_id, monto, fecha || new Date().toISOString().substring(0, 10)]
            );
            const nuevoSaldo = Math.max(0, parseFloat(v.saldo_pendiente) - monto);
            await client.query(
                "UPDATE ventas SET saldo_pendiente = $1 WHERE id = $2",
                [nuevoSaldo, venta_id]
            );
            return { success: true, id: pago.rows[0].id, saldo_pendiente: nuevoSaldo };
        });
    });
}
