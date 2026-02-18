import { chatService } from '../services/chatService.js';
import { getPool } from '../config/db.js';

// スレッド作成
export const createThread = async (req, res, next) => {
    try {
        const { title, documentId, modelName } = req.body;
        const userId = req.session.user.id;

        const thread = await chatService.createThread(getPool(), userId, title, modelName, documentId);
        
        res.status(201).json({
            success: true,
            threadId: thread.id,
            data: thread
        });
    } catch (error) {
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
        next(error);
    }
};

// チャットストリーム処理
export const sendMessage = async (req, res, next) => {
    const { message, modelName, documentId } = req.body;
    let { threadId } = req.body;
    const userId = req.session.user.id;

    if (!threadId) {
        const title = message.replace(/\n/g, ' ').substring(0, 30) + (message.length > 30 ? '...' : '');
        const thread = await chatService.createThread(getPool(), userId, title, modelName, documentId);
        threadId = thread.id;
    }

    // SSEヘッダー設定
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.write(`data: ${JSON.stringify({ type: 'meta', threadId })}\n\n`);

    try {
        // ServiceのAsyncGeneratorからデータを受け取り、クライアントへ流す
        const stream = chatService.processChatStream(getPool(), threadId, userId, message, modelName);

        for await (const chunk of stream) {
            res.write(`data: ${JSON.stringify(chunk)}\n\n`);
        }

        // 完了シグナル
        res.write('data: [DONE]\n\n');
        res.end();

    } catch (error) {
        console.error('Stream Error:', error);
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
    const userId = req.session.user.id;
    await chatService.deleteAllThreads(getPool(), userId);
    res.status(200).json({
        success: true
    })
}