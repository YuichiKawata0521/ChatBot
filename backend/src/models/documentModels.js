export const documentModel = {
    async saveDocTable(client, title, source, metadata) {
        const sql = `
            INSERT INTO documents (title, source, status, metadata)
            VALUES($1, $2, 'processing', $3)
            RETURNING id;
        `;

        const result = await client.query(sql, [title, source, JSON.stringify(metadata || {})]);
        return result;
    },

    async saveParentChunksTable(client, documentId, content) {
        const sql = `
            INSERT INTO parent_chunks (document_id, parent_index, content)
            VALUES ($1, $2, $3) RETURNING id;
        `;
        const result = await client.query(sql, [documentId, 0, content]);
        return result;
    },

    async saveChiledChunksTable(client, parentChunkId, chunk, embeddingStr) {
        const sql = `
            INSERT INTO child_chunks (parent_chunk_id, child_index, content, embedding, token_count)
            VALUES ($1, $2, $3, $4, $5);
        `;
        const result = await client.query(sql, [parentChunkId, chunk.chunk_index, chunk.content, embeddingStr, chunk.token_count]);
        return result;
    },
    
    async updateDocumentStatus(client, documentId) {
        const sql = `
            UPDATE documents SET status = 'completed' WHERE id = $1;
        `;
        return await client.query(sql, [documentId]);
    },

    async deleteDocument(client, documentId) {
        const sql = `
            DELETE FROM documents WHERE id = $1;
        `;
        return await client.query(sql, [documentId]);
    },

    async updateDocumentTitle(client, documentId, title) {
        const sql = `
            UPDATE documents SET title = $1 WHERE id = $2;
        `;
        return await client.query(sql, [title, documentId]);
    },

    async deleteChunksByDocumentId(client, documentId) {
        const sql = `
            DELETE FROM parent_chunks WHERE document_id = $1;
        `;

        return await client.query(sql, [documentId]);
    },

    async getDocumentWithContent(client, documentId) {
        const sql = `
            SELECT content FROM parent_chunks 
            WHERE document_id =  $1
            ORDER BY parent_index ASC;
        `;
        const result = await client.query(sql, [documentId]);
        return result.rows[0];
    }
}