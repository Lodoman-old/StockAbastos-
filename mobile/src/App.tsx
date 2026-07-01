import { Component, useState, useEffect } from "react";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { hasApiUrl } from "./api";
import { iniciarMonitor, syncCatalogos } from "./sync";
import { SetupPage } from "./pages/SetupPage";
import { LoginPage } from "./pages/LoginPage";
import { HomePage } from "./pages/HomePage";
import { ScanPage } from "./pages/ScanPage";
import { ReceivePage } from "./pages/ReceivePage";
import { ConfirmTransferPage } from "./pages/ConfirmTransferPage";
import { TransferReceivePage } from "./pages/TransferReceivePage";
import { SettingsPage } from "./pages/SettingsPage";
import { Dashboard } from "./pages/Dashboard";
import { Ventas } from "./pages/Ventas";
import { Compras } from "./pages/Compras";
import { Proveedores } from "./pages/Proveedores";
import { Clientes } from "./pages/Clientes";
import { Lotes } from "./pages/Lotes";
import { Traspasos } from "./pages/Traspasos";
import { CorteDeCaja } from "./pages/CorteDeCaja";
import { AdminTraspaso } from "./pages/AdminTraspaso";
import { PreciosDelDia } from "./pages/PreciosDelDia";
import { PrestamoCajas } from "./pages/PrestamoCajas";
import { Reportes } from "./pages/Reportes";
import { HistorialPrecios } from "./pages/HistorialPrecios";
import { Toast } from "./components/Toast";

function safeStringify(obj: any): string {
  try {
    const seen = new Set();
    return JSON.stringify(obj, (key, val) => {
      if (typeof val === "object" && val !== null) {
        if (seen.has(val)) return "[Circular]";
        seen.add(val);
      }
      if (val !== val) return "NaN";
      if (typeof val === "bigint") return val.toString();
      if (val instanceof Error) return { message: val.message, stack: val.stack, name: val.name };
      return val;
    }, 2);
  } catch { return String(obj); }
}

class ErrorBoundary extends Component<{ children: React.ReactNode }, { error: any }> {
  state = { error: null };
  static getDerivedStateFromError(e: any) { return { error: e }; }
  componentDidCatch(error: any, info: any) {
    try { localStorage.setItem("errorboundary_dump", JSON.stringify({ t: typeof error, c: error?.constructor?.name, msg: String(error?.message ?? "?"), stack: String(error?.stack ?? "?").slice(0, 300) })); } catch {}
  }
  render() {
    if (this.state.error) {
      const err = this.state.error;
      const tipo = typeof err;
      let constructor = "?";
      let keys = "—";
      let msg = "—";
      let stk = "—";
      try { constructor = err?.constructor?.name || "?"; } catch {}
      try { keys = Object.keys(err || {}).join(",") || "—"; } catch {}
      try { msg = String(err?.message ?? "—"); } catch {}
      try { stk = String(err?.stack ?? "—").slice(0, 200); } catch {}
      return (
        <div className="page" style={{ textAlign: "center", paddingTop: 60 }}>
          <h2 style={{ color: "#b71c1c" }}>Error inesperado</h2>
          <div style={{ fontSize: 12, textAlign: "left", background: "#fff", border: "2px solid #b71c1c", padding: 12, borderRadius: 8, marginBottom: 16, wordBreak: "break-all" }}>
            <p><b>Tipo:</b> {tipo}</p>
            <p><b>Constructor:</b> {constructor}</p>
            <p><b>Keys:</b> {keys}</p>
            <p><b>message:</b> {msg}</p>
            <p><b>stack:</b> {stk}</p>
            <p><b>VALOR:</b> {String(err).slice(0, 200)}</p>
          </div>
          <button className="btn btn-primary" onClick={() => { this.setState({ error: null }); window.location.hash = "#/"; }}>
            Volver al inicio
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function isAuthed() {
  return !!localStorage.getItem("token");
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  if (!hasApiUrl()) return <Navigate to="/setup" replace />;
  if (!isAuthed()) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export function App() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    window.addEventListener("error", (e) => {
      try { localStorage.setItem("global_error", safeStringify({ message: e.message, filename: e.filename, lineno: e.lineno, colno: e.colno, error: e.error })); } catch {}
    });
    window.addEventListener("unhandledrejection", (e) => {
      try { localStorage.setItem("unhandled_rejection", safeStringify({ reason: e.reason })); } catch {}
    });

    iniciarMonitor();
    if (isAuthed() && navigator.onLine) syncCatalogos();
    setReady(true);
  }, []);

  if (!ready) return null;

  return (
    <ErrorBoundary>
      <HashRouter>
        <Toast />
        <Routes>
          <Route path="/setup" element={<SetupPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/ventas" element={<ProtectedRoute><Ventas /></ProtectedRoute>} />
          <Route path="/compras" element={<ProtectedRoute><Compras /></ProtectedRoute>} />
          <Route path="/proveedores" element={<ProtectedRoute><Proveedores /></ProtectedRoute>} />
          <Route path="/clientes" element={<ProtectedRoute><Clientes /></ProtectedRoute>} />
          <Route path="/lotes" element={<ProtectedRoute><Lotes /></ProtectedRoute>} />
          <Route path="/traspasos" element={<ProtectedRoute><Traspasos /></ProtectedRoute>} />
          <Route path="/corte-caja" element={<ProtectedRoute><CorteDeCaja /></ProtectedRoute>} />
          <Route path="/precios-diarios" element={<ProtectedRoute><PreciosDelDia /></ProtectedRoute>} />
          <Route path="/prestamo-cajas" element={<ProtectedRoute><PrestamoCajas /></ProtectedRoute>} />
          <Route path="/reportes" element={<ProtectedRoute><Reportes /></ProtectedRoute>} />
          <Route path="/historial-precios" element={<ProtectedRoute><HistorialPrecios /></ProtectedRoute>} />
          <Route path="/scan" element={<ProtectedRoute><ScanPage /></ProtectedRoute>} />
          <Route path="/receive/:codigoQr" element={<ProtectedRoute><ReceivePage /></ProtectedRoute>} />
          <Route path="/confirmar-traspaso/:codigoQr" element={<ProtectedRoute><ConfirmTransferPage /></ProtectedRoute>} />
          <Route path="/recibir-traspaso/:codigoQr" element={<ProtectedRoute><TransferReceivePage /></ProtectedRoute>} />
          <Route path="/admin-traspaso" element={<ProtectedRoute><AdminTraspaso /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </ErrorBoundary>
  );
}
