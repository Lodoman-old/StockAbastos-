import { readFileSync } from 'fs';
import pg from 'pg';
const env = readFileSync('.env', 'utf8');
const m = env.match(/DATABASE_URL="?([^"\s]+)"?/);
const pool = new pg.Pool({ connectionString: m ? m[1] : 'postgresql://postgres:postgres@localhost:5432/stockabastos' });
// Check exact cajas_restantes precision
const r = await pool.query("SELECT id, codigo_qr, cajas_originales, cajas_restantes::text, estado, updated_at FROM tarimas WHERE producto_id = (SELECT id FROM productos WHERE nombre = 'Fresa') ORDER BY codigo_qr");
for (const row of r.rows) console.log(JSON.stringify(row));
await pool.end();
