const { Pool } = require('pg');
const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const m = env.match(/DATABASE_URL="?([^"\s]+)"?/);
const url = m ? m[1] : 'postgresql://postgres:postgres@localhost:5432/stockabastos';
const pool = new Pool({ connectionString: url });
const sql = fs.readFileSync('../database/migrations/020_cleanup.sql', 'utf8');
(async () => {
  try {
    await pool.query(sql);
    console.log('OK: migration 020_cleanup applied');
  } catch(e) { console.error('ERROR:', e.message); }
  await pool.end();
})();
