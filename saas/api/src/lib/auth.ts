import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { and, eq, isNull } from "drizzle-orm";
import { config } from "../config.js";
import { db, schema } from "../db/client.js";

export type Principal = {
  userId: string | null; // null quando autenticado via API key
  companyId: string;
  role: "admin" | "agent" | "api";
  name: string;
};

export const hashPassword = (plain: string) => bcrypt.hash(plain, 10);
export const verifyPassword = (plain: string, hash: string) => bcrypt.compare(plain, hash);

export function signAccessToken(p: { userId: string; companyId: string; role: string; name: string }) {
  return jwt.sign(
    { sub: p.userId, companyId: p.companyId, role: p.role, name: p.name },
    config.JWT_SECRET,
    { expiresIn: config.ACCESS_TOKEN_TTL as jwt.SignOptions["expiresIn"] }
  );
}

export function verifyAccessToken(token: string): Principal {
  const d = jwt.verify(token, config.JWT_SECRET) as jwt.JwtPayload;
  return {
    userId: String(d.sub),
    companyId: String(d.companyId),
    role: d.role as Principal["role"],
    name: String(d.name ?? ""),
  };
}

const sha256 = (v: string) => crypto.createHash("sha256").update(v).digest("hex");

export async function issueRefreshToken(userId: string) {
  const raw = crypto.randomBytes(48).toString("base64url");
  const expiresAt = new Date(Date.now() + config.REFRESH_TOKEN_TTL_DAYS * 864e5);
  await db.insert(schema.refreshTokens).values({ userId, tokenHash: sha256(raw), expiresAt });
  return raw;
}

/** Rotaciona o refresh token: valida, revoga o atual e emite um novo. */
export async function rotateRefreshToken(raw: string) {
  const [row] = await db
    .select()
    .from(schema.refreshTokens)
    .where(and(eq(schema.refreshTokens.tokenHash, sha256(raw)), isNull(schema.refreshTokens.revokedAt)));
  if (!row || row.expiresAt < new Date()) return null;
  await db
    .update(schema.refreshTokens)
    .set({ revokedAt: new Date() })
    .where(eq(schema.refreshTokens.id, row.id));
  const next = await issueRefreshToken(row.userId);
  return { userId: row.userId, refreshToken: next };
}

export async function revokeRefreshToken(raw: string) {
  await db
    .update(schema.refreshTokens)
    .set({ revokedAt: new Date() })
    .where(eq(schema.refreshTokens.tokenHash, sha256(raw)));
}

/** Gera uma API key "cmta_<prefix>_<segredo>"; só o hash é persistido. */
export function generateApiKey() {
  const prefix = crypto.randomBytes(4).toString("hex");
  const secret = crypto.randomBytes(24).toString("base64url");
  const plain = `cmta_${prefix}_${secret}`;
  return { plain, prefix, keyHash: sha256(plain) };
}

export async function verifyApiKey(plain: string): Promise<Principal | null> {
  const [row] = await db
    .select()
    .from(schema.apiKeys)
    .where(and(eq(schema.apiKeys.keyHash, sha256(plain)), isNull(schema.apiKeys.revokedAt)));
  if (!row) return null;
  db.update(schema.apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(schema.apiKeys.id, row.id))
    .then(() => {});
  return { userId: null, companyId: row.companyId, role: "api", name: `apikey:${row.name}` };
}
