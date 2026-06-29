import React, { useState } from "react";
import { IonButton, IonToast, IonCard, IonCardContent } from "@ionic/react";
import { BarcodeScanner, BarcodeFormat } from "@capacitor-mlkit/barcode-scanning";
import { Capacitor } from "@capacitor/core";
import { getApiBase } from "../services/api.config";

export function Etiqueta() {
    const [scanResult, setScanResult] = useState("");
    const [lotData, setLotData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState({ show: false, message: "" });

    async function scan() {
        if (!Capacitor.isNativePlatform()) {
            setToast({ show: true, message: "Escáner solo disponible en Android" });
            return;
        }
        try {
            const perm = await BarcodeScanner.requestPermissions();
            if (perm.camera !== "granted") {
                setToast({ show: true, message: "Permiso de cámara denegado" });
                return;
            }
            const result = await BarcodeScanner.scan({ formats: [BarcodeFormat.QrCode] });
            if (result.barcodes.length > 0) {
                const code = result.barcodes[0].rawValue;
                setScanResult(code);
                await fetchLotData(code);
            }
        } catch (e: any) {
            setToast({ show: true, message: e.message || "Error al escanear" });
        }
    }

    async function fetchLotData(codigoLote: string) {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${getApiBase()}/lotes/codigo/${codigoLote}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error("Lote no encontrado");
            const data = await res.json();
            setLotData(data);
        } catch (e: any) {
            setToast({ show: true, message: e.message });
            setLotData(null);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div>
            <IonButton expand="block" onClick={scan} style={{ marginBottom: 16 }}>
                Escanear código QR
            </IonButton>

            {loading && <p>Cargando datos del lote...</p>}

            {scanResult && !loading && (
                <IonCard>
                    <IonCardContent>
                        <p><strong>Código escaneado:</strong> {scanResult}</p>
                    </IonCardContent>
                </IonCard>
            )}

            {lotData && (
                <IonCard>
                    <IonCardContent>
                        <h3>Lote: {lotData.codigo_lote}</h3>
                        <p><strong>Producto:</strong> {lotData.producto_nombre}</p>
                        <p><strong>Cantidad:</strong> {lotData.cantidad_actual_kg} kg</p>
                        <p><strong>Cajas:</strong> {lotData.total_cajas}</p>
                        <p><strong>Caducidad:</strong> {new Date(lotData.fecha_caducidad).toLocaleDateString()}</p>
                        <p><strong>Bodega:</strong> {lotData.bodega_nombre}</p>
                    </IonCardContent>
                </IonCard>
            )}

            <IonToast isOpen={toast.show} message={toast.message} duration={3000}
                onDidDismiss={() => setToast({ show: false, message: "" })} />
        </div>
    );
}
