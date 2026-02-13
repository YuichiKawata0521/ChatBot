import * as ui from './ui.chat.js'
import { dom } from './ui.chat.js'
import * as api from '../../services/chatService.js';
import { showToast } from '../../common/toast.js';

const authChannel = new BroadcastChannel('auth_sync');

// ログアウト: 機能ID FN-A04
async function handleLogout() {
    const resutl = await api.logout();
    if (resutl.success) {
        authChannel.postMessage({ type: 'LOGOUT' });
        window.location.href = '/login';
    } else {
        console.error('ログアウトに失敗しました');
        alert('ログアウトに失敗しました');
    }
}

function setupEventListeners() {
    const logoutBtn = dom.logout;
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    const toggle = document.getElementById('rag-toggle');
    
    toggle.addEventListener('click', () => {
    const isOn = toggle.classList.toggle('is-on');
    toggle.setAttribute('aria-pressed', isOn);
    });
    
    const menuToggle = document.getElementById('toggle-btn');
    const body = document.getElementById('body-element');
    menuToggle.addEventListener('click', () => {
        body.classList.toggle('sidebar-closed');
    });
    
    authChannel.onmessage = (event) => {
        if (event.data.type === 'LOGOUT') {
            sessionStorage.setItem('returnToPage', window.location.pathname);
            window.location.href = '/login'
        }
    }
}


window.addEventListener('DOMContentLoaded', async () => {
    setupEventListeners();
})