import React, { useEffect, useState } from "react";
import { get, post, API } from "../services/api";
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

export function RecepcionTarimas() {
    const [padres, setPadres] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [bodegaId, setBodegaId] = useState("");
    const [bodegas, setBodegas] = useState<any[]>([]);
    const [expandPadres, setExpandPadres] = useState<Record<string, boolean>>({});
    const [expandHijos, setExpandHijos] = useState<Record<string, boolean>>({});
    const [scanInput, setScanInput] = useState("");

    const load = () => {
        Promise.all([
            get("/tarimas/pendientes"),
            get("/bodegas"),
        ]).then(([pendientes, bodegas]) => {
            setBodegas(bodegas);

            const padresMap: Record<string, any> = {};
            for (const t of pendientes) {
                const padreId = t.lote_padre_id || t.lote_id;
                if (!padresMap[padreId]) {
                    padresMap[padreId] = {
                        padre_id: padreId,
                        padre_codigo: t.padre_codigo || t.codigo_lote,
                        hijos: {},
                    };
                }
                const hijoId = t.lote_id;
                if (!padresMap[padreId].hijos[hijoId]) {
                    padresMap[padreId].hijos[hijoId] = {
                        lote_id: hijoId,
                        codigo_lote: t.codigo_lote,
                        producto_nombre: t.producto_nombre,
                        tarimas: [],
                    };
                }
                padresMap[padreId].hijos[hijoId].tarimas.push(t);
            }
            const lista = Object.values(padresMap).map((p: any) => ({
                ...p,
                hijos: Object.values(p.hijos),
            }));
            setPadres(lista);
        }).catch(() => {}).finally(() => setLoading(false));
    };
    useEffect(() => { load(); }, []);

    const recibirTarima = async (codigoQr: string) => {
        try {
            const body: any = {};
            if (bodegaId) body.bodega_id = bodegaId;
            await post(`/tarimas/recibir/${codigoQr}`, body);
            notify("Tarima recibida", "success");
            load();
        } catch (e: any) {
            notify("Error: " + (e.message || "Desconocido"), "error");
        }
    };

    if (loading) return <p style={{ color: "#888" }}>Cargando...</p>;

    const card: React.CSSProperties = {
        background: "#fff", borderRadius: 12, padding: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.08)", marginBottom: 12,
    };

    return (
        <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
                <h1 style={{ margin: 0 }}>Recepción de Lotes</h1>
                <div className="btn-inline-group" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <select value={bodegaId} onChange={e => setBodegaId(e.target.value)}
                        style={{ padding: "8px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 13 }}>
                        <option value="">Bodega (opcional — usar lote)</option>
                        {bodegas.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
                    </select>
                </div>
            </div>

            <div className="scan-row" style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                <input value={scanInput} onChange={e => setScanInput(e.target.value)}
                    placeholder="Escanear o escribir código QR..."
                    style={{ flex: 1, padding: "10px 14px", fontSize: 15, border: "1px solid #1976d2", borderRadius: 8, fontFamily: "monospace" }} />
                <button onClick={async () => {
                    if (!scanInput) return notify("Escribe o escanea un código QR", "error");
                    await recibirTarima(scanInput.trim());
                    setScanInput("");
                }}
                    style={{ padding: "10px 20px", background: "#1976d2", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: "bold", whiteSpace: "nowrap" }}>
                    Recibir por QR
                </button>
            </div>

            {!padres.length && (
                <div style={{ ...card, textAlign: "center", color: "#888" }}>
                    No hay tarimas pendientes por recibir
                </div>
            )}

            {padres.map(padre => {
                const totalTarimas = padre.hijos.reduce((s: number, h: any) => s + h.tarimas.length, 0);
                const expandP = expandPadres[padre.padre_id];
                return (
                    <div key={padre.padre_id} style={{ ...card, borderLeft: `4px solid ${padre.padre_estado === "RECIBIDO" ? "#4caf50" : "#ff9800"}` }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
                            onClick={() => setExpandPadres(prev => ({ ...prev, [padre.padre_id]: !prev[padre.padre_id] }))}>
                            <div>
                                <div style={{ fontWeight: "bold", fontSize: 15 }}>{padre.padre_codigo}</div>
                                <div style={{ fontSize: 12, color: "#888" }}>
                                    {padre.proveedor_nombre || "Sin proveedor"} — {padre.hijos.length} lote(s) hijo(s) — {totalTarimas} tarima(s)
                                </div>
                            </div>
                            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                <button onClick={e => { e.stopPropagation(); openQrPrint(padre.padre_id); }}
                                    style={{ padding: "6px 14px", background: "#1976d2", color: "#fff", borderRadius: 6, fontSize: 12, fontWeight: "bold", border: "none", cursor: "pointer" }}>
                                    Imprimir QRs
                                </button>
                                <span style={{ fontSize: 12, color: "#999", transition: "transform 0.2s", transform: expandP ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
                            </div>
                        </div>

                        {expandP && (
                            <div style={{ marginTop: 12, borderTop: "1px solid #eee", paddingTop: 12 }}>
                                {padre.hijos.map((hijo: any) => {
                                    const expandH = expandHijos[hijo.lote_id];
                                    return (
                                        <div key={hijo.lote_id} style={{ ...card, marginBottom: 8, borderLeft: "3px solid #e0e0e0" }}>
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
                                                onClick={() => setExpandHijos(prev => ({ ...prev, [hijo.lote_id]: !prev[hijo.lote_id] }))}>
                                                <div>
                                                    <strong>{hijo.codigo_lote}</strong> — {hijo.producto_nombre}
                                                    <span style={{ marginLeft: 8, fontSize: 12, color: "#888" }}>({hijo.tarimas.length} tarima(s))</span>
                                                </div>
                                                <span style={{ fontSize: 11, color: "#999", transition: "transform 0.2s", transform: expandH ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
                                            </div>
                                            {expandH && (
                                                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginTop: 8 }}>
                                                    <thead>
                                                        <tr style={{ background: "#f9f9f9", textAlign: "left" }}>
                                                            <th style={{ padding: "6px 8px" }}>QR</th>
                                                            <th style={{ padding: "6px 8px" }}>Tipo</th>
                                                            <th style={{ padding: "6px 8px" }}>Núm</th>
                                                            <th style={{ padding: "6px 8px" }}>Bodega</th>
                                                            <th style={{ padding: "6px 8px" }}>Peso</th>
                                                            <th style={{ padding: "6px 8px" }}>Caducidad</th>
                                                            <th style={{ padding: "6px 8px" }}></th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {hijo.tarimas.map((t: any) => (
                                                            <tr key={t.id} style={{ borderTop: "1px solid #f0f0f0" }}>
                                                                <td style={{ padding: "6px 8px", fontFamily: "monospace", fontSize: 11 }}>{t.codigo_qr}</td>
                                                                <td style={{ padding: "6px 8px" }}>{t.tarima_tipo_nombre}</td>
                                                                <td style={{ padding: "6px 8px" }}>{t.numero_tarima}</td>
                                                                <td style={{ padding: "6px 8px", fontSize: 11 }}>{bodegas.find((b: any) => b.id === t.bodega_id)?.codigo || "-"}</td>
                                                                <td style={{ padding: "6px 8px" }}>{t.peso_kg ? `${t.peso_kg} kg` : "-"}</td>
                                                                <td style={{ padding: "6px 8px", fontSize: 11 }}>
                                                                    {t.fecha_caducidad ? new Date(t.fecha_caducidad).toLocaleDateString() : "-"}
                                                                </td>
                                                                <td style={{ padding: "6px 8px" }}>
                                                                    <button onClick={() => recibirTarima(t.codigo_qr)}
                                                                        style={{ padding: "4px 10px", background: "#4caf50", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 11 }}>
                                                                        Recibir
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
