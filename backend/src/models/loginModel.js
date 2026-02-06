export const getUserData = async (pool, employee_no, email) => {
    const sql = `
        SELECT *
        FROM users
        WHERE employee_no = $1 AND email = $2;
    `;
    const result = await pool.query(sql, [employee_no, email]);
    return result.rows[0];
}