import pg from "pg";
const pool = new pg.Pool({
  connectionString: "postgresql://neondb_owner:npg_jXfyroUJv18i@ep-gentle-tooth-ajcpvw3b-pooler.c-3.us-east-2.aws.neon.tech/neondb?sslmode=require",
  max: 1,
});
const r = await pool.query(
  "SELECT column_name, is_nullable, column_default FROM information_schema.columns WHERE table_name = 'lotes' ORDER BY ordinal_position"
);
for (const c of r.rows) {
  console.log(c.column_name, c.is_nullable, c.column_default || "-");
}
await pool.end();
