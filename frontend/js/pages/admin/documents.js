import { ApiClient } from '../../common/apiClient.js';
import { showToast } from '../../common/toast.js';

let currentMode = 'text';

function switchMode(mode) {
    currentMode = mode;
    const tabText = document.getElementById('tab-text');
    const tabFile = document.getElementById('tab-file');
    const sectionText = document.getElementById('form-section-text');
    const sectionFile = document.getElementById('form-section-file');

    if (mode === 'text') {
        sectionText.style.display = 'block';
        sectionFile.style.display = 'none';
        tabText?.classList.add('active');
        tabFile?.classList.remove('active');
    } else {
        sectionText.style.display = 'none';
        sectionFile.style.display = 'block';
        tabText?.classList.remove('active');
        tabFile?.classList.add('active');
    }
}

async function uploadDocumentFile(file) {
    const formData = new FormData();
    formData.append('file', file);

    const response = ApiClient.post('/documents/upload', {body: formData});

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.message || 'ファイルアップロードに失敗しました');
    }

    return data;
}

document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('modal-doc-manage');
    const openBtn = document.getElementById('btn-doc-manage');
    const closeBtn = document.getElementById('close-doc-modal');
    const saveBtn = document.getElementById('save-doc-btn');
    const tabText = document.getElementById('tab-text');
    const tabFile = document.getElementById('tab-file');
    const titleInput = document.getElementById('doc-title');
    const contentInput = document.getElementById('doc-content');
    const fileInput = document.getElementById('doc-file-input');
    const loading = document.getElementById('upload-loading');

    openBtn?.addEventListener('click', () => {
        modal.style.display = 'flex';
        switchMode('text');
    });

    closeBtn?.addEventListener('click', () => {
        modal.style.display = 'none';
        titleInput.value = '';
        contentInput.value = '';
    });

    tabText?.addEventListener('click', () => switchMode('text'));
    tabFile?.addEventListener('click', () => switchMode('file'));

    saveBtn?.addEventListener('click', async () => {
        try {
            saveBtn.disabled = true;

            if (currentMode === 'text') {
                const title = titleInput.value.trim();
                const content = contentInput.value.trim();

                if (!title || !content) {
                    alert('タイトルと本文は必須です');
                    return;
                }

                saveBtn.textContent = '保存中...';

                await ApiClient.post('/documents', {
                    title,
                    content,
                    source: 'markdown'
                });

                showToast('ドキュメントを保存しました', 'success');
                titleInput.value = '';
                contentInput.value = '';
            } else {
                const file = fileInput.files?.[0];
                if (!file) {
                    alert('アップロードするファイルを選択してください');
                    return;
                }

                saveBtn.textContent = 'アップロード中...';
                loading.style.display = 'block';

                await uploadDocumentFile(file);
                showToast('ファイルをアップロードして解析を開始しました', 'success');
                fileInput.value = '';
            }

            modal.style.display = 'none';
        } catch (error) {
            console.error(error);
            alert('保存に失敗しました: ' + error.message);
        } finally {
            loading.style.display = 'none';
            saveBtn.disabled = false;
            saveBtn.textContent = '保存して解析開始';
        }
    });

    switchMode('text');
});