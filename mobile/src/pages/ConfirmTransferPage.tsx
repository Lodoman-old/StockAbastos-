import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { scanTarimaOfflineFirst, postOfflineFirst } from "../offline";
import { isOnline } from "../sync";
import { notify } from "../components/Toast";

export function ConfirmTransferPage() {
  const { codigoQr } = useParams<{ codigoQr: string }>();
  const navigate = useNavigate();
  const [tarima, setTarima] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!codigoQr) return;
    scanTarimaOfflineFirst(codigoQr)
      .then(setTarima)
      .catch(() => notify("No se encontró la tarima", "error"))
      .finally(() => setLoading(false));
  }, [codigoQr]);

  const handleConfirm = async () => {
    if (!codigoQr) return;
    setConfirming(true);
    try {
      const qr = encodeURIComponent(codigoQr);
      const res = await postOfflineFirst(
        `/tarimas/confirmar-traspaso/${qr}`, undefined,
        "confirmar_traspaso", codigoQr,
      );
      if ((res as any).encolado) {
        notify("Acción guardada — se sincronizará al tener señal", "info");
      } else {
        notify("Traspaso confirmado", "success");
      }
      setTimeout(() => navigate("/"), 1500);
    } catch (e: any) {
      notify("Error: " + e.message, "error");
    }
    setConfirming(false);
  };

  if (loading) return <div className="page"><p style={{ textAlign: "center", color: "#888", marginTop: 40 }}>Buscando tarima...</p></div>;

  const puedeConfirmar = tarima && (tarima.estado === "RECIBIDA" || tarima.estado === "PARCIAL") && tarima.bodega_destino_id;

  return (
    <div className="page">
      <div className="header" style={{ margin: -16, marginBottom: 16, borderRadius: "0 0 12px 12px" }}>
        <span className="header-back" onClick={() => navigate("/scan")}>←</span>
        <h1>Confirmar traspaso</h1>
      </div>

      {!isOnline() && (
        <div style={{ background: "#fff3cd", color: "#856404", padding: "8px 12px", borderRadius: 8, fontSize: 12, marginBottom: 8, textAlign: "center" }}>
          Sin conexión — se guardará y sincronizará automáticamente
        </div>
      )}

      {!tarima ? (
        <div className="card" style={{ textAlign: "center", padding: 40 }}>
          <p style={{ color: "#888" }}>Tarima no encontrada</p>
        </div>
      ) : (
        <>
          <div className="card">
            <div style={{ fontSize: 12, fontFamily: "monospace", textAlign: "center", marginBottom: 12, background: "#f5f5f5", padding: 8, borderRadius: 8 }}>
              {codigoQr}
            </div>
            <div className="result-row"><span className="result-label">Producto</span><span className="result-value">{tarima.producto_nombre}</span></div>
            <div className="result-row"><span className="result-label">Origen</span><span className="result-value">{tarima.bodega_origen_nombre || tarima.bodega_nombre || "-"}</span></div>
            <div className="result-row"><span className="result-label">Destino</span><span className="result-value" style={{ color: "#1976d2" }}>{tarima.bodega_destino_nombre || "?"}</span></div>
            <div className="result-row"><span className="result-label">Cajas</span><span className="result-value">{tarima.cajas_restantes}/{tarima.cajas_originales}</span></div>
          </div>

          {puedeConfirmar ? (
            <button className="btn btn-secondary" onClick={handleConfirm} disabled={confirming}>
              {confirming ? "Confirmando..." : isOnline() ? "🚚 Confirmar traspaso" : "📥 Guardar para después"}
            </button>
          ) : (
            <div className="card" style={{ textAlign: "center", background: "#fff3e0" }}>
              <p style={{ color: "#e65100", fontSize: 14 }}>
                Esta tarima no tiene asignación de traspaso o ya fue enviada
              </p>
            </div>
          )}

          <button className="btn btn-outline" onClick={() => navigate("/scan")} style={{ marginTop: 8 }}>
            Escanear otra
          </button>
        </>
      )}
    </div>
  );
}
