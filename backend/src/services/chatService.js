import { chatModel } from '../models/chatModel.js';
import { llmService } from './llmService.js';
import { ragService } from './ragService.js';

export const chatService = {
    async createThread(pool, userId, title, modelName = 'gpt-4o-mini', documentId = null) {
        const mode = documentId ? 'rag' : 'normal';
        return await chatModel.createThread(pool, userId, null, title, mode, modelName, documentId);
    },

    async getThreads(pool, userId) {
        return await chatModel.getThreadsByUserId(pool, userId);
    },

    async getHistory(pool, threadId, userId) {
        const thread = await chatModel.getThread(pool, threadId, userId);
        if (!thread) {
            throw new Error('Thread not found');
        }
        const messages = await chatModel.getRecentMessages(pool, threadId);
        const orderedMessages = messages.reverse();

        const messageIds = orderedMessages.map(msg => msg.id);
        const referenceRows = await chatModel.getMessageReferencesByMessageIds(pool, messageIds);

        const refsByMessageId = new Map();
        referenceRows.forEach(row => {
            const existing = refsByMessageId.get(row.message_id) || [];
            existing.push({
                document_id: row.document_id,
                chunk_id: row.chunk_id,
                similarity: row.similarity,
                title: row.title,
                content: row.content
            });
            refsByMessageId.set(row.message_id, existing);
        });

        return orderedMessages.map(msg => ({
            sender: msg.sender,
            content: msg.content,
            references: refsByMessageId.get(msg.id) || []
        }));
    },

    async deleteAllThreads(pool, userId) {
        return await chatModel.deleteThreadsByUserId(pool, userId);
    },

    async *processChatStream(pool, threadId, userId, userMessage, modelName = 'gpt-4o-mini') {
        const thread = await chatModel.getThread(pool, threadId, userId);
        if (!thread) {
            throw new Error('Thread not found');
        }

        await chatModel.saveMessage({
            pool, threadId, sender: 'user', content: userMessage
        });
        await chatModel.updateThreadTimestamp(pool, threadId);

        let rawMessages = await chatModel.getRecentMessages(pool, threadId);
        let messages = rawMessages.reverse().map(msg => ({
            role: msg.sender,
            content: msg.content
        }));

        let usedReferences = [];

        // 4. RAG処理 (必要な場合)
        if (thread.mode === 'rag' && thread.document_id) {
            usedReferences = await ragService.searchRelevantChunks(userMessage, thread.document_id);
            
            if (usedReferences.length > 0) {
                yield { type: 'reference', references: usedReferences };

                const contextText = usedReferences.map(ref => ref.content).join("\n\n---\n\n");
                const systemPrompt = {
                    role: 'system',
                    content: `あなたは社内規定やドキュメントに基づくアシスタントです。
以下の参考情報を元にユーザーの質問に回答してください。
情報が不足している場合は、正直に「ドキュメントに記載がありません」と答えてください。
文中で引用する場合は「(参照: [タイトル])」のように記述してください。

[参考情報]
${contextText}`
                };

                // 既存のsystemメッセージがあれば置換、なければ先頭に追加
                if (messages.length > 0 && messages[0].role === 'system') {
                    messages[0] = systemPrompt;
                } else {
                    messages.unshift(systemPrompt);
                }
            }
        }

        // 5. LLM呼び出し
        const llmStreamResponse = await llmService.fetchStream(messages, modelName);
        
        // 6. ストリームデータの読み込みとyield
        const reader = llmStreamResponse.body.getReader();
        const decoder = new TextDecoder();
        let fullResponse = '';

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value, { stream: true });
                fullResponse += chunk;
                yield chunk;
            }
        } finally {
            reader.releaseLock();
        }

        // 7. アシスタントメッセージ保存
        const savedMessage = await chatModel.saveMessage({
            pool,
            threadId,
            sender: 'assistant',
            content: fullResponse
        });

        if (usedReferences.length > 0 && savedMessage) {
            await chatModel.saveMessageReferences(pool, savedMessage.id, usedReferences);
        }
    }
};