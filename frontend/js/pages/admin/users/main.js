import { userService } from "../../../services/userService.js";
import { userTableUI } from "./userTable.ui.js";
import { userModalUI } from "./userModal.ui.js";
import { showToast } from "../../../common/toast.js";

document.addEventListener('DOMContentLoaded', () => {
    const user_Service = new userService();
    let currentEditId = null;

    // テーブルUIの初期化
    const tableUI = new userTableUI({
        onEdit: async (userId) => {
            // TODO: 本来は API でユーザー詳細を取得するか、保持している配列から検索する
            // const user = await userService.getUser(userId);
            
            // 仮のデータ
            const dummyUser = { employee_no: '123456', username: '山田 太郎', email: 'taro.yamada@company.com', department: '開発部', role: 'admin' };
            currentEditId = userId;
            modalUI.open('edit', dummyUser);
        },
        onDelete: async (userId) => {
            if (confirm('このユーザーを削除（または無効化）してもよろしいですか？')) {
                try {
                    // await userService.deleteUser(userId);
                    showToast('ユーザーを削除しました。', 'success');
                    // loadUsers(); // テーブル再描画
                } catch (error) {
                    showToast('削除に失敗しました。', 'error');
                }
            }
        }
    });

    // モーダルUIの初期化
    const modalUI = new userModalUI({
        onSaveSingle: async (userData) => {
            try {
                if (currentEditId) {
                    // 更新処理
                    // await userService.updateUser(currentEditId, userData);
                    showToast('ユーザー情報を更新しました。', 'success');
                } else {
                    // 新規登録処理
                    // await userService.createUser(userData);
                    showToast('ユーザーを登録しました。', 'success');
                }
                modalUI.close();
                // loadUsers(); // テーブル再描画
            } catch (error) {
                showToast(error.message || '保存に失敗しました。', 'error');
            }
        },
        onSaveCsv: async (file) => {
            try {
                // await userService.uploadCsv(file);
                showToast(`CSV (${file.name}) からユーザーを登録しました。`, 'success');
                modalUI.close();
                // loadUsers(); // テーブル再描画
            } catch (error) {
                showToast(error.message || 'CSVアップロードに失敗しました。', 'error');
            }
        }
    });

    // 「新規ユーザー登録」ボタンのイベント
    document.getElementById('btn-create-user').addEventListener('click', () => {
        currentEditId = null;
        modalUI.open('create');
    });

    // 初期ロード関数（API実装後に有効化）
    /*
    async function loadUsers() {
        try {
            const users = await userService.getUsers();
            tableUI.render(users);
        } catch (error) {
            showToast('ユーザー一覧の取得に失敗しました。', 'error');
        }
    }
    loadUsers();
    */
});