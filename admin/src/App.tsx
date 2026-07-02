import React, { useState, useEffect } from "react";
import { HashRouter, Routes, Route, Link, Navigate } from "react-router-dom";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { Productos } from "./pages/Productos";
import { Bodegas } from "./pages/Bodegas";
import { Lotes } from "./pages/Lotes";
import { Ventas } from "./pages/Ventas";
import { SyncMonitor } from "./pages/SyncMonitor";
import { Reportes } from "./pages/Reportes";
import { Ubicaciones } from "./pages/Ubicaciones";
import { Roles } from "./pages/Roles";
import { Usuarios } from "./pages/Usuarios";
import { Configuracion } from "./pages/Configuracion";
import { Clientes } from "./pages/Clientes";
import { Gastos } from "./pages/Gastos";
import { Compras } from "./pages/Compras";
import { Ganancias } from "./pages/Ganancias";
import { Proveedores } from "./pages/Proveedores";
import { PreciosDelDia } from "./pages/PreciosDelDia";
import { CorteDeCaja } from "./pages/CorteDeCaja";
import { HistorialPrecios } from "./pages/HistorialPrecios";
import { PrestamoCajas } from "./pages/PrestamoCajas";
import { ReporteCompras } from "./pages/ReporteCompras";
import { ReporteCreditos } from "./pages/ReporteCreditos";
import { TarimasTipos } from "./pages/TarimasTipos";
import { RecepcionTarimas } from "./pages/RecepcionTarimas";
import { TraspasoTarimas } from "./pages/TraspasoTarimas";
import { ConfirmarTraspaso } from "./pages/ConfirmarTraspaso";
import { RecepcionTraspaso } from "./pages/RecepcionTraspaso";
import { SurtirMostrador } from "./pages/SurtirMostrador";
import { POSMenudeo } from "./pages/POSMenudeo";
import { Impresoras } from "./pages/Impresoras";
import { ToastContainer } from "./components/Toast";
import { isAuthenticated, clearSession } from "./services/auth";
const API_BASE = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL + "/api" : "/api";

function getUsuario(): any {
    try {
        return JSON.parse(localStorage.getItem("usuario") || "null");
    } catch {
        return null;
    }
}

function getPermisos(): string[] {
    const u = getUsuario();
    return u?.permisos || [];
}

function tienePermiso(permiso: string): boolean {
    const u = getUsuario();
    if (u?.rol === "admin") return true;
    return getPermisos().includes(permiso);
}

interface NavItem {
    path: string;
    label: string;
    permiso: string;
}

interface NavGroup {
    title: string;
    items: NavItem[];
}

