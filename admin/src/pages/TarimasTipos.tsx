import React, { useEffect, useState } from "react";
import { get, post, put, del } from "../services/api";

export function TarimasTipos() {
    const [tipos, setTipos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editando, setEditando] = useState<any>(null);
    const [form, setForm] = useState({ nombre: "", cantidad_cajas: "" });

    const load = () => get("/tarimas-tipos").then(setTipos).catch(() => {}).finally(() => setLoading(false));
    useEffect(() => { load(); }, []);

    const guardar = async () => {
        if (!form.nombre || !form.cantidad_cajas) return alert("Todos los campos requeridos");
        try {
            if (editando) {
                await put(`/tarimas-tipos/${editando.id}`, { nombre: form.nombre, cantidad_cajas: parseInt(form.cantidad_cajas) });
            } else {
                await post("/tarimas-tipos", { nombre: form.nombre, cantidad_cajas: parseInt(form.cantidad_cajas) });
            }
            setShowModal(false); setEditando(null); setForm({ nombre: "", cantidad_cajas: "" }); load();
        } catch (e: any) { alert("Error: " + e.message); }
    };

    const eliminar = async (id: string) => {
        if (!confirm("¿Desactivar este tipo de tarima?")) return;
        try { await del(`/tarimas-tipos/${id}`); load(); } catch (e: any) { alert("Error: " + e.message); }
    };

    const abrirEditar = (t: any) => {
        setEditando(t); setForm({ nombre: t.nombre, cantidad_cajas: String(t.cantidad_cajas) }); setShowModal(true);
    };

    const inputStyle: React.CSSProperties = { width: "100%", padding: "10px 12px", fontSize: 14, border: "1px solid #ddd", borderRadius: 8, boxSizing: "border-box" };

    return (
        <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h1 style={{ margin: 0 }}>Tipos de Tarima</h1>
                <button onClick={() => { setEditando(null); setForm({ nombre: "", cantidad_cajas: "" }); setShowModal(true); }}
                    style={{ padding: "8px 16px", background: "#1a8a3a", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: "bold" }}>
                    + Nuevo Tipo
                </button>
            </div>

            {showModal && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }} onClick={() => setShowModal(false)}>
                    <div style={{ background: "#fff", borderRadius: 16, padding: 32, maxWidth: 400, width: "90%" }} onClick={e => e.stopPropagation()}>
                        <h3 style={{ marginTop: 0 }}>{editando ? "Editar" : "Nuevo"} Tipo de Tarima</h3>
                        <div style={{ display: "grid", gap: 12 }}>
                            <div>
                                <label style={{ fontSize: 13, color: "#555", display: "block", marginBottom: 4 }}>Nombre *</label>
                                <input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} style={inputStyle} />
                            </div>
                            <div>
                                <label style={{ fontSize: 13, color: "#555", display: "block", marginBottom: 4 }}>Cantidad de cajas *</label>
                                <input type="number" min="1" value={form.cantidad_cajas} onChange={e => setForm({ ...form, cantidad_cajas: e.target.value })} style={inputStyle} />
                            </div>
                        </div>
                        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                            <button onClick={guardar} style={{ padding: "10px 20px", background: "#1a8a3a", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: "bold" }}>Guardar</button>
                            <button onClick={() => setShowModal(false)} style={{ padding: "10px 20px", background: "#888", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}>Cancelar</button>
                        </div>
                    </div>
                </div>
            )}

            {loading ? <p>Cargando...</p> : (
                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: 8, overflow: "hidden" }}>
                        <thead>
                            <tr style={{ background: "#f5f5f5", textAlign: "left" }}>
                                <th style={{ padding: 12 }}>Nombre</th>
                                <th style={{ padding: 12 }}>Cajas por tarima</th>
                                <th style={{ padding: 12 }}>Activo</th>
                                <th style={{ padding: 12 }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {tipos.map(t => (
                                <tr key={t.id} style={{ borderTop: "1px solid #eee" }}>
                                    <td style={{ padding: 12 }}>{t.nombre}</td>
                                    <td style={{ padding: 12, fontWeight: "bold" }}>{t.cantidad_cajas}</td>
                                    <td style={{ padding: 12 }}>{t.activo ? "✅" : "❌"}</td>
                                    <td style={{ padding: 12 }}>
                                        <button onClick={() => abrirEditar(t)} style={{ background: "none", border: "1px solid #1976d2", color: "#1976d2", borderRadius: 4, padding: "4px 8px", fontSize: 11, cursor: "pointer", marginRight: 4 }}>Editar</button>
                                        <button onClick={() => eliminar(t.id)} style={{ background: "none", border: "1px solid #f44336", color: "#f44336", borderRadius: 4, padding: "4px 8px", fontSize: 11, cursor: "pointer" }}>Desactivar</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
