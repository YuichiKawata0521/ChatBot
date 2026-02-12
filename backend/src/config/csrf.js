import { doubleCsrf } from "csrf-csrf";

const CSRF_SECRET = process.env.CSRF_SECRET || 'complex_secret_key_for_csrf';
const COOKIE_NAME = "x-csrf-token";

const {
    invalidCsrfTokenError,
    generateCsrfToken,
    doubleCsrfProtection
} = doubleCsrf({
    getSecret: () => CSRF_SECRET,
    getSessionIdentifier: (req) => req.session.id,
    cookieName: COOKIE_NAME,
    cookieOptions: {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/'
    },
    size: 64,
    ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
    getTokenFromRequest: (req) => req.headers['x-csrf-token']
});

export {
    invalidCsrfTokenError,
    generateCsrfToken as generateToken,
    doubleCsrfProtection
};