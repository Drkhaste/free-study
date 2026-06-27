// ============================================================
// Telegram Webhook — کنترل محتوا از طریق ربات تلگرام
// ============================================================
// دستورات پشتیبانی شده:
//   /start                 - پیام خوش‌آمد
//   /help                  - راهنمای دستورات
//   /new <title>           - ساخت مبحث/پست جدید (پیش‌نویس)
//   /list                  - لیست ۱۰ مبحث اخیر
//   /publish <id>          - انتشار مبحث در وبلاگ
//   /send <id>             - ارسال مبحث به کانال
//   /delete <id>           - حذف مبحث
//   /drafts                - لیست پیش‌نویس‌ها
//   /stats                 - آمار کلی
// ============================================================

import { Hono } from 'hono';
import { json } from '../lib/http';
import { getSettings, setSetting } from '../lib/settings';
import { sendTelegramMessage, sendDailyTopic, buildInlineKeyboard } from '../lib/telegram';
import { renderMarkdown, slugify, makeExcerpt, wordCount } from '../lib/markdown';
import type { AppEnv } from '../index';

export const telegramRoutes = new Hono<AppEnv>();

// POST /api/telegram/webhook
// این endpoint توسط تلگرام صدا زده میشه
// هدر X-Telegram-Bot-Api-Secret-Token باید با telegram_webhook_secret در settings مطابقت داشته باشه
telegramRoutes.post('/webhook', async (c) => {
  const settings = await getSettings(c.env.DB, c.env);

  // بررسی secret token
  const secretHeader = c.req.header('X-Telegram-Bot-Api-Secret-Token') || '';
  const expectedSecret = settings.telegram_webhook_secret;

  if (expectedSecret && secretHeader !== expectedSecret) {
    return c.json({ error: 'unauthorized' }, 401);
  }

  // اگه توکن ست نشده، رد کن
  if (!settings.telegram_bot_token) {
    return c.json({ error: 'no_bot_token' }, 500);
  }

  const update = await c.req.json().catch(() => null);
  if (!update) return c.json({ ok: false });

  const message = update.message || update.edited_message;
  const callbackQuery = update.callback_query;

  if (!message && !callbackQuery) return c.json({ ok: true });

  const chatId = message ? message.chat?.id : callbackQuery.message?.chat?.id;
  const fromId = message ? message.from?.id : callbackQuery.from?.id;
  const text: string = message ? (message.text || '') : '';
  const data: string = callbackQuery ? (callbackQuery.data || '') : '';

  try {
    let response: CommandResponse | null = null;
    if (message) {
      response = await handleCommand(c.env, settings, text, chatId, fromId);
    } else if (callbackQuery) {
      response = await handleCallback(c.env, settings, data, chatId, fromId);
      // Answer callback query to remove loading state on button
      await fetch(`https://api.telegram.org/bot${settings.telegram_bot_token}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_query_id: callbackQuery.id }),
      });
    }

    if (response) {
      await sendTelegramMessage(settings.telegram_bot_token, {
        chat_id: chatId,
        text: response.text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        reply_markup: response.keyboard,
      });
    }
  } catch (e: any) {
    await sendTelegramMessage(settings.telegram_bot_token, {
      chat_id: chatId,
      text: `❌ خطا: ${e?.message || 'unknown'}`,
      parse_mode: 'HTML',
    });
  }

  return c.json({ ok: true });
});

// GET /api/telegram/setup — ساخت webhook با تلگرام
// (admin only)
telegramRoutes.get('/setup', async (c) => {
  const user = c.get('user');
  if (!user || user.role !== 'admin') return c.json({ error: 'unauthorized' }, 401);

  const settings = await getSettings(c.env.DB, c.env);
  if (!settings.telegram_bot_token) return c.json({ error: 'no_bot_token' }, 400);

  // تولید secret جدید
  const secret = Array.from(crypto.getRandomValues(new Uint8Array(24)), b => b.toString(16).padStart(2, '0')).join('');
  await setSetting(c.env.DB, 'telegram_webhook_secret', secret);

  const baseUrl = new URL(c.req.url).origin;
  const webhookUrl = `${baseUrl}/api/telegram/webhook`;

  // تنظیم webhook با تلگرام
  const tgUrl = `https://api.telegram.org/bot${settings.telegram_bot_token}/setWebhook`;
  const res = await fetch(tgUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: webhookUrl,
      secret_token: secret,
      allowed_updates: ['message', 'edited_message'],
    }),
  });
  const data = await res.json() as any;

  return c.json({
    ok: data.ok,
    webhook_url: webhookUrl,
    description: data.description,
    secret_set: true,
  });
});

