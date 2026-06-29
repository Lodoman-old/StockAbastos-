import { FastifyInstance } from "fastify";
import { query } from "../db.js";

export async function cortesRoutes(app: FastifyInstance) {
    app.get("/hoy", async (request) => {
        const { id: usuarioId } = request.user as any;

        const [ventas, gastos, corteHoy, inventario, kgVendidos] = await Promise.all([
            query(`
                SELECT COUNT(*)::int AS total_ventas, COALESCE(SUM(total), 0)::numeric AS total_ingresos,
                       COALESCE(SUM(total_kg), 0)::numeric AS total_kg
                FROM ventas WHERE DATE(created_at) = CURRENT_DATE
            `),
            query(`SELECT COALESCE(SUM(monto), 0)::numeric AS total_gastos FROM gastos WHERE fecha = CURRENT_DATE`),
            query(`SELECT * FROM cortes WHERE fecha = CURRENT_DATE`),
            query(`
                SELECT p.nombre AS producto, b.nombre AS bodega,
                       COUNT(*) FILTER (WHERE t.estado = 'RECIBIDA')::int AS tarimas_completas,
                       COALESCE(SUM(t.cajas_restantes) FILTER (WHERE t.estado = 'RECIBIDA'), 0)::numeric(10,2) AS cajas_completas,
                       COUNT(*) FILTER (WHERE t.estado = 'PARCIAL')::int AS tarimas_parciales,
                       COALESCE(SUM(t.cajas_restantes) FILTER (WHERE t.estado = 'PARCIAL'), 0)::numeric(10,2) AS cajas_parciales
                FROM tarimas t
                JOIN productos p ON p.id = t.producto_id
                JOIN bodegas b ON b.id = t.bodega_id
                WHERE t.estado IN ('RECIBIDA','PARCIAL')
                GROUP BY b.nombre, p.nombre
                ORDER BY b.nombre, p.nombre
            `),
            query(`
                SELECT b.nombre AS bodega, p.nombre AS producto,
                       COALESCE(SUM(vd.cantidad_kg), 0)::numeric(10,2) AS kg_caja_pesada,
                       COALESCE(SUM(vd.cantidad_cajas * COALESCE(p.peso_caja_sellada_kg, 0)), 0)::numeric(10,2) AS kg_caja_sellada
                FROM venta_detalles vd
                JOIN productos p ON p.id = vd.producto_id
                JOIN ventas v ON v.id = vd.venta_id
                JOIN bodegas b ON b.id = v.bodega_id
                WHERE DATE(v.created_at) = CURRENT_DATE
                GROUP BY b.nombre, p.nombre
                ORDER BY b.nombre, p.nombre
            `),
        ]);

        const ventasPorTipo = await query(`
            SELECT tipo_pago, COUNT(*)::int AS count, COALESCE(SUM(total), 0)::numeric AS total
            FROM ventas WHERE DATE(created_at) = CURRENT_DATE
            GROUP BY tipo_pago
        `);

        const contado = ventasPorTipo.rows.find((r: any) => r.tipo_pago === "contado");
        const credito = ventasPorTipo.rows.find((r: any) => r.tipo_pago === "credito");

        const corte = corteHoy.rows[0] || null;
        const montoInicial = corte?.monto_inicial ? parseFloat(corte.monto_inicial) : 0;
        const totalRetiros = corte?.total_retiros ? parseFloat(corte.total_retiros) : 0;

        return {
            fecha: new Date().toISOString().substring(0, 10),
            total_ventas: ventas.rows[0].total_ventas,
            total_ingresos: parseFloat(ventas.rows[0].total_ingresos),
            total_kg: parseFloat(ventas.rows[0].total_kg),
            ventas_contado: contado?.count || 0,
            total_contado: parseFloat(contado?.total || "0"),
            ventas_credito: credito?.count || 0,
            total_credito: parseFloat(credito?.total || "0"),
            total_gastos: parseFloat(gastos.rows[0].total_gastos),
            total_retiros: totalRetiros,
            saldo_final: parseFloat(ventas.rows[0].total_ingresos) - parseFloat(gastos.rows[0].total_gastos) - totalRetiros,
            ya_cerrado: corteHoy.rows.length > 0 && corteHoy.rows[0].cerrado_at !== null,
            corte,
            monto_inicial: montoInicial,
            abierto: corte?.abierto_at !== null,
            inventario: inventario.rows,
            kg_vendidos: kgVendidos.rows.map((r: any) => ({
                bodega: r.bodega,
                producto: r.producto,
                kg_caja_pesada: parseFloat(r.kg_caja_pesada),
                kg_caja_sellada: parseFloat(r.kg_caja_sellada),
                total_kg: parseFloat(r.kg_caja_pesada) + parseFloat(r.kg_caja_sellada),
            })),
        };
    });

    app.get("/esta-abierto", async (request) => {
        const result = await query("SELECT * FROM cortes WHERE fecha = CURRENT_DATE");
        if (!result.rows.length || !result.rows[0].abierto_at) {
            return { abierto: false };
        }
        return { abierto: true, corte: result.rows[0] };
    });

    app.post<{ Body: { monto_inicial?: number } }>("/abrir", async (request, reply) => {
        const { id: usuarioId } = request.user as any;
        const { monto_inicial } = request.body;

        const existente = await query("SELECT * FROM cortes WHERE fecha = CURRENT_DATE");
        if (existente.rows.length && existente.rows[0].abierto_at) {
            return reply.status(400).send({ error: "La caja ya está abierta para hoy" });
        }

        const result = await query(`
            INSERT INTO cortes (fecha, monto_inicial, abierto_por, abierto_at)
            VALUES (CURRENT_DATE, $1, $2, NOW())
            ON CONFLICT (fecha) DO UPDATE SET
                monto_inicial = COALESCE(cortes.monto_inicial, EXCLUDED.monto_inicial),
                abierto_por = EXCLUDED.abierto_por,
                abierto_at = NOW()
            RETURNING *
        `, [monto_inicial || 0, usuarioId]);

        return result.rows[0];
    });

    app.post<{ Body: { monto: number; motivo?: string } }>("/retiro", async (request, reply) => {
        const { id: usuarioId } = request.user as any;
        const { monto, motivo } = request.body;

        if (!monto || monto <= 0) {
            return reply.status(400).send({ error: "Monto inválido" });
        }

        const corteHoy = await query("SELECT * FROM cortes WHERE fecha = CURRENT_DATE");
        if (!corteHoy.rows.length || !corteHoy.rows[0].abierto_at) {
            return reply.status(400).send({ error: "La caja no está abierta" });
        }

        const result = await query(`
            UPDATE cortes SET
                total_retiros = COALESCE(total_retiros, 0) + $1
            WHERE fecha = CURRENT_DATE
            RETURNING *
        `, [monto]);

        return { success: true, corte: result.rows[0] };
    });

    app.post("/cerrar", async (request, reply) => {
        const { id: usuarioId } = request.user as any;

        const [ventas, gastos] = await Promise.all([
            query(`
                SELECT COUNT(*)::int AS total_ventas, COALESCE(SUM(total), 0)::numeric AS total_ingresos,
                       COALESCE(SUM(total_kg), 0)::numeric AS total_kg
                FROM ventas WHERE DATE(created_at) = CURRENT_DATE
            `),
            query(`SELECT COALESCE(SUM(monto), 0)::numeric AS total_gastos FROM gastos WHERE fecha = CURRENT_DATE`),
        ]);

        const ventasPorTipo = await query(`
            SELECT tipo_pago, COUNT(*)::int AS count, COALESCE(SUM(total), 0)::numeric AS total
            FROM ventas WHERE DATE(created_at) = CURRENT_DATE
            GROUP BY tipo_pago
        `);

        const contado = ventasPorTipo.rows.find((r: any) => r.tipo_pago === "contado");
        const credito = ventasPorTipo.rows.find((r: any) => r.tipo_pago === "credito");

        const totalIngresos = parseFloat(ventas.rows[0].total_ingresos);
        const totalGastos = parseFloat(gastos.rows[0].total_gastos);

        const corteActual = await query("SELECT total_retiros FROM cortes WHERE fecha = CURRENT_DATE");
        const totalRetiros = parseFloat(corteActual.rows[0]?.total_retiros || "0");

        const r = await query(`
            INSERT INTO cortes (fecha, total_ventas, total_ingresos, total_kg,
                ventas_contado, total_contado, ventas_credito, total_credito,
                total_gastos, total_retiros, saldo_final, cerrado_por, cerrado_at)
            VALUES (CURRENT_DATE, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
            ON CONFLICT (fecha) DO UPDATE SET
                total_ventas = EXCLUDED.total_ventas,
                total_ingresos = EXCLUDED.total_ingresos,
                total_kg = EXCLUDED.total_kg,
                ventas_contado = EXCLUDED.ventas_contado,
                total_contado = EXCLUDED.total_contado,
                ventas_credito = EXCLUDED.ventas_credito,
                total_credito = EXCLUDED.total_credito,
                total_gastos = EXCLUDED.total_gastos,
                total_retiros = EXCLUDED.total_retiros,
                saldo_final = EXCLUDED.saldo_final,
                cerrado_por = EXCLUDED.cerrado_por,
                cerrado_at = EXCLUDED.cerrado_at,
                abierto_at = NULL,
                abierto_por = NULL
            RETURNING *
        `, [
            ventas.rows[0].total_ventas, totalIngresos, ventas.rows[0].total_kg,
            contado?.count || 0, parseFloat(contado?.total || "0"),
            credito?.count || 0, parseFloat(credito?.total || "0"),
            totalGastos, totalRetiros, totalIngresos - totalGastos - totalRetiros, usuarioId,
        ]);

        return r.rows[0];
    });

    app.get("/inventario-ticket", async (request, reply) => {
        const token = (request.query as any)?.token || request.headers.authorization?.replace("Bearer ", "");
        if (!token) return reply.status(401).send("No autorizado");
        try { app.jwt.verify(token); } catch { return reply.status(401).send("Token inválido"); }
        const bodegaId = (request.query as any)?.bodega_id;

        const bodegaWhere = bodegaId ? "AND t.bodega_id = $1" : "";
        const bodegaWhereKg = bodegaId ? "AND v.bodega_id = $1" : "";
        const params = bodegaId ? [bodegaId] : [];

        const inv = await query(`
            SELECT p.nombre AS producto, b.nombre AS bodega, b.codigo AS bodega_codigo,
                   COUNT(*) FILTER (WHERE t.estado = 'RECIBIDA')::int AS tarimas_completas,
                   COALESCE(SUM(t.cajas_restantes) FILTER (WHERE t.estado = 'RECIBIDA'), 0)::numeric(10,2) AS cajas_completas,
                   COUNT(*) FILTER (WHERE t.estado = 'PARCIAL')::int AS tarimas_parciales,
                   COALESCE(SUM(t.cajas_restantes) FILTER (WHERE t.estado = 'PARCIAL'), 0)::numeric(10,2) AS cajas_parciales
            FROM tarimas t
            JOIN productos p ON p.id = t.producto_id
            JOIN bodegas b ON b.id = t.bodega_id
            WHERE t.estado IN ('RECIBIDA','PARCIAL') ${bodegaWhere}
            GROUP BY b.nombre, b.codigo, p.nombre
            ORDER BY b.codigo, p.nombre
        `, params);

        const kg = await query(`
            SELECT b.nombre AS bodega, p.nombre AS producto,
                   COALESCE(SUM(vd.cantidad_kg), 0)::numeric(10,2) AS kg_caja_pesada,
                   COALESCE(SUM(vd.cantidad_cajas * COALESCE(p.peso_caja_sellada_kg, 0)), 0)::numeric(10,2) AS kg_caja_sellada
            FROM venta_detalles vd
            JOIN productos p ON p.id = vd.producto_id
            JOIN ventas v ON v.id = vd.venta_id
            JOIN bodegas b ON b.id = v.bodega_id
            WHERE DATE(v.created_at) = CURRENT_DATE ${bodegaWhereKg}
            GROUP BY b.nombre, p.nombre
            ORDER BY b.nombre, p.nombre
        `, params);

        const cfg = await query("SELECT clave, valor FROM configuracion");
        const config: Record<string, string> = {};
        for (const row of cfg.rows) config[row.clave] = row.valor;
        const formato = config.ticket_formato || "58 mm (ticket pequeño)";
        const is58 = formato.includes("58");
        const encabezado = config.ticket_encabezado || "";
        const pie = config.ticket_pie || "";
        const logoUrl = config.logo_url || "";

        const totalCompletas = inv.rows.reduce((s: number, r: any) => s + parseInt(r.tarimas_completas), 0);
        const totalParciales = inv.rows.reduce((s: number, r: any) => s + parseInt(r.tarimas_parciales), 0);
        const totalCajasCompletas = inv.rows.reduce((s: number, r: any) => s + parseFloat(r.cajas_completas), 0);
        const totalCajasParciales = inv.rows.reduce((s: number, r: any) => s + parseFloat(r.cajas_parciales), 0);

        const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
    @page { width: ${is58 ? "58mm" : "80mm"}; margin: 0; }
    body { font-family: 'Courier New', monospace; margin: 0; padding: 0; font-size: ${is58 ? "9px" : "11px"}; width: ${is58 ? "58mm" : "80mm"}; }
    .ticket { padding: ${is58 ? "3mm" : "5mm"}; }
    .center { text-align: center; }
    .logo { max-width: ${is58 ? "35mm" : "55mm"}; max-height: 18mm; display: block; margin: 0 auto 3mm; }
    .encabezado { font-size: ${is58 ? "8px" : "10px"}; margin-bottom: 3mm; white-space: pre-wrap; }
    .titulo { font-size: ${is58 ? "12px" : "16px"}; font-weight: bold; text-align: center; margin: 3mm 0; }
    hr { border: none; border-top: 1px dashed #333; margin: 2mm 0; }
    table { width: 100%; border-collapse: collapse; font-size: ${is58 ? "8px" : "10px"}; }
    th, td { padding: ${is58 ? "1px 2px" : "2px 4px"}; }
    th { text-align: center; border-bottom: 1px solid #333; }
    td { text-align: center; }
    .total-row td { font-weight: bold; border-top: 1px solid #333; font-size: ${is58 ? "10px" : "12px"}; }
    .pie { font-size: ${is58 ? "7px" : "9px"}; text-align: center; margin-top: 3mm; white-space: pre-wrap; }
</style></head><body>
<div class="ticket">
    ${logoUrl ? `<img class="logo" src="${logoUrl}" />` : ""}
    ${encabezado ? `<div class="encabezado">${encabezado.replace(/\n/g, "<br>")}</div>` : ""}
    <div class="titulo">INVENTARIO DE CAJAS</div>
    <div class="center" style="font-size:${is58 ? "8px" : "10px"}">${new Date().toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</div>
    ${kg.rows.length ? `<div style="font-size:${is58 ? "8px" : "10px"};margin-bottom:2mm"><b>KG VENDIDOS DEL DÍA</b></div>
    ${(() => {
        const grouped: Record<string, any[]> = {};
        for (const r of kg.rows) {
            if (!grouped[r.bodega]) grouped[r.bodega] = [];
            grouped[r.bodega].push(r);
        }
        let html = "";
        for (const [bodega, items] of Object.entries(grouped)) {
            html += `<div style="font-weight:bold;font-size:${is58 ? "8px" : "10px"};margin:1mm 0 0.5mm">${bodega}</div>`;
            html += `<table>
        <tr><th>Producto</th><th>CP</th><th>CS</th><th>Total</th></tr>`;
            for (const r of items as any[]) {
                const cp = parseFloat(r.kg_caja_pesada);
                const cs = parseFloat(r.kg_caja_sellada);
                html += `<tr>
                <td style="text-align:left">${r.producto}</td>
                <td>${cp > 0 ? cp.toFixed(1) : "-"}</td>
                <td>${cs > 0 ? cs.toFixed(1) : "-"}</td>
                <td>${(cp + cs).toFixed(1)}</td>
            </tr>`;
            }
            html += `</table>`;
        }
        return html;
    })()}
    <hr>` : ""}
    ${(() => {
        const grouped: Record<string, any[]> = {};
        for (const r of inv.rows) {
            if (!grouped[r.bodega]) grouped[r.bodega] = [];
            grouped[r.bodega].push(r);
        }
        let html = "";
        for (const [bodega, items] of Object.entries(grouped)) {
            html += `<div style="font-weight:bold;font-size:${is58 ? "8px" : "10px"};margin:1mm 0 0.5mm">${bodega}</div>`;
            html += `<table>
        <tr><th>Producto</th><th>Completas</th><th>Cajas</th><th>Parciales</th><th>Cajas</th></tr>`;
            for (const r of items as any[]) {
                html += `<tr>
                <td style="text-align:left">${r.producto}</td>
                <td>${r.tarimas_completas}</td>
                <td>${parseFloat(r.cajas_completas).toFixed(1)}</td>
                <td>${r.tarimas_parciales}</td>
                <td>${parseFloat(r.cajas_parciales).toFixed(1)}</td>
            </tr>`;
            }
            html += `</table>`;
        }
        return html;
    })()}
    ${inv.rows.length ? `<hr>` : ""}
    <div style="text-align:center;font-size:${is58 ? "9px" : "11px"};margin-top:2mm">
        Tarimas completas: ${totalCompletas} | Parciales: ${totalParciales}<br>
        Total cajas: ${(totalCajasCompletas + totalCajasParciales).toFixed(1)}
    </div>
    ${pie ? `<div class="pie">${pie.replace(/\n/g, "<br>")}</div>` : ""}
</div>
</body></html>`;
        reply.header("Content-Type", "text/html; charset=utf-8");
        return html;
    });
}
