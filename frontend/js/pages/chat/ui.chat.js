import { marked } from 'marked';

export const dom = {
    get logout() { return document.getElementById('logout');},
    get chatContainer() { return document.getElementById('chat-messages');},
    get messageInput() { return document.getElementById('message-input');},
    get sendBtn() { return document.getElementById('send-btn');},
    get sidebar() { return document.getElementById('sidebar-content');},
    get home() { return document.getElementById('home-btn');},
    get menuToggle() { return document.getElementById('toggle-btn');},
    get body() { return document.getElementById('body-element');},
    get settingBtn() { return document.getElementById('settings-btn');},
    get settingMenu() { return document.getElementById('settings-menu');},
    get changePWBtn() { return document.getElementById('change-password-btn');},
    get deleteHistoryBtn() { return document.getElementById('delete-history-btn');},
}

export function addMessage(role, content) {
    const chatContainer = dom.chatContainer;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message-row ${role}`;

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-bubble';
    contentDiv.innerHTML = marked.parse(content);

    messageDiv.appendChild(contentDiv);
    
    chatContainer.appendChild(messageDiv);
    scrollToBottom();
    return contentDiv;
}

export function scrollToBottom() {
    const chatContainer = dom.chatContainer;
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

export function clearInput() {
    const input = dom.messageInput;
    input.value = '';
    resetInputHeight();
}

export function resetInputHeight() {
    const input = dom.messageInput;
    input.style.height = '';
}

export function clearChatMessages() {
    const chatContainer = dom.chatContainer;
    chatContainer.innerHTML = '';
}

export function setHeaderTitle(title) {
    const headerTitle = document.getElementById('header-title');
    if (headerTitle) {
        headerTitle.textContent = title;
    }
}

export function toggleSettingsMenu() {
    const settingsMenu = dom.settingMenu;
    if (settingsMenu) {
        settingsMenu.classList.toggle('hidden');
    }
}

export function closeSettingsMenu() {
    const settingsMenu = dom.settingMenu;
    if (settingsMenu) {
        settingsMenu.classList.add('hidden');
    }
}

export function createAdminMenuItem(onClick) {
    const settingsMenu = dom.settingMenu;
    const deleteHistoryBtn = dom.deleteHistoryBtn;

    if (!settingsMenu || !deleteHistoryBtn) return null;
    if (document.getElementById('admin-btn')) return document.getElementById('admin-btn');

    const adminBtn = document.createElement('button');
    adminBtn.id = 'admin-btn';
    adminBtn.className = 'settings-menu-item';
    adminBtn.textContent = '👨‍💼 管理画面';
    adminBtn.addEventListener('click', onClick);

    deleteHistoryBtn.insertAdjacentElement('afterend', adminBtn);
    return adminBtn;
}