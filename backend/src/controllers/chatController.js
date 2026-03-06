import { chatService } from '../services/chatService.js';
import { chatModel } from '../models/chatModel.js';
import { getPool } from '../config/db.js';
import logger from '../utils/logger.js';
import { llmService } from '../services/llmService.js';
import { estimateTokenCount } from '../utils/tokenEstimator.js';

// スレッド作成
export const createThread = async (req, res, next) => {
    try {
        const { title, documentId, modelName } = req.body;
        const userId = req.session.user.id;

        const thread = await chatService.createThread(getPool(), userId, title, modelName, documentId);
        logger.info('スレッドを作成しました', {
            option: {
                user_id: userId,
                thread_id: thread.id,
                document_id: documentId ?? null,
                model_name: modelName ?? null
            }
        });
        
        res.status(201).json({
            success: true,
            threadId: thread.id,
            data: thread
        });
    } catch (error) {
        logger.error('スレッド作成に失敗しました', {
            option: {
                user_id: req.session?.user?.id ?? null,
                detail: error.message,
                stack: error.stack
            }
        });
        next(error);
    }
};

// スレッド一覧取得
export const getThreads = async (req, res, next) => {
    try {
        const userId = req.session.user.id;
        const threads = await chatService.getThreads(getPool(), userId);
        
        res.status(200).json({
            success: true,
            data: threads
        });
    } catch (error) {
        logger.error('スレッド一覧の取得に失敗しました', {
            option: {
                user_id: req.session?.user?.id ?? null,
                detail: error.message,
                stack: error.stack
            }
        });
        next(error);
    }
};

// 履歴取得
export const getHistory = async (req, res, next) => {
    try {
        const { threadId } = req.params;
        const userId = req.session.user.id;

        const messages = await chatService.getHistory(getPool(), threadId, userId);
        
        res.status(200).json({
            success: true,
            data: messages
        });
    } catch (error) {
        logger.error('チャット履歴の取得に失敗しました', {
            option: {
                user_id: req.session?.user?.id ?? null,
                thread_id: req.params?.threadId ?? null,
                detail: error.message,
                stack: error.stack
            }
        });
        next(error);
    }
};

// チャットストリーム処理
export const sendMessage = async (req, res, next) => {
    try {
        const { message, modelName, documentId } = req.body;
        let { threadId } = req.body;
        const userId = req.session.user.id;

        if (!threadId) {
            const title = message.replace(/\n/g, ' ').substring(0, 30) + (message.length > 30 ? '...' : '');
            const thread = await chatService.createThread(getPool(), userId, title, modelName, documentId);
            threadId = thread.id;
            logger.info('メッセージ送信時にスレッドを新規作成しました', {
                option: {
                    user_id: userId,
                    thread_id: threadId,
                    document_id: documentId ?? null,
                    model_name: modelName ?? null
                }
            });
        }

        // SSEヘッダー設定
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.write(`data: ${JSON.stringify({ type: 'meta', threadId })}\n\n`);

        // ServiceのAsyncGeneratorからデータを受け取り、クライアントへ流す
        const stream = chatService.processChatStream(getPool(), threadId, userId, message, modelName);

        for await (const chunk of stream) {
            res.write(`data: ${JSON.stringify(chunk)}\n\n`);
        }

        // 完了シグナル
        res.write('data: [DONE]\n\n');
        res.end();

    } catch (error) {
        logger.error('チャットストリーム処理に失敗しました', {
            option: {
                user_id: req.session?.user?.id ?? null,
                thread_id: req.body?.threadId ?? null,
                detail: error.message,
                stack: error.stack
            }
        });
        // ストリーム途中でのエラーはJSONレスポンスできないため、SSEのエラー形式で送るか切断する
        if (!res.headersSent) {
            next(error);
        } else {
            res.write(`data: ${JSON.stringify({ error: 'Internal Server Error' })}\n\n`);
            res.end();
        }
    }
};

export const deleteAllThreads = async (req, res, next) => {
    try {
        const userId = req.session.user.id;
        await chatService.deleteAllThreads(getPool(), userId);
        logger.info('全スレッドを削除しました', {
            option: {
                user_id: userId
            }
        });
        res.status(200).json({
            success: true
        });
    } catch (error) {
        logger.error('全スレッド削除に失敗しました', {
            option: {
                user_id: req.session?.user?.id ?? null,
                detail: error.message,
                stack: error.stack
            }
        });
        next(error);
    }
};