// GET /api/telegram/status — وضعیت webhook
telegramRoutes.get('/status', async (c) => {
  const user = c.get('user');
  if (!user || user.role !== 'admin') return c.json({ error: 'unauthorized' }, 401);

  const settings = await getSettings(c.env.DB, c.env);
  if (!settings.telegram_bot_token) return c.json({ error: 'no_bot_token' }, 400);

  const res = await fetch(`https://api.telegram.org/bot${settings.telegram_bot_token}/getWebhookInfo`);
  const data = await res.json() as any;

  return c.json({
    ok: data.ok,
    webhook: data.result,
    has_secret: !!settings.telegram_webhook_secret,
  });
});

// ====== Command handler ======
interface CommandResponse {
  text: string;
  keyboard?: any;
}

async function handleCallback(env: any, settings: any, data: string, chatId: number, fromId?: number): Promise<CommandResponse | null> {
  const DB = env.DB as D1Database;

  if (data === 'cmd_new') {
    return { text: 'لطفاً عنوان مبحث جدید را بفرستید (بدون دستور).' };
  }
  if (data === 'cmd_list') {
    return handleCommand(env, settings, '/list', chatId, fromId);
  }
  if (data === 'cmd_drafts') {
    return handleCommand(env, settings, '/drafts', chatId, fromId);
  }
  if (data === 'cmd_stats') {
    return handleCommand(env, settings, '/stats', chatId, fromId);
  }

  if (data.startsWith('publish_')) {
    const id = data.split('_')[1];
    return handleCommand(env, settings, `/publish ${id}`, chatId, fromId);
  }

  if (data.startsWith('send_')) {
    const id = data.split('_')[1];
    return handleCommand(env, settings, `/send ${id}`, chatId, fromId);
  }

  return null;
}

async function createTopic(env: any, DB: D1Database, title: string): Promise<CommandResponse> {
  // پیدا کردن اولین پروژه (یا ساخت پروژه‌ی پیش‌فرض)
  let project = await DB.prepare(`SELECT id, title FROM projects ORDER BY id LIMIT 1`).first<{ id: number; title: string }>();
  if (!project) {
    const r = await DB.prepare(`INSERT INTO projects(user_id, title, description, color) VALUES(1, 'عمومی', 'پروژه پیش‌فرض', '#3b82f6')`).run();
    project = { id: r.meta.last_row_id as number, title: 'عمومی' };
  }

  const slug = slugify(title);
  const result = await DB.prepare(
    `INSERT INTO topics(project_id, user_id, title, slug, content_md, content_html, excerpt, status, word_count)
     VALUES(?, 1, ?, ?, '', '', '', 'draft', 0)`
  ).bind(project.id, title, slug).run();
  const topicId = result.meta.last_row_id as number;

  const editUrl = `${getBaseUrl(env)}/topics/${topicId}/edit`;
  return {
    text: `✅ <b>مبحث جدید ساخته شد</b>\n\n📝 عنوان: ${escapeHtml(title)}\n🆔 شناسه: <code>${topicId}</code>\n📁 پروژه: ${escapeHtml(project.title)}\n📌 وضعیت: پیش‌نویس\n\nبرای ویرایش محتوا یا انتشار از دکمه‌های زیر استفاده کنید.`,
    keyboard: buildInlineKeyboard([
      [{ text: '📝 ویرایش در پنل', url: editUrl }],
      [{ text: '🟢 انتشار در وبلاگ', callback_data: `publish_${topicId}` }, { text: '📢 ارسال به کانال', callback_data: `send_${topicId}` }]
    ]),
  };
}

