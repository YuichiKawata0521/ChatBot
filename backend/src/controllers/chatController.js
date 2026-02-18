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



// import { getPool } from "../config/db.js";
// import { chatModel } from "../models/chatModel.js";
// import { llmService } from "../services/llmService.js";
// import AppError from "../utils/appError.js";
// import catchAsync from "../utils/catchAsync.js";

// export const chatController = {
//     sendMessage: catchAsync(async (req, res, next) => {
//         const pool = getPool();
//         const { message, modelName } = req.body;
//         let { threadId } = req.body;
//         const userId = req.user.id;
//         const depId = req.user.department_id;

//         if (!threadId) {
//             const title = message.replace(/\n/g, ' ').substring(0, 30) + (message.length > 30 ? '...' : '');
//             const newThread = await chatModel.createThread(pool, userId, depId, title, modelName);
//             threadId = newThread.id;
//         } else {
//             const thread = await chatModel.getThread(pool, threadId, userId);
//             if (!thread) return next (new AppError('Thread not found or permission denied', 404));
//         }

//         await chatModel.saveMessage({
//             pool, threadId, sender: 'user', content: message
//         });

//         const rawHistory = await chatModel.getRecentMessages(pool, threadId, 6);
//         const history = rawHistory.reverse().map(msg => ({
//             role: msg.sender,
//             content: msg.content
//         }));

//         const llmMessages = [...history];

//         const llmResponse = await llmService.fetchStream(llmMessages, modelName);
    
//         res.setHeader('Content-Type', 'text/event-stream');
//         res.setHeader('Cache-Control', 'no-cache');
//         res.setHeader('Connection', 'keep-alive');

//         res.write(`data: ${JSON.stringify({type: 'meta', threadId})}`)

//         let fullResponse = '';
//         const reader = llmResponse.body.getReader();
//         const decoder = new TextDecoder();

//         try {
//             while (true) {
//                 const { done, value } = await reader.read();
//                 if (done) break;

//                 const chunk = decoder.decode(value, { stream: true });
//                 fullResponse += chunk;
//                 res.write(`data: ${JSON.stringify(chunk)}\n\n`);
//             }
//         } catch (error) {
//             console.error('Streaming error:', error);
//             res.write(`data: ${JSON.stringify({type: 'error', error: error.message})}\n\n`);
//         } finally {
//             reader.releaseLock();
//         }

//         await chatModel.saveMessage({
//             pool, threadId, sender: 'assistant', content: fullResponse
//         });

//         res.end();
//     }),

//     getThreads: catchAsync(async (req, res, next) => {
//         const userId = req.user.id;
//         const pool = getPool();

//         const threads = await chatModel.getThreadsByUserId(pool, userId);

//         res.status(200).json({
//             success: true,
//             data: {threads}
//         });
//     }),

//     getHistory: catchAsync(async (req, res, next) => {
//         const { threadId } = req.params;
//         const userID = req.user.id;
//         const pool = getPool();

//         const thread = await chatModel.getThread(pool, threadId, userID);
//         if (!thread) return next (new AppError('Thread not found', 404));

//         const messages = await chatModel.getRecentMessages(pool, threadId, 50);
//         res.status(200).json({
//             success: true,
//             data: {
//                 messages: messages.reverse()
//             }
//         });
//     }),

//     deleteAllThreads: catchAsync(async (req, res, next) => {
//         const userId = req.user.id;
//         const pool = getPool();

//         const result = await chatModel.deleteThreadsByUserId(pool, userId);

//         res.status(200).json({
//             success: true,
//             message: 'All threads deleted successfully',
//             data: { deletedCount: result }
//         });
//     })
// };

