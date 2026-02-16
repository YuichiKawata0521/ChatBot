import * as ui from './ui.chat.js'
import { dom } from './ui.chat.js'
import * as api from '../../services/chatService.js';
import { showToast } from '../../common/toast.js';
import { loadMessages } from './history.chat.js';
import { ChatStream } from './stream.chat.js';


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

async function handleStream() {
    const pathParts = window.location.pathname.split('/');
    const threadId = pathParts[pathParts.length -1];

    if (!isNaN(threadId)) {
        ChatStream.currentThreadId = threadId;
        loadMessages(threadId);
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

    const sendBtn = dom.sendBtn;
    sendBtn.addEventListener('submit', async (e) => {
        e.preventDefault();
        const message = dom.messageInput.value.trim();
        if (!message) return;

        await ChatStream.sendMessage(menuToggle);
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