async function handleCommand(env: any, settings: any, text: string, chatId: number, fromId?: number): Promise<CommandResponse | null> {
  const DB = env.DB as D1Database;

  if (!text.startsWith('/')) {
    // If not a command, assume it's a title for a new topic
    return createTopic(env, DB, text);
  }

  if (text.startsWith('/')) {
    const parts = text.trim().split(/\s+/);
    const cmd = parts[0].toLowerCase().split('@')[0]; // حذف @botname
    const args = parts.slice(1).join(' ');

    switch (cmd) {
      case '/start':
        return {
          text: `👋 سلام!\n\nبه ربات مدیریت <b>${escapeHtml(settings.site_title || 'آکادمی پزشکی')}</b> خوش آمدید.\n\nبرای مدیریت محتوا از دکمه‌های زیر استفاده کنید یا /help را بفرستید.`,
          keyboard: buildInlineKeyboard([
            [{ text: '➕ مبحث جدید', callback_data: 'cmd_new' }, { text: '📝 لیست پیش‌نویس‌ها', callback_data: 'cmd_drafts' }],
            [{ text: '📋 ۱۰ مبحث اخیر', callback_data: 'cmd_list' }, { text: '📊 آمار کلی', callback_data: 'cmd_stats' }],
            [{ text: '🌐 مشاهده وبلاگ', url: getBaseUrl(env) + '/blog' }]
          ])
        };

      case '/help':
        return {
          text: `📖 <b>راهنمای دستورات</b>\n\n` +
                `<b>/new &lt;title&gt;</b>\nساخت مبحث جدید (پیش‌نویس)\n\n` +
                `<b>/list</b>\nلیست ۱۰ مبحث اخیر\n\n` +
                `<b>/drafts</b>\nلیست پیش‌نویس‌ها\n\n` +
                `<b>/publish &lt;id&gt;</b>\nانتشار مبحث در وبلاگ\n\n` +
                `<b>/send &lt;id&gt;</b>\nارسال مبحث به کانال\n\n` +
                `<b>/delete &lt;id&gt;</b>\nحذف مبحث\n\n` +
                `<b>/stats</b>\nآمار کلی\n\n` +
                `<b>/help</b>\nاین راهنما`,
        };

      case '/new': {
        const title = args.trim();
        if (!title) return { text: '❌ عنوان الزامی است.\n\nمثال:\n<code>/new نارسایی قلبی</code>' };

        return createTopic(env, DB, title);
      }

    case '/list': {
      const result = await DB.prepare(`
        SELECT t.id, t.title, t.status, t.published_at, p.title AS project_title
        FROM topics t LEFT JOIN projects p ON p.id = t.project_id
        ORDER BY t.created_at DESC LIMIT 10
      `).all();
      if (!result.results.length) return { text: '📭 هیچ مبحثی وجود ندارد.' };

      const lines = result.results.map((t: any, i: number) => {
        const statusIcon = t.status === 'published' ? '🟢' : t.status === 'archived' ? '🔴' : '🟡';
        return `${i + 1}. ${statusIcon} <b>${escapeHtml(t.title)}</b> [${t.id}]\n   ${escapeHtml(t.project_title || '')}`;
      }).join('\n');

      return { text: `📋 <b>۱۰ مبحث اخیر</b>\n\n${lines}` };
    }

    case '/drafts': {
      const result = await DB.prepare(`
        SELECT id, title FROM topics WHERE status='draft' ORDER BY created_at DESC LIMIT 20
      `).all();
      if (!result.results.length) return { text: '📭 هیچ پیش‌نویسی وجود ندارد.' };

      const lines = result.results.map((t: any, i: number) => `${i + 1}. <b>${escapeHtml(t.title)}</b> [${t.id}]`).join('\n');
      return { text: `📝 <b>پیش‌نویس‌ها</b>\n\n${lines}\n\nبرای انتشار: <code>/publish &lt;id&gt;</code>` };
    }

    case '/publish': {
      const id = parseInt(args, 10);
      if (!id) return { text: '❌ شناسه نامعتبر.\n\nمثال: <code>/publish 5</code>' };

      const topic = await DB.prepare(`SELECT * FROM topics WHERE id=?`).bind(id).first<any>();
      if (!topic) return { text: `❌ مبحثی با شناسه ${id} یافت نشد.` };

      const slug = topic.slug || slugify(topic.title);
      const publishedAt = topic.published_at || new Date().toISOString();
      await DB.prepare(
        `UPDATE topics SET status='published', published_at=?, slug=?, updated_at=datetime('now') WHERE id=?`
      ).bind(publishedAt, slug, id).run();

      await DB.prepare(
        `INSERT INTO blog_posts(topic_id, slug, published_at) VALUES(?, ?, ?)
         ON CONFLICT(topic_id) DO UPDATE SET slug=excluded.slug, published_at=excluded.published_at`
      ).bind(id, slug, publishedAt).run();

      const blogUrl = `${getBaseUrl(env)}/blog/${slug}`;
      return {
        text: `✅ <b>منتشر شد!</b>\n\n📝 ${escapeHtml(topic.title)}\n🆔 ${id}\n🌐 <a href="${blogUrl}">مشاهده در وبلاگ</a>`,
        keyboard: buildInlineKeyboard([[{ text: '📖 مشاهده در وبلاگ', url: blogUrl }]]),
      };
    }

    case '/send': {
      const id = parseInt(args, 10);
      if (!id) return { text: '❌ شناسه نامعتبر.\n\nمثال: <code>/send 5</code>' };

      const topic = await DB.prepare(`SELECT * FROM topics WHERE id=?`).bind(id).first<any>();
      if (!topic) return { text: `❌ مبحثی با شناسه ${id} یافت نشد.` };

      if (!settings.telegram_channel_id) return { text: '❌ شناسه کانال تنظیم نشده.' };

      const blogUrl = `${getBaseUrl(env)}/blog/${topic.slug || slugify(topic.title)}`;
      const res = await sendDailyTopic({
        botToken: settings.telegram_bot_token,
        chatId: settings.telegram_channel_id,
        title: topic.title,
        contentMd: topic.content_md || '',
        blogUrl,
      });

      if (res.ok) {
        await DB.prepare(
          `INSERT INTO blog_posts(topic_id, slug, telegram_message_id, telegram_sent_at, published_at)
           VALUES(?, ?, ?, datetime('now'), COALESCE((SELECT published_at FROM blog_posts WHERE topic_id=?), datetime('now')))
           ON CONFLICT(topic_id) DO UPDATE SET telegram_message_id=excluded.telegram_message_id, telegram_sent_at=excluded.telegram_sent_at`
        ).bind(id, topic.slug || slugify(topic.title), res.message_id || null, id).run();

        return { text: `✅ ارسال شد!\n\n📝 ${escapeHtml(topic.title)}\n🆔 ${id}` };
      } else {
        return { text: `❌ خطا در ارسال: ${res.error}` };
      }
    }

    case '/delete': {
      const id = parseInt(args, 10);
      if (!id) return { text: '❌ شناسه نامعتبر.\n\nمثال: <code>/delete 5</code>' };

      const topic = await DB.prepare(`SELECT title FROM topics WHERE id=?`).bind(id).first<{ title: string }>();
      if (!topic) return { text: `❌ مبحثی با شناسه ${id} یافت نشد.` };

      await DB.prepare(`DELETE FROM topics WHERE id=?`).bind(id).run();
      return { text: `🗑 حذف شد: ${escapeHtml(topic.title)} [${id}]` };
    }

    case '/stats': {
      const [topics, published, drafts, projects, flashcards] = await Promise.all([
        DB.prepare(`SELECT COUNT(*) AS c FROM topics`).first<{ c: number }>(),
        DB.prepare(`SELECT COUNT(*) AS c FROM topics WHERE status='published'`).first<{ c: number }>(),
        DB.prepare(`SELECT COUNT(*) AS c FROM topics WHERE status='draft'`).first<{ c: number }>(),
        DB.prepare(`SELECT COUNT(*) AS c FROM projects`).first<{ c: number }>(),
        DB.prepare(`SELECT COUNT(*) AS c FROM flashcards`).first<{ c: number }>(),
      ]);

      return {
        text: `📊 <b>آمار کلی</b>\n\n` +
              `📁 پروژه‌ها: <b>${projects?.c || 0}</b>\n` +
              `📄 کل مباحث: <b>${topics?.c || 0}</b>\n` +
              `🟢 منتشر شده: <b>${published?.c || 0}</b>\n` +
              `🟡 پیش‌نویس: <b>${drafts?.c || 0}</b>\n` +
              `🃏 فلش‌کارت‌ها: <b>${flashcards?.c || 0}</b>`,
      };
    }

    default:
      return { text: `❓ دستور ناشناخته: <code>${escapeHtml(cmd)}</code>\n\nبرای راهنما: /help` };
  }
}
}
function escapeHtml(s: string): string {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function getBaseUrl(env: any): string {
  return env.ENVIRONMENT === 'production' ? 'https://medical-edu-app.workers.dev' : 'http://localhost:8787';
}
