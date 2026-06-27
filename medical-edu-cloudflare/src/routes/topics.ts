// ============================================================
// Topics routes (CRUD + search + AI generate + publish)
// ============================================================

import { Hono } from 'hono';
import { json, errorResponse, requireAuth } from '../lib/http';
import { renderMarkdown, makeExcerpt, readingTime, wordCount, slugify } from '../lib/markdown';
import type { AppEnv } from '../index';
import type { Topic } from '../lib/types';

export const topicRoutes = new Hono<AppEnv>();
topicRoutes.use('*', requireAuth);

// GET /api/topics?project_id=&q=&status=&tag=&page=&limit=
topicRoutes.get('/', async (c) => {
  const user = c.get('user')!;
  const projectId = c.req.query('project_id');
  const q = c.req.query('q')?.trim();
  const status = c.req.query('status');
  const tag = c.req.query('tag');
  const page = Math.max(1, parseInt(c.req.query('page') || '1', 10));
  const limit = Math.min(50, Math.max(5, parseInt(c.req.query('limit') || '20', 10)));
  const offset = (page - 1) * limit;

  let where = ['t.user_id = ?'];
  const binds: any[] = [user.id];

  if (projectId) { where.push('t.project_id = ?'); binds.push(parseInt(projectId, 10)); }
  if (status) { where.push('t.status = ?'); binds.push(status); }
  if (tag) { where.push('t.tags LIKE ?'); binds.push(`%${tag}%`); }

  let sql: string;
  let countSql: string;
  const baseBinds = [...binds];

  if (q) {
    // Full-Text Search
    where.push('t.id IN (SELECT rowid FROM topics_fts WHERE topics_fts MATCH ?)');
    binds.push(`${q}*`);  // پیشوند search
  }

  const whereClause = where.join(' AND ');

  sql = `
    SELECT t.*, p.title AS project_title, p.color AS project_color
    FROM topics t LEFT JOIN projects p ON p.id = t.project_id
    WHERE ${whereClause}
    ORDER BY t.updated_at DESC
    LIMIT ? OFFSET ?
  `;
  countSql = `SELECT COUNT(*) AS total FROM topics t WHERE ${whereClause}`;

  const result = await c.env.DB.prepare(sql).bind(...binds, limit, offset).all<Topic>();
  const total = await c.env.DB.prepare(countSql).bind(...baseBinds).first<{ total: number }>();

  return json({
    topics: result.results,
    page, limit,
    total: total?.total || 0,
    total_pages: Math.ceil((total?.total || 0) / limit),
  });
});

// GET /api/topics/:id
topicRoutes.get('/:id', async (c) => {
  const user = c.get('user')!;
  const id = parseInt(c.req.param('id'), 10);
  const topic = await c.env.DB.prepare(`
    SELECT t.*, p.title AS project_title, p.color AS project_color
    FROM topics t LEFT JOIN projects p ON p.id = t.project_id
    WHERE t.id=? AND t.user_id=?
  `).bind(id, user.id).first<Topic>();
  if (!topic) return errorResponse('مبحث یافت نشد', 404);
  return json({ topic });
});

