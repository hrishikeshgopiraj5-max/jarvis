/**
 * JARVIS Self-Learning System
 * 
 * Automatically learns from successful command executions:
 * - Tracks command outcomes and effectiveness
 * - Builds a playbook of proven attack chains
 * - Learns which tools work best for which scenarios
 * - Suggests next steps based on previous results
 * - Auto-generates new knowledge entries from successful patterns
 */

import { addMemory, addCommand, getCommandHistory, searchMemories } from './memory';
import { KNOWLEDGE_DB, KnowledgeEntry, searchKnowledge } from './knowledge-base';

export interface LearnableEvent {
  type: 'command_success' | 'command_failure' | 'chain_complete' | 'new_technique';
  command?: string;
  output?: string;
  context: string;
  tags: string[];
  timestamp: number;
}

export interface PlaybookEntry {
  id: string;
  name: string;
  description: string;
  steps: { command: string; purpose: string; expectedOutput: string }[];
  tags: string[];
  successRate: number;
  timesUsed: number;
  createdAt: number;
}

const PLAYBOOK_KEY = 'jarvis_playbook';
const LEARNING_KEY = 'jarvis_learning';

// ═══════════════════════════════════════════════════════════════
// LEARNING ENGINE
// ═══════════════════════════════════════════════════════════════

function getLearningStore(): { events: LearnableEvent[]; playbook: PlaybookEntry[] } {
  if (typeof window === 'undefined') return { events: [], playbook: [] };
  try {
    const raw = localStorage.getItem(LEARNING_KEY);
    const pb = localStorage.getItem(PLAYBOOK_KEY);
    return {
      events: raw ? JSON.parse(raw) : [],
      playbook: pb ? JSON.parse(pb) : [],
    };
  } catch { return { events: [], playbook: [] }; }
}

function saveLearningStore(store: ReturnType<typeof getLearningStore>) {
  if (typeof window === 'undefined') return;
  store.events = store.events.slice(-500); // keep last 500
  localStorage.setItem(LEARNING_KEY, JSON.stringify(store));
  localStorage.setItem(PLAYBOOK_KEY, JSON.stringify(store.playbook));
}

/**
 * Learn from a command execution outcome
 */
export function learnFromCommand(
  command: string,
  output: string,
  success: boolean,
  context: string
): void {
  const event: LearnableEvent = {
    type: success ? 'command_success' : 'command_failure',
    command,
    output: output?.substring(0, 500),
    context,
    tags: detectTags(command, output),
    timestamp: Date.now(),
  };

  const store = getLearningStore();
  store.events.push(event);
  saveLearningStore(store);

  // Record in memory system too
  addCommand({
    command,
    tool: detectToolFromCommand(command),
    purpose: context,
    output: output?.substring(0, 300),
    outcome: success ? 'success' : 'failure',
    tags: event.tags,
    notes: `Auto-learned at ${new Date().toLocaleString()}`,
  });

  // Check if this completes a known playbook step
  checkPlaybookProgress(command, output, success);
}

/**
 * Learn from a chain of successful commands (attack chain)
 */
export function learnFromChain(
  commands: { command: string; output: string; success: boolean }[],
  description: string,
  tags: string[]
): void {
  if (commands.length < 2) return;

  const allSuccessful = commands.every(c => c.success);
  if (!allSuccessful) return;

  const store = getLearningStore();

  // Check if similar playbook already exists
  const existing = store.playbook.find(p =>
    tags.some(t => p.tags.includes(t)) &&
    p.steps.some(s => commands.some(c => c.command.includes(s.command.split(' ')[0])))
  );

  if (existing) {
    existing.timesUsed++;
    existing.successRate = Math.min(1, existing.successRate + 0.1);
    saveLearningStore(store);
    return;
  }

  // Create new playbook
  const playbook: PlaybookEntry = {
    id: crypto.randomUUID(),
    name: description,
    description: `Learned from ${commands.length} successful commands`,
    steps: commands.map(c => ({
      command: c.command,
      purpose: inferPurpose(c.command),
      expectedOutput: c.output?.substring(0, 200) || '',
    })),
    tags,
    successRate: allSuccessful ? 1.0 : 0.5,
    timesUsed: 1,
    createdAt: Date.now(),
  };

  store.playbook.push(playbook);

  // Also create a memory entry
  addMemory({
    type: 'pattern',
    content: `Learned attack chain: ${description} — ${commands.map(c => c.command).join(' → ')}`,
    tags: [...tags, 'playbook', 'auto-learned'],
    importance: 8,
    context: `Chain of ${commands.length} commands completed successfully.`,
  });

  saveLearningStore(store);
}

