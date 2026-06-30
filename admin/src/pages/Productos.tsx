import { money } from "../format";
import React, { useEffect, useState } from "react";
import { get, post, API } from "../services/api";
export function Productos() {
    const [productos, setProductos] = useState<any[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [form, setForm] = useState({
        sku: "", nombre: "", unidad_compra: "CAJA",
        codigo_de_barras: "",
        precio_por_unidad: "",
        precio_mayoreo_kg: "", precio_menudeo_kg: "",
        precio_caja_sellada: "", peso_caja_sellada_kg: "", destare_kg: "2",
        modalidad_caja_pesada: false, modalidad_caja_sellada: false,
        modalidad_kilo_suelto: false, modalidad_unidad: false,
    });

    useEffect(() => { get("/productos").then(setProductos).catch(() => {}); }, []);

    function openNew() {
        setEditId(null);
        setForm({ sku: "", nombre: "", unidad_compra: "CAJA", codigo_de_barras: "", precio_por_unidad: "", precio_mayoreo_kg: "", precio_menudeo_kg: "", precio_caja_sellada: "", peso_caja_sellada_kg: "", destare_kg: "2", modalidad_caja_pesada: false, modalidad_caja_sellada: false, modalidad_kilo_suelto: false, modalidad_unidad: false });
        setShowModal(true);
    }

    function openEdit(p: any) {
        setEditId(p.id);
        setForm({
            sku: p.sku || "", nombre: p.nombre || "", unidad_compra: p.unidad_compra || "CAJA",
            codigo_de_barras: p.codigo_de_barras || "",
            precio_por_unidad: p.precio_por_unidad?.toString() || "",
            precio_mayoreo_kg: p.precio_mayoreo_kg?.toString() || "",
            precio_menudeo_kg: p.precio_menudeo_kg?.toString() || "",
            precio_caja_sellada: p.precio_caja_sellada?.toString() || "",
            peso_caja_sellada_kg: p.peso_caja_sellada_kg?.toString() || "",
            destare_kg: p.destare_kg?.toString() || "2",
            modalidad_caja_pesada: p.modalidad_caja_pesada || false,
            modalidad_caja_sellada: p.modalidad_caja_sellada || false,
            modalidad_kilo_suelto: p.modalidad_kilo_suelto || false,
            modalidad_unidad: p.modalidad_unidad || false,
        });
        setShowModal(true);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!form.modalidad_caja_pesada && !form.modalidad_caja_sellada && !form.modalidad_kilo_suelto && !form.modalidad_unidad) {
            return alert("Selecciona al menos una modalidad de venta");
        }
        const toNum = (v: string) => (v ? parseFloat(v) : null);
        const payload = {
            ...form,
            precio_por_unidad: toNum(form.precio_por_unidad),
            precio_mayoreo_kg: toNum(form.precio_mayoreo_kg),
            precio_menudeo_kg: toNum(form.precio_menudeo_kg),
            precio_caja_sellada: toNum(form.precio_caja_sellada),
            peso_caja_sellada_kg: toNum(form.peso_caja_sellada_kg),
            destare_kg: toNum(form.destare_kg),
        };
        if (editId) {
            await fetch(`${API}/productos/${editId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", Authorization: "Bearer " + localStorage.getItem("token") },
                body: JSON.stringify(payload),
            });
        } else {
            await post("/productos", payload);
        }
        setShowModal(false);
        setEditId(null);
        setForm({ sku: "", nombre: "", unidad_compra: "CAJA", codigo_de_barras: "", precio_por_unidad: "", precio_mayoreo_kg: "", precio_menudeo_kg: "", precio_caja_sellada: "", peso_caja_sellada_kg: "", destare_kg: "2", modalidad_caja_pesada: false, modalidad_caja_sellada: false, modalidad_kilo_suelto: false, modalidad_unidad: false });
        get("/productos").then(setProductos);
    }

    const toggle = (k: string) => {
        const cur = form as any;
        if (cur[k]) return setForm(f => ({ ...f, [k]: false }));
        if (k === "modalidad_unidad") {
            setForm(f => ({ ...f, modalidad_unidad: true, modalidad_caja_pesada: false, modalidad_caja_sellada: false, modalidad_kilo_suelto: false }));
        } else if (k === "modalidad_caja_pesada") {
            setForm(f => ({ ...f, modalidad_caja_pesada: true, modalidad_caja_sellada: false, modalidad_unidad: false }));
        } else if (k === "modalidad_caja_sellada") {
            setForm(f => ({ ...f, modalidad_caja_sellada: true, modalidad_caja_pesada: false, modalidad_unidad: false }));
        } else {
            setForm(f => ({ ...f, modalidad_kilo_suelto: true, modalidad_unidad: false }));
        }
    };

    const inputBase: React.CSSProperties = { width: "100%", padding: "10px 12px", fontSize: 14, border: "1px solid #ddd", borderRadius: 8, boxSizing: "border-box" };

    function modalidadLabel(key: string) {
        const labels: Record<string, string> = {
            modalidad_caja_pesada: "Caja pesada (mayoreo)",
            modalidad_caja_sellada: "Caja sellada (mayoreo)",
            modalidad_kilo_suelto: "Kilo suelto (menudeo)",
            modalidad_unidad: "Unidad (refrescos, sabritas...)",
        };
        return labels[key] || key;
    }

    return (
        <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 8, flexWrap: "wrap" }}>
                <h1>Productos</h1>
                <button onClick={openNew} style={{ background: "#1a8a3a", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 8, cursor: "pointer", whiteSpace: "nowrap" }}>+ Nuevo</button>
            </div>

            {showModal && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }} onClick={() => setShowModal(false)}>
                    <div style={{ background: "#fff", borderRadius: 16, padding: 32, maxWidth: 560, width: "90%" }} onClick={e => e.stopPropagation()}>
                        <h3 style={{ marginTop: 0 }}>{editId ? "Editar producto" : "Nuevo producto"}</h3>
                        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                                <input placeholder="SKU *" value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} required style={inputBase} />
                                <input placeholder="Código de barras" value={form.codigo_de_barras} onChange={e => setForm({ ...form, codigo_de_barras: e.target.value })} style={inputBase} />
                            </div>
                            <input placeholder="Nombre *" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} required style={inputBase} />
                            <div>
                                <label style={{ fontSize: 13, color: "#555", display: "block", marginBottom: 4 }}>Unidad de compra</label>
                                <select value={form.unidad_compra} onChange={e => setForm({ ...form, unidad_compra: e.target.value })} style={inputBase}>
                                    <option value="CAJA">Caja</option><option value="KILO">Kilo</option>
                                </select>
                            </div>

                            <div style={{ borderTop: "1px solid #eee", paddingTop: 12 }}>
                                <label style={{ fontSize: 13, color: "#555", display: "block", marginBottom: 8, fontWeight: "bold" }}>Modalidades de venta</label>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 16px" }}>
                                    {["modalidad_caja_pesada", "modalidad_caja_sellada", "modalidad_kilo_suelto", "modalidad_unidad"].map(k => (
                                        <label key={k} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14 }}>
                                            <input type="checkbox" checked={(form as any)[k]} onChange={() => toggle(k)} style={{ width: 18, height: 18, cursor: "pointer" }} />
                                            {modalidadLabel(k)}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {form.modalidad_caja_pesada && (
                                <div style={{ borderTop: "1px solid #eee", paddingTop: 12 }}>
                                    <label style={{ fontSize: 13, color: "#555", display: "block", marginBottom: 8, fontWeight: "bold" }}>Caja pesada (mayoreo)</label>
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                                        <div>
                                            <label style={{ fontSize: 13, color: "#555", display: "block", marginBottom: 4 }}>Precio mayoreo ($/kg)</label>
                                            <input placeholder="0.00" type="number" step="0.01" value={form.precio_mayoreo_kg} onChange={e => setForm({ ...form, precio_mayoreo_kg: e.target.value })} style={inputBase} />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: 13, color: "#555", display: "block", marginBottom: 4 }}>Destare (kg)</label>
                                            <input placeholder="2.0" type="number" step="0.01" value={form.destare_kg} onChange={e => setForm({ ...form, destare_kg: e.target.value })} style={inputBase} />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {form.modalidad_caja_sellada && (
                                <div style={{ borderTop: "1px solid #eee", paddingTop: 12 }}>
                                    <label style={{ fontSize: 13, color: "#555", display: "block", marginBottom: 8, fontWeight: "bold" }}>Caja sellada (mayoreo)</label>
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                                        <input placeholder="Precio por caja sellada ($)" type="number" step="0.01" value={form.precio_caja_sellada} onChange={e => setForm({ ...form, precio_caja_sellada: e.target.value })} style={inputBase} />
                                        <input placeholder="Peso por caja (kg)" type="number" step="0.01" value={form.peso_caja_sellada_kg} onChange={e => setForm({ ...form, peso_caja_sellada_kg: e.target.value })} style={inputBase} />
                                    </div>
                                </div>
                            )}

                            {form.modalidad_kilo_suelto && (
                                <div style={{ borderTop: "1px solid #eee", paddingTop: 12 }}>
                                    <label style={{ fontSize: 13, color: "#555", display: "block", marginBottom: 8, fontWeight: "bold" }}>Kilo suelto (menudeo)</label>
                                    <input placeholder="Precio menudeo por kg ($)" type="number" step="0.01" value={form.precio_menudeo_kg} onChange={e => setForm({ ...form, precio_menudeo_kg: e.target.value })} style={inputBase} />
                                </div>
                            )}

                            {form.modalidad_unidad && (
                                <div style={{ borderTop: "1px solid #eee", paddingTop: 12 }}>
                                    <label style={{ fontSize: 13, color: "#555", display: "block", marginBottom: 8, fontWeight: "bold" }}>Unidad (menudeo)</label>
                                    <input placeholder="Precio por unidad ($)" type="number" step="0.01" value={form.precio_por_unidad} onChange={e => setForm({ ...form, precio_por_unidad: e.target.value })} style={inputBase} />
                                </div>
                            )}

                            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                                <button type="submit" style={{ flex: 1, padding: "10px 20px", background: "#1a8a3a", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: "bold" }}>Guardar</button>
                                <button type="button" onClick={() => setShowModal(false)} style={{ padding: "10px 20px", background: "#888", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}>Cancelar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: 8, overflow: "hidden", minWidth: 800 }}>
                    <thead>
                        <tr style={{ background: "#f5f5f5", textAlign: "left" }}>
                            <th style={{ padding: 10 }}>SKU</th>
                            <th style={{ padding: 10 }}>Nombre</th>
                            <th style={{ padding: 10 }}>Compra</th>
                            <th style={{ padding: 10 }}>Modalidades</th>
                            <th style={{ padding: 10 }}>Mayoreo $/kg</th>
                            <th style={{ padding: 10 }}>Caja sellada</th>
                            <th style={{ padding: 10 }}>Menudeo $/kg</th>
                            <th style={{ padding: 10 }}>Unidad $</th>
                            <th style={{ padding: 10 }}>Barras</th>
                            <th style={{ padding: 10 }}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {productos.map((p: any) => {
                            const mods: string[] = [];
                            if (p.modalidad_caja_pesada) mods.push("CP");
                            if (p.modalidad_caja_sellada) mods.push("CS");
                            if (p.modalidad_kilo_suelto) mods.push("KS");
                            if (p.modalidad_unidad) mods.push("UN");
                            return (
                                <tr key={p.id} style={{ borderTop: "1px solid #eee" }}>
                                    <td style={{ padding: 10 }}>{p.sku}</td>
                                    <td style={{ padding: 10 }}>{p.nombre}</td>
                                    <td style={{ padding: 10, fontSize: 12 }}>{p.unidad_compra}</td>
                                    <td style={{ padding: 10, fontSize: 11 }}>
                                        {mods.map(m => (
                                            <span key={m} style={{
                                                display: "inline-block", padding: "2px 6px", borderRadius: 4,
                                                background: "#e8f5e9", color: "#2e7d32", marginRight: 4, fontWeight: "bold", fontSize: 10,
                                            }}>{m}</span>
                                        ))}
                                    </td>
                                    <td style={{ padding: 10 }}>{p.precio_mayoreo_kg ? `$${money(p.precio_mayoreo_kg)}` : "-"}</td>
                                    <td style={{ padding: 10, fontSize: 12 }}>
                                        {p.precio_caja_sellada ? `$${money(p.precio_caja_sellada)}` : "-"}
                                        {p.peso_caja_sellada_kg ? ` (${p.peso_caja_sellada_kg}kg)` : ""}
                                    </td>
                                    <td style={{ padding: 10 }}>{p.precio_menudeo_kg ? `$${money(p.precio_menudeo_kg)}` : "-"}</td>
                                    <td style={{ padding: 10 }}>{p.precio_por_unidad ? `$${money(p.precio_por_unidad)}` : "-"}</td>
                                    <td style={{ padding: 10, fontSize: 12 }}>{p.codigo_de_barras || "-"}</td>
                                    <td style={{ padding: 10 }}>
                                        <button onClick={() => openEdit(p)}
                                            style={{ background: "none", border: "1px solid #1a8a3a", color: "#1a8a3a", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12 }}>
                                            Editar
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}


