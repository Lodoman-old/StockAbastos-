import { FastifyInstance } from "fastify";
import { query } from "../db.js";
import { cascadeLoteEstado } from "./tarimas.js";

export async function traspasosRoutes(app: FastifyInstance) {
  app.get("/", async (request) => {
    const q = request.query as { bodega_id?: string };
    const params: any[] = [];
    let where = "WHERE t.bodega_destino_id IS NOT NULL AND t.estado IN ('RECIBIDA','PARCIAL','EN_TRANSITO')";
    if (q.bodega_id) {
      params.push(q.bodega_id);
      where += ` AND (t.bodega_id = $${params.length} OR t.bodega_destino_id = $${params.length})`;
    }
    const r = await query(`
      SELECT t.id, t.codigo_qr, t.estado, t.created_at,
             b_origen.nombre AS bodega_origen, b_origen.codigo AS bodega_origen_codigo,
             b_dest.nombre AS bodega_destino, b_dest.codigo AS bodega_destino_codigo,
             p.nombre AS producto_nombre, l.codigo_lote,
             tp.nombre AS tarima_tipo_nombre
      FROM tarimas t
      JOIN tarimas_tipos tp ON tp.id = t.tarima_tipo_id
      JOIN productos p ON p.id = t.producto_id
      JOIN lotes l ON l.id = t.lote_id
      LEFT JOIN bodegas b_origen ON b_origen.id = t.bodega_id
      LEFT JOIN bodegas b_dest ON b_dest.id = t.bodega_destino_id
      ${where}
      ORDER BY t.updated_at DESC
    `, params);
    return r.rows.map(row => ({
      id: row.id,
      folio: row.codigo_qr,
      bodega_origen: row.bodega_origen || "(sin origen)",
      bodega_destino: row.bodega_destino || "(sin destino)",
      estado: row.estado === "EN_TRANSITO" ? "EN_CURSO" : "PENDIENTE",
      created_at: row.created_at,
    }));
  });

  app.post<{ Params: { id: string } }>("/:id/cargar", async (request, reply) => {
    const { id } = request.params;
    const tarima = await query(
      "SELECT * FROM tarimas WHERE id = $1 AND estado IN ('RECIBIDA','PARCIAL') AND bodega_destino_id IS NOT NULL",
      [id]
    );
    if (!tarima.rows.length) return reply.status(404).send({ error: "Tarima no encontrada o no disponible para carga" });

    const t = tarima.rows[0];
    const bodega_destino_id = t.bodega_destino_id;
    const cajas = parseFloat(t.cajas_restantes) || 1;
    const pesoKg = t.peso_kg != null ? Number(t.peso_kg) : null;

    const result = await query(`
      UPDATE tarimas SET estado = 'EN_TRANSITO', updated_at = NOW() WHERE id = $1 RETURNING *
    `, [t.id]);

    await query(`
      INSERT INTO movimientos (lote_id, tipo, bodega_origen_id, bodega_destino_id, cantidad_kg, cantidad_cajas, referencia)
      VALUES ($1, 'TRASPASO_SALIDA', $2, $3, COALESCE($4::numeric, 0), $5, $6)
    `, [t.lote_id, t.bodega_id, bodega_destino_id, pesoKg, cajas, `CONFIRMA_TRASPASO:${t.codigo_qr}`]);

    await query(`
      UPDATE stock_bodega SET cantidad_kg = GREATEST(cantidad_kg - COALESCE($1::numeric, 0), 0),
          cantidad_cajas = GREATEST(cantidad_cajas - $2::numeric, 0), updated_at = NOW()
      WHERE bodega_id = $3 AND producto_id = $4
    `, [pesoKg, cajas, t.bodega_id, t.producto_id]);

    await cascadeLoteEstado(t.lote_id);
    return { success: true, tarima: result.rows[0] };
  });

  app.post<{ Params: { id: string } }>("/:id/recibir", async (request, reply) => {
    const { id } = request.params;
    const tarima = await query(
      "SELECT * FROM tarimas WHERE id = $1 AND estado = 'EN_TRANSITO'",
      [id]
    );
    if (!tarima.rows.length) return reply.status(404).send({ error: "Tarima no encontrada o no en tránsito" });

    const t = tarima.rows[0];
    const bodega_destino_id = t.bodega_destino_id;
    if (!bodega_destino_id) return reply.status(400).send({ error: "Tarima sin bodega destino asignada" });
    const cajas = parseFloat(t.cajas_restantes) || 1;
    const pesoKg = t.peso_kg != null ? Number(t.peso_kg) : null;

    const result = await query(`
      UPDATE tarimas SET estado = 'RECIBIDA', bodega_id = $1, bodega_destino_id = NULL, updated_at = NOW() WHERE id = $2 RETURNING *
    `, [bodega_destino_id, t.id]);

    await query(`
      INSERT INTO movimientos (lote_id, tipo, bodega_destino_id, cantidad_kg, cantidad_cajas, referencia)
      VALUES ($1, 'TRASPASO_ENTRADA', $2, COALESCE($3::numeric, 0), $4, $5)
    `, [t.lote_id, bodega_destino_id, pesoKg, cajas, `ENTREGA_TARIMA:${t.codigo_qr}`]);

    await query(`
      INSERT INTO stock_bodega (bodega_id, producto_id, cantidad_kg, cantidad_cajas)
      VALUES ($1, $2, COALESCE($3::numeric, 0), $4)
      ON CONFLICT (bodega_id, producto_id) DO UPDATE SET
          cantidad_kg = stock_bodega.cantidad_kg + COALESCE($3::numeric, 0),
          cantidad_cajas = stock_bodega.cantidad_cajas + $4,
          updated_at = NOW()
    `, [bodega_destino_id, t.producto_id, pesoKg, cajas]);

    return { success: true, tarima: result.rows[0] };
  });
}
