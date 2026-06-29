const { Pool } = require('pg');
const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const m = env.match(/DATABASE_URL="?([^"\s]+)"?/);
const url = m ? m[1] : 'postgresql://postgres:postgres@localhost:5432/stockabastos';
const pool = new Pool({ connectionString: url });
(async () => {
  const r = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'compra_detalles' ORDER BY ordinal_position");
  console.log(r.rows.map(c => c.column_name + ' ' + c.data_type).join('\n'));

  console.log('\n-- lotes --');
  const r2 = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'lotes' ORDER BY ordinal_position");
  console.log(r2.rows.map(c => c.column_name + ' ' + c.data_type).join('\n'));
  await pool.end();
})();
