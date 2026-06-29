import React, { useEffect, useRef, useState } from "react";
import { IonList, IonItem, IonLabel, IonButton, IonInput, IonSelect, IonSelectOption, IonContent, IonPage, IonText, IonToast } from "@ionic/react";
import { get, put } from "../services/api";
import { getApiBase } from "../services/api.config";

export function Configuracion() {
    const [config, setConfig] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [showToast, setShowToast] = useState(false);
    const [toastMsg, setToastMsg] = useState("");
    const fileRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        get("/configuracion").then(setConfig).catch(() => {}).finally(() => setLoading(false));
    }, []);

    const set = (clave: string, valor: string) => setConfig(c => ({ ...c, [clave]: valor }));

    const guardar = async () => {
        try {
            await put("/configuracion", config);
            setToastMsg("Configuración guardada");
            setShowToast(true);
        } catch (e: any) { setToastMsg("Error: " + e.message); setShowToast(true); }
    };

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const fd = new FormData();
        fd.append("file", file);
        try {
            const res = await fetch(`${getApiBase()}/configuracion/upload-logo`, {
                method: "POST",
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
                body: fd,
            });
            if (!res.ok) throw new Error(await res.text());
            const data = await res.json();
            set("logo_url", data.logo_url);
            setToastMsg("Logo subido");
            setShowToast(true);
        } catch (err: any) {
            setToastMsg("Error: " + err.message);
            setShowToast(true);
        }
    };

    if (loading) return <IonPage><IonContent className="ion-padding"><p>Cargando...</p></IonContent></IonPage>;

    return (
        <IonPage>
            <IonContent className="ion-padding">
                <h2>Configuración</h2>

                <IonText color="medium"><p style={{ marginLeft: 16 }}>Empresa</p></IonText>
                <IonList>
                    <IonItem><IonLabel position="stacked">Nombre</IonLabel><IonInput value={config.empresa_nombre || ""} onIonChange={e => set("empresa_nombre", e.detail.value || "")} /></IonItem>
                    <IonItem><IonLabel position="stacked">Dirección</IonLabel><IonInput value={config.empresa_direccion || ""} onIonChange={e => set("empresa_direccion", e.detail.value || "")} /></IonItem>
                    <IonItem><IonLabel position="stacked">Teléfono</IonLabel><IonInput value={config.empresa_telefono || ""} onIonChange={e => set("empresa_telefono", e.detail.value || "")} /></IonItem>
                    <IonItem><IonLabel position="stacked">Email</IonLabel><IonInput value={config.empresa_email || ""} onIonChange={e => set("empresa_email", e.detail.value || "")} /></IonItem>
                </IonList>

                <IonText color="medium"><p style={{ marginLeft: 16 }}>Ticket de venta</p></IonText>
                <IonList>
                    <IonItem>
                        <IonLabel position="stacked">Formato</IonLabel>
                        <IonSelect value={config.ticket_formato || "80mm"} onIonChange={e => set("ticket_formato", e.detail.value)}>
                            <IonSelectOption value="58mm">58 mm (pequeño)</IonSelectOption>
                            <IonSelectOption value="80mm">80 mm (estándar)</IonSelectOption>
                        </IonSelect>
                    </IonItem>
                    <IonItem><IonLabel position="stacked">Encabezado</IonLabel><IonInput value={config.ticket_encabezado || ""} onIonChange={e => set("ticket_encabezado", e.detail.value || "")} /></IonItem>
                    <IonItem><IonLabel position="stacked">Pie</IonLabel><IonInput value={config.ticket_pie || ""} onIonChange={e => set("ticket_pie", e.detail.value || "")} /></IonItem>
                    <IonItem>
                        <IonLabel position="stacked">Logo</IonLabel>
                        <input type="file" ref={fileRef} onChange={handleFile} accept="image/*" style={{ marginTop: 4 }} />
                        {config.logo_url && (
                            <div style={{ marginTop: 4, fontSize: 12, color: "#666" }}>Subido: {config.logo_url}</div>
                        )}
                    </IonItem>
                </IonList>

                <IonButton expand="block" onClick={guardar} className="ion-margin">Guardar configuración</IonButton>

                <IonToast isOpen={showToast} message={toastMsg} duration={2000} onDidDismiss={() => setShowToast(false)} color={toastMsg.includes("Error") ? "danger" : "success"} />
            </IonContent>
        </IonPage>
    );
}
