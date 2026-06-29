import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { setApiUrl, testConnection, hasApiUrl } from "../api";
import { notify } from "../components/Toast";

export function SetupPage() {
  const [url, setUrl] = useState("");
  const [testing, setTesting] = useState(false);
  const navigate = useNavigate();

  if (hasApiUrl()) {
    navigate("/login", { replace: true });
    return null;
  }

  const handleSubmit = async () => {
    if (!url.trim()) return notify("Ingresa la URL del servidor", "error");
    setTesting(true);
    const ok = await testConnection(url.trim());
    setTesting(false);
    if (ok) {
      setApiUrl(url.trim());
      notify("Conexión exitosa", "success");
      navigate("/login");
    } else {
      notify("No se pudo conectar. Verifica la URL.", "error");
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, background: "#1a3a2a" }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: 32, width: "100%", maxWidth: 380 }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <img src="/LogoFinal.png" alt="StockAbastos" style={{ width: 80, height: 80, borderRadius: 16 }} />
          <h2 style={{ marginTop: 12, fontSize: 20, color: "#1a3a2a" }}>StockAbastos</h2>
          <p style={{ fontSize: 13, color: "#888", marginTop: 4 }}>Configuración inicial</p>
        </div>
        <div className="input-group">
          <label>URL del servidor</label>
          <input className="input" type="url" value={url} onChange={e => setUrl(e.target.value)}
            placeholder="https://tuservidor.com" autoFocus autoComplete="url" />
        </div>
        <button className="btn btn-primary" onClick={handleSubmit} disabled={testing || !url.trim()}
          style={{ marginTop: 8 }}>
          {testing ? "Probando conexión..." : "Conectar"}
        </button>
      </div>
    </div>
  );
}
