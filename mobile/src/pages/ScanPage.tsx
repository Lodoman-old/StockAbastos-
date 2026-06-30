import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import { notify } from "../components/Toast";
import { get, post } from "../api";

interface TarimaInfo {
  id: string;
  codigo_qr: string;
  producto_nombre: string;
  codigo_lote: string;
  proveedor_nombre: string;
  tarima_tipo_nombre: string;
  cantidad_cajas: number;
  cajas_originales: number;
  cajas_restantes: number;
  numero_tarima: number;
  peso_kg: number | null;
  fecha_caducidad: string | null;
  bodega_origen_nombre: string | null;
  bodega_destino_nombre: string | null;
  estado: string;
}

export function ScanPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const action = params.get("action") || "scan";
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scanning, setScanning] = useState(true);
  const [manual, setManual] = useState("");
  const [procesando, setProcesando] = useState(false);
  const [tarima, setTarima] = useState<TarimaInfo | null>(null);

  const iniciarScanner = () => {
    if (!containerRef.current) return;
    const id = "qr-reader";
    containerRef.current.innerHTML = `<div id="${id}"></div>`;
    const qr = new Html5Qrcode(id);
    scannerRef.current = qr;
    qr.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      (decodedText) => {
        try { qr.stop(); } catch {}
        setScanning(false);
        consultarTarima(decodedText);
      },
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

  const consultarTarima = async (codigo: string) => {
    const qr = codigo.trim();
    if (!qr) return;
    setProcesando(true);
    try {
      const data = await get<TarimaInfo>(`/tarimas/qr/${encodeURIComponent(qr)}`);
      setTarima(data);
    } catch (e: any) {
      notify("Error: " + (e.message || "Desconocido"), "error");
      setProcesando(false);
      setTimeout(() => iniciarScanner(), 300);
    }
  };

  const confirmar = async () => {
    if (!tarima) return;
    setProcesando(true);
    try {
      if (action === "confirm") {
        await post(`/tarimas/confirmar-traspaso/${encodeURIComponent(tarima.codigo_qr)}`);
        notify(`Traspaso confirmado — ${tarima.cajas_restantes} cajas`, "success");
      } else if (action === "transfer-receive") {
        await post(`/tarimas/entregar/${encodeURIComponent(tarima.codigo_qr)}`);
        notify(`Traspaso recibido — ${tarima.cajas_restantes} cajas`, "success");
      } else {
        await post(`/tarimas/recibir/${encodeURIComponent(tarima.codigo_qr)}`, {});
        notify(`Tarima recibida — ${tarima.cajas_restantes} cajas`, "success");
      }
      setTarima(null);
      setProcesando(false);
    } catch (e: any) {
      notify("Error: " + (e.message || "Desconocido"), "error");
      setProcesando(false);
    }
  };

  const handleManual = () => {
    if (!manual.trim()) return notify("Escribe el código QR", "error");
    consultarTarima(manual.trim());
  };

  const titulo = action === "confirm" ? "Confirmar traspaso" :
    action === "transfer-receive" ? "Recibir traspaso" : "Recibir tarima";

  return (
    <div className="page">
      <div className="header" style={{ margin: -16, marginBottom: 16, borderRadius: "0 0 12px 12px" }}>
        <span className="header-back" onClick={() => navigate("/")}>←</span>
        <h1>{titulo}</h1>
      </div>

      {!tarima && (
        <>
          <div className="card">
            <div ref={containerRef} className="scanner-container" style={{ minHeight: 250, background: "#000", borderRadius: 12 }} />
            {!scanning && !procesando && (
              <button className="btn btn-primary" onClick={iniciarScanner} style={{ marginTop: 12 }}>
                Volver a escanear
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
                Buscar
              </button>
            </div>
          </div>
        </>
      )}

      {tarima && (
        <div className="card">
          <h3 style={{ marginTop: 0, marginBottom: 12, fontSize: 18 }}>{tarima.producto_nombre}</h3>
          <table style={{ width: "100%", fontSize: 13 }}>
            <tbody>
              <tr><td style={{ color: "#888", paddingRight: 8 }}>Lote</td><td>{tarima.codigo_lote}</td></tr>
              <tr><td style={{ color: "#888", paddingRight: 8 }}>Proveedor</td><td>{tarima.proveedor_nombre}</td></tr>
              <tr><td style={{ color: "#888", paddingRight: 8 }}>Tipo tarima</td><td>{tarima.tarima_tipo_nombre}</td></tr>
              <tr><td style={{ color: "#888", paddingRight: 8 }}>No. tarima</td><td>{tarima.numero_tarima}</td></tr>
              <tr><td style={{ color: "#888", paddingRight: 8 }}>Cajas</td><td>{tarima.cajas_restantes} / {tarima.cajas_originales}</td></tr>
              {tarima.peso_kg != null && (
                <tr><td style={{ color: "#888", paddingRight: 8 }}>Peso</td><td>{tarima.peso_kg} kg</td></tr>
              )}
              {tarima.fecha_caducidad && (
                <tr><td style={{ color: "#888", paddingRight: 8 }}>Caducidad</td><td>{tarima.fecha_caducidad}</td></tr>
              )}
              {tarima.bodega_origen_nombre && (
                <tr><td style={{ color: "#888", paddingRight: 8 }}>Bodega origen</td><td>{tarima.bodega_origen_nombre}</td></tr>
              )}
              {tarima.bodega_destino_nombre && (
                <tr><td style={{ color: "#888", paddingRight: 8 }}>Bodega destino</td><td>{tarima.bodega_destino_nombre}</td></tr>
              )}
              <tr><td style={{ color: "#888", paddingRight: 8 }}>Estado</td><td>{tarima.estado}</td></tr>
            </tbody>
          </table>

          <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
            <button className="btn btn-secondary" onClick={() => { setTarima(null); iniciarScanner(); }}
              style={{ flex: 1, padding: "14px 0" }}>
              Cancelar
            </button>
            <button className="btn btn-primary" onClick={confirmar} disabled={procesando}
              style={{ flex: 2, padding: "14px 0" }}>
              {procesando ? "Procesando..." : action === "confirm" ? "Confirmar envío" :
               action === "transfer-receive" ? "Recibir en destino" : "Recibir tarima"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
