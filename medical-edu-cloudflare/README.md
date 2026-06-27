# 🩺 آکادمی پزشکی — پلتفرم آموزش پزشکی روی Cloudflare Workers

[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare)](https://workers.cloudflare.com/)
[![D1 Database](https://img.shields.io/badge/Cloudflare-D1-0052CC?logo=cloudflare)](https://developers.cloudflare.com/d1/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![PWA](https://img.shields.io/badge/PWA-Ready-5A0FC8?logo=pwa)](https://web.dev/pwa/)

یک اپلیکیشن وب کامل و مدرن برای آموزش پزشکی که کاملاً روی **یک Worker کلودفلر** و **یک دیتابیس D1** اجرا می‌شود. شامل:

- ✨ **احراز هویت** با JWT و قابلیت "مرا به خاطر بسپار" (۳۰ روز)
- 📁 **مدیریت پروژه‌ها و مباحث** با Full-Text Search
- 📝 **ادیتور Markdown کامل** (EasyMDE) با پیش‌نویس زنده و پشتیبانی از RTL
- 🤖 **اتصال به Google Gemini رایگان** برای تولید محتوای آموزشی و فلش‌کارت
- 🃏 **فلش‌کارت با الگوریتم SM-2** (Spaced Repetition) و ایمپورت CSV
- 📱 **وبلاگ عمومی** با URLهای SEO-friendly (`/blog/:slug`)
- 📨 **ارتباط با تلگرام** و ارسال خودکار روزانه‌ی مبحث
- 🌙 **PWA** قابل نصب روی گوشی با کار آفلاین
- 🎨 **رابط کاربری مدرن RTL** با Tailwind CSS و فونت Vazirmatn
- 🔄 **پشتیبان‌گیری** (JSON / CSV / Markdown)

---

## 🚀 راه‌اندازی سریع

### پیش‌نیازها
- حساب کاربری Cloudflare (رایگان)
- Node.js نسخه ۱۸ یا بالاتر
- Wrangler CLI: `npm install -g wrangler` یا از طریق `npx`

### مراحل نصب

```bash
# 1. نصب پکیج‌ها
npm install

# 2. ورود به Cloudflare
npx wrangler login

# 3. ساخت دیتابیس D1
npx wrangler d1 create medical-edu-db
# خروجی شامل database_id خواهد بود — آن را در wrangler.toml قرار دهید

# 4. اعمال schema روی دیتابیس
npx wrangler d1 execute medical-edu-db --remote --file=src/db/schema.sql
# برای تست محلی:
npx wrangler d1 execute medical-edu-db --local --file=src/db/schema.sql

# 5. تنظیم Secretها
npx wrangler secret put JWT_SECRET
# یک رشته‌ی تصادفی ۳۲ کاراکتری وارد کنید

# (اختیاری) تنظیم پیش‌فرض API Keyها از طریق secret
npx wrangler secret put GEMINI_API_KEY
npx wrangler secret put TELEGRAM_BOT_TOKEN

# 6. Deploy
npx wrangler deploy
```

### دریافت کلید رایگان Gemini
1. به [Google AI Studio](https://aistudio.google.com/apikey) بروید
2. یک API Key رایگان بسازید
3. آن را در پنل تنظیمات اپ وارد کنید (یا به عنوان secret ست کنید)

### تنظیم ربات تلگرام
1. با [@BotFather](https://t.me/BotFather) یک ربات بسازید و توکن را بگیرید
2. ربات را ادمین کانال خود کنید
3. در پنل تنظیمات: توکن + شناسه کانال را وارد کنید
4. با دکمه‌ی "تست اتصال" آن را تست کنید

---

## 🏗 معماری

```
┌──────────────────────────────────────────────────────┐
│                  Cloudflare Worker                   │
│                                                       │
│  ┌─────────────┐    ┌─────────────┐    ┌──────────┐ │
│  │   Hono App  │───▶│   Routes    │───▶│   Lib    │ │
│  │  (router)   │    │  /api/*     │    │ (utils)  │ │
│  └─────────────┘    └─────────────┘    └──────────┘ │
│         │                                            │
│         ▼                                            │
│  ┌─────────────┐                                    │
│  │  Page HTML  │  ← Server-rendered (SEO-friendly)  │
│  │  /blog/*    │                                    │
│  └─────────────┘                                    │
│                                                       │
│  ┌─────────────┐    ┌─────────────┐                 │
│  │  /static/*  │    │  Cron Job   │                 │
│  │  CSS/JS/ICO │    │  (daily 9AM)│                 │
│  └─────────────┘    └─────────────┘                 │
└──────────────────────────────────────────────────────┘
         │                              │
         ▼                              ▼
┌─────────────────┐         ┌──────────────────────┐
│  Cloudflare D1  │         │   External APIs      │
│  (SQLite)       │         │  • Gemini API        │
│  15 tables      │         │  • Telegram Bot API  │
│  + FTS5 index   │         │                      │
└─────────────────┘         └──────────────────────┘
```

### ساختار فایل‌ها

```
medical-edu-cloudflare/
├── src/
│   ├── index.ts            # ورودی Worker +scheduled cron
│   ├── db/
│   │   └── schema.sql      # Schema کامل D1 (15 جدول + FTS)
│   ├── lib/
│   │   ├── types.ts        # تایپ‌های TypeScript
│   │   ├── auth.ts         # JWT + bcrypt + session
│   │   ├── http.ts         # middleware + helpers
│   │   ├── markdown.ts     # render + sanitize
│   │   ├── sm2.ts          # الگوریتم SuperMemo 2
│   │   ├── csv.ts          # پارسر CSV
│   │   ├── gemini.ts       # Google Gemini API
│   │   ├── telegram.ts     # Telegram Bot API
│   │   └── settings.ts     # تنظیمات در دیتابیس
│   └── routes/
│       ├── auth.ts         # /api/auth/*
│       ├── projects.ts     # /api/projects/*
│       ├── topics.ts       # /api/topics/*
│       ├── flashcards.ts   # /api/flashcards/*
│       ├── review.ts       # /api/review/* (SM-2)
│       ├── ai.ts           # /api/ai/* (Gemini)
│       ├── blog.ts         # /api/blog/* (public)
│       ├── settings.ts     # /api/settings/*
│       ├── exports.ts      # /api/export/*
│       ├── cron.ts         # Daily Telegram sender
│       └── pages.ts        # HTML rendering
├── static/                  # Frontend assets
│   ├── app.css             # استایل‌های سفارشی
│   ├── app.js              # SPA (vanilla JS)
│   ├── sw.js               # Service Worker (PWA)
│   ├── manifest.json       # PWA manifest
│   ├── offline.html        # صفحه‌ی آفلاین
│   └── icon-192.png / icon-512.png
├── scripts/
│   ├── make_icons.py       # ساخت آیکون‌های PWA
│   └── test_schema.py      # تست schema
├── wrangler.toml           # کانفیگ Cloudflare
├── package.json
└── tsconfig.json
```

---

## 📋 راهنمای API

### احراز هویت
| Method | Endpoint | توضیحات |
|--------|----------|---------|
| POST | `/api/auth/register` | ثبت نام (اولین کاربر = ادمین) |
| POST | `/api/auth/login` | ورود با `remember_me` |
| POST | `/api/auth/logout` | خروج |
| GET | `/api/auth/me` | دریافت اطلاعات کاربر فعلی |
| PUT | `/api/auth/me` | ویرایش پروفایل |
| POST | `/api/auth/change-password` | تغییر رمز |

### پروژه‌ها
| Method | Endpoint | توضیحات |
|--------|----------|---------|
| GET | `/api/projects` | لیست پروژه‌ها |
| POST | `/api/projects` | ساخت پروژه |
| GET | `/api/projects/:id` | دریافت یک پروژه |
| PUT | `/api/projects/:id` | ویرایش |
| DELETE | `/api/projects/:id` | حذف |

### مباحث
| Method | Endpoint | توضیحات |
|--------|----------|---------|
| GET | `/api/topics?project_id=&q=&status=&tag=` | لیست با FTS |
| POST | `/api/topics` | ساخت |
| GET | `/api/topics/:id` | دریافت |
| PUT | `/api/topics/:id` | ویرایش |
| PATCH | `/api/topics/:id` | تغییر وضعیت |
| DELETE | `/api/topics/:id` | حذف |
| POST | `/api/topics/:id/publish` | انتشار در وبلاگ |
| GET | `/api/topics/tags/list` | لیست تگ‌ها |

### فلش‌کارت
| Method | Endpoint | توضیحات |
|--------|----------|---------|
| GET | `/api/flashcards?due_only=&q=` | لیست |
| GET | `/api/flashcards/stats/overview` | آمار |
| POST | `/api/flashcards` | ساخت |
| POST | `/api/flashcards/bulk` | ساخت گروهی |
| POST | `/api/flashcards/import-csv` | ایمپورت CSV |
| PUT | `/api/flashcards/:id` | ویرایش |
| DELETE | `/api/flashcards/:id` | حذف |
| POST | `/api/flashcards/:id/reset` | ریست SM-2 |

### مرور (SM-2)
| Method | Endpoint | توضیحات |
|--------|----------|---------|
| GET | `/api/review/queue` | کارت‌های آماده مرور |
| POST | `/api/review/:id/answer` | پاسخ (`again/hard/good/easy`) |
| POST | `/api/review/:id/end` | پایان نشست |
| GET | `/api/review/history` | تاریخچه |

### هوش مصنوعی (Gemini)
| Method | Endpoint | توضیحات |
|--------|----------|---------|
| POST | `/api/ai/generate-topic` | تولید مبحث |
| POST | `/api/ai/generate-flashcards` | تولید فلش‌کارت |
| POST | `/api/ai/improve` | بهبود متن |
| POST | `/api/ai/summarize` | خلاصه‌سازی |
| GET | `/api/ai/logs` | لاگ‌ها |

### وبلاگ (عمومی)
| Method | Endpoint | توضیحات |
|--------|----------|---------|
| GET | `/api/blog` | لیست پست‌ها |
| GET | `/api/blog/slug/:slug` | پست کامل |
| GET | `/api/blog/tags` | تگ‌ها |
| POST | `/api/blog/slug/:slug/like` | لایک |

### تنظیمات (ادمین)
| Method | Endpoint | توضیحات |
|--------|----------|---------|
| GET | `/api/settings` | دریافت |
| PUT | `/api/settings` | ذخیره |
| POST | `/api/settings/test-telegram` | تست تلگرام |
| POST | `/api/settings/send-topic/:id` | ارسال دستی |

### خروجی
| Method | Endpoint | توضیحات |
|--------|----------|---------|
| GET | `/api/export/flashcards.csv` | CSV فلش‌کارت‌ها |
| GET | `/api/export/topic/:id.md` | Markdown مبحث |
| GET | `/api/export/backup.json` | کل دیتابیس |

---

## 🧠 الگوریتم SM-2 (Spaced Repetition)

این اپ از الگوریتم کلاسیک [SuperMemo 2](https://www.supermemo.com/en/blog/application-of-a-computer-to-improve-the-results-obtained-in-working-with-the-supermemo-method) استفاده می‌کند. هر فلش‌کارت این فیلدها را دارد:

| فیلد | توضیح |
|------|-------|
| `ease` | ضریب آسانی (شروع از 2.5، حداقل 1.3) |
| `interval` | فاصله‌ی مرور بعدی (روز) |
| `repetitions` | تعداد پاسخ‌های درست متوالی |
| `next_review_at` | زمان مرور بعدی |

### دکمه‌های مرور
- **دوباره** (quality=1) → ریست، فردا دوباره
- **سخت** (quality=3) → interval ثابت
- **خوب** (quality=4) → interval × ease
- **آسان** (quality=5) → interval × ease (با افزایش ease)

---

## 📨 فرمت CSV فلش‌کارت

فایل CSV باید حداقل این ستون‌ها را داشته باشد:

```csv
front,back,hint,tags
"تعریف نارسایی قلبی","ناتوانی قلب در پمپاژ کافی خون","قلب","قلب,نارسایی"
"علائم نارسایی قلبی","تنگی نفس، خستگی، ادم","قلب,علائم"
```

- هدر در ردیف اول تشخیص داده می‌شود (الزامی نیست ولی پیشنهاد می‌شود)
- ستون‌های `hint` و `tags` اختیاری هستند
- مقادیر دارای کاما باید در `" "` باشند

---

## 🔐 امنیت

- رمز عبور با **bcrypt** (10 rounds) هش می‌شود
- JWT با **HS256** امضا می‌شود (از secret محیطی)
- کوکی **HttpOnly + Secure + SameSite=Lax** ست می‌شود
- session در دیتابیس ثبت می‌شود (قابل revoke)
- sanitize مینیمال برای جلوگیری از XSS در محتوای markdown
- اولین کاربری که ثبت نام می‌کند، ادمین می‌شود

---

## 📱 PWA

این اپ به عنوان **Progressive Web App** قابل نصب روی گوشی است:

1. در Chrome (Android) یا Safari (iOS) باز کنید
2. روی "Add to Home Screen" بزنید
3. حالا مثل یک اپ بومی باز می‌شود
4. حتی آفلاین می‌توانید فلش‌کارت‌های قبلی را مرور کنید

---

## 🎯 محدودیت‌ها

- **D1**: حداکثر 5 میلیون ردیف در هر دیتابیس (Free Plan)
- **Worker**: حداکثر 100,000 request در روز (Free Plan)
- **Cron**: حداکثر 5 cron trigger در Free Plan
- **Gemini Free Tier**: 15 RPM، 1500 request در روز
- **CPU time**: 50ms در هر request (Free Plan)

---

## 🛠 توسعه

```bash
# اجرای محلی
npm run dev

# تایپ چک
npx tsc --noEmit

# تست schema
python3 scripts/test_schema.py

# ساخت آیکون‌های PWA
python3 scripts/make_icons.py

# مشاهده‌ی لاگ‌ها
npm run tail
```

---

## 📄 لایسنس

MIT License — آزاد برای استفاده‌ی شخصی و تجاری.
