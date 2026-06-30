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
import { PreciosDelDia } from "./pages/PreciosDelDia";
import { PrestamoCajas } from "./pages/PrestamoCajas";
import { Reportes } from "./pages/Reportes";
import { HistorialPrecios } from "./pages/HistorialPrecios";
import { Toast } from "./components/Toast";

class ErrorBoundary extends Component<{ children: React.ReactNode }, { error: Error | null }> {
  state = { error: null };
  static getDerivedStateFromError(e: Error) { return { error: e }; }
  render() {
    if (this.state.error) {
      return (
        <div className="page" style={{ textAlign: "center", paddingTop: 60 }}>
          <h2>Error inesperado</h2>
          <p style={{ color: "#888", fontSize: 13, marginBottom: 16 }}>{this.state.error.message || "(sin mensaje)"}</p>
          <pre style={{ fontSize: 10, textAlign: "left", maxHeight: 300, overflow: "auto", background: "#f5f5f5", padding: 12, borderRadius: 8, marginBottom: 16 }}>
            {this.state.error.stack || ""}
          </pre>
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
          <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </ErrorBoundary>
  );
}
