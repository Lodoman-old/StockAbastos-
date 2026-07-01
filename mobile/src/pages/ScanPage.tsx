import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import { notify } from "../components/Toast";
import { post } from "../api";

export function ScanPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const action = params.get("action") || "scan";
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scanning, setScanning] = useState(true);
  const [manual, setManual] = useState("");
  const procesandoRef = useRef(false);
  const lastQrRef = useRef("");

  const iniciarScanner = () => {
    if (!containerRef.current) return;
    const id = "qr-reader";
    containerRef.current.innerHTML = `<div id="${id}"></div>`;
    const qr = new Html5Qrcode(id);
    scannerRef.current = qr;
    const cb = (decodedText: string) => {
      if (procesandoRef.current) return;
      if (decodedText === lastQrRef.current) return;
      lastQrRef.current = decodedText;
      procesandoRef.current = true;
      procesar(decodedText).finally(() => {
        procesandoRef.current = false;
      });
    };
    qr.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      cb,
      () => {}
    ).then(() => setScanning(true))
    .catch((err) => {
      notify("Error al abrir cámara: " + err, "error");
      setScanning(false);
    });
  };

  useEffect(() => {
    iniciarScanner();
    return () => {
      try { scannerRef.current?.stop(); } catch {}
    };
  }, []);

  const procesar = async (codigo: string) => {
    const qr = codigo.trim();
    if (!qr) return;
    try {
      if (action === "confirm") {
        await post(`/tarimas/confirmar-traspaso/${encodeURIComponent(qr)}`);
        notify("Traspaso confirmado", "success");
      } else if (action === "transfer-receive") {
        await post(`/tarimas/entregar/${encodeURIComponent(qr)}`);
        notify("Traspaso recibido en destino", "success");
      } else {
        await post(`/tarimas/recibir/${encodeURIComponent(qr)}`, {});
        notify("Tarima recibida", "success");
      }
    } catch (e: any) {
      notify("Error: " + (e.message || "Desconocido"), "error");
      lastQrRef.current = "";
    }
  };

  const handleManual = () => {
    if (!manual.trim()) return notify("Escribe el código QR", "error");
    if (procesandoRef.current) return;
    procesandoRef.current = true;
    procesar(manual.trim()).finally(() => {
      procesandoRef.current = false;
    });
  };

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
          <button className="btn btn-primary" onClick={iniciarScanner} style={{ marginTop: 12 }}>
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
          <button className="btn btn-secondary" onClick={handleManual}
            style={{ width: "auto", padding: "14px 20px", whiteSpace: "nowrap" }}>
            Ir
          </button>
        </div>
      </div>
    </div>
  );
}
