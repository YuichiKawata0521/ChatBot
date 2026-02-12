import crypto from 'crypto';
import * as loginModel from '../models/loginModel.js';
import { getPool } from '../config/db.js';
import { verifyPassword } from '../utils/password.js';
import AppError from '../utils/appError.js';
import Email from '../utils/email.js';
import { verifyPassword, hashPassword } from '../utils/password.js';
import { generateToken } from '../config/csrf.js';

export async function login(req, res, next) {
    const { employee_no, email, password } = req.body;
    const pool = getPool();

    const userData = await loginModel.getUserData(pool, employee_no, email);
    if (!userData) {
        console.error('ユーザーデータが見つかりませんでした: ', email);
        return next(new AppError('Not Found userData', 404));
    }

    // PWチェック
    const match = await verifyPassword(password, userData.password);
    if (!match) {
        console.error('パスワードが一致しません');
        return next(new AppError('Incorrect email or password', 401));
    }

    req.session.regenerate(async err => {
        if (err) {
            return next(new AppError('ログイン処理に失敗しました', 500));
        }

        req.session.user = {
            id: userData.id,
            employee_no: userData.employee_no,
            email: userData.email,
            role: userData.role,
            isRegistered: !userData.registered_flag
        };
        if (!userData.registered_flag) {
            try {
                const resetToken = crypto.randomBytes(32).toString('hex');
                const passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000);
                
                await loginModel.saveResetToken(pool, userData.id, resetToken, passwordResetExpires);

                const resetUrl = `${req.protocol}://${req.get('host')}/reset-password/${resetToken}`;
                await new Email(userData, resetUrl).sendPasswordReset();

                return res.status(200).json({
                    success: true,
                    message: "初回ログインの為パスワードの変更が必要です。メールを送信しました",
                    requirePasswordChange: true
                });
            } catch (error) {
                console.error('メール送信エラー', error);
                return next(new AppError('パスワードリセットメールの送信に失敗しました', 500));
            }
        }
        const csrfToken = generateToken(res, req);

        res.status(200).json({
            success: true,
            message: 'ログインに成功しました',
            csrfToken,
            user: {
                user_name: userData.user_name,
                employee_no: userData.employee_no,
                email: userData.email,
                role: userData.role
            }
        });
    });
}

export function logout(req, res, next) {

    req.session.destroy((err) => {
        if (err) {
            console.error('ログアウトエラー', err);
            return next(new AppError('Failed to logout', 500));
        }
        res.clearCookie('connect.sid');
        res.status(200).json({success: true, message: 'ログアウトしました'});
    });

}


export function authMe(req, res, next) {
    if (req.session.user) {
        res.status(200).json({user: req.session.user});
    } else {
        return next (new AppError('Not Authorized', 401));
    }
}

export async function register(req, res, next) {
    try {
        const { employee_no, password } = req.body;

        if (password.length < 10 || password.length > 128) {
            return next (new AppError('パスワードは10文字以上、128文字以下で\n設定してください'), 400);
        }
        const asciiRegex = /^[\x20-\x7E]+$/;

        if (!asciiRegex.test(password)) {
            return next (new AppError('使用できない文字が含まれています\n(半角英数字記号のみ使用可能です)'), 400)
        }
        const hasLetter = /[a-zA-Z]/.test(password);
        const hasNumber = /[0-9]/.test(password);
        const hasSymbol = /[\x20-\x2F\x3A-\x40\x5B-\x60\x7B-\x7E]/.test(password);

        if (!(hasLetter && hasNumber && hasSymbol)) {
            return next (new AppError('パスワードは英字、数字、記号を\nそれぞれ1文字以上含めてください'), 400);
        }
        if (employee_no && password.toLowerCase().includes(employee_no.toLowerCase())) {
            return next (new AppError('パスワードにユーザーIDを含めることは出来ません'), 400);
        }
        if (/(.)\1{2,}/.test(password)) {
            return next(new AppError('パスワードに同じ文字を3回以上\n連続させることは出来ません'), 400);
        }
        const pool = getPool();
        const userData = await loginModel.getUserData(pool, req.body);

        if (userData.registered_flag) {
            console.error(''); // DBでunique制限しているのであり得ないが、一応後でログを取る目印としてcerを置いておく
            return next (new AppError('ユーザーデータが既に登録されています'), 400);
        }

        const hashedPassword = await hashPassword(password);
        const newBody = {
            ...req.body,
            password: hashedPassword
        };

        const result = await loginModel.register(pool, newBody); // 登録処理
        if(result.success) {
            res.status(200).json({success: result.success, message: '新規登録完了'});
        }
    } catch (error) {
        console.error('Failed to register: ', error);
        return next (new AppError('新規登録に失敗しました', 400));
    }
} 