import React, { useEffect, useState, useCallback } from "react";
import {
    IonContent,
    IonHeader,
    IonPage,
    IonTitle,
    IonToolbar,
    IonButton,
    IonList,
    IonItem,
    IonLabel,
    IonBadge,
    IonToast,
    IonNote,
} from "@ionic/react";
import { useParams } from "react-router-dom";
import { query } from "../db";
import { validarEscaneoLocal, registrarEscaneoOffline, getLotesDisponibles } from "../services/scanner.service";
import { useNetwork } from "../hooks/useNetwork";
import { BarcodeScanner, BarcodeFormat } from "@capacitor-mlkit/barcode-scanning";
import { Capacitor } from "@capacitor/core";

export function Escaner() {
    const { id: traspasoId } = useParams<{ id: string }>();
    const isOnline = useNetwork();
    const [traspaso, setTraspaso] = useState<any>(null);
    const [escaneados, setEscaneados] = useState<any[]>([]);
    const [disponibles, setDisponibles] = useState<any[]>([]);
    const [toast, setToast] = useState({ show: false, msg: "", color: "success" });
    const [modoManual, setModoManual] = useState(false);
    const [codigoManual, setCodigoManual] = useState("");

    useEffect(() => {
        loadData();
    }, [traspasoId]);

    async function loadData() {
        const rows = await query("SELECT * FROM traspasos_local WHERE id = ?", [traspasoId]);
        if (rows.length) {
            setTraspaso(rows[0]);
            const disponibles = await getLotesDisponibles(rows[0].bodega_origen_id);
            setDisponibles(disponibles);
        }
        const esc = await query(
            "SELECT * FROM sync_queue WHERE batch_uuid = (SELECT batch_uuid FROM traspasos_local WHERE id = ?) AND procesado = 0",
            [traspasoId]
        );
        setEscaneados(esc);
    }

    const handleEscaneo = useCallback(async (codigo: string) => {
        if (!traspaso) return;

        const result = await validarEscaneoLocal(codigo, traspaso.bodega_origen_id);

        if (!result.valido) {
            setToast({ show: true, msg: result.error || "Error", color: "danger" });
            return;
        }

        await registrarEscaneoOffline({
            batchUuid: traspaso.batch_uuid,
            loteId: result.lote.id,
            codigoLote: result.lote.codigo_lote,
            cantidadKg: parseFloat(result.lote.cantidad_actual_kg),
            bodegaOrigenId: traspaso.bodega_origen_id,
            bodegaDestinoId: traspaso.bodega_destino_id,
        });

        setToast({ show: true, msg: `✅ ${result.lote.producto_nombre} escaneado`, color: "success" });
        loadData();
    }, [traspaso]);

    async function iniciarEscaneo() {
        if (!Capacitor.isNativePlatform()) {
            setModoManual(true);
            return;
        }
        try {
            const perm = await BarcodeScanner.requestPermissions();
            if (perm.camera !== "granted") {
                setToast({ show: true, msg: "Permiso de cámara denegado", color: "danger" });
                return;
            }
            const result = await BarcodeScanner.scan({ formats: [BarcodeFormat.QrCode] });
            if (result.barcodes.length > 0) {
                await handleEscaneo(result.barcodes[0].rawValue);
            }
        } catch (e: any) {
            setToast({ show: true, msg: e.message || "Error al escanear", color: "danger" });
        }
    }

    async function finalizarTraspaso() {
        setToast({ show: true, msg: "Traspaso listo para sincronizar al salir de la cámara", color: "success" });
    }

    if (!traspaso) {
        return (
            <IonPage>
                <IonContent className="ion-padding">
                    <p>Cargando...</p>
                </IonContent>
            </IonPage>
        );
    }

    return (
        <IonPage>
            <IonHeader>
                <IonToolbar color="success">
                    <IonTitle>Escaneo de Lotes</IonTitle>
                </IonToolbar>
            </IonHeader>
            <IonContent className="ion-padding">
                <div style={{ background: isOnline ? "#d4edda" : "#fff3cd", padding: 8, borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
                    {isOnline ? "🟢 Con conexión" : "🔴 Sin conexión - modo offline"}
                </div>

                <h4>Origen: {traspaso.bodega_origen_id}</h4>
                <h4>Destino: {traspaso.bodega_destino_id}</h4>

                {modoManual && (
                    <div style={{ margin: "16px 0" }}>
                        <input
                            type="text"
                            placeholder="Ingresa código manualmente (o usa escáner de mano)"
                            value={codigoManual}
                            onChange={(e) => setCodigoManual(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") { handleEscaneo(codigoManual); setCodigoManual(""); } }}
                            autoFocus
                            style={{
                                width: "100%",
                                padding: 12,
                                fontSize: 18,
                                border: "2px solid #1a8a3a",
                                borderRadius: 8,
                                outline: "none",
                                boxSizing: "border-box",
                            }}
                        />
                        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                            <IonButton expand="block" onClick={() => { handleEscaneo(codigoManual); setCodigoManual(""); }}>
                                Validar
                            </IonButton>
                            <IonButton expand="block" fill="outline" onClick={() => setModoManual(false)}>
                                Cancelar
                            </IonButton>
                        </div>
                    </div>
                )}

                <h5>Lotes Disponibles ({disponibles.length})</h5>
                <IonList>
                    {disponibles.map((l: any) => (
                        <IonItem key={l.id}>
                            <IonLabel>
                                <h2>{l.producto_nombre}</h2>
                                <p>
                                    Lote: {l.codigo_lote} | {l.cantidad_actual_kg} kg
                                    {l.fecha_caducidad ? ` | Cad: ${l.fecha_caducidad}` : ""}
                                </p>
                            </IonLabel>
                            <IonBadge color="success">{l.estado}</IonBadge>
                        </IonItem>
                    ))}
                </IonList>

                <h5>Escaneados ({escaneados.length})</h5>
                <IonList>
                    {escaneados.map((e: any) => (
                        <IonItem key={e.id}>
                            <IonLabel>
                                <p>{e.codigo_lote} - {e.cantidad_kg} kg</p>
                            </IonLabel>
                            <IonNote>✓ Escaneado</IonNote>
                        </IonItem>
                    ))}
                </IonList>

                <div style={{ marginTop: 24, display: "flex", gap: 8 }}>
                    <IonButton expand="block" onClick={iniciarEscaneo} color="primary">
                        {Capacitor.isNativePlatform() ? "📷 Escanear Lote" : "📷 Ingresar código"}
                    </IonButton>
                    <IonButton expand="block" onClick={finalizarTraspaso} color="success">
                        ✓ Finalizar Traspaso
                    </IonButton>
                </div>

                <IonToast
                    isOpen={toast.show}
                    message={toast.msg}
                    color={toast.color as any}
                    duration={3000}
                    onDidDismiss={() => setToast({ show: false, msg: "", color: "success" })}
                />
            </IonContent>
        </IonPage>
    );
}
