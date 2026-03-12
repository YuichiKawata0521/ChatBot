import * as ui from './ui.chat.js'
import { dom } from './ui.chat.js'
import * as api from '../../services/chatService.js';
import { loadMessages } from './history.chat.js';
import { ChatStream } from './stream.chat.js';
import { loadThreadList } from './history.chat.js';
import { initSettingsMenu, initializeAdminMenu } from './settings.chat.js';
import { initInputHandlers } from './input.chat.js';
import { showToast } from '../../common/toast.js';
import { RequirementAgentWizard } from './agentWizard.js';
import { copyMessage } from './copy.chat.js';
import { requireAuth } from '../../common/authGuard.js';


const authChannel = new BroadcastChannel('auth_sync');

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

function initializeNewChat() {
    ChatStream.currentThreadId = null;
    
    ui.clearChatMessages();
    ui.clearInput();
    ui.setHeaderTitle('ChatBot');
    ui.showAgentSelection();
    ui.hideMessagesContainer();
    
    window.history.pushState({}, '', '/chat');
}

async function handleStream() {
    const pathParts = window.location.pathname.split('/');
    const threadId = pathParts[pathParts.length -1];
    const isNumericThreadId = /^\d+$/.test(threadId);

    if (isNumericThreadId) {
        ChatStream.currentThreadId = threadId;
        await loadMessages(threadId);
    } else {
        ui.showAgentSelection();
        ui.hideMessagesContainer();
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
        const res = await api.createThread(doc.title, doc.id);　// api.createThreadはないので確認する
        if (res.success) {
            // スレッドIDが返ってくるので、URLを変更してチャットを開始
            ChatStream.currentThreadId = res.threadId;
            window.history.pushState({}, '', `/chat/${res.threadId}`);
            ui.hideAgentSelection();
            ui.hideMessagesContainer();
            
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

function handleRDDAgent() {
    const reqWizard = new RequirementAgentWizard(async ({ promptText, interviewPayload }) => {
        try {
            ui.switchOverlay('show');
            const result = await api.executeRDDAgent(interviewPayload);
            const draft = result?.data?.draft || result?.draft || 'ドラフト生成結果が空でした。';

            const blob = new Blob([draft], { type: 'text/markdown;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            
            const date = new Date();
            const jst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
            const day = jst.toISOString().replace('T', ' ').split('.')[0];

            a.href = url;
            a.download = `要件定義書・仕様書_draft_${day}.md`;
            a.hidden = true;

            document.body.appendChild(a)
            a.click();
            
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("エージェントの実行に失敗しました", error);
            showToast('エラーが発生しました。もう一度お試しください。');
        } finally {
            ui.switchOverlay('hide');
            alert('要件定義書をダウンロードしました');
        }
    });

    // 「要件定義書作成」ボタンのクリックでウィザードを開く
    const reqAgentBtn = document.getElementById('agent-requirement-btn');
    if (reqAgentBtn) {
        reqAgentBtn.addEventListener('click', () => {
            reqWizard.open();
        });
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

    if (dom.chatContainer) {
        dom.chatContainer.addEventListener('click', async (event) => {
            const actionButton = event.target.closest('.message-action-btn');
            if (!actionButton) return;

            const action = actionButton.dataset.action;
            const messageRow = actionButton.closest('.message-row');
            if (!action || !messageRow) return;

            if (action === 'copy') {
                await copyMessage(messageRow);
                return;
            }

            if (action === 'good' || action === 'bad') {
                const messageId = messageRow.dataset.messageId;
                if (!messageId) {
                    showToast('保存前の回答は評価できません');
                    return;
                }

                const currentRating = messageRow.dataset.rating || null;
                const nextRating = currentRating === action ? null : action;

                try {
                    const response = await api.updateMessageRating(messageId, nextRating);
                    if (response?.success) {
                        ui.setMessageRating(messageRow, nextRating);
                        showToast(nextRating ? '評価を保存しました' : '評価を解除しました', 'success');
                    } else {
                        showToast('評価の保存に失敗しました');
                    }
                } catch (error) {
                    console.error('Failed to update message rating:', error);
                    showToast('評価の保存に失敗しました');
                }
            }
        });
    }

    authChannel.onmessage = (event) => {
        if (event.data.type === 'LOGOUT') {
            sessionStorage.setItem('returnToPage', window.location.pathname);
            window.location.href = '/login'
        }
    }
}


window.addEventListener('DOMContentLoaded', async () => {
    if (!(await requireAuth())) {
        return;
    }

    ui.switchOverlay('hide');
    ui.showAgentSelection();
    ui.hideMessagesContainer();
    setupEventListeners();
    loadThreadList();
    await handleStream();
    initSettingsMenu();
    initializeAdminMenu();
    initInputHandlers(async (message) => {
        ui.hideAgentSelection();
        ui.showMessagesContainer();
        await ChatStream.sendMessage(message);
        loadThreadList();
    });
    handleRDDAgent();
})