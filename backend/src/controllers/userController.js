import fs from 'fs/promises';
import * as userModel from '../models/userModel.js';
import { getPool } from '../config/db.js';
import AppError from '../utils/appError.js';
import { hashPassword } from '../utils/password.js';
import logger from '../utils/logger.js';
import {
    buildMasterDepartmentSet,
    buildMasterUserIdentitySet,
    isMasterDepartmentRow,
    isMasterUserRow
} from '../utils/masterIdentityUtils.js';
import {
    CSV_HEADERS,
    parseCsv,
    normalizeDepartmentValue
} from '../utils/csvUtils.js';

const INITIAL_USER_PASSWORD = String(process.env.INITIAL_USER_PASSWORD || '');

const ensureInitialPasswordConfigured = () => {
    if (!INITIAL_USER_PASSWORD.trim()) {
        throw new AppError('初期パスワードが未設定です。環境変数 INITIAL_USER_PASSWORD を設定してください', 500);
    }
};

export const downloadUserCsvTemplate = async (req, res, next) => {
    try {
        const sampleRows = [
            CSV_HEADERS.join(','),
            '100001,山田太郎,taro.yamada@example.com,user,HQ01,管理本部,IT01,情報システム部,DEV01,開発課',
            '100002,鈴木花子,hanako.suzuki@example.com,admin,HQ02,営業本部,SA01,第一営業部,,'
        ];

        const csvBody = `\uFEFF${sampleRows.join('\n')}\n`;

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="users_sample_template.csv"');
        res.status(200).send(csvBody);
    } catch (error) {
        logger.error('サンプルCSVダウンロードエラー', {option: {detail: error.message}});
        next(new AppError('サンプルCSVのダウンロードに失敗しました', 500));
    }
};

export const uploadUsersCsv = async (req, res, next) => {
    const uploadedPath = req.file?.path;
    const pool = getPool();
    const client = await pool.connect();

    try {
        if (!req.file) {
            return next(new AppError('CSVファイルを選択してください', 400));
        }

        const csvContent = await fs.readFile(req.file.path, 'utf-8');
        const rows = parseCsv(csvContent);

        if (!rows.length) {
            return next(new AppError('CSVの内容が空です。ヘッダーと1行以上のデータを指定してください', 400));
        }

        const headerKeys = Object.keys(rows[0]);
        const missingHeaders = CSV_HEADERS.filter((header) => !headerKeys.includes(header));
        if (missingHeaders.length) {
            return next(new AppError(`CSVヘッダーが不足しています: ${missingHeaders.join(', ')}`, 400));
        }

        let insertedCount = 0;
        let updatedCount = 0;
        let skippedCount = 0;
        const errors = [];

        ensureInitialPasswordConfigured();

        await client.query('BEGIN');

        for (let idx = 0; idx < rows.length; idx++) {
            const row = rows[idx];
            const lineNo = idx + 2;

            const employee_no = (row.employee_no || '').trim();
            const username = (row.username || '').trim();
            const email = (row.email || '').trim();
            const role = ((row.role || '').trim() || 'user').toLowerCase();

            if (!employee_no || !username || !email) {
                errors.push(`行${lineNo}: employee_no / username / email は必須です`);
                continue;
            }

            if (!['user', 'admin'].includes(role)) {
                errors.push(`行${lineNo}: role は user または admin を指定してください`);
                continue;
            }

            const existingByEmployeeNo = await userModel.getUserByEmployeeNo(client, employee_no);
            const existingByEmail = await userModel.getUserByEmail(client, email);

            if (existingByEmployeeNo && existingByEmail && String(existingByEmployeeNo.id) !== String(existingByEmail.id)) {
                errors.push(`行${lineNo}: employee_no と email が別ユーザーに紐づいているため更新できません`);
                skippedCount++;
                continue;
            }

            const existingUser = existingByEmployeeNo || existingByEmail;

            const departmentData = {
                dep1_code: normalizeDepartmentValue(row.dep1_code),
                dep1_name: normalizeDepartmentValue(row.dep1_name),
                dep2_code: normalizeDepartmentValue(row.dep2_code),
                dep2_name: normalizeDepartmentValue(row.dep2_name),
                dep3_code: normalizeDepartmentValue(row.dep3_code),
                dep3_name: normalizeDepartmentValue(row.dep3_name)
            };

            let department_id = null;
            const hasDepartmentData = Object.values(departmentData).some((value) => value !== null);

            if (hasDepartmentData) {
                if (!departmentData.dep1_name) {
                    errors.push(`行${lineNo}: 部署情報を設定する場合、dep1_name は必須です`);
                    continue;
                }

                const existingDepartment = await userModel.getDepartmentByHierarchy(client, departmentData);
                if (existingDepartment?.id) {
                    department_id = existingDepartment.id;
                } else {
                    const createdDepartment = await userModel.createDepartment(client, departmentData);
                    department_id = createdDepartment.id;
                }
            }

            if (existingUser) {
                await userModel.updateUserById(client, existingUser.id, {
                    employee_no,
                    username,
                    email,
                    department_id,
                    role
                });
                updatedCount++;
            } else {
                const hashedPassword = await hashPassword(INITIAL_USER_PASSWORD);

                await userModel.createUser(client, {
                    employee_no,
                    username,
                    email,
                    password: hashedPassword,
                    department_id,
                    role,
                    registered_flag: false
                });
                insertedCount++;
            }
        }

        await client.query('COMMIT');

        res.status(200).json({
            success: true,
            message: `CSV取り込みが完了しました（登録: ${insertedCount}件 / 更新: ${updatedCount}件 / スキップ: ${skippedCount}件 / エラー: ${errors.length}件）`,
            data: {
                insertedCount,
                updatedCount,
                skippedCount,
                errorCount: errors.length,
                errors
            }
        });
    } catch (error) {
        await client.query('ROLLBACK');
        logger.error('CSVユーザー一括登録エラー', {option: {detail: error.message}});
        next(new AppError('CSVユーザー登録に失敗しました', 500));
    } finally {
        client.release();
        if (uploadedPath) {
            await fs.unlink(uploadedPath).catch(() => {});
        }
    }
};

