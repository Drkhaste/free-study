// ============================================================
// Settings routes (admin only)
// ============================================================

import { Hono } from 'hono';
import { json, errorResponse, requireAuth } from '../lib/http';
import { getSettings, setSetting } from '../lib/settings';
import { sendTelegramMessage } from '../lib/telegram';
import type { AppEnv } from '../index';

export const settingsRoutes = new Hono<AppEnv>();
settingsRoutes.use('*', requireAuth);

// GET /api/settings
settingsRoutes.get('/', async (c) => {
  const s = await getSettings(c.env.DB, c.env);
  // موسوی‌سازی: کلید API رو ماسک کن
  return json({
    settings: {
      ...s,
      gemini_api_key: s.gemini_api_key ? maskKey(s.gemini_api_key) : '',
      telegram_bot_token: s.telegram_bot_token ? maskKey(s.telegram_bot_token) : '',
      has_gemini_key: !!s.gemini_api_key,
      has_telegram_token: !!s.telegram_bot_token,
    }
  });
});

// PUT /api/settings
settingsRoutes.put('/', async (c) => {
  const user = c.get('user')!;
  if (user.role !== 'admin') return errorResponse('فقط ادمین دسترسی دارد', 403);

  const body = await c.req.json().catch(() => ({} as any));
  const allowed = ['gemini_api_key', 'telegram_bot_token', 'telegram_channel_id', 'telegram_daily_hour', 'site_title', 'site_description'];

  for (const key of allowed) {
    if (body[key] !== undefined && body[key] !== null && body[key] !== '') {
      await setSetting(c.env.DB, key, String(body[key]));
    }
  }
  const s = await getSettings(c.env.DB, c.env);
  return json({
    settings: {
      ...s,
      gemini_api_key: maskKey(s.gemini_api_key),
      telegram_bot_token: maskKey(s.telegram_bot_token),
      has_gemini_key: !!s.gemini_api_key,
      has_telegram_token: !!s.telegram_bot_token,
    }
  });
});

// POST /api/settings/test-telegram
settingsRoutes.post('/test-telegram', async (c) => {
  const user = c.get('user')!;
  if (user.role !== 'admin') return errorResponse('فقط ادمین دسترسی دارد', 403);

  const s = await getSettings(c.env.DB, c.env);
  if (!s.telegram_bot_token) return errorResponse('توکن ربات تلگرام تنظیم نشده', 400);
  if (!s.telegram_channel_id) return errorResponse('شناسه کانال تنظیم نشده', 400);

  const res = await sendTelegramMessage(s.telegram_bot_token, {
    chat_id: s.telegram_channel_id,
    text: '✅ <b>تست اتصال</b>\n\nربات با موفقیت به کانال وصل شد.',
    parse_mode: 'HTML',
    disable_web_page_preview: true,
  });
  return json(res);
});

// POST /api/settings/send-topic/:id — ارسال دستی یک مبحث به کانال
settingsRoutes.post('/send-topic/:id', async (c) => {
  const user = c.get('user')!;
  if (user.role !== 'admin') return errorResponse('فقط ادمین دسترسی دارد', 403);
  const topicId = parseInt(c.req.param('id'), 10);
  const topic = await c.env.DB.prepare(`SELECT * FROM topics WHERE id=? AND user_id=?`).bind(topicId, user.id).first<any>();
  if (!topic) return errorResponse('مبحث یافت نشد', 404);

  const s = await getSettings(c.env.DB, c.env);
  if (!s.telegram_bot_token || !s.telegram_channel_id) return errorResponse('تلگرام کانفیگ نشده', 400);

  const { sendDailyTopic } = await import('../lib/telegram');
  const blogUrl = `${new URL(c.req.url).origin}/blog/${topic.slug || topic.id}`;
  const res = await sendDailyTopic({
    botToken: s.telegram_bot_token,
    chatId: s.telegram_channel_id,
    title: topic.title,
    contentMd: topic.content_md || '',
    blogUrl,
  });

  // ذخیره message_id در blog_posts
  if (res.ok && res.message_id) {
    await c.env.DB.prepare(
      `INSERT INTO blog_posts(topic_id, slug, telegram_message_id, telegram_sent_at, published_at)
       VALUES(?, ?, ?, datetime('now'), COALESCE((SELECT published_at FROM blog_posts WHERE topic_id=?), datetime('now')))
       ON CONFLICT(topic_id) DO UPDATE SET telegram_message_id=excluded.telegram_message_id, telegram_sent_at=excluded.telegram_sent_at`
    ).bind(topicId, topic.slug || `topic-${topicId}`, res.message_id, topicId).run();
  }

  return json(res);
});

function maskKey(key: string): string {
  if (!key) return '';
  if (key.length <= 8) return '****';
  return key.slice(0, 4) + '••••••••' + key.slice(-4);
}
