import React, { useEffect, useState } from "react";
import { get, post, put, del } from "../services/api";

export function Roles() {
    const [roles, setRoles] = useState<any[]>([]);
    const [permisos, setPermisos] = useState<any[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ nombre: "", descripcion: "", permisos: [] as string[] });
    const [editing, setEditing] = useState<string | null>(null);
    const [expanded, setExpanded] = useState<string | null>(null);
    const [error, setError] = useState("");

    const load = () => Promise.all([
        get("/roles").then(setRoles),
        get("/roles/permisos/list").then(setPermisos),
    ]).catch(() => {});

    useEffect(() => { load(); }, []);

    const togglePermiso = (clave: string) => {
        setForm(prev => ({
            ...prev,
            permisos: prev.permisos.includes(clave)
                ? prev.permisos.filter((p: string) => p !== clave)
                : [...prev.permisos, clave],
        }));
    };

    const openNew = () => {
        setEditing(null);
        setForm({ nombre: "", descripcion: "", permisos: [] });
        setError("");
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        try {
            if (editing) {
                await put(`/roles/${editing}`, form);
            } else {
                await post("/roles", form);
            }
            setShowModal(false);
            load();
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleEdit = async (id: string) => {
        try {
            const data = await get(`/roles/${id}`);
            setForm({
                nombre: data.nombre,
                descripcion: data.descripcion || "",
                permisos: data.permisos.map((p: any) => p.clave),
            });
            setEditing(id);
            setError("");
            setShowModal(true);
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("¿Eliminar este rol?")) return;
        try {
            await del(`/roles/${id}`);
            load();
        } catch (err: any) {
            alert(err.message);
        }
    };

    const toggleExpand = (id: string) => setExpanded(expanded === id ? null : id);

    const container: React.CSSProperties = { padding: 24 };
    const card: React.CSSProperties = { background: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.08)", marginBottom: 16 };
    const input: React.CSSProperties = { width: "100%", padding: "10px 12px", fontSize: 14, border: "1px solid #ddd", borderRadius: 8, outline: "none", boxSizing: "border-box" };
    const btn: React.CSSProperties = { padding: "10px 20px", background: "#1a3a2a", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, cursor: "pointer" };
    const btnSmall: React.CSSProperties = { padding: "6px 14px", border: "none", borderRadius: 6, fontSize: 12, cursor: "pointer", marginRight: 8 };

    return (
        <div style={container}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h1>Roles y Permisos</h1>
                <button onClick={openNew} style={{ background: "#1a8a3a", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 8, cursor: "pointer", whiteSpace: "nowrap" }}>+ Nuevo Rol</button>
            </div>

            {showModal && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}
                    onClick={() => setShowModal(false)}>
                    <div style={{ background: "#fff", borderRadius: 16, padding: 32, maxWidth: 600, width: "90%", maxHeight: "90vh", overflow: "auto" }} onClick={e => e.stopPropagation()}>
                        <h3 style={{ marginBottom: 16 }}>{editing ? "Editar Rol" : "Nuevo Rol"}</h3>
                        {error && <p style={{ color: "#dc2626", fontSize: 13, marginBottom: 8 }}>{error}</p>}
                        <form onSubmit={handleSubmit}>
                            <div style={{ marginBottom: 12 }}>
                                <label style={{ fontSize: 13, color: "#555", marginBottom: 4, display: "block" }}>Nombre del rol *</label>
                                <input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: gestor_inventario" required style={input} />
                            </div>
                            <div style={{ marginBottom: 16 }}>
                                <label style={{ fontSize: 13, color: "#555", marginBottom: 4, display: "block" }}>Descripción</label>
                                <input value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} placeholder="¿Qué puede hacer este rol?" style={input} />
                            </div>
                            <div style={{ marginBottom: 16 }}>
                                <p style={{ fontSize: 13, color: "#555", marginBottom: 8, fontWeight: "bold" }}>Permisos:</p>
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8 }}>
                                    {permisos.map((p: any) => (
                                        <label key={p.id} style={{
                                            display: "flex", alignItems: "center", gap: 8, padding: "6px 10px",
                                            borderRadius: 6, cursor: "pointer", fontSize: 13,
                                            background: form.permisos.includes(p.clave) ? "#e8f5e9" : "#f9f9f9",
                                            border: `1px solid ${form.permisos.includes(p.clave) ? "#4caf50" : "#eee"}`,
                                        }}>
                                            <input type="checkbox" checked={form.permisos.includes(p.clave)}
                                                onChange={() => togglePermiso(p.clave)} />
                                            <div>
                                                <strong>{p.nombre}</strong>
                                                <p style={{ fontSize: 11, color: "#888", margin: 0 }}>{p.descripcion}</p>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div style={{ display: "flex", gap: 8 }}>
                                <button type="submit" style={btn}>{editing ? "Guardar" : "Crear Rol"}</button>
                                <button type="button" onClick={() => setShowModal(false)} style={{ ...btn, background: "#888" }}>Cancelar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {roles.map((r: any) => (
                <div key={r.id} style={card}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div onClick={() => toggleExpand(r.id)} style={{ cursor: "pointer", flex: 1 }}>
                            <h3>{r.nombre}</h3>
                            {r.descripcion && <p style={{ color: "#666", fontSize: 13 }}>{r.descripcion}</p>}
                        </div>
                        <div>
                            <button onClick={() => handleEdit(r.id)} style={{ ...btnSmall, background: "#e3f2fd", color: "#1565c0" }}>Editar</button>
                            <button onClick={() => handleDelete(r.id)} style={{ ...btnSmall, background: "#fef2f2", color: "#dc2626" }}>Eliminar</button>
                        </div>
                    </div>
                    {expanded === r.id && (
                        <div style={{ marginTop: 12, borderTop: "1px solid #eee", paddingTop: 12 }}>
                            <p style={{ fontSize: 12, color: "#888", marginBottom: 8 }}>Permisos asignados:</p>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                {permisos.filter(p => r.permisos?.some?.((rp: any) => rp.clave === p.clave || rp === p.clave)).length > 0
                                    ? permisos.filter(p => r.permisos?.some?.((rp: any) => rp.clave === p.clave || rp === p.clave)).map((p: any) => (
                                        <span key={p.id} style={{
                                            padding: "4px 10px", borderRadius: 6, fontSize: 12,
                                            background: "#e8f5e9", color: "#2e7d32",
                                        }}>{p.nombre}</span>
                                    ))
                                    : <span style={{ fontSize: 12, color: "#999" }}>Sin permisos asignados</span>
                                }
                            </div>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
