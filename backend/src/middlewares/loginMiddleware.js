import rateLimit from 'express-rate-limit';

let maxTry = 0;
if (process.env.NODE_ENV === 'production') {
    maxTry = 5;
} else {
    maxTry = 500;
}

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: maxTry,
    message: {
        status: 429,
        message: 'ログインの失敗が続きました。15分後に再度お試しください。',
        error: 'Too many failed'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

export default loginLimiter;