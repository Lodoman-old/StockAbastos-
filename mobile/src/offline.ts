import { get, post } from "./api";
import { encolarAccion, obtenerTarimaCache, guardarTarimaCache, obtenerCatalogo } from "./db";
import { procesarCola } from "./sync";

export async function postOfflineFirst(
  path: string,
  body: any,
  accionTipo: "recibir" | "confirmar_traspaso" | "entregar",
  codigoQr: string,
) {
  if (navigator.onLine) {
    try {
      const result = await post(path, body);
      return result;
    } catch (err: any) {
      if (err.message?.includes("tarima ya fue recibida") ||
          err.message?.includes("no está en tránsito") ||
          err.message?.includes("ya fue procesada")) {
        return { ya_procesada: true };
      }
      throw err;
    }
  }
  await encolarAccion(accionTipo, codigoQr, body);
  procesarCola();
  return { encolado: true };
}

export async function scanTarimaOfflineFirst(codigoQr: string) {
  if (navigator.onLine) {
    try {
      const tarima = await get(`/tarimas/scan/${encodeURIComponent(codigoQr)}`);
      await guardarTarimaCache(tarima);
      return tarima;
    } catch {
      return obtenerTarimaCache(codigoQr);
    }
  }
  return obtenerTarimaCache(codigoQr);
}

export async function buscarEnCatalogo(tipo: string, criterio: string, valor: string) {
  const items = await obtenerCatalogo<any>(tipo);
  return items.find((i: any) => String(i[criterio] || "").toLowerCase() === valor.toLowerCase());
}
