// ============================================================
// Flashcards routes (CRUD + CSV import + SM-2 review)
// ============================================================

import { Hono } from 'hono';
import { json, errorResponse, requireAuth } from '../lib/http';
import { parseFlashcardsCSV, toCSV } from '../lib/csv';
import type { AppEnv } from '../index';
import type { Flashcard } from '../lib/types';

export const flashcardRoutes = new Hono<AppEnv>();
flashcardRoutes.use('*', requireAuth);

// GET /api/flashcards?project_id=&topic_id=&tags=&due_only=&q=&page=&limit=
flashcardRoutes.get('/', async (c) => {
  const user = c.get('user')!;
  const projectId = c.req.query('project_id');
  const topicId = c.req.query('topic_id');
  const tag = c.req.query('tag');
  const dueOnly = c.req.query('due_only') === '1' || c.req.query('due_only') === 'true';
  const q = c.req.query('q')?.trim();
  const page = Math.max(1, parseInt(c.req.query('page') || '1', 10));
  const limit = Math.min(100, Math.max(5, parseInt(c.req.query('limit') || '50', 10)));
  const offset = (page - 1) * limit;

  const where: string[] = ['user_id = ?'];
  const binds: any[] = [user.id];

  if (projectId) { where.push('project_id = ?'); binds.push(parseInt(projectId, 10)); }
  if (topicId) { where.push('topic_id = ?'); binds.push(parseInt(topicId, 10)); }
  if (tag) { where.push('tags LIKE ?'); binds.push(`%${tag}%`); }
  if (dueOnly) { where.push(`next_review_at <= datetime('now')`); }
  if (q) { where.push('(front LIKE ? OR back LIKE ?)'); binds.push(`%${q}%`, `%${q}%`); }

  const sql = `SELECT * FROM flashcards WHERE ${where.join(' AND ')} ORDER BY next_review_at ASC, id DESC LIMIT ? OFFSET ?`;
  const countSql = `SELECT COUNT(*) AS total FROM flashcards WHERE ${where.join(' AND ')}`;

  const result = await c.env.DB.prepare(sql).bind(...binds, limit, offset).all<Flashcard>();
  const total = await c.env.DB.prepare(countSql).bind(...binds).first<{ total: number }>();

  return json({
    flashcards: result.results,
    page, limit,
    total: total?.total || 0,
    total_pages: Math.ceil((total?.total || 0) / limit),
  });
});

// GET /api/flashcards/stats — آمار کلی
flashcardRoutes.get('/stats/overview', async (c) => {
  const user = c.get('user')!;
  const total = await c.env.DB.prepare(`SELECT COUNT(*) AS c FROM flashcards WHERE user_id=?`).bind(user.id).first<{ c: number }>();
  const due = await c.env.DB.prepare(`SELECT COUNT(*) AS c FROM flashcards WHERE user_id=? AND next_review_at <= datetime('now')`).bind(user.id).first<{ c: number }>();
  const learned = await c.env.DB.prepare(`SELECT COUNT(*) AS c FROM flashcards WHERE user_id=? AND repetitions >= 3`).bind(user.id).first<{ c: number }>();
  const reviewed = await c.env.DB.prepare(`SELECT COUNT(*) AS c FROM flashcards WHERE user_id=? AND total_reviews > 0`).bind(user.id).first<{ c: number }>();

  // آمار ۷ روز اخیر
  const weekStats = await c.env.DB.prepare(`
    SELECT DATE(started_at) AS day, COUNT(*) AS sessions, SUM(cards_reviewed) AS cards, SUM(cards_correct) AS correct
    FROM review_sessions WHERE user_id=? AND started_at >= datetime('now', '-7 days')
    GROUP BY DATE(started_at) ORDER BY day
  `).bind(user.id).all();

  return json({
    total: total?.c || 0,
    due: due?.c || 0,
    learned: learned?.c || 0,
    reviewed: reviewed?.c || 0,
    week: weekStats.results,
  });
});

// POST /api/flashcards
flashcardRoutes.post('/', async (c) => {
  const user = c.get('user')!;
  const body = await c.req.json().catch(() => ({} as any));
  if (!body.front || !body.back) return errorResponse('صورت و پشت کارت الزامی است', 400);

  const result = await c.env.DB.prepare(
    `INSERT INTO flashcards(user_id, project_id, topic_id, front, back, hint, tags, next_review_at)
     VALUES(?, ?, ?, ?, ?, ?, ?, datetime('now'))`
  ).bind(
    user.id,
    body.project_id || null,
    body.topic_id || null,
    body.front.trim(),
    body.back.trim(),
    body.hint?.trim() || null,
    body.tags?.trim() || null,
  ).run();
  const id = result.meta.last_row_id as number;
  const card = await c.env.DB.prepare(`SELECT * FROM flashcards WHERE id=?`).bind(id).first<Flashcard>();
  return json({ flashcard: card }, 201);
});

