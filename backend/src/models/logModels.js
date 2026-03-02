export const insertSystemLog = async (pool, logData) => {
    const sql = `
        INSERT INTO system_logs
        (level, event_type, message, context, request_id, user_id, department_id, service, environment)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id;
    `;

    const values = [
        logData.level,
        logData.event_type || 'general',
        logData.message,
        logData.context,
        logData.request_id || null,
        logData.user_id || null,
        logData.department_id || null,
        logData.service || 'backend',
        logData.environment || 'development'
    ];

    const result = await pool.query(sql, values);
    return result.rows[0];
};

export const getAllLogs = async (pool) => {
    const sql = `
        SELECT
            l.*,
            COALESCE(
                u.user_name,
                l.context -> 'option' ->> 'user_name'
            ) AS user_name
        FROM system_logs l
        LEFT JOIN users u
            ON l.user_id = u.id
        ORDER BY created_at DESC;
    `;
    const result = await pool.query(sql);
    return result.rows;
};

export const AllLogs = getAllLogs;