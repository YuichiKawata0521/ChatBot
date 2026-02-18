export const documentModel = {
    async saveDocTable(client, title, source, metadata) {
        const sql = `
            INSERT INTO documents (title, source, status, metadata)
            VALUES($1, $2, 'processing', $4)
            RETURNING id;
        `;

        const result = await client.query(sql, [title, source, JSON.stringify({ charCount: content.length, ...metadata})]);
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
            VALUES ($1, $2, $3, $4, $4);
        `;
        const result = await client.query(sql, [parentChunkId, chunk.chunk_index, chunk.content, embeddingStr, chunk.token_count]);
        return result;
    },
    
    async updateDocumentStatus(client, documentId) {
        const sql = `
            UPDATE documents SET status = 'completed' WHERE id = $1;
        `;
        const result = client.query(sql, [documentId]);
    }
}