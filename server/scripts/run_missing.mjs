import pg from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pool = new pg.Pool({
  connectionString: "postgresql://sa_user:sa_pass_2026@localhost:5435/stockabastos",
});

const migs = ["030_impresion.sql", "031_permisos_faltantes.sql"];

for (const f of migs) {
  const sql = fs.readFileSync(path.resolve(__dirname, "..", "..", "database", "migrations", f), "utf8");
  try {
    await pool.query(sql);
    console.log(`✓ ${f}`);
  } catch (e) {
    console.log(`✗ ${f}: ${e.message}`);
  }
}

const r = await pool.query(
  "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('impresoras','cola_impresion')"
);
console.log("Tablas creadas:", r.rows.map((r) => r.table_name).join(", ") || "ninguna");
await pool.end();
