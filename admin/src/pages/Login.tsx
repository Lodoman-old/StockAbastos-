import React, { useState } from "react";
import { post } from "../services/api";

export function Login({ onLogin }: { onLogin: () => void }) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const data = await post("/auth/login", { email, password });
            localStorage.setItem("token", data.token);
            localStorage.setItem("usuario", JSON.stringify(data.usuario));
            onLogin();
        } catch (err: any) {
            setError(err.message || "Error al iniciar sesión");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#1a3a2a", padding: 16 }}>
            <div className="login-card" style={{ background: "#fff", borderRadius: 16, padding: 40, width: "100%", maxWidth: 380, boxShadow: "0 8px 32px rgba(0,0,0,0.3)" }}>
                <div style={{ textAlign: "center", marginBottom: 32 }}>
                    <div style={{ background: "#fff", borderRadius: 16, padding: 8, display: "inline-block", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
                        <img src="/LogoFinal.png" alt="StockAbastos" style={{ width: 110, height: 110, display: "block" }} />
                    </div>
                </div>

                {error && <div style={{ background: "#fef2f2", color: "#dc2626", padding: "8px 12px", borderRadius: 8, fontSize: 13, marginBottom: 16 }}>{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: 16 }}>
                        <label style={{ fontSize: 13, color: "#555", display: "block", marginBottom: 4 }}>Email</label>
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@stockabastos.com" required
                            style={{ width: "100%", padding: "10px 12px", fontSize: 15, border: "1px solid #ddd", borderRadius: 8, boxSizing: "border-box" }} />
                    </div>
                    <div style={{ marginBottom: 24 }}>
                        <label style={{ fontSize: 13, color: "#555", display: "block", marginBottom: 4 }}>Contraseña</label>
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required
                            style={{ width: "100%", padding: "10px 12px", fontSize: 15, border: "1px solid #ddd", borderRadius: 8, boxSizing: "border-box" }} />
                    </div>
                    <button type="submit" disabled={loading}
                        style={{ width: "100%", padding: 12, fontSize: 16, fontWeight: "bold", background: loading ? "#ccc" : "#1a8a3a", color: "#fff", border: "none", borderRadius: 8, cursor: loading ? "not-allowed" : "pointer" }}>
                        {loading ? "Entrando..." : "Entrar"}
                    </button>
                </form>
            </div>
        </div>
    );
}
