import React, { useEffect, useState } from "react";
import { get, post, put } from "../services/api";

export function Usuarios() {
    const [usuarios, setUsuarios] = useState<any[]>([]);
    const [roles, setRoles] = useState<any[]>([]);
    const [bodegas, setBodegas] = useState<any[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [form, setForm] = useState({ email: "", password: "", nombre: "", rol_id: "", bodega_id: "", activo: true });
    const [error, setError] = useState("");
    const [msg, setMsg] = useState("");

    const load = () => Promise.all([
        get("/auth/usuarios").then(setUsuarios),
        get("/roles").then(setRoles),
        get("/bodegas").then(setBodegas),
    ]).catch(() => {});
    useEffect(() => { load(); }, []);

    const openNew = () => {
        setEditId(null);
        setForm({ email: "", password: "", nombre: "", rol_id: "", bodega_id: "", activo: true });
        setError("");
        setMsg("");
        setShowModal(true);
    };

    const openEdit = (u: any) => {
        setEditId(u.id);
        setForm({ email: u.email, password: "", nombre: u.nombre, rol_id: u.rol_id || "", bodega_id: u.bodega_id || "", activo: u.activo });
        setError("");
        setMsg("");
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setMsg("");
        try {
            const body: any = {
                email: form.email,
                nombre: form.nombre,
                rol_id: form.rol_id || undefined,
                bodega_id: form.bodega_id || null,
                activo: form.activo,
            };
            if (form.password) body.password = form.password;

            if (editId) {
                await put(`/auth/usuarios/${editId}`, body);
                setMsg("Usuario actualizado correctamente");
            } else {
                await post("/auth/register", { ...form, rol_id: form.rol_id || undefined, bodega_id: form.bodega_id || undefined });
                setMsg("Usuario creado correctamente");
            }
            setShowModal(false);
            load();
        } catch (err: any) {
            setError(err.message || "Error al guardar usuario");
        }
    };

    const card: React.CSSProperties = { background: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.08)", marginBottom: 12 };
    const input: React.CSSProperties = { width: "100%", padding: "10px 12px", fontSize: 14, border: "1px solid #ddd", borderRadius: 8, outline: "none", boxSizing: "border-box" };
    const select: React.CSSProperties = { ...input, background: "#fff" };

    return (
        <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h1>Usuarios</h1>
                <button onClick={openNew} style={{ background: "#1a8a3a", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 8, cursor: "pointer" }}>+ Nuevo Usuario</button>
            </div>

            {msg && <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 8, marginBottom: 12, fontSize: 14, background: "#e8f5e9", color: "#2e7d32" }}><span style={{ flex: 1 }}>{msg}</span><button onClick={() => setMsg("")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "inherit", padding: 0, lineHeight: 1 }}>✕</button></div>}

            {showModal && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}
                    onClick={() => setShowModal(false)}>
                    <div style={{ background: "#fff", borderRadius: 16, padding: 32, maxWidth: 500, width: "90%" }} onClick={e => e.stopPropagation()}>
                        <h3 style={{ marginBottom: 16 }}>{editId ? "Editar Usuario" : "Nuevo Usuario"}</h3>
                        {error && <p style={{ color: "#dc2626", fontSize: 13, marginBottom: 8 }}>{error}</p>}
                        <form onSubmit={handleSubmit}>
                            <div style={{ marginBottom: 12 }}>
                                <label style={{ fontSize: 13, color: "#555", marginBottom: 4, display: "block" }}>Nombre *</label>
                                <input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Nombre completo" required style={input} />
                            </div>
                            <div style={{ marginBottom: 12 }}>
                                <label style={{ fontSize: 13, color: "#555", marginBottom: 4, display: "block" }}>Email *</label>
                                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="correo@ejemplo.com" required style={input} />
                            </div>
                            <div style={{ marginBottom: 12 }}>
                                <label style={{ fontSize: 13, color: "#555", marginBottom: 4, display: "block" }}>
                                    Contraseña {editId ? "(dejar vacío para no cambiar)" : "*"}
                                </label>
                                <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="••••••••" required={!editId} style={input} />
                            </div>
                            <div style={{ marginBottom: 12 }}>
                                <label style={{ fontSize: 13, color: "#555", marginBottom: 4, display: "block" }}>Rol</label>
                                <select value={form.rol_id} onChange={e => setForm({ ...form, rol_id: e.target.value })} style={select}>
                                    <option value="">-- Sin rol --</option>
                                    {roles.map((r: any) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                                </select>
                            </div>
                            <div style={{ marginBottom: 12 }}>
                                <label style={{ fontSize: 13, color: "#555", marginBottom: 4, display: "block" }}>Bodega asignada</label>
                                <select value={form.bodega_id} onChange={e => setForm({ ...form, bodega_id: e.target.value })} style={select}>
                                    <option value="">-- Sin asignar --</option>
                                    {bodegas.map((b: any) => <option key={b.id} value={b.id}>{b.codigo} - {b.nombre}</option>)}
                                </select>
                            </div>
                            {editId && (
                                <div style={{ marginBottom: 16 }}>
                                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
                                        <input type="checkbox" checked={form.activo} onChange={e => setForm({ ...form, activo: e.target.checked })} />
                                        <strong>Usuario activo</strong>
                                    </label>
                                </div>
                            )}
                            <div style={{ display: "flex", gap: 8 }}>
                                <button type="submit" style={{ padding: "10px 20px", background: "#1a3a2a", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, cursor: "pointer" }}>
                                    {editId ? "Guardar Cambios" : "Crear Usuario"}
                                </button>
                                <button type="button" onClick={() => setShowModal(false)} style={{ padding: "10px 20px", background: "#888", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, cursor: "pointer" }}>Cancelar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {usuarios.map((u: any) => (
                <div key={u.id} style={{ ...card, borderLeft: `4px solid ${u.activo ? "#4caf50" : "#f44336"}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                            <h3>{u.nombre}</h3>
                            <p style={{ fontSize: 13, color: "#666", margin: "4px 0" }}>{u.email}</p>
                            <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                                <span style={{ padding: "3px 8px", borderRadius: 4, fontSize: 11, fontWeight: "bold", background: "#e3f2fd", color: "#1565c0" }}>
                                    {u.rol_nombre || u.rol}
                                </span>
                                {!u.activo && (
                                    <span style={{ padding: "3px 8px", borderRadius: 4, fontSize: 11, fontWeight: "bold", background: "#fef2f2", color: "#dc2626" }}>
                                        Inactivo
                                    </span>
                                )}
                            </div>
                        </div>
                        <button onClick={() => openEdit(u)} style={{ background: "none", border: "1px solid #1a8a3a", color: "#1a8a3a", padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>
                            Editar
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}