export const getDepartments = async (req, res, next) => {
    try {
        const pool = getPool();
        const departments = await userModel.getDepartments(pool);
        const masterDepartmentSet = buildMasterDepartmentSet();
        const visibleDepartments = departments.filter((row) => !isMasterDepartmentRow(row, masterDepartmentSet));

        const department1Options = [...new Set(
            visibleDepartments
                .map((row) => row.dep1_name)
                .filter((value) => !!value)
        )];

        res.status(200).json({
            success: true,
            data: {
                department1Options,
                departments: visibleDepartments
            }
        });
    } catch (error) {
        logger.error('部署情報取得エラー', {option: {detail: error.message}});
        next(new AppError('部署情報の取得に失敗しました', 500));
    }
};

export const getUsers = async (req, res, next) => {
    try {
        const pool = getPool();
        const users = await userModel.getUsers(pool);
        const masterUserIdentitySet = buildMasterUserIdentitySet();
        const visibleUsers = users.filter((user) => !isMasterUserRow(user, masterUserIdentitySet));

        const formattedUsers = visibleUsers.map(user => {
            const deps = [user.dep1_name, user.dep2_name, user.dep3_name].filter(Boolean);
            return {
                id: user.id,
                employee_no: user.employee_no,
                username: user.username,
                email: user.email,
                role: user.role,
                dep1_name: user.dep1_name || '',
                dep2_name: user.dep2_name || '',
                dep3_name: user.dep3_name || '',
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

        ensureInitialPasswordConfigured();

        if (!employee_no || !username || !email) {
            logger.warn('社員番号、ユーザー名、メールアドレスのどれかが抜けています', {option: {employee_no, username, email}});
            return next(new AppError('社員番号、ユーザー名、メールアドレスは必須です', 400));
        }

        const existingUser = await userModel.getUserByEmployeeNoOrEmail(pool, employee_no, email);
        if (existingUser) {
            return next(new AppError('指定された社員番号またはメールアドレスはすでに登録されています', 400));
        }

        const hashedPassword = await hashPassword(INITIAL_USER_PASSWORD);

        const userData = {
            employee_no,
            username,
            email,
            password: hashedPassword,
            department_id: department_id || null,
            role: role || 'user',
            registered_flag: false
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
        return next(new AppError('ユーザー登録に失敗しました', 500));
    }
};

export const resetUserPassword = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!id) {
            return next(new AppError('ユーザーIDが欠落しています', 400));
        }

        ensureInitialPasswordConfigured();

        const pool = getPool();
        const hashedPassword = await hashPassword(INITIAL_USER_PASSWORD);
        const updatedUser = await userModel.resetUserPasswordById(pool, id, hashedPassword);

        if (!updatedUser) {
            return next(new AppError('更新対象ユーザーが見つかりません', 404));
        }

        logger.info('ユーザーパスワードを初期値へリセットしました', {
            option: {
                id: updatedUser.id,
                employee_no: updatedUser.employee_no
            }
        });

        res.status(200).json({
            success: true,
            message: 'パスワードを初期値へリセットしました',
            data: {
                id: updatedUser.id,
                employee_no: updatedUser.employee_no
            }
        });
    } catch (error) {
        logger.error('ユーザーパスワードリセットエラー', {option: {id: req.params?.id, detail: error.message}});
        return next(new AppError('パスワードリセットに失敗しました', 500));
    }
};

export const updateUser = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { employee_no, username, email, department_id, role } = req.body;
        const pool = getPool();

        if (!id) {
            return next(new AppError('ユーザーIDが欠落しています', 400));
        }

        if (!employee_no || !username || !email) {
            return next(new AppError('社員番号、ユーザー名、メールアドレスは必須です', 400));
        }

        const existingByEmployeeNo = await userModel.getUserByEmployeeNo(pool, employee_no);
        if (existingByEmployeeNo && String(existingByEmployeeNo.id) !== String(id)) {
            return next(new AppError('指定された社員番号はすでに登録されています', 400));
        }

        const existingByEmail = await userModel.getUserByEmail(pool, email);
        if (existingByEmail && String(existingByEmail.id) !== String(id)) {
            return next(new AppError('指定されたメールアドレスはすでに登録されています', 400));
        }

        const updatedUser = await userModel.updateUserById(pool, id, {
            employee_no,
            username,
            email,
            department_id: department_id || null,
            role: role || 'user'
        });

        if (!updatedUser) {
            return next(new AppError('更新対象ユーザーが見つかりません', 404));
        }

        logger.info('ユーザー更新成功', {option: {id: updatedUser.id, employee_no: updatedUser.employee_no}});
        res.status(200).json({
            success: true,
            message: 'ユーザー情報を更新しました',
            data: updatedUser
        });
    } catch (error) {
        logger.error('ユーザー更新エラー', {option: {id: req.params?.id, detail: error.message}});
        return next(new AppError('ユーザー更新に失敗しました', 500));
    }
};

