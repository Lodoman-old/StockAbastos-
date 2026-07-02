import { money } from "../format";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { get, post } from "../services/api";
import { useNetwork } from "../hooks/useNetwork";
import { getApiBase } from "../services/api.config";

const labelModalidad: Record<string, string> = {
    caja_pesada: "Caja pesada", caja_sellada_entera: "Caja sellada entera",
    caja_sellada_media: "Media caja sellada", unidad: "Unidad",
};

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
    const [tipoPago, setTipoPago] = useState<"contado" | "credito">("contado");
    const [clientes, setClientes] = useState<any[]>([]);
    const [clienteId, setClienteId] = useState("");
    const [fechaVenc, setFechaVenc] = useState("");

    useEffect(() => {
        if (!isOnline) return;
        get("/ventas").then(setVentas).catch(() => {});
        get("/bodegas").then((b: any[]) => setBodegas(b.filter((x: any) => !x.es_mostrador))).catch(() => {});
        get("/clientes").then(setClientes).catch(() => {});
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
        setSearch("");
        setTipoPago("contado");
        setClienteId("");
        setFechaVenc("");
        setMontoRecibido("");
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

    async function addVentaCompleta(p: any, modalidad: string) {
        try {
            const res = await get(`/ventas/tarima-completa-info?producto_id=${p.producto_id}&bodega_id=${bodegaId}`);
            const cajasRestantes = res.cajas_restantes || 0;
            if (cajasRestantes <= 0) { setMsg("No hay tarimas completas disponibles"); return; }
            const itemBase: any = { producto_id: p.producto_id, producto_nombre: p.producto_nombre, modalidad, destare_kg: parseFloat(p.destare_kg || 0), precioManual: false, precioEditado: 0, bodega_id: bodegaId, vender_completa: true };
            if (modalidad === "caja_pesada") {
                itemBase.cajas = cajasRestantes;
                itemBase.peso_bruto = 0;
                itemBase.precio_unitario = parseFloat(p.precio_mayoreo_kg_hoy || p.precio_mayoreo_kg || 0);
                itemBase.cantidad = 0;
                itemBase.subtotal = 0;
                itemBase.precioEditado = itemBase.precio_unitario;
            } else if (modalidad === "caja_sellada_entera") {
                itemBase.cantidad = cajasRestantes;
                itemBase.precio_unitario = parseFloat(p.precio_caja_sellada_hoy || p.precio_caja_sellada || 0);
                itemBase.subtotal = cajasRestantes * itemBase.precio_unitario;
                itemBase.precioEditado = itemBase.precio_unitario;
            } else if (modalidad === "caja_sellada_media") {
                const total = cajasRestantes * 0.5;
                itemBase.cantidad = total;
                itemBase.precio_unitario = (parseFloat(p.precio_caja_sellada_hoy || p.precio_caja_sellada || 0)) / 2;
                itemBase.subtotal = total * itemBase.precio_unitario;
                itemBase.precioEditado = itemBase.precio_unitario;
            } else if (modalidad === "unidad") {
                itemBase.cantidad = cajasRestantes;
                itemBase.precio_unitario = parseFloat(p.precio_unidad_hoy || p.precio_por_unidad || 0);
                itemBase.subtotal = cajasRestantes * itemBase.precio_unitario;
                itemBase.precioEditado = itemBase.precio_unitario;
            }
            setItems([...items, itemBase]);
        } catch (e: any) { setMsg("Error: " + (e.message || "")); }
    }

    function addItem(p: any, modalidad: string) {
        const idx = items.findIndex(i => i.producto_id === p.producto_id && i.modalidad === modalidad);
        if (idx >= 0) {
            setItems(items.map((it, i) => {
                if (i !== idx) return it;
                if (modalidad === "caja_pesada") {
                    const newCajas = (it.cajas || 0) + 1;
                    const destareTotal = it.destare_kg * newCajas;
                    const netKg = Math.max(0, (it.peso_bruto || 0) - destareTotal);
                    return { ...it, cajas: newCajas, cantidad: netKg, subtotal: netKg * it.precio_unitario };
                }
                const newCant = (it.cantidad || 0) + 1;
                return { ...it, cantidad: newCant, subtotal: newCant * it.precio_unitario };
            }));
            return;
        }
        const itemBase: any = { producto_id: p.producto_id, producto_nombre: p.producto_nombre, modalidad, destare_kg: parseFloat(p.destare_kg || 0), precioManual: false, precioEditado: 0, bodega_id: bodegaId };
        if (modalidad === "caja_pesada") {
            itemBase.cajas = 1;
            itemBase.peso_bruto = 0;
            itemBase.precio_unitario = parseFloat(p.precio_mayoreo_kg_hoy || p.precio_mayoreo_kg || 0);
            itemBase.cantidad = 0;
            itemBase.subtotal = 0;
            itemBase.precioEditado = itemBase.precio_unitario;
        } else if (modalidad === "caja_sellada_entera") {
            itemBase.cantidad = 1;
            itemBase.precio_unitario = parseFloat(p.precio_caja_sellada_hoy || p.precio_caja_sellada || 0);
            itemBase.subtotal = itemBase.precio_unitario;
            itemBase.precioEditado = itemBase.precio_unitario;
        } else if (modalidad === "caja_sellada_media") {
            itemBase.cantidad = 1;
            itemBase.precio_unitario = (parseFloat(p.precio_caja_sellada_hoy || p.precio_caja_sellada || 0)) / 2;
            itemBase.subtotal = itemBase.precio_unitario;
            itemBase.precioEditado = itemBase.precio_unitario;
        } else if (modalidad === "unidad") {
            itemBase.cantidad = 1;
            itemBase.precio_unitario = parseFloat(p.precio_unidad_hoy || p.precio_por_unidad || 0);
            itemBase.subtotal = itemBase.precio_unitario;
            itemBase.precioEditado = itemBase.precio_unitario;
        }
        setItems([...items, itemBase]);
    }

    function removeItem(i: number) { setItems(items.filter((_, idx) => idx !== i)); }

    function updateItemCajas(i: number, cajas: number) {
        setItems(items.map((it, idx) => {
            if (idx !== i) return it;
            const c = Math.max(0, cajas);
            const destareTotal = it.destare_kg * c;
            const netKg = Math.max(0, (it.peso_bruto || 0) - destareTotal);
            return { ...it, cajas: c, cantidad: netKg, subtotal: netKg * it.precio_unitario };
        }));
    }

    function updateItemPesoBruto(i: number, peso: number) {
        setItems(items.map((it, idx) => {
            if (idx !== i) return it;
            const pb = Math.max(0, peso);
            const destareTotal = it.destare_kg * (it.cajas || 0);
            const netKg = Math.max(0, pb - destareTotal);
            return { ...it, peso_bruto: pb, cantidad: netKg, subtotal: netKg * it.precio_unitario };
        }));
    }

    function updateItemCantidad(i: number, nueva: number) {
        setItems(items.map((it, idx) => idx === i ? { ...it, cantidad: nueva, subtotal: nueva * it.precio_unitario } : it));
    }

    function updateItemPrecio(i: number, nuevoPrecio: number) {
        setItems(items.map((it, idx) => idx === i ? { ...it, precio_unitario: nuevoPrecio, subtotal: (it.modalidad === "caja_pesada" ? (it.cantidad || 0) : it.cantidad) * nuevoPrecio, precioEditado: nuevoPrecio } : it));
    }

    function togglePrecioManual(i: number) {
        setItems(items.map((it, idx) => idx === i ? { ...it, precioManual: !it.precioManual } : it));
    }

    const subtotal = items.reduce((s, i) => s + i.subtotal, 0);

    async function handlePause() {
        if (!items.length) return;
        setMsg("Pausando...");
        try {
            await post("/ventas/pausar", { bodega_id: bodegaId, items: items.map(i => ({ ...i })) });
            setMsg("Venta pausada"); setItems([]);
            get("/ventas/pausadas").then(setPausedSales).catch(() => {});
        } catch (err: any) { setMsg("Error: " + (err.message || "")); }
    }

    function handleResume(paused: any) {
        const d = paused.datos_json;
        if (!d?.items?.length) return;
        setBodegaId(d.bodega_id || bodegas.filter(b => !b.es_mostrador)[0]?.id || "");
        setItems(d.items);
        fetch(`${getApiBase()}/ventas/pausadas/${paused.id}`, { method: "DELETE", headers: { Authorization: "Bearer " + localStorage.getItem("token") } }).catch(() => {});
        setPausedSales((prev: any[]) => prev.filter(p => p.id !== paused.id));
        setMsg("Venta reanudada");
    }

    async function cobrar() {
        if (!bodegaId || !items.length) return;
        if (tipoPago === "credito" && !clienteId) { setMsg("Selecciona un cliente"); return; }
        setMsg("Procesando...");
        const cambio = tipoPago === "contado" ? Math.max(0, (parseFloat(montoRecibido) || 0) - subtotal) : 0;
        try {
            const venta = await post("/ventas", {
                bodega_id: bodegaId, tipo_pago: tipoPago,
                cliente_id: tipoPago === "credito" ? clienteId : undefined,
                fecha_vencimiento: tipoPago === "credito" ? fechaVenc : undefined,
                monto_efectivo: tipoPago === "contado" ? parseFloat(montoRecibido) || 0 : undefined,
                monto_cambio: tipoPago === "contado" ? cambio : undefined,
                items: items.map(i => ({
                    producto_id: i.producto_id, modalidad: i.modalidad, cantidad: i.cantidad,
                    cajas: i.modalidad === "caja_pesada" ? i.cajas : undefined,
                    vender_completa: i.vender_completa || undefined,
                    precio_unitario: i.precio_unitario, subtotal: i.subtotal, bodega_id: i.bodega_id,
                })),
            });
            setMsg("Venta registrada");
            const token = localStorage.getItem("token");
            const res = await fetch(`${getApiBase()}/ticket/${venta.id}?token=${token}`);
            const html = await res.text();
            setTicketHtml(html);
            setShowPOS(false);
            get("/ventas").then(setVentas);
        } catch (err: any) { setMsg("Error: " + (err.message || "")); }
    }

    if (ticketHtml) {
        return (
            <div style={{ position: "fixed", inset: 0, background: "#fff", zIndex: 2000, display: "flex", flexDirection: "column" }}>
                <div style={{ padding: "8px 16px", background: "#1a8a3a", color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: "bold" }}>Ticket de venta</span>
                    <button onClick={() => setTicketHtml(null)} style={{ background: "none", border: "none", color: "#fff", fontSize: 20, cursor: "pointer" }}>✕</button>
                </div>
                <div style={{ flex: 1, overflow: "auto", padding: 8 }} dangerouslySetInnerHTML={{ __html: ticketHtml }} />
                <div style={{ padding: "8px 16px", borderTop: "1px solid #ddd", display: "flex", gap: 8 }}>
                    <button onClick={() => window.print()} style={{ flex: 1, padding: 12, background: "#1a8a3a", color: "#fff", border: "none", borderRadius: 8, fontSize: 16, cursor: "pointer" }}>Imprimir</button>
                    <button onClick={() => { setTicketHtml(null); get("/ventas").then(setVentas); }} style={{ flex: 1, padding: 12, background: "#888", color: "#fff", border: "none", borderRadius: 8, fontSize: 16, cursor: "pointer" }}>Cerrar</button>
                </div>
            </div>
        );
    }

    const cardBase = {
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
                    <div style={{ padding: "8px 12px", borderRadius: 8, marginBottom: 12, fontSize: 13, background: isOnline ? "#d4edda" : "#fff3cd", color: isOnline ? "#155724" : "#856404" }}>
                        {isOnline ? "Online" : "Offline — no disponible"}
                    </div>
                    {cajaAbierta === false && (
                        <div style={{ background: "#fff8e1", border: "1px solid #ffe082", borderRadius: 12, padding: 14, marginBottom: 12 }}>
                            <h4 style={{ margin: "0 0 6px", fontSize: 13 }}>Abrir caja</h4>
                            <p style={{ fontSize: 12, color: "#666", marginBottom: 8 }}>Debes abrir la caja antes de vender.</p>
                            <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                                <input type="number" step="0.01" min="0" value={montoApertura} onChange={e => setMontoApertura(e.target.value)} style={{ flex: 1, minWidth: 80, padding: "8px 10px", border: "1px solid #ddd", borderRadius: 8, fontSize: 13 }} />
                                <button onClick={abrirCaja} style={{ padding: "8px 16px", background: "#ff9800", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: "bold" }}>Abrir caja</button>
                            </div>
                        </div>
                    )}
                    <button onClick={abrirPOS} disabled={!isOnline} style={{ width: "100%", padding: 14, background: isOnline ? "#1a8a3a" : "#ccc", color: "#fff", border: "none", borderRadius: 8, fontSize: 16, fontWeight: "bold", cursor: isOnline ? "pointer" : "not-allowed", marginBottom: 8 }}>+ Nueva Venta</button>
                    <button onClick={() => setShowCobros(true)} disabled={!isOnline} style={{ width: "100%", padding: 12, background: isOnline ? "#ff9800" : "#ccc", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: "bold", cursor: isOnline ? "pointer" : "not-allowed", marginBottom: 16 }}>Pagar créditos</button>
                    <h4 style={{ marginBottom: 12 }}>Últimas ventas</h4>
                    {ventas.length === 0 ? (
                        <div style={{ ...cardBase, borderLeftColor: "#4caf50", textAlign: "center", padding: 24 }}><p style={{ color: "#666" }}>No hay ventas registradas</p></div>
                    ) : ventas.map((v: any) => (
                        <div key={v.id} style={cardBase}>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <strong>{v.folio}</strong>
                                <span style={{ fontSize: 12, color: "#999" }}>{new Date(v.created_at).toLocaleDateString()}</span>
                            </div>
                            <p style={{ fontSize: 13, color: "#555", margin: "4px 0" }}>{v.bodega_nombre}</p>
                            <p style={{ fontSize: 12, color: "#888", margin: 0 }}>{v.total_kg ? `${parseFloat(v.total_kg).toFixed(1)} kg` : "0 kg"}</p>
                            <button onClick={async () => {
                                const token = localStorage.getItem("token");
                                const res = await fetch(`${getApiBase()}/ticket/${v.id}?token=${token}`);
                                setTicketHtml(await res.text());
                            }} style={{ marginTop: 8, padding: "6px 14px", background: "#1565c0", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: "bold" }}>Ticket</button>
                        </div>
                    ))}
                </div>
                {showCobros && (
                    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }} onClick={() => { setShowCobros(false); setCobrosSel(null); }}>
                        <div style={{ background: "#fff", borderRadius: 16, padding: 20, maxWidth: 500, width: "95%", maxHeight: "90vh", overflow: "auto" }} onClick={e => e.stopPropagation()}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                                <h3 style={{ margin: 0, fontSize: 16 }}>Pagar créditos</h3>
                                <button onClick={() => { setShowCobros(false); setCobrosSel(null); }} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#888" }}>✕</button>
                            </div>
                            {!cobrosSel ? (
                                <>
                                    <input placeholder="Buscar cliente..." value={cobrosSearch} onChange={e => setCobrosSearch(e.target.value)} style={{ width: "100%", padding: "8px 10px", border: "1px solid #ddd", borderRadius: 8, fontSize: 13, boxSizing: "border-box", marginBottom: 8 }} />
                                    <button onClick={async () => { try { setCreditosPendientes(await get("/reportes/creditos?estado=pendiente")); } catch { alert("Error al cargar créditos"); } }} style={{ padding: "6px 12px", background: "#1976d2", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12, marginBottom: 8 }}>Cargar créditos pendientes</button>
                                    {creditosPendientes.filter((c: any) => !cobrosSearch || (c.cliente_nombre || "").toLowerCase().includes(cobrosSearch.toLowerCase())).map((c: any) => (
                                        <div key={c.venta_id || c.id} onClick={async () => { setCobrosSel(c); setCobrosMonto(""); try { setCobrosPagos(await get(`/pagos/venta/${c.venta_id || c.id}`)); } catch { setCobrosPagos([]); } }} style={{ padding: "10px 12px", borderBottom: "1px solid #eee", cursor: "pointer", background: "#fafafa", borderRadius: 8, marginBottom: 4 }}>
                                            <div style={{ fontWeight: "bold", fontSize: 14 }}>{c.cliente_nombre || "Sin nombre"}</div>
                                            <div style={{ fontSize: 12, color: "#666" }}>Folio: {c.folio} — Saldo: <strong style={{ color: "#d32f2f" }}>${money(c.saldo_pendiente)}</strong></div>
                                        </div>
                                    ))}
                                    {!creditosPendientes.length && <p style={{ color: "#999", textAlign: "center", fontSize: 13 }}>Presiona "Cargar créditos pendientes"</p>}
                                </>
                            ) : (
                                <div>
                                    <div style={{ background: "#fff3e0", borderRadius: 8, padding: 10, marginBottom: 12, fontSize: 13 }}>
                                        <div style={{ fontWeight: "bold", fontSize: 14 }}>{cobrosSel.cliente_nombre || "Sin nombre"}</div>
                                        <div style={{ color: "#555", marginTop: 2 }}>Folio: {cobrosSel.folio}</div>
                                        <div style={{ fontWeight: "bold", marginTop: 4, color: "#d32f2f", fontSize: 16 }}>Saldo: ${money(cobrosSel.saldo_pendiente)}</div>
                                    </div>
                                    {cobrosPagos.length > 0 && (
                                        <div style={{ fontSize: 12, marginBottom: 8 }}>
                                            <strong>Pagos anteriores:</strong>
                                            {cobrosPagos.map((p: any) => <div key={p.id} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}><span>{new Date(p.fecha).toLocaleDateString()}</span><span style={{ color: "#1a8a3a" }}>${money(p.monto)}</span></div>)}
                                        </div>
                                    )}
                                    <input type="number" step="0.01" min="0" placeholder="Monto a pagar" value={cobrosMonto} onChange={e => setCobrosMonto(e.target.value)} style={{ width: "100%", padding: "10px 12px", border: "2px solid #ff9800", borderRadius: 8, fontSize: 16, fontWeight: "bold", boxSizing: "border-box", marginBottom: 8 }} />
                                    <div style={{ display: "flex", gap: 8 }}>
                                        <button onClick={async () => {
                                            if (!cobrosMonto || parseFloat(cobrosMonto) <= 0) return alert("Monto inválido");
                                            if (parseFloat(cobrosMonto) > parseFloat(cobrosSel.saldo_pendiente)) return alert("Excede el saldo");
                                            try {
                                                const resp = await post("/pagos", { venta_id: cobrosSel.venta_id || cobrosSel.id, monto: parseFloat(cobrosMonto) });
                                                if (resp?.id) window.open(`${getApiBase().replace("/api", "")}/api/ticket/pago/${resp.id}?token=${localStorage.getItem("token")}`, "_blank");
                                                setShowCobros(false); setCobrosSel(null);
                                            } catch (e: any) { alert("Error: " + (e.message || e)); }
                                        }} style={{ flex: 1, padding: 10, background: "#ff9800", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: "bold", fontSize: 14 }}>Pagar</button>
                                        <button onClick={() => setCobrosSel(null)} style={{ padding: "10px 20px", background: "#888", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>Volver</button>
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h3 style={{ margin: 0 }}>Nueva Venta — Mayoreo</h3>
                <button onClick={() => setShowPOS(false)} style={{ background: "none", border: "none", color: "#888", fontSize: 20, cursor: "pointer" }}>✕</button>
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 140 }}>
                    <label style={{ fontSize: 12, color: "#555" }}>Bodega</label>
                    <select value={bodegaId} onChange={e => setBodegaId(e.target.value)} style={{ width: "100%", padding: "8px 10px", border: "1px solid #ddd", borderRadius: 8, fontSize: 13, boxSizing: "border-box" }}>
                        {bodegas.filter((b: any) => !b.es_mostrador).map((b: any) => <option key={b.id} value={b.id}>{b.nombre}</option>)}
                    </select>
                </div>
                <div>
                    <label style={{ fontSize: 12, color: "#555" }}>Pago</label>
                    <div style={{ display: "flex", gap: 4 }}>
                        <button onClick={() => { setTipoPago("contado"); setClienteId(""); }} style={{ padding: "7px 10px", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: "bold", fontSize: 12, background: tipoPago === "contado" ? "#1a8a3a" : "#e0e0e0", color: tipoPago === "contado" ? "#fff" : "#333" }}>Contado</button>
                        <button onClick={() => setTipoPago("credito")} style={{ padding: "7px 10px", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: "bold", fontSize: 12, background: tipoPago === "credito" ? "#ff9800" : "#e0e0e0", color: tipoPago === "credito" ? "#fff" : "#333" }}>Crédito</button>
                    </div>
                </div>
                {tipoPago === "credito" && (
                    <>
                        <div style={{ flex: 1, minWidth: 130 }}>
                            <label style={{ fontSize: 12, color: "#555" }}>Cliente *</label>
                            <select value={clienteId} onChange={e => setClienteId(e.target.value)} style={{ width: "100%", padding: "8px 10px", border: "1px solid #ddd", borderRadius: 8, fontSize: 13, boxSizing: "border-box" }}>
                                <option value="">Seleccionar</option>
                                {clientes.map((c: any) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                            </select>
                        </div>
                        <div style={{ minWidth: 120 }}>
                            <label style={{ fontSize: 12, color: "#555" }}>Vence</label>
                            <input type="date" value={fechaVenc} onChange={e => setFechaVenc(e.target.value)} style={{ width: "100%", padding: "8px 10px", border: "1px solid #ddd", borderRadius: 8, fontSize: 13, boxSizing: "border-box" }} />
                        </div>
                    </>
                )}
            </div>

            <input type="text" placeholder="Buscar producto..." value={search} onChange={e => setSearch(e.target.value)}
                style={{ width: "100%", padding: "10px 12px", border: "2px solid #1a8a3a", borderRadius: 8, fontSize: 14, boxSizing: "border-box", marginBottom: 10 }} />

            <div style={{ marginBottom: 12 }}>
                {filtered.map((p: any) => {
                    const disp = Number(p.cajas_disponibles || 0) + Number(p.cajas_parciales || 0);
                    const hasCP = p.modalidad_caja_pesada;
                    const hasCS = p.modalidad_caja_sellada;
                    const hasUN = p.modalidad_unidad;
                    const primModalidad = hasCP ? "caja_pesada" : hasCS ? "caja_sellada_entera" : "unidad";
                    return (
                        <div key={p.producto_id} onClick={() => disp > 0 && addItem(p, primModalidad)}
                            style={{ background: disp === 0 ? "#fff5f5" : "#fff", borderRadius: 8, padding: 10, marginBottom: 6, border: "1px solid #eee", cursor: disp > 0 ? "pointer" : "default" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                                <strong style={{ fontSize: 14 }}>{p.producto_nombre}</strong>
                                <span style={{ fontSize: 12, color: disp === 0 ? "#ef5350" : "#333", fontWeight: "bold" }}>{disp} cajas</span>
                            </div>
                            {p.tarimas_parciales > 0 && <div style={{ fontSize: 10, color: "#9c27b0", marginBottom: 4 }}>⚠ {p.tarimas_parciales} tarima parcial</div>}
                            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                                {hasCP && <button onClick={e => { e.stopPropagation(); addItem(p, "caja_pesada"); }} disabled={disp === 0}
                                    style={{ padding: "6px 10px", background: "#e3f2fd", color: "#1565c0", border: "none", borderRadius: 6, cursor: disp === 0 ? "not-allowed" : "pointer", fontSize: 11, fontWeight: "bold", opacity: disp === 0 ? 0.4 : 1 }}>
                                    CP ${money(p.precio_mayoreo_kg_hoy || p.precio_mayoreo_kg)}/kg
                                </button>}
                                {hasCS && <button onClick={e => { e.stopPropagation(); addItem(p, "caja_sellada_entera"); }} disabled={disp === 0}
                                    style={{ padding: "6px 10px", background: "#e8f5e9", color: "#2e7d32", border: "none", borderRadius: 6, cursor: disp === 0 ? "not-allowed" : "pointer", fontSize: 11, fontWeight: "bold", opacity: disp === 0 ? 0.4 : 1 }}>
                                    CS ${money(p.precio_caja_sellada_hoy || p.precio_caja_sellada)}
                                </button>}
                                {hasCS && <button onClick={e => { e.stopPropagation(); addItem(p, "caja_sellada_media"); }} disabled={disp === 0}
                                    style={{ padding: "6px 10px", background: "#fff3e0", color: "#e65100", border: "none", borderRadius: 6, cursor: disp === 0 ? "not-allowed" : "pointer", fontSize: 11, fontWeight: "bold", opacity: disp === 0 ? 0.4 : 1 }}>
                                    ½ ${money((p.precio_caja_sellada_hoy || p.precio_caja_sellada || 0) / 2)}
                                </button>}
                                {hasUN && <button onClick={e => { e.stopPropagation(); addItem(p, "unidad"); }} disabled={disp === 0}
                                    style={{ padding: "6px 10px", background: "#f3e5f5", color: "#7b1fa2", border: "none", borderRadius: 6, cursor: disp === 0 ? "not-allowed" : "pointer", fontSize: 11, fontWeight: "bold", opacity: disp === 0 ? 0.4 : 1 }}>
                                    UD ${money(p.precio_unidad_hoy || p.precio_por_unidad)}
                                </button>}
                                {disp > 0 && <button onClick={e => { e.stopPropagation(); addVentaCompleta(p, primModalidad); }} title="Vender tarima completa"
                                    style={{ padding: "6px 10px", background: "#1a8a3a", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 10, fontWeight: "bold" }}>
                                    VTC
                                </button>}
                            </div>
                        </div>
                    );
                })}
                {!filtered.length && <p style={{ fontSize: 12, color: "#999", textAlign: "center" }}>No hay productos disponibles</p>}
            </div>

            {items.map((it, i) => (
                <div key={i} style={{ background: "#f9f9f9", borderRadius: 8, padding: 10, marginBottom: 6, border: "1px solid #eee" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <strong style={{ fontSize: 13 }}>{it.producto_nombre}</strong>
                        <button onClick={() => removeItem(i)} style={{ background: "none", border: "none", color: "#f44336", fontSize: 16, cursor: "pointer", padding: 0 }}>×</button>
                    </div>
                    <div style={{ fontSize: 10, color: "#888", marginBottom: 4 }}>
                        {labelModalidad[it.modalidad]}
                    </div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                        {it.modalidad === "caja_pesada" && (
                            <>
                                <div>
                                    <label style={{ fontSize: 9, color: "#888" }}>Cajas</label>
                                    <input type="number" step={1} min={0} value={it.cajas}
                                        onChange={e => updateItemCajas(i, parseInt(e.target.value) || 0)}
                                        style={{ width: 46, padding: "3px 4px", border: "1px solid #ddd", borderRadius: 4, fontSize: 12, textAlign: "right" }} />
                                </div>
                                <div>
                                    <label style={{ fontSize: 9, color: "#888" }}>Bruto kg</label>
                                    <input type="number" step={0.01} min={0} value={it.peso_bruto}
                                        onChange={e => updateItemPesoBruto(i, parseFloat(e.target.value) || 0)}
                                        style={{ width: 60, padding: "3px 4px", border: "1px solid #ddd", borderRadius: 4, fontSize: 12, textAlign: "right" }}
                                        placeholder="0" />
                                </div>
                                <div style={{ fontSize: 10, color: "#888", whiteSpace: "nowrap", lineHeight: 1.3 }}>
                                    <div>dest {((it.destare_kg || 0) * (it.cajas || 0)).toFixed(1)}kg</div>
                                    <div style={{ fontWeight: "bold", color: "#333" }}>neto {it.cantidad.toFixed(2)}kg</div>
                                </div>
                            </>
                        )}
                        {it.modalidad !== "caja_pesada" && (
                            <>
                                <input type="number" step={1} min={0} value={it.cantidad}
                                    onChange={e => updateItemCantidad(i, parseFloat(e.target.value) || 0)}
                                    style={{ width: 46, padding: "3px 4px", border: "1px solid #ddd", borderRadius: 4, fontSize: 12, textAlign: "right" }} />
                                <span style={{ fontSize: 11, color: "#555" }}>
                                    {it.modalidad === "caja_sellada_media" ? "½" : it.cantidad} {it.modalidad === "unidad" ? "pz" : "cja"}
                                </span>
                            </>
                        )}
                        <div style={{ marginLeft: "auto", textAlign: "right" }}>
                            {it.precioManual ? (
                                <input type="number" step={0.01} min={0} value={it.precioEditado}
                                    onChange={e => updateItemPrecio(i, parseFloat(e.target.value) || 0)}
                                    style={{ width: 60, padding: "2px 4px", border: "2px solid #ff9800", borderRadius: 4, fontSize: 11, fontWeight: "bold", textAlign: "right" }} />
                            ) : (
                                <div style={{ fontWeight: "bold", fontSize: 14, color: "#1a8a3a" }}>${money(it.subtotal)}</div>
                            )}
                            <div style={{ fontSize: 9, color: "#999" }}>
                                {it.precioManual ? "" : it.modalidad === "caja_pesada" ? `$${money(it.precio_unitario)}/kg` : `$${money(it.precio_unitario)}`}
                            </div>
                        </div>
                    </div>
                    <label style={{ fontSize: 10, display: "inline-flex", alignItems: "center", gap: 3, cursor: "pointer", marginTop: 4 }}>
                        <input type="checkbox" checked={it.precioManual} onChange={() => togglePrecioManual(i)} />
                        Manual
                    </label>
                </div>
            ))}

            {items.length > 0 && (
                <div style={{ textAlign: "right", padding: "8px 0", fontSize: 20, fontWeight: "bold", borderTop: "2px solid #eee", marginTop: 8 }}>
                    Total: ${money(subtotal)}
                </div>
            )}

            {tipoPago === "contado" && items.length > 0 && (
                <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 8 }}>
                    <div style={{ flex: 1 }}>
                        <label style={{ fontSize: 13, color: "#333", fontWeight: "bold", marginBottom: 4, display: "block" }}>Recibí $</label>
                        <input type="number" step="0.01" min="0" value={montoRecibido} onChange={e => setMontoRecibido(e.target.value)}
                            placeholder="0.00" style={{ width: "100%", padding: "10px 12px", border: "2px solid #1a8a3a", borderRadius: 8, fontSize: 18, fontWeight: "bold", boxSizing: "border-box", textAlign: "right" }} />
                    </div>
                    <div style={{ flex: 1, textAlign: "right" }}>
                        <label style={{ fontSize: 13, color: "#333", fontWeight: "bold", marginBottom: 4, display: "block" }}>Cambio</label>
                        <div style={{ fontSize: 24, fontWeight: "bold", color: montoRecibido && (parseFloat(montoRecibido) || 0) < subtotal ? "#d32f2f" : "#1a8a3a" }}>
                            ${tipoPago === "contado" ? Math.max(0, (parseFloat(montoRecibido) || 0) - subtotal).toFixed(2) : "0.00"}
                        </div>
                    </div>
                </div>
            )}

            {msg && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 8, fontSize: 13, margin: "8px 0", background: msg.includes("Error") ? "#fef2f2" : "#e8f5e9", color: msg.includes("Error") ? "#dc2626" : "#1a8a3a" }}>
                    <button onClick={() => setMsg("")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "inherit", padding: 0, lineHeight: 1 }}>✕</button>
                    <span style={{ flex: 1 }}>{msg}</span>
                </div>
            )}

            {items.length > 0 && (
                <button onClick={handlePause} style={{ width: "100%", padding: 12, marginTop: 8, background: "#ff9800", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: "bold", cursor: "pointer" }}>
                    Pausar venta
                </button>
            )}

            <button onClick={cobrar} disabled={!items.length || !bodegaId || (tipoPago === "credito" && !clienteId) || (tipoPago === "contado" && (parseFloat(montoRecibido) || 0) < subtotal)}
                style={{ width: "100%", padding: 14, marginTop: 8, background: items.length && !(tipoPago === "credito" && !clienteId) && !(tipoPago === "contado" && (parseFloat(montoRecibido) || 0) < subtotal) ? "#1a8a3a" : "#ccc", color: "#fff", border: "none", borderRadius: 8, fontSize: 16, fontWeight: "bold", cursor: "pointer" }}>
                Cobrar $ {money(subtotal)}
            </button>

            {pausedSales.length > 0 && (
                <div style={{ marginTop: 12, padding: 12, background: "#fff8e1", borderRadius: 8, border: "1px solid #ffe082" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <strong style={{ fontSize: 13, color: "#ff9800" }}>Pausadas ({pausedSales.length})</strong>
                    </div>
                    {pausedSales.map((ps: any) => {
                        const d = ps.datos_json; const cnt = d?.items?.length || 0;
                        return (
                            <div key={ps.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff8e1", borderRadius: 8, padding: "6px 10px", marginBottom: 4, border: "1px solid #ffe082" }}>
                                <div style={{ fontSize: 11 }}><strong>{cnt} producto(s)</strong><div style={{ color: "#888" }}>{new Date(ps.created_at).toLocaleString()}</div></div>
                                <button onClick={() => handleResume(ps)} style={{ background: "#ff9800", color: "#fff", border: "none", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 11 }}>Reanudar</button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
