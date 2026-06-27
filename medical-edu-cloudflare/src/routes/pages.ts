// ============================================================
// HTML pages — served by the worker (no separate frontend build)
// ============================================================

import { Hono } from 'hono';
import { getSettings } from '../lib/settings';
import { renderMarkdown } from '../lib/markdown';
import type { AppEnv } from '../index';

export const pageRoutes = new Hono<AppEnv>();

// ----- helper: shell HTML -----
async function renderShell(env: any, opts: { title: string; page: string; description?: string; extraHead?: string; bodyClass?: string; }): Promise<string> {
  const s = await getSettings(env.DB, env);
  const siteTitle = s.site_title || 'آکادمی پزشکی';
  const siteDesc = s.site_description || 'پلتفرم آموزش پزشکی با هوش مصنوعی';
  const title = opts.page === 'home' ? siteTitle : `${opts.title} — ${siteTitle}`;
  const description = opts.description || siteDesc;

  return `<!DOCTYPE html>
<html lang="fa" dir="rtl" data-page="${opts.page}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0">
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="theme-color" content="#0ea5e9">
  <title>${escapeHtml(title)}</title>

  <!-- PWA -->
  <link rel="manifest" href="/static/manifest.json">
  <link rel="apple-touch-icon" href="/static/icon-192.png">

  <!-- Tailwind via CDN (fast, no build step) -->
  <script src="https://cdn.tailwindcss.com?plugins=typography,forms"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          fontFamily: {
            sans: ['Vazirmatn', 'system-ui', 'sans-serif'],
            mono: ['Vazirmatn', 'ui-monospace', 'monospace'],
          },
          colors: {
            brand: {
              50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd', 400: '#60a5fa',
              500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 800: '#1e40af', 900: '#1e3a8a',
            }
          },
          animation: {
            'fade-in': 'fadeIn 0.3s ease-out',
            'slide-up': 'slideUp 0.3s ease-out',
            'scale-in': 'scaleIn 0.2s ease-out',
          }
        }
      }
    }
  </script>

  <!-- Vazirmatn font -->
  <link rel="preconnect" href="https://cdn.jsdelivr.net">
  <link href="https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css" rel="stylesheet">

  <!-- App CSS -->
  <link rel="stylesheet" href="/static/app.css">

  <!-- marked.js + highlight.js for markdown rendering -->
  <script src="https://cdn.jsdelivr.net/npm/marked@12.0.2/marked.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/dompurify@3.0.11/dist/purify.min.js"></script>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.9.0/build/styles/atom-one-dark.min.css">
  <script src="https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.9.0/build/highlight.min.js"></script>

  <!-- Editor: EasyMDE -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/easymde/dist/easymde.min.css">
  <script src="https://cdn.jsdelivr.net/npm/easymde/dist/easymde.min.js"></script>

  ${opts.extraHead || ''}
</head>
<body class="${opts.bodyClass || ''} bg-slate-50 text-slate-800 dark:bg-slate-900 dark:text-slate-100 min-h-screen antialiased">
  <div id="app"></div>
  <script>window.__PAGE__ = ${JSON.stringify(opts.page)};</script>
  <script type="module" src="/static/app.js"></script>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return String(s || '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch] as string));
}

// ====== routes ======

// SPA shell — برای همه مسیرهای اپ (به جز /blog و /login)
pageRoutes.get('/', async (c) => c.html(await renderShell(c.env, { title: 'داشبورد', page: 'app' })));
pageRoutes.get('/login', async (c) => c.html(await renderShell(c.env, { title: 'ورود', page: 'login' })));
pageRoutes.get('/dashboard', async (c) => c.html(await renderShell(c.env, { title: 'داشبورد', page: 'app' })));
pageRoutes.get('/projects', async (c) => c.html(await renderShell(c.env, { title: 'پروژه‌ها', page: 'app' })));
pageRoutes.get('/projects/:id', async (c) => c.html(await renderShell(c.env, { title: 'پروژه', page: 'app' })));
pageRoutes.get('/topics/:id', async (c) => c.html(await renderShell(c.env, { title: 'مبحث', page: 'app' })));
pageRoutes.get('/topics/:id/edit', async (c) => c.html(await renderShell(c.env, { title: 'ویرایش مبحث', page: 'app' })));
pageRoutes.get('/flashcards', async (c) => c.html(await renderShell(c.env, { title: 'فلش‌کارت‌ها', page: 'app' })));
pageRoutes.get('/review', async (c) => c.html(await renderShell(c.env, { title: 'مرور', page: 'app' })));
pageRoutes.get('/settings', async (c) => c.html(await renderShell(c.env, { title: 'تنظیمات', page: 'app' })));
pageRoutes.get('/ai', async (c) => c.html(await renderShell(c.env, { title: 'هوش مصنوعی', page: 'app' })));

// ====== Blog pages (server-rendered for SEO) ======
pageRoutes.get('/blog', async (c) => {
  const page = parseInt(c.req.query('page') || '1', 10);
  const tag = c.req.query('tag');
  const q = c.req.query('q');
  const limit = 9;
  const offset = (page - 1) * limit;

  const where: string[] = ['t.status = ?'];
  const binds: any[] = ['published'];
  if (tag) { where.push('t.tags LIKE ?'); binds.push(`%${tag}%`); }
  if (q) { where.push('(t.title LIKE ? OR t.excerpt LIKE ?)'); binds.push(`%${q}%`, `%${q}%`); }

  const result = await c.env.DB.prepare(`
    SELECT t.id, t.title, t.slug, t.excerpt, t.tags, t.reading_time_min, t.published_at,
           p.title AS project_title, p.color AS project_color,
           bp.view_count, bp.like_count
    FROM topics t
    LEFT JOIN projects p ON p.id = t.project_id
    LEFT JOIN blog_posts bp ON bp.topic_id = t.id
    WHERE ${where.join(' AND ')}
    ORDER BY t.published_at DESC
    LIMIT ? OFFSET ?
  `).bind(...binds, limit, offset).all<any>();

  const total = await c.env.DB.prepare(`SELECT COUNT(*) AS c FROM topics t WHERE ${where.join(' AND ')}`).bind(...binds).first<{ c: number }>();
  const totalPages = Math.ceil((total?.c || 0) / limit);

  const tagsRes = await c.env.DB.prepare(`SELECT tags FROM topics WHERE status='published' AND tags IS NOT NULL AND tags != ''`).all<{ tags: string }>();
  const tags = new Map<string, number>();
  for (const r of tagsRes.results) for (const t of (r.tags || '').split(',').map(s => s.trim()).filter(Boolean)) tags.set(t, (tags.get(t) || 0) + 1);
  const tagList = Array.from(tags.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 15);

  const posts = result.results.map((p: any) => ({
    ...p,
    url: `/blog/${p.slug}`,
    date_fa: formatDateFa(p.published_at),
    tags: (p.tags || '').split(',').map((s: string) => s.trim()).filter(Boolean),
  }));

  return c.html(await renderBlogList(c.env, posts, { page, totalPages, tag, q, tagList }));
});

pageRoutes.get('/blog/:slug', async (c) => {
  const slug = c.req.param('slug');
  const topic = await c.env.DB.prepare(`
    SELECT t.*, p.title AS project_title, p.color AS project_color,
           bp.view_count, bp.like_count, bp.telegram_message_id
    FROM topics t
    LEFT JOIN projects p ON p.id = t.project_id
    LEFT JOIN blog_posts bp ON bp.topic_id = t.id
    WHERE t.slug=? AND t.status='published'
  `).bind(slug).first<any>();
  if (!topic) return c.html(notFoundPage(), 404);

  // increment view count
  await c.env.DB.prepare(
    `INSERT INTO blog_posts(topic_id, slug, view_count, published_at)
     VALUES(?, ?, 1, datetime('now'))
     ON CONFLICT(topic_id) DO UPDATE SET view_count=view_count+1`
  ).bind(topic.id, slug).run();

  // related posts
  const related = await c.env.DB.prepare(`
    SELECT t.id, t.title, t.slug, t.excerpt FROM topics t
    WHERE t.status='published' AND t.id != ? AND (t.tags LIKE ? OR t.project_id=?)
    ORDER BY t.published_at DESC LIMIT 3
  `).bind(topic.id, `%${(topic.tags || '').split(',')[0]?.trim() || ''}%`, topic.project_id).all<any>();

  return c.html(await renderBlogPost(c.env, topic, related.results));
});

// ===== helpers for blog HTML =====
async function renderBlogList(env: any, posts: any[], opts: { page: number; totalPages: number; tag?: string; q?: string; tagList: any[] }): Promise<string> {
  const s = await getSettings(env.DB, env);
  const postCards = posts.length === 0
    ? `<div class="col-span-3 text-center py-16 text-slate-400">
        <svg class="w-16 h-16 mx-auto mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 0a2 2 0 012 2v8a2 2 0 01-2 2m-2-12V6m0 12V8m0 12H9"></path></svg>
        <p class="text-lg">هنوز پستی منتشر نشده.</p>
      </div>`
    : posts.map(p => `
      <article class="group bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
        <div class="h-32 bg-gradient-to-br ${gradientFor(p.project_color || '#3b82f6')} relative overflow-hidden">
          <div class="absolute inset-0 opacity-20" style="background-image: radial-gradient(circle at 30% 30%, white 1px, transparent 1px); background-size: 20px 20px;"></div>
          ${p.project_color ? `<div class="absolute bottom-3 right-3 text-white/90 text-sm font-medium bg-black/20 backdrop-blur px-3 py-1 rounded-full">${escapeHtml(p.project_title || 'پروژه')}</div>` : ''}
        </div>
        <div class="p-5">
          <h2 class="text-lg font-bold mb-2 line-clamp-2 group-hover:text-brand-600 transition-colors">
            <a href="/blog/${p.slug}">${escapeHtml(p.title)}</a>
          </h2>
          <p class="text-sm text-slate-500 dark:text-slate-400 line-clamp-3 mb-3">${escapeHtml(p.excerpt || '')}</p>
          <div class="flex flex-wrap gap-1 mb-3">
            ${p.tags.slice(0, 3).map((t: string) => `<a href="/blog?tag=${encodeURIComponent(t)}" class="text-xs px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded-md hover:bg-brand-100 hover:text-brand-700 transition-colors">${escapeHtml(t)}</a>`).join('')}
          </div>
          <div class="flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-100 dark:border-slate-700">
            <span class="flex items-center gap-1">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
              ${p.date_fa}
            </span>
            <span class="flex items-center gap-3">
              <span class="flex items-center gap-1"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>${p.reading_time_min} دقیقه</span>
              <span class="flex items-center gap-1"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>${p.view_count || 0}</span>
            </span>
          </div>
        </div>
      </article>
    `).join('');

  const pagination = opts.totalPages > 1 ? `
    <div class="flex justify-center gap-2 mt-10">
      ${opts.page > 1 ? `<a href="/blog?page=${opts.page - 1}${opts.tag ? `&tag=${encodeURIComponent(opts.tag)}` : ''}${opts.q ? `&q=${encodeURIComponent(opts.q)}` : ''}" class="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-brand-50 hover:border-brand-300 transition-colors">قبلی</a>` : ''}
      <span class="px-4 py-2 bg-brand-600 text-white rounded-lg">${opts.page} / ${opts.totalPages}</span>
      ${opts.page < opts.totalPages ? `<a href="/blog?page=${opts.page + 1}${opts.tag ? `&tag=${encodeURIComponent(opts.tag)}` : ''}${opts.q ? `&q=${encodeURIComponent(opts.q)}` : ''}" class="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-brand-50 hover:border-brand-300 transition-colors">بعدی</a>` : ''}
    </div>
  ` : '';

  return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>وبلاگ — ${escapeHtml(s.site_title)}</title>
  <meta name="description" content="${escapeHtml(s.site_description)}">
  <meta name="theme-color" content="#0ea5e9">
  <link rel="manifest" href="/static/manifest.json">
  <link rel="apple-touch-icon" href="/static/icon-192.png">
  <script src="https://cdn.tailwindcss.com?plugins=typography"></script>
  <script>tailwind.config = { darkMode: 'class', theme: { extend: { fontFamily: { sans: ['Vazirmatn', 'system-ui', 'sans-serif'] }, colors: { brand: { 50:'#eff6ff',100:'#dbeafe',200:'#bfdbfe',300:'#93c5fd',400:'#60a5fa',500:'#3b82f6',600:'#2563eb',700:'#1d4ed8',800:'#1e40af',900:'#1e3a8a' } } } } }</script>
  <link href="https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css" rel="stylesheet">
  <link rel="stylesheet" href="/static/app.css">
</head>
<body class="bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 min-h-screen">
  <header class="bg-white dark:bg-slate-800 shadow-sm sticky top-0 z-40 backdrop-blur-lg bg-white/80 dark:bg-slate-800/80">
    <div class="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
      <a href="/blog" class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-cyan-500 flex items-center justify-center text-white font-bold text-xl">پ</div>
        <div>
          <h1 class="font-bold text-lg">${escapeHtml(s.site_title)}</h1>
          <p class="text-xs text-slate-500">وبلاگ آموزش پزشکی</p>
        </div>
      </a>
      <nav class="flex items-center gap-2">
        <a href="/dashboard" class="px-4 py-2 text-sm font-medium text-brand-600 hover:bg-brand-50 rounded-lg transition-colors">داشبورد</a>
        <a href="/login" class="px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors">ورود</a>
      </nav>
    </div>
  </header>

  <main class="max-w-6xl mx-auto px-4 py-8">
    <div class="text-center mb-10">
      <h2 class="text-3xl md:text-4xl font-bold mb-3 bg-gradient-to-l from-brand-600 to-cyan-600 bg-clip-text text-transparent">وبلاگ آموزش پزشکی</h2>
      <p class="text-slate-500 dark:text-slate-400">آخرین مباحث منتشر شده</p>
    </div>

    ${opts.tag ? `<div class="bg-brand-50 border border-brand-200 rounded-lg px-4 py-3 mb-6 text-sm">برچسب: <b>${escapeHtml(opts.tag)}</b> — <a href="/blog" class="text-brand-600">حذف فیلتر</a></div>` : ''}
    ${opts.q ? `<div class="bg-brand-50 border border-brand-200 rounded-lg px-4 py-3 mb-6 text-sm">جستجو: <b>${escapeHtml(opts.q)}</b></div>` : ''}

    <form action="/blog" method="get" class="max-w-md mx-auto mb-8">
      <div class="relative">
        <input type="text" name="q" value="${escapeHtml(opts.q || '')}" placeholder="جستجو در وبلاگ..." class="w-full pr-10 pl-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all">
        <button type="submit" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-600">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        </button>
      </div>
    </form>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      ${postCards}
    </div>

    ${pagination}

    ${opts.tagList.length > 0 ? `
    <div class="mt-12 pt-8 border-t border-slate-200 dark:border-slate-700">
      <h3 class="text-sm font-bold text-slate-500 mb-3">برچسب‌های پرتکرار</h3>
      <div class="flex flex-wrap gap-2">
        ${opts.tagList.map((t: any) => `<a href="/blog?tag=${encodeURIComponent(t.name)}" class="px-3 py-1.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-brand-50 hover:border-brand-300 transition-colors">${escapeHtml(t.name)} <span class="text-xs text-slate-400">${t.count}</span></a>`).join('')}
      </div>
    </div>
    ` : ''}
  </main>

  <footer class="border-t border-slate-200 dark:border-slate-700 mt-16 py-8">
    <div class="max-w-6xl mx-auto px-4 text-center text-sm text-slate-500">
      <p>${escapeHtml(s.site_title)} — ${escapeHtml(s.site_description)}</p>
    </div>
  </footer>
</body>
</html>`;
}

