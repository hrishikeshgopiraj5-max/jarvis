/**
 * JARVIS Memory System — Persistent learning from every session
 * 
 * Stores and retrieves:
 * - Conversation memories (key facts, decisions, outcomes)
 * - Command history (what was executed, success/failure)
 * - Learned patterns (what approaches work for what problems)
 * - User preferences (how they like responses, tools they use)
 * - Session summaries (condensed history)
 * 
 * All stored in localStorage for persistence across sessions.
 */

export interface Memory {
  id: string;
  timestamp: number;
  type: 'conversation' | 'command' | 'pattern' | 'preference' | 'error' | 'discovery';
  content: string;
  tags: string[];
  context?: string;
  outcome?: 'success' | 'failure' | 'partial';
  importance: number; // 1-10, higher = more important to remember
}

export interface CommandRecord {
  id: string;
  timestamp: number;
  command: string;
  tool: string;
  purpose: string;
  output?: string;
  outcome: 'success' | 'failure' | 'partial';
  tags: string[];
  notes?: string;
}

export interface SessionSummary {
  id: string;
  startTime: number;
  endTime: number;
  topic: string;
  keyFindings: string[];
  commandsUsed: string[];
  lessonsLearned: string[];
}

const STORAGE_KEY = 'jarvis_memory';
const MAX_MEMORIES = 500;
const MAX_COMMANDS = 200;

// ═══════════════════════════════════════════════════════════════
// MEMORY OPERATIONS
// ═══════════════════════════════════════════════════════════════

function getStore(): { memories: Memory[]; commands: CommandRecord[]; sessions: SessionSummary[]; userPrefs: Record<string, string> } {
  if (typeof window === 'undefined') return { memories: [], commands: [], sessions: [], userPrefs: {} };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { memories: [], commands: [], sessions: [], userPrefs: {} };
}

function saveStore(store: ReturnType<typeof getStore>) {
  if (typeof window === 'undefined') return;
  // Trim to max size
  store.memories = store.memories.slice(0, MAX_MEMORIES);
  store.commands = store.commands.slice(0, MAX_COMMANDS);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function addMemory(memory: Omit<Memory, 'id' | 'timestamp'>): Memory {
  const store = getStore();
  const entry: Memory = {
    ...memory,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
  };
  store.memories.unshift(entry);
  saveStore(store);
  return entry;
}

export function addCommand(cmd: Omit<CommandRecord, 'id' | 'timestamp'>): CommandRecord {
  const store = getStore();
  const record: CommandRecord = {
    ...cmd,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
  };
  store.commands.unshift(record);
  saveStore(store);
  return record;
}

export function getMemories(query?: string, type?: Memory['type'], limit: number = 50): Memory[] {
  const store = getStore();
  let results = store.memories;
  
  if (type) {
    results = results.filter(m => m.type === type);
  }
  
  if (query) {
    const q = query.toLowerCase();
    results = results.filter(m =>
      m.content.toLowerCase().includes(q) ||
      m.tags.some(t => t.includes(q))
    );
  }
  
  // Sort by importance (desc) and recency (desc)
  results.sort((a, b) => {
    const impDiff = b.importance - a.importance;
    if (impDiff !== 0) return impDiff;
    return b.timestamp - a.timestamp;
  });
  
  return results.slice(0, limit);
}

export function getCommandHistory(tool?: string, limit: number = 50): CommandRecord[] {
  const store = getStore();
  let results = store.commands;
  
  if (tool) {
    results = results.filter(c => c.tool.toLowerCase().includes(tool.toLowerCase()));
  }
  
  return results.slice(0, limit);
}

export function searchMemories(query: string): Memory[] {
  const store = getStore();
  const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 1);
  
  return store.memories
    .map(m => {
      let score = 0;
      const content = m.content.toLowerCase();
      const tags = m.tags.join(' ').toLowerCase();
      
      for (const term of terms) {
        if (content.includes(term)) score += 2;
        if (tags.includes(term)) score += 3;
        if (m.context?.toLowerCase().includes(term)) score += 1;
      }
      
      // Recency bonus (more recent = slightly higher)
      const age = Date.now() - m.timestamp;
      const daysSinceCreation = age / (1000 * 60 * 60 * 24);
      if (daysSinceCreation < 1) score += 2;
      else if (daysSinceCreation < 7) score += 1;
      
      return { ...m, score };
    })
    .filter(m => m.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);
}

/**
 * Format memories for injection into AI prompt context
 */
export function formatMemoriesForPrompt(memories: Memory[]): string {
  if (memories.length === 0) return '';
  
  let formatted = '\n### REMEMBERED CONTEXT:\n';
  for (const m of memories) {
    const timeStr = new Date(m.timestamp).toLocaleString();
    formatted += `- [${m.type.toUpperCase()}] ${m.content} (${timeStr})\n`;
  }
  return formatted;
}

export function formatCommandsForPrompt(commands: CommandRecord[]): string {
  if (commands.length === 0) return '';
  
  let formatted = '\n### PREVIOUS COMMANDS & OUTCOMES:\n';
  for (const c of commands) {
    const icon = c.outcome === 'success' ? '✅' : c.outcome === 'failure' ? '❌' : '⚠️';
    formatted += `${icon} \`${c.command}\` — ${c.purpose} (${c.outcome})\n`;
  }
  return formatted;
}

/**
 * Get memory stats
 */
export function getMemoryStats() {
  const store = getStore();
  const typeCounts = store.memories.reduce((acc, m) => {
    acc[m.type] = (acc[m.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const commandStats = store.commands.reduce((acc, c) => {
    acc[c.outcome] = (acc[c.outcome] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const toolCounts = store.commands.reduce((acc, c) => {
    acc[c.tool] = (acc[c.tool] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  return {
    totalMemories: store.memories.length,
    totalCommands: store.commands.length,
    typeCounts,
    commandStats,
    toolCounts,
    topTools: Object.entries(toolCounts).sort((a, b) => b[1] - a[1]).slice(0, 5),
  };
}

/**
 * Clear all memories (fresh start)
 */
export function clearAllMemories() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Export memories as JSON for backup
 */
export function exportMemories(): string {
  return JSON.stringify(getStore(), null, 2);
}
