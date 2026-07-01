import React, { useEffect, useState } from "react";
import { get, post } from "../services/api";
import { notify } from "../components/Toast";

export function TraspasoTarimas() {
    const [bodegas, setBodegas] = useState<any[]>([]);
    const [padres, setPadres] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [bodegaDestino, setBodegaDestino] = useState("");
    const [expandPadres, setExpandPadres] = useState<Record<string, boolean>>({});
    const [tarimasPorHijo, setTarimasPorHijo] = useState<Record<string, any[]>>({});
    const [seleccion, setSeleccion] = useState<Record<string, boolean>>({});
    const [cajasTransferir, setCajasTransferir] = useState<Record<string, number>>({});
    const [traspasando, setTraspasando] = useState(false);

    const load = () => {
        setLoading(true);
        const expandedSnapshot = { ...expandPadres };
        Promise.all([
            get("/tarimas/resumen-lotes"),
            get("/bodegas"),
        ]).then(([l, b]) => {
            setPadres(l);
            setBodegas(b);
            for (const p of l) {
                if (expandedSnapshot[p.padre_id]) {
                    for (const hijo of (p.hijos || [])) {
                        get(`/tarimas/lote/${hijo.lote_id}`).then(tarimas => {
                            setTarimasPorHijo(prev => ({ ...prev, [hijo.lote_id]: tarimas }));
                        }).catch(() => {});
                    }
                }
            }
        }).catch(() => {}).finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, []);

    const togglePadre = async (padreId: string, hijos: any[]) => {
        const expanded = !expandPadres[padreId];
        setExpandPadres(prev => ({ ...prev, [padreId]: expanded }));
        if (expanded) {
            for (const hijo of hijos) {
                if (!tarimasPorHijo[hijo.lote_id]) {
                    try {
                        const tarimas = await get(`/tarimas/lote/${hijo.lote_id}`);
                        setTarimasPorHijo(prev => ({ ...prev, [hijo.lote_id]: tarimas }));
                    } catch {}
                }
            }
        }
    };

    const toggleSeleccion = (id: string, restantes: number) => {
        setSeleccion(prev => ({ ...prev, [id]: !prev[id] }));
        if (!seleccion[id]) {
            setCajasTransferir(prev => ({ ...prev, [id]: restantes }));
        } else {
            setCajasTransferir(prev => { const n = { ...prev }; delete n[id]; return n; });
        }
    };

    const seleccionarHijo = (loteId: string) => {
        const tarimas = tarimasPorHijo[loteId] || [];
        const disponibles = tarimas.filter(t => t.estado === "RECIBIDA" && !t.bodega_destino_id);
        const todasSel = disponibles.length > 0 && disponibles.every(t => seleccion[t.id]);
        setSeleccion(prev => {
            const n = { ...prev };
            for (const t of disponibles) {
                if (!todasSel) n[t.id] = true;
                else delete n[t.id];
            }
            return n;
        });
        setCajasTransferir(prev => {
            const n = { ...prev };
            for (const t of disponibles) {
                if (!todasSel) n[t.id] = parseFloat(t.cajas_restantes);
                else delete n[t.id];
            }
            return n;
        });
    };

    const seleccionarTodas = () => {
        const todas: any[] = [];
        for (const tarimas of Object.values(tarimasPorHijo)) {
            for (const t of tarimas) {
                if (t.estado === "RECIBIDA") todas.push(t);
            }
        }
        const todasSel = todas.length > 0 && todas.every(t => seleccion[t.id]);
        setSeleccion(prev => {
            const n = { ...prev };
            for (const t of todas) {
                if (!todasSel) n[t.id] = true;
                else delete n[t.id];
            }
            return n;
        });
        setCajasTransferir(prev => {
            const n = { ...prev };
            for (const t of todas) {
                if (!todasSel) n[t.id] = parseFloat(t.cajas_restantes);
                else delete n[t.id];
            }
            return n;
        });
    };

    const seleccionadas = Object.entries(seleccion).filter(([, v]) => v).length;

    const traspasarSeleccion = async () => {
        const entries = Object.entries(seleccion).filter(([, v]) => v);
        if (!entries.length) { notify("Selecciona al menos una tarima", "error"); return; }
        if (!bodegaDestino) { notify("Selecciona una bodega destino", "error"); return; }

        setTraspasando(true);
        let completas = 0;
        let parciales = 0;
        let errores = 0;
        const idsCompletas: string[] = [];

        try {
            for (const [id] of entries) {
                const cajas = cajasTransferir[id];
                const tarima = tarimasPorHijo[Object.keys(tarimasPorHijo).find(k => tarimasPorHijo[k].some(t => t.id === id)) || ""]?.find(t => t.id === id);
                const restantes = tarima ? parseFloat(tarima.cajas_restantes) : 0;

                if (!cajas || cajas <= 0) continue;

                if (cajas >= restantes) {
                    idsCompletas.push(id);
                } else {
                    try {
                        await post("/tarimas/partir", { tarima_id: id, cajas, bodega_destino_id: bodegaDestino });
                        parciales++;
                    } catch (e: any) {
                        errores++;
                        notify(`Error al partir tarima ${tarima?.codigo_qr || id}: ${e.message}`, "error");
                    }
                }
            }

            if (idsCompletas.length > 0) {
                try {
                    const res = await post("/tarimas/traspasar", { tarima_ids: idsCompletas, bodega_destino_id: bodegaDestino });
                    completas = res.asignadas || 0;
                    if (res.saltadas?.length) {
                        notify(`${res.saltadas.length} tarima(s) ya estaban en la bodega destino (se omitieron)`, "info");
                    }
                } catch (e: any) {
                    if (e.saltadas?.length) {
                        notify(`${e.saltadas.length} tarima(s) ya estaban en la bodega destino`, "info");
                    } else {
                        notify("Error: " + (e.message || "Error"), "error");
                    }
                }
            }

            let msg = "";
            if (completas > 0) msg += `${completas} tarima(s) completas asignadas. `;
            if (parciales > 0) msg += `${parciales} tarima(s) partidas. `;
            if (errores > 0) msg += `${errores} error(es). `;
            if (msg) notify(msg.trim(), completas + parciales > 0 ? "success" : "error");

            setSeleccion({});
            setCajasTransferir({});
            setTarimasPorHijo({});
            load();
        } catch (e: any) {
            notify("Error: " + (e.message || "Error"), "error");
        }
        setTraspasando(false);
    };

    const cardStyle: React.CSSProperties = {
        background: "#fff", borderRadius: 12, padding: 16, marginBottom: 12,
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    };
    const inputBase: React.CSSProperties = {
        padding: "8px 12px", borderRadius: 8, border: "1px solid #ddd", fontSize: 14,
    };

    if (loading) return <div style={{ padding: 20, color: "#888" }}>Cargando...</div>;

    return (
        <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
                <h1 style={{ margin: 0 }}>Traspaso de Tarimas</h1>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <select value={bodegaDestino} onChange={e => setBodegaDestino(e.target.value)}
                        style={{ ...inputBase, borderColor: seleccionadas && !bodegaDestino ? "#dc2626" : "#ddd" }}>
                        <option value="">-- Selecciona bodega destino --</option>
                        {bodegas.filter((b: any) => b.activa !== false).map((b: any) => (
                            <option key={b.id} value={b.id}>{b.codigo} - {b.nombre}</option>
                        ))}
                    </select>
                    {seleccionadas > 0 && !bodegaDestino && (
                        <span style={{ color: "#dc2626", fontSize: 12, fontWeight: "bold" }}>Selecciona un destino</span>
                    )}
                    <button onClick={traspasarSeleccion} disabled={traspasando || !bodegaDestino || !seleccionadas}
                        style={{ padding: "8px 16px", background: traspasando || !bodegaDestino || !seleccionadas ? "#ccc" : "#e65100", color: "#fff", border: "none", borderRadius: 8, cursor: traspasando || !bodegaDestino || !seleccionadas ? "not-allowed" : "pointer", fontSize: 14, fontWeight: "bold", whiteSpace: "nowrap" }}>
                        {traspasando ? "Asignando..." : `Asignar (${seleccionadas}) →`}
                    </button>
                </div>
            </div>

            {padres.length === 0 && (
                <div style={{ color: "#888", padding: 20, textAlign: "center" }}>
                    No hay lotes con tarimas disponibles para traspasar.
                </div>
            )}

            {padres.map(padre => {
                const expandP = expandPadres[padre.padre_id];
                const hijosRecibidas = padre.hijos.map((h: any) => Number(h.recibidas));
                const totalRecibidas = hijosRecibidas.reduce((s: number, v: number) => s + v, 0);
                const recibidasStr = hijosRecibidas.filter((v: number) => v > 0).join("-");
                const totalAsignadas = padre.hijos.reduce((s: number, h: any) => s + Number(h.asignadas || 0), 0);
                const totalEnTransito = padre.hijos.reduce((s: number, h: any) => s + Number(h.en_transito || 0), 0);
                const selPadre = Object.keys(seleccion).filter(k => seleccion[k]);
                const selEnPadre = padre.hijos.reduce((s: number, h: any) => {
                    const tarimas = tarimasPorHijo[h.lote_id] || [];
                    return s + tarimas.filter((t: any) => seleccion[t.id]).length;
                }, 0);
                return (
                    <div key={padre.padre_id} style={{ ...cardStyle, borderLeft: `4px solid ${padre.padre_estado === "RECIBIDO" ? "#4caf50" : "#ff9800"}` }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
                            onClick={() => togglePadre(padre.padre_id, padre.hijos)}>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: "bold", fontSize: 15 }}>{padre.padre_codigo}</div>
                                <div style={{ fontSize: 12, color: "#888" }}>{padre.proveedor_nombre || "Sin proveedor"}</div>
                                <div style={{ fontSize: 12, marginTop: 4, display: "flex", gap: 12, flexWrap: "wrap" }}>
                                    <span>Hijos: {padre.hijos.length}</span>
                                    {recibidasStr && <span style={{ color: "#4caf50", fontFamily: "monospace" }}>{recibidasStr}</span>}
                                    {totalRecibidas > 0 && <span style={{ color: "#888" }}>Total: {totalRecibidas}</span>}
                                    {totalAsignadas > 0 && <span style={{ color: "#f57f17" }}>Asig: {totalAsignadas}</span>}
                                    {totalEnTransito > 0 && <span style={{ color: "#1565c0" }}>Tráns: {totalEnTransito}</span>}
                                    {selEnPadre > 0 && <span style={{ color: "#1565c0", fontWeight: "bold" }}>Sel: {selEnPadre}</span>}
                                </div>
                            </div>
                            <span style={{ fontSize: 12, color: "#999", transition: "transform 0.2s", transform: expandP ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
                        </div>

                        {expandP && (
                            <div style={{ marginTop: 12, borderTop: "1px solid #eee", paddingTop: 12 }}>
                                {totalRecibidas > 0 && (
                                    <div style={{ marginBottom: 8 }}>
                                        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
                                            <input type="checkbox" onChange={seleccionarTodas}
                                                checked={false /* indeterminate state is complex, skip */} />
                                            <strong>Seleccionar todas las RECIBIDA de esta compra</strong>
                                        </label>
                                    </div>
                                )}
                                                    {padre.hijos.map((hijo: any) => {
                                                                        const tarimas = tarimasPorHijo[hijo.lote_id] || [];
                                                                        const recibidas = tarimas.filter((t: any) => t.estado === "RECIBIDA" || t.estado === "PARCIAL");
                                                                        const disponibles = recibidas.filter((t: any) => !t.bodega_destino_id);
                                                                        const parciales = tarimas.filter((t: any) => t.estado === "PARCIAL" && !t.bodega_destino_id);
                                    return (
                                        <div key={hijo.lote_id} style={{
                                            marginBottom: 10, padding: 12, border: "1px solid #e0e0e0", borderRadius: 8,
                                            background: hijo.recibidas > 0 ? "#fafff5" : undefined,
                                        }}>
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                                                <div style={{ flex: 1 }}>
                                                    <strong>{hijo.codigo_lote}</strong>
                                                    {hijo.producto_nombre && <span style={{ marginLeft: 8, color: "#555" }}>— {hijo.producto_nombre}</span>}
                                                    <span style={{ marginLeft: 8, fontSize: 12, color: "#888" }}>
                                                        (P: {hijo.pendientes} | R: {hijo.recibidas}{hijo.parcial > 0 ? ` | Par: ${hijo.parcial}` : ""}{hijo.asignadas > 0 ? ` | A: ${hijo.asignadas}` : ""}{hijo.en_transito > 0 ? ` | T: ${hijo.en_transito}` : ""})
                                                    </span>
                                                </div>
                                                                        {recibidas.length > 0 && (
                                                                                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                                                                        {parciales.length > 0 && (
                                                                                            <span style={{ fontSize: 11, color: "#9c27b0", fontWeight: "bold" }}>
                                                                                                {parciales.length} parcial(es)
                                                                                            </span>
                                                                                        )}
                                                                                        {hijo.asignadas > 0 && (
                                                                                            <span style={{ fontSize: 11, color: "#f57f17", fontWeight: "bold" }}>
                                                                                                {hijo.asignadas} asig.
                                                                                            </span>
                                                                                        )}
                                                                                        {hijo.en_transito > 0 && (
                                                                                            <span style={{ fontSize: 11, color: "#1565c0", fontWeight: "bold" }}>
                                                                                                {hijo.en_transito} tráns.
                                                                                            </span>
                                                                                        )}
                                                                                        {disponibles.some(t => seleccion[t.id]) && (
                                                                                            <span style={{ fontSize: 11, fontWeight: "bold", color: "#1565c0" }}>
                                                                                                {disponibles.every(t => seleccion[t.id]) ? "Todas" : `${disponibles.filter(t => seleccion[t.id]).length} sel.`}
                                                                                            </span>
                                                                                        )}
                                                                                        <button onClick={() => seleccionarHijo(hijo.lote_id)}
                                                                                            style={{ padding: "3px 8px", background: "#f0f2f5", border: "1px solid #ddd", borderRadius: 4, cursor: "pointer", fontSize: 11, whiteSpace: "nowrap" }}>
                                                                                            {disponibles.every(t => seleccion[t.id]) ? "Desmarcar" : `Sel. ${disponibles.length} disponibles`}
                                                                                        </button>
                                                                                    </div>
                                                                                )}
                                            </div>
                                            {tarimas.length > 0 ? (
                                                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                                                    <thead>
                                                        <tr style={{ background: "#f9f9f9", textAlign: "left" }}>
                                                            <th style={{ padding: "4px 6px", width: 32 }}></th>
                                                            <th style={{ padding: "4px 6px" }}>QR</th>
                                                            <th style={{ padding: "4px 6px" }}>Tipo</th>
                                                            <th style={{ padding: "4px 6px" }}>Núm</th>
                                                            <th style={{ padding: "4px 6px" }}>Cajas</th>
                                                            <th style={{ padding: "4px 6px" }}>Transferir</th>
                                                            <th style={{ padding: "4px 6px" }}>Estado</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {tarimas.map((t: any) => {
                                                            const puede = (t.estado === "RECIBIDA" || t.estado === "PARCIAL") && !t.bodega_destino_id;
                                                            const asignada = (t.estado === "RECIBIDA" || t.estado === "PARCIAL") && t.bodega_destino_id;
                                                            const restantes = parseFloat(t.cajas_restantes);
                                                            return (
                                                                <tr key={t.id} style={{
                                                                    borderTop: "1px solid #f0f0f0",
                                                                    opacity: puede ? 1 : 0.5,
                                                                    background: seleccion[t.id] ? "#e3f2fd" : asignada ? "#fff8e1" : undefined,
                                                                }}>
                                                                    <td style={{ padding: "4px 6px" }}>
                                                                        {puede && <input type="checkbox" checked={!!seleccion[t.id]} onChange={() => toggleSeleccion(t.id, restantes)} />}
                                                                    </td>
                                                                    <td style={{ padding: "4px 6px", fontFamily: "monospace", fontSize: 10 }}>{t.codigo_qr}</td>
                                                                    <td style={{ padding: "4px 6px" }}>{t.tarima_tipo_nombre}</td>
                                                                    <td style={{ padding: "4px 6px" }}>{t.numero_tarima}</td>
                                                                        <td style={{ padding: "4px 6px", fontSize: 11 }}>
                                                                            {restantes}/{t.cajas_originales}
                                                                            {t.estado === "PARCIAL" && !t.bodega_destino_id && (
                                                                                <div style={{ fontSize: 10, color: "#9c27b0", marginTop: 1 }}>
                                                                                    {Number(t.cajas_originales) - restantes} ya transferidas
                                                                                </div>
                                                                            )}
                                                                        </td>
                                                                        <td style={{ padding: "4px 6px" }}>
                                                                        {puede && seleccion[t.id] ? (
                                                                            <input type="number" min={1} max={restantes} step="0.5"
                                                                                value={cajasTransferir[t.id] ?? restantes}
                                                                                onChange={e => setCajasTransferir(prev => ({ ...prev, [t.id]: parseFloat(e.target.value) || 1 }))}
                                                                                style={{ width: 60, padding: "2px 4px", fontSize: 11, border: "1px solid #bbb", borderRadius: 4, textAlign: "center" }}
                                                                            />
                                                                        ) : puede ? (
                                                                            <span style={{ color: "#aaa", fontSize: 11 }}>—</span>
                                                                        ) : (
                                                                            <span style={{ color: "#888", fontSize: 11 }}>—</span>
                                                                        )}
                                                                    </td>
                                                                    <td style={{ padding: "4px 6px" }}>
                                                                        {puede && seleccion[t.id] && cajasTransferir[t.id] != null && cajasTransferir[t.id] < restantes && (
                                                                            <span style={{
                                                                                display: "inline-block", padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: "bold",
                                                                                background: "#fff3e0", color: "#e65100",
                                                                            }}>
                                                                                Parcial
                                                                            </span>
                                                                        )}
                                                                        {asignada ? (
                                                                            <span style={{
                                                                                display: "inline-block", padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: "bold",
                                                                                background: "#fff8e1", color: "#f57f17",
                                                                            }}>
                                                                                Asignada → {t.bodega_destino_codigo || t.bodega_destino_nombre || "?"}
                                                                            </span>
                                                                        ) : !(puede && seleccion[t.id] && cajasTransferir[t.id] != null && cajasTransferir[t.id] < restantes) && (
                                                                            <span style={{
                                                                                display: "inline-block", padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: "bold",
                                                                                background: t.estado === "RECIBIDA" ? "#e8f5e9" : t.estado === "PARCIAL" ? "#f3e5f5" : t.estado === "PENDIENTE" ? "#fff3e0" : t.estado === "EN_TRANSITO" ? "#e3f2fd" : "#f5f5f5",
                                                                                color: t.estado === "RECIBIDA" ? "#2e7d32" : t.estado === "PARCIAL" ? "#9c27b0" : t.estado === "PENDIENTE" ? "#e65100" : t.estado === "EN_TRANSITO" ? "#1565c0" : "#888",
                                                                            }}>
                                                                                {t.estado === "RECIBIDA" ? "Recibida" : t.estado === "PARCIAL" ? "Parcial" : t.estado === "PENDIENTE" ? "Pendiente" : t.estado === "EN_TRANSITO" ? "En tránsito" : t.estado}
                                                                            </span>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            ) : hijo.pendientes > 0 || hijo.recibidas > 0 ? (
                                                <div style={{ padding: 8, textAlign: "center", color: "#aaa", fontSize: 11 }}>Cargando tarimas...</div>
                                            ) : null}
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
