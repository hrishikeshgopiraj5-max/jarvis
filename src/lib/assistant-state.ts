/**
 * JARVIS Central Assistant State Machine
 *
 * ONE authoritative state for the whole system. Every UI component derives
 * its behavior from this — no component guesses whether JARVIS is listening.
 *
 * Legal transitions (enforced, unknown transitions are logged + ignored):
 *   idle → listening → processing → thinking → planning → executing
 *        → speaking → success → idle
 *   error may be entered from any state; success may follow speaking/executing.
 */

export type AssistantState =
  | 'idle'
  | 'listening'
  | 'processing'
  | 'thinking'
  | 'planning'
  | 'executing'
  | 'speaking'
  | 'success'
  | 'error';

export type AssistantEventName =
  | 'MIC_PERMISSION_CHANGED'
  | 'VOICE_STARTED'
  | 'VOICE_PARTIAL_TRANSCRIPT'
  | 'VOICE_FINAL_TRANSCRIPT'
  | 'VOICE_ERROR'
  | 'VOICE_STOPPED'
  | 'AI_REQUEST_STARTED'
  | 'AI_THINKING'
  | 'PLAN_CREATED'
  | 'TOOL_STARTED'
  | 'TOOL_PROGRESS'
  | 'TOOL_COMPLETED'
  | 'TOOL_FAILED'
  | 'PERMISSION_REQUESTED'
  | 'PERMISSION_GRANTED'
  | 'PERMISSION_DENIED'
  | 'AI_RESPONSE_READY'
  | 'TTS_STARTED'
  | 'TTS_STOPPED'
  | 'TASK_COMPLETED'
  | 'ERROR';

/** Machine-readable error codes — the UI maps these to human messages + actions. */
export type AssistantErrorCode =
  | 'MICROPHONE_PERMISSION_DENIED'
  | 'MICROPHONE_UNAVAILABLE'
  | 'MICROPHONE_IN_USE'
  | 'VOICE_NOT_SUPPORTED'
  | 'SPEECH_RECOGNITION_ERROR'
  | 'NETWORK_ERROR'
  | 'AI_REQUEST_FAILED'
  | 'AI_RATE_LIMITED'
  | 'AI_INVALID_KEY'
  | 'TTS_FAILED'
  | 'TTS_NOT_SUPPORTED'
  | 'TOOL_FAILED'
  | 'PERMISSION_DENIED'
  | 'UNKNOWN';

export interface AssistantEventData {
  transcript?: string;
  error?: AssistantErrorCode;
  detail?: string;
  agentId?: string;
  toolName?: string;
  progress?: number;
  resultId?: string;
}

export interface AssistantEvent {
  name: AssistantEventName;
  state: AssistantState;
  data: AssistantEventData;
  timestamp: number;
}

type Listener = (event: AssistantEvent) => void;

const TRANSITIONS: Record<AssistantState, AssistantState[]> = {
  idle: ['listening', 'processing', 'error'],
  listening: ['processing', 'idle', 'error', 'listening'],
  processing: ['thinking', 'planning', 'executing', 'speaking', 'success', 'idle', 'error'],
  thinking: ['planning', 'executing', 'speaking', 'success', 'idle', 'error'],
  planning: ['executing', 'speaking', 'success', 'idle', 'error'],
  executing: ['speaking', 'thinking', 'idle', 'success', 'error'],
  speaking: ['idle', 'listening', 'success', 'error'],
  success: ['idle', 'listening', 'error'],
  error: ['idle', 'listening', 'processing'],
};

/** Human-readable labels, rendered identically everywhere. */
export const STATE_LABELS: Record<AssistantState, string> = {
  idle: 'SYSTEM ONLINE',
  listening: 'LISTENING',
  processing: 'PROCESSING',
  thinking: 'ANALYZING',
  planning: 'PLANNING',
  executing: 'EXECUTING',
  speaking: 'SPEAKING',
  success: 'TASK COMPLETE',
  error: 'SYSTEM FAULT',
};

