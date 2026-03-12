import { showToast } from '../../common/toast.js';

function getCopyTextFromMessageRow(messageRow) {
    const bubble = messageRow?.querySelector('.message-bubble');
    if (!bubble) return '';

    const clone = bubble.cloneNode(true);
    clone.querySelectorAll('.reference-container').forEach((element) => {
        element.remove();
    });

    return clone.textContent?.trim() || '';
}

export async function copyMessage(messageRow) {
    const text = getCopyTextFromMessageRow(messageRow);
    if (!text) {
        showToast('コピー対象のテキストがありません');
        return;
    }

    try {
        await navigator.clipboard.writeText(text);
        showToast('コピーしました', 'success');
    } catch {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.className = 'copy-helper-textarea';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();

        const copied = document.execCommand('copy');
        document.body.removeChild(textarea);

        if (copied) {
            showToast('コピーしました', 'success');
        } else {
            showToast('コピーに失敗しました');
        }
    }
}
