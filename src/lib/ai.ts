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

export async function sendChatMessage(message: string, conversation: Message[]): Promise<ChatResponse> {
  try {
    // Get API key from settings (client-side storage)
    const settings = getSettings();
    const apiKey = settings.openrouterApiKey || '';

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        conversation: conversation.slice(-20),
        apiKey,
      }),
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
