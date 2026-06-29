const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:Aboli82312985@localhost:5435/stockabastos' });
(async() => {
  const v = await pool.query("SELECT id, folio, cliente_id, tipo_pago, saldo_pendiente FROM ventas WHERE tipo_pago = 'credito'");
  console.log('Credit ventas:', JSON.stringify(v.rows, null, 2));
  const c = await pool.query('SELECT id, nombre FROM clientes');
  console.log('Clientes:', JSON.stringify(c.rows, null, 2));
  await pool.end();
})();
