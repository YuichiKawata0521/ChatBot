export const chatModel = {
    async countUserMessagesByUserId(pool, userId) {
        const sql = `
            SELECT COUNT(*)::INT AS total
            FROM messages m
            INNER JOIN threads t ON t.id = m.thread_id
            WHERE t.user_id = $1
              AND t.mode IN ('normal', 'rag')
              AND m.sender = 'user';
        `;
        const result = await pool.query(sql, [userId]);
        return result.rows[0]?.total ?? 0;
    },

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
            SELECT
                t.*,
                d.title AS document_title
            FROM threads t
            LEFT JOIN documents d ON d.id = t.document_id
            WHERE t.id = $1
              AND t.user_id = $2;
        `;
        const result = await pool.query(sql, [threadId, userId]);
        return result.rows[0];
    },

    async getThreadsByUserId(pool, userId) {
        const sql = `
            SELECT id, title, created_at, updated_at, mode
            FROM threads
            WHERE user_id = $1 AND show_history = true
            ORDER BY updated_at DESC;
        `;
        const result = await pool.query(sql, [userId]);
        return result.rows;
    },

    async getRecentMessages(pool, threadId, limit = 6) {
        const sql = `
            SELECT id, sender, content, rating FROM messages
            WHERE thread_id = $1
            ORDER BY created_at DESC
            LIMIT $2;
        `;
        const result = await pool.query(sql, [threadId, limit]);
        return result.rows;
    },

    async updateMessageRating(pool, messageId, userId, rating) {
        const sql = `
            UPDATE messages m
            SET rating = $1
            FROM threads t
            WHERE m.id = $2
              AND m.thread_id = t.id
              AND t.user_id = $3
              AND m.sender = 'assistant'
            RETURNING m.id, m.thread_id, m.rating;
        `;

        const result = await pool.query(sql, [rating, messageId, userId]);
        return result.rows[0] || null;
    },

    async deleteThreadsByUserId(pool, userId) {
        const sql = `
            UPDATE threads
            SET show_history = false,
                updated_at = NOW()
            WHERE user_id = $1;
        `;
        const result = await pool.query(sql, [userId]);
        return result.rowCount;
    },

    async updateThreadTitle(pool, threadId, userId, title) {
        const sql = `
            UPDATE threads
            SET title = $1,
                updated_at = NOW()
            WHERE id = $2
              AND user_id = $3
            RETURNING id, title, updated_at;
        `;
        const result = await pool.query(sql, [title, threadId, userId]);
        return result.rows[0] || null;
    },

    async deleteThreadById(pool, threadId, userId) {
        const sql = `
            UPDATE threads
            SET show_history = false,
                updated_at = NOW()
            WHERE id = $1
              AND user_id = $2
            RETURNING id;
        `;
        const result = await pool.query(sql, [threadId, userId]);
        return result.rows[0] || null;
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
            await pool.query(sql, [messageId, ref.document_id, ref.chunk_id, ref.similarity]);
        }
    },

    async getMessageReferencesByMessageIds(pool, messageIds) {
        if (!messageIds || messageIds.length === 0) return [];

        const sql = `
            SELECT
                mr.message_id,
                mr.document_id,
                mr.child_chunk_id AS chunk_id,
                mr.relevance_score AS similarity,
                d.title,
                cc.content
            FROM message_references mr
            LEFT JOIN documents d ON d.id = mr.document_id
            LEFT JOIN child_chunks cc ON cc.id = mr.child_chunk_id
            WHERE mr.message_id = ANY($1::BIGINT[])
            ORDER BY mr.message_id, mr.id;
        `;

        const result = await pool.query(sql, [messageIds]);
        return result.rows;
    }
};