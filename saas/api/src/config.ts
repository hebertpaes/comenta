import { z } from "zod";

const Env = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  APP_URL: z.string().default("http://localhost:5173"),
  API_URL: z.string().default("http://localhost:4000"),
  DATABASE_URL: z
    .string()
    .default("postgresql://comenta:comenta123@localhost:5432/comenta_saas"),
  REDIS_URL: z.string().default("redis://:comenta123@localhost:6379"),
  JWT_SECRET: z.string().default("dev-secret-change-me"),
  JWT_REFRESH_SECRET: z.string().default("dev-refresh-secret-change-me"),
  ACCESS_TOKEN_TTL: z.string().default("15m"),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().default(30),
  CORS_ORIGINS: z.string().default("http://localhost:5173"),
});

export const config = Env.parse(process.env);

export const corsOrigins = config.CORS_ORIGINS.split(",").map((s) => s.trim());

if (config.NODE_ENV === "production" && config.JWT_SECRET.startsWith("dev-")) {
  throw new Error("JWT_SECRET de desenvolvimento não pode ser usado em produção");
}
