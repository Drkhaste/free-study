// ============================================================
// Auth routes: register, login (with remember-me), logout, me
// ============================================================

import { Hono } from 'hono';
import { hashPassword, verifyPassword, issueToken, createSession, bindJwtToSession, revokeSession } from '../lib/auth';
import { json, errorResponse, requireAuth, buildAuthCookie, clearAuthCookie, getClientIP } from '../lib/http';
import type { AppEnv } from '../index';
import type { User } from '../lib/types';

export const authRoutes = new Hono<AppEnv>();

// helper: برداشتن فیلد حساس از user
function publicUser(u: User) {
  const { password_hash, ...rest } = u as any;
  return rest;
}

// POST /api/auth/register
authRoutes.post('/register', async (c) => {
  const body = await c.req.json().catch(() => ({} as any));
  const { username, password, display_name, email } = body;
  if (!username || !password) return errorResponse('نام کاربری و رمز عبور الزامی است', 400);
  if (username.length < 3) return errorResponse('نام کاربری حداقل ۳ نویسه باشد', 400);
  if (password.length < 6) return errorResponse('رمز عبور حداقل ۶ نویسه باشد', 400);

  // چک کردن تکراری نبودن
  const exists = await c.env.DB.prepare(`SELECT id FROM users WHERE username=?`).bind(username).first();
  if (exists) return errorResponse('این نام کاربری قبلاً گرفته شده', 409);

  const hash = await hashPassword(password);
  const result = await c.env.DB.prepare(
    `INSERT INTO users(username, email, password_hash, display_name) VALUES(?, ?, ?, ?)`
  ).bind(username, email || null, hash, display_name || username).run();
  const userId = result.meta.last_row_id as number;

  // اولین کاربر = admin
  if (userId === 1) {
    await c.env.DB.prepare(`UPDATE users SET role='admin' WHERE id=?`).bind(userId).run();
  }

  const user = await c.env.DB.prepare(`SELECT * FROM users WHERE id=?`).bind(userId).first<User>();
  // لاگین خودکار
  const rememberMe = !!body.remember_me;
  const { sessionId } = await createSession(c.env.DB, {
    userId: user!.id,
    userAgent: c.req.header('User-Agent') || '',
    ip: getClientIP(c),
    rememberMe,
  });
  const jwt = await issueToken(c.env, { sub: String(user!.id), username: user!.username, role: user!.role, sid: sessionId }, rememberMe);
  await bindJwtToSession(c.env.DB, sessionId, jwt);

  await c.env.DB.prepare(`UPDATE users SET last_login_at=datetime('now') WHERE id=?`).bind(user!.id).run();

  const isHttps = c.req.url.startsWith('https://');
  c.header('Set-Cookie', buildAuthCookie(jwt, rememberMe, isHttps));
  return json({ user: publicUser(user!), token: jwt });
});

// POST /api/auth/login
authRoutes.post('/login', async (c) => {
  const body = await c.req.json().catch(() => ({} as any));
  const { username, password, remember_me } = body;
  if (!username || !password) return errorResponse('نام کاربری و رمز عبور الزامی است', 400);

  const user = await c.env.DB.prepare(`SELECT * FROM users WHERE username=?`).bind(username).first<User>();
  if (!user) return errorResponse('نام کاربری یا رمز عبور اشتباه است', 401);

  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) return errorResponse('نام کاربری یا رمز عبور اشتباه است', 401);

  const rememberMe = !!remember_me;
  const { sessionId } = await createSession(c.env.DB, {
    userId: user.id,
    userAgent: c.req.header('User-Agent') || '',
    ip: getClientIP(c),
    rememberMe,
  });
  const jwt = await issueToken(c.env, { sub: String(user.id), username: user.username, role: user.role, sid: sessionId }, rememberMe);
  await bindJwtToSession(c.env.DB, sessionId, jwt);

  await c.env.DB.prepare(`UPDATE users SET last_login_at=datetime('now') WHERE id=?`).bind(user.id).run();

  const isHttps = c.req.url.startsWith('https://');
  c.header('Set-Cookie', buildAuthCookie(jwt, rememberMe, isHttps));
  return json({ user: publicUser(user), token: jwt });
});

// POST /api/auth/logout
authRoutes.post('/logout', async (c) => {
  // Get the JWT from cookie
  const cookie = c.req.header('Cookie') || '';
  const m = cookie.match(/(?:^|;\s*)auth_token=([^;]+)/);
  if (m) {
    await revokeSession(c.env.DB, m[1]);
  }
  c.header('Set-Cookie', clearAuthCookie());
  return json({ ok: true });
});

// GET /api/auth/me
authRoutes.get('/me', async (c) => {
  const user = c.get('user');
  if (!user) return json({ user: null });
  return json({ user: publicUser(user) });
});

// PUT /api/auth/me — ویرایش پروفایل
authRoutes.put('/me', requireAuth, async (c) => {
  const user = c.get('user')!;
  const body = await c.req.json().catch(() => ({} as any));
  const { display_name, email } = body;
  await c.env.DB.prepare(
    `UPDATE users SET display_name=?, email=? WHERE id=?`
  ).bind(display_name || user.display_name, email || user.email, user.id).run();
  const updated = await c.env.DB.prepare(`SELECT * FROM users WHERE id=?`).bind(user.id).first<User>();
  return json({ user: publicUser(updated!) });
});

// POST /api/auth/change-password
authRoutes.post('/change-password', requireAuth, async (c) => {
  const user = c.get('user')!;
  const body = await c.req.json().catch(() => ({} as any));
  const { current_password, new_password } = body;
  if (!current_password || !new_password) return errorResponse('هر دو فیلد الزامی است', 400);
  if (new_password.length < 6) return errorResponse('رمز جدید حداقل ۶ نویسه باشد', 400);

  const fresh = await c.env.DB.prepare(`SELECT password_hash FROM users WHERE id=?`).bind(user.id).first<{ password_hash: string }>();
  const ok = await verifyPassword(current_password, fresh!.password_hash);
  if (!ok) return errorResponse('رمز فعلی اشتباه است', 401);

  const newHash = await hashPassword(new_password);
  await c.env.DB.prepare(`UPDATE users SET password_hash=? WHERE id=?`).bind(newHash, user.id).run();
  return json({ ok: true });
});
