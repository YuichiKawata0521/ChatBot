export const llmService = {
    async fetchStream(messages, modelName="gpt-4o-mini") {
        const url = 'http://llm:8000/chat'
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
    }
}