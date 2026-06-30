import { money } from "../format";
import React, { useEffect, useState } from "react";
import { get } from "../services/api";
export function ReporteCompras() {
    const [compras, setCompras] = useState<any[]>([]);
    const [desde, setDesde] = useState("");
    const [hasta, setHasta] = useState("");
    const [proveedor, setProveedor] = useState("");

    const load = () => {
        const params = new URLSearchParams();
        if (desde) params.set("desde", desde);
        if (hasta) params.set("hasta", hasta);
        if (proveedor) params.set("proveedor", proveedor);
        get(`/compras/reporte?${params}`).then(setCompras).catch(() => {});
    };

    useEffect(() => { load(); }, []);

    const total = compras.reduce((s: number, c: any) => s + parseFloat(c.total || 0), 0);

    return (
        <div>
            <h1>Reporte de Compras</h1>
            <div className="btn-inline-group" style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
                <div>
                    <label style={{ fontSize: 12, color: "#555", display: "block" }}>Desde</label>
                    <input type="date" value={desde} onChange={e => setDesde(e.target.value)}
                        style={{ padding: "8px 10px", border: "1px solid #ddd", borderRadius: 6, fontSize: 13 }} />
                </div>
                <div>
                    <label style={{ fontSize: 12, color: "#555", display: "block" }}>Hasta</label>
                    <input type="date" value={hasta} onChange={e => setHasta(e.target.value)}
                        style={{ padding: "8px 10px", border: "1px solid #ddd", borderRadius: 6, fontSize: 13 }} />
                </div>
                <div>
                    <label style={{ fontSize: 12, color: "#555", display: "block" }}>Proveedor</label>
                    <input type="text" value={proveedor} onChange={e => setProveedor(e.target.value)}
                        placeholder="Buscar proveedor..."
                        style={{ padding: "8px 10px", border: "1px solid #ddd", borderRadius: 6, fontSize: 13 }} />
                </div>
                <button onClick={load}
                    style={{ padding: "8px 16px", background: "#1a8a3a", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: "bold" }}>
                    Filtrar
                </button>
            </div>

            <div style={{ background: "#e8f5e9", borderRadius: 8, padding: "10px 16px", marginBottom: 16, display: "inline-block" }}>
                <span style={{ fontSize: 12, color: "#555" }}>Total compras</span>
                <div style={{ fontSize: 22, fontWeight: "bold", color: "#1a8a3a" }}>${money(total)}</div>
            </div>

            <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: 8, overflow: "hidden", minWidth: 600 }}>
                    <thead>
                        <tr style={{ background: "#f5f5f5", textAlign: "left" }}>
                            <th style={{ padding: 10 }}>Folio</th><th style={{ padding: 10 }}>Fecha</th>
                            <th style={{ padding: 10 }}>Proveedor</th><th style={{ padding: 10 }}>Productos</th><th style={{ padding: 10 }}>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {compras.map(c => (
                            <tr key={c.id} style={{ borderTop: "1px solid #eee" }}>
                                <td style={{ padding: 10, fontWeight: "bold" }}>{c.folio || c.id.substring(0, 8)}</td>
                                <td style={{ padding: 10 }}>{new Date(c.fecha).toLocaleDateString()}</td>
                                <td style={{ padding: 10 }}>{c.proveedor || "-"}</td>
                                <td style={{ padding: 10 }}>
                                    {c.detalles?.map((d: any) => (
                                        <div key={d.id} style={{ fontSize: 12, marginBottom: 2 }}>
                                            {d.producto_nombre} - {d.cantidad_unidades ? `${d.cantidad_unidades} pz` : `${parseFloat(d.cantidad_kg).toFixed(1)} kg`}
                                        </div>
                                    ))}
                                </td>
                                <td style={{ padding: 10, fontWeight: "bold" }}>${money(c.total || 0)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}


