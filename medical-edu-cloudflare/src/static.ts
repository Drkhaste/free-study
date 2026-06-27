// ============================================================
// Static asset serving — embedded approach (no external config)
// ============================================================
// محتوای فایل‌های static به صورت base64 embed شده‌اند تا به wrangler [site]
// config وابسته نباشیم. این روش در همه محیط‌ها کار می‌کند.

import { Hono } from 'hono';

// embedded content (build-time generated)
import { ASSETS } from './assets-bundle';

export const staticRoutes = new Hono();

const CONTENT_TYPES: Record<string, string> = {
  'css': 'text/css; charset=utf-8',
  'js': 'application/javascript; charset=utf-8',
  'json': 'application/manifest+json; charset=utf-8',
  'html': 'text/html; charset=utf-8',
  'png': 'image/png',
  'svg': 'image/svg+xml',
};

staticRoutes.get('/*', (c) => {
  // path after /static/
  const path = c.req.path.replace(/^\/static\/?/, '');
  if (!path) return c.text('Not found', 404);

  const asset = (ASSETS as Record<string, { content: string; encoding: 'utf-8' | 'base64' }>)[path];
  if (!asset) return c.text('Not found', 404);

  const ext = path.split('.').pop() || 'bin';
  const contentType = CONTENT_TYPES[ext] || 'application/octet-stream';
  const cacheControl = path === 'sw.js' ? 'no-cache' : 'public, max-age=86400';

  if (asset.encoding === 'base64') {
    const bytes = atob(asset.content);
    const buf = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) buf[i] = bytes.charCodeAt(i);
    return new Response(buf, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': cacheControl,
      },
    });
  }

  return new Response(asset.content, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': cacheControl,
    },
  });
});
