/* ============================================================
   Medical Education Platform — SPA logic (vanilla JS)
   - Fixed: mobile sidebar (RTL translateX)
   - Fixed: CSV import (csvText scope)
   - Removed: AI flashcard generation
   - Added: font settings popup (size + family)
   - Added: /blog navigation does full page reload
   ============================================================ */

// Disable automatic redirection by certain libraries if any
window.JALALI_MOMENT_CONFIG = {
  timezone: 'Asia/Tehran'
};

// ---- API client ----
const API = {
  async request(method, path, body = null) {
    const apiUrl = window.medEduData?.apiUrl || '';
    const fullPath = path.startsWith('/api/') ? path.replace('/api/', apiUrl + '/') : (path.startsWith('http') ? path : apiUrl + path);

    const opts = {
      method,
      headers: {
        'X-WP-Nonce': window.medEduData?.nonce
      },
      credentials: 'same-origin'
    };

    if (body) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }

    const res = await fetch(fullPath, opts);

    if (res.status === 401 && !path.includes('/auth/') && !path.includes('/blog')) {
      // In WP, we might want to redirect to the custom login page
      // window.location.href = '/login';
      return null;
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || data.message || `HTTP ${res.status}`);
    return data;
  },
  get(p) { return this.request('GET', p); },
  post(p, b) { return this.request('POST', p, b); },
  put(p, b) { return this.request('PUT', p, b); },
  patch(p, b) { return this.request('PATCH', p, b); },
  del(p) { return this.request('DELETE', p); },
};

// ---- toast ----
function toast(msg, type = 'info') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 3000);
}

// ---- app state ----
const state = {
  user: null,
  currentPage: null,
  currentPageData: null,
};

// ============================================================
// Font settings — popup with size slider + family selector
// ============================================================
const FONT_KEY = 'app_font_settings';
function loadFontSettings() {
  try {
    return JSON.parse(localStorage.getItem(FONT_KEY) || '{}');
  } catch { return {}; }
}
function saveFontSettings(s) {
  localStorage.setItem(FONT_KEY, JSON.stringify(s));
}
function applyFontSettings() {
  const s = loadFontSettings();
  const root = document.documentElement;
  if (s.fontSize) root.style.setProperty('--app-font-size', s.fontSize + 'px');
  if (s.fontFamily) root.style.setProperty('--app-font-family', s.fontFamily);
  if (s.lineHeight) root.style.setProperty('--app-line-height', s.lineHeight);
}
applyFontSettings();

// ============================================================
// Dark mode toggle
// ============================================================
const THEME_KEY = 'app_theme';
function applyTheme() {
  const theme = localStorage.getItem(THEME_KEY) || 'light';
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}
applyTheme();

window.toggleTheme = function() {
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');

  // Update theme icons in the header
  const btn = document.getElementById('theme-toggle-btn');
  if (btn) {
    btn.innerHTML = isDark ?
      '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M16.95 16.95l.707.707M7.05 7.05l.707.707M12 8a4 4 0 100 8 4 4 0 000-8z"/></svg>' :
      '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>';
  }
};

