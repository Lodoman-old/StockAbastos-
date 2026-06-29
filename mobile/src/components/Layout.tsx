import React, { useState } from "react";
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon } from "@ionic/react";
import { home, cube, cart, qrCode, download, gitNetwork, checkmarkCircle, menu as menuIcon, close, people, shieldCheckmark, wallet, cash, barChart, business, storefront, sync, pricetag } from "ionicons/icons";
import { logout as authLogout, getPermisos, getUsuario } from "../services/auth.service";
import { Capacitor } from "@capacitor/core";
import { Dashboard } from "../pages/Dashboard";
import { Lotes } from "../pages/Lotes";
import { Ventas } from "../pages/Ventas";
import { Etiqueta } from "../pages/Etiqueta";
import { Recibir } from "../pages/Recibir";
import { Traspasos } from "../pages/Traspasos";
import { RecibirTraspaso } from "../pages/RecibirTraspaso";
import { Clientes } from "../pages/Clientes";
import { Compras } from "../pages/Compras";
import { Gastos } from "../pages/Gastos";
import { Ganancias } from "../pages/Ganancias";
import { Configuracion } from "../pages/Configuracion";
import { SyncStatus } from "../pages/SyncStatus";
import { Proveedores } from "../pages/Proveedores";
import { PreciosDelDia } from "../pages/PreciosDelDia";
import { Reportes } from "../pages/Reportes";
import { CorteDeCaja } from "../pages/CorteDeCaja";
import { HistorialPrecios } from "../pages/HistorialPrecios";
import { PrestamoCajas } from "../pages/PrestamoCajas";
import { ReporteCreditos } from "../pages/ReporteCreditos";
import { ReporteCompras } from "../pages/ReporteCompras";

interface MenuItem {
    path: string;
    label: string;
    icon: string;
    permiso: string;
}

interface MenuGroup {
    title: string;
    items: MenuItem[];
}

const ADMIN_URL = "http://LAPTOP-7E9Q3FDN:5173";

function openAdmin(path: string) {
    const url = path === "admin_web" ? ADMIN_URL : `${ADMIN_URL}/${path}`;
    if (Capacitor.isNativePlatform()) {
        window.open(url, "_system");
    } else {
        window.open(url, "_blank");
    }
}

const allGroups: MenuGroup[] = [
    { title: "", items: [
        { path: "dashboard", label: "Dashboard", icon: home, permiso: "ver_dashboard" },
    ]},
    { title: "Ventas", items: [
        { path: "ventas", label: "Ventas", icon: cart, permiso: "ver_ventas" },
        { path: "precios_diarios", label: "Precios del Día", icon: pricetag, permiso: "ver_ventas" },
        { path: "historial_precios", label: "Historial Precios", icon: cash, permiso: "ver_ventas" },
        { path: "clientes", label: "Clientes", icon: people, permiso: "ver_clientes" },
        { path: "prestamo_cajas", label: "Préstamo Cajas", icon: cash, permiso: "ver_prestamo_cajas" },
    ]},
    { title: "Compras", items: [
        { path: "compras", label: "Compras", icon: storefront, permiso: "ver_compras" },
        { path: "proveedores", label: "Proveedores", icon: people, permiso: "ver_compras" },
    ]},
    { title: "Inventario", items: [
        { path: "lotes", label: "Lotes", icon: cube, permiso: "ver_lotes" },
        { path: "recibir", label: "Recibir", icon: download, permiso: "recibir_mercancia" },
        { path: "traspasos", label: "Traspasos", icon: gitNetwork, permiso: "ver_lotes" },
        { path: "recibir_traspaso", label: "Recibir Traspaso", icon: checkmarkCircle, permiso: "recibir_mercancia" },
        { path: "etiqueta", label: "Etiqueta", icon: qrCode, permiso: "escanear_qr" },
    ]},
    { title: "Finanzas", items: [
        { path: "gastos", label: "Gastos", icon: wallet, permiso: "ver_gastos" },
        { path: "ganancias", label: "Ganancias", icon: barChart, permiso: "ver_ganancias" },
        { path: "corte_caja", label: "Corte de Caja", icon: cash, permiso: "ver_cortes" },
    ]},
    { title: "Reportes", items: [
        { path: "reportes", label: "Reportes", icon: barChart, permiso: "ver_reportes" },
        { path: "reporte_compras", label: "Reporte Compras", icon: storefront, permiso: "ver_compras" },
        { path: "reporte_creditos", label: "Reporte Créditos", icon: cash, permiso: "ver_ventas" },
    ]},
    { title: "Administración", items: [
        { path: "usuarios", label: "Usuarios", icon: people, permiso: "gestionar_usuarios" },
        { path: "roles", label: "Roles", icon: shieldCheckmark, permiso: "gestionar_roles" },
        { path: "configuracion", label: "Configuración", icon: business, permiso: "gestionar_configuracion" },
    ]},
    { title: "Sistema", items: [
        { path: "sync_status", label: "Sincronización", icon: sync, permiso: "ver_lotes" },
    ]},
];

function tienePermiso(permiso: string): boolean {
    const u = getUsuario();
    if (u?.rol === "admin") return true;
    return getPermisos().includes(permiso);
}

