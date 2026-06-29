import { FastifyInstance } from "fastify";
import { query } from "../db.js";

export async function ticketRoutes(app: FastifyInstance) {
    app.get<{ Params: { ventaId: string } }>("/:ventaId", async (request: any, reply) => {
        const token = (request.query as any)?.token || request.headers.authorization?.replace("Bearer ", "");
        if (!token) return reply.status(401).send("No autorizado");
        try {
            const decrypted: any = app.jwt.verify(token);
            if (!decrypted) throw new Error("Token inválido");
        } catch {
            return reply.status(401).send("Token inválido");
        }

        const venta = await query(`
            SELECT v.*, b.nombre AS bodega_nombre,
                   c.nombre AS cliente_nombre, c.telefono AS cliente_telefono, c.direccion AS cliente_direccion
            FROM ventas v
            JOIN bodegas b ON b.id = v.bodega_id
            LEFT JOIN clientes c ON c.id = v.cliente_id
            WHERE v.id = $1
        `, [request.params.ventaId]);

        if (!venta.rows.length) return reply.status(404).send({ error: "Venta no encontrada" });

        const detalles = await query(`
            SELECT vd.*, p.nombre AS producto_nombre, p.sku, b.nombre AS bodega_nombre, b.codigo AS bodega_codigo
            FROM venta_detalles vd
            JOIN productos p ON p.id = vd.producto_id
            LEFT JOIN bodegas b ON b.id = vd.bodega_id
            WHERE vd.venta_id = $1
        `, [request.params.ventaId]);


        const cfg = await query("SELECT clave, valor FROM configuracion");
        const config: Record<string, string> = {};
        for (const row of cfg.rows) config[row.clave] = row.valor;

        const v = venta.rows[0];
        const items = detalles.rows;
        const logoUrl = config.logo_url || "";
        const encabezado = config.ticket_encabezado || "";
        const pie = config.ticket_pie || "";
        const formato = config.ticket_formato || "58 mm (ticket pequeño)";
        const is58 = formato.includes("58");

        const total = parseFloat(v.total || 0).toFixed(2);
        const efectivo = v.monto_efectivo ? parseFloat(v.monto_efectivo).toFixed(2) : total;
        const cambio = v.monto_cambio ? parseFloat(v.monto_cambio).toFixed(2) : "0.00";
        const saldo = v.saldo_pendiente ? parseFloat(v.saldo_pendiente).toFixed(2) : null;

        const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
    @page { width: ${is58 ? "58mm" : "80mm"}; margin: 0; }
    body { font-family: 'Courier New', monospace; margin: 0; padding: 0; font-size: ${is58 ? "10px" : "12px"}; width: ${is58 ? "58mm" : "80mm"}; }
    .ticket { padding: ${is58 ? "4mm" : "6mm"}; }
    .center { text-align: center; }
    .logo { max-width: ${is58 ? "40mm" : "60mm"}; max-height: 20mm; display: block; margin: 0 auto 4mm; }
    .encabezado { font-size: ${is58 ? "9px" : "11px"}; margin-bottom: 4mm; white-space: pre-wrap; }
    .folio { font-size: ${is58 ? "14px" : "18px"}; font-weight: bold; text-align: center; margin: 4mm 0; }
    .cliente { font-size: ${is58 ? "8px" : "10px"}; margin-bottom: 3mm; }
    hr { border: none; border-top: 1px dashed #333; margin: 3mm 0; }
    table { width: 100%; border-collapse: collapse; font-size: ${is58 ? "9px" : "11px"}; }
    th, td { padding: ${is58 ? "2px 2px" : "3px 4px"}; }
    th { text-align: center; border-bottom: 1px solid #333; }
    td { text-align: center; }
    .total-row td { font-weight: bold; border-top: 1px solid #333; font-size: ${is58 ? "11px" : "14px"}; }
    .pago { font-size: ${is58 ? "9px" : "11px"}; margin-top: 2mm; }
    .pie { font-size: ${is58 ? "8px" : "10px"}; text-align: center; margin-top: 4mm; white-space: pre-wrap; }
    .saldo { font-size: ${is58 ? "10px" : "12px"}; text-align: center; margin-top: 2mm; font-weight: bold; }
</style></head><body>
<div class="ticket">
    ${logoUrl ? `<img class="logo" src="${logoUrl}" />` : ""}
    ${encabezado ? `<div class="encabezado">${encabezado.replace(/\n/g, "<br>")}</div>` : ""}
    <div class="folio">${v.folio}</div>
    <div class="center" style="font-size:${is58 ? "8px" : "10px"}">${new Date(v.created_at).toLocaleString("es-MX")}</div>
    <div class="center" style="font-size:${is58 ? "8px" : "10px"}">${v.bodega_nombre || ""}</div>
    ${v.cliente_nombre ? `<div class="cliente">Cliente: ${v.cliente_nombre}<br>${v.cliente_direccion || ""}</div>` : ""}
    <hr>
    <table>
        <tr><th style="text-align:center">Cant</th><th style="text-align:center">Producto</th><th style="text-align:center">Peso</th><th style="text-align:center">Precio</th><th style="text-align:center">Total</th></tr>
        ${items.map(it => {
            const nombre = it.producto_nombre.length > 18 ? it.producto_nombre.substring(0, 16) + ".." : it.producto_nombre;
            const cant = it.cantidad_cajas ? `${it.cantidad_cajas}` : it.cantidad_unidades ? `${it.cantidad_unidades}` : it.cantidad_kg ? "1" : "";
            const peso = it.cantidad_kg ? `${parseFloat(it.cantidad_kg).toFixed(2)} kg` : it.cantidad_cajas ? "" : "";
            const precio = it.cantidad_kg ? `$${parseFloat(it.precio_unitario).toFixed(2)}/kg` : `$${parseFloat(it.precio_unitario).toFixed(2)}`;
            const subtotal = parseFloat(it.subtotal || 0).toFixed(2);
            return `<tr><td style="text-align:center">${cant}</td><td style="text-align:center">${nombre}</td><td style="text-align:center">${peso}</td><td style="text-align:center">${precio}</td><td style="text-align:center">$${subtotal}</td></tr>`;
        }).join("")}
        <tr class="total-row"><td colspan="4">TOTAL</td><td>$${total}</td></tr>
    </table>
    <hr>
    <div class="pago">
        ${v.tipo_pago === "credito" ? `
            <p>Pago: Crédito</p>
            ${v.cliente_nombre ? `<p>Cliente: ${v.cliente_nombre}</p>` : ""}
            ${v.fecha_vencimiento ? `<p>Vence: ${new Date(v.fecha_vencimiento).toLocaleDateString("es-MX")}</p>` : ""}
        ` : `
            <p>Efectivo: $${efectivo}</p>
            <p>Cambio: $${cambio}</p>
        `}
    </div>
    ${saldo ? `<div class="saldo">Saldo pendiente: $${saldo}</div>` : ""}
    ${pie ? `<div class="pie">${pie.replace(/\n/g, "<br>")}</div>` : ""}
</div>
</body></html>`;

        reply.header("Content-Type", "text/html; charset=utf-8");
        return html;
    });

    app.get<{ Params: { pagoId: string } }>("/pago/:pagoId", async (request: any, reply) => {
        const token = (request.query as any)?.token || request.headers.authorization?.replace("Bearer ", "");
        if (!token) return reply.status(401).send("No autorizado");
        try { app.jwt.verify(token); } catch { return reply.status(401).send("Token inválido"); }

        const pago = await query(`
            SELECT p.*, v.folio, v.total, v.saldo_pendiente, v.created_at AS venta_fecha,
                   c.nombre AS cliente_nombre
            FROM pagos p
            JOIN ventas v ON v.id = p.venta_id
            LEFT JOIN clientes c ON c.id = v.cliente_id
            WHERE p.id = $1
        `, [request.params.pagoId]);
        if (!pago.rows.length) return reply.status(404).send("Pago no encontrado");

        const p = pago.rows[0];
        const total = parseFloat(p.total || 0).toFixed(2);
        const monto = parseFloat(p.monto || 0).toFixed(2);
        const saldoRestante = parseFloat(p.saldo_pendiente || 0).toFixed(2);

        const cfg = await query("SELECT clave, valor FROM configuracion");
        const config: Record<string, string> = {};
        for (const row of cfg.rows) config[row.clave] = row.valor;
        const formato = config.ticket_formato || "58 mm (ticket pequeño)";
        const is58 = formato.includes("58");
        const encabezado = config.ticket_encabezado || "";
        const pie = config.ticket_pie || "";
        const logoUrl = config.logo_url || "";

        const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
    @page { width: ${is58 ? "58mm" : "80mm"}; margin: 0; }
    body { font-family: 'Courier New', monospace; margin: 0; padding: 0; font-size: ${is58 ? "10px" : "12px"}; width: ${is58 ? "58mm" : "80mm"}; }
    .ticket { padding: ${is58 ? "4mm" : "6mm"}; }
    .center { text-align: center; }
    .logo { max-width: ${is58 ? "40mm" : "60mm"}; max-height: 20mm; display: block; margin: 0 auto 4mm; }
    .folio { font-size: ${is58 ? "14px" : "18px"}; font-weight: bold; text-align: center; margin: 3mm 0; }
    hr { border: none; border-top: 1px dashed #333; margin: 3mm 0; }
    .detalle { font-size: ${is58 ? "10px" : "12px"}; margin: 2mm 0; }
    .monto { font-size: ${is58 ? "16px" : "20px"}; font-weight: bold; text-align: center; margin: 3mm 0; }
    .saldo { font-size: ${is58 ? "12px" : "14px"}; text-align: center; margin: 3mm 0; }
    .pie { font-size: ${is58 ? "8px" : "10px"}; text-align: center; margin-top: 4mm; white-space: pre-wrap; }
</style></head><body>
<div class="ticket">
    ${logoUrl ? `<img class="logo" src="${logoUrl}" />` : ""}
    ${encabezado ? `<div class="center" style="font-size:${is58 ? "9px" : "11px"};margin-bottom:3mm">${encabezado.replace(/\n/g, "<br>")}</div>` : ""}
    <div class="folio">RECIBO DE PAGO</div>
    <div class="center" style="font-size:${is58 ? "9px" : "11px"}">${new Date(p.fecha).toLocaleDateString("es-MX")}</div>
    <hr>
    <div class="detalle">Venta: ${p.folio}</div>
    <div class="detalle">Cliente: ${p.cliente_nombre || "N/A"}</div>
    <hr>
    <div class="detalle">Total venta: $${total}</div>
    <div class="monto">Abono: $${monto}</div>
    <hr>
    <div class="saldo" style="color: ${parseFloat(saldoRestante) > 0 ? "#d32f2f" : "#1a8a3a"}">
        ${parseFloat(saldoRestante) > 0 ? `Saldo pendiente: $${saldoRestante}` : "¡Pagado!"}
    </div>
    ${pie ? `<div class="pie">${pie.replace(/\n/g, "<br>")}</div>` : ""}
</div>
</body></html>`;
        reply.header("Content-Type", "text/html; charset=utf-8");
        return html;
    });
}
