import {getPool} from '../config/db.js';
import AppError from '../utils/appError.js';

export const createDocument = async (req, res, next) => {
    const { title, content, source } = req.body;
    const pool = getPool();
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. documentsテーブルへ保存
        const docRes = await client.query(
            `INSERT INTO documents (title, source, status, metadata) 
             VALUES ($1, $2, 'pending', $3) RETURNING id`,
            [title, source || 'txt', JSON.stringify({ charCount: content.length })]
        );
        const documentId = docRes.rows[0].id;

        // 2. parent_chunksテーブルへ保存 (今回は簡易的に全文を1チャンクとして保存)
        // ※ 本来はここで適切なサイズに分割します
        await client.query(
            `INSERT INTO parent_chunks (document_id, parent_index, content)
             VALUES ($1, $2, $3)`,
            [documentId, 0, content]
        );

        // TODO: ここでembedding処理（非同期ジョブなど）をキックする

        await client.query('COMMIT');

        res.status(201).json({
            success: true,
            data: { documentId }
        });

    } catch (error) {
        await client.query('ROLLBACK');
        next(error);
    } finally {
        client.release();
    }
};

export const getDocuments = async (req, res, next) => {
    try {
        const result = await db.query(
            `SELECT id, title, source, status, created_at 
             FROM documents 
             WHERE status != 'failed' 
             ORDER BY created_at DESC`
        );
        res.status(200).json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        next(error);
    }
};