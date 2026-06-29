import { readFileSync } from 'fs';
import pg from 'pg';
const env = readFileSync('.env', 'utf8');
const m = env.match(/DATABASE_URL="?([^"\s]+)"?/);
const pool = new pg.Pool({ connectionString: m ? m[1] : 'postgresql://postgres:postgres@localhost:5432/stockabastos' });

// Backfill cantidad_cajas for existing records where it's NULL
// For caja sellada items (null kg, null cajas, null unidades -> assume 1 caja)
await pool.query(`
  UPDATE venta_detalles SET cantidad_cajas = 1
  WHERE cantidad_cajas IS NULL AND cantidad_kg IS NULL AND cantidad_unidades IS NULL
`);
console.log('Updated CS items with null all -> 1 caja');

// For CP items (has cantidad_kg but no cantidad_cajas), derive from tarima deduction
// We can't know exact, set to 1 as fallback (most common single-caja sale)
await pool.query(`
  UPDATE venta_detalles SET cantidad_cajas = 1
  WHERE cantidad_cajas IS NULL AND cantidad_kg IS NOT NULL
`);
console.log('Updated CP items with no cajas -> 1 caja');

// Verify
const r = await pool.query('SELECT id, cantidad_kg, cantidad_cajas, cantidad_unidades FROM venta_detalles');
for (const row of r.rows) console.log(JSON.stringify(row));
await pool.end();