/**
 * Suggest next steps based on current state
 */
export function suggestNextSteps(
  lastCommand: string,
  lastOutput: string,
  intent: string
): string[] {
  const suggestions: string[] = [];
  const outputLower = lastOutput?.toLowerCase() || '';
  const cmdLower = lastCommand?.toLowerCase() || '';

  // Nmap suggestions
  if (cmdLower.includes('nmap') && outputLower.includes('open')) {
    if (outputLower.includes('22/tcp') || outputLower.includes('ssh')) {
      suggestions.push('Try SSH brute force: hydra -l root -P /usr/share/wordlists/rockyou.txt ssh://TARGET');
    }
    if (outputLower.includes('80/tcp') || outputLower.includes('443/tcp') || outputLower.includes('http')) {
      suggestions.push('Run web scan: nmap --script http-enum,http-headers TARGET -p 80');
      suggestions.push('Try Dirb/Gobuster: gobuster dir -u http://TARGET -w /usr/share/wordlists/dirb/common.txt');
    }
    if (outputLower.includes('445/tcp') || outputLower.includes('smb')) {
      suggestions.push('Check SMB vulnerabilities: nmap --script smb-vuln* -p 445 TARGET');
    }
    if (outputLower.includes('3306/tcp') || outputLower.includes('mysql')) {
      suggestions.push('Try MySQL login: mysql -u root -h TARGET');
    }
  }

  // SQLMap suggestions
  if (cmdLower.includes('sqlmap') && outputLower.includes('injectable')) {
    suggestions.push('Dump databases: sqlmap -u URL --dbs --batch');
    suggestions.push('Extract data: sqlmap -u URL -D DATABASE --tables --batch');
  }

  // Searchsploit suggestions
  if (cmdLower.includes('searchsploit') && !outputLower.includes('No Results')) {
    suggestions.push('Try the most relevant exploit from the results');
    suggestions.push('Download exploit: searchsploit -m EXPLOIT_ID');
  }

  // Frida suggestions
  if (cmdLower.includes('frida') && intent === 'mobile') {
    suggestions.push('Bypass SSL pinning: objection --gadget explore');
    suggestions.push('Enumerate classes: frida -U -f TARGET -l enumerate_classes.js');
  }

  // General suggestions based on intent
  if (intent === 'hacking' && suggestions.length === 0) {
    suggestions.push('Try: searchsploit QUERY for known exploits');
    suggestions.push('Try: nmap -sV -sC TARGET for detailed scan');
  }

  return suggestions.slice(0, 4);
}

/**
 * Get suggested commands based on a query
 */
export function getSmartSuggestions(query: string): string[] {
  const q = query.toLowerCase();
  const suggestions: string[] = [];

  if (q.includes('scan') || q.includes('network') || q.includes('port')) {
    suggestions.push('nmap -sV -sC TARGET');
    suggestions.push('masscan TARGET -p0-65535 --rate=1000');
  }

  if (q.includes('web') || q.includes('website') || q.includes('http')) {
    suggestions.push('nikto -h http://TARGET');
    suggestions.push('gobuster dir -u http://TARGET -w /usr/share/wordlists/dirb/common.txt');
  }

  if (q.includes('sql') || q.includes('inject') || q.includes('database')) {
    suggestions.push('sqlmap -u "http://TARGET/?id=1" --dbs --batch');
  }

  if (q.includes('password') || q.includes('brute') || q.includes('crack')) {
    suggestions.push('hydra -l USER -P /usr/share/wordlists/rockyou.txt ssh://TARGET');
    suggestions.push('hashcat -m 0 hashes.txt rockyou.txt');
  }

  if (q.includes('wifi') || q.includes('wireless')) {
    suggestions.push('airmon-ng start wlan0');
    suggestions.push('airodump-ng wlan0mon');
  }

  return suggestions.slice(0, 4);
}

// ═══════════════════════════════════════════════════════════════
// PLAYBOOK MANAGEMENT
// ═══════════════════════════════════════════════════════════════

export function getPlaybooks(): PlaybookEntry[] {
  return getLearningStore().playbook;
}

export function getPlaybooksByTag(tag: string): PlaybookEntry[] {
  return getLearningStore().playbook.filter(p => p.tags.includes(tag));
}

/**
 * Format playbooks for AI prompt injection
 */
export function formatPlaybooksForPrompt(): string {
  const playbooks = getPlaybooks();
  if (playbooks.length === 0) return '';

  let formatted = '\n### LEARNED PLAYBOOKS (from previous successful sessions):\n';
  for (const pb of playbooks.sort((a, b) => b.successRate - a.successRate).slice(0, 5)) {
    formatted += `\n**${pb.name}** (${Math.round(pb.successRate * 100)}% success, used ${pb.timesUsed}x):\n`;
    for (const step of pb.steps) {
      formatted += `  - ${step.purpose}: \`${step.command}\`\n`;
    }
  }
  return formatted;
}

