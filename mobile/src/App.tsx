import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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
import { Toast } from "./components/Toast";

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
    <BrowserRouter>
      <Toast />
      <Routes>
        <Route path="/setup" element={<SetupPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
        <Route path="/scan" element={<ProtectedRoute><ScanPage /></ProtectedRoute>} />
        <Route path="/receive/:codigoQr" element={<ProtectedRoute><ReceivePage /></ProtectedRoute>} />
        <Route path="/confirmar-traspaso/:codigoQr" element={<ProtectedRoute><ConfirmTransferPage /></ProtectedRoute>} />
        <Route path="/recibir-traspaso/:codigoQr" element={<ProtectedRoute><TransferReceivePage /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
