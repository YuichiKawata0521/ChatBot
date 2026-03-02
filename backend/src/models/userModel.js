export const getUsers = async (pool) => {
    const sql = `
        SELECT *
        FROM users u
        LEFT JOIN departments d ON u.department_id = d.id
        WHERE u.deleted_at IS NULL
        ORDER BY u.id ASC;
    `;
    const result = await pool.query(sql);
    return result.rows;
};

export const getUserByEmployeeNoOrEmail = async (pool, employee_no, email) => {
    // 重複チェック用
    const sql = `
        SELECT id FROM users 
        WHERE (employee_no = $1 OR email = $2) AND deleted_at IS NULL;
    `;
    const result = await pool.query(sql, [employee_no, email]);
    return result.rows[0];
};

export const createUser = async (pool, userData) => {
    const { employee_no, username, email, password, department_id, role } = userData;
    const sql = `
        INSERT INTO users (employee_no, user_name, email, password, department_id, role)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, employee_no, user_name AS username, email, role;
    `;
    const result = await pool.query(sql, [employee_no, username, email, password, department_id || null, role || 'user']);
    return result.rows[0];
}