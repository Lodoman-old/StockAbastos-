import { FastifyInstance } from "fastify";
import { query } from "../db.js";

export async function dashboardRoutes(app: FastifyInstance) {
    app.get("/stats", async () => {
        const [lotes, productos, bodegas, ventas, lotesPorEstado] = await Promise.all([
            query("SELECT COUNT(*)::int AS count FROM lotes"),
            query("SELECT COUNT(*)::int AS count FROM productos WHERE activo = TRUE"),
            query("SELECT COUNT(*)::int AS count FROM bodegas WHERE activa = TRUE"),
            query("SELECT COUNT(*)::int AS count FROM ventas WHERE created_at >= NOW() - INTERVAL '30 days'"),
            query("SELECT estado, COUNT(*)::int AS count FROM lotes GROUP BY estado ORDER BY estado"),
        ]);

        return {
            lotes: lotes.rows[0].count,
            productos: productos.rows[0].count,
            bodegas: bodegas.rows[0].count,
            ventas_30d: ventas.rows[0].count,
            lotes_por_estado: lotesPorEstado.rows,
        };
    });

    app.get("/ventas-por-dia", async () => {
        const result = await query(`
            SELECT DATE(created_at) AS fecha, COUNT(*) AS ventas
            FROM ventas
            WHERE created_at >= NOW() - INTERVAL '14 days'
            GROUP BY DATE(created_at)
            ORDER BY fecha ASC
        `);
        return result.rows;
    });

    app.get("/creditos-proximos", async () => {
        const result = await query(`
            SELECT v.id, v.folio, v.total, v.saldo_pendiente, v.fecha_vencimiento,
                   c.nombre AS cliente, c.telefono
            FROM ventas v
            JOIN clientes c ON c.id = v.cliente_id
            WHERE v.tipo_pago = 'credito'
              AND v.saldo_pendiente > 0
              AND v.fecha_vencimiento IS NOT NULL
              AND v.fecha_vencimiento <= NOW() + INTERVAL '7 days'
            ORDER BY v.fecha_vencimiento ASC
        `);
        return result.rows;
    });

    app.get("/inventario", async () => {
        const r = await query(`
            SELECT b.id AS bodega_id, b.codigo AS bodega_codigo, b.nombre AS bodega_nombre,
                   p.id AS producto_id, p.sku, p.nombre AS producto_nombre,
                   COUNT(t.id) FILTER (WHERE t.estado IN ('RECIBIDA','PARCIAL')) AS tarimas,
                   COALESCE(SUM(t.cajas_restantes) FILTER (WHERE t.estado = 'RECIBIDA'), 0)::numeric(10,2) AS cajas,
                   COUNT(*) FILTER (WHERE t.estado = 'PARCIAL') AS tarimas_parciales,
                   COALESCE(SUM(t.cajas_restantes) FILTER (WHERE t.estado = 'PARCIAL'), 0)::numeric(10,2) AS cajas_parciales,
                   MIN(t.fecha_caducidad) AS proxima_caducidad
            FROM tarimas t
            JOIN bodegas b ON b.id = t.bodega_id
            JOIN productos p ON p.id = t.producto_id
            WHERE t.estado IN ('RECIBIDA','PARCIAL')
            GROUP BY b.id, b.codigo, b.nombre, p.id, p.sku, p.nombre
            ORDER BY b.codigo, p.nombre
        `);
        return r.rows;
    });

    app.get("/reportes", async () => {
        const [topProductos, ingresos, ventasPago, ventasBodega, bajoStock, gastosRecientes] = await Promise.all([
            query(`
                SELECT p.nombre, COALESCE(SUM(vd.cantidad_kg), 0)::numeric(10,2) AS total_kg,
                       COUNT(DISTINCT v.id)::int AS num_ventas
                FROM venta_detalles vd
                JOIN ventas v ON v.id = vd.venta_id
                JOIN productos p ON p.id = vd.producto_id
                WHERE v.created_at >= NOW() - INTERVAL '90 days'
                  AND (v.estado IS NULL OR v.estado != 'cancelada')
                GROUP BY p.id, p.nombre
                ORDER BY total_kg DESC
                LIMIT 10
            `),
            query(`
                SELECT TO_CHAR(DATE_TRUNC('month', v.created_at), 'YYYY-MM') AS mes,
                       COUNT(*)::int AS ventas,
                       COALESCE(SUM(v.total), 0)::numeric(10,2) AS ingresos
                FROM ventas v
                WHERE v.created_at >= NOW() - INTERVAL '12 months'
                  AND (v.estado IS NULL OR v.estado != 'cancelada')
                GROUP BY DATE_TRUNC('month', v.created_at)
                ORDER BY mes ASC
            `),
            query(`
                SELECT v.tipo_pago, COUNT(*)::int AS count,
                       COALESCE(SUM(v.total), 0)::numeric(10,2) AS total
                FROM ventas v
                WHERE v.created_at >= NOW() - INTERVAL '90 days'
                  AND (v.estado IS NULL OR v.estado != 'cancelada')
                GROUP BY v.tipo_pago
                ORDER BY total DESC
            `),
            query(`
                SELECT b.nombre AS bodega, COUNT(DISTINCT v.id)::int AS ventas,
                       COALESCE(SUM(vd.cantidad_kg), 0)::numeric(10,2) AS kg
                FROM venta_detalles vd
                JOIN ventas v ON v.id = vd.venta_id
                JOIN bodegas b ON b.id = vd.bodega_id
                WHERE v.created_at >= NOW() - INTERVAL '90 days'
                  AND (v.estado IS NULL OR v.estado != 'cancelada')
                GROUP BY b.id, b.nombre
                ORDER BY ventas DESC
            `),
            query(`
                SELECT p.nombre,
                       COALESCE(SUM(t.cajas_restantes), 0)::numeric(10,2) AS stock_kg,
                       COUNT(DISTINCT t.id)::int AS lotes
                FROM productos p
                LEFT JOIN tarimas t ON t.producto_id = p.id AND t.estado IN ('RECIBIDA', 'PARCIAL')
                GROUP BY p.id, p.nombre
                HAVING COALESCE(SUM(t.cajas_restantes), 0) < 50
                ORDER BY stock_kg ASC
                LIMIT 20
            `),
            query(`
                SELECT COALESCE(SUM(monto), 0)::numeric AS total_gastos, COUNT(*)::int AS count
                FROM gastos
                WHERE created_at >= NOW() - INTERVAL '30 days'
            `),
        ]);

        return {
            top_productos: topProductos.rows,
            ingresos_mensuales: ingresos.rows,
            ventas_por_tipo_pago: ventasPago.rows,
            ventas_por_bodega: ventasBodega.rows,
            productos_bajo_stock: bajoStock.rows,
            gastos_30d: gastosRecientes.rows[0],
        };
    });
}
