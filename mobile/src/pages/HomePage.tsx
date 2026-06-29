import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { onPendientesChange, isOnline, syncCatalogos } from "../sync";
import { contarPendientes } from "../db";
import { notify } from "../components/Toast";

export function HomePage() {
  const navigate = useNavigate();
  const usuario = JSON.parse(localStorage.getItem("usuario") || "{}");
  const [pendientes, setPendientes] = useState(0);
  const [online, setOnline] = useState(isOnline());

  useEffect(() => {
    contarPendientes().then(setPendientes);
    const unsub = onPendientesChange(setPendientes);
    const iv = setInterval(() => setOnline(navigator.onLine), 3000);
    return () => { unsub(); clearInterval(iv); };
  }, []);

  const refresh = async () => {
    if (!navigator.onLine) return notify("Sin conexión", "error");
    await syncCatalogos();
    notify("Catálogos actualizados", "success");
  };

  const acciones = [
    { label: "Escanear QR", icon: "📷", path: "/scan", color: "#1a8a3a" },
    { label: "Recibir tarima", icon: "📦", path: "/scan?action=receive", color: "#1976d2" },
    { label: "Confirmar traspaso", icon: "🚚", path: "/scan?action=confirm", color: "#e65100" },
    { label: "Recibir traspaso", icon: "📥", path: "/scan?action=transfer-receive", color: "#9c27b0" },
    { label: "Configuración", icon: "⚙️", path: "/settings", color: "#555" },
  ];

  const salir = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    navigate("/login");
  };

  return (
    <div className="page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20 }}>StockAbastos</h2>
          <p style={{ fontSize: 12, color: "#888", margin: 0 }}>{usuario.nombre || ""}</p>
        </div>
        <button onClick={salir} className="btn btn-danger" style={{ width: "auto", padding: "8px 16px", fontSize: 13 }}>
          Salir
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, background: online ? "#e8f5e9" : "#fff3e0", fontSize: 12 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: online ? "#2e7d32" : "#e65100", display: "inline-block" }} />
          {online ? "En línea" : "Sin conexión"}
        </div>
        {pendientes > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", borderRadius: 8, background: "#e3f2fd", fontSize: 12, color: "#1565c0" }}>
            <span>⏳</span> {pendientes} pendiente{pendientes !== 1 ? "s" : ""}
          </div>
        )}
        <div onClick={refresh} style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", borderRadius: 8, background: "#f5f5f5", fontSize: 12, cursor: "pointer" }}>
          🔄
        </div>
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        {acciones.map(a => (
          <div key={a.path} className="card" onClick={() => navigate(a.path)}
            style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ fontSize: 28, width: 48, height: 48, display: "flex", alignItems: "center", justifyContent: "center", background: a.color + "18", borderRadius: 12 }}>
              {a.icon}
            </div>
            <div>
              <div style={{ fontWeight: "bold", fontSize: 15 }}>{a.label}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
