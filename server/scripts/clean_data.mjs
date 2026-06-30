import pg from "pg";
const pool = new pg.Pool({
  connectionString: "postgresql://neondb_owner:npg_jXfyroUJv18i@ep-gentle-tooth-ajcpvw3b-pooler.c-3.us-east-2.aws.neon.tech/neondb?sslmode=require",
  max: 1,
});

const tables = [
  "lotes", "stock_bodega", "ventas", "venta_detalles", "compras", "compra_detalles",
  "pagos", "gastos", "cortes", "traspasos", "traspaso_detalles", "movimientos",
  "prestamo_cajas", "mostrador_stock", "precios_diarios", "tarimas", "ventas_pausadas",
  "cola_impresion", "sync_batches", "sync_snapshots"
];

for (const t of tables) {
  try {
    const r = await pool.query(`DELETE FROM ${t}`);
    console.log(`${t}: ${r.rowCount} eliminados`);
  } catch (e) {
    console.log(`${t}: ERROR - ${e.message}`);
  }
}

console.log("\nDatos conservados: bodegas, productos, clientes, proveedores, usuarios");
await pool.end();
