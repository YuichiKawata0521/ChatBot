import { ApiClient } from "../common/apiClient.js";

// ログアウト: 機能ID FN-A04
export async function logout() {
    const endpoint = '/auth/logout';
    try {
        return await ApiClient.post(endpoint, {});
    } catch (error) {
        return {
            success: false,
            message: error.message || 'ログアウトできませんでした',
            statusCode: error.statusCode
        };
    }
}

export async function getThreads() {
    const endpoint = '/chat/threads';
    return ApiClient.get(endpoint);
}

export async function getThreadMessages(threadId) {
    const endpoint = `/chat/${threadId}`;
    return ApiClient.get(endpoint);
}

export async function deleteAllThreads() {
    const endpoint = '/chat/delete-history';
    return ApiClient.post(endpoint, {});
}

export async function getSessionInfo() {
    const response = await fetch('/api/v1/csrf-token', {
        credentials: 'include'
    });

    if (!response.ok) {
        throw new Error('Failed to fetch session info');
    }

    return response.json();
}

export async function getDocuments() {
    return await ApiClient.get('/documents');
}

export async function createThread(title, documentId = null, modelName = 'gpt-4o-mini') {
    const endpoint = '/chat/threads';
    return await ApiClient.post(endpoint, {
        title,
        documentId,
        modelName
    });
}

export async function updateThreadTitle(threadId, title) {
    const endpoint = `/chat/threads/${threadId}`;
    return await ApiClient.put(endpoint, { title });
}

export async function deleteThread(threadId) {
    const endpoint = `/chat/threads/${threadId}`;
    return await ApiClient.delete(endpoint);
}

export async function updateMessageRating(messageId, rating) {
    const endpoint = `/chat/messages/${messageId}/rating`;
    return await ApiClient.put(endpoint, { rating });
}

export async function executeRDDAgent(interviewPayload) {
    const endpoint = '/chat/agent/rdd';
    return await ApiClient.post(endpoint, interviewPayload);
}