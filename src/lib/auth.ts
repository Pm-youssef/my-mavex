import { sign, verify } from 'jsonwebtoken';
import type { Secret, SignOptions } from 'jsonwebtoken';

// Admin session helpers
const ADMIN_SESSION_COOKIE = 'admin_session';
export function getAdminCookieName(): string { return ADMIN_SESSION_COOKIE; }
const ADMIN_JWT_SECRET: Secret = (process.env.ADMIN_JWT_SECRET || 'dev_admin_secret_change_me') as Secret;
export function signAdminJwt(payload: object, expiresIn: number = 60 * 60 * 24 * 7): string {
  const options: SignOptions = { expiresIn }; return sign(payload as any, ADMIN_JWT_SECRET, options);
}
export function verifyAdminJwt<T = any>(token: string): T | null {
  try { return verify(token, ADMIN_JWT_SECRET) as T; } catch { return null; }
}

// User session helpers
const USER_SESSION_COOKIE = 'user_session';
export function getUserCookieName(): string { return USER_SESSION_COOKIE; }
const USER_JWT_SECRET: Secret = (process.env.USER_JWT_SECRET || 'dev_user_secret_change_me') as Secret;
export type SessionUser = { id: string; email: string; name?: string | null };
export function signUserJwt(payload: SessionUser, expiresIn: number = 60 * 60 * 24 * 30): string {
  const options: SignOptions = { expiresIn }; return sign(payload as any, USER_JWT_SECRET, options);
}
export function verifyUserJwt<T = SessionUser>(token: string): T | null {
  try { return verify(token, USER_JWT_SECRET) as T; } catch { return null; }
}

export function isProduction(): boolean { return process.env.NODE_ENV === 'production'; }
