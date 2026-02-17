import * as ui from './ui.chat.js'
import { dom } from './ui.chat.js'
import * as api from '../../services/chatService.js';
import { loadMessages } from './history.chat.js';
import { ChatStream } from './stream.chat.js';
import { loadThreadList } from './history.chat.js';
import { initSettingsMenu, initializeAdminMenu } from './settings.chat.js';
import { initInputHandlers } from './input.chat.js';
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

// 新規チャット画面への初期化
function initializeNewChat() {
    // グローバル変数の初期化
    ChatStream.currentThreadId = null;
    
    // UI のリセット
    ui.clearChatMessages();
    ui.clearInput();
    ui.setHeaderTitle('ChatBot');
    
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

function handleSidebarTab() {
    const tabH = dom.tabHistory;
    const tabD = dom.tabDocuments;

    if (tabH && tabD) {
        tabH.addEventListener('click', () => {
            ui.switchSidebarTab('history');
            loadThreadList();
        });
        tabD.addEventListener('click', () => {
            ui.switchSidebarTab('documents');
            loadDocumentsList();
        })
    }
}

async function loadDocumentsList() {
    try {
        const response = await api.getDocuments();
        if (response.success) {
            ui.renderDocumentsList(response.data, handleDocumentSelect);
        }
    } catch (error) {
        console.error('Failed to load documents:', error);
        showToast('ドキュメントの取得に失敗しました');
    }
}

// ドキュメント選択時の処理
async function handleDocumentSelect(doc) {
    if (!confirm(`「${doc.title}」についてチャットを開始しますか？`)) return;

    try {
        // RAGモードで新規スレッド作成
        const res = await api.createThread(doc.title, doc.id);
        if (res.success) {
            // スレッドIDが返ってくるので、URLを変更してチャットを開始
            ChatStream.currentThreadId = res.threadId;
            window.history.pushState({}, '', `/chat/${res.threadId}`);
            
            // UIリセット
            dom.chatContainer.innerHTML = '';
            ui.clearInput();
            
            // 履歴タブに戻す（アクティブなスレッドを表示するため）
            ui.switchSidebarTab('history'); 
            loadThreadList(); // 履歴一覧も更新
            
            // システムメッセージ風に開始を表示（任意）
            ui.addMessage('assistant', `**${doc.title}** についての質問をどうぞ。`);
        }
    } catch (error) {
        console.error('Error creating RAG thread:', error);
        showToast('チャットの開始に失敗しました');
    }
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

    handleSidebarTab();

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
    initSettingsMenu();
    initializeAdminMenu();
    initInputHandlers(async (message) => {
        await ChatStream.sendMessage(message);
        loadThreadList();
    });
})