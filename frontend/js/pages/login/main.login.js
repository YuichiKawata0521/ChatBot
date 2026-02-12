import * as service from '../../services/loginService.js';
import * as ui from './ui.login.js';
import { showToast } from '../../common/toast.js';

const authChannel = new BroadcastChannel('auth_sync');

// ログイン処理: 機能ID FN-A01
async function handleLoginSubmit(event) {
    event.preventDefault();

    ui.toggleButtonsState(true);
    let result;

    try {
        const formData = ui.getLoginFormData();
        const dataObject = Object.fromEntries(formData.entries());

        result = await service.fetchLogin(dataObject);
        console.log(`ログイン時のresult:\n${result}`);

        if (result.success) {
            if (result.requirePasswordChange) {
                alert('初回ログインの為、入力したメールアドレスに\nパスワード変更のメールを送信しました');
                location.reload();
            } else {
                authChannel.postMessage({ type: 'LOGIN' });
                const chatPage = "/chat";
                window.location.replace(chatPage);
            }
        } else {
            showToast(result.message);
            location.reload();
        }
    } catch (error) {
        console.error('Login Error: ', error);
        showToast(result.message);
    } finally {
        if (!result || !result?.success) {
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