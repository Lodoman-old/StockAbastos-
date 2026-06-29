import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login, getApiUrl, clearApiUrl } from "../api";
import { notify } from "../components/Toast";

export function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const apiUrl = getApiUrl();
  if (!apiUrl) {
    navigate("/setup", { replace: true });
    return null;
  }

  const handleLogin = async () => {
    if (!username || !password) return notify("Ingresa usuario y contraseña", "error");
    setLoading(true);
    try {
      const data = await login(apiUrl, username, password);
      localStorage.setItem("token", data.token);
      localStorage.setItem("usuario", JSON.stringify(data.usuario || {}));
      notify("Bienvenido", "success");
      navigate("/");
    } catch (e: any) {
      notify(e.message, "error");
    }
    setLoading(false);
  };

  const handleCambiarServidor = () => {
    clearApiUrl();
    navigate("/setup");
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, background: "#1a3a2a" }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: 32, width: "100%", maxWidth: 380 }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <img src="/LogoFinal.png" alt="StockAbastos" style={{ width: 80, height: 80, borderRadius: 16 }} />
          <h2 style={{ marginTop: 12, fontSize: 20, color: "#1a3a2a" }}>StockAbastos</h2>
          <p style={{ fontSize: 12, color: "#888", marginTop: 4, wordBreak: "break-all" }}>{apiUrl}</p>
        </div>
        <div className="input-group">
          <label>Usuario</label>
          <input className="input" value={username} onChange={e => setUsername(e.target.value)}
            autoFocus autoComplete="username" />
        </div>
        <div className="input-group">
          <label>Contraseña</label>
          <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleLogin()} autoComplete="current-password" />
        </div>
        <button className="btn btn-primary" onClick={handleLogin} disabled={loading}
          style={{ marginTop: 8 }}>
          {loading ? "Ingresando..." : "Iniciar sesión"}
        </button>
        <button className="btn btn-outline" onClick={handleCambiarServidor}
          style={{ marginTop: 8, fontSize: 13 }}>
          Cambiar servidor
        </button>
      </div>
    </div>
  );
}
