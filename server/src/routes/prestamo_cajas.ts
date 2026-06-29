import { FastifyInstance } from "fastify";
import { query } from "../db.js";

export async function prestamoCajasRoutes(app: FastifyInstance) {
    app.get("/", async () => {
        const r = await query(`
            SELECT pc.*, v.folio, c.nombre AS cliente_nombre,
                   p.nombre AS producto_nombre,
                   (pc.cantidad_cajas - pc.cajas_devueltas) AS pendientes
            FROM prestamo_cajas pc
            JOIN ventas v ON v.id = pc.venta_id
            LEFT JOIN clientes c ON c.id = pc.cliente_id
            LEFT JOIN productos p ON p.id = pc.producto_id
            WHERE (pc.cantidad_cajas - pc.cajas_devueltas) > 0
            ORDER BY pc.fecha_prestamo DESC
        `);
        return r.rows;
    });

    app.get("/historial", async () => {
        const r = await query(`
            SELECT pc.*, v.folio, c.nombre AS cliente_nombre,
                   p.nombre AS producto_nombre,
                   (pc.cantidad_cajas - pc.cajas_devueltas) AS pendientes
            FROM prestamo_cajas pc
            JOIN ventas v ON v.id = pc.venta_id
            LEFT JOIN clientes c ON c.id = pc.cliente_id
            LEFT JOIN productos p ON p.id = pc.producto_id
            ORDER BY pc.created_at DESC
            LIMIT 100
        `);
        return r.rows;
    });

    app.get<{ Params: { id: string } }>("/:id", async (request) => {
        const r = await query(`
            SELECT pc.*, v.folio, c.nombre AS cliente_nombre, p.nombre AS producto_nombre
            FROM prestamo_cajas pc
            JOIN ventas v ON v.id = pc.venta_id
            LEFT JOIN clientes c ON c.id = pc.cliente_id
            LEFT JOIN productos p ON p.id = pc.producto_id
            WHERE pc.id = $1
        `, [request.params.id]);
        return r.rows[0] || null;
    });

    app.post<{ Body: { venta_id: string; cliente_id?: string; producto_id?: string; cantidad_cajas: number; deposito_por_caja?: number; notas?: string } }>("/", async (request, reply) => {
        const { venta_id, cliente_id, producto_id, cantidad_cajas, deposito_por_caja, notas } = request.body;
        if (!venta_id || !cantidad_cajas) return reply.status(400).send({ error: "Venta y cantidad requeridas" });
        const r = await query(
            `INSERT INTO prestamo_cajas (venta_id, cliente_id, producto_id, cantidad_cajas, deposito_por_caja, notas)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [venta_id, cliente_id || null, producto_id || null, cantidad_cajas, deposito_por_caja || 0, notas || null]
        );
        return r.rows[0];
    });

    app.put<{ Params: { id: string }; Body: { cajas_devueltas: number; fecha_devolucion?: string; notas?: string } }>("/:id/devolver", async (request, reply) => {
        const { cajas_devueltas, fecha_devolucion, notas } = request.body;
        if (cajas_devueltas === undefined || cajas_devueltas < 0) return reply.status(400).send({ error: "Cantidad inválida" });

        const pc = await query("SELECT * FROM prestamo_cajas WHERE id = $1", [request.params.id]);
        if (!pc.rows.length) return reply.status(404).send({ error: "Préstamo no encontrado" });
        const prestamo = pc.rows[0];
        const nuevasDevueltas = parseInt(prestamo.cajas_devueltas) + cajas_devueltas;
        if (nuevasDevueltas > prestamo.cantidad_cajas) return reply.status(400).send({ error: "No puedes devolver más cajas de las prestadas" });

        const r = await query(
            `UPDATE prestamo_cajas SET cajas_devueltas = $1, fecha_devolucion = $2, notas = COALESCE($3, notas), updated_at = NOW() WHERE id = $4 RETURNING *`,
            [nuevasDevueltas, fecha_devolucion || new Date().toISOString().substring(0, 10), notas || null, request.params.id]
        );
        return r.rows[0];
    });

    app.get("/cliente/:clienteId", async (request: any) => {
        const r = await query(`
            SELECT pc.*, v.folio, p.nombre AS producto_nombre,
                   (pc.cantidad_cajas - pc.cajas_devueltas) AS pendientes
            FROM prestamo_cajas pc
            JOIN ventas v ON v.id = pc.venta_id
            LEFT JOIN productos p ON p.id = pc.producto_id
            WHERE pc.cliente_id = $1 AND (pc.cantidad_cajas - pc.cajas_devueltas) > 0
            ORDER BY pc.fecha_prestamo DESC
        `, [request.params.clienteId]);
        return r.rows;
    });
}
