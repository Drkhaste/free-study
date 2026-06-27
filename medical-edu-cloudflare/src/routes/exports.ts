// ============================================================
// Export routes (CSV, Markdown, JSON backup)
// ============================================================

import { Hono } from 'hono';
import { json, errorResponse, requireAuth } from '../lib/http';
import { toCSV } from '../lib/csv';
import type { AppEnv } from '../index';
import type { Flashcard, Topic, Project } from '../lib/types';

export const exportRoutes = new Hono<AppEnv>();
exportRoutes.use('*', requireAuth);

// GET /api/export/flashcards.csv?project_id=&topic_id=
exportRoutes.get('/flashcards.csv', async (c) => {
  const user = c.get('user')!;
  const projectId = c.req.query('project_id');
  const topicId = c.req.query('topic_id');

  let sql = `SELECT front, back, hint, tags FROM flashcards WHERE user_id=?`;
  const binds: any[] = [user.id];
  if (projectId) { sql += ` AND project_id=?`; binds.push(parseInt(projectId, 10)); }
  if (topicId) { sql += ` AND topic_id=?`; binds.push(parseInt(topicId, 10)); }
  sql += ` ORDER BY id`;

  const result = await c.env.DB.prepare(sql).bind(...binds).all<Flashcard>();
  const csv = toCSV(result.results);
  return new Response('\uFEFF' + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="flashcards-${Date.now()}.csv"`,
    },
  });
});

// GET /api/export/topic/:id.md
exportRoutes.get('/topic/:id.md', async (c) => {
  const user = c.get('user')!;
  const id = parseInt(c.req.param('id') || '0', 10);
  const topic = await c.env.DB.prepare(`SELECT * FROM topics WHERE id=? AND user_id=?`).bind(id, user.id).first<Topic>();
  if (!topic) return errorResponse('مبحث یافت نشد', 404);

  const md = `# ${topic.title}\n\n${topic.tags ? `> تگ‌ها: ${topic.tags}\n\n` : ''}${topic.content_md || ''}`;
  return new Response(md, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': `attachment; filename="${topic.slug || topic.id}.md"`,
    },
  });
});

// GET /api/export/backup.json — کل دیتا
exportRoutes.get('/backup.json', async (c) => {
  const user = c.get('user')!;
  const [projects, topics, flashcards, reviewSessions] = await Promise.all([
    c.env.DB.prepare(`SELECT * FROM projects WHERE user_id=?`).bind(user.id).all<Project>(),
    c.env.DB.prepare(`SELECT * FROM topics WHERE user_id=?`).bind(user.id).all<Topic>(),
    c.env.DB.prepare(`SELECT * FROM flashcards WHERE user_id=?`).bind(user.id).all<Flashcard>(),
    c.env.DB.prepare(`SELECT * FROM review_sessions WHERE user_id=?`).bind(user.id).all(),
  ]);

  const backup = {
    exported_at: new Date().toISOString(),
    version: 1,
    user: { id: user.id, username: user.username },
    projects: projects.results,
    topics: topics.results,
    flashcards: flashcards.results,
    review_sessions: reviewSessions.results,
  };

  return new Response(JSON.stringify(backup, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="backup-${Date.now()}.json"`,
    },
  });
});
