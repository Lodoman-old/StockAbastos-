import React, { useEffect, useState } from "react";
import { get, put } from "../services/api";

export function PrestamoCajas() {
    const [prestamos, setPrestamos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [msg, setMsg] = useState("");

    const load = () => {
        setLoading(true);
        get("/prestamo-cajas").then(setPrestamos).catch(() => {}).finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, []);

    const devolver = async (id: string, max: number) => {
        const cant = prompt(`¿Cuántas cajas devuelve? (máx ${max})`, String(max));
        if (!cant) return;
        const n = parseInt(cant);
        if (n < 1 || n > max) { setMsg("Cantidad inválida"); return; }
        setMsg("Registrando...");
        try {
            await put(`/prestamo-cajas/${id}/devolver`, { cajas_devueltas: n });
            setMsg(`Devueltas: ${n} cajas`);
            load();
        } catch (e: any) { setMsg("Error: " + (e.message || "")); }
    };

    if (loading) return <p style={{ color: "#888", textAlign: "center" }}>Cargando...</p>;

    return (
        <div>
            {msg && (
                <div style={{
                    padding: 8, borderRadius: 8, fontSize: 12, marginBottom: 12, textAlign: "center",
                    background: msg.includes("Error") ? "#fef2f2" : "#e8f5e9",
                    color: msg.includes("Error") ? "#dc2626" : "#1a8a3a",
                }}>
                    {msg}
                </div>
            )}

            {prestamos.length === 0 && (
                <p style={{ textAlign: "center", color: "#888", fontSize: 13 }}>Sin préstamos pendientes</p>
            )}

            {prestamos.map((p: any) => (
                <div key={p.id} style={{
                    background: "#fff", borderRadius: 10, padding: 14, marginBottom: 10,
                    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                    borderLeft: `4px solid ${p.pendientes > 0 ? "#ff9800" : "#4caf50"}`,
                }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <div>
                            <strong>{p.cliente_nombre || "Sin cliente"}</strong>
                            <span style={{ fontSize: 11, color: "#888", marginLeft: 6 }}>{p.folio}</span>
                        </div>
                        <button onClick={() => devolver(p.id, p.pendientes)}
                            style={{ padding: "5px 10px", background: "#ff9800", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: "bold" }}>
                            Devolver
                        </button>
                    </div>
                    <div style={{ display: "flex", gap: 16, fontSize: 12 }}>
                        <span>Prestadas: <strong>{p.cantidad_cajas}</strong></span>
                        <span>Devueltas: <strong>{p.cajas_devueltas}</strong></span>
                        <span style={{ color: p.pendientes > 0 ? "#ff9800" : "#4caf50" }}>Pendientes: <strong>{p.pendientes}</strong></span>
                    </div>
                    {p.producto_nombre && <div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>{p.producto_nombre}</div>}
                </div>
            ))}
        </div>
    );
}