const navGroups: NavGroup[] = [
    { title: "", items: [
        { path: "/dashboard", label: "Dashboard", permiso: "ver_dashboard" },
    ]},
    { title: "Ventas", items: [
        { path: "/ventas", label: "Ventas", permiso: "ver_ventas" },
        { path: "/pos-menudeo", label: "POS Menudeo", permiso: "ver_ventas" },
        { path: "/precios-diarios", label: "Precios del Día", permiso: "ver_ventas" },
        { path: "/historial-precios", label: "Historial Precios", permiso: "ver_ventas" },
        { path: "/clientes", label: "Clientes", permiso: "ver_clientes" },
        { path: "/prestamo-cajas", label: "Préstamo Cajas", permiso: "ver_prestamo_cajas" },
    ]},
    { title: "Compras", items: [
        { path: "/compras", label: "Compras", permiso: "ver_compras" },
        { path: "/proveedores", label: "Proveedores", permiso: "ver_compras" },
        { path: "/recepcion-tarimas", label: "Recepción Tarimas", permiso: "ver_compras" },
    ]},
    { title: "Inventario", items: [
        { path: "/productos", label: "Productos", permiso: "ver_productos" },
        { path: "/lotes", label: "Lotes", permiso: "ver_lotes" },
        { path: "/bodegas", label: "Bodegas", permiso: "ver_bodegas" },
        { path: "/ubicaciones", label: "Ubicaciones", permiso: "ver_ubicaciones" },
        { path: "/tarimas-tipos", label: "Tipos de Tarima", permiso: "ver_productos" },
    ]},
    { title: "Movimientos", items: [
        { path: "/traspaso-tarimas", label: "Traspaso Tarimas", permiso: "ver_compras" },
        { path: "/confirmar-traspaso", label: "Confirmar Traspaso", permiso: "ver_compras" },
        { path: "/recepcion-traspaso", label: "Recepción Traspaso", permiso: "ver_compras" },
        { path: "/surtir-mostrador", label: "Surtir Mostrador", permiso: "ver_compras" },
    ]},
    { title: "Finanzas", items: [
        { path: "/gastos", label: "Gastos", permiso: "ver_gastos" },
        { path: "/ganancias", label: "Ganancias", permiso: "ver_ganancias" },
        { path: "/corte-caja", label: "Corte de Caja", permiso: "ver_cortes" },
    ]},
    { title: "Reportes", items: [
        { path: "/reportes", label: "Reportes", permiso: "ver_reportes" },
        { path: "/reporte-compras", label: "Reporte Compras", permiso: "ver_compras" },
        { path: "/reporte-creditos", label: "Reporte Créditos", permiso: "ver_ventas" },
    ]},
    { title: "Administración", items: [
        { path: "/usuarios", label: "Usuarios", permiso: "gestionar_usuarios" },
        { path: "/roles", label: "Roles", permiso: "gestionar_roles" },
        { path: "/configuracion", label: "Configuración", permiso: "gestionar_configuracion" },
        { path: "/impresoras", label: "Impresoras", permiso: "gestionar_configuracion" },
        { path: "/sync", label: "Sincronización", permiso: "ver_sync" },
    ]},
];

const styles = `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f0f2f5; }
    .sidebar-overlay { display: none; }
    @media (max-width: 768px) {
        .sidebar-open .sidebar-overlay { display: block; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 99; }
        .sidebar { position: fixed !important; left: -260px; transition: left 0.3s; z-index: 100; }
        .sidebar-open .sidebar { left: 0; }
        .main-content { margin-left: 0 !important; width: 100%; }
        .hamburger { display: block !important; }
    }
`;

