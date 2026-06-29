import React, { useEffect, useState } from "react";

const API = "http://localhost:4000/api";

export function SyncMonitor() {
    const [batches, setBatches] = useState<any[]>([]);

    useEffect(() => {
        // En producción, este endpoint listaría los últimos batches
        fetch(`${API}/sync/batch/monitor`).catch(() => {});
    }, []);

    const estadoColor: Record<string, string> = {
        PENDIENTE: "#ff9800",
        PROCESANDO: "#2196f3",
        CONFIRMADO: "#4caf50",
        RECHAZADO: "#f44336",
    };

    return (
        <div>
            <h1>Monitor de Sincronización</h1>

            <div style={{ background: "#fff", borderRadius: 12, padding: 20, marginTop: 16 }}>
                <h3>Estado del Servicio</h3>
                <p>🟢 Servidor en línea</p>
                <p>📡 Endpoint: POST /api/sync/batch</p>
                <p>📡 Endpoint: POST /api/sync/snapshot</p>
            </div>

            <div style={{ background: "#fff", borderRadius: 12, padding: 20, marginTop: 16 }}>
                <h3>Documentación Rápida de Sincronización</h3>
                <pre style={{ background: "#f5f5f5", padding: 16, borderRadius: 8, marginTop: 8, fontSize: 13, overflow: "auto" }}>
{`// FLUJO DE SINCRONIZACIÓN OFFLINE

// 1. Dispositivo descarga snapshot (CON señal)
POST /api/sync/snapshot
Body: { bodega_id: "uuid" }
Response: { version, lotes[], productos[] }

// 2. Operario escanea en cámara fría (SIN señal)
→ Validación contra SQLite local
→ Acumula en sync_queue local

// 3. Dispositivo sincroniza batch (recupera señal)
POST /api/sync/batch
Body: {
  batch_uuid: "uuid-unico",
  dispositivo_id: "device-001",
  snapshot_version: 1,
  operacion: "TRASPASO",
  movimientos: [{ lote_id, codigo_lote, cantidad_kg, ... }]
}

// Respuestas posibles:
// { status: "OK" } → Procesado correctamente
// { status: "DUPLICATE" } → Ya procesado (idempotente)
// { status: "CONFLICT", conflictos: [...] } → Conflictos de inventario
`}
                </pre>
            </div>
        </div>
    );
}
