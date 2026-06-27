// ============================================================
// Markdown rendering (server-side using marked + DOMPurify for HTML)
// ============================================================
// در ورکر کلودفلر DOMPurify به دلیل نداشتن DOM در دسترس نیست؛ پس از پاکسازی ساده‌ی سفارشی استفاده می‌کنیم.

import { marked } from 'marked';

marked.setOptions({
  gfm: true,
  breaks: true,
});

// پاکسازی مینیمال برای جلوگیری از XSS در محتوای تولیدشده توسط کاربر
function sanitize(html: string): string {
  // حذف تگ‌های خطرناک
  const dangerousTags = /<\/?(script|iframe|object|embed|form|input|button|style|link|meta|base)[^>]*>/gi;
  let out = html.replace(dangerousTags, '');
  // حذف event handlerها
  out = out.replace(/\son\w+\s*=\s*"[^"]*"/gi, '');
  out = out.replace(/\son\w+\s*=\s*'[^']*'/gi, '');
  out = out.replace(/\son\w+\s*=\s*[^\s>]+/gi, '');
  // حذف javascript: در href
  out = out.replace(/(href|src)\s*=\s*["']javascript:[^"']*["']/gi, '$1="#"');
  return out;
}

export function renderMarkdown(md: string): string {
  if (!md) return '';
  const html = marked.parse(md, { async: false }) as string;
  return sanitize(html);
}

export function makeExcerpt(md: string, len = 200): string {
  if (!md) return '';
  const text = md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#*`>_~\-\[\]\(\)!]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= len) return text;
  return text.slice(0, len).trim() + '…';
}

export function readingTime(md: string): number {
  const words = (md || '').trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

export function wordCount(md: string): number {
  return (md || '').trim().split(/\s+/).filter(Boolean).length;
}

export function slugify(s: string): string {
  // slug سازگار با فارسی و انگلیسی
  return s
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^\u0600-\u06FFa-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || `topic-${Date.now()}`;
}
