import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

declare module "fastify" {
    interface FastifyRequest {
        usuario: {
            id: string;
            email: string;
            rol: string;
            nombre: string;
            bodega_id?: string;
        };
    }
}

export async function authPlugin(app: FastifyInstance) {
    app.decorate("authenticate", async function (request: FastifyRequest, reply: FastifyReply) {
        try {
            await request.jwtVerify();
            request.usuario = request.user as any;
        } catch {
            reply.status(401).send({ error: "No autorizado" });
        }
    });

    app.decorate("requireRol", (...roles: string[]) => {
        return async function (request: FastifyRequest, reply: FastifyReply) {
            try {
                await request.jwtVerify();
                const user = request.user as any;
                if (!roles.includes(user.rol)) {
                    return reply.status(403).send({ error: `Acceso restringido: rol ${user.rol} no autorizado` });
                }
                request.usuario = user;
            } catch {
                reply.status(401).send({ error: "No autorizado" });
            }
        };
    });
}
