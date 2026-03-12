import rateLimit from 'express-rate-limit';

const signupLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: {
        status: 429,
        message: '新規登録の試行回数が上限に達しました。15分後に再度お試しください。',
        error: 'Too many signup attempts'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

export default signupLimiter;
