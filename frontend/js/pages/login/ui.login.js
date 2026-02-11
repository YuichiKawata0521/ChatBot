export const dom = {
    get formEl() { return document.getElementById('loginForm');},
    get loginBtn() { return document.getElementById('loginBtn');},
}

export function getLoginFormData() {
    if (!dom.formEl) throw new Error('Login form not found');
    return new FormData(dom.formEl);
}

export function toggleButtonsState(isLoading) {
    const btn = dom.loginBtn;
    if (!btn) return;

    if (isLoading) {
        if (!btn.dataset.originalText) {
            btn.dataset.originalText = btn.textContent;
        }

        btn.disabled = true;
        btn.textContent = 'ログイン中...';
        btn.style.opacity = '0.7';
        btn.style.cursor = 'wait';
    } else {
        btn.disabled = false;
        btn.textContent = btn.dataset.originalText || 'ログイン';
        btn.style.opacity = '';
        btn.style.cursor = '';
    }
}