/**
 * Get learning stats
 */
export function getLearningStats() {
  const store = getLearningStore();
  const successCount = store.events.filter(e => e.type === 'command_success').length;
  const failCount = store.events.filter(e => e.type === 'command_failure').length;
  const toolUsage: Record<string, number> = {};
  store.events.forEach(e => {
    if (e.command) {
      const tool = detectToolFromCommand(e.command);
      toolUsage[tool] = (toolUsage[tool] || 0) + 1;
    }
  });

  return {
    totalEvents: store.events.length,
    successCount,
    failCount,
    successRate: store.events.length > 0 ? successCount / store.events.length : 0,
    playbookCount: store.playbook.length,
    toolUsage,
    topTools: Object.entries(toolUsage).sort((a, b) => b[1] - a[1]).slice(0, 5),
  };
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function detectTags(command: string, output: string): string[] {
  const tags: string[] = [];
  const combined = (command + ' ' + (output || '')).toLowerCase();
  if (combined.includes('nmap')) tags.push('nmap', 'recon');
  if (combined.includes('sqlmap')) tags.push('sqlmap', 'sqli');
  if (combined.includes('hydra')) tags.push('hydra', 'brute-force');
  if (combined.includes('metasploit') || combined.includes('msf')) tags.push('metasploit', 'exploitation');
  if (combined.includes('aircrack') || combined.includes('airmon')) tags.push('wifi', 'wireless');
  if (combined.includes('frida')) tags.push('frida', 'mobile');
  if (combined.includes('hashcat')) tags.push('hashcat', 'password');
  if (combined.includes('gobuster') || combined.includes('dirb')) tags.push('directory', 'web');
  if (combined.includes('burp')) tags.push('burp', 'web');
  if (combined.includes('nikto')) tags.push('nikto', 'web');
  if (tags.length === 0) tags.push('general');
  return tags;
}

function detectToolFromCommand(command: string): string {
  const lower = command.toLowerCase();
  if (lower.startsWith('nmap')) return 'nmap';
  if (lower.startsWith('sqlmap')) return 'sqlmap';
  if (lower.startsWith('hydra')) return 'hydra';
  if (lower.startsWith('hashcat')) return 'hashcat';
  if (lower.startsWith('john')) return 'john';
  if (lower.startsWith('aircrack') || lower.startsWith('airmon') || lower.startsWith('airodump')) return 'aircrack-ng';
  if (lower.startsWith('frida')) return 'frida';
  if (lower.startsWith('gobuster')) return 'gobuster';
  if (lower.startsWith('nikto')) return 'nikto';
  if (lower.startsWith('masscan')) return 'masscan';
  if (lower.startsWith('curl')) return 'curl';
  if (lower.startsWith('python')) return 'python';
  if (lower.startsWith('msfvenom') || lower.includes('msfconsole')) return 'metasploit';
  if (lower.startsWith('searchsploit')) return 'searchsploit';
  return 'shell';
}

function inferPurpose(command: string): string {
  const lower = command.toLowerCase();
  if (lower.includes('scan') || lower.includes('nmap')) return 'Network scanning';
  if (lower.includes('brute') || lower.includes('hydra')) return 'Password brute force';
  if (lower.includes('sql') || lower.includes('inject')) return 'SQL injection testing';
  if (lower.includes('enum') || lower.includes('dirb') || lower.includes('gobuster')) return 'Directory enumeration';
  if (lower.includes('download') || lower.includes('wget') || lower.includes('curl')) return 'File download';
  if (lower.includes('search') || lower.includes('sploit')) return 'Exploit search';
  return 'Command execution';
}

function checkPlaybookProgress(command: string, output: string, success: boolean): void {
  const store = getLearningStore();

  for (const pb of store.playbook) {
    const currentStepIdx = pb.steps.findIndex(s =>
      command.includes(s.command.split(' ')[0]) && !s._completed
    );
    if (currentStepIdx >= 0) {
      (pb.steps[currentStepIdx] as any)._completed = true;
      pb.steps[currentStepIdx].expectedOutput = output?.substring(0, 200) || '';

      // All steps completed?
      if (pb.steps.every(s => (s as any)._completed)) {
        pb.timesUsed++;
        pb.successRate = Math.min(1, pb.successRate + 0.1);
      }
    }
  }

  saveLearningStore(store);
}
