import * as ui from './ui.chat.js';
import { dom } from './ui.chat.js';
import { showToast } from '../../common/toast.js'
import { ChatStream } from './stream.chat.js';
import { getThreadMessages, getThreads } from '../../services/chatService.js';

let currentThreadId = null;

export async function loadMessages(threadId) {
    if (!threadId) return;

    try {
        const res = await getThreadMessages(threadId);
        const messages = res.data.messages;

        // ChatStreamのcurrentThreadIdを設定
        ChatStream.setThreadId(threadId);

        dom.chatContainer.innerHTML = '';
        messages.forEach(msg => {
            ui.addMessage(msg.sender, msg.content);
        });
    } catch (error) {
        console.error('Failed to load hisotry: ', error);
        showToast('履歴の読み込みに失敗しました');
    }
};

export async function loadThreadList() {
    try {
        const res = await getThreads();
        const threads = res.data.threads;

        if (dom.sidebar) {
            dom.sidebar.innerHTML = '';
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
                titleSpan.textContent = thread.title;
                leftDiv.appendChild(dateSpan);
                leftDiv.appendChild(titleSpan);

                const menu = document.createElement('div');
                menu.className = 'btn history-menu';
                menu.textContent = '︙';

                div.appendChild(leftDiv);
                div.appendChild(menu);

                div.addEventListener('click', () => {
                    document.querySelectorAll('.history-card').forEach(el => el.classList.remove('active'));
                    div.classList.add('active');

                    loadMessages(thread.id);

                    document.dispatchEvent(new CustomEvent('threadSelected', { detail: { threadId: thread.id } }));
                });

                dom.sidebar.appendChild(div);
            });
        }
    } catch (error) {
        console.error('Failed to load thread list: ', error);
    }
}