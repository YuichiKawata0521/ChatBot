import express from 'express';
import { generateToken, doubleCsrfProtection } from '../config/csrf.js';
import loginRoutes from './loginRoutes.js';

const router = express.Router();

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