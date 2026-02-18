import fs from 'fs/promises';
import path from 'path';
import {getPool} from '../config/db.js';
import { documentModel } from '../models/documentModels.js';
import { llmService } from '../services/llmService.js';
import AppError from '../utils/appError.js';

const processAndSaveContent = async (title, content, source, metadata) => {
    const pool = getPool();
    const client = await pool.connect();

    try {
        await client.query('BEGIN');
        // documentテーブルへ保存
        const docRes = await documentModel.saveDocTable(client, title, source, metadata);
        const documentId = docRes.rows[0].id;

        // parent_chunksテーブルへ保存
        const paretnRes = await documentModel.saveParentChunksTable(client, documentId, content);
        const parentChunkId = parentRes.rows[0].id;

        // Embedding APIを呼び出す
        const embedRes = await llmService.fetchEmbed(content);
        const embedData = await embedRes.json();

        for (const chunk of embedData.chunks) {
            const embeddingStr = `[${chunk.embedding.join(',')}]`;
            await documentModel.saveChiledChunksTable(client, parentChunkId, chunk, embeddingStr);
        }

        // ドキュメントのステータスを完了に更新
        await documentModel.updateDocumentStatus(client, documentId);

        await client.query('COMMIT');
        return {documentId, chunkCount: embedData.chunks.length};
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

export const createDocument = async (req, res, next) => {
    const { title, content, source } = req.body;
    const pool = getPool();
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. documentsテーブルへ保存
        const docRes = await client.query(
            `INSERT INTO documents (title, source, status, metadata) 
             VALUES ($1, $2, 'processing', $3) RETURNING id`,
            [title, source || 'txt', JSON.stringify({ charCount: content.length })]
        );
        const documentId = docRes.rows[0].id;

        // 2. parent_chunksテーブルへ保存
        const parentRes = await client.query(
            `INSERT INTO parent_chunks (document_id, parent_index, content)
             VALUES ($1, $2, $3) RETURNING id`,
             [documentId, 0, content]
        );
        const parentChunkId = parentRes.rows[0].id;

        // 3. PyhonのEmbedding APIを呼び出す
        const endpoint = 'http://llm:8000/api/embed';
        const embedResponse = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json'},
            body: JSON.stringify({ text: content })
        });

        if (!embedResponse.ok) {
            throw new Error(`Embedding failed: ${embedResponse.statusText}`);
        }

        const embedData = await embedResponse.json();

        // 4. child_chunksテーブルにベクトルとチャンクを保存
        for (const chunk of embedData.chunks) {
            const embeddingStr = `[${chunk.embedding.join(',')}]`;

            await client.query(
                `INSERT INTO child_chunks (parent_chunk_id, child_index, content, embedding, token_count)
                 VALUES ($1, $2, $3, $4, $5)`,
                 [parentChunkId, chunk.chunk_index, chunk.content, embeddingStr, chunk.token_count]
            );
        }

        // 5.documentsのステータスを完了に更新
        await client.query(
            `UPDATE documents SET status = 'completed' WHERE id = $1`,
            [documentId]
        );

        await client.query('COMMIT');

        res.status(201).json({
            success: true,
            data: { documentId, chunkCount: embedData.chunks.length }
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Document Save Error: ", error);
        next(error);
    } finally {
        client.release();
    }
};

export const uploadDocument = async (req, res, next) => {
    if (!req.file) {
        return next(new AppError('Please upload a file', 400));
    }
    const filePath = req.file.path;
    const originalName = req.file.originalName;

    try {
        const fileBuffer = await fs.readFile(filePath);
        const blob = new Blob([fileBuffer]);
        const formData = new FormData();
        formData.append('file', blob, originalName);

        const conversionRes = await llmService.fetchConvert(formData);
        const convertData = await conversionRes.json();
        const markdownConten = convertData.markdown;

        // 検証用にローカルに吐き出し
        const debugDir = path.join(process.cwd(), 'debug_output');
        await fs.mkdir(debugDir, { recursive: true });

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const debugFileName = `${path.parse(originalName).name}_${timestamp}.md`;
        await fs.writeFile(path.join(debugDir, debugFileName), markdownConten);
        console.log(`Debug MD file saved: ${debugFileName}`);

        // DBへ保存
        const result = await processAndSaveContent(
            originalName,
            markdownConten,
            'file',
            { originalFileName: originalName, debugFile: debugFileName}
        );

        res.status(201).json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error("pload Document Error: ", error);
        next(error);
    } finally {
        try {
            await fs.unlink(filePath);
        } catch (err) {
            console.warn('Failed to delete temp file: ', err);
        }
    }
};

export const getDocuments = async (req, res, next) => {
    try {
        const pool = getPool();
        const sql = `
        SELECT id, title, source, status, uploaded_at 
        FROM documents 
        WHERE status != 'failed' 
        ORDER BY uploaded_at DESC;
        `;
        const result = await pool.query(sql);
        res.status(200).json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        next(error);
    }
};