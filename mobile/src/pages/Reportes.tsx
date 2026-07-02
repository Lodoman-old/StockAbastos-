import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { get } from "../services/api";

export function Reportes() {
    const navigate = useNavigate();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        get("/dashboard/reportes").then(setData).catch(() => {}).finally(() => setLoading(false));
    }, []);

    if (loading) return <p style={{ color: "#888", textAlign: "center" }}>Cargando...</p>;
    if (!data) return <p style={{ color: "#f44336", textAlign: "center" }}>Error</p>;

    const maxKg = Math.max(...(data.top_productos || []).map((p: any) => parseFloat(p.total_kg)), 1);
    const maxCs = Math.max(...(data.top_productos_cs || []).map((p: any) => parseFloat(p.total_cajas)), 1);

    return (
        <>
            <div className="header" style={{ marginBottom: 16 }}>
                <span className="header-back" onClick={() => navigate("/")}>←</span>
                <h1>Reportes</h1>
            </div>
            <div className="page">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
                <div style={{ background: "#fff", borderRadius: 10, padding: 12, textAlign: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
                    <div style={{ fontSize: 20, fontWeight: "bold", color: "#1a8a3a" }}>
                        {data.ingresos_mensuales?.slice(-1)?.[0]?.ingresos ? `$${parseFloat(data.ingresos_mensuales.slice(-1)[0].ingresos).toFixed(0)}` : "$0"}
                    </div>
                    <div style={{ fontSize: 11, color: "#888" }}>Este mes</div>
                </div>
                <div style={{ background: "#fff", borderRadius: 10, padding: 12, textAlign: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
                    <div style={{ fontSize: 20, fontWeight: "bold", color: "#d32f2f" }}>${parseFloat(data.gastos_30d?.total_gastos || 0).toFixed(0)}</div>
                    <div style={{ fontSize: 11, color: "#888" }}>Gastos 30d</div>
                </div>
            </div>

            <h4 style={{ margin: "0 0 8px", fontSize: 13, color: "#555" }}>Más vendidos (kg)</h4>
            <div style={{ background: "#fff", borderRadius: 10, padding: 12, marginBottom: 8, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
                {(data.top_productos || []).slice(0, 5).map((p: any) => {
                    const pct = maxKg > 0 ? (parseFloat(p.total_kg) / maxKg) * 100 : 0;
                    return (
                        <div key={p.nombre} style={{ marginBottom: 6 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 2 }}>
                                <span>{p.nombre}</span>
                                <span style={{ fontWeight: "bold" }}>{parseFloat(p.total_kg).toFixed(1)} kg</span>
                            </div>
                            <div style={{ background: "#e8e8e8", borderRadius: 4, height: 14, overflow: "hidden" }}>
                                <div style={{ width: `${pct}%`, background: "#1a8a3a", height: "100%", borderRadius: 4 }} />
                            </div>
                        </div>
                    );
                })}
                {!data.top_productos?.length && <p style={{ fontSize: 12, color: "#888" }}>Sin datos</p>}
            </div>

            <h4 style={{ margin: "0 0 8px", fontSize: 13, color: "#555" }}>Más vendidos (CS)</h4>
            <div style={{ background: "#fff", borderRadius: 10, padding: 12, marginBottom: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
                {(data.top_productos_cs || []).slice(0, 5).map((p: any) => {
                    const pct = maxCs > 0 ? (parseFloat(p.total_cajas) / maxCs) * 100 : 0;
                    return (
                        <div key={p.nombre} style={{ marginBottom: 6 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 2 }}>
                                <span>{p.nombre}</span>
                                <span style={{ fontWeight: "bold" }}>{parseFloat(p.total_cajas).toFixed(1)} cajas</span>
                            </div>
                            <div style={{ background: "#e8e8e8", borderRadius: 4, height: 14, overflow: "hidden" }}>
                                <div style={{ width: `${pct}%`, background: "#7b1fa2", height: "100%", borderRadius: 4 }} />
                            </div>
                        </div>
                    );
                })}
                {!data.top_productos_cs?.length && <p style={{ fontSize: 12, color: "#888" }}>Sin datos</p>}
            </div>

            <h4 style={{ margin: "0 0 8px", fontSize: 13, color: "#555" }}>Stock bajo</h4>
            <div style={{ background: "#fff", borderRadius: 10, padding: 12, marginBottom: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
                {(data.productos_bajo_stock || []).slice(0, 5).map((p: any) => (
                    <div key={p.nombre} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid #f0f0f0", fontSize: 12 }}>
                        <span>{p.nombre}</span>
                        <span style={{ color: parseFloat(p.stock_kg) < 10 ? "#d32f2f" : "#ff9800", fontWeight: "bold" }}>
                            {parseFloat(p.stock_kg).toFixed(1)} kg
                        </span>
                    </div>
                ))}
                {!data.productos_bajo_stock?.length && <p style={{ fontSize: 12, color: "#888" }}>Sin datos</p>}
            </div>
        </div></>
    );
}
