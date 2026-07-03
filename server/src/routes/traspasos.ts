import { FastifyInstance } from "fastify";
import { query } from "../db.js";
import { cascadeLoteEstado } from "./tarimas.js";
import { hoyMexico } from "../date-utils.js";

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

  app.post<{ Params: { id: string }; Body: { cajas?: number } }>("/:id/cargar", async (request, reply) => {
    const { id } = request.params;
    const cajasSolicitadas = request.body?.cajas;

    const tarima = await query(
      "SELECT * FROM tarimas WHERE id = $1 AND estado IN ('RECIBIDA','PARCIAL') AND bodega_destino_id IS NOT NULL",
      [id]
    );
    if (!tarima.rows.length) return reply.status(404).send({ error: "Tarima no encontrada o no disponible para carga" });

    let t = tarima.rows[0];
    const totalCajas = parseFloat(t.cajas_restantes) || 1;

    const cajasTransferir = cajasSolicitadas != null ? cajasSolicitadas : totalCajas;
    if (cajasTransferir <= 0 || cajasTransferir > totalCajas) {
      return reply.status(400).send({ error: `Cantidad inválida. La tarima tiene ${totalCajas} cajas disponibles` });
    }

    // If partial transfer, split first
    if (cajasTransferir < totalCajas) {
      const numTarima = await query("SELECT COALESCE(MAX(numero_tarima), 0) + 1 AS next FROM tarimas WHERE lote_id = $1 AND producto_id = $2 AND tarima_tipo_id = $3", [t.lote_id, t.producto_id, t.tarima_tipo_id]);
      const nextNum = numTarima.rows[0]?.next || 1;

      const lote = await query("SELECT codigo_lote, proveedor_nombre FROM lotes WHERE id = $1", [t.lote_id]);
      const abrev = lote.rows[0]?.proveedor_nombre ? lote.rows[0].proveedor_nombre.substring(0, 4).toUpperCase() : "LOTE";
      const hoy = hoyMexico().replace(/-/g, "");
      const tarimaSeq = await query("SELECT COALESCE(MAX(CAST(SPLIT_PART(codigo_qr, '-', 1) AS VARCHAR)), 'TAR0') FROM tarimas");
      const seqMatch = tarimaSeq.rows[0]?.coalesce?.match(/TAR(\d+)/);
      const nextSeq = seqMatch ? parseInt(seqMatch[1], 10) + 1 : 1;
      const codigoQrNuevo = `TAR${nextSeq}-${abrev}-${hoy}-1`;

      const nuevoPesoKg = t.peso_kg != null
        ? (cajasTransferir / Number(t.cajas_originales)) * Number(t.peso_kg)
        : null;
      const pesoRestante = t.peso_kg != null ? Number(t.peso_kg) - (nuevoPesoKg ?? 0) : null;

      await query(`
        UPDATE tarimas SET cajas_restantes = cajas_restantes - $1,
            peso_kg = COALESCE($2, peso_kg),
            estado = 'PARCIAL',
            updated_at = NOW()
        WHERE id = $3
      `, [cajasTransferir, pesoRestante, t.id]);

      const nuevo = await query(`
        INSERT INTO tarimas (lote_id, producto_id, tarima_tipo_id, numero_tarima, peso_kg, codigo_qr, estado, bodega_id, bodega_destino_id, fecha_caducidad, cajas_originales, cajas_restantes)
        VALUES ($1, $2, $3, $4, $5, $6, 'RECIBIDA', $7, $8, $9, $10, $10)
        RETURNING *
      `, [t.lote_id, t.producto_id, t.tarima_tipo_id, nextNum, nuevoPesoKg, codigoQrNuevo, t.bodega_id, t.bodega_destino_id, t.fecha_caducidad, cajasTransferir]);

      t = nuevo.rows[0];
      await cascadeLoteEstado(t.lote_id);
    }

    // Now confirm transfer for t
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