function getFilteredGroups(): MenuGroup[] {
    return allGroups
        .map(g => ({ ...g, items: g.items.filter(i => tienePermiso(i.permiso)) }))
        .filter(g => g.items.length > 0);
}

function CurrentPage({ page, navigate }: { page: string; navigate: (p: string) => void }) {
    const adminPages = ["usuarios", "roles"];
    if (adminPages.includes(page)) {
        openAdmin(page);
        navigate("dashboard");
        return null;
    }
    switch (page) {
        case "dashboard": return <Dashboard />;
        case "lotes": return <Lotes />;
        case "recibir": return <Recibir />;
        case "traspasos": return <Traspasos />;
        case "recibir_traspaso": return <RecibirTraspaso />;
        case "ventas": return <Ventas />;
        case "etiqueta": return <Etiqueta />;
        case "clientes": return <Clientes />;
        case "compras": return <Compras />;
        case "gastos": return <Gastos />;
        case "ganancias": return <Ganancias />;
        case "sync_status": return <SyncStatus />;
        case "reportes": return <Reportes />;
        case "corte_caja": return <CorteDeCaja />;
        case "historial_precios": return <HistorialPrecios />;
        case "prestamo_cajas": return <PrestamoCajas />;
        case "precios_diarios": return <PreciosDelDia />;
        case "proveedores": return <Proveedores />;
        case "configuracion": return <Configuracion />;
        case "reporte_creditos": return <ReporteCreditos />;
        case "reporte_compras": return <ReporteCompras />;
        default: return <Dashboard />;
    }
}

export function Layout({ onLogout: parentLogout }: { onLogout?: () => void }) {
    const [page, setPage] = useState("dashboard");
    const [menuOpen, setMenuOpen] = useState(false);
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    const groups = getFilteredGroups();

    const toggleGroup = (title: string) => setExpanded((prev) => ({ ...prev, [title]: !prev[title] }));

    const logout = () => {
        authLogout();
        if (parentLogout) parentLogout();
    };

    const flatItems = groups.flatMap(g => g.items);
    const firstVisible = flatItems[0]?.path || "dashboard";
    const safePage = flatItems.some(m => m.path === page) ? page : firstVisible;

    const navigate = (p: string) => {
        setPage(p);
        setMenuOpen(false);
    };

    return (
        <div style={{ position: "relative", height: "100vh" }}>
            {menuOpen && (
                <div style={{
                    position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1000,
                }} onClick={() => setMenuOpen(false)} />
            )}
            <div style={{
                position: "fixed", top: 0, left: 0, bottom: 0, width: 260,
                background: "#1a3a2a", color: "#fff", zIndex: 1001,
                transform: menuOpen ? "translateX(0)" : "translateX(-100%)",
                transition: "transform 0.25s ease", padding: "16px 0",
                overflowY: "auto",
            }}>
                <div style={{ textAlign: "right", padding: "0 16px 16px" }}>
                    <IonButton fill="clear" onClick={() => setMenuOpen(false)}>
                        <IonIcon icon={close} style={{ color: "#fff", fontSize: 24 }} />
                    </IonButton>
                </div>
                {groups.map((group, gi) => {
                    const isExpanded = group.title ? expanded[group.title] === true : true;
                    return (
                        <div key={gi}>
                            {group.title ? (
                                <div onClick={() => toggleGroup(group.title)}
                                    style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1, opacity: 0.5, padding: "8px 24px 4px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", userSelect: "none" }}>
                                    <span>{group.title}</span>
                                    <span style={{ fontSize: 8, transition: "transform 0.2s", transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)" }}>▶</span>
                                </div>
                            ) : <div style={{ height: 4 }} />}
                            {isExpanded && group.items.map(item => (
                                <div key={item.path} onClick={() => navigate(item.path)}
                                    style={{
                                        padding: "14px 24px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
                                        background: safePage === item.path ? "rgba(255,255,255,0.1)" : "transparent",
                                        borderLeft: safePage === item.path ? "4px solid #4caf50" : "4px solid transparent",
                                    }}>
                                    <IonIcon icon={item.icon} style={{ color: "#fff", fontSize: 20 }} />
                                    <span>{item.label}</span>
                                </div>
                            ))}
                        </div>
                    );
                })}
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", margin: "16px 24px 0", paddingTop: 16 }}>
                    <div onClick={() => { logout(); window.location.href = "/"; }}
                        style={{ padding: "14px 0", cursor: "pointer", color: "#ef4444", fontSize: 14 }}>
                        Cerrar sesión
                    </div>
                </div>
            </div>

            <IonPage>
                <IonHeader>
                    <IonToolbar style={{ "--background": "#1a8a3a" }}>
                        <IonButtons slot="start">
                            <IonButton onClick={() => setMenuOpen(true)}>
                                <IonIcon icon={menuIcon} style={{ color: "#fff", fontSize: 24 }} />
                            </IonButton>
                        </IonButtons>
                        <IonTitle>{flatItems.find(m => m.path === safePage)?.label || "StockAbastos"}</IonTitle>
                    </IonToolbar>
                </IonHeader>
                <IonContent className="ion-padding">
                    <CurrentPage page={safePage} navigate={navigate} />
                </IonContent>
            </IonPage>
        </div>
    );
}
