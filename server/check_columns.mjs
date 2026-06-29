import { readFileSync } from 'fs';
import pg from 'pg';
const env = readFileSync('.env', 'utf8');
const m = env.match(/DATABASE_URL="?([^"\s]+)"?/);
const pool = new pg.Pool({ connectionString: m ? m[1] : 'postgresql://postgres:postgres@localhost:5432/stockabastos' });
const r = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'venta_detalles' ORDER BY ordinal_position");
for (const row of r.rows) console.log(row.column_name, row.data_type);
await pool.end();
