import fs from 'fs/promises';
import path from 'path';
import {getPool} from '../config/db.js';
import { documentModel } from '../models/documentModels.js';
import logger from '../utils/logger.js';
import AppError from '../utils/appError.js';

export const deleteDocument = async (req, res, next) => {
    const id = req.params.id;
    const pool = getPool();

    const result = await documentModel.deleteDocument(pool, id);
    if (!result) {
        logger.error('ドキュメントの削除に失敗しました', {option: {document_id: documentId}});
        return next(new AppError('Failed to delete document', 400));
    }

    logger.info('ドキュメントの削除を実行しました', {option: {user: req.user.user_name, document_id: documentId}});
    res.status(200).json({ success: true, message: "ドキュメントの削除に成功しました"});
}

export const updateTitle = async (req, res, next) => {
    const { id } = req.params.id;
    const { title } = req.body;
    const pool = getPool();

    const result = await documentModel.updateDocumentTitle(pool, id, title);

    if (!result) {
        logger.error('ドキュメントのタイトル更新に失敗しました', {option: {document_id: id, new_title: title}});
        return next(new AppError('Failed to rename document', 400));
    }
    logger.info('ドキュメントのタイトル更新に成功しました', {option: {user: req.user.user_name, document_id: id}});
    res.status(200).json({success: true, message: 'ドキュメントのタイトル変更に成功しました'});
}

export const reIndex = async (req, res, next) => {
    const { id } = req.params.id;
    const pool = getPool();

    const result = await documentModel.deleteChunksByDocumentId(pool, id);
    if (!result) {
        logger.error('再インデックスの際のチャンク削除に失敗しました', {option: {document_id: id}});
        return next(new AppError('Failed to reIndex'));
    }
    logger.info('再インデックス成功', {option: {user: req.user.user_name, document_id: id}});
    res.status(200).json({success: true, message: "再インデックスに成功しました"});
}

export const getDocContent = async (req, res, next) => {
    const { id } = req.params.id;
    const pool = getPool();

    const content = await documentModel.getDocumentWithContent(pool, id);

    if (!content) {
        logger.error('ドキュメントのコンテンツを取得できませんでした', {option: {document_id: id}});
        return next(new AppError('Failet to get document content', 400));
    }

    logger.info('ドキュメントのコンテンツを取得しました')
    res.status(200).json({success: true, content: content, message: 'ドキュメントのコンテンツを取得しました'});
}