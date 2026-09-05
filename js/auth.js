/**
 * FLIX Vision — Auth Client
 *
 * All API calls go to https://devsapps.org/flix/api.php
 * Sessions are tracked server-side via HttpOnly cookies (SameSite=None; Secure)
 * sent cross-origin with credentials: 'include'.
 *
 * Login is ALWAYS required — no bypass. The overlay blocks the entire page
 * until /api.php?action=me confirms an active session.
 */

const AUTH = (() => {
    'use strict';

    // ── Config ─────────────────────────────────────────────────────────────
    const API       = 'https://devsapps.org/flix/api.php';
    const TOKEN_KEY = 'fv_token'; // localStorage key for session token

    // ── State ──────────────────────────────────────────────────────────────
    let currentUser   = null;   // { id, username, hasPin }
    let sessionToken  = localStorage.getItem(TOKEN_KEY) || null;
    let playStartTime = null;
    let playingDetail = null;

    // ── DOM refs ───────────────────────────────────────────────────────────
    let overlay, authTitle, authSubtitle;
    let usernameField, pinField, confirmPinField;
    let authError, authSuccess, submitBtn;
    let resetPanel, resetUsernameField, resetMsgField, resetBtn, backToLoginBtn;
    let avatarBtn, userDropdown, dropdownName, dropdownSub, accountModal;

    // ── API helper ─────────────────────────────────────────────────────────
    async function api(action, body = null, method = 'POST') {
        const url = `${API}?action=${encodeURIComponent(action)}`;
        const opts = {
            method,
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
        };
        // Send session token as header (works even when third-party cookies are blocked)
        if (sessionToken) opts.headers['X-Session-Token'] = sessionToken;
        if (body && method !== 'GET') opts.body = JSON.stringify(body);
        try {
            const res  = await fetch(url, opts);
            const data = await res.json().catch(() => ({}));
            return { status: res.status, data };
        } catch (_) {
            return { status: 0, data: { error: 'Could not reach server.' } };
        }
    }

    async function apiGET(action, params = {}) {
        const url = new URL(API);
        url.searchParams.set('action', action);
        for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
        try {
            const headers = { 'Content-Type': 'application/json' };
            if (sessionToken) headers['X-Session-Token'] = sessionToken;
            const res  = await fetch(url.toString(), { method: 'GET', credentials: 'include', headers });
            const data = await res.json().catch(() => ({}));
            return { status: res.status, data };
        } catch (_) {
            return { status: 0, data: { error: 'Could not reach server.' } };
        }
    }

    // ── Overlay ────────────────────────────────────────────────────────────
    function showOverlay() {
        if (!overlay) return;
        overlay.classList.remove('hidden');
        resetToUsernameStep();
    }
    function hideOverlay() {
        if (!overlay) return;
        overlay.classList.add('hidden');
    }

    // ── Flow steps ─────────────────────────────────────────────────────────
    let currentStep     = 'username';
    let pendingUsername = '';

    function resetToUsernameStep() {
        currentStep     = 'username';
        pendingUsername = '';
        authTitle.textContent    = 'Welcome to Flix';
        authSubtitle.textContent = 'Enter your username to continue';
        usernameField.parentElement.style.display    = '';
        pinField.parentElement.style.display         = 'none';
        confirmPinField.parentElement.style.display  = 'none';
        submitBtn.textContent = 'Continue';
        hideMessages();
        resetPanel.classList.remove('visible');
        usernameField.value = '';
        pinField.value      = '';
        confirmPinField.value = '';
        usernameField.focus();
    }

    function showLoginStep(username) {
        currentStep     = 'login';
        pendingUsername = username;
        authTitle.textContent    = `Hi, ${username}`;
        authSubtitle.textContent = 'Enter your 4-digit PIN';
        usernameField.parentElement.style.display   = 'none';
        pinField.parentElement.style.display        = '';
        confirmPinField.parentElement.style.display = 'none';
        pinField.previousElementSibling.textContent = 'PIN';
        submitBtn.textContent = 'Sign In';
        hideMessages();
        pinField.value = '';
        pinField.focus();
    }

    function showSetupStep(username) {
        currentStep     = 'setup';
        pendingUsername = username;
        authTitle.textContent    = `Hi, ${username}`;
        authSubtitle.textContent = 'Create a 4-digit PIN for your account';
        usernameField.parentElement.style.display   = 'none';
        pinField.parentElement.style.display        = '';
        confirmPinField.parentElement.style.display = '';
        pinField.previousElementSibling.textContent = 'New PIN';
        submitBtn.textContent = 'Create PIN & Sign In';
        hideMessages();
        pinField.value        = '';
        confirmPinField.value = '';
        pinField.focus();
    }

    function hideMessages() {
        authError.classList.remove('visible');
        authSuccess.classList.remove('visible');
    }
    function showError(msg) {
        authError.textContent = msg;
        authError.classList.add('visible');
        authSuccess.classList.remove('visible');
    }
    function showSuccess(msg) {
        authSuccess.textContent = msg;
        authSuccess.classList.add('visible');
        authError.classList.remove('visible');
    }
    function setLoading(loading) {
        submitBtn.disabled = loading;
        submitBtn.innerHTML = loading
            ? '<span class="auth-spinner"></span> Please wait...'
            : (currentStep === 'username' ? 'Continue'
                : currentStep === 'setup' ? 'Create PIN & Sign In'
                : 'Sign In');
    }

    // ── Submit ─────────────────────────────────────────────────────────────
    async function handleSubmit() {
        hideMessages();

        if (currentStep === 'username') {
            const username = usernameField.value.trim();
            if (!username) return showError('Please enter your username.');
            setLoading(true);
            const { status, data } = await api('check-username', { username });
            setLoading(false);
            if (status === 0)     return showError('Cannot reach server. Check your connection.');
            if (!data.exists)     return showError('Username not found. Contact your admin.');
            if (data.hasPin)      showLoginStep(username);
            else                  showSetupStep(username);
            return;
        }

        if (currentStep === 'login') {
            const pin = pinField.value.trim();
            if (!/^\d{4}$/.test(pin)) return showError('PIN must be exactly 4 digits.');
            setLoading(true);
            const { status, data } = await api('login', { username: pendingUsername, pin });
            setLoading(false);
            if (status === 200) {
                if (data.token) { sessionToken = data.token; localStorage.setItem(TOKEN_KEY, data.token); }
                currentUser = { username: pendingUsername };
                onAuthenticated();
            } else if (status === 403) showError(data.error || 'Too many active sessions.');
            else                       showError(data.error || 'Incorrect PIN.');
            return;
        }

        if (currentStep === 'setup') {
            const pin     = pinField.value.trim();
            const confirm = confirmPinField.value.trim();
            if (!/^\d{4}$/.test(pin)) return showError('PIN must be exactly 4 digits.');
            if (pin !== confirm)       return showError('PINs do not match.');
            setLoading(true);
            const { status, data } = await api('setup-pin', { username: pendingUsername, pin });
            setLoading(false);
            if (status === 200) {
                if (data.token) { sessionToken = data.token; localStorage.setItem(TOKEN_KEY, data.token); }
                currentUser = { username: pendingUsername };
                onAuthenticated();
            } else showError(data.error || 'Could not set PIN.');
            return;
        }
    }

    // ── Reset request ──────────────────────────────────────────────────────
    async function handleResetRequest() {
        const username = resetUsernameField.value.trim() || pendingUsername;
        const message  = resetMsgField.value.trim();
        if (!username) return showError('Please enter your username.');
        resetBtn.disabled = true;
        const { status, data } = await api('request-reset', { username, message });
        resetBtn.disabled = false;
        if (status === 200) {
            showSuccess('Reset request sent! Your admin will update your PIN shortly.');
            resetPanel.classList.remove('visible');
        } else {
            showError(data.error || 'Could not send request.');
        }
    }

    // ── Post-auth ──────────────────────────────────────────────────────────
    function onAuthenticated() {
        hideOverlay();
        if (!currentUser.id) {
            apiGET('me').then(({ data }) => {
                if (data.username) { currentUser = data; renderUserAvatar(); }
            });
        }
        renderUserAvatar();
    }

    // ── Avatar ─────────────────────────────────────────────────────────────
    function renderUserAvatar() {
        if (!avatarBtn) return;
        avatarBtn.textContent = (currentUser.username || '?').charAt(0).toUpperCase();
        avatarBtn.style.display = 'flex';
        if (dropdownName) dropdownName.textContent = currentUser.username;
        if (dropdownSub)  dropdownSub.textContent  = 'Signed in';
    }
    function toggleDropdown()  { userDropdown && userDropdown.classList.toggle('open'); }
    function closeDropdown()   { userDropdown && userDropdown.classList.remove('open'); }

    // ── Logout ─────────────────────────────────────────────────────────────
    async function logout() {
        closeDropdown();
        await api('logout', {});
        sessionToken = null;
        localStorage.removeItem(TOKEN_KEY);
        currentUser = null;
        if (avatarBtn) avatarBtn.style.display = 'none';
        showOverlay();
    }

    // ── Account modal ──────────────────────────────────────────────────────
    function openAccountModal()  { closeDropdown(); accountModal && accountModal.classList.add('active'); populateAccountModal(); }
    function closeAccountModal() { accountModal && accountModal.classList.remove('active'); }

    function populateAccountModal() {
        const el = document.getElementById('acct-username');
        if (el) el.textContent = currentUser.username || '—';
        ['acct-current-pin','acct-new-pin','acct-confirm-pin'].forEach(id => {
            const f = document.getElementById(id); if (f) f.value = '';
        });
        ['acct-pin-error','acct-pin-success'].forEach(id => {
            const f = document.getElementById(id); if (f) { f.classList.remove('visible'); f.textContent = ''; }
        });
    }

    async function handleChangePIN() {
        const cpCurrent = document.getElementById('acct-current-pin');
        const cpNew     = document.getElementById('acct-new-pin');
        const cpConfirm = document.getElementById('acct-confirm-pin');
        const cpError   = document.getElementById('acct-pin-error');
        const cpSuccess = document.getElementById('acct-pin-success');
        const cpBtn     = document.getElementById('acct-change-pin-btn');

        const currentPin = cpCurrent?.value.trim() || '';
        const newPin     = cpNew?.value.trim()     || '';
        const confirmPin = cpConfirm?.value.trim() || '';

        cpError?.classList.remove('visible');
        cpSuccess?.classList.remove('visible');

        if (!/^\d{4}$/.test(currentPin)) { if (cpError) { cpError.textContent = 'Enter your current 4-digit PIN.'; cpError.classList.add('visible'); } return; }
        if (!/^\d{4}$/.test(newPin))     { if (cpError) { cpError.textContent = 'New PIN must be exactly 4 digits.'; cpError.classList.add('visible'); } return; }
        if (newPin !== confirmPin)        { if (cpError) { cpError.textContent = 'New PINs do not match.'; cpError.classList.add('visible'); } return; }

        if (cpBtn) cpBtn.disabled = true;
        const { status, data } = await api('change-pin', { currentPin, newPin });
        if (cpBtn) cpBtn.disabled = false;

        if (status === 200) {
            if (cpSuccess) { cpSuccess.textContent = 'PIN updated successfully.'; cpSuccess.classList.add('visible'); }
            if (cpCurrent) cpCurrent.value = '';
            if (cpNew)     cpNew.value     = '';
            if (cpConfirm) cpConfirm.value = '';
        } else {
            if (cpError) { cpError.textContent = data.error || 'Failed to update PIN.'; cpError.classList.add('visible'); }
        }
    }

    // ── Activity tracking ──────────────────────────────────────────────────
    function trackPageView(page) {
        if (!currentUser) return;
        api('log-activity', { type: 'page_view', detail: { page } }).catch(() => {});
    }
    function trackPlayStart(detail) {
        if (!currentUser) return;
        playStartTime = Date.now();
        playingDetail = detail;
        api('log-activity', { type: 'play', detail }).catch(() => {});
    }
    function trackPlayStop() {
        if (!currentUser || !playingDetail) return;
        const duration = playStartTime ? Math.round((Date.now() - playStartTime) / 1000) : 0;
        api('log-activity', { type: 'stop', detail: { ...playingDetail, duration_secs: duration } }).catch(() => {});
        playStartTime = null;
        playingDetail = null;
    }

    // ── PIN digit enforcer ─────────────────────────────────────────────────
    function enforcePIN(el) {
        el.addEventListener('input',   () => { el.value = el.value.replace(/\D/g, '').slice(0, 4); });
        el.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleSubmit(); });
    }

    // ── Init ───────────────────────────────────────────────────────────────
    function init() {
        overlay             = document.getElementById('auth-overlay');
        authTitle           = document.getElementById('auth-title');
        authSubtitle        = document.getElementById('auth-subtitle');
        authError           = document.getElementById('auth-error');
        authSuccess         = document.getElementById('auth-success');
        submitBtn           = document.getElementById('auth-submit');
        resetPanel          = document.getElementById('auth-reset-panel');
        resetUsernameField  = document.getElementById('reset-username');
        resetMsgField       = document.getElementById('reset-message');
        resetBtn            = document.getElementById('reset-submit');
        backToLoginBtn      = document.getElementById('back-to-login');
        avatarBtn           = document.getElementById('user-avatar-btn');
        userDropdown        = document.getElementById('user-dropdown');
        dropdownName        = document.getElementById('dropdown-username');
        dropdownSub         = document.getElementById('dropdown-sub');
        accountModal        = document.getElementById('account-modal');
        usernameField       = document.getElementById('auth-username');
        pinField            = document.getElementById('auth-pin');
        confirmPinField     = document.getElementById('auth-confirm-pin');

        if (!overlay) return; // markup not present

        // Show overlay immediately — always required, no bypass
        overlay.classList.remove('hidden');

        // PIN enforcement
        if (pinField)        enforcePIN(pinField);
        if (confirmPinField) enforcePIN(confirmPinField);

        // Submit
        submitBtn?.addEventListener('click', handleSubmit);
        usernameField?.addEventListener('keydown', e => { if (e.key === 'Enter') handleSubmit(); });

        // Reset panel
        document.getElementById('show-reset-btn')?.addEventListener('click', () => {
            resetPanel.classList.add('visible');
            if (resetUsernameField && pendingUsername) resetUsernameField.value = pendingUsername;
        });
        backToLoginBtn?.addEventListener('click', () => { resetPanel.classList.remove('visible'); hideMessages(); });
        resetBtn?.addEventListener('click', handleResetRequest);

        // Avatar + dropdown
        avatarBtn?.addEventListener('click', e => { e.stopPropagation(); toggleDropdown(); });
        document.addEventListener('click', e => {
            if (userDropdown && !userDropdown.contains(e.target) && e.target !== avatarBtn) closeDropdown();
        });

        // Dropdown items
        document.getElementById('dropdown-settings')?.addEventListener('click', openAccountModal);
        document.getElementById('dropdown-logout')?.addEventListener('click', logout);

        // Account modal
        document.getElementById('account-modal-close')?.addEventListener('click', closeAccountModal);
        accountModal?.addEventListener('click', e => { if (e.target === accountModal) closeAccountModal(); });
        document.getElementById('acct-change-pin-btn')?.addEventListener('click', handleChangePIN);

        // Account modal — request reset button
        document.getElementById('acct-request-reset-btn')?.addEventListener('click', () => {
            closeAccountModal();
            if (resetUsernameField && currentUser) resetUsernameField.value = currentUser.username || '';
            showOverlay();
            setTimeout(() => resetPanel?.classList.add('visible'), 50);
        });

        // Account modal PIN fields — digits only
        ['acct-current-pin','acct-new-pin','acct-confirm-pin'].forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            el.addEventListener('input',   () => { el.value = el.value.replace(/\D/g, '').slice(0, 4); });
            el.addEventListener('keydown', e  => { if (e.key === 'Enter') handleChangePIN(); });
        });

        // Check for existing session — show overlay until confirmed
        checkSession();
    }

    async function checkSession() {
        const { status, data } = await apiGET('me');
        if (status === 200 && data.username) {
            currentUser = data;
            onAuthenticated();
        } else {
            // No valid session — keep overlay visible, reset to step 1
            resetToUsernameStep();
        }
    }

    // ── Public API ─────────────────────────────────────────────────────────
    return {
        init,
        trackPageView,
        trackPlayStart,
        trackPlayStop,
        get user() { return currentUser; },
    };
})();

document.addEventListener('DOMContentLoaded', AUTH.init);