export const updateThreadTitle = async (req, res, next) => {
    try {
        const { threadId } = req.params;
        const { title } = req.body;
        const userId = req.session.user.id;

        const nextTitle = String(title || '').trim();
        if (!nextTitle) {
            return res.status(400).json({
                success: false,
                message: 'タイトルは必須です'
            });
        }

        const updated = await chatService.updateThreadTitle(getPool(), threadId, userId, nextTitle);
        if (!updated) {
            return res.status(404).json({
                success: false,
                message: 'スレッドが見つかりません'
            });
        }

        logger.info('スレッドタイトルを更新しました', {
            option: {
                user_id: userId,
                thread_id: threadId
            }
        });

        res.status(200).json({
            success: true,
            data: updated
        });
    } catch (error) {
        logger.error('スレッドタイトル更新に失敗しました', {
            option: {
                user_id: req.session?.user?.id ?? null,
                thread_id: req.params?.threadId ?? null,
                detail: error.message,
                stack: error.stack
            }
        });
        next(error);
    }
};

export const deleteThread = async (req, res, next) => {
    try {
        const { threadId } = req.params;
        const userId = req.session.user.id;

        const deleted = await chatService.deleteThreadById(getPool(), threadId, userId);
        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: 'スレッドが見つかりません'
            });
        }

        logger.info('スレッドを削除しました', {
            option: {
                user_id: userId,
                thread_id: threadId
            }
        });

        res.status(200).json({
            success: true
        });
    } catch (error) {
        logger.error('スレッド削除に失敗しました', {
            option: {
                user_id: req.session?.user?.id ?? null,
                thread_id: req.params?.threadId ?? null,
                detail: error.message,
                stack: error.stack
            }
        });
        next(error);
    }
};

export const updateMessageRating = async (req, res, next) => {
    try {
        const { messageId } = req.params;
        const { rating } = req.body;
        const userId = req.session.user.id;

        if (rating !== null && !['good', 'bad'].includes(rating)) {
            return res.status(400).json({
                success: false,
                message: 'rating は good / bad / null を指定してください'
            });
        }

        const updated = await chatService.updateMessageRating(getPool(), messageId, userId, rating);
        if (!updated) {
            return res.status(404).json({
                success: false,
                message: '対象メッセージが見つかりません'
            });
        }

        logger.info('メッセージ評価を更新しました', {
            option: {
                user_id: userId,
                message_id: messageId,
                rating
            }
        });

        res.status(200).json({
            success: true,
            data: updated
        });
    } catch (error) {
        logger.error('メッセージ評価更新に失敗しました', {
            option: {
                user_id: req.session?.user?.id ?? null,
                message_id: req.params?.messageId ?? null,
                detail: error.message,
                stack: error.stack
            }
        });
        next(error);
    }
};

export const executeRDDAgent = async (req, res, next) => {
    try {
        const pool = getPool();
        const userId = req.session?.user?.id ?? null;
        const response = await llmService.fetchRDDAgent(req.body);
        const result = await response.json();
        const draftText = result?.draft || '';
        const serializedPayload = JSON.stringify(req.body || {});
        const usage = result?.token_usage || result?.tokenUsage || {};
        const tokenUsage = {
            inputTokenCount: Number(usage.input_tokens || usage.inputTokenCount || 0) || estimateTokenCount(serializedPayload),
            outputTokenCount: Number(usage.output_tokens || usage.outputTokenCount || 0) || estimateTokenCount(draftText)
        };

        if (userId) {
            try {
                const agentThread = await chatModel.createThread(
                    pool,
                    userId,
                    null,
                    'RDD Agent Execution',
                    'agent',
                    'gpt-4o-mini',
                    null
                );

                await pool.query(
                    `UPDATE threads SET show_history = true WHERE id = $1`,
                    [agentThread.id]
                );

                await chatModel.saveMessage({
                    pool,
                    threadId: agentThread.id,
                    sender: 'user',
                    content: serializedPayload,
                    inputTokenCount: tokenUsage.inputTokenCount,
                    outputTokenCount: 0
                });

                await chatModel.saveMessage({
                    pool,
                    threadId: agentThread.id,
                    sender: 'assistant',
                    content: draftText,
                    inputTokenCount: tokenUsage.inputTokenCount,
                    outputTokenCount: tokenUsage.outputTokenCount
                });
            } catch (persistError) {
                logger.warn('RDDエージェントのトークン情報保存に失敗しました', {
                    option: {
                        user_id: userId,
                        detail: persistError.message
                    }
                });
            }
        }

        logger.info('RDDエージェントを実行しました', {
            option: {
                user_id: userId,
                token_usage: tokenUsage
            }
        });

        res.status(200).json({
            success: true,
            data: {
                ...result,
                tokenUsage
            }
        });
    } catch (error) {
        logger.error('RDDエージェント実行に失敗しました', {
            option: {
                user_id: req.session?.user?.id ?? null,
                detail: error.message,
                stack: error.stack
            }
        });
        next(error);
    }
};