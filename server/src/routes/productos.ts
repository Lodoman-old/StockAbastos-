import { FastifyInstance } from "fastify";
import { query } from "../db.js";

export async function productosRoutes(app: FastifyInstance) {
    app.get("/", async () => {
        const result = await query(
            `SELECT * FROM productos WHERE activo = TRUE ORDER BY nombre`
        );
        return result.rows;
    });

    app.get<{ Params: { id: string } }>("/:id", async (request) => {
        const result = await query("SELECT * FROM productos WHERE id = $1", [request.params.id]);
        if (!result.rows.length) return { error: "Producto no encontrado" };
        return result.rows[0];
    });

    app.post<{
        Body: {
            sku: string;
            nombre: string;
            unidad_compra: string;
            codigo_de_barras?: string;
            precio_por_unidad?: number;
            precio_mayoreo_kg?: number;
            precio_menudeo_kg?: number;
            precio_caja_sellada?: number;
            peso_caja_sellada_kg?: number;
            destare_kg?: number;
            modalidad_caja_pesada?: boolean;
            modalidad_caja_sellada?: boolean;
            modalidad_kilo_suelto?: boolean;
            modalidad_unidad?: boolean;
        }
    }>("/", async (request) => {
        const {
            sku, nombre, unidad_compra,
            codigo_de_barras, precio_por_unidad,
            precio_mayoreo_kg, precio_menudeo_kg,
            precio_caja_sellada, peso_caja_sellada_kg, destare_kg,
            modalidad_caja_pesada, modalidad_caja_sellada,
            modalidad_kilo_suelto, modalidad_unidad,
        } = request.body;
        const result = await query(
            `INSERT INTO productos (sku, nombre, unidad_compra, codigo_de_barras, precio_por_unidad,
                precio_mayoreo_kg, precio_menudeo_kg, precio_caja_sellada, peso_caja_sellada_kg, destare_kg,
                modalidad_caja_pesada, modalidad_caja_sellada, modalidad_kilo_suelto, modalidad_unidad)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
            [
                sku, nombre, unidad_compra, codigo_de_barras || null, precio_por_unidad || null,
                precio_mayoreo_kg || null, precio_menudeo_kg || null, precio_caja_sellada || null,
                peso_caja_sellada_kg || null, destare_kg ?? 2.0,
                modalidad_caja_pesada ?? false, modalidad_caja_sellada ?? false,
                modalidad_kilo_suelto ?? false, modalidad_unidad ?? false,
            ]
        );
        return result.rows[0];
    });

    app.put<{
        Params: { id: string };
        Body: {
            sku?: string;
            nombre?: string;
            unidad_compra?: string;
            codigo_de_barras?: string | null;
            precio_por_unidad?: number | null;
            precio_mayoreo_kg?: number | null;
            precio_menudeo_kg?: number | null;
            precio_caja_sellada?: number | null;
            peso_caja_sellada_kg?: number | null;
            destare_kg?: number | null;
            modalidad_caja_pesada?: boolean;
            modalidad_caja_sellada?: boolean;
            modalidad_kilo_suelto?: boolean;
            modalidad_unidad?: boolean;
        }
    }>("/:id", async (request, reply) => {
        const { id } = request.params;
        const body = request.body;

        const fields: string[] = [];
        const values: any[] = [];
        let idx = 1;

        const map: Record<string, string> = {
            sku: "sku", nombre: "nombre", unidad_compra: "unidad_compra",
            codigo_de_barras: "codigo_de_barras", precio_por_unidad: "precio_por_unidad",
            precio_mayoreo_kg: "precio_mayoreo_kg", precio_menudeo_kg: "precio_menudeo_kg",
            precio_caja_sellada: "precio_caja_sellada",
            peso_caja_sellada_kg: "peso_caja_sellada_kg", destare_kg: "destare_kg",
            modalidad_caja_pesada: "modalidad_caja_pesada", modalidad_caja_sellada: "modalidad_caja_sellada",
            modalidad_kilo_suelto: "modalidad_kilo_suelto", modalidad_unidad: "modalidad_unidad",
        };

        for (const [key, col] of Object.entries(map)) {
            if ((body as any)[key] !== undefined) {
                fields.push(`${col} = $${idx++}`);
                values.push((body as any)[key]);
            }
        }

        if (!fields.length) return reply.status(400).send({ error: "No hay campos para actualizar" });

        values.push(id);
        const result = await query(
            `UPDATE productos SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
            values
        );
        if (!result.rows.length) return reply.status(404).send({ error: "Producto no encontrado" });
        return result.rows[0];
    });
}
