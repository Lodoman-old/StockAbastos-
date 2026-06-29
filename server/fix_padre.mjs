import { readFileSync } from 'fs';
import pg from 'pg';
const env = readFileSync('.env', 'utf8');
const m = env.match(/DATABASE_URL="?([^"\s]+)"?/);
const pool = new pg.Pool({ connectionString: m ? m[1] : 'postgresql://postgres:postgres@localhost:5432/stockabastos' });

const parentId = '872c74fd-5bb3-40d4-82a4-d1e6fa29c6c4';

// Check all hijos
const hijos = await pool.query('SELECT id, codigo_lote, estado FROM lotes WHERE lote_padre_id = $1', [parentId]);
console.log('Hijos:', JSON.stringify(hijos.rows, null, 2));

// Set parent to RECIBIDO (hijos have tarimas disponibles)
await pool.query("UPDATE lotes SET estado = 'RECIBIDO'::estado_lote WHERE id = $1", [parentId]);

const verif = await pool.query('SELECT id, codigo_lote, estado FROM lotes WHERE id = $1', [parentId]);
console.log('Padre actualizado:', JSON.stringify(verif.rows[0], null, 2));

await pool.end();