export const ERROR_MESSAGES: Record<AssistantErrorCode, { title: string; message: string }> = {
  MICROPHONE_PERMISSION_DENIED: {
    title: 'Microphone blocked',
    message: 'Microphone access is disabled for this site. Enable it in your browser address bar (padlock icon) and try again. Text input still works.',
  },
  MICROPHONE_UNAVAILABLE: {
    title: 'No microphone found',
    message: 'No microphone is connected or it is busy in another app. Connect a mic or close the app using it, then retry.',
  },
  MICROPHONE_IN_USE: {
    title: 'Microphone busy',
    message: 'Another application is using the microphone. Close it and press the mic button again.',
  },
  VOICE_NOT_SUPPORTED: {
    title: 'Voice input unavailable',
    message: 'This browser has no speech recognition engine. Use Chrome or Edge for voice, or continue with text commands.',
  },
  SPEECH_RECOGNITION_ERROR: {
    title: 'Speech recognition error',
    message: 'The speech engine reported a problem. Press the microphone to retry.',
  },
  NETWORK_ERROR: {
    title: 'Network offline',
    message: 'No network connection. JARVIS can run built-in tools offline, but AI requests need connectivity.',
  },
  AI_REQUEST_FAILED: {
    title: 'AI service unreachable',
    message: 'JARVIS couldn\u2019t reach the AI service. Check your API key in Settings, then retry.',
  },
  AI_RATE_LIMITED: {
    title: 'Rate limited',
    message: 'The AI provider is throttling requests. Wait a moment and retry.',
  },
  AI_INVALID_KEY: {
    title: 'Invalid API key',
    message: 'The AI provider rejected the API key. Update it in Settings → Neural Mesh.',
  },
  TTS_FAILED: {
    title: 'Voice playback failed',
    message: 'The response was generated, but voice playback failed. The reply is shown above.',
  },
  TTS_NOT_SUPPORTED: {
    title: 'Voice output unavailable',
    message: 'This browser has no speech synthesis engine. Responses will be text-only.',
  },
  TOOL_FAILED: {
    title: 'Tool execution failed',
    message: 'The requested capability failed. Retry is available.',
  },
  PERMISSION_DENIED: {
    title: 'Permission denied',
    message: 'You declined this action. Nothing was executed.',
  },
  UNKNOWN: {
    title: 'Unexpected fault',
    message: 'An unexpected fault occurred. Retry is available.',
  },
};

/**
 * Minimal observable store. Not React state — the pipeline mutates it from
 * callbacks where setState batching would race. React subscribes via
 * AssistantProvider and re-renders on change.
 */
export class AssistantStateMachine {
  private state: AssistantState = 'idle';
  private listeners = new Set<Listener>();
  private stateListeners = new Set<(s: AssistantState) => void>();
  private pendingTimer: ReturnType<typeof setTimeout> | null = null;

  getState(): AssistantState {
    return this.state;
  }

  /** Guarded transition. Returns false and logs if illegal. */
  transition(next: AssistantState): boolean {
    if (next === this.state) return true;
    if (!TRANSITIONS[this.state].includes(next)) {
      console.warn(`[JARVIS state] illegal transition ${this.state} → ${next} (ignored)`);
      return false;
    }
    this.state = next;
    this.stateListeners.forEach(fn => fn(next));
    return true;
  }

  /** Force-set, bypassing legality (used by error recovery + boot). */
  forceState(next: AssistantState) {
    if (this.state === next) return;
    this.state = next;
    this.stateListeners.forEach(fn => fn(next));
  }

  emit(name: AssistantEventName, data: AssistantEventData = {}) {
    const event: AssistantEvent = { name, state: this.state, data, timestamp: Date.now() };
    this.listeners.forEach(fn => {
      try { fn(event); } catch (e) { console.error('[JARVIS events] listener failed', e); }
    });
  }

  on(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  onState(fn: (s: AssistantState) => void): () => void {
    this.stateListeners.add(fn);
    return () => this.stateListeners.delete(fn);
  }

  /** Auto-return to idle after a terminal state (success flicker). */
  scheduleIdle(ms = 1800) {
    if (this.pendingTimer) clearTimeout(this.pendingTimer);
    this.pendingTimer = setTimeout(() => {
      if (this.state === 'success' || this.state === 'error') this.forceState('idle');
      this.pendingTimer = null;
    }, ms);
  }

  dispose() {
    if (this.pendingTimer) clearTimeout(this.pendingTimer);
    this.listeners.clear();
    this.stateListeners.clear();
  }
}

/** Singleton — the pipeline and all panels share this instance. */
export const assistantMachine = new AssistantStateMachine();
