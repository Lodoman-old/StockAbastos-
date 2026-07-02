import { money } from "../format";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { get, post } from "../services/api";

export function CorteDeCaja() {
    const navigate = useNavigate();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [msg, setMsg] = useState("");
    useEffect(() => { if (msg) { const t = setTimeout(() => setMsg(""), 5000); return () => clearTimeout(t); } }, [msg]);
    const [montoApertura, setMontoApertura] = useState("0");
    const [showRetiro, setShowRetiro] = useState(false);
    const [montoRetiro, setMontoRetiro] = useState("");
    const [motivoRetiro, setMotivoRetiro] = useState("");

    const load = () => {
        setLoading(true);
        get("/cortes/hoy").then(setData).catch(() => {}).finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, []);

    const abrir = async () => {
        setMsg("Abriendo caja...");
        try {
            await post("/cortes/abrir", { monto_inicial: parseFloat(montoApertura) || 0 });
            setMsg("Caja abierta");
            load();
        } catch (e: any) {
            setMsg("Error: " + (e.message || "Desconocido"));
        }
    };

    const cerrar = async () => {
        if (!confirm("¿Cerrar el día? No podrás registrar más ventas para hoy.")) return;
        setMsg("Cerrando...");
        try {
            await post("/cortes/cerrar", {});
            setMsg("Corte cerrado");
            load();
        } catch (e: any) {
            setMsg("Error: " + (e.message || "Desconocido"));
        }
    };

    const retirar = async () => {
        const m = parseFloat(montoRetiro);
        if (!m || m <= 0) { setMsg("Ingresa un monto válido"); return; }
        if (!confirm(`¿Retirar $${money(m)} de la caja?${motivoRetiro ? ` (${motivoRetiro})` : ""}`)) return;
        setMsg("Registrando retiro...");
        try {
            await post("/cortes/retiro", { monto: m, motivo: motivoRetiro });
            setMsg(`Retiro de $${money(m)} registrado`);
            setShowRetiro(false);
            setMontoRetiro("");
            setMotivoRetiro("");
            load();
        } catch (e: any) {
            setMsg("Error: " + (e.message || "Desconocido"));
        }
    };

    if (loading) return <p style={{ color: "#888", textAlign: "center" }}>Cargando...</p>;

    const card: React.CSSProperties = {
        background: "#fff", borderRadius: 10, padding: 14, boxShadow: "0 1px 3px rgba(0,0,0,0.08)", marginBottom: 10,
    };

    return (
        <>
            <div className="header" style={{ marginBottom: 16 }}>
                <span className="header-back" onClick={() => navigate("/")}>←</span>
                <h1>Corte de Caja</h1>
            </div>
            <div className="page">
            <div style={{ textAlign: "center", marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: "#888" }}>{new Date().toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</div>
            </div>

            {!data?.abierto && !data?.ya_cerrado && (
                <div style={{ background: "#fff8e1", border: "1px solid #ffe082", borderRadius: 12, padding: 16, marginBottom: 12 }}>
                    <h4 style={{ margin: "0 0 6px", fontSize: 13 }}>Abrir caja</h4>
                    <p style={{ fontSize: 12, color: "#666", marginBottom: 8 }}>Registra el monto inicial para poder realizar ventas.</p>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                        <input type="number" step="0.01" min="0" value={montoApertura}
                            onChange={e => setMontoApertura(e.target.value)}
                            style={{ flex: 1, minWidth: 100, padding: "8px 10px", border: "1px solid #ddd", borderRadius: 8, fontSize: 13 }} />
                        <button onClick={abrir}
                            style={{ padding: "8px 16px", background: "#ff9800", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: "bold" }}>
                            Abrir
                        </button>
            </div>

            {data?.abierto && !data?.ya_cerrado && (
                <div style={{ marginBottom: 12 }}>
                    <button onClick={() => setShowRetiro(true)}
                        style={{ width: "100%", padding: 10, background: "#fff3e0", color: "#e65100", border: "1px solid #ffcc80", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: "bold" }}>
                        Retirar efectivo
                    </button>
                </div>
            )}

            {showRetiro && (
                <div style={{ background: "#fff8e1", border: "1px solid #ffe082", borderRadius: 12, padding: 16, marginBottom: 12 }}>
                    <h4 style={{ margin: "0 0 6px", fontSize: 13 }}>Retirar efectivo</h4>
                    <input type="number" step="0.01" min="0" placeholder="Monto a retirar" value={montoRetiro}
                        onChange={e => setMontoRetiro(e.target.value)}
                        style={{ width: "100%", padding: "8px 10px", border: "1px solid #ddd", borderRadius: 8, fontSize: 13, marginBottom: 6, boxSizing: "border-box" }} />
                    <input type="text" placeholder="Motivo (opcional)" value={motivoRetiro}
                        onChange={e => setMotivoRetiro(e.target.value)}
                        style={{ width: "100%", padding: "8px 10px", border: "1px solid #ddd", borderRadius: 8, fontSize: 13, marginBottom: 8, boxSizing: "border-box" }} />
                    <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={retirar}
                            style={{ flex: 1, padding: "8px 16px", background: "#e65100", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: "bold" }}>
                            Retirar
                        </button>
                        <button onClick={() => { setShowRetiro(false); setMontoRetiro(""); setMotivoRetiro(""); }}
                            style={{ padding: "8px 16px", background: "#ccc", color: "#333", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>
                            Cancelar
                        </button>
                    </div>
                </div>
            )}
                </div>
            )}

            {data?.ya_cerrado && (
                <div style={{ background: "#e8f5e9", color: "#1a8a3a", padding: 10, borderRadius: 8, marginBottom: 12, fontSize: 12, textAlign: "center" }}>
                    Día cerrado {data.corte ? `a las ${new Date(data.corte.cerrado_at).toLocaleTimeString()}` : ""}
                </div>
            )}

            {data?.abierto && (
                <div style={{ background: "#e3f2fd", color: "#1565c0", padding: 10, borderRadius: 8, marginBottom: 12, fontSize: 12, textAlign: "center" }}>
                    Caja abierta {data.corte?.abierto_at ? `a las ${new Date(data.corte.abierto_at).toLocaleTimeString()}` : ""}
                    {data.monto_inicial > 0 && <span> — Monto inicial: ${data.monto_inicial.toFixed(2)}</span>}
                </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                <div style={{ ...card, textAlign: "center" }}>
                    <div style={{ fontSize: 10, color: "#888", textTransform: "uppercase" }}>Ventas</div>
                    <div style={{ fontSize: 22, fontWeight: "bold", color: "#1a8a3a" }}>{data?.total_ventas || 0}</div>
                </div>
                <div style={{ ...card, textAlign: "center" }}>
                    <div style={{ fontSize: 10, color: "#888", textTransform: "uppercase" }}>Ingresos</div>
                    <div style={{ fontSize: 22, fontWeight: "bold", color: "#1a8a3a" }}>${(data?.total_ingresos || 0).toFixed(2)}</div>
                </div>
                <div style={{ ...card, textAlign: "center" }}>
                    <div style={{ fontSize: 10, color: "#888", textTransform: "uppercase" }}>Kg</div>
                    <div style={{ fontSize: 22, fontWeight: "bold", color: "#1976d2" }}>{(data?.total_kg || 0).toFixed(1)}</div>
                </div>
                <div style={{ ...card, textAlign: "center" }}>
                    <div style={{ fontSize: 10, color: "#888", textTransform: "uppercase" }}>Gastos</div>
                    <div style={{ fontSize: 22, fontWeight: "bold", color: "#d32f2f" }}>${(data?.total_gastos || 0).toFixed(2)}</div>
                </div>
            </div>

            <div style={card}>
                <h4 style={{ margin: "0 0 8px", fontSize: 13 }}>Desglose</h4>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 12 }}>
                    <span style={{ color: "#4caf50", fontWeight: "bold" }}>Contado</span>
                    <span>{data?.ventas_contado || 0} ventas — ${(data?.total_contado || 0).toFixed(2)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 12 }}>
                    <span style={{ color: "#ff9800", fontWeight: "bold" }}>Crédito</span>
                    <span>{data?.ventas_credito || 0} ventas — ${(data?.total_credito || 0).toFixed(2)}</span>
                </div>
            </div>

            <div style={card}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 12 }}>
                    <span>Ingresos</span><span>${(data?.total_ingresos || 0).toFixed(2)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 12 }}>
                    <span>Gastos</span><span style={{ color: "#d32f2f" }}>- ${(data?.total_gastos || 0).toFixed(2)}</span>
                </div>
                {(data?.total_retiros || 0) > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 12 }}>
                        <span>Retiros</span><span style={{ color: "#e65100" }}>- ${(data?.total_retiros || 0).toFixed(2)}</span>
                    </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", marginTop: 4, borderTop: "2px solid #333", fontSize: 15, fontWeight: "bold" }}>
                    <span>Saldo final</span>
                    <span style={{ color: (data?.saldo_final || 0) >= 0 ? "#1a8a3a" : "#d32f2f" }}>${(data?.saldo_final || 0).toFixed(2)}</span>
                </div>
            </div>

            {!data?.ya_cerrado && (
                <button onClick={cerrar}
                    style={{ width: "100%", padding: 12, background: "#1a8a3a", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: "bold" }}>
                    Cerrar día
                </button>
            )}

            {msg && (
                <div style={{
                    padding: 8, borderRadius: 8, fontSize: 12, marginTop: 8, textAlign: "center",
                    background: msg.includes("Error") ? "#fef2f2" : "#e8f5e9",
                    color: msg.includes("Error") ? "#dc2626" : "#1a8a3a",
                }}>
                    {msg}
                </div>
            )}
        </div></>
    );
}

