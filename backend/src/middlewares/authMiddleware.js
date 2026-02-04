// ログイン状態の確認
export const protect = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/login/login.html?reason=session_expored'); // 実際のログインページのパスに合わせる
    }
};

// ロール確認
export const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!req.session.user) {
            return res.status(401).json({success: false, message: 'ログイン認証が必要です。'});
        }

        if (!roles.includes(req.session.user.role)) {
            return res.status(403).json({success: false, message: 'アクセス権がありません。'});
        }
        next();
    };
};