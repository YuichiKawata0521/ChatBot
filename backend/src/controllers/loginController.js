import * as loginModel from '../models/loginModel.js';
import { getPool } from '../config/db.js';
import { verifyPassword } from '../utils/password.js';
import AppError from '../utils/appError.js';

// ----ここからは現状のcsrf-csrfに合わせたやり方に変更が必要
import Tokens from 'csrf';
import Email from '../utils/email.js';
const tokens = new Tokens();
// ----ここまで

export async function login(req, res, next) {
    const { employee_no, email, password } = req.body;
    const pool = getPool();

    const userData = await loginModel.getUserData(pool, employee_no, email);
    if (!userData) {
        console.error('ユーザーデータが見つかりませんでした: ', email);
        next(new AppError('Not Found userData', 404));
    }

    // PWチェック
    const match = verifyPassword(password, userData.password);
    if (!match) {
        console.error('パスワードが一致しません');
        next(new AppError('Not Match Password', 401));
    }

    req.session.regenerate(async err => {
        if (err) {
            return next(new AppError('意味を後で調べる', 401));
        }
        if (!req.session.userData) {
            req.session.userData = {};
        }

        req.session.user = {
            employee_no: userData.employee_no,
            email: userData.email,
            role: userData.role,
            isRegistered: !userData.registered_flag
        };
    });
    // ----ここからは現状のcsrf-csrfに合わせたやり方に変更が必要
    const secret = await tokens.secret();
    req.session.csrfSecret = secret;
    const newCsrfToekn = tokens.create(secret);
    // ----ここまで

    req.session.save(err => {
        if (err) {
            console.error('セッション保存エラー', err);
            next(new AppError('Miss Saving Session', 500));
        }

        if (!userData.registered_flag) {
            try{
                const resetUrl = `${req.protocol}://${req.get('host')}/reset-password/${resetToken}`;
                await new Email(userData.user_name, resetUrl).sendPasswordReset();
                return res.status(200).json({
                    success: true,
                    message: "パスワードの変更が必要です",
                    requirePasswordChange: true,
                    csrfToken: newCsrfToekn,
                });
            } catch (error) {
                next(new AppError('Failed To Send Password Reset Mail', 500));
            }
        }

        res.status(200).json({
            success: true,
            message: 'ログインに成功しました',
            csrfToken: newCsrfToekn,
            user: {
                user_name: userData.user_name,
                employee_no: userData.employee_no,
                email: userData.email,
                role: userData.role
            }
        });
    });
}

export async function resetPassword(req, res) {
    const { employee_no, email, password } = req.body;

}