// POST /api/flashcards/bulk
flashcardRoutes.post('/bulk', async (c) => {
  const user = c.get('user')!;
  const body = await c.req.json().catch(() => ({} as any));
  if (!Array.isArray(body.cards)) return errorResponse('cards باید آرایه باشد', 400);
  if (body.cards.length === 0) return errorResponse('لیست خالی است', 400);
  if (body.cards.length > 500) return errorResponse('حداکثر ۵۰۰ کارت در هر بار', 400);

  const stmt = c.env.DB.prepare(
    `INSERT INTO flashcards(user_id, project_id, topic_id, front, back, hint, tags, next_review_at)
     VALUES(?, ?, ?, ?, ?, ?, ?, datetime('now'))`
  );
  const batch = body.cards.map((card: any) => stmt.bind(
    user.id,
    body.project_id || card.project_id || null,
    body.topic_id || card.topic_id || null,
    String(card.front || '').trim(),
    String(card.back || '').trim(),
    card.hint?.trim() || null,
    card.tags?.trim() || null,
  ));
  await c.env.DB.batch(batch);
  return json({ ok: true, imported: body.cards.length });
});

// POST /api/flashcards/import-csv
// Body: { csv_text: string, project_id?, topic_id? }
flashcardRoutes.post('/import-csv', async (c) => {
  const user = c.get('user')!;
  const body = await c.req.json().catch(() => ({} as any));
  const csvText: string = body.csv_text || '';
  if (!csvText.trim()) return errorResponse('فایل CSV خالی است', 400);

  const parsed = parseFlashcardsCSV(csvText);
  if (parsed.cards.length === 0) return errorResponse({
    error: 'هیچ کارتی یافت نشد',
    errors: parsed.errors,
  } as any, 400);

  const stmt = c.env.DB.prepare(
    `INSERT INTO flashcards(user_id, project_id, topic_id, front, back, hint, tags, next_review_at)
     VALUES(?, ?, ?, ?, ?, ?, ?, datetime('now'))`
  );
  const batch = parsed.cards.map(card => stmt.bind(
    user.id,
    body.project_id || null,
    body.topic_id || null,
    card.front,
    card.back,
    card.hint || null,
    card.tags || null,
  ));
  // D1 batch limit ~1000 statements
  const chunkSize = 100;
  for (let i = 0; i < batch.length; i += chunkSize) {
    await c.env.DB.batch(batch.slice(i, i + chunkSize));
  }

  return json({
    ok: true,
    imported: parsed.cards.length,
    errors: parsed.errors,
    total_rows: parsed.totalRows,
  });
});

// PUT /api/flashcards/:id
flashcardRoutes.put('/:id', async (c) => {
  const user = c.get('user')!;
  const id = parseInt(c.req.param('id'), 10);
  const existing = await c.env.DB.prepare(`SELECT * FROM flashcards WHERE id=? AND user_id=?`).bind(id, user.id).first<Flashcard>();
  if (!existing) return errorResponse('کارت یافت نشد', 404);

  const body = await c.req.json().catch(() => ({} as any));
  await c.env.DB.prepare(
    `UPDATE flashcards SET front=?, back=?, hint=?, tags=?, project_id=?, topic_id=? WHERE id=?`
  ).bind(
    body.front ?? existing.front,
    body.back ?? existing.back,
    body.hint ?? existing.hint,
    body.tags ?? existing.tags,
    body.project_id ?? existing.project_id,
    body.topic_id ?? existing.topic_id,
    id
  ).run();
  const card = await c.env.DB.prepare(`SELECT * FROM flashcards WHERE id=?`).bind(id).first<Flashcard>();
  return json({ flashcard: card });
});

// DELETE /api/flashcards/:id
flashcardRoutes.delete('/:id', async (c) => {
  const user = c.get('user')!;
  const id = parseInt(c.req.param('id'), 10);
  await c.env.DB.prepare(`DELETE FROM flashcards WHERE id=? AND user_id=?`).bind(id, user.id).run();
  return json({ ok: true });
});

// POST /api/flashcards/:id/reset — ریست SM-2
flashcardRoutes.post('/:id/reset', async (c) => {
  const user = c.get('user')!;
  const id = parseInt(c.req.param('id'), 10);
  await c.env.DB.prepare(
    `UPDATE flashcards SET ease=2.5, interval=0, repetitions=0, next_review_at=datetime('now'), last_reviewed_at=NULL, total_reviews=0, correct_reviews=0 WHERE id=? AND user_id=?`
  ).bind(id, user.id).run();
  return json({ ok: true });
});
