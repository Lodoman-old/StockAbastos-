import { money } from "../format";
import React, { useEffect, useState } from "react";
import { get, post, API } from "../services/api";
import { notify } from "../components/Toast";
export function Ventas() {
    const [ventas, setVentas] = useState<any[]>([]);
    const [totales, setTotales] = useState<any>(null);
    const [showPOS, setShowPOS] = useState(false);
    const [cajaAbierta, setCajaAbierta] = useState<boolean | null>(null);
    const [montoApertura, setMontoApertura] = useState("0");
    const [showCobros, setShowCobros] = useState(false);

    const loadVentas = () => { get("/ventas").then(setVentas).catch(() => {}); get("/ventas/totales").then(setTotales).catch(() => {}); };
    useEffect(() => { loadVentas(); get("/cortes/esta-abierto").then(r => setCajaAbierta(r.abierto)).catch(() => setCajaAbierta(true)); }, []);

    async function abrirCaja() {
        try { await post("/cortes/abrir", { monto_inicial: parseFloat(montoApertura) || 0 }); setCajaAbierta(true); }
        catch (e: any) { alert("Error al abrir caja: " + (e.message || "")); }
    }

    return (
        <div>
            {cajaAbierta === false && (
                <div style={{ background: "#fff8e1", border: "1px solid #ffe082", borderRadius: 12, padding: 20, marginBottom: 16 }}>
                    <h4 style={{ margin: "0 0 8px", fontSize: 14 }}>Abrir caja</h4>
                    <p style={{ fontSize: 13, color: "#666", marginBottom: 12 }}>Debes abrir la caja antes de realizar ventas.</p>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <input type="number" step="0.01" min="0" value={montoApertura} onChange={e => setMontoApertura(e.target.value)}
                            style={{ width: 140, padding: "10px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 14 }} />
                        <button onClick={abrirCaja} style={{ padding: "10px 20px", background: "#ff9800", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: "bold" }}>Abrir caja</button>
                    </div>
                </div>
            )}

            <div className="page-heading" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 8, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <h1 style={{ margin: 0 }}>Ventas del día</h1>
                    {cajaAbierta !== null && (
                        <div style={{
                            display: "inline-flex", alignItems: "center", gap: 6,
                            padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: "bold",
                            background: cajaAbierta ? "#e8f5e9" : "#fef2f2",
                            color: cajaAbierta ? "#1a8a3a" : "#dc2626",
                            border: cajaAbierta ? "1px solid #a5d6a7" : "1px solid #fecaca",
                            whiteSpace: "nowrap",
                        }}>
                            <span style={{ width: 8, height: 8, borderRadius: "50%", background: cajaAbierta ? "#4caf50" : "#ef4444" }} />
                            {cajaAbierta ? "Caja abierta" : "Caja cerrada"}
                        </div>
                    )}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => setShowCobros(true)}
                        style={{ background: "#ff9800", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: "bold" }}>Pagar créditos</button>
                    <button onClick={() => setShowPOS(true)}
                        style={{ background: "#1a8a3a", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontSize: 14 }}>+ Nueva Venta</button>
                </div>
            </div>

            {totales && (
                <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
                    {[{ label: "Ventas hoy", value: totales.total_ingresos, bg: "#e8f5e9", color: "#1a8a3a" },
                      { label: "Crédito hoy", value: totales.total_credito, bg: "#fff8e1", color: "#ff9800" },
                      { label: "Pendiente", value: totales.total_pendiente, bg: "#fef2f2", color: "#d32f2f" },
                      { label: "Transacciones", value: totales.total_ventas, bg: "#e3f2fd", color: "#1976d2" },
                    ].map(s => (
                        <div key={s.label} style={{ background: s.bg, borderRadius: 8, padding: "10px 16px", flex: 1, minWidth: 120 }}>
                            <span style={{ fontSize: 12, color: "#555" }}>{s.label}</span>
                            <div style={{ fontSize: 22, fontWeight: "bold", color: s.color }}>{s.label === "Transacciones" ? (typeof s.value === "number" ? s.value : parseFloat(s.value || 0)) : `$${typeof s.value === "number" ? s.value.toFixed(2) : parseFloat(s.value || 0).toFixed(2)}`}</div>
                        </div>
                    ))}
                </div>
            )}

            {showPOS && <POSFormMayoreo onClose={() => setShowPOS(false)} onDone={() => { setShowPOS(false); loadVentas(); }} />}

            {showCobros && <CobrosModal onClose={() => setShowCobros(false)} onDone={() => loadVentas()} />}

            <div style={{ overflowX: "auto", marginTop: 16 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: 8, overflow: "hidden", minWidth: 650 }}>
                    <thead>
                        <tr style={{ background: "#f5f5f5", textAlign: "left" }}>
                            <th style={{ padding: 12 }}>Folio</th><th style={{ padding: 12 }}>Bodega</th>
                            <th style={{ padding: 12 }}>Total</th><th style={{ padding: 12 }}>Tipo</th><th style={{ padding: 12 }}>Fecha</th>
                            <th style={{ padding: 12, width: 60 }}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {ventas.map((v: any) => (
                            <tr key={v.id} style={{ borderTop: "1px solid #eee" }}>
                                <td style={{ padding: 12 }}><strong>{v.folio}</strong></td>
                                <td style={{ padding: 12 }}>{v.bodega_nombre}</td>
                                <td style={{ padding: 12, fontWeight: "bold" }}>${money(v.total || 0)}</td>
                                <td style={{ padding: 12 }}>
                                    {v.tipo_pago === "credito" ? (
                                        <span style={{ color: "#ff9800", fontWeight: "bold" }}>
                                            Crédito {v.saldo_pendiente > 0 ? `($${money(v.saldo_pendiente)})` : "(pagado)"}
                                        </span>
                                    ) : <span style={{ color: "#4caf50" }}>Contado</span>}
                                </td>
                                <td style={{ padding: 12, whiteSpace: "nowrap" }}>{new Date(v.created_at).toLocaleString()}</td>
                                <td style={{ padding: 12 }}>
                                    <button onClick={(e) => { e.stopPropagation(); window.open(`/api/ticket/${v.id}?token=${localStorage.getItem("token")}`, "_blank"); }}
                                        style={{ background: "#1565c0", color: "#fff", border: "none", borderRadius: 6, padding: "4px 8px", cursor: "pointer", fontSize: 11, fontWeight: "bold" }}>Ticket</button>
                                </td>
                            </tr>
                        ))}
                        {!ventas.length && <tr><td colSpan={6} style={{ padding: 24, textAlign: "center", color: "#999" }}>No hay ventas</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function POSFormMayoreo({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
    const [bodegas, setBodegas] = useState<any[]>([]);
    const [bodegaId, setBodegaId] = useState("");
    const [productos, setProductos] = useState<any[]>([]);
    const [items, setItems] = useState<any[]>([]);
    const [msg, setMsg] = useState("");
    const [tipoPago, setTipoPago] = useState<"contado" | "credito">("contado");
    const [clientes, setClientes] = useState<any[]>([]);
    const [clienteId, setClienteId] = useState("");
    const [fechaVenc, setFechaVenc] = useState("");
    const [montoRecibido, setMontoRecibido] = useState("");
    const [pausedSales, setPausedSales] = useState<any[]>([]);
    const [showPaused, setShowPaused] = useState(false);
    const [search, setSearch] = useState("");

    useEffect(() => {
        get("/bodegas").then((b: any[]) => {
            const filtradas = b.filter((x: any) => !x.es_mostrador);
            setBodegas(filtradas);
            if (!bodegaId) {
                const def = filtradas.find((x: any) => x.es_default);
                setBodegaId(def?.id || filtradas[0]?.id || "");
            }
        }).catch(() => {});
        get("/clientes").then(setClientes).catch(() => {});
        get("/ventas/pausadas").then(setPausedSales).catch(() => {});
    }, []);

    useEffect(() => { if (bodegaId) get(`/ventas/productos-disponibles?bodega_id=${bodegaId}`).then(setProductos).catch(() => {}); }, [bodegaId]);

    const filtered = productos.filter(p =>
        !search || p.producto_nombre?.toLowerCase().includes(search.toLowerCase()) || p.sku?.toLowerCase().includes(search.toLowerCase())
    );

    async function addVentaCompleta(p: any, modalidad: string) {
        try {
            const res = await get(`/ventas/tarima-completa-info?producto_id=${p.producto_id}&bodega_id=${bodegaId}`);
            const cajasRestantes = res.cajas_restantes || 0;
            if (cajasRestantes <= 0) { notify("No hay tarimas completas para este producto. Agrega manualmente o trae más tarimas del almacén.", "error"); return; }
            const bodega = bodegas.find((b: any) => b.id === bodegaId);
            const itemBase: any = { producto_id: p.producto_id, producto_nombre: p.producto_nombre, modalidad, destare_kg: parseFloat(p.destare_kg || 0), precioManual: false, precioEditado: 0, bodega_id: bodegaId, bodega_nombre: bodega?.nombre || "", vender_completa: true };
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
        } catch (e: any) { notify("Error: " + e.message, "error"); }
    }

    function addItem(p: any, modalidad: string) {
        const existingIdx = items.findIndex(i => i.producto_id === p.producto_id && i.modalidad === modalidad);
        if (existingIdx >= 0) {
            setItems(items.map((it, idx) => {
                if (idx !== existingIdx) return it;
                if (modalidad === "caja_pesada") {
                    const newCajas = (it.cajas || 0) + 1;
                    const destareTotal = it.destare_kg * newCajas;
                    const netKg = Math.max(0, (it.peso_bruto || 0) - destareTotal);
                    return { ...it, cajas: newCajas, cantidad: netKg, subtotal: netKg * it.precio_unitario };
                } else {
                    const newCant = (it.cantidad || 0) + 1;
                    return { ...it, cantidad: newCant, subtotal: newCant * it.precio_unitario };
                }
            }));
            return;
        }
        const bodega = bodegas.find((b: any) => b.id === bodegaId);
        const itemBase: any = { producto_id: p.producto_id, producto_nombre: p.producto_nombre, modalidad, destare_kg: parseFloat(p.destare_kg || 0), precioManual: false, precioEditado: 0, bodega_id: bodegaId, bodega_nombre: bodega?.nombre || "" };
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
            const sub = netKg * it.precio_unitario;
            return { ...it, cajas: c, cantidad: netKg, subtotal: sub };
        }));
    }

    function updateItemPesoBruto(i: number, peso: number) {
        setItems(items.map((it, idx) => {
            if (idx !== i) return it;
            const pb = Math.max(0, peso);
            const destareTotal = it.destare_kg * (it.cajas || 0);
            const netKg = Math.max(0, pb - destareTotal);
            const sub = netKg * it.precio_unitario;
            return { ...it, peso_bruto: pb, cantidad: netKg, subtotal: sub };
        }));
    }

    function updateItemCantidad(i: number, nuevaCantidad: number) {
        setItems(items.map((it, idx) => idx === i ? { ...it, cantidad: nuevaCantidad, subtotal: nuevaCantidad * it.precio_unitario } : it));
    }

    function updateItemPrecio(i: number, nuevoPrecio: number) {
        setItems(items.map((it, idx) => idx === i ? { ...it, precio_unitario: nuevoPrecio, subtotal: (it.modalidad === "caja_pesada" ? (it.cantidad || 0) : it.cantidad) * nuevoPrecio, precioEditado: nuevoPrecio } : it));
    }

    function togglePrecioManual(i: number) {
        setItems(items.map((it, idx) => idx === i ? { ...it, precioManual: !it.precioManual } : it));
    }

    const subtotal = items.reduce((s, i) => s + i.subtotal, 0);

    const handlePause = async () => {
        if (!items.length) return;
        try {
            await post("/ventas/pausar", { bodega_id: bodegaId, items: items.map(i => ({ ...i })) });
            setMsg("Venta pausada"); setItems([]);
            get("/ventas/pausadas").then(setPausedSales).catch(() => {});
        } catch (e: any) { setMsg("Error: " + (e.message || "")); }
    };

    const handleResume = (paused: any) => {
        const d = paused.datos_json;
        if (!d?.items?.length) return;
        setBodegaId(d.bodega_id || bodegas[0]?.id || "");
        setItems(d.items);
        fetch(`${API}/ventas/pausadas/${paused.id}`, { method: "DELETE", headers: { Authorization: "Bearer " + localStorage.getItem("token") } }).catch(() => {});
        setPausedSales((prev: any[]) => prev.filter(p => p.id !== paused.id));
        setMsg("Venta reanudada");
    };

    const handleSubmit = async () => {
        if (!bodegaId || !items.length) return;
        if (tipoPago === "credito" && !clienteId) { setMsg("Selecciona un cliente"); return; }
        const cambio = tipoPago === "contado" ? Math.max(0, (parseFloat(montoRecibido) || 0) - subtotal) : 0;
        try {
            const venta = await post("/ventas", {
                bodega_id: bodegaId, tipo_pago: tipoPago, cliente_id: tipoPago === "credito" ? clienteId : undefined,
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
            setMsg(`Venta ${venta.folio} registrada`);
            setTimeout(() => { window.open(`/api/ticket/${venta.id}?token=${localStorage.getItem("token")}`, "_blank"); onDone(); }, 1000);
        } catch (e: any) { setMsg("Error: " + (e.message || "")); }
    };

    const labelModalidad: Record<string, string> = {
        caja_pesada: "Caja pesada", caja_sellada_entera: "Caja sellada entera",
        caja_sellada_media: "Media caja sellada", unidad: "Unidad",
    };

    return (
        <div className="modal-overlay" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }} onClick={onClose}>
            <div className="modal-content" style={{ background: "#fff", borderRadius: 16, width: 1000, maxWidth: 1000, height: "90vh", display: "flex", flexDirection: "column", overflow: "hidden" }} onClick={e => e.stopPropagation()}>
                <div style={{ padding: "16px 20px 0 20px", flexShrink: 0 }}>
                    <h3 style={{ marginBottom: 10 }}>Nueva Venta — Mayoreo</h3>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
                        <div style={{ flex: 1, minWidth: 160 }}>
                            <label style={{ fontSize: 12, color: "#555" }}>Bodega</label>
                            <select value={bodegaId} onChange={e => setBodegaId(e.target.value)}
                                style={{ width: "100%", padding: "7px 10px", border: "1px solid #ddd", borderRadius: 8, fontSize: 13, boxSizing: "border-box" }}>
                                {bodegas.map((b: any) => <option key={b.id} value={b.id}>{b.nombre}{b.es_default ? " (Default)" : ""}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={{ fontSize: 12, color: "#555" }}>Pago</label>
                            <div style={{ display: "flex", gap: 4 }}>
                                <button onClick={() => { setTipoPago("contado"); setClienteId(""); }}
                                    style={{ padding: "7px 10px", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: "bold", fontSize: 12, background: tipoPago === "contado" ? "#1a8a3a" : "#e0e0e0", color: tipoPago === "contado" ? "#fff" : "#333" }}>Contado</button>
                                <button onClick={() => setTipoPago("credito")}
                                    style={{ padding: "7px 10px", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: "bold", fontSize: 12, background: tipoPago === "credito" ? "#ff9800" : "#e0e0e0", color: tipoPago === "credito" ? "#fff" : "#333" }}>Crédito</button>
                            </div>
                        </div>
                        {tipoPago === "credito" && (
                            <>
                                <div style={{ flex: 1, minWidth: 150 }}>
                                    <label style={{ fontSize: 12, color: "#555" }}>Cliente *</label>
                                    <select value={clienteId} onChange={e => setClienteId(e.target.value)}
                                        style={{ width: "100%", padding: "7px 10px", border: "1px solid #ddd", borderRadius: 8, fontSize: 13, boxSizing: "border-box" }}>
                                        <option value="">Seleccionar</option>
                                        {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                    </select>
                                </div>
                                <div style={{ minWidth: 130 }}>
                                    <label style={{ fontSize: 12, color: "#555" }}>Vence</label>
                                    <input type="date" value={fechaVenc} onChange={e => setFechaVenc(e.target.value)}
                                        style={{ width: "100%", padding: "7px 10px", border: "1px solid #ddd", borderRadius: 8, fontSize: 13, boxSizing: "border-box" }} />
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <div className="pos-layout" style={{ flex: 1, display: "flex", overflow: "hidden" }}>
                    <div className="pos-products" style={{ width: "45%", display: "flex", flexDirection: "column", borderRight: "1px solid #eee" }}>
                        <div style={{ padding: "4px 12px" }}>
                            <input placeholder="Buscar producto..." value={search} onChange={e => setSearch(e.target.value)}
                                style={{ width: "100%", padding: "8px", border: "2px solid #1a8a3a", borderRadius: 8, fontSize: 13, boxSizing: "border-box", margin: "4px 0 8px 0" }} />
                        </div>
                        <div className="scroll-inner" style={{ flex: 1, overflowY: "auto", padding: "0 4px" }}>
                            <table className="responsive-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                                <thead>
                                    <tr style={{ background: "#f5f5f5", textAlign: "left", position: "sticky", top: 0 }}>
                                        <th style={{ padding: "6px 4px" }}>Producto</th>
                                        <th style={{ padding: "6px 4px", textAlign: "center", width: 50 }}>Cajas</th>
                                        <th style={{ padding: "6px 4px", textAlign: "center", width: 80 }}>Precio</th>
                                        <th style={{ padding: "6px 4px", textAlign: "center", width: 90 }}>Acción</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map(p => {
                                        const disp = Number(p.cajas_disponibles || 0);
                                        const parc = Number(p.cajas_parciales || 0);
                                        const totalDisponibles = disp + parc;
                                        const primModalidad = p.modalidad_caja_pesada ? "caja_pesada" : p.modalidad_caja_sellada ? "caja_sellada_entera" : "unidad";
                                        return (
                                        <tr key={p.producto_id} onClick={() => totalDisponibles > 0 && addItem(p, primModalidad)}
                                            style={{ borderTop: "1px solid #f0f0f0", background: totalDisponibles === 0 ? "#fff5f5" : "#fff", cursor: totalDisponibles > 0 ? "pointer" : "default" }}>
                                            <td data-label="Producto" style={{ padding: "5px 4px", fontWeight: "bold", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={p.producto_nombre}>
                                                {p.producto_nombre}
                                                {p.tarimas_parciales > 0 && <span style={{ color: "#9c27b0", fontWeight: "normal", fontSize: 10, marginLeft: 4 }}>⚠{p.tarimas_parciales} tarima{p.tarimas_parciales > 1 ? "s" : ""}</span>}
                                            </td>
                                            <td data-label="Cajas" style={{ padding: "5px 4px", textAlign: "center", color: totalDisponibles === 0 ? "#ef5350" : "#333", fontWeight: "bold" }}>
                                                {totalDisponibles}

                                            </td>
                                            <td data-label="Precio" style={{ padding: "5px 4px", textAlign: "center", fontSize: 11, color: "#555" }}>
                                                {p.modalidad_caja_pesada && `$${money(p.precio_mayoreo_kg_hoy || p.precio_mayoreo_kg)}/kg`}
                                                {p.modalidad_caja_sellada && !p.modalidad_caja_pesada && `$${money(p.precio_caja_sellada_hoy || p.precio_caja_sellada)}`}
                                            </td>
                                            <td data-label="Acción" style={{ padding: "5px 4px", textAlign: "center" }}>
                                                <div style={{ display: "flex", gap: 2, justifyContent: "center", flexWrap: "wrap", alignItems: "center" }}>
                                                    {p.modalidad_caja_pesada && <button onClick={e => { e.stopPropagation(); addItem(p, "caja_pesada"); }} disabled={totalDisponibles === 0}
                                                        style={{ padding: "2px 6px", background: "#e3f2fd", color: "#1565c0", border: "none", borderRadius: 4, cursor: totalDisponibles === 0 ? "not-allowed" : "pointer", fontSize: 10, fontWeight: "bold", opacity: totalDisponibles === 0 ? 0.4 : 1 }}>CP</button>}
                                                    {p.modalidad_caja_sellada && <button onClick={e => { e.stopPropagation(); addItem(p, "caja_sellada_entera"); }} disabled={totalDisponibles === 0}
                                                        style={{ padding: "2px 6px", background: "#e8f5e9", color: "#2e7d32", border: "none", borderRadius: 4, cursor: totalDisponibles === 0 ? "not-allowed" : "pointer", fontSize: 10, fontWeight: "bold", opacity: totalDisponibles === 0 ? 0.4 : 1 }}>CS</button>}
                                                    {p.modalidad_caja_sellada && <button onClick={e => { e.stopPropagation(); addItem(p, "caja_sellada_media"); }} disabled={totalDisponibles === 0}
                                                        style={{ padding: "2px 6px", background: "#fff3e0", color: "#e65100", border: "none", borderRadius: 4, cursor: totalDisponibles === 0 ? "not-allowed" : "pointer", fontSize: 10, fontWeight: "bold", opacity: totalDisponibles === 0 ? 0.4 : 1 }}>½</button>}
                                                    {p.modalidad_unidad && <button onClick={e => { e.stopPropagation(); addItem(p, "unidad"); }} disabled={totalDisponibles === 0}
                                                        style={{ padding: "2px 6px", background: "#f3e5f5", color: "#7b1fa2", border: "none", borderRadius: 4, cursor: totalDisponibles === 0 ? "not-allowed" : "pointer", fontSize: 10, fontWeight: "bold", opacity: totalDisponibles === 0 ? 0.4 : 1 }}>UD</button>}
                                                    {totalDisponibles > 0 && <button onClick={e => { e.stopPropagation(); addVentaCompleta(p, primModalidad); }}
                                                        title="Vender tarima completa"
                                                        style={{ padding: "2px 6px", background: "#1a8a3a", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 9, fontWeight: "bold" }}>VTC</button>}
                                                </div>
                                            </td>
                                        </tr>
                                        );
                                    })}
                                    {!filtered.length && <tr><td colSpan={4} style={{ padding: 20, textAlign: "center", color: "#999" }}>Sin productos disponibles</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="pos-cart" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                        <div className="scroll-inner" style={{ flex: 1, overflowY: "auto", padding: "4px 8px" }}>
                            {!items.length && <p style={{ color: "#999", textAlign: "center", padding: 40, fontSize: 13 }}>Selecciona productos del panel izquierdo</p>}
                            {items.length > 0 && (
                                <table className="cart-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                                    <thead>
                                        <tr style={{ background: "#f5f5f5", textAlign: "left", position: "sticky", top: 0 }}>
                                            <th style={{ padding: "6px 4px", width: 55 }}>Cant.</th>
                                            <th style={{ padding: "6px 4px" }}>Producto</th>
                                            <th style={{ padding: "6px 4px", width: 95 }}>Peso/Caja</th>
                                            <th style={{ padding: "6px 4px", width: 75, textAlign: "right" }}>Total</th>
                                            <th style={{ padding: "6px 4px", width: 24 }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items.map((it, i) => (
                                            <tr key={i} style={{ borderTop: "1px solid #f0f0f0", verticalAlign: "top" }}>
                                                <td data-label="Cant." style={{ padding: "4px" }}>
                                                    {it.modalidad === "caja_pesada" ? (
                                                        <input type="number" step={1} min={0}
                                                            value={it.cajas}
                                                            onChange={e => updateItemCajas(i, parseInt(e.target.value) || 0)}
                                                            style={{ width: 46, padding: "3px 4px", border: "1px solid #ddd", borderRadius: 4, fontSize: 12, textAlign: "right" }} />
                                                    ) : (
                                                        <input type="number" step={1} min={0}
                                                            value={it.cantidad}
                                                            onChange={e => updateItemCantidad(i, parseFloat(e.target.value) || 0)}
                                                            style={{ width: 46, padding: "3px 4px", border: "1px solid #ddd", borderRadius: 4, fontSize: 12, textAlign: "right" }} />
                                                    )}
                                                </td>
                                                <td data-label="Producto" style={{ padding: "4px", lineHeight: 1.3 }}>
                                                    <strong>{it.producto_nombre}</strong>
                                                    <div style={{ fontSize: 10, color: "#888" }}>
                                                        {labelModalidad[it.modalidad]}
                                                        {it.bodega_nombre && <span> — {it.bodega_nombre}</span>}
                                                    </div>
                                                    <label style={{ fontSize: 9, display: "inline-flex", alignItems: "center", gap: 2, cursor: "pointer", marginTop: 1 }}>
                                                        <input type="checkbox" checked={it.precioManual} onChange={() => togglePrecioManual(i)} style={{ cursor: "pointer" }} />
                                                        Manual
                                                    </label>
                                                </td>
                                                <td data-label="Peso" style={{ padding: "4px", fontSize: 11, textAlign: "right" }}>
                                                    {it.modalidad === "caja_pesada" ? (
                                                        <>
                                                            <input type="number" step={0.01} min={0}
                                                                value={it.peso_bruto}
                                                                onChange={e => updateItemPesoBruto(i, parseFloat(e.target.value) || 0)}
                                                                style={{ width: 60, padding: "2px 4px", border: "1px solid #ddd", borderRadius: 4, fontSize: 11, textAlign: "right" }}
                                                                placeholder="bruto kg" />
                                                            <div style={{ fontSize: 10, color: "#888", whiteSpace: "nowrap" }}>
                                                                dest {(it.destare_kg * (it.cajas || 0)).toFixed(1)}kg
                                                            </div>
                                                            <div style={{ fontSize: 10, fontWeight: "bold", whiteSpace: "nowrap" }}>
                                                                neto {it.cantidad.toFixed(2)}kg
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <span style={{ fontWeight: "bold", fontSize: 12 }}>
                                                            {it.modalidad === "caja_sellada_media" ? "½" : `${it.cantidad}`} {it.modalidad === "unidad" ? "pz" : "cja"}
                                                        </span>
                                                    )}
                                                </td>
                                                <td data-label="Total" style={{ padding: "4px", textAlign: "right", verticalAlign: "middle" }}>
                                                    {it.precioManual ? (
                                                        <input type="number" step={0.01} min={0}
                                                            value={it.precioEditado}
                                                            onChange={e => updateItemPrecio(i, parseFloat(e.target.value) || 0)}
                                                            style={{ width: 60, padding: "2px 4px", border: "2px solid #ff9800", borderRadius: 4, fontSize: 11, fontWeight: "bold", textAlign: "right" }} />
                                                    ) : (
                                                        <div style={{ fontWeight: "bold", fontSize: 13, color: "#1a8a3a" }}>${money(it.subtotal)}</div>
                                                    )}
                                                    <div style={{ fontSize: 9, color: "#999" }}>
                                                        {it.precioManual ? "" : it.modalidad === "caja_pesada" ? `$${money(it.precio_unitario)}/kg` : `$${money(it.precio_unitario)}`}
                                                    </div>
                                                </td>
                                                <td data-label="" style={{ padding: "4px" }}>
                                                    <button onClick={() => removeItem(i)} style={{ background: "none", border: "none", color: "#f44336", cursor: "pointer", fontSize: 14, padding: 0 }}>×</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}

                            {pausedSales.length > 0 && (
                                <div style={{ marginTop: 6 }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                                        <strong style={{ fontSize: 13, color: "#ff9800" }}>Pausadas ({pausedSales.length})</strong>
                                        <button onClick={() => setShowPaused(!showPaused)} style={{ background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: 12 }}>{showPaused ? "Ocultar" : "Ver"}</button>
                                    </div>
                                    {showPaused && pausedSales.map((ps: any) => {
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
                    </div>
                </div>

                <div style={{ padding: "10px 20px 16px 20px", borderTop: "2px solid #eee", flexShrink: 0, background: "#fff" }}>
                    {items.length > 0 && (
                        <div style={{ textAlign: "right", fontSize: 20, fontWeight: "bold", marginBottom: 6 }}>Total: ${money(subtotal)}</div>
                    )}
                    {tipoPago === "contado" && items.length > 0 && (
                        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: 13, color: "#333", fontWeight: "bold" }}>Recibí $</label>
                                <input type="number" step="0.01" min="0" value={montoRecibido}
                                    onChange={e => setMontoRecibido(e.target.value)}
                                    style={{ width: "100%", padding: "10px 12px", border: "2px solid #1a8a3a", borderRadius: 8, fontSize: 18, fontWeight: "bold", boxSizing: "border-box", textAlign: "right" }} />
                            </div>
                            <div style={{ flex: 1, textAlign: "right" }}>
                                <label style={{ fontSize: 13, color: "#333", fontWeight: "bold" }}>Cambio</label>
                                <div style={{ fontSize: 24, fontWeight: "bold", color: montoRecibido && (parseFloat(montoRecibido) || 0) < subtotal ? "#d32f2f" : "#1a8a3a" }}>
                                    ${tipoPago === "contado" ? Math.max(0, (parseFloat(montoRecibido) || 0) - subtotal).toFixed(2) : "0.00"}
                                </div>
                            </div>
                        </div>
                    )}
                    {msg && <div style={{ padding: 6, borderRadius: 8, fontSize: 12, background: msg.includes("Error") ? "#fef2f2" : "#e8f5e9", color: msg.includes("Error") ? "#dc2626" : "#1a8a3a", marginBottom: 6 }}>{msg}</div>}
                    <div className="btn-group" style={{ display: "flex", gap: 8 }}>
                        <button onClick={handleSubmit} disabled={!items.length || (tipoPago === "credito" && !clienteId) || (tipoPago === "contado" && (parseFloat(montoRecibido) || 0) < subtotal)}
                            style={{ flex: 1, padding: 10, background: items.length && !(tipoPago === "credito" && !clienteId) && !(tipoPago === "contado" && (parseFloat(montoRecibido) || 0) < subtotal) ? "#1a8a3a" : "#ccc", color: "#fff", border: "none", borderRadius: 8, cursor: items.length && !(tipoPago === "credito" && !clienteId) && !(tipoPago === "contado" && (parseFloat(montoRecibido) || 0) < subtotal) ? "pointer" : "not-allowed", fontSize: 14, fontWeight: "bold" }}>
                            Cobrar ${money(subtotal)}
                        </button>
                        {items.length > 0 && <button onClick={handlePause} style={{ background: "#ff9800", color: "#fff", border: "none", borderRadius: 8, padding: "10px 14px", cursor: "pointer", fontSize: 13, fontWeight: "bold" }}>Pausar</button>}
                        <button onClick={onClose} style={{ background: "#ccc", border: "none", borderRadius: 8, padding: "10px 14px", cursor: "pointer", fontSize: 13 }}>Cancelar</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function CobrosModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
    const [creditos, setCreditos] = useState<any[]>([]);
    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState<any>(null);
    const [pagoMonto, setPagoMonto] = useState("");
    const [pagosPrev, setPagosPrev] = useState<any[]>([]);

    useEffect(() => { get("/reportes/creditos?estado=pendiente").then(setCreditos).catch(() => {}); }, []);

    const filtered = creditos.filter(c => !search || (c.cliente_nombre || "").toLowerCase().includes(search.toLowerCase()));

    const selectVenta = async (v: any) => {
        setSelected(v); setPagoMonto("");
        try { setPagosPrev(await get(`/pagos/venta/${v.venta_id}`)); } catch { setPagosPrev([]); }
    };

    const handlePagar = async () => {
        if (!pagoMonto || parseFloat(pagoMonto) <= 0) return alert("Monto inválido");
        if (parseFloat(pagoMonto) > parseFloat(selected.saldo_pendiente)) return alert("Excede el saldo");
        try {
            const resp = await post("/pagos", { venta_id: selected.venta_id, monto: parseFloat(pagoMonto) });
            if (resp?.id) { window.open(`/api/ticket/pago/${resp.id}?token=${localStorage.getItem("token")}`, "_blank"); }
            onDone(); onClose();
        } catch (e: any) { alert("Error: " + (e.message || e)); }
    };

    return (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }} onClick={onClose}>
            <div style={{ background: "#fff", borderRadius: 16, padding: 24, maxWidth: 600, width: "95%" }} onClick={e => e.stopPropagation()}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <h3 style={{ margin: 0 }}>Pagar créditos</h3>
                    <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#888" }}>✕</button>
                </div>
                <input placeholder="Buscar cliente..." value={search} onChange={e => setSearch(e.target.value)}
                    style={{ width: "100%", padding: "8px 12px", border: "1px solid #ddd", borderRadius: 8, marginBottom: 12, boxSizing: "border-box" }} />
                {!selected ? (
                    <div style={{ maxHeight: 400, overflow: "auto" }}>
                        {filtered.map(c => (
                            <div key={c.venta_id} onClick={() => selectVenta(c)} style={{ padding: "10px 12px", borderBottom: "1px solid #eee", cursor: "pointer", background: "#fafafa", borderRadius: 8, marginBottom: 4 }}>
                                <div style={{ fontWeight: "bold", fontSize: 14 }}>{c.cliente_nombre || "Sin nombre"}</div>
                                <div style={{ fontSize: 12, color: "#666" }}>Folio: {c.folio} — <strong style={{ color: "#d32f2f" }}>$${money(c.saldo_pendiente)}</strong></div>
                                <div style={{ fontSize: 11, color: "#999" }}>Vence: {c.fecha_vencimiento ? new Date(c.fecha_vencimiento).toLocaleDateString("es-MX") : "N/A"}</div>
                            </div>
                        ))}
                        {!filtered.length && <div style={{ textAlign: "center", color: "#999", padding: 20 }}>Sin créditos pendientes</div>}
                    </div>
                ) : (
                    <>
                        <div style={{ background: "#fff3e0", borderRadius: 8, padding: 12, marginBottom: 12 }}>
                            <div style={{ fontWeight: "bold", fontSize: 15 }}>{selected.cliente_nombre}</div>
                            <div style={{ fontSize: 13, color: "#555", marginTop: 4 }}>Folio: {selected.folio} | ${money(selected.total)} | Vence: {selected.fecha_vencimiento ? new Date(selected.fecha_vencimiento).toLocaleDateString("es-MX") : "N/A"}</div>
                            <div style={{ fontSize: 16, fontWeight: "bold", marginTop: 6, color: "#d32f2f" }}>Saldo: ${money(selected.saldo_pendiente)}</div>
                        </div>
                        {pagosPrev.length > 0 && <div style={{ marginBottom: 12 }}>
                            <strong style={{ fontSize: 13 }}>Pagos anteriores:</strong>
                            {pagosPrev.map((p: any) => <div key={p.id} style={{ fontSize: 12, color: "#555", marginTop: 4 }}>{new Date(p.fecha).toLocaleDateString("es-MX")} — ${money(p.monto)}</div>)}
                        </div>}
                        <div style={{ marginBottom: 12 }}>
                            <label style={{ fontSize: 13 }}>Monto a pagar ($)</label>
                            <input type="number" step="0.01" min="0" max={selected.saldo_pendiente} value={pagoMonto}
                                onChange={e => setPagoMonto(e.target.value)}
                                style={{ width: "100%", padding: "10px 12px", border: "2px solid #ff9800", borderRadius: 8, fontSize: 18, fontWeight: "bold", boxSizing: "border-box" }} />
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                            <button onClick={handlePagar} style={{ flex: 1, padding: "10px", background: "#ff9800", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: "bold" }}>Pagar</button>
                            <button onClick={() => setSelected(null)} style={{ padding: "10px 20px", background: "#888", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}>Volver</button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}


