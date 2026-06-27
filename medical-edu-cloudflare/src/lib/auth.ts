// ============================================================
// Authentication utilities (bcrypt + JWT + remember-me)
// ============================================================

import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';

const SESSION_SHORT_HOURS = 24;          // بدون "مرا به خاطر بسپار"
const SESSION_LONG_DAYS = 30;            // با "مرا به خاطر بسپار"

function getSecret(env: { JWT_SECRET?: string }): Uint8Array {
  const s = env.JWT_SECRET || 'dev-secret-change-me-in-production-please-32chars';
  return new TextEncoder().encode(s);
}

// ---- password hashing ----
export async function hashPassword(plain: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plain, salt);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    return false;
  }
}

// ---- JWT ----
export interface JwtPayload {
  sub: string;          // user id
  username: string;
  role: string;
  sid: string;          // session id (random)
  rm?: boolean;         // remember me flag
}

export async function issueToken(env: { JWT_SECRET?: string }, payload: JwtPayload, rememberMe: boolean): Promise<string> {
  const expiresIn = rememberMe ? `${SESSION_LONG_DAYS}d` : `${SESSION_SHORT_HOURS}h`;
  const seconds = rememberMe ? SESSION_LONG_DAYS * 86400 : SESSION_SHORT_HOURS * 3600;
  const jwt = await new SignJWT({ ...payload, rm: rememberMe })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${seconds}s`)
    .sign(getSecret(env));
  return jwt;
}

export async function verifyToken(env: { JWT_SECRET?: string }, token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(env), { algorithms: ['HS256'] });
    return payload as unknown as JwtPayload;
  } catch {
    return null;
  }
}

// ---- session management ----
// JWT خودش stateless هست؛ ولی برای revoke (logout) یک نشست رو در جدول sessions ثبت می‌کنیم
// و موقع verify چک می‌کنیم که همچنان معتبر باشه.

export function randomId(len = 32): string {
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
}

export async function hashToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
}

export interface SessionCreateOpts {
  userId: number;
  userAgent?: string;
  ip?: string;
  rememberMe: boolean;
}

// در این پیاده‌سازی، خود JWT به عنوان session token استفاده میشه
// و هش آن در جدول sessions ذخیره میشه (برای قابلیت revoke)
export async function createSession(db: D1Database, opts: SessionCreateOpts): Promise<{ sessionId: string }> {
  const sessionId = randomId(16);
  const expiresAt = new Date(Date.now() + (opts.rememberMe ? SESSION_LONG_DAYS * 86400 * 1000 : SESSION_SHORT_HOURS * 3600 * 1000))
    .toISOString();
  // placeholder — بعد از صدور JWT، هش آن آپدیت میشه
  await db.prepare(
    `INSERT INTO sessions(token_hash, user_id, user_agent, ip, expires_at) VALUES(?, ?, ?, ?, ?)`
  ).bind('pending_' + sessionId, opts.userId, opts.userAgent || null, opts.ip || null, expiresAt).run();
  return { sessionId };
}

// بعد از صدور JWT، هش آن رو در sessions ذخیره میکنیم
export async function bindJwtToSession(db: D1Database, sessionId: string, jwt: string): Promise<void> {
  const tokenHash = await hashToken(jwt);
  await db.prepare(
    `UPDATE sessions SET token_hash=? WHERE token_hash=?`
  ).bind(tokenHash, 'pending_' + sessionId).run();
}

export async function isValidSession(db: D1Database, token: string): Promise<boolean> {
  if (!token) return false;
  const tokenHash = await hashToken(token);
  const row = await db.prepare(
    `SELECT 1 FROM sessions WHERE token_hash=? AND expires_at > datetime('now') LIMIT 1`
  ).bind(tokenHash).first();
  return !!row;
}

export async function revokeSession(db: D1Database, token: string): Promise<void> {
  if (!token) return;
  const tokenHash = await hashToken(token);
  await db.prepare(`DELETE FROM sessions WHERE token_hash=?`).bind(tokenHash).run();
}

export async function revokeAllUserSessions(db: D1Database, userId: number): Promise<void> {
  await db.prepare(`DELETE FROM sessions WHERE user_id=?`).bind(userId).run();
}

// ---- helpers for HTTP ----
export function getBearerToken(req: Request): string | null {
  const h = req.headers.get('Authorization');
  if (h && h.startsWith('Bearer ')) return h.slice(7);
  // fallback: cookie
  const cookie = req.headers.get('Cookie') || '';
  const m = cookie.match(/(?:^|;\s*)auth_token=([^;]+)/);
  return m ? m[1] : null;
}

export function getSessionToken(req: Request): string | null {
  const cookie = req.headers.get('Cookie') || '';
  const m = cookie.match(/(?:^|;\s*)session=([^;]+)/);
  if (m) return m[1];
  return getBearerToken(req);
}
