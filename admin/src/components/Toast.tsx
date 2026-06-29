import { useEffect, useState, useCallback } from "react";

interface Toast {
    id: number;
    message: string;
    type: "success" | "error" | "info";
}

let toastId = 0;
let addToastFn: ((msg: string, type: Toast["type"]) => void) | null = null;

export function notify(msg: string, type: Toast["type"] = "info") {
    if (addToastFn) addToastFn(msg, type);
}

export function ToastContainer() {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const add = useCallback((msg: string, type: Toast["type"]) => {
        const id = ++toastId;
        setToasts(prev => [...prev, { id, message: msg, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
    }, []);

    useEffect(() => { addToastFn = add; return () => { addToastFn = null; }; }, [add]);

    const dismiss = (id: number) => setToasts(prev => prev.filter(t => t.id !== id));

    const colors = { success: "#1a8a3a", error: "#dc2626", info: "#1976d2" };

    return (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 9999, display: "flex", flexDirection: "column", alignItems: "center", padding: "8px 12px" }}>
            {toasts.map(t => (
                <div key={t.id} onPointerDown={() => dismiss(t.id)} style={{
                    background: colors[t.type], color: "#fff", padding: "10px 16px",
                    borderRadius: 10, fontSize: 14, fontWeight: "bold", boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
                    animation: "slideDown 0.3s ease",
                    maxWidth: 600, width: "100%", wordBreak: "break-word",
                    display: "flex", alignItems: "center", gap: 8,
                    marginBottom: 6, cursor: "pointer",
                    boxSizing: "border-box", userSelect: "none", WebkitUserSelect: "none",
                }}>
                    <span style={{ flex: 1 }}>{t.message}</span>
                    <button onPointerDown={e => { e.stopPropagation(); dismiss(t.id); }}
                        style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "#fff", fontSize: 14, borderRadius: "50%", width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, cursor: "pointer", padding: 0 }}>
                        ✕
                    </button>
                </div>
            ))}
            <style>{`
                @keyframes slideDown { from { transform: translateY(-100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            `}</style>
        </div>
    );
}
