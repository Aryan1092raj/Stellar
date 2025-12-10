import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { config } from '../config/env.js';

export type ChatMessage = { role: 'user' | 'assistant'; content: string };

const MODEL_NAME = 'gemini-1.5-pro';
const DEFAULT_TIMEOUT_MS = 15_000;
const MAX_RETRIES = 2;

const client = new GoogleGenerativeAI(config.GEMINI_API_KEY || '');

const normalizeRole = (role: string): 'user' | 'assistant' => {
  if (role === 'assistant' || role === 'system') return 'assistant';
  return 'user';
};

async function callWithTimeout<T>(promise: Promise<T>, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<T> {
  let timeoutHandle: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => reject(new Error('Gemini request timed out')), timeoutMs);
  });
  try {
    const result = await Promise.race([promise, timeoutPromise]);
    return result as T;
  } finally {
    clearTimeout(timeoutHandle!);
  }
}

async function createChatCompletion(conversationHistory: ChatMessage[], userMessage: string): Promise<string> {
  if (!config.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const model = client.getGenerativeModel({ model: MODEL_NAME });

  const history = conversationHistory.map((m) => ({
    role: normalizeRole(m.role),
    parts: [{ text: m.content }],
  }));

  const input = [{ text: userMessage }];

  let attempt = 0;
  let lastError: unknown;

  while (attempt <= MAX_RETRIES) {
    try {
      const result = await callWithTimeout(
        model.generateContent({
          contents: history.concat([{ role: 'user', parts: input }]),
          generationConfig: {
            maxOutputTokens: 512,
            temperature: 0.7,
          },
        })
      );

      const text = result.response?.text?.().trim();
      if (!text) throw new Error('Empty response from Gemini');
      return text;
    } catch (error) {
      lastError = error;
      attempt += 1;
      if (attempt > MAX_RETRIES) break;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Gemini request failed');
}

const AIService = {
  async runChat(params: { conversationHistory: ChatMessage[]; userMessage: string }) {
    const { conversationHistory, userMessage } = params;
    return createChatCompletion(conversationHistory, userMessage);
  },
};

export default AIService;
export { createChatCompletion };
