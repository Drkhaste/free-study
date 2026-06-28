// ============================================================
// Telegram Bot integration
// ============================================================

export interface TelegramMessage {
  chat_id: string | number;
  text: string;
  parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  disable_web_page_preview?: boolean;
  reply_markup?: any;
}

export async function sendTelegramMessage(
  botToken: string,
  msg: TelegramMessage
): Promise<{ ok: boolean; message_id?: number; error?: string }> {
  if (!botToken) return { ok: false, error: 'no_bot_token' };
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(msg),
    });
    const data = await res.json() as any;
    if (!data.ok) return { ok: false, error: data.description || 'unknown' };
    return { ok: true, message_id: data.result?.message_id };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'network_error' };
  }
}

// markdown معمولی رو به فرمت قابل قبول تلگرام (HTML) تبدیل می‌کنه
export function markdownToTelegramHtml(md: string, maxLen = 3500): string {
  let html = md;

  // عنوان‌ها
  html = html.replace(/^### (.*$)/gim, '<b>🔹 $1</b>');
  html = html.replace(/^## (.*$)/gim, '<b>🔸🔸 $1</b>');
  html = html.replace(/^# (.*$)/gim, '<b>📌 $1</b>');

  // bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  html = html.replace(/__(.+?)__/g, '<b>$1</b>');
  // italic
  html = html.replace(/\*(.+?)\*/g, '<i>$1</i>');
  html = html.replace(/_(.+?)_/g, '<i>$1</i>');
  // inline code
  html = html.replace(/`(.+?)`/g, '<code>$1</code>');
  // code blocks
  html = html.replace(/```[\s\S]*?```/g, m => `<code>${m.replace(/```/g, '')}</code>`);
  // links [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  // images حذف
  html = html.replace(/!\[[^\]]*\]\([^)]*\)/g, '');
  // hr
  html = html.replace(/^---+$/gm, '\n———————————\n');
  // quotes
  html = html.replace(/^&gt; (.+)$/gm, '<i>💬 $1</i>');

  // کوتاه کردن
  if (html.length > maxLen) {
    html = html.slice(0, maxLen - 20) + '\n\n... [ادامه در وبلاگ]';
  }

  // escape خودکار روی کاراکترهای باقی‌مانده که HTML رو خراب می‌کنن
  // (با احتیاط — چون تگ‌های بالا رو نزده بودیم)
  // نکته: تگ‌های <b> <i> <code> <a> مجازند.
  return html;
}

// ساخت دکمه اینلاین برای لینک به وبلاگ
export function buildInlineKeyboard(rows: any[][]): any {
  return {
    inline_keyboard: rows.map(row => row.map(b => {
      const btn: any = { text: b.text };
      if (b.url) btn.url = b.url;
      if (b.callback_data) btn.callback_data = b.callback_data;
      return btn;
    })),
  };
}

// ارسال روزانه‌ی یک مبحث به کانال
export async function sendDailyTopic(opts: {
  botToken: string;
  chatId: string;
  title: string;
  contentMd: string;
  blogUrl?: string;
}): Promise<{ ok: boolean; message_id?: number; error?: string }> {
  const text = `<b>📚 مبحث آموزشی روز</b>\n\n<b>${escapeHtml(opts.title)}</b>\n\n${markdownToTelegramHtml(opts.contentMd, 3000)}`;

  const keyboard = opts.blogUrl
    ? buildInlineKeyboard([[{ text: '📖 خواندن کامل در وبلاگ', url: opts.blogUrl }]])
    : undefined;

  return sendTelegramMessage(opts.botToken, {
    chat_id: opts.chatId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    reply_markup: keyboard,
  });
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
