import { readFileSync } from 'fs';
import pg from 'pg';
const env = readFileSync('.env', 'utf8');
const m = env.match(/DATABASE_URL="?([^"\s]+)"?/);
const pool = new pg.Pool({ connectionString: m ? m[1] : 'postgresql://postgres:postgres@localhost:5432/stockabastos' });

const loteId = '88d0c402-55b0-4be5-9ed5-ea318f67dc74';
const parentId = '872c74fd-5bb3-40d4-82a4-d1e6fa29c6c4';

const hijo = await pool.query(`
  WITH tarima_counts AS (
    SELECT
      COUNT(*) FILTER (WHERE estado = 'PENDIENTE') AS pendientes,
      COUNT(*) FILTER (WHERE estado IN ('RECIBIDA','PARCIAL')) AS disponibles
    FROM tarimas WHERE lote_id = $1
  )
  UPDATE lotes
  SET estado = CASE
    WHEN tc.pendientes > 0 THEN 'PENDIENTE'::estado_lote
    WHEN tc.disponibles > 0 THEN 'RECIBIDO'::estado_lote
    ELSE 'VENDIDO'::estado_lote
  END
  FROM tarima_counts tc
  WHERE lotes.id = $1
  RETURNING lotes.id, lotes.estado
`, [loteId]);
console.log('Hijo actualizado:', JSON.stringify(hijo.rows[0], null, 2));

const padre = await pool.query(`
  WITH hijo_counts AS (
    SELECT
      COUNT(*) FILTER (WHERE estado = 'PENDIENTE'::estado_lote) AS pendientes,
      COUNT(*) FILTER (WHERE estado IN ('RECIBIDO'::estado_lote,'VENDIDO'::estado_lote,'TRASPASADO'::estado_lote,'COMPLETADO'::estado_lote)) AS finalizados,
      (SELECT COUNT(*) FROM lotes WHERE lote_padre_id = $1) AS total
    FROM lotes WHERE lote_padre_id = $1
  )
  UPDATE lotes
  SET estado = CASE
    WHEN hc.pendientes > 0 THEN 'PENDIENTE'::estado_lote
    WHEN hc.finalizados = hc.total THEN 'COMPLETADO'::estado_lote
    ELSE 'RECIBIDO'::estado_lote
  END
  FROM hijo_counts hc
  WHERE lotes.id = $1
  RETURNING lotes.id, lotes.estado
`, [parentId]);
console.log('Padre actualizado:', JSON.stringify(padre.rows[0], null, 2));

const verif = await pool.query('SELECT id, codigo_qr, cajas_originales, cajas_restantes, estado FROM tarimas WHERE id = \'a61a449d-dfe9-46e9-ae3b-b3aa76da540c\'');
console.log('Verificacion tarima:', JSON.stringify(verif.rows[0], null, 2));

await pool.end();
