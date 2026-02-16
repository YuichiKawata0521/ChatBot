import AppError from '../utils/appError.js';

// ログイン状態の確認
export const protect = (req, res, next) => {
    if (req.session.user) {
        req.user = req.session.user;
        return next();
    }
    return next(new AppError('ログイン認証が必要です。', 401));
};

// ロール確認
export const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!req.session.user) {
            return next(new AppError('ログイン認証が必要です。', 401));
        }

        if (!roles.includes(req.session.user.role)) {
            return next(new AppError('アクセス権がありません。', 403));
        }
        next();
    };
};