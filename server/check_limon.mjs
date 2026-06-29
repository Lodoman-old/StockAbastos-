import { readFileSync } from 'fs';
import pg from 'pg';
const env = readFileSync('.env', 'utf8');
const m = env.match(/DATABASE_URL="?([^"\s]+)"?/);
const pool = new pg.Pool({ connectionString: m ? m[1] : 'postgresql://postgres:postgres@localhost:5432/stockabastos' });

// Check latest venta
const venta = await pool.query('SELECT * FROM ventas ORDER BY created_at DESC LIMIT 1');
console.log('=== VENTA ===', JSON.stringify(venta.rows[0], null, 2));

// Check detalles for that venta
if (venta.rows.length) {
  const detalles = await pool.query('SELECT vd.*, p.nombre FROM venta_detalles vd JOIN productos p ON p.id = vd.producto_id WHERE vd.venta_id = $1', [venta.rows[0].id]);
  console.log('=== DETALLES ===');
  for (const d of detalles.rows) console.log(JSON.stringify(d, null, 2));
}

// Check all tarimas with their lote/producto info
const tarimas = await pool.query(`
  SELECT t.id, t.codigo_qr, t.cajas_originales, t.cajas_restantes, t.estado, l.codigo_lote, p.nombre
  FROM tarimas t
  JOIN lotes l ON l.id = t.lote_id
  JOIN productos p ON p.id = l.producto_id
  ORDER BY t.id
`);
console.log('=== ALL TARIMAS ===');
for (const t of tarimas.rows) console.log(JSON.stringify(t, null, 2));

await pool.end();
