import { dom, clearInput } from './ui.chat.js';
import { showToast } from '../../common/toast.js';

export function initInputHandlers(onSend) {
    const messageInput = dom.messageInput;
    const sendBtn = dom.sendBtn;

    if (!messageInput || !sendBtn) return;

    sendBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        const message = messageInput.value.trim();
        if (!message) {
            showToast('入力が空です');
            return;
        }
        await onSend(message);
        clearInput();
    });

    messageInput.addEventListener('keydown', async (e) => {
        if (e.isComposing) {
            return;
        }

        if (e.key === 'Enter') {
            if (e.shiftKey) {
                e.preventDefault();
                const start = messageInput.selectionStart;
                const end = messageInput.selectionEnd;
                messageInput.value = messageInput.value.substring(0, start) + '\n' + messageInput.value.substring(end);
                messageInput.selectionStart = messageInput.selectionEnd = start + 1;
                resizeTextarea();
            } else {
                e.preventDefault();
                const message = messageInput.value.trim();
                if (message) {
                    await onSend(message);
                    clearInput();
                }
            }
        }
    });

    messageInput.addEventListener('input', resizeTextarea);

    function resizeTextarea() {
        // style-src 'self' 環境では element.style の更新を避ける
    }
}
