import { dom, closeSettingsMenu, createAdminMenuItem, clearChatMessages, toggleSettingsMenu } from './ui.chat.js';
import { showToast } from '../../common/toast.js';
import { deleteAllThreads, getSessionInfo } from '../../services/chatService.js';
import { loadThreadList } from './history.chat.js';

const ADMIN_PATH = '/admin';

export function initSettingsMenu() {
    const settingsBtn = dom.settingBtn;
    const settingsMenu = dom.settingMenu;

    if (settingsBtn && settingsMenu) {
        settingsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleSettingsMenu();
        });

        document.addEventListener('click', (e) => {
            if (!settingsBtn.contains(e.target) && !settingsMenu.contains(e.target)) {
                closeSettingsMenu();
            }
        });
    }

    const changePasswordBtn = dom.changePWBtn;
    if (changePasswordBtn) {
        changePasswordBtn.addEventListener('click', () => {
            window.location.href = '/pages/change_password.html';
        });
    }

    const deleteHistoryBtn = dom.deleteHistoryBtn;
    if (deleteHistoryBtn) {
        deleteHistoryBtn.addEventListener('click', async () => {
            if (!confirm('すべての会話履歴を削除してもよろしいですか？この操作は取り消せません。')) {
                return;
            }

            try {
                await deleteAllThreads();
                showToast('履歴を削除しました');
                clearChatMessages();
                loadThreadList();
                closeSettingsMenu();
            } catch (error) {
                console.error('Delete history error:', error);
                showToast('エラーが発生しました');
            }
        });
    }
}

export async function initializeAdminMenu() {
    try {
        const data = await getSessionInfo();
        if (data.user?.role === 'admin') {
            createAdminMenuItem(() => {
                window.location.href = ADMIN_PATH;
            });
        }
    } catch (error) {
        console.error('Failed to initialize settings menu:', error);
    }
}
