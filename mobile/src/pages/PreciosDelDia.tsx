import { money } from "../format";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { get, put } from "../services/api";

export function PreciosDelDia() {
    const navigate = useNavigate();
    const [productos, setProductos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState("");
    useEffect(() => { if (msg) { const t = setTimeout(() => setMsg(""), 8000); return () => clearTimeout(t); } }, [msg]);

    const cargar = () => {
        setLoading(true);
        get("/precios-diarios/pendientes").then(setProductos).catch(() => {}).finally(() => setLoading(false));
    };

    useEffect(() => { cargar(); }, []);

    const set = (id: string, field: string, value: string) => {
        setProductos(p => p.map(pr => pr.id === id ? { ...pr, [field]: value } : pr));
    };

    const guardar = async () => {
        setSaving(true);
        setMsg("");
        try {
            await put("/precios-diarios", {
                items: productos.map(p => ({
                    producto_id: p.id,
                    precio_kg: parseFloat(p.precio_hoy_kg) || parseFloat(p.precio_por_kg) || 0,
                    precio_caja: parseFloat(p.precio_hoy_caja) || parseFloat(p.precio_por_caja) || null,
                })),
            });
            setMsg("Precios guardados para hoy");
            cargar();
        } catch (e: any) { setMsg("Error: " + e.message); }
        setSaving(false);
    };

    if (loading) return <p style={{ color: "#888", textAlign: "center" }}>Cargando...</p>;

    const pendientes = productos.filter(p => !p.precio_hoy_kg);

    const s: React.CSSProperties = { padding: "6px 10px", border: "1px solid #ddd", borderRadius: 6, fontSize: 14, width: "100%", boxSizing: "border-box", textAlign: "right" };

    return (
        <>
            <div className="header" style={{ marginBottom: 16 }}>
                <span className="header-back" onClick={() => navigate("/")}>←</span>
                <h1>Precios del Día</h1>
            </div>
            <div className="page">
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
                <button onClick={guardar} disabled={saving}
                    style={{ padding: "8px 14px", background: "#1a8a3a", color: "#fff", border: "none", borderRadius: 6, cursor: saving ? "not-allowed" : "pointer", fontSize: 13 }}>
                    {saving ? "Guardando..." : "Guardar"}
                </button>
            </div>

            {pendientes.length > 0 && (
                <div style={{ background: "#fff3cd", color: "#856404", padding: "8px 12px", borderRadius: 8, fontSize: 12, marginBottom: 12 }}>
                    {pendientes.length} producto(s) sin precio hoy
                </div>
            )}

            {msg && (
                <div style={{ padding: 8, borderRadius: 8, fontSize: 13, marginBottom: 12,
                    background: msg.includes("Error") ? "#fef2f2" : "#e8f5e9",
                    color: msg.includes("Error") ? "#dc2626" : "#1a8a3a" }}>
                    {msg}
                </div>
            )}

            {productos.map((p: any) => (
                <div key={p.id} style={{ background: "#fff", borderRadius: 10, padding: 12, marginBottom: 8, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
                    <div style={{ fontWeight: "bold", fontSize: 14, marginBottom: 8 }}>{p.nombre}</div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ fontSize: 11, color: "#888" }}>$ KG</label>
                            <input type="number" step={0.01} min={0}
                                value={p.precio_hoy_kg ?? p.precio_por_kg ?? ""}
                                onChange={e => set(p.id, "precio_hoy_kg", e.target.value)}
                                style={{ ...s, background: !p.precio_hoy_kg ? "#fff8e1" : "#fff" }}
                                placeholder={p.precio_por_kg || "0"} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ fontSize: 11, color: "#888" }}>$ Caja</label>
                            <input type="number" step={0.01} min={0}
                                value={p.precio_hoy_caja ?? p.precio_por_caja ?? ""}
                                onChange={e => set(p.id, "precio_hoy_caja", e.target.value)}
                                style={s}
                                placeholder={p.precio_por_caja || "0"} />
                        </div>
                    </div>
                    <div style={{ fontSize: 11, color: "#999", marginTop: 4 }}>Base: ${money(p.precio_por_kg || 0)}/kg</div>
                </div>
            ))}
        </div></>
    );
}

