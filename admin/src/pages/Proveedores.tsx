import React, { useEffect, useState } from "react";
import { get, post, put, del } from "../services/api";

export function Proveedores() {
    const [proveedores, setProveedores] = useState<any[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [form, setForm] = useState({ nombre: "", contacto: "", telefono: "", email: "", direccion: "", rfc: "" });

    useEffect(() => { get("/proveedores").then(setProveedores).catch(() => {}); }, []);

    const guardar = async () => {
        if (!form.nombre) return;
        try {
            if (editId) await put(`/proveedores/${editId}`, form);
            else await post("/proveedores", form);
            setShowForm(false); setEditId(null);
            setForm({ nombre: "", contacto: "", telefono: "", email: "", direccion: "", rfc: "" });
            get("/proveedores").then(setProveedores);
        } catch (e: any) { alert("Error: " + e.message); }
    };

    const editar = (p: any) => {
        setForm({ nombre: p.nombre, contacto: p.contacto || "", telefono: p.telefono || "", email: p.email || "", direccion: p.direccion || "", rfc: p.rfc || "" });
        setEditId(p.id); setShowForm(true);
    };

    const eliminar = async (id: string) => {
        if (!window.confirm("¿Eliminar proveedor?")) return;
        try { await del(`/proveedores/${id}`); get("/proveedores").then(setProveedores); }
        catch (e: any) { alert("Error: " + e.message); }
    };

    const s: React.CSSProperties = { padding: "8px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 14, width: "100%", boxSizing: "border-box" };

    return (
        <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h1 style={{ margin: 0 }}>Proveedores</h1>
                <button onClick={() => { setShowForm(true); setEditId(null); setForm({ nombre: "", contacto: "", telefono: "", email: "", direccion: "", rfc: "" }); }}
                    style={{ background: "#1a8a3a", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 8, cursor: "pointer" }}>
                    + Nuevo
                </button>
            </div>

            {showForm && (
                <div style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.08)", marginBottom: 24 }}>
                    <h3 style={{ marginBottom: 16 }}>{editId ? "Editar" : "Nuevo"} Proveedor</h3>
                    <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))" }}>
                        <div><label style={{ display: "block", fontSize: 13, color: "#555", marginBottom: 4 }}>Nombre *</label><input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} style={s} /></div>
                        <div><label style={{ display: "block", fontSize: 13, color: "#555", marginBottom: 4 }}>Contacto</label><input value={form.contacto} onChange={e => setForm({ ...form, contacto: e.target.value })} style={s} /></div>
                        <div><label style={{ display: "block", fontSize: 13, color: "#555", marginBottom: 4 }}>Teléfono</label><input value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} style={s} /></div>
                        <div><label style={{ display: "block", fontSize: 13, color: "#555", marginBottom: 4 }}>Email</label><input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} style={s} /></div>
                        <div><label style={{ display: "block", fontSize: 13, color: "#555", marginBottom: 4 }}>Dirección</label><input value={form.direccion} onChange={e => setForm({ ...form, direccion: e.target.value })} style={s} /></div>
                        <div><label style={{ display: "block", fontSize: 13, color: "#555", marginBottom: 4 }}>RFC</label><input value={form.rfc} onChange={e => setForm({ ...form, rfc: e.target.value })} style={s} /></div>
                    </div>
                    <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
                        <button onClick={guardar} style={{ padding: "10px 24px", background: "#1a8a3a", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}>Guardar</button>
                        <button onClick={() => { setShowForm(false); setEditId(null); }} style={{ padding: "10px 24px", background: "#888", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}>Cancelar</button>
                    </div>
                </div>
            )}

            <div style={{ background: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                        <tr style={{ background: "#f5f5f5", textAlign: "left" }}>
                            <th style={{ padding: 12 }}>Nombre</th>
                            <th style={{ padding: 12 }}>Contacto</th>
                            <th style={{ padding: 12 }}>Teléfono</th>
                            <th style={{ padding: 12 }}>Email</th>
                            <th style={{ padding: 12 }}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {proveedores.length === 0 ? (
                            <tr><td colSpan={5} style={{ padding: 24, textAlign: "center", color: "#999" }}>No hay proveedores</td></tr>
                        ) : proveedores.map((p: any) => (
                            <tr key={p.id} style={{ borderTop: "1px solid #eee" }}>
                                <td style={{ padding: 12 }}><strong>{p.nombre}</strong></td>
                                <td style={{ padding: 12 }}>{p.contacto}</td>
                                <td style={{ padding: 12 }}>{p.telefono}</td>
                                <td style={{ padding: 12 }}>{p.email}</td>
                                <td style={{ padding: 12 }}>
                                    <button onClick={() => editar(p)} style={{ background: "none", border: "none", color: "#2196f3", cursor: "pointer", marginRight: 12 }}>Editar</button>
                                    <button onClick={() => eliminar(p.id)} style={{ background: "none", border: "none", color: "#f44336", cursor: "pointer" }}>Eliminar</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
