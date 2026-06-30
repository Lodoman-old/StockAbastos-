import React, { useEffect, useRef, useState } from "react";
import { get, put, API } from "../services/api";

export function Configuracion() {
    const [config, setConfig] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState("");
    const fileRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        get("/configuracion").then(setConfig).catch(() => {}).finally(() => setLoading(false));
    }, []);

    const set = (clave: string, valor: string) => setConfig(c => ({ ...c, [clave]: valor }));

    const guardar = async () => {
        setSaving(true);
        setMsg("");
        try {
            await put("/configuracion", config);
            setMsg("Configuración guardada");
        } catch (e: any) {
            setMsg("Error: " + (e.message || "Error"));
        }
        setSaving(false);
    };

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const fd = new FormData();
        fd.append("file", file);
        try {
            const res = await fetch(`${API}/configuracion/upload-logo`, {
                method: "POST",
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
                body: fd,
            });
            if (!res.ok) throw new Error(await res.text());
            const data = await res.json();
            set("logo_url", data.logo_url);
            setMsg("Logo subido");
        } catch (err: any) {
            setMsg("Error: " + err.message);
        }
    };

    if (loading) return <div><h1>Configuración</h1><p>Cargando...</p></div>;

    const inputStyle: React.CSSProperties = { width: "100%", padding: "10px 12px", fontSize: 14, border: "1px solid #ddd", borderRadius: 8, boxSizing: "border-box" };
    const labelStyle: React.CSSProperties = { display: "block", fontSize: 13, color: "#555", marginBottom: 4 };

    return (
        <div>
            <h1>Configuración</h1>

            {msg && (
                <div style={{ padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 14,
                    background: msg.includes("Error") ? "#fef2f2" : "#e8f5e9",
                    color: msg.includes("Error") ? "#dc2626" : "#2e7d32" }}>
                    {msg}
                </div>
            )}

            <div style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.08)", marginBottom: 24 }}>
                <h3 style={{ marginBottom: 16 }}>Empresa</h3>
                <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
                    <div>
                        <label style={labelStyle}>Nombre</label>
                        <input value={config.empresa_nombre || ""} onChange={e => set("empresa_nombre", e.target.value)} style={inputStyle} />
                    </div>
                    <div>
                        <label style={labelStyle}>Dirección</label>
                        <input value={config.empresa_direccion || ""} onChange={e => set("empresa_direccion", e.target.value)} style={inputStyle} />
                    </div>
                    <div>
                        <label style={labelStyle}>Teléfono</label>
                        <input value={config.empresa_telefono || ""} onChange={e => set("empresa_telefono", e.target.value)} style={inputStyle} />
                    </div>
                    <div>
                        <label style={labelStyle}>Email</label>
                        <input value={config.empresa_email || ""} onChange={e => set("empresa_email", e.target.value)} style={inputStyle} />
                    </div>
                </div>
            </div>

            <div style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.08)", marginBottom: 24 }}>
                <h3 style={{ marginBottom: 16 }}>Ticket de venta</h3>
                <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
                    <div>
                        <label style={labelStyle}>Formato</label>
                        <select value={config.ticket_formato || "80mm"} onChange={e => set("ticket_formato", e.target.value)} style={inputStyle}>
                            <option value="58mm">58 mm (ticket pequeño)</option>
                            <option value="80mm">80 mm (ticket estándar)</option>
                        </select>
                    </div>
                    <div>
                        <label style={labelStyle}>Encabezado del ticket</label>
                        <textarea value={config.ticket_encabezado || ""} onChange={e => set("ticket_encabezado", e.target.value)} style={{ ...inputStyle, minHeight: 60 }} />
                    </div>
                    <div>
                        <label style={labelStyle}>Pie del ticket</label>
                        <textarea value={config.ticket_pie || ""} onChange={e => set("ticket_pie", e.target.value)} style={{ ...inputStyle, minHeight: 60 }} />
                    </div>
                    <div>
                        <label style={labelStyle}>Logo</label>
                        <input type="file" ref={fileRef} onChange={handleFile} accept="image/*" style={inputStyle} />
                        {config.logo_url && (
                            <p style={{ fontSize: 12, color: "#666", marginTop: 4 }}>Subido: {config.logo_url}</p>
                        )}
                    </div>
                </div>
            </div>

            <div style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.08)", marginBottom: 24 }}>
                <h3 style={{ marginBottom: 16 }}>Etiquetas QR para tarimas</h3>
                <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
                    <div>
                        <label style={labelStyle}>Ancho de impresión</label>
                        <select value={config.ancho_tarimas || "80mm"} onChange={e => set("ancho_tarimas", e.target.value)} style={inputStyle}>
                            <option value="58mm">58 mm (ticket pequeño)</option>
                            <option value="80mm">80 mm (ticket estándar)</option>
                        </select>
                    </div>
                </div>
            </div>

            <button onClick={guardar} disabled={saving}
                style={{ padding: "12px 24px", background: "#1a8a3a", color: "#fff", border: "none", borderRadius: 8, cursor: saving ? "not-allowed" : "pointer", fontSize: 15, fontWeight: "bold" }}>
                {saving ? "Guardando..." : "Guardar configuración"}
            </button>
        </div>
    );
}
