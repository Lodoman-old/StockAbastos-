import pg from "pg";
const pool = new pg.Pool({
  connectionString: "postgresql://neondb_owner:npg_jXfyroUJv18i@ep-gentle-tooth-ajcpvw3b-pooler.c-3.us-east-2.aws.neon.tech/neondb?sslmode=require",
  max: 1,
});

const tables = ["bodegas", "productos", "lotes", "stock_bodega", "usuarios"];
for (const t of tables) {
  const r = await pool.query(`SELECT count(*)::int as cnt FROM ${t}`);
  console.log(`${t}: ${r.rows[0].cnt} registros`);
}
await pool.end();
