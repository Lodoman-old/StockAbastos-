const DB_NAME = "stockabastos";
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("catalogos")) {
        db.createObjectStore("catalogos", { keyPath: "tipo" });
      }
      if (!db.objectStoreNames.contains("tarimas_cache")) {
        const store = db.createObjectStore("tarimas_cache", { keyPath: "codigo_qr" });
        store.createIndex("estado", "estado", { unique: false });
      }
      if (!db.objectStoreNames.contains("cola_acciones")) {
        const store = db.createObjectStore("cola_acciones", { keyPath: "id", autoIncrement: true });
        store.createIndex("estado", "estado", { unique: false });
      }
      if (!db.objectStoreNames.contains("catalogos_meta")) {
        db.createObjectStore("catalogos_meta", { keyPath: "clave" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withDB<T>(fn: (db: IDBDatabase) => IDBRequest<T> | IDBTransaction): Promise<T> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const result = fn(db);
    if (result instanceof IDBRequest) {
      result.onsuccess = () => resolve(result.result);
      result.onerror = () => reject(result.error);
    }
    db.close();
  });
}

// --- Catálogos ---

export async function guardarCatalogo(tipo: string, datos: any[]) {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction("catalogos", "readwrite");
    tx.objectStore("catalogos").put({ tipo, datos, actualizado: Date.now() });
    tx.objectStore("catalogos_meta").put({ clave: `${tipo}_actualizado`, valor: Date.now() });
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function obtenerCatalogo<T = any>(tipo: string): Promise<T[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("catalogos", "readonly");
    const req = tx.objectStore("catalogos").get(tipo);
    req.onsuccess = () => { db.close(); resolve(req.result?.datos || []); };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}

// --- Tarimas cache (para ver info offline) ---

export async function guardarTarimaCache(tarima: any) {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction("tarimas_cache", "readwrite");
    tx.objectStore("tarimas_cache").put(tarima);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function obtenerTarimaCache(codigoQr: string): Promise<any | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("tarimas_cache", "readonly");
    const req = tx.objectStore("tarimas_cache").get(codigoQr);
    req.onsuccess = () => { db.close(); resolve(req.result || null); };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}

// --- Cola de acciones offline ---

export type AccionOffline = {
  id?: number;
  tipo: "recibir" | "confirmar_traspaso" | "entregar";
  codigo_qr: string;
  payload?: any;
  creado_en: number;
  estado: "pendiente" | "completado" | "omitido";
  error?: string;
};

export async function encolarAccion(tipo: AccionOffline["tipo"], codigoQr: string, payload?: any) {
  const db = await openDB();
  return new Promise<number>((resolve, reject) => {
    const tx = db.transaction("cola_acciones", "readwrite");
    const req = tx.objectStore("cola_acciones").add({
      tipo, codigo_qr: codigoQr, payload,
      creado_en: Date.now(), estado: "pendiente",
    } as AccionOffline);
    req.onsuccess = () => { db.close(); resolve(req.result as number); };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}

export async function obtenerAccionesPendientes(): Promise<AccionOffline[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("cola_acciones", "readonly");
    const index = tx.objectStore("cola_acciones").index("estado");
    const req = index.getAll("pendiente");
    req.onsuccess = () => { db.close(); resolve(req.result); };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}

export async function contarPendientes(): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("cola_acciones", "readonly");
    const index = tx.objectStore("cola_acciones").index("estado");
    const req = index.count("pendiente");
    req.onsuccess = () => { db.close(); resolve(req.result); };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}

export async function marcarAccion(id: number, estado: "completado" | "omitido", error?: string) {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction("cola_acciones", "readwrite");
    const req = tx.objectStore("cola_acciones").get(id);
    req.onsuccess = () => {
      const accion = req.result as AccionOffline;
      if (accion) {
        accion.estado = estado;
        accion.error = error;
        tx.objectStore("cola_acciones").put(accion);
      }
    };
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function limpiarCompletadas() {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction("cola_acciones", "readwrite");
    const index = tx.objectStore("cola_acciones").index("estado");
    const req = index.openCursor(["completado", "omitido"] as any);
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        tx.objectStore("cola_acciones").delete(cursor.primaryKey);
        cursor.continue();
      }
    };
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

// --- Sync de catálogos ---

export async function descargarCatalogos(getFn: (path: string) => Promise<any>) {
  const [productos, bodegas, tipos] = await Promise.all([
    getFn("/productos").catch(() => []),
    getFn("/bodegas").catch(() => []),
    getFn("/tarimas-tipos").catch(() => []),
  ]);
  await Promise.all([
    guardarCatalogo("productos", productos),
    guardarCatalogo("bodegas", bodegas),
    guardarCatalogo("tarimas_tipos", tipos),
  ]);
}
