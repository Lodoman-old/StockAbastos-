import React, { useEffect, useState } from "react";
import { get, post, del } from "../services/api";

const CATEGORIAS = ["Luz", "Agua", "Nómina", "Renta", "Transporte", "Mantenimiento", "Otro"];

export function Gastos() {
    const [gastos, setGastos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ concepto: "", monto: "", categoria: "", fecha: new Date().toISOString().substring(0, 10) });

    const load = () => get("/gastos").then(setGastos).catch(() => {}).finally(() => setLoading(false));
    useEffect(() => { load(); }, []);

    const save = async () => {
        if (!form.concepto || !form.monto) return alert("Concepto y monto requeridos");
        try {
            await post("/gastos", { ...form, monto: parseFloat(form.monto) });
            setShowModal(false);
            setForm({ concepto: "", monto: "", categoria: "", fecha: new Date().toISOString().substring(0, 10) });
            load();
        } catch (e: any) { alert("Error: " + e.message); }
    };

    const eliminar = async (id: string) => {
        if (!confirm("¿Eliminar este gasto?")) return;
        try {
            await del(`/gastos/${id}`);
            load();
        } catch (e: any) {
            alert("Error al eliminar: " + (e.message || "Desconocido"));
        }
    };

    const total = gastos.reduce((s, g) => s + parseFloat(g.monto || 0), 0);

    if (loading) return <div><h1>Gastos</h1><p>Cargando...</p></div>;

    const inputStyle: React.CSSProperties = { width: "100%", padding: "10px 12px", fontSize: 14, border: "1px solid #ddd", borderRadius: 8, boxSizing: "border-box" };

    return (
        <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                    <h1 style={{ margin: 0 }}>Gastos</h1>
                    <div style={{ fontSize: 12, color: "#888" }}>{new Date().toLocaleDateString("es-MX")}</div>
                </div>
                <button onClick={() => setShowModal(true)} style={{ padding: "8px 16px", background: "#1a8a3a", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: "bold" }}>+ Nuevo Gasto</button>
            </div>

            {showModal && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }} onClick={() => setShowModal(false)}>
                    <div style={{ background: "#fff", borderRadius: 16, padding: 32, maxWidth: 450, width: "90%" }} onClick={e => e.stopPropagation()}>
                        <h3 style={{ marginTop: 0 }}>Nuevo Gasto</h3>
                        <div style={{ display: "grid", gap: 12 }}>
                            <div>
                                <label style={{ fontSize: 13, color: "#555", display: "block", marginBottom: 4 }}>Concepto *</label>
                                <input value={form.concepto} onChange={e => setForm({ ...form, concepto: e.target.value })} style={inputStyle} />
                            </div>
                            <div>
                                <label style={{ fontSize: 13, color: "#555", display: "block", marginBottom: 4 }}>Monto ($) *</label>
                                <input type="number" step="0.01" value={form.monto} onChange={e => setForm({ ...form, monto: e.target.value })} style={inputStyle} />
                            </div>
                            <div>
                                <label style={{ fontSize: 13, color: "#555", display: "block", marginBottom: 4 }}>Categoría</label>
                                <select value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })} style={inputStyle}>
                                    <option value="">Sin categoría</option>
                                    {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={{ fontSize: 13, color: "#555", display: "block", marginBottom: 4 }}>Fecha</label>
                                <input type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} style={inputStyle} />
                            </div>
                        </div>
                        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                            <button onClick={save} style={{ padding: "10px 20px", background: "#1a8a3a", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: "bold" }}>Guardar</button>
                            <button onClick={() => setShowModal(false)} style={{ padding: "10px 20px", background: "#888", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}>Cancelar</button>
                        </div>
                    </div>
                </div>
            )}

            <div style={{ background: "#fff", borderRadius: 12, padding: 16, marginBottom: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.08)", textAlign: "right", fontSize: 18, fontWeight: "bold", color: "#f44336" }}>
                Total gastado: ${total.toFixed(2)}
            </div>

            <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: 8, overflow: "hidden", minWidth: 500 }}>
                    <thead>
                        <tr style={{ background: "#f5f5f5", textAlign: "left" }}>
                            <th style={{ padding: 12 }}>Fecha</th>
                            <th style={{ padding: 12 }}>Concepto</th>
                            <th style={{ padding: 12 }}>Categoría</th>
                            <th style={{ padding: 12 }}>Monto</th>
                            <th style={{ padding: 12 }}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {gastos.map(g => (
                            <tr key={g.id} style={{ borderTop: "1px solid #eee" }}>
                                <td style={{ padding: 12 }}>{new Date(g.fecha).toLocaleDateString()}</td>
                                <td style={{ padding: 12 }}>{g.concepto}</td>
                                <td style={{ padding: 12 }}>{g.categoria || "-"}</td>
                                <td style={{ padding: 12, fontWeight: "bold" }}>${parseFloat(g.monto).toFixed(2)}</td>
                                <td style={{ padding: 12 }}>
                                    <button onClick={() => eliminar(g.id)} style={{ background: "none", border: "1px solid #f44336", color: "#f44336", borderRadius: 4, padding: "4px 8px", fontSize: 11, cursor: "pointer" }}>Eliminar</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
