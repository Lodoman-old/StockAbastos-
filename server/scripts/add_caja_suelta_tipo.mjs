import pg from "pg";
const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://sa_user:sa_pass_2026@localhost:5435/stockabastos",
});
async function main() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("ALTER TABLE tarimas_tipos DROP CONSTRAINT IF EXISTS tarimas_tipos_cantidad_cajas_check");
    await client.query("ALTER TABLE tarimas_tipos ADD CONSTRAINT tarimas_tipos_cantidad_cajas_check CHECK (cantidad_cajas >= 0)");
    const existing = await client.query("SELECT id FROM tarimas_tipos WHERE nombre = 'Caja suelta'");
    if (existing.rows.length === 0) {
      await client.query("INSERT INTO tarimas_tipos (nombre, cantidad_cajas) VALUES ('Caja suelta', 0)");
      console.log("Creado tipo 'Caja suelta'");
    } else {
      console.log("El tipo 'Caja suelta' ya existe");
    }
    await client.query("COMMIT");
    console.log("OK");
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("Error:", e.message);
  } finally {
    client.release();
    await pool.end();
  }
}
main();
