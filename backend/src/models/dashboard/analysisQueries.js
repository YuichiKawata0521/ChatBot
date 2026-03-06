import { EXCLUDE_TZ, buildMasterIdentityParams } from './shared.js';

export const dashboardAnalysisQueries = {
    async getAnalysisRatedMessages(pool, masterIdentities, filters) {
        const { employeeNos, emails } = buildMasterIdentityParams(masterIdentities);
        const {
            fromDate,
            toDate,
            dep1Name = null,
            dep2Name = null,
            dep3Name = null,
            rating = null,
            limit = null
        } = filters;

        const hasLimit = Number.isInteger(Number(limit)) && Number(limit) > 0;

        const sql = `
            SELECT
                m.id AS message_id,
                m.created_at,
                m.rating,
                m.content AS answer_content,
                t.id AS thread_id,
                t.title AS thread_title,
                u.user_name,
                d.dep1_name,
                d.dep2_name,
                d.dep3_name,
                COALESCE(q.question_content, '') AS question_content
            FROM messages m
            INNER JOIN threads t ON t.id = m.thread_id
            INNER JOIN users u ON u.id = t.user_id
            LEFT JOIN departments d ON d.id = u.department_id
            LEFT JOIN LATERAL (
                SELECT
                    um.content AS question_content
                FROM messages um
                WHERE um.thread_id = t.id
                  AND um.sender = 'user'
                  AND um.created_at <= m.created_at
                ORDER BY um.created_at DESC, um.id DESC
                LIMIT 1
            ) q ON true
            WHERE m.sender = 'assistant'
              AND m.rating IN ('good', 'bad')
              AND NOT (u.employee_no = ANY($1::text[]) OR LOWER(u.email) = ANY($2::text[]))
              AND (m.created_at AT TIME ZONE '${EXCLUDE_TZ}')::date BETWEEN $3::date AND $4::date
              AND ($5::text IS NULL OR d.dep1_name = $5::text)
              AND ($6::text IS NULL OR d.dep2_name = $6::text)
              AND ($7::text IS NULL OR d.dep3_name = $7::text)
              AND ($8::text IS NULL OR m.rating = $8::text)
            ORDER BY m.created_at DESC, m.id DESC
            ${hasLimit ? 'LIMIT $9::int' : ''};
        `;

        const values = [
            employeeNos,
            emails,
            fromDate,
            toDate,
            dep1Name,
            dep2Name,
            dep3Name,
            rating
        ];

        if (hasLimit) {
            values.push(Number(limit));
        }

        const result = await pool.query(sql, values);
        return result.rows;
    },

    async getAnalysisRagQualityDailyDetails(pool, masterIdentities, filters) {
        const { employeeNos, emails } = buildMasterIdentityParams(masterIdentities);
        const {
            targetDate,
            dep1Name = null,
            dep2Name = null,
            dep3Name = null
        } = filters;

        const sql = `
            WITH rag_assistant_messages AS (
                SELECT
                    m.id AS message_id,
                    m.created_at,
                    m.rating,
                    m.content AS answer_content,
                    t.id AS thread_id,
                    t.title AS thread_title,
                    u.user_name,
                    d.dep1_name,
                    d.dep2_name,
                    d.dep3_name
                FROM messages m
                INNER JOIN threads t ON t.id = m.thread_id
                INNER JOIN users u ON u.id = t.user_id
                LEFT JOIN departments d ON d.id = u.department_id
                WHERE m.sender = 'assistant'
                  AND t.mode = 'rag'
                  AND NOT (u.employee_no = ANY($1::text[]) OR LOWER(u.email) = ANY($2::text[]))
                  AND (m.created_at AT TIME ZONE '${EXCLUDE_TZ}')::date = $3::date
                  AND ($4::text IS NULL OR d.dep1_name = $4::text)
                  AND ($5::text IS NULL OR d.dep2_name = $5::text)
                  AND ($6::text IS NULL OR d.dep3_name = $6::text)
            ),
            reference_stats AS (
                SELECT
                    mr.message_id,
                    COALESCE(MAX(mr.relevance_score), 0) AS max_relevance_score,
                    COALESCE(MAX(CASE WHEN mr.relevance_score >= 0.7 THEN 1 ELSE 0 END), 0) AS has_hit
                FROM message_references mr
                GROUP BY mr.message_id
            )
            SELECT
                ram.message_id,
                ram.created_at,
                ram.thread_id,
                ram.thread_title,
                ram.user_name,
                ram.dep1_name,
                ram.dep2_name,
                ram.dep3_name,
                ram.rating,
                ram.answer_content,
                COALESCE(q.question_content, '') AS question_content,
                COALESCE(rs.max_relevance_score, 0) AS max_relevance_score,
                COALESCE(rs.has_hit, 0) AS has_hit
            FROM rag_assistant_messages ram
            LEFT JOIN LATERAL (
                SELECT
                    um.content AS question_content
                FROM messages um
                WHERE um.thread_id = ram.thread_id
                  AND um.sender = 'user'
                  AND um.created_at <= ram.created_at
                ORDER BY um.created_at DESC, um.id DESC
                LIMIT 1
            ) q ON true
            LEFT JOIN reference_stats rs ON rs.message_id = ram.message_id
            ORDER BY ram.created_at DESC, ram.message_id DESC
            LIMIT 200;
        `;

        const result = await pool.query(sql, [
            employeeNos,
            emails,
            targetDate,
            dep1Name,
            dep2Name,
            dep3Name
        ]);
        return result.rows;
    },

    async getAnalysisRagQualityTrend(pool, masterIdentities, filters) {
        const { employeeNos, emails } = buildMasterIdentityParams(masterIdentities);
        const {
            fromDate,
            toDate,
            dep1Name = null,
            dep2Name = null,
            dep3Name = null
        } = filters;

        const sql = `
            WITH date_series AS (
                SELECT generate_series($3::date, $4::date, INTERVAL '1 day')::date AS target_date
            ),
            rag_assistant_messages AS (
                SELECT
                    m.id AS message_id,
                    (m.created_at AT TIME ZONE '${EXCLUDE_TZ}')::date AS target_date,
                    m.rating
                FROM messages m
                INNER JOIN threads t ON t.id = m.thread_id
                INNER JOIN users u ON u.id = t.user_id
                LEFT JOIN departments d ON d.id = u.department_id
                WHERE m.sender = 'assistant'
                  AND t.mode = 'rag'
                  AND NOT (u.employee_no = ANY($1::text[]) OR LOWER(u.email) = ANY($2::text[]))
                  AND (m.created_at AT TIME ZONE '${EXCLUDE_TZ}')::date BETWEEN $3::date AND $4::date
                  AND ($5::text IS NULL OR d.dep1_name = $5::text)
                  AND ($6::text IS NULL OR d.dep2_name = $6::text)
                  AND ($7::text IS NULL OR d.dep3_name = $7::text)
            ),
            rag_message_stats AS (
                SELECT
                    ram.target_date,
                    ram.message_id,
                    ram.rating,
                    COALESCE(MAX(CASE WHEN mr.relevance_score >= 0.7 THEN 1 ELSE 0 END), 0) AS has_hit
                FROM rag_assistant_messages ram
                LEFT JOIN message_references mr ON mr.message_id = ram.message_id
                GROUP BY ram.target_date, ram.message_id, ram.rating
            ),
            daily_stats AS (
                SELECT
                    target_date,
                    COUNT(*) AS rag_response_count,
                    COALESCE(SUM(has_hit), 0) AS hit_response_count,
                    COUNT(*) FILTER (WHERE rating IN ('good', 'bad')) AS rated_response_count,
                    COUNT(*) FILTER (WHERE rating = 'good') AS good_response_count
                FROM rag_message_stats
                GROUP BY target_date
            )
            SELECT
                ds.target_date,
                COALESCE(dy.rag_response_count, 0) AS rag_response_count,
                COALESCE(dy.hit_response_count, 0) AS hit_response_count,
                COALESCE(dy.rated_response_count, 0) AS rated_response_count,
                COALESCE(dy.good_response_count, 0) AS good_response_count
            FROM date_series ds
            LEFT JOIN daily_stats dy ON dy.target_date = ds.target_date
            ORDER BY ds.target_date ASC;
        `;

        const result = await pool.query(sql, [
            employeeNos,
            emails,
            fromDate,
            toDate,
            dep1Name,
            dep2Name,
            dep3Name
        ]);
        return result.rows;
    },

    async getAnalysisCostTrend(pool, filters) {
        const {
            fromDate,
            toDate,
            dep1Name = null,
            dep2Name = null,
            dep3Name = null
        } = filters;

        const sql = `
            WITH date_series AS (
                SELECT generate_series($1::date, $2::date, INTERVAL '1 day')::date AS target_date
            ),
            daily_tokens AS (
                SELECT
                    (m.created_at AT TIME ZONE '${EXCLUDE_TZ}')::date AS target_date,
                    COALESCE(SUM(m.input_token_count), 0) AS input_tokens,
                    COALESCE(SUM(m.output_token_count), 0) AS output_tokens
                FROM messages m
                INNER JOIN threads t ON t.id = m.thread_id
                INNER JOIN users u ON u.id = t.user_id
                LEFT JOIN departments d ON d.id = u.department_id
                WHERE m.sender = 'assistant'
                  AND (m.created_at AT TIME ZONE '${EXCLUDE_TZ}')::date BETWEEN $1::date AND $2::date
                  AND ($3::text IS NULL OR d.dep1_name = $3::text)
                  AND ($4::text IS NULL OR d.dep2_name = $4::text)
                  AND ($5::text IS NULL OR d.dep3_name = $5::text)
                GROUP BY (m.created_at AT TIME ZONE '${EXCLUDE_TZ}')::date
            )
            SELECT
                ds.target_date,
                COALESCE(dt.input_tokens, 0) AS input_tokens,
                COALESCE(dt.output_tokens, 0) AS output_tokens
            FROM date_series ds
            LEFT JOIN daily_tokens dt ON dt.target_date = ds.target_date
            ORDER BY ds.target_date ASC;
        `;

        const result = await pool.query(sql, [
            fromDate,
            toDate,
            dep1Name,
            dep2Name,
            dep3Name
        ]);
        return result.rows;
    },

    async getAnalysisActiveUserTrend(pool, masterIdentities, filters) {
        const { employeeNos, emails } = buildMasterIdentityParams(masterIdentities);
        const {
            fromDate,
            toDate,
            dep1Name = null,
            dep2Name = null,
            dep3Name = null
        } = filters;

        const sql = `
            WITH date_series AS (
                SELECT generate_series($3::date, $4::date, INTERVAL '1 day')::date AS target_date
            ),
            filtered_user_messages AS (
                SELECT
                    (m.created_at AT TIME ZONE '${EXCLUDE_TZ}')::date AS target_date,
                    t.user_id
                FROM messages m
                INNER JOIN threads t ON t.id = m.thread_id
                INNER JOIN users u ON u.id = t.user_id
                LEFT JOIN departments d ON d.id = u.department_id
                WHERE m.sender = 'user'
                  AND NOT (u.employee_no = ANY($1::text[]) OR LOWER(u.email) = ANY($2::text[]))
                  AND (m.created_at AT TIME ZONE '${EXCLUDE_TZ}')::date BETWEEN $3::date AND $4::date
                  AND ($5::text IS NULL OR d.dep1_name = $5::text)
                  AND ($6::text IS NULL OR d.dep2_name = $6::text)
                  AND ($7::text IS NULL OR d.dep3_name = $7::text)
            )
            SELECT
                ds.target_date,
                COALESCE(COUNT(DISTINCT fum.user_id), 0) AS active_user_count
            FROM date_series ds
            LEFT JOIN filtered_user_messages fum ON fum.target_date = ds.target_date
            GROUP BY ds.target_date
            ORDER BY ds.target_date ASC;
        `;

        const result = await pool.query(sql, [
            employeeNos,
            emails,
            fromDate,
            toDate,
            dep1Name,
            dep2Name,
            dep3Name
        ]);
        return result.rows;
    },

    async getAnalysisDepartmentUsage(pool, masterIdentities, filters) {
        const { employeeNos, emails } = buildMasterIdentityParams(masterIdentities);
        const {
            fromDate,
            toDate,
            dep1Name = null,
            dep2Name = null,
            dep3Name = null
        } = filters;

        const sql = `
            WITH filtered_user_messages AS (
                SELECT
                    t.user_id,
                    d.dep1_name,
                    d.dep2_name,
                    d.dep3_name
                FROM messages m
                INNER JOIN threads t ON t.id = m.thread_id
                INNER JOIN users u ON u.id = t.user_id
                LEFT JOIN departments d ON d.id = u.department_id
                WHERE m.sender = 'user'
                  AND NOT (u.employee_no = ANY($1::text[]) OR LOWER(u.email) = ANY($2::text[]))
                  AND (m.created_at AT TIME ZONE '${EXCLUDE_TZ}')::date BETWEEN $3::date AND $4::date
                  AND ($5::text IS NULL OR d.dep1_name = $5::text)
                  AND ($6::text IS NULL OR d.dep2_name = $6::text)
                  AND ($7::text IS NULL OR d.dep3_name = $7::text)
            ),
            department_user_stats AS (
                SELECT
                    COALESCE(dep1_name, '') AS dep1_name,
                    COALESCE(dep2_name, '') AS dep2_name,
                    COALESCE(dep3_name, '') AS dep3_name,
                    COUNT(*) AS message_count,
                    COUNT(DISTINCT user_id) AS active_user_count
                FROM filtered_user_messages
                GROUP BY dep1_name, dep2_name, dep3_name
            ),
            department_assistant_token_stats AS (
                SELECT
                    COALESCE(d.dep1_name, '') AS dep1_name,
                    COALESCE(d.dep2_name, '') AS dep2_name,
                    COALESCE(d.dep3_name, '') AS dep3_name,
                    COALESCE(SUM(m.input_token_count), 0) AS input_tokens,
                    COALESCE(SUM(m.output_token_count), 0) AS output_tokens
                FROM messages m
                INNER JOIN threads t ON t.id = m.thread_id
                INNER JOIN users u ON u.id = t.user_id
                LEFT JOIN departments d ON d.id = u.department_id
                WHERE m.sender = 'assistant'
                  AND NOT (u.employee_no = ANY($1::text[]) OR LOWER(u.email) = ANY($2::text[]))
                  AND (m.created_at AT TIME ZONE '${EXCLUDE_TZ}')::date BETWEEN $3::date AND $4::date
                  AND ($5::text IS NULL OR d.dep1_name = $5::text)
                  AND ($6::text IS NULL OR d.dep2_name = $6::text)
                  AND ($7::text IS NULL OR d.dep3_name = $7::text)
                GROUP BY d.dep1_name, d.dep2_name, d.dep3_name
            )
            SELECT
                dus.dep1_name,
                dus.dep2_name,
                dus.dep3_name,
                dus.message_count,
                dus.active_user_count,
                COALESCE(dats.input_tokens, 0) AS input_tokens,
                COALESCE(dats.output_tokens, 0) AS output_tokens
            FROM department_user_stats dus
            LEFT JOIN department_assistant_token_stats dats
                ON dats.dep1_name = dus.dep1_name
               AND dats.dep2_name = dus.dep2_name
               AND dats.dep3_name = dus.dep3_name
            ORDER BY dus.message_count DESC, dus.dep1_name ASC, dus.dep2_name ASC, dus.dep3_name ASC;
        `;

        const result = await pool.query(sql, [
            employeeNos,
            emails,
            fromDate,
            toDate,
            dep1Name,
            dep2Name,
            dep3Name
        ]);
        return result.rows;
    },

    async getAnalysisDepartmentMembers(pool, masterIdentities, filters) {
        const { employeeNos, emails } = buildMasterIdentityParams(masterIdentities);
        const {
            fromDate,
            toDate,
            dep1Name = null,
            dep2Name = null,
            dep3Name = null
        } = filters;

        const sql = `
            WITH target_users AS (
                SELECT
                    u.id,
                    u.employee_no,
                    u.user_name,
                    u.email,
                    d.dep1_name,
                    d.dep2_name,
                    d.dep3_name
                FROM users u
                LEFT JOIN departments d ON d.id = u.department_id
                WHERE NOT (u.employee_no = ANY($1::text[]) OR LOWER(u.email) = ANY($2::text[]))
                  AND ($3::text IS NULL OR d.dep1_name = $3::text)
                  AND ($4::text IS NULL OR d.dep2_name = $4::text)
                  AND ($5::text IS NULL OR d.dep3_name = $5::text)
            ),
            user_usage AS (
                SELECT
                    tu.id AS user_id,
                    COUNT(m.id) FILTER (WHERE m.sender = 'user') AS message_count,
                    COUNT(m.id) FILTER (WHERE m.sender = 'user' AND t.mode = 'rag') AS rag_message_count,
                    MAX(m.created_at) FILTER (WHERE m.sender = 'user') AS last_message_at
                FROM target_users tu
                LEFT JOIN threads t ON t.user_id = tu.id
                LEFT JOIN messages m
                    ON m.thread_id = t.id
                   AND (m.created_at AT TIME ZONE '${EXCLUDE_TZ}')::date BETWEEN $6::date AND $7::date
                GROUP BY tu.id
            )
            SELECT
                tu.id AS user_id,
                tu.employee_no,
                tu.user_name,
                tu.email,
                COALESCE(tu.dep1_name, '') AS dep1_name,
                COALESCE(tu.dep2_name, '') AS dep2_name,
                COALESCE(tu.dep3_name, '') AS dep3_name,
                COALESCE(uu.message_count, 0) AS message_count,
                COALESCE(uu.rag_message_count, 0) AS rag_message_count,
                uu.last_message_at
            FROM target_users tu
            LEFT JOIN user_usage uu ON uu.user_id = tu.id
            ORDER BY COALESCE(uu.message_count, 0) DESC, tu.user_name ASC;
        `;

        const result = await pool.query(sql, [
            employeeNos,
            emails,
            dep1Name,
            dep2Name,
            dep3Name,
            fromDate,
            toDate
        ]);
        return result.rows;
    }
};
