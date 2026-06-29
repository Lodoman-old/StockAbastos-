import React, { useEffect, useState } from "react";
import { get, post, put, del } from "../services/api";

export function Ubicaciones() {
    const [ubicaciones, setUbicaciones] = useState<any[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ nombre: "", direccion: "", es_venta_principal: false });
    const [editing, setEditing] = useState<string | null>(null);
    const [error, setError] = useState("");

    const load = () => get("/ubicaciones").then(setUbicaciones).catch(() => {});
    useEffect(() => { load(); }, []);

    const openNew = () => {
        setEditing(null);
        setForm({ nombre: "", direccion: "", es_venta_principal: false });
        setError("");
        setShowModal(true);
    };

    const openEdit = (u: any) => {
        setForm({ nombre: u.nombre, direccion: u.direccion || "", es_venta_principal: u.es_venta_principal || false });
        setEditing(u.id);
        setError("");
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        try {
            if (editing) {
                await put(`/ubicaciones/${editing}`, {
                    nombre: form.nombre,
                    direccion: form.direccion || undefined,
                    es_venta_principal: form.es_venta_principal,
                });
            } else {
                await post("/ubicaciones", {
                    nombre: form.nombre,
                    direccion: form.direccion || undefined,
                    es_venta_principal: form.es_venta_principal,
                });
            }
            setShowModal(false);
            load();
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleEdit = (u: any) => openEdit(u);

    const handleDelete = async (id: string) => {
        if (!confirm("¿Eliminar esta ubicación?")) return;
        try {
            await del(`/ubicaciones/${id}`);
            load();
        } catch (err: any) {
            alert(err.message);
        }
    };

    const card: React.CSSProperties = { background: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.08)", marginBottom: 16 };
    const input: React.CSSProperties = { width: "100%", padding: "10px 12px", fontSize: 14, border: "1px solid #ddd", borderRadius: 8, outline: "none", boxSizing: "border-box" };
    const btnSmall: React.CSSProperties = { padding: "6px 14px", border: "none", borderRadius: 6, fontSize: 12, cursor: "pointer", marginRight: 8 };

    return (
        <div style={{ padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h1>Ubicaciones</h1>
                <button onClick={openNew} style={{ background: "#1a8a3a", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 8, cursor: "pointer", whiteSpace: "nowrap" }}>+ Nueva</button>
            </div>

            {showModal && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}
                    onClick={() => setShowModal(false)}>
                    <div style={{ background: "#fff", borderRadius: 16, padding: 32, maxWidth: 500, width: "90%" }} onClick={e => e.stopPropagation()}>
                        <h3 style={{ marginBottom: 16 }}>{editing ? "Editar Ubicación" : "Nueva Ubicación"}</h3>
                        {error && <p style={{ color: "#dc2626", fontSize: 13, marginBottom: 8 }}>{error}</p>}
                        <form onSubmit={handleSubmit}>
                            <div style={{ marginBottom: 12 }}>
                                <label style={{ fontSize: 13, color: "#555", marginBottom: 4, display: "block" }}>Nombre *</label>
                                <input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Sucursal Norte" required style={input} />
                            </div>
                            <div style={{ marginBottom: 12 }}>
                                <label style={{ fontSize: 13, color: "#555", marginBottom: 4, display: "block" }}>Dirección</label>
                                <input value={form.direccion} onChange={e => setForm({ ...form, direccion: e.target.value })} placeholder="Calle, colonia, referencia" style={input} />
                            </div>
                            <div style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                                <input type="checkbox" id="es_venta_principal" checked={form.es_venta_principal}
                                    onChange={e => setForm({ ...form, es_venta_principal: e.target.checked })}
                                    style={{ width: 18, height: 18, cursor: "pointer" }} />
                                <label htmlFor="es_venta_principal" style={{ fontSize: 14, cursor: "pointer" }}>
                                    Punto de venta principal
                                </label>
                            </div>
                            <div style={{ display: "flex", gap: 8 }}>
                                <button type="submit" style={{ padding: "10px 20px", background: "#1a3a2a", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, cursor: "pointer" }}>{editing ? "Guardar" : "Crear"}</button>
                                <button type="button" onClick={() => setShowModal(false)} style={{ padding: "10px 20px", background: "#888", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, cursor: "pointer" }}>Cancelar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {ubicaciones.map((u: any) => (
                <div key={u.id} style={card}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                            <h3>{u.nombre}
                                {u.es_venta_principal && (
                                    <span style={{ marginLeft: 8, background: "#1a8a3a", color: "#fff", fontSize: 11, fontWeight: "bold", padding: "2px 8px", borderRadius: 12, verticalAlign: "middle" }}>
                                        VENTA PRINCIPAL
                                    </span>
                                )}
                            </h3>
                            {u.direccion && <p style={{ color: "#666", fontSize: 13, marginTop: 4 }}>{u.direccion}</p>}
                        </div>
                        <div>
                            <button onClick={() => handleEdit(u)} style={{ ...btnSmall, background: "#e3f2fd", color: "#1565c0" }}>Editar</button>
                            <button onClick={() => handleDelete(u.id)} style={{ ...btnSmall, background: "#fef2f2", color: "#dc2626" }}>Eliminar</button>
                        </div>
                    </div>
                    {u.bodegas && u.bodegas.length > 0 && (
                        <div style={{ marginTop: 12, borderTop: "1px solid #eee", paddingTop: 12 }}>
                            <p style={{ fontSize: 12, color: "#888", marginBottom: 8 }}>Bodegas / Cuartos fríos:</p>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                                {(u.bodegas as any[]).map((b: any) => (
                                    <span key={b.id} style={{
                                        display: "inline-block", padding: "4px 10px", borderRadius: 6, fontSize: 12,
                                        background: b.activa ? "#e8f5e9" : "#f5f5f5", color: b.activa ? "#2e7d32" : "#999",
                                    }}>
                                        {b.codigo} - {b.nombre}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
