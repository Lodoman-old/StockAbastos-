import { money } from "../format";
import React, { useEffect, useState } from "react";
import { get, post } from "../services/api";
export function CorteDeCaja() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [msg, setMsg] = useState("");
    const [montoApertura, setMontoApertura] = useState("0");
    const [showRetiro, setShowRetiro] = useState(false);
    const [montoRetiro, setMontoRetiro] = useState("");
    const [motivoRetiro, setMotivoRetiro] = useState("");
    const [bodegas, setBodegas] = useState<any[]>([]);
    const [bodegaFiltro, setBodegaFiltro] = useState("");

    const load = () => {
        setLoading(true);
        get("/cortes/hoy").then(setData).catch(() => {}).finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, []);

    useEffect(() => {
        get("/bodegas").then((r: any) => {
            setBodegas(r);
            const def = r.find((b: any) => b.es_default);
            setBodegaFiltro(def?.id || r[0]?.id || "");
        }).catch(() => {});
    }, []);

    const abrir = async () => {
        setMsg("Abriendo caja...");
        try {
            await post("/cortes/abrir", { monto_inicial: parseFloat(montoApertura) || 0 });
            setMsg("Caja abierta");
            load();
        } catch (e: any) {
            setMsg("Error: " + (e.message || "Desconocido"));
        }
    };

    const cerrar = async () => {
        if (!confirm("¿Cerrar el día? No podrás registrar más ventas para hoy.")) return;
        setMsg("Cerrando...");
        try {
            await post("/cortes/cerrar", {});
            setMsg("Corte cerrado exitosamente");
            load();
        } catch (e: any) {
            setMsg("Error: " + (e.message || "Desconocido"));
        }
    };

    const retirar = async () => {
        const m = parseFloat(montoRetiro);
        if (!m || m <= 0) { setMsg("Ingresa un monto válido"); return; }
        if (!confirm(`¿Retirar $${money(m)} de la caja?${motivoRetiro ? ` (${motivoRetiro})` : ""}`)) return;
        setMsg("Registrando retiro...");
        try {
            await post("/cortes/retiro", { monto: m, motivo: motivoRetiro });
            setMsg(`Retiro de $${money(m)} registrado`);
            setShowRetiro(false);
            setMontoRetiro("");
            setMotivoRetiro("");
            load();
        } catch (e: any) {
            setMsg("Error: " + (e.message || "Desconocido"));
        }
    };

    if (loading) return <p style={{ color: "#888" }}>Cargando...</p>;

    const s: React.CSSProperties = {
        background: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.08)", marginBottom: 16,
    };

    return (
        <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                <h2 style={{ margin: 0 }}>Corte de Caja</h2>
                <div style={{ fontSize: 14, color: "#555" }}>
                    {new Date().toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                </div>
            </div>

            {!data?.abierto && !data?.ya_cerrado && (
                <div style={{ background: "#fff8e1", border: "1px solid #ffe082", borderRadius: 12, padding: 20, marginBottom: 16 }}>
                    <h4 style={{ margin: "0 0 8px", fontSize: 14 }}>Abrir caja</h4>
                    <p style={{ fontSize: 13, color: "#666", marginBottom: 12 }}>Registra el monto inicial en caja para poder realizar ventas.</p>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <input type="number" step="0.01" min="0" value={montoApertura}
                            onChange={e => setMontoApertura(e.target.value)}
                            style={{ width: 140, padding: "10px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 14 }} />
                        <button onClick={abrir}
                            style={{ padding: "10px 20px", background: "#ff9800", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: "bold" }}>
                            Abrir caja
                        </button>
                    </div>
                </div>
            )}

            {data?.ya_cerrado && (
                <div style={{ background: "#e8f5e9", color: "#1a8a3a", padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
                    Este día ya fue cerrado a las {data.corte ? new Date(data.corte.cerrado_at).toLocaleTimeString() : ""}
                </div>
            )}

            {data?.abierto && (
                <div style={{ background: "#e3f2fd", color: "#1565c0", padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
                    Caja abierta {data.corte?.abierto_at ? `a las ${new Date(data.corte.abierto_at).toLocaleTimeString()}` : ""}
                    {data.monto_inicial > 0 && <span> — Monto inicial: ${money(data.monto_inicial)}</span>}
                </div>
            )}

            {data?.abierto && !data?.ya_cerrado && (
                <div style={{ marginBottom: 16, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <button onClick={() => setShowRetiro(true)}
                        style={{ padding: "8px 16px", background: "#fff3e0", color: "#e65100", border: "1px solid #ffcc80", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: "bold" }}>
                        Retirar efectivo
                    </button>
                    <select value={bodegaFiltro} onChange={e => setBodegaFiltro(e.target.value)}
                        style={{ padding: "8px 12px", border: "1px solid #90caf9", borderRadius: 8, fontSize: 13, background: "#fff" }}>
                        <option value="">Todas las bodegas</option>
                        {bodegas.map((b: any) => (
                            <option key={b.id} value={b.id}>{b.nombre}</option>
                        ))}
                    </select>
                    <button onClick={() => window.open(`/api/cortes/inventario-ticket?token=${localStorage.getItem("token")}${bodegaFiltro ? `&bodega_id=${bodegaFiltro}` : ""}`, "_blank")}
                        style={{ padding: "8px 16px", background: "#e3f2fd", color: "#1565c0", border: "1px solid #90caf9", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: "bold" }}>
                        Ver inventario
                    </button>
                </div>
            )}

            {showRetiro && (
                <div style={{ background: "#fff8e1", border: "1px solid #ffe082", borderRadius: 12, padding: 20, marginBottom: 16, maxWidth: 400 }}>
                    <h4 style={{ margin: "0 0 8px", fontSize: 14 }}>Retirar efectivo</h4>
                    <input type="number" step="0.01" min="0" placeholder="Monto a retirar" value={montoRetiro}
                        onChange={e => setMontoRetiro(e.target.value)}
                        style={{ width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 14, marginBottom: 8, boxSizing: "border-box" }} />
                    <input type="text" placeholder="Motivo (opcional)" value={motivoRetiro}
                        onChange={e => setMotivoRetiro(e.target.value)}
                        style={{ width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 14, marginBottom: 12, boxSizing: "border-box" }} />
                    <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={retirar}
                            style={{ padding: "10px 20px", background: "#e65100", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: "bold" }}>
                            Retirar
                        </button>
                        <button onClick={() => { setShowRetiro(false); setMontoRetiro(""); setMotivoRetiro(""); }}
                            style={{ padding: "10px 20px", background: "#ccc", color: "#333", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14 }}>
                            Cancelar
                        </button>
                    </div>
                </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 24 }}>
                <div style={{ ...s, textAlign: "center" }}>
                    <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase", marginBottom: 4 }}>Ventas</div>
                    <div style={{ fontSize: 28, fontWeight: "bold", color: "#1a8a3a" }}>{data?.total_ventas || 0}</div>
                </div>
                <div style={{ ...s, textAlign: "center" }}>
                    <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase", marginBottom: 4 }}>Ingresos</div>
                    <div style={{ fontSize: 28, fontWeight: "bold", color: "#1a8a3a" }}>${(data?.total_ingresos || 0).toFixed(2)}</div>
                </div>
                <div style={{ ...s, textAlign: "center" }}>
                    <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase", marginBottom: 4 }}>Kg vendidos</div>
                    <div style={{ fontSize: 28, fontWeight: "bold", color: "#1976d2" }}>{(data?.total_kg || 0).toFixed(1)}</div>
                </div>
                <div style={{ ...s, textAlign: "center" }}>
                    <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase", marginBottom: 4 }}>Gastos</div>
                    <div style={{ fontSize: 28, fontWeight: "bold", color: "#d32f2f" }}>${(data?.total_gastos || 0).toFixed(2)}</div>
                </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 24 }}>
                <div style={s}>
                    <h4 style={{ margin: "0 0 12px", fontSize: 14 }}>Desglose por tipo de pago</h4>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f0f0f0", fontSize: 13 }}>
                        <span style={{ color: "#4caf50", fontWeight: "bold" }}>Contado</span>
                        <span><strong>{data?.ventas_contado || 0}</strong> ventas — ${(data?.total_contado || 0).toFixed(2)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f0f0f0", fontSize: 13 }}>
                        <span style={{ color: "#ff9800", fontWeight: "bold" }}>Crédito</span>
                        <span><strong>{data?.ventas_credito || 0}</strong> ventas — ${(data?.total_credito || 0).toFixed(2)}</span>
                    </div>
                </div>

                <div style={s}>
                    <h4 style={{ margin: "0 0 12px", fontSize: 14 }}>Resumen final</h4>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 13 }}>
                        <span>Total ingresos</span><span style={{ fontWeight: "bold" }}>${(data?.total_ingresos || 0).toFixed(2)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 13 }}>
                        <span>Total gastos</span><span style={{ fontWeight: "bold", color: "#d32f2f" }}>- ${(data?.total_gastos || 0).toFixed(2)}</span>
                    </div>
                    {(data?.total_retiros || 0) > 0 && (
                        <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 13 }}>
                            <span>Retiros</span><span style={{ fontWeight: "bold", color: "#e65100" }}>- ${(data?.total_retiros || 0).toFixed(2)}</span>
                        </div>
                    )}
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", marginTop: 4, borderTop: "2px solid #333", fontSize: 16, fontWeight: "bold" }}>
                        <span>Saldo final</span>
                        <span style={{ color: (data?.saldo_final || 0) >= 0 ? "#1a8a3a" : "#d32f2f" }}>
                            ${(data?.saldo_final || 0).toFixed(2)}
                        </span>
                    </div>
                </div>
            </div>

            {!data?.ya_cerrado && (
                <button onClick={cerrar}
                    style={{ padding: "12px 24px", background: "#1a8a3a", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 15, fontWeight: "bold" }}>
                    Cerrar día
                </button>
            )}

            {data?.ya_cerrado && data?.kg_vendidos && data.kg_vendidos.length > 0 && (
                <div style={{ ...s, marginBottom: 12 }}>
                    <h4 style={{ margin: "0 0 8px", fontSize: 14 }}>KG vendidos del día</h4>
                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                            <thead>
                                <tr style={{ background: "#f5f5f5", textAlign: "left" }}>
                                    <th style={{ padding: "6px 8px" }}>Bodega</th>
                                    <th style={{ padding: "6px 8px" }}>Producto</th>
                                    <th style={{ padding: "6px 8px", textAlign: "center" }}>CP (kg)</th>
                                    <th style={{ padding: "6px 8px", textAlign: "center" }}>CS (kg)</th>
                                    <th style={{ padding: "6px 8px", textAlign: "center" }}>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.kg_vendidos.map((r: any, i: number) => (
                                    <tr key={i} style={{ borderTop: "1px solid #eee" }}>
                                        <td style={{ padding: "5px 8px" }}>{r.bodega}</td>
                                        <td style={{ padding: "5px 8px" }}>{r.producto}</td>
                                        <td style={{ padding: "5px 8px", textAlign: "center" }}>{r.kg_caja_pesada > 0 ? `${r.kg_caja_pesada.toFixed(1)}` : "-"}</td>
                                        <td style={{ padding: "5px 8px", textAlign: "center" }}>{r.kg_caja_sellada > 0 ? `${r.kg_caja_sellada.toFixed(1)}` : "-"}</td>
                                        <td style={{ padding: "5px 8px", textAlign: "center", fontWeight: 600 }}>{r.total_kg.toFixed(1)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {data?.ya_cerrado && data?.inventario && data.inventario.length > 0 && (
                <div style={s}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                        <h4 style={{ margin: 0, fontSize: 14 }}>Inventario de cajas</h4>
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                            <select value={bodegaFiltro} onChange={e => setBodegaFiltro(e.target.value)}
                                style={{ padding: "4px 8px", border: "1px solid #ccc", borderRadius: 6, fontSize: 12, background: "#fff" }}>
                                <option value="">Todas</option>
                                {bodegas.map((b: any) => (
                                    <option key={b.id} value={b.id}>{b.nombre}</option>
                                ))}
                            </select>
                            <button onClick={() => window.open(`/api/cortes/inventario-ticket?token=${localStorage.getItem("token")}${bodegaFiltro ? `&bodega_id=${bodegaFiltro}` : ""}`, "_blank")}
                                style={{ background: "#1565c0", color: "#fff", border: "none", borderRadius: 6, padding: "6px 12px", cursor: "pointer", fontSize: 12, fontWeight: "bold" }}>
                                Imprimir
                            </button>
                        </div>
                    </div>
                    <div style={{ display: "flex", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
                        <div style={{ fontSize: 12, background: "#e8f5e9", padding: "6px 12px", borderRadius: 8 }}>
                            Completas: <strong>{data.inventario.reduce((s: number, r: any) => s + r.tarimas_completas, 0)} tarimas</strong>
                            ({data.inventario.reduce((s: number, r: any) => s + parseFloat(r.cajas_completas), 0).toFixed(1)} cajas)
                        </div>
                        <div style={{ fontSize: 12, background: "#f3e5f5", padding: "6px 12px", borderRadius: 8 }}>
                            Parciales: <strong>{data.inventario.reduce((s: number, r: any) => s + r.tarimas_parciales, 0)} tarimas</strong>
                            ({data.inventario.reduce((s: number, r: any) => s + parseFloat(r.cajas_parciales), 0).toFixed(1)} cajas)
                        </div>
                    </div>
                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                            <thead>
                                <tr style={{ background: "#f5f5f5", textAlign: "left" }}>
                                    <th style={{ padding: "6px 8px" }}>Bodega</th>
                                    <th style={{ padding: "6px 8px" }}>Producto</th>
                                    <th style={{ padding: "6px 8px", textAlign: "center" }}>Completas</th>
                                    <th style={{ padding: "6px 8px", textAlign: "center" }}>Cajas</th>
                                    <th style={{ padding: "6px 8px", textAlign: "center" }}>Parciales</th>
                                    <th style={{ padding: "6px 8px", textAlign: "center" }}>Cajas</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.inventario.map((r: any, i: number) => (
                                    <tr key={i} style={{ borderTop: "1px solid #eee" }}>
                                        <td style={{ padding: "5px 8px" }}>{r.bodega}</td>
                                        <td style={{ padding: "5px 8px" }}>{r.producto}</td>
                                        <td style={{ padding: "5px 8px", textAlign: "center" }}>{r.tarimas_completas}</td>
                                        <td style={{ padding: "5px 8px", textAlign: "center" }}>{parseFloat(r.cajas_completas).toFixed(1)}</td>
                                        <td style={{ padding: "5px 8px", textAlign: "center" }}>{r.tarimas_parciales}</td>
                                        <td style={{ padding: "5px 8px", textAlign: "center" }}>{parseFloat(r.cajas_parciales).toFixed(1)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {msg && (
                <div style={{
                    padding: 8, borderRadius: 8, fontSize: 13, marginTop: 8,
                    background: msg.includes("Error") || msg.includes("error") ? "#fef2f2" : "#e8f5e9",
                    color: msg.includes("Error") || msg.includes("error") ? "#dc2626" : "#1a8a3a",
                }}>
                    {msg}
                </div>
            )}
        </div>
    );
}


