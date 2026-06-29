import React, { useEffect, useState, useRef } from "react";
import { get, post } from "../services/api";
import { notify } from "../components/Toast";

export function RecepcionTraspaso() {
    const [enTransito, setEnTransito] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [bodegaFiltro, setBodegaFiltro] = useState("");
    const [scanValue, setScanValue] = useState("");
    const [recibiendo, setRecibiendo] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const load = () => {
        setLoading(true);
        get("/tarimas/en-transito").then(setEnTransito).catch(() => {}).finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, []);

    const filtradas = bodegaFiltro
        ? enTransito.filter(t => t.bodega_destino_id === bodegaFiltro)
        : enTransito;

    const destinosUnicos = [...new Set(enTransito.map(t => t.bodega_destino_id).filter(Boolean))];
    const destinos = destinosUnicos.map(id => ({
        id,
        codigo: enTransito.find(t => t.bodega_destino_id === id)?.bodega_destino_codigo,
        nombre: enTransito.find(t => t.bodega_destino_id === id)?.bodega_destino_nombre,
    }));

    const agrupadas = filtradas.filter(t => t.bodega_destino_id).reduce((acc: Record<string, any[]>, t: any) => {
        const key = t.bodega_destino_codigo || t.bodega_destino_nombre || "Sin destino";
        if (!acc[key]) acc[key] = [];
        acc[key].push(t);
        return acc;
    }, {} as Record<string, any[]>);

    const recibir = async (codigoQr: string) => {
        setRecibiendo(true);
        try {
            const res = await post(`/tarimas/entregar/${encodeURIComponent(codigoQr)}`, {});
            notify(`Tarima ${res.tarima.codigo_qr} recibida en bodega destino`, "success");
            setScanValue("");
            load();
            inputRef.current?.focus();
        } catch (e: any) {
            notify("Error: " + (e.message || "Error"), "error");
        }
        setRecibiendo(false);
    };

    const handleScanSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!scanValue.trim()) return;
        recibir(scanValue.trim());
    };

    const recibirTodas = async () => {
        const ids = filtradas.map(t => t.id);
        if (!ids.length) { notify("No hay tarimas en tránsito", "info"); return; }
        setRecibiendo(true);
        let ok = 0;
        for (const t of filtradas) {
            try {
                await post(`/tarimas/entregar/${encodeURIComponent(t.codigo_qr)}`, {});
                ok++;
            } catch {}
        }
        notify(`${ok} tarima(s) recibidas`, "success");
        load();
        setRecibiendo(false);
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
                <h1 style={{ margin: 0 }}>Recepción en Bodega Destino</h1>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <select value={bodegaFiltro} onChange={e => setBodegaFiltro(e.target.value)} style={inputBase}>
                        <option value="">Todas las bodegas destino</option>
                        {destinos.map(d => (
                            <option key={d.id} value={d.id}>{d.codigo || d.nombre || d.id}</option>
                        ))}
                    </select>
                    <button onClick={recibirTodas} disabled={recibiendo || !filtradas.length}
                        style={{ padding: "8px 16px", background: recibiendo || !filtradas.length ? "#ccc" : "#4caf50", color: "#fff", border: "none", borderRadius: 8, cursor: recibiendo || !filtradas.length ? "not-allowed" : "pointer", fontSize: 14, fontWeight: "bold", whiteSpace: "nowrap" }}>
                        {recibiendo ? "Recibiendo..." : `Recibir todas (${filtradas.length})`}
                    </button>
                </div>
            </div>

            <div style={{ ...cardStyle, marginBottom: 16 }}>
                <form onSubmit={handleScanSubmit} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input ref={inputRef} autoFocus value={scanValue} onChange={e => setScanValue(e.target.value)}
                        placeholder="Escanea o escribe código QR de la tarima..."
                        style={{ ...inputBase, flex: 1 }} />
                    <button type="submit" disabled={recibiendo || !scanValue.trim()}
                        style={{ padding: "10px 20px", background: recibiendo ? "#ccc" : "#4caf50", color: "#fff", border: "none", borderRadius: 8, cursor: recibiendo ? "not-allowed" : "pointer", fontSize: 14, fontWeight: "bold", whiteSpace: "nowrap" }}>
                        Recibir
                    </button>
                </form>
            </div>

            {filtradas.length === 0 && (
                <div style={{ color: "#888", padding: 20, textAlign: "center" }}>
                    No hay tarimas en tránsito hacia estas bodegas.
                </div>
            )}

            {Object.entries(agrupadas).map(([bodega, tarimas]) => (
                <div key={bodega} style={{ ...cardStyle, borderLeft: `4px solid #1565c0` }}>
                    <div style={{ fontWeight: "bold", fontSize: 15, marginBottom: 8, color: "#1565c0" }}>
                        → {bodega} <span style={{ fontWeight: "normal", fontSize: 12, color: "#888" }}>({tarimas.length} tarimas)</span>
                    </div>
                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                            <thead>
                                <tr style={{ background: "#f9f9f9", textAlign: "left" }}>
                                    <th style={{ padding: "6px 8px" }}>QR</th>
                                    <th style={{ padding: "6px 8px" }}>Producto</th>
                                    <th style={{ padding: "6px 8px" }}>Tipo</th>
                                    <th style={{ padding: "6px 8px" }}>Núm</th>
                                    <th style={{ padding: "6px 8px" }}>Origen</th>
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
                                        <td style={{ padding: "6px 8px", fontSize: 11 }}>{t.bodega_origen_codigo || t.bodega_origen_nombre || "-"}</td>
                                        <td style={{ padding: "6px 8px", color: "#666" }}>{t.codigo_lote}</td>
                                        <td style={{ padding: "6px 8px" }}>
                                            <button onClick={() => recibir(t.codigo_qr)} disabled={recibiendo}
                                                style={{ padding: "4px 10px", background: "#4caf50", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 11, fontWeight: "bold", whiteSpace: "nowrap" }}>
                                                Recibir
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
