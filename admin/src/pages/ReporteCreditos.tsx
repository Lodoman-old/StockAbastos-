import React, { useEffect, useState } from "react";
import { get } from "../services/api";

export function ReporteCreditos() {
    const [creditos, setCreditos] = useState<any[]>([]);
    const [clientes, setClientes] = useState<any[]>([]);
    const [desde, setDesde] = useState("");
    const [hasta, setHasta] = useState("");
    const [clienteId, setClienteId] = useState("");
    const [showPagos, setShowPagos] = useState<any>(null);
    const [pagos, setPagos] = useState<any[]>([]);

    useEffect(() => { get("/clientes").then(setClientes).catch(() => {}); }, []);

    const load = () => {
        const params = new URLSearchParams();
        if (desde) params.set("desde", desde);
        if (hasta) params.set("hasta", hasta);
        if (clienteId) params.set("cliente_id", clienteId);
        get(`/reportes/creditos?${params}`).then(setCreditos).catch(() => {});
    };

    useEffect(() => { load(); }, []);

    const abrirPagos = async (c: any) => {
        setShowPagos(c);
        try { setPagos(await get(`/pagos/venta/${c.venta_id || c.id}`)); } catch { setPagos([]); }
    };

    const totalVendido = creditos.reduce((s: number, c: any) => s + parseFloat(c.total || 0), 0);
    const totalPendiente = creditos.reduce((s: number, c: any) => s + parseFloat(c.saldo_pendiente || 0), 0);

    const inputStyle: React.CSSProperties = { padding: "8px 10px", border: "1px solid #ddd", borderRadius: 6, fontSize: 13 };

    return (
        <div>
            <h1>Reporte de Créditos</h1>
            <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
                <div>
                    <label style={{ fontSize: 12, color: "#555", display: "block" }}>Desde</label>
                    <input type="date" value={desde} onChange={e => setDesde(e.target.value)} style={inputStyle} />
                </div>
                <div>
                    <label style={{ fontSize: 12, color: "#555", display: "block" }}>Hasta</label>
                    <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} style={inputStyle} />
                </div>
                <div>
                    <label style={{ fontSize: 12, color: "#555", display: "block" }}>Cliente</label>
                    <select value={clienteId} onChange={e => setClienteId(e.target.value)} style={inputStyle}>
                        <option value="">Todos</option>
                        {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                </div>
                <button onClick={load}
                    style={{ padding: "8px 16px", background: "#1a8a3a", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: "bold" }}>
                    Filtrar
                </button>
            </div>

            <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
                <div style={{ background: "#fff8e1", borderRadius: 8, padding: "10px 16px" }}>
                    <span style={{ fontSize: 12, color: "#555" }}>Total vendido</span>
                    <div style={{ fontSize: 22, fontWeight: "bold", color: "#ff9800" }}>${totalVendido.toFixed(2)}</div>
                </div>
                <div style={{ background: "#fef2f2", borderRadius: 8, padding: "10px 16px" }}>
                    <span style={{ fontSize: 12, color: "#555" }}>Pendiente</span>
                    <div style={{ fontSize: 22, fontWeight: "bold", color: "#d32f2f" }}>${totalPendiente.toFixed(2)}</div>
                </div>
            </div>

            <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: 8, overflow: "hidden", minWidth: 700 }}>
                    <thead>
                        <tr style={{ background: "#f5f5f5", textAlign: "left" }}>
                            <th style={{ padding: 10 }}>Folio</th><th style={{ padding: 10 }}>Fecha</th>
                            <th style={{ padding: 10 }}>Cliente</th><th style={{ padding: 10 }}>Teléfono</th>
                            <th style={{ padding: 10 }}>Total</th><th style={{ padding: 10 }}>Saldo</th>
                            <th style={{ padding: 10 }}>Vence</th><th style={{ padding: 10 }}>Estado</th><th style={{ padding: 10 }}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {creditos.map(c => {
                            const vence = c.fecha_vencimiento ? new Date(c.fecha_vencimiento) : null;
                            const hoy = new Date();
                            const vencido = vence && vence < hoy;
                            const porVencer = vence && vence >= hoy && (vence.getTime() - hoy.getTime()) <= 7 * 86400000;
                            return (
                                <tr key={c.id} style={{ borderTop: "1px solid #eee" }}>
                                    <td style={{ padding: 10, fontWeight: "bold", fontSize: 12 }}>{c.folio}</td>
                                    <td style={{ padding: 10, fontSize: 12, whiteSpace: "nowrap" }}>{new Date(c.created_at).toLocaleDateString()}</td>
                                    <td style={{ padding: 10, fontSize: 12 }}>{c.cliente_nombre || c.cliente}</td>
                                    <td style={{ padding: 10, fontSize: 12 }}>{c.cliente_telefono || "-"}</td>
                                    <td style={{ padding: 10, fontSize: 12 }}>${parseFloat(c.total || 0).toFixed(2)}</td>
                                    <td style={{ padding: 10, fontSize: 12, fontWeight: "bold", color: parseFloat(c.saldo_pendiente || 0) > 0 ? "#d32f2f" : "#4caf50" }}>
                                        ${parseFloat(c.saldo_pendiente || 0).toFixed(2)}
                                    </td>
                                    <td style={{ padding: 10, fontSize: 12, whiteSpace: "nowrap" }}>{vence ? vence.toLocaleDateString() : "-"}</td>
                                    <td style={{ padding: 10, fontSize: 12, fontWeight: "bold", color: vencido ? "#d32f2f" : porVencer ? "#ff9800" : "#4caf50" }}>
                                        {parseFloat(c.saldo_pendiente || 0) <= 0 ? "Pagado" : vencido ? "Vencido" : porVencer ? "Próximo" : "Al día"}
                                    </td>
                                    <td style={{ padding: 10 }}>
                                        <button onClick={() => abrirPagos(c)}
                                            style={{ background: "#1976d2", color: "#fff", border: "none", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12, whiteSpace: "nowrap" }}>
                                            Pagos
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {showPagos && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}
                    onClick={() => setShowPagos(null)}>
                    <div style={{ background: "#fff", borderRadius: 16, padding: 24, maxWidth: 500, width: "90%", maxHeight: "80vh", overflow: "auto" }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                            <h3 style={{ margin: 0 }}>Detalle de crédito</h3>
                            <button onClick={() => setShowPagos(null)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#888" }}>✕</button>
                        </div>

                        <div style={{ background: "#f5f5f5", borderRadius: 8, padding: 12, marginBottom: 16 }}>
                            <div style={{ fontWeight: "bold", fontSize: 14 }}>{showPagos.cliente_nombre || showPagos.cliente || "Sin nombre"}</div>
                            <div style={{ fontSize: 12, color: "#555", marginTop: 4 }}>Folio: {showPagos.folio}</div>
                            <div style={{ fontSize: 12, color: "#555" }}>Tel: {showPagos.cliente_telefono || "-"}</div>
                            <div style={{ fontSize: 12, color: "#555" }}>Fecha venta: {new Date(showPagos.created_at).toLocaleDateString()}</div>
                            <div style={{ fontSize: 12, color: "#555" }}>Vence: {showPagos.fecha_vencimiento ? new Date(showPagos.fecha_vencimiento).toLocaleDateString() : "-"}</div>
                        </div>

                        <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                            <div style={{ flex: 1, background: "#fff8e1", borderRadius: 8, padding: "8px 12px", textAlign: "center" }}>
                                <div style={{ fontSize: 11, color: "#666" }}>Total</div>
                                <div style={{ fontSize: 18, fontWeight: "bold", color: "#ff9800" }}>${parseFloat(showPagos.total || 0).toFixed(2)}</div>
                            </div>
                            <div style={{ flex: 1, background: "#fef2f2", borderRadius: 8, padding: "8px 12px", textAlign: "center" }}>
                                <div style={{ fontSize: 11, color: "#666" }}>Pendiente</div>
                                <div style={{ fontSize: 18, fontWeight: "bold", color: "#d32f2f" }}>${parseFloat(showPagos.saldo_pendiente || 0).toFixed(2)}</div>
                            </div>
                        </div>

                        <h4 style={{ margin: "0 0 8px", fontSize: 14 }}>Pagos realizados</h4>
                        {pagos.length > 0 ? (
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                                <thead>
                                    <tr style={{ background: "#f5f5f5" }}>
                                        <th style={{ padding: "6px 8px", textAlign: "left" }}>Fecha</th>
                                        <th style={{ padding: "6px 8px", textAlign: "right" }}>Monto</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pagos.map((p: any) => (
                                        <tr key={p.id} style={{ borderTop: "1px solid #eee" }}>
                                            <td style={{ padding: "6px 8px" }}>{new Date(p.fecha).toLocaleDateString()}</td>
                                            <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: "bold", color: "#1a8a3a" }}>
                                                +${parseFloat(p.monto).toFixed(2)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div style={{ textAlign: "center", color: "#999", padding: 20, fontSize: 13 }}>Sin pagos registrados</div>
                        )}

                        <div style={{ fontSize: 12, color: "#888", marginTop: 12, textAlign: "center" }}>
                            {parseFloat(showPagos.saldo_pendiente || 0) <= 0
                                ? "✓ Crédito liquidado"
                                : `Saldo pendiente: $${parseFloat(showPagos.saldo_pendiente).toFixed(2)}`}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
