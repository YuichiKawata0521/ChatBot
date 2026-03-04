import { connectDB, getPool } from '../src/config/db.js';
import { hashPassword } from '../src/utils/password.js';

const getEnvValue = (...keys) => {
    for (const key of keys) {
        const value = process.env[key];
        if (value !== undefined && String(value).trim() !== '') {
            return String(value).trim();
        }
    }
    return '';
};

const toNullable = (value) => {
    const normalized = String(value || '').trim();
    return normalized.length > 0 ? normalized : null;
};

const findOrCreateDepartment = async (pool, prefix) => {
    const dep1_code = toNullable(getEnvValue(`${prefix}_dep1_code`, `${prefix}_DEP1_CODE`));
    const dep1_name = toNullable(getEnvValue(`${prefix}_dep1_name`, `${prefix}_DEP1_NAME`));
    const dep2_code = toNullable(getEnvValue(`${prefix}_dep2_code`, `${prefix}_DEP2_CODE`));
    const dep2_name = toNullable(getEnvValue(`${prefix}_dep2_name`, `${prefix}_DEP2_NAME`));
    const dep3_code = toNullable(getEnvValue(`${prefix}_dep3_code`, `${prefix}_DEP3_CODE`));
    const dep3_name = toNullable(getEnvValue(`${prefix}_dep3_name`, `${prefix}_DEP3_NAME`));

    const hasDepartmentInfo = [dep1_code, dep1_name, dep2_code, dep2_name, dep3_code, dep3_name].some((value) => value !== null);
    if (!hasDepartmentInfo) {
        return null;
    }

    if (!dep1_name) {
        throw new Error(`${prefix}_dep1_name が未設定です`);
    }

    const findSql = `
        SELECT id
        FROM departments
        WHERE COALESCE(dep1_code, '') = COALESCE($1, '')
          AND COALESCE(dep1_name, '') = COALESCE($2, '')
          AND COALESCE(dep2_code, '') = COALESCE($3, '')
          AND COALESCE(dep2_name, '') = COALESCE($4, '')
          AND COALESCE(dep3_code, '') = COALESCE($5, '')
          AND COALESCE(dep3_name, '') = COALESCE($6, '')
        LIMIT 1;
    `;
    const findResult = await pool.query(findSql, [dep1_code, dep1_name, dep2_code, dep2_name, dep3_code, dep3_name]);
    if (findResult.rows[0]) {
        return findResult.rows[0].id;
    }

    const insertSql = `
        INSERT INTO departments (
            dep1_code,
            dep1_name,
            dep2_code,
            dep2_name,
            dep3_code,
            dep3_name
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id;
    `;
    const insertResult = await pool.query(insertSql, [dep1_code, dep1_name, dep2_code, dep2_name, dep3_code, dep3_name]);
    return insertResult.rows[0].id;
};

const createUser = async () => {
    await connectDB();
    const pool = getPool();

    try {
        const employeeNo = getEnvValue('MASTER_USER_EMPLOYEE_NO');
        const email = getEnvValue('MASTER_USER_EMAIL');
        const rawPassword = getEnvValue('MASTER_USER_PASSWORD');
        const userName = getEnvValue('MASTER_USER_NAME');
        const role = getEnvValue('MASTER_USER_ROLE') || 'user';
        const adminEmployeeNo = getEnvValue('MASTER_ADMIN_EMPLOYEE_NO');
        const adminEmail = getEnvValue('MASTER_ADMIN_EMAIL');

        if (!employeeNo || !email || !rawPassword || !userName) {
            throw new Error('MASTER_USER_* の必須環境変数が不足しています');
        }

        if (employeeNo === adminEmployeeNo || email === adminEmail) {
            throw new Error('MASTER_USER と MASTER_ADMIN の社員番号またはメールアドレスが重複しています');
        }

        const departmentId = await findOrCreateDepartment(pool, 'MASTER_USER');

        // パスワードをハッシュ化
        const hashedPassword = await hashPassword(rawPassword);

        const sql = `
            INSERT INTO users (employee_no, user_name, email, password, department_id, role, registered_flag)
            VALUES ($1, $2, $3, $4, $5, $6, false)
            ON CONFLICT (employee_no)
            DO UPDATE SET
                user_name = EXCLUDED.user_name,
                email = EXCLUDED.email,
                password = EXCLUDED.password,
                department_id = EXCLUDED.department_id,
                role = EXCLUDED.role,
                registered_flag = EXCLUDED.registered_flag,
                deleted_at = NULL,
                updated_at = now()
            RETURNING id, user_name;
        `;

        // connect/releaseを内包したpool.queryを使用
        const res = await pool.query(sql, [employeeNo, userName, email, hashedPassword, departmentId, role]);
        console.log('Public user created:', res.rows[0]);

    } catch (err) {
        console.error('Error creating public user:', err);
    } finally {
        // プールを閉じることで、Node.jsのイベントループが解放され、スクリプトが自然終了する
        await pool.end();
    }
};

createUser();