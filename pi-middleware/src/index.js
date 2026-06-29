import net from "node:net";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Cargar .env manualmente (evitar dependencia)
function loadEnv() {
  const envPath = path.join(__dirname, "..", ".env");
  if (!fs.existsSync(envPath)) {
    console.error("Falta archivo .env — copia .env.example a .env y configúralo");
    process.exit(1);
  }
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnv();

const API_URL = process.env.API_URL?.replace(/\/+$/, "");
const API_TOKEN = process.env.API_TOKEN;
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL || "3000", 10);
const PRINT_TIMEOUT = parseInt(process.env.PRINT_TIMEOUT || "10000", 10);

if (!API_URL || !API_TOKEN) {
  console.error("Faltan API_URL y/o API_TOKEN en .env");
  process.exit(1);
}

console.log(`[init] Servidor: ${API_URL}`);
console.log(`[init] Polling cada ${POLL_INTERVAL}ms`);

async function fetchPendientes() {
  const res = await fetch(`${API_URL}/api/impresion/pendientes`, {
    headers: { Authorization: `Bearer ${API_TOKEN}` },
  });
  if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);
  return res.json();
}

async function marcar(id, estado, errorMsg) {
  const res = await fetch(`${API_URL}/api/impresion/marcar/${id}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_TOKEN}`,
    },
    body: JSON.stringify({ estado, error_msg: errorMsg }),
  });
  if (!res.ok) console.error(`[marcar] Error ${res.status} al marcar ${id}`);
}

function imprimir(contenido, ip, puerto) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    const timeout = setTimeout(() => {
      socket.destroy();
      reject(new Error("Timeout de conexión"));
    }, PRINT_TIMEOUT);

    socket.connect(puerto, ip, () => {
      socket.write(contenido, (err) => {
        if (err) {
          clearTimeout(timeout);
          socket.destroy();
          return reject(err);
        }
        socket.end();
        clearTimeout(timeout);
        resolve();
      });
    });

    socket.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

async function procesar() {
  try {
    const pendientes = await fetchPendientes();
    if (!Array.isArray(pendientes) || pendientes.length === 0) return;

    for (const job of pendientes) {
      console.log(`[print] Enviando ${job.id} → ${job.impresora_nombre} (${job.direccion_ip}:${job.puerto})`);

      try {
        await imprimir(job.contenido, job.direccion_ip, job.puerto);
        await marcar(job.id, "enviado");
        console.log(`[print] OK ${job.id}`);
      } catch (err) {
        console.error(`[print] ERROR ${job.id}: ${err.message}`);
        await marcar(job.id, "error", err.message);
      }
    }
  } catch (err) {
    console.error(`[poll] Error: ${err.message}`);
  }
}

console.log("[start] Iniciando loop de impresión...");
procesar();
setInterval(procesar, POLL_INTERVAL);
