import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { get, getApiUrl } from "../api";

const estadoColor: Record<string, string> = {
    PENDIENTE: "#ff9800", RECIBIDO: "#4caf50", DISPONIBLE: "#2196f3",
    TRASPASADO: "#9c27b0", APARTADO: "#607d8b", VENDIDO: "#333", MERMA: "#f44336",
};

export function Lotes() {
    const navigate = useNavigate();
    const [grupos, setGrupos] = useState<any[]>([]);
    const [error, setError] = useState("");
    const usuario = JSON.parse(localStorage.getItem("usuario") || "{}");
    const esAdmin = usuario.rol === "admin" || usuario.rol === "supervisor";
    const [expandidos, setExpandidos] = useState<Record<string, boolean>>({});

    useEffect(() => {
        get("/lotes").then((lotes: any[]) => {
            const padres = lotes.filter((x: any) => !x.lote_padre_id);
            const hijos = lotes.filter((x: any) => x.lote_padre_id);
            const hijosPorPadre: Record<string, any[]> = {};
            for (const h of hijos) {
                if (!hijosPorPadre[h.lote_padre_id]) hijosPorPadre[h.lote_padre_id] = [];
                hijosPorPadre[h.lote_padre_id].push(h);
            }
            setGrupos(padres.map((p: any) => ({
                ...p,
                hijos: hijosPorPadre[p.id] || [],
            })).filter((g: any) => g.hijos.length > 0));
        }).catch((e) => setError(e.message));
    }, []);

    if (error) return <><div className="header" style={{ marginBottom: 16 }}><span className="header-back" onClick={() => navigate("/")}>←</span><h1>Lotes</h1></div><div className="page"><p style={{ color: "#f44336" }}>Error: {error}</p></div></>;

    return (
        <>
            <div className="header" style={{ marginBottom: 16 }}>
                <span className="header-back" onClick={() => navigate("/")}>←</span>
                <h1>Lotes</h1>
            </div>
            <div className="page">
                {grupos.length === 0 ? (
                    <p style={{ color: "#888", textAlign: "center", marginTop: 40 }}>Sin lotes activos</p>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {grupos.map((g: any) => {
                            const expand = expandidos[g.id];
                            return (
                                <div key={g.id} style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
                                    <div onClick={() => setExpandidos(prev => ({ ...prev, [g.id]: !prev[g.id] }))}
                                        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 14, cursor: "pointer", borderLeft: `4px solid ${estadoColor[g.estado] || "#ccc"}` }}>
                                        <div>
                                            <strong style={{ fontSize: 14 }}>{g.codigo_lote}</strong>
                                            <span style={{ marginLeft: 8, padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: "bold", background: `${estadoColor[g.estado] || "#eee"}22`, color: estadoColor[g.estado] || "#888" }}>
                                                {g.estado}
                                            </span>
                                            <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
                                                {g.proveedor_nombre || "Sin proveedor"} · {g.hijos.length} producto(s) · {new Date(g.fecha_recepcion).toLocaleDateString()}
                                            </div>
                                        </div>
                                        <span style={{ fontSize: 12, color: "#999", transition: "transform 0.2s", transform: expand ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
                                    </div>
                                    {esAdmin && (
                                        <div style={{ padding: "0 14px 10px", display: "flex", gap: 8 }}>
                                            <button onClick={(e) => { e.stopPropagation(); const u = `${getApiUrl()}/api/tarimas/qr-lote/${g.id}`; if (u.includes("/api")) window.open(u, "_system") || window.open(u, "_blank") || (window.location.href = u); }}
                                                style={{ padding: "4px 10px", background: "#1565c0", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 11 }}>
                                                Imprimir QR
                                            </button>
                                        </div>
                                    )}
                                    {expand && (
                                        <div style={{ padding: "0 14px 14px", borderTop: "1px solid #eee" }}>
                                            {g.hijos.map((h: any) => (
                                                <div key={h.id} style={{ padding: "10px 0", borderBottom: "1px solid #f5f5f5" }}>
                                                    <div style={{ fontSize: 14, fontWeight: "bold" }}>{h.producto_nombre}</div>
                                                    <div style={{ fontSize: 12, color: "#555", marginTop: 4 }}>
                                                        <span>Código: {h.codigo_lote}</span>
                                                    </div>
                                                    <div style={{ fontSize: 12, color: "#555" }}>
                                                        <span>{parseFloat(h.cantidad_recibida_kg || 0).toFixed(1)} kg · {h.total_tarimas} tarima(s)</span>
                                                        <span style={{ marginLeft: 8, padding: "1px 6px", borderRadius: 4, fontSize: 11, background: `${estadoColor[h.estado] || "#eee"}22`, color: estadoColor[h.estado] || "#888" }}>
                                                            {h.estado}
                                                        </span>
                                                    </div>
                                                    <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
                                                        {h.bodega_nombre}{h.fecha_caducidad ? ` · Cad: ${new Date(h.fecha_caducidad).toLocaleDateString()}` : ""}
                                                    </div>
                                                    {esAdmin && parseInt(h.pendientes || 0) > 0 && (
                                                        <button onClick={() => { const u = `${getApiUrl()}/api/tarimas/qr-lote/${h.id}`; window.open(u, "_system") || window.open(u, "_blank") || (window.location.href = u); }}
                                                            style={{ marginTop: 6, padding: "4px 10px", background: "#1565c0", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 11 }}>
                                                            Imprimir QR
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </>
    );
}
