import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { get, post, put } from "../services/api";

interface Traspaso {
    id: string; folio: string; bodega_origen: string; bodega_destino: string;
    estado: string; created_at: string; operario_id?: string;
}

export function Traspasos() {
    const navigate = useNavigate();
    const [traspasos, setTraspasos] = useState<Traspaso[]>([]);
    const [loading, setLoading] = useState(true);
    const [msg, setMsg] = useState("");

    const load = () => {
        setLoading(true);
        get("/traspasos").then(setTraspasos).catch(() => {}).finally(() => setLoading(false));
    };
    useEffect(() => { load(); }, []);

    const handleCargar = async (id: string) => {
        if (!confirm("¿Confirmar carga de todos los lotes de este traspaso?")) return;
        try {
            await post(`/traspasos/${id}/cargar`, {});
            setMsg("Carga confirmada, lotes en tránsito");
            load();
        } catch (err: any) { setMsg(err.message || "Error"); }
    };

    const handleRecibir = async (id: string) => {
        if (!confirm("¿Confirmar recepción de todos los lotes en destino?")) return;
        try {
            await post(`/traspasos/${id}/recibir`, {});
            setMsg("Recepción confirmada, inventario actualizado");
            load();
        } catch (err: any) { setMsg(err.message || "Error"); }
    };

    const estadoColor: Record<string, string> = {
        PENDIENTE: "#ff9800", EN_CURSO: "#2196f3", COMPLETADO: "#4caf50", CONFLICTO: "#f44336",
    };
    const estadoBg: Record<string, string> = {
        PENDIENTE: "#fff3e0", EN_CURSO: "#e3f2fd", COMPLETADO: "#e8f5e9", CONFLICTO: "#fef2f2",
    };

    const card: React.CSSProperties = { background: "#fff", borderRadius: 12, padding: 16, marginBottom: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" };

    return (
        <>
            <div className="header" style={{ marginBottom: 16 }}>
                <span className="header-back" onClick={() => navigate("/")}>←</span>
                <h1>Traspasos</h1>
            </div>
            <div className="page">

            {msg && (
                <div style={{ padding: "10px 14px", borderRadius: 8, marginBottom: 12, fontSize: 14, background: "#e8f5e9", color: "#2e7d32" }}>
                    {msg}
                </div>
            )}

            {loading ? (
                <p style={{ color: "#888" }}>Cargando...</p>
            ) : traspasos.length === 0 ? (
                <div style={{ ...card, textAlign: "center", padding: 32 }}>
                    <p style={{ fontSize: 16, color: "#666" }}>No hay traspasos</p>
                </div>
            ) : traspasos.map(t => (
                <div key={t.id} style={{ ...card, borderLeft: `4px solid ${estadoColor[t.estado] || "#ccc"}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                        <div style={{ flex: 1 }}>
                            <strong>{t.folio}</strong>
                            <p style={{ fontSize: 13, color: "#555", margin: "4px 0" }}>
                                {t.bodega_origen} → {t.bodega_destino}
                            </p>
                            <p style={{ fontSize: 11, color: "#999", margin: 0 }}>
                                {new Date(t.created_at).toLocaleDateString()}
                            </p>
                        </div>
                        <span style={{
                            padding: "3px 8px", borderRadius: 4, fontSize: 11, fontWeight: "bold", whiteSpace: "nowrap",
                            background: estadoBg[t.estado] || "#f5f5f5", color: estadoColor[t.estado] || "#666",
                        }}>
                            {t.estado}
                        </span>
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                        {t.estado === "PENDIENTE" && (
                            <button onClick={() => handleCargar(t.id)}
                                style={{ flex: 1, padding: "8px 12px", background: "#ff9800", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: "bold" }}>
                                Cargar
                            </button>
                        )}
                        {t.estado === "EN_CURSO" && (
                            <button onClick={() => handleRecibir(t.id)}
                                style={{ flex: 1, padding: "8px 12px", background: "#4caf50", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: "bold" }}>
                                Recibir en destino
                            </button>
                        )}
                    </div>
                </div>
            ))}
        </div></>
    );
}
