import * as ui from './ui.chat.js';
import { dom } from './ui.chat.js';
import { ApiClient } from '../../common/apiClient.js';
import { showToast } from '../../common/toast.js'

export async function loadMessages(threadId) {
    if (!threadId) return;

    try {
        const endpoint = `/api/v1/chat/${threadId}`
        const res = await ApiClient.get(endpoint);
        const messages = res.data.data.messages;

        dom.chatContainer.innerHTML = '';
        messages.forEach(msg => {
            ui.addMessage(msg.sender, msg.content);
        });
    } catch (error) {
        console.error('Failed to load hisotry: ', error);
        showToast('履歴の読み込みに失敗しました');
    }
};