import { FastifyInstance } from "fastify";
import { generarSnapshot, procesarBatch, consultarBatch } from "../services/sync.service.js";

export async function syncRoutes(app: FastifyInstance) {
    app.post<{
        Body: {
            bodega_id: string;
        }
    }>("/snapshot", async (request) => {
        const { bodega_id } = request.body;
        if (!bodega_id) return { error: "bodega_id es requerido" };
        return await generarSnapshot(bodega_id);
    });

    app.post<{
        Body: {
            batch_uuid: string;
            dispositivo_id: string;
            snapshot_version: number;
            operacion: string;
            movimientos: Array<{
                lote_id: string;
                codigo_lote: string;
                cantidad_kg: number;
                bodega_origen?: string;
                bodega_destino?: string;
                timestamp: string;
            }>;
        }
    }>("/batch", async (request) => {
        const payload = request.body;

        if (!payload.batch_uuid || !payload.movimientos?.length) {
            return { error: "Datos inválidos" };
        }

        try {
            return await procesarBatch(payload);
        } catch (error: any) {
            return { status: "ERROR", error: error.message };
        }
    });

    app.get<{ Params: { batchUuid: string } }>("/batch/:batchUuid", async (request) => {
        return await consultarBatch(request.params.batchUuid);
    });
}
