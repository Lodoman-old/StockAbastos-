import { money } from "../format";
import React, { useEffect, useState } from "react";
import { IonPage, IonContent, IonCard, IonCardContent, IonText, IonItem, IonLabel, IonList } from "@ionic/react";
import { get, post } from "../services/api";

export function ReporteCreditos() {
    const [creditos, setCreditos] = useState<any[]>([]);
    const [clientes, setClientes] = useState<any[]>([]);
    const [desde, setDesde] = useState("");
    const [hasta, setHasta] = useState("");
    const [clienteId, setClienteId] = useState("");
    const [sel, setSel] = useState<any>(null);
    const [pagos, setPagos] = useState<any[]>([]);
    const [pagoMonto, setPagoMonto] = useState("");

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
        setSel(c);
        setPagoMonto("");
        try { setPagos(await get(`/pagos/venta/${c.venta_id || c.id}`)); } catch { setPagos([]); }
    };

    const handlePagar = async () => {
        if (!pagoMonto || parseFloat(pagoMonto) <= 0) return alert("Monto inválido");
        if (parseFloat(pagoMonto) > parseFloat(sel.saldo_pendiente)) return alert("El monto excede el saldo");
        try {
            const resp = await post("/pagos", { venta_id: sel.venta_id || sel.id, monto: parseFloat(pagoMonto) });
            const pagoId = resp?.id;
            if (pagoId) {
                const token = localStorage.getItem("token");
                window.open(`/api/ticket/pago/${pagoId}?token=${token}`, "_blank");
            }
            setSel(null);
            load();
        } catch (e: any) { alert("Error: " + (e.message || e)); }
    };

    const totalPendiente = creditos.reduce((s: number, c: any) => s + parseFloat(c.saldo_pendiente || 0), 0);

    const inputStyle: React.CSSProperties = { width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 6, fontSize: 13 };

    return (
        <IonPage>
            <IonContent className="ion-padding">
                <h2 style={{ marginTop: 0 }}>Reporte de Créditos</h2>

                <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 100 }}>
                        <label style={{ fontSize: 11, color: "#555" }}>Desde</label>
                        <input type="date" value={desde} onChange={e => setDesde(e.target.value)} style={inputStyle} />
                    </div>
                    <div style={{ flex: 1, minWidth: 100 }}>
                        <label style={{ fontSize: 11, color: "#555" }}>Hasta</label>
                        <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} style={inputStyle} />
                    </div>
                    <div style={{ flex: 1, minWidth: 100 }}>
                        <label style={{ fontSize: 11, color: "#555" }}>Cliente</label>
                        <select value={clienteId} onChange={e => setClienteId(e.target.value)} style={inputStyle}>
                            <option value="">Todos</option>
                            {clientes.map((c: any) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                        </select>
                    </div>
                    <div style={{ display: "flex", alignItems: "flex-end" }}>
                        <button onClick={load}
                            style={{ padding: "8px 14px", background: "#1a8a3a", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: "bold", fontSize: 12 }}>
                            Filtrar
                        </button>
                    </div>
                </div>

                <IonCard style={{ background: "#fef2f2" }}>
                    <IonCardContent>
                        <IonText color="medium"><p style={{ fontSize: 12, margin: 0 }}>Total pendiente</p></IonText>
                        <h2 style={{ color: "#d32f2f", margin: "4px 0 0", fontSize: 22, fontWeight: "bold" }}>${money(totalPendiente)}</h2>
                    </IonCardContent>
                </IonCard>

                {creditos.length > 0 ? (
                    <IonCard>
                        <IonCardContent style={{ padding: 0 }}>
                            <IonList>
                                {creditos.map((c: any) => {
                                    const vence = c.fecha_vencimiento ? new Date(c.fecha_vencimiento) : null;
                                    const hoy = new Date();
                                    const vencido = vence && vence < hoy;
                                    return (
                                        <IonItem key={c.venta_id || c.id} detail onClick={() => abrirPagos(c)}>
                                            <IonLabel>
                                                <div style={{ fontWeight: "bold", fontSize: 14 }}>{c.cliente_nombre || c.cliente || "Sin nombre"}</div>
                                                <div style={{ fontSize: 11, color: "#666" }}>
                                                    Folio: {c.folio} | ${money(c.total || 0)}
                                                </div>
                                                <div style={{ fontSize: 11, color: vencido ? "#d32f2f" : "#ff9800" }}>
                                                    {vence ? `Vence: ${vence.toLocaleDateString()}` : "Sin vencimiento"}
                                                </div>
                                            </IonLabel>
                                            <IonLabel slot="end" style={{ textAlign: "right" }}>
                                                <div style={{ fontWeight: "bold", color: parseFloat(c.saldo_pendiente || 0) > 0 ? "#d32f2f" : "#4caf50" }}>
                                                    ${money(c.saldo_pendiente || 0)}
                                                </div>
                                                <div style={{ fontSize: 10, color: vencido ? "#d32f2f" : "#999" }}>
                                                    {parseFloat(c.saldo_pendiente || 0) <= 0 ? "Pagado" : vencido ? "Vencido" : "Pendiente"}
                                                </div>
                                            </IonLabel>
                                        </IonItem>
                                    );
                                })}
                            </IonList>
                        </IonCardContent>
                    </IonCard>
                ) : <p style={{ color: "#999", textAlign: "center" }}>Sin créditos</p>}

                {sel && (
                    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}
                        onClick={() => setSel(null)}>
                        <div style={{ background: "#fff", borderRadius: 16, padding: 20, maxWidth: 400, width: "90%", maxHeight: "80vh", overflow: "auto" }}
                            onClick={e => e.stopPropagation()}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                                <h3 style={{ margin: 0, fontSize: 16 }}>Detalle de crédito</h3>
                                <button onClick={() => setSel(null)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#888" }}>✕</button>
                            </div>

                            <div style={{ background: "#f5f5f5", borderRadius: 8, padding: 10, marginBottom: 12, fontSize: 13 }}>
                                <div style={{ fontWeight: "bold" }}>{sel.cliente_nombre || sel.cliente || "Sin nombre"}</div>
                                <div style={{ color: "#555", marginTop: 2 }}>Folio: {sel.folio} | Vence: {sel.fecha_vencimiento ? new Date(sel.fecha_vencimiento).toLocaleDateString() : "-"}</div>
                            </div>

                            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                                <div style={{ flex: 1, background: "#fff8e1", borderRadius: 8, padding: "6px 10px", textAlign: "center" }}>
                                    <div style={{ fontSize: 10, color: "#666" }}>Total</div>
                                    <div style={{ fontSize: 16, fontWeight: "bold", color: "#ff9800" }}>${money(sel.total || 0)}</div>
                                </div>
                                <div style={{ flex: 1, background: "#fef2f2", borderRadius: 8, padding: "6px 10px", textAlign: "center" }}>
                                    <div style={{ fontSize: 10, color: "#666" }}>Pendiente</div>
                                    <div style={{ fontSize: 16, fontWeight: "bold", color: "#d32f2f" }}>${money(sel.saldo_pendiente || 0)}</div>
                                </div>
                            </div>

                            <h4 style={{ fontSize: 13, margin: "0 0 6px" }}>Pagos realizados</h4>
                            {pagos.length > 0 ? (
                                <div style={{ fontSize: 13, marginBottom: 12 }}>
                                    {pagos.map((p: any) => (
                                        <div key={p.id} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid #eee" }}>
                                            <span>{new Date(p.fecha).toLocaleDateString()}</span>
                                            <span style={{ fontWeight: "bold", color: "#1a8a3a" }}>+${money(p.monto)}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : <p style={{ color: "#999", fontSize: 12, textAlign: "center" }}>Sin pagos</p>}

                            {parseFloat(sel.saldo_pendiente || 0) > 0 && (
                                <>
                                    <input type="number" step="0.01" min="0" placeholder="Monto a pagar"
                                        value={pagoMonto} onChange={e => setPagoMonto(e.target.value)}
                                        style={{ width: "100%", padding: "10px 12px", border: "2px solid #ff9800", borderRadius: 8, fontSize: 16, fontWeight: "bold", boxSizing: "border-box", marginBottom: 8 }} />
                                    <button onClick={handlePagar}
                                        style={{ width: "100%", padding: 10, background: "#ff9800", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: "bold", fontSize: 14 }}>
                                        Pagar ${pagoMonto ? parseFloat(pagoMonto).toFixed(2) : "0.00"}
                                    </button>
                                </>
                            )}

                            {parseFloat(sel.saldo_pendiente || 0) <= 0 && (
                                <p style={{ textAlign: "center", color: "#4caf50", fontWeight: "bold", fontSize: 14 }}>✓ Crédito liquidado</p>
                            )}
                        </div>
                    </div>
                )}
            </IonContent>
        </IonPage>
    );
}

