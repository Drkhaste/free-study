-- ============================================================
-- Medical Education Platform - Database Schema
-- SQLite (Cloudflare D1)
-- ============================================================

-- ---------- users ----------
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  email TEXT,
  password_hash TEXT NOT NULL,
  display_name TEXT,
  role TEXT NOT NULL DEFAULT 'admin',  -- admin | user
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_login_at TEXT,
  preferences TEXT  -- JSON: theme, language, ...
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- ---------- sessions (remember-me tokens) ----------
-- هر رکورد یک نشست مرورگری رو نگه میداره. اگه "مرا به خاطر بسپار" خورده باشه، expiry 30 روزه؛ وگرنه 1 روزه.
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  user_agent TEXT,
  ip TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- ---------- projects ----------
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3b82f6',
  icon TEXT DEFAULT 'folder',
  position INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id);

-- ---------- topics (مباحث) ----------
CREATE TABLE IF NOT EXISTS topics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  slug TEXT,
  content_md TEXT DEFAULT '',         -- محتوای مارک‌داون اصلی
  content_html TEXT DEFAULT '',       -- HTML رندر شده کش شده
  excerpt TEXT,                       -- خلاصه 200 کاراکتری
  tags TEXT,                          -- جدا شده با کاما
  status TEXT DEFAULT 'draft',        -- draft | published | archived
  is_featured INTEGER DEFAULT 0,
  word_count INTEGER DEFAULT 0,
  reading_time_min INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  published_at TEXT,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_topics_project ON topics(project_id);
CREATE INDEX IF NOT EXISTS idx_topics_user ON topics(user_id);
CREATE INDEX IF NOT EXISTS idx_topics_status ON topics(status);
CREATE INDEX IF NOT EXISTS idx_topics_published ON topics(published_at);

-- FTS برای جستجوی سریع
CREATE VIRTUAL TABLE IF NOT EXISTS topics_fts USING fts5(
  title, content_md, tags,
  content='topics', content_rowid='id',
  tokenize='unicode61 remove_diacritics 2'
);

-- ترایگرها برای همگام‌سازی FTS
CREATE TRIGGER IF NOT EXISTS topics_ai AFTER INSERT ON topics BEGIN
  INSERT INTO topics_fts(rowid, title, content_md, tags)
  VALUES (new.id, new.title, new.content_md, new.tags);
END;
CREATE TRIGGER IF NOT EXISTS topics_ad AFTER DELETE ON topics BEGIN
  INSERT INTO topics_fts(topics_fts, rowid, title, content_md, tags)
  VALUES('delete', old.id, old.title, old.content_md, old.tags);
END;
CREATE TRIGGER IF NOT EXISTS topics_au AFTER UPDATE ON topics BEGIN
  INSERT INTO topics_fts(topics_fts, rowid, title, content_md, tags)
  VALUES('delete', old.id, old.title, old.content_md, old.tags);
  INSERT INTO topics_fts(rowid, title, content_md, tags)
  VALUES (new.id, new.title, new.content_md, new.tags);
END;

