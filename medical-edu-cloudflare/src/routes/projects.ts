// ============================================================
// Projects routes (CRUD)
// ============================================================

import { Hono } from 'hono';
import { json, errorResponse, requireAuth } from '../lib/http';
import type { AppEnv } from '../index';
import type { Project } from '../lib/types';

export const projectRoutes = new Hono<AppEnv>();
projectRoutes.use('*', requireAuth);

// GET /api/projects
projectRoutes.get('/', async (c) => {
  const user = c.get('user')!;
  const result = await c.env.DB.prepare(`
    SELECT p.*,
      (SELECT COUNT(*) FROM topics t WHERE t.project_id=p.id) AS topic_count,
      (SELECT COUNT(*) FROM flashcards f WHERE f.project_id=p.id) AS flashcard_count
    FROM projects p WHERE p.user_id=? ORDER BY p.position, p.created_at DESC
  `).bind(user.id).all<Project & { topic_count: number; flashcard_count: number }>();
  return json({ projects: result.results });
});

// GET /api/projects/:id
projectRoutes.get('/:id', async (c) => {
  const user = c.get('user')!;
  const id = parseInt(c.req.param('id'), 10);
  const project = await c.env.DB.prepare(
    `SELECT * FROM projects WHERE id=? AND user_id=?`
  ).bind(id, user.id).first<Project>();
  if (!project) return errorResponse('پروژه یافت نشد', 404);
  return json({ project });
});

// POST /api/projects
projectRoutes.post('/', async (c) => {
  const user = c.get('user')!;
  const body = await c.req.json().catch(() => ({} as any));
  if (!body.title) return errorResponse('عنوان الزامی است', 400);
  const result = await c.env.DB.prepare(
    `INSERT INTO projects(user_id, title, description, color, icon) VALUES(?, ?, ?, ?, ?)`
  ).bind(
    user.id,
    body.title.trim(),
    body.description?.trim() || null,
    body.color || '#3b82f6',
    body.icon || 'folder'
  ).run();
  const id = result.meta.last_row_id as number;
  const project = await c.env.DB.prepare(`SELECT * FROM projects WHERE id=?`).bind(id).first<Project>();
  return json({ project }, 201);
});

// PUT /api/projects/:id
projectRoutes.put('/:id', async (c) => {
  const user = c.get('user')!;
  const id = parseInt(c.req.param('id'), 10);
  const body = await c.req.json().catch(() => ({} as any));
  const existing = await c.env.DB.prepare(`SELECT * FROM projects WHERE id=? AND user_id=?`).bind(id, user.id).first<Project>();
  if (!existing) return errorResponse('پروژه یافت نشد', 404);

  await c.env.DB.prepare(
    `UPDATE projects SET title=?, description=?, color=?, icon=?, position=?, updated_at=datetime('now') WHERE id=?`
  ).bind(
    body.title?.trim() || existing.title,
    body.description ?? existing.description,
    body.color || existing.color,
    body.icon || existing.icon,
    body.position ?? existing.position,
    id
  ).run();
  const project = await c.env.DB.prepare(`SELECT * FROM projects WHERE id=?`).bind(id).first<Project>();
  return json({ project });
});

// DELETE /api/projects/:id
projectRoutes.delete('/:id', async (c) => {
  const user = c.get('user')!;
  const id = parseInt(c.req.param('id'), 10);
  const existing = await c.env.DB.prepare(`SELECT id FROM projects WHERE id=? AND user_id=?`).bind(id, user.id).first();
  if (!existing) return errorResponse('پروژه یافت نشد', 404);
  await c.env.DB.prepare(`DELETE FROM projects WHERE id=?`).bind(id).run();
  return json({ ok: true });
});
