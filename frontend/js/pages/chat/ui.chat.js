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
    get overlay() { return document.getElementById('loading-overlay');},
    get agentSelectionArea() { return document.getElementById('agent-selection-area'); }
};

function createActionButton(action, iconName, label) {
    const button = document.createElement('button');
    button.type = 'button';
    if (action === 'bad') {
        button.className = 'message-action-btn bad';
    } else {
        button.className = 'message-action-btn';
    }
    button.dataset.action = action;
    button.title = label;
    button.setAttribute('aria-label', label);
    button.innerHTML = `<span class="material-symbols-outlined">${iconName}</span>`;
    return button;
}

function createMessageActions(role, options = {}) {
    if (role !== 'user' && role !== 'assistant') return null;

    const actionContainer = document.createElement('div');
    actionContainer.className = 'message-actions';

    const copyButton = createActionButton('copy', 'content_copy', 'コピー');
    if (role === 'assistant' && options.deferAssistantCopy) {
        copyButton.classList.add('hidden');
    }
    actionContainer.appendChild(copyButton);

    if (role === 'assistant') {
        const goodButton = createActionButton('good', 'thumb_up', 'good');
        actionContainer.appendChild(goodButton);

        const badButton = createActionButton('bad', 'thumb_down', 'bad');
        actionContainer.appendChild(badButton);
    }

    return actionContainer;
}

function applyRatingState(messageRow, rating) {
    const goodButton = messageRow.querySelector('.message-action-btn[data-action="good"]');
    const badButton = messageRow.querySelector('.message-action-btn[data-action="bad"]');
    if (!goodButton || !badButton) return;

    if (rating === 'good' || rating === 'bad') {
        messageRow.dataset.rating = rating;
    } else {
        delete messageRow.dataset.rating;
    }

    goodButton.classList.toggle('is-active', rating === 'good');
    badButton.classList.toggle('is-active', rating === 'bad');
}

export function setMessageMeta(contentDiv, { messageId, rating } = {}) {
    const messageRow = contentDiv?.closest('.message-row');
    if (!messageRow) return;

    if (messageId !== undefined && messageId !== null) {
        messageRow.dataset.messageId = String(messageId);
    }

    applyRatingState(messageRow, rating || null);
}

export function setMessageRating(messageRow, rating) {
    if (!messageRow) return;
    applyRatingState(messageRow, rating || null);
}

export function revealAssistantCopyButton(contentDiv) {
    const messageRow = contentDiv?.closest('.message-row');
    if (!messageRow) return;

    const copyButton = messageRow.querySelector('.message-action-btn[data-action="copy"]');
    if (!copyButton) return;

    copyButton.classList.remove('hidden');
}

export function addMessage(role, content, options = {}) {
    const chatContainer = dom.chatContainer;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message-row ${role}`;
    messageDiv.dataset.sender = role;

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-bubble';
    contentDiv.innerHTML = marked.parse(content);

    messageDiv.appendChild(contentDiv);

    const actionContainer = createMessageActions(role, options);
    if (actionContainer) {
        messageDiv.appendChild(actionContainer);
    }

    if (options.messageId !== undefined || options.rating !== undefined) {
        setMessageMeta(contentDiv, options);
    }
    
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

export function renderReferenceButtons(messageDiv, references) {
    let refContainer = messageDiv.querySelector('.reference-container');

    if (!refContainer) {
        refContainer = document.createElement('div');
        refContainer.className = 'reference-container';
        messageDiv.appendChild(refContainer);
    }

    refContainer.innerHTML = '<div class="ref-btn">参照情報</div>';

    references.forEach((ref, index) => {
        const details = document.createElement('details')

        const summary = document.createElement('summary');
        summary.textContent = `[${index + 1}] ${ref.title || 'ドキュメント'}`;

        const content = document.createElement('div');
        content.className = 'ref-content';
        content.innerHTML = marked.parse(ref.content);

        details.appendChild(summary);
        details.appendChild(content);
        refContainer.appendChild(details);
    })
}

export function switchOverlay(mode) {
    const overlay = dom.overlay;
    if (!overlay) return;

    if (mode === 'show') {
        overlay.classList.remove('hidden');
    } else {
        overlay.classList.add('hidden');
    }
}

export function showAgentSelection() {
    const area = dom.agentSelectionArea;
    if (!area) return;
    area.classList.remove('hidden');
}

export function hideAgentSelection() {
    const area = dom.agentSelectionArea;
    if (!area) return;
    area.classList.add('hidden');
}

export function showMessagesContainer() {
    const chatContainer = dom.chatContainer;
    if (!chatContainer) return;
    chatContainer.classList.remove('hidden');
}

export function hideMessagesContainer() {
    const chatContainer = dom.chatContainer;
    if (!chatContainer) return;
    chatContainer.classList.add('hidden');
}