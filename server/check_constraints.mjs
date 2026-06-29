import { readFileSync } from 'fs';
import pg from 'pg';
const env = readFileSync('.env', 'utf8');
const m = env.match(/DATABASE_URL="?([^"\s]+)"?/);
const pool = new pg.Pool({ connectionString: m ? m[1] : 'postgresql://postgres:postgres@localhost:5432/stockabastos' });
const r = await pool.query(`
  SELECT conname, pg_get_constraintdef(oid) AS def
  FROM pg_constraint WHERE conrelid = 'venta_detalles'::regclass
`);
for (const row of r.rows) {
  console.log(row.conname, '=>', row.def);
}
await pool.end();
