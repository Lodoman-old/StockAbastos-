const { query } = await import("./src/db.js");
const fs = await import("fs/promises");
const sql = await fs.readFile("../database/migrations/019_tarimas.sql", "utf-8");
try {
  await query(sql);
  console.log("Migration 019 applied OK");
} catch(e) { console.log("Error:", e.message); }
process.exit(0);
