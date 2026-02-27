import fs from 'fs/promises';
import path from 'path';
import {getPool} from '../config/db.js';
import { documentModel } from '../models/documentModels.js';
import logger from '../utils/logger.js';
import AppError from '../utils/appError.js';
import catchAsync from '../utils/catchAsync.js';
import { inferDocumentSource, normalizeUploadedFilename } from './documentController.js';
import { llmService } from '../services/llmService.js';

export const deleteDocument = catchAsync(async (req, res, next) => {
    const id = req.params.id;
    const pool = getPool();

    const result = await documentModel.deleteDocument(pool, id);
    if (result.rowCount === 0 || !result) {
        logger.error('ドキュメントの削除に失敗しました', {option: {document_id: id}});
        return next(new AppError('Failed to delete document', 400));
    }

    logger.info('ドキュメントの削除を実行しました', {option: {user: req.user.user_name, document_id: id}});
    res.status(200).json({ success: true, message: "ドキュメントの削除に成功しました"});
});

export const updateTitle = catchAsync(async (req, res, next) => {
    const id = req.params.id;
    const { title } = req.body;
    const pool = getPool();

    const result = await documentModel.updateDocumentTitle(pool, id, title);

    if (!result || result.rowCount === 0) {
        logger.error('ドキュメントのタイトル更新に失敗しました', {option: {document_id: id, new_title: title}});
        return next(new AppError('Failed to rename document', 400));
    }
    logger.info('ドキュメントのタイトル更新に成功しました', {option: {user: req.user.user_name, document_id: id}});
    res.status(200).json({success: true, message: 'ドキュメントのタイトル変更に成功しました'});
});

export const reUploadDocument = catchAsync(async (req, res, next) => {
    const id = req.params.id;

    if (!req.file) {
        logger.warn('ファイルをアップロードしてください');
        return next(new AppError('ファイルをアップロードしてください', 400));
    }

    const filePath = req.file.path;
    const originalName = normalizeUploadedFilename(req.file.originalname);
    const source = inferDocumentSource(originalName);

    const pool = getPool();
    const client = await pool.connect();

    try {
        const fileBuffer = await fs.readFile(filePath);
        const blob = new Blob([fileBuffer]);
        const formData = new FormData();
        formData.append('file', blob, originalName);

        const conversionRes = await llmService.fetchConvert(formData);
        const convertData = await conversionRes.json();
        const markdownConten = convertData.markdown;

        await client.query('BEGIN');

        await documentModel.deleteChunksByDocumentId(client, id);

        const parentRes = await documentModel.saveParentChunksTable(client, id, markdownConten);
        const parentChunkId = parentRes.rows[0].id;

        const embedRes = await llmService.fetchEmbed(markdownConten);
        const embedData = await embedRes.json();

        for (const chunk of embedData.chunks) {
            const embeddingStr = `[${chunk.embedding.join(',')}]`;
            await documentModel.saveChiledChunksTable(client, parentChunkId, chunk, embeddingStr);
        }

        await documentModel.updateDocumentStatusWithMeta(client, source, originalName, id);

        await client.query('COMMIT');

        logger.info('再アップロードとインデックス再構築に成功しました', {option: {user: req.user?.user_name, document_id: id}});
        res.status(200).json({
            success: true,
            message: '再インデックスに成功しました',
            data: {documentId: id, chunkCount: embedData.chunks.length}
        });
    } catch (error) {
        await client.query('ROLLBACK');
        logger.error('再インデックスに失敗しました', {option: {document_id: id, detail: error.message}});
        return next(new AppError('Failed to re-upload document', 500));
    } finally {
        client.release();
        try {
            await fs.unlink(filePath);
        } catch (err) {
            logger.warn('アップロードしていた一時ファイルの削除に失敗しました', {option: {file_path: filePath, detail: err.message}});
        }
    }
});

export const getDocContent = catchAsync(async (req, res, next) => {
    const id = req.params.id;
    const pool = getPool();

    const content = await documentModel.getDocumentWithContent(pool, id);

    if (!content) {
        logger.error('ドキュメントのコンテンツを取得できませんでした', {option: {document_id: id}});
        return next(new AppError('Failet to get document content', 400));
    }

    logger.info('ドキュメントのコンテンツを取得しました')
    res.status(200).json({success: true, content: content.content, message: 'ドキュメントのコンテンツを取得しました'});
});