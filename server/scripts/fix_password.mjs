import pg from "pg";

const pool = new pg.Pool({
  connectionString:
    "postgresql://neondb_owner:npg_jXfyroUJv18i@ep-gentle-tooth-ajcpvw3b-pooler.c-3.us-east-2.aws.neon.tech/neondb?sslmode=require",
  max: 1,
});

const hash = "$2a$10$zq25mMRrZ/Zq6FwJt1rtG..rAQ8XMtePfLMhUeFI8abzJOvIrJXty";
const r = await pool.query(
  "UPDATE usuarios SET password_hash = $1 WHERE email = $2",
  [hash, "admin@stockabastos.com"]
);
console.log("Updated:", r.rowCount, "rows");

const r2 = await pool.query(
  "SELECT email, substring(password_hash, 1, 20) as hash_prefix FROM usuarios"
);
for (const row of r2.rows) {
  console.log(row.email, row.hash_prefix);
}
await pool.end();