async function renderBlogPost(env: any, topic: any, related: any[]): Promise<string> {
  const s = await getSettings(env.DB, env);
  const html = renderMarkdown(topic.content_md || '');
  const tags: string[] = (topic.tags || '').split(',').map((t: string) => t.trim()).filter((s: string) => Boolean(s));
  const dateFa = formatDateFa(topic.published_at);

  return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(topic.title)} — ${escapeHtml(s.site_title)}</title>
  <meta name="description" content="${escapeHtml(topic.excerpt || '')}">
  <meta property="og:title" content="${escapeHtml(topic.title)}">
  <meta property="og:description" content="${escapeHtml(topic.excerpt || '')}">
  <meta property="og:type" content="article">
  <meta name="theme-color" content="#0ea5e9">
  <link rel="manifest" href="/static/manifest.json">
  <script src="https://cdn.tailwindcss.com?plugins=typography"></script>
  <script>tailwind.config = { darkMode: 'class', theme: { extend: { fontFamily: { sans: ['Vazirmatn', 'system-ui', 'sans-serif'] }, colors: { brand: { 50:'#eff6ff',100:'#dbeafe',200:'#bfdbfe',300:'#93c5fd',400:'#60a5fa',500:'#3b82f6',600:'#2563eb',700:'#1d4ed8',800:'#1e40af',900:'#1e3a8a' } } } } }</script>
  <link href="https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css" rel="stylesheet">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.9.0/build/styles/atom-one-dark.min.css">
  <script src="https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.9.0/build/highlight.min.js"></script>
  <link rel="stylesheet" href="/static/app.css">
