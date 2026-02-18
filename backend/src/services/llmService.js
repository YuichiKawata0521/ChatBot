export const llmService = {
    async fetchStream(messages, modelName="gpt-4o-mini") {
        const url = 'http://llm:8000/api/chat'
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-type': 'application/json' },
            body: JSON.stringify({
                messages: messages,
                model_name: modelName,
                temperature: 0.7
            })
        });
        if (!response.ok) {
            throw new Error(`LLM Service Error: ${response.statusText}`);
        }
        return response;
    },

    async fetchEmbed(content) {
        const endpoint = 'http://llm:8000/api/embed';
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: content})
        });
        if (!response.ok) {
            throw new Error(`Embedding failed: ${response.statusText}`);
        }
        return response;
    },

    async fetchConvert(formData) {
        const endpoint = 'http://llm:8000/api/convert';
        const response = await fetch(endpoint, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('Conversion failed: ', response.statusText);
        }

        return response;
    }
}