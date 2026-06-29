import pg from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbUrl = "postgresql://neondb_owner:npg_jXfyroUJv18i@ep-gentle-tooth-ajcpvw3b-pooler.c-3.us-east-2.aws.neon.tech/neondb?sslmode=require";
const pool = new pg.Pool({ connectionString: dbUrl, max: 1 });

const sql = fs.readFileSync(path.resolve(__dirname, "..", "..", "database", "migrations", "032_missing_tables.sql"), "utf8");
try {
  await pool.query(sql);
  console.log("032_missing_tables.sql: OK");
} catch (e) {
  console.log("032 ERROR:", e.message);
}

// Verify tables exist
const r = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('clientes','compras','compra_detalles','gastos','pagos','precios_diarios','tarimas_tipos','prestamo_cajas','mostrador_stock','configuracion')");
console.log("Tablas creadas:", r.rows.map(t => t.table_name).join(", "));

await pool.end();
