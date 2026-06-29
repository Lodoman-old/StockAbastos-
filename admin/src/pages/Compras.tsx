import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { get, post, del } from "../services/api";
import { notify } from "../components/Toast";
import { ConfirmDialog } from "../components/ConfirmDialog";

const emptyForm = { producto_id: "", tarima_tipo_id: "", cantidad: "1", peso_kg: "", costo_por_kg: "", bodega_id: "", fecha_caducidad: "", compra_por_cajas: false, cajas_directas: "1" };

export function Compras() {
    const [compras, setCompras] = useState<any[]>([]);
    const [productos, setProductos] = useState<any[]>([]);
    const [bodegas, setBodegas] = useState<any[]>([]);
    const [proveedores, setProveedores] = useState<any[]>([]);
    const [tarimasTipos, setTarimasTipos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [proveedor, setProveedor] = useState("");
    const [fecha, setFecha] = useState(new Date().toISOString().substring(0, 10));
    const [tarimaForm, setTarimaForm] = useState(emptyForm);
    const [tarimaItems, setTarimaItems] = useState<Array<{ producto_id: string; producto_nombre: string; tarima_tipo_id: string; tarima_tipo_nombre: string; cantidad: string; peso_kg: string; costo: string; bodega_id: string; bodega_nombre: string; fecha_caducidad: string; compra_por_cajas?: boolean; cajas_directas?: string; es_unidad?: boolean }>>([]);
    const productoSeleccionado = productos.find(p => p.id === tarimaForm.producto_id);
    const esUnidad = productoSeleccionado?.modalidad_unidad === true;
    const [provFilter, setProvFilter] = useState("");
    const [showProvList, setShowProvList] = useState(false);
    const provRef = useRef<HTMLDivElement>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<{ id: string } | null>(null);

    const load = () => Promise.all([
        get("/compras").then(setCompras),
        get("/productos").then(setProductos),
        get("/bodegas").then(setBodegas),
        get("/tarimas-tipos").then(setTarimasTipos),
        get("/proveedores").then(setProveedores),
    ]).catch(() => {}).finally(() => setLoading(false));
    useEffect(() => { load(); }, []);

    useEffect(() => {
        const cerrar = (e: MouseEvent) => {
            if (provRef.current && !provRef.current.contains(e.target as Node)) setShowProvList(false);
        };
        document.addEventListener("mousedown", cerrar);
        return () => document.removeEventListener("mousedown", cerrar);
    }, []);

    const proveedoresFiltrados = proveedores.filter(p =>
        p.nombre.toLowerCase().includes(provFilter.toLowerCase())
    );

    const agregarTarima = () => {
        if (!tarimaForm.producto_id || !tarimaForm.bodega_id) {
            return notify("Completa producto y bodega", "error");
        }
        if (!tarimaForm.compra_por_cajas && !tarimaForm.tarima_tipo_id) {
            return notify("Selecciona tipo de tarima", "error");
        }
        const p = productos.find(x => x.id === tarimaForm.producto_id);
        const tp = tarimasTipos.find(x => x.id === tarimaForm.tarima_tipo_id);
        const b = bodegas.find(x => x.id === tarimaForm.bodega_id);
        setTarimaItems([...tarimaItems, {
            producto_id: tarimaForm.producto_id,
            producto_nombre: p?.nombre || "",
            tarima_tipo_id: tarimaForm.compra_por_cajas ? (tarimasTipos[0]?.id || tarimaForm.tarima_tipo_id) : tarimaForm.tarima_tipo_id,
            tarima_tipo_nombre: tarimaForm.compra_por_cajas ? "Cajas directas" : (tp?.nombre || ""),
            cantidad: tarimaForm.compra_por_cajas ? "1" : (tarimaForm.cantidad || "1"),
            peso_kg: tarimaForm.peso_kg,
            costo: tarimaForm.costo_por_kg,
            bodega_id: tarimaForm.bodega_id,
            bodega_nombre: b?.nombre || "",
            fecha_caducidad: tarimaForm.fecha_caducidad,
            compra_por_cajas: tarimaForm.compra_por_cajas,
            cajas_directas: tarimaForm.compra_por_cajas ? (tarimaForm.cajas_directas || "1") : undefined,
            es_unidad: p?.modalidad_unidad === true,
        }]);
        setTarimaForm(emptyForm);
    };

    const quitarTarima = (i: number) => setTarimaItems(tarimaItems.filter((_, idx) => idx !== i));

    const save = async () => {
        if (!tarimaItems.length) return notify("Agrega al menos una tarima", "error");
        try {
            const res = await post("/compras", {
                proveedor: proveedor || undefined,
                fecha,
                tarimas: tarimaItems.map(i => ({
                    producto_id: i.producto_id,
                    tarima_tipo_id: i.tarima_tipo_id || undefined,
                    cantidad: parseInt(i.cantidad),
                    peso_kg: i.peso_kg ? parseFloat(i.peso_kg) : undefined,
                    costo_por_kg: i.costo ? parseFloat(i.costo) : undefined,
                    bodega_id: i.bodega_id,
                    fecha_caducidad: i.fecha_caducidad || undefined,
                    compra_por_cajas: i.compra_por_cajas || false,
                    cajas_directas: i.cajas_directas ? parseInt(i.cajas_directas) : undefined,
                })),
            });
            const padreStr = res.lote_padre?.codigo_lote || "";
            const hijosStr = res.lotes?.map((l: any) => l.codigo_lote).join(", ") || "";
            notify(`Compra registrada — Lote: ${padreStr} (${res.lotes?.length || 0} hijo(s))`, "success");
            setShowModal(false);
            setProveedor("");
            setFecha(new Date().toISOString().substring(0, 10));
            setTarimaItems([]);
            setTarimaForm(emptyForm);
            load();
        } catch (e: any) { notify("Error: " + e.message, "error"); }
    };

    const cargarModal = () => {
        setProveedor("");
        setFecha(new Date().toISOString().substring(0, 10));
        setTarimaItems([]);
        setTarimaForm(emptyForm);
        setShowModal(true);
    };

    const inputStyle: React.CSSProperties = { width: "100%", padding: "10px 12px", fontSize: 14, border: "1px solid #ddd", borderRadius: 8, boxSizing: "border-box" };

    if (loading) return <div><h1>Compras</h1><p>Cargando...</p></div>;

    return (
        <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
                <h1 style={{ margin: 0 }}>Compras del día</h1>
                <div style={{ display: "flex", gap: 8 }}>
                    <Link to="/reporte-compras" style={{ padding: "8px 16px", background: "#2196f3", color: "#fff", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: "bold", textDecoration: "none" }}>Reporte de Compras</Link>
                    <button onClick={cargarModal} style={{ padding: "8px 16px", background: "#1a8a3a", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: "bold" }}>+ Nueva Compra</button>
                </div>
            </div>

            {showModal && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }} onClick={() => setShowModal(false)}>
                    <div style={{ background: "#fff", borderRadius: 16, padding: 32, maxWidth: 900, width: "95%", maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column" }} onClick={e => e.stopPropagation()}>
                        <h3 style={{ marginTop: 0 }}>Nueva Compra</h3>

                        <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                            <div style={{ position: "relative", flex: 1 }} ref={provRef}>
                                <label style={{ fontSize: 13, color: "#555", display: "block", marginBottom: 4 }}>Proveedor</label>
                                <input value={provFilter} onChange={e => { setProvFilter(e.target.value); setShowProvList(true); }}
                                    onFocus={() => setShowProvList(true)}
                                    placeholder="Buscar proveedor..."
                                    style={inputStyle} />
                                {showProvList && proveedoresFiltrados.length > 0 && (
                                    <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid #ddd", borderRadius: 8, maxHeight: 180, overflow: "auto", zIndex: 300, boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
                                        {proveedoresFiltrados.map(p => (
                                            <div key={p.id} onClick={() => { setProveedor(p.nombre); setProvFilter(p.nombre); setShowProvList(false); }}
                                                style={{ padding: "8px 12px", cursor: "pointer", fontSize: 13, borderBottom: "1px solid #f0f0f0" }}>
                                                <strong>{p.nombre}</strong>
                                                {p.contacto && <span style={{ color: "#888", marginLeft: 8 }}>{p.contacto}</span>}
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {proveedor && (
                                    <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>
                                        Seleccionado: <strong>{proveedor}</strong>
                                        <button onClick={() => { setProveedor(""); setProvFilter(""); }}
                                            style={{ marginLeft: 6, background: "none", border: "none", color: "#f44336", cursor: "pointer", fontSize: 11 }}>x</button>
                                    </div>
                                )}
                            </div>
                            <div style={{ width: 200 }}>
                                <label style={{ fontSize: 13, color: "#555", display: "block", marginBottom: 4 }}>Fecha</label>
                                <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} style={inputStyle} />
                            </div>
                        </div>

                        <div style={{ display: "flex", gap: 16, flex: 1, minHeight: 0 }}>
                            <div style={{ flex: 1, overflow: "auto", borderRight: "1px solid #eee", paddingRight: 16 }}>
                                <h4 style={{ margin: "0 0 12px", fontSize: 14 }}>Agregar</h4>
                                <div style={{ marginBottom: 12 }}>
                                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
                                        <input type="checkbox" checked={tarimaForm.compra_por_cajas} onChange={e => setTarimaForm({ ...tarimaForm, compra_por_cajas: e.target.checked })} />
                                        <strong>Compra por cajas sueltas</strong>
                                        <span style={{ fontSize: 11, color: "#888" }}>(sin tarima física)</span>
                                    </label>
                                </div>
                                <div style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr 1fr" }}>
                                    <div>
                                        <label style={{ fontSize: 12, color: "#555", display: "block" }}>Producto *</label>
                                        <select value={tarimaForm.producto_id} onChange={e => setTarimaForm({ ...tarimaForm, producto_id: e.target.value })} style={inputStyle}>
                                            <option value="">Seleccionar</option>
                                            {productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                                        </select>
                                    </div>
                                    {!tarimaForm.compra_por_cajas ? (
                                        <>
                                            <div>
                                                <label style={{ fontSize: 12, color: "#555", display: "block" }}>Tipo Tarima *</label>
                                                <select value={tarimaForm.tarima_tipo_id} onChange={e => setTarimaForm({ ...tarimaForm, tarima_tipo_id: e.target.value })} style={inputStyle}>
                                                    <option value="">Seleccionar</option>
                                                    {tarimasTipos.map(t => <option key={t.id} value={t.id}>{t.nombre} ({t.cantidad_cajas} cajas)</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label style={{ fontSize: 12, color: "#555", display: "block" }}>Cantidad (tarimas) *</label>
                                                <input type="number" min="1" value={tarimaForm.cantidad} onChange={e => setTarimaForm({ ...tarimaForm, cantidad: e.target.value })} style={inputStyle} />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: 12, color: "#555", display: "block" }}>Peso x tarima (kg)</label>
                                                <input type="number" step="0.1" value={tarimaForm.peso_kg} onChange={e => setTarimaForm({ ...tarimaForm, peso_kg: e.target.value })} style={inputStyle} />
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div>
                                                <label style={{ fontSize: 12, color: "#555", display: "block" }}>Cajas *</label>
                                                <input type="number" min="1" value={tarimaForm.cajas_directas} onChange={e => setTarimaForm({ ...tarimaForm, cajas_directas: e.target.value })} style={inputStyle} />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: 12, color: "#555", display: "block" }}>Peso total (kg)</label>
                                                <input type="number" step="0.1" value={tarimaForm.peso_kg} onChange={e => setTarimaForm({ ...tarimaForm, peso_kg: e.target.value })} style={inputStyle} />
                                            </div>
                                            <div style={{ visibility: "hidden" }}></div>
                                        </>
                                    )}
                                    <div>
                                        <label style={{ fontSize: 12, color: "#555", display: "block" }}>{esUnidad ? "Costo por unidad ($)" : "Costo por kg ($)"} *</label>
                                        <input type="number" step="0.01" value={tarimaForm.costo_por_kg} onChange={e => setTarimaForm({ ...tarimaForm, costo_por_kg: e.target.value })} style={inputStyle} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: 12, color: "#555", display: "block" }}>Bodega *</label>
                                        <select value={tarimaForm.bodega_id} onChange={e => setTarimaForm({ ...tarimaForm, bodega_id: e.target.value })} style={inputStyle}>
                                            <option value="">Seleccionar</option>
                                            {bodegas.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: 12, color: "#555", display: "block" }}>Caducidad</label>
                                        <input type="date" value={tarimaForm.fecha_caducidad} onChange={e => setTarimaForm({ ...tarimaForm, fecha_caducidad: e.target.value })} style={inputStyle} />
                                    </div>
                                    <div style={{ display: "flex", alignItems: "flex-end" }}>
                                        <button onClick={agregarTarima} style={{ width: "100%", padding: "10px 0", background: "#ff9800", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: "bold" }}>
                                            + Agregar
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column" }}>
                                <h4 style={{ margin: "0 0 12px", fontSize: 14 }}>
                                    Tarimas agregadas ({tarimaItems.length})
                                </h4>
                                {tarimaItems.length === 0 ? (
                                    <p style={{ color: "#aaa", fontSize: 13, textAlign: "center", marginTop: 40 }}>Aún no hay tarimas agregadas</p>
                                ) : (
                                    <div style={{ flex: 1, overflow: "auto" }}>
                                        {tarimaItems.map((item, i) => (
                                            <div key={i} style={{ border: "1px solid #eee", borderRadius: 8, padding: 10, marginBottom: 8, fontSize: 13, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                                <div>
                                                    <strong>{item.producto_nombre}</strong> – {item.es_unidad ? `${item.cajas_directas || item.cantidad} pz` : `${item.tarima_tipo_nombre}${item.compra_por_cajas ? ` (${item.cajas_directas} cajas)` : ` x${item.cantidad}`}`}
                                                    <div style={{ fontSize: 11, color: "#888" }}>
                                                        {item.costo && `$${parseFloat(item.costo).toFixed(2)}${item.es_unidad ? '/unidad' : '/kg'}`}{item.costo && item.peso_kg && !item.es_unidad ? " | " : ""}{item.peso_kg && !item.es_unidad && `${item.peso_kg} kg`}
                                                        {item.bodega_nombre && ` | ${item.bodega_nombre}`}
                                                        {item.fecha_caducidad && ` | Cad: ${new Date(item.fecha_caducidad).toLocaleDateString()}`}
                                                        {item.es_unidad && item.costo && (
                                                            <span style={{ fontWeight: "bold", color: "#1a8a3a" }}> | Total: ${(parseFloat(item.costo) * parseInt(item.cajas_directas || item.cantidad)).toFixed(2)}</span>
                                                        )}
                                                        {!item.es_unidad && item.compra_por_cajas && item.costo && item.peso_kg && (
                                                            <span style={{ fontWeight: "bold", color: "#1a8a3a" }}> | Total: ${(parseFloat(item.costo) * parseFloat(item.peso_kg)).toFixed(2)}</span>
                                                        )}
                                                        {!item.es_unidad && !item.compra_por_cajas && item.costo && item.peso_kg && item.cantidad && (
                                                            <span style={{ fontWeight: "bold", color: "#1a8a3a" }}> | Total: ${(parseFloat(item.costo) * parseFloat(item.peso_kg) * parseInt(item.cantidad)).toFixed(2)}</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <button onClick={() => quitarTarima(i)} style={{ background: "none", border: "1px solid #f44336", color: "#f44336", borderRadius: 4, padding: "4px 8px", cursor: "pointer", fontSize: 11, whiteSpace: "nowrap", marginLeft: 8 }}>
                                                    Quitar
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <hr style={{ margin: "16px 0 12px", border: "none", borderTop: "1px solid #eee" }} />
                        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                            <button onClick={save} disabled={!tarimaItems.length} style={{ padding: "10px 24px", background: tarimaItems.length ? "#1a8a3a" : "#ccc", color: "#fff", border: "none", borderRadius: 8, cursor: tarimaItems.length ? "pointer" : "not-allowed", fontWeight: "bold" }}>
                                Guardar Compra ({tarimaItems.length} tarima{tarimaItems.length !== 1 ? "s" : ""})
                            </button>
                            <button onClick={() => setShowModal(false)} style={{ padding: "10px 24px", background: "#888", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}>
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: 8, overflow: "hidden", minWidth: 600 }}>
                    <thead>
                        <tr style={{ background: "#f5f5f5", textAlign: "left" }}>
                            <th style={{ padding: 12 }}>Folio</th>
                            <th style={{ padding: 12 }}>Fecha</th>
                            <th style={{ padding: 12 }}>Proveedor</th>
                            <th style={{ padding: 12 }}>Productos</th>
                            <th style={{ padding: 12 }}>Total</th>
                            <th style={{ padding: 12 }}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {compras.map(c => (
                            <tr key={c.id} style={{ borderTop: "1px solid #eee" }}>
                                <td style={{ padding: 12, fontWeight: "bold" }}>{c.folio || c.id.substring(0, 8)}</td>
                                <td style={{ padding: 12 }}>{new Date(c.fecha).toLocaleDateString()}</td>
                                <td style={{ padding: 12 }}>{c.proveedor || "-"}</td>
                                <td style={{ padding: 12 }}>
                                    {c.detalles?.map((d: any) => (
                                        <div key={d.id} style={{ fontSize: 12, marginBottom: 2 }}>
                                            {d.producto_nombre} (${parseFloat(d.precio_compra || 0).toFixed(2)}/{d.modalidad_unidad ? 'unidad' : 'kg'})
                                        </div>
                                    ))}
                                </td>
                                <td style={{ padding: 12, fontWeight: "bold" }}>${parseFloat(c.total || 0).toFixed(2)}</td>
                                <td style={{ padding: 12 }}>
                                    <button onClick={() => setDeleteConfirm({ id: c.id })}
                                        style={{ background: "none", border: "1px solid #f44336", color: "#f44336", borderRadius: 4, padding: "4px 8px", fontSize: 11, cursor: "pointer" }}>Eliminar</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <ConfirmDialog
                open={!!deleteConfirm}
                title="Eliminar compra"
                message="¿Eliminar esta compra? Se borrarán sus lotes y tarimas."
                confirmLabel="Sí, eliminar"
                confirmColor="#f44336"
                onConfirm={async () => {
                    if (!deleteConfirm) return;
                    try {
                        await del(`/compras/${deleteConfirm.id}`);
                        notify("Compra eliminada", "success");
                        load();
                    } catch (e: any) { notify("Error: " + e.message, "error"); }
                    setDeleteConfirm(null);
                }}
                onCancel={() => setDeleteConfirm(null)}
            />
        </div>
    );
}
