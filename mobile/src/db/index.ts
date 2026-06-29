import { Capacitor } from "@capacitor/core";
import { SCHEMA_SQL } from "./schema";

// Web fallback: in-memory store (para desarrollo en navegador)
let memoryDb: Record<string, any[]> = {};
let memoryId = 0;

function initMemoryDb() {
    memoryDb = {};
    memoryId = 0;
    // Parse schema and create tables
    const tables = SCHEMA_SQL.match(/CREATE TABLE IF NOT EXISTS (\w+)/g) || [];
    for (const t of tables) {
        const name = t.replace("CREATE TABLE IF NOT EXISTS ", "");
        memoryDb[name] = [];
    }
}

function memoryQuery(table: string, where?: (row: any) => boolean): any[] {
    const rows = memoryDb[table] || [];
    return where ? rows.filter(where) : rows;
}

function memoryInsert(table: string, data: any) {
    const row = { id: ++memoryId, ...data };
    if (!memoryDb[table]) memoryDb[table] = [];
    memoryDb[table].push(row);
    return row;
}

// Real SQLite (solo en dispositivo)
let nativeDb: any = null;

export async function initDatabase() {
    if (Capacitor.isNativePlatform()) {
        const { CapacitorSQLite, SQLiteConnection } = await import("@capacitor-community/sqlite");
        const sqlite = new SQLiteConnection(CapacitorSQLite);
        const ret = await sqlite.checkConnectionsConsistency();
        const isConn = await sqlite.isConnection("stockabastos", false);

        if (ret.result && isConn.result) {
            nativeDb = await sqlite.retrieveConnection("stockabastos", false);
        } else {
            nativeDb = await sqlite.createConnection("stockabastos", false, "no-encryption", 1, false);
        }

        await nativeDb.open();
        await nativeDb.execute(SCHEMA_SQL);
    } else {
        initMemoryDb();
        console.log("📦 DB web fallback iniciada");
    }
    return true;
}

export async function execute(sql: string, params?: any[]) {
    if (nativeDb) return nativeDb.run(sql, params);
    console.log("📝 SQL (web):", sql.substring(0, 60), params);
    return { changes: { changes: 1 } };
}

export async function query(sql: string, params?: any[]) {
    if (nativeDb) {
        const res = await nativeDb.query(sql, params);
        return res.values || [];
    }

    // Parser básico para web fallback
    const upper = sql.trim().toUpperCase();
    if (upper.startsWith("SELECT")) {
        const fromMatch = sql.match(/FROM\s+(\w+)/i);
        const table = fromMatch?.[1] || "";
        const whereMatch = sql.match(/WHERE\s+(.+?)(?:ORDER BY|LIMIT|$)/i);
        let rows = memoryDb[table] || [];

        if (whereMatch) {
            const condition = whereMatch[1].trim();
            if (condition.includes("procesado = 0")) {
                rows = rows.filter((r: any) => r.procesado === 0);
            } else if (condition.includes("procesado = 1")) {
                rows = rows.filter((r: any) => r.procesado === 1);
            }
        }

        const orderMatch = sql.match(/ORDER BY\s+(\w+(?:\s+ASC|\s+DESC)?)/i);
        if (orderMatch) {
            const [col, dir] = orderMatch[1].split(" ");
            rows.sort((a: any, b: any) => {
                const cmp = (a[col] || "") > (b[col] || "") ? 1 : -1;
                return dir?.toUpperCase() === "DESC" ? -cmp : cmp;
            });
        }

        const limitMatch = sql.match(/LIMIT\s+(\d+)/i);
        if (limitMatch) {
            rows = rows.slice(0, parseInt(limitMatch[1]));
        }

        const countMatch = sql.match(/COUNT\(\*\)\s+AS\s+(\w+)/i);
        if (countMatch) {
            const alias = countMatch[1];
            return [{ [alias]: rows.length }];
        }

        return rows;
    }

    if (upper.startsWith("INSERT")) {
        const intoMatch = sql.match(/INTO\s+(\w+)/i);
        const table = intoMatch?.[1] || "";
        const valsMatch = sql.match(/VALUES\s*\(([^)]+)\)/i);
        if (valsMatch && params) {
            const row: any = {};
            const cols = sql.match(/\(([^)]+)\)\s*VALUES/i);
            if (cols) {
                const colNames = cols[1].split(",").map((c: string) => c.trim().replace(/['"]/g, ""));
                colNames.forEach((name: string, i: number) => {
                    row[name] = params[i];
                });
            } else {
                row.data = params;
            }
            memoryInsert(table, row);
        }
    }

    if (upper.startsWith("UPDATE")) {
        const updateMatch = sql.match(/UPDATE\s+(\w+)/i);
        const table = updateMatch?.[1] || "";
        const setMatch = sql.match(/SET\s+(.+?)(?:WHERE|$)/i);
        const whereMatch = sql.match(/WHERE\s+(.+?)$/i);

        if (setMatch) {
            const sets = setMatch[1].split(",").map((s: string) => s.trim());
            for (const row of memoryDb[table] || []) {
                for (const set of sets) {
                    const [col, _val] = set.split("=").map((s: string) => s.trim());
                    // Find matching param
                }
            }
        }
    }

    return [];
}

export async function executeBatch(sqls: string[]) {
    if (nativeDb) return nativeDb.execute(sqls);
    for (const sql of sqls) await execute(sql);
    return [];
}
