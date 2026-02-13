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
