import { readFileSync } from 'fs';
import pg from 'pg';
const env = readFileSync('.env', 'utf8');
const m = env.match(/DATABASE_URL="?([^"\s]+)"?/);
const pool = new pg.Pool({ connectionString: m ? m[1] : 'postgresql://postgres:postgres@localhost:5432/stockabastos' });
// Check Fresa tarimas
const r = await pool.query(`
  SELECT t.*, l.codigo_lote FROM tarimas t
  JOIN lotes l ON l.id = t.lote_id
  JOIN productos p ON p.id = l.producto_id
  WHERE p.nombre = 'Fresa'
  ORDER BY t.id
`);
for (const row of r.rows) console.log(JSON.stringify(row, null, 2));

// Check latest sale detalles for Fresa
const r2 = await pool.query(`
  SELECT vd.*, v.folio, p.nombre FROM venta_detalles vd
  JOIN ventas v ON v.id = vd.venta_id
  JOIN productos p ON p.id = vd.producto_id
  WHERE p.nombre = 'Fresa'
  ORDER BY v.created_at DESC LIMIT 5
`);
console.log('=== FRESA VENTA DETALLES ===');
for (const row of r2.rows) console.log(JSON.stringify(row, null, 2));

// Check how many cajas restantes the tarimas had BEFORE the latest deduction
const r3 = await pool.query(`
  SELECT t.codigo_qr, t.cajas_originales, t.cajas_restantes, t.estado
  FROM tarimas t
  JOIN lotes l ON l.id = t.lote_id
  JOIN productos p ON p.id = l.producto_id
  WHERE p.nombre = 'Fresa'
`);
console.log('=== FRESA TARIMAS ===');
for (const row of r3.rows) console.log(JSON.stringify(row));
await pool.end();
