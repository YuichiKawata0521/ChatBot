import crypto from 'crypto';
import * as loginModel from '../models/loginModel.js';
import { getPool } from '../config/db.js';
import { verifyPassword } from '../utils/password.js';
import AppError from '../utils/appError.js';
import Email from '../utils/email.js';

export async function login(req, res, next) {
    const { employee_no, email, password } = req.body;
    const pool = getPool();

    const userData = await loginModel.getUserData(pool, employee_no, email);
    if (!userData) {
        console.error('ユーザーデータが見つかりませんでした: ', email);
        return next(new AppError('Not Found userData', 404));
    }

    // PWチェック
    const match = verifyPassword(password, userData.password);
    if (!match) {
        console.error('パスワードが一致しません');
        return next(new AppError('Not Match Password', 401));
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

        res.status(200).json({
            success: true,
            message: 'ログインに成功しました',
            user: {
                user_name: userData.user_name,
                employee_no: userData.employee_no,
                email: userData.email,
                role: userData.role
            }
        });
    });
}