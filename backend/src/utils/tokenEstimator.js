const toStringSafe = (value) => String(value || '');

export const estimateTokenCount = (text) => {
    const source = toStringSafe(text).trim();
    if (!source) return 0;

    const latinWordCount = (source.match(/[A-Za-z0-9_]+/g) || []).length;
    const cjkCharCount = (source.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/gu) || []).length;
    const whitespaceCount = (source.match(/\s/g) || []).length;
    const totalChars = source.length;
    const otherChars = Math.max(0, totalChars - cjkCharCount - whitespaceCount);

    const estimated = (latinWordCount * 1.3) + (cjkCharCount * 1.1) + (otherChars * 0.25);
    return Math.max(1, Math.ceil(estimated));
};

export const estimateMessagesTokenCount = (messages = []) => {
    if (!Array.isArray(messages) || messages.length === 0) return 0;
    return messages.reduce((sum, message) => sum + estimateTokenCount(message?.content), 0);
};
