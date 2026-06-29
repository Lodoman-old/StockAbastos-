import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getApiUrl, setApiUrl, testConnection, clearApiUrl } from "../api";
import { syncCatalogos } from "../sync";
import { notify } from "../components/Toast";

export function SettingsPage() {
  const navigate = useNavigate();
  const [url, setUrl] = useState(getApiUrl());
  const [testing, setTesting] = useState(false);

  const handleSave = async () => {
    if (!url.trim()) return notify("Ingresa una URL", "error");
    setTesting(true);
    const ok = await testConnection(url.trim());
    setTesting(false);
    if (ok) {
      setApiUrl(url.trim());
      notify("URL actualizada", "success");
    } else {
      notify("No se pudo conectar", "error");
    }
  };

  const handleReset = () => {
    clearApiUrl();
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    navigate("/setup");
  };

  const usuario = JSON.parse(localStorage.getItem("usuario") || "{}");

  return (
    <div className="page">
      <div className="header" style={{ margin: -16, marginBottom: 16, borderRadius: "0 0 12px 12px" }}>
        <span className="header-back" onClick={() => navigate("/")}>←</span>
        <h1>Configuración</h1>
      </div>

      <div className="card">
        <h3 style={{ fontSize: 15, marginBottom: 12 }}>Servidor</h3>
        <div className="input-group">
          <label>URL del servidor API</label>
          <input className="input" value={url} onChange={e => setUrl(e.target.value)}
            placeholder="https://tuservidor.com" />
        </div>
        <button className="btn btn-primary" onClick={handleSave} disabled={testing} style={{ marginBottom: 8 }}>
          {testing ? "Probando..." : "Guardar y probar"}
        </button>
        <button className="btn btn-outline" onClick={handleReset} style={{ fontSize: 13 }}>
          Restablecer configuración
        </button>
      </div>

      <div className="card">
        <h3 style={{ fontSize: 15, marginBottom: 8 }}>Datos locales</h3>
        <button className="btn btn-secondary" onClick={async () => {
          if (!navigator.onLine) return notify("Sin conexión", "error");
          await syncCatalogos();
          notify("Catálogos actualizados", "success");
        }}>Sincronizar datos ahora</button>
        <p style={{ fontSize: 11, color: "#888", marginTop: 8, textAlign: "center" }}>
          Descarga productos, bodegas y tipos de tarima para uso sin conexión
        </p>
      </div>

      <div className="card">
        <h3 style={{ fontSize: 15, marginBottom: 8 }}>Sesión</h3>
        <div className="result-row"><span className="result-label">Usuario</span><span className="result-value">{usuario.nombre || "-"}</span></div>
        <div className="result-row"><span className="result-label">Rol</span><span className="result-value">{usuario.rol || "-"}</span></div>
      </div>

      <div className="card" style={{ textAlign: "center" }}>
        <p style={{ fontSize: 12, color: "#888" }}>
          StockAbastos Móvil v1.0
        </p>
      </div>
    </div>
  );
}
