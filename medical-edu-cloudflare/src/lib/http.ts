// ============================================================
// HTTP helpers, response wrappers, auth middleware
// ============================================================

import { Context, Next } from 'hono';
import { verifyToken, isValidSession, getSessionToken, JwtPayload } from './auth';
import type { Env } from './types';
import type { User } from './types';

// JSON helpers
export function json(data: any, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...headers,
    },
  });
}

export function errorResponse(message: string, status = 400, code?: string): Response {
  return json({ error: message, code }, status);
}

// --- Auth middleware ---
// یک context variable برای ذخیره کاربر تأیید شده
export async function authMiddleware(c: Context<{ Bindings: Env; Variables: { user: User | null; jwt: JwtPayload | null } }>, next: Next) {
  const token = getSessionToken(c.req.raw);
  if (!token) {
    c.set('user', null);
    c.set('jwt', null);
    await next();
    return;
  }
  const payload = await verifyToken(c.env, token);
  if (!payload) {
    c.set('user', null);
    c.set('jwt', null);
    await next();
    return;
  }
  // اعتبارسنجی session در DB
  const valid = await isValidSession(c.env.DB, token);
  if (!valid) {
    c.set('user', null);
    c.set('jwt', null);
    await next();
    return;
  }
  const user = await c.env.DB.prepare(`SELECT * FROM users WHERE id=?`).bind(parseInt(payload.sub, 10)).first<User>();
  c.set('user', user || null);
  c.set('jwt', payload);
  await next();
}

// require auth: اگه کاربر لاگین نکرده 401 برمی‌گردونه
export async function requireAuth(c: Context<{ Bindings: Env; Variables: { user: User | null } }>, next: Next) {
  const user = c.get('user');
  if (!user) return errorResponse('احراز هویت نشده‌اید. لطفاً وارد شوید.', 401, 'unauthorized');
  await next();
}

// کوکی ست کردن برای Remember-Me
export function buildAuthCookie(token: string, rememberMe: boolean, isHttps = true): string {
  const maxAge = rememberMe ? 30 * 86400 : 24 * 3600;
  const flags = [
    `auth_token=${token}`,
    `Path=/`,
    `HttpOnly`,
    `SameSite=Lax`,
    `Max-Age=${maxAge}`,
  ];
  // در production (HTTPS) باید Secure هم اضافه بشه
  // روی localhost هنگام dev با HTTP کار نمیکنه
  if (isHttps) flags.push('Secure');
  return flags.join('; ');
}

export function clearAuthCookie(): string {
  return `auth_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Secure`;
}

// گرفتن IP کلاینت (برای لاگ session)
export function getClientIP(c: Context): string {
  return c.req.header('CF-Connecting-IP') || c.req.header('X-Real-IP') || '0.0.0.0';
}
