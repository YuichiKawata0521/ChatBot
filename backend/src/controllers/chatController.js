import { chatService } from '../services/chatService.js';
import { getPool } from '../config/db.js';
import logger from '../utils/logger.js';
import { llmService } from '../services/llmService.js';

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

export const executeRDDAgent = async (req, res, next) => {
    try {
        const response = await llmService.fetchRDDAgent(req.body);
        const result = await response.json();

        logger.info('RDDエージェントを実行しました', {
            option: {
                user_id: req.session?.user?.id ?? null
            }
        });

        res.status(200).json({
            success: true,
            data: result
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