import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import staticFiles from "@fastify/static";
import path from "path";
import { fileURLToPath } from "url";
import { config } from "./config.js";
import { authRoutes } from "./routes/auth.js";
import { bodegasRoutes } from "./routes/bodegas.js";
import { productosRoutes } from "./routes/productos.js";
import { lotesRoutes } from "./routes/lotes.js";
import { ventasRoutes } from "./routes/ventas.js";
import { syncRoutes } from "./routes/sync.js";
import { dashboardRoutes } from "./routes/dashboard.js";
import { labelsRoutes } from "./routes/labels.js";
import { ubicacionesRoutes } from "./routes/ubicaciones.js";
import { rolesRoutes } from "./routes/roles.js";
import { configuracionRoutes } from "./routes/configuracion.js";
import { clientesRoutes } from "./routes/clientes.js";
import { gastosRoutes } from "./routes/gastos.js";
import { comprasRoutes } from "./routes/compras.js";
import { proveedoresRoutes } from "./routes/proveedores.js";
import { ticketRoutes } from "./routes/ticket.js";
import { preciosDiariosRoutes } from "./routes/precios_diarios.js";
import { cortesRoutes } from "./routes/cortes.js";
import { prestamoCajasRoutes } from "./routes/prestamo_cajas.js";
import { reportesRoutes } from "./routes/reportes.js";
import { pagosRoutes } from "./routes/pagos.js";
import { tarimasTiposRoutes } from "./routes/tarimas_tipos.js";
import { mostradorRoutes } from "./routes/mostrador.js";
import { tarimasRoutes } from "./routes/tarimas.js";
import { traspasosRoutes } from "./routes/traspasos.js";
import { impresionRoutes } from "./routes/impresion.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });
await app.register(jwt, { secret: config.jwtSecret });
await app.register(multipart);
await app.register(staticFiles, {
    root: path.join(__dirname, "..", "uploads"),
    prefix: "/uploads/",
});

app.addHook("onRequest", async (request, reply) => {
    const publicRoutes = ["/api/health", "/api/auth/login", "/api/auth/register", "/api/sync/batch", "/api/sync/snapshot", "/api/labels", "/api/ticket", "/api/cortes/inventario-ticket", "/api/tarimas/qr-"];
    if (publicRoutes.some((r) => request.url.startsWith(r))) return;
    try {
        await request.jwtVerify();
    } catch {
        reply.status(401).send({ error: "Unauthorized" });
    }
});

app.get("/api/health", async () => ({ status: "ok", timestamp: new Date().toISOString() }));

await app.register(authRoutes, { prefix: "/api/auth" });
await app.register(bodegasRoutes, { prefix: "/api/bodegas" });
await app.register(productosRoutes, { prefix: "/api/productos" });
await app.register(lotesRoutes, { prefix: "/api/lotes" });
await app.register(ventasRoutes, { prefix: "/api/ventas" });
await app.register(syncRoutes, { prefix: "/api/sync" });
await app.register(dashboardRoutes, { prefix: "/api/dashboard" });
await app.register(labelsRoutes, { prefix: "/api/labels" });
await app.register(ubicacionesRoutes, { prefix: "/api/ubicaciones" });
await app.register(rolesRoutes, { prefix: "/api/roles" });
await app.register(configuracionRoutes, { prefix: "/api/configuracion" });
await app.register(clientesRoutes, { prefix: "/api/clientes" });
await app.register(gastosRoutes, { prefix: "/api/gastos" });
await app.register(comprasRoutes, { prefix: "/api/compras" });
await app.register(proveedoresRoutes, { prefix: "/api/proveedores" });
await app.register(ticketRoutes, { prefix: "/api/ticket" });
await app.register(preciosDiariosRoutes, { prefix: "/api/precios-diarios" });
await app.register(cortesRoutes, { prefix: "/api/cortes" });
await app.register(prestamoCajasRoutes, { prefix: "/api/prestamo-cajas" });
await app.register(reportesRoutes, { prefix: "/api/reportes" });
await app.register(pagosRoutes, { prefix: "/api/pagos" });
await app.register(tarimasTiposRoutes, { prefix: "/api/tarimas-tipos" });
await app.register(tarimasRoutes, { prefix: "/api/tarimas" });
await app.register(mostradorRoutes, { prefix: "/api/mostrador" });
await app.register(impresionRoutes, { prefix: "/api/impresion" });
await app.register(traspasosRoutes, { prefix: "/api/traspasos" });

try {
    await app.listen({ port: config.port, host: "0.0.0.0" });
    console.log(`Server running on port ${config.port}`);
} catch (err) {
    app.log.error(err);
    process.exit(1);
}