export const deleteUser = async (req, res, next) => {
    try {
        const { id } = req.params;
        const mode = String(req.query?.mode || 'soft').toLowerCase();
        if (!id) {
            return next(new AppError('ユーザーIDが欠落しています', 400));
        }

        if (!['soft', 'hard'].includes(mode)) {
            return next(new AppError('削除モードが不正です', 400));
        }

        const pool = getPool();

        const result = mode === 'hard'
            ? await userModel.hardDeleteUserById(pool, id)
            : await userModel.softDeleteUserById(pool, id);

        if (!result.rowCount) {
            logger.warn('削除対象データが見つかりませんでした', {option: {id}});
            return next(new AppError('削除対象ユーザーが見つかりません', 404));
        }

        logger.info('ユーザー削除成功', {option: {id, mode}});
        res.status(200).json({
            success: true,
            message: mode === 'hard' ? 'ユーザーを物理削除しました' : 'ユーザーを無効化しました'
        });
    } catch (error) {
        logger.error('ユーザー削除時に何かしらのエラーが発生しました', {option: {id: req.params.id, detail: error.message}});
        return next(new AppError('ユーザー削除に失敗', 500));
    }
};

export const restoreUser = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!id) {
            return next(new AppError('ユーザーIDが欠落しています', 400));
        }

        const pool = getPool();
        const result = await userModel.restoreUserById(pool, id);
        if (!result.rowCount) {
            return next(new AppError('有効化対象ユーザーが見つからないか、既に有効です', 404));
        }

        logger.info('ユーザー有効化成功', {option: {id}});
        res.status(200).json({
            success: true,
            message: 'ユーザーを有効化しました'
        });
    } catch (error) {
        logger.error('ユーザー有効化エラー', {option: {id: req.params?.id, detail: error.message}});
        return next(new AppError('ユーザー有効化に失敗しました', 500));
    }
};