import { readFileSync } from 'fs';
import pg from 'pg';
const env = readFileSync('.env', 'utf8');
const m = env.match(/DATABASE_URL="?([^"\s]+)"?/);
const pool = new pg.Pool({ connectionString: m ? m[1] : 'postgresql://postgres:postgres@localhost:5432/stockabastos' });
const r = await pool.query(`
  SELECT vd.*, p.nombre FROM venta_detalles vd
  JOIN productos p ON p.id = vd.producto_id
  ORDER BY vd.venta_id, vd.id
`);
for (const row of r.rows) console.log(JSON.stringify(row, null, 2));
await pool.end();
