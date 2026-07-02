import { useEffect, useState } from "react";
import { get, post, put, del } from "../services/api";

export function Impresoras() {
  const [impresoras, setImpresoras] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [tab, setTab] = useState<"impresoras" | "cola">("impresoras");
  const [form, setForm] = useState({ nombre: "", tipo: "ticket", direccion_ip: "", puerto: 9100 });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  useEffect(() => { if (msg) { const t = setTimeout(() => setMsg(""), 8000); return () => clearTimeout(t); } }, [msg]);

  const load = async () => {
    try { setImpresoras(await get("/impresion/impresoras")); } catch {}
    try { setJobs(await get("/impresion/cola")); } catch {}
  };

  useEffect(() => { load(); }, []);

  const guardar = async () => {
    setMsg("");
    try {
      if (editingId) {
        await put(`/impresion/impresoras/${editingId}`, form);
        setMsg("Impresora actualizada");
      } else {
        await post("/impresion/impresoras", form);
        setMsg("Impresora creada");
      }
      setForm({ nombre: "", tipo: "ticket", direccion_ip: "", puerto: 9100 });
      setEditingId(null);
      load();
    } catch (e: any) { setMsg("Error: " + e.message); }
  };

  const editar = (i: any) => {
    setForm({ nombre: i.nombre, tipo: i.tipo, direccion_ip: i.direccion_ip, puerto: i.puerto });
    setEditingId(i.id);
  };

  const eliminar = async (id: string) => {
    if (!confirm("¿Eliminar impresora?")) return;
    try { await del(`/impresion/impresoras/${id}`); setMsg("Eliminada"); load(); }
    catch (e: any) { setMsg("Error: " + e.message); }
  };

  const estadoColor = (e: string) =>
    e === "pendiente" ? "#e65100" : e === "enviado" ? "#2e7d32" : "#c62828";

  return (
    <div>
      <h1>Impresoras</h1>

      {msg && <div style={{ display: "flex", alignItems: "center", gap: 8, padding: 8, background: "#e8f5e9", borderRadius: 8 }}><button onClick={() => setMsg("")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "inherit", padding: 0, lineHeight: 1 }}>✕</button><span style={{ flex: 1 }}>{msg}</span></div>}

      <div className="btn-inline-group" style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button className="btn" style={{ flex: 1, background: tab === "impresoras" ? "#1a8a3a" : "#ddd", color: tab === "impresoras" ? "#fff" : "#333" }}
          onClick={() => setTab("impresoras")}>Impresoras</button>
        <button className="btn" style={{ flex: 1, background: tab === "cola" ? "#1a8a3a" : "#ddd", color: tab === "cola" ? "#fff" : "#333" }}
          onClick={() => setTab("cola")}>Cola de impresión</button>
      </div>

      {tab === "impresoras" && (
        <>
          <div style={{ background: "#fff", borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <h3>{editingId ? "Editar impresora" : "Nueva impresora"}</h3>
            <div className="form-grid-2" style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr 1fr" }}>
              <input className="input" placeholder="Nombre" value={form.nombre}
                onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
              <select className="input" value={form.tipo}
                onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
                <option value="ticket">Ticket (Volteck PDV-81i)</option>
                <option value="etiqueta">Etiqueta (Brother QL-810W)</option>
              </select>
              <input className="input" placeholder="Dirección IP" value={form.direccion_ip}
                onChange={e => setForm(f => ({ ...f, direccion_ip: e.target.value }))} />
              <input className="input" type="number" placeholder="Puerto (9100)" value={form.puerto}
                onChange={e => setForm(f => ({ ...f, puerto: parseInt(e.target.value) || 9100 }))} />
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button className="btn btn-primary" onClick={guardar}
                style={{ flex: 1 }}>{editingId ? "Actualizar" : "Crear"}</button>
              {editingId && <button className="btn btn-outline" onClick={() => {
                setForm({ nombre: "", tipo: "ticket", direccion_ip: "", puerto: 9100 });
                setEditingId(null);
              }}>Cancelar</button>}
            </div>
          </div>

          {impresoras.map(i => (
            <div key={i.id} style={{ background: "#fff", borderRadius: 12, padding: 16, marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <strong>{i.nombre}</strong>
                <span style={{ fontSize: 12, color: "#888", marginLeft: 8 }}>{i.tipo}</span>
                <br />
                <span style={{ fontSize: 13, color: "#555" }}>{i.direccion_ip}:{i.puerto}</span>
                <span style={{ fontSize: 12, color: i.activa ? "#2e7d32" : "#c62828", marginLeft: 8 }}>
                  {i.activa ? "Activa" : "Inactiva"}
                </span>
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                <button className="btn" style={{ width: "auto", padding: "6px 14px", background: "#1976d2", color: "#fff" }}
                  onClick={() => editar(i)}>Editar</button>
                <button className="btn" style={{ width: "auto", padding: "6px 14px", background: "#dc2626", color: "#fff" }}
                  onClick={() => eliminar(i.id)}>Eliminar</button>
              </div>
            </div>
          ))}
        </>
      )}

      {tab === "cola" && (
        <>
          {jobs.length === 0 && <p style={{ color: "#888" }}>No hay trabajos de impresión</p>}
          {jobs.map(j => (
            <div key={j.id} style={{ background: "#fff", borderRadius: 12, padding: 16, marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <strong>{j.impresora_nombre}</strong>
                <span style={{ color: estadoColor(j.estado), fontWeight: "bold" }}>{j.estado}</span>
              </div>
              <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>
                {j.created_at} {j.sent_at ? `| Enviado: ${j.sent_at}` : ""}
              </div>
              {j.error_msg && <div style={{ fontSize: 12, color: "#c62828", marginTop: 4 }}>{j.error_msg}</div>}
              <details style={{ marginTop: 8 }}>
                <summary style={{ fontSize: 12, color: "#555", cursor: "pointer" }}>Ver contenido</summary>
                <pre style={{ fontSize: 11, background: "#f5f5f5", padding: 8, borderRadius: 8, marginTop: 4, maxHeight: 200, overflow: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                  {j.contenido}
                </pre>
              </details>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
