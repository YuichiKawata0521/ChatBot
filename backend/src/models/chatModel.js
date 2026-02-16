export const chatModel = {
    async createThread(pool, userId, departmentId, title, modelName) {
        const sql = `
            INSERT INTO threads (user_id, department_id, title, model_name)
            VALUES($1, $2, $3, $4)
            RETURNING *;
        `;

        const result = await pool.query(sql, [userId, departmentId, title, modelName]);
        return result.rows[0];
    },

    async saveMessage({ pool, threadId, sender, content, inputTokenCount=0, outputTokenCount=0 }) {
        const sql = `
            INSERT INTO messages (thread_id, sender, content, input_token_count, output_token_count)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *;
        `;
        const result = await pool.query(sql, [threadId, sender, content,inputTokenCount, outputTokenCount]);
        return result.rows[0];
    },

    async getThread(pool, threadId, userId) {
        const sql = `
            SELECT * FROM threads WHERE id = $1 AND user_id = $2;
        `;
        const result = await pool.query(sql, [threadId, userId]);
        return result.rows[0];
    },

    async getRecentMessages(pool, threadId, limit = 6) {
        const sql = `
            SELECT sender, content FROM messages
            WHERE thread_id = $1
            ORDER BY created_at DESC
            LIMIT $2;
        `;
        const result = await pool.query(sql, [threadId, limit]);
        return result.rows;
    }
};