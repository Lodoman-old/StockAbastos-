import React, { useEffect, useState } from "react";
import { get, post, put, del } from "../services/api";

const estadoColor: Record<string, string> = {
    PENDIENTE: "#ff9800", RECIBIDA: "#4caf50", EN_TRANSITO: "#e65100", ENTREGADA: "#1565c0",
};

export function Bodegas() {
    const [bodegas, setBodegas] = useState<any[]>([]);
    const [ubicaciones, setUbicaciones] = useState<any[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ codigo: "", nombre: "", ubicacion_id: "", es_default: false });
    const [editing, setEditing] = useState<string | null>(null);
    const [error, setError] = useState("");
    const [stockModal, setStockModal] = useState<any>(null);
    const [stockDetalle, setStockDetalle] = useState<any[]>([]);
    const [loadingStock, setLoadingStock] = useState(false);

    const load = () => Promise.all([
        get("/bodegas").then(setBodegas),
        get("/ubicaciones").then(setUbicaciones),
    ]).catch(() => {});
    useEffect(() => { load(); }, []);

    const verStock = async (bodega: any) => {
        setLoadingStock(true);
        try {
            const [resumen, detalle] = await Promise.all([
                get("/tarimas/por-bodega").then((data: any) => data.find((x: any) => x.bodega_id === bodega.id)),
                get(`/tarimas/stock-detalle/${bodega.id}`),
            ]);
            setStockModal({ ...resumen, codigo: bodega.codigo, nombre: bodega.nombre });
            setStockDetalle(detalle);
        } catch { setStockModal(null); setStockDetalle([]); }
        setLoadingStock(false);
    };

    const openNew = () => {
        setEditing(null);
        setForm({ codigo: "", nombre: "", ubicacion_id: "", es_default: false });
        setError("");
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        try {
            if (editing) {
                await put(`/bodegas/${editing}`, form);
            } else {
                await post("/bodegas", form);
            }
            setShowModal(false);
            load();
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleEdit = (b: any) => {
        setForm({ codigo: b.codigo, nombre: b.nombre, ubicacion_id: b.ubicacion_id || "", es_default: b.es_default || false });
        setEditing(b.id);
        setError("");
        setShowModal(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("¿Desactivar esta bodega?")) return;
        try {
            await del(`/bodegas/${id}`);
            load();
        } catch (err: any) {
            alert(err.message);
        }
    };

    const card: React.CSSProperties = { background: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" };
    const input: React.CSSProperties = { width: "100%", padding: "10px 12px", fontSize: 14, border: "1px solid #ddd", borderRadius: 8, outline: "none", boxSizing: "border-box" };
    const select: React.CSSProperties = { ...input, background: "#fff" };
    const btnSmall: React.CSSProperties = { padding: "6px 14px", border: "none", borderRadius: 6, fontSize: 12, cursor: "pointer", marginRight: 8 };

    return (
        <div style={{ padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h1>Bodegas / Cuartos Fríos</h1>
                <button onClick={openNew} style={{ background: "#1a8a3a", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 8, cursor: "pointer", whiteSpace: "nowrap" }}>+ Nueva</button>
            </div>

            {showModal && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}
                    onClick={() => setShowModal(false)}>
                    <div style={{ background: "#fff", borderRadius: 16, padding: 32, maxWidth: 500, width: "90%" }} onClick={e => e.stopPropagation()}>
                        <h3 style={{ marginBottom: 16 }}>{editing ? "Editar Bodega" : "Nueva Bodega"}</h3>
                        {error && <p style={{ color: "#dc2626", fontSize: 13, marginBottom: 8 }}>{error}</p>}
                        <form onSubmit={handleSubmit}>
                            <div style={{ marginBottom: 12 }}>
                                <label style={{ fontSize: 13, color: "#555", marginBottom: 4, display: "block" }}>Código *</label>
                                <input value={form.codigo} onChange={e => setForm({ ...form, codigo: e.target.value })} placeholder="Ej: BOD-C-01" required style={input} />
                            </div>
                            <div style={{ marginBottom: 12 }}>
                                <label style={{ fontSize: 13, color: "#555", marginBottom: 4, display: "block" }}>Nombre *</label>
                                <input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Cámara Fría 3" required style={input} />
                            </div>
                            <div style={{ marginBottom: 12 }}>
                                <label style={{ fontSize: 13, color: "#555", marginBottom: 4, display: "block" }}>Ubicación</label>
                                <select value={form.ubicacion_id} onChange={e => setForm({ ...form, ubicacion_id: e.target.value })} style={select}>
                                    <option value="">-- Sin asignar --</option>
                                    {ubicaciones.map((u: any) => (
                                        <option key={u.id} value={u.id}>{u.nombre}</option>
                                    ))}
                                </select>
                            </div>
                            <div style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                                <input type="checkbox" id="es_default" checked={form.es_default}
                                    onChange={e => setForm({ ...form, es_default: e.target.checked })}
                                    style={{ width: 18, height: 18, cursor: "pointer" }} />
                                <label htmlFor="es_default" style={{ fontSize: 14, cursor: "pointer" }}>
                                    Bodega predeterminada en POS
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

            <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
                {bodegas.map((b: any) => (
                    <div key={b.id} style={{ ...card, borderLeft: `4px solid ${b.ubicacion_id ? "#4caf50" : "#ff9800"}` }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <h3>{b.codigo}
                                    {b.es_default && (
                                        <span style={{ marginLeft: 8, background: "#1565c0", color: "#fff", fontSize: 11, fontWeight: "bold", padding: "2px 8px", borderRadius: 12, verticalAlign: "middle", whiteSpace: "nowrap" }}>
                                            DEFAULT POS
                                        </span>
                                    )}
                                </h3>
                                <p style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{b.nombre}</p>
                                {b.ubicacion_nombre && (
                                    <span style={{
                                        display: "inline-block", padding: "3px 8px", borderRadius: 4,
                                        fontSize: 11, fontWeight: "bold", marginTop: 6,
                                        background: "#e8f5e9", color: "#2e7d32",
                                    }}>
                                        {b.ubicacion_nombre}
                                    </span>
                                )}
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
                                <button onClick={() => verStock(b)} style={{ ...btnSmall, background: "#e8f5e9", color: "#2e7d32", marginRight: 0 }}>Ver Stock</button>
                                <button onClick={() => handleEdit(b)} style={{ ...btnSmall, background: "#e3f2fd", color: "#1565c0", marginRight: 0 }}>Editar</button>
                                <button onClick={() => handleDelete(b.id)} style={{ ...btnSmall, background: "#fef2f2", color: "#dc2626", marginRight: 0 }}>Desactivar</button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {stockModal && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}
                    onClick={() => setStockModal(null)}>
                    <div style={{ background: "#fff", borderRadius: 16, padding: 32, maxWidth: 700, width: "90%", maxHeight: "80vh", overflow: "auto" }} onClick={e => e.stopPropagation()}>
                        <h3 style={{ margin: "0 0 4px" }}>{stockModal.codigo}</h3>
                        <p style={{ fontSize: 14, color: "#666", marginBottom: 16 }}>{stockModal.nombre}</p>
                        {loadingStock ? (
                            <p style={{ color: "#888" }}>Cargando...</p>
                        ) : (
                            <>
                                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                                    {[
                                        { label: "Total", value: stockModal.total, color: "#333" },
                                        { label: "Pendientes", value: stockModal.pendientes, color: estadoColor.PENDIENTE },
                                        { label: "Disponibles", value: stockModal.recibidas, color: estadoColor.RECIBIDA },
                                        { label: "Parciales", value: stockModal.parcial, color: "#9c27b0" },
                                        { label: "En tránsito", value: stockModal.en_transito, color: estadoColor.EN_TRANSITO },
                                    ].map(s => (
                                        <div key={s.label} style={{ padding: "6px 12px", borderRadius: 8, background: `${s.color}12`, fontSize: 13, display: "flex", gap: 6, alignItems: "center" }}>
                                            <span style={{ color: "#555" }}>{s.label}</span>
                                            <span style={{ fontWeight: "bold", color: s.color }}>{s.value || 0}</span>
                                        </div>
                                    ))}
                                </div>
                                {stockDetalle.length > 0 ? (
                                    <div style={{ overflowX: "auto" }}>
                                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                                            <thead>
                                                <tr style={{ background: "#f5f5f5", textAlign: "left" }}>
                                                    <th style={{ padding: "8px 10px" }}>Producto</th>
                                                    <th style={{ padding: "8px 10px" }}>SKU</th>
                                                    <th style={{ padding: "8px 10px" }}>Total</th>
                                                    <th style={{ padding: "8px 10px" }}>Disponibles</th>
                                                    <th style={{ padding: "8px 10px" }}>Parciales (cajas)</th>
                                                    <th style={{ padding: "8px 10px" }}>Próxima caducidad</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {stockDetalle.map((p: any) => {
                                                    const vence = p.proxima_caducidad;
                                                    const hoy = new Date();
                                                    const days = vence ? Math.ceil((new Date(vence).getTime() - hoy.getTime()) / 86400000) : null;
                                                    const urgente = days !== null && days <= 5;
                                                    return (
                                                        <tr key={p.producto_id} style={{
                                                            borderTop: "1px solid #eee",
                                                            background: urgente ? "#fff3e0" : undefined,
                                                        }}>
                                                            <td style={{ padding: "8px 10px", fontWeight: "bold" }}>{p.producto_nombre}</td>
                                                            <td style={{ padding: "8px 10px", color: "#666" }}>{p.sku}</td>
                                                            <td style={{ padding: "8px 10px" }}>{p.total}</td>
                                                            <td style={{ padding: "8px 10px", color: "#4caf50" }}>{p.recibidas} ({p.cajas_recibidas} cajas)</td>
                                                            <td style={{ padding: "8px 10px", color: "#9c27b0" }}>{p.parcial > 0 ? `${p.parcial} (${p.cajas_parciales} cajas)` : "-"}</td>
                                                            <td style={{ padding: "8px 10px" }}>
                                                                {vence ? (
                                                                    <span style={{
                                                                        display: "inline-block", padding: "2px 8px", borderRadius: 4, fontSize: 12, fontWeight: "bold",
                                                                        background: urgente ? "#ffcc02" : "#e8f5e9",
                                                                        color: urgente ? "#e65100" : "#2e7d32",
                                                                    }}>
                                                                        {new Date(vence).toLocaleDateString()}
                                                                        {urgente && ` (${days}d)`}
                                                                    </span>
                                                                ) : <span style={{ color: "#aaa" }}>-</span>}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <p style={{ color: "#888" }}>Sin tarimas en esta bodega</p>
                                )}
                            </>
                        )}
                        <button onClick={() => setStockModal(null)} style={{ marginTop: 16, padding: "8px 20px", background: "#888", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", width: "100%" }}>
                            Cerrar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
