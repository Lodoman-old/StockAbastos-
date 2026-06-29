import React, { useEffect, useState } from "react";
import { get } from "../services/api";

export function HistorialPrecios() {
    const [productos, setProductos] = useState<any[]>([]);
    const [historial, setHistorial] = useState<any[]>([]);
    const [productoId, setProductoId] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        get("/productos").then(setProductos).catch(() => {}).finally(() => setLoading(false));
    }, []);

    const cargarHistorial = (id: string) => {
        setProductoId(id);
        if (!id) { setHistorial([]); return; }
        get(`/precios-diarios/historial/${id}`).then(setHistorial).catch(() => {});
    };

    const maxPrecio = Math.max(...historial.map(h => parseFloat(h.precio_kg)), 1);

    return (
        <div>
            <h2 style={{ marginBottom: 24 }}>Historial de Precios</h2>

            <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 13, color: "#555", display: "block", marginBottom: 4 }}>Producto</label>
                <select value={productoId} onChange={e => cargarHistorial(e.target.value)}
                    style={{ width: "100%", maxWidth: 400, padding: "10px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 14 }}>
                    <option value="">Seleccionar producto</option>
                    {productos.map((p: any) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
            </div>

            {productoId && (
                <div style={{ background: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
                    <h4 style={{ margin: "0 0 16px", fontSize: 14 }}>Precio por KG a través del tiempo</h4>

                    {historial.length === 0 ? (
                        <p style={{ color: "#888", fontSize: 13 }}>Sin historial de precios para este producto</p>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            {historial.slice().reverse().map((h: any, i: number) => {
                                const pct = maxPrecio > 0 ? (parseFloat(h.precio_kg) / maxPrecio) * 100 : 0;
                                const prev = historial.slice().reverse()[i - 1];
                                const diff = prev ? parseFloat(h.precio_kg) - parseFloat(prev.precio_kg) : 0;
                                return (
                                    <div key={h.fecha} style={{ marginBottom: 4 }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 2 }}>
                                            <span style={{ color: "#888" }}>{h.fecha}</span>
                                            <span>
                                                <strong>${parseFloat(h.precio_kg).toFixed(2)}</strong>
                                                {h.precio_caja && <span style={{ color: "#888" }}> / caja: ${parseFloat(h.precio_caja).toFixed(2)}</span>}
                                                {diff !== 0 && (
                                                    <span style={{ color: diff > 0 ? "#d32f2f" : "#1a8a3a", marginLeft: 6, fontSize: 11 }}>
                                                        {diff > 0 ? "▲" : "▼"} ${Math.abs(diff).toFixed(2)}
                                                    </span>
                                                )}
                                            </span>
                                        </div>
                                        <div style={{ background: "#e8e8e8", borderRadius: 4, height: 16, overflow: "hidden" }}>
                                            <div style={{ width: `${pct}%`, background: "#1976d2", height: "100%", borderRadius: 4, minWidth: pct > 0 ? 4 : 0 }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {historial.length > 0 && (
                        <div style={{ marginTop: 16, fontSize: 12, color: "#888", borderTop: "1px solid #eee", paddingTop: 12 }}>
                            <div>Precio base (catálogo): <strong>${parseFloat(historial[0]?.precio_base_kg || 0).toFixed(2)}</strong>/kg</div>
                            <div>Último precio registrado: <strong>${parseFloat(historial[historial.length - 1]?.precio_kg || 0).toFixed(2)}</strong>/kg</div>
                            <div>Precio más alto: <strong>${maxPrecio.toFixed(2)}</strong>/kg</div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
