export const getUsers = async (pool) => {
    const sql = `
        SELECT
            u.id AS id,
            u.employee_no,
            u.user_name AS username,
            u.email,
            u.role,
            u.department_id,
            u.deleted_at,
            d.dep1_name,
            d.dep2_name,
            d.dep3_name
        FROM users u
        LEFT JOIN departments d ON u.department_id = d.id
        ORDER BY u.id ASC;
    `;
    const result = await pool.query(sql);
    return result.rows;
};

export const getDepartments = async (pool) => {
    const sql = `
        SELECT
            id,
            dep1_code,
            dep1_name,
            dep2_code,
            dep2_name,
            dep3_code,
            dep3_name
        FROM departments
        WHERE dep1_name IS NOT NULL
        ORDER BY dep1_name ASC, dep2_name ASC NULLS FIRST, dep3_name ASC NULLS FIRST;
    `;
    const result = await pool.query(sql);
    return result.rows;
};

export const getDepartmentByHierarchy = async (pool, departmentData) => {
    const {
        dep1_code = null,
        dep1_name = null,
        dep2_code = null,
        dep2_name = null,
        dep3_code = null,
        dep3_name = null
    } = departmentData;

    const sql = `
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
    const result = await pool.query(sql, [dep1_code, dep1_name, dep2_code, dep2_name, dep3_code, dep3_name]);
    return result.rows[0] || null;
};

export const createDepartment = async (pool, departmentData) => {
    const {
        dep1_code = null,
        dep1_name = null,
        dep2_code = null,
        dep2_name = null,
        dep3_code = null,
        dep3_name = null
    } = departmentData;

    const sql = `
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

    const result = await pool.query(sql, [dep1_code, dep1_name, dep2_code, dep2_name, dep3_code, dep3_name]);
    return result.rows[0];
};

export const getUserByEmployeeNoOrEmail = async (pool, employee_no, email) => {
    // 重複チェック用
    const sql = `
        SELECT id FROM users 
        WHERE (employee_no = $1 OR email = $2);
    `;
    const result = await pool.query(sql, [employee_no, email]);
    return result.rows[0];
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

export const updateUserById = async (pool, userId, userData) => {
    const { employee_no, username, email, department_id, role } = userData;

    const sql = `
        UPDATE users
        SET
            employee_no = $1,
            user_name = $2,
            email = $3,
            department_id = $4,
            role = $5,
            deleted_at = NULL,
            updated_at = now()
        WHERE id = $6
        RETURNING id, employee_no, user_name AS username, email, role, department_id;
    `;

    const result = await pool.query(sql, [employee_no, username, email, department_id || null, role || 'user', userId]);
    return result.rows[0];
};

export const createUser = async (pool, userData) => {
    const {
        employee_no,
        username,
        email,
        password,
        department_id,
        role,
        registered_flag = false
    } = userData;
    const sql = `
        INSERT INTO users (employee_no, user_name, email, password, department_id, role, registered_flag)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, employee_no, user_name AS username, email, role;
    `;
    const result = await pool.query(sql, [
        employee_no,
        username,
        email,
        password,
        department_id || null,
        role || 'user',
        registered_flag
    ]);
    return result.rows[0];
}

export const resetUserPasswordById = async (pool, userId, hashedPassword) => {
    const sql = `
        UPDATE users
        SET
            password = $1,
            registered_flag = false,
            updated_at = now()
        WHERE id = $2
        RETURNING id, employee_no, user_name AS username, email;
    `;
    const result = await pool.query(sql, [hashedPassword, userId]);
    return result.rows[0] || null;
};

export const softDeleteUserById = async (pool, userId) => {
    const sql = `
        UPDATE users
        SET deleted_at = now()
        WHERE id = $1
          AND deleted_at IS NULL
        RETURNING id;
    `;
    return await pool.query(sql, [userId]);
};

export const hardDeleteUserById = async (pool, userId) => {
    const sql = `
        WITH target_threads AS (
            SELECT id
            FROM threads
            WHERE user_id = $1
        ),
        deleted_messages AS (
            DELETE FROM messages m
            USING target_threads tt
            WHERE m.thread_id = tt.id
            RETURNING m.id
        ),
        deleted_threads AS (
            DELETE FROM threads
            WHERE user_id = $1
            RETURNING id
        )
        DELETE FROM users
        WHERE id = $1
        RETURNING id;
    `;
    return await pool.query(sql, [userId]);
};

export const restoreUserById = async (pool, userId) => {
    const sql = `
        UPDATE users
        SET
            deleted_at = NULL,
            updated_at = now()
        WHERE id = $1
          AND deleted_at IS NOT NULL
        RETURNING id;
    `;
    return await pool.query(sql, [userId]);
};