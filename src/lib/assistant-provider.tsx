'use client';

/**
 * JARVIS AssistantProvider — the orchestrator.
 *
 * Wires voice manager → command router (tools vs AI) → TTS → state machine.
 * Every major component subscribes here instead of guessing JARVIS's state.
 * Also owns conversation log, contextual tool cards, agent activation, and
 * the permission confirmation dialog state.
 */

import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react';
import {
  assistantMachine, AssistantState, AssistantErrorCode, ERROR_MESSAGES, AssistantEvent,
} from './assistant-state';
import type { WorkingNote as WorkingNoteLite } from './astra';
import { VoiceManager, HandsFreeStatus, stripWakeWords } from './voice-manager';
import { tts, uiSounds, setSoundEnabled, onMicLevel, startMicMetering, stopMicMetering } from './audio-manager';
import { findTool, executeTool, ToolResult } from './tools';
import { selectAgents, AgentId } from './agents';
import { getSettings, saveSettings, Settings } from './storage';
import { setPermissionConfirmationHandler, PermissionRequest } from './permissions';
import { sendChatMessage } from './ai';
import { Message } from './storage';
import {
  AstraMode, getMode, appendWorkingNote, getWorkingNotes,
  computeContextMeter, ContextMeter, TaskStep, newLedger, advanceLedger,
} from './astra';
import { MODEL_MESH } from './agent-mesh';
import { markdownToPlain } from './markdown';
import {
  AstraSession, getAstraSessions, saveAstraSession, deleteAstraSession,
  autoTitle, newAstraSessionId,
} from './astra-sessions';

export interface ChatEntry {
  id: string;
  role: 'user' | 'jarvis';
  text: string;
  time: string;
  /** Tool card payload for contextual UI. */
  card?: ToolResult['card'];
  cardData?: Record<string, unknown>;
  agents?: AgentId[];
  /** Mesh models that produced this answer (for the model strip). */
  modelsUsed?: string[];
  /** True when the answer came from built-in tools (no mesh call). */
  local?: boolean;
}

interface PendingPermission extends PermissionRequest {
  resolve: (d: 'granted' | 'denied') => void;
}

export interface AssistantContextValue {
  state: AssistantState;
  error: { code: AssistantErrorCode; title: string; message: string; retry?: () => void } | null;
  clearError: () => void;
  // conversation
  messages: ChatEntry[];
  submitText: (text: string) => void;
  clearConversation: () => void;
  // live transcript
  partialTranscript: string;
  lastResponse: string;
  // voice
  micLevel: number;
  voiceSupported: boolean;
  ttsSupported: boolean;
  pushToTalkActive: boolean;
  togglePushToTalk: () => void;
  handsFreeStatus: HandsFreeStatus;
  toggleHandsFree: () => void;
  interruptSpeaking: () => void;
  // agents
  activeAgents: { primary: AgentId[]; support: AgentId[] };
  // settings
  settings: Settings;
  updateSettings: (u: Partial<Settings>) => void;
  // permissions dialog
  pendingPermission: PermissionRequest | null;
  answerPermission: (granted: boolean) => void;
  // ── Astra layer ──
  mode: AstraMode;
  setMode: (m: AstraMode) => void;
  /** Codex-style notes carried across sessions. */
  workingNotes: WorkingNoteLite[];
  refreshNotes: () => void;
  /** Live plan for the current delegated task. */
  taskLedger: TaskStep[];
  /** Context window usage for the conversation vs. active model window. */
  contextMeter: ContextMeter;
  /** Models used for the most recent response (mesh strip). */
  lastModels: string[];
  /** Force routing through a specific mesh model for the next query. */
  modelOverride: string | null;
  setModelOverride: (id: string | null) => void;
  // ── Sessions (ChatGPT-style conversation list) ──
  sessions: AstraSession[];
  activeSessionId: string | null;
  newSession: () => void;
  switchSession: (id: string) => void;
  deleteSession: (id: string) => void;
}

