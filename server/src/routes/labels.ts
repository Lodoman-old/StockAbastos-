import { FastifyInstance } from "fastify";
import { getLabelData, generateZPL, generateHtmlLabel, generateQRBuffer } from "../services/label.service.js";

export async function labelsRoutes(app: FastifyInstance) {
    app.get<{ Params: { loteId: string } }>("/:loteId/zpl", async (request, reply) => {
        const data = await getLabelData(request.params.loteId);
        if (!data) return reply.status(404).send({ error: "Lote no encontrado" });

        reply.header("Content-Type", "application/x-zpl");
        reply.header("Content-Disposition", `attachment; filename="label-${data.codigo_lote}.zpl"`);
        return generateZPL(data);
    });

    app.get<{ Params: { loteId: string } }>("/:loteId/html", async (request, reply) => {
        const data = await getLabelData(request.params.loteId);
        if (!data) return reply.status(404).send({ error: "Lote no encontrado" });

        reply.header("Content-Type", "text/html");
        return generateHtmlLabel(data);
    });

    app.get<{ Params: { loteId: string } }>("/:loteId/qr", async (request, reply) => {
        const data = await getLabelData(request.params.loteId);
        if (!data) return reply.status(404).send({ error: "Lote no encontrado" });

        const buf = await generateQRBuffer(data.codigo_lote);
        reply.header("Content-Type", "image/png");
        reply.header("Content-Disposition", `inline; filename="qr-${data.codigo_lote}.png"`);
        return reply.send(buf);
    });

    app.post<{ Params: { loteId: string }; Body: { copies?: number } }>("/:loteId/print-batch", async (request, reply) => {
        const data = await getLabelData(request.params.loteId);
        if (!data) return reply.status(404).send({ error: "Lote no encontrado" });

        const copies = Math.max(1, Math.min(request.body?.copies || data.total_cajas, 9999));
        const format = (request.query as any)?.format || "zpl";

        if (format === "html") {
            reply.header("Content-Type", "text/html");
            reply.header("Content-Disposition", `attachment; filename="labels-${data.codigo_lote}.html"`);
            return generateHtmlLabel(data, copies);
        }

        reply.header("Content-Type", "application/x-zpl");
        reply.header("Content-Disposition", `attachment; filename="labels-${data.codigo_lote}.zpl"`);
        return generateZPL(data, copies);
    });

    app.get<{ Params: { loteId: string } }>("/:loteId/data", async (request) => {
        const data = await getLabelData(request.params.loteId);
        if (!data) return { error: "Lote no encontrado" };
        return data;
    });
}
