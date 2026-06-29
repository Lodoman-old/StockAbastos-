import React, { useEffect, useState, useRef } from "react";
import { get, post } from "../services/api";
import { notify } from "../components/Toast";

export function ConfirmarTraspaso() {
    const [pendientes, setPendientes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [bodegaFiltro, setBodegaFiltro] = useState("");
    const [scanValue, setScanValue] = useState("");
    const [confirmando, setConfirmando] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const load = () => {
        setLoading(true);
        get("/tarimas/pendientes-confirmar").then(setPendientes).catch(() => {}).finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, []);

    const filtradas = bodegaFiltro
        ? pendientes.filter(t => t.bodega_id === bodegaFiltro)
        : pendientes;

    const origenesUnicos = [...new Set(pendientes.map(t => t.bodega_id).filter(Boolean))];
    const origenes = origenesUnicos.map(id => ({
        id,
        codigo: pendientes.find(t => t.bodega_id === id)?.bodega_origen_codigo,
        nombre: pendientes.find(t => t.bodega_id === id)?.bodega_origen_nombre,
    }));

    const agrupadas = filtradas.reduce((acc: Record<string, any[]>, t: any) => {
        const key = t.bodega_origen_nombre || t.bodega_origen_codigo || "Sin bodega";
        if (!acc[key]) acc[key] = [];
        acc[key].push(t);
        return acc;
    }, {} as Record<string, any[]>);

    const confirmarPorQR = async (codigoQr: string) => {
        setConfirmando(true);
        try {
            const res = await post(`/tarimas/confirmar-traspaso/${encodeURIComponent(codigoQr)}`, {});
            notify(`Tarima ${res.tarima.codigo_qr} confirmada → EN_TRANSITO`, "success");
            setScanValue("");
            load();
            inputRef.current?.focus();
        } catch (e: any) {
            notify("Error: " + (e.message || "Error"), "error");
        }
        setConfirmando(false);
    };

    const handleScanSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!scanValue.trim()) return;
        confirmarPorQR(scanValue.trim());
    };

    const confirmarTodas = async () => {
        const ids = filtradas.map(t => t.id);
        if (!ids.length) { notify("No hay tarimas pendientes", "info"); return; }
        setConfirmando(true);
        try {
            const res = await post("/tarimas/confirmar-traspaso-batch", { tarima_ids: ids });
            notify(`${res.confirmadas} tarima(s) confirmadas`, "success");
            load();
        } catch (e: any) {
            notify("Error: " + (e.message || "Error"), "error");
        }
        setConfirmando(false);
    };

    const cardStyle: React.CSSProperties = {
        background: "#fff", borderRadius: 12, padding: 16, marginBottom: 12,
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    };
    const inputBase: React.CSSProperties = {
        padding: "10px 12px", borderRadius: 8, border: "1px solid #ddd", fontSize: 14,
    };

    if (loading) return <div style={{ padding: 20, color: "#888" }}>Cargando...</div>;

    return (
        <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
                <h1 style={{ margin: 0 }}>Confirmar Traspaso</h1>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <select value={bodegaFiltro} onChange={e => setBodegaFiltro(e.target.value)}
                        style={inputBase}>
                        <option value="">Todas las bodegas origen</option>
                        {origenes.map(o => (
                            <option key={o.id} value={o.id}>{o.codigo || o.nombre || o.id}</option>
                        ))}
                    </select>
                    <button onClick={confirmarTodas} disabled={confirmando || !filtradas.length}
                        style={{ padding: "8px 16px", background: confirmando || !pendientes.length ? "#ccc" : "#1565c0", color: "#fff", border: "none", borderRadius: 8, cursor: confirmando || !pendientes.length ? "not-allowed" : "pointer", fontSize: 14, fontWeight: "bold", whiteSpace: "nowrap" }}>
                        {confirmando ? "Confirmando..." : `Confirmar todas (${filtradas.length})`}
                    </button>
                </div>
            </div>

            <div style={{ ...cardStyle, marginBottom: 16 }}>
                <form onSubmit={handleScanSubmit} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input ref={inputRef} autoFocus value={scanValue} onChange={e => setScanValue(e.target.value)}
                        placeholder="Escanea o escribe código QR de la tarima..."
                        style={{ ...inputBase, flex: 1 }} />
                    <button type="submit" disabled={confirmando || !scanValue.trim()}
                        style={{ padding: "10px 20px", background: confirmando ? "#ccc" : "#e65100", color: "#fff", border: "none", borderRadius: 8, cursor: confirmando ? "not-allowed" : "pointer", fontSize: 14, fontWeight: "bold", whiteSpace: "nowrap" }}>
                        Confirmar
                    </button>
                </form>
            </div>

            {filtradas.length === 0 && (
                <div style={{ color: "#888", padding: 20, textAlign: "center" }}>
                    No hay tarimas pendientes de confirmar.
                </div>
            )}

            {Object.entries(agrupadas).map(([bodega, tarimas]) => (
                <div key={bodega} style={{ ...cardStyle, borderLeft: "4px solid #ff9800" }}>
                    <div style={{ fontWeight: "bold", fontSize: 15, marginBottom: 8, color: "#e65100" }}>
                        {bodega} <span style={{ fontWeight: "normal", fontSize: 12, color: "#888" }}>({tarimas.length} pendientes)</span>
                    </div>
                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                            <thead>
                                <tr style={{ background: "#f9f9f9", textAlign: "left" }}>
                                    <th style={{ padding: "6px 8px" }}>QR</th>
                                    <th style={{ padding: "6px 8px" }}>Producto</th>
                                    <th style={{ padding: "6px 8px" }}>Tipo</th>
                                    <th style={{ padding: "6px 8px" }}>Núm</th>
                                    <th style={{ padding: "6px 8px" }}>Destino</th>
                                    <th style={{ padding: "6px 8px" }}>Lote</th>
                                    <th style={{ padding: "6px 8px", width: 80 }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {tarimas.map((t: any) => (
                                    <tr key={t.id} style={{ borderTop: "1px solid #f0f0f0" }}>
                                        <td style={{ padding: "6px 8px", fontFamily: "monospace", fontSize: 10 }}>{t.codigo_qr}</td>
                                        <td style={{ padding: "6px 8px" }}>{t.producto_nombre}</td>
                                        <td style={{ padding: "6px 8px" }}>{t.tarima_tipo_nombre}</td>
                                        <td style={{ padding: "6px 8px" }}>{t.numero_tarima}</td>
                                        <td style={{ padding: "6px 8px" }}>
                                            <span style={{
                                                display: "inline-block", padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: "bold",
                                                background: "#e3f2fd", color: "#1565c0",
                                            }}>
                                                {t.bodega_destino_codigo || t.bodega_destino_nombre || "?"}
                                            </span>
                                        </td>
                                        <td style={{ padding: "6px 8px", color: "#666" }}>{t.codigo_lote}</td>
                                        <td style={{ padding: "6px 8px" }}>
                                            <button onClick={() => confirmarPorQR(t.codigo_qr)} disabled={confirmando}
                                                style={{ padding: "4px 10px", background: "#e65100", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 11, fontWeight: "bold", whiteSpace: "nowrap" }}>
                                                Confirmar
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ))}
        </div>
    );
}
