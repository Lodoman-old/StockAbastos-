import { getApiBase } from "./api.config";

export async function getLabelData(loteId: string) {
    const res = await fetch(`${getApiBase()}/labels/${loteId}/data`, {
        headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
    });
    if (!res.ok) throw new Error("Error al obtener datos de etiqueta");
    return res.json();
}

// Genera HTML de etiqueta para vista en móvil
export function generateHtmlLabel(data: any): string {
    const cad = data.fecha_caducidad
        ? new Date(data.fecha_caducidad).toLocaleDateString("es-MX")
        : "N/A";
    return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
    body { font-family: 'Courier New', monospace; margin: 0; padding: 16px; }
    .header { font-size: 14px; font-weight: bold; }
    .producto { font-size: 16px; margin: 8px 0 4px; }
    .lote { font-size: 28px; font-weight: bold; letter-spacing: 2px; margin: 12px 0; }
    .info { font-size: 13px; line-height: 1.6; }
</style></head><body>
<div class="header">StockAbastos</div>
<div class="producto">${data.producto} (SKU: ${data.sku})</div>
<div class="lote">${data.codigo_lote}</div>
<div class="info">
    Peso: ${data.peso_kg.toFixed(1)} kg<br>
    Caducidad: ${cad}<br>
    Bodega: ${data.bodega}<br>
    Proveedor: ${data.proveedor}<br>
    Cajas: ${data.total_cajas}
</div>
</body></html>`;
}
