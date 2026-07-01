import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { get, post } from "../api";
import { notify } from "../components/Toast";

export function AdminTraspaso() {
    const navigate = useNavigate();
    const [bodegas, setBodegas] = useState<any[]>([]);
    const [bodegaOrigen, setBodegaOrigen] = useState("");
    const [bodegaDestino, setBodegaDestino] = useState("");
    const [padres, setPadres] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandPadres, setExpandPadres] = useState<Record<string, boolean>>({});
    const [tarimasPorHijo, setTarimasPorHijo] = useState<Record<string, any[]>>({});
    const [seleccion, setSeleccion] = useState<Record<string, boolean>>({});
    const [cajasTransferir, setCajasTransferir] = useState<Record<string, number>>({});
    const [traspasando, setTraspasando] = useState(false);
    const [error, setError] = useState("");

    const loadBodegas = () => {
        get("/bodegas").then(b => setBodegas(b)).catch(() => {});
    };

    useEffect(() => { loadBodegas(); }, []);

    const cambiarOrigen = (id: string) => {
        setBodegaOrigen(id);
        setBodegaDestino("");
        setSeleccion({});
        setCajasTransferir({});
        setTarimasPorHijo({});
        setExpandPadres({});
        setError("");
        if (!id) { setPadres([]); return; }
        setLoading(true);
        get(`/tarimas/resumen-lotes?bodega_id=${id}`).then(l => {
            setPadres(l);
        }).catch(e => setError(e.message)).finally(() => setLoading(false));
    };

    const togglePadre = async (padreId: string, hijos: any[]) => {
        const expanded = !expandPadres[padreId];
        setExpandPadres(prev => ({ ...prev, [padreId]: expanded }));
        if (expanded) {
            for (const hijo of hijos) {
                if (!tarimasPorHijo[hijo.lote_id]) {
                    try {
                        const tarimas = await get(`/tarimas/lote/${hijo.lote_id}?bodega_id=${bodegaOrigen}`);
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
        if (bodegaOrigen === bodegaDestino) { notify("La bodega destino no puede ser la misma que la de origen", "error"); return; }

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
            cambiarOrigen(bodegaOrigen);
        } catch (e: any) {
            notify("Error: " + (e.message || "Error"), "error");
        }
        setTraspasando(false);
    };

    const bodegasActivas = bodegas.filter((b: any) => b.activa !== false);

    return (
        <>
            <div className="header" style={{ marginBottom: 16 }}>
                <span className="header-back" onClick={() => navigate("/")}>←</span>
                <h1>Traspaso de Tarimas</h1>
            </div>
            <div className="page">

                <div className="card" style={{ marginBottom: 16 }}>
                    <div className="input-group">
                        <label>Bodega origen</label>
                        <select value={bodegaOrigen} onChange={e => cambiarOrigen(e.target.value)}
                            style={{ width: "100%", padding: 14, borderRadius: 10, border: `2px solid ${!bodegaOrigen ? "#dc2626" : "#ddd"}`,
                                fontSize: 16, background: "#fff", outline: "none" }}>
                            <option value="">-- Selecciona origen --</option>
                            {bodegasActivas.map((b: any) => (
                                <option key={b.id} value={b.id}>{b.codigo} - {b.nombre}</option>
                            ))}
                        </select>
                    </div>
                    <div className="input-group">
                        <label>Bodega destino</label>
                        <select value={bodegaDestino} onChange={e => setBodegaDestino(e.target.value)}
                            style={{ width: "100%", padding: 14, borderRadius: 10, border: `2px solid ${seleccionadas && !bodegaDestino ? "#dc2626" : "#ddd"}`,
                                fontSize: 16, background: "#fff", outline: "none" }}
                            disabled={!bodegaOrigen}>
                            <option value="">-- Selecciona destino --</option>
                            {bodegasActivas.filter((b: any) => b.id !== bodegaOrigen).map((b: any) => (
                                <option key={b.id} value={b.id}>{b.codigo} - {b.nombre}</option>
                            ))}
                        </select>
                    </div>
                    {bodegaOrigen && bodegaDestino && (
                        <div style={{ fontSize: 13, color: "#666", textAlign: "center", padding: "4px 0" }}>
                            {bodegasActivas.find((b: any) => b.id === bodegaOrigen)?.codigo} → {bodegasActivas.find((b: any) => b.id === bodegaDestino)?.codigo}
                        </div>
                    )}
                    <button onClick={traspasarSeleccion}
                        disabled={traspasando || !bodegaDestino || !seleccionadas}
                        className="btn btn-primary"
                        style={{ marginTop: 8, opacity: traspasando || !bodegaDestino || !seleccionadas ? 0.5 : 1 }}>
                        {traspasando ? "Asignando..." : `Asignar (${seleccionadas}) →`}
                    </button>
                </div>

                {error && (
                    <div style={{ padding: "12px 16px", borderRadius: 8, marginBottom: 12, background: "#fef2f2", color: "#dc2626", fontSize: 14 }}>
                        {error}
                    </div>
                )}

                {loading && <p style={{ color: "#888", textAlign: "center", padding: 20 }}>Cargando...</p>}

                {bodegaOrigen && !loading && padres.length === 0 && (
                    <div className="card" style={{ textAlign: "center", padding: 32 }}>
                        <p style={{ fontSize: 16, color: "#666" }}>No hay lotes disponibles en esta bodega.</p>
                    </div>
                )}

                {bodegaOrigen && !loading && padres.map(padre => {
                    const expandP = expandPadres[padre.padre_id];
                    const hijosRecibidas = padre.hijos.map((h: any) => Number(h.recibidas));
                    const totalRecibidas = hijosRecibidas.reduce((s: number, v: number) => s + v, 0);
                    const totalAsignadas = padre.hijos.reduce((s: number, h: any) => s + Number(h.asignadas || 0), 0);
                    const totalEnTransito = padre.hijos.reduce((s: number, h: any) => s + Number(h.en_transito || 0), 0);
                    const selEnPadre = padre.hijos.reduce((s: number, h: any) => {
                        const tarimas = tarimasPorHijo[h.lote_id] || [];
                        return s + tarimas.filter((t: any) => seleccion[t.id]).length;
                    }, 0);
                    return (
                        <div key={padre.padre_id} className="card"
                            style={{ borderLeft: `4px solid ${padre.padre_estado === "RECIBIDO" ? "#4caf50" : "#ff9800"}`, padding: 0, overflow: "hidden" }}>
                            <div style={{ padding: 14, cursor: "pointer" }}
                                onClick={() => togglePadre(padre.padre_id, padre.hijos)}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <div>
                                        <strong style={{ fontSize: 15 }}>{padre.padre_codigo}</strong>
                                        <div style={{ fontSize: 12, color: "#888" }}>{padre.proveedor_nombre || "Sin proveedor"}</div>
                                    </div>
                                    <span style={{ fontSize: 12, color: "#999", transition: "transform 0.2s", transform: expandP ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
                                </div>
                                <div style={{ fontSize: 12, marginTop: 6, display: "flex", gap: 12, flexWrap: "wrap" }}>
                                    <span>Hijos: {padre.hijos.length}</span>
                                    {totalRecibidas > 0 && <span style={{ color: "#4caf50" }}>Rec: {totalRecibidas}</span>}
                                    {totalAsignadas > 0 && <span style={{ color: "#f57f17" }}>Asig: {totalAsignadas}</span>}
                                    {totalEnTransito > 0 && <span style={{ color: "#1565c0" }}>Tráns: {totalEnTransito}</span>}
                                    {selEnPadre > 0 && <span style={{ color: "#1565c0", fontWeight: "bold" }}>Sel: {selEnPadre}</span>}
                                </div>
                            </div>

                            {expandP && (
                                <div style={{ borderTop: "1px solid #eee" }}>
                                    {totalRecibidas > 0 && (
                                        <label style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", fontSize: 13, cursor: "pointer", background: "#f9f9f9" }}>
                                            <input type="checkbox" onChange={seleccionarTodas} checked={false} />
                                            <strong>Seleccionar todas las RECIBIDA</strong>
                                        </label>
                                    )}
                                    {padre.hijos.map((hijo: any) => {
                                        const tarimas = tarimasPorHijo[hijo.lote_id] || [];
                                        const recibidas = tarimas.filter((t: any) => t.estado === "RECIBIDA" || t.estado === "PARCIAL");
                                        const disponibles = recibidas.filter((t: any) => !t.bodega_destino_id);
                                        const parciales = tarimas.filter((t: any) => t.estado === "PARCIAL" && !t.bodega_destino_id);
                                        const selHijo = disponibles.filter(t => seleccion[t.id]).length;
                                        return (
                                            <div key={hijo.lote_id} style={{ borderTop: "1px solid #f0f0f0", padding: 10 }}>
                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                                                    <div style={{ flex: 1, fontSize: 13 }}>
                                                        <strong>{hijo.codigo_lote}</strong>
                                                        {hijo.producto_nombre && <span style={{ color: "#555" }}> — {hijo.producto_nombre}</span>}
                                                        <span style={{ fontSize: 11, color: "#888", display: "block" }}>
                                                            P:{hijo.pendientes} R:{hijo.recibidas}{hijo.parcial > 0 ? ` Par:${hijo.parcial}` : ""}{hijo.asignadas > 0 ? ` A:${hijo.asignadas}` : ""}
                                                        </span>
                                                    </div>
                                                    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                                                        {parciales.length > 0 && (
                                                            <span style={{ fontSize: 11, color: "#9c27b0", fontWeight: "bold" }}>{parciales.length} Parc</span>
                                                        )}
                                                        {selHijo > 0 && <span style={{ fontSize: 11, color: "#1565c0", fontWeight: "bold" }}>{selHijo} sel</span>}
                                                        {disponibles.length > 0 && (
                                                            <button onClick={() => seleccionarHijo(hijo.lote_id)}
                                                                style={{ padding: "4px 8px", background: "#f0f2f5", border: "1px solid #ddd", borderRadius: 6, cursor: "pointer", fontSize: 11, whiteSpace: "nowrap" }}>
                                                                {disponibles.every(t => seleccion[t.id]) ? "Desm" : `${disponibles.length} disp`}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                {tarimas.length > 0 && disponibles.length > 0 && (
                                                    <div style={{ fontSize: 12 }}>
                                                        {tarimas.filter((t: any) => !t.bodega_destino_id && (t.estado === "RECIBIDA" || t.estado === "PARCIAL")).map((t: any) => {
                                                            const restantes = parseFloat(t.cajas_restantes);
                                                            return (
                                                                <div key={t.id} style={{
                                                                    display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderTop: "1px solid #f5f5f5",
                                                                    background: seleccion[t.id] ? "#e3f2fd" : undefined,
                                                                }}>
                                                                    <input type="checkbox" checked={!!seleccion[t.id]}
                                                                        onChange={() => toggleSeleccion(t.id, restantes)} />
                                                                    <span style={{ fontFamily: "monospace", fontSize: 10, flex: 1, wordBreak: "break-all" }}>{t.codigo_qr}</span>
                                                                    <span>{restantes}/{t.cajas_originales}</span>
                                                                    {t.estado === "PARCIAL" && (
                                                                        <span style={{ fontSize: 10, color: "#9c27b0" }}>Parcial</span>
                                                                    )}
                                                                    {seleccion[t.id] && (
                                                                        <input type="number" min={1} max={restantes} step="0.5"
                                                                            value={cajasTransferir[t.id] ?? restantes}
                                                                            onChange={e => setCajasTransferir(prev => ({ ...prev, [t.id]: parseFloat(e.target.value) || 1 }))}
                                                                            style={{ width: 60, padding: "4px", borderRadius: 6, border: "1px solid #bbb", textAlign: "center", fontSize: 12 }} />
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
                            )}
                        </div>
                    );
                })}
            </div>
        </>
    );
}
