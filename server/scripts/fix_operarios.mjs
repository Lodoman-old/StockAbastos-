import pg from "pg";
import bcrypt from "bcryptjs";
const pool = new pg.Pool({
  connectionString: "postgresql://neondb_owner:npg_jXfyroUJv18i@ep-gentle-tooth-ajcpvw3b-pooler.c-3.us-east-2.aws.neon.tech/neondb?sslmode=require",
  max: 1,
});

const users = [
  { email: "operario1@stockabastos.com", password: "operario123" },
  { email: "operario2@stockabastos.com", password: "operario123" },
];

for (const u of users) {
  const hash = await bcrypt.hash(u.password, 10);
  const r = await pool.query(
    "UPDATE usuarios SET password_hash = $1 WHERE email = $2 RETURNING id, email, nombre",
    [hash, u.email]
  );
  if (r.rows.length) {
    console.log(`${u.email} → ${u.password} (${r.rows[0].nombre})`);
  } else {
    console.log(`${u.email} → NO ENCONTRADO`);
  }
}

await pool.end();
