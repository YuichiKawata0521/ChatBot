import * as ui from './ui.chat.js';
import { AppError } from '../../common/AppError.js';

export const ChatStream = {
    currentThreadId: null,

    async sendMessage(message) {
        ui.addMessage('user', message);
        ui.clearInput();

        const assistantMsgDiv = ui.addMessage('assistant', '');

        try {

            const token = await fetch('/api/v1/csrf-token', {
                credentials: 'include'
            });
            if (!token.ok) throw new Error('CSRF token fetch failed');
            const { csrfToken } = await token.json();

            const response = await fetch('/api/v1/chat/chat', {
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
                            if (data.type === 'meta' && data.threadId) {
                                this.updateThreadId(data.threadId);
                                continue;
                            }
                        } catch (error) {
                            accumulatedText += dataStr;
                        }
                    }
                }

                assistantMsgDiv.textContent = accumulatedText;
                ui.scrollToBottom();
            }
        } catch (error) {
            console.error('Stream error: ', error);
            assistantMsgDiv.textContent = 'エラーが発生しました';
        } 
    },

    updateThreadId(id) {
        if (this.currentThreadId !== id) {
            this.currentThreadId = id;
            window.history.pushState({}, '', `/chat/${id}`);
        }
    }
};