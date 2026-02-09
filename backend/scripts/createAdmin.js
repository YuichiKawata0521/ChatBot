import { getPool } from '../src/config/db.js';
import { hashPassword } from '../src/utils/password.js';

const createAdmin = async () => {
    const pool = getPool(); // Poolを取得

    try {
        const employeeNo = '999999';
        const email = 'admin@example.com';
        const rawPassword = 'password123';
        const userName = 'システム管理者';

        // パスワードをハッシュ化
        const hashedPassword = await hashPassword(rawPassword);

        const sql = `
            INSERT INTO users (employee_no, user_name, email, password, role, registered_flag)
            VALUES ($1, $2, $3, $4, 'admin', true)
            RETURNING id, user_name;
        `;

        // connect/releaseを内包したpool.queryを使用
        const res = await pool.query(sql, [employeeNo, userName, email, hashedPassword]);
        console.log('Admin user created:', res.rows[0]);

    } catch (err) {
        console.error('Error creating admin user:', err);
    } finally {
        // プールを閉じることで、Node.jsのイベントループが解放され、スクリプトが自然終了する
        await pool.end();
    }
};

createAdmin();