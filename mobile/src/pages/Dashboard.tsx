import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { get } from "../services/api";

export function Dashboard() {
    const navigate = useNavigate();
    const [stats, setStats] = useState<any>(null);
    const [error, setError] = useState("");
    const [preciosPendientes, setPreciosPendientes] = useState(0);
    const [stockBajo, setStockBajo] = useState(0);
    const [cajaAbierta, setCajaAbierta] = useState<boolean | null>(null);
    const [hidePrecios, setHidePrecios] = useState(false);
    const [hideStockBajo, setHideStockBajo] = useState(false);

    useEffect(() => {
        get("/dashboard/stats").then(setStats).catch((e) => setError(e.message));
        get("/precios-diarios/pendientes").then((data) => {
            setPreciosPendientes(data.filter((p: any) => !p.precio_hoy_kg).length);
        }).catch(() => {});
        get("/dashboard/inventario").then((data) => {
            const total = data.reduce((s: number, r: any) => s + Number(r.cajas || 0) + Number(r.cajas_parciales || 0), 0);
            setStockBajo(total < 50 ? data.length : 0);
        }).catch(() => {});
        get("/cortes/esta-abierto").then(r => setCajaAbierta(r.abierto)).catch(() => setCajaAbierta(null));
    }, []);

    if (error) return <p style={{ color: "#f44336" }}>Error: {error}</p>;
    if (!stats) return <p>Cargando...</p>;

    return (
        <>
            <div className="header" style={{ marginBottom: 16 }}>
                <span className="header-back" onClick={() => navigate("/")}>←</span>
                <h1>Dashboard</h1>
            </div>
            <div className="page">
            {cajaAbierta !== null && (
                <div style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "8px 14px", borderRadius: 8, marginBottom: 12, fontSize: 13, fontWeight: "bold",
                    background: cajaAbierta ? "#e8f5e9" : "#fef2f2",
                    color: cajaAbierta ? "#1a8a3a" : "#dc2626",
                }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: cajaAbierta ? "#4caf50" : "#ef4444" }} />
                    {cajaAbierta ? "Caja abierta" : "Caja cerrada"}
                </div>
            )}
            {preciosPendientes > 0 && !hidePrecios && (
                <div style={{ background: "#fff3cd", color: "#856404", padding: "10px 14px", borderRadius: 8, marginBottom: 8, fontSize: 13, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span><strong>{preciosPendientes}</strong> productos sin precio hoy</span>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span style={{ color: "#1a8a3a", fontWeight: "bold" }} onClick={() => window.location.hash = "#/precios_diarios"}>Asignar →</span>
                        <button onClick={() => setHidePrecios(true)} style={{ background: "none", border: "none", cursor: "pointer", color: "#856404", fontSize: 14, padding: 0, lineHeight: 1 }}>✕</button>
                    </div>
                </div>
            )}
            {stockBajo > 0 && !hideStockBajo && (
                <div style={{ background: "#fef2f2", color: "#991b1b", padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 13, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>Inventario bajo</span>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span style={{ color: "#dc2626", fontWeight: "bold" }} onClick={() => window.location.hash = "#/reportes"}>Ver →</span>
                        <button onClick={() => setHideStockBajo(true)} style={{ background: "none", border: "none", cursor: "pointer", color: "#991b1b", fontSize: 14, padding: 0, lineHeight: 1 }}>✕</button>
                    </div>
                </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {[
                    { label: "Productos", value: stats.productos },
                    { label: "Bodegas", value: stats.bodegas },
                    { label: "Lotes activos", value: stats.lotes },
                    { label: "Ventas (30d)", value: stats.ventas_30d },
                ].map(item => (
                    <div key={item.label} style={{
                        background: "#fff", borderRadius: 12, padding: 16, textAlign: "center",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                    }}>
                        <div style={{ fontSize: 24, fontWeight: "bold", color: "#1a8a3a" }}>{item.value ?? "—"}</div>
                        <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>{item.label}</div>
                    </div>
                ))}
            </div>
        </div></>
    );
}
