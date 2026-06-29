import React, { useState } from "react";
import { getApiBase, setApiBase } from "../services/api.config";

export function ServerConfig({ onConfigured }: { onConfigured: () => void }) {
    const [url, setUrl] = useState(getApiBase());
    const [testing, setTesting] = useState(false);
    const [error, setError] = useState("");

    async function testAndSave() {
        setTesting(true);
        setError("");
        const testUrl = `${url.replace(/\/+$/, "")}/health`;
        console.log("Probando conexión a:", testUrl);
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 8000);
            const res = await fetch(testUrl, { signal: controller.signal });
            clearTimeout(timeout);
            if (!res.ok) throw new Error(`Respuesta inválida: status ${res.status}`);
            setApiBase(url.replace(/\/+$/, ""));
            onConfigured();
        } catch (e: any) {
            console.error("Error de conexión:", e);
            let msg = e.name === "AbortError"
                ? "Tiempo de espera agotado (8s). El celular no puede alcanzar esa IP — ¿está en el mismo WiFi?"
                : `No se pudo conectar. Detalle: ${e.message || e.name || "desconocido"}`;
            setError(msg);
        }
        setTesting(false);
    }

    return (
        <div style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            minHeight: "100vh", background: "#1a8a3a", padding: 16,
        }}>
            <div style={{
                background: "#fff", borderRadius: 16, padding: 32,
                width: "100%", maxWidth: 360, boxShadow: "0 4px 24px rgba(0,0,0,0.2)",
            }}>
                <div style={{ textAlign: "center", marginBottom: 24 }}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>🔗</div>
                    <h2 style={{ margin: "0 0 4px", fontSize: 18, color: "#1a3a2a" }}>Conectar al servidor</h2>
                    <p style={{ fontSize: 13, color: "#888", margin: 0 }}>
                        Ingresa la dirección del servidor de StockAbastos
                    </p>
                </div>

                <label style={{ fontSize: 13, color: "#555", marginBottom: 4, display: "block" }}>URL del servidor</label>
                <input type="url" value={url}
                    onChange={e => setUrl(e.target.value)}
                    placeholder="http://192.168.0.24:4000/api"
                    style={{ width: "100%", padding: "10px 12px", fontSize: 14, marginBottom: 16,
                        border: "1px solid #ddd", borderRadius: 8, outline: "none", boxSizing: "border-box" }} />

                {error && (
                    <div style={{
                        background: "#fef2f2", color: "#dc2626", padding: "8px 12px",
                        borderRadius: 8, fontSize: 13, marginBottom: 16,
                    }}>
                        {error}
                    </div>
                )}

                <button onClick={testAndSave} disabled={testing}
                    style={{ width: "100%", padding: 12, fontSize: 16, fontWeight: "bold",
                        background: testing ? "#ccc" : "#1a8a3a", color: "#fff",
                        border: "none", borderRadius: 8, cursor: testing ? "not-allowed" : "pointer" }}>
                    {testing ? "Probando conexión..." : "Conectar"}
                </button>

                <p style={{ fontSize: 11, color: "#aaa", textAlign: "center", marginTop: 12 }}>
                    Debe ser la dirección completa incluyendo /api
                </p>

                <div style={{ marginTop: 16, fontSize: 12, color: "#888", background: "#f9f9f9", borderRadius: 8, padding: 12 }}>
                    <strong>Ejemplos:</strong>
                    <br />http://192.168.0.24:4000/api
                    <br />http://midominio.com:4000/api
                    <br />https://api.stockabastos.com
                </div>
            </div>
        </div>
    );
}
