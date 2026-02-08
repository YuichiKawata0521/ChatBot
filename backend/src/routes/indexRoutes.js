import express from 'express';
import { doubleCsrf } from 'csrf-csrf';
import loginRoutes from './loginRoutes.js';

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
    '/auth/login',
];

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

router.use('/auth', loginRoutes);
export default router;