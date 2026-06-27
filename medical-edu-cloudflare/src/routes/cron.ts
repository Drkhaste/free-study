// ============================================================
// Cron handler — ارسال روزانه مبحث به تلگرام + انتشار در وبلاگ
// ============================================================

import { sendDailyTopic } from '../lib/telegram';
import { getSettings } from '../lib/settings';
import { renderMarkdown, makeExcerpt, slugify, readingTime, wordCount } from '../lib/markdown';
import type { Env, Topic } from '../lib/types';

// ورودی HTTP (manual trigger)
export async function handleCron(c: any): Promise<Response> {
  // در production باید با یه secret محافظت بشه
  const secret = c.req.query('secret');
  if (secret !== c.env.JWT_SECRET && secret !== 'cron-trigger') {
    return c.json({ error: 'unauthorized' }, 401);
  }
  const result = await runDailyJob(c.env);
  return c.json(result);
}

// ورودی scheduled event
export async function handleCronScheduled(env: Env): Promise<void> {
  await runDailyJob(env);
}

async function runDailyJob(env: Env): Promise<{ ok: boolean; sent?: boolean; topic_id?: number; error?: string }> {
  const settings = await getSettings(env.DB, env);
  if (!settings.telegram_bot_token || !settings.telegram_channel_id) {
    return { ok: false, error: 'telegram_not_configured' };
  }

  // مبحث بعدی برای ارسال رو پیدا کن:
  // ۱. اگه در settings یک topic_id مشخص شده → همان
  // ۲. در غیر این صورت، قدیمی‌ترین مبحث published که هنوز تلگرام نشده
  let topic: Topic | null = null;

  // ۱. موضوع مشخص شده
  const manualTopicId = await env.DB.prepare(`SELECT value FROM settings WHERE key='telegram_daily_topic_id'`).first<{ value: string }>();
  if (manualTopicId?.value) {
    topic = await env.DB.prepare(`SELECT * FROM topics WHERE id=?`).bind(parseInt(manualTopicId.value, 10)).first<Topic>();
  }

  // ۲. موضوع بعدی که هنوز تلگرام نشده
  if (!topic) {
    topic = await env.DB.prepare(`
      SELECT t.* FROM topics t
      LEFT JOIN blog_posts bp ON bp.topic_id = t.id
      WHERE t.status='published' AND (bp.telegram_message_id IS NULL)
      ORDER BY t.published_at ASC
      LIMIT 1
    `).first<Topic>();
  }

  // ۳. اگه هیچ‌کدوم نبود، یک مبحث رندوم published انتخاب کن
  if (!topic) {
    topic = await env.DB.prepare(`
      SELECT * FROM topics WHERE status='published' ORDER BY RANDOM() LIMIT 1
    `).first<Topic>();
  }

  if (!topic) return { ok: false, error: 'no_published_topic' };

  // اگه هنوز در وبلاگ نیست، اضافه‌اش کن
  if (!topic.slug) {
    const slug = slugify(topic.title);
    await env.DB.prepare(`UPDATE topics SET slug=? WHERE id=?`).bind(slug, topic.id).run();
    topic.slug = slug;
  }

  // blog_posts رو آپدیت کن
  const blogUrl = `${env.ENVIRONMENT === 'production' ? 'https://medical-edu-app.workers.dev' : 'http://localhost:8787'}/blog/${topic.slug}`;

  const result = await sendDailyTopic({
    botToken: settings.telegram_bot_token,
    chatId: settings.telegram_channel_id,
    title: topic.title,
    contentMd: topic.content_md || '',
    blogUrl,
  });

  if (result.ok) {
    // ثبت در blog_posts
    await env.DB.prepare(
      `INSERT INTO blog_posts(topic_id, slug, telegram_message_id, telegram_sent_at, published_at)
       VALUES(?, ?, ?, datetime('now'), COALESCE((SELECT published_at FROM blog_posts WHERE topic_id=?), datetime('now')))
       ON CONFLICT(topic_id) DO UPDATE SET telegram_message_id=excluded.telegram_message_id, telegram_sent_at=excluded.telegram_sent_at`
    ).bind(topic.id, topic.slug, result.message_id || null, topic.id).run();
  }

  return { ok: result.ok, sent: result.ok, topic_id: topic.id, error: result.error };
}
