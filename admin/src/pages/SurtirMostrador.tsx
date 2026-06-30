import { money } from "../format";
import React, { useEffect, useState } from "react";
import { get, post } from "../services/api";
import { notify } from "../components/Toast";
export function SurtirMostrador() {
    const [stock, setStock] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [bodegas, setBodegas] = useState<any[]>([]);
    const [bodegaId, setBodegaId] = useState("");
    const [tarimas, setTarimas] = useState<any[]>([]);
    const [productos, setProductos] = useState<any[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [modalSeccion, setModalSeccion] = useState<"tarimas" | "compra">("tarimas");
    const [cajasInput, setCajasInput] = useState<Record<string, number>>({});
    const [pesoInput, setPesoInput] = useState<Record<string, number>>({});
    const [compraProdId, setCompraProdId] = useState("");
    const [compraPz, setCompraPz] = useState("");
    const [ajusteId, setAjusteId] = useState<string | null>(null);
    const [ajusteKg, setAjusteKg] = useState("");
    const [ajustePz, setAjustePz] = useState("");

    const loadStock = () => get("/mostrador/stock").then(setStock).catch(() => {}).finally(() => setLoading(false));

    useEffect(() => {
        Promise.all([
            loadStock(),
            get("/bodegas").then(setBodegas),
            get("/productos").then(setProductos).catch(() => notify("Error al cargar productos", "error")),
        ]);
    }, []);

    const abrirSurtir = async (bId: string) => {
        setBodegaId(bId);
        setModalSeccion("tarimas");
        setCajasInput({});
        setPesoInput({});
        if (!bId) return;
        try {
            const data = await get(`/mostrador/tarimas-disponibles/${bId}`);
            setTarimas(data);
            setShowModal(true);
        } catch { notify("Error al cargar tarimas", "error"); }
    };

    const handleCajasChange = (tarimaId: string, val: number) => {
        const rounded = Math.round(val * 10) / 10;
        setCajasInput(prev => ({ ...prev, [tarimaId]: Math.max(0, rounded) }));
    };

    const handlePesoChange = (tarimaId: string, val: number) => {
        setPesoInput(prev => ({ ...prev, [tarimaId]: Math.max(0, val) }));
    };

    const calcKg = (t: any): number => {
        const cajas = cajasInput[t.tarima_id] || 0;
        if (t.modalidad_caja_pesada) {
            const destareTotal = (parseFloat(t.destare_kg) || 0) * cajas;
            const pb = pesoInput[t.tarima_id] || 0;
            return Math.max(0, pb - destareTotal);
        }
        if (t.modalidad_caja_sellada) {
            return cajas * (parseFloat(t.peso_caja_sellada_kg) || 0);
        }
        return 0;
    };

    const calcCosto = (t: any): number => {
        const kg = calcKg(t);
        if (t.modalidad_caja_pesada) return kg * (parseFloat(t.precio_mayoreo_kg) || 0);
        if (t.modalidad_caja_sellada) {
            const cajas = cajasInput[t.tarima_id] || 0;
            return cajas * (parseFloat(t.precio_caja_sellada) || 0);
        }
        return 0;
    };

    const surtirDesdeTarima = async (t: any) => {
        const cajas = cajasInput[t.tarima_id] || 0;
        if (cajas <= 0) return notify("Ingresa número de cajas", "error");
        if (cajas > parseFloat(t.cajas_restantes)) return notify(`Solo hay ${t.cajas_restantes} cajas disponibles`, "error");
        try {
            const body: any = { tarima_id: t.tarima_id, cajas };
            if (t.modalidad_caja_pesada) body.peso_bruto = pesoInput[t.tarima_id] || 0;
            const res = await post("/mostrador/surtir-desde-tarima", body);
            notify(`Surtido: ${money(res.kg_calculados)} kg (${cajas} caja(s))`, "success");
            loadStock();
            const data = await get(`/mostrador/tarimas-disponibles/${bodegaId}`);
            setTarimas(data);
            setCajasInput(prev => ({ ...prev, [t.tarima_id]: 0 }));
            setPesoInput(prev => ({ ...prev, [t.tarima_id]: 0 }));
        } catch (e: any) { notify("Error: " + (e.message || ""), "error"); }
    };

    const compraDirecta = async () => {
        if (!compraProdId) return notify("Selecciona un producto", "error");
        const pz = parseInt(compraPz) || 0;
        if (!pz) return notify("Ingresa piezas", "error");
        try {
            await post("/mostrador/surtir", { producto_id: compraProdId, cantidad_kg: 0, cantidad_piezas: pz });
            notify("Producto agregado al mostrador", "success");
            setCompraProdId(""); setCompraPz("");
            loadStock();
        } catch (e: any) { notify("Error: " + (e.message || ""), "error"); }
    };

    const iniciarAjuste = (s: any) => {
        setAjusteId(s.id);
        setAjusteKg(s.cantidad_kg ? Number(s.cantidad_kg).toString() : "");
        setAjustePz(s.cantidad_piezas ? s.cantidad_piezas.toString() : "");
    };

    const guardarAjuste = async () => {
        if (!ajusteId) return;
        const kg = parseFloat(ajusteKg) || 0;
        const pz = parseInt(ajustePz) || 0;
        try {
            await post("/mostrador/ajustar-stock", { id: ajusteId, cantidad_kg: kg, cantidad_piezas: pz });
            notify("Stock ajustado", "success");
            setAjusteId(null);
            loadStock();
        } catch (e: any) { notify("Error: " + (e.message || ""), "error"); }
    };

    const card: React.CSSProperties = { background: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" };
    const inputStyle: React.CSSProperties = { width: "100%", padding: "10px 12px", fontSize: 14, border: "1px solid #ddd", borderRadius: 8, boxSizing: "border-box" };

    return (
        <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h1>Surtir Mostrador</h1>
            </div>

            {/* Bodega principal */}
            {(() => {
                const bodegaPrincipal = bodegas.find((b: any) => b.es_default);
                if (!bodegaPrincipal) return null;
                return (
                    <>
                    <h2 style={{ fontSize: 16, marginBottom: 10 }}>1. Surtir desde bodega (en cajas)</h2>
                    <div style={{ ...card, display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                        <div>
                            <strong>{bodegaPrincipal.codigo}</strong> — {bodegaPrincipal.nombre}
                        </div>
                        <button onClick={() => abrirSurtir(bodegaPrincipal.id)}
                            style={{ background: "#e65100", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: "bold" }}>
                            Surtir
                        </button>
                    </div>
                    </>
                );
            })()}

            {/* Compra directa */}
            <h2 style={{ fontSize: 16, marginBottom: 10 }}>2. Compra directa (productos extra)</h2>
            <div style={{ ...card, marginBottom: 24 }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
                    <div style={{ flex: 2, minWidth: 180 }}>
                        <label style={{ fontSize: 12, color: "#555" }}>Producto</label>
                        <select value={compraProdId} onChange={e => setCompraProdId(e.target.value)}
                            style={{ ...inputStyle, padding: "8px 10px", fontSize: 13 }}>
                            <option value="">Seleccionar...</option>
                            {(() => {
                                const uni = productos.filter((p: any) => p.activo && p.modalidad_unidad);
                                return (uni.length ? uni : productos.filter((p: any) => p.activo)).map((p: any) => (
                                    <option key={p.id} value={p.id}>{p.nombre}</option>
                                ));
                            })()}
                        </select>
                    </div>
                    <div style={{ flex: 1, minWidth: 80 }}>
                        <label style={{ fontSize: 12, color: "#555" }}>Piezas</label>
                        <input type="number" step="1" min="0" value={compraPz} onChange={e => setCompraPz(e.target.value)}
                            style={{ ...inputStyle, padding: "8px 10px", fontSize: 13 }} />
                    </div>
                    <button onClick={compraDirecta}
                        style={{ padding: "8px 20px", background: "#1976d2", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: "bold", height: 36 }}>
                        Agregar
                    </button>
                </div>
            </div>

            {/* Stock actual */}
            <h2 style={{ fontSize: 16, marginBottom: 12 }}>Stock actual en Mostrador</h2>
            {loading ? <p>Cargando...</p> : !stock.length ? <p style={{ color: "#888" }}>Sin stock en mostrador</p> : (
                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: 8, overflow: "hidden" }}>
                        <thead>
                            <tr style={{ background: "#f5f5f5", textAlign: "left" }}>
                                <th style={{ padding: 10 }}>Producto</th>
                                <th style={{ padding: 10 }}>SKU</th>
                                <th style={{ padding: 10 }}>Kg</th>
                                <th style={{ padding: 10 }}>Piezas</th>
                                <th style={{ padding: 10 }}>Precio menudeo</th>
                                <th style={{ padding: 10, width: 100 }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {stock.map((s: any) => (
                                <tr key={s.id} style={{ borderTop: "1px solid #eee" }}>
                                    <td style={{ padding: 10 }}>{s.producto_nombre}</td>
                                    <td style={{ padding: 10 }}>{s.sku}</td>
                                    <td style={{ padding: 10 }}>{s.cantidad_kg ? `${money(s.cantidad_kg)} kg` : "-"}</td>
                                    <td style={{ padding: 10 }}>
                                        {ajusteId === s.id ? (
                                            <input type="number" step="1" min="0" value={ajustePz}
                                                onChange={e => setAjustePz(e.target.value)}
                                                style={{ width: 60, padding: "3px 4px", border: "2px solid #ff9800", borderRadius: 4, fontSize: 12, textAlign: "right" }} />
                                        ) : (s.cantidad_piezas || "-")}
                                    </td>
                                    <td style={{ padding: 10 }}>
                                        {s.modalidad_kilo_suelto && s.precio_menudeo_kg ? `$${money(s.precio_menudeo_kg)}/kg` : ""}
                                        {s.modalidad_unidad && s.precio_por_unidad ? `$${money(s.precio_por_unidad)}/pz` : ""}
                                    </td>
                                    <td style={{ padding: 10 }}>
                                        {ajusteId === s.id ? (
                                            <div style={{ display: "flex", gap: 4 }}>
                                                <button onClick={guardarAjuste}
                                                    style={{ padding: "3px 8px", background: "#1a8a3a", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 11 }}>Guardar</button>
                                                <button onClick={() => setAjusteId(null)}
                                                    style={{ padding: "3px 8px", background: "#888", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 11 }}>Cancelar</button>
                                            </div>
                                        ) : s.modalidad_unidad ? (
                                            <button onClick={() => iniciarAjuste(s)}
                                                style={{ padding: "3px 8px", background: "#ff9800", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 11 }}>
                                                Ajustar
                                            </button>
                                        ) : null}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal surtir desde tarimas */}
            {showModal && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}
                    onClick={() => setShowModal(false)}>
                    <div style={{ background: "#fff", borderRadius: 16, padding: 24, maxWidth: 800, width: "90%", maxHeight: "90vh", overflow: "auto" }} onClick={e => e.stopPropagation()}>
                        <h3 style={{ marginTop: 0 }}>Surtir a Mostrador — {bodegas.find((b: any) => b.id === bodegaId)?.nombre}</h3>

                        {!tarimas.length ? (
                            <p style={{ color: "#888" }}>Sin tarimas con cajas disponibles en esta bodega</p>
                        ) : (
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                                <thead>
                                    <tr style={{ background: "#f5f5f5", textAlign: "left" }}>
                                        <th style={{ padding: 6 }}>Producto</th>
                                        <th style={{ padding: 6, textAlign: "center" }}>Tipo</th>
                                        <th style={{ padding: 6, textAlign: "center" }}>Cajas disp.</th>
                                        <th style={{ padding: 6, textAlign: "center" }}>Cajas</th>
                                        {tarimas.some((t: any) => t.modalidad_caja_pesada) && <th style={{ padding: 6, textAlign: "center", width: 80 }}>Peso bruto</th>}
                                        <th style={{ padding: 6, textAlign: "center", width: 70 }}>Kg calc.</th>
                                        <th style={{ padding: 6, textAlign: "center", width: 70 }}>$ aprox</th>
                                        <th style={{ padding: 6, textAlign: "center", width: 50 }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tarimas.map((t: any) => {
                                        const kg = calcKg(t);
                                        const costo = calcCosto(t);
                                        const cajas = cajasInput[t.tarima_id] || 0;
                                        const isCp = t.modalidad_caja_pesada;
                                        return (
                                            <tr key={t.tarima_id} style={{ borderTop: "1px solid #eee", verticalAlign: "top" }}>
                                                <td style={{ padding: 6 }}>
                                                    <strong>{t.producto_nombre}</strong>
                                                    <div style={{ fontSize: 10, color: "#888", fontFamily: "monospace" }}>{t.codigo_qr}</div>
                                                </td>
                                                <td style={{ padding: 6, textAlign: "center", fontSize: 11 }}>
                                                    {isCp ? "CP" : "CS"}
                                                </td>
                                                <td style={{ padding: 6, textAlign: "center", fontWeight: "bold" }}>
                                                    {parseFloat(t.cajas_restantes).toFixed(1)}
                                                </td>
                                                <td style={{ padding: 6, textAlign: "center" }}>
                                                    <input type="number" step={isCp ? 1 : 0.5} min={0} max={t.cajas_restantes}
                                                        value={cajasInput[t.tarima_id] || ""}
                                                        onChange={e => handleCajasChange(t.tarima_id, parseFloat(e.target.value) || 0)}
                                                        style={{ width: 50, padding: "3px 4px", border: "1px solid #ddd", borderRadius: 4, fontSize: 12, textAlign: "right" }} />
                                                </td>
                                                {isCp && (
                                                    <td style={{ padding: 6, textAlign: "center" }}>
                                                        <input type="number" step="0.1" min={0}
                                                            value={pesoInput[t.tarima_id] || ""}
                                                            onChange={e => handlePesoChange(t.tarima_id, parseFloat(e.target.value) || 0)}
                                                            style={{ width: 70, padding: "3px 4px", border: "1px solid #ddd", borderRadius: 4, fontSize: 12, textAlign: "right" }}
                                                            placeholder="kg bruto" />
                                                        {cajas > 0 && <div style={{ fontSize: 10, color: "#888" }}>dest {((parseFloat(t.destare_kg) || 0) * cajas).toFixed(1)}kg</div>}
                                                    </td>
                                                )}
                                                <td style={{ padding: 6, textAlign: "center", fontWeight: "bold" }}>
                                                    {kg > 0 ? kg.toFixed(2) : "-"}
                                                </td>
                                                <td style={{ padding: 6, textAlign: "center", color: "#1a8a3a", fontWeight: "bold" }}>
                                                    {costo > 0 ? `$${money(costo)}` : "-"}
                                                </td>
                                                <td style={{ padding: 6, textAlign: "center" }}>
                                                    <button onClick={() => surtirDesdeTarima(t)}
                                                        disabled={!cajas || cajas <= 0}
                                                        style={{ padding: "4px 10px", background: cajas > 0 ? "#e65100" : "#ccc", color: "#fff", border: "none", borderRadius: 4, cursor: cajas > 0 ? "pointer" : "default", fontSize: 11, fontWeight: "bold" }}>
                                                        Surtir
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                        <button onClick={() => setShowModal(false)} style={{ marginTop: 12, padding: "8px 20px", background: "#888", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}>Cerrar</button>
                    </div>
                </div>
            )}
        </div>
    );
}


