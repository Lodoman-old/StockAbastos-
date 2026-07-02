import { money } from "../format";
import React, { useEffect, useState } from "react";
import { get } from "../services/api";
function downloadCsv(filename: string, columns: string[], rows: string[][]) {
    const csv = [columns.join(","), ...rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = filename; a.click();
    URL.revokeObjectURL(a.href);
}

function Card({ title, children, onExport }: { title: string; children: React.ReactNode; onExport?: () => void }) {
    return (
        <div style={{ background: "#fff", borderRadius: 12, padding: 20, marginBottom: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: 16 }}>{title}</h3>
                {onExport && <button onClick={onExport}
                    style={{ padding: "6px 12px", background: "#1a8a3a", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>CSV</button>}
            </div>
            {children}
        </div>
    );
}

function Bar({ label, value, max, color = "#1a8a3a", suffix = "" }: { label: string; value: number; max: number; color?: string; suffix?: string }) {
    const pct = max > 0 ? (value / max) * 100 : 0;
    return (
        <div style={{ marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 2 }}>
                <span>{label}</span>
                <span style={{ fontWeight: "bold" }}>{value.toFixed(1)}{suffix}</span>
            </div>
            <div style={{ background: "#e8e8e8", borderRadius: 6, height: 20, overflow: "hidden" }}>
                <div style={{ width: `${pct}%`, background: color, height: "100%", borderRadius: 6, minWidth: pct > 0 ? 4 : 0 }} />
            </div>
        </div>
    );
}

export function Reportes() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const load = () => {
        setLoading(true);
        get("/dashboard/reportes").then(setData).catch(() => {}).finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, []);

    if (loading) return <p style={{ color: "#888" }}>Cargando reportes...</p>;
    if (!data) return (
      <div>
        <p style={{ color: "#f44336" }}>Error al cargar reportes. El servidor no respondió.</p>
        <button onClick={load} style={{ padding: "8px 16px", background: "#1a8a3a", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: "bold" }}>
          Reintentar
        </button>
      </div>
    );

    const maxKg = Math.max(...(data.top_productos || []).map((p: any) => parseFloat(p.total_kg)), 1);
    const maxCs = Math.max(...(data.top_productos_cs || []).map((p: any) => parseFloat(p.total_cajas)), 1);
    const maxIngreso = Math.max(...(data.ingresos_mensuales || []).map((m: any) => parseFloat(m.ingresos)), 1);
    const maxVentaBodega = Math.max(...(data.ventas_por_bodega || []).map((b: any) => b.ventas), 1);

    return (
        <div>
            <h2 style={{ marginBottom: 24 }}>Reportes</h2>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
                <div style={{ background: "#fff", borderRadius: 12, padding: 16, textAlign: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
                    <div style={{ fontSize: 28, fontWeight: "bold", color: "#1a8a3a" }}>{data.ingresos_mensuales?.slice(-1)?.[0]?.ingresos ? `$${parseFloat(data.ingresos_mensuales.slice(-1)[0].ingresos).toFixed(0)}` : "—"}</div>
                    <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>Ingresos este mes</div>
                </div>
                <div style={{ background: "#fff", borderRadius: 12, padding: 16, textAlign: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
                    <div style={{ fontSize: 28, fontWeight: "bold", color: "#1a8a3a" }}>{data.ingresos_mensuales?.length || 0}</div>
                    <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>Meses con datos</div>
                </div>
                <div style={{ background: "#fff", borderRadius: 12, padding: 16, textAlign: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
                    <div style={{ fontSize: 28, fontWeight: "bold", color: "#1a8a3a" }}>{data.productos_bajo_stock?.length || 0}</div>
                    <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>Productos con stock bajo</div>
                </div>
                <div style={{ background: "#fff", borderRadius: 12, padding: 16, textAlign: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
                    <div style={{ fontSize: 28, fontWeight: "bold", color: "#d32f2f" }}>${parseFloat(data.gastos_30d?.total_gastos || 0).toFixed(0)}</div>
                    <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>Gastos (30 días)</div>
                </div>
            </div>

            <Card title="Productos más vendidos (kg, últimos 90 días)"
                onExport={() => downloadCsv("top-productos.csv", ["Producto", "Kg", "Ventas"], (data.top_productos || []).map((p: any) => [p.nombre, parseFloat(p.total_kg).toFixed(1), String(p.num_ventas)]))}>
                {(data.top_productos || []).map((p: any) => (
                    <Bar key={p.nombre} label={p.nombre} value={parseFloat(p.total_kg)} max={maxKg} suffix=" kg" />
                ))}
                {!data.top_productos?.length && <p style={{ color: "#888", fontSize: 13 }}>Sin datos</p>}
            </Card>

            <Card title="Productos más vendidos (CS, últimos 90 días)"
                onExport={() => downloadCsv("top-productos-cs.csv", ["Producto", "Cajas", "Ventas"], (data.top_productos_cs || []).map((p: any) => [p.nombre, parseFloat(p.total_cajas).toFixed(1), String(p.num_ventas)]))}>
                {(data.top_productos_cs || []).map((p: any) => (
                    <Bar key={p.nombre} label={p.nombre} value={parseFloat(p.total_cajas)} max={maxCs} suffix=" cajas" color="#7b1fa2" />
                ))}
                {!data.top_productos_cs?.length && <p style={{ color: "#888", fontSize: 13 }}>Sin datos</p>}
            </Card>

            <Card title="Ingresos mensuales (últimos 12 meses)"
                onExport={() => downloadCsv("ingresos-mensuales.csv", ["Mes", "Ventas", "Ingresos"], (data.ingresos_mensuales || []).map((m: any) => [m.mes, String(m.ventas), `$${money(m.ingresos)}`]))}>
                {(data.ingresos_mensuales || []).map((m: any) => (
                    <Bar key={m.mes} label={m.mes} value={parseFloat(m.ingresos)} max={maxIngreso} suffix="" color="#1976d2" />
                ))}
                {!data.ingresos_mensuales?.length && <p style={{ color: "#888", fontSize: 13 }}>Sin datos</p>}
            </Card>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24, marginBottom: 24 }}>
                <Card title="Ventas por tipo de pago (90 días)"
                    onExport={() => downloadCsv("ventas-tipo-pago.csv", ["Tipo", "Ventas", "Total"], (data.ventas_por_tipo_pago || []).map((t: any) => [t.tipo_pago, String(t.count), `$${money(t.total)}`]))}>
                    {(data.ventas_por_tipo_pago || []).map((t: any) => (
                        <div key={t.tipo_pago} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f0f0f0", fontSize: 13 }}>
                            <span style={{ textTransform: "capitalize" }}>{t.tipo_pago}</span>
                            <span><strong>{t.count}</strong> ventas — ${money(t.total)}</span>
                        </div>
                    ))}
                    {!data.ventas_por_tipo_pago?.length && <p style={{ color: "#888", fontSize: 13 }}>Sin datos</p>}
                </Card>

                <Card title="Ventas por bodega (90 días)"
                    onExport={() => downloadCsv("ventas-bodega.csv", ["Bodega", "Ventas", "Kg"], (data.ventas_por_bodega || []).map((b: any) => [b.bodega, String(b.ventas), parseFloat(b.kg).toFixed(1)]))}>
                    {(data.ventas_por_bodega || []).map((b: any) => (
                        <Bar key={b.bodega} label={b.bodega} value={b.ventas} max={maxVentaBodega} suffix={` ventas (${parseFloat(b.kg).toFixed(0)} kg)`} color="#7b1fa2" />
                    ))}
                    {!data.ventas_por_bodega?.length && <p style={{ color: "#888", fontSize: 13 }}>Sin datos</p>}
                </Card>
            </div>

            <Card title="Productos con stock bajo (< 50 kg)"
                onExport={() => downloadCsv("bajo-stock.csv", ["Producto", "Stock kg", "Lotes activos"], (data.productos_bajo_stock || []).map((p: any) => [p.nombre, parseFloat(p.stock_kg).toFixed(1), String(p.lotes)]))}>
                {(data.productos_bajo_stock || []).map((p: any) => (
                    <div key={p.nombre} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f0f0f0", fontSize: 13 }}>
                        <span>{p.nombre}</span>
                        <span style={{ color: parseFloat(p.stock_kg) < 10 ? "#d32f2f" : "#ff9800", fontWeight: "bold" }}>{parseFloat(p.stock_kg).toFixed(1)} kg ({p.lotes} lotes)</span>
                    </div>
                ))}
                {!data.productos_bajo_stock?.length && <p style={{ color: "#888", fontSize: 13 }}>Sin datos</p>}
            </Card>
        </div>
    );
}


