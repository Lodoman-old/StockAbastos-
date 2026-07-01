import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { onPendientesChange, isOnline, syncCatalogos } from "../sync";
import { contarPendientes } from "../db";
import { notify } from "../components/Toast";

export function HomePage() {
  const navigate = useNavigate();
  let usuario: any = {};
  try { usuario = JSON.parse(localStorage.getItem("usuario") || "{}"); } catch {}
  const esAdmin = usuario.rol === "admin" || usuario.rol === "supervisor";
  const permisos: string[] = usuario.permisos || [];
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

  const salir = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    navigate("/login");
  };

  type Item = { label: string; icon: string; path: string; color: string; permiso?: string };
  function puedeVer(i: Item): boolean {
    if (esAdmin) return true;
    if (i.permiso) return permisos.includes(i.permiso);
    return false;
  }
  const todas: { titulo: string; items: Item[] }[] = [
    {
      titulo: "Recepción",
      items: [
        { label: "Recibir tarima", icon: "📦", path: "/scan", color: "#1976d2", permiso: "recibir_mercancia" },
        { label: "Confirmar traspaso", icon: "🚚", path: "/scan?action=confirm", color: "#e65100", permiso: "crear_traspaso" },
        { label: "Recibir traspaso", icon: "📥", path: "/scan?action=transfer-receive", color: "#9c27b0", permiso: "recibir_mercancia" },
      ],
    },
    {
      titulo: "Administración",
      items: [
        { label: "Dashboard", icon: "📊", path: "/dashboard", color: "#1a8a3a", permiso: "ver_dashboard" },
        { label: "Ventas (POS)", icon: "🛒", path: "/ventas", color: "#e65100", permiso: "ver_ventas" },
        { label: "Compras", icon: "📦", path: "/compras", color: "#1976d2" },
        { label: "Clientes", icon: "👥", path: "/clientes", color: "#9c27b0" },
        { label: "Proveedores", icon: "🏭", path: "/proveedores", color: "#555" },
        { label: "Lotes", icon: "🏷️", path: "/lotes", color: "#00796b", permiso: "ver_lotes" },
        { label: "Traspasos", icon: "🚚", path: "/traspasos", color: "#e65100", permiso: "ver_traspasos" },
        { label: "Admin Traspaso", icon: "📋", path: "/admin-traspaso", color: "#e65100", permiso: "admin" },
        { label: "Corte de caja", icon: "💰", path: "/corte-caja", color: "#2e7d32" },
        { label: "Precios del día", icon: "💲", path: "/precios-diarios", color: "#1565c0" },
        { label: "Préstamo cajas", icon: "📦", path: "/prestamo-cajas", color: "#6a1b9a", permiso: "ver_prestamo_cajas" },
        { label: "Historial precios", icon: "📈", path: "/historial-precios", color: "#00796b" },
        { label: "Reportes", icon: "📋", path: "/reportes", color: "#37474f", permiso: "ver_reportes" },
      ],
    },
  ];
  const secciones = todas
    .map(s => ({ ...s, items: s.items.filter(puedeVer) }))
    .filter(s => s.items.length > 0);

  return (
    <div className="page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20 }}>StockAbastos</h2>
          <p style={{ fontSize: 12, color: "#888", margin: 0 }}>{usuario.nombre || ""}</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => navigate("/settings")} className="btn btn-outline" style={{ width: "auto", padding: "8px 12px", fontSize: 13 }}>
            ⚙️
          </button>
          <button onClick={salir} className="btn btn-danger" style={{ width: "auto", padding: "8px 16px", fontSize: 13 }}>
            Salir
          </button>
        </div>
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

      {secciones.map(sec => (
        <div key={sec.titulo} style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 13, color: "#888", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>{sec.titulo}</h3>
          <div style={{ display: "grid", gap: 8 }}>
            {sec.items.map(a => (
              <div key={a.path} className="card" onClick={() => navigate(a.path)}
                style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 12, padding: "10px 14px" }}>
                <div style={{ fontSize: 22, width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", background: a.color + "18", borderRadius: 10 }}>
                  {a.icon}
                </div>
                <div style={{ fontWeight: "bold", fontSize: 14 }}>{a.label}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
