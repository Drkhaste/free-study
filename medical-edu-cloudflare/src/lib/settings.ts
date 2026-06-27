// ============================================================
// Helper: settings (read/write from D1) with env-var fallback
// ============================================================

export interface Settings {
  gemini_api_key: string;
  telegram_bot_token: string;
  telegram_channel_id: string;
  telegram_daily_hour: string;
  site_title: string;
  site_description: string;
}

const DEFAULTS: Settings = {
  gemini_api_key: '',
  telegram_bot_token: '',
  telegram_channel_id: '',
  telegram_daily_hour: '9',
  site_title: 'آکادمی پزشکی',
  site_description: 'پلتفرم آموزش پزشکی با هوش مصنوعی',
};

export async function getSettings(db: D1Database, env?: any): Promise<Settings> {
  const result = await db.prepare(`SELECT key, value FROM settings`).all<{ key: string; value: string }>();
  const map: Record<string, string> = {};
  for (const r of result.results || []) {
    map[r.key] = r.value;
  }
  // fallback به متغیرهای محیطی برای مقادیری که هنوز در DB ست نشدن
  return {
    gemini_api_key: map.gemini_api_key || env?.GEMINI_API_KEY || DEFAULTS.gemini_api_key,
    telegram_bot_token: map.telegram_bot_token || env?.TELEGRAM_BOT_TOKEN || DEFAULTS.telegram_bot_token,
    telegram_channel_id: map.telegram_channel_id || DEFAULTS.telegram_channel_id,
    telegram_daily_hour: map.telegram_daily_hour || DEFAULTS.telegram_daily_hour,
    site_title: map.site_title || DEFAULTS.site_title,
    site_description: map.site_description || DEFAULTS.site_description,
  };
}

export async function setSetting(db: D1Database, key: string, value: string): Promise<void> {
  await db.prepare(
    `INSERT INTO settings(key, value, updated_at) VALUES(?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=datetime('now')`
  ).bind(key, value).run();
}
