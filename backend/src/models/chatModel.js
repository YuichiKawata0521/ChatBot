export const chatModel = {
    async createThread(pool, userId, departmentId, title, mode, modelName, documentId) {
        const sql = `
            INSERT INTO threads (user_id, department_id, title, mode, model_name, document_id)
            VALUES($1, $2, $3, $4, $5, $6)
            RETURNING *;
        `;

        const result = await pool.query(sql, [userId, departmentId, title, mode, modelName, documentId || null]);
        return result.rows[0];
    },

    async saveMessage({ pool, threadId, sender, content, inputTokenCount=0, outputTokenCount=0 }) {
        const sql = `
            INSERT INTO messages (thread_id, sender, content, input_token_count, output_token_count)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *;
        `;
        const result = await pool.query(sql, [threadId, sender, content,inputTokenCount, outputTokenCount]);
        
        // メッセージ保存後、スレッドのupdated_atを更新
        const updateThreadSql = `
            UPDATE threads
            SET updated_at = NOW()
            WHERE id = $1;
        `;
        await pool.query(updateThreadSql, [threadId]);
        
        return result.rows[0];
    },

    async getThread(pool, threadId, userId) {
        const sql = `
            SELECT * FROM threads WHERE id = $1 AND user_id = $2;
        `;
        const result = await pool.query(sql, [threadId, userId]);
        return result.rows[0];
    },

    async getThreadsByUserId(pool, userId) {
        const sql = `
            SELECT id, title, created_at, updated_at, mode
            FROM threads
            WHERE user_id = $1 AND show_history = false
            ORDER BY updated_at DESC;
        `;
        const result = await pool.query(sql, [userId]);
        return result.rows;
    },

    async getRecentMessages(pool, threadId, limit = 6) {
        const sql = `
            SELECT sender, content FROM messages
            WHERE thread_id = $1
            ORDER BY created_at ASC
            LIMIT $2;
        `;
        const result = await pool.query(sql, [threadId, limit]);
        return result.rows;
    },

    async deleteThreadsByUserId(pool, userId) {
        const sql = `
            UPDATE threads
            SET show_history = true
            WHERE user_id = $1;
        `;
        const result = await pool.query(sql, [userId]);
        return result.rowCount;
    },

    async updateThreadTimestamp(pool, threadId) {
        await pool.query(
            `UPDATE threads SET updated_at = NOW() WHERE id = $1`,
            [threadId]
        );
    },

    async saveMessageReferences(pool, messageId, references) {
        if (!references || references.length === 0) return;

        const sql = `
            INSERT INTO message_references (message_id, document_id, child_chunk_id, relevance_score)
            VALUES ($1, $2, $3, $4);
        `;

        for (const ref of references) {
            await pool.query(sql, [messageId, res.document_id, res.chunk_id, res.similarity]);
        }
    }
};