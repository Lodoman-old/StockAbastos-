import { readFileSync } from 'fs';
import pg from 'pg';
const env = readFileSync('.env', 'utf8');
const m = env.match(/DATABASE_URL="?([^"\s]+)"?/);
const pool = new pg.Pool({ connectionString: m ? m[1] : 'postgresql://postgres:postgres@localhost:5432/stockabastos' });
const r = await pool.query("SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_name = 'venta_detalles' AND column_name = 'cantidad_cajas'");
console.log(JSON.stringify(r.rows[0]));
await pool.end();
