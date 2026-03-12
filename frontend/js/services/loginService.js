import { ApiClient } from "../common/apiClient.js";

// ログイン処理: 機能ID FN-A01
export async function fetchLogin(dataObject) {
    const endpoint = '/api/v1/auth/login';
    const body = {
        employee_no: dataObject.employee_no,
        email: dataObject.email,
        password: dataObject.password
    };

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        const data = await response.json();
        if (!response.ok) {
            return {
                success: false,
                message: data.message || 'ログイン処理でエラーが発生しました',
                statusCode: response.status,
                shouldRedirectToSignup: Boolean(data.shouldRedirectToSignup),
                prefill: data.prefill || null,
                errorCode: data.errorCode || null
            };
        }

        return data;
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
        const result = await ApiClient.get(endpoint);
        return {
            success: Boolean(result?.user),
            user: result?.user ?? null
        };
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

export async function portfolioRegistration(dataObject) {
    const endpoint = '/auth/portfolio-register';
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