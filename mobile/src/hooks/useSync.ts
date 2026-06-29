import { useCallback, useEffect, useState } from "react";
import { useNetwork } from "./useNetwork";
import { sincronizarPendientes } from "../services/sync.service";
import { query } from "../db";

export function useSync() {
    const isOnline = useNetwork();
    const [pendientes, setPendientes] = useState(0);
    const [sincronizando, setSincronizando] = useState(false);
    const [ultimoSync, setUltimoSync] = useState<Date | null>(null);

    const actualizarPendientes = useCallback(async () => {
        try {
            const rows = await query("SELECT COUNT(*) AS count FROM sync_queue WHERE procesado = 0");
            setPendientes(rows[0]?.count || 0);
        } catch {
            // DB not ready yet
        }
    }, []);

    const ejecutarSync = useCallback(async () => {
        if (!isOnline || sincronizando) return;
        setSincronizando(true);
        try {
            const resultados = await sincronizarPendientes();
            console.log("Sync completado:", resultados);
            setUltimoSync(new Date());
            await actualizarPendientes();
        } catch (err) {
            console.error("Error en sync:", err);
        } finally {
            setSincronizando(false);
        }
    }, [isOnline, sincronizando, actualizarPendientes]);

    useEffect(() => {
        actualizarPendientes();
    }, [actualizarPendientes]);

    useEffect(() => {
        if (isOnline && pendientes > 0) {
            ejecutarSync();
        }
    }, [isOnline, pendientes, ejecutarSync]);

    return {
        isOnline,
        pendientes,
        sincronizando,
        ultimoSync,
        ejecutarSync,
        actualizarPendientes,
    };
}
