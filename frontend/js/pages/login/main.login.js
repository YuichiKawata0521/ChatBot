import * as service from '../../services/loginService.js';
import * as ui from './ui.login.js';
import { showToast } from '../../common/toast.js';

const authChannel = new BroadcastChannel('auth_sync');

// ログイン処理: 機能ID FN-A01
async function handleLoginSubmit(event) {
    event.preventDefault();

    ui.toggleButtonsState(true);

    try {
        const formData = ui.getLoginFormData();
        const dataObject = Object.fromEntries(formData.entries());

        const result = await service.fetchLogin(dataObject);

        if (result.success) {
            if (result.isRegistered) {
                alert('初回ログインの為、パスワード変更画面へ移動します');
                window.location.href = '/password-change.html';
            } else {
                authChannel.postMessage({ type: 'LOGIN' });
                const chatPage = "/chat/index.html";
                window.location.replace(chatPage);
            }
        }
    } catch (error) {
        console.error('Login Error: ', error);
        showToast(result.message);
    } finally {
        if (!result?.success) {
            ui.toggleButtonsState(false);
        }
    }
}

function setupEventListeners() {
    const form = ui.dom.formEl;
    if (form) {
        form.addEventListener('submit', handleLoginSubmit);
    }

    authChannel.onmessage = (event) => {
        if (event.data.type === 'LOGIN') {
            const returnUrl = sessionStorage.getItem('returnToPage');

            if (returnUrl) {
                sessionStorage.removeItem('returnToPage');
                window.location.href = returnUrl;
            } else {
                window.location.href = '/chat/index.html'
            }
        }
    }
}

window.addEventListener('DOMContentLoaded', async () => {
    setupEventListeners();
})