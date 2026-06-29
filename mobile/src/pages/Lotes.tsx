import React, { useEffect, useState } from "react";
import { get } from "../services/api";

export function Lotes() {
    const [lotes, setLotes] = useState<any[]>([]);
    const [error, setError] = useState("");

    useEffect(() => {
        get("/lotes").then(setLotes).catch((e) => setError(e.message));
    }, []);

    if (error) return <p style={{ color: "#f44336" }}>Error: {error}</p>;

    if (lotes.length === 0) return <p style={{ color: "#888" }}>Sin lotes activos</p>;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {lotes.map((l: any) => (
                <div key={l.id} style={{
                    background: "#fff", borderRadius: 10, padding: 12,
                    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <strong>{l.codigo_lote}</strong>
                        <span style={{
                            fontSize: 11, padding: "2px 8px", borderRadius: 4,
                            background: l.estado === "ACTIVO" || l.estado === "DISPONIBLE" ? "#e8f5e9" : l.estado === "APARTADO" || l.estado === "RECIBIDO" ? "#fff3e0" : "#fce4ec",
                            color: l.estado === "ACTIVO" || l.estado === "DISPONIBLE" ? "#2e7d32" : l.estado === "APARTADO" || l.estado === "RECIBIDO" ? "#e65100" : "#c62828",
                        }}>{l.estado}</span>
                    </div>
                    <div style={{ fontSize: 13, color: "#555", marginTop: 4 }}>
                        {l.producto_nombre} · {parseFloat(l.cantidad_actual_kg).toFixed(1)} kg · {l.total_cajas || 0} cajas
                    </div>
                    <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
                        {l.bodega_nombre} · Cad: {new Date(l.fecha_caducidad).toLocaleDateString()}
                    </div>
                </div>
            ))}
        </div>
    );
}
