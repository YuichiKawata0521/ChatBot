import crypto from 'crypto';
import * as loginModel from '../models/loginModel.js';
import { getPool } from '../config/db.js';
import AppError from '../utils/appError.js';
import Email from '../utils/email.js';
import { verifyPassword, hashPassword } from '../utils/password.js';
import { generateToken } from '../config/csrf.js';
import logger from '../utils/logger.js';

const PORTFOLIO_DEPARTMENT_IDS = new Set([1, 2, 3]);

function validatePasswordRule(password) {
    if (password.length < 10 || password.length > 128) {
        return 'パスワードは10文字以上、128文字以下で\n設定してください';
    }

    const asciiRegex = /^[\x20-\x7E]+$/;
    if (!asciiRegex.test(password)) {
        return '使用できない文字が含まれています\n(半角英数字記号のみ使用可能です)';
    }

    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSymbol = /[\x20-\x2F\x3A-\x40\x5B-\x60\x7B-\x7E]/.test(password);

    if (!(hasLetter && hasNumber && hasSymbol)) {
        return 'パスワードは英字、数字、記号を\nそれぞれ1文字以上含めてください';
    }

    if (/(.)\1{2,}/.test(password)) {
        return 'パスワードに同じ文字を3回以上\n連続させることは出来ません';
    }

    return null;
}

