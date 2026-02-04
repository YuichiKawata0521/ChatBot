import express from 'express';
import csrf from 'csurf';
import loginLimiter from '../middlewares/loginMiddleware';
// import loginRoutes from './api/loginRoutes.js'; // 例

const router = express.Router();
const csrfProtection = csrf();

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

router.use((req, res, next) => {
    if (['POST'].includes(req.method)) {
        if (csrfExcludePaths.includes(req.path)) {
            return next();
        }
        return csrfProtection(req, res, next);
    }
    next();
});

router.get('/csrf-token', csrfProtection, (req, res) => {
    res.json({ csrfToken: req.csrfToken() });
});

// router.use('/login', loginRoutes); // 例

export default router;