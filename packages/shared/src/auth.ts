import { z } from "zod";
import { CompanyStatus, PlanId, UserRole } from "./enums.js";

/**
 * Contratos de autenticação.
 *
 * As respostas aqui espelham exatamente o que `saas/api/src/modules/auth.ts`
 * devolve hoje — inclusive as inconsistências: `/auth/signup` não manda
 * `mustChangePassword` e não inclui `slug` da empresa em `/auth/login`, mas
 * inclui em `/auth/signup`. Modelado como está, não como deveria ser; ajustar a
 * API é assunto da etapa 4.
 */

// ---------------------------------------------------------------- requisições

export const SignupBody = z.object({
  companyName: z.string().min(2).max(128),
  name: z.string().min(2).max(128),
  email: z.string().email(),
  password: z.string().min(8).max(72),
});
export type SignupBody = z.infer<typeof SignupBody>;

export const LoginBody = z.object({
  email: z.string().email(),
  password: z.string(),
});
export type LoginBody = z.infer<typeof LoginBody>;

export const ChangePasswordBody = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "mínimo 8 caracteres").max(72),
});
export type ChangePasswordBody = z.infer<typeof ChangePasswordBody>;

export const RefreshBody = z.object({ refreshToken: z.string() });
export type RefreshBody = z.infer<typeof RefreshBody>;

export const LogoutBody = RefreshBody;
export type LogoutBody = z.infer<typeof LogoutBody>;

// ------------------------------------------------------------------ respostas

export const AuthUser = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  role: UserRole,
  mustChangePassword: z.boolean().optional(),
});
export type AuthUser = z.infer<typeof AuthUser>;

export const AuthCompany = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string().optional(),
  planId: PlanId,
});
export type AuthCompany = z.infer<typeof AuthCompany>;

export const AuthTokens = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
});
export type AuthTokens = z.infer<typeof AuthTokens>;

export const LoginResponse = AuthTokens.extend({
  user: AuthUser,
  company: AuthCompany,
});
export type LoginResponse = z.infer<typeof LoginResponse>;

export const SignupResponse = LoginResponse;
export type SignupResponse = z.infer<typeof SignupResponse>;

export const RefreshResponse = AuthTokens;
export type RefreshResponse = z.infer<typeof RefreshResponse>;

/** Identidade resolvida pelo middleware `authenticate`. `userId` é nulo quando
 *  a chamada foi autenticada por API key em vez de sessão de usuário. */
export const Principal = z.object({
  userId: z.string().uuid().nullable(),
  companyId: z.string().uuid(),
  role: UserRole,
  name: z.string().optional(),
});
export type Principal = z.infer<typeof Principal>;

export const Plan = z.object({
  id: PlanId,
  name: z.string(),
  priceCents: z.number().int(),
  maxUsers: z.number().int(),
  maxChannels: z.number().int(),
  maxContacts: z.number().int(),
  maxMonthlyMessages: z.number().int(),
  features: z.array(z.string()),
});
export type Plan = z.infer<typeof Plan>;

export const MeResponse = z.object({
  principal: Principal,
  company: z.object({
    id: z.string().uuid(),
    name: z.string(),
    slug: z.string(),
    status: CompanyStatus,
  }),
  plan: Plan,
  usage: z.object({ users: z.number().int() }),
  mustChangePassword: z.boolean(),
});
export type MeResponse = z.infer<typeof MeResponse>;

export const OkResponse = z.object({ ok: z.literal(true) });
export type OkResponse = z.infer<typeof OkResponse>;

/** Formato de erro do handler central da API (`setErrorHandler`). */
export const ApiErrorResponse = z.object({
  error: z.string(),
  code: z.string().optional(),
});
export type ApiErrorResponse = z.infer<typeof ApiErrorResponse>;
