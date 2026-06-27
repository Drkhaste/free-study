// ============================================================
// Review routes (SM-2 spaced repetition)
// ============================================================

import { Hono } from 'hono';
import { json, errorResponse, requireAuth } from '../lib/http';
import { sm2, QUALITY_BY_BUTTON, ReviewButton } from '../lib/sm2';
import type { AppEnv } from '../index';
import type { Flashcard } from '../lib/types';

export const reviewRoutes = new Hono<AppEnv>();
reviewRoutes.use('*', requireAuth);

// GET /api/review/queue — گرفتن کارت‌های آماده مرور امروز
// ?limit=20&project_id=&topic_id=
reviewRoutes.get('/queue', async (c) => {
  const user = c.get('user')!;
  const limit = Math.min(50, Math.max(1, parseInt(c.req.query('limit') || '20', 10)));
  const projectId = c.req.query('project_id');
  const topicId = c.req.query('topic_id');

  const where: string[] = ['user_id = ?', `next_review_at <= datetime('now')`];
  const binds: any[] = [user.id];
  if (projectId) { where.push('project_id = ?'); binds.push(parseInt(projectId, 10)); }
  if (topicId) { where.push('topic_id = ?'); binds.push(parseInt(topicId, 10)); }

  const sql = `SELECT * FROM flashcards WHERE ${where.join(' AND ')} ORDER BY next_review_at ASC LIMIT ?`;
  const result = await c.env.DB.prepare(sql).bind(...binds, limit).all<Flashcard>();

  // ساخت session
  const sessionResult = await c.env.DB.prepare(
    `INSERT INTO review_sessions(user_id, started_at) VALUES(?, datetime('now'))`
  ).bind(user.id).run();
  const sessionId = sessionResult.meta.last_row_id as number;

  return json({
    session_id: sessionId,
    queue: result.results,
    total: result.results.length,
  });
});

// POST /api/review/:session_id/answer
// Body: { card_id: number, button: 'again'|'hard'|'good'|'easy' }
reviewRoutes.post('/:session_id/answer', async (c) => {
  const user = c.get('user')!;
  const sessionId = parseInt(c.req.param('session_id'), 10);
  const body = await c.req.json().catch(() => ({} as any));
  const cardId = parseInt(body.card_id, 10);
  const button = body.button as ReviewButton;

  if (!QUALITY_BY_BUTTON.hasOwnProperty(button)) return errorResponse('دکمه نامعتبر', 400);

  const card = await c.env.DB.prepare(
    `SELECT * FROM flashcards WHERE id=? AND user_id=?`
  ).bind(cardId, user.id).first<Flashcard>();
  if (!card) return errorResponse('کارت یافت نشد', 404);

  const quality = QUALITY_BY_BUTTON[button];
  const result = sm2({ ease: card.ease, interval: card.interval, repetitions: card.repetitions }, quality);

  const correct = quality >= 3 ? 1 : 0;
  await c.env.DB.prepare(
    `UPDATE flashcards
     SET ease=?, interval=?, repetitions=?, next_review_at=?, last_reviewed_at=datetime('now'),
         total_reviews=total_reviews+1, correct_reviews=correct_reviews+?
     WHERE id=?`
  ).bind(result.ease, result.interval, result.repetitions, result.nextReviewAt, correct, cardId).run();

  // به‌روزرسانی session
  await c.env.DB.prepare(
    `UPDATE review_sessions SET cards_reviewed=cards_reviewed+1, cards_correct=cards_correct+? WHERE id=? AND user_id=?`
  ).bind(correct, sessionId, user.id).run();

  return json({
    ok: true,
    next_review_at: result.nextReviewAt,
    interval_days: result.interval,
    ease: result.ease,
    repetitions: result.repetitions,
  });
});

// POST /api/review/:session_id/end — پایان session
reviewRoutes.post('/:session_id/end', async (c) => {
  const user = c.get('user')!;
  const sessionId = parseInt(c.req.param('session_id'), 10);
  const session = await c.env.DB.prepare(`SELECT * FROM review_sessions WHERE id=? AND user_id=?`).bind(sessionId, user.id).first<any>();
  if (!session) return errorResponse('نشست یافت نشد', 404);

  const durationSec = Math.round((Date.now() - new Date(session.started_at).getTime()) / 1000);
  await c.env.DB.prepare(
    `UPDATE review_sessions SET ended_at=datetime('now'), duration_sec=? WHERE id=?`
  ).bind(durationSec, sessionId).run();

  return json({
    ok: true,
    session: {
      ...session,
      ended_at: new Date().toISOString(),
      duration_sec: durationSec,
    }
  });
});

// GET /api/review/history — تاریخچه‌ی مرورها
reviewRoutes.get('/history', async (c) => {
  const user = c.get('user')!;
  const limit = Math.min(100, Math.max(5, parseInt(c.req.query('limit') || '30', 10)));
  const result = await c.env.DB.prepare(
    `SELECT * FROM review_sessions WHERE user_id=? ORDER BY started_at DESC LIMIT ?`
  ).bind(user.id, limit).all();
  return json({ sessions: result.results });
});
