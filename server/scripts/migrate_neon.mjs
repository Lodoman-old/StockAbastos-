import pg from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbUrl = "postgresql://neondb_owner:npg_jXfyroUJv18i@ep-gentle-tooth-ajcpvw3b-pooler.c-3.us-east-2.aws.neon.tech/neondb?sslmode=require";
const migDir = path.resolve(__dirname, "..", "..", "database", "migrations");
const files = fs.readdirSync(migDir).filter(f => f.endsWith(".sql")).sort();

const pool = new pg.Pool({ connectionString: dbUrl, max: 1 });

for (const f of files) {
  const sql = fs.readFileSync(path.join(migDir, f), "utf8");
  process.stdout.write(`Ejecutando ${f}...`);
  try {
    await pool.query(sql);
    console.log(" OK");
  } catch (e) {
    console.log(` ERROR: ${e.message}`);
  }
}

await pool.end();
console.log("\nMigraciones completadas.");
