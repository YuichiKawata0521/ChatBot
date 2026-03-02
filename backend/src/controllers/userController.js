import crypto from 'crypto';
import * as userModel from '../models/userModel.js';
import { getPool } from '../config/db.js';
import AppError from '../utils/appError.js';
import { hashPassword } from '../utils/password.js';
import logger from '../utils/logger.js';

export const getUsers = async (req, res, next) => {
    try {
        const pool = getPool();
        const users = await userModel.getUsers(pool);

        const formattedUsers = users.map(user => {
            const deps = [user.dep1_name, user.dep2_name, user.dep3_name].filter(Boolean);
            return {
                id: user.id,
                employee_no: user.employee_no,
                username: user.user_name,
                email: user.email,
                role: user.role,
                department: deps.length > 0 ? deps.join(' ') : '未設定',
                department_id: user.department_id,
                deleted_at: user.deleted_at
            };
        });
        logger.info('ユーザーデータを取得しました');
        res.status(200).json({success: true, data: formattedUsers});
    } catch (error) {
        logger.error('ユーザー一覧取得エラー', {option: {detail: error.message}});
        next(new AppError('ユーザー情報一覧の取得に失敗しました', 500));
    }
};

export const createUser = async (req, res, next) => {
    try {
        const { employee_no, username, email, department_id, role } = req.body;
        const pool = getPool();

        if (!employee_no || !username || !email) {
            logger.warn('社員番号、ユーザー名、メールアドレスのどれかが抜けています', {option: {employee_no, username, email}});
            return next(new AppError('社員番号、ユーザー名、メールアドレスは必須です', 400));
        }

        const existingUser = await userModel.getUserByEmployeeNoOrEmail(pool, employee_no, email);
        if (existingUser) {
            return next(new AppError('指定された社員番号またはメールアドレスはすでに登録されています', 400));
        }

        const dummyPassword = crypto.randomBytes(16).toString('hex');
        const hashedPassword = await hashPassword(dummyPassword);

        const userData = {
            employee_no,
            username,
            email,
            password: hashedPassword,
            department_id: department_id || null,
            role: role || 'user'
        };

        const newUser = await userModel.createUser(pool, userData);

        logger.info('新規ユーザー登録成功', {option: {employee_no: newUser.employee_no}});

        res.status(201).json({
            success: true,
            message: 'ユーザーを登録しました',
            data: newUser
        });
    } catch (error) {
        logger.error('ユーザー登録エラー', {option: {detail: error.message}});
        return next (new AppError('ユーザー登録に失敗しました', 500));
    }
};