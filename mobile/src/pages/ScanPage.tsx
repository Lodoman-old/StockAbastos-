import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import { notify } from "../components/Toast";
import { post } from "../api";

export function ScanPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const action = params.get("action") || "scan";
  const containerRef = useRef<HTMLDivElement>(null);
  const [scanning, setScanning] = useState(true);
  const [manual, setManual] = useState("");
  const busy = useRef(false);

  useEffect(() => {
    if (!containerRef.current) return;
    const id = "qr-reader";
    containerRef.current.innerHTML = `<div id="${id}"></div>`;
    const qr = new Html5Qrcode(id);
    qr.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      (decodedText) => {
        if (busy.current) return;
        busy.current = true;
        const qr = decodedText.trim();
        if (!qr) { busy.current = false; return; }
        const ep = action === "confirm" ? "confirmar-traspaso" :
          action === "transfer-receive" ? "entregar" : "recibir";
        const msgs: Record<string, string> = {
          confirm: "Traspaso confirmado",
          "transfer-receive": "Traspaso recibido en destino",
          scan: "Tarima recibida",
        };
        post(`/tarimas/${ep}/${encodeURIComponent(qr)}`, {})
          .then(() => notify(msgs[action] || "OK", "success"))
          .catch((e: any) => notify("Error: " + (e.message || "Desconocido"), "error"))
          .finally(() => { busy.current = false; });
      },
      () => {}
    ).then(() => setScanning(true))
    .catch((err) => {
      notify("Error al abrir cámara: " + err, "error");
      setScanning(false);
    });
    return () => { try { qr.stop(); } catch {} };
  }, []);

  const titulo = action === "confirm" ? "Confirmar traspaso" :
    action === "transfer-receive" ? "Recibir traspaso" : "Recibir tarima";

  return (
    <div className="page">
      <div className="header" style={{ margin: -16, marginBottom: 16, borderRadius: "0 0 12px 12px" }}>
        <span className="header-back" onClick={() => navigate("/")}>←</span>
        <h1>{titulo}</h1>
      </div>
      <div className="card">
        <div ref={containerRef} className="scanner-container" style={{ minHeight: 250, background: "#000", borderRadius: 12 }} />
        {!scanning && (
          <button className="btn btn-primary" onClick={() => window.location.reload()} style={{ marginTop: 12 }}>
            Reintentar cámara
          </button>
        )}
      </div>
      <div className="card">
        <p style={{ fontSize: 13, color: "#888", marginBottom: 8, textAlign: "center" }}>
          O escribe el código manualmente
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          <input className="input" value={manual} onChange={e => setManual(e.target.value)}
            placeholder="Código QR..." style={{ flex: 1 }} />
          <button className="btn btn-secondary" onClick={() => {
            const q = manual.trim();
            if (!q) return notify("Escribe el código QR", "error");
            if (busy.current) return;
            busy.current = true;
            const ep = action === "confirm" ? "confirmar-traspaso" :
              action === "transfer-receive" ? "entregar" : "recibir";
            const msgs: Record<string, string> = {
              confirm: "Traspaso confirmado",
              "transfer-receive": "Traspaso recibido en destino",
              scan: "Tarima recibida",
            };
            post(`/tarimas/${ep}/${encodeURIComponent(q)}`, {})
              .then(() => notify(msgs[action] || "OK", "success"))
              .catch((e: any) => notify("Error: " + (e.message || "Desconocido"), "error"))
              .finally(() => { busy.current = false; });
          }} style={{ width: "auto", padding: "14px 20px", whiteSpace: "nowrap" }}>
            Ir
          </button>
        </div>
      </div>
    </div>
  );
}
