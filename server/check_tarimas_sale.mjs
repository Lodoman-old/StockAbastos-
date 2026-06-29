import { readFileSync } from 'fs';
import pg from 'pg';
const env = readFileSync('.env', 'utf8');
const m = env.match(/DATABASE_URL="?([^"\s]+)"?/);
const pool = new pg.Pool({ connectionString: m ? m[1] : 'postgresql://postgres:postgres@localhost:5432/stockabastos' });

// Check tarimas that were affected by this sale
const r = await pool.query(`
  SELECT t.codigo_qr, t.cajas_originales, t.cajas_restantes, t.estado, p.nombre
  FROM tarimas t
  JOIN productos p ON p.id = t.producto_id
  WHERE t.updated_at >= '2026-06-27' AND t.estado IN ('PARCIAL','VENDIDA')
  ORDER BY t.updated_at DESC
`);
console.log('=== Tarimas with changes today ===');
for (const row of r.rows) {
  const deducidas = parseFloat(row.cajas_originales) - parseFloat(row.cajas_restantes);
  console.log(`${row.nombre}: ${row.codigo_qr} orig=${row.cajas_originales} rest=${row.cajas_restantes} ded=${deducidas} est=${row.estado}`);
}

// Also check if any are sold out
const r2 = await pool.query(`
  SELECT t.codigo_qr, t.cajas_originales, t.cajas_restantes, t.estado, p.nombre
  FROM tarimas t
  JOIN productos p ON p.id = t.producto_id
  WHERE t.updated_at >= '2026-06-27' AND t.estado = 'VENDIDA'
`);
console.log('\n=== VENDIDAS ===');
for (const row of r2.rows) console.log(`${row.nombre}: ${row.codigo_qr} orig=${row.cajas_originales}`);

await pool.end();
