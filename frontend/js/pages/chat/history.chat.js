import * as ui from './ui.chat.js';
import { dom } from './ui.chat.js';
import { showToast } from '../../common/toast.js'
import { ChatStream } from './stream.chat.js';
import { deleteThread, getThreadMessages, getThreads, updateThreadTitle } from '../../services/chatService.js';

let currentThreadId = null;
let activeMenuPopup = null;
let menuListenersInitialized = false;

function closeHistoryMenuPopup() {
    if (!activeMenuPopup) return;
    activeMenuPopup.remove();
    activeMenuPopup = null;
}

function ensureHistoryMenuListeners() {
    if (menuListenersInitialized) return;
    menuListenersInitialized = true;

    document.addEventListener('click', () => {
        closeHistoryMenuPopup();
    });

    window.addEventListener('resize', () => {
        closeHistoryMenuPopup();
    });

    document.addEventListener('scroll', () => {
        closeHistoryMenuPopup();
    }, true);
}

async function handleThreadRename(thread) {
    const nextTitle = prompt('新しいスレッド名を入力してください', thread.title || '');
    if (nextTitle === null) return;

    const trimmed = nextTitle.trim();
    if (!trimmed) {
        showToast('タイトルを入力してください');
        return;
    }

    if (trimmed === thread.title) return;

    try {
        const response = await updateThreadTitle(thread.id, trimmed);
        if (response.success) {
            showToast('タイトルを更新しました', 'success');
            await loadThreadList();
        }
    } catch (error) {
        console.error('Failed to rename thread: ', error);
        showToast('タイトルの更新に失敗しました');
    }
}

async function handleThreadDelete(thread) {
    if (!confirm(`「${thread.title}」を削除しますか？`)) return;

    try {
        const response = await deleteThread(thread.id);
        if (response.success) {
            const isCurrentThread = String(ChatStream.currentThreadId) === String(thread.id);
            if (isCurrentThread) {
                ChatStream.setThreadId(null);
                ui.clearChatMessages();
                ui.clearInput();
                ui.showAgentSelection();
                ui.hideMessagesContainer();
                window.history.pushState({}, '', '/chat');
            }

            showToast('スレッドを削除しました', 'success');
            await loadThreadList();
        }
    } catch (error) {
        console.error('Failed to delete thread: ', error);
        showToast('スレッドの削除に失敗しました');
    }
}

function openHistoryMenuPopup(thread, menuButton) {
    closeHistoryMenuPopup();

    const popup = document.createElement('div');
    popup.className = 'history-menu-popup';
    const parentCard = menuButton.closest('.history-card');
    if (!parentCard) return;

    const editButton = document.createElement('button');
    editButton.className = 'history-menu-item';
    editButton.type = 'button';
    editButton.textContent = '編集';
    editButton.addEventListener('click', async (event) => {
        event.stopPropagation();
        closeHistoryMenuPopup();
        await handleThreadRename(thread);
    });

    const deleteButton = document.createElement('button');
    deleteButton.className = 'history-menu-item danger';
    deleteButton.type = 'button';
    deleteButton.textContent = '削除';
    deleteButton.addEventListener('click', async (event) => {
        event.stopPropagation();
        closeHistoryMenuPopup();
        await handleThreadDelete(thread);
    });

    popup.appendChild(editButton);
    popup.appendChild(deleteButton);

    popup.addEventListener('click', (event) => {
        event.stopPropagation();
    });

    parentCard.appendChild(popup);

    activeMenuPopup = popup;
}

function renderRagHistoryBanner(documentTitle) {
    const safeTitle = documentTitle || 'このドキュメント';
    const banner = document.createElement('div');
    banner.className = 'rag-history-banner';
    banner.textContent = `${safeTitle}に対する質問チャットです`;
    dom.chatContainer.appendChild(banner);
}

export async function loadMessages(threadId) {
    if (!threadId) return;

    try {
        ui.hideAgentSelection();
        ui.showMessagesContainer();
        const res = await getThreadMessages(threadId);
        const data = res?.data;
        const messages = Array.isArray(data)
            ? data
            : (data?.messages ?? []);
        const threadMeta = Array.isArray(data)
            ? null
            : (data?.thread ?? null);

        // ChatStreamのcurrentThreadIdを設定
        ChatStream.setThreadId(threadId);

        dom.chatContainer.innerHTML = '';
        if (threadMeta?.mode === 'rag') {
            renderRagHistoryBanner(threadMeta.documentTitle);
        }

        messages.forEach(msg => {
            const messageDiv = ui.addMessage(msg.sender, msg.content, {
                messageId: msg.id,
                rating: msg.rating
            });
            if (msg.sender === 'assistant' && Array.isArray(msg.references) && msg.references.length > 0) {
                ui.renderReferenceButtons(messageDiv, msg.references);
            }
        });
    } catch (error) {
        console.error('Failed to load hisotry: ', error);
        showToast('履歴の読み込みに失敗しました');
    }
};

export async function loadThreadList() {
    try {
        ensureHistoryMenuListeners();
        closeHistoryMenuPopup();
        const res = await getThreads();
        const threads = Array.isArray(res?.data)
            ? res.data
            : (res?.data?.threads ?? []);

        if (dom.contentHistory) {
            dom.contentHistory.innerHTML = '';
            threads.forEach(thread => {
                const div = document.createElement('div');
                div.className = 'history-card';
                div.dataset.id = thread.id;
                
                const leftDiv = document.createElement('div');
                leftDiv.className = 'history-left';
                
                const dateSpan = document.createElement('span');
                const date = new Date(thread.created_at)
                dateSpan.textContent = date.toISOString().split('T')[0];

                const titleSpan = document.createElement('span');
                titleSpan.className = 'history-title';

                const modeIconSpan = document.createElement('span');
                modeIconSpan.className = 'history-mode-icon';
                modeIconSpan.textContent = thread.mode === 'rag' ? '📄' : '💬';

                titleSpan.appendChild(modeIconSpan);
                titleSpan.appendChild(document.createTextNode(thread.title));
                leftDiv.appendChild(dateSpan);
                leftDiv.appendChild(titleSpan);

                const menu = document.createElement('div');
                menu.className = 'btn history-menu';
                menu.textContent = '︙';
                menu.addEventListener('click', (event) => {
                    event.stopPropagation();

                    if (activeMenuPopup && activeMenuPopup.parentElement === div) {
                        closeHistoryMenuPopup();
                        return;
                    }

                    openHistoryMenuPopup(thread, menu);
                });

                div.appendChild(leftDiv);
                div.appendChild(menu);

                div.addEventListener('click', () => {
                    document.querySelectorAll('.history-card').forEach(el => el.classList.remove('active'));
                    div.classList.add('active');

                    loadMessages(thread.id);

                    document.dispatchEvent(new CustomEvent('threadSelected', { detail: { threadId: thread.id } }));
                });

                dom.contentHistory.appendChild(div);
            });
        }
    } catch (error) {
        console.error('Failed to load thread list: ', error);
    }
}