import { readFileSync } from 'fs';
import pg from 'pg';
const env = readFileSync('.env', 'utf8');
const m = env.match(/DATABASE_URL="?([^"\s]+)"?/);
const pool = new pg.Pool({ connectionString: m ? m[1] : 'postgresql://postgres:postgres@localhost:5432/stockabastos' });
const r = await pool.query(`
  SELECT t.codigo_qr, t.cajas_originales, t.cajas_restantes, t.estado, t.updated_at, p.nombre
  FROM tarimas t
  JOIN productos p ON p.id = t.producto_id
  WHERE t.estado = 'PARCIAL'
  ORDER BY p.nombre, t.codigo_qr
`);
console.log('=== TARIMAS PARCIALES ===');
for (const row of r.rows) console.log(JSON.stringify(row));

// Also check venta_detalles for latest Fresa sale
const r2 = await pool.query(`
  SELECT vd.*, v.folio FROM venta_detalles vd
  JOIN ventas v ON v.id = vd.venta_id
  WHERE vd.producto_id IN (SELECT id FROM productos WHERE nombre = 'Fresa')
  ORDER BY v.created_at DESC, vd.id
`);
console.log('\n=== FRESA VENTA DETALLES (all) ===');
for (const row of r2.rows) console.log(JSON.stringify(row));
await pool.end();
