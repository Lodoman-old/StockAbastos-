import { money } from "../format";
import React, { useEffect, useState } from "react";
import { IonList, IonItem, IonLabel, IonButton, IonInput, IonSelect, IonSelectOption, IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonContent, IonPage, IonText, IonDatetime } from "@ionic/react";
import { get, post, del } from "../services/api";

const CATEGORIAS = ["Luz", "Agua", "Nómina", "Renta", "Transporte", "Mantenimiento", "Otro"];

export function Gastos() {
    const [gastos, setGastos] = useState<any[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [concepto, setConcepto] = useState("");
    const [monto, setMonto] = useState("");
    const [categoria, setCategoria] = useState("");
    const [fecha, setFecha] = useState(new Date().toISOString().substring(0, 10));

    const load = () => get("/gastos").then(setGastos).catch(() => {});
    useEffect(() => { load(); }, []);

    const save = async () => {
        if (!concepto || !monto) return;
        try {
            await post("/gastos", { concepto, monto: parseFloat(monto), categoria: categoria || undefined, fecha });
            setShowModal(false); setConcepto(""); setMonto(""); setCategoria(""); load();
        } catch (e: any) { alert("Error: " + e.message); }
    };

    const eliminar = async (id: string) => {
        if (!confirm("¿Eliminar gasto?")) return;
        try {
            await del(`/gastos/${id}`);
            load();
        } catch (e: any) {
            alert("Error al eliminar: " + (e.message || "Desconocido"));
        }
    };

    const total = gastos.reduce((s, g) => s + parseFloat(g.monto || 0), 0);

    return (
        <IonPage>
            <IonContent className="ion-padding">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <h2 style={{ margin: 0 }}>Gastos</h2>
                    <IonButton onClick={() => setShowModal(true)}>+ Nuevo</IonButton>
                </div>

                <IonItem style={{ marginBottom: 8 }}>
                    <IonLabel><strong>Total gastado: ${money(total)}</strong></IonLabel>
                </IonItem>

                <IonModal isOpen={showModal} onDidDismiss={() => setShowModal(false)}>
                    <IonHeader>
                        <IonToolbar><IonTitle>Nuevo Gasto</IonTitle><IonButtons slot="end"><IonButton onClick={() => setShowModal(false)}>Cerrar</IonButton></IonButtons></IonToolbar>
                    </IonHeader>
                    <IonContent className="ion-padding">
                        <IonList>
                            <IonItem><IonLabel position="stacked">Concepto</IonLabel><IonInput value={concepto} onIonChange={e => setConcepto(e.detail.value || "")} /></IonItem>
                            <IonItem><IonLabel position="stacked">Monto ($)</IonLabel><IonInput type="number" value={monto} onIonChange={e => setMonto(e.detail.value || "")} /></IonItem>
                            <IonItem>
                                <IonLabel position="stacked">Categoría</IonLabel>
                                <IonSelect value={categoria} onIonChange={e => setCategoria(e.detail.value)}>
                                    <IonSelectOption value="">Sin categoría</IonSelectOption>
                                    {CATEGORIAS.map(c => <IonSelectOption key={c} value={c}>{c}</IonSelectOption>)}
                                </IonSelect>
                            </IonItem>
                            <IonItem><IonLabel position="stacked">Fecha</IonLabel><IonInput type="date" value={fecha} onIonChange={e => setFecha(e.detail.value || "")} /></IonItem>
                        </IonList>
                        <IonButton expand="block" onClick={save} className="ion-margin-top">Guardar</IonButton>
                    </IonContent>
                </IonModal>

                <IonList>
                    {gastos.map(g => (
                        <IonItem key={g.id}>
                            <IonLabel>
                                <h3>{g.concepto} — ${money(g.monto)}</h3>
                                <p>{new Date(g.fecha).toLocaleDateString()} {g.categoria ? `— ${g.categoria}` : ""}</p>
                            </IonLabel>
                            <IonButton slot="end" color="danger" fill="outline" size="small" onClick={() => eliminar(g.id)}>Eliminar</IonButton>
                        </IonItem>
                    ))}
                    {!gastos.length && <IonItem><IonLabel className="ion-text-center">Sin gastos</IonLabel></IonItem>}
                </IonList>
            </IonContent>
        </IonPage>
    );
}

