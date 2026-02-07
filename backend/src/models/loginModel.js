export const getUserData = async (pool, employee_no, email) => {
    const sql = `
        SELECT *
        FROM users
        WHERE employee_no = $1 AND email = $2;
    `;
    const result = await pool.query(sql, [employee_no, email]);
    return result.rows[0];
}

export const saveResetToken = async (pool, id, token, expires) => {
    const sql = `
        UPDATE users
        SET password_reset_token = $1, password_reset_expires = $2
        WHERE id = $3;
    `;
    await pool.query(sql, [token, expires, id]);
};