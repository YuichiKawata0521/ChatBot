import { chatModel } from '../models/chatModel.js';
import { llmService } from './llmService.js';
import { ragService } from './ragService.js';

export const chatService = {
    async createThread(pool, userId, title, modelName, documentId) {
        const mode = documentId ? 'rag' : 'normal';
        return await chatModel.createThread(pool, userId, '', title, mode, modelName, documentId)
    },

    async getThreads(pool, userId) {
        return await chatModel.getThreadsByUserId(pool, userId);
    },

    async getHistory(pool, threadId, userId) {
        const thread = await chatModel.getThread(pool, threadId, userId);
        if (!thread) {
            throw new Error('Thread not found');
        }
        return await chatModel.getHistory(pool, threadId, userId);
    },

    async deleteAllThreads(pool, userId) {
        return await chatModel.deleteThreadsByUserId(pool, userId);
    },

    async *processChatStream(pool, threadId, userId, userMessage) {
        const thread = await chatModel.getThread(pool, threadId, userId);
        if (!thread) {
            throw new Error('Thread not found');
        }

        await chatModel.saveMessage({
            pool, threadId, sender: 'user', content: userMessage
        });
        await chatModel.updateThreadTimestamp(pool, threadId);

        let messages = await chatModel.getHistory(threadId);

        // 4. RAG処理 (必要な場合)
        if (thread.mode === 'rag' && thread.document_id) {
            const relevantChunks = await ragService.searchRelevantChunks(userMessage, thread.document_id);
            
            if (relevantChunks.length > 0) {
                const contextText = relevantChunks.join("\n\n---\n\n");
                const systemPrompt = {
                    role: 'system',
                    content: `あなたは社内規定やドキュメントに基づくアシスタントです。
以下の参考情報を元にユーザーの質問に回答してください。
情報が不足している場合は、正直に「ドキュメントに記載がありません」と答えてください。

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
        const llmStreamResponse = await llmService.fetchStream(messages);
        
        // 6. ストリームデータの読み込みとyield
        const reader = llmStreamResponse.body.getReader();
        const decoder = new TextDecoder();
        let fullResponse = '';

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value, { stream: true });
                // LLMサービス(Python)からのSSE形式("data: ...")をパースして中身だけ取り出す
                const lines = chunk.split('\n');
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data === '[DONE]') continue;
                        
                        // JSONパースせずにそのまま文字列として結合＆yield
                        // (Python側が単純なテキストを返している場合)
                        fullResponse += data;
                        yield data; 
                    }
                }
            }
        } finally {
            reader.releaseLock();
        }

        // 7. アシスタントメッセージ保存
        await chatModel.saveMessage(threadId, 'assistant', fullResponse);
    }
};