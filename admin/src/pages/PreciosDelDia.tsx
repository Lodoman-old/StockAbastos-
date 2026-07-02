import React, { useEffect, useState } from "react";
import { get, put } from "../services/api";

export function PreciosDelDia() {
    const [productos, setProductos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState("");

    const cargar = () => {
        setLoading(true);
        get("/precios-diarios/pendientes").then(setProductos).catch(() => {}).finally(() => setLoading(false));
    };

    useEffect(() => { cargar(); }, []);

    const setVal = (id: string, field: string, value: string) => {
        setProductos(p => p.map(pr => pr.id === id ? { ...pr, [field]: value } : pr));
    };

    const guardar = async () => {
        setSaving(true);
        setMsg("");
        try {
            await put("/precios-diarios", {
                items: productos.map(p => ({
                    producto_id: p.id,
                    precio_mayoreo_kg: parseFloat(p.precio_hoy_mayoreo_kg) || null,
                    precio_caja_sellada: parseFloat(p.precio_hoy_caja_sellada) || null,
                    precio_menudeo_kg: parseFloat(p.precio_hoy_menudeo_kg) || null,
                    precio_unidad: parseFloat(p.precio_hoy_unidad) || null,
                })),
            });
            setMsg("Precios guardados para hoy");
            cargar();
        } catch (e: any) {
            setMsg("Error: " + (e.message || "Error"));
        }
        setSaving(false);
    };

    const s: React.CSSProperties = { width: "100%", padding: "8px 10px", border: "1px solid #ddd", borderRadius: 6, fontSize: 14, boxSizing: "border-box", textAlign: "right" };

    if (loading) return <div><h1>Precios del Día</h1><p>Cargando...</p></div>;

    const sinPrecio = (p: any) => !p.precio_hoy_mayoreo_kg && !p.precio_hoy_caja_sellada && !p.precio_hoy_menudeo_kg && !p.precio_hoy_unidad;
    const pendientes = productos.filter(sinPrecio);

    return (
        <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
                <h1 style={{ margin: 0 }}>Precios del Día</h1>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {pendientes.length > 0 && (
                        <span style={{ background: "#ff9800", color: "#fff", padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: "bold" }}>
                            {pendientes.length} sin precio hoy
                        </span>
                    )}
                    <button onClick={guardar} disabled={saving}
                        style={{ padding: "8px 16px", background: "#1a8a3a", color: "#fff", border: "none", borderRadius: 8, cursor: saving ? "not-allowed" : "pointer" }}>
                        {saving ? "Guardando..." : "Guardar todos"}
                    </button>
                </div>
            </div>

            {msg && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: 10, borderRadius: 8, marginBottom: 16, fontSize: 14,
                    background: msg.includes("Error") ? "#fef2f2" : "#e8f5e9",
                    color: msg.includes("Error") ? "#dc2626" : "#2e7d32" }}>
                    <button onClick={() => setMsg("")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "inherit", padding: 0, lineHeight: 1 }}>✕</button>
                    <span style={{ flex: 1 }}>{msg}</span>
                </div>
            )}

            <div style={{ background: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                        <tr style={{ background: "#f5f5f5", textAlign: "left" }}>
                            <th style={{ padding: 12 }}>Producto</th>
                            <th style={{ padding: 12, width: 130, textAlign: "center" }}>Caja pesada $/kg</th>
                            <th style={{ padding: 12, width: 130, textAlign: "center" }}>Caja sellada $</th>
                            <th style={{ padding: 12, width: 130, textAlign: "center" }}>Kilo suelto $/kg</th>
                            <th style={{ padding: 12, width: 130, textAlign: "center" }}>Unidad $</th>
                        </tr>
                    </thead>
                    <tbody>
                        {productos.map((p: any) => (
                            <tr key={p.id} style={{ borderTop: "1px solid #eee" }}>
                                <td style={{ padding: 12 }}>
                                    <strong>{p.nombre}</strong>
                                    <span style={{ fontSize: 12, color: "#888", marginLeft: 8 }}>SKU: {p.sku}</span>
                                </td>
                                <td style={{ padding: 12, textAlign: "center" }}>
                                    {p.modalidad_caja_pesada ? (
                                        <input type="number" step={0.01} min={0}
                                            value={p.precio_hoy_mayoreo_kg ?? p.precio_mayoreo_kg ?? ""}
                                            onChange={e => setVal(p.id, "precio_hoy_mayoreo_kg", e.target.value)}
                                            style={{ ...s, width: 110, background: !p.precio_hoy_mayoreo_kg && p.modalidad_caja_pesada ? "#fff8e1" : "#fff" }}
                                            placeholder={p.precio_mayoreo_kg || "0"} />
                                    ) : <span style={{ color: "#bbb" }}>—</span>}
                                </td>
                                <td style={{ padding: 12, textAlign: "center" }}>
                                    {p.modalidad_caja_sellada ? (
                                        <input type="number" step={0.01} min={0}
                                            value={p.precio_hoy_caja_sellada ?? p.precio_caja_sellada ?? ""}
                                            onChange={e => setVal(p.id, "precio_hoy_caja_sellada", e.target.value)}
                                            style={{ ...s, width: 110, background: !p.precio_hoy_caja_sellada && p.modalidad_caja_sellada ? "#fff8e1" : "#fff" }}
                                            placeholder={p.precio_caja_sellada || "0"} />
                                    ) : <span style={{ color: "#bbb" }}>—</span>}
                                </td>
                                <td style={{ padding: 12, textAlign: "center" }}>
                                    {p.modalidad_kilo_suelto ? (
                                        <input type="number" step={0.01} min={0}
                                            value={p.precio_hoy_menudeo_kg ?? p.precio_menudeo_kg ?? ""}
                                            onChange={e => setVal(p.id, "precio_hoy_menudeo_kg", e.target.value)}
                                            style={{ ...s, width: 110, background: !p.precio_hoy_menudeo_kg && p.modalidad_kilo_suelto ? "#fff8e1" : "#fff" }}
                                            placeholder={p.precio_menudeo_kg || "0"} />
                                    ) : <span style={{ color: "#bbb" }}>—</span>}
                                </td>
                                <td style={{ padding: 12, textAlign: "center" }}>
                                    {p.modalidad_unidad ? (
                                        <input type="number" step={0.01} min={0}
                                            value={p.precio_hoy_unidad ?? p.precio_por_unidad ?? ""}
                                            onChange={e => setVal(p.id, "precio_hoy_unidad", e.target.value)}
                                            style={{ ...s, width: 110, background: !p.precio_hoy_unidad && p.modalidad_unidad ? "#fff8e1" : "#fff" }}
                                            placeholder={p.precio_por_unidad || "0"} />
                                    ) : <span style={{ color: "#bbb" }}>—</span>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
