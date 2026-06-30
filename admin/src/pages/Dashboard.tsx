import { money } from "../format";
import React, { useEffect, useState } from "react";
import { get } from "../services/api";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

export function Dashboard() {
    const [stats, setStats] = useState<any>(null);
    const [ventasDiarias, setVentasDiarias] = useState<any[]>([]);
    const [cajaStatus, setCajaStatus] = useState<any>(null);
    const [creditosProximos, setCreditosProximos] = useState<any[]>([]);
    const [inventario, setInventario] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.allSettled([
            get("/dashboard/stats"),
            get("/dashboard/ventas-por-dia"),
            get("/dashboard/creditos-proximos"),
            get("/cortes/esta-abierto").catch(() => ({ abierto: null })),
            get("/dashboard/inventario"),
        ]).then(([s, v, cp, cj, inv]) => {
            if (s.status === "fulfilled") setStats(s.value);
            if (v.status === "fulfilled") setVentasDiarias(v.value);
            if (cp.status === "fulfilled") setCreditosProximos(cp.value || []);
            if (cj.status === "fulfilled") setCajaStatus(cj.value);
            if (inv.status === "fulfilled") setInventario(inv.value || []);
            if ([s, v, cp, cj, inv].some(r => r.status === "rejected")) {
                console.error("Errores en dashboard:", [s, v, cp, cj, inv].filter(r => r.status === "rejected").map(r => (r as PromiseRejectedResult).reason));
            }
        }).finally(() => setLoading(false));
    }, []);

    const invPorBodega = React.useMemo(() => {
        const map = new Map<string, { bodega: any; productos: any[]; totalTarimas: number; totalCajas: number }>();
        for (const row of inventario) {
            if (!map.has(row.bodega_id)) {
                map.set(row.bodega_id, {
                    bodega: { id: row.bodega_id, codigo: row.bodega_codigo, nombre: row.bodega_nombre },
                    productos: [],
                    totalTarimas: 0,
                    totalCajas: 0,
                });
            }
            const g = map.get(row.bodega_id)!;
            g.productos.push(row);
            g.totalTarimas += Number(row.tarimas);
            g.totalCajas += Number(row.cajas);
        }
        return Array.from(map.values());
    }, [inventario]);

    if (loading) return <div><h1>Dashboard</h1><p>Cargando...</p></div>;

    const cards = [
        { label: "Productos", value: stats?.productos || 0, color: "#1a8a3a" },
        { label: "Bodegas", value: stats?.bodegas || 0, color: "#2196f3" },
        { label: "Lotes", value: stats?.lotes || 0, color: "#ff9800" },
        { label: "Ventas (30d)", value: stats?.ventas_30d || 0, color: "#00bcd4" },
    ];

    return (
        <div>
            <div className="page-heading" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h1 style={{ margin: 0 }}>Dashboard</h1>
                {cajaStatus && (
                    <div style={{
                        display: "inline-flex", alignItems: "center", gap: 6,
                        padding: "6px 14px", borderRadius: 20, fontSize: 13, fontWeight: "bold",
                        background: cajaStatus.abierto ? "#e8f5e9" : "#fef2f2",
                        color: cajaStatus.abierto ? "#1a8a3a" : "#dc2626",
                        border: cajaStatus.abierto ? "1px solid #a5d6a7" : "1px solid #fecaca",
                    }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: cajaStatus.abierto ? "#4caf50" : "#ef4444" }} />
                        {cajaStatus.abierto ? "Caja abierta" : "Caja cerrada"}
                    </div>
                )}
            </div>
            <div className="stats-grid" style={{
                display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                gap: 16, marginBottom: 24,
            }}>
                {cards.map((card) => (
                    <div key={card.label} style={{ background: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.08)", borderTop: `4px solid ${card.color}` }}>
                        <h3 style={{ fontSize: 13, color: "#666", margin: 0 }}>{card.label}</h3>
                        <p style={{ fontSize: 28, fontWeight: "bold", margin: "8px 0 0", color: card.color, wordBreak: "break-all" }}>{card.value}</p>
                    </div>
                ))}
            </div>

            <div style={{ marginBottom: 24 }}>
                <h3 style={{ marginBottom: 12 }}>Inventario por Bodega</h3>
                {invPorBodega.length === 0 ? (
                    <p style={{ color: "#888" }}>Sin tarimas recibidas</p>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        {invPorBodega.map((g: any) => (
                            <div key={g.bodega.id} style={{ background: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                                    <div>
                                        <strong style={{ fontSize: 16 }}>{g.bodega.codigo}</strong>
                                        <span style={{ color: "#666", marginLeft: 8, fontSize: 13 }}>{g.bodega.nombre}</span>
                                    </div>
                                    <div style={{ display: "flex", gap: 16, fontSize: 13 }}>
                                        <span>Tarimas: <strong>{g.totalTarimas}</strong></span>
                                        <span>Cajas: <strong>{g.totalCajas}</strong></span>
                                    </div>
                                </div>
                                <div style={{ overflowX: "auto" }}>
                                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                                        <thead>
                                            <tr style={{ textAlign: "left", borderBottom: "2px solid #eee" }}>
                                                <th style={{ padding: "6px 8px" }}>Producto</th>
                                                <th style={{ padding: "6px 8px" }}>Tarimas</th>
                                                <th style={{ padding: "6px 8px" }}>Cajas</th>
                                                <th style={{ padding: "6px 8px" }}>Próxima caducidad</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {g.productos.map((p: any) => {
                                                const vence = p.proxima_caducidad;
                                                const days = vence ? Math.ceil((new Date(vence).getTime() - Date.now()) / 86400000) : null;
                                                const urgente = days !== null && days <= 5;
                                                return (
                                                    <tr key={p.producto_id} style={{ borderTop: "1px solid #f0f0f0" }}>
                                                        <td style={{ padding: "6px 8px", fontWeight: "bold" }}>{p.producto_nombre}</td>
                                                        <td style={{ padding: "6px 8px" }}>{p.tarimas}</td>
                                                        <td style={{ padding: "6px 8px" }}>{p.cajas}</td>
                                                        <td style={{ padding: "6px 8px" }}>
                                                            {vence ? (
                                                                <span style={{
                                                                    display: "inline-block", padding: "2px 6px", borderRadius: 4, fontSize: 12, fontWeight: "bold",
                                                                    background: urgente ? "#ffcc02" : "#e8f5e9",
                                                                    color: urgente ? "#e65100" : "#2e7d32",
                                                                }}>
                                                                    {new Date(vence).toLocaleDateString()}
                                                                    {urgente && ` (${days}d)`}
                                                                </span>
                                                            ) : <span style={{ color: "#aaa" }}>-</span>}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="charts-grid" style={{
                display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))",
                gap: 32, marginBottom: 24,
            }}>
                <div style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
                    <h3 style={{ marginBottom: 4 }}>Ventas por Día</h3>
                    <p style={{ fontSize: 13, color: "#777", marginBottom: 16 }}>Ventas en los últimos 14 días</p>
                    <div style={{ width: "100%", height: 280 }}>
                        <ResponsiveContainer>
                            <BarChart data={ventasDiarias.map((d: any) => ({ ...d, fecha: d.fecha ? d.fecha.substring(0, 10) : d.fecha }))}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="fecha" tick={{ fontSize: 11 }} height={30} />
                                <YAxis tick={{ fontSize: 11 }} width={50} />
                                <Tooltip labelFormatter={(label: any) => `Fecha: ${label}`} />
                                <Bar dataKey="ventas" fill="#1a8a3a" name="Ventas" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {creditosProximos.length > 0 && (
                <div style={{ background: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
                    <h3>💰 Cobros Próximos (7 días)</h3>
                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8, minWidth: 500 }}>
                            <thead>
                                <tr style={{ textAlign: "left", borderBottom: "2px solid #eee" }}>
                                    <th style={{ padding: 8 }}>Cliente</th><th style={{ padding: 8 }}>Folio</th>
                                    <th style={{ padding: 8 }}>Total</th><th style={{ padding: 8 }}>Saldo</th>
                                    <th style={{ padding: 8 }}>Vence</th>
                                </tr>
                            </thead>
                            <tbody>
                                {creditosProximos.map((c: any) => (
                                    <tr key={c.id} style={{ borderBottom: "1px solid #eee" }}>
                                        <td style={{ padding: 8, fontWeight: "bold" }}>{c.cliente}</td>
                                        <td style={{ padding: 8 }}>{c.folio}</td>
                                        <td style={{ padding: 8 }}>${money(c.total || 0)}</td>
                                        <td style={{ padding: 8, color: "#d32f2f", fontWeight: "bold" }}>${money(c.saldo_pendiente || 0)}</td>
                                        <td style={{ padding: 8 }}>{c.fecha_vencimiento ? new Date(c.fecha_vencimiento).toLocaleDateString() : "-"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}


