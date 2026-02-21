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

    return await ApiClient.post('/documents/upload', formData);
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
    const uploadArea = document.getElementById('upload-area');
    const defaultUi = document.getElementById('upload-default-ui');
    const previewUi = document.getElementById('upload-preview-ui');
    const previewIcon = document.getElementById('preview-icon');
    const previewName = document.getElementById('preview-name');
    const btnClearFile = document.getElementById('btn-clear-file');
    function updateFilePreview(file) {
        if (!file) {
            defaultUi.style.display = 'block';
            previewUi.style.display = 'none';
            fileInput.value = ''; 
            return;
        }

        const extension = file.name.split('.').pop().toLowerCase();
        let iconClass = 'fa-file';
        let iconColor = '#6c757d';

        // 拡張子によってアイコンと色を変更
        if (extension === 'pdf') {
            iconClass = 'fa-file-pdf';
            iconColor = '#e2574c'; // 赤系
        } else if (['doc', 'docx'].includes(extension)) {
            iconClass = 'fa-file-word';
            iconColor = '#2b579a'; // 青系
        } else if (['ppt', 'pptx'].includes(extension)) {
            iconClass = 'fa-file-powerpoint';
            iconColor = '#d24726'; // オレンジ系
        } else if (['md', 'txt'].includes(extension)) {
            iconClass = 'fa-file-lines';
            iconColor = '#4a5568'; // グレー系
        }

        previewIcon.className = `fa-solid ${iconClass} fa-3x`;
        previewIcon.style.color = iconColor;
        previewName.textContent = file.name;

        defaultUi.style.display = 'none';
        previewUi.style.display = 'block';
    }

    // --- 追加：ファイル選択時のイベント ---
    fileInput?.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        updateFilePreview(file);
    });

    // --- 追加：ドラッグ＆ドロップのイベント ---
    uploadArea?.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.style.backgroundColor = '#f0f8ff'; // ドラッグ中の背景色変更
        uploadArea.style.borderColor = '#007bff';
    });

    uploadArea?.addEventListener('dragleave', (e) => {
        e.preventDefault();
        uploadArea.style.backgroundColor = ''; // 元に戻す
        uploadArea.style.borderColor = '';
    });

    uploadArea?.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.style.backgroundColor = '';
        uploadArea.style.borderColor = '';
        
        if (e.dataTransfer?.files?.length) {
            const file = e.dataTransfer.files[0];
            
            // input[type="file"] にドロップされたファイルをセットする
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            fileInput.files = dataTransfer.files;
            
            updateFilePreview(file);
        }
    });

    // --- 追加：ファイルクリアボタンのイベント ---
    btnClearFile?.addEventListener('click', () => {
        updateFilePreview(null);
    });
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