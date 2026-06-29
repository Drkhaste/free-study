# مستندات و راهنمای بازسازی پلتفرم آکادمی پزشکی

این فایل حاوی بررسی کامل ویژگی‌ها و قابلیت‌های وب‌اپلیکیشن فعلی به همراه یک پرامپت مهندسی شده برای بازسازی دقیق آن است.

---

## ۱. بررسی تمام قابلیت‌ها و فیچرها (Review)

این سیستم یک پلتفرم آموزش پزشکی مدرن است که برای اجرا روی لبه (**Edge**) طراحی شده است.

### الف. معماری فنی (Tech Stack)
*   **Backend:** استفاده از Cloudflare Workers با فریم‌ورک Hono (بسیار سریع و بدون سرور).
*   **Database:** دیتابیس Cloudflare D1 (بر پایه SQLite) با قابلیت جستجوی تمام‌متن (FTS5).
*   **Frontend:** یک SPA با جاوااسکریپت خالص (Vanilla JS) بدون نیاز به Build Step، استفاده از Tailwind CSS و EasyMDE.
*   **PWA:** قابلیت نصب روی موبایل و دسکتاپ، کارکرد آفلاین و آیکون‌های اختصاصی.

### ب. مدیریت محتوا (Topics & Projects)
*   **دسته‌بندی:** سازماندهی مطالب در قالب «پروژه‌ها» با رنگ و آیکون اختصاصی.
*   **ویرایشگر حرفه‌ای:** ادیتور Markdown با پشتیبانی کامل از راست‌چین (RTL)، پیش‌نمایش زنده و شمارش کلمات.
*   **سیستم هایلایت:** امکان هایلایت کردن متن (در ۴ رنگ) توسط ادمین در محیط مطالعه که مستقیماً در دیتابیس ذخیره می‌شود.
*   **وضعیت انتشار:** مدیریت مطالب در حالات پیش‌نویس، منتشر شده (وبلاگ) و بایگانی.

### ج. سیستم یادگیری فلش‌کارت (SRS)
*   **الگوریتم SM-2:** پیاده‌سازی دقیق الگوریتم SuperMemo-2 برای تکرار فاصله‌دار.
*   **مدیریت صف مرور:** تفکیک کارت‌ها به گروه‌های «مرور الان»، «فردا» و «مرور ۳ روز بعد».
*   **ورود/خروج داده:** قابلیت ایمپورت دسته‌جمعی از فایل CSV و اکسپورت کل کارت‌ها.
*   **آمار پیشرفت:** پیگیری دقیق نشست‌های مرور، نرخ پاسخ‌های درست و زمان مطالعه.

### د. هوش مصنوعی (Google Gemini)
*   **تولید محتوا:** ساخت خودکار مطالب آموزشی کامل فقط با دادن عنوان.
*   **بهبود و خلاصه‌سازی:** ابزارهای AI برای بازنویسی علمی متن یا تولید خلاصه برای وبلاگ.
*   **سفارشی‌سازی:** پنل تنظیمات برای تغییر پرامپت‌های سیستم (System Prompts) توسط ادمین.

### هـ. وبلاگ عمومی و SEO
*   **SSR:** رندر سمت سرور صفحات وبلاگ برای سئوی عالی.
*   **تعامل کاربر:** سیستم لایک، شمارش بازدید و نمایش مطالب مرتبط.
*   **شخصی‌سازی مطالعه:** امکان تغییر فونت (وزیرمتن/پلی‌سنس)، سایز متن و تم تاریک توسط خواننده.

### و. ادغام با تلگرام
*   **مدیریت از راه دور:** کنترل کامل (ساخت، لیست، انتشار و حذف) از طریق بات تلگرام (Webhook).
*   **ارسال خودکار:** کرون‌جاب روزانه برای ارسال خودکار مطالب منتخب به کانال تلگرام.
*   **اشتراک‌گذاری دستی:** دکمه مستقیم برای ارسال هر مطلب به کانال با فرمت زیبا.

### ز. ابزارهای بهره‌وری
*   **تقویم جلالی:** تقویم شمسی کامل برای برنامه‌ریزی.
*   **مدیریت تسک:** لیست کارهای روزانه (To-do) متصل به تقویم.

### ح. تجربه کاربری (UX)
*   **Typography:** پشتیبانی کامل از فونت‌های فارسی (Vazirmatn و IBM Plex Sans Arabic).
*   **Customization:** امکان تنظیم فاصله خطوط و اندازه متن بصورت سراسری.

---

## ۲. پرامپت کامل جهت ساخت مجدد (Reconstruction Prompt)

این پرامپت مهندسی شده را می‌توانید برای بازسازی دقیق پروژه در مدل‌های هوش مصنوعی (مانند Claude 3.5 Sonnet یا GPT-4o) استفاده کنید:

```markdown
**Task:** Build a high-performance, RTL-first Medical Education Platform and SRS Flashcard System hosted on Cloudflare Workers.

**Technical Stack:**
- **Backend:** Cloudflare Workers with Hono framework.
- **Database:** Cloudflare D1 (SQLite) with FTS5 for search.
- **Frontend:** Vanilla JavaScript SPA (No-build) with Tailwind CSS (CDN).
- **Mobile:** Full PWA with Service Worker and offline support.

**Core Modules to Implement:**
1. **User Auth:** JWT-based login with "Remember Me" (30-day sessions). Multi-admin data isolation using `user_id`.
2. **Project & Topic Management:**
   - Hierarchy: Projects -> Topics.
   - Editor: EasyMDE Markdown editor with RTL support and word count.
   - Highlighting: A floating menu to apply persistent colored highlights to rendered HTML.
   - SEO: Auto-slug generation and SSR-rendered public blog pages.
3. **Spaced Repetition (SRS):**
   - Algorithm: SM-2 implementation (Ease, Interval, Repetitions).
   - Review UI: Flashcard flipping mechanism with 4-button response (Again, Hard, Good, Easy).
   - Bulk: CSV Import/Export for flashcards.
4. **AI Assistant (Gemini API):**
   - Endpoints to generate full topics, improve writing, and summarize content.
   - Admin panel to customize System Prompts and templates.
5. **Communication & Automation:**
   - Webhook-based Bot to create/publish topics via chat commands.
   - Scheduled Cron Job to broadcast the oldest unpublished topic to a Telegram Channel daily.
6. **Productivity Suite:**
   - Jalali (Persian) Calendar integration.
   - Daily Task/To-do manager linked to calendar dates.
7. **UX/UI:**
   - RTL layout by default.
   - Customizable typography settings (Font-size, Line-height, Vazirmatn font).
   - Global Dark/Light mode toggle.

**Database Schema Essentials:**
- Tables: `users`, `sessions`, `projects`, `topics` (with FTS), `flashcards`, `review_sessions`, `tasks`, `ai_logs`, `settings`, `blog_posts`.

**Localization:** Primary language is Persian (Farsi). Ensure all dates use Jalali format and UI is fully RTL.
```
