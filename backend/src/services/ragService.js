import { getPool } from "../config/db.js";

export const ragService = {
    async searchRelevantChunks(queryText, documentId, limit=5) {
        try {
            const pool = getPool();

            // 1. クエリをベクトル化
            const endpoint = 'http://llm:8000/api/embed/query';
            const result = await fetch(endpoint, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ text: queryText })
            });

            if (!result.ok) {
                console.error(`Embedding API Error: ${result.statusText}`);
                return [];
            }

            const { embedding } = await result.json();

            // pgvectorの形式に変換
            const embeddingStr = `[${embedding.join(',')}]`;
            // ベクトル検索
            const sql = `
                SELECT
                    cc.content,
                    1 - (cc.embedding <=> $1) as similarity
                FROM child_chunks cc
                JOIN parent_chunks pc ON cc.parent_chunk_id = pc.id
                WHERE pc.document_id = $2
                ORDER BY cc.embedding <=> $1
                LIMIT $3;
            `;
            const dbResult = await pool.query(sql, [embeddingStr, documentId, limit]);

            return result.rows.map(row => row.content);
        } catch (error) {
            console.error('RAG Search Error: ', error);
            return [];
        }
    }
};