</head>
<body class="bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 min-h-screen">
  <header class="bg-white dark:bg-slate-800 shadow-sm sticky top-0 z-40">
    <div class="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
      <a href="/blog" class="flex items-center gap-2 text-sm text-slate-500 hover:text-brand-600">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
        وبلاگ
      </a>
      <a href="/dashboard" class="text-sm text-brand-600 hover:underline">داشبورد</a>
    </div>
  </header>

  <article class="max-w-3xl mx-auto px-4 py-8">
    ${topic.project_title ? `<div class="mb-4"><span class="inline-block px-3 py-1 text-sm rounded-full" style="background-color: ${topic.project_color || '#3b82f6'}20; color: ${topic.project_color || '#3b82f6'}">${escapeHtml(topic.project_title)}</span></div>` : ''}

    <h1 class="text-3xl md:text-4xl font-bold mb-4 leading-tight">${escapeHtml(topic.title)}</h1>

    <div class="flex flex-wrap items-center gap-4 text-sm text-slate-500 mb-6 pb-6 border-b border-slate-200 dark:border-slate-700">
      <span class="flex items-center gap-1">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
        ${dateFa}
      </span>
      <span class="flex items-center gap-1">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        ${topic.reading_time_min} دقیقه مطالعه
      </span>
      <span class="flex items-center gap-1">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
        ${topic.view_count || 0} بازدید
      </span>
    </div>

    ${tags.length > 0 ? `<div class="flex flex-wrap gap-2 mb-6">
      ${tags.map(t => `<a href="/blog?tag=${encodeURIComponent(t)}" class="text-xs px-3 py-1 bg-slate-100 dark:bg-slate-700 rounded-full hover:bg-brand-100 hover:text-brand-700">${escapeHtml(t)}</a>`).join('')}
    </div>` : ''}

    <div class="prose prose-slate dark:prose-invert prose-lg max-w-none prose-headings:font-bold prose-h1:text-3xl prose-h2:text-2xl prose-h2:mt-8 prose-h2:border-b prose-h2:pb-2 prose-h2:border-slate-200 prose-h3:text-xl prose-a:text-brand-600 prose-img:rounded-xl prose-code:bg-slate-100 prose-code:px-2 prose-code:py-1 prose-code:rounded prose-code:before:content-none prose-code:after:content-none prose-blockquote:border-r-brand-500 prose-blockquote:text-slate-600 rtl:prose-blockquote:border-r-4 rtl:prose-blockquote:border-l-0">
      ${html}
    </div>

    <div class="mt-12 pt-8 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
      <button id="like-btn" data-slug="${topic.slug}" class="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-pink-50 hover:border-pink-300 transition-colors group">
        <svg class="w-5 h-5 text-slate-400 group-hover:text-pink-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
        <span id="like-count">${topic.like_count || 0}</span>
        <span class="text-sm">پسندیدن</span>
      </button>
      <a href="/blog" class="text-sm text-brand-600 hover:underline">→ بازگشت به وبلاگ</a>
    </div>

    ${related.length > 0 ? `
    <div class="mt-12">
      <h3 class="text-xl font-bold mb-4">مباحث مرتبط</h3>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        ${related.map(r => `
          <a href="/blog/${r.slug}" class="block p-5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:shadow-md hover:border-brand-300 transition-all">
            <h4 class="font-bold mb-2 line-clamp-2">${escapeHtml(r.title)}</h4>
            <p class="text-sm text-slate-500 line-clamp-2">${escapeHtml(r.excerpt || '')}</p>
          </a>
        `).join('')}
      </div>
    </div>
    ` : ''}
  </article>

  <script>
    // syntax highlight
    document.querySelectorAll('pre code').forEach(b => { try { hljs.highlightElement(b); } catch(e){} });

    // like button
    const likeBtn = document.getElementById('like-btn');
    const likeCount = document.getElementById('like-count');
    let liked = false;
    likeBtn?.addEventListener('click', async () => {
      if (liked) return;
      liked = true;
      likeBtn.classList.add('bg-pink-50','border-pink-300');
      const slug = likeBtn.dataset.slug;
      try {
        const res = await fetch('/api/blog/slug/' + slug + '/like', { method: 'POST' });
        const data = await res.json();
        likeCount.textContent = data.like_count;
      } catch(e) {}
    });
  </script>
