 export const getUserData = async (pool, employee_no, email) => {
    const sql = `
        SELECT *
        FROM users
        WHERE employee_no = $1 AND email = $2;
    `;
    const result = await pool.query(sql, [employee_no, email]);
    return result.rows[0];
}

export const getUserByEmail = async (pool, email) => {
    const sql = `
        SELECT id, employee_no, email
        FROM users
        WHERE email = $1
        LIMIT 1;
    `;
    const result = await pool.query(sql, [email]);
    return result.rows[0] || null;
};

export const getUserByEmployeeNo = async (pool, employee_no) => {
    const sql = `
        SELECT id, employee_no, email
        FROM users
        WHERE employee_no = $1
        LIMIT 1;
    `;
    const result = await pool.query(sql, [employee_no]);
    return result.rows[0] || null;
};

export const getDepartmentById = async (pool, departmentId) => {
    const sql = `
        SELECT id
        FROM departments
        WHERE id = $1
        LIMIT 1;
    `;
    const result = await pool.query(sql, [departmentId]);
    return result.rows[0] || null;
};

export const createPortfolioUser = async (pool, userData) => {
    const {
        employee_no,
        user_name,
        email,
        password,
        department_id
    } = userData;

    const sql = `
        INSERT INTO users (employee_no, user_name, email, password, department_id, role, registered_flag)
        VALUES ($1, $2, $3, $4, $5, 'admin', true)
        RETURNING id, employee_no, user_name, email, role, department_id;
    `;
    const result = await pool.query(sql, [
        employee_no,
        user_name,
        email,
        password,
        department_id
    ]);
    return result.rows[0];
};

export const register = async (pool, hashedPassword, token) => {
    const sql = `
        UPDATE users
        SET password = $1,
            password_reset_token = NULL,
            password_reset_expires = NULL,
            registered_flag = true,
            updated_at = NOW()
        WHERE password_reset_token = $2
    `;
    await pool.query(sql, [hashedPassword, token]);
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

