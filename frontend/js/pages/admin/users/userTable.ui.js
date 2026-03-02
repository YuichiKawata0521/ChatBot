export class userTableUI {
    constructor(callbacks) {
        this.tbody = document.querySelector('.data-table tbody');
        this.callbacks = callbacks;
        this._initEvents();
    }

    _initEvents() {
        if (!this.tbody) return;

        this.tbody.addEventListener('click', (e) => {
            const btn = e.target.closest('.btn-icon');
            if (!btn) return;

            const tr = btn.closest('tr');
            const userId = tr.dataset.id || 'dummy_id';

            if (btn.classList.contains('edit')) {
                this.callbacks.onEdit(userId);
            } else if (btn.classList.contains('delete')) {
                this.callbacks.onDelete(userId);
            }
        });
    }

    render(users) {
        if (!this.tbody) return;

        // テーブルの中身を一旦クリア
        this.tbody.innerHTML = '';

        // ユーザーデータがない場合の表示
        if (!users || users.length === 0) {
            this.tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">ユーザーが登録されていません。</td></tr>';
            return;
        }

        // ユーザーデータをもとに行(tr)を生成
        users.forEach(user => {
            const tr = document.createElement('tr');
            // _initEvents でクリック時にIDを取得できるように dataset にセット
            tr.dataset.id = user.id; 

            const role = String(user.role || '').toLowerCase();
            const roleBadgeClass = role === 'admin' ? 'role-admin' : 'role-user';
            const roleText = role === 'admin' ? 'Admin' : 'User';

            const isActive = user.deleted_at == null;
            const statusClass = isActive ? 'active' : '';
            const statusText = isActive ? '有効' : '無効';

            if (!isActive) {
                tr.classList.add('row-inactive');
            }

            tr.innerHTML = `
                <td>${this._escapeHTML(user.employee_no)}</td>
                <td>${this._escapeHTML(user.username)}</td>
                <td>${this._escapeHTML(user.email)}</td>
                <td>${this._escapeHTML(user.department)}</td>
                <td><span class="badge ${roleBadgeClass}">${roleText}</span></td>
                <td><span class="status-dot ${statusClass}"></span> ${statusText}</td>
                <td>
                    <button class="btn-icon edit" title="編集"><i class="fas fa-edit"></i></button>
                    <button class="btn-icon delete" title="削除"><i class="fas fa-trash-alt"></i></button>
                </td>
            `;

            this.tbody.appendChild(tr);
        });
    }

    // XSS対策用のシンプルなエスケープ処理（必要に応じてクラス内に追加してください）
    _escapeHTML(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
}