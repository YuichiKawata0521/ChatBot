import { marked } from 'marked';

export const dom = {
    get logout() { return document.getElementById('logout');},
    get chatContainer() { return document.getElementById('chat-messages');},
    get messageInput() { return document.getElementById('message-input');},
    get sendBtn() { return document.getElementById('send-btn');},
    get home() { return document.getElementById('home-btn');},
    get menuToggle() { return document.getElementById('toggle-btn');},
    get body() { return document.getElementById('body-element');},
    get settingBtn() { return document.getElementById('settings-btn');},
    get settingMenu() { return document.getElementById('settings-menu');},
    get changePWBtn() { return document.getElementById('change-password-btn');},
    get deleteHistoryBtn() { return document.getElementById('delete-history-btn');},
    get tabHistory() { return document.getElementById('tab-history'); },
    get tabDocuments() { return document.getElementById('tab-documents'); },
    get contentHistory() { return document.getElementById('sidebar-content-history'); },
    get contentDocuments() { return document.getElementById('sidebar-content-documents'); },
};

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

export function switchSidebarTab(tabName) {
    if (tabName === 'history') {
        dom.tabHistory.classList.add('active');
        dom.tabDocuments.classList.remove('active');
        dom.contentHistory.classList.remove('hidden');
        dom.contentDocuments.classList.add('hidden');
    } else {
        dom.tabHistory.classList.remove('active');
        dom.tabDocuments.classList.add('active');
        dom.contentHistory.classList.add('hidden');
        dom.contentDocuments.classList.remove('hidden');
    }
}

export function renderDocumentsList(documents, onDocumentClick) {
    const container = dom.contentDocuments;
    container.innerHTML = '';

    if (documents.length === 0) {
        container.innerHTML = '<div style="padding:10px; color:#888">ドキュメントがありません</div>';
        return;
    }

    const list = document.createElement('div');
    list.className = 'document-list';

    documents.forEach(doc => {
        const item = document.createElement('div');
        item.className = 'document-item';
        item.innerHTML = `
            <span class="doc-icon">📄</span>
            <span class="doc-title">${doc.title}</span>
        `;
        
        item.addEventListener('click', () => onDocumentClick(doc));
        list.appendChild(item);
    });

    container.appendChild(list);
}