import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import bcrypt from "bcryptjs";
import { query } from "../db.js";

export async function authRoutes(app: FastifyInstance) {
    app.post<{ Body: { email: string; password: string } }>(
        "/login",
        async (request: FastifyRequest<{ Body: { email: string; password: string } }>, reply: FastifyReply) => {
            const { email, password } = request.body;

            if (!email || !password) {
                return reply.status(400).send({ error: "Email y contraseña requeridos" });
            }

            const result = await query(
                "SELECT * FROM usuarios WHERE email = $1 AND activo = TRUE",
                [email.toLowerCase().trim()]
            );

            if (!result.rows.length) {
                return reply.status(401).send({ error: "Credenciales inválidas" });
            }

            const user = result.rows[0];
            const valid = await bcrypt.compare(password, user.password_hash);

            if (!valid) {
                return reply.status(401).send({ error: "Credenciales inválidas" });
            }

            const rolId = user.rol_id || user.rol;
            let permisos: string[] = [];

            if (user.rol_id) {
                const perms = await query(`
                    SELECT p.clave FROM permisos p
                    JOIN rol_permisos rp ON rp.permiso_id = p.id
                    WHERE rp.rol_id = $1
                `, [user.rol_id]);
                permisos = perms.rows.map((r: any) => r.clave);
            }

            const token = app.jwt.sign({
                id: user.id,
                email: user.email,
                rol: user.rol,
                rol_id: user.rol_id,
                nombre: user.nombre,
                bodega_id: user.bodega_id,
                permisos,
            }, { expiresIn: "24h" });

            return {
                token,
                usuario: {
                    id: user.id,
                    email: user.email,
                    nombre: user.nombre,
                    rol: user.rol,
                    rol_id: user.rol_id,
                    bodega_id: user.bodega_id,
                    permisos,
                },
            };
        }
    );

    app.post<{ Body: { email: string; password: string; nombre: string; rol_id?: string; bodega_id?: string } }>(
        "/register",
        async (request, reply) => {
            const { email, password, nombre, rol_id, bodega_id } = request.body;

            if (!email || !password || !nombre) {
                return reply.status(400).send({ error: "Email, password y nombre requeridos" });
            }

            const existente = await query("SELECT id FROM usuarios WHERE email = $1", [email.toLowerCase().trim()]);
            if (existente.rows.length) {
                return reply.status(409).send({ error: "Email ya registrado" });
            }

            const password_hash = await bcrypt.hash(password, 10);
            const defaultRolId = rol_id || (await query("SELECT id FROM roles WHERE nombre = 'operario'")).rows[0]?.id;

            const result = await query(
                `INSERT INTO usuarios (email, password_hash, nombre, rol, rol_id, bodega_id)
                 VALUES ($1, $2, $3, 'operario', $4, $5) RETURNING id, email, nombre, rol, rol_id, bodega_id, created_at`,
                [email.toLowerCase().trim(), password_hash, nombre, defaultRolId, bodega_id || null]
            );

            return result.rows[0];
        }
    );

    app.get("/usuarios", async () => {
        const result = await query(`
            SELECT u.id, u.email, u.nombre, u.rol, u.rol_id, r.nombre AS rol_nombre, u.bodega_id, u.activo
            FROM usuarios u
            LEFT JOIN roles r ON r.id = u.rol_id
            ORDER BY u.nombre ASC
        `);
        return result.rows;
    });

    app.put<{ Params: { id: string }; Body: { email?: string; nombre?: string; password?: string; rol_id?: string; bodega_id?: string | null; activo?: boolean } }>(
        "/usuarios/:id",
        async (request, reply) => {
            const { id } = request.params;
            const { email, nombre, password, rol_id, bodega_id, activo } = request.body;

            const fields: string[] = [];
            const params: any[] = [];
            let idx = 1;

            if (email !== undefined) { fields.push(`email = $${idx++}`); params.push(email.toLowerCase().trim()); }
            if (nombre !== undefined) { fields.push(`nombre = $${idx++}`); params.push(nombre); }
            if (password !== undefined) {
                const password_hash = await bcrypt.hash(password, 10);
                fields.push(`password_hash = $${idx++}`);
                params.push(password_hash);
            }
            if (rol_id !== undefined) {
                fields.push(`rol_id = $${idx++}`);
                params.push(rol_id || null);
            }
            if (bodega_id !== undefined) {
                fields.push(`bodega_id = $${idx++}`);
                params.push(bodega_id || null);
            }
            if (activo !== undefined) { fields.push(`activo = $${idx++}`); params.push(activo); }

            if (!fields.length) return reply.status(400).send({ error: "Sin campos para actualizar" });

            params.push(id);
            const result = await query(
                `UPDATE usuarios SET ${fields.join(", ")} WHERE id = $${idx} RETURNING id, email, nombre, rol, rol_id, bodega_id, activo`,
                params
            );

            if (!result.rows.length) return reply.status(404).send({ error: "Usuario no encontrado" });
            return result.rows[0];
        }
    );

    app.get("/me", async (request) => {
        await request.jwtVerify();
        const payload = request.user as any;
        return {
            id: payload.id,
            email: payload.email,
            nombre: payload.nombre,
            rol: payload.rol,
            rol_id: payload.rol_id,
            bodega_id: payload.bodega_id,
            permisos: payload.permisos || [],
        };
    });
}
