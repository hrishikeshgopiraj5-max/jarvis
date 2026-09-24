/**
 * JARVIS Tool Architecture
 *
 * Every tool declares name, description, input schema, risk level, and a
 * real executor. No fake results: tools either genuinely work with browser
 * APIs or return a structured "unavailable" result explaining what's needed.
 * Risky tools route through the permission system before executing.
 */

import { selectAgents, AgentId } from './agents';
import { resolvePermission, PermissionRequest } from './permissions';
import { createNote, getNotes, getReminders, createReminder } from './storage';
import { assistantMachine } from './assistant-state';
import {
  buildFromTemplate, parseCADRequest, modelStats, MATERIALS, type CADModel,
} from './cad';

export type ToolId =
  | 'time' | 'date' | 'calculator' | 'notes' | 'reminders'
  | 'web_search' | 'weather' | 'system_status' | 'clipboard' | 'cad';

export interface ToolResult {
  ok: boolean;
  /** Spoken/display response text. */
  message: string;
  /** Structured payload for the contextual UI panel. */
  data?: Record<string, unknown>;
  /** Which contextual card the UI should render. */
  card?: 'clock' | 'notes' | 'weather' | 'system' | 'search' | 'cad';
  /** Optional override for the error code surfaced by the orchestrator. */
  errorOverride?: string;
}

export interface ToolContext {
  /** Open a URL — injected so tools stay testable. */
  openUrl?: (url: string, altText: string) => void;
}

export interface ToolDef {
  name: ToolId;
  description: string;
  /** JSON-schema-ish input description used by the AI router prompt. */
  inputSchema: Record<string, string>;
  risk: 'low' | 'medium' | 'high';
  agents: AgentId[];
  /** Triggers used by the local deterministic router (no AI round-trip). */
  patterns: RegExp[];
  execute: (input: string, ctx: ToolContext) => Promise<ToolResult>;
}

// ── Real implementations ─────────────────────────────────────────────────

async function timeTool(): Promise<ToolResult> {
  const now = new Date();
  return {
    ok: true,
    message: `The time is ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}, sir.`,
    data: { iso: now.toISOString(), time: now.toLocaleTimeString() },
    card: 'clock',
  };
}

async function dateTool(): Promise<ToolResult> {
  const now = new Date();
  const pretty = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  return { ok: true, message: `Today is ${pretty}.`, data: { iso: now.toISOString(), date: pretty }, card: 'clock' };
}

/**
 * Safe arithmetic evaluator — recursive descent, no eval. Supports + - * / % ^
 * parentheses, decimals, and unary minus (including 10 * -2 and 2 ^ -3).
 */
export function evaluateExpression(expr: string): number {
  const tokens = expr.match(/\d+\.?\d*|[+\-*/%^()]/g);
  if (!tokens || tokens.length === 0) throw new Error('No expression');
  let pos = 0;

  const peek = () => tokens[pos];
  const next = () => tokens[pos++];

  function parseExpr(): number {
    let value = parseTerm();
    while (peek() === '+' || peek() === '-') {
      const op = next();
      const rhs = parseTerm();
      value = op === '+' ? value + rhs : value - rhs;
    }
    return value;
  }

  function parseTerm(): number {
    let value = parseFactor();
    while (peek() === '*' || peek() === '/' || peek() === '%') {
      const op = next();
      const rhs = parseFactor();
      value = op === '*' ? value * rhs : op === '/' ? value / rhs : value % rhs;
    }
    return value;
  }

  function parseFactor(): number {
    const base = parseBase();
    if (peek() === '^') {
      next();
      return Math.pow(base, parseFactor()); // right-associative
    }
    return base;
  }

  function parseBase(): number {
    const tk = next();
    if (tk === undefined) throw new Error('Malformed expression');
    if (tk === '-') return -parseBase();  // unary minus
    if (tk === '+') return parseBase();   // unary plus
    if (tk === '(') {
      const value = parseExpr();
      if (next() !== ')') throw new Error('Malformed expression');
      return value;
    }
    if (/^\d/.test(tk)) return parseFloat(tk);
    throw new Error('Malformed expression');
  }

  const result = parseExpr();
  if (pos !== tokens.length || Number.isNaN(result) || !Number.isFinite(result)) {
    throw new Error('Malformed expression');
  }
  return result;
}

async function calculatorTool(input: string): Promise<ToolResult> {
  const expr = input.replace(/[^0-9+\-*/%^().\s]/g, '').trim();
  if (!expr) return { ok: false, message: 'I couldn\u2019t find a calculation in that request.' };
  try {
    const value = evaluateExpression(expr);
    return { ok: true, message: `That comes to ${value}, sir.`, data: { expression: expr, value }, card: 'clock' };
  } catch {
    return { ok: false, message: 'That expression didn\u2019t parse as arithmetic. Try something like "12 * 7 + 5".' };
  }
}

async function notesTool(input: string): Promise<ToolResult> {
  const lower = input.toLowerCase();
  // create note: "create a note ..." / "note: ..."
  const createMatch = input.match(/(?:create|add|make|new|save|take)\s+(?:a\s+)?note[:\s]+(.+)/i)
    ?? input.match(/note\s*[:\-]\s*(.+)/i);
  if (createMatch) {
    const body = createMatch[1].trim();
    const title = body.length > 40 ? `${body.slice(0, 40)}\u2026` : body;
    const note = createNote(title, body);
    return {
      ok: true,
      message: `Noted, sir. \u201C${title}\u201D has been saved.`,
      data: { noteId: note.id, title: note.title },
      card: 'notes',
    };
  }
  const list = getNotes();
  if (list.length === 0) return { ok: true, message: 'You have no saved notes yet, sir.', data: { notes: [] }, card: 'notes' };
  const preview = list.slice(0, 5).map(n => `\u2022 ${n.title}`).join('\n');
  return {
    ok: true,
    message: `You have ${list.length} note${list.length === 1 ? '' : 's'}, sir. Most recent:\n${preview}`,
    data: { notes: list.slice(0, 20).map(n => ({ id: n.id, title: n.title, updatedAt: n.updatedAt })) },
    card: 'notes',
  };
}

async function remindersTool(input: string): Promise<ToolResult> {
  const m = input.match(/remind me (?:in |after |at )?(\d+)\s*(seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h)\s*(?:to |about |that )?(.*)/i);
  if (m) {
    const amount = parseInt(m[1], 10);
    const unit = m[2].toLowerCase();
    const ms = unit.startsWith('h') ? amount * 3600000 : unit.startsWith('m') ? amount * 60000 : amount * 1000;
    const message = m[3]?.trim() || 'Your reminder';
    const triggerAt = new Date(Date.now() + ms);
    createReminder(message, triggerAt.toISOString());
    const human = unit.startsWith('h') ? `${amount} hour${amount > 1 ? 's' : ''}` : unit.startsWith('m') ? `${amount} minute${amount > 1 ? 's' : ''}` : `${amount} second${amount > 1 ? 's' : ''}`;
    return {
      ok: true,
      message: `Reminder set, sir. I\u2019ll alert you in ${human}${message !== 'Your reminder' ? `: ${message}` : ''}.`,
      data: { message, triggerAt: triggerAt.toISOString(), inMs: ms },
      card: 'clock',
    };
  }
  const pending = getReminders().filter(r => !r.completed);
  if (pending.length === 0) return { ok: true, message: 'No pending reminders, sir.', data: { reminders: [] }, card: 'clock' };
  return {
    ok: true,
    message: `You have ${pending.length} pending reminder${pending.length === 1 ? '' : 's'}: ${pending.slice(0, 3).map(r => r.message).join('; ')}.`,
    data: { reminders: pending.slice(0, 10) },
    card: 'clock',
  };
}

const SEARCH_ENGINES: Record<string, (q: string) => string> = {
  google: q => `https://www.google.com/search?q=${encodeURIComponent(q)}`,
  youtube: q => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`,
  wikipedia: q => `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(q)}`,
  duckduckgo: q => `https://duckduckgo.com/?q=${encodeURIComponent(q)}`,
};

async function webSearchTool(input: string, ctx: ToolContext): Promise<ToolResult> {
  let engine = 'google';
  let query = input;
  let m: RegExpMatchArray | null;
  if ((m = input.match(/\b(?:search|look up|find)\s+(?:for\s+)?([a-z]+)\s+(?:for\s+)?(.+)/i))) {
    const maybe = m[1].toLowerCase();
    if (SEARCH_ENGINES[maybe]) { engine = maybe; query = m[2]; }
  }
  if ((m = input.match(/\b(?:on|in)\s+(google|youtube|wikipedia|duckduckgo)\b/i))) engine = m[1].toLowerCase();
  query = query.replace(/\b(search|google|youtube|wikipedia|look up|find|for|on the web|online)\b/gi, ' ').replace(/\s+/g, ' ').trim() || input.trim();
  const url = SEARCH_ENGINES[engine](query);
  ctx.openUrl?.(url, `${engine} search: ${query}`);
  return {
    ok: true,
    message: `Searching ${engine} for \u201C${query}\u201D, sir. Opening the results now.`,
    data: { engine, query, url },
    card: 'search',
  };
}

