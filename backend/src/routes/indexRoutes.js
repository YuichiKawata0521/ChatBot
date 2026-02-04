import express from 'express';
import { doubleCsrf } from 'csrf-csrf';
import loginLimiter from '../middlewares/loginMiddleware.js';
// import loginRoutes from './api/loginRoutes.js'; // 例

const router = express.Router();
const {
    doubleCsrfProtection, // CSRF検証を行うミドルウェア
    generateToken         // トークン生成関数
} = doubleCsrf({
    getSecret: () => process.env.CSRF_SECRET || 'secret-key-keep-it-safe', // 本番環境では必ず環境変数を使用
    cookieName: 'x-csrf-token', // クッキー名
    cookieOptions: {
        httpOnly: true,
        sameSite: 'lax', // または 'strict'
        secure: process.env.NODE_ENV === 'production', // 本番環境ではtrue
        path: '/',
    },
    size: 64,
    ignoredMethods: ['GET', 'HEAD', 'OPTIONS'], // 検証を除外するメソッド
    getTokenFromRequest: (req) => req.headers['x-csrf-token'], // ヘッダーからトークンを取得
});

const csrfExcludePaths = [
    '/login/login',
    '/login/change-password'
];

router.use((req, res, next) => {
    if (req.path === '/login/login') {
        return loginLimiter(req, res, next);
    }
    next();
});

// CSRF保護ミドルウェアの適用
router.use((req, res, next) => {
    // 除外パスの場合はスキップ
    if (csrfExcludePaths.includes(req.path)) {
        return next();
    }
    // それ以外はチェックを実行
    doubleCsrfProtection(req, res, next);
});

// フロントエンドにCSRFトークンを返すエンドポイント
router.get('/csrf-token', (req, res) => {
    // トークンを生成してレスポンスに含める（同時にCookieにもセットされます）
    const csrfToken = generateToken(req, res);
    res.json({ csrfToken });
});

// router.use('/login', loginRoutes); // 例

export default router;