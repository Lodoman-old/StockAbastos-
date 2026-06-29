import { useEffect, useState } from "react";

let addToast: (msg: string, type?: "success" | "error" | "info") => void = () => {};

export function notify(msg: string, type: "success" | "error" | "info" = "info") {
  addToast(msg, type);
}

export function Toast() {
  const [items, setItems] = useState<Array<{ id: number; msg: string; type: string }>>([]);

  useEffect(() => {
    addToast = (msg, type = "info") => {
      const id = Date.now();
      setItems(prev => [...prev, { id, msg, type }]);
      setTimeout(() => setItems(prev => prev.filter(i => i.id !== id)), 3500);
    };
  }, []);

  return (
    <div style={{
      position: "fixed", top: 60, left: 0, right: 0, zIndex: 9999,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
      pointerEvents: "none", padding: "0 16px",
    }}>
      {items.map(item => (
        <div key={item.id} onClick={() => setItems(prev => prev.filter(i => i.id !== item.id))}
          style={{
            pointerEvents: "auto", maxWidth: 450, width: "100%",
            padding: "12px 16px", borderRadius: 10, fontSize: 14,
            background: item.type === "success" ? "#1a8a3a" : item.type === "error" ? "#dc2626" : "#1976d2",
            color: "#fff", fontWeight: "bold", textAlign: "center",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            cursor: "pointer",
          }}>
          {item.msg}
        </div>
      ))}
    </div>
  );
}
