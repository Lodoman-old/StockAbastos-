import pg from 'pg';
const pool = new pg.Pool({connectionString: 'postgresql://neondb_owner:npg_jXfyroUJv18i@ep-gentle-tooth-ajcpvw3b-pooler.c-3.us-east-2.aws.neon.tech/neondb?sslmode=require'});
try {
  const r = await pool.query("SELECT id, folio FROM ventas WHERE folio = 'MAY-20260702-0002'");
  console.log(r.rows.length > 0 ? 'AUN EXISTE' : 'NO EXISTE');
} catch(e) { console.error(e.message); }
await pool.end();
