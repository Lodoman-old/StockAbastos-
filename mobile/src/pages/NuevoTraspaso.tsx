import React, { useEffect, useState } from "react";
import {
    IonContent,
    IonHeader,
    IonPage,
    IonTitle,
    IonToolbar,
    IonItem,
    IonLabel,
    IonSelect,
    IonSelectOption,
    IonButton,
    IonLoading,
    IonToast,
} from "@ionic/react";
import { useHistory } from "react-router-dom";
import { query, execute } from "../db";
import { descargarSnapshot } from "../services/sync.service";
import { useNetwork } from "../hooks/useNetwork";

export function NuevoTraspaso() {
    const history = useHistory();
    const isOnline = useNetwork();

    const [bodegas, setBodegas] = useState<any[]>([]);
    const [origenId, setOrigenId] = useState("");
    const [destinoId, setDestinoId] = useState("");
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState({ show: false, msg: "" });

    useEffect(() => {
        query("SELECT * FROM bodegas WHERE activa = 1 ORDER BY nombre").then(setBodegas);
    }, []);

    async function handleIniciar() {
        if (!origenId || !destinoId) {
            setToast({ show: true, msg: "Selecciona origen y destino" });
            return;
        }
        if (origenId === destinoId) {
            setToast({ show: true, msg: "Origen y destino no pueden ser iguales" });
            return;
        }

        setLoading(true);
        try {
            if (isOnline) {
                await descargarSnapshot(origenId);
            }

            const batchUuid = crypto.randomUUID();
            const folio = `TRP-LOCAL-${Date.now()}`;

            await execute(
                `INSERT INTO traspasos_local (id, folio, bodega_origen_id, bodega_destino_id,
                 estado, batch_uuid, created_at)
                 VALUES (?, ?, ?, ?, 'EN_CURSO', ?, datetime('now'))`,
                [crypto.randomUUID(), folio, origenId, destinoId, batchUuid]
            );

            const rows = await query(
                "SELECT id FROM traspasos_local WHERE folio = ?",
                [folio]
            );

            setToast({ show: true, msg: "Traspaso iniciado. Dirígete a la cámara fría." });
            setTimeout(() => {
                history.push(`/traspasos/escaner/${rows[0].id}`);
            }, 1000);
        } catch (err: any) {
            setToast({ show: true, msg: `Error: ${err.message}` });
        } finally {
            setLoading(false);
        }
    }

    return (
        <IonPage>
            <IonHeader>
                <IonToolbar color="success">
                    <IonTitle>Nuevo Traspaso</IonTitle>
                </IonToolbar>
            </IonHeader>
            <IonContent className="ion-padding">
                {!isOnline && (
                    <div style={{ background: "#fff3cd", padding: 12, borderRadius: 8, marginBottom: 16 }}>
                        ⚠️ Sin conexión. Se usará la data local disponible.
                    </div>
                )}

                <IonItem>
                    <IonLabel>Bodega Origen</IonLabel>
                    <IonSelect value={origenId} placeholder="Seleccionar" onIonChange={(e) => setOrigenId(e.detail.value)}>
                        {bodegas.map((b: any) => (
                            <IonSelectOption key={b.id} value={b.id}>
                                {b.codigo} - {b.nombre}
                            </IonSelectOption>
                        ))}
                    </IonSelect>
                </IonItem>

                <IonItem>
                    <IonLabel>Bodega Destino</IonLabel>
                    <IonSelect value={destinoId} placeholder="Seleccionar" onIonChange={(e) => setDestinoId(e.detail.value)}>
                        {bodegas.map((b: any) => (
                            <IonSelectOption key={b.id} value={b.id}>
                                {b.codigo} - {b.nombre}
                            </IonSelectOption>
                        ))}
                    </IonSelect>
                </IonItem>

                <div style={{ marginTop: 24 }}>
                    <IonButton expand="block" onClick={handleIniciar} disabled={loading}>
                        {loading ? "Iniciando..." : "Iniciar Traspaso"}
                    </IonButton>
                </div>

                <IonLoading isOpen={loading} message="Descargando datos..." />
                <IonToast
                    isOpen={toast.show}
                    message={toast.msg}
                    duration={3000}
                    onDidDismiss={() => setToast({ show: false, msg: "" })}
                />
            </IonContent>
        </IonPage>
    );
}
