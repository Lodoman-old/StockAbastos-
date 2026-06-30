import { money } from "../format";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { get, post, put } from "../services/api";

export function Clientes() {
    const navigate = useNavigate();
    const [clientes, setClientes] = useState<any[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [nombre, setNombre] = useState("");
    const [telefono, setTelefono] = useState("");
    const [direccion, setDireccion] = useState("");
    const [limite, setLimite] = useState("");

    const load = () => get("/clientes").then(setClientes).catch(() => {});
    useEffect(() => { load(); }, []);

    const openNew = () => { setEditId(null); setNombre(""); setTelefono(""); setDireccion(""); setLimite(""); setShowModal(true); };
    const openEdit = (c: any) => { setEditId(c.id); setNombre(c.nombre); setTelefono(c.telefono || ""); setDireccion(c.direccion || ""); setLimite(c.limite_credito?.toString() || "0"); setShowModal(true); };

    const save = async () => {
        if (!nombre) return;
        try {
            const body = { nombre, telefono: telefono || undefined, direccion: direccion || undefined, limite_credito: parseFloat(limite) || 0 };
            if (editId) await put(`/clientes/${editId}`, body);
            else await post("/clientes", body);
            setShowModal(false);
            load();
        } catch (e: any) { alert("Error: " + e.message); }
    };

    return (
        <>
            <div className="header" style={{ marginBottom: 16 }}>
                <span className="header-back" onClick={() => navigate("/")}>←</span>
                <h1>Clientes</h1>
                <button onClick={openNew} className="btn btn-primary">+ Nuevo</button>
            </div>
            <div className="page">

            {showModal && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
                    <div style={{ background: "#fff", borderRadius: 16, padding: 24, width: "100%", maxWidth: 400, maxHeight: "90vh", overflow: "auto" }}>
                        <h3 style={{ marginTop: 0 }}>{editId ? "Editar" : "Nuevo"} Cliente</h3>
                        <div className="input-group"><label>Nombre</label><input className="input" value={nombre} onChange={e => setNombre(e.target.value)} /></div>
                        <div className="input-group"><label>Teléfono</label><input className="input" value={telefono} onChange={e => setTelefono(e.target.value)} /></div>
                        <div className="input-group"><label>Dirección</label><input className="input" value={direccion} onChange={e => setDireccion(e.target.value)} /></div>
                        <div className="input-group"><label>Límite de crédito ($)</label><input className="input" type="number" value={limite} onChange={e => setLimite(e.target.value)} /></div>
                        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                            <button onClick={() => setShowModal(false)} className="btn btn-outline" style={{ flex: 1 }}>Cancelar</button>
                            <button onClick={save} className="btn btn-primary" style={{ flex: 1 }}>Guardar</button>
                        </div>
                    </div>
                </div>
            )}

            <div style={{ display: "grid", gap: 8 }}>
                {clientes.map(c => (
                    <div key={c.id} className="card" onClick={() => openEdit(c)} style={{ cursor: "pointer", padding: "12px 16px" }}>
                        <div style={{ fontWeight: "bold", fontSize: 15 }}>{c.nombre}</div>
                        <div style={{ fontSize: 13, color: "#888" }}>{c.telefono || "Sin teléfono"} — Límite: ${money(c.limite_credito || 0)}</div>
                    </div>
                ))}
                {!clientes.length && <p style={{ color: "#888", textAlign: "center" }}>Sin clientes</p>}
            </div>
        </div></>
    );
}

