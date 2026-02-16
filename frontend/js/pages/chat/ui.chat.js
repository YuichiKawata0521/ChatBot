import { marked } from 'marked';

export const dom = {
    get logout() { return document.getElementById('logout');},
    get chatContainer() { return document.getElementById('chat-messages');},
    get messageInput() { return document.getElementById('message-input');},
    get sendBtn() { return document.getElementById('send-btn');},
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
}