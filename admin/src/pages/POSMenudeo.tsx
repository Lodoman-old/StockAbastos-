import { money } from "../format";
import React, { useEffect, useState } from "react";
import { get, post } from "../services/api";
import { notify } from "../components/Toast";
interface CartItem {
    producto_id: string;
    producto_nombre: string;
    sku: string;
    cantidad_kg: number;
    cantidad_piezas: number;
    precio_unitario: number;
    subtotal: number;
    es_kilo: boolean;
    precioManual?: boolean;
    precioEditado?: number;
}

export function POSMenudeo() {
    const [stock, setStock] = useState<any[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [search, setSearch] = useState("");
    const [paying, setPaying] = useState(false);
    const [pagoEfectivo, setPagoEfectivo] = useState("");
    const [ventaOk, setVentaOk] = useState<any>(null);
    const [pausedSales, setPausedSales] = useState<any[]>([]);
    const [showPaused, setShowPaused] = useState(false);
    const [msg, setMsg] = useState("");
    const [cajaAbierta, setCajaAbierta] = useState<boolean | null>(null);

    useEffect(() => {
        get("/cortes/esta-abierto").then((r: any) => setCajaAbierta(r.abierto)).catch(() => setCajaAbierta(false));
        get("/mostrador/stock").then(setStock).catch(() => {});
        get("/ventas/pausadas").then(setPausedSales).catch(() => {});
    }, []);

    const total = cart.reduce((s, i) => s + i.subtotal, 0);

    const filtered = stock.filter(s =>
        !search || s.producto_nombre.toLowerCase().includes(search.toLowerCase()) || (s.sku || "").toLowerCase().includes(search.toLowerCase())
    );

    const addKg = (prod: any) => {
        const existing = cart.find(i => i.producto_id === prod.producto_id);
        if (existing) {
            setCart(cart.map(i => i.producto_id === prod.producto_id
                ? { ...i, cantidad_kg: i.cantidad_kg + 1, subtotal: (i.cantidad_kg + 1) * i.precio_unitario }
                : i
            ));
        } else {
            const pu = parseFloat(prod.precio_menudeo_kg_hoy || prod.precio_menudeo_kg || 0);
            setCart([...cart, {
                producto_id: prod.producto_id, producto_nombre: prod.producto_nombre,
                sku: prod.sku, cantidad_kg: 1, cantidad_piezas: 0,
                precio_unitario: pu, subtotal: pu, es_kilo: true,
            }]);
        }
    };

    const addPz = (prod: any) => {
        const existing = cart.find(i => i.producto_id === prod.producto_id);
        if (existing) {
            setCart(cart.map(i => i.producto_id === prod.producto_id
                ? { ...i, cantidad_piezas: i.cantidad_piezas + 1, subtotal: (i.cantidad_piezas + 1) * i.precio_unitario }
                : i
            ));
        } else {
            const pu = parseFloat(prod.precio_unidad_hoy || prod.precio_por_unidad || 0);
            setCart([...cart, {
                producto_id: prod.producto_id, producto_nombre: prod.producto_nombre,
                sku: prod.sku, cantidad_kg: 0, cantidad_piezas: 1,
                precio_unitario: pu, subtotal: pu, es_kilo: false,
            }]);
        }
    };

    const updateKg = (id: string, kg: number) => {
        setCart(cart.map(i => i.producto_id === id
            ? { ...i, cantidad_kg: Math.max(0, kg), subtotal: Math.max(0, kg) * i.precio_unitario }
            : i
        ));
    };

    const updatePz = (id: string, pz: number) => {
        setCart(cart.map(i => i.producto_id === id
            ? { ...i, cantidad_piezas: Math.max(0, pz), subtotal: Math.max(0, pz) * i.precio_unitario }
            : i
        ));
    };

    const removeItem = (id: string) => setCart(cart.filter(i => i.producto_id !== id));

    const cobrar = async () => {
        if (!cart.length) return notify("Agrega productos al carrito", "error");

        const items = cart.map(i => ({
            producto_id: i.producto_id,
            cantidad_kg: i.cantidad_kg || undefined,
            cantidad_piezas: i.cantidad_piezas || undefined,
            precio_unitario: i.precio_unitario,
            subtotal: i.subtotal,
        }));

        try {
            const result = await post("/ventas/menudeo", {
                items,
                tipo_pago: "contado",
                monto_efectivo: pagoEfectivo ? parseFloat(pagoEfectivo) : total,
                monto_cambio: pagoEfectivo ? Math.max(0, parseFloat(pagoEfectivo) - total) : 0,
            });
            setVentaOk(result);
            setCart([]);
            setPaying(false);
            setPagoEfectivo("");
            get("/mostrador/stock").then(setStock);
            notify(`Venta ${result.folio} registrada`, "success");
            setTimeout(() => { window.open(`/api/ticket/${result.id}?token=${localStorage.getItem("token")}`, "_blank"); }, 1000);
        } catch (e: any) {
            notify("Error: " + (e.message || ""), "error");
        }
    };

    const handlePause = async () => {
        if (!cart.length) return;
        try {
            await post("/ventas/pausar", { items: cart.map(i => ({
                producto_id: i.producto_id, cantidad_kg: i.cantidad_kg,
                cantidad_piezas: i.cantidad_piezas, precio_unitario: i.precio_unitario,
                subtotal: i.subtotal, producto_nombre: i.producto_nombre, es_kilo: i.es_kilo,
            }))});
            setCart([]);
            setPaying(false);
            setPagoEfectivo("");
            setMsg("Venta pausada");
            get("/ventas/pausadas").then(setPausedSales).catch(() => {});
        } catch (e: any) { notify("Error: " + (e.message || ""), "error"); }
    };

    const handleResume = (paused: any) => {
        const data = paused.datos_json;
        if (!data?.items?.length) return;
        const restored = data.items.map((i: any) => ({
            producto_id: i.producto_id, producto_nombre: i.producto_nombre,
            sku: "", cantidad_kg: i.cantidad_kg || 0, cantidad_piezas: i.cantidad_piezas || 0,
            precio_unitario: i.precio_unitario, subtotal: i.subtotal, es_kilo: i.es_kilo,
        }));
        setCart(restored);
        setMsg("Venta reanudada");
        fetch(`/api/ventas/pausadas/${paused.id}`, { method: "DELETE", headers: { Authorization: "Bearer " + localStorage.getItem("token") } }).catch(() => {});
        setPausedSales((prev: any[]) => prev.filter(p => p.id !== paused.id));
    };

    const btnProd: React.CSSProperties = {
        padding: "14px 12px", border: "1px solid #e0e0e0", borderRadius: 10,
        cursor: "pointer", background: "#fff", textAlign: "left", fontSize: 13,
        display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap",
    };

    const btnBig: React.CSSProperties = {
        padding: "16px 24px", border: "none", borderRadius: 10, fontSize: 16,
        fontWeight: "bold", cursor: "pointer", color: "#fff", width: "100%",
    };

    return (
        <>
        {cajaAbierta !== null && (
            <div style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 12px", marginBottom: 8,
                background: cajaAbierta ? "#e8f5e9" : "#fef2f2",
                color: cajaAbierta ? "#1a8a3a" : "#dc2626",
                border: cajaAbierta ? "1px solid #a5d6a7" : "1px solid #fecaca",
                borderRadius: 8, fontSize: 12, fontWeight: "bold",
            }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: cajaAbierta ? "#4caf50" : "#ef4444" }} />
                {cajaAbierta ? "Caja abierta" : "Caja cerrada"}
            </div>
        )}
        <div className="pos-layout" style={{ display: "flex", gap: 16, height: "calc(100vh - 120px)" }}>
            <div className="pos-products" style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
                <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Buscar producto..."
                    style={{ padding: "14px 16px", fontSize: 16, border: "2px solid #1976d2", borderRadius: 10, outline: "none" }}
                    autoFocus />

                <div className="scroll-inner" style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
                    {filtered.map(s => {
                        const dispKg = parseFloat(s.cantidad_kg || 0);
                        const dispPz = parseInt(s.cantidad_piezas || 0);
                        return (
                            <div key={s.producto_id} style={btnProd}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: "bold" }}>{s.producto_nombre}</div>
                                    <div style={{ fontSize: 11, color: "#888" }}>
                                        {s.modalidad_kilo_suelto && `$${money(s.precio_menudeo_kg_hoy || s.precio_menudeo_kg)}/kg (${dispKg.toFixed(1)}kg disp.)`}
                                        {s.modalidad_kilo_suelto && s.modalidad_unidad && " | "}
                                        {s.modalidad_unidad && `$${money(s.precio_unidad_hoy || s.precio_por_unidad)}/pz (${dispPz} disp.)`}
                                    </div>
                                </div>
                                <div style={{ display: "flex", gap: 6 }}>
                                    {s.modalidad_kilo_suelto && (
                                        <button onClick={() => addKg(s)}
                                            style={{ padding: "8px 16px", background: "#1976d2", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: "bold" }}>
                                            +1 kg
                                        </button>
                                    )}
                                    {s.modalidad_unidad && (
                                        <button onClick={() => addPz(s)}
                                            style={{ padding: "8px 16px", background: "#388e3c", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: "bold" }}>
                                            +1 pz
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    {!filtered.length && <p style={{ color: "#888", textAlign: "center", padding: 40 }}>Sin resultados</p>}
                </div>
            </div>

            <div className="pos-cart" style={{ width: 380, background: "#fff", borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.08)", display: "flex", flexDirection: "column", flexShrink: 0 }}>
                <div style={{ padding: 16, borderBottom: "1px solid #eee" }}>
                    <h2 style={{ margin: 0, fontSize: 18 }}>Carrito</h2>
                </div>

                <div className="scroll-inner" style={{ flex: 1, overflowY: "auto", padding: 12 }}>
                    {!cart.length ? (
                        <p style={{ color: "#aaa", textAlign: "center", padding: 30 }}>Carrito vacío</p>
                    ) : (
                        cart.map(item => {
                            const toggleManual = () => setCart(cart.map(i => i.producto_id === item.producto_id ? { ...i, precioManual: !i.precioManual } : i));
                            const updatePrecio = (val: number) => setCart(cart.map(i => i.producto_id === item.producto_id ? { ...i, precio_unitario: val, subtotal: val * (i.es_kilo ? i.cantidad_kg : i.cantidad_piezas), precioEditado: val } : i));
                            return (
                            <div key={item.producto_id} style={{ padding: "10px 0", borderBottom: "1px solid #f5f5f5" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: "bold", fontSize: 13 }}>{item.producto_nombre}</div>
                                        <div style={{ fontSize: 11, color: "#888", display: "flex", alignItems: "center", gap: 4 }}>
                                            {item.precioManual ? (
                                                <input type="number" step={0.01} min={0}
                                                    value={item.precioEditado ?? item.precio_unitario}
                                                    onChange={e => updatePrecio(parseFloat(e.target.value) || 0)}
                                                    style={{ width: 70, padding: "2px 4px", border: "2px solid #ff9800", borderRadius: 4, fontSize: 12, fontWeight: "bold", textAlign: "right" }}
                                                    autoFocus />
                                            ) : (
                                                <span>${money(item.precio_unitario)}{item.es_kilo ? "/kg" : "/pz"}</span>
                                            )}
                                            <label style={{ fontSize: 9, display: "flex", alignItems: "center", gap: 2, cursor: "pointer" }}>
                                                <input type="checkbox" checked={!!item.precioManual} onChange={toggleManual} style={{ cursor: "pointer" }} />
                                                Manual
                                            </label>
                                        </div>
                                    </div>
                                    <button onClick={() => removeItem(item.producto_id)}
                                        style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontSize: 16, padding: "0 4px" }}>×</button>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                                    {item.es_kilo ? (
                                        <>
                                            <button onClick={() => updateKg(item.producto_id, item.cantidad_kg - 0.5)}
                                                style={{ padding: "4px 10px", border: "1px solid #ddd", borderRadius: 6, cursor: "pointer", background: "#f5f5f5", fontSize: 14 }}>−</button>
                                            <input type="number" step="0.1" min="0" value={item.cantidad_kg}
                                                onChange={e => updateKg(item.producto_id, parseFloat(e.target.value) || 0)}
                                                style={{ width: 70, textAlign: "center", padding: "4px", border: "1px solid #ddd", borderRadius: 6, fontSize: 14 }} />
                                            <button onClick={() => updateKg(item.producto_id, item.cantidad_kg + 0.5)}
                                                style={{ padding: "4px 10px", border: "1px solid #ddd", borderRadius: 6, cursor: "pointer", background: "#f5f5f5", fontSize: 14 }}>+</button>
                                            <span style={{ fontSize: 12, color: "#555", marginLeft: 4 }}>kg</span>
                                        </>
                                    ) : (
                                        <>
                                            <button onClick={() => updatePz(item.producto_id, item.cantidad_piezas - 1)}
                                                style={{ padding: "4px 10px", border: "1px solid #ddd", borderRadius: 6, cursor: "pointer", background: "#f5f5f5", fontSize: 14 }}>−</button>
                                            <span style={{ minWidth: 30, textAlign: "center", fontSize: 16, fontWeight: "bold" }}>{item.cantidad_piezas}</span>
                                            <button onClick={() => updatePz(item.producto_id, item.cantidad_piezas + 1)}
                                                style={{ padding: "4px 10px", border: "1px solid #ddd", borderRadius: 6, cursor: "pointer", background: "#f5f5f5", fontSize: 14 }}>+</button>
                                            <span style={{ fontSize: 12, color: "#555", marginLeft: 4 }}>pz</span>
                                        </>
                                    )}
                                    <div style={{ marginLeft: "auto", fontWeight: "bold", fontSize: 15, color: "#1a8a3a" }}>
                                        ${money(item.subtotal)}
                                    </div>
                                </div>
                            </div>
                            );
                        })
                    )}
                </div>

                <div style={{ padding: 16, borderTop: "1px solid #eee" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 20, fontWeight: "bold", marginBottom: 12 }}>
                        <span>Total</span>
                        <span>${money(total)}</span>
                    </div>

                    {msg && (
                        <div style={{ padding: "6px 10px", borderRadius: 8, fontSize: 12, background: "#e8f5e9", color: "#1a8a3a", marginBottom: 8 }}>
                            {msg}
                        </div>
                    )}

                    {pausedSales.length > 0 && !paying && (
                        <div style={{ marginBottom: 8 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                                <span style={{ fontSize: 12, color: "#ff9800", fontWeight: "bold" }}>Pausadas ({pausedSales.length})</span>
                                <button onClick={() => setShowPaused(!showPaused)}
                                    style={{ background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: 11 }}>
                                    {showPaused ? "Ocultar" : "Ver"}
                                </button>
                            </div>
                            {showPaused && pausedSales.map((ps: any) => {
                                const d = ps.datos_json;
                                const itemCount = d?.items?.length || 0;
                                const ts = new Date(ps.created_at).toLocaleString();
                                return (
                                    <div key={ps.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff8e1", borderRadius: 8, padding: "6px 10px", marginBottom: 4, border: "1px solid #ffe082" }}>
                                        <div style={{ fontSize: 11 }}>
                                            <div style={{ fontWeight: "bold" }}>{itemCount} producto(s)</div>
                                            <div style={{ color: "#888" }}>{ts}</div>
                                        </div>
                                        <button onClick={() => handleResume(ps)}
                                            style={{ background: "#ff9800", color: "#fff", border: "none", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 11, whiteSpace: "nowrap" }}>
                                            Reanudar
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    {!paying ? (
                        <div>
                            <button onClick={() => cart.length && setPaying(true)}
                                disabled={!cart.length}
                                style={{ ...btnBig, background: cart.length ? "#1a8a3a" : "#ccc", marginBottom: 8 }}>
                                Cobrar
                            </button>
                            {cart.length > 0 && (
                                <button onClick={handlePause}
                                    style={{ ...btnBig, background: "#ff9800", fontSize: 14 }}>
                                    Pausar
                                </button>
                            )}
                        </div>
                    ) : ventaOk ? (
                        <div style={{ textAlign: "center" }}>
                            <div style={{ fontSize: 24, marginBottom: 8 }}>✓</div>
                            <div style={{ fontWeight: "bold", fontSize: 16 }}>{ventaOk.folio}</div>
                            <div style={{ fontSize: 14, color: "#888", marginBottom: 12 }}>Venta completada</div>
                            <button onClick={() => window.open(`/api/ticket/${ventaOk.id}?token=${localStorage.getItem("token")}`, "_blank")}
                                style={{ ...btnBig, background: "#1565c0", marginBottom: 8 }}>Ticket</button>
                            <button onClick={() => setVentaOk(null)}
                                style={{ ...btnBig, background: "#1976d2" }}>Nueva venta</button>
                        </div>
                    ) : (
                        <div>
                            <div style={{ marginBottom: 12 }}>
                                <label style={{ fontSize: 13, color: "#555", display: "block", marginBottom: 4 }}>Efectivo recibido</label>
                                <input type="number" step="0.01" value={pagoEfectivo}
                                    onChange={e => setPagoEfectivo(e.target.value)}
                                    placeholder={total.toFixed(2)}
                                    style={{ width: "100%", padding: "12px 14px", fontSize: 18, border: "2px solid #1976d2", borderRadius: 8, textAlign: "center", boxSizing: "border-box" }}
                                    autoFocus />
                                {parseFloat(pagoEfectivo || "0") >= total && (
                                    <div style={{ textAlign: "right", fontSize: 14, color: "#555", marginTop: 4 }}>
                                        Cambio: <strong>${(parseFloat(pagoEfectivo) - total).toFixed(2)}</strong>
                                    </div>
                                )}
                            </div>
                            <div style={{ display: "flex", gap: 8 }}>
                                <button onClick={cobrar}
                                    disabled={parseFloat(pagoEfectivo || "0") < total}
                                    style={{ flex: 1, padding: "14px", background: parseFloat(pagoEfectivo || "0") >= total ? "#1a8a3a" : "#ccc", color: "#fff", border: "none", borderRadius: 8, cursor: parseFloat(pagoEfectivo || "0") >= total ? "pointer" : "default", fontWeight: "bold", fontSize: 15 }}>
                                    Confirmar ${money(total)}
                                </button>
                                <button onClick={() => { setPaying(false); setPagoEfectivo(""); }}
                                    style={{ padding: "14px 20px", background: "#888", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14 }}>
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
        </>
    );
}


