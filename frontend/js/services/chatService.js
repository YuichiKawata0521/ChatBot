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