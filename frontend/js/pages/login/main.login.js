import * as service from '../../services/loginService.js';
import * as ui from './ui.login.js';
import { showToast } from '../../common/toast.js';

const authChannel = new BroadcastChannel('auth_sync');
const FIRST_LOGIN_STAY_KEY = 'firstLoginStayOnLoginPage';

function consumeReturnPathOrDefault() {
    const returnUrl = sessionStorage.getItem('returnToPage');
    if (returnUrl) {
        sessionStorage.removeItem('returnToPage');
        return returnUrl;
    }
    return '/chat';
}

function redirectToPostLoginPage() {
    window.location.replace(consumeReturnPathOrDefault());
}

function setFirstLoginStayMode(enabled) {
    if (enabled) {
        sessionStorage.setItem(FIRST_LOGIN_STAY_KEY, '1');
        return;
    }
    sessionStorage.removeItem(FIRST_LOGIN_STAY_KEY);
}

function isFirstLoginStayMode() {
    return sessionStorage.getItem(FIRST_LOGIN_STAY_KEY) === '1';
}

function applyLoginPrefillFromQuery() {
    const params = new URLSearchParams(window.location.search);
    const email = params.get('email');
    const employeeNo = params.get('employee_no');
    const emailInput = document.getElementById('email');
    const employeeNoInput = document.getElementById('employee_no');

    if (email && emailInput) {
        emailInput.value = email;
    }

    if (employeeNo && employeeNoInput) {
        employeeNoInput.value = employeeNo;
    }
}

// ログイン処理: 機能ID FN-A01
async function handleLoginSubmit(event) {
    event.preventDefault();

    ui.toggleButtonsState(true);
    let result;

    try {
        const formData = ui.getLoginFormData();
        const dataObject = Object.fromEntries(formData.entries());

        result = await service.fetchLogin(dataObject);

        if (result.success) {
            if (result.requirePasswordChange) {
                setFirstLoginStayMode(true);
                alert('初回ログインの為、入力したメールアドレスに\nパスワード変更のメールを送信しました');
                location.reload();
            } else {
                setFirstLoginStayMode(false);
                authChannel.postMessage({ type: 'LOGIN' });
                redirectToPostLoginPage();
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
            redirectToPostLoginPage();
        }
    }
}

window.addEventListener('DOMContentLoaded', async () => {
    applyLoginPrefillFromQuery();

    if (isFirstLoginStayMode()) {
        setupEventListeners();
        return;
    }

    const authResult = await service.authMe();
    if (authResult?.success) {
        redirectToPostLoginPage();
        return;
    }

    setupEventListeners();
})