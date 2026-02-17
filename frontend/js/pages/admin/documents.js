import { ApiClient } from '../../common/apiClient.js';
import { showToast } from '../../common/toast.js';

document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('modal-doc-manage');
    const openBtn = document.getElementById('btn-doc-manage');
    const closeBtn = document.getElementById('close-doc-modal');
    const saveBtn = document.getElementById('save-doc-btn');

    // モーダル開閉
    openBtn?.addEventListener('click', () => modal.style.display = 'flex');
    closeBtn?.addEventListener('click', () => modal.style.display = 'none');

    // 保存処理
    saveBtn?.addEventListener('click', async () => {
        const title = document.getElementById('doc-title').value;
        const content = document.getElementById('doc-content').value;

        if (!title || !content) {
            alert('タイトルと本文は必須です');
            return;
        }

        try {
            saveBtn.disabled = true;
            saveBtn.textContent = '保存中...';

            await ApiClient.post('/documents', {
                title: title,
                content: content,
                source: 'markdown' // 今回はテキスト入力なのでmarkdown扱いとする
            });

            showToast('ドキュメントを保存しました', 'success');
            modal.style.display = 'none';
            
            // 入力リセット
            document.getElementById('doc-title').value = '';
            document.getElementById('doc-content').value = '';

        } catch (error) {
            console.error(error);
            alert('保存に失敗しました: ' + error.message);
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = '保存して解析開始';
        }
    });
});