-- ---------- flashcards ----------
CREATE TABLE IF NOT EXISTS flashcards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  project_id INTEGER,
  topic_id INTEGER,
  front TEXT NOT NULL,        -- سوال / وجه
  back TEXT NOT NULL,         -- جواب / تعریف
  hint TEXT,
  tags TEXT,                  -- جدا شده با کاما
  -- فیلدهای SM-2 Spaced Repetition
  ease REAL DEFAULT 2.5,      -- ضریب آسانی (1.3 تا 3.0)
  interval INTEGER DEFAULT 0, -- فاصله روزانه
  repetitions INTEGER DEFAULT 0, -- تعداد تکرارهای موفق متوالی
  next_review_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_reviewed_at TEXT,
  total_reviews INTEGER DEFAULT 0,
  correct_reviews INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
  FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_flashcards_user ON flashcards(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_review ON flashcards(next_review_at);
CREATE INDEX IF NOT EXISTS idx_flashcards_project ON flashcards(project_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_topic ON flashcards(topic_id);

-- ---------- blog_posts (نسخه منتشر شده مبحث) ----------
-- فعلا از جدول topics با status='published' استفاده میشه. این جدول برای متادیتای وبلاگ.
CREATE TABLE IF NOT EXISTS blog_posts (
  topic_id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  telegram_message_id INTEGER,
  telegram_sent_at TEXT,
  published_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_blog_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_published ON blog_posts(published_at);

-- ---------- settings (پنل تنظیمات) ----------
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- مقادیر پیش‌فرض
INSERT OR IGNORE INTO settings(key, value) VALUES
  ('gemini_api_key', ''),
  ('telegram_bot_token', ''),
  ('telegram_channel_id', ''),
  ('telegram_daily_hour', '9'),
  ('telegram_daily_topic_id', ''),
  ('telegram_webhook_secret', ''),
  ('site_title', 'آکادمی پزشکی'),
  ('site_description', 'پلتفرم آموزش پزشکی با هوش مصنوعی'),
  ('default_project_color', '#3b82f6'),
  -- پرامپت‌های قابل تنظیم AI
  ('prompt_generate_topic', 'تو یک استاد دانشگاه پزشکی هستی با سابقه‌ی تدریس بیش از ۲۰ سال. لطفاً یک مبحث آموزشی کامل و ساختاریافته درباره‌ی «{{title}}»{{project_context}} تولید کن.

خروجی باید با فرمت Markdown باشد و شامل این بخش‌ها باشد:

# {{title}}

## معرفی
(مقدمه‌ای ۳-۴ جمله‌ای)

## تعاریف کلیدی
- تعریف اول
- تعریف دوم

## فیزیوپاتولوژی
(توضیح مکانیسم)

## علائم بالینی
- علامت ۱
- علامت ۲

## تشخیص
- معیارهای تشخیصی
- آزمایش‌های کلیدی

## درمان
- درمان دارویی
- درمان غیردارویی

## نکات طلایی برای امتحان
- نکته ۱

## منابع

متن باید به فارسی معیار، دقیق از نظر علمی، و مناسب برای دانشجویان پزشکی باشد.'),
  ('prompt_improve', 'لطفاً متن آموزشی پزشکی زیر رو از نظر نگارش، ساختار، و وضوح بهبود بده. معادل علمی رو دقیق نگه دار:

{{content}}

نسخه‌ی نهایی رو با Markdown برگردان.'),
  ('prompt_summarize', 'لطفاً محتوای آموزشی زیر رو به یک خلاصه‌ی ۳-۴ جمله‌ای تبدیل کن که برای وبلاگ مناسب باشه:

{{content}}

فقط خودِ خلاصه رو بنویس، هیچ مقدمه‌ای نذار.'),
  ('system_prompt', 'تو یک استاد دانشگاه پزشکی فارسی‌زبان هستی. فقط به فارسی پاسخ بده.');

-- ---------- ai_logs (لاگ تولید محتوا با Gemini) ----------
CREATE TABLE IF NOT EXISTS ai_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  topic_id INTEGER,
  prompt TEXT,
  response_excerpt TEXT,
  model TEXT,
  tokens_used INTEGER,
  status TEXT,  -- success | error
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_ai_logs_user ON ai_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_logs_topic ON ai_logs(topic_id);

-- ---------- review_sessions (آمار مرور فلش‌کارت) ----------
CREATE TABLE IF NOT EXISTS review_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  ended_at TEXT,
  cards_reviewed INTEGER DEFAULT 0,
  cards_correct INTEGER DEFAULT 0,
  duration_sec INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_review_sessions_user ON review_sessions(user_id);

-- ---------- tasks (تقویم و تسک‌ها) ----------
CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  task_date TEXT NOT NULL, -- YYYY-MM-DD
  status TEXT DEFAULT 'pending', -- pending | completed
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_tasks_user_date ON tasks(user_id, task_date);
