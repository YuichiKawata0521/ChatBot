import { connectDB, getPool } from '../src/config/db.js';
import { hashPassword } from '../src/utils/password.js';

const createUser = async () => {

    if (process.env.NODE_ENV === 'production') return;
    
    await connectDB();
    const pool = getPool();

    try {
        const employeeNo = '000000';
        const email = 'user@example.com';
        const rawPassword = 'password123';
        const userName = '一般ユーザー';

        // パスワードをハッシュ化
        const hashedPassword = await hashPassword(rawPassword);

        const sql = `
            INSERT INTO users (employee_no, user_name, email, password, role, registered_flag)
            VALUES ($1, $2, $3, $4, 'admin', false)
            RETURNING id, user_name;
        `;

        // connect/releaseを内包したpool.queryを使用
        const res = await pool.query(sql, [employeeNo, userName, email, hashedPassword]);
        console.log('Public user created:', res.rows[0]);

    } catch (err) {
        console.error('Error creating public user:', err);
    } finally {
        // プールを閉じることで、Node.jsのイベントループが解放され、スクリプトが自然終了する
        await pool.end();
    }
};

createUser();