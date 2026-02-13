 export const getUserData = async (pool, employee_no, email) => {
    const sql = `
        SELECT *
        FROM users
        WHERE employee_no = $1 AND email = $2;
    `;
    const result = await pool.query(sql, [employee_no, email]);
    return result.rows[0];
}

export const register = async (pool, email, employee_no, hashedPassword) => {
    const sql = `
        UPDATE users
        SET password = $1,
            password_reset_token = NULL,
            password_reset_expires = NULL,
            registered_flag = true,
            updated_at = NOW()
        WHERE email = $2 AND employee_no = $3;
    `;
    await pool.query(sql, [hashedPassword, email, employee_no]);
};

export const saveResetToken = async (pool, id, token, expires) => {
    const sql = `
        UPDATE users
        SET password_reset_token = $1, password_reset_expires = $2
        WHERE id = $3;
    `;
    await pool.query(sql, [token, expires, id]);
};

export const getUserByResetToken = async (pool, token) => {
    const sql = `
        SELECT * FROM users
        WHERE password_reset_token = $1
        AND password_reset_expires > NOW();
    `;
    const result = await pool.query(sql, [token]);
    return result.rows[0];
};

