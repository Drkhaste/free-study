<div class="medical-edu-login-container">
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
        <div id="login-error" class="text-red-500 text-sm hidden"></div>
    </form>
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
