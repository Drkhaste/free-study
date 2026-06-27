// ============================================================
// AI routes (Gemini)
// ============================================================

import { Hono } from 'hono';
import { json, errorResponse, requireAuth } from '../lib/http';
import { callGemini, PROMPTS } from '../lib/gemini';
import { getSettings } from '../lib/settings';
import { renderMarkdown } from '../lib/markdown';
import type { AppEnv } from '../index';

export const aiRoutes = new Hono<AppEnv>();
aiRoutes.use('*', requireAuth);

// POST /api/ai/generate-topic
// Body: { title: string, project_name?: string, project_id?: number, topic_id?: number }
aiRoutes.post('/generate-topic', async (c) => {
  const user = c.get('user')!;
  const body = await c.req.json().catch(() => ({} as any));
  const title = body.title?.trim();
  if (!title) return errorResponse('عنوان الزامی است', 400);

  const settings = await getSettings(c.env.DB, c.env);
  if (!settings.gemini_api_key) return errorResponse('کلید Gemini API تنظیم نشده. لطفاً به پنل تنظیمات بروید.', 400, 'no_api_key');

  const prompt = PROMPTS.generateTopic(title, body.project_name);
  try {
    const response = await callGemini(settings.gemini_api_key, prompt, {
      systemPrompt: 'تو یک استاد دانشگاه پزشکی فارسی‌زبان هستی. فقط به فارسی پاسخ بده.',
      temperature: 0.7,
      maxTokens: 4096,
    });

    // لاگ
    await c.env.DB.prepare(
      `INSERT INTO ai_logs(user_id, topic_id, prompt, response_excerpt, model, tokens_used, status)
       VALUES(?, ?, ?, ?, 'gemini-2.5-flash', ?, 'success')`
    ).bind(user.id, body.topic_id || null, prompt.slice(0, 500), response.text.slice(0, 200), response.usage?.totalTokens || null).run();

    // اگه topic_id دادیم، محتوا رو مستقیم ذخیره کن
    if (body.topic_id) {
      const html = renderMarkdown(response.text);
      await c.env.DB.prepare(
        `UPDATE topics SET content_md=?, content_html=?, updated_at=datetime('now') WHERE id=? AND user_id=?`
      ).bind(response.text, html, body.topic_id, user.id).run();
    }

    return json({
      ok: true,
      content_md: response.text,
      content_html: renderMarkdown(response.text),
      usage: response.usage,
    });
  } catch (e: any) {
    await c.env.DB.prepare(
      `INSERT INTO ai_logs(user_id, topic_id, prompt, status, error_message)
       VALUES(?, ?, ?, 'error', ?)`
    ).bind(user.id, body.topic_id || null, prompt.slice(0, 500), e?.message?.slice(0, 500) || 'unknown').run();
    return errorResponse(`خطا در تولید محتوا: ${e?.message || 'unknown'}`, 500, 'ai_error');
  }
});

// POST /api/ai/generate-flashcards
// Body: { topic_title: string, count?: number, project_id?, topic_id? }
aiRoutes.post('/generate-flashcards', async (c) => {
  const user = c.get('user')!;
  const body = await c.req.json().catch(() => ({} as any));
  const topicTitle = body.topic_title?.trim();
  if (!topicTitle) return errorResponse('عنوان الزامی است', 400);

  const settings = await getSettings(c.env.DB, c.env);
  if (!settings.gemini_api_key) return errorResponse('کلید Gemini API تنظیم نشده', 400, 'no_api_key');

  const count = Math.min(30, Math.max(3, body.count || 10));
  const prompt = PROMPTS.generateFlashcards(topicTitle, count);

  try {
    const response = await callGemini(settings.gemini_api_key, prompt, {
      systemPrompt: 'تو یک متخصص آموزش پزشکی فارسی‌زبان هستی. خروجی فقط CSV بدون توضیح.',
      temperature: 0.6,
      maxTokens: 2048,
    });

    // parse CSV تولید شده
    const { parseFlashcardsCSV } = await import('../lib/csv');
    const parsed = parseFlashcardsCSV(response.text);
    if (parsed.cards.length === 0) {
      return errorResponse('AI خروجی معتبری تولید نکرد. دوباره تلاش کنید.', 500);
    }

    // اگه project_id یا topic_id دادیم، مستقیم ذخیره کن
    if (body.project_id || body.topic_id) {
      const stmt = c.env.DB.prepare(
        `INSERT INTO flashcards(user_id, project_id, topic_id, front, back, tags, next_review_at)
         VALUES(?, ?, ?, ?, ?, ?, datetime('now'))`
      );
      const batch = parsed.cards.map(card => stmt.bind(
        user.id, body.project_id || null, body.topic_id || null,
        card.front, card.back, card.tags || null
      ));
      await c.env.DB.batch(batch);
    }

    await c.env.DB.prepare(
      `INSERT INTO ai_logs(user_id, topic_id, prompt, response_excerpt, model, tokens_used, status)
       VALUES(?, ?, ?, ?, 'gemini-2.5-flash', ?, 'success')`
    ).bind(user.id, body.topic_id || null, prompt.slice(0, 500), response.text.slice(0, 200), response.usage?.totalTokens || null).run();

    return json({
      ok: true,
      flashcards: parsed.cards,
      count: parsed.cards.length,
      raw_csv: response.text,
      saved: !!(body.project_id || body.topic_id),
    });
  } catch (e: any) {
    return errorResponse(`خطا در تولید فلش‌کارت: ${e?.message || 'unknown'}`, 500, 'ai_error');
  }
});

// POST /api/ai/improve
// Body: { content: string }
aiRoutes.post('/improve', async (c) => {
  const user = c.get('user')!;
  const body = await c.req.json().catch(() => ({} as any));
  if (!body.content?.trim()) return errorResponse('محتوا خالی است', 400);

  const settings = await getSettings(c.env.DB, c.env);
  if (!settings.gemini_api_key) return errorResponse('کلید Gemini API تنظیم نشده', 400, 'no_api_key');

  try {
    const response = await callGemini(settings.gemini_api_key, PROMPTS.improveContent(body.content), {
      temperature: 0.4,
      maxTokens: 4096,
    });
    return json({
      ok: true,
      content_md: response.text,
      content_html: renderMarkdown(response.text),
    });
  } catch (e: any) {
    return errorResponse(`خطا: ${e?.message || 'unknown'}`, 500);
  }
});

// POST /api/ai/summarize
// Body: { content: string }
aiRoutes.post('/summarize', async (c) => {
  const user = c.get('user')!;
  const body = await c.req.json().catch(() => ({} as any));
  if (!body.content?.trim()) return errorResponse('محتوا خالی است', 400);

  const settings = await getSettings(c.env.DB, c.env);
  if (!settings.gemini_api_key) return errorResponse('کلید Gemini API تنظیم نشده', 400, 'no_api_key');

  try {
    const response = await callGemini(settings.gemini_api_key, PROMPTS.summarizeTopic(body.content), {
      temperature: 0.3,
      maxTokens: 500,
    });
    return json({ ok: true, summary: response.text.trim() });
  } catch (e: any) {
    return errorResponse(`خطا: ${e?.message || 'unknown'}`, 500);
  }
});

// GET /api/ai/logs
aiRoutes.get('/logs', async (c) => {
  const user = c.get('user')!;
  const limit = Math.min(100, parseInt(c.req.query('limit') || '30', 10));
  const result = await c.env.DB.prepare(
    `SELECT * FROM ai_logs WHERE user_id=? ORDER BY created_at DESC LIMIT ?`
  ).bind(user.id, limit).all();
  return json({ logs: result.results });
});