function AdminLayout({ children, sidebarOpen, onToggle, onLogout }: { children: React.ReactNode; sidebarOpen: boolean; onToggle: () => void; onLogout: () => void }) {
    const usuario = getUsuario();
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    const [preciosPendientes, setPreciosPendientes] = useState(0);
    const [stockBajo, setStockBajo] = useState<any[]>([]);
    const [porVencer, setPorVencer] = useState<any[]>([]);
    const [hidePrecios, setHidePrecios] = useState(false);
    const [hidePorVencer, setHidePorVencer] = useState(false);
    const [hideStockBajo, setHideStockBajo] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };
        if (tienePermiso("ver_ventas")) {
            (async () => {
                try {
                    const res = await fetch(`${API_BASE}/precios-diarios/pendientes`, { headers });
                    const data = await res.json();
                    setPreciosPendientes(data.filter((p: any) => !p.precio_hoy_kg).length);
                } catch {}
            })();
        }
        if (tienePermiso("ver_reportes")) {
            (async () => {
                try {
                    const res = await fetch(`${API_BASE}/dashboard/reportes`, { headers });
                    const data = await res.json();
                    setStockBajo(data.productos_bajo_stock || []);
                } catch {}
            })();
            (async () => {
                try {
                    const res = await fetch(`${API_BASE}/tarimas/por-vencer`, { headers });
                    const data = await res.json();
                    setPorVencer(data);
                } catch {}
            })();
        }
    }, []);

    const toggleGroup = (title: string) => setExpanded((prev) => ({ ...prev, [title]: !prev[title] }));

    const handleLogout = () => {
        clearSession();
        onLogout();
    };

    return (
        <div className={sidebarOpen ? "sidebar-open" : ""} style={{ display: "flex", minHeight: "100vh" }}>
            <div className="sidebar-overlay" onClick={onToggle} />
            <nav className="sidebar" style={{
                width: 240, background: "#1a3a2a", color: "#fff",
                padding: "16px 16px 0", display: "flex", flexDirection: "column",
                height: "100vh", position: "sticky", top: 0, flexShrink: 0,
            }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <div style={{ textAlign: "center", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.1)", width: "100%" }}>
                        <div style={{ background: "#fff", borderRadius: 12, padding: 8, display: "inline-block" }}>
                            <img src="/LogoFinal.png" alt="StockAbastos"
                                style={{ width: 64, height: 64, display: "block" }} />
                        </div>
                        {usuario && (
                            <p style={{ fontSize: 11, opacity: 0.6, marginTop: 8, marginBottom: 0 }}>
                                {usuario.nombre} ({usuario.rol})
                            </p>
                        )}
                    </div>
                </div>
                <div style={{ flex: 1, overflowY: "auto" }}>
                    {navGroups.map((group, gi) => {
                        const visible = group.items.filter(item => tienePermiso(item.permiso));
                        if (!visible.length) return null;
                        const isExpanded = group.title ? expanded[group.title] === true : true;
                        return (
                            <div key={gi} style={{ marginBottom: 4 }}>
                                {group.title ? (
                                    <div onClick={() => toggleGroup(group.title)}
                                        style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1, opacity: 0.5, padding: "8px 16px 4px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", userSelect: "none" }}>
                                        <span>{group.title}</span>
                                        <span style={{ fontSize: 8, transition: "transform 0.2s", transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)" }}>▶</span>
                                    </div>
                                ) : (
                                    <div style={{ height: 4 }} />
                                )}
                                {isExpanded && visible.map((item) => (
                                    <Link key={item.path} to={item.path} onClick={onToggle}
                                        style={{ color: "#fff", textDecoration: "none", padding: "8px 16px", borderRadius: 8, marginBottom: 2, fontSize: 14, display: "block" }}>
                                        {item.label}
                                    </Link>
                                ))}
                            </div>
                        );
                    })}
                </div>
                <div style={{ padding: "12px 0", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                    <button onClick={handleLogout}
                        style={{ width: "100%", padding: 10, background: "transparent", color: "#ef4444", border: "1px solid #ef4444", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>
                        Cerrar sesión
                    </button>
                </div>
            </nav>
            <main className="main-content" style={{ flex: 1, padding: 24, overflow: "auto", minWidth: 0 }}>
                <div className="main-content-inner">
                <button className="hamburger" onClick={onToggle} style={{
                    display: "none", background: "#1a3a2a", color: "#fff", border: "none",
                    borderRadius: 8, padding: "8px 12px", fontSize: 20, cursor: "pointer", marginBottom: 16,
                }}>
                    ☰
                </button>
                {preciosPendientes > 0 && !hidePrecios && (
                    <div style={{ background: "#fff3cd", color: "#856404", padding: "10px 16px", borderRadius: 8, marginBottom: 8, fontSize: 14, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                        <span>Hay <strong>{preciosPendientes}</strong> productos sin precio asignado para hoy</span>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <Link to="/precios-diarios" style={{ color: "#1a8a3a", fontWeight: "bold", textDecoration: "none" }}>Asignar precios →</Link>
                            <button onClick={() => setHidePrecios(true)} style={{ background: "none", border: "none", cursor: "pointer", color: "#856404", fontSize: 16, padding: 0, lineHeight: 1 }}>✕</button>
                        </div>
                    </div>
                )}
                {porVencer.length > 0 && !hidePorVencer && (
                    <div style={{ background: "#fff3cd", color: "#856404", padding: "10px 16px", borderRadius: 8, marginBottom: 8, fontSize: 14, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                        <span><strong>{porVencer.length}</strong> tarima(s) por vencer en 5 días o menos</span>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <Link to="/bodegas" style={{ color: "#e65100", fontWeight: "bold", textDecoration: "none" }}>Ver en bodegas →</Link>
                            <button onClick={() => setHidePorVencer(true)} style={{ background: "none", border: "none", cursor: "pointer", color: "#856404", fontSize: 16, padding: 0, lineHeight: 1 }}>✕</button>
                        </div>
                    </div>
                )}
                {stockBajo.length > 0 && !hideStockBajo && (
                    <div style={{ background: "#fef2f2", color: "#991b1b", padding: "10px 16px", borderRadius: 8, marginBottom: 16, fontSize: 14, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                        <span><strong>{stockBajo.length}</strong> productos con stock bajo</span>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <Link to="/reportes" style={{ color: "#dc2626", fontWeight: "bold", textDecoration: "none" }}>Ver detalles →</Link>
                            <button onClick={() => setHideStockBajo(true)} style={{ background: "none", border: "none", cursor: "pointer", color: "#991b1b", fontSize: 16, padding: 0, lineHeight: 1 }}>✕</button>
                        </div>
                    </div>
                )}
                {children}
                </div>
            </main>
            <ToastContainer />
        </div>
    );
}

export function App() {
    const [authed, setAuthed] = useState(isAuthenticated());
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        if (!authed) return;
        const interval = setInterval(() => {
            if (!isAuthenticated()) {
                clearSession();
                setAuthed(false);
            }
        }, 30000);
        return () => clearInterval(interval);
    }, [authed]);

    if (!authed) {
        return <Login onLogin={() => setAuthed(true)} />;
    }

    return (
        <HashRouter>
            <style>{styles}</style>
            <AdminLayout sidebarOpen={sidebarOpen} onToggle={() => setSidebarOpen(o => !o)} onLogout={() => setAuthed(false)}>
                <Routes>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/productos" element={<Productos />} />
                    <Route path="/bodegas" element={<Bodegas />} />
                    <Route path="/ubicaciones" element={<Ubicaciones />} />
                    <Route path="/lotes" element={<Lotes />} />
                    <Route path="/ventas" element={<Ventas />} />
                    <Route path="/reportes" element={<Reportes />} />
                    <Route path="/sync" element={<SyncMonitor />} />
                    <Route path="/roles" element={<Roles />} />
                    <Route path="/usuarios" element={<Usuarios />} />
                    <Route path="/clientes" element={<Clientes />} />
                    <Route path="/gastos" element={<Gastos />} />
                    <Route path="/compras" element={<Compras />} />
                    <Route path="/ganancias" element={<Ganancias />} />
                    <Route path="/precios-diarios" element={<PreciosDelDia />} />
                    <Route path="/corte-caja" element={<CorteDeCaja />} />
                    <Route path="/historial-precios" element={<HistorialPrecios />} />
                    <Route path="/prestamo-cajas" element={<PrestamoCajas />} />
                    <Route path="/proveedores" element={<Proveedores />} />
                    <Route path="/reporte-compras" element={<ReporteCompras />} />
                    <Route path="/reporte-creditos" element={<ReporteCreditos />} />
                    <Route path="/tarimas-tipos" element={<TarimasTipos />} />
                    <Route path="/recepcion-tarimas" element={<RecepcionTarimas />} />
                    <Route path="/traspaso-tarimas" element={<TraspasoTarimas />} />
                    <Route path="/confirmar-traspaso" element={<ConfirmarTraspaso />} />
                    <Route path="/recepcion-traspaso" element={<RecepcionTraspaso />} />
                    <Route path="/surtir-mostrador" element={<SurtirMostrador />} />
                    <Route path="/pos-menudeo" element={<POSMenudeo />} />
                    <Route path="/configuracion" element={<Configuracion />} />
                    <Route path="/impresoras" element={<Impresoras />} />
                    <Route path="*" element={<Navigate to="/dashboard" />} />
                </Routes>
            </AdminLayout>
        </HashRouter>
    );
}