const AssistantCtx = createContext<AssistantContextValue | null>(null);

function nowTime() {
  return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

export function AssistantProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AssistantState>(assistantMachine.getState());
  const [error, setError] = useState<AssistantContextValue['error']>(null);
  const [messages, setMessages] = useState<ChatEntry[]>([]);
  const [partialTranscript, setPartialTranscript] = useState('');
  const [lastResponse, setLastResponse] = useState('');
  const [micLevel, setMicLevel] = useState(0);
  const [pushToTalkActive, setPushToTalkActive] = useState(false);
  const [handsFreeStatus, setHandsFreeStatus] = useState<HandsFreeStatus>('off');
  const [pendingPermission, setPendingPermission] = useState<PermissionRequest | null>(null);
  const [settings, setSettings] = useState<Settings>(() => getSettings());
  const [activeAgents, setActiveAgents] = useState<{ primary: AgentId[]; support: AgentId[] }>({ primary: [], support: [] });
  // ── Astra layer state ──
  const [mode, setModeState] = useState<AstraMode>(() => {
    try { return (localStorage.getItem('astra_mode') as AstraMode) || 'astra'; } catch { return 'astra'; }
  });
  const [workingNotes, setWorkingNotes] = useState<WorkingNoteLite[]>(() => getWorkingNotes());
  const [taskLedger, setTaskLedger] = useState<TaskStep[]>([]);
  const [lastModels, setLastModels] = useState<string[]>([]);
  const [modelOverride, setModelOverride] = useState<string | null>(null);
  const sessionIdRef = useRef<string>(`session-${Date.now().toString(36)}`);
  // ── Sessions state ──
  const [sessions, setSessions] = useState<AstraSession[]>(() => getAstraSessions());
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const entriesRef = useRef<ChatEntry[]>([]);
  entriesRef.current = messages;

  const setMode = useCallback((m: AstraMode) => {
    setModeState(m);
    try { localStorage.setItem('astra_mode', m); } catch { /* private mode */ }
  }, []);

  const refreshNotes = useCallback(() => {
    setWorkingNotes(getWorkingNotes());
  }, []);

  // ── Sessions plumbing ──────────────────────────────────────
  // Snapshot the live conversation into the active session whenever it
  // changes. Mesh context = last 20 turns (roles mapped for the API).
  useEffect(() => {
    const entries = entriesRef.current;
    if (!activeSessionId || entries.length === 0) return;
    const context = entries.slice(-20).map(m => ({
      role: (m.role === 'jarvis' ? 'assistant' : 'user') as 'user' | 'assistant',
      content: m.text,
      timestamp: '',
    }));
    const existing = sessions.find(s => s.id === activeSessionId);
    const session: AstraSession = {
      id: activeSessionId,
      title: existing?.title ?? autoTitle(entries[0]?.text ?? ''),
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      entries: entries.map(e => ({ ...e })),
      context,
    };
    saveAstraSession(session);
    setSessions(getAstraSessions());
  }, [messages, activeSessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  const newSession = useCallback(() => {
    setActiveSessionId(null);
    setMessages([]);
    setLastResponse('');
    setLastModels([]);
    setTaskLedger([]);
  }, []);

  const switchSession = useCallback((id: string) => {
    const s = getAstraSessions().find(x => x.id === id);
    if (!s) return;
    setActiveSessionId(s.id);
    setMessages(s.entries.map(e => ({ ...e })) as ChatEntry[]);
    setLastResponse(s.entries.length ? s.entries[s.entries.length - 1].text : '');
    setLastModels(s.entries.length ? s.entries[s.entries.length - 1].modelsUsed ?? [] : []);
  }, []);

  const deleteSession = useCallback((id: string) => {
    deleteAstraSession(id);
    setSessions(getAstraSessions());
    if (activeSessionId === id) {
      setActiveSessionId(null);
      setMessages([]);
      setLastResponse('');
    }
  }, [activeSessionId]);

  const voiceRef = useRef<VoiceManager | null>(null);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const busyRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const modelOverrideRef = useRef<string | null>(null);
  modelOverrideRef.current = modelOverride;
  const activeSessionIdRef = useRef<string | null>(null);
  activeSessionIdRef.current = activeSessionId;

  /** Derive the effective mesh strategy from the Astra mode. */
  const effectiveStrategy = getMode(mode).strategy;

  /** Context meter: chars in the last 16 turns vs. the effective window. */
  const contextMeter = useMemo(() => {
    const chars = messagesRef.current.slice(-16).reduce((n, m) => n + m.text.length, 0);
    // Largest ultra-tier window is what dual/triple strategies effectively
    // get; Flash mode is budgeted against the smallest.
    const windows = MODEL_MESH.filter(m => m.tier === 'ultra').map(m => m.contextWindow);
    const windowTokens = mode === 'flash'
      ? Math.min(...windows, 200000)
      : Math.max(...windows, 128000);
    return computeContextMeter(chars, windowTokens);
  }, [messages, mode]);

  // ── State machine subscription ────────────────────────────────
  useEffect(() => {
    const off = assistantMachine.onState(s => setState(s));
    return () => { off(); };
  }, []);

  // ── Stall watchdog: no command may hold the machine for >45s ──
  // If a request/AI call never resolves (network black hole, provider bug),
  // recover to idle instead of wedging at ANALYZING forever.
  const stallTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (state === 'processing' || state === 'thinking' || state === 'planning' || state === 'executing') {
      if (stallTimer.current) clearTimeout(stallTimer.current);
      stallTimer.current = setTimeout(() => {
        assistantMachine.forceState('idle');
        busyRef.current = false;
        setError({
          code: 'AI_REQUEST_FAILED',
          title: 'That took too long',
          message: 'The request stalled and was cancelled. Try again — built-in tools work offline.',
          retry: () => setError(null),
        });
      }, 45000);
    } else if (stallTimer.current) {
      clearTimeout(stallTimer.current);
      stallTimer.current = null;
    }
    return () => { if (stallTimer.current) { clearTimeout(stallTimer.current); stallTimer.current = null; } };
  }, [state]);

  // ── Sound setting ─────────────────────────────────────────────
  useEffect(() => { setSoundEnabled(settings.soundEffects !== false); }, [settings.soundEffects]);

  // ── Permission dialog plumbing ────────────────────────────────
  useEffect(() => {
    setPermissionConfirmationHandler((req) => new Promise((resolve) => {
      setPendingPermission(req);
      (req as PermissionRequest & { resolve?: unknown }).resolve = resolve;
    }));
  }, []);

  const answerPermission = useCallback((granted: boolean) => {
    setPendingPermission(prev => {
      if (!prev) return prev;
      const r = prev as PermissionRequest & { resolve?: (d: 'granted' | 'denied') => void };
      r.resolve?.(granted ? 'granted' : 'denied');
      return null;
    });
  }, []);

  // ── AI request with mapped error codes ────────────────────────
  const runAI = useCallback(async (text: string): Promise<ToolResult> => {
    assistantMachine.transition('processing');
    assistantMachine.emit('AI_REQUEST_STARTED');
    if (!navigator.onLine) {
      return { ok: false, message: 'You appear to be offline, sir. Built-in tools still work; AI needs connectivity.' };
    }
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    assistantMachine.transition('thinking');
    assistantMachine.emit('AI_THINKING');
    const convo = messagesRef.current.slice(-16).map(m => ({
      id: 'ctx', role: (m.role === 'jarvis' ? 'assistant' : 'user') as Message['role'],
      content: m.text, timestamp: '',
    }));
    try {
      const res = await sendChatMessage(text, convo, {
        strategy: effectiveStrategy === 'auto' ? undefined : effectiveStrategy,
        model: modelOverrideRef.current ?? undefined,
      });
      if (res.modelsUsed?.length) setLastModels(res.modelsUsed);
      if (ac.signal.aborted) return { ok: false, message: '' };
      if (res.error && !res.response) {
        const code = /401|invalid/i.test(res.error) ? 'AI_INVALID_KEY' : /429|rate/i.test(res.error) ? 'AI_RATE_LIMITED' : 'AI_REQUEST_FAILED';
        return { ok: false, message: '', errorOverride: code };
      }
      return { ok: true, message: res.response };
    } catch {
      if (ac.signal.aborted) return { ok: false, message: '' };
      return { ok: false, message: '', errorOverride: 'AI_REQUEST_FAILED' };
    }
  }, []);

  // ── Speak helper ──────────────────────────────────────────────
  const speakResponse = useCallback((text: string, onDone: () => void) => {
    const s = settingsRef.current;
    if (!s.autoSpeak || !tts.supported) {
      // No voice: go straight to success from wherever we are.
      assistantMachine.transition('success');
      assistantMachine.emit('TASK_COMPLETED');
      assistantMachine.scheduleIdle();
      onDone();
      return;
    }
    if (assistantMachine.getState() !== 'speaking') assistantMachine.transition('speaking');
    assistantMachine.emit('TTS_STARTED');
    tts.speak(text, { rate: s.speechRate, pitch: s.speechPitch, voiceName: s.voiceName || undefined })
      .then(() => {
        assistantMachine.emit('TTS_STOPPED');
        assistantMachine.transition('success');
        assistantMachine.emit('TASK_COMPLETED');
        assistantMachine.scheduleIdle();
        onDone();
      })
      .catch((err: Error) => {
        assistantMachine.emit('TTS_STOPPED');
        if (err.name === 'AbortError') return; // interrupted — voice manager handles state
        setError({ code: 'TTS_FAILED', title: ERROR_MESSAGES.TTS_FAILED.title, message: ERROR_MESSAGES.TTS_FAILED.message });
        assistantMachine.forceState('idle');
        onDone();
      });
  }, []);

  // ── The command pipeline ──────────────────────────────────────
  const processCommand = useCallback(async (rawText: string) => {
    const text = stripWakeWords(rawText).trim();
    if (!text || busyRef.current) return;
    busyRef.current = true;
    setError(null);
    setPartialTranscript('');
    setLastResponse('');
    setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'user', text, time: nowTime() }]);

    const agents = selectAgents(text);
    setActiveAgents(agents);

    // First message of an unsaved conversation opens a session (ChatGPT-style).
    if (!activeSessionIdRef.current) {
      const id = newAstraSessionId();
      setActiveSessionId(id);
      activeSessionIdRef.current = id;
    }

    // ── Astra delegation: non-trivial requests open a task ledger ──
    const isDelegated = text.length > 60 || /\b(plan|build|design|research|analyz|compare|explain|write|create|make|automate)\b/i.test(text);
    const note = (kind: WorkingNoteLite['kind'], t: string) => {
      const n = appendWorkingNote(kind, t, sessionIdRef.current);
      if (n) setWorkingNotes(prev => [...prev, n]);
    };
    if (isDelegated) {
      setTaskLedger(newLedger([
        { label: 'Understand the request' },
        { label: effectiveStrategy === 'triple' ? 'Generate · specialist · critic' : effectiveStrategy === 'dual' ? 'Generate + specialist review' : 'Generate response' },
        { label: 'Verify & integrate' },
      ]));
      note('step', `Task: ${text.slice(0, 140)}`);
    }

    try {
      // 1. Deterministic tool routing first (no AI round-trip for known tools).
      const tool = findTool(text);
      let result: ToolResult;
      if (tool) {
        assistantMachine.transition('processing');
        setTaskLedger(prev => prev.length ? advanceLedger(prev, 0) : prev);
        result = await executeTool(tool, text, {
          openUrl: (url) => window.open(url, '_blank', 'noopener,noreferrer'),
        });
        setLastModels([]); // built-in tool — no mesh models involved
      } else {
        setTaskLedger(prev => prev.length ? advanceLedger(prev, 0) : prev);
        result = await runAI(text);
      }

      if (!result.ok) {
        const code = (result.errorOverride as AssistantErrorCode | undefined)
          ?? (tool ? 'TOOL_FAILED' : 'AI_REQUEST_FAILED');
        uiSounds.error();
        setTaskLedger(prev => prev.map((s, i) => i === 1 ? { ...s, status: 'failed' as const } : s));
        if (isDelegated) note('finding', `Failed: ${result.message || code}`);
        assistantMachine.forceState('error');
        assistantMachine.emit('ERROR', { error: code, detail: result.message });
        setError({ code, title: ERROR_MESSAGES[code].title, message: result.message || ERROR_MESSAGES[code].message, retry: () => processCommand(text) });
        assistantMachine.scheduleIdle(4000);
        return;
      }

      setLastResponse(result.message);
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(), role: 'jarvis', text: result.message, time: nowTime(),
        card: result.card, cardData: result.data, agents: agents.primary,
        local: !!tool,
      }]);
      if (isDelegated) {
        note('finding', result.message.slice(0, 180));
        setTaskLedger(prev => prev.length ? advanceLedger(advanceLedger(prev, 1), 2) : prev);
      }
      uiSounds.success();
      speakResponse(result.message, () => { busyRef.current = false; });
    } finally {
      // busyRef cleared when TTS completes (or immediately on error paths).
      if (assistantMachine.getState() === 'error') busyRef.current = false;
    }
  }, [runAI, speakResponse, effectiveStrategy]);

  // ── Voice manager lifecycle ───────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const vm = new VoiceManager({
      onPartial: (t) => setPartialTranscript(t),
      onCommand: (t) => processCommand(t),
      onHandsFreeStatus: (s) => setHandsFreeStatus(s),
      onVoiceError: (code) => {
        const map: Record<string, AssistantErrorCode> = {
          'not-allowed': 'MICROPHONE_PERMISSION_DENIED',
          'service-not-allowed': 'MICROPHONE_PERMISSION_DENIED',
          'audio-capture': 'MICROPHONE_UNAVAILABLE',
          'network': 'NETWORK_ERROR',
          'not-supported': 'VOICE_NOT_SUPPORTED',
        };
        const mapped = map[code] ?? 'SPEECH_RECOGNITION_ERROR';
        uiSounds.warn();
        assistantMachine.forceState('error');
        assistantMachine.emit('VOICE_ERROR', { error: mapped });
        setError({
          code: mapped,
          title: ERROR_MESSAGES[mapped].title,
          message: ERROR_MESSAGES[mapped].message,
          retry: code === 'not-allowed' ? undefined : () => { setError(null); vm.startPushToTalk().catch(() => {}); },
        });
        assistantMachine.scheduleIdle(5000);
      },
      onMicLevel: () => {},
    });
    voiceRef.current = vm;
    return () => { vm.dispose(); voiceRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Real mic level → waveform/core ────────────────────────────
  useEffect(() => {
    const off = onMicLevel(l => setMicLevel(l));
    return () => { off(); };
  }, []);

  // ── Cleanup metering on unmount ───────────────────────────────
  useEffect(() => () => stopMicMetering(), []);

  const togglePushToTalk = useCallback(() => {
    const vm = voiceRef.current;
    if (!vm) return;
    if (vm.active) {
      vm.stopPushToTalk();
      setPushToTalkActive(false);
      if (assistantMachine.getState() === 'listening') assistantMachine.transition('idle');
    } else {
      // User gesture — the ideal moment to (re)secure permission + audio ctx.
      startMicMetering().catch(() => {});
      uiSounds.activate();
      vm.startPushToTalk()
        .then(() => {
          setPushToTalkActive(true);
          assistantMachine.transition('listening');
        })
        .catch((err: DOMException) => {
          const code = err.name === 'NotAllowedError' ? 'MICROPHONE_PERMISSION_DENIED'
            : err.name === 'NotFoundError' ? 'MICROPHONE_UNAVAILABLE'
            : err.name === 'NotReadableError' ? 'MICROPHONE_IN_USE' : 'SPEECH_RECOGNITION_ERROR';
          setError({ code, title: ERROR_MESSAGES[code].title, message: ERROR_MESSAGES[code].message });
          assistantMachine.forceState('error');
          assistantMachine.scheduleIdle(5000);
        });
    }
  }, []);

  const toggleHandsFree = useCallback(() => {
    const vm = voiceRef.current;
    if (!vm) return;
    if (vm.isHandsFree) {
      vm.stopHandsFree().catch(() => {});
      assistantMachine.transition('idle');
    } else {
      uiSounds.activate();
      vm.startHandsFree().catch((err: DOMException) => {
        const code = err.name === 'NotAllowedError' ? 'MICROPHONE_PERMISSION_DENIED' : 'MICROPHONE_UNAVAILABLE';
        setError({ code, title: ERROR_MESSAGES[code].title, message: ERROR_MESSAGES[code].message });
      });
    }
  }, []);

  const interruptSpeaking = useCallback(() => {
    voiceRef.current?.interruptSpeech();
  }, []);

  const submitText = useCallback((text: string) => {
    const t = text.trim();
    if (!t) return;
    voiceRef.current?.stopPushToTalk();
    setPushToTalkActive(false);
    processCommand(t);
  }, [processCommand]);

  const updateSettings = useCallback((u: Partial<Settings>) => {
    setSettings(prev => {
      const next = { ...prev, ...u };
      saveSettings(next);
      return next;
    });
  }, []);

  const clearConversation = useCallback(() => {
    setMessages([]);
    setLastResponse('');
  }, []);

  const clearError = useCallback(() => {
    setError(null);
    if (assistantMachine.getState() === 'error') assistantMachine.forceState('idle');
  }, []);

  const value = useMemo<AssistantContextValue>(() => ({
    state, error, clearError,
    messages, submitText, clearConversation,
    partialTranscript, lastResponse,
    micLevel, voiceSupported: SpeechRecognitionSupported(), ttsSupported: tts.supported,
    pushToTalkActive, togglePushToTalk,
    handsFreeStatus, toggleHandsFree,
    interruptSpeaking,
    activeAgents,
    settings, updateSettings,
    pendingPermission, answerPermission,
    // ── Astra layer ──
    mode, setMode,
    workingNotes, refreshNotes,
    taskLedger,
    contextMeter,
    lastModels,
    modelOverride, setModelOverride,
    sessions, activeSessionId, newSession, switchSession, deleteSession,
  }), [state, error, clearError, messages, submitText, clearConversation, partialTranscript, lastResponse,
    micLevel, pushToTalkActive, togglePushToTalk, handsFreeStatus, toggleHandsFree, interruptSpeaking,
    activeAgents, settings, updateSettings, pendingPermission, answerPermission,
    mode, setMode, workingNotes, refreshNotes, taskLedger, contextMeter, lastModels, modelOverride,
    sessions, activeSessionId, newSession, switchSession, deleteSession]);

  return <AssistantCtx.Provider value={value}>{children}</AssistantCtx.Provider>;
}

function SpeechRecognitionSupported(): boolean {
  return typeof window !== 'undefined'
    && !!(window.SpeechRecognition ?? (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition);
}

export function useAssistant(): AssistantContextValue {
  const ctx = useContext(AssistantCtx);
  if (!ctx) throw new Error('useAssistant must be used inside AssistantProvider');
  return ctx;
}

// Re-export AssistantEvent for consumers that want typed events.
export type { AssistantEvent } from './assistant-state';