</body>
</html>`;
}

function notFoundPage(): string {
  return `<!DOCTYPE html>
<html lang="fa" dir="rtl"><head><meta charset="UTF-8"><title>یافت نشد</title>
<script src="https://cdn.tailwindcss.com"></script>
<link href="https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css" rel="stylesheet">
</head><body class="min-h-screen flex items-center justify-center bg-slate-50 font-sans">
<div class="text-center">
  <h1 class="text-6xl font-bold text-slate-300 mb-4">۴۰۴</h1>
  <p class="text-slate-500 mb-6">مطلب مورد نظر پیدا نشد.</p>
  <a href="/blog" class="px-5 py-2.5 bg-brand-600 text-white rounded-lg">بازگشت به وبلاگ</a>
</div></body></html>`;
}

function gradientFor(color: string): string {
  // convert hex to a gradient
  const c = color.replace('#', '');
  const r = parseInt(c.slice(0, 2), 16) || 59;
  const g = parseInt(c.slice(2, 4), 16) || 130;
  const b = parseInt(c.slice(4, 6), 16) || 246;
  const r2 = Math.max(0, r - 30), g2 = Math.max(0, g - 30), b2 = Math.max(0, b - 30);
  return `from-[rgb(${r2},${g2},${b2})] to-[rgb(${r},${g},${b})]`;
}

function formatDateFa(iso?: string): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const months = ['ژانویه','فوریه','مارس','آوریل','مه','ژوئن','ژوئیه','اوت','سپتامبر','اکتبر','نوامبر','دسامبر'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch { return iso; }
}
