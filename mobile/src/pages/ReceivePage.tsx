import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { scanTarimaOfflineFirst, postOfflineFirst } from "../offline";
import { isOnline } from "../sync";
import { obtenerCatalogo } from "../db";
import { notify } from "../components/Toast";

export function ReceivePage() {
  const { codigoQr } = useParams<{ codigoQr: string }>();
  const navigate = useNavigate();
  const [tarima, setTarima] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [receiving, setReceiving] = useState(false);
  const [bodegaId, setBodegaId] = useState("");

  useEffect(() => {
    if (!codigoQr) return;
    scanTarimaOfflineFirst(codigoQr)
      .then(setTarima)
      .catch(() => notify("No se encontró la tarima", "error"))
      .finally(() => setLoading(false));
    if (navigator.onLine) {
      import("../api").then(m => m.get("/bodegas")).then((b: any) => {
        if (b.length) setBodegaId(b[0].id);
      }).catch(() => {});
    } else {
      obtenerCatalogo("bodegas").then((b: any[]) => {
        if (b.length) setBodegaId(b[0].id);
      }).catch(() => {});
    }
  }, [codigoQr]);

  const handleReceive = async () => {
    if (!codigoQr) return;
    setReceiving(true);
    try {
      const qr = encodeURIComponent(codigoQr);
      const res = await postOfflineFirst(
        `/tarimas/recibir/${qr}`,
        { bodega_id: bodegaId || undefined },
        "recibir", codigoQr,
      );
      if ((res as any).encolado) {
        notify("Acción guardada — se sincronizará al tener señal", "info");
      } else {
        notify("Tarima recibida", "success");
      }
      setTimeout(() => navigate("/"), 1500);
    } catch (e: any) {
      notify("Error: " + e.message, "error");
    }
    setReceiving(false);
  };

  if (loading) return <div className="page"><p style={{ textAlign: "center", color: "#888", marginTop: 40 }}>Buscando tarima...</p></div>;

  if (!tarima) return (
    <div className="page">
      <div className="header" style={{ margin: -16, marginBottom: 16, borderRadius: "0 0 12px 12px" }}>
        <span className="header-back" onClick={() => navigate("/scan")}>←</span>
        <h1>No encontrada</h1>
      </div>
      <div className="card" style={{ textAlign: "center", padding: 40 }}>
        <p style={{ color: "#888" }}>No se encontró la tarima con código {codigoQr}</p>
        <button className="btn btn-primary" onClick={() => navigate("/scan")} style={{ marginTop: 16 }}>
          Escanear otra
        </button>
      </div>
    </div>
  );

  const badgeColor = (e: string) => ({
    RECIBIDA: "status-recibida", PARCIAL: "status-parcial",
    EN_TRANSITO: "status-transito", PENDIENTE: "status-pendiente",
    VENDIDA: "status-vendida",
  }[e] || "status-pendiente");

  const puedeRecibir = tarima.estado === "PENDIENTE";

  return (
    <div className="page">
      <div className="header" style={{ margin: -16, marginBottom: 16, borderRadius: "0 0 12px 12px" }}>
        <span className="header-back" onClick={() => navigate("/scan")}>←</span>
        <h1>Recibir tarima</h1>
      </div>

      {!isOnline() && (
        <div style={{ background: "#fff3cd", color: "#856404", padding: "8px 12px", borderRadius: 8, fontSize: 12, marginBottom: 8, textAlign: "center" }}>
          Sin conexión — la acción se guardará y sincronizará automáticamente
        </div>
      )}

      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontFamily: "monospace", textAlign: "center", marginBottom: 12, background: "#f5f5f5", padding: 8, borderRadius: 8 }}>
          {codigoQr}
        </div>
        <div className="result-row"><span className="result-label">Producto</span><span className="result-value">{tarima.producto_nombre}</span></div>
        <div className="result-row"><span className="result-label">Tipo</span><span className="result-value">{tarima.tarima_tipo_nombre}</span></div>
        <div className="result-row"><span className="result-label">Número</span><span className="result-value">{tarima.numero_tarima}</span></div>
        <div className="result-row"><span className="result-label">Lote</span><span className="result-value" style={{ fontSize: 12, fontFamily: "monospace" }}>{tarima.codigo_lote}</span></div>
        <div className="result-row"><span className="result-label">Cajas</span><span className="result-value">{tarima.cajas_restantes}/{tarima.cajas_originales}</span></div>
        <div className="result-row"><span className="result-label">Peso</span><span className="result-value">{tarima.peso_kg ? tarima.peso_kg + " kg" : "-"}</span></div>
        <div className="result-row"><span className="result-label">Estado</span><span className={`status-badge ${badgeColor(tarima.estado)}`}>{tarima.estado}</span></div>
      </div>

      {puedeRecibir && (
        <>
          <div className="card">
            <div className="input-group">
              <label>Bodega de destino</label>
              <input className="input" value={bodegaId} onChange={e => setBodegaId(e.target.value)}
                placeholder="ID de bodega (opcional)" />
            </div>
          </div>
          <button className="btn btn-primary" onClick={handleReceive} disabled={receiving}>
            {receiving ? "Procesando..." : isOnline() ? "✅ Recibir tarima" : "📥 Guardar para después"}
          </button>
        </>
      )}

      {!puedeRecibir && (
        <div className="card" style={{ textAlign: "center", background: "#fff3e0" }}>
          <p style={{ color: "#e65100", fontSize: 14 }}>Esta tarima ya fue recibida o no está disponible</p>
        </div>
      )}

      <button className="btn btn-outline" onClick={() => navigate("/scan")} style={{ marginTop: 8 }}>
        Escanear otra
      </button>
    </div>
  );
}
