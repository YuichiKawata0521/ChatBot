import { authMe } from '../services/loginService.js';

const LOGIN_PATH = '/login';

function buildReturnPath() {
    return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

export async function requireAuth() {
    const result = await authMe();
    if (result?.success || result?.user) {
        return true;
    }

    sessionStorage.setItem('returnToPage', buildReturnPath());
    window.location.replace(LOGIN_PATH);
    return false;
}
