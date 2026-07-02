import { money } from "../format";
import React, { useEffect, useState } from "react";
import { get, put } from "../services/api";
export function PrestamoCajas() {
    const [prestamos, setPrestamos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [msg, setMsg] = useState("");
    useEffect(() => { if (msg) { const t = setTimeout(() => setMsg(""), 5000); return () => clearTimeout(t); } }, [msg]);

    const load = () => {
        setLoading(true);
        get("/prestamo-cajas").then(setPrestamos).catch(() => {}).finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, []);

    const devolver = async (id: string, max: number) => {
        const cant = prompt(`¿Cuántas cajas se devuelven? (máx ${max})`, String(max));
        if (!cant) return;
        const n = parseInt(cant);
        if (n < 1 || n > max) { setMsg("Cantidad inválida"); return; }
        setMsg("Registrando...");
        try {
            await put(`/prestamo-cajas/${id}/devolver`, { cajas_devueltas: n });
            setMsg(`Devolución registrada: ${n} cajas`);
            load();
        } catch (e: any) { setMsg("Error: " + (e.message || "Desconocido")); }
    };

    const styles = {
        pendiente: { background: "#fff3cd", color: "#856404" as const, padding: "10px 16px", borderRadius: 8, marginBottom: 16, fontSize: 14 },
        card: (p: any) => ({
            background: "#fff", borderRadius: 12, padding: 16, marginBottom: 12,
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
            borderLeft: `4px solid ${p.pendientes > 0 ? "#ff9800" : "#4caf50"}`,
        }),
        label: { fontSize: 11, color: "#888", textTransform: "uppercase" as const },
        value: { fontSize: 16, fontWeight: "bold" as const },
    };

    return (
        <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                <h2 style={{ margin: 0 }}>Préstamo de Cajas</h2>
                <button onClick={load} style={{ padding: "8px 16px", background: "#1a8a3a", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>
                    Recargar
                </button>
            </div>

            {loading && <p style={{ color: "#888" }}>Cargando...</p>}

            {msg && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: 8, borderRadius: 8, fontSize: 13, marginBottom: 12,
                    background: msg.includes("Error") ? "#fef2f2" : "#e8f5e9",
                    color: msg.includes("Error") ? "#dc2626" : "#1a8a3a",
                }}>
                    <button onClick={() => setMsg("")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "inherit", padding: 0, lineHeight: 1 }}>✕</button>
                    <span style={{ flex: 1 }}>{msg}</span>
                </div>
            )}

            {!loading && prestamos.length === 0 && (
                <div style={styles.pendiente}>
                    No hay préstamos de cajas pendientes. Las cajas se registran automáticamente al vender por caja.
                </div>
            )}

            {prestamos.map((p: any) => (
                <div key={p.id} style={styles.card(p)}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                        <div>
                            <strong style={{ fontSize: 15 }}>{p.cliente_nombre || "Sin cliente"}</strong>
                            <span style={{ fontSize: 12, color: "#888", marginLeft: 8 }}>Venta: {p.folio}</span>
                        </div>
                        <button onClick={() => devolver(p.id, p.pendientes)}
                            style={{ padding: "6px 12px", background: "#ff9800", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: "bold" }}>
                            Devolver
                        </button>
                    </div>
                    <div style={{ display: "flex", gap: 24 }}>
                        <div><div style={styles.label}>Producto</div><div style={styles.value}>{p.producto_nombre || "—"}</div></div>
                        <div><div style={styles.label}>Prestadas</div><div style={styles.value}>{p.cantidad_cajas}</div></div>
                        <div><div style={styles.label}>Devueltas</div><div style={styles.value}>{p.cajas_devueltas}</div></div>
                        <div><div style={styles.label}>Pendientes</div><div style={{ ...styles.value, color: p.pendientes > 0 ? "#ff9800" : "#4caf50" }}>{p.pendientes}</div></div>
                    </div>
                    <div style={{ fontSize: 11, color: "#999", marginTop: 8 }}>
                        {new Date(p.fecha_prestamo).toLocaleDateString()}
                        {p.deposito_por_caja > 0 && ` · Depósito: $${money(p.deposito_por_caja)}/caja`}
                    </div>
                </div>
            ))}
        </div>
    );
}


