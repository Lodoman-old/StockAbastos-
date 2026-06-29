import { FastifyInstance } from "fastify";
import { query } from "../db.js";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, "..", "..", "uploads");

export async function configuracionRoutes(app: FastifyInstance) {
    app.get("/", async () => {
        const result = await query("SELECT clave, valor FROM configuracion ORDER BY clave");
        const config: Record<string, string> = {};
        for (const row of result.rows) {
            config[row.clave] = row.valor;
        }
        return config;
    });

    app.put("/", async (request: any, reply) => {
        const body = request.body as Record<string, string>;
        for (const [clave, valor] of Object.entries(body)) {
            await query(
                "INSERT INTO configuracion (clave, valor, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (clave) DO UPDATE SET valor = $2, updated_at = NOW()",
                [clave, valor]
            );
        }
        return { ok: true };
    });

    app.post("/upload-logo", async (request: any, reply) => {
        const data = await request.file();
        if (!data) return reply.status(400).send({ error: "No se recibió archivo" });

        const ext = path.extname(data.filename) || ".png";
        const filename = `logo_${Date.now()}${ext}`;
        const filepath = path.join(uploadsDir, filename);

        const chunks: Buffer[] = [];
        for await (const chunk of data.file) chunks.push(chunk);
        const buffer = Buffer.concat(chunks);

        fs.writeFileSync(filepath, buffer);

        const logoUrl = `/uploads/${filename}`;
        await query(
            "INSERT INTO configuracion (clave, valor, updated_at) VALUES ('logo_url', $1, NOW()) ON CONFLICT (clave) DO UPDATE SET valor = $1, updated_at = NOW()",
            [logoUrl]
        );

        return { logo_url: logoUrl };
    });
}
