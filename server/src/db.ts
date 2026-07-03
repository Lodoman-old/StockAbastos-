import pg from "pg";
import { config } from "./config.js";

const timezoneParam = "options=-c%20timezone%3DAmerica%2FMexico_City";
const connStr = config.databaseUrl.includes("?")
    ? config.databaseUrl + "&" + timezoneParam
    : config.databaseUrl + "?" + timezoneParam;

const pool = new pg.Pool({ connectionString: connStr });

pool.on("error", (err) => {
    console.error("Unexpected error on idle client", err);
});

export async function query<T extends pg.QueryResultRow = any>(text: string, params?: any[]): Promise<pg.QueryResult<T>> {
    const client = await pool.connect();
    try {
        return await client.query<T>(text, params);
    } finally {
        client.release();
    }
}

export async function transaction<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const result = await fn(client);
        await client.query("COMMIT");
        return result;
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
}

export default pool;
