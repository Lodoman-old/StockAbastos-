import QRCode from "qrcode";
import { query } from "../db.js";

export interface LabelData {
    codigo_lote: string;
    producto: string;
    sku: string;
    proveedor: string;
    fecha_recepcion: string;
    fecha_caducidad: string | null;
    peso_kg: number;
    bodega: string;
    total_cajas: number;
}

export async function getLabelData(loteId: string): Promise<LabelData | null> {
    const result = await query(`
        SELECT l.codigo_lote, p.nombre AS producto, p.sku,
               l.proveedor_nombre, l.fecha_recepcion, l.fecha_caducidad,
               b.nombre AS bodega
        FROM lotes l
        JOIN productos p ON p.id = l.producto_id
        JOIN bodegas b ON b.id = l.bodega_id
        WHERE l.id = $1
    `, [loteId]);

    if (!result.rows.length) return null;

    const r = result.rows[0];

    return {
        codigo_lote: r.codigo_lote,
        producto: r.producto,
        sku: r.sku,
        proveedor: r.proveedor_nombre || "N/A",
        fecha_recepcion: r.fecha_recepcion,
        fecha_caducidad: r.fecha_caducidad,
        peso_kg: 0,
        bodega: r.bodega,
        total_cajas: 0,
    };
}

export async function generateQRBuffer(data: string): Promise<Buffer> {
    return QRCode.toBuffer(data, { type: "png", width: 300, margin: 2, errorCorrectionLevel: "M" });
}

export async function generateQRDataURL(data: string): Promise<string> {
    return QRCode.toDataURL(data, { width: 200, margin: 2, errorCorrectionLevel: "M" });
}

export function generateZPL(data: LabelData, copies: number = 1): string {
    const cad = data.fecha_caducidad
        ? new Date(data.fecha_caducidad).toLocaleDateString("es-MX", { timeZone: "America/Mexico_City" })
        : "N/A";
    const rec = new Date(data.fecha_recepcion).toLocaleDateString("es-MX", { timeZone: "America/Mexico_City" });

    return `^XA
^FO30,25^ADN,18,9^FDStockAbastos^FS
^FO30,58^ADN,14,7^FD${data.producto}^FS
^FO30,88^ADN,14,7^FDSKU: ${data.sku}^FS
^FO30,120^ADN,40,20^FD${data.codigo_lote}^FS
^FO30,175^ADN,13,6^FDPeso: ${data.peso_kg.toFixed(1)} kg ^FS
^FO30,198^ADN,13,6^FDCad: ${cad} | ${data.bodega}^FS
^FO30,221^ADN,13,6^FDCajas: ${data.total_cajas} | ${data.proveedor}^FS
^FO420,25^BQN,2,8^FDQA,${data.codigo_lote}^FS
^FO420,240^ADN,10,5^FDEscanea QR^FS
^PQ${copies}
^XZ`;
}

export async function generateHtmlLabel(data: LabelData, copies: number = 1): Promise<string> {
    const qrDataUrl = await generateQRDataURL(data.codigo_lote);
    const cad = data.fecha_caducidad
        ? new Date(data.fecha_caducidad).toLocaleDateString("es-MX", { timeZone: "America/Mexico_City" })
        : "N/A";
    const rec = new Date(data.fecha_recepcion).toLocaleDateString("es-MX", { timeZone: "America/Mexico_City" });
    const labels = Array.from({ length: copies }, () => `
<div class="label">
    <div class="left">
        <div class="header">StockAbastos</div>
        <div class="producto">${data.producto}</div>
        <div class="sku">SKU: ${data.sku}</div>
        <div class="lote">${data.codigo_lote}</div>
        <div class="info">Peso: ${data.peso_kg.toFixed(1)} kg</div>
        <div class="info">Cad: ${cad} | ${data.bodega}</div>
        <div class="info">Cajas: ${data.total_cajas} | ${data.proveedor}</div>
    </div>
    <div class="right">
        <img class="qr" src="${qrDataUrl}" alt="QR" />
        <div class="qr-label">Escanea QR</div>
    </div>
</div>`).join("");

    return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
    @page { width: 80mm; height: 50mm; margin: 0; }
    body { font-family: 'Courier New', monospace; margin: 0; padding: 0; }
    .label { width: 80mm; height: 50mm; padding: 4mm; box-sizing: border-box; display: flex; page-break-after: always; overflow: hidden; }
    .left { flex: 1; display: flex; flex-direction: column; justify-content: center; }
    .right { width: 28mm; display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .header { font-size: 9pt; font-weight: bold; }
    .producto { font-size: 8pt; margin-top: 1mm; }
    .sku { font-size: 7pt; color: #555; }
    .lote { font-size: 18pt; font-weight: bold; letter-spacing: 1px; margin: 2mm 0; }
    .info { font-size: 7pt; line-height: 1.4; }
    img.qr { width: 24mm; height: 24mm; }
    .qr-label { font-size: 6pt; color: #888; margin-top: 1mm; }
</style></head><body>
${labels}
</body></html>`;
}
