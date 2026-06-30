import { getApiUrl, getToken } from "./api";
import { obtenerAccionesPendientes, marcarAccion, contarPendientes, descargarCatalogos, limpiarCompletadas, guardarTarimaCache } from "./db";
import { get } from "./api";

let syncing = false;
let listeners: Array<(pendientes: number) => void> = [];

export function onPendientesChange(fn: (n: number) => void) {
  listeners.push(fn);
  return () => { listeners = listeners.filter(l => l !== fn); };
}

function notificar(n: number) {
  listeners.forEach(fn => fn(n));
}

export function isOnline(): boolean {
  return navigator.onLine;
}

export function iniciarMonitor() {
  window.addEventListener("online", () => { procesarCola(); syncCatalogos(); });
  window.addEventListener("offline", () => {});
  setInterval(procesarCola, 15000);
  setInterval(syncCatalogos, 1800000); // refrescar catálogos cada 30 min
  setTimeout(procesarCola, 2000);
}

async function fetchWithAuth(path: string, options: RequestInit = {}) {
  const base = getApiUrl();
  if (!base) throw new Error("API no configurada");
  const apiPath = path.startsWith("/api/") ? path : `/api${path.startsWith("/") ? "" : "/"}${path}`;
  const token = getToken();
  const res = await fetch(`${base}${apiPath}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    const err: any = new Error(body.error || `Error ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export async function procesarCola() {
  if (syncing || !navigator.onLine) return;
  syncing = true;
  try {
    const pendientes = await obtenerAccionesPendientes();
    if (!pendientes.length) { notificar(0); return; }

    for (const accion of pendientes) {
      try {
        const qr = encodeURIComponent(accion.codigo_qr);
        switch (accion.tipo) {
          case "recibir":
            await fetchWithAuth(`/tarimas/recibir/${qr}`, {
              method: "POST",
              body: accion.payload ? JSON.stringify(accion.payload) : undefined,
            });
            break;
          case "confirmar_traspaso":
            await fetchWithAuth(`/tarimas/confirmar-traspaso/${qr}`, { method: "POST" });
            break;
          case "entregar":
            await fetchWithAuth(`/tarimas/entregar/${qr}`, { method: "POST" });
            break;
        }
        await marcarAccion(accion.id!, "completado");
        // Actualizar cache con nuevo estado
        try {
          const tarima = await get(`/tarimas/scan/${qr}`);
          await guardarTarimaCache(tarima);
        } catch {}
      } catch (err: any) {
        if (err.status === 400 || err.status === 409 || err.status === 404) {
          // Ya fue procesada en el servidor — omitir sin error
          await marcarAccion(accion.id!, "omitido", err.message);
        } else {
          // Error real (sin conexión, etc) — dejar pendiente para reintentar
          break;
        }
      }
    }

    const restantes = await contarPendientes();
    notificar(restantes);
    if (restantes === 0) {
      limpiarCompletadas();
      syncCatalogos(); // refrescar datos tras sincronizar
    }
  } finally {
    syncing = false;
  }
}

export async function syncCatalogos() {
  if (!navigator.onLine) return;
  try {
    await descargarCatalogos(get);
  } catch {}
}
