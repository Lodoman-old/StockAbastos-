import { money } from "../format";
import React, { useEffect, useState } from "react";
import { IonPage, IonContent, IonCard, IonCardContent, IonText, IonItem, IonLabel, IonList } from "@ionic/react";
import { get } from "../services/api";

export function ReporteCompras() {
    const [compras, setCompras] = useState<any[]>([]);
    const [proveedores, setProveedores] = useState<any[]>([]);
    const [desde, setDesde] = useState("");
    const [hasta, setHasta] = useState("");
    const [proveedorId, setProveedorId] = useState("");

    useEffect(() => { get("/proveedores").then(setProveedores).catch(() => {}); }, []);

    const load = () => {
        const params = new URLSearchParams();
        if (desde) params.set("desde", desde);
        if (hasta) params.set("hasta", hasta);
        if (proveedorId) params.set("proveedor_id", proveedorId);
        get(`/compras/reporte?${params}`).then(setCompras).catch(() => {});
    };

    useEffect(() => { load(); }, []);

    const totalCompras = compras.reduce((s: number, c: any) => s + parseFloat(c.total || 0), 0);

    const inputStyle: React.CSSProperties = { width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 6, fontSize: 13 };

    return (
        <IonPage>
            <IonContent className="ion-padding">
                <h2 style={{ marginTop: 0 }}>Reporte de Compras</h2>

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
                        <label style={{ fontSize: 11, color: "#555" }}>Proveedor</label>
                        <select value={proveedorId} onChange={e => setProveedorId(e.target.value)} style={inputStyle}>
                            <option value="">Todos</option>
                            {proveedores.map((p: any) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                        </select>
                    </div>
                    <div style={{ display: "flex", alignItems: "flex-end" }}>
                        <button onClick={load}
                            style={{ padding: "8px 14px", background: "#1a8a3a", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: "bold", fontSize: 12 }}>
                            Filtrar
                        </button>
                    </div>
                </div>

                <IonCard style={{ background: "#e8f5e9" }}>
                    <IonCardContent>
                        <IonText color="medium"><p style={{ fontSize: 12, margin: 0 }}>Total compras</p></IonText>
                        <h2 style={{ color: "#1a8a3a", margin: "4px 0 0", fontSize: 22, fontWeight: "bold" }}>${money(totalCompras)}</h2>
                    </IonCardContent>
                </IonCard>

                {compras.length > 0 ? (
                    <IonCard>
                        <IonCardContent style={{ padding: 0 }}>
                            <IonList>
                                {compras.map((c: any) => (
                                    <IonItem key={c.id}>
                                        <IonLabel>
                                            <div style={{ fontWeight: "bold", fontSize: 14 }}>{c.proveedor_nombre || "Sin proveedor"}</div>
                                            <div style={{ fontSize: 11, color: "#666" }}>
                                                Folio: {c.folio || "-"} | {new Date(c.fecha || c.created_at).toLocaleDateString()}
                                            </div>
                                            <div style={{ fontSize: 11, color: "#666" }}>
                                                {c.total_productos || c.items_count || 0} producto(s)
                                            </div>
                                        </IonLabel>
                                        <IonLabel slot="end" style={{ textAlign: "right" }}>
                                            <div style={{ fontWeight: "bold", color: "#1a8a3a" }}>
                                                ${money(c.total || 0)}
                                            </div>
                                        </IonLabel>
                                    </IonItem>
                                ))}
                            </IonList>
                        </IonCardContent>
                    </IonCard>
                ) : <p style={{ color: "#999", textAlign: "center" }}>Sin compras</p>}
            </IonContent>
        </IonPage>
    );
}

