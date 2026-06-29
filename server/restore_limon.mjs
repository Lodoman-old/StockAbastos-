import { readFileSync } from 'fs';
import pg from 'pg';
const env = readFileSync('.env', 'utf8');
const m = env.match(/DATABASE_URL="?([^"\s]+)"?/);
const pool = new pg.Pool({ connectionString: m ? m[1] : 'postgresql://postgres:postgres@localhost:5432/stockabastos' });

const tarimaId = 'a61a449d-dfe9-46e9-ae3b-b3aa76da540c';
const ventaId = 'b32119fe-947f-4e4a-9667-c6b7e36f8560';

// Get tarima details
const tarima = await pool.query('SELECT * FROM tarimas WHERE id = $1', [tarimaId]);
console.log('Tarima:', JSON.stringify(tarima.rows[0], null, 2));

// Get lote info
const lote = await pool.query('SELECT * FROM lotes WHERE id = $1', [tarima.rows[0].lote_id]);
console.log('Lote:', JSON.stringify(lote.rows[0], null, 2));

// Delete venta_detalles (if any) and venta
await pool.query('DELETE FROM venta_detalles WHERE venta_id = $1', [ventaId]);
await pool.query('DELETE FROM pagos WHERE venta_id = $1', [ventaId]);
await pool.query('DELETE FROM ventas WHERE id = $1', [ventaId]);
console.log('Venta eliminada');

// Restore tarima
await pool.query(
  "UPDATE tarimas SET cajas_restantes = cajas_originales, estado = 'RECIBIDA' WHERE id = $1",
  [tarimaId]
);
console.log('Tarima restaurada a RECIBIDA con cajas_restantes = cajas_originales');

// Run cascadeLoteEstado
const loteId = tarima.rows[0].lote_id;
// The function cascadeLoteEstado exists in the DB
await pool.query('UPDATE lotes SET estado = lote_padre_id FROM (SELECT id FROM lotes WHERE id = $1) sub WHERE lotes.id = $1', [loteId]);
// Actually, let's just call the function properly
const updateLote = await pool.query(`
  WITH tarima_counts AS (
    SELECT
      COUNT(*) FILTER (WHERE estado = 'PENDIENTE') AS pendientes,
      COUNT(*) FILTER (WHERE estado IN ('RECIBIDA','PARCIAL')) AS disponibles
    FROM tarimas WHERE lote_id = $1
  )
  UPDATE lotes
  SET estado = CASE
    WHEN tarima_counts.pendientes > 0 THEN 'PENDIENTE'
    WHEN tarima_counts.disponibles > 0 THEN 'RECIBIDO'
    ELSE 'VENDIDO'
  END
  FROM tarima_counts
  WHERE lotes.id = $1
  RETURNING lotes.id, lotes.estado
`, [loteId]);
console.log('Lote actualizado:', JSON.stringify(updateLote.rows[0], null, 2));

// Also update parent lote if any
const loteRow = lote.rows[0];
if (loteRow.lote_padre_id) {
  const parentUpdate = await pool.query(`
    WITH hijo_counts AS (
      SELECT
        COUNT(*) FILTER (WHERE estado = 'PENDIENTE') AS pendientes,
        COUNT(*) FILTER (WHERE estado IN ('RECIBIDO','VENDIDO','TRASPASADO','COMPLETADO')) AS finalizados
      FROM lotes WHERE lote_padre_id = $1
    )
    UPDATE lotes
    SET estado = CASE
      WHEN hijo_counts.pendientes > 0 THEN 'PENDIENTE'
      WHEN hijo_counts.finalizados = (SELECT COUNT(*) FROM lotes WHERE lote_padre_id = $1) THEN 'COMPLETADO'
      ELSE 'RECIBIDO'
    END
    FROM hijo_counts
    WHERE lotes.id = $1
    RETURNING lotes.id, lotes.estado
  `, [loteRow.lote_padre_id]);
  console.log('Padre actualizado:', JSON.stringify(parentUpdate.rows[0], null, 2));
}

// Verify
const verif = await pool.query('SELECT * FROM tarimas WHERE id = $1', [tarimaId]);
console.log('Verificación tarima:', JSON.stringify(verif.rows[0], null, 2));

await pool.end();
