import React, { useEffect, useState } from "react";
import { get, put, API } from "../services/api";
import { notify } from "../components/Toast";

function openQrPrint(loteId: string) {
    const token = localStorage.getItem("token");
    fetch(`${API}/tarimas/qr-lote/${loteId}`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    }).then(r => r.text()).then(html => {
        const w = window.open("", "_blank");
        if (w) { w.document.write(html); w.document.close(); }
    }).catch(() => notify("Error al cargar QRs", "error"));
}

const estadoColor: Record<string, string> = {
    PENDIENTE: "#ff9800", RECIBIDO: "#4caf50", DISPONIBLE: "#2196f3",
    TRASPASADO: "#9c27b0", APARTADO: "#607d8b", VENDIDO: "#333", MERMA: "#f44336",
    COMPLETADO: "#888",
};

export function Lotes() {
    const [lotes, setLotes] = useState<any[]>([]);
    const [bodegas, setBodegas] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandidos, setExpandidos] = useState<Record<string, boolean>>({});
    const [editHijo, setEditHijo] = useState<any>(null);
    const [mostrarCompletados, setMostrarCompletados] = useState(false);

    useEffect(() => {
        Promise.all([get("/lotes"), get("/bodegas")]).then(([l, b]) => {
            setBodegas(b);
            const padres = l.filter((x: any) => !x.lote_padre_id);
            const hijos = l.filter((x: any) => x.lote_padre_id);
            const hijosPorPadre: Record<string, any[]> = {};
            for (const h of hijos) {
                if (!hijosPorPadre[h.lote_padre_id]) hijosPorPadre[h.lote_padre_id] = [];
                hijosPorPadre[h.lote_padre_id].push(h);
            }
            setLotes(padres.map((p: any) => {
                const hijos = hijosPorPadre[p.id] || [];
                const recibidas = hijos.reduce((s: number, h: any) => s + (parseInt(h.recibidas) || 0), 0);
                const parcial = hijos.reduce((s: number, h: any) => s + (parseInt(h.parcial) || 0), 0);
                const pendientes = hijos.reduce((s: number, h: any) => s + (parseInt(h.pendientes) || 0), 0);
                return { ...p, hijos, recibidas, parcial, pendientes };
            }));
        }).catch(() => {}).finally(() => setLoading(false));
    }, []);

    const guardarEdicion = async () => {
        if (!editHijo) return;
        try {
            await put(`/lotes/${editHijo.id}/estado`, { estado: editHijo.estado_actual, bodega_id: editHijo.nuevaBodega });
            notify("Lote hijo actualizado", "success");
            setEditHijo(null);
            setLotes([]); setLoading(true);
            Promise.all([get("/lotes"), get("/bodegas")]).then(([l]) => {
                const padres = l.filter((x: any) => !x.lote_padre_id);
                const hijos = l.filter((x: any) => x.lote_padre_id);
                const hijosPorPadre: Record<string, any[]> = {};
                for (const h of hijos) { if (!hijosPorPadre[h.lote_padre_id]) hijosPorPadre[h.lote_padre_id] = []; hijosPorPadre[h.lote_padre_id].push(h); }
                setLotes(padres.map((p: any) => {
                    const hijos = hijosPorPadre[p.id] || [];
                    const recibidas = hijos.reduce((s: number, h: any) => s + (parseInt(h.recibidas) || 0), 0);
                    const pendientes = hijos.reduce((s: number, h: any) => s + (parseInt(h.pendientes) || 0), 0);
                    return { ...p, hijos, recibidas, pendientes };
                }));
                setLoading(false);
            });
        } catch (e: any) { notify("Error: " + e.message, "error"); }
    };

    if (loading) return <div><h1>Lotes</h1><p>Cargando...</p></div>;
    const visibles = mostrarCompletados ? lotes : lotes.filter(p => p.estado !== "COMPLETADO");

    return (
        <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h1 style={{ margin: 0 }}>Lotes</h1>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "#555" }}>
                    <input type="checkbox" checked={mostrarCompletados} onChange={e => setMostrarCompletados(e.target.checked)} style={{ width: 18, height: 18, cursor: "pointer" }} />
                    Mostrar completados
                </label>
            </div>
            {visibles.map(p => {
                const expand = expandidos[p.id];
                return (
                    <div key={p.id} style={{ background: "#fff", borderRadius: 12, marginBottom: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 14, cursor: "pointer", borderLeft: `4px solid ${estadoColor[p.estado] || "#ccc"}` }}
                            onClick={() => setExpandidos(prev => ({ ...prev, [p.id]: !prev[p.id] }))}>
                            <div style={{ flex: 1 }}>
                                <strong style={{ fontSize: 15 }}>{p.codigo_lote}</strong>
                                <span style={{ marginLeft: 8, padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: "bold", background: `${estadoColor[p.estado] || "#eee"}22`, color: estadoColor[p.estado] || "#888" }}>
                                    {p.estado}
                                </span>
                                <span onClick={e => { e.stopPropagation(); openQrPrint(p.id); }} title="Imprimir QRs"
                                    style={{ marginLeft: 8, cursor: "pointer", fontSize: 16, color: "#555", userSelect: "none" }}>
                                    🖨️
                                </span>
                                <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
                                    {p.proveedor_nombre || "Sin proveedor"} — {p.hijos.length} hijo(s) — {p.pendientes || 0} pendiente(s) — {p.recibidas || 0} recibida(s){p.parcial ? ` — ${p.parcial} parcial(es)` : ""}
                                </div>
                            </div>
                            <span style={{ fontSize: 12, color: "#999", transition: "transform 0.2s", transform: expand ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
                        </div>
                        {expand && (
                            <div style={{ padding: "0 14px 14px", borderTop: "1px solid #eee" }}>
                                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginTop: 8 }}>
                                    <thead>
                                        <tr style={{ background: "#f9f9f9", textAlign: "left" }}>
                                            <th style={{ padding: "6px 8px" }}>Código</th>
                                            <th style={{ padding: "6px 8px" }}>Producto</th>
                                            <th style={{ padding: "6px 8px" }}>Bodega</th>
                                            <th style={{ padding: "6px 8px" }}>Tarimas compradas</th>
                                            <th style={{ padding: "6px 8px" }}>Pendientes</th>
                                            <th style={{ padding: "6px 8px" }}>Recibidas</th>
                                            <th style={{ padding: "6px 8px" }}>Parciales</th>
                                            <th style={{ padding: "6px 8px" }}>Traspasadas</th>
                                            <th style={{ padding: "6px 8px" }}>Estado</th>
                                            <th style={{ padding: "6px 8px" }}>Caducidad</th>
                                            <th style={{ padding: "6px 8px" }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {p.hijos.map((h: any) => (
                                            <tr key={h.id} style={{ borderTop: "1px solid #f0f0f0" }}>
                                                <td style={{ padding: "6px 8px", fontWeight: "bold" }}>{h.codigo_lote}</td>
                                                <td style={{ padding: "6px 8px" }}>{h.producto_nombre || "-"}</td>
                                                <td style={{ padding: "6px 8px" }}>{h.bodega_nombre || "-"}</td>
                                                <td style={{ padding: "6px 8px" }}>{h.total_tarimas ?? "-"}</td>
                                                <td style={{ padding: "6px 8px", color: "#ff9800" }}>{h.pendientes || 0}</td>
                                                <td style={{ padding: "6px 8px", color: "#4caf50" }}>{h.recibidas || 0}</td>
                                                <td style={{ padding: "6px 8px", color: "#9c27b0" }}>{h.parcial || 0}</td>
                                                <td style={{ padding: "6px 8px", color: "#1565c0" }}>{h.en_transito || 0}</td>
                                                <td style={{ padding: "6px 8px" }}>
                                                    <span style={{ padding: "2px 6px", borderRadius: 4, fontSize: 11, fontWeight: "bold", background: `${estadoColor[h.estado] || "#eee"}22`, color: estadoColor[h.estado] || "#888" }}>
                                                        {h.estado}
                                                    </span>
                                                </td>
                                                <td style={{ padding: "6px 8px" }}>{h.fecha_caducidad ? new Date(h.fecha_caducidad).toLocaleDateString() : "-"}</td>
                                                <td style={{ padding: "6px 8px", whiteSpace: "nowrap" }}>
                                                    <span onClick={() => openQrPrint(h.id)} title="Imprimir QRs"
                                                        style={{ cursor: "pointer", fontSize: 16, marginRight: 6, userSelect: "none" }}>
                                                        🖨️
                                                    </span>
                                                    {h.estado === "PENDIENTE" && (
                                                        <button onClick={() => setEditHijo({ id: h.id, bodega_actual: h.bodega_id, nuevaBodega: h.bodega_id, estado_actual: h.estado, codigo: h.codigo_lote })}
                                                            style={{ background: "none", border: "1px solid #ff9800", color: "#ff9800", borderRadius: 4, padding: "3px 8px", cursor: "pointer", fontSize: 11 }}>
                                                            Editar
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                );
            })}

            {editHijo && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}
                    onClick={() => setEditHijo(null)}>
                    <div style={{ background: "#fff", borderRadius: 16, padding: 28, maxWidth: 380, width: "90%" }} onClick={e => e.stopPropagation()}>
                        <h4 style={{ margin: "0 0 12px" }}>Editar lote hijo</h4>
                        <p style={{ fontSize: 13, color: "#666", marginBottom: 12 }}>{editHijo.codigo}</p>
                        <label style={{ fontSize: 13, color: "#555", display: "block", marginBottom: 4 }}>Cambiar bodega</label>
                        <select value={editHijo.nuevaBodega} onChange={e => setEditHijo({ ...editHijo, nuevaBodega: e.target.value })}
                            style={{ width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 14, marginBottom: 16, boxSizing: "border-box" }}>
                            {bodegas.map((b: any) => <option key={b.id} value={b.id}>{b.nombre}</option>)}
                        </select>
                        <div style={{ display: "flex", gap: 8 }}>
                            <button onClick={guardarEdicion} style={{ flex: 1, padding: "10px 0", background: "#1a8a3a", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: "bold" }}>
                                Guardar
                            </button>
                            <button onClick={() => setEditHijo(null)} style={{ flex: 1, padding: "10px 0", background: "#888", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}>
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
