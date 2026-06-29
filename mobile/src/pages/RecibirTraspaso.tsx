import React, { useEffect, useState, useCallback } from "react";
import { get, post } from "../services/api";
import { query, execute } from "../db";
import { useNetwork } from "../hooks/useNetwork";
import { getToken } from "../services/auth.service";
import { BarcodeScanner, BarcodeFormat } from "@capacitor-mlkit/barcode-scanning";
import { Capacitor } from "@capacitor/core";

export function RecibirTraspaso() {
    const isOnline = useNetwork();
    const [traspasos, setTraspasos] = useState<any[]>([]);
    const [selected, setSelected] = useState<any>(null);
    const [detalles, setDetalles] = useState<any[]>([]);
    const [msg, setMsg] = useState("");
    const [scanning, setScanning] = useState(false);
    const [codigoManual, setCodigoManual] = useState("");

    const load = async () => {
        try {
            const data = await get("/traspasos");
            setTraspasos(data.filter((t: any) => t.estado === "EN_CURSO"));
        } catch {
            const locales = await query(
                "SELECT * FROM traspasos_local WHERE estado = 'EN_CURSO' ORDER BY created_at DESC"
            );
            setTraspasos(locales);
        }
    };
    useEffect(() => { load(); }, []);

    const selectTraspaso = async (t: any) => {
        setSelected(t);
        setMsg("");
        setScanning(false);
        try {
            const data = await get(`/traspasos/${t.id}`);
            setDetalles(data.detalles || []);
        } catch {
            setDetalles([]);
        }
    };

    const handleScan = useCallback(async (codigo: string) => {
        if (!selected || !codigo.trim()) return;
        setMsg("");
        const detalle = detalles.find((d: any) => d.codigo_lote === codigo.trim());
        if (!detalle) {
            setMsg("❌ Lote no encontrado en este traspaso");
            return;
        }
        if (detalle.recibido) {
            setMsg("⚠️ Este lote ya fue recibido");
            return;
        }

        if (isOnline) {
            try {
                const detalleCompleto = await get(`/lotes/codigo/${codigo.trim()}`);
                if (detalleCompleto.estado !== "TRANSITO") {
                    setMsg("❌ El lote no está en tránsito");
                    return;
                }
            } catch {
                setMsg("❌ Lote no encontrado en servidor");
                return;
            }
        }

        const batchUuid = `REC-${selected.id}-${Date.now()}`;
        await execute(
            `INSERT INTO sync_queue (batch_uuid, tipo_operacion, lote_id, codigo_lote,
             cantidad_kg, bodega_origen_id, bodega_destino_id, timestamp, procesado)
             VALUES (?, 'TRASPASO_RECEPCION', ?, ?, ?, ?, ?, datetime('now'), 0)`,
            [
                batchUuid, detalle.lote_id, detalle.codigo_lote, detalle.cantidad_kg,
                selected.bodega_origen_id, selected.bodega_destino_id,
            ]
        );

        detalle.recibido = true;
        setDetalles([...detalles]);
        setMsg(`✅ ${detalle.codigo_lote} recibido`);

        const todosRecibidos = detalles.every((d: any) => d.recibido);
        if (todosRecibidos) {
            try {
                await post(`/traspasos/${selected.id}/recibir`, {});
                setMsg("🎉 Todos los lotes recibidos. Traspaso completado.");
                setSelected(null);
                load();
            } catch (err: any) {
                setMsg("⚠️ Lotes escaneados. Se sincronizarán cuando haya conexión.");
            }
        }
    }, [selected, detalles, isOnline]);

    const card: React.CSSProperties = {
        background: "#fff", borderRadius: 12, padding: 16, marginBottom: 12,
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)", borderLeft: "4px solid #2196f3",
    };
    const inputStyle: React.CSSProperties = {
        width: "100%", padding: "12px 16px", fontSize: 16, border: "2px solid #1a8a3a",
        borderRadius: 8, outline: "none", boxSizing: "border-box",
    };

    return (
        <div>
            <h2 style={{ marginBottom: 16 }}>Recepción en Mostrador</h2>

            <div style={{ padding: "8px 12px", borderRadius: 8, marginBottom: 12, fontSize: 13,
                background: isOnline ? "#d4edda" : "#fff3cd",
                color: isOnline ? "#155724" : "#856404" }}>
                {isOnline ? "🟢 Con conexión" : "🔴 Sin conexión — los escaneos se guardan localmente"}
            </div>

            {msg && (
                <div style={{ padding: "10px 14px", borderRadius: 8, marginBottom: 12, fontSize: 14,
                    background: msg.startsWith("❌") || msg.startsWith("⚠️") ? "#fef2f2" : "#e8f5e9",
                    color: msg.startsWith("❌") || msg.startsWith("⚠️") ? "#dc2626" : "#2e7d32" }}>
                    {msg}
                </div>
            )}

            {selected ? (
                <div>
                    <div style={card}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <div>
                                <strong>{selected.folio}</strong>
                                <p style={{ fontSize: 13, color: "#555", margin: "4px 0" }}>
                                    {selected.bodega_origen} → {selected.bodega_destino}
                                </p>
                            </div>
                            <button onClick={() => { setSelected(null); setDetalles([]); setMsg(""); }}
                                style={{ background: "none", border: "none", color: "#888", fontSize: 20, cursor: "pointer" }}>
                                ✕
                            </button>
                        </div>
                    </div>

                    <div style={{ marginBottom: 16 }}>
                        <label style={{ fontSize: 14, color: "#555", marginBottom: 6, display: "block", fontWeight: "bold" }}>
                            Escanea código QR del lote:
                        </label>
                        <div style={{ display: "flex", gap: 8 }}>
                            <input type="text" placeholder="Ingresa o escanea código del lote"
                                value={codigoManual}
                                onChange={e => setCodigoManual(e.target.value)}
                                onKeyDown={e => { if (e.key === "Enter") { handleScan(codigoManual); setCodigoManual(""); } }}
                                style={{ ...inputStyle, flex: 1 }} autoFocus />
                            {Capacitor.isNativePlatform() && (
                                <button onClick={async () => {
                                    try {
                                        const perm = await BarcodeScanner.requestPermissions();
                                        if (perm.camera !== "granted") { setMsg("❌ Permiso de cámara denegado"); return; }
                                        const result = await BarcodeScanner.scan({ formats: [BarcodeFormat.QrCode] });
                                        if (result.barcodes.length > 0) {
                                            handleScan(result.barcodes[0].rawValue);
                                            setCodigoManual("");
                                        }
                                    } catch (e: any) {
                                        setMsg("❌ " + (e.message || "Error al escanear"));
                                    }
                                }} style={{
                                    padding: "12px 16px", background: "#1a8a3a", color: "#fff",
                                    border: "none", borderRadius: 8, fontSize: 20, cursor: "pointer",
                                    whiteSpace: "nowrap",
                                }}>
                                    📷
                                </button>
                            )}
                        </div>
                        <button onClick={() => { handleScan(codigoManual); setCodigoManual(""); }}
                            style={{ width: "100%", padding: 12, marginTop: 8, background: "#1a8a3a", color: "#fff",
                                border: "none", borderRadius: 8, fontSize: 15, fontWeight: "bold", cursor: "pointer" }}>
                            Validar Lote
                        </button>
                    </div>

                    <h4 style={{ marginBottom: 8 }}>Lotes del traspaso:</h4>
                    {detalles.map((d: any) => (
                        <div key={d.lote_id || d.id} style={{
                            ...card, borderLeftColor: d.recibido ? "#4caf50" : "#ff9800",
                            padding: 12, marginBottom: 8,
                        }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div>
                                    <strong style={{ fontSize: 14 }}>{d.codigo_lote}</strong>
                                    <p style={{ fontSize: 12, color: "#666", margin: "2px 0" }}>
                                        {d.producto_nombre} — {d.cantidad_kg} kg
                                    </p>
                                </div>
                                <span style={{
                                    padding: "3px 8px", borderRadius: 4, fontSize: 11, fontWeight: "bold",
                                    background: d.recibido ? "#e8f5e9" : "#fff3e0",
                                    color: d.recibido ? "#2e7d32" : "#e65100",
                                }}>
                                    {d.recibido ? "✓ Recibido" : "Pendiente"}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div>
                    {traspasos.length === 0 ? (
                        <div style={{ ...card, borderLeftColor: "#4caf50", textAlign: "center", padding: 32 }}>
                            <p style={{ fontSize: 16, color: "#666" }}>No hay traspasos en tránsito</p>
                        </div>
                    ) : traspasos.map((t: any) => (
                        <div key={t.id} style={card} onClick={() => selectTraspaso(t)}>
                            <strong>{t.folio}</strong>
                            <p style={{ fontSize: 13, color: "#555", margin: "4px 0" }}>
                                {t.bodega_origen} → {t.bodega_destino}
                            </p>
                            <p style={{ fontSize: 11, color: "#999", margin: 0 }}>
                                {new Date(t.created_at).toLocaleString()}
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
