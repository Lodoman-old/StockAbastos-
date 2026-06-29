import React, { useEffect, useState } from "react";
import { get, post, put } from "../services/api";

export function Clientes() {
    const [clientes, setClientes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [form, setForm] = useState({ nombre: "", telefono: "", direccion: "", limite_credito: "" });

    const load = () => get("/clientes").then(setClientes).catch(() => {}).finally(() => setLoading(false));
    useEffect(() => { load(); }, []);

    const openNew = () => { setEditId(null); setForm({ nombre: "", telefono: "", direccion: "", limite_credito: "" }); setShowModal(true); };
    const openEdit = (c: any) => { setEditId(c.id); setForm({ nombre: c.nombre, telefono: c.telefono || "", direccion: c.direccion || "", limite_credito: c.limite_credito?.toString() || "0" }); setShowModal(true); };

    const save = async () => {
        if (!form.nombre) return alert("Nombre requerido");
        try {
            if (editId) {
                await put(`/clientes/${editId}`, { ...form, limite_credito: parseFloat(form.limite_credito) || 0 });
            } else {
                await post("/clientes", { ...form, limite_credito: parseFloat(form.limite_credito) || 0 });
            }
            setShowModal(false);
            load();
        } catch (e: any) { alert("Error: " + e.message); }
    };

    const inputStyle: React.CSSProperties = { width: "100%", padding: "10px 12px", fontSize: 14, border: "1px solid #ddd", borderRadius: 8, boxSizing: "border-box" };

    if (loading) return <div><h1>Clientes</h1><p>Cargando...</p></div>;

    return (
        <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h1 style={{ margin: 0 }}>Clientes</h1>
                <button onClick={openNew} style={{ padding: "8px 16px", background: "#1a8a3a", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: "bold" }}>+ Nuevo Cliente</button>
            </div>

            {showModal && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }} onClick={() => setShowModal(false)}>
                    <div style={{ background: "#fff", borderRadius: 16, padding: 32, maxWidth: 500, width: "90%" }} onClick={e => e.stopPropagation()}>
                        <h3 style={{ marginTop: 0 }}>{editId ? "Editar" : "Nuevo"} Cliente</h3>
                        <div style={{ display: "grid", gap: 12 }}>
                            <div>
                                <label style={{ fontSize: 13, color: "#555", display: "block", marginBottom: 4 }}>Nombre *</label>
                                <input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} style={inputStyle} />
                            </div>
                            <div>
                                <label style={{ fontSize: 13, color: "#555", display: "block", marginBottom: 4 }}>Teléfono</label>
                                <input value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} style={inputStyle} />
                            </div>
                            <div>
                                <label style={{ fontSize: 13, color: "#555", display: "block", marginBottom: 4 }}>Dirección</label>
                                <input value={form.direccion} onChange={e => setForm({ ...form, direccion: e.target.value })} style={inputStyle} />
                            </div>
                            <div>
                                <label style={{ fontSize: 13, color: "#555", display: "block", marginBottom: 4 }}>Límite de crédito ($)</label>
                                <input type="number" step="0.01" value={form.limite_credito} onChange={e => setForm({ ...form, limite_credito: e.target.value })} style={inputStyle} />
                            </div>
                        </div>
                        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                            <button onClick={save} style={{ padding: "10px 20px", background: "#1a8a3a", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: "bold" }}>Guardar</button>
                            <button onClick={() => setShowModal(false)} style={{ padding: "10px 20px", background: "#888", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}>Cancelar</button>
                        </div>
                    </div>
                </div>
            )}

            <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: 8, overflow: "hidden", minWidth: 600 }}>
                    <thead>
                        <tr style={{ background: "#f5f5f5", textAlign: "left" }}>
                            <th style={{ padding: 12 }}>Nombre</th>
                            <th style={{ padding: 12 }}>Teléfono</th>
                            <th style={{ padding: 12 }}>Dirección</th>
                            <th style={{ padding: 12 }}>Límite crédito</th>
                            <th style={{ padding: 12 }}>Acción</th>
                        </tr>
                    </thead>
                    <tbody>
                        {clientes.map(c => (
                            <tr key={c.id} style={{ borderTop: "1px solid #eee" }}>
                                <td style={{ padding: 12, fontWeight: "bold" }}>{c.nombre}</td>
                                <td style={{ padding: 12 }}>{c.telefono || "-"}</td>
                                <td style={{ padding: 12 }}>{c.direccion || "-"}</td>
                                <td style={{ padding: 12 }}>${parseFloat(c.limite_credito || 0).toFixed(2)}</td>
                                <td style={{ padding: 12 }}>
                                    <button onClick={() => openEdit(c)} style={{ background: "none", border: "1px solid #2196f3", color: "#2196f3", borderRadius: 4, padding: "4px 12px", fontSize: 12, cursor: "pointer" }}>Editar</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
