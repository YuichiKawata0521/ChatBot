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
        sectionText.hidden = false;
        sectionFile.hidden = true;
        tabText?.classList.add('active');
        tabFile?.classList.remove('active');
    } else {
        sectionText.hidden = true;
        sectionFile.hidden = false;
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
            defaultUi.hidden = false;
            previewUi.hidden = true;
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
        previewIcon.classList.remove('preview-icon-pdf', 'preview-icon-word', 'preview-icon-powerpoint', 'preview-icon-lines', 'preview-icon-default');
        if (extension === 'pdf') {
            previewIcon.classList.add('preview-icon-pdf');
        } else if (['doc', 'docx'].includes(extension)) {
            previewIcon.classList.add('preview-icon-word');
        } else if (['ppt', 'pptx'].includes(extension)) {
            previewIcon.classList.add('preview-icon-powerpoint');
        } else if (['md', 'txt'].includes(extension)) {
            previewIcon.classList.add('preview-icon-lines');
        } else {
            previewIcon.classList.add('preview-icon-default');
        }
        previewName.textContent = file.name;

        defaultUi.hidden = true;
        previewUi.hidden = false;
    }

    // --- 追加：ファイル選択時のイベント ---
    fileInput?.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        updateFilePreview(file);
    });

    // --- 追加：ドラッグ＆ドロップのイベント ---
    uploadArea?.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('is-dragover');
    });

    uploadArea?.addEventListener('dragleave', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('is-dragover');
    });

    uploadArea?.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('is-dragover');
        
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
        modal.hidden = false;
        switchMode('text');
    });

    closeBtn?.addEventListener('click', () => {
        modal.hidden = true;
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
                loading.hidden = false;

                await uploadDocumentFile(file);
                showToast('ファイルをアップロードして解析を開始しました', 'success');
                fileInput.value = '';
            }

            modal.hidden = true;
        } catch (error) {
            console.error(error);
            alert('保存に失敗しました: ' + error.message);
        } finally {
            loading.hidden = true;
            saveBtn.disabled = false;
            saveBtn.textContent = '保存して解析開始';
        }
    });

    switchMode('text');
});