async function weatherTool(input: string): Promise<ToolResult> {
  let city: string | undefined = input.match(/weather(?:\s+forecast)?\s+(?:in|for|at)\s+(.+)/i)?.[1];
  if (!city) {
    try {
      const res = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(4000) });
      const j = await res.json();
      city = j.city || 'London';
    } catch {
      city = 'London';
    }
  }
  try {
    const res = await fetch(`/api/weather?city=${encodeURIComponent((city ?? 'London').trim())}`, { signal: AbortSignal.timeout(8000) });
    const data = await res.json();
    if (!res.ok || data.error) {
      return { ok: false, message: data.setup ? 'Weather service isn\u2019t configured yet — add OPENWEATHER_API_KEY to .env.local and restart.' : `Weather lookup failed: ${data.error}` };
    }
    return {
      ok: true,
      message: `Currently ${Math.round(data.temp)}\u00B0C with ${data.description} in ${data.city}, sir.`,
      data: { ...data },
      card: 'weather',
    };
  } catch {
    return { ok: false, message: 'I couldn\u2019t reach the weather service, sir. Retry in a moment.' };
  }
}

interface MemoryLike { usedJSHeapSize: number; jsHeapSizeLimit: number }
async function systemStatusTool(): Promise<ToolResult> {
  const mem = (performance as unknown as { memory?: MemoryLike }).memory;
  const nav = navigator as unknown as { hardwareConcurrency?: number; deviceMemory?: number; onLine: boolean };
  const data = {
    cores: nav.hardwareConcurrency ?? null,
    deviceMemoryGB: nav.deviceMemory ?? null,
    jsHeapUsedMB: mem ? Math.round(mem.usedJSHeapSize / 1048576) : null,
    jsHeapLimitMB: mem ? Math.round(mem.jsHeapSizeLimit / 1048576) : null,
    online: nav.onLine,
    platform: navigator.platform || 'unknown',
  };
  return {
    ok: true,
    message: `System status: ${data.cores ?? '?'} logical cores, ${data.online ? 'network online' : 'offline'}${data.jsHeapUsedMB ? `, ${data.jsHeapUsedMB} MB JS heap in use` : ''}, sir.`,
    data,
    card: 'system',
  };
}

// ── Build Studio: merged CAD + blueprint with engineering validation ──────

/** Opens the Build Studio panel via a custom window event the page listens for. */
function openCADStudio(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('jarvis:open-cad'));
  }
}

async function cadTool(input: string): Promise<ToolResult> {
  const parsed = parseCADRequest(input);
  if (!parsed.matched) {
    return {
      ok: false,
      message: 'I can model phone cases, enclosures, gears, orbs, brackets, speaker horns, and robot-arm segments, sir. Try: “make an enclosure 90 by 70 by 32”.',
    };
  }
  let model: CADModel;
  try {
    model = buildFromTemplate(parsed.templateId, parsed.overrides);
  } catch {
    return { ok: false, message: 'The parameters landed outside the template\u2019s valid range, sir.' };
  }
  const stats = modelStats(model);
  openCADStudio();
  return {
    ok: true,
    message: `Model ready, sir — ${model.name}: ${model.shapes.length} part${model.shapes.length === 1 ? '' : 's'}, ${stats.boundingBoxMm.x.toFixed(0)}×${stats.boundingBoxMm.y.toFixed(0)}×${stats.boundingBoxMm.z.toFixed(0)} mm, ${stats.volumeCm3.toFixed(1)} cm³ (${stats.massG.toFixed(0)} g in ${MATERIALS[model.material].label}). The CAD Studio is open — export STL when you\u2019re satisfied.`,
    data: {
      templateName: model.name,
      parts: model.shapes.length,
      sizeMm: `${stats.boundingBoxMm.x.toFixed(0)}×${stats.boundingBoxMm.y.toFixed(0)}×${stats.boundingBoxMm.z.toFixed(0)} mm`,
      volumeCm3: stats.volumeCm3,
      massG: stats.massG,
      material: MATERIALS[model.material].label,
    },
    card: 'cad',
  };
}

// ── Registry ─────────────────────────────────────────────────────────────

