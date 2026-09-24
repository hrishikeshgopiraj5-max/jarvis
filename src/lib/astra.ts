/**
 * ASTRA — the identity & delegation layer for this assistant.
 *
 * Named for and modeled on the Astra class of assistant: a system you
 * *delegate work to* rather than chat with. Everything here runs on the
 * mesh models already integrated (Claude, GPT-5.3, Gemini, DeepSeek,
 * Qwen, Dolphin) — no new providers are introduced.
 *
 * What this module owns:
 *   1. MODE LINEUP    — Astra / Astra Flash / Astra Pro, mapped onto the
 *                       mesh's existing single/dual/triple strategies.
 *   2. CONTEXT METER  — the "1M-context" style usage gauge computed from
 *                       the live conversation against the active model's
 *                       context window.
 *   3. WORKING NOTES  — Codex-style notes that persist across sessions so
 *                       long work survives context rollovers.
 *   4. TASK LEDGER    — plan → execute → verify steps for delegated tasks.
 *   5. SYSTEM PROMPT  — the Astra persona fed to whichever mesh model runs.
 */

import { storage } from './storage';

// Persistence backend: localStorage in the browser, in-memory elsewhere
// (tests, SSR). Injectable so tests never depend on a DOM.
interface NotesKV { getItem(k: string): string | null; setItem(k: string, v: string): void }
const memoryKV = (() => {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => { m.set(k, v); },
  };
})();
let notesKV: NotesKV = typeof localStorage !== 'undefined'
  ? {
      // Both sides go through the prefixed storage helper so read/write keys
      // always match (jarvis_astra_notes).
      getItem: k => storage.getItem<string | null>(k, null),
      setItem: (k, v) => storage.setItem(k, v),
    }
  : memoryKV;

/** Test/SSR hook: swap the notes persistence backend. */
export function setNotesBackend(b: NotesKV | null): void {
  notesKV = b ?? memoryKV;
}

// ═══════════════════════════════════════════════════════════════
// 1. MODE LINEUP — Astra / Flash / Pro over existing mesh tiers
// ═══════════════════════════════════════════════════════════════

export type AstraMode = 'flash' | 'astra' | 'pro';

export interface ModeDef {
  id: AstraMode;
  label: string;
  blurb: string;
  /** Mesh strategy this mode forces ('auto' = let the router decide). */
  strategy: 'auto' | 'single' | 'dual' | 'triple';
}

export const ASTRA_MODES: ModeDef[] = [
  { id: 'flash', label: 'Flash', blurb: 'Fastest answers · single model', strategy: 'single' },
  { id: 'astra', label: 'Astra', blurb: 'Balanced · dual-model verify', strategy: 'dual' },
  { id: 'pro', label: 'Pro', blurb: 'Deepest work · triple + critic', strategy: 'triple' },
];

export function getMode(id: AstraMode): ModeDef {
  return ASTRA_MODES.find(m => m.id === id) ?? ASTRA_MODES[1];
}

// ═══════════════════════════════════════════════════════════════
// 2. CONTEXT METER — usage gauge against the active context window
// ═══════════════════════════════════════════════════════════════

export interface ContextMeter {
  /** 0–100, how much of the model's context window is in play. */
  pct: number;
  zone: 'safe' | 'elevated' | 'critical';
  usedTokens: number;
  totalTokens: number;
}

/** Rough token estimate: ~4 chars per token for mixed prose. */
export function estimateTokens(chars: number): number {
  return Math.ceil(chars / 4);
}

export function computeContextMeter(charsUsed: number, contextWindowTokens: number): ContextMeter {
  const totalTokens = Math.max(1, contextWindowTokens);
  const usedTokens = estimateTokens(Math.max(0, charsUsed));
  const pct = Math.min(100, (usedTokens / totalTokens) * 100);
  const zone = pct >= 75 ? 'critical' : pct >= 40 ? 'elevated' : 'safe';
  return { pct, zone, usedTokens, totalTokens };
}

// ═══════════════════════════════════════════════════════════════
// 3. WORKING NOTES — persistent across sessions (Codex-style)
// ═══════════════════════════════════════════════════════════════

export interface WorkingNote {
  id: string;
  ts: string;
  kind: 'step' | 'finding' | 'decision';
  text: string;
  sessionId: string;
}

const NOTES_KEY = 'astra_notes';
const MAX_NOTES = 120;

