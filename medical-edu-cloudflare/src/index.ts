// ============================================================
// Cloudflare Worker — Medical Education Platform
// Hono + D1 + JWT + Gemini + Telegram + SM-2 Flashcards + Blog
// ============================================================

import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { authMiddleware } from './lib/http';
import type { Env } from './lib/types';

// route modules
import { authRoutes } from './routes/auth';
import { projectRoutes } from './routes/projects';
import { topicRoutes } from './routes/topics';
import { flashcardRoutes } from './routes/flashcards';
import { reviewRoutes } from './routes/review';
import { aiRoutes } from './routes/ai';
import { blogRoutes } from './routes/blog';
import { settingsRoutes } from './routes/settings';
import { exportRoutes } from './routes/exports';
import { telegramRoutes } from './routes/telegram';
import { taskRoutes } from './routes/tasks';
import { pageRoutes } from './routes/pages';
import { staticRoutes } from './static';

export type AppEnv = {
  Bindings: Env;
  Variables: {
    user: any;
    jwt: any;
  };
};

const app = new Hono<AppEnv>();

// global middleware
app.use('*', logger());

// CORS برای API routes
app.use('/api/*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Telegram-Bot-Api-Secret-Token'],
  credentials: true,
}));

// --- Telegram Webhook (بدون auth middleware — با secret token احراز میشه) ---
// باید قبل از auth middleware باشه
app.route('/api/telegram', telegramRoutes);

// apply auth middleware to other API routes
app.use('/api/auth/*', authMiddleware);
app.use('/api/projects/*', authMiddleware);
app.use('/api/topics/*', authMiddleware);
app.use('/api/flashcards/*', authMiddleware);
app.use('/api/review/*', authMiddleware);
app.use('/api/ai/*', authMiddleware);
app.use('/api/settings/*', authMiddleware);
app.use('/api/export/*', authMiddleware);
app.use('/api/tasks/*', authMiddleware);

// --- health check ---
app.get('/api/health', (c) => c.json({ ok: true, time: new Date().toISOString() }));

// --- mount routes ---
app.route('/api/auth', authRoutes);
app.route('/api/projects', projectRoutes);
app.route('/api/topics', topicRoutes);
app.route('/api/flashcards', flashcardRoutes);
app.route('/api/review', reviewRoutes);
app.route('/api/ai', aiRoutes);
app.route('/api/blog', blogRoutes);
app.route('/api/settings', settingsRoutes);
app.route('/api/export', exportRoutes);
app.route('/api/tasks', taskRoutes);

// --- static assets (frontend) ---
// فایل‌های static به صورت embedded در worker سرو میشن
// (به wrangler [site] config وابسته نیست)
app.route('/static', staticRoutes);

// --- frontend HTML pages ---
app.route('/', pageRoutes);

// --- cron handler: ارسال روزانه تلگرام ---
app.all('/__cron/daily', async (c) => {
  const { handleCron } = await import('./routes/cron');
  return handleCron(c);
});

// scheduled event handler (کلودفلر خودش صدا میزنه)
export default {
  fetch: app.fetch,
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    const { handleCronScheduled } = await import('./routes/cron');
    await handleCronScheduled(env);
  },
};