// POST /api/topics
topicRoutes.post('/', async (c) => {
  const user = c.get('user')!;
  const body = await c.req.json().catch(() => ({} as any));
  if (!body.title) return errorResponse('عنوان الزامی است', 400);
  if (!body.project_id) return errorResponse('پروژه الزامی است', 400);

  // بررسی مالکیت پروژه
  const project = await c.env.DB.prepare(`SELECT id FROM projects WHERE id=? AND user_id=?`).bind(body.project_id, user.id).first();
  if (!project) return errorResponse('پروژه نامعتبر است', 400);

  const contentMd: string = body.content_md || '';
  const contentHtml = renderMarkdown(contentMd);
  const excerpt = makeExcerpt(contentMd);
  const slug = body.slug ? slugify(body.slug) : slugify(body.title);

  const result = await c.env.DB.prepare(
    `INSERT INTO topics(project_id, user_id, title, slug, content_md, content_html, excerpt, tags, status, word_count, reading_time_min)
     VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    body.project_id,
    user.id,
    body.title.trim(),
    slug,
    contentMd,
    contentHtml,
    excerpt,
    body.tags?.trim() || null,
    body.status || 'draft',
    wordCount(contentMd),
    readingTime(contentMd),
  ).run();
  const id = result.meta.last_row_id as number;
  const topic = await c.env.DB.prepare(`SELECT * FROM topics WHERE id=?`).bind(id).first<Topic>();
  return json({ topic }, 201);
});

// PUT /api/topics/:id
topicRoutes.put('/:id', async (c) => {
  const user = c.get('user')!;
  const id = parseInt(c.req.param('id'), 10);
  const existing = await c.env.DB.prepare(`SELECT * FROM topics WHERE id=? AND user_id=?`).bind(id, user.id).first<Topic>();
  if (!existing) return errorResponse('مبحث یافت نشد', 404);

  const body = await c.req.json().catch(() => ({} as any));
  const contentMd = body.content_md !== undefined ? body.content_md : existing.content_md;
  const contentHtml = renderMarkdown(contentMd);
  const excerpt = makeExcerpt(contentMd);
  const tags = body.tags !== undefined ? body.tags : existing.tags;
  const status = body.status || existing.status;

  // اگر published شد و قبلاً نبود، تاریخ انتشار رو ست کن
  let publishedAt = existing.published_at;
  if (status === 'published' && existing.status !== 'published') {
    publishedAt = new Date().toISOString();
  }

  await c.env.DB.prepare(
    `UPDATE topics SET title=?, content_md=?, content_html=?, excerpt=?, tags=?, status=?, word_count=?, reading_time_min=?, updated_at=datetime('now'), published_at=? WHERE id=?`
  ).bind(
    body.title?.trim() || existing.title,
    contentMd,
    contentHtml,
    excerpt,
    tags,
    status,
    wordCount(contentMd),
    readingTime(contentMd),
    publishedAt,
    id
  ).run();

  const topic = await c.env.DB.prepare(`SELECT * FROM topics WHERE id=?`).bind(id).first<Topic>();
  return json({ topic });
});

// PATCH /api/topics/:id (برای partial update مثل فقط تغییر status)
topicRoutes.patch('/:id', async (c) => {
  const user = c.get('user')!;
  const id = parseInt(c.req.param('id'), 10);
  const existing = await c.env.DB.prepare(`SELECT * FROM topics WHERE id=? AND user_id=?`).bind(id, user.id).first<Topic>();
  if (!existing) return errorResponse('مبحث یافت نشد', 404);

  const body = await c.req.json().catch(() => ({} as any));
  const status = body.status || existing.status;
  let publishedAt = existing.published_at;
  if (status === 'published' && existing.status !== 'published') {
    publishedAt = new Date().toISOString();
  }

  await c.env.DB.prepare(
    `UPDATE topics SET status=?, published_at=?, updated_at=datetime('now') WHERE id=?`
  ).bind(status, publishedAt, id).run();
  const topic = await c.env.DB.prepare(`SELECT * FROM topics WHERE id=?`).bind(id).first<Topic>();
  return json({ topic });
});

// DELETE /api/topics/:id
topicRoutes.delete('/:id', async (c) => {
  const user = c.get('user')!;
  const id = parseInt(c.req.param('id'), 10);
  await c.env.DB.prepare(`DELETE FROM topics WHERE id=? AND user_id=?`).bind(id, user.id).run();
  return json({ ok: true });
});

// GET /api/topics/tags/list — لیست همه تگ‌ها
topicRoutes.get('/tags/list', async (c) => {
  const user = c.get('user')!;
  const result = await c.env.DB.prepare(`SELECT tags FROM topics WHERE user_id=? AND tags IS NOT NULL AND tags != ''`).bind(user.id).all<{ tags: string }>();
  const tagCount = new Map<string, number>();
  for (const r of result.results) {
    for (const t of (r.tags || '').split(',').map(s => s.trim()).filter(Boolean)) {
      tagCount.set(t, (tagCount.get(t) || 0) + 1);
    }
  }
  const tags = Array.from(tagCount.entries()).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }));
  return json({ tags });
});

// POST /api/topics/:id/publish — انتشار به وبلاگ
topicRoutes.post('/:id/publish', async (c) => {
  const user = c.get('user')!;
  const id = parseInt(c.req.param('id'), 10);
  const topic = await c.env.DB.prepare(`SELECT * FROM topics WHERE id=? AND user_id=?`).bind(id, user.id).first<Topic>();
  if (!topic) return errorResponse('مبحث یافت نشد', 404);

  const slug = topic.slug || slugify(topic.title);
  const publishedAt = topic.published_at || new Date().toISOString();
  await c.env.DB.prepare(
    `UPDATE topics SET status='published', published_at=?, slug=?, updated_at=datetime('now') WHERE id=?`
  ).bind(publishedAt, slug, id).run();

  // ثبت/به‌روزرسانی در جدول blog_posts
  await c.env.DB.prepare(
    `INSERT INTO blog_posts(topic_id, slug, published_at) VALUES(?, ?, ?)
     ON CONFLICT(topic_id) DO UPDATE SET slug=excluded.slug, published_at=excluded.published_at`
  ).bind(id, slug, publishedAt).run();

  return json({ ok: true, slug });
});