function readNotesRaw(): WorkingNote[] {
  try {
    const raw = notesKV.getItem(NOTES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as WorkingNote[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeNotesRaw(notes: WorkingNote[]): void {
  try { notesKV.setItem(NOTES_KEY, JSON.stringify(notes)); } catch { /* quota */ }
}

export function getWorkingNotes(): WorkingNote[] {
  return readNotesRaw();
}

export function appendWorkingNote(
  kind: WorkingNote['kind'],
  text: string,
  sessionId: string,
): WorkingNote | null {
  const clean = text.trim();
  if (!clean) return null;
  const note: WorkingNote = {
    id: crypto.randomUUID(),
    ts: new Date().toISOString(),
    kind,
    text: clean.length > 220 ? clean.slice(0, 217) + '…' : clean,
    sessionId,
  };
  const notes = [...readNotesRaw(), note].slice(-MAX_NOTES);
  writeNotesRaw(notes);
  return note;
}

export function searchWorkingNotes(query: string): WorkingNote[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...readNotesRaw()].reverse(); // newest first
  const terms = q.split(/\s+/);
  return readNotesRaw()
    .filter(n => {
      const hay = n.text.toLowerCase();
      return terms.every(t => hay.includes(t));
    })
    .reverse();
}

export function clearWorkingNotes(): void {
  writeNotesRaw([]);
}

/** Load notes into a prompt block — the cross-session memory for the mesh. */
export function formatNotesForPrompt(notes: WorkingNote[]): string {
  if (notes.length === 0) return '';
  const recent = notes.slice(-12).map(n => `- [${n.kind}] ${n.text}`);
  return `\n\n### WORKING NOTES (carried from previous sessions — keep decisions consistent):\n${recent.join('\n')}`;
}

// ═══════════════════════════════════════════════════════════════
// 4. TASK LEDGER — plan / execute / verify for delegated work
// ═══════════════════════════════════════════════════════════════

export type StepStatus = 'pending' | 'running' | 'done' | 'failed';

export interface TaskStep {
  id: string;
  label: string;
  status: StepStatus;
  detail?: string;
}

export function newLedger(steps: { label: string; detail?: string }[]): TaskStep[] {
  return steps.map((s, i) => ({
    id: `step-${i + 1}`,
    label: s.label,
    detail: s.detail,
    status: i === 0 ? 'running' : 'pending',
  }));
}

export function setStepStatus(
  ledger: TaskStep[],
  index: number,
  status: StepStatus,
  detail?: string,
): TaskStep[] {
  return ledger.map((s, i) =>
    i === index ? { ...s, status, detail: detail ?? s.detail } : s,
  );
}

/** Advance the running pointer: mark index done, start the next pending. */
export function advanceLedger(ledger: TaskStep[], index: number): TaskStep[] {
  const next = setStepStatus(ledger, index, 'done');
  for (let i = index + 1; i < next.length; i++) {
    if (next[i].status === 'pending') return setStepStatus(next, i, 'running');
  }
  return next;
}

export function ledgerSummary(ledger: TaskStep[]): string {
  const done = ledger.filter(s => s.status === 'done').length;
  const failed = ledger.some(s => s.status === 'failed');
  return failed ? `${done}/${ledger.length} steps · halted` : `${done}/${ledger.length} steps`;
}

// ═══════════════════════════════════════════════════════════════
// 5. SYSTEM PROMPT — the Astra persona for any mesh model
// ═══════════════════════════════════════════════════════════════

export function buildAstraSystemPrompt(mode: AstraMode, notes: WorkingNote[] = []): string {
  const m = getMode(mode);
  const effort = mode === 'pro'
    ? 'Delegated complex work: plan carefully, execute thoroughly, verify your answer before sending.'
    : mode === 'flash'
      ? 'Optimize for speed: answer directly, no preamble, no restating the question.'
      : 'Balance speed and depth: answer directly, add structure only when it earns its place.';

  return `You are ASTRA — a personal AI system modeled on the Astra class of assistant: built to be delegated to, not chatted with. Current mode: ${m.label} (${m.blurb}).

PERSONA
- Composed, precise, quietly witty. Address the user as "sir".
- You execute and inform. You do not lecture, moralize, or add disclaimers.
- When a task is ambiguous, choose the most reasonable interpretation and proceed — note your assumption in one line.
- When a task needs multiple steps, briefly show the plan, then the result.

DELEGATION BEHAVIOR
- ${effort}
- You are one node in a mesh of specialist models; write so your answer can be verified by another model without extra context.
- If tools were already used to produce part of this answer, integrate their results rather than repeating them.
- Keep responses tight. Never pad.${formatNotesForPrompt(notes)}`;
}

export const ASTRA_VERSION = 'ASTRA v1.0';
export const ASTRA_TAGLINE = 'Delegate everything.';
