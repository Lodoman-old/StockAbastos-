import { readFileSync } from 'fs';
import pg from 'pg';
const env = readFileSync('.env', 'utf8');
const m = env.match(/DATABASE_URL="?([^"\s]+)"?/);
const pool = new pg.Pool({ connectionString: m ? m[1] : 'postgresql://postgres:postgres@localhost:5432/stockabastos' });

// TAR1: restore to full RECIBIDA
await pool.query("UPDATE tarimas SET cajas_restantes = 56.00, estado = 'RECIBIDA', updated_at = NOW() WHERE codigo_qr = 'TAR1-FRES-20260627-1'");
console.log('TAR1 restored to RECIBIDA 56.00');

// TAR7: add the 0.5 caja deduction (53 - 0.5 = 52.5)
await pool.query("UPDATE tarimas SET cajas_restantes = 52.50, estado = 'PARCIAL', updated_at = NOW() WHERE codigo_qr = 'TAR7-FRES-20260627-7'");
console.log('TAR7 updated to PARCIAL 52.50');

// Verify
const r = await pool.query("SELECT codigo_qr, cajas_restantes, estado FROM tarimas WHERE producto_id = (SELECT id FROM productos WHERE nombre = 'Fresa') ORDER BY codigo_qr");
for (const row of r.rows) console.log(JSON.stringify(row));

await pool.end();
