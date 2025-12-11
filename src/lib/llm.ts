
export type Message = {
    role: "system" | "user" | "assistant";
    content: string;
};

export type LlmProvider = "ollama" | "openai";

export type LlmConfig = {
    provider: LlmProvider;
    baseUrl: string;
    model: string;
    apiKey?: string;
};

export const DEFAULT_CONFIG: LlmConfig = {
    provider: "ollama",
    baseUrl: "http://localhost:11434",
    model: "llama2",
};

export async function getOllamaModels(baseUrl: string): Promise<string[]> {
    try {
        const response = await fetch(`${baseUrl}/api/tags`);
        if (!response.ok) {
            throw new Error(`Failed to fetch models: ${response.statusText}`);
        }
        const data = await response.json();
        return data.models?.map((m: { name: string }) => m.name) || [];
    } catch (error) {
        console.error("Error fetching Ollama models:", error);
        return [];
    }
}

export async function chat(
    messages: Message[],
    config: LlmConfig
): Promise<ReadableStream<Uint8Array>> {
    if (config.provider === "ollama") {
        return chatOllama(messages, config);
    } else if (config.provider === "openai") {
        return chatOpenAI(messages, config);
    } else {
        throw new Error(`Unsupported provider: ${config.provider}`);
    }
}

async function chatOllama(
    messages: Message[],
    config: LlmConfig
): Promise<ReadableStream<Uint8Array>> {
    const response = await fetch(`${config.baseUrl}/api/chat`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: config.model,
            messages: messages,
            stream: true,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = response.statusText;
        try {
            const errorJson = JSON.parse(errorText);
            if (errorJson.error) {
                errorMessage = errorJson.error;
            } else {
                errorMessage = errorText;
            }
        } catch {
            errorMessage = errorText || response.statusText;
        }
        throw new Error(`Ollama API error: ${errorMessage}`);
    }

    if (!response.body) {
        throw new Error("No response body from Ollama");
    }

    return response.body;
}

async function chatOpenAI(
    messages: Message[],
    config: LlmConfig
): Promise<ReadableStream<Uint8Array>> {
    const response = await fetch(`${config.baseUrl}/v1/chat/completions`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
            model: config.model,
            messages: messages,
            stream: true,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API error: ${response.statusText} - ${errorText}`);
    }

    if (!response.body) {
        throw new Error("No response body from OpenAI");
    }

    return response.body;
}
