import { money } from "../format";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { get, post } from "../services/api";
import { useNetwork } from "../hooks/useNetwork";
import { getApiBase } from "../services/api.config";

export function Ventas() {
    const navigate = useNavigate();
    const isOnline = useNetwork();
    const [ventas, setVentas] = useState<any[]>([]);
    const [bodegas, setBodegas] = useState<any[]>([]);
    const [productos, setProductos] = useState<any[]>([]);
    const [showPOS, setShowPOS] = useState(false);
    const [bodegaId, setBodegaId] = useState("");
    const [items, setItems] = useState<any[]>([]);
    const [msg, setMsg] = useState("");
    const [ticketHtml, setTicketHtml] = useState<string | null>(null);
    const [pausedSales, setPausedSales] = useState<any[]>([]);
    const [selectedPausedId, setSelectedPausedId] = useState("");
    const [search, setSearch] = useState("");
    const [montoRecibido, setMontoRecibido] = useState("");
    const [cajaAbierta, setCajaAbierta] = useState<boolean | null>(null);
    const [montoApertura, setMontoApertura] = useState("0");
    const [showCobros, setShowCobros] = useState(false);
    const [creditosPendientes, setCreditosPendientes] = useState<any[]>([]);
    const [cobrosSearch, setCobrosSearch] = useState("");
    const [cobrosSel, setCobrosSel] = useState<any>(null);
    const [cobrosMonto, setCobrosMonto] = useState("");
    const [cobrosPagos, setCobrosPagos] = useState<any[]>([]);

    useEffect(() => {
        if (!isOnline) return;
        get("/ventas").then(setVentas).catch(() => {});
        get("/bodegas").then((b: any[]) => setBodegas(b.filter((x: any) => !x.es_mostrador))).catch(() => {});
        get("/cortes/esta-abierto").then(r => setCajaAbierta(r.abierto)).catch(() => setCajaAbierta(true));
    }, [isOnline]);

    async function abrirCaja() {
        try {
            await post("/cortes/abrir", { monto_inicial: parseFloat(montoApertura) || 0 });
            setCajaAbierta(true);
        } catch (e: any) {
            alert("Error al abrir caja: " + (e.message || "Desconocido"));
        }
    }

    function abrirPOS() {
        const filtradas = bodegas.filter((x: any) => !x.es_mostrador);
        const def = filtradas.find((x: any) => x.es_default) || filtradas[0];
        if (def) setBodegaId(def.id);
        get("/ventas/pausadas").then(setPausedSales).catch(() => {});
        setShowPOS(true);
        setItems([]);
        setMsg("");
        setSelectedPausedId("");
        setSearch("");
    }

    useEffect(() => {
        if (showPOS && bodegaId) {
            get(`/ventas/productos-disponibles?bodega_id=${bodegaId}`).then(setProductos).catch(() => {});
        }
    }, [bodegaId, showPOS]);

    const filtered = productos.filter((p: any) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return p.producto_nombre?.toLowerCase().includes(q) || p.codigo_de_barras?.toLowerCase().includes(q);
    });

    function addItem(p: any, modalidad: string) {
        const idx = items.findIndex(i => i.producto_id === p.producto_id && i.modalidad === modalidad);
        if (idx >= 0) {
            const newItems = [...items];
            if (modalidad === "caja_pesada") {
                newItems[idx] = { ...newItems[idx], cantidad_kg: (newItems[idx].cantidad_kg || 0) + 1 };
            } else {
                newItems[idx] = { ...newItems[idx], cantidad: (newItems[idx].cantidad || 0) + 1 };
            }
            newItems[idx].subtotal = calcSubtotal(newItems[idx]);
            setItems(newItems);
            return;
        }
        const item: any = {
            producto_id: p.producto_id,
            producto_nombre: p.producto_nombre,
            modalidad,
            precio_unitario: modalidad === "caja_pesada" ? parseFloat(p.precio_mayoreo_kg_hoy || p.precio_mayoreo_kg || 0)
                : modalidad === "caja_sellada_entera" || modalidad === "caja_sellada_media" ? parseFloat(p.precio_caja_sellada_hoy || p.precio_caja_sellada || 0)
                : parseFloat(p.precio_unidad_hoy || p.precio_por_unidad || 0),
            cantidad: modalidad === "caja_pesada" ? 1 : 1,
            cantidad_kg: modalidad === "caja_pesada" ? 1 : 0,
            cajas: 0,
            bodega_id: bodegaId,
        };
        item.subtotal = calcSubtotal(item);
        setItems([...items, item]);
    }

    function calcSubtotal(it: any) {
        if (it.modalidad === "caja_pesada") return (it.cantidad_kg || 0) * it.precio_unitario;
        return (it.cantidad || 0) * it.precio_unitario;
    }

    function updateItem(i: number, field: string, value: any) {
        const newItems = [...items];
        newItems[i][field] = value;
        newItems[i].subtotal = calcSubtotal(newItems[i]);
        setItems(newItems);
    }

    function removeItem(i: number) {
        setItems(items.filter((_, idx) => idx !== i));
    }

    const subtotal = items.reduce((s, it) => s + (it.subtotal || 0), 0);

    async function handlePause() {
        if (!items.length) return;
        setMsg("Pausando...");
        try {
            await post("/ventas/pausar", {
                bodega_id: bodegaId,
                items: items.map(it => ({
                    producto_id: it.producto_id,
                    modalidad: it.modalidad,
                    cantidad: it.modalidad === "caja_pesada" ? it.cantidad_kg : it.cantidad,
                    precio_unitario: it.precio_unitario,
                    subtotal: it.subtotal,
                })),
            });
            setMsg("Venta pausada");
            setItems([]);
            get("/ventas/pausadas").then(setPausedSales).catch(() => {});
        } catch (err: any) {
            setMsg("Error: " + (err.message || "Desconocido"));
        }
    }

    async function handleResume() {
        if (!selectedPausedId) return;
        setMsg("Reanudando...");
        try {
            const paused = await get(`/ventas/pausadas/${selectedPausedId}`);
            const data = paused.datos_json;
            if (!data?.items?.length) { setMsg("Error: venta pausada vacía"); return; }
            setBodegaId(data.bodega_id || bodegas[0]?.id || "");
            setItems(data.items.map((savedItem: any) => ({
                producto_id: savedItem.producto_id,
                producto_nombre: savedItem.producto_nombre || "Desconocido",
                modalidad: savedItem.modalidad,
                cantidad: savedItem.modalidad === "caja_pesada" ? 1 : (savedItem.cantidad || 1),
                cantidad_kg: savedItem.modalidad === "caja_pesada" ? (savedItem.cantidad || 1) : 0,
                precio_unitario: savedItem.precio_unitario,
                subtotal: savedItem.subtotal || 0,
                bodega_id: data.bodega_id,
            })));
            await fetch(`${getApiBase()}/ventas/pausadas/${paused.id}`, { method: "DELETE", headers: { Authorization: "Bearer " + localStorage.getItem("token") } });
            setPausedSales(prev => prev.filter(p => p.id !== paused.id));
            setSelectedPausedId("");
            setMsg("Venta reanudada");
        } catch (err: any) {
            setMsg("Error: " + (err.message || "Desconocido"));
        }
    }

    async function cobrar() {
        if (!bodegaId || !items.length) return;
        setMsg("Procesando...");
        const cambio = Math.max(0, (parseFloat(montoRecibido) || 0) - subtotal);
        try {
            const body: any = {
                bodega_id: bodegaId,
                tipo_pago: "contado",
                monto_efectivo: parseFloat(montoRecibido) || 0,
                monto_cambio: cambio,
                items: items.map(it => ({
                    producto_id: it.producto_id,
                    modalidad: it.modalidad,
                    cantidad: it.modalidad === "caja_pesada" ? it.cantidad_kg : it.cantidad,
                    ...(it.modalidad === "caja_pesada" ? { cajas: 0 } : {}),
                    precio_unitario: it.precio_unitario,
                    subtotal: it.subtotal,
                    bodega_id: it.bodega_id || bodegaId,
                })),
            };
            const venta = await post("/ventas", body);
            setMsg("Venta registrada");
            const token = localStorage.getItem("token");
            const res = await fetch(`${getApiBase()}/ticket/${venta.id}?token=${token}`);
            const html = await res.text();
            setTicketHtml(html);
            setShowPOS(false);
            get("/ventas").then(setVentas);
        } catch (err: any) {
            setMsg("Error: " + (err.message || "Desconocido"));
        }
    }

    if (ticketHtml) {
        return (
            <div style={{ position: "fixed", inset: 0, background: "#fff", zIndex: 2000, display: "flex", flexDirection: "column" }}>
                <div style={{ padding: "8px 16px", background: "#1a8a3a", color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: "bold" }}>Ticket de venta</span>
                    <button onClick={() => setTicketHtml(null)}
                        style={{ background: "none", border: "none", color: "#fff", fontSize: 20, cursor: "pointer" }}>✕</button>
                </div>
                <div style={{ flex: 1, overflow: "auto", padding: 8 }}
                    dangerouslySetInnerHTML={{ __html: ticketHtml }} />
                <div style={{ padding: "8px 16px", borderTop: "1px solid #ddd", display: "flex", gap: 8 }}>
                    <button onClick={() => window.print()}
                        style={{ flex: 1, padding: 12, background: "#1a8a3a", color: "#fff", border: "none", borderRadius: 8, fontSize: 16, cursor: "pointer" }}>
                        Imprimir
                    </button>
                    <button onClick={() => { setTicketHtml(null); get("/ventas").then(setVentas); }}
                        style={{ flex: 1, padding: 12, background: "#888", color: "#fff", border: "none", borderRadius: 8, fontSize: 16, cursor: "pointer" }}>
                        Cerrar
                    </button>
                </div>
            </div>
        );
    }

    const card: React.CSSProperties = {
        background: "#fff", borderRadius: 12, padding: 16, marginBottom: 12,
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)", borderLeft: "4px solid #2196f3",
    };

    if (!showPOS) {
        return (
            <>
            <div className="header" style={{ marginBottom: 16 }}>
                <span className="header-back" onClick={() => navigate("/")}>←</span>
                <h1>Ventas</h1>
            </div>
            <div className="page">
                <div style={{ padding: "8px 12px", borderRadius: 8, marginBottom: 12, fontSize: 13,
                    background: isOnline ? "#d4edda" : "#fff3cd", color: isOnline ? "#155724" : "#856404" }}>
                    {isOnline ? "Online" : "Offline — no disponible"}
                </div>

                {cajaAbierta === false && (
                    <div style={{ background: "#fff8e1", border: "1px solid #ffe082", borderRadius: 12, padding: 14, marginBottom: 12 }}>
                        <h4 style={{ margin: "0 0 6px", fontSize: 13 }}>Abrir caja</h4>
                        <p style={{ fontSize: 12, color: "#666", marginBottom: 8 }}>Debes abrir la caja antes de vender.</p>
                        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                            <input type="number" step="0.01" min="0" value={montoApertura}
                                onChange={e => setMontoApertura(e.target.value)}
                                style={{ flex: 1, minWidth: 80, padding: "8px 10px", border: "1px solid #ddd", borderRadius: 8, fontSize: 13 }} />
                            <button onClick={abrirCaja}
                                style={{ padding: "8px 16px", background: "#ff9800", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: "bold" }}>
                                Abrir caja
                            </button>
                        </div>
                    </div>
                )}

                <button onClick={abrirPOS} disabled={!isOnline}
                    style={{ width: "100%", padding: 14, background: isOnline ? "#1a8a3a" : "#ccc",
                        color: "#fff", border: "none", borderRadius: 8, fontSize: 16, fontWeight: "bold",
                        cursor: isOnline ? "pointer" : "not-allowed", marginBottom: 8 }}>
                    + Nueva Venta
                </button>

                <button onClick={() => setShowCobros(true)} disabled={!isOnline}
                    style={{ width: "100%", padding: 12, background: isOnline ? "#ff9800" : "#ccc",
                        color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: "bold",
                        cursor: isOnline ? "pointer" : "not-allowed", marginBottom: 16 }}>
                    Pagar créditos
                </button>

                <h4 style={{ marginBottom: 12 }}>Últimas ventas</h4>
                {ventas.length === 0 ? (
                    <div style={{ ...card, borderLeftColor: "#4caf50", textAlign: "center", padding: 24 }}>
                        <p style={{ color: "#666" }}>No hay ventas registradas</p>
                    </div>
                ) : ventas.map((v: any) => (
                    <div key={v.id} style={card}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <strong>{v.folio}</strong>
                            <span style={{ fontSize: 12, color: "#999" }}>{new Date(v.created_at).toLocaleDateString()}</span>
                        </div>
                        <p style={{ fontSize: 13, color: "#555", margin: "4px 0" }}>{v.bodega_nombre}</p>
                        <p style={{ fontSize: 12, color: "#888", margin: 0 }}>
                            {v.total_kg ? `${parseFloat(v.total_kg).toFixed(1)} kg` : "0 kg"}
                        </p>
                        <button onClick={async () => {
                            const token = localStorage.getItem("token");
                            const res = await fetch(`${getApiBase()}/ticket/${v.id}?token=${token}`);
                            const html = await res.text();
                            setTicketHtml(html);
                        }}
                            style={{ marginTop: 8, padding: "6px 14px", background: "#1565c0", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: "bold" }}>
                            Ticket
                        </button>
                    </div>
                ))}
            </div>

            {showCobros && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}
                    onClick={() => { setShowCobros(false); setCobrosSel(null); }}>
                    <div style={{ background: "#fff", borderRadius: 16, padding: 20, maxWidth: 500, width: "95%", maxHeight: "90vh", overflow: "auto" }}
                        onClick={e => e.stopPropagation()}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                            <h3 style={{ margin: 0, fontSize: 16 }}>Pagar créditos</h3>
                            <button onClick={() => { setShowCobros(false); setCobrosSel(null); }}
                                style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#888" }}>✕</button>
                        </div>

                        {!cobrosSel ? (
                            <>
                                <input placeholder="Buscar cliente..." value={cobrosSearch}
                                    onChange={e => setCobrosSearch(e.target.value)}
                                    style={{ width: "100%", padding: "8px 10px", border: "1px solid #ddd", borderRadius: 8, fontSize: 13, boxSizing: "border-box", marginBottom: 8 }} />
                                <button onClick={async () => {
                                    try {
                                        const r = await get("/reportes/creditos?estado=pendiente");
                                        setCreditosPendientes(r);
                                    } catch { alert("Error al cargar créditos"); }
                                }} style={{ padding: "6px 12px", background: "#1976d2", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12, marginBottom: 8 }}>
                                    Cargar créditos pendientes
                                </button>
                                {creditosPendientes
                                    .filter((c: any) => !cobrosSearch || (c.cliente_nombre || "").toLowerCase().includes(cobrosSearch.toLowerCase()))
                                    .map((c: any) => (
                                        <div key={c.venta_id || c.id} onClick={async () => {
                                            setCobrosSel(c);
                                            setCobrosMonto("");
                                            try { setCobrosPagos(await get(`/pagos/venta/${c.venta_id || c.id}`)); } catch { setCobrosPagos([]); }
                                        }}
                                            style={{ padding: "10px 12px", borderBottom: "1px solid #eee", cursor: "pointer", background: "#fafafa", borderRadius: 8, marginBottom: 4 }}>
                                            <div style={{ fontWeight: "bold", fontSize: 14 }}>{c.cliente_nombre || "Sin nombre"}</div>
                                            <div style={{ fontSize: 12, color: "#666" }}>
                                                Folio: {c.folio} — Saldo: <strong style={{ color: "#d32f2f" }}>${money(c.saldo_pendiente)}</strong>
                                            </div>
                                        </div>
                                    ))}
                                {!creditosPendientes.length && <p style={{ color: "#999", textAlign: "center", fontSize: 13 }}>Presiona "Cargar créditos pendientes"</p>}
                            </>
                        ) : (
                            <div>
                                <div style={{ background: "#fff3e0", borderRadius: 8, padding: 10, marginBottom: 12, fontSize: 13 }}>
                                    <div style={{ fontWeight: "bold", fontSize: 14 }}>{cobrosSel.cliente_nombre || "Sin nombre"}</div>
                                    <div style={{ color: "#555", marginTop: 2 }}>Folio: {cobrosSel.folio}</div>
                                    <div style={{ fontWeight: "bold", marginTop: 4, color: "#d32f2f", fontSize: 16 }}>
                                        Saldo: ${money(cobrosSel.saldo_pendiente)}
                                    </div>
                                </div>
                                {cobrosPagos.length > 0 && (
                                    <div style={{ fontSize: 12, marginBottom: 8 }}>
                                        <strong>Pagos anteriores:</strong>
                                        {cobrosPagos.map((p: any) => (
                                            <div key={p.id} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
                                                <span>{new Date(p.fecha).toLocaleDateString()}</span>
                                                <span style={{ color: "#1a8a3a" }}>${money(p.monto)}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <input type="number" step="0.01" min="0" placeholder="Monto a pagar"
                                    value={cobrosMonto} onChange={e => setCobrosMonto(e.target.value)}
                                    style={{ width: "100%", padding: "10px 12px", border: "2px solid #ff9800", borderRadius: 8, fontSize: 16, fontWeight: "bold", boxSizing: "border-box", marginBottom: 8 }} />
                                <div style={{ display: "flex", gap: 8 }}>
                                    <button onClick={async () => {
                                        if (!cobrosMonto || parseFloat(cobrosMonto) <= 0) return alert("Monto inválido");
                                        if (parseFloat(cobrosMonto) > parseFloat(cobrosSel.saldo_pendiente)) return alert("Excede el saldo");
                                        try {
                                            const resp = await post("/pagos", { venta_id: cobrosSel.venta_id || cobrosSel.id, monto: parseFloat(cobrosMonto) });
                                            const pagoId = resp?.id;
                                            if (pagoId) {
                                                const token = localStorage.getItem("token");
                                                window.open(`${getApiBase().replace("/api", "")}/api/ticket/pago/${pagoId}?token=${token}`, "_blank");
                                            }
                                            setShowCobros(false);
                                            setCobrosSel(null);
                                        } catch (e: any) { alert("Error: " + (e.message || e)); }
                                    }}
                                        style={{ flex: 1, padding: 10, background: "#ff9800", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: "bold", fontSize: 14 }}>
                                        Pagar
                                    </button>
                                    <button onClick={() => setCobrosSel(null)}
                                        style={{ padding: "10px 20px", background: "#888", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>
                                        Volver
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
            </>
        );
    }

    return (
        <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3 style={{ margin: 0 }}>Nueva Venta</h3>
                <button onClick={() => setShowPOS(false)}
                    style={{ background: "none", border: "none", color: "#888", fontSize: 20, cursor: "pointer" }}>✕</button>
            </div>

            <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 13, color: "#555", display: "block", marginBottom: 4 }}>Bodega</label>
                <select value={bodegaId} onChange={e => setBodegaId(e.target.value)}
                    style={{ width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 14, boxSizing: "border-box" }}>
                    {bodegas.filter((b: any) => !b.es_mostrador).map((b: any) => <option key={b.id} value={b.id}>{b.nombre}</option>)}
                </select>
            </div>

            <input type="text" placeholder="Buscar producto..." value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ width: "100%", padding: "10px 12px", border: "2px solid #1a8a3a", borderRadius: 8, fontSize: 14, boxSizing: "border-box", marginBottom: 10 }} />

            <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 13, color: "#555", display: "block", marginBottom: 4 }}>Agregar producto</label>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {filtered.map((p: any) => {
                        const hasCP = p.modalidad_caja_pesada;
                        const hasCS = p.modalidad_caja_sellada;
                        const hasUN = p.modalidad_unidad;
                        return (
                            <div key={p.producto_id} style={{ background: "#f9f9f9", borderRadius: 8, padding: 10, border: "1px solid #eee" }}>
                                <div style={{ fontWeight: "bold", fontSize: 14, marginBottom: 6 }}>{p.producto_nombre}</div>
                                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                                    {hasCP && <button onClick={() => addItem(p, "caja_pesada")}
                                        style={{ padding: "6px 10px", background: "#1a8a3a", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: "bold" }}>
                                        KG (${p.precio_mayoreo_kg_hoy || p.precio_mayoreo_kg || 0}/kg)
                                    </button>}
                                    {hasCS && <button onClick={() => addItem(p, "caja_sellada_entera")}
                                        style={{ padding: "6px 10px", background: "#1565c0", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: "bold" }}>
                                        Caja entera (${p.precio_caja_sellada_hoy || p.precio_caja_sellada || 0})
                                    </button>}
                                    {hasCS && <button onClick={() => addItem(p, "caja_sellada_media")}
                                        style={{ padding: "6px 10px", background: "#5c6bc0", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: "bold" }}>
                                        Media caja
                                    </button>}
                                    {hasUN && <button onClick={() => addItem(p, "unidad")}
                                        style={{ padding: "6px 10px", background: "#ff9800", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: "bold" }}>
                                        Unidad (${p.precio_unidad_hoy || p.precio_por_unidad || 0})
                                    </button>}
                                </div>
                            </div>
                        );
                    })}
                    {!filtered.length && <p style={{ fontSize: 12, color: "#999" }}>No hay productos disponibles</p>}
                </div>
            </div>

            {items.map((it, i) => (
                <div key={i} style={{ background: "#f9f9f9", borderRadius: 8, padding: 12, marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <strong style={{ fontSize: 14 }}>{it.producto_nombre}</strong>
                        <button onClick={() => removeItem(i)} style={{ background: "none", border: "none", color: "#f44336", fontSize: 18, cursor: "pointer" }}>×</button>
                    </div>
                    <div style={{ fontSize: 12, color: "#555", marginBottom: 4 }}>
                        {it.modalidad === "caja_pesada" ? "Peso variable" : it.modalidad === "caja_sellada_entera" ? "Caja entera" : it.modalidad === "caja_sellada_media" ? "Media caja" : "Unidad"}
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        {it.modalidad === "caja_pesada" && (
                            <>
                                <input type="number" min={0.1} step={0.1} value={it.cantidad_kg}
                                    onChange={e => updateItem(i, "cantidad_kg", parseFloat(e.target.value) || 0)}
                                    style={{ width: 60, padding: "6px 8px", border: "1px solid #ddd", borderRadius: 6, fontSize: 14, textAlign: "center" }} />
                                <span style={{ fontSize: 12 }}>kg × ${it.precio_unitario.toFixed(2)}</span>
                            </>
                        )}
                        {it.modalidad !== "caja_pesada" && (
                            <>
                                <input type="number" min={1} step={1} value={it.cantidad}
                                    onChange={e => updateItem(i, "cantidad", parseInt(e.target.value) || 1)}
                                    style={{ width: 60, padding: "6px 8px", border: "1px solid #ddd", borderRadius: 6, fontSize: 14, textAlign: "center" }} />
                                <span style={{ fontSize: 12 }}>× ${it.precio_unitario.toFixed(2)}</span>
                            </>
                        )}
                        <span style={{ fontSize: 14, fontWeight: "bold", marginLeft: "auto" }}>
                            ${it.subtotal.toFixed(2)}
                        </span>
                    </div>
                </div>
            ))}

            {items.length > 0 && (
                <div style={{ textAlign: "right", padding: "8px 0", fontSize: 20, fontWeight: "bold", borderTop: "2px solid #eee", marginTop: 8 }}>
                    Total: ${money(subtotal)}
                </div>
            )}

            {items.length > 0 && (
                <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 8 }}>
                    <div style={{ flex: 1 }}>
                        <label style={{ fontSize: 13, color: "#333", fontWeight: "bold", marginBottom: 4, display: "block" }}>Recibí $</label>
                        <input type="number" step="0.01" min="0" value={montoRecibido}
                            onChange={e => setMontoRecibido(e.target.value)}
                            placeholder="0.00"
                            style={{ width: "100%", padding: "10px 12px", border: "2px solid #1a8a3a", borderRadius: 8, fontSize: 18, fontWeight: "bold", boxSizing: "border-box", textAlign: "right" }} />
                    </div>
                    <div style={{ flex: 1, textAlign: "right" }}>
                        <label style={{ fontSize: 13, color: "#333", fontWeight: "bold", marginBottom: 4, display: "block" }}>Cambio</label>
                        <div style={{ fontSize: 24, fontWeight: "bold", color: montoRecibido && (parseFloat(montoRecibido) || 0) < subtotal ? "#d32f2f" : "#1a8a3a" }}>
                            ${Math.max(0, (parseFloat(montoRecibido) || 0) - subtotal).toFixed(2)}
                        </div>
                    </div>
                </div>
            )}

            {msg && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 8, fontSize: 13, margin: "8px 0",
                    background: msg.includes("Error") ? "#fef2f2" : "#e8f5e9",
                    color: msg.includes("Error") ? "#dc2626" : "#1a8a3a" }}>
                    <button onClick={() => setMsg("")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "inherit", padding: 0, lineHeight: 1 }}>✕</button>
                    <span style={{ flex: 1 }}>{msg}</span>
                </div>
            )}

            {items.length > 0 && (
                <button onClick={handlePause}
                    style={{ width: "100%", padding: 12, marginTop: 8,
                        background: "#ff9800", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: "bold",
                        cursor: "pointer" }}>
                    Pausar venta
                </button>
            )}

            <button onClick={cobrar} disabled={!items.length || !bodegaId || (!montoRecibido || (parseFloat(montoRecibido) || 0) < subtotal)}
                style={{ width: "100%", padding: 14, marginTop: 8,
                    background: items.length && bodegaId && montoRecibido && (parseFloat(montoRecibido) || 0) >= subtotal ? "#1a8a3a" : "#ccc",
                    color: "#fff", border: "none", borderRadius: 8, fontSize: 16, fontWeight: "bold",
                    cursor: items.length ? "pointer" : "not-allowed" }}>
                Cobrar $ {subtotal.toFixed(2)}
            </button>

            {pausedSales.length > 0 && (
                <div style={{ marginTop: 12, padding: 12, background: "#fff8e1", borderRadius: 8, border: "1px solid #ffe082" }}>
                    <label style={{ fontSize: 13, color: "#555", display: "block", marginBottom: 4, fontWeight: "bold" }}>
                        Reanudar venta pausada
                    </label>
                    <select value={selectedPausedId} onChange={e => setSelectedPausedId(e.target.value)}
                        style={{ width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 14, boxSizing: "border-box", marginBottom: 8 }}>
                        <option value="">Seleccionar...</option>
                        {pausedSales.map((ps: any) => (
                            <option key={ps.id} value={ps.id}>
                                {new Date(ps.created_at).toLocaleString()} ({ps.datos_json?.items?.length || 0} prod.)
                            </option>
                        ))}
                    </select>
                    <button onClick={handleResume} disabled={!selectedPausedId}
                        style={{ width: "100%", padding: 10, background: selectedPausedId ? "#ff9800" : "#ccc",
                            color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: "bold",
                            cursor: selectedPausedId ? "pointer" : "not-allowed" }}>
                        Reanudar
                    </button>
                </div>
            )}
        </div>
    );
}
