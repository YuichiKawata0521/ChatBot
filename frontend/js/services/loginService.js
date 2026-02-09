import { ApiClient } from "../common/apiClient.js";

// ログイン処理: 機能ID FN-A01
export async function fetchLogin(dataObject) {
    const endpoint = '/auth/login';
    const body = {
        employee_no: dataObject.employee_no,
        email: dataObject.email,
        password: dataObject.password
    }

    try {
        return await ApiClient.post(endpoint, body);
    } catch (error) {
        return {
            success: false,
            message: error.message || 'ログイン処理でエラーが発生しました',
            statusCode: error.statusCode
        };
    }
}


// ログアウト処理: 機能ID FN-A04 (05ドキュメントに追加する)
export async function logout() {
    const endpoint = '/auth/logout';
    try {
        await ApiClient.post(endpoint, {});
        return {success: true, message: 'ログアウトしました'};
    } catch (error) {
        return {
            success: false,
            message: error.message || 'ログアウト処理でエラーが発生しました',
            statusCode: error.statusCode
        };
    }
}

export async function authMe() {
    const endpoint = '/auth/me';
    try {
        return await ApiClient.get(endpoint);
    } catch (error) {
        return {
            success: false,
            message: error.message || '認証されていません',
            statusCode: error.statusCode
        }
    };
}

// 新規登録: 機能ID FN-A02
export async function registration(dataObject) {
    const endpoint = '/auth/register';
    try {
        return await ApiClient.post(endpoint, dataObject);
    } catch (error) {
        return {
            success: false,
            message: error.message || '新規登録失敗',
            statusCode: error.statusCode
        };
    }
} 