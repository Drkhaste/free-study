<div class="medical-edu-login-container medical-edu-app-root">
    <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 via-cyan-50 to-purple-50 p-4">
    <div class="relative w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
    <div class="text-center mb-8">
          <div class="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-cyan-500 items-center justify-center text-white text-3xl font-bold mb-4 shadow-xl shadow-brand-500/30">پ</div>
          <h1 class="text-2xl font-bold text-slate-800">آکادمی پزشکی</h1>
          <p class="text-slate-500 mt-1">ورود به پنل ادمین</p>
    </div>
    <form id="auth-form" class="space-y-4">
        <div>
            <label class="block text-sm font-medium text-slate-700 mb-1.5">نام کاربری</label>
            <input type="text" name="log" required class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all">
        </div>
        <div>
            <label class="block text-sm font-medium text-slate-700 mb-1.5">رمز عبور</label>
            <input type="password" name="pwd" required class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all">
        </div>
        <label class="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" name="rememberme" value="forever" class="w-4 h-4 rounded accent-brand-600" checked>
            <span class="text-sm text-slate-600">مرا به خاطر بسپار</span>
        </label>
        <button type="submit" class="w-full py-3 bg-gradient-to-l from-brand-600 to-cyan-600 text-white font-medium rounded-xl hover:shadow-lg hover:shadow-brand-500/30 transition-all">
            ورود
        </button>
        <div id="login-error" class="text-red-500 text-sm hidden mt-2 text-center"></div>
    </form>
    </div>
    </div>
</div>

<script>
document.getElementById('auth-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const formData = new FormData(this);
    const errorEl = document.getElementById('login-error');
    errorEl.classList.add('hidden');

    fetch('<?php echo esc_url(wp_login_url()); ?>', {
        method: 'POST',
        body: formData,
        redirect: 'manual'
    }).then(response => {
        // Since we can't easily check auth success from a cross-origin-like POST to wp-login.php
        // We'll check if we are logged in by calling /auth/me
        return fetch('<?php echo esc_url(rest_url('medical-edu/v1/auth/me')); ?>');
    }).then(res => res.json())
    .then(data => {
        if (data.user) {
            window.location.reload();
        } else {
            errorEl.textContent = 'نام کاربری یا رمز عبور اشتباه است.';
            errorEl.classList.remove('hidden');
        }
    }).catch(err => {
        errorEl.textContent = 'خطایی رخ داد. مجدداً تلاش کنید.';
        errorEl.classList.remove('hidden');
    });
});
</script>
