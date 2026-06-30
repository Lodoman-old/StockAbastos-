import { money } from "../format";
import React, { useEffect, useState } from "react";
import { IonPage, IonContent, IonCard, IonCardContent, IonText, IonItem, IonLabel, IonList } from "@ionic/react";
import { get } from "../services/api";

export function Ganancias() {
    const [desde, setDesde] = useState("");
    const [hasta, setHasta] = useState("");
    const [detalles, setDetalles] = useState<any[]>([]);
    const [resumen, setResumen] = useState<any>(null);

    const load = () => {
        const params = new URLSearchParams();
        if (desde) params.set("desde", desde);
        if (hasta) params.set("hasta", hasta);
        Promise.all([
            get(`/reportes/ganancias?${params}`),
            get(`/reportes/ganancias/resumen?${params}`)
        ]).then(([det, res]) => {
            setDetalles(det);
            setResumen(res);
        }).catch(() => {});
    };

    useEffect(() => { load(); }, []);

    const totalGanancia = detalles.reduce((s: number, d: any) => s + parseFloat(d.ganancia || 0), 0);
    const totalCosto = detalles.reduce((s: number, d: any) => s + parseFloat(d.costo_total || 0), 0);

    const card = (label: string, value: number, color: string) => (
        <IonCard style={{ borderTop: `4px solid ${color}`, margin: "8px 0" }}>
            <IonCardContent>
                <IonText color="medium"><p style={{ fontSize: 13, margin: 0 }}>{label}</p></IonText>
                <h2 style={{ color, margin: "4px 0 0", fontSize: 22, fontWeight: "bold" }}>${money(value)}</h2>
            </IonCardContent>
        </IonCard>
    );

    return (
        <IonPage>
            <IonContent className="ion-padding">
                <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 120 }}>
                        <label style={{ fontSize: 12, color: "#555" }}>Desde</label>
                        <input type="date" value={desde} onChange={e => setDesde(e.target.value)}
                            style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 6, fontSize: 13 }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 120 }}>
                        <label style={{ fontSize: 12, color: "#555" }}>Hasta</label>
                        <input type="date" value={hasta} onChange={e => setHasta(e.target.value)}
                            style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 6, fontSize: 13 }} />
                    </div>
                    <div style={{ display: "flex", alignItems: "flex-end" }}>
                        <button onClick={load}
                            style={{ padding: "8px 16px", background: "#1a8a3a", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: "bold", fontSize: 13 }}>
                            Filtrar
                        </button>
                    </div>
                </div>

                {resumen && (
                    <>
                        {card("Total ventas", resumen.totalVentas, "#4caf50")}
                        {card("Total compras", resumen.totalCompras, "#f44336")}
                        {card("Total gastos", resumen.totalGastos, "#ff9800")}
                        {card("Ganancia neta", resumen.gananciaNeta, resumen.gananciaNeta >= 0 ? "#4caf50" : "#f44336")}
                    </>
                )}

                <h3 style={{ fontSize: 16, margin: "16px 0 8px" }}>Detalle por producto</h3>
                {detalles.length > 0 ? (
                    <IonCard>
                        <IonCardContent style={{ padding: 0 }}>
                            <IonList>
                                {detalles.map((d: any, i: number) => {
                                    const ganancia = parseFloat(d.ganancia || 0);
                                    return (
                                        <IonItem key={i}>
                                            <IonLabel>
                                                <div style={{ fontSize: 14, fontWeight: "bold" }}>{d.producto}</div>
                                                <div style={{ fontSize: 11, color: "#666" }}>
                                                    Venta: ${money(d.subtotal_venta || 0)}
                                                </div>
                                                <div style={{ fontSize: 11, color: "#666" }}>
                                                    Costo: ${money(d.costo_total || 0)}
                                                </div>
                                            </IonLabel>
                                            <IonLabel slot="end" style={{ textAlign: "right" }}>
                                                <div style={{ fontSize: 15, fontWeight: "bold", color: ganancia >= 0 ? "#4caf50" : "#f44336" }}>
                                                    ${money(ganancia)}
                                                </div>
                                                <div style={{ fontSize: 10, color: "#999" }}>{d.folio}</div>
                                            </IonLabel>
                                        </IonItem>
                                    );
                                })}
                            </IonList>
                        </IonCardContent>
                    </IonCard>
                ) : (
                    <p style={{ color: "#999", textAlign: "center" }}>Sin datos para el filtro seleccionado</p>
                )}
            </IonContent>
        </IonPage>
    );
}

