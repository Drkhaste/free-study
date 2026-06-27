// ============================================================
// AI routes (Gemini) — فقط تولید/بهبود/خلاصه مبحث
// (قابلیت ساخت فلش‌کارت با AI حذف شد)
// ============================================================

import { Hono } from 'hono';
import { json, errorResponse, requireAuth } from '../lib/http';
import { callGemini, fillTemplate } from '../lib/gemini';
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

  // ساختن پرامپت با قالب سفارشی کاربر
  const projectContext = body.project_name ? ` (در حوزه‌ی ${body.project_name})` : '';
  const prompt = fillTemplate(settings.prompt_generate_topic, {
    title,
    project_context: projectContext,
  });

  try {
    const response = await callGemini(settings.gemini_api_key, prompt, {
      systemPrompt: settings.system_prompt,
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

// POST /api/ai/improve
// Body: { content: string }
aiRoutes.post('/improve', async (c) => {
  const user = c.get('user')!;
  const body = await c.req.json().catch(() => ({} as any));
  if (!body.content?.trim()) return errorResponse('محتوا خالی است', 400);

  const settings = await getSettings(c.env.DB, c.env);
  if (!settings.gemini_api_key) return errorResponse('کلید Gemini API تنظیم نشده', 400, 'no_api_key');

  const prompt = fillTemplate(settings.prompt_improve, { content: body.content });

  try {
    const response = await callGemini(settings.gemini_api_key, prompt, {
      systemPrompt: settings.system_prompt,
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

  const prompt = fillTemplate(settings.prompt_summarize, { content: body.content });

  try {
    const response = await callGemini(settings.gemini_api_key, prompt, {
      systemPrompt: settings.system_prompt,
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