window.openFontSettings = function() {
  const current = loadFontSettings();
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 scale-in';
  modal.innerHTML = `
    <div class="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-bold">تنظیمات متن</h3>
        <button onclick="this.closest('.fixed').remove()" class="text-slate-400 hover:text-slate-600">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>
      <div class="space-y-5">
        <div>
          <label class="block text-sm font-medium mb-2">اندازه متن: <span id="fs-val" class="font-bold text-brand-600">${current.fontSize || 16}px</span></label>
          <input type="range" id="fs-slider" min="12" max="24" step="1" value="${current.fontSize || 16}" class="w-full accent-brand-600">
          <div class="flex justify-between text-xs text-slate-400 mt-1">
            <span>کوچک (12)</span>
            <span>بزرگ (24)</span>
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium mb-2">فاصله خطوط: <span id="lh-val" class="font-bold text-brand-600">${current.lineHeight || 1.7}</span></label>
          <input type="range" id="lh-slider" min="1.4" max="2.2" step="0.1" value="${current.lineHeight || 1.7}" class="w-full accent-brand-600">
        </div>
        <div>
          <label class="block text-sm font-medium mb-2">فونت</label>
          <div class="grid grid-cols-2 gap-2">
            <label class="cursor-pointer">
              <input type="radio" name="font-family" value="Vazirmatn" class="sr-only peer" ${(!current.fontFamily || current.fontFamily === 'Vazirmatn') ? 'checked' : ''}>
              <div class="p-3 border-2 border-slate-200 rounded-xl peer-checked:border-brand-500 peer-checked:bg-brand-50 text-center">
                <p class="font-bold" style="font-family: 'Vazirmatn', sans-serif;">وزیرمتن</p>
                <p class="text-xs text-slate-500 mt-1" style="font-family: 'Vazirmatn', sans-serif;">نمونه متن فارسی</p>
              </div>
            </label>
            <label class="cursor-pointer">
              <input type="radio" name="font-family" value="IBM Plex Sans Arabic" class="sr-only peer" ${(current.fontFamily === 'IBM Plex Sans Arabic') ? 'checked' : ''}>
              <div class="p-3 border-2 border-slate-200 rounded-xl peer-checked:border-brand-500 peer-checked:bg-brand-50 text-center">
                <p class="font-bold" style="font-family: 'IBM Plex Sans Arabic', sans-serif;">پلی‌سنس عربیک</p>
                <p class="text-xs text-slate-500 mt-1" style="font-family: 'IBM Plex Sans Arabic', sans-serif;">نمونه متن فارسی</p>
              </div>
            </label>
          </div>
        </div>
        <div class="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4">
          <p class="text-xs text-slate-500 mb-2">پیش‌نمایش:</p>
          <p id="preview-text" style="font-size: ${current.fontSize || 16}px; font-family: ${current.fontFamily || 'Vazirmatn'}, sans-serif; line-height: ${current.lineHeight || 1.7};">
            نارسایی قلبی وضعیتی است که در آن قلب نمی‌تواند خون کافی را برای پاسخگویی به نیازهای متابولیک بدن پمپاژ کند.
          </p>
        </div>
        <div class="flex gap-2 pt-2">
          <button onclick="resetFontSettings()" class="px-4 py-2.5 bg-slate-100 dark:bg-slate-700 rounded-xl text-sm">ریست</button>
          <button onclick="saveAndApplyFont()" class="flex-1 py-2.5 bg-brand-600 text-white rounded-xl hover:bg-brand-700">ذخیره</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

  // live preview
  const fsSlider = document.getElementById('fs-slider');
  const fsVal = document.getElementById('fs-val');
  const lhSlider = document.getElementById('lh-slider');
  const lhVal = document.getElementById('lh-val');
  const preview = document.getElementById('preview-text');

  function updatePreview() {
    const fs = fsSlider.value;
    const lh = lhSlider.value;
    const ff = document.querySelector('input[name="font-family"]:checked').value;
    fsVal.textContent = fs + 'px';
    lhVal.textContent = lh;
    preview.style.fontSize = fs + 'px';
    preview.style.lineHeight = lh;
    preview.style.fontFamily = ff + ', sans-serif';
  }
  fsSlider.addEventListener('input', updatePreview);
  lhSlider.addEventListener('input', updatePreview);
  document.querySelectorAll('input[name="font-family"]').forEach(r => r.addEventListener('change', updatePreview));
};

window.saveAndApplyFont = function() {
  const fs = document.getElementById('fs-slider').value;
  const lh = document.getElementById('lh-slider').value;
  const ff = document.querySelector('input[name="font-family"]:checked').value;
  saveFontSettings({ fontSize: parseInt(fs), lineHeight: parseFloat(lh), fontFamily: ff });
  applyFontSettings();
  toast('تنظیمات ذخیره شد ✓', 'success');
  document.querySelector('.fixed.inset-0')?.remove();
};

window.resetFontSettings = function() {
  localStorage.removeItem(FONT_KEY);
  saveFontSettings({ fontSize: 16, lineHeight: 1.7, fontFamily: 'Vazirmatn' });
  applyFontSettings();
  toast('به حالت پیش‌فرض برگشت', 'info');
  document.querySelector('.fixed.inset-0')?.remove();
  setTimeout(() => window.openFontSettings(), 200);
};

// ============================================================
// Sidebar toggle (Mobile & Desktop)
// ============================================================
const SIDEBAR_KEY = 'app_sidebar_collapsed';

window.toggleSidebar = function() {
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.querySelector('.sidebar-overlay');
  const main = document.querySelector('.main-content');
  if (!sidebar) return;

  const isMobile = window.innerWidth <= 768;

  if (isMobile) {
    const isOpen = sidebar.classList.toggle('open');
    if (overlay) overlay.classList.toggle('show', isOpen);
  } else {
    // Desktop: toggle collapsed state
    const isCollapsed = sidebar.classList.toggle('collapsed');
    localStorage.setItem(SIDEBAR_KEY, isCollapsed ? '1' : '0');
  }
};

window.closeSidebar = function() {
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.querySelector('.sidebar-overlay');
  sidebar?.classList.remove('open');
  overlay?.classList.remove('show');
};

function applySidebarState() {
  const isCollapsed = localStorage.getItem(SIDEBAR_KEY) === '1';
  if (isCollapsed && window.innerWidth > 768) {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) sidebar.classList.add('collapsed');
  }
}

// ============================================================
// Router
// ============================================================
const routes = [
  { pattern: /^\/login$/, handler: () => Pages.login() },
  { pattern: /^\/$/, handler: () => Pages.dashboard() },
  { pattern: /^\/dashboard$/, handler: () => Pages.dashboard() },
  { pattern: /^\/projects$/, handler: () => Pages.projects() },
  { pattern: /^\/projects\/(\d+)$/, handler: (m) => Pages.projectView(m[1]) },
  { pattern: /^\/topics\/new$/, handler: () => Pages.topicEdit('new') },
  { pattern: /^\/topics\/(\d+)$/, handler: (m) => Pages.topicView(m[1]) },
  { pattern: /^\/topics\/(\d+)\/edit$/, handler: (m) => Pages.topicEdit(m[1]) },
  { pattern: /^\/flashcards$/, handler: () => Pages.flashcards() },
  { pattern: /^\/review$/, handler: () => Pages.review() },
  { pattern: /^\/ai$/, handler: () => Pages.ai() },
  { pattern: /^\/settings$/, handler: () => Pages.settings() },
  { pattern: /^\/calendar$/, handler: () => Pages.calendar() },
];

async function router() {
  const isWpAdmin = window.location.pathname.includes('wp-admin');
  let path = window.location.pathname;

  if (isWpAdmin) {
    const urlParams = new URLSearchParams(window.location.search);
    const subPath = urlParams.get('med_path') || '/dashboard';
    path = subPath.startsWith('/') ? subPath : '/' + subPath;
  }

  // check auth first
  if (!state.user) {
    try {
      const data = await API.get('/api/auth/me');
      state.user = data.user;
    } catch { state.user = null; }
  }

  if (!state.user && path !== '/login' && !path.startsWith('/blog')) {
    window.location.href = '/login';
    return;
  }
  if (state.user && (path === '/login' || path === '/wp-login.php')) {
    // If we are in wp-admin, don't redirect away
    if (!window.location.pathname.includes('wp-admin')) {
        window.location.href = '/dashboard';
        return;
    }
  }

  for (const r of routes) {
    const m = path.match(r.pattern);
    if (m) {
      await r.handler(m);
      return;
    }
  }
  document.getElementById('app').innerHTML = `<div class="min-h-screen flex items-center justify-center text-slate-500">صفحه یافت نشد</div>`;
}

window.addEventListener('popstate', router);

// navigate: برای مسیرهای SPA از pushState استفاده میکنه
// برای مسیرهای غیر-SPA مثل /blog و /login، full page reload میکنه
function navigate(path) {
  const isWpAdmin = window.location.pathname.includes('wp-admin');

  if (isWpAdmin) {
    const url = new URL(window.location.href);
    url.searchParams.set('med_path', path);
    window.history.pushState({}, '', url.toString());
    router();
  } else {
    // مسیرهای خارجی یا وبلاگ → full reload
    if (path.startsWith('/blog') || path.startsWith('/login') || path === '/') {
      window.location.href = path;
      return;
    }
    window.history.pushState({}, '', path);
    router();
  }
  window.closeSidebar();
  window.scrollTo(0, 0);
}
window.navigate = navigate;

// capture link clicks
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[data-link]');
  if (a) {
    e.preventDefault();
    navigate(a.getAttribute('href'));
  }
});

// ---- logout ----
async function logout() {
  if (!confirm('آیا می‌خواهید خارج شوید؟')) return;
  await API.post('/api/auth/logout', {});
  state.user = null;
  window.location.href = '/login';
}
window.logout = logout;

function escapeHtml(s) { return String(s || '').replace(/[&<>"']/g, ch => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[ch])); }

// ============================================================
// Layout — fixed mobile sidebar + overlay
// ============================================================
function layout(content) {
  const isAdmin = state.user?.role === 'admin';
  const isWpAdmin = window.location.pathname.includes('wp-admin');
  const hideSidebarOnWpAdmin = isWpAdmin; // Optional: hide our sidebar if in WP Admin to avoid double sidebar
  const initial = state.user?.display_name?.[0] || state.user?.username?.[0] || 'U';
  return `
    <!-- Top Header for Mobile & Desktop -->
    <header class="fixed top-0 left-0 right-0 h-16 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md z-40 border-b border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between px-4">
      <div class="flex items-center gap-3">
        <button onclick="window.toggleSidebar()" class="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
        </button>
        <div class="md:hidden flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white font-bold">پ</div>
          <span class="font-bold text-sm">آکادمی پزشکی</span>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <button id="theme-toggle-btn" onclick="window.toggleTheme()" class="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-brand-50 hover:text-brand-600 transition-all" title="تغییر تم">
          ${document.documentElement.classList.contains('dark') ?
            '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M16.95 16.95l.707.707M7.05 7.05l.707.707M12 8a4 4 0 100 8 4 4 0 000-8z"/></svg>' :
            '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>'}
        </button>
        <button onclick="window.openFontSettings()" class="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-brand-50 hover:text-brand-600 transition-all" title="تنظیمات متن">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        </button>
        <div class="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-cyan-400 flex items-center justify-center text-white font-bold text-xs">${initial}</div>
      </div>
    </header>

    <!-- Overlay -->
    <div onclick="window.closeSidebar()" class="sidebar-overlay fixed inset-0 bg-black/50 z-45 hidden"></div>

    <div class="flex min-h-screen pt-16">
      <!-- Sidebar (RTL: right side) -->
      <aside class="sidebar w-72 max-w-[85vw] bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 fixed top-0 right-0 bottom-0 z-50 flex flex-col">
        <div class="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <a href="/dashboard" class="flex items-center gap-3" data-link>
            <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-cyan-500 flex items-center justify-center text-white font-bold text-xl">پ</div>
            <div>
              <h1 class="font-bold text-sm">آکادمی پزشکی</h1>
              <p class="text-xs text-slate-400">داشبورد</p>
            </div>
          </a>
          <button onclick="window.closeSidebar()" class="md:hidden text-slate-400 hover:text-slate-600">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <nav class="flex-1 p-3 space-y-1 overflow-y-auto">
          ${sidebarLink('/dashboard', 'داشبورد', 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6')}
          ${sidebarLink('/projects', 'پروژه‌ها', 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z')}
          ${sidebarLink('/flashcards', 'فلش‌کارت‌ها', 'M7 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2h-2M7 3v4h10V3M7 3h10')}
          ${sidebarLink('/review', 'مرور امروز', 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z')}
          ${sidebarLink('/ai', 'دستیار هوش مصنوعی', 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z')}
          ${sidebarLink('/calendar', 'تقویم و تسک‌ها', 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z')}
          ${sidebarLink('/blog', 'وبلاگ', 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253')}
          ${isAdmin ? sidebarLink('/settings', 'تنظیمات', 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z') : ''}
        </nav>
        <div class="p-3 border-t border-slate-100 dark:border-slate-700">
          <div class="flex items-center gap-3 px-2 py-2">
            <div class="w-9 h-9 rounded-full bg-gradient-to-br from-brand-400 to-cyan-400 flex items-center justify-center text-white font-bold">${initial}</div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium truncate">${escapeHtml(state.user?.display_name || state.user?.username || '')}</p>
              <p class="text-xs text-slate-400 truncate">@${escapeHtml(state.user?.username || '')}</p>
            </div>
            <button onclick="logout()" title="خروج" class="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
            </button>
          </div>
        </div>
      </aside>

      <!-- Main content -->
      <main class="main-content flex-1 min-h-screen">
        <div id="page-content" class="p-4 md:p-8 max-w-7xl mx-auto fade-in page-padding">
          ${content}
        </div>
      </main>
    </div>
  `;
}

function sidebarLink(href, label, path) {
  const active = window.location.pathname === href ? 'active' : '';
  return `<a href="${href}" data-link class="sidebar-link ${active} flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">
    <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${path}"/></svg>
    <span>${label}</span>
  </a>`;
}

// ============================================================
// PAGE COMPONENTS
// ============================================================
const Pages = {};

// ---- Login page ----
Pages.login = function() {
  document.getElementById('app').innerHTML = `
    <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 via-cyan-50 to-purple-50 p-4">
      <div class="absolute inset-0 overflow-hidden pointer-events-none">
        <div class="absolute top-20 right-20 w-72 h-72 bg-brand-200/30 rounded-full blur-3xl"></div>
        <div class="absolute bottom-20 left-20 w-96 h-96 bg-cyan-200/30 rounded-full blur-3xl"></div>
      </div>
      <div class="relative w-full max-w-md">
        <div class="text-center mb-8">
          <div class="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-cyan-500 items-center justify-center text-white text-3xl font-bold mb-4 shadow-xl shadow-brand-500/30">پ</div>
          <h1 class="text-2xl font-bold text-slate-800">آکادمی پزشکی</h1>
          <p class="text-slate-500 mt-1">پلتفرم آموزش پزشکی با هوش مصنوعی</p>
        </div>

        <div class="bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
          <h2 class="text-xl font-bold mb-6 text-center text-slate-800">ورود به پنل</h2>

          <form id="auth-form" onsubmit="handleAuth(event, 'login')" class="space-y-4">
            <div id="register-fields" class="hidden space-y-4">
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1.5">نام نمایشی</label>
                <input type="text" name="display_name" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all" placeholder="مثلاً: دکتر احمدی">
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1.5">نام کاربری</label>
              <input type="text" name="username" required minlength="3" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all" placeholder="username">
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1.5">رمز عبور</label>
              <input type="password" name="password" required minlength="6" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all" placeholder="••••••••">
            </div>
            <label class="flex items-center gap-2 cursor-pointer select-none" id="remember-label">
              <input type="checkbox" name="remember_me" class="w-4 h-4 rounded accent-brand-600" checked>
              <span class="text-sm text-slate-600">مرا به خاطر بسپار (۳۰ روز)</span>
            </label>
            <button type="submit" id="auth-submit" class="w-full py-3 bg-gradient-to-l from-brand-600 to-cyan-600 text-white font-medium rounded-xl hover:shadow-lg hover:shadow-brand-500/30 transition-all">
              ورود
            </button>
          </form>
        </div>

        <p class="text-center text-xs text-slate-400 mt-6">با ورود، شرایط استفاده را می‌پذیرید.</p>
      </div>
    </div>
  `;
};

window.showLoginTab = function(tab) {
  const isLogin = tab === 'login';
  document.getElementById('tab-login').className = `w-full pb-3 text-sm font-medium border-b-2 ${isLogin ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500'}`;
  document.getElementById('tab-register').className = `w-full pb-3 text-sm font-medium border-b-2 ${!isLogin ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500'}`;
  document.getElementById('register-fields').classList.toggle('hidden', isLogin);
  document.getElementById('auth-submit').textContent = isLogin ? 'ورود' : 'ثبت نام';
  document.getElementById('auth-form').onsubmit = (e) => handleAuth(e, tab);
};

window.handleAuth = async function(e, tab) {
  e.preventDefault();
  const form = e.target;
  const data = Object.fromEntries(new FormData(form));
  const btn = document.getElementById('auth-submit');
  const originalText = btn.textContent;
  btn.disabled = true;
  btn.innerHTML = '<span class="loader"></span> ' + (tab === 'login' ? 'در حال ورود...' : 'در حال ثبت نام...');
  try {
    const res = await API.post(`/api/auth/${tab}`, data);
    toast(tab === 'login' ? 'خوش آمدید! 👋' : 'ثبت نام موفق! 🎉', 'success');
    setTimeout(() => window.location.href = '/dashboard', 500);
  } catch (err) {
    toast(err.message, 'error');
    btn.disabled = false;
    btn.textContent = originalText;
  }
};

// ---- Dashboard ----
Pages.dashboard = async function() {
  document.getElementById('app').innerHTML = layout(`
    <h1 class="text-xl md:text-2xl font-bold mb-1 mt-8 md:mt-0">سلام، ${escapeHtml(state.user?.display_name || state.user?.username || '')} 👋</h1>
    <p class="text-slate-500 mb-6 text-sm">خلاصه‌ای از پیشرفت شما</p>

    <div id="dash-stats" class="stat-card-grid grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
      ${loadingCards(4)}
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6">
      <div class="bg-white dark:bg-slate-800 rounded-2xl p-5 md:p-6 shadow-sm border border-slate-100 dark:border-slate-700">
        <div class="flex items-center justify-between mb-4">
          <h2 class="font-bold">پروژه‌های اخیر</h2>
          <div class="flex gap-3">
            <button onclick="quickCreatePost()" class="text-xs text-brand-600 font-bold hover:bg-brand-50 px-2 py-1 rounded-lg transition-colors">پست وبلاگ جدید</button>
            <a href="/projects" data-link class="text-sm text-brand-600 hover:underline">همه</a>
          </div>
        </div>
        <div id="dash-projects" class="space-y-2">${loadingCards(3)}</div>
      </div>
      <div class="bg-white dark:bg-slate-800 rounded-2xl p-5 md:p-6 shadow-sm border border-slate-100 dark:border-slate-700">
        <div class="flex items-center justify-between mb-4">
          <h2 class="font-bold">کار‌های امروز</h2>
          <a href="/review" data-link class="text-sm text-brand-600 hover:underline">شروع مرور</a>
        </div>
        <div id="dash-today" class="space-y-2">${loadingCards(2)}</div>
      </div>
    </div>

    <div class="bg-gradient-to-l from-brand-600 to-cyan-600 rounded-2xl p-5 md:p-6 text-white shadow-lg shadow-brand-500/30">
      <div class="flex items-start gap-4">
        <div class="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/></svg>
        </div>
        <div class="flex-1">
          <h3 class="font-bold text-lg mb-1">دستیار هوش مصنوعی</h3>
          <p class="text-white/80 text-sm mb-3">با Gemini Google می‌تونی سریعاً محتوای آموزشی تولید کنی.</p>
          <a href="/ai" data-link class="inline-flex items-center gap-2 px-4 py-2 bg-white text-brand-600 rounded-lg text-sm font-medium hover:bg-brand-50 transition-colors">
            شروع کنید
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7"/></svg>
          </a>
        </div>
      </div>
    </div>
  `);

  try {
    const [projects, cards] = await Promise.all([
      API.get('/api/projects'),
      API.get('/api/flashcards/stats/overview'),
    ]);

    document.getElementById('dash-stats').innerHTML = `
      ${statCard('پروژه‌ها', projects.projects?.length || 0, 'folder', 'text-brand-600 bg-brand-50')}
      ${statCard('فلش‌کارت‌ها', cards.total || 0, 'card', 'text-cyan-600 bg-cyan-50')}
      ${statCard('آماده مرور', cards.due || 0, 'clock', 'text-orange-600 bg-orange-50')}
      ${statCard('یاد گرفته شده', cards.learned || 0, 'check', 'text-emerald-600 bg-emerald-50')}
    `;

    const projList = (projects.projects || []).slice(0, 4);
    document.getElementById('dash-projects').innerHTML = projList.length ? projList.map(p => `
      <a href="/projects/${p.id}" data-link class="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
        <div class="w-10 h-10 rounded-lg flex items-center justify-center text-white flex-shrink-0" style="background-color:${p.color}">${escapeHtml(p.title[0] || '?')}</div>
        <div class="flex-1 min-w-0">
          <p class="font-medium truncate">${escapeHtml(p.title)}</p>
          <p class="text-xs text-slate-400">${p.topic_count || 0} مبحث • ${p.flashcard_count || 0} فلش‌کارت</p>
        </div>
      </a>
    `).join('') : `<p class="text-sm text-slate-400 text-center py-6">هنوز پروژه‌ای نساخته‌اید.</p>`;

    document.getElementById('dash-today').innerHTML = `
      <a href="/review" data-link class="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
        <div class="w-10 h-10 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center flex-shrink-0">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        </div>
        <div class="flex-1">
          <p class="font-medium">${cards.due || 0} فلش‌کارت برای مرور</p>
          <p class="text-xs text-slate-400">بر اساس الگوریتم SM-2</p>
        </div>
      </a>
      <a href="/ai" data-link class="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
        <div class="w-10 h-10 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/></svg>
        </div>
        <div class="flex-1">
          <p class="font-medium">تولید محتوای آموزشی</p>
          <p class="text-xs text-slate-400">با هوش مصنوعی Gemini</p>
        </div>
      </a>
    `;
  } catch (err) { toast(err.message, 'error'); }
};

function loadingCards(n) { return Array(n).fill(0).map(() => `<div class="bg-slate-100 dark:bg-slate-700/50 animate-pulse h-20 rounded-xl"></div>`).join(''); }

function statCard(label, value, icon, colorClass) {
  const icons = {
    folder: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z',
    card: 'M7 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2h-2M7 3v4h10V3M7 3h10',
    clock: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
    check: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    eye: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z',
  };
  return `<div class="bg-white dark:bg-slate-800 rounded-2xl p-4 md:p-5 shadow-sm border border-slate-100 dark:border-slate-700">
    <div class="flex items-center justify-between">
      <div class="min-w-0">
        <p class="text-xs md:text-sm text-slate-500 truncate">${label}</p>
        <p class="text-xl md:text-2xl font-bold mt-1">${value}</p>
      </div>
      <div class="w-10 h-10 md:w-12 md:h-12 rounded-xl ${colorClass} flex items-center justify-center flex-shrink-0">
        <svg class="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${icons[icon] || icons.folder}"/></svg>
      </div>
    </div>
  </div>`;
}

// ---- Projects page ----
Pages.projects = async function() {
  document.getElementById('app').innerHTML = layout(`
    <div class="flex items-center justify-between mb-6 mt-8 md:mt-0">
      <div>
        <h1 class="text-xl md:text-2xl font-bold">پروژه‌ها</h1>
        <p class="text-slate-500 text-sm">پروژه‌های آموزشی خود را مدیریت کنید</p>
      </div>
      <button onclick="openProjectModal()" class="inline-flex items-center gap-2 px-3 md:px-4 py-2 md:py-2.5 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-colors shadow-md shadow-brand-500/30 text-sm">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
        <span class="hidden md:inline">پروژه جدید</span>
      </button>
    </div>
    <div id="projects-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
      ${loadingCards(6)}
    </div>
  `);

  try {
    const data = await API.get('/api/projects');
    const grid = document.getElementById('projects-grid');
    if (!data.projects?.length) {
      grid.innerHTML = `<div class="col-span-full text-center py-16">
        <div class="w-20 h-20 mx-auto mb-4 bg-slate-100 dark:bg-slate-700 rounded-2xl flex items-center justify-center text-slate-400">
          <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>
        </div>
        <h3 class="font-bold text-lg mb-1">هنوز پروژه‌ای ندارید</h3>
        <p class="text-sm text-slate-500 mb-4">اولین پروژه خود را بسازید</p>
        <button onclick="openProjectModal()" class="px-4 py-2 bg-brand-600 text-white rounded-xl">ایجاد پروژه</button>
      </div>`;
      return;
    }
    grid.innerHTML = data.projects.map(p => `
      <a href="/projects/${p.id}" data-link class="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-lg hover:-translate-y-1 transition-all">
        <div class="flex items-start justify-between mb-3">
          <div class="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg" style="background-color:${p.color}">${escapeHtml(p.title[0] || '?')}</div>
          <div class="flex items-center gap-2 text-xs text-slate-400">
            <span class="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded-md">${p.topic_count || 0} مبحث</span>
          </div>
        </div>
        <h3 class="font-bold mb-1">${escapeHtml(p.title)}</h3>
        <p class="text-sm text-slate-500 line-clamp-2 mb-3">${escapeHtml(p.description || 'بدون توضیحات')}</p>
        <div class="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700">
          <span class="text-xs text-slate-400">${p.flashcard_count || 0} فلش‌کارت</span>
          <span class="text-xs text-brand-600">مشاهده ←</span>
        </div>
      </a>
    `).join('');
  } catch (err) { toast(err.message, 'error'); }
};

window.deleteProject = async function(id) {
  if (!confirm('آیا از حذف این پروژه و تمام مباحث آن اطمینان دارید؟ این عمل غیرقابل بازگشت است.')) return;
  try {
    await API.del(`/api/projects/${id}`);
    toast('پروژه حذف شد', 'success');
    navigate('/projects');
  } catch (err) { toast(err.message, 'error'); }
};

window.openProjectModal = function(project = null) {
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#ef4444', '#14b8a6'];
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 scale-in';
  modal.innerHTML = `
    <div class="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl modal-mobile-full">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-bold">${project ? 'ویرایش پروژه' : 'پروژه جدید'}</h3>
        <button onclick="this.closest('.fixed').remove()" class="text-slate-400 hover:text-slate-600">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>
      <form onsubmit="saveProject(event, ${project?.id || 'null'})" class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-1.5">عنوان</label>
          <input type="text" name="title" required value="${escapeHtml(project?.title || '')}" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none">
        </div>
        <div>
          <label class="block text-sm font-medium mb-1.5">توضیحات</label>
          <textarea name="description" rows="2" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none">${escapeHtml(project?.description || '')}</textarea>
        </div>
        <div>
          <label class="block text-sm font-medium mb-1.5">رنگ</label>
          <div class="flex flex-wrap gap-2">
            ${colors.map(c => `<label class="cursor-pointer">
              <input type="radio" name="color" value="${c}" ${project?.color === c || (!project && c === colors[0]) ? 'checked' : ''} class="sr-only peer">
              <span class="block w-9 h-9 rounded-lg peer-checked:ring-4 peer-checked:ring-offset-2 peer-checked:ring-brand-300" style="background-color:${c}"></span>
            </label>`).join('')}
          </div>
        </div>
        <div class="flex gap-2 pt-2">
          <button type="button" onclick="this.closest('.fixed').remove()" class="flex-1 py-2.5 bg-slate-100 dark:bg-slate-700 rounded-xl">انصراف</button>
          <button type="submit" class="flex-1 py-2.5 bg-brand-600 text-white rounded-xl hover:bg-brand-700">${project ? 'ذخیره' : 'ایجاد'}</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
};

window.saveProject = async function(e, id) {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  try {
    if (id) await API.put(`/api/projects/${id}`, data);
    else await API.post('/api/projects', data);
    toast(id ? 'پروژه به‌روزرسانی شد' : 'پروژه ساخته شد', 'success');
    e.target.closest('.fixed').remove();
    Pages.projects();
  } catch (err) { toast(err.message, 'error'); }
};

// ---- Project view ----
Pages.projectView = async function(id) {
  document.getElementById('app').innerHTML = layout(`
    <div id="project-header">${loadingCards(1)}</div>
    <div class="flex items-center justify-between mb-4 mt-6">
      <h2 class="text-lg font-bold">مباحث</h2>
      <button onclick="openTopicModal(${id})" class="inline-flex items-center gap-2 px-3 md:px-4 py-2 bg-brand-600 text-white rounded-xl text-sm hover:bg-brand-700">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
        <span class="hidden md:inline">مبحث جدید</span>
      </button>
    </div>
    <div id="topics-list" class="space-y-2">${loadingCards(3)}</div>
  `);

  try {
    const [proj, topics] = await Promise.all([
      API.get(`/api/projects/${id}`),
      API.get(`/api/topics?project_id=${id}&limit=50`),
    ]);

    document.getElementById('project-header').innerHTML = `
      <div class="flex items-center gap-3 md:gap-4 mt-8 md:mt-0">
        <a href="/projects" data-link class="text-slate-400 hover:text-brand-600 flex-shrink-0">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
        </a>
        <div class="w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0" style="background-color:${proj.project.color}">${escapeHtml(proj.project.title[0] || '?')}</div>
        <div class="flex-1 min-w-0">
          <h1 class="text-lg md:text-2xl font-bold truncate">${escapeHtml(proj.project.title)}</h1>
          <p class="text-sm text-slate-500 line-clamp-1">${escapeHtml(proj.project.description || '')}</p>
        </div>
        <div class="flex items-center gap-2">
          <button onclick='openProjectModal(${JSON.stringify(proj.project).replace(/'/g, "&#39;")})' class="px-3 py-1.5 text-sm bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 flex-shrink-0">ویرایش</button>
          <button onclick="deleteProject(${proj.project.id})" class="p-1.5 text-red-500 hover:bg-red-50 rounded-lg flex-shrink-0" title="حذف پروژه">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </button>
        </div>
      </div>
    `;

    const list = document.getElementById('topics-list');
    if (!topics.topics?.length) {
      list.innerHTML = `<div class="text-center py-12 text-slate-400">
        <p>هنوز مبحثی در این پروژه نیست.</p>
      </div>`;
      return;
    }
    list.innerHTML = topics.topics.map(t => `
      <a href="/topics/${t.id}" data-link class="block p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 hover:shadow-md hover:border-brand-200 transition-all">
        <div class="flex items-center justify-between gap-2">
          <h3 class="font-bold flex-1 line-clamp-1">${escapeHtml(t.title)}</h3>
          ${statusBadge(t.status)}
        </div>
        <p class="text-sm text-slate-500 mt-1 line-clamp-1">${escapeHtml(t.excerpt || 'بدون محتوا')}</p>
        <div class="flex items-center gap-3 mt-2 text-xs text-slate-400 flex-wrap">
          ${t.tags ? `<span>${escapeHtml(t.tags)}</span>` : ''}
          <span>${t.word_count} کلمه</span>
        </div>
      </a>
    `).join('');
  } catch (err) { toast(err.message, 'error'); }
};

function statusBadge(status) {
  const map = {
    draft: { label: 'پیش‌نویس', cls: 'bg-slate-100 text-slate-600' },
    published: { label: 'منتشر شده', cls: 'bg-emerald-100 text-emerald-700' },
    archived: { label: 'بایگانی', cls: 'bg-orange-100 text-orange-700' },
  };
  const s = map[status] || map.draft;
  return `<span class="text-xs px-2 py-1 rounded-md ${s.cls} flex-shrink-0">${s.label}</span>`;
}

window.openTopicModal = function(projectId, topic = null) {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 scale-in';
  modal.innerHTML = `
    <div class="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl modal-mobile-full">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-bold">مبحث جدید</h3>
        <button onclick="this.closest('.fixed').remove()" class="text-slate-400 hover:text-slate-600">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>
      <form onsubmit="createTopic(event, ${projectId})" class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-1.5">عنوان مبحث</label>
          <input type="text" name="title" required autofocus class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none" placeholder="مثلاً: نارسایی قلبی">
        </div>
        <div>
          <label class="block text-sm font-medium mb-1.5">تگ‌ها (با کاما جدا کنید)</label>
          <input type="text" name="tags" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none" placeholder="قلب, اورژانس, داروشناسی">
        </div>
        <label class="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" name="generate_ai" class="w-4 h-4 accent-brand-600">
          تولید محتوا با هوش مصنوعی پس از ایجاد
        </label>
        <div class="flex gap-2 pt-2">
          <button type="button" onclick="this.closest('.fixed').remove()" class="flex-1 py-2.5 bg-slate-100 dark:bg-slate-700 rounded-xl">انصراف</button>
          <button type="submit" class="flex-1 py-2.5 bg-brand-600 text-white rounded-xl hover:bg-brand-700">ایجاد و ویرایش</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
};

window.createTopic = async function(e, projectId) {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  data.project_id = projectId;
  data.status = 'draft';
  try {
    const res = await API.post('/api/topics', data);
    toast('مبحث ساخته شد', 'success');
    e.target.closest('.fixed').remove();
    navigate(`/topics/${res.topic.id}/edit`);
  } catch (err) { toast(err.message, 'error'); }
};

// ---- Topic view ----
Pages.topicView = async function(id) {
  document.getElementById('app').innerHTML = layout(`
    <div id="topic-content">${loadingCards(1)}</div>
  `);
  try {
    const data = await API.get(`/api/topics/${id}`);
    const t = data.topic;
    document.getElementById('topic-content').innerHTML = `
      <a href="/projects/${t.project_id}" data-link class="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-brand-600 mb-3 mt-8 md:mt-0">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
        ${escapeHtml(t.project_title || 'پروژه')}
      </a>
      <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-2">
        <h1 class="text-2xl md:text-3xl font-bold flex-1">${escapeHtml(t.title)}</h1>
        <div class="flex items-center gap-2 flex-wrap">
          ${statusBadge(t.status)}
          <a href="/topics/${t.id}/edit" data-link class="px-3 py-1.5 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700">ویرایش</a>
          ${t.status === 'draft' ? `<button onclick="publishTopic(${t.id})" class="px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">انتشار در وبلاگ</button>` : `<a href="/blog/${t.slug}" class="px-3 py-1.5 text-sm bg-slate-100 dark:bg-slate-700 rounded-lg">مشاهده در وبلاگ</a>`}
          <button onclick="deleteTopic(${t.id}, ${t.project_id})" class="p-1.5 text-red-500 hover:bg-red-50 rounded-lg" title="حذف مبحث">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </button>
        </div>
      </div>
      <div class="flex items-center gap-3 text-sm text-slate-400 mb-6 pb-6 border-b border-slate-200 dark:border-slate-700 flex-wrap">
        <span>${t.word_count} کلمه</span>
        ${t.tags ? `<span>•</span><span>${escapeHtml(t.tags)}</span>` : ''}
      </div>
      <div class="markdown-preview bg-white dark:bg-slate-800 rounded-2xl p-4 md:p-6 lg:p-8 border border-slate-100 dark:border-slate-700 mb-8 relative" id="content-to-highlight">${t.content_html || '<p class="text-slate-400 text-center py-8">هنوز محتوایی ثبت نشده. روی «ویرایش» بزنید.</p>'}</div>

      <div class="mt-12">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-xl font-bold flex items-center gap-2">
            <svg class="w-6 h-6 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2h-2M7 3v4h10V3M7 3h10"/></svg>
            فلش‌کارت‌های این مبحث
          </h2>
          <div class="flex gap-2">
            <button onclick="importCSV(${t.project_id}, ${t.id})" class="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm">📥 ایمپورت CSV</button>
            <button onclick="addFlashcardModal(${t.project_id}, ${t.id})" class="px-4 py-2 bg-brand-600 text-white rounded-xl text-sm font-medium hover:bg-brand-700 transition-colors shadow-sm">➕ کارت جدید</button>
          </div>
        </div>
        <div class="flex items-center gap-4 mb-6 border-b border-slate-100 dark:border-slate-700 overflow-x-auto whitespace-nowrap pb-1">
          <button onclick="switchTopicTab('due', ${t.id})" id="tab-due" class="topic-tab active pb-2 text-sm font-bold border-b-2 border-brand-500 text-brand-600">مرور الان</button>
          <button onclick="switchTopicTab('tomorrow', ${t.id})" id="tab-tomorrow" class="topic-tab pb-2 text-sm font-bold border-b-2 border-transparent text-slate-400">مرور فردا</button>
          <button onclick="switchTopicTab('three_days', ${t.id})" id="tab-three_days" class="topic-tab pb-2 text-sm font-bold border-b-2 border-transparent text-slate-400">مرور ۳ روز بعد</button>
          <button onclick="switchTopicTab('all', ${t.id})" id="tab-all" class="topic-tab pb-2 text-sm font-bold border-b-2 border-transparent text-slate-400">همه</button>
        </div>
        <div id="topic-flashcards" class="space-y-6 max-w-2xl mx-auto">
          ${loadingCards(2)}
        </div>
      </div>
    `;
    loadTopicFlashcards(t.id, 'due');
    initHighlighter(id);
  } catch (err) { toast(err.message, 'error'); }
};

window.initHighlighter = function(topicId) {
  const contentArea = document.getElementById('content-to-highlight');
  if (!contentArea) return;

  const handleSelection = () => {
    const selection = window.getSelection();
    const text = selection.toString().trim();
    if (!text) {
      removeHighlightMenu();
      return;
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    // Position menu: center horizontally, above the selection
    showHighlightMenu(rect.left + (rect.width / 2), rect.top + window.scrollY, topicId);
  };

  contentArea.addEventListener('mouseup', handleSelection);
  contentArea.addEventListener('touchend', (e) => {
    // Small delay to allow selection to finalize on mobile
    setTimeout(handleSelection, 100);
  });

  document.addEventListener('mousedown', (e) => {
    if (!e.target.closest('#highlight-menu') && !e.target.closest('#content-to-highlight')) {
      removeHighlightMenu();
    }
  });
  document.addEventListener('touchstart', (e) => {
    if (!e.target.closest('#highlight-menu') && !e.target.closest('#content-to-highlight')) {
      removeHighlightMenu();
    }
  });
};

function showHighlightMenu(x, y, topicId) {
  removeHighlightMenu();
  const menu = document.createElement('div');
  menu.id = 'highlight-menu';
  menu.className = 'fixed z-[100] bg-white dark:bg-slate-800 p-2 rounded-2xl border border-slate-200 dark:border-slate-700 flex gap-2 -translate-x-1/2 -translate-y-full mb-3';
  menu.style.left = x + 'px';
  menu.style.top = y + 'px';

  const colors = [
    { name: 'yellow', hex: '#fef08a' },
    { name: 'green', hex: '#bbf7d0' },
    { name: 'blue', hex: '#bfdbfe' },
    { name: 'pink', hex: '#fbcfe8' }
  ];

  colors.forEach(c => {
    const btn = document.createElement('button');
    btn.className = `w-8 h-8 rounded-full border-2 border-white dark:border-slate-700 hover:scale-110 transition-transform`;
    btn.style.backgroundColor = c.hex;
    btn.onclick = () => applyHighlight(c.name, topicId);
    menu.appendChild(btn);
  });

  document.body.appendChild(menu);
}

function removeHighlightMenu() {
  document.getElementById('highlight-menu')?.remove();
}

async function applyHighlight(colorClass, topicId) {
  const selection = window.getSelection();
  if (!selection.rangeCount) return;

  const range = selection.getRangeAt(0);
  const mark = document.createElement('mark');
  mark.className = `hl-${colorClass}`;

  try {
    range.surroundContents(mark);
    removeHighlightMenu();
    selection.removeAllRanges();

    // Save the new HTML
    const contentArea = document.getElementById('content-to-highlight');
    await API.patch(`/api/topics/${topicId}/highlight`, {
      html_content: contentArea.innerHTML
    });
    toast('هایلایت ذخیره شد', 'success');
  } catch (e) {
    toast('خطا: متن انتخابی شامل تگ‌های HTML است. لطفاً قطعه کوچکتری را انتخاب کنید.', 'warning');
  }
}

window.switchTopicTab = function(filter, topicId) {
  document.querySelectorAll('.topic-tab').forEach(btn => {
    btn.classList.remove('active', 'border-brand-500', 'text-brand-600');
    btn.classList.add('border-transparent', 'text-slate-400');
  });
  const active = document.getElementById(`tab-${filter}`);
  if (active) {
    active.classList.add('active', 'border-brand-500', 'text-brand-600');
    active.classList.remove('border-transparent', 'text-slate-400');
  }
  loadTopicFlashcards(topicId, filter);
};

window.loadTopicFlashcards = async function(topicId, filter = 'all') {
  try {
    const data = await API.get(`/api/flashcards?topic_id=${topicId}&limit=100`);
    const container = document.getElementById('topic-flashcards');

    let cards = data.flashcards || [];
    const now = new Date();
    const tomorrowEnd = new Date();
    tomorrowEnd.setHours(23, 59, 59, 999);
    tomorrowEnd.setDate(now.getDate() + 1);

    if (filter === 'due') {
      cards = cards.filter(c => new Date(c.next_review_at) <= now);
    } else if (filter === 'tomorrow') {
      cards = cards.filter(c => {
        const d = new Date(c.next_review_at);
        return d > now && d <= tomorrowEnd;
      });
    } else if (filter === 'three_days') {
      const threeDaysEnd = new Date();
      threeDaysEnd.setHours(23, 59, 59, 999);
      threeDaysEnd.setDate(now.getDate() + 3);
      cards = cards.filter(c => {
        const d = new Date(c.next_review_at);
        return d > tomorrowEnd && d <= threeDaysEnd;
      });
    }

    if (!cards.length) {
      let emptyMsg = 'هنوز برای این مبحث فلش‌کارتی نساخته‌اید.';
      if (filter === 'due') emptyMsg = 'تمام کارت‌ها مرور شده‌اند! 🎉';
      else if (filter === 'tomorrow') emptyMsg = 'کارتی برای فردا نیست.';
      else if (filter === 'three_days') emptyMsg = 'کارتی برای ۳ روز آینده نیست.';

      container.innerHTML = `<div class="text-center py-12 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-400">
        <p>${emptyMsg}</p>
      </div>`;
      return;
    }
    container.innerHTML = cards.map(c => `
      <div class="topic-card-container transition-all duration-300">
        <div class="flip-card" id="card-${c.id}" onclick="this.classList.toggle('flipped')">
          <div class="flip-card-inner" style="min-height: 200px;">
            <div class="flip-card-front bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-md border border-slate-100 dark:border-slate-700 flex flex-col items-center justify-center text-center cursor-pointer">
              <span class="text-[10px] uppercase tracking-widest text-slate-400 mb-4 font-bold">سوال</span>
              <p class="text-lg font-bold">${escapeHtml(c.front)}</p>
              <div class="mt-6 text-[10px] text-brand-600 font-bold opacity-50">برای مشاهده پاسخ کلیک کنید</div>
            </div>
            <div class="flip-card-back bg-gradient-to-br from-brand-600 to-cyan-600 text-white rounded-2xl p-6 shadow-lg flex flex-col items-center justify-center text-center">
              <span class="text-[10px] uppercase tracking-widest opacity-70 mb-4 font-bold">پاسخ</span>
              <p class="text-lg font-medium">${escapeHtml(c.back)}</p>
            </div>
          </div>
        </div>
        <div class="flex items-center gap-2 mt-3">
          <div class="flex-1 grid grid-cols-3 gap-2">
            <button onclick="answerTopicCard(${c.id}, 'easy', event, ${topicId})" class="py-2 bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-colors">بلد بودم (۳ روز)</button>
            <button onclick="answerTopicCard(${c.id}, 'good', event, ${topicId})" class="py-2 bg-brand-50 text-brand-600 dark:bg-brand-900/20 dark:text-brand-400 rounded-xl text-xs font-bold hover:bg-brand-100 transition-colors">نسبتاً بلد بودم (۱ روز)</button>
            <button onclick="answerTopicCard(${c.id}, 'again', event, ${topicId})" class="py-2 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 rounded-xl text-xs font-bold hover:bg-red-100 transition-colors">بلد نبودم (فوری)</button>
          </div>
          <button onclick="deleteFlashcard(${c.id}, ${topicId})" class="p-2 text-slate-300 hover:text-red-500 transition-colors" title="حذف کارت">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </button>
        </div>
      </div>
    `).join('');
  } catch (err) { toast(err.message, 'error'); }
};

window.answerTopicCard = async function(cardId, level, event, topicId) {
  event.stopPropagation();
  try {
    await API.post(`/api/review/quick-answer`, { card_id: cardId, level });
    toast('ثبت شد', 'success');

    // انیمیشن بصری کوچک برای تایید
    const container = event.target.closest('.topic-card-container');
    if (container) {
      container.style.opacity = '0.5';
      container.style.transform = 'scale(0.95)';
      container.style.pointerEvents = 'none';
    }

    setTimeout(() => {
      const activeTab = document.querySelector('.topic-tab.active')?.id.replace('tab-', '') || 'due';
      window.loadTopicFlashcards(topicId, activeTab);
    }, 400);
  } catch (err) { toast(err.message, 'error'); }
};

window.deleteTopic = async function(id, projectId) {
  if (!confirm('آیا از حذف این مبحث اطمینان دارید؟')) return;
  try {
    await API.del(`/api/topics/${id}`);
    toast('مبحث حذف شد', 'success');
    navigate(`/projects/${projectId}`);
  } catch (err) { toast(err.message, 'error'); }
};

window.publishTopic = async function(id) {
  if (!confirm('این مبحث در وبلاگ منتشر شود؟')) return;
  try {
    await API.post(`/api/topics/${id}/publish`, {});
    toast('در وبلاگ منتشر شد ✅', 'success');
    Pages.topicView(id);
  } catch (err) { toast(err.message, 'error'); }
};

// ---- Topic edit ----
Pages.topicEdit = async function(id) {
  document.getElementById('app').innerHTML = layout(`
    <div class="mb-4 flex items-center gap-3 mt-8 md:mt-0">
      <a href="javascript:history.back()" class="text-slate-400 hover:text-brand-600">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
      </a>
      <h1 class="text-xl md:text-2xl font-bold">${id === 'new' ? 'مبحث جدید' : 'ویرایش مبحث'}</h1>
    </div>
    <div id="editor-area">${loadingCards(1)}</div>
  `);

  let topic = null;
  if (id !== 'new') {
    try {
      const data = await API.get(`/api/topics/${id}`);
      topic = data.topic;
    } catch (err) { toast(err.message, 'error'); return; }
  }

  document.getElementById('editor-area').innerHTML = `
    <div class="bg-white dark:bg-slate-800 rounded-2xl p-4 md:p-6 border border-slate-100 dark:border-slate-700 mb-4">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div class="md:col-span-2">
          <label class="block text-sm font-medium mb-1.5">عنوان</label>
          <input type="text" id="topic-title" value="${escapeHtml(topic?.title || '')}" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none">
        </div>
        <div>
          <label class="block text-sm font-medium mb-1.5">وضعیت</label>
          <select id="topic-status" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none">
            <option value="draft" ${topic?.status === 'draft' ? 'selected' : ''}>پیش‌نویس</option>
            <option value="published" ${topic?.status === 'published' ? 'selected' : ''}>منتشر شده</option>
            <option value="archived" ${topic?.status === 'archived' ? 'selected' : ''}>بایگانی</option>
          </select>
        </div>
      </div>
      <div class="mb-4">
        <label class="block text-sm font-medium mb-1.5">تگ‌ها (با کاما)</label>
        <input type="text" id="topic-tags" value="${escapeHtml(topic?.tags || '')}" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none" placeholder="قلب, اورژانس">
      </div>

      <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
        <label class="block text-sm font-medium">محتوا (Markdown)</label>
        <div class="flex items-center gap-2">
          <button onclick="generateWithAI(${id !== 'new' ? id : 'null'})" class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gradient-to-l from-purple-600 to-pink-600 text-white rounded-lg hover:shadow-md">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/></svg>
            تولید با AI
          </button>
          <button onclick="improveWithAI()" class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200">بهبود متن</button>
        </div>
      </div>
      <textarea id="topic-editor">${escapeHtml(topic?.content_md || '')}</textarea>

      <div class="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700 mt-4 flex-wrap gap-2">
        <span class="text-xs text-slate-400" id="word-count">${(topic?.content_md || '').split(/\s+/).filter(Boolean).length} کلمه</span>
        <div class="flex gap-2">
          <a href="${id !== 'new' ? `/topics/${id}` : '/dashboard'}" data-link class="px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-xl">انصراف</a>
          <button onclick="saveTopic(${id !== 'new' ? id : 'null'}, ${topic?.project_id || 0})" class="px-4 py-2 bg-brand-600 text-white rounded-xl hover:bg-brand-700">ذخیره</button>
        </div>
      </div>
    </div>
  `;

  const easyMDE = new EasyMDE({
    element: document.getElementById('topic-editor'),
    direction: 'rtl',
    spellChecker: false,
    autofocus: true,
    status: false,
    toolbar: ['bold', 'italic', 'heading', '|', 'quote', 'unordered-list', 'ordered-list', '|', 'link', 'image', 'code', 'table', '|', 'preview', 'side-by-side', 'fullscreen', '|', 'guide'],
    renderingConfig: { codeSyntaxHighlighting: true },
  });
  window._editor = easyMDE;
  easyMDE.codemirror.on('change', () => {
    const v = easyMDE.value();
    document.getElementById('word-count').textContent = `${v.split(/\s+/).filter(Boolean).length} کلمه`;
  });
};

window.quickCreatePost = async function() {
  // Find or create 'Blog' project
  try {
    const { projects } = await API.get('/api/projects');
    let blogProj = projects.find(p => p.title === 'وبلاگ');
    if (!blogProj) {
      blogProj = (await API.post('/api/projects', { title: 'وبلاگ', description: 'پست‌های مستقیم وبلاگ', color: '#ec4899' })).project;
    }
    const title = prompt('عنوان پست جدید:');
    if (!title) return;

    const res = await API.post('/api/topics', { title, project_id: blogProj.id, status: 'draft' });
    navigate(`/topics/${res.topic.id}/edit`);
  } catch (err) { toast(err.message, 'error'); }
};

window.saveTopic = async function(id, projectId) {
  const title = document.getElementById('topic-title').value.trim();
  if (!title) return toast('عنوان الزامی است', 'error');

  // Auto-handling for project-less topics (e.g. from direct blog post creation)
  let finalProjectId = projectId;
  if (!finalProjectId && id === null) {
    try {
      const { projects } = await API.get('/api/projects');
      let blogProj = projects.find(p => p.title === 'وبلاگ');
      if (!blogProj) {
        blogProj = (await API.post('/api/projects', { title: 'وبلاگ', description: 'پست‌های مستقیم وبلاگ', color: '#ec4899' })).project;
      }
      finalProjectId = blogProj.id;
    } catch (e) {
      return toast('ابتدا یک پروژه بسازید', 'error');
    }
  }

  const data = {
    title,
    tags: document.getElementById('topic-tags').value.trim(),
    status: document.getElementById('topic-status').value,
    content_md: window._editor.value(),
  };

  try {
    let res;
    if (id) res = await API.put(`/api/topics/${id}`, data);
    else res = await API.post('/api/topics', { ...data, project_id: finalProjectId });
    toast('ذخیره شد ✓', 'success');
    navigate(`/topics/${res.topic.id}`);
  } catch (err) { toast(err.message, 'error'); }
};

window.generateWithAI = async function(topicId) {
  const title = document.getElementById('topic-title').value.trim();
  if (!title) return toast('ابتدا عنوان را وارد کنید', 'error');
  if (!confirm('محتوای فعلی با خروجی هوش مصنوعی جایگزین شود؟')) return;

  const btn = event.target.closest('button');
  const orig = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="loader"></span> در حال تولید...';

  try {
    const res = await API.post('/api/ai/generate-topic', { title, topic_id: topicId || null });
    window._editor.value(res.content_md);
    toast('محتوا تولید شد ✓', 'success');
  } catch (err) { toast(err.message, 'error'); }
  btn.disabled = false;
  btn.innerHTML = orig;
};

window.improveWithAI = async function() {
  const content = window._editor.value();
  if (!content.trim()) return toast('محتوا خالی است', 'error');

  const btn = event.target.closest('button');
  const orig = btn.textContent;
  btn.disabled = true;
  btn.innerHTML = '<span class="loader"></span>';

  try {
    const res = await API.post('/api/ai/improve', { content });
    window._editor.value(res.content_md);
    toast('بهبود یافت ✓', 'success');
  } catch (err) { toast(err.message, 'error'); }
  btn.disabled = false;
  btn.textContent = orig;
};

// ---- Flashcards page (بدون AI — فقط دستی و CSV) ----
Pages.flashcards = async function() {
  document.getElementById('app').innerHTML = layout(`
    <div class="flex items-center justify-between mb-6 mt-8 md:mt-0 flex-wrap gap-3">
      <div>
        <h1 class="text-xl md:text-2xl font-bold">فلش‌کارت‌ها</h1>
        <p class="text-slate-500 text-sm">مدیریت و مرور فلش‌کارت‌ها</p>
      </div>
      <div class="flex gap-2">
        <button onclick="addFlashcardModal()" class="inline-flex items-center gap-2 px-3 md:px-4 py-2 md:py-2.5 bg-brand-600 text-white rounded-xl hover:bg-brand-700 text-sm">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
          <span class="hidden md:inline">کارت جدید</span>
        </button>
        <button onclick="importCSV()" class="inline-flex items-center gap-2 px-3 md:px-4 py-2 md:py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 text-sm">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
          <span class="hidden md:inline">ایمپورت CSV</span>
        </button>
      </div>
    </div>

    <div id="flash-stats" class="stat-card-grid grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">${loadingCards(4)}</div>

    <div class="bg-white dark:bg-slate-800 rounded-2xl p-3 md:p-4 mb-4 border border-slate-100 dark:border-slate-700">
      <div class="flex flex-wrap items-center gap-3">
        <input type="text" id="fc-search" placeholder="جستجو..." class="flex-1 min-w-[150px] px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500">
        <button onclick="exportFlashcards()" class="px-3 py-2 text-sm bg-slate-100 dark:bg-slate-700 rounded-lg">خروجی CSV</button>
      </div>
    </div>

    <div id="flash-list" class="space-y-2">${loadingCards(5)}</div>
  `);

  let currentPage = 1;
  let search = '';

  async function loadList() {
    try {
      const params = new URLSearchParams({ page: currentPage, limit: 50 });
      if (search) params.set('q', search);
      const [stats, data] = await Promise.all([
        API.get('/api/flashcards/stats/overview'),
        API.get(`/api/flashcards?${params}`),
      ]);
      document.getElementById('flash-stats').innerHTML = `
        ${statCard('کل کارت‌ها', stats.total, 'card', 'text-brand-600 bg-brand-50')}
        ${statCard('آماده مرور', stats.due, 'clock', 'text-orange-600 bg-orange-50')}
        ${statCard('یاد گرفته شده', stats.learned, 'check', 'text-emerald-600 bg-emerald-50')}
        ${statCard('مرور شده', stats.reviewed, 'eye', 'text-purple-600 bg-purple-50')}
      `;
      const list = document.getElementById('flash-list');
      if (!data.flashcards?.length) {
        list.innerHTML = `<div class="text-center py-12 text-slate-400">
          <p>هنوز فلش‌کارتی نساخته‌اید.</p>
          <p class="text-xs mt-1">با ایمپورت CSV یا ساخت دستی شروع کنید.</p>
        </div>`;
        return;
      }
      list.innerHTML = data.flashcards.map(c => `
        <div class="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-100 dark:border-slate-700 hover:shadow-sm transition-all">
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1 min-w-0">
              <p class="font-medium mb-1">${escapeHtml(c.front)}</p>
              <p class="text-sm text-slate-500 line-clamp-2">${escapeHtml(c.back)}</p>
              <div class="flex items-center gap-2 mt-2">
                <span class="text-[10px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 rounded">${escapeHtml(c.topic_title || 'بدون مبحث')}</span>
                ${c.tags ? `<p class="text-xs text-slate-400">${escapeHtml(c.tags)}</p>` : ''}
              </div>
            </div>
            <div class="flex flex-col items-end gap-2 text-xs flex-shrink-0">
              <span class="px-2 py-0.5 ${c.next_review_at <= new Date().toISOString() ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-500'} rounded">مرور ${c.repetitions >= 3 ? '✓' : new Date(c.next_review_at).toLocaleDateString('fa-IR')}</span>
              <div class="flex items-center gap-2">
                <button onclick="resetCard(${c.id})" class="text-slate-400 hover:text-brand-600">ریست</button>
                <button onclick="deleteFlashcard(${c.id})" class="text-slate-400 hover:text-red-500">حذف</button>
              </div>
            </div>
          </div>
        </div>
      `).join('');
    } catch (err) { toast(err.message, 'error'); }
  }

  document.getElementById('fc-search').addEventListener('input', (e) => {
    clearTimeout(window._searchTimer);
    window._searchTimer = setTimeout(() => { search = e.target.value; currentPage = 1; loadList(); }, 400);
  });

  loadList();
  window._reloadFlashcards = loadList;
};

// ---- Add flashcard (manual) ----
window.addFlashcardModal = function(projectId = null, topicId = null) {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 scale-in';
  modal.innerHTML = `
    <div class="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl modal-mobile-full">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-bold">فلش‌کارت جدید</h3>
        <button onclick="this.closest('.fixed').remove()" class="text-slate-400 hover:text-slate-600">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>
      <form onsubmit="saveFlashcard(event)" class="space-y-4">
        ${(!projectId || !topicId) ? `
        <div>
          <label class="block text-sm font-medium mb-1.5">انتخاب مبحث (الزامی)</label>
          <select name="topic_id" required id="modal-fc-topic-id" class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none">
            <option value="">در حال بارگذاری مباحث...</option>
          </select>
        </div>` : `
        <input type="hidden" name="project_id" value="${projectId}">
        <input type="hidden" name="topic_id" value="${topicId}">
        `}
        <div>
          <label class="block text-sm font-medium mb-1.5">سوال / صورت کارت</label>
          <textarea name="front" required rows="2" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none" placeholder="مثلاً: تعریف نارسایی قلبی؟"></textarea>
        </div>
        <div>
          <label class="block text-sm font-medium mb-1.5">پاسخ</label>
          <textarea name="back" required rows="3" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none" placeholder="ناتوانی قلب در پمپاژ کافی خون..."></textarea>
        </div>
        <div>
          <label class="block text-sm font-medium mb-1.5">تگ‌ها (اختیاری)</label>
          <input type="text" name="tags" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none" placeholder="قلب, نارسایی">
        </div>
        <div class="flex gap-2 pt-2">
          <button type="button" onclick="this.closest('.fixed').remove()" class="flex-1 py-2.5 bg-slate-100 dark:bg-slate-700 rounded-xl">انصراف</button>
          <button type="submit" class="flex-1 py-2.5 bg-brand-600 text-white rounded-xl hover:bg-brand-700">ذخیره</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

  if (!projectId || !topicId) {
    API.get('/api/topics?limit=200').then(data => {
      const select = document.getElementById('modal-fc-topic-id');
      if (select) {
        if (!data.topics?.length) {
          select.innerHTML = '<option value="">ابتدا یک مبحث بسازید</option>';
        } else {
          select.innerHTML = '<option value="">یک مبحث انتخاب کنید...</option>' +
            data.topics.map(t => `<option value="${t.id}" data-project="${t.project_id}">${escapeHtml(t.title)} (${escapeHtml(t.project_title)})</option>`).join('');
        }
      }
    });
  }
};

window.saveFlashcard = async function(e) {
  e.preventDefault();
  const form = e.target;
  const formData = new FormData(form);
  const data = Object.fromEntries(formData);

  // اگر مبحث از لیست انتخاب شده، project_id را از دیتا اتریبیوت بگیر
  const topicSelect = document.getElementById('modal-fc-topic-id');
  if (topicSelect && topicSelect.value) {
    const selectedOption = topicSelect.options[topicSelect.selectedIndex];
    data.project_id = selectedOption.dataset.project;
  }

  try {
    await API.post('/api/flashcards', data);
    toast('فلش‌کارت ساخته شد ✓', 'success');
    form.closest('.fixed').remove();
    if (window._reloadFlashcards) window._reloadFlashcards();
    if (data.topic_id) window.loadTopicFlashcards(data.topic_id);
  } catch (err) { toast(err.message, 'error'); }
};

// ---- Import CSV — FIX: csvText در window scope ----
window._csvText = '';

window.importCSV = function(projectId = null, topicId = null) {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 scale-in';
  modal.innerHTML = `
    <div class="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl modal-mobile-full overflow-y-auto">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-bold">ایمپورت فلش‌کارت (CSV)</h3>
        <button onclick="this.closest('.fixed').remove()" class="text-slate-400 hover:text-slate-600">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>
      <div class="space-y-4">
        ${(!projectId || !topicId) ? `
        <div>
          <label class="block text-sm font-medium mb-1.5">انتخاب مبحث (الزامی)</label>
          <select id="import-fc-topic-id" class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none text-sm">
            <option value="">در حال بارگذاری مباحث...</option>
          </select>
        </div>` : ''}

        <div>
          <label class="block text-sm font-medium mb-1.5 text-brand-600">۱. آپلود فایل یا چسباندن متن</label>
          <div class="space-y-3">
            <input type="file" accept=".csv,text/csv" id="csv-file" class="block w-full text-sm text-slate-500 file:ml-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 cursor-pointer">
            <div class="relative">
              <textarea id="csv-text-area" rows="5" class="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 text-sm font-mono" placeholder="front,back,hint,tags\nسوال ۱,جواب ۱,راهنما,تگ\nسوال ۲,جواب ۲,,تگ"></textarea>
              <div class="absolute top-2 left-2 text-[10px] text-slate-400">CSV Text</div>
            </div>
          </div>
        </div>

        <div class="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3 text-[11px] text-slate-500 leading-relaxed">
          <p class="font-bold mb-1">راهنمای فرمت:</p>
          <p>ستون‌های <b>front</b> و <b>back</b> الزامی هستند.</p>
          <p>ترتیب ستون‌ها: سوال، جواب، راهنما (اختیاری)، برچسب‌ها (اختیاری)</p>
        </div>

        <div id="csv-preview" class="hidden"></div>

        <div class="flex gap-2 pt-2">
          <button type="button" onclick="this.closest('.fixed').remove()" class="flex-1 py-2.5 bg-slate-100 dark:bg-slate-700 rounded-xl text-sm">انصراف</button>
          <button onclick="doImportCSV(${projectId}, ${topicId})" id="csv-import-btn" disabled class="flex-1 py-2.5 bg-brand-600 text-white rounded-xl disabled:opacity-50 text-sm font-bold">شروع ایمپورت</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

  // reset
  window._csvText = '';
  const importBtn = document.getElementById('csv-import-btn');
  const textArea = document.getElementById('csv-text-area');
  const fileInput = document.getElementById('csv-file');

  if (!projectId || !topicId) {
    API.get('/api/topics?limit=200').then(data => {
      const select = document.getElementById('import-fc-topic-id');
      if (select) {
        if (!data.topics?.length) select.innerHTML = '<option value="">ابتدا یک مبحث بسازید</option>';
        else {
          select.innerHTML = '<option value="">یک مبحث انتخاب کنید...</option>' +
            data.topics.map(t => `<option value="${t.id}" data-project="${t.project_id}">${escapeHtml(t.title)}</option>`).join('');
        }
      }
    });
  }

  const updatePreview = (text, source) => {
    window._csvText = text;
    if (!text.trim()) {
      importBtn.disabled = true;
      document.getElementById('csv-preview').classList.add('hidden');
      return;
    }
    const lineCount = text.split('\n').filter(l => l.trim()).length;
    document.getElementById('csv-preview').classList.remove('hidden');
    document.getElementById('csv-preview').innerHTML = `<div class="text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-900/10 p-3 rounded-lg border border-emerald-100 dark:border-emerald-900/20 flex items-center gap-2"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> ${lineCount} ردیف داده شناسایی شد</div>`;
    importBtn.disabled = false;
  };

  textArea.addEventListener('input', (e) => updatePreview(e.target.value, 'text'));

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      textArea.value = event.target.result;
      updatePreview(event.target.result, 'file');
    };
    reader.readAsText(file);
  });
};

window.doImportCSV = async function(passedProjectId = null, passedTopicId = null) {
  let topicId = passedTopicId;
  let projectId = passedProjectId;

  if (!topicId) {
    const select = document.getElementById('import-fc-topic-id');
    topicId = select?.value;
    if (topicId) {
      const selectedOption = select.options[select.selectedIndex];
      projectId = selectedOption.dataset.project;
    }
  }

  if (!topicId) return toast('لطفاً یک مبحث انتخاب کنید', 'error');
  if (!window._csvText.trim()) return toast('محتوای CSV خالی است', 'error');

  const btn = document.getElementById('csv-import-btn');
  if (!btn) return;
  btn.disabled = true;
  btn.innerHTML = '<span class="loader"></span> در حال ایمپورت...';
  try {
    const res = await API.post('/api/flashcards/import-csv', {
      csv_text: window._csvText,
      topic_id: topicId,
      project_id: projectId
    });
    toast(`${res.imported} فلش‌کارت با موفقیت ایمپورت شد ✓`, 'success');
    btn.closest('.fixed').remove();
    if (window._reloadFlashcards) window._reloadFlashcards();
    if (topicId) window.loadTopicFlashcards(topicId);
  } catch (err) {
    toast(err.message, 'error');
    btn.disabled = false;
    btn.innerHTML = 'ایمپورت';
  }
};

window.generateNewTopicAI = async function(e) {
  e.preventDefault();
  const projectId = document.getElementById('ai-project-id').value;
  const title = document.getElementById('ai-topic-title').value.trim();
  if (!projectId) return toast('لطفاً یک پروژه انتخاب کنید', 'error');
  if (!title) return toast('عنوان الزامی است', 'error');

  const btn = document.getElementById('ai-gen-btn');
  const orig = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="loader"></span> در حال تولید مبحث...';

  try {
    // 1. Create a draft topic first
    const resTopic = await API.post('/api/topics', { project_id: projectId, title, status: 'draft' });
    const topicId = resTopic.topic.id;

    // 2. Generate content with AI
    await API.post('/api/ai/generate-topic', { title, topic_id: topicId });

    toast('مبحث با موفقیت تولید شد', 'success');
    navigate(`/topics/${topicId}`);
  } catch (err) {
    toast(err.message, 'error');
    btn.disabled = false;
    btn.innerHTML = orig;
  }
};

window.deleteFlashcard = async function(id, topicId = null) {
  if (!confirm('آیا از حذف این فلش‌کارت اطمینان دارید؟')) return;
  try {
    await API.del(`/api/flashcards/${id}`);
    toast('کارت حذف شد', 'info');
    if (topicId) window.loadTopicFlashcards(topicId);
    else if (window._reloadFlashcards) window._reloadFlashcards();
  } catch (err) { toast(err.message, 'error'); }
};

window.resetCard = async function(id) {
  if (!confirm('پیشرفت مرور این کارت ریست شود؟')) return;
  await API.post(`/api/flashcards/${id}/reset`, {});
  toast('ریست شد', 'info');
  if (window._reloadFlashcards) window._reloadFlashcards();
};

window.exportFlashcards = function() {
  window.location.href = '/api/export/flashcards.csv';
};

// ---- Review page ----
Pages.review = async function() {
  document.getElementById('app').innerHTML = layout(`
    <div class="flex items-center justify-between mb-6 mt-8 md:mt-0">
      <div>
        <h1 class="text-xl md:text-2xl font-bold">مرور فلش‌کارت</h1>
        <p class="text-slate-500 text-sm">بر اساس الگوریتم SM-2</p>
      </div>
    </div>
    <div id="review-area">${loadingCards(1)}</div>
  `);

  try {
    const data = await API.get('/api/review/queue?limit=50');
    if (!data.queue?.length) {
      document.getElementById('review-area').innerHTML = `
        <div class="text-center py-16">
          <div class="w-20 h-20 mx-auto mb-4 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-500">
            <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </div>
          <h3 class="font-bold text-lg mb-1">همه چیز مرور شده! 🎉</h3>
          <p class="text-sm text-slate-500">فلش‌کارت‌های بیشتری بسازید یا بعداً برگردید.</p>
        </div>`;
      return;
    }
    state.reviewQueue = data.queue;
    state.reviewIndex = 0;
    state.reviewSessionId = data.session_id;
    state.reviewCorrect = 0;
    renderReviewCard();
  } catch (err) { toast(err.message, 'error'); }
};

function renderReviewCard() {
  if (state.reviewIndex >= state.reviewQueue.length) {
    const total = state.reviewQueue.length;
    const correct = state.reviewCorrect;
    const accuracy = Math.round((correct / total) * 100);
    document.getElementById('review-area').innerHTML = `
      <div class="text-center py-16 fade-in">
        <div class="w-24 h-24 mx-auto mb-4 bg-gradient-to-br from-emerald-400 to-cyan-500 rounded-full flex items-center justify-center text-white">
          <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
        </div>
        <h2 class="text-2xl font-bold mb-2">آفرین! نشست تمام شد 🎉</h2>
        <div class="grid grid-cols-3 gap-3 md:gap-4 max-w-md mx-auto my-6">
          <div class="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
            <p class="text-2xl md:text-3xl font-bold text-brand-600">${total}</p>
            <p class="text-xs text-slate-400">کل کارت</p>
          </div>
          <div class="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
            <p class="text-2xl md:text-3xl font-bold text-emerald-600">${correct}</p>
            <p class="text-xs text-slate-400">درست</p>
          </div>
          <div class="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
            <p class="text-2xl md:text-3xl font-bold text-purple-600">${accuracy}٪</p>
            <p class="text-xs text-slate-400">دقت</p>
          </div>
        </div>
        <a href="/dashboard" data-link class="inline-block px-6 py-3 bg-brand-600 text-white rounded-xl">بازگشت به داشبورد</a>
      </div>
    `;
    API.post(`/api/review/${state.reviewSessionId}/end`, {}).catch(() => {});
    return;
  }

  const card = state.reviewQueue[state.reviewIndex];
  const total = state.reviewQueue.length;
  const progress = Math.round((state.reviewIndex / total) * 100);

  document.getElementById('review-area').innerHTML = `
    <div class="max-w-2xl mx-auto fade-in">
      <div class="flex items-center justify-between mb-3 text-sm text-slate-500">
        <span>کارت ${state.reviewIndex + 1} از ${total}</span>
        <span>درست: ${state.reviewCorrect}</span>
      </div>
      <div class="h-2 bg-slate-200 dark:bg-slate-700 rounded-full mb-6 overflow-hidden">
        <div class="h-full bg-gradient-to-l from-brand-500 to-cyan-500 transition-all" style="width:${progress}%"></div>
      </div>

      <div class="flip-card" id="review-card" onclick="flipCard()">
        <div class="flip-card-inner relative" style="min-height: 280px;">
          <div class="flip-card-front bg-white dark:bg-slate-800 rounded-2xl p-6 md:p-8 shadow-lg border border-slate-100 dark:border-slate-700 flex flex-col items-center justify-center text-center cursor-pointer" style="min-height:280px;">
            <span class="text-xs text-slate-400 mb-3">سوال</span>
            <p class="text-lg md:text-2xl font-bold mb-4">${escapeHtml(card.front)}</p>
            ${card.hint ? `<details class="text-sm text-slate-500"><summary>راهنما</summary>${escapeHtml(card.hint)}</details>` : ''}
            <span class="text-xs text-brand-600 mt-6 opacity-70">برای دیدن پاسخ کلیک کنید</span>
          </div>
          <div class="flip-card-back bg-gradient-to-br from-brand-500 to-cyan-600 text-white rounded-2xl p-6 md:p-8 shadow-lg flex flex-col items-center justify-center text-center" style="min-height:280px;">
            <span class="text-xs opacity-80 mb-3">پاسخ</span>
            <p class="text-base md:text-xl font-medium">${escapeHtml(card.back)}</p>
          </div>
        </div>
      </div>

      <div id="review-buttons" class="hidden grid grid-cols-4 gap-2 mt-6 fade-in">
        <button onclick="answerCard('again')" class="py-2 md:py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 font-medium text-sm md:text-base">
          <span class="block">دوباره</span>
          <span class="text-xs opacity-80 hidden md:block">&lt; ۱ دقیقه</span>
        </button>
        <button onclick="answerCard('hard')" class="py-2 md:py-3 bg-orange-500 text-white rounded-xl hover:bg-orange-600 font-medium text-sm md:text-base">
          <span class="block">سخت</span>
          <span class="text-xs opacity-80 hidden md:block">۱۰ دقیقه</span>
        </button>
        <button onclick="answerCard('good')" class="py-2 md:py-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 font-medium text-sm md:text-base">
          <span class="block">خوب</span>
          <span class="text-xs opacity-80 hidden md:block">۱ روز</span>
        </button>
        <button onclick="answerCard('easy')" class="py-2 md:py-3 bg-brand-500 text-white rounded-xl hover:bg-brand-600 font-medium text-sm md:text-base">
          <span class="block">آسان</span>
          <span class="text-xs opacity-80 hidden md:block">۴ روز</span>
        </button>
      </div>
    </div>
  `;
}

window.flipCard = function() {
  document.getElementById('review-card').classList.add('flipped');
  document.getElementById('review-buttons').classList.remove('hidden');
};

window.answerCard = async function(button) {
  const card = state.reviewQueue[state.reviewIndex];
  try {
    const res = await API.post(`/api/review/${state.reviewSessionId}/answer`, { card_id: card.id, button });
    if (res.interval_days > 0) state.reviewCorrect++;
  } catch (err) { toast(err.message, 'error'); }
  state.reviewIndex++;
  renderReviewCard();
};

// ---- AI page ----
Pages.ai = async function() {
  document.getElementById('app').innerHTML = layout(`
    <h1 class="text-xl md:text-2xl font-bold mb-1 mt-8 md:mt-0">دستیار هوش مصنوعی</h1>
    <p class="text-slate-500 mb-6 text-sm">تولید محتوای آموزشی با Gemini</p>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      <div class="bg-white dark:bg-slate-800 rounded-2xl p-5 md:p-6 border border-slate-100 dark:border-slate-700 shadow-sm">
        <div class="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-xl flex items-center justify-center mb-4">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
        </div>
        <h3 class="font-bold text-lg mb-2">تولید مبحث جدید</h3>
        <form onsubmit="generateNewTopicAI(event)" class="space-y-3">
          <div>
            <label class="block text-xs text-slate-400 mb-1">انتخاب پروژه</label>
            <select id="ai-project-id" required class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg outline-none focus:ring-2 focus:ring-brand-500 text-sm">
              <option value="">در حال بارگذاری پروژه‌ها...</option>
            </select>
          </div>
          <div>
            <label class="block text-xs text-slate-400 mb-1">عنوان مبحث</label>
            <input type="text" id="ai-topic-title" required placeholder="مثلاً: علائم دیابت نوع ۲" class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg outline-none focus:ring-2 focus:ring-brand-500 text-sm">
          </div>
          <button type="submit" id="ai-gen-btn" class="w-full py-2.5 bg-gradient-to-l from-purple-600 to-pink-600 text-white font-medium rounded-lg hover:shadow-lg transition-all text-sm">تولید با هوش مصنوعی</button>
        </form>
      </div>

      <div class="space-y-4">
        <a href="/settings" data-link class="flex items-center gap-4 p-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 hover:shadow-md transition-all">
          <div class="w-12 h-12 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
          </div>
          <div>
            <h3 class="font-bold">تنظیم پرامپت‌ها</h3>
            <p class="text-xs text-slate-400">سفارشی‌سازی نحوه پاسخگویی AI</p>
          </div>
        </a>

        <div class="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700">
          <h2 class="font-bold mb-4 text-sm">آخرین فعالیت‌ها</h2>
          <div id="ai-logs" class="space-y-3">${loadingCards(3)}</div>
        </div>
      </div>
    </div>
  `);

  // Load projects
  API.get('/api/projects').then(data => {
    const select = document.getElementById('ai-project-id');
    if (!select) return;
    if (!data.projects?.length) {
      select.innerHTML = '<option value="">ابتدا یک پروژه بسازید</option>';
      return;
    }
    select.innerHTML = data.projects.map(p => `<option value="${p.id}">${escapeHtml(p.title)}</option>`).join('');
  }).catch(() => {});

  API.get('/api/ai/logs?limit=5').then(data => {
    document.getElementById('ai-logs').innerHTML = data.logs?.length ? data.logs.map(l => `
      <div class="py-2 border-b border-slate-100 dark:border-slate-700 last:border-0 flex items-center justify-between gap-3">
        <div class="flex-1 min-w-0">
          <p class="text-sm truncate">${escapeHtml(l.prompt?.slice(0, 80) || '')}...</p>
          <p class="text-xs text-slate-400">${new Date(l.created_at).toLocaleString('fa-IR')}</p>
        </div>
        <span class="text-xs px-2 py-1 ${l.status === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'} rounded flex-shrink-0">${l.status === 'success' ? '✓' : '✗'}</span>
      </div>
    `).join('') : '<p class="text-sm text-slate-400 text-center py-4">هنوز لاگی ثبت نشده.</p>';
  }).catch(() => {});
};

// ---- Calendar page ----
Pages.calendar = async function() {
  const now = moment();
  let currentMonth = now.format('jYYYY/jMM');

  document.getElementById('app').innerHTML = layout(`
    <div class="flex items-center justify-between mb-6 mt-8 md:mt-0">
      <div>
        <h1 class="text-xl md:text-2xl font-bold">تقویم و تسک‌ها</h1>
        <p class="text-slate-500 text-sm">مدیریت برنامه‌ریزی روزانه</p>
      </div>
      <button onclick="openAddTaskModal()" class="px-4 py-2 bg-brand-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-brand-500/20">تسک جدید</button>
    </div>

    <div class="bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden">
      <div class="p-6 bg-gradient-to-br from-brand-600 to-cyan-600 text-white flex items-center justify-between">
        <button onclick="changeMonth(-1)" class="p-2 hover:bg-white/20 rounded-full transition-colors"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg></button>
        <h2 id="calendar-month-year" class="text-xl font-bold">...</h2>
        <button onclick="changeMonth(1)" class="p-2 hover:bg-white/20 rounded-full transition-colors"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg></button>
      </div>
      <div class="grid grid-cols-7 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
        ${['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'].map(d => `<div class="py-3 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">${d}</div>`).join('')}
      </div>
      <div id="calendar-grid" class="grid grid-cols-7 gap-px bg-slate-100 dark:bg-slate-700">
        <!-- days -->
      </div>
    </div>

    <div id="selected-day-tasks" class="mt-8 space-y-4">
      <!-- tasks -->
    </div>
  `);

  async function renderCalendar(monthStr) {
    const grid = document.getElementById('calendar-grid');
    const header = document.getElementById('calendar-month-year');
    grid.innerHTML = '';

    const [year, month] = monthStr.split('/').map(Number);
    header.textContent = moment(monthStr, 'jYYYY/jMM').format('jMMMM jYYYY');

    // First day of month
    const startOfMonth = moment(monthStr + '/01', 'jYYYY/jMM/jDD');
    const daysInMonth = startOfMonth.jDaysInMonth();
    let startDayOfWeek = startOfMonth.day(); // 0 (Sun) to 6 (Sat)
    // Convert to Persian week (Sat is start)
    startDayOfWeek = (startDayOfWeek + 1) % 7;

    // Padding for prev month
    for (let i = 0; i < startDayOfWeek; i++) {
      grid.innerHTML += `<div class="bg-white dark:bg-slate-800 min-h-[100px] p-2 opacity-30"></div>`;
    }

    // Load tasks for this month
    const gregorianMonth = startOfMonth.format('YYYY-MM');
    const { tasks } = await API.get(`/api/tasks?month=${gregorianMonth}`);
    const taskMap = {};
    tasks.forEach(t => {
      const d = moment(t.task_date, 'YYYY-MM-DD').format('jD');
      if (!taskMap[d]) taskMap[d] = [];
      taskMap[d].push(t);
    });

    for (let d = 1; d <= daysInMonth; d++) {
      const dayStr = `${year}/${String(month).padStart(2, '0')}/${String(d).padStart(2, '0')}`;
      const isToday = moment().format('jYYYY/jMM/jDD') === dayStr;
      const dayTasks = taskMap[d] || [];

      const dayEl = document.createElement('div');
      dayEl.className = `bg-white dark:bg-slate-800 min-h-[100px] p-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border-r border-b border-slate-100 dark:border-slate-700 ${isToday ? 'ring-2 ring-inset ring-brand-500 bg-brand-50/30' : ''}`;
      dayEl.onclick = () => showDayTasks(dayStr, dayTasks);
      dayEl.innerHTML = `
        <div class="flex items-center justify-between mb-1">
          <span class="text-sm font-bold ${isToday ? 'text-brand-600' : 'text-slate-600 dark:text-slate-300'}">${d}</span>
          ${dayTasks.length ? `<span class="w-2 h-2 rounded-full bg-brand-500"></span>` : ''}
        </div>
        <div class="space-y-1">
          ${dayTasks.slice(0, 2).map(t => `<div class="text-[10px] truncate px-1 rounded ${t.status === 'completed' ? 'bg-emerald-100 text-emerald-700 line-through' : 'bg-brand-100 text-brand-700'}">${escapeHtml(t.title)}</div>`).join('')}
          ${dayTasks.length > 2 ? `<div class="text-[10px] text-slate-400 text-center">+${dayTasks.length - 2} مورد</div>` : ''}
        </div>
      `;
      grid.appendChild(dayEl);
    }
  }

  window.changeMonth = (dir) => {
    const m = moment(currentMonth, 'jYYYY/jMM').add(dir, 'jMonth');
    currentMonth = m.format('jYYYY/jMM');
    renderCalendar(currentMonth);
  };

  window.showDayTasks = (jalaliDate, tasks) => {
    const container = document.getElementById('selected-day-tasks');
    const gregDate = moment(jalaliDate, 'jYYYY/jMM/jDD').format('YYYY-MM-DD');

    container.innerHTML = `
      <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
        <h3 class="font-bold text-lg">تسک‌های ${jalaliDate}</h3>
        <button onclick="openAddTaskModal('${gregDate}')" class="text-sm text-brand-600 font-bold">+ افزودن</button>
      </div>
      ${tasks.length ? tasks.map(t => `
        <div class="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 flex items-center justify-between shadow-sm group">
          <div class="flex items-center gap-3">
            <input type="checkbox" ${t.status === 'completed' ? 'checked' : ''} onchange="toggleTask(${t.id}, this.checked)" class="w-5 h-5 rounded-lg border-slate-300 text-brand-600 focus:ring-brand-500 transition-all">
            <div class="${t.status === 'completed' ? 'opacity-50 line-through' : ''}">
              <p class="font-bold text-sm">${escapeHtml(t.title)}</p>
              ${t.description ? `<p class="text-xs text-slate-500">${escapeHtml(t.description)}</p>` : ''}
            </div>
          </div>
          <button onclick="deleteTask(${t.id}, '${jalaliDate}')" class="p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </button>
        </div>
      `).join('') : '<p class="text-center py-8 text-slate-400">هیچ تسکی برای این روز ثبت نشده است.</p>'}
    `;
  };

  window.openAddTaskModal = (date = moment().format('YYYY-MM-DD')) => {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 scale-in';
    modal.innerHTML = `
      <div class="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl">
        <h3 class="text-lg font-bold mb-4">افزودن تسک جدید</h3>
        <form onsubmit="saveTask(event)" class="space-y-4">
          <input type="hidden" name="task_date" value="${date}">
          <div>
            <label class="block text-sm font-medium mb-1.5">عنوان</label>
            <input type="text" name="title" required autofocus class="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500">
          </div>
          <div>
            <label class="block text-sm font-medium mb-1.5">توضیحات</label>
            <textarea name="description" rows="2" class="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"></textarea>
          </div>
          <div class="flex gap-3 pt-2">
            <button type="button" onclick="this.closest('.fixed').remove()" class="flex-1 py-3 bg-slate-100 dark:bg-slate-700 rounded-xl font-bold">انصراف</button>
            <button type="submit" class="flex-1 py-3 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700">ذخیره تسک</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(modal);
  };

  window.saveTask = async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    try {
      await API.post('/api/tasks', data);
      toast('تسک اضافه شد', 'success');
      e.target.closest('.fixed').remove();
      renderCalendar(currentMonth);
      const jalali = moment(data.task_date, 'YYYY-MM-DD').format('jYYYY/jMM/jDD');
      // Update the day tasks view
      const { tasks } = await API.get(`/api/tasks?date=${data.task_date}`);
      showDayTasks(jalali, tasks);
    } catch (err) { toast(err.message, 'error'); }
  };

  window.toggleTask = async (id, completed) => {
    try {
      await API.patch(`/api/tasks/${id}`, { status: completed ? 'completed' : 'pending' });
      renderCalendar(currentMonth);
    } catch (err) { toast(err.message, 'error'); }
  };

  window.deleteTask = async (id, jalaliDate) => {
    if (!confirm('حذف شود؟')) return;
    try {
      await API.del(`/api/tasks/${id}`);
      renderCalendar(currentMonth);
      const gregDate = moment(jalaliDate, 'jYYYY/jMM/jDD').format('YYYY-MM-DD');
      const { tasks } = await API.get(`/api/tasks?date=${gregDate}`);
      showDayTasks(jalaliDate, tasks);
    } catch (err) { toast(err.message, 'error'); }
  };

  renderCalendar(currentMonth);
};

// ---- Settings page ----
Pages.settings = async function() {
  document.getElementById('app').innerHTML = layout(`
    <h1 class="text-xl md:text-2xl font-bold mb-1 mt-8 md:mt-0">تنظیمات</h1>
    <p class="text-slate-500 mb-6 text-sm">پیکربندی اپلیکیشن</p>

    <div class="space-y-6 max-w-2xl">
      <div class="bg-white dark:bg-slate-800 rounded-2xl p-5 md:p-6 border border-slate-100 dark:border-slate-700">
        <h2 class="font-bold mb-4">اطلاعات سایت</h2>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-1.5">عنوان سایت</label>
            <input type="text" id="set-title" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500">
          </div>
          <div>
            <label class="block text-sm font-medium mb-1.5">توضیحات</label>
            <input type="text" id="set-desc" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500">
          </div>
        </div>
      </div>

      <div class="bg-white dark:bg-slate-800 rounded-2xl p-5 md:p-6 border border-slate-100 dark:border-slate-700">
        <h2 class="font-bold mb-4">تنظیمات Gemini AI</h2>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-1.5">کلید API رایگان</label>
            <input type="text" id="set-gemini" placeholder="AIza..." class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 font-mono text-sm" dir="ltr">
            <p class="text-xs text-slate-400 mt-1">از <a href="https://aistudio.google.com/apikey" target="_blank" class="text-brand-600">Google AI Studio</a> رایگان بگیرید.</p>
          </div>
        </div>
      </div>

      <div class="bg-white dark:bg-slate-800 rounded-2xl p-5 md:p-6 border border-slate-100 dark:border-slate-700">
        <h2 class="font-bold mb-4">پرامپت‌های قابل تنظیم AI</h2>
        <p class="text-xs text-slate-500 mb-4">متغیرها: <code dir="ltr">{{title}}</code>، <code dir="ltr">{{content}}</code>، <code dir="ltr">{{project_context}}</code></p>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-1.5">System Prompt</label>
            <textarea id="set-prompt-system" rows="2" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 text-sm" dir="rtl"></textarea>
          </div>
          <div>
            <label class="block text-sm font-medium mb-1.5">پرامپت تولید مبحث</label>
            <textarea id="set-prompt-topic" rows="8" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 text-sm font-mono" dir="rtl"></textarea>
          </div>
          <div>
            <label class="block text-sm font-medium mb-1.5">پرامپت بهبود متن</label>
            <textarea id="set-prompt-improve" rows="4" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 text-sm font-mono" dir="rtl"></textarea>
          </div>
          <div>
            <label class="block text-sm font-medium mb-1.5">پرامپت خلاصه‌سازی</label>
            <textarea id="set-prompt-summarize" rows="4" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 text-sm font-mono" dir="rtl"></textarea>
          </div>
        </div>
      </div>

      <div class="bg-white dark:bg-slate-800 rounded-2xl p-5 md:p-6 border border-slate-100 dark:border-slate-700">
        <h2 class="font-bold mb-4">تنظیمات تلگرام</h2>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-1.5">توکن ربات</label>
            <input type="text" id="set-tg-token" placeholder="123456:ABC-..." class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 font-mono text-sm" dir="ltr">
          </div>
          <div>
            <label class="block text-sm font-medium mb-1.5">شناسه کانال</label>
            <input type="text" id="set-tg-channel" placeholder="@channel_username یا -1001234567890" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 font-mono text-sm" dir="ltr">
            <p class="text-xs text-slate-400 mt-1">ربات باید ادمین کانال باشد.</p>
          </div>
          <div>
            <label class="block text-sm font-medium mb-1.5">ساعت ارسال روزانه (UTC)</label>
            <input type="number" id="set-tg-hour" min="0" max="23" class="w-24 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500">
          </div>

          <div class="border-t border-slate-100 dark:border-slate-700 pt-4 mt-4">
            <h3 class="font-medium mb-2 text-sm">کنترل از تلگرام (Webhook)</h3>
            <p class="text-xs text-slate-500 mb-3">با فعال کردن webhook می‌توانید با دستورات تلگرام (مثل <code>/new</code>، <code>/list</code>، <code>/publish</code>) محتوا را مدیریت کنید.</p>
            <div id="webhook-status" class="text-xs mb-3"></div>
            <div class="flex flex-wrap gap-2">
              <button onclick="setupWebhook()" class="px-3 py-2 bg-brand-600 text-white rounded-lg text-sm hover:bg-brand-700">فعال‌سازی Webhook</button>
              <button onclick="checkWebhook()" class="px-3 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-sm hover:bg-slate-200">بررسی وضعیت</button>
              <button onclick="deleteWebhook()" class="px-3 py-2 bg-red-100 text-red-600 rounded-lg text-sm hover:bg-red-200">حذف Webhook</button>
              <button onclick="testTelegram()" class="px-3 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-sm hover:bg-slate-200">تست کانال</button>
            </div>
          </div>
        </div>
      </div>

      <div class="bg-white dark:bg-slate-800 rounded-2xl p-5 md:p-6 border border-slate-100 dark:border-slate-700">
        <h2 class="font-bold mb-4">پروفایل</h2>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-1.5">نام نمایشی</label>
            <input type="text" id="set-display-name" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500">
          </div>
          <div>
            <label class="block text-sm font-medium mb-1.5">ایمیل</label>
            <input type="email" id="set-email" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500" dir="ltr">
          </div>
        </div>
      </div>

      <div class="bg-white dark:bg-slate-800 rounded-2xl p-5 md:p-6 border border-slate-100 dark:border-slate-700">
        <h2 class="font-bold mb-4">پشتیبان‌گیری</h2>
        <div class="flex gap-3 flex-wrap">
          <button onclick="window.location.href='/api/export/backup.json'" class="px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-sm hover:bg-slate-200">دانلود فایل پشتیبان (JSON)</button>
        </div>
      </div>

      <div class="flex gap-3 sticky bottom-4">
        <button onclick="saveSettings()" class="flex-1 py-3 bg-brand-600 text-white rounded-xl hover:bg-brand-700 font-medium shadow-lg">ذخیره تنظیمات</button>
      </div>
    </div>
  `);

  try {
    const s = await API.get('/api/settings');
    document.getElementById('set-title').value = s.settings.site_title || '';
    document.getElementById('set-desc').value = s.settings.site_description || '';
    document.getElementById('set-gemini').value = s.settings.gemini_api_key || '';
    document.getElementById('set-gemini').dataset.has = s.settings.has_gemini_key ? '1' : '';
    document.getElementById('set-tg-token').value = s.settings.telegram_bot_token || '';
    document.getElementById('set-tg-token').dataset.has = s.settings.has_telegram_token ? '1' : '';
    document.getElementById('set-tg-channel').value = s.settings.telegram_channel_id || '';
    document.getElementById('set-tg-hour').value = s.settings.telegram_daily_hour || '9';
    document.getElementById('set-prompt-system').value = s.settings.system_prompt || '';
    document.getElementById('set-prompt-topic').value = s.settings.prompt_generate_topic || '';
    document.getElementById('set-prompt-improve').value = s.settings.prompt_improve || '';
    document.getElementById('set-prompt-summarize').value = s.settings.prompt_summarize || '';
    document.getElementById('set-display-name').value = state.user?.display_name || '';
    document.getElementById('set-email').value = state.user?.email || '';

    // بررسی وضعیت webhook
    checkWebhook();
  } catch (err) { toast(err.message, 'error'); }
};

window.saveSettings = async function() {
  const data = {
    site_title: document.getElementById('set-title').value,
    site_description: document.getElementById('set-desc').value,
    telegram_channel_id: document.getElementById('set-tg-channel').value,
    telegram_daily_hour: document.getElementById('set-tg-hour').value,
    system_prompt: document.getElementById('set-prompt-system').value,
    prompt_generate_topic: document.getElementById('set-prompt-topic').value,
    prompt_improve: document.getElementById('set-prompt-improve').value,
    prompt_summarize: document.getElementById('set-prompt-summarize').value,
  };
  const gemini = document.getElementById('set-gemini').value;
  if (gemini && !gemini.includes('••')) data.gemini_api_key = gemini;
  const tg = document.getElementById('set-tg-token').value;
  if (tg && !tg.includes('••')) data.telegram_bot_token = tg;

  try {
    await API.put('/api/settings', data);

    const dn = document.getElementById('set-display-name').value;
    const em = document.getElementById('set-email').value;
    if (dn !== state.user.display_name || em !== state.user.email) {
      await API.put('/api/auth/me', { display_name: dn, email: em });
      state.user.display_name = dn;
      state.user.email = em;
    }
    toast('تنظیمات ذخیره شد ✓', 'success');
  } catch (err) { toast(err.message, 'error'); }
};

window.testTelegram = async function() {
  try {
    const res = await API.post('/api/settings/test-telegram', {});
    if (res.ok) toast('پیام تست ارسال شد ✓', 'success');
    else toast('خطا: ' + (res.error || 'نامشخص'), 'error');
  } catch (err) { toast(err.message, 'error'); }
};

window.setupWebhook = async function() {
  try {
    const res = await API.post('/api/settings/telegram/setup-webhook', {});
    if (res.ok) {
      toast('Webhook فعال شد ✓', 'success');
      checkWebhook();
    } else {
      toast('خطا: ' + (res.description || 'نامشخص'), 'error');
    }
  } catch (err) { toast(err.message, 'error'); }
};

window.deleteWebhook = async function() {
  if (!confirm('Webhook حذف شود؟')) return;
  try {
    const res = await API.post('/api/settings/telegram/delete-webhook', {});
    if (res.ok) {
      toast('Webhook حذف شد', 'info');
      checkWebhook();
    } else {
      toast('خطا: ' + (res.description || 'نامشخص'), 'error');
    }
  } catch (err) { toast(err.message, 'error'); }
};

window.checkWebhook = async function() {
  const statusEl = document.getElementById('webhook-status');
  if (!statusEl) return;
  try {
    const res = await API.get('/api/settings/telegram/webhook-status');
    if (res.ok && res.webhook) {
      const w = res.webhook;
      const url = w.url || '(تنظیم نشده)';
      const pending = w.pending_update_count || 0;
      const lastError = w.last_error_message;
      statusEl.innerHTML = `
        <div class="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg space-y-1">
          <p>📍 URL: <code dir="ltr" class="text-xs">${escapeHtml(url)}</code></p>
          <p>📨 Pending updates: <b>${pending}</b></p>
          ${lastError ? `<p class="text-red-500">⚠️ خطا: ${escapeHtml(lastError)}</p>` : '<p class="text-emerald-600">✓ بدون خطا</p>'}
        </div>
      `;
    } else {
      statusEl.innerHTML = `<p class="text-slate-400">ابتدا توکن ربات را ذخیره کنید.</p>`;
    }
  } catch (err) {
    statusEl.innerHTML = `<p class="text-red-500">خطا در دریافت وضعیت</p>`;
  }
};

// ---- initial route ----
router().then(() => {
  applySidebarState();
});
