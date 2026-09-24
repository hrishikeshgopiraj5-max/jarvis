import { Message, getSettings } from './storage';

export interface ChatRequest {
  message: string;
  conversation: Message[];
}

export interface ChatResponse {
  response: string;
  error?: string;
  intent?: string;
  modelsUsed?: string[];
  strategy?: string;
  confidence?: number;
}

export interface ChatOptions {
  /** Force a mesh strategy (single/dual/triple) — from the Astra mode selector. */
  strategy?: 'single' | 'dual' | 'triple';
  /** Force a specific mesh model id for the primary call. */
  model?: string;
}

export async function sendChatMessage(message: string, conversation: Message[], opts?: ChatOptions): Promise<ChatResponse> {
  try {
    // API key lives server-side only — never sent from the client.
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        conversation: conversation.slice(-20),
        strategy: opts?.strategy,
        model: opts?.model,
      }),
      signal: AbortSignal.timeout(45000),
    });
    const data = await res.json();
    return data;
  } catch (err) {
    return { response: '', error: 'Connection to the neural mesh was interrupted. Please try again, sir.' };
  }
}

export async function getMeshStatus(): Promise<{
  status: string;
  totalModels: number;
  uniqueProviders: number;
  providers: string[];
  totalConnections: number;
} | null> {
  try {
    const res = await fetch('/api/chat');
    return await res.json();
  } catch {
    return null;
  }
}
