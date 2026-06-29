import { readFileSync } from 'fs';
import pg from 'pg';
const env = readFileSync('.env', 'utf8');
const m = env.match(/DATABASE_URL="?([^"\s]+)"?/);
const pool = new pg.Pool({ connectionString: m ? m[1] : 'postgresql://postgres:postgres@localhost:5432/stockabastos' });

// Update based on actual tarima deductions
await pool.query(`
  UPDATE venta_detalles SET cantidad_cajas = 3
  WHERE id = 'ab740d66-862b-4806-9d98-c94fb3bd3e4c'
`);
await pool.query(`
  UPDATE venta_detalles SET cantidad_cajas = 2
  WHERE id = '44de6f3e-47c2-47a9-a30f-a799971dbeb2'
`);

const r = await pool.query('SELECT id, cantidad_cajas FROM venta_detalles ORDER BY id');
for (const row of r.rows) console.log(JSON.stringify(row));
await pool.end();
