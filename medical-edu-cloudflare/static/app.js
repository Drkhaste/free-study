/* ============================================================
   Medical Education Platform — SPA logic (vanilla JS)
   Routes, components, state management, API client
   ============================================================ */

// ---- API client ----
const API = {
  async request(method, path, body = null) {
    const opts = { method, headers: {}, credentials: 'same-origin' };
    if (body) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
    const res = await fetch(path, opts);
    if (res.status === 401 && !path.includes('/auth/')) {
      // redirect to login
      window.location.href = '/login';
      return null;
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
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

// ---- router ----
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
];

async function router() {
  const path = window.location.pathname;
  // check auth first
  if (!state.user) {
    try {
      const data = await API.get('/api/auth/me');
      state.user = data.user;
    } catch { state.user = null; }
  }

  // اگه لاگین نکرده و در صفحه لاگین نیست → بره به لاگین
  // به جز صفحات عمومی مثل /blog که به طور مستقیم رندر میشن
  if (!state.user && path !== '/login' && !path.startsWith('/blog')) {
    window.location.href = '/login';
    return;
  }
  // اگه لاگین کرده و در صفحه لاگینه → بره داشبورد
  if (state.user && path === '/login') {
    window.location.href = '/dashboard';
    return;
  }

  for (const r of routes) {
    const m = path.match(r.pattern);
    if (m) {
      await r.handler(m);
      return;
    }
  }
  // 404
  document.getElementById('app').innerHTML = `<div class="min-h-screen flex items-center justify-center text-slate-500">صفحه یافت نشد</div>`;
}

window.addEventListener('popstate', router);

function navigate(path) {
  window.history.pushState({}, '', path);
  router();
  // close mobile sidebar
  document.querySelector('.sidebar')?.classList.remove('open');
  window.scrollTo(0, 0);
}

window.navigate = navigate;

// ---- layout ----
function layout(content) {
  const isAdmin = state.user?.role === 'admin';
  const initial = state.user?.display_name?.[0] || state.user?.username?.[0] || 'U';
  return `
    <div class="flex min-h-screen">
      <!-- Sidebar -->
      <aside class="sidebar w-64 bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 fixed top-0 right-0 bottom-0 z-30 flex flex-col">
        <div class="p-5 border-b border-slate-100 dark:border-slate-700">
          <a href="/dashboard" class="flex items-center gap-3" data-link>
            <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-cyan-500 flex items-center justify-center text-white font-bold text-xl">پ</div>
            <div>
              <h1 class="font-bold text-sm">آکادمی پزشکی</h1>
              <p class="text-xs text-slate-400">داشبورد</p>
            </div>
          </a>
        </div>
        <nav class="flex-1 p-3 space-y-1 overflow-y-auto">
          ${sidebarLink('/dashboard', 'داشبورد', 'home', 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6')}
          ${sidebarLink('/projects', 'پروژه‌ها', 'folder', 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z')}
          ${sidebarLink('/flashcards', 'فلش‌کارت‌ها', 'card', 'M7 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2h-2M7 3v4h10V3M7 3h10')}
          ${sidebarLink('/review', 'مرور امروز', 'brain', 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z')}
          ${sidebarLink('/ai', 'دستیار هوش مصنوعی', 'sparkles', 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z')}
          ${sidebarLink('/blog', 'وبلاگ', 'book', 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253')}
          ${isAdmin ? sidebarLink('/settings', 'تنظیمات', 'cog', 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z') : ''}
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

      <!-- mobile menu button -->
      <button onclick="document.querySelector('.sidebar').classList.toggle('open')" class="md:hidden fixed top-4 right-4 z-50 w-10 h-10 bg-white dark:bg-slate-800 rounded-lg shadow-md flex items-center justify-center">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
      </button>

      <!-- overlay when sidebar open on mobile -->
      <div onclick="document.querySelector('.sidebar').classList.remove('open')" class="md:hidden fixed inset-0 bg-black/50 z-20 hidden"></div>

      <!-- Main content -->
      <main class="flex-1 md:mr-64 min-h-screen">
        <div id="page-content" class="p-4 md:p-8 max-w-7xl mx-auto fade-in">
          ${content}
        </div>
      </main>
    </div>
  `;
}

function sidebarLink(href, label, icon, path) {
  const active = window.location.pathname === href ? 'active' : '';
  return `<a href="${href}" data-link class="sidebar-link ${active} flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">
    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${path}"/></svg>
    ${label}
  </a>`;
}

function escapeHtml(s) { return String(s || '').replace(/[&<>"']/g, ch => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[ch])); }

// capture all internal link clicks
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
          <ul class="flex border-b border-slate-100 mb-6 -mx-8 px-8">
            <li class="flex-1">
              <button onclick="showLoginTab('login')" id="tab-login" class="w-full pb-3 text-sm font-medium border-b-2 border-brand-500 text-brand-600">ورود</button>
            </li>
            <li class="flex-1">
              <button onclick="showLoginTab('register')" id="tab-register" class="w-full pb-3 text-sm font-medium border-b-2 border-transparent text-slate-500">ثبت نام</button>
            </li>
          </ul>

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
    <h1 class="text-2xl font-bold mb-1">سلام، ${escapeHtml(state.user?.display_name || state.user?.username || '')} 👋</h1>
    <p class="text-slate-500 mb-6">خلاصه‌ای از پیشرفت شما</p>

    <div id="dash-stats" class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      ${loadingCards(4)}
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <div class="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
        <div class="flex items-center justify-between mb-4">
          <h2 class="font-bold">پروژه‌های اخیر</h2>
          <a href="/projects" data-link class="text-sm text-brand-600 hover:underline">همه</a>
        </div>
        <div id="dash-projects" class="space-y-2">${loadingCards(3)}</div>
      </div>
      <div class="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
        <div class="flex items-center justify-between mb-4">
          <h2 class="font-bold">کار‌های امروز</h2>
          <a href="/review" data-link class="text-sm text-brand-600 hover:underline">شروع مرور</a>
        </div>
        <div id="dash-today" class="space-y-2">${loadingCards(2)}</div>
      </div>
    </div>

    <div class="bg-gradient-to-l from-brand-600 to-cyan-600 rounded-2xl p-6 text-white shadow-lg shadow-brand-500/30">
      <div class="flex items-start gap-4">
        <div class="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/></svg>
        </div>
        <div class="flex-1">
          <h3 class="font-bold text-lg mb-1">دستیار هوش مصنوعی</h3>
          <p class="text-white/80 text-sm mb-3">با Gemini Google می‌تونی سریعاً محتوای آموزشی و فلش‌کارت تولید کنی.</p>
          <a href="/ai" data-link class="inline-flex items-center gap-2 px-4 py-2 bg-white text-brand-600 rounded-lg text-sm font-medium hover:bg-brand-50 transition-colors">
            شروع کنید
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7"/></svg>
          </a>
        </div>
      </div>
    </div>
  `);

  // load data
  try {
    const [projects, cards] = await Promise.all([
      API.get('/api/projects'),
      API.get('/api/flashcards/stats/overview'),
    ]);

    // stats
    document.getElementById('dash-stats').innerHTML = `
      ${statCard('پروژه‌ها', projects.projects?.length || 0, 'folder', 'text-brand-600 bg-brand-50')}
      ${statCard('فلش‌کارت‌ها', cards.total || 0, 'card', 'text-cyan-600 bg-cyan-50')}
      ${statCard('آماده مرور', cards.due || 0, 'clock', 'text-orange-600 bg-orange-50')}
      ${statCard('یاد گرفته شده', cards.learned || 0, 'check', 'text-emerald-600 bg-emerald-50')}
    `;

    // projects
    const projList = (projects.projects || []).slice(0, 4);
    document.getElementById('dash-projects').innerHTML = projList.length ? projList.map(p => `
      <a href="/projects/${p.id}" data-link class="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
        <div class="w-10 h-10 rounded-lg flex items-center justify-center text-white" style="background-color:${p.color}">${escapeHtml(p.title[0] || '?')}</div>
        <div class="flex-1 min-w-0">
          <p class="font-medium truncate">${escapeHtml(p.title)}</p>
          <p class="text-xs text-slate-400">${p.topic_count || 0} مبحث • ${p.flashcard_count || 0} فلش‌کارت</p>
        </div>
      </a>
    `).join('') : `<p class="text-sm text-slate-400 text-center py-6">هنوز پروژه‌ای نساخته‌اید.</p>`;

    // today's tasks
    document.getElementById('dash-today').innerHTML = `
      <a href="/review" data-link class="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
        <div class="w-10 h-10 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        </div>
        <div class="flex-1">
          <p class="font-medium">${cards.due || 0} فلش‌کارت برای مرور</p>
          <p class="text-xs text-slate-400">بر اساس الگوریتم SM-2</p>
        </div>
      </a>
      <a href="/ai" data-link class="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
        <div class="w-10 h-10 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/></svg>
        </div>
        <div class="flex-1">
          <p class="font-medium">تولید محتوای آموزشی</p>
          <p class="text-xs text-slate-400">با هوش مصنوعی Gemini</p>
        </div>
      </a>
    `;
  } catch (err) {
    toast(err.message, 'error');
  }
};

function loadingCards(n) { return Array(n).fill(0).map(() => `<div class="bg-slate-100 dark:bg-slate-700/50 animate-pulse h-20 rounded-xl"></div>`).join(''); }

function statCard(label, value, icon, colorClass) {
  const icons = {
    folder: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z',
    card: 'M7 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2h-2M7 3v4h10V3M7 3h10',
    clock: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
    check: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  };
  return `<div class="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700">
    <div class="flex items-center justify-between">
      <div>
        <p class="text-sm text-slate-500">${label}</p>
        <p class="text-2xl font-bold mt-1">${value}</p>
      </div>
      <div class="w-12 h-12 rounded-xl ${colorClass} flex items-center justify-center">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${icons[icon] || icons.folder}"/></svg>
      </div>
    </div>
  </div>`;
}

// ---- Projects page ----
Pages.projects = async function() {
  document.getElementById('app').innerHTML = layout(`
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold">پروژه‌ها</h1>
        <p class="text-slate-500 text-sm">پروژه‌های آموزشی خود را مدیریت کنید</p>
      </div>
      <button onclick="openProjectModal()" class="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-colors shadow-md shadow-brand-500/30">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
        پروژه جدید
      </button>
    </div>
    <div id="projects-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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

window.openProjectModal = function(project = null) {
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#ef4444', '#14b8a6'];
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 scale-in';
  modal.innerHTML = `
    <div class="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
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
      <button onclick="openTopicModal(${id})" class="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-xl text-sm hover:bg-brand-700">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
        مبحث جدید
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
      <div class="flex items-center gap-4">
        <a href="/projects" data-link class="text-slate-400 hover:text-brand-600">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
        </a>
        <div class="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg" style="background-color:${proj.project.color}">${escapeHtml(proj.project.title[0] || '?')}</div>
        <div class="flex-1">
          <h1 class="text-2xl font-bold">${escapeHtml(proj.project.title)}</h1>
          <p class="text-sm text-slate-500">${escapeHtml(proj.project.description || '')}</p>
        </div>
        <button onclick='openProjectModal(${JSON.stringify(proj.project).replace(/'/g, "&#39;")})' class="px-3 py-1.5 text-sm bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200">ویرایش</button>
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
        <div class="flex items-center justify-between">
          <h3 class="font-bold flex-1">${escapeHtml(t.title)}</h3>
          ${statusBadge(t.status)}
        </div>
        <p class="text-sm text-slate-500 mt-1 line-clamp-1">${escapeHtml(t.excerpt || 'بدون محتوا')}</p>
        <div class="flex items-center gap-3 mt-2 text-xs text-slate-400">
          ${t.tags ? `<span>${escapeHtml(t.tags)}</span>` : ''}
          <span>${t.reading_time_min} دقیقه</span>
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
  return `<span class="text-xs px-2 py-1 rounded-md ${s.cls}">${s.label}</span>`;
}

window.openTopicModal = function(projectId, topic = null) {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 scale-in';
  modal.innerHTML = `
    <div class="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
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

// ---- Topic view (read-only) ----
Pages.topicView = async function(id) {
  document.getElementById('app').innerHTML = layout(`
    <div id="topic-content">${loadingCards(1)}</div>
  `);
  try {
    const data = await API.get(`/api/topics/${id}`);
    const t = data.topic;
    document.getElementById('topic-content').innerHTML = `
      <a href="/projects/${t.project_id}" data-link class="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-brand-600 mb-3">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
        ${escapeHtml(t.project_title || 'پروژه')}
      </a>
      <div class="flex items-start justify-between gap-4 mb-2">
        <h1 class="text-3xl font-bold flex-1">${escapeHtml(t.title)}</h1>
        <div class="flex items-center gap-2">
          ${statusBadge(t.status)}
          <a href="/topics/${t.id}/edit" data-link class="px-3 py-1.5 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700">ویرایش</a>
          ${t.status === 'draft' ? `<button onclick="publishTopic(${t.id})" class="px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">انتشار در وبلاگ</button>` : `<a href="/blog/${t.slug}" class="px-3 py-1.5 text-sm bg-slate-100 dark:bg-slate-700 rounded-lg">مشاهده در وبلاگ</a>`}
        </div>
      </div>
      <div class="flex items-center gap-3 text-sm text-slate-400 mb-6 pb-6 border-b border-slate-200 dark:border-slate-700">
        <span>${t.reading_time_min} دقیقه مطالعه</span>
        <span>•</span>
        <span>${t.word_count} کلمه</span>
        ${t.tags ? `<span>•</span><span>${escapeHtml(t.tags)}</span>` : ''}
      </div>
      <div class="markdown-preview bg-white dark:bg-slate-800 rounded-2xl p-6 md:p-8 border border-slate-100 dark:border-slate-700">${t.content_html || '<p class="text-slate-400 text-center py-8">هنوز محتوایی ثبت نشده. روی «ویرایش» بزنید.</p>'}</div>
    `;
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

// ---- Topic edit (markdown editor) ----
Pages.topicEdit = async function(id) {
  document.getElementById('app').innerHTML = layout(`
    <div class="mb-4 flex items-center gap-3">
      <a href="javascript:history.back()" class="text-slate-400 hover:text-brand-600">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
      </a>
      <h1 class="text-2xl font-bold">${id === 'new' ? 'مبحث جدید' : 'ویرایش مبحث'}</h1>
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
    <div class="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-700 mb-4">
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

      <div class="flex items-center justify-between mb-3">
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

      <div class="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700 mt-4">
        <span class="text-xs text-slate-400" id="word-count">${(topic?.content_md || '').split(/\s+/).filter(Boolean).length} کلمه</span>
        <div class="flex gap-2">
          <a href="${id !== 'new' ? `/topics/${id}` : '/dashboard'}" data-link class="px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-xl">انصراف</a>
          <button onclick="saveTopic(${id !== 'new' ? id : 'null'}, ${topic?.project_id || 0})" class="px-4 py-2 bg-brand-600 text-white rounded-xl hover:bg-brand-700">ذخیره</button>
        </div>
      </div>
    </div>
  `;

  // init EasyMDE
  const easyMDE = new EasyMDE({
    element: document.getElementById('topic-editor'),
    direction: 'rtl',
    spellChecker: false,
    autofocus: true,
    status: false,
    toolbar: ['bold', 'italic', 'heading', '|', 'quote', 'unordered-list', 'ordered-list', '|', 'link', 'image', 'code', 'table', '|', 'preview', 'side-by-side', 'fullscreen', '|', 'guide'],
    renderingConfig: {
      codeSyntaxHighlighting: true,
    },
  });
  window._editor = easyMDE;
  easyMDE.codemirror.on('change', () => {
    const v = easyMDE.value();
    document.getElementById('word-count').textContent = `${v.split(/\s+/).filter(Boolean).length} کلمه`;
  });
};

window.saveTopic = async function(id, projectId) {
  const title = document.getElementById('topic-title').value.trim();
  if (!title) return toast('عنوان الزامی است', 'error');
  if (!projectId && id === null) return toast('ابتدا یک پروژه بسازید', 'error');

  const data = {
    title,
    tags: document.getElementById('topic-tags').value.trim(),
    status: document.getElementById('topic-status').value,
    content_md: window._editor.value(),
  };

  try {
    let res;
    if (id) res = await API.put(`/api/topics/${id}`, data);
    else res = await API.post('/api/topics', { ...data, project_id: projectId });
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
    const res = await API.post('/api/ai/generate-topic', {
      title,
      topic_id: topicId || null,
    });
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

// ---- Flashcards page ----
Pages.flashcards = async function() {
  document.getElementById('app').innerHTML = layout(`
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold">فلش‌کارت‌ها</h1>
        <p class="text-slate-500 text-sm">مدیریت و مرور فلش‌کارت‌ها</p>
      </div>
      <div class="flex gap-2">
        <button onclick="importCSV()" class="inline-flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 text-sm">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
          ایمپورت CSV
        </button>
        <button onclick="generateFlashcardsAI()" class="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-l from-purple-600 to-pink-600 text-white rounded-xl text-sm hover:shadow-md">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/></svg>
          ساخت با AI
        </button>
      </div>
    </div>

    <div id="flash-stats" class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">${loadingCards(4)}</div>

    <div class="bg-white dark:bg-slate-800 rounded-2xl p-4 mb-4 border border-slate-100 dark:border-slate-700">
      <div class="flex flex-wrap items-center gap-3">
        <input type="text" id="fc-search" placeholder="جستجو..." class="flex-1 min-w-[200px] px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500">
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
          <p class="text-xs mt-1">با ایمپورت CSV یا ساخت با AI شروع کنید.</p>
        </div>`;
        return;
      }
      list.innerHTML = data.flashcards.map(c => `
        <div class="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-100 dark:border-slate-700 hover:shadow-sm transition-all">
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1 min-w-0">
              <p class="font-medium mb-1">${escapeHtml(c.front)}</p>
              <p class="text-sm text-slate-500 line-clamp-2">${escapeHtml(c.back)}</p>
              ${c.tags ? `<p class="text-xs text-slate-400 mt-2">${escapeHtml(c.tags)}</p>` : ''}
            </div>
            <div class="flex flex-col items-end gap-1 text-xs">
              <span class="px-2 py-0.5 ${c.next_review_at <= new Date().toISOString() ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-500'} rounded">مرور ${c.repetitions >= 3 ? '✓' : new Date(c.next_review_at).toLocaleDateString('fa-IR')}</span>
              <button onclick="resetCard(${c.id})" class="text-slate-400 hover:text-brand-600 text-xs">ریست</button>
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

window.importCSV = function() {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 scale-in';
  modal.innerHTML = `
    <div class="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-bold">ایمپورت فلش‌کارت از CSV</h3>
        <button onclick="this.closest('.fixed').remove()" class="text-slate-400 hover:text-slate-600">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>
      <div class="space-y-3">
        <div>
          <label class="block text-sm font-medium mb-1.5">فایل CSV را انتخاب کنید یا بکشید</label>
          <input type="file" accept=".csv,text/csv" id="csv-file" class="block w-full text-sm text-slate-500 file:ml-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 cursor-pointer">
        </div>
        <div class="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3 text-xs text-slate-500">
          <p class="font-medium mb-1">فرمت ستون‌ها:</p>
          <code class="block bg-slate-100 dark:bg-slate-800 p-2 rounded">front,back,hint,tags</code>
          <p class="mt-1">ستون‌های front و back الزامی هستند. hint و tags اختیاری.</p>
        </div>
        <div id="csv-preview" class="hidden"></div>
        <div class="flex gap-2 pt-2">
          <button type="button" onclick="this.closest('.fixed').remove()" class="flex-1 py-2.5 bg-slate-100 dark:bg-slate-700 rounded-xl">انصراف</button>
          <button onclick="doImportCSV()" id="csv-import-btn" disabled class="flex-1 py-2.5 bg-brand-600 text-white rounded-xl disabled:opacity-50">ایمپورت</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  let csvText = '';
  document.getElementById('csv-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    csvText = await file.text();
    document.getElementById('csv-preview').classList.remove('hidden');
    document.getElementById('csv-preview').innerHTML = `<div class="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg">${csvText.split('\n').length} ردیف — ${file.name}</div>`;
    document.getElementById('csv-import-btn').disabled = false;
  });
};

window.doImportCSV = async function() {
  if (!csvText) return;
  const btn = document.getElementById('csv-import-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="loader"></span>';
  try {
    const res = await API.post('/api/flashcards/import-csv', { csv_text: csvText });
    toast(`${res.imported} فلش‌کارت ایمپورت شد ✓`, 'success');
    btn.closest('.fixed').remove();
    if (window._reloadFlashcards) window._reloadFlashcards();
  } catch (err) { toast(err.message, 'error'); btn.disabled = false; btn.textContent = 'ایمپورت'; }
};

window.generateFlashcardsAI = function() {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 scale-in';
  modal.innerHTML = `
    <div class="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-bold">ساخت فلش‌کارت با AI</h3>
        <button onclick="this.closest('.fixed').remove()" class="text-slate-400 hover:text-slate-600">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>
      <form onsubmit="doGenerateAI(event)" class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-1.5">موضوع</label>
          <input type="text" name="topic_title" required class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none" placeholder="مثلاً: نارسایی قلبی">
        </div>
        <div>
          <label class="block text-sm font-medium mb-1.5">تعداد کارت</label>
          <input type="number" name="count" value="10" min="3" max="30" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none">
        </div>
        <div class="flex gap-2 pt-2">
          <button type="button" onclick="this.closest('.fixed').remove()" class="flex-1 py-2.5 bg-slate-100 dark:bg-slate-700 rounded-xl">انصراف</button>
          <button type="submit" class="flex-1 py-2.5 bg-gradient-to-l from-purple-600 to-pink-600 text-white rounded-xl">ساخت</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
};

window.doGenerateAI = async function(e) {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  const btn = e.target.querySelector('button[type=submit]');
  btn.disabled = true;
  btn.innerHTML = '<span class="loader"></span>';
  try {
    const res = await API.post('/api/ai/generate-flashcards', { topic_title: data.topic_title, count: parseInt(data.count) });
    toast(`${res.count} فلش‌کارت ساخته شد ✓`, 'success');
    e.target.closest('.fixed').remove();
    if (window._reloadFlashcards) window._reloadFlashcards();
  } catch (err) { toast(err.message, 'error'); btn.disabled = false; btn.textContent = 'ساخت'; }
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

// ---- Review page (SM-2) ----
Pages.review = async function() {
  document.getElementById('app').innerHTML = layout(`
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold">مرور فلش‌کارت</h1>
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
    // session complete
    const total = state.reviewQueue.length;
    const correct = state.reviewCorrect;
    const accuracy = Math.round((correct / total) * 100);
    document.getElementById('review-area').innerHTML = `
      <div class="text-center py-16 fade-in">
        <div class="w-24 h-24 mx-auto mb-4 bg-gradient-to-br from-emerald-400 to-cyan-500 rounded-full flex items-center justify-center text-white">
          <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
        </div>
        <h2 class="text-2xl font-bold mb-2">آفرین! نشست تمام شد 🎉</h2>
        <div class="grid grid-cols-3 gap-4 max-w-md mx-auto my-6">
          <div class="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
            <p class="text-3xl font-bold text-brand-600">${total}</p>
            <p class="text-xs text-slate-400">کل کارت</p>
          </div>
          <div class="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
            <p class="text-3xl font-bold text-emerald-600">${correct}</p>
            <p class="text-xs text-slate-400">درست</p>
          </div>
          <div class="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
            <p class="text-3xl font-bold text-purple-600">${accuracy}٪</p>
            <p class="text-xs text-slate-400">دقت</p>
          </div>
        </div>
        <a href="/dashboard" data-link class="inline-block px-6 py-3 bg-brand-600 text-white rounded-xl">بازگشت به داشبورد</a>
      </div>
    `;
    // end session
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
        <div class="flip-card-inner relative" style="min-height: 320px;">
          <div class="flip-card-front bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-lg border border-slate-100 dark:border-slate-700 flex flex-col items-center justify-center text-center cursor-pointer" style="min-height:320px;">
            <span class="text-xs text-slate-400 mb-3">سوال</span>
            <p class="text-2xl font-bold mb-4">${escapeHtml(card.front)}</p>
            ${card.hint ? `<details class="text-sm text-slate-500"><summary>راهنما</summary>${escapeHtml(card.hint)}</details>` : ''}
            <span class="text-xs text-brand-600 mt-6 opacity-70">برای دیدن پاسخ کلیک کنید</span>
          </div>
          <div class="flip-card-back bg-gradient-to-br from-brand-500 to-cyan-600 text-white rounded-2xl p-8 shadow-lg flex flex-col items-center justify-center text-center" style="min-height:320px;">
            <span class="text-xs opacity-80 mb-3">پاسخ</span>
            <p class="text-xl font-medium">${escapeHtml(card.back)}</p>
          </div>
        </div>
      </div>

      <div id="review-buttons" class="hidden grid grid-cols-4 gap-2 mt-6 fade-in">
        <button onclick="answerCard('again')" class="py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 font-medium">
          <span class="block">دوباره</span>
          <span class="text-xs opacity-80">&lt; ۱ دقیقه</span>
        </button>
        <button onclick="answerCard('hard')" class="py-3 bg-orange-500 text-white rounded-xl hover:bg-orange-600 font-medium">
          <span class="block">سخت</span>
          <span class="text-xs opacity-80">۱۰ دقیقه</span>
        </button>
        <button onclick="answerCard('good')" class="py-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 font-medium">
          <span class="block">خوب</span>
          <span class="text-xs opacity-80">۱ روز</span>
        </button>
        <button onclick="answerCard('easy')" class="py-3 bg-brand-500 text-white rounded-xl hover:bg-brand-600 font-medium">
          <span class="block">آسان</span>
          <span class="text-xs opacity-80">۴ روز</span>
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
Pages.ai = function() {
  document.getElementById('app').innerHTML = layout(`
    <h1 class="text-2xl font-bold mb-1">دستیار هوش مصنوعی</h1>
    <p class="text-slate-500 mb-6">تولید محتوای آموزشی و فلش‌کارت با Gemini</p>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      <button onclick="navigate('/topics/new')" class="text-right bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-2xl p-6 hover:shadow-lg transition-all">
        <div class="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-3">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
        </div>
        <h3 class="font-bold text-lg mb-1">تولید مبحث آموزشی</h3>
        <p class="text-white/80 text-sm">یک مبحث کامل با ساختار استاندارد تولید کنید</p>
      </button>
      <button onclick="generateFlashcardsAI()" class="text-right bg-gradient-to-br from-cyan-500 to-brand-500 text-white rounded-2xl p-6 hover:shadow-lg transition-all">
        <div class="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-3">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2h-2M7 3v4h10V3M7 3h10"/></svg>
        </div>
        <h3 class="font-bold text-lg mb-1">تولید فلش‌کارت</h3>
        <p class="text-white/80 text-sm">چند فلش‌کارت کلیدی از یک موضوع تولید کنید</p>
      </button>
    </div>

    <div class="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-700">
      <h2 class="font-bold mb-4">لاگ‌های اخیر AI</h2>
      <div id="ai-logs">${loadingCards(3)}</div>
    </div>
  `);

  API.get('/api/ai/logs?limit=10').then(data => {
    document.getElementById('ai-logs').innerHTML = data.logs?.length ? data.logs.map(l => `
      <div class="py-2 border-b border-slate-100 dark:border-slate-700 last:border-0 flex items-center justify-between">
        <div class="flex-1 min-w-0">
          <p class="text-sm truncate">${escapeHtml(l.prompt?.slice(0, 80) || '')}...</p>
          <p class="text-xs text-slate-400">${new Date(l.created_at).toLocaleString('fa-IR')}</p>
        </div>
        <span class="text-xs px-2 py-1 ${l.status === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'} rounded">${l.status === 'success' ? '✓' : '✗'}</span>
      </div>
    `).join('') : '<p class="text-sm text-slate-400 text-center py-4">هنوز لاگی ثبت نشده.</p>';
  }).catch(() => {});
};

// ---- Settings page ----
Pages.settings = async function() {
  document.getElementById('app').innerHTML = layout(`
    <h1 class="text-2xl font-bold mb-1">تنظیمات</h1>
    <p class="text-slate-500 mb-6">پیکربندی اپلیکیشن</p>

    <div class="space-y-6 max-w-2xl">
      <div class="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-700">
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

      <div class="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-700">
        <h2 class="font-bold mb-4">تنظیمات Gemini AI</h2>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-1.5">کلید API رایگان</label>
            <input type="text" id="set-gemini" placeholder="AIza..." class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 font-mono text-sm" dir="ltr">
            <p class="text-xs text-slate-400 mt-1">از <a href="https://aistudio.google.com/apikey" target="_blank" class="text-brand-600">Google AI Studio</a> رایگان بگیرید.</p>
          </div>
        </div>
      </div>

      <div class="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-700">
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
          <button onclick="testTelegram()" class="px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-sm hover:bg-slate-200">تست اتصال</button>
        </div>
      </div>

      <div class="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-700">
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

      <div class="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-700">
        <h2 class="font-bold mb-4">پشتیبان‌گیری</h2>
        <div class="flex gap-3">
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
    document.getElementById('set-display-name').value = state.user?.display_name || '';
    document.getElementById('set-email').value = state.user?.email || '';
  } catch (err) { toast(err.message, 'error'); }
};

window.saveSettings = async function() {
  const data = {
    site_title: document.getElementById('set-title').value,
    site_description: document.getElementById('set-desc').value,
    telegram_channel_id: document.getElementById('set-tg-channel').value,
    telegram_daily_hour: document.getElementById('set-tg-hour').value,
  };
  const gemini = document.getElementById('set-gemini').value;
  if (gemini && !gemini.includes('••')) data.gemini_api_key = gemini;
  const tg = document.getElementById('set-tg-token').value;
  if (tg && !tg.includes('••')) data.telegram_bot_token = tg;

  try {
    await API.put('/api/settings', data);

    // profile
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

// ---- initial route ----
router();
