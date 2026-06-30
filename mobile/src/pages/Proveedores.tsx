import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { get, post, put, del } from "../services/api";

export function Proveedores() {
    const [proveedores, setProveedores] = useState<any[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [form, setForm] = useState({ nombre: "", contacto: "", telefono: "", email: "", direccion: "", rfc: "" });
    const navigate = useNavigate();

    useEffect(() => { get("/proveedores").then(setProveedores).catch(() => {}); }, []);

    const guardar = async () => {
        if (!form.nombre) return;
        try {
            if (editId) {
                await put(`/proveedores/${editId}`, form);
            } else {
                await post("/proveedores", form);
            }
            setShowForm(false);
            setEditId(null);
            setForm({ nombre: "", contacto: "", telefono: "", email: "", direccion: "", rfc: "" });
            get("/proveedores").then(setProveedores);
        } catch (e: any) { alert("Error: " + e.message); }
    };

    const editar = (p: any) => {
        setForm({ nombre: p.nombre, contacto: p.contacto || "", telefono: p.telefono || "", email: p.email || "", direccion: p.direccion || "", rfc: p.rfc || "" });
        setEditId(p.id);
        setShowForm(true);
    };

    const eliminar = async (id: string) => {
        if (!confirm("¿Eliminar proveedor?")) return;
        try { await del(`/proveedores/${id}`); get("/proveedores").then(setProveedores); }
        catch (e: any) { alert("Error: " + e.message); }
    };

    const s: React.CSSProperties = { padding: "6px 10px", border: "1px solid #ddd", borderRadius: 6, fontSize: 14, width: "100%", boxSizing: "border-box" };

    return (
        <>
            <div className="header" style={{ marginBottom: 16 }}>
                <span className="header-back" onClick={() => navigate("/")}>←</span>
                <h1>Proveedores</h1>
            </div>
            <div className="page">
            <button onClick={() => { setShowForm(true); setEditId(null); setForm({ nombre: "", contacto: "", telefono: "", email: "", direccion: "", rfc: "" }); }}
                style={{ width: "100%", padding: 14, background: "#1a8a3a", color: "#fff", border: "none", borderRadius: 8, fontSize: 16, fontWeight: "bold", cursor: "pointer", marginBottom: 16 }}>
                + Nuevo Proveedor
            </button>

            {showForm && (
                <div style={{ background: "#f9f9f9", borderRadius: 12, padding: 16, marginBottom: 16 }}>
                    <h4 style={{ margin: "0 0 12px" }}>{editId ? "Editar" : "Nuevo"} Proveedor</h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <input placeholder="Nombre *" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} style={s} />
                        <input placeholder="Contacto" value={form.contacto} onChange={e => setForm({ ...form, contacto: e.target.value })} style={s} />
                        <input placeholder="Teléfono" value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} style={s} />
                        <input placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} style={s} />
                        <input placeholder="Dirección" value={form.direccion} onChange={e => setForm({ ...form, direccion: e.target.value })} style={s} />
                        <input placeholder="RFC" value={form.rfc} onChange={e => setForm({ ...form, rfc: e.target.value })} style={s} />
                        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                            <button onClick={guardar} style={{ flex: 1, padding: 10, background: "#1a8a3a", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}>Guardar</button>
                            <button onClick={() => { setShowForm(false); setEditId(null); }} style={{ flex: 1, padding: 10, background: "#888", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}>Cancelar</button>
                        </div>
                    </div>
                </div>
            )}

            {proveedores.length === 0 ? (
                <p style={{ color: "#888", textAlign: "center" }}>No hay proveedores</p>
            ) : proveedores.map((p: any) => (
                <div key={p.id} style={{ background: "#fff", borderRadius: 10, padding: 12, marginBottom: 8, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                            <strong>{p.nombre}</strong>
                            <p style={{ fontSize: 12, color: "#666", margin: "2px 0" }}>{p.contacto} {p.telefono ? `· ${p.telefono}` : ""}</p>
                            {p.email && <p style={{ fontSize: 12, color: "#888", margin: 0 }}>{p.email}</p>}
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                            <button onClick={() => editar(p)} style={{ background: "none", border: "none", color: "#2196f3", cursor: "pointer", fontSize: 13 }}>Editar</button>
                            <button onClick={() => eliminar(p.id)} style={{ background: "none", border: "none", color: "#f44336", cursor: "pointer", fontSize: 13 }}>Eliminar</button>
                        </div>
                    </div>
                </div>
            ))}
        </div></>
    );
}
