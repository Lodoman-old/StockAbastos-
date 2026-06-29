import "dotenv/config";

export const config = {
    port: parseInt(process.env.PORT || "4000", 10),
    databaseUrl: process.env.DATABASE_URL || "postgresql://sa_user:sa_pass_2026@localhost:5432/stockabastos",
    jwtSecret: process.env.JWT_SECRET || "dev_secret",
};
