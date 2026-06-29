import React from "react";
import {
    IonCard,
    IonCardContent,
    IonButton,
    IonSpinner,
    IonCardHeader,
    IonCardTitle,
} from "@ionic/react";
import { useSync } from "../hooks/useSync";

export function SyncStatus() {
    const { isOnline, pendientes, sincronizando, ultimoSync, ejecutarSync } = useSync();

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <IonCard color={isOnline ? "success" : "danger"}>
                <IonCardContent>
                    <h2>{isOnline ? "Con conexión" : "Sin conexión"}</h2>
                </IonCardContent>
            </IonCard>

            <IonCard>
                <IonCardHeader>
                    <IonCardTitle>Movimientos Pendientes</IonCardTitle>
                </IonCardHeader>
                <IonCardContent>
                    <h1 style={{ fontSize: 48, textAlign: "center", margin: 0 }}>{pendientes}</h1>
                </IonCardContent>
            </IonCard>

            {ultimoSync && (
                <IonCard>
                    <IonCardContent>
                        Última sincronización: {ultimoSync.toLocaleTimeString()}
                    </IonCardContent>
                </IonCard>
            )}

            <IonButton
                expand="block"
                onClick={ejecutarSync}
                disabled={!isOnline || sincronizando || !pendientes}
            >
                {sincronizando ? (
                    <>
                        <IonSpinner /> Sincronizando...
                    </>
                ) : (
                    "Sincronizar Ahora"
                )}
            </IonButton>

            {pendientes === 0 && isOnline && (
                <p style={{ textAlign: "center", color: "#666", marginTop: 16 }}>
                    Todo está sincronizado
                </p>
            )}
        </div>
    );
}
