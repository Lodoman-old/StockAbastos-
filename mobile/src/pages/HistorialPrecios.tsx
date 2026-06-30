import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { get } from "../services/api";

export function HistorialPrecios() {
    const navigate = useNavigate();
    const [productos, setProductos] = useState<any[]>([]);
    const [historial, setHistorial] = useState<any[]>([]);
    const [productoId, setProductoId] = useState("");

    useEffect(() => {
        get("/productos").then(setProductos).catch(() => {});
    }, []);

    const cargar = (id: string) => {
        setProductoId(id);
        if (!id) { setHistorial([]); return; }
        get(`/precios-diarios/historial/${id}`).then(setHistorial).catch(() => {});
    };

    return (
        <>
            <div className="header" style={{ marginBottom: 16 }}>
                <span className="header-back" onClick={() => navigate("/")}>←</span>
                <h1>Historial de Precios</h1>
            </div>
            <div className="page">

            <select value={productoId} onChange={e => cargar(e.target.value)}
                style={{ width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 14, marginBottom: 16 }}>
                <option value="">Seleccionar producto</option>
                {productos.map((p: any) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>

            {productoId && (
                <div style={{ background: "#fff", borderRadius: 10, padding: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
                    {historial.length === 0 ? (
                        <p style={{ color: "#888", fontSize: 12 }}>Sin historial</p>
                    ) : (
                        historial.slice().reverse().map((h: any, i: number) => {
                            const prev = historial.slice().reverse()[i - 1];
                            const diff = prev ? parseFloat(h.precio_kg) - parseFloat(prev.precio_kg) : 0;
                            return (
                                <div key={h.fecha} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid #f0f0f0", fontSize: 12 }}>
                                    <span style={{ color: "#888" }}>{h.fecha}</span>
                                    <span>
                                        <strong>${parseFloat(h.precio_kg).toFixed(2)}</strong>
                                        {diff !== 0 && (
                                            <span style={{ color: diff > 0 ? "#d32f2f" : "#1a8a3a", marginLeft: 4 }}>
                                                {diff > 0 ? "▲" : "▼"} ${Math.abs(diff).toFixed(2)}
                                            </span>
                                        )}
                                    </span>
                                </div>
                            );
                        })
                    )}
                    {historial.length > 0 && (
                        <div style={{ marginTop: 8, fontSize: 11, color: "#888", paddingTop: 8, borderTop: "1px solid #eee" }}>
                            Base: <strong>${parseFloat(historial[0]?.precio_base_kg || 0).toFixed(2)}</strong>/kg
                        </div>
                    )}
                </div>
            )}
        </div></>
    );
}