export async function login(req, res, next) {
    const { employee_no, email, password } = req.body;
    const pool = getPool();
    const inputEmployeeNo = typeof employee_no === 'string' ? employee_no.trim() : '';
    const inputEmail = typeof email === 'string' ? email.trim() : '';

    const userData = await loginModel.getUserData(pool, inputEmployeeNo, inputEmail);
    if (!userData) {
        const existingByEmail = await loginModel.getUserByEmail(pool, inputEmail);

        if (!existingByEmail) {
            logger.info('未登録メールアドレスでログインが試行されました', {option: {email: inputEmail}});
            return res.status(404).json({
                success: false,
                message: 'メールアドレスが未登録です。新規登録へ進んでください。',
                errorCode: 'EMAIL_NOT_REGISTERED',
                shouldRedirectToSignup: true,
                prefill: {
                    email: inputEmail,
                    employee_no: inputEmployeeNo
                }
            });
        }

        logger.warn('ログイン情報が一致しませんでした', {option: {employee_no: inputEmployeeNo, email: inputEmail}})
        return next(new AppError('Incorrect email or password', 401));
    }

    // PWチェック
    const match = await verifyPassword(password, userData.password);
    if (!match) {
        logger.warn('パスワードが一致しません', {option: {employee_no}});
        return next(new AppError('Incorrect email or password', 401));
    }

    req.session.regenerate(async err => {
        if (err) {
            logger.warn('セッションの再生成に失敗しました', {option: {employee_no}});
            return next(new AppError('ログイン処理に失敗しました', 500));
        }

        req.session.user = {
            id: userData.id,
            department_id: userData.department_id,
            employee_no: userData.employee_no,
            user_name: userData.user_name,
            email: userData.email,
            role: userData.role,
            isRegistered: !userData.registered_flag
        };
        if (!userData.registered_flag) {
            try {
                const resetToken = crypto.randomBytes(32).toString('hex');
                const passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000);
                const resetMailUser = {
                    ...userData,
                    email: inputEmail || userData.email
                };
                
                await loginModel.saveResetToken(pool, userData.id, resetToken, passwordResetExpires);

                const frontendURL = process.env.FRONTEND_URL || `http://localhost:${process.env.FRONTEND_PORT}`
                const resetUrl = `${frontendURL}/pages/change_password.html?token=${resetToken}`;
                await new Email(resetMailUser, resetUrl).sendPasswordReset();

                logger.info('初回ログインの為、パスワード変更メールを送信しました', {option: {email: resetMailUser.email}});
                return res.status(200).json({
                    success: true,
                    message: "初回ログインの為パスワードの変更が必要です。メールを送信しました",
                    requirePasswordChange: true
                });
            } catch (error) {
                logger.error('パスワード変更メール送信エラー', {option: {email: userData.email, detail: error.message}});
                return next(new AppError('パスワードリセットメールの送信に失敗しました', 500));
            }
        }
        const csrfToken = generateToken(req, res);

        logger.info('ログインに成功しました', {option: {employee_no}});
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
    const employee_no = req.session?.user?.employee_no ?? null;

    req.session.destroy((err) => {
        if (err) {
            logger.error('ログアウトエラー', {option: {employee_no, detail: err.message}});
            return next(new AppError('Failed to logout', 500));
        }
        res.clearCookie('connect.sid');
        logger.info('ログアウトに成功しました', {option: {employee_no}});
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
        const { token, password } = req.body;

        const passwordRuleError = validatePasswordRule(String(password || ''));
        if (passwordRuleError) {
            return next(new AppError(passwordRuleError, 400));
        }
        const pool = getPool();

        // 1. トークンの検証
        const user = await loginModel.getUserByResetToken(pool, token);
        if (!user) {
            return next(new AppError('トークンが無効か、有効期限が切れています', 400));
        }

        if (user.registered_flag) {
            logger.warn('ユーザーデータが既に登録されています', {option: {user_name: user.user_name}});
            return next (new AppError('ユーザーデータが既に登録されています', 400));
        }

        const hashedPassword = await hashPassword(password);
        await loginModel.register(pool, hashedPassword, token); // 登録処理

        req.session.regenerate((err) => {
            if (err) {
                logger.warn('新規登録は完了しましたが、自動ログインに失敗しました', {option: {employee_no: user.employee_no}});
                return next(new AppError('登録は完了しましたが、自動ログインに失敗しました。ログインページへ移動してください', 400));
            }

            req.session.user = {
                id: user.id,
                employee_no: user.employee_no,
                email: user.email,
                role: user.role,
                isRegistered: true
            };

            const csrfToken = generateToken(req, res);

            logger.info('新規登録完了', {option: {employee_no: user.employee_no}});
            res.status(200).json({
                success: true,
                message: '登録が完了しました',
                csrfToken,
                user: {
                    user_name: user.user_name,
                    employee_no: user.employee_no,
                    email: user.email,
                    role: user.role
                }
            });
        });
    } catch (error) {
        logger.error('新規登録に失敗しました', {option: {detail: error.message, stack: error.stack}});
        return next (new AppError('新規登録に失敗しました', 400));
    }
} 

export async function portfolioRegister(req, res, next) {
    try {
        const { user_name, email, employee_no, password, department_id } = req.body;
        const normalizedUserName = typeof user_name === 'string' ? user_name.trim() : '';
        const normalizedEmail = typeof email === 'string' ? email.trim() : '';
        const normalizedEmployeeNo = typeof employee_no === 'string' ? employee_no.trim() : '';
        const normalizedPassword = String(password || '');
        const normalizedDepartmentId = Number.parseInt(department_id, 10);

        if (!normalizedUserName || !normalizedEmail || !normalizedEmployeeNo || !normalizedPassword) {
            return next(new AppError('名前・メールアドレス・従業員番号・パスワードは必須です', 400));
        }

        if (normalizedUserName.length > 20) {
            return next(new AppError('名前は20文字以内で入力してください', 400));
        }

        if (normalizedEmail.length > 100) {
            return next(new AppError('メールアドレスは100文字以内で入力してください', 400));
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
            return next(new AppError('メールアドレスの形式が不正です', 400));
        }

        if (normalizedEmployeeNo.length > 20) {
            return next(new AppError('従業員番号は20文字以内で入力してください', 400));
        }

        if (!PORTFOLIO_DEPARTMENT_IDS.has(normalizedDepartmentId)) {
            return next(new AppError('部署はテスト用の1〜3から選択してください', 400));
        }

        const passwordRuleError = validatePasswordRule(normalizedPassword);
        if (passwordRuleError) {
            return next(new AppError(passwordRuleError, 400));
        }

        const pool = getPool();

        const department = await loginModel.getDepartmentById(pool, normalizedDepartmentId);
        if (!department) {
            return next(new AppError('選択された部署が存在しません。部署ID 1〜3を作成してください', 400));
        }

        const existingByEmail = await loginModel.getUserByEmail(pool, normalizedEmail);
        if (existingByEmail) {
            return next(new AppError('このメールアドレスは既に登録されています', 400));
        }

        const existingByEmployeeNo = await loginModel.getUserByEmployeeNo(pool, normalizedEmployeeNo);
        if (existingByEmployeeNo) {
            return next(new AppError('この従業員番号は既に登録されています', 400));
        }

        const hashedPassword = await hashPassword(normalizedPassword);
        const createdUser = await loginModel.createPortfolioUser(pool, {
            user_name: normalizedUserName,
            email: normalizedEmail,
            employee_no: normalizedEmployeeNo,
            password: hashedPassword,
            department_id: normalizedDepartmentId
        });

        logger.info('ポートフォリオ向け自己登録が完了しました', {
            option: {
                employee_no: createdUser.employee_no,
                email: createdUser.email,
                department_id: createdUser.department_id
            }
        });

        res.status(201).json({
            success: true,
            message: '登録が完了しました。ログインしてください。',
            data: {
                id: createdUser.id,
                employee_no: createdUser.employee_no,
                email: createdUser.email,
                user_name: createdUser.user_name,
                role: createdUser.role,
                department_id: createdUser.department_id
            }
        });
    } catch (error) {
        logger.error('ポートフォリオ向け自己登録に失敗しました', {option: {detail: error.message, stack: error.stack}});
        return next(new AppError('登録に失敗しました', 500));
    }
}