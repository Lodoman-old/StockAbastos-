import React, { useEffect, useState } from "react";
import { get } from "../services/api";

export function Ganancias() {
    const [detalles, setDetalles] = useState<any[]>([]);
    const [resumen, setResumen] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [desde, setDesde] = useState("");
    const [hasta, setHasta] = useState("");

    const load = () => {
        const params = new URLSearchParams();
        if (desde) params.set("desde", desde);
        if (hasta) params.set("hasta", hasta);
        setLoading(true);
        Promise.all([
            get(`/reportes/ganancias?${params}`),
            get(`/reportes/ganancias/resumen?${params}`),
            get("/gastos"),
        ]).then(([ganancias, res, gastos]) => {
            setDetalles(ganancias);
            const totalGastos = gastos.reduce((s: number, g: any) => s + parseFloat(g.monto || 0), 0);
            setResumen({ ...res, totalGastos });
        }).catch(() => {}).finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, []);

    const sumaVentas = detalles.reduce((s, d) => s + parseFloat(d.subtotal_venta || 0), 0);
    const sumaCostos = detalles.reduce((s, d) => s + parseFloat(d.costo_total || 0), 0);
    const sumaGanancias = detalles.reduce((s, d) => s + parseFloat(d.ganancia || 0), 0);

    const card: React.CSSProperties = { background: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" };
    const inputStyle: React.CSSProperties = { padding: "8px 10px", border: "1px solid #ddd", borderRadius: 6, fontSize: 13 };

    if (loading) return <div><h1>Ganancias</h1><p>Cargando...</p></div>;

    return (
        <div>
            <h1>Ganancias</h1>

            <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
                <div>
                    <label style={{ fontSize: 12, color: "#555", display: "block" }}>Desde</label>
                    <input type="date" value={desde} onChange={e => setDesde(e.target.value)} style={inputStyle} />
                </div>
                <div>
                    <label style={{ fontSize: 12, color: "#555", display: "block" }}>Hasta</label>
                    <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} style={inputStyle} />
                </div>
                <button onClick={load}
                    style={{ padding: "8px 16px", background: "#1a8a3a", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: "bold" }}>
                    Filtrar
                </button>
            </div>

            <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", marginBottom: 24 }}>
                <div style={{ ...card, borderTop: "4px solid #4caf50" }}>
                    <h3 style={{ fontSize: 13, color: "#666", margin: 0 }}>Ventas totales</h3>
                    <p style={{ fontSize: 28, fontWeight: "bold", margin: "8px 0 0", color: "#4caf50" }}>${sumaVentas.toFixed(2)}</p>
                </div>
                <div style={{ ...card, borderTop: "4px solid #f44336" }}>
                    <h3 style={{ fontSize: 13, color: "#666", margin: 0 }}>Costo de ventas</h3>
                    <p style={{ fontSize: 28, fontWeight: "bold", margin: "8px 0 0", color: "#f44336" }}>${sumaCostos.toFixed(2)}</p>
                </div>
                <div style={{ ...card, borderTop: "4px solid #ff9800" }}>
                    <h3 style={{ fontSize: 13, color: "#666", margin: 0 }}>Gastos</h3>
                    <p style={{ fontSize: 28, fontWeight: "bold", margin: "8px 0 0", color: "#ff9800" }}>${(resumen?.totalGastos || 0).toFixed(2)}</p>
                </div>
                <div style={{ ...card, borderTop: "4px solid #2196f3" }}>
                    <h3 style={{ fontSize: 13, color: "#666", margin: 0 }}>Ganancia neta</h3>
                    <p style={{ fontSize: 28, fontWeight: "bold", margin: "8px 0 0", color: sumaGanancias - (resumen?.totalGastos || 0) >= 0 ? "#4caf50" : "#f44336" }}>
                        ${(sumaGanancias - (resumen?.totalGastos || 0)).toFixed(2)}
                    </p>
                </div>
            </div>

            <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: 8, overflow: "hidden", minWidth: 800 }}>
                    <thead>
                        <tr style={{ background: "#f5f5f5", textAlign: "left" }}>
                            <th style={{ padding: 10 }}>Folio</th><th style={{ padding: 10 }}>Fecha</th>
                            <th style={{ padding: 10 }}>Producto</th><th style={{ padding: 10 }}>Cantidad</th>
                            <th style={{ padding: 10 }}>Precio venta</th><th style={{ padding: 10 }}>Subtotal</th>
                            <th style={{ padding: 10 }}>Costo</th><th style={{ padding: 10 }}>Ganancia</th>
                        </tr>
                    </thead>
                    <tbody>
                        {detalles.map((d: any, i: number) => {
                            const ganancia = parseFloat(d.ganancia || 0);
                            return (
                                <tr key={d.detalle_id || i} style={{ borderTop: "1px solid #eee" }}>
                                    <td style={{ padding: 10, fontSize: 12 }}>{d.folio}</td>
                                    <td style={{ padding: 10, fontSize: 12, whiteSpace: "nowrap" }}>{new Date(d.fecha).toLocaleDateString()}</td>
                                    <td style={{ padding: 10, fontSize: 12 }}>{d.producto}</td>
                                    <td style={{ padding: 10, fontSize: 12 }}>
                                        {d.unidad_venta === "PIEZA" ? `${d.cantidad_unidades || 0} pz` : `${parseFloat(d.cantidad_kg || 0).toFixed(2)} kg`}
                                    </td>
                                    <td style={{ padding: 10, fontSize: 12 }}>${parseFloat(d.precio_unitario || 0).toFixed(2)}</td>
                                    <td style={{ padding: 10, fontSize: 12 }}>${parseFloat(d.subtotal_venta || 0).toFixed(2)}</td>
                                    <td style={{ padding: 10, fontSize: 12 }}>${parseFloat(d.costo_total || 0).toFixed(2)}</td>
                                    <td style={{ padding: 10, fontSize: 12, fontWeight: "bold", color: ganancia >= 0 ? "#4caf50" : "#f44336" }}>
                                        ${ganancia.toFixed(2)}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
