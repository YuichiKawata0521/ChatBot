import * as ui from './ui.chat.js'
import { dom } from './ui.chat.js'
import * as api from '../../services/chatService.js';
import { showToast } from '../../common/toast.js';
import { loadMessages } from './history.chat.js';
import { ChatStream } from './stream.chat.js';
import { loadThreadList } from './history.chat.js';


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

// 新規チャット画面への初期化
function initializeNewChat() {
    // グローバル変数の初期化
    ChatStream.currentThreadId = null;
    
    // UI のリセット
    dom.chatContainer.innerHTML = '';
    ui.clearInput();
    
    // URL をリセット
    window.history.pushState({}, '', '/chat');
}

async function handleStream() {
    const pathParts = window.location.pathname.split('/');
    const threadId = pathParts[pathParts.length -1];

    if (!isNaN(threadId)) {
        ChatStream.currentThreadId = threadId;
        loadMessages(threadId);
    }
}

async function initializeSettingsMenu() {
    try {
        const response = await fetch('/api/v1/csrf-token', {
            credentials: 'include'
        });

        if (!response.ok) return;

        const data = await response.json();
        if (data.user?.role === 'admin') {
            createAdminMenuItem();
        }
    } catch (error) {
        console.error('Failed to initialize settings menu:', error);
    }
}

function createAdminMenuItem() {
    const settingsMenu = dom.settingMenu;
    const deleteHistoryBtn = dom.deleteHistoryBtn;

    if (!settingsMenu || !deleteHistoryBtn) return;
    if (document.getElementById('admin-btn')) return;

    const adminBtn = document.createElement('button');
    adminBtn.id = 'admin-btn';
    adminBtn.className = 'settings-menu-item';
    adminBtn.textContent = '👨‍💼 管理画面';
    adminBtn.addEventListener('click', () => {
        window.location.href = '/admin';
    });

    deleteHistoryBtn.insertAdjacentElement('afterend', adminBtn);
}

function setupEventListeners() {
    const logoutBtn = dom.logout;
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    // HOMEボタンのイベントリスナー
    const homeBtn = dom.home;
    if (homeBtn) {
        homeBtn.addEventListener('click', initializeNewChat);
    }
    const menuToggle = dom.menuToggle;
    const body = dom.body;
    menuToggle.addEventListener('click', () => {
        body.classList.toggle('sidebar-closed');
    });

    // Settingsメニューのイベントリスナー
    const settingsBtn = dom.settingBtn;
    const settingsMenu = dom.settingMenu;
    
    if (settingsBtn && settingsMenu) {
        settingsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            settingsMenu.classList.toggle('hidden');
        });
        
        // メニュー外をクリックしたら閉じる
        document.addEventListener('click', (e) => {
            if (!settingsBtn.contains(e.target) && !settingsMenu.contains(e.target)) {
                settingsMenu.classList.add('hidden');
            }
        });
    }
    
    // パスワード変更ボタン
    const changePasswordBtn = dom.changePWBtn;
    if (changePasswordBtn) {
        changePasswordBtn.addEventListener('click', () => {
            window.location.href = '/pages/change_password.html';
        });
    }
    
    // 履歴削除ボタン
    const deleteHistoryBtn = dom.deleteHistoryBtn;
    if (deleteHistoryBtn) {
        deleteHistoryBtn.addEventListener('click', async () => {
            if (confirm('すべての会話履歴を削除してもよろしいですか？この操作は取り消せません。')) {
                try {
                    const token = await fetch('/api/v1/csrf-token', {
                        credentials: 'include'
                    });
                    const { csrfToken } = await token.json();
                    const response = await fetch('/api/v1/chat/delete-history', {
                        method: 'POST',
                        credentials: 'include',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-CSRF-Token': csrfToken
                        }
                    });
                    
                    if (response.ok) {
                        showToast('履歴を削除しました');
                        dom.chatContainer.innerHTML = '';
                        loadThreadList();
                        settingsMenu.classList.add('hidden');
                    } else {
                        showToast('履歴の削除に失敗しました');
                    }
                } catch (error) {
                    console.error('Delete history error:', error);
                    showToast('エラーが発生しました');
                }
            }
        });
    }
    
    const messageInput = dom.messageInput;
    
    const sendBtn = dom.sendBtn;
    sendBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        const message = messageInput.value.trim();
        if (!message) {
            showToast('入力が空です');
            return;
        }
        await ChatStream.sendMessage(message);
        ui.clearInput();
    });
    
    // Enter/Shift+Enterの処理
    messageInput.addEventListener('keydown', async (e) => {
        // IME確定中は処理しない
        if (e.isComposing) {
            return;
        }
        
        if (e.key === 'Enter') {
            // Shift+Enterで改行
            if (e.shiftKey) {
                e.preventDefault();
                const start = messageInput.selectionStart;
                const end = messageInput.selectionEnd;
                messageInput.value = messageInput.value.substring(0, start) + '\n' + messageInput.value.substring(end);
                messageInput.selectionStart = messageInput.selectionEnd = start + 1;
                resizeTextarea();
            } else {
                // Enterで送信
                e.preventDefault();
                const message = messageInput.value.trim();
                if (message) {
                    await ChatStream.sendMessage(message);
                }
            }
        }
    });
    
    // テキストエリアの自動リサイズ
    messageInput.addEventListener('input', resizeTextarea);
    
    function resizeTextarea() {
        messageInput.style.height = 'auto';
        const scrollHeight = messageInput.scrollHeight;
        const maxHeight = parseInt(window.getComputedStyle(messageInput).maxHeight);
        
        if (scrollHeight <= maxHeight) {
            messageInput.style.height = scrollHeight + 'px';
        } else {
            messageInput.style.height = maxHeight + 'px';
        }
    }
    
    authChannel.onmessage = (event) => {
        if (event.data.type === 'LOGOUT') {
            sessionStorage.setItem('returnToPage', window.location.pathname);
            window.location.href = '/login'
        }
    }
}


window.addEventListener('DOMContentLoaded', async () => {
    setupEventListeners();
    loadThreadList();
    initializeSettingsMenu();
})