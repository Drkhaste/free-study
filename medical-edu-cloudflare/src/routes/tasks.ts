// ============================================================
// Tasks routes (Calendar tasks)
// ============================================================

import { Hono } from 'hono';
import { json, errorResponse, requireAuth } from '../lib/http';
import type { AppEnv } from '../index';

export const taskRoutes = new Hono<AppEnv>();
taskRoutes.use('*', requireAuth);

// GET /api/tasks — لیست تسک‌ها (فیلتر بر اساس تاریخ)
taskRoutes.get('/', async (c) => {
  const user = c.get('user')!;
  const date = c.req.query('date'); // YYYY-MM-DD
  const month = c.req.query('month'); // YYYY-MM

  let sql = `SELECT * FROM tasks WHERE user_id = ?`;
  const params: any[] = [user.id];

  if (date) {
    sql += ` AND task_date = ?`;
    params.push(date);
  } else if (month) {
    sql += ` AND task_date LIKE ?`;
    params.push(`${month}%`);
  }

  sql += ` ORDER BY task_date ASC, id ASC`;
  const result = await c.env.DB.prepare(sql).bind(...params).all();

  return json({ tasks: result.results });
});

// POST /api/tasks — ساخت تسک جدید
taskRoutes.post('/', async (c) => {
  const user = c.get('user')!;
  const body = await c.req.json().catch(() => ({} as any));
  if (!body.title || !body.task_date) return errorResponse('عنوان و تاریخ الزامی است', 400);

  const result = await c.env.DB.prepare(
    `INSERT INTO tasks(user_id, title, description, task_date, status)
     VALUES(?, ?, ?, ?, 'pending')`
  ).bind(
    user.id,
    body.title.trim(),
    body.description?.trim() || null,
    body.task_date,
  ).run();

  const id = result.meta.last_row_id;
  const task = await c.env.DB.prepare(`SELECT * FROM tasks WHERE id=?`).bind(id).first();
  return json({ task }, 201);
});

// PATCH /api/tasks/:id — تغییر وضعیت یا ویرایش
taskRoutes.patch('/:id', async (c) => {
  const user = c.get('user')!;
  const id = parseInt(c.req.param('id'), 10);
  const body = await c.req.json().catch(() => ({} as any));

  const existing = await c.env.DB.prepare(`SELECT * FROM tasks WHERE id=? AND user_id=?`).bind(id, user.id).first();
  if (!existing) return errorResponse('تسک یافت نشد', 404);

  await c.env.DB.prepare(
    `UPDATE tasks SET status=COALESCE(?, status), title=COALESCE(?, title), description=COALESCE(?, description) WHERE id=?`
  ).bind(body.status, body.title, body.description, id).run();

  const task = await c.env.DB.prepare(`SELECT * FROM tasks WHERE id=?`).bind(id).first();
  return json({ task });
});

// DELETE /api/tasks/:id — حذف تسک
taskRoutes.delete('/:id', async (c) => {
  const user = c.get('user')!;
  const id = parseInt(c.req.param('id'), 10);
  await c.env.DB.prepare(`DELETE FROM tasks WHERE id=? AND user_id=?`).bind(id, user.id).run();
  return json({ ok: true });
});
