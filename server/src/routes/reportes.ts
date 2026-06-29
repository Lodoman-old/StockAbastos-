import { FastifyInstance } from "fastify";
import { query } from "../db.js";

export async function reportesRoutes(app: FastifyInstance) {
    app.get("/ganancias", async (request) => {
        const q = request.query as { desde?: string; hasta?: string };
        const params: any[] = [];
        const condiciones: string[] = [];
        if (q.desde) { params.push(q.desde); condiciones.push(`v.created_at::date >= $${params.length}::date`); }
        if (q.hasta) { params.push(q.hasta); condiciones.push(`v.created_at::date <= $${params.length}::date`); }
        const where = condiciones.length ? "WHERE " + condiciones.join(" AND ") : "";
        const r = await query(`
            SELECT
                v.id AS venta_id, v.folio, v.created_at AS fecha, v.total AS total_venta,
                v.tipo_pago, v.saldo_pendiente,
                vd.id AS detalle_id, vd.cantidad_kg, vd.cantidad_unidades, vd.cantidad_cajas,
                vd.precio_unitario, vd.subtotal AS subtotal_venta,
                p.nombre AS producto, p.modalidad_unidad,
                cd.precio_compra AS precio_compra,
                l.codigo_lote, l.bodega_id, b.nombre AS bodega
            FROM venta_detalles vd
            JOIN ventas v ON v.id = vd.venta_id
            JOIN productos p ON p.id = vd.producto_id
            JOIN lotes l ON l.id = vd.lote_id
            JOIN bodegas b ON b.id = l.bodega_id
            LEFT JOIN compra_detalles cd ON cd.lote_id = l.id
            ${where}
            ORDER BY v.created_at DESC
        `, params);
        return r.rows.map((row: any) => {
            let costoTotal = 0;
            const pc = parseFloat(row.precio_compra || 0);
            if (row.modalidad_unidad) {
                costoTotal = (row.cantidad_unidades || 0) * pc;
            } else {
                costoTotal = parseFloat(row.cantidad_kg || 0) * pc;
            }
            const subtotalVenta = parseFloat(row.subtotal_venta || 0);
            return { ...row, costo_total: costoTotal, ganancia: subtotalVenta - costoTotal };
        });
    });

    app.get("/ganancias/resumen", async (request) => {
        const q = request.query as { desde?: string; hasta?: string };
        const params: any[] = [];
        const condiciones: string[] = [];
        if (q.desde) { params.push(q.desde); condiciones.push(`v.created_at::date >= $${params.length}::date`); }
        if (q.hasta) { params.push(q.hasta); condiciones.push(`v.created_at::date <= $${params.length}::date`); }
        const where = condiciones.length ? "WHERE " + condiciones.join(" AND ") : "WHERE 1=1";
        const r = await query(`
            SELECT COALESCE(SUM(v.total), 0) AS total_ventas FROM ventas v ${where}
        `, params);
        const totalVentas = parseFloat(r.rows[0]?.total_ventas || 0);
        const condCompra: string[] = [];
        const paramsCompra: any[] = [];
        if (q.desde) { paramsCompra.push(q.desde); condCompra.push(`c.fecha >= $${paramsCompra.length}::date`); }
        if (q.hasta) { paramsCompra.push(q.hasta); condCompra.push(`c.fecha <= $${paramsCompra.length}::date`); }
        const whereCompra = condCompra.length ? "WHERE " + condCompra.join(" AND ") : "WHERE 1=1";
        const c = await query(`SELECT COALESCE(SUM(total), 0) AS total FROM compras c ${whereCompra}`, paramsCompra);
        const totalCompras = parseFloat(c.rows[0]?.total || 0);
        const g = await query("SELECT COALESCE(SUM(monto), 0) AS total FROM gastos");
        const totalGastos = parseFloat(g.rows[0]?.total || 0);
        return { totalVentas, totalCompras, totalGastos, gananciaNeta: totalVentas - totalCompras - totalGastos };
    });

    app.get("/creditos", async (request) => {
        const q = request.query as { desde?: string; hasta?: string; cliente_id?: string; estado?: string };
        const params: any[] = [];
        const condiciones: string[] = ["v.tipo_pago = 'credito'"];
        if (q.desde) { params.push(q.desde); condiciones.push(`v.created_at::date >= $${params.length}::date`); }
        if (q.hasta) { params.push(q.hasta); condiciones.push(`v.created_at::date <= $${params.length}::date`); }
        if (q.cliente_id) { params.push(q.cliente_id); condiciones.push(`v.cliente_id = $${params.length}`); }
        if (q.estado === "pendiente") {
            condiciones.push("v.saldo_pendiente > 0");
        }
        const where = "WHERE " + condiciones.join(" AND ");
        const r = await query(`
            SELECT v.id AS venta_id, v.folio, v.created_at, v.total, v.saldo_pendiente, v.fecha_vencimiento,
                   c.nombre AS cliente_nombre, c.telefono AS cliente_telefono
            FROM ventas v
            JOIN clientes c ON c.id = v.cliente_id
            ${where}
            ORDER BY v.fecha_vencimiento ASC NULLS LAST, v.created_at DESC
        `, params);
        return r.rows;
    });
}
