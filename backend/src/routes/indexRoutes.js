import express from 'express';
import { generateToken, doubleCsrfProtection } from '../config/csrf.js';
import loginRoutes from './loginRoutes.js';
import chatRoutes from './chatRoutes.js';
import documentRoutes from './documentRoutes.js';

const router = express.Router();

const csrfExcludePaths = [
    '/auth/login',
    '/auth/register'
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
    const responseData = { csrfToken };
    
    // ユーザー情報がセッションにあれば含める
    if (req.session.user) {
        responseData.user = {
            id: req.session.user.id,
            role: req.session.user.role,
            email: req.session.user.email
        };
    }
    
    res.json(responseData);
});

router.use('/auth', loginRoutes);
router.use('/chat', chatRoutes);
router.use('/documents', documentRoutes);

export default router;