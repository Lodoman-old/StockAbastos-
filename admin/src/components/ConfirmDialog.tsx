import React from "react";

interface Props {
    open: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    confirmColor?: string;
    onConfirm: () => void;
    onCancel: () => void;
}

export function ConfirmDialog({ open, title, message, confirmLabel = "Eliminar", cancelLabel = "Cancelar", confirmColor = "#f44336", onConfirm, onCancel }: Props) {
    if (!open) return null;
    return (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 500 }}
            onClick={onCancel}>
            <div style={{ background: "#fff", borderRadius: 16, padding: 28, maxWidth: 400, width: "90%", boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}
                onClick={e => e.stopPropagation()}>
                <h3 style={{ margin: "0 0 8px", fontSize: 18, color: "#333" }}>{title}</h3>
                <p style={{ margin: "0 0 20px", fontSize: 14, color: "#666", lineHeight: 1.5 }}>{message}</p>
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                    <button onClick={onCancel}
                        style={{ padding: "10px 20px", background: "#f0f2f5", color: "#333", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: "bold" }}>
                        {cancelLabel}
                    </button>
                    <button onClick={onConfirm}
                        style={{ padding: "10px 20px", background: confirmColor, color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: "bold" }}>
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
