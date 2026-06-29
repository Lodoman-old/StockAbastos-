import React, { useEffect, useState } from "react";
import { IonList, IonItem, IonLabel, IonButton, IonInput, IonSelect, IonSelectOption, IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonContent, IonPage, IonText } from "@ionic/react";
import { get, post, put } from "../services/api";

export function Clientes() {
    const [clientes, setClientes] = useState<any[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [nombre, setNombre] = useState("");
    const [telefono, setTelefono] = useState("");
    const [direccion, setDireccion] = useState("");
    const [limite, setLimite] = useState("");

    const load = () => get("/clientes").then(setClientes).catch(() => {});
    useEffect(() => { load(); }, []);

    const openNew = () => { setEditId(null); setNombre(""); setTelefono(""); setDireccion(""); setLimite(""); setShowModal(true); };
    const openEdit = (c: any) => { setEditId(c.id); setNombre(c.nombre); setTelefono(c.telefono || ""); setDireccion(c.direccion || ""); setLimite(c.limite_credito?.toString() || "0"); setShowModal(true); };

    const save = async () => {
        if (!nombre) return;
        try {
            const body = { nombre, telefono: telefono || undefined, direccion: direccion || undefined, limite_credito: parseFloat(limite) || 0 };
            if (editId) await put(`/clientes/${editId}`, body);
            else await post("/clientes", body);
            setShowModal(false);
            load();
        } catch (e: any) { alert("Error: " + e.message); }
    };

    return (
        <IonPage>
            <IonContent className="ion-padding">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <h2 style={{ margin: 0 }}>Clientes</h2>
                    <IonButton onClick={openNew}>+ Nuevo</IonButton>
                </div>

                <IonModal isOpen={showModal} onDidDismiss={() => setShowModal(false)}>
                    <IonHeader>
                        <IonToolbar><IonTitle>{editId ? "Editar" : "Nuevo"} Cliente</IonTitle><IonButtons slot="end"><IonButton onClick={() => setShowModal(false)}>Cerrar</IonButton></IonButtons></IonToolbar>
                    </IonHeader>
                    <IonContent className="ion-padding">
                        <IonList>
                            <IonItem><IonLabel position="stacked">Nombre</IonLabel><IonInput value={nombre} onIonChange={e => setNombre(e.detail.value || "")} /></IonItem>
                            <IonItem><IonLabel position="stacked">Teléfono</IonLabel><IonInput value={telefono} onIonChange={e => setTelefono(e.detail.value || "")} /></IonItem>
                            <IonItem><IonLabel position="stacked">Dirección</IonLabel><IonInput value={direccion} onIonChange={e => setDireccion(e.detail.value || "")} /></IonItem>
                            <IonItem><IonLabel position="stacked">Límite de crédito ($)</IonLabel><IonInput type="number" value={limite} onIonChange={e => setLimite(e.detail.value || "")} /></IonItem>
                        </IonList>
                        <IonButton expand="block" onClick={save} className="ion-margin-top">Guardar</IonButton>
                    </IonContent>
                </IonModal>

                <IonList>
                    {clientes.map(c => (
                        <IonItem key={c.id} onClick={() => openEdit(c)}>
                            <IonLabel>
                                <h3>{c.nombre}</h3>
                                <p>{c.telefono || "Sin teléfono"} — Límite: ${parseFloat(c.limite_credito || 0).toFixed(2)}</p>
                            </IonLabel>
                        </IonItem>
                    ))}
                    {!clientes.length && <IonItem><IonLabel className="ion-text-center">Sin clientes</IonLabel></IonItem>}
                </IonList>
            </IonContent>
        </IonPage>
    );
}
