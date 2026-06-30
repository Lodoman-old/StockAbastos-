import { money } from "../format";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { get, getApiUrl } from "../api";
import { post } from "../services/api";

const emptyForm = { producto_id: "", tarima_tipo_id: "", cantidad: "1", peso_kg: "", bodega_id: "", fecha_caducidad: "", compra_por_cajas: false, cajas_directas: "1" };

export function Compras() {
    const navigate = useNavigate();
    const [compras, setCompras] = useState<any[]>([]);
    const [productos, setProductos] = useState<any[]>([]);
    const [bodegas, setBodegas] = useState<any[]>([]);
    const [proveedores, setProveedores] = useState<any[]>([]);
    const [tarimasTipos, setTarimasTipos] = useState<any[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [proveedor, setProveedor] = useState("");
    const [fecha, setFecha] = useState(new Date().toISOString().substring(0, 10));
    const [form, setForm] = useState(emptyForm);
    const [items, setItems] = useState<any[]>([]);
    const [provFilter, setProvFilter] = useState("");
    const [showProvList, setShowProvList] = useState(false);
    const [costoTotal, setCostoTotal] = useState("");

    const usuario = JSON.parse(localStorage.getItem("usuario") || "{}");
    const esAdmin = usuario.rol === "admin" || usuario.rol === "supervisor";
    const producto = productos.find(p => p.id === form.producto_id);
    const esUnidad = producto?.modalidad_unidad === true;

    const load = () => Promise.all([
        get("/compras").then(setCompras),
        get("/productos").then(setProductos),
        get("/bodegas").then(setBodegas),
        get("/tarimas-tipos").then(setTarimasTipos),
        get("/proveedores").then(setProveedores),
    ]).catch(() => {});
    useEffect(() => { load(); }, []);

    const proveedoresFiltrados = proveedores.filter(p =>
        p.nombre.toLowerCase().includes(provFilter.toLowerCase())
    );

    const agregar = () => {
        if (!form.producto_id || !form.bodega_id) return alert("Completa producto y bodega");
        if (!form.compra_por_cajas && !form.tarima_tipo_id) return alert("Selecciona tipo de tarima");
        const p = productos.find(x => x.id === form.producto_id);
        const tp = tarimasTipos.find(x => x.id === form.tarima_tipo_id);
        const b = bodegas.find(x => x.id === form.bodega_id);
        setItems([...items, {
            producto_id: form.producto_id,
            producto_nombre: p?.nombre || "",
            tarima_tipo_id: form.compra_por_cajas ? (tarimasTipos[0]?.id || form.tarima_tipo_id) : form.tarima_tipo_id,
            tarima_tipo_nombre: form.compra_por_cajas ? "Cajas directas" : (tp?.nombre || ""),
            cantidad: form.compra_por_cajas ? "1" : (form.cantidad || "1"),
            peso_kg: form.peso_kg,
            bodega_id: form.bodega_id,
            bodega_nombre: b?.nombre || "",
            fecha_caducidad: form.fecha_caducidad,
            compra_por_cajas: form.compra_por_cajas,
            cajas_directas: form.compra_por_cajas ? (form.cajas_directas || "1") : undefined,
            es_unidad: p?.modalidad_unidad === true,
        }]);
        setForm(emptyForm);
    };

    const quitar = (i: number) => setItems(items.filter((_, idx) => idx !== i));

    const save = async () => {
        if (!items.length) return alert("Agrega al menos un producto");
        try {
            const res = await post("/compras", {
                proveedor: proveedor || undefined,
                fecha,
                costo_total: costoTotal ? parseFloat(costoTotal) : undefined,
                tarimas: items.map(i => ({
                    producto_id: i.producto_id,
                    tarima_tipo_id: i.tarima_tipo_id || undefined,
                    cantidad: parseInt(i.cantidad),
                    peso_kg: i.peso_kg ? parseFloat(i.peso_kg) : undefined,
                    bodega_id: i.bodega_id,
                    fecha_caducidad: i.fecha_caducidad || undefined,
                    compra_por_cajas: i.compra_por_cajas || false,
                    cajas_directas: i.cajas_directas ? parseInt(i.cajas_directas) : undefined,
                })),
            });
            const msg = `Compra registrada — Lote: ${res.lote_padre?.codigo_lote || ""}`;
            alert(msg);
            setShowModal(false);
            setProveedor("");
            setFecha(new Date().toISOString().substring(0, 10));
            setItems([]);
            setForm(emptyForm);
            setCostoTotal("");
            load();
        } catch (e: any) { alert("Error: " + e.message); }
    };

    const inputS = { width: "100%", padding: "10px 12px", fontSize: 14, border: "1px solid #ddd", borderRadius: 8, boxSizing: "border-box" as const };

    return (
        <>
            <div className="header" style={{ marginBottom: 16 }}>
                <span className="header-back" onClick={() => navigate("/")}>←</span>
                <h1>Compras</h1>
            </div>
            <div className="page">
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                    <h3 style={{ margin: 0 }}>Compras del día</h3>
                    <button onClick={() => { setForm(emptyForm); setProveedor(""); setItems([]); setShowModal(true); }}
                        className="btn btn-primary" style={{ width: "auto", padding: "8px 16px", fontSize: 13 }}>+ Nueva</button>
                </div>

                {showModal && (
                    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: 16, overflow: "auto" }}>
                        <div style={{ background: "#fff", borderRadius: 16, padding: 24, width: "100%", maxWidth: 500, marginTop: 20 }}>
                            <h3 style={{ marginTop: 0 }}>Nueva Compra</h3>

                            <div className="input-group" style={{ position: "relative" }}>
                                <label>Proveedor</label>
                                <input value={provFilter} onChange={e => { setProvFilter(e.target.value); setShowProvList(true); }}
                                    onFocus={() => setShowProvList(true)} placeholder="Buscar proveedor..." style={inputS} />
                                {showProvList && proveedoresFiltrados.length > 0 && (
                                    <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid #ddd", borderRadius: 8, maxHeight: 150, overflow: "auto", zIndex: 1100, boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
                                        {proveedoresFiltrados.map(p => (
                                            <div key={p.id} onClick={() => { setProveedor(p.nombre); setProvFilter(p.nombre); setShowProvList(false); }}
                                                style={{ padding: "8px 12px", cursor: "pointer", fontSize: 13, borderBottom: "1px solid #f0f0f0" }}>
                                                <strong>{p.nombre}</strong>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {proveedor && <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>{proveedor} <span onClick={() => { setProveedor(""); setProvFilter(""); }} style={{ color: "#f44336", cursor: "pointer" }}>✕</span></div>}
                            </div>

                            <div className="input-group"><label>Fecha</label><input className="input" type="date" value={fecha} onChange={e => setFecha(e.target.value)} /></div>

                            <div style={{ marginBottom: 12 }}>
                                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
                                    <input type="checkbox" checked={form.compra_por_cajas} onChange={e => setForm({ ...form, compra_por_cajas: e.target.checked })} />
                                    <strong>Compra por cajas sueltas</strong>
                                    <span style={{ fontSize: 11, color: "#888" }}>(sin tarima física)</span>
                                </label>
                            </div>

                            <div style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr 1fr" }}>
                                <div className="input-group"><label>Producto</label>
                                    <select className="input" value={form.producto_id} onChange={e => setForm({ ...form, producto_id: e.target.value })}>
                                        <option value="">Seleccionar</option>
                                        {productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                                    </select>
                                </div>

                                {!form.compra_por_cajas ? (
                                    <>
                                        <div className="input-group"><label>Tipo Tarima</label>
                                            <select className="input" value={form.tarima_tipo_id} onChange={e => setForm({ ...form, tarima_tipo_id: e.target.value })}>
                                                <option value="">Seleccionar</option>
                                                {tarimasTipos.map(t => <option key={t.id} value={t.id}>{t.nombre} ({t.cantidad_cajas} cajas)</option>)}
                                            </select>
                                        </div>
                                        <div className="input-group"><label>Cantidad (tarimas)</label>
                                            <input className="input" type="number" min="1" value={form.cantidad} onChange={e => setForm({ ...form, cantidad: e.target.value })} />
                                        </div>
                                        <div className="input-group"><label>Peso x tarima (kg)</label>
                                            <input className="input" type="number" step="0.1" value={form.peso_kg} onChange={e => setForm({ ...form, peso_kg: e.target.value })} />
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="input-group"><label>Cajas</label>
                                            <input className="input" type="number" min="1" value={form.cajas_directas} onChange={e => setForm({ ...form, cajas_directas: e.target.value })} />
                                        </div>
                                        <div className="input-group"><label>Peso total (kg)</label>
                                            <input className="input" type="number" step="0.1" value={form.peso_kg} onChange={e => setForm({ ...form, peso_kg: e.target.value })} />
                                        </div>
                                    </>
                                )}

                                <div></div>
                                <div className="input-group"><label>Bodega</label>
                                    <select className="input" value={form.bodega_id} onChange={e => setForm({ ...form, bodega_id: e.target.value })}>
                                        <option value="">Seleccionar</option>
                                        {bodegas.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
                                    </select>
                                </div>
                                <div className="input-group"><label>Caducidad</label>
                                    <input className="input" type="date" value={form.fecha_caducidad} onChange={e => setForm({ ...form, fecha_caducidad: e.target.value })} />
                                </div>
                                <div style={{ display: "flex", alignItems: "flex-end", marginBottom: 16 }}>
                                    <button onClick={agregar} className="btn btn-secondary" style={{ padding: "10px 0" }}>+ Agregar</button>
                                </div>
                            </div>

                            <h4 style={{ fontSize: 14, margin: "12px 0 8px" }}>Productos ({items.length})</h4>
                            {items.map((item, i) => (
                                <div key={i} style={{ border: "1px solid #eee", borderRadius: 8, padding: 10, marginBottom: 8, fontSize: 13, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <div>
                                        <strong>{item.producto_nombre}</strong> – {item.es_unidad ? `${item.cajas_directas || item.cantidad} pz` : `${item.tarima_tipo_nombre}${item.compra_por_cajas ? ` (${item.cajas_directas} cajas)` : ` x${item.cantidad}`}`}
                                        <div style={{ fontSize: 11, color: "#888" }}>
                                            {item.peso_kg && !item.es_unidad ? `${item.peso_kg} kg` : ""}
                                            {item.bodega_nombre && `${item.peso_kg && !item.es_unidad ? " | " : ""}${item.bodega_nombre}`}
                                            {item.fecha_caducidad && ` | Cad: ${new Date(item.fecha_caducidad).toLocaleDateString()}`}
                                        </div>
                                    </div>
                                    <button onClick={() => quitar(i)} style={{ background: "none", border: "1px solid #f44336", color: "#f44336", borderRadius: 4, padding: "4px 8px", cursor: "pointer", fontSize: 11 }}>Quitar</button>
                                </div>
                            ))}

                            <div className="input-group" style={{ marginTop: 12 }}>
                                <label>Costo total de la compra ($)</label>
                                <input className="input" type="number" step="0.01" value={costoTotal} onChange={e => setCostoTotal(e.target.value)} placeholder="Ej: 1500.00" />
                            </div>
                            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                                <button onClick={save} disabled={!items.length} className="btn btn-primary" style={{ flex: 1 }}>Guardar Compra</button>
                                <button onClick={() => setShowModal(false)} className="btn btn-outline" style={{ flex: 1 }}>Cancelar</button>
                            </div>
                        </div>
                    </div>
                )}

                <div style={{ display: "grid", gap: 8 }}>
                    {compras.map(c => (
                        <div key={c.id} className="card" style={{ padding: "12px 16px" }}>
                            <div style={{ fontWeight: "bold", fontSize: 15 }}>{c.proveedor || "Sin proveedor"} — ${money(c.total || 0)}</div>
                            <div style={{ fontSize: 13, color: "#888" }}>{new Date(c.fecha).toLocaleDateString()} — {c.detalles?.length || 0} producto(s)</div>
                            {esAdmin && c.detalles?.[0]?.lote_padre_id && (
                                <button onClick={() => { const u = `${getApiUrl()}/api/tarimas/qr-lote/${c.detalles[0].lote_padre_id}`; window.open(u, "_system") || window.open(u, "_blank") || (window.location.href = u); }}
                                    style={{ marginTop: 8, padding: "6px 12px", background: "#1565c0", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>
                                    Imprimir QR
                                </button>
                            )}
                        </div>
                    ))}
                    {!compras.length && <p style={{ color: "#888", textAlign: "center" }}>Sin compras</p>}
                </div>
            </div>
        </>
    );
}
