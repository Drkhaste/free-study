// ============================================================
// Blog routes (public)
// ============================================================

import { Hono } from 'hono';
import { json, errorResponse } from '../lib/http';
import { renderMarkdown } from '../lib/markdown';
import type { AppEnv } from '../index';
import type { Topic } from '../lib/types';

export const blogRoutes = new Hono<AppEnv>();

// GET /api/blog — لیست پست‌های منتشر شده (public)
blogRoutes.get('/', async (c) => {
  const page = Math.max(1, parseInt(c.req.query('page') || '1', 10));
  const limit = Math.min(30, Math.max(5, parseInt(c.req.query('limit') || '10', 10)));
  const offset = (page - 1) * limit;
  const q = c.req.query('q')?.trim();
  const tag = c.req.query('tag');

  const where: string[] = ['t.status = ?'];
  const binds: any[] = ['published'];
  if (tag) { where.push('t.tags LIKE ?'); binds.push(`%${tag}%`); }
  if (q) { where.push('(t.title LIKE ? OR t.excerpt LIKE ?)'); binds.push(`%${q}%`, `%${q}%`); }

  const sql = `
    SELECT t.id, t.title, t.slug, t.excerpt, t.tags, t.reading_time_min, t.published_at,
           p.title AS project_title, p.color AS project_color,
           bp.view_count, bp.like_count
    FROM topics t
    LEFT JOIN projects p ON p.id = t.project_id
    LEFT JOIN blog_posts bp ON bp.topic_id = t.id
    WHERE ${where.join(' AND ')}
    ORDER BY t.published_at DESC
    LIMIT ? OFFSET ?
  `;
  const countSql = `SELECT COUNT(*) AS total FROM topics t WHERE ${where.join(' AND ')}`;

  const result = await c.env.DB.prepare(sql).bind(...binds, limit, offset).all();
  const total = await c.env.DB.prepare(countSql).bind(...binds).first<{ total: number }>();

  return json({
    posts: result.results,
    page, limit,
    total: total?.total || 0,
    total_pages: Math.ceil((total?.total || 0) / limit),
  });
});

// GET /api/blog/slug/:slug — پست کامل با slug
blogRoutes.get('/slug/:slug', async (c) => {
  const slug = c.req.param('slug');
  const topic = await c.env.DB.prepare(`
    SELECT t.*, p.title AS project_title, p.color AS project_color,
           bp.view_count, bp.like_count
    FROM topics t
    LEFT JOIN projects p ON p.id = t.project_id
    LEFT JOIN blog_posts bp ON bp.topic_id = t.id
    WHERE t.slug=? AND t.status='published'
  `).bind(slug).first<Topic & { view_count: number; like_count: number }>();
  if (!topic) return errorResponse('پست یافت نشد', 404);

  // increment view count
  await c.env.DB.prepare(
    `INSERT INTO blog_posts(topic_id, slug, view_count, published_at)
     VALUES(?, ?, 1, datetime('now'))
     ON CONFLICT(topic_id) DO UPDATE SET view_count=view_count+1`
  ).bind(topic.id, slug).run();

  return json({ post: topic });
});

// GET /api/blog/tags — همه تگ‌های پست‌های منتشر شده
blogRoutes.get('/tags', async (c) => {
  const result = await c.env.DB.prepare(
    `SELECT tags FROM topics WHERE status='published' AND tags IS NOT NULL AND tags != ''`
  ).all<{ tags: string }>();
  const counts = new Map<string, number>();
  for (const r of result.results) {
    for (const t of (r.tags || '').split(',').map(s => s.trim()).filter(Boolean)) {
      counts.set(t, (counts.get(t) || 0) + 1);
    }
  }
  return json({ tags: Array.from(counts.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count) });
});

// POST /api/blog/slug/:slug/like — لایک (public, no auth required)
blogRoutes.post('/slug/:slug/like', async (c) => {
  const slug = c.req.param('slug');
  await c.env.DB.prepare(
    `UPDATE blog_posts SET like_count = like_count + 1 WHERE slug=?`
  ).bind(slug).run();
  const row = await c.env.DB.prepare(`SELECT like_count FROM blog_posts WHERE slug=?`).bind(slug).first<{ like_count: number }>();
  return json({ like_count: row?.like_count || 0 });
});
