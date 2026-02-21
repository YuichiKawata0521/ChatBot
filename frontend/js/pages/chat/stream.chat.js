import * as ui from './ui.chat.js';
import { AppError } from '../../common/AppError.js';
import { marked } from 'https://cdn.jsdelivr.net/npm/marked/+esm';

export const ChatStream = {
    currentThreadId: null,

    setThreadId(id) {
        this.currentThreadId = id;
    },

    async sendMessage(message) {
        ui.addMessage('user', message);
        ui.clearInput();
        ui.switchOverlay('show');

        const assistantMsgDiv = ui.addMessage('assistant', '');
        let currentReferences = [];
        let overlayHiddenOnStream = false;

        try {

            const token = await fetch('/api/v1/csrf-token', {
                credentials: 'include'
            });
            if (!token.ok) throw new Error('CSRF token fetch failed');
            const { csrfToken } = await token.json();

            const response = await fetch('/api/v1/chat', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': csrfToken
                },
                body: JSON.stringify({
                    message,
                    threadId: this.currentThreadId,
                    modelName: 'gpt-4o-mini'
                })
            });

            if (!response.ok) throw new AppError('Network response was not ok');

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let accumulatedText = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });


                const lines = chunk.split('\n');
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const dataStr = line.replace('data: ', '').trim();
                        if (!dataStr) continue;

                        try {
                            const data = JSON.parse(dataStr);
                            if (typeof data === 'string') {
                                // 通常のテキストチャンク
                                accumulatedText += data;
                                if (!overlayHiddenOnStream && data.length > 0) {
                                    ui.switchOverlay('hide');
                                    overlayHiddenOnStream = true;
                                }
                            } else if (data.type === 'meta' && data.threadId) {
                                // メタデータ
                                this.updateThreadId(data.threadId);
                            } else if (data.type === 'reference') {
                                currentReferences = data.references;
                            } else if (data.type === 'error') {
                                // エラー
                                console.error('LLM Error:', data.error);
                            }
                        } catch (error) {
                            console.error('Parse error:', error, 'dataStr:', dataStr);
                        }
                    }
                }

                assistantMsgDiv.innerHTML = marked.parse(accumulatedText);

                ui.scrollToBottom();
            }
            if (currentReferences.length > 0) {
                ui.renderReferenceButtons(assistantMsgDiv, currentReferences);
            }
            ui.switchOverlay('hide');
        } catch (error) {
            console.error('Stream error: ', error);
            assistantMsgDiv.textContent = 'エラーが発生しました';
            ui.switchOverlay('hide');
        } 
    },

    updateThreadId(id) {
        if (this.currentThreadId !== id) {
            this.currentThreadId = id;
            window.history.pushState({}, '', `/chat/${id}`);
        }
    }
};