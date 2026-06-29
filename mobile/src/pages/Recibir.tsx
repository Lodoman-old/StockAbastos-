import React, { useEffect, useState } from "react";
import { get, put } from "../services/api";

export function Recibir() {
    const [pendientes, setPendientes] = useState<any[]>([]);
    const [selected, setSelected] = useState<any>(null);
    const [kgReal, setKgReal] = useState("");
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState("");

    const load = () => get("/lotes/pendientes").then(setPendientes).catch(() => {});
    useEffect(() => { load(); }, []);

    const handleConfirm = async () => {
        if (!selected) return;
        setLoading(true);
        setMsg("");
        try {
            const body = kgReal ? { cantidad_real_kg: parseFloat(kgReal) } : {};
            await put(`/lotes/${selected}/confirmar`, body);
            setMsg("Recepción confirmada");
            setSelected(null);
            setKgReal("");
            load();
        } catch (err: any) {
            setMsg(err.message || "Error");
        }
        setLoading(false);
    };

    const getCardStyle = (): React.CSSProperties => ({
        background: "#fff",
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        borderLeft: "4px solid #ff9800",
    });

    const inputStyle: React.CSSProperties = {
        width: "100%",
        padding: "10px 12px",
        fontSize: 15,
        border: "1px solid #ddd",
        borderRadius: 8,
        boxSizing: "border-box",
        marginTop: 4,
    };

    const btnStyle: React.CSSProperties = {
        width: "100%", padding: 12, fontSize: 15, fontWeight: "bold",
        background: "#1a8a3a", color: "#fff", border: "none", borderRadius: 8,
        cursor: "pointer", marginTop: 12,
    };

    return (
        <div>
            <h2 style={{ marginBottom: 16 }}>Recepción de Mercancía</h2>

            {msg && (
                <div style={{
                    padding: "10px 14px", borderRadius: 8, marginBottom: 12, fontSize: 14,
                    background: msg === "Recepción confirmada" ? "#e8f5e9" : "#fef2f2",
                    color: msg === "Recepción confirmada" ? "#2e7d32" : "#dc2626",
                }}>
                    {msg}
                </div>
            )}

            {selected ? (
                <div style={getCardStyle()}>
                    <h3>Confirmar recepción</h3>
                    <p style={{ fontSize: 14, margin: "8px 0", color: "#555" }}>
                        {pendientes.find((l: any) => l.id === selected)?.codigo_lote}
                    </p>
                    <p style={{ fontSize: 14, margin: "4px 0", color: "#555" }}>
                        {pendientes.find((l: any) => l.id === selected)?.producto_nombre}
                    </p>
                    <p style={{ fontSize: 13, margin: "4px 0", color: "#888" }}>
                        Esperado: {parseFloat(pendientes.find((l: any) => l.id === selected)?.cantidad_recibida_kg || "0").toFixed(1)} kg
                    </p>
                    <div style={{ marginTop: 12 }}>
                        <label style={{ fontSize: 13, color: "#555", display: "block" }}>
                            Cantidad real recibida (kg) — <em style={{ color: "#999" }}>dejar vacío si coincide</em>
                        </label>
                        <input
                            type="number" step="0.1" placeholder={pendientes.find((l: any) => l.id === selected)?.cantidad_recibida_kg}
                            value={kgReal} onChange={e => setKgReal(e.target.value)}
                            style={inputStyle}
                        />
                    </div>
                    <button onClick={handleConfirm} disabled={loading} style={{
                        ...btnStyle, background: loading ? "#ccc" : "#1a8a3a",
                        cursor: loading ? "not-allowed" : "pointer",
                    }}>
                        {loading ? "Confirmando..." : "Confirmar Recepción"}
                    </button>
                    <button onClick={() => { setSelected(null); setKgReal(""); }}
                        style={{ ...btnStyle, background: "#888", marginTop: 8 }}>
                        Cancelar
                    </button>
                </div>
            ) : pendientes.length === 0 ? (
                <div style={{ ...getCardStyle(), borderLeftColor: "#4caf50", textAlign: "center", padding: 32 }}>
                    <p style={{ fontSize: 16, color: "#666" }}>No hay recepciones pendientes</p>
                </div>
            ) : (
                pendientes.map((l: any) => (
                    <div key={l.id} style={getCardStyle()} onClick={() => { setSelected(l.id); setKgReal(""); }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <div>
                                <strong>{l.codigo_lote}</strong>
                                <p style={{ fontSize: 14, margin: "4px 0" }}>{l.producto_nombre}</p>
                                <p style={{ fontSize: 12, color: "#666" }}>
                                    {l.proveedor_nombre || "Sin proveedor"} | {l.bodega_nombre}
                                </p>
                                <p style={{ fontSize: 12, color: "#666" }}>
                                    {parseFloat(l.cantidad_recibida_kg).toFixed(1)} kg esperados
                                </p>
                            </div>
                            <span style={{
                                padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: "bold",
                                background: "#fff3e0", color: "#e65100", whiteSpace: "nowrap",
                            }}>
                                RECIBIDO
                            </span>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
}
