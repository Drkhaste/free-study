#!/usr/bin/env bash
# ============================================================
# Deploy script for Medical Education Platform
# روی Cloudflare Workers + D1
# ============================================================

set -e

cd "$(dirname "$0")/.."

echo "🚀 شروع deploy آکادمی پزشکی روی Cloudflare Workers"
echo "=================================================="
echo ""

# 1. نصب پکیج‌ها
if [ ! -d "node_modules" ]; then
  echo "📦 نصب پکیج‌ها..."
  npm install --silent
fi

# 2. ورود به Cloudflare
echo ""
echo "🔐 بررسی ورود به Cloudflare..."
if ! npx wrangler whoami 2>&1 | grep -q "Account ID"; then
  echo "لظفاً وارد شوید:"
  npx wrangler login
fi

# 3. ساخت دیتابیس D1 (اگر هنوز نساخته شده)
echo ""
echo "🗄️  ساخت دیتابیس D1..."
DB_OUTPUT=$(npx wrangler d1 create medical-edu-db 2>&1 || true)
echo "$DB_OUTPUT"

DB_ID=$(echo "$DB_OUTPUT" | grep -oP 'database_id = "\K[^"]+' || echo "")
if [ -n "$DB_ID" ]; then
  echo "✓ دیتابیس ساخته شد. ID: $DB_ID"
  # آپدیت wrangler.toml
  sed -i.bak "s/database_id = \"\"/database_id = \"$DB_ID\"/" wrangler.toml
  echo "✓ wrangler.toml آپدیت شد"
else
  echo "→ دیتابیس قبلاً ساخته شده یا نیاز به وارد کردن دستی ID"
fi

# 4. اعمال schema
echo ""
echo "📋 اعمال schema روی دیتابیس..."
npx wrangler d1 execute medical-edu-db --remote --file=src/db/schema.sql

# 5. تنظیم JWT_SECRET
echo ""
echo "🔑 تنظیم JWT_SECRET..."
JWT=$(openssl rand -hex 32 2>/dev/null || python3 -c "import secrets; print(secrets.token_hex(32))")
echo "$JWT" | npx wrangler secret put JWT_SECRET

# 6. Deploy
echo ""
echo "🚀 Deploy نهایی..."
npx wrangler deploy

echo ""
echo "=================================================="
echo "✅ تمام شد!"
echo ""
echo "گام‌های بعدی:"
echo "  1. وارد اپ شوید و اولین اکانت ادمین را بسازید"
echo "  2. از پنل تنظیمات، Gemini API Key و Telegram Bot Token را وارد کنید"
echo "  3. یک پروژه و چند مبحث بسازید"
echo "  4. فلش‌کارت ایمپورت کنید و مرور را شروع کنید!"
echo ""
echo "📚 مستندات: README.md"