export const TOOLS: ToolDef[] = [
  {
    name: 'time', description: 'Current time', inputSchema: {}, risk: 'low', agents: ['calendar'],
    patterns: [/\bwhat(?:'s| is)? the time\b/i, /\bcurrent time\b/i, /\btime is it\b/i],
    execute: timeTool,
  },
  {
    name: 'date', description: 'Today\u2019s date', inputSchema: {}, risk: 'low', agents: ['calendar'],
    patterns: [/\bwhat(?:'s| is)? (?:the |today'?s )?date\b/i, /\bwhat day is (?:it|today)\b/i],
    execute: dateTool,
  },
  {
    name: 'calculator', description: 'Evaluate arithmetic safely', inputSchema: { expression: 'string' }, risk: 'low', agents: ['research'],
    patterns: [/\b(?:calculate|compute)\b/i, /\d+\s*[+\-*/^%]\s*\d+/],
    execute: calculatorTool,
  },
  {
    name: 'notes', description: 'Create or list notes', inputSchema: { action: '"create" | "list"', body: 'string?' }, risk: 'low', agents: ['files', 'memory'],
    patterns: [/\b(?:create|add|make|new|save|take|show|list|read)\b[^.?!]*\bnotes?\b/i, /^note\s*[:\-]/i],
    execute: notesTool,
  },
  {
    name: 'reminders', description: 'Set or list reminders', inputSchema: { delay: 'number', unit: 'seconds|minutes|hours', message: 'string?' }, risk: 'low', agents: ['calendar', 'memory'],
    patterns: [/\bremind me\b/i, /\b(?:set|create)\b[^.?!]*\breminder\b/i],
    execute: remindersTool,
  },
  {
    name: 'web_search', description: 'Open a real web search', inputSchema: { query: 'string', engine: 'google|youtube|wikipedia|duckduckgo?' }, risk: 'medium', agents: ['web', 'research'],
    patterns: [/\b(?:search|google|look up|youtube|wikipedia)\b/i],
    execute: webSearchTool,
  },
  {
    name: 'weather', description: 'Live weather via configured API', inputSchema: { city: 'string?' }, risk: 'low', agents: ['web', 'research'],
    patterns: [/\bweather\b/i, /\btemperature (?:in|at|outside)\b/i],
    execute: weatherTool,
  },
  {
    name: 'system_status', description: 'Real device metrics available to the browser', inputSchema: {}, risk: 'low', agents: ['system'],
    patterns: [/\b(?:system|diagnostic|health)\b[^.?!]*\b(?:status|report|check|info)\b/i, /\bhow (?:is|are) (?:my )?(?:system|pc|computer)\b/i],
    execute: systemStatusTool,
  },
  {
    name: 'cad', description: 'Create a parametric 3D model (CAD) from a description and open the CAD Studio', inputSchema: { description: 'string' }, risk: 'low', agents: ['design', 'engineering'],
    patterns: [/\b(?:make|create|design|model|build)\b[^.?!]*\b(?:3d|cad|stl)\b/i, /\b(phone case|enclosure|project box|gear|cog|sprocket|bracket|speaker horn|robot arm)\b/i],
    execute: cadTool,
  },
];

export function findTool(text: string): ToolDef | null {
  for (const tool of TOOLS) {
    if (tool.patterns.some(p => p.test(text))) return tool;
  }
  return null;
}

/**
 * Execute a tool end-to-end: permission gate → state events → execute →
 * structured result. Emits TOOL_STARTED / TOOL_COMPLETED / TOOL_FAILED.
 */
export async function executeTool(tool: ToolDef, input: string, ctx: ToolContext = {}): Promise<ToolResult> {
  const request: PermissionRequest = {
    tool: tool.name,
    action: tool.name,
    summary: tool.description,
    risk: tool.risk,
  };
  assistantMachine.transition('executing');
  assistantMachine.emit('TOOL_STARTED', { toolName: tool.name, agentId: tool.agents[0] });

  if (tool.risk !== 'low') {
    const decision = await resolvePermission(request);
    assistantMachine.emit(decision === 'granted' ? 'PERMISSION_GRANTED' : 'PERMISSION_DENIED', { toolName: tool.name });
    if (decision === 'denied') {
      assistantMachine.forceState('idle');
      assistantMachine.emit('TOOL_FAILED', { toolName: tool.name, detail: 'denied by user' });
      return { ok: false, message: 'Understood — I won\u2019t do that, sir.' };
    }
  }

  try {
    const result = await tool.execute(input, ctx);
    assistantMachine.emit(result.ok ? 'TOOL_COMPLETED' : 'TOOL_FAILED', { toolName: tool.name });
    return result;
  } catch (err) {
    console.error(`[JARVIS tool:${tool.name}]`, err);
    assistantMachine.emit('TOOL_FAILED', { toolName: tool.name });
    return { ok: false, message: `The ${tool.name} tool hit an unexpected fault. Retry is available.` };
  }
}
