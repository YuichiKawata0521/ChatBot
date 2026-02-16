import { getPool } from "../config/db.js";
import { chatModel } from "../models/chatModel.js";
import { llmService } from "../services/llmService.js";
import AppError from "../utils/appError.js";
import catchAsync from "../utils/catchAsync.js";

export const chatController = {
    sendMessage: catchAsync(async (req, res, next) => {
        console.log('req: \n', req);
        const pool = getPool();
        const { message, modelName } = req.body;
        let { threadId } = req.body;
        const userId = req.user.id;
        const depId = req.user.department_id;

        if (!threadId) {
            const title = message.replace(/\n/g, ' ').substring(0, 30) + (message.length > 30 ? '...' : '');
            const newThread = await chatModel.createThread(pool, userId, depId, title, modelName);
            threadId = newThread.id;
        } else {
            const thread = await chatModel.getThread(pool, threadId, userId);
            if (!thread) return next (new AppError('Thread not found or permission denied', 404));
        }

        await chatModel.saveMessage({
            pool, threadId, sender: 'user', content: message
        });

        const rawHistory = await chatModel.getRecentMessages(pool, threadId, 6);
        const history = rawHistory.reverse().map(msg => ({
            role: msg.sender,
            content: msg.content
        }));

        const llmMessages = [...history];

        const llmResponse = await llmService.fetchStream(llmMessages, modelName);
    
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        res.write(`data: ${JSON.stringify({type: 'meta', threadId})}\n\n`);

        let fullResponse = '';
        const reader = llmResponse.body.getReader();
        const decoder = new TextDecoder();

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                console.log('LLM Stream Chunk:', chunk);
                fullResponse += chunk;
                res.write(`data: ${JSON.stringify(chunk)}\n\n`);
            }
        } catch (error) {
            console.error('Streaming error:', error);
            res.write(`data: ${JSON.stringify({type: 'error', error: error.message})}\n\n`);
        } finally {
            reader.releaseLock();
        }

        console.log('LLM Full Response:', fullResponse);

        await chatModel.saveMessage({
            pool, threadId, sender: 'assistant', content: fullResponse
        });

        res.end();
    }),

    getHistory: catchAsync(async (req, res, next) => {
        const { threadId } = req.params;
        const userID = req.user.id;
        const pool = getPool();

        const thread = await chatModel.getThread(pool, threadId, userID);
        if (!thread) return next (new AppError('Thread not found', 404));

        const messages = await chatModel.getRecentMessages(pool, threadId, 50);
        res.status(200).json({
            success: true,
            data: {
                messages: messages.reverse()
            }
        });
    })
};

