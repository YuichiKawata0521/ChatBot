import { ApiClient } from '../../common/apiClient.js';
import { showToast } from '../../common/toast.js';

document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.getElementById('docs-table-body');
    const btnReload = document.getElementById('btn-reload');

    // モーダル要素
    const modalPreview = document.getElementById('modal-preview');
    const modalRename = document.getElementById('modal-rename');
    const modalReupload = document.getElementById('modal-reupload');

    // 初期ロード
    loadDocuments();

    btnReload.addEventListener('click', loadDocuments);

    // --- 1. ドキュメント一覧の取得と描画 ---
    async function loadDocuments() {
        try {
            tableBody.innerHTML = '<tr><td colspan="6" class="text-center">読み込み中...</td></tr>';
            const response = await ApiClient.get('/documents');
            const docs = response.data || [];
            
            if (docs.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="6" class="text-center">登録されたドキュメントはありません。</td></tr>';
                return;
            }

            tableBody.innerHTML = '';
            docs.forEach(doc => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td class="docs-title-break">${doc.title}</td>
                    <td>${doc.source.toUpperCase()}</td>
                    <td><span class="status-badge status-${doc.status}">${getStatusText(doc.status)}</span></td>
                    <td>${new Date(doc.uploaded_at).toLocaleString('ja-JP')}</td>
                    <td class="action-buttons">
                        <button class="btn-icon view-btn" data-id="${doc.id}" title="プレビュー"><i class="fa-solid fa-file-lines"></i></button>
                        <button class="btn-icon rename-btn" data-id="${doc.id}" data-title="${doc.title}" title="タイトル変更"><i class="fa-solid fa-pen"></i></button>
                        <button class="btn-icon upload-btn" data-id="${doc.id}" title="再アップロード"><i class="fa-solid fa-upload"></i></button>
                        <button class="btn-icon delete delete-btn" data-id="${doc.id}" title="削除"><i class="fa-solid fa-trash"></i></button>
                    </td>
                `;
                tableBody.appendChild(tr);
            });

            attachActionListeners();
        } catch (error) {
            console.error(error);
            showToast('一覧の取得に失敗しました', 'error');
            tableBody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">エラーが発生しました。</td></tr>';
        }
    }

    function getStatusText(status) {
        const map = {
            'processing': '処理中',
            'completed': '完了',
            'failed': 'エラー',
            'pending': '待機中'
        };
        return map[status] || status;
    }

    // --- 2. 各種ボタンのイベントリスナー付与 ---
    function attachActionListeners() {
        // プレビュー
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.dataset.id;
                try {
                    const res = await ApiClient.get(`/documents/${id}`);
                    document.getElementById('preview-content').value = res.content || 'テキストがありません。';
                    modalPreview.hidden = false;
                } catch (error) {
                    showToast('プレビューの取得に失敗しました', 'error');
                }
            });
        });

        // タイトル変更（モーダルを開く）
        document.querySelectorAll('.rename-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                const title = e.currentTarget.dataset.title;
                document.getElementById('rename-doc-id').value = id;
                document.getElementById('rename-title-input').value = title;
                modalRename.hidden = false;
            });
        });

        // 再アップロード（モーダルを開く）
        document.querySelectorAll('.upload-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.getElementById('reupload-doc-id').value = e.currentTarget.dataset.id;
                document.getElementById('reupload-file-input').value = '';
                modalReupload.hidden = false;
            });
        });

        // 削除
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.dataset.id;
                if (!confirm(`ドキュメント(ID: ${id})を削除しますか？\n※関連するベクトルデータも削除されます。`)) return;

                try {
                    await ApiClient.post(`/documents/delete/${id}`);
                    showToast('削除しました', 'success');
                    loadDocuments(); // 一覧リロード
                } catch (error) {
                    showToast('削除に失敗しました', 'error');
                }
            });
        });
    }

    // --- 3. モーダル内のアクション実行処理 ---
    
    // タイトル変更の保存
    document.getElementById('btn-save-rename').addEventListener('click', async () => {
        const id = document.getElementById('rename-doc-id').value;
        const newTitle = document.getElementById('rename-title-input').value.trim();
        
        if (!newTitle) return alert('タイトルを入力してください');

        try {
            await ApiClient.post(`/documents/rename/${id}`, { title: newTitle });
            showToast('タイトルを変更しました', 'success');
            modalRename.hidden = true;
            loadDocuments();
        } catch (error) {
            showToast('タイトルの変更に失敗しました', 'error');
        }
    });

    // 再アップロードの実行
    document.getElementById('btn-save-reupload').addEventListener('click', async (e) => {
        const id = document.getElementById('reupload-doc-id').value;
        const fileInput = document.getElementById('reupload-file-input');
        const file = fileInput.files[0];
        
        if (!file) return alert('ファイルを選択してください');

        const btn = e.currentTarget;
        const originalText = btn.textContent;
        btn.textContent = '処理中...';
        btn.disabled = true;

        try {
            const formData = new FormData();
            formData.append('file', file);
            await ApiClient.post(`/documents/file/${id}`, formData);
            
            showToast('再アップロードと解析が完了しました', 'success');
            modalReupload.hidden = true;
            loadDocuments();
        } catch (error) {
            console.error(error);
            showToast('再アップロードに失敗しました', 'error');
        } finally {
            btn.textContent = originalText;
            btn.disabled = false;
        }
    });

    // モーダルを閉じる処理
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.target.closest('.modal-overlay').hidden = true;
        });
    });
});