import { FastifyInstance } from "fastify";
import { query } from "../db.js";

export async function impresionRoutes(app: FastifyInstance) {

    // --- Impresoras CRUD ---

    app.get("/impresoras", async () => {
        const r = await query("SELECT * FROM impresoras ORDER BY nombre");
        return r.rows;
    });

    app.get<{ Params: { id: string } }>("/impresoras/:id", async (request) => {
        const r = await query("SELECT * FROM impresoras WHERE id = $1", [request.params.id]);
        if (!r.rows.length) return { error: "Impresora no encontrada" };
        return r.rows[0];
    });

    app.post<{ Body: { nombre: string; tipo: string; direccion_ip: string; puerto?: number } }>(
        "/impresoras",
        async (request) => {
            const { nombre, tipo, direccion_ip, puerto } = request.body;
            const r = await query(
                `INSERT INTO impresoras (nombre, tipo, direccion_ip, puerto)
                 VALUES ($1, $2, $3, $4) RETURNING *`,
                [nombre, tipo, direccion_ip, puerto || 9100]
            );
            return r.rows[0];
        }
    );

    app.put<{ Params: { id: string }; Body: { nombre?: string; tipo?: string; direccion_ip?: string; puerto?: number; activa?: boolean } }>(
        "/impresoras/:id",
        async (request) => {
            const { nombre, tipo, direccion_ip, puerto, activa } = request.body;
            const sets: string[] = [];
            const vals: any[] = [];
            let i = 1;
            if (nombre !== undefined) { sets.push(`nombre = $${i++}`); vals.push(nombre); }
            if (tipo !== undefined) { sets.push(`tipo = $${i++}`); vals.push(tipo); }
            if (direccion_ip !== undefined) { sets.push(`direccion_ip = $${i++}`); vals.push(direccion_ip); }
            if (puerto !== undefined) { sets.push(`puerto = $${i++}`); vals.push(puerto); }
            if (activa !== undefined) { sets.push(`activa = $${i++}`); vals.push(activa); }
            if (!sets.length) return { error: "Sin campos a actualizar" };
            vals.push(request.params.id);
            const r = await query(
                `UPDATE impresoras SET ${sets.join(", ")} WHERE id = $${i} RETURNING *`,
                vals
            );
            if (!r.rows.length) return { error: "Impresora no encontrada" };
            return r.rows[0];
        }
    );

    app.delete<{ Params: { id: string } }>("/impresoras/:id", async (request) => {
        const r = await query("DELETE FROM impresoras WHERE id = $1 RETURNING *", [request.params.id]);
        if (!r.rows.length) return { error: "Impresora no encontrada" };
        return { success: true };
    });

    // --- Cola de impresión ---

    app.post<{ Body: { impresora_id: string; contenido: string; tipo_comando?: string; nombre_archivo?: string } }>(
        "/encolar",
        async (request) => {
            const { impresora_id, contenido, tipo_comando, nombre_archivo } = request.body;
            const r = await query(
                `INSERT INTO cola_impresion (impresora_id, contenido, tipo_comando, nombre_archivo)
                 VALUES ($1, $2, $3, $4) RETURNING *`,
                [impresora_id, contenido, tipo_comando || "raw", nombre_archivo || null]
            );
            return r.rows[0];
        }
    );

    app.get("/pendientes", async () => {
        const r = await query(
            `SELECT ci.*, i.nombre AS impresora_nombre, i.tipo AS impresora_tipo,
                    i.direccion_ip, i.puerto
             FROM cola_impresion ci
             JOIN impresoras i ON i.id = ci.impresora_id
             WHERE ci.estado = 'pendiente' AND i.activa = TRUE
             ORDER BY ci.created_at ASC
             LIMIT 10`
        );
        return r.rows;
    });

    app.get("/cola", async () => {
        const r = await query(
            `SELECT ci.*, i.nombre AS impresora_nombre, i.tipo AS impresora_tipo
             FROM cola_impresion ci
             JOIN impresoras i ON i.id = ci.impresora_id
             ORDER BY ci.created_at DESC
             LIMIT 50`
        );
        return r.rows;
    });

    app.post<{ Params: { id: string }; Body: { estado: string; error_msg?: string } }>(
        "/marcar/:id",
        async (request) => {
            const { estado, error_msg } = request.body;
            const r = await query(
                `UPDATE cola_impresion
                 SET estado = $1, error_msg = $2,
                     sent_at = CASE WHEN $1 = 'enviado' THEN NOW() ELSE sent_at END
                 WHERE id = $3 RETURNING *`,
                [estado, error_msg || null, request.params.id]
            );
            if (!r.rows.length) return { error: "Trabajo no encontrado" };
            return r.rows[0];
        }
    );

}
