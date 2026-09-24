/**
 * JARVIS Agent Network Registry
 *
 * Specialized capability nodes orbiting the central AI core. The network is
 * DYNAMIC: agents activate in response to what the user asks, connections
 * animate from the core to the active nodes, and everything settles back
 * when the task completes. This registry is the single source of truth for
 * the 3D AgentNetwork visualization AND for tool routing.
 */

export type AgentId =
  | 'research' | 'strategy' | 'memory' | 'engineering' | 'coding'
  | 'design' | 'finance' | 'communication' | 'calendar' | 'files'
  | 'web' | 'system' | 'automation';

export interface AgentNodeDef {
  id: AgentId;
  label: string;
  /** Words that hint this agent is relevant to the request. */
  patterns: RegExp[];
  /** Agents that naturally pair with this one. */
  allies: AgentId[];
}

export const AGENT_NODES: AgentNodeDef[] = [
  { id: 'research', label: 'RESEARCH', patterns: [/\b(research|investigat|analy[sz]e|stud|compare|explain|why|how does)\b/i], allies: ['web', 'memory'] },
  { id: 'strategy', label: 'STRATEGY', patterns: [/\b(plan|strategy|roadmap|prioriti[sz]e|goal|business|decide|organi[sz]e)\b/i], allies: ['research', 'memory'] },
  { id: 'memory', label: 'MEMORY', patterns: [/\b(remember|recall|forgot|earlier|previously|history|conversation)\b/i], allies: ['research'] },
  { id: 'engineering', label: 'ENGINEERING', patterns: [/\b(build|implement|architecture|deploy|infrastructur|server|api|backend|database|scale)\b/i], allies: ['coding', 'system'] },
  { id: 'coding', label: 'CODING', patterns: [/\b(code|program|script|function|bug|debug|compile|python|javascript|typescript|react|css|html|sql)\b/i], allies: ['engineering'] },
  { id: 'design', label: 'DESIGN', patterns: [/\b(design|ui|ux|layout|color|font|brand|logo|wireframe|mockup)\b/i], allies: ['research'] },
  { id: 'finance', label: 'FINANCE', patterns: [/\b(money|budget|price|cost|invest|stock|crypto|tax|invoice|salary|spend)\b/i], allies: ['research', 'web'] },
  { id: 'communication', label: 'COMMS', patterns: [/\b(email|draft|message|write|reply|summar\w* (this|the)|letter|report)\b/i], allies: ['research'] },
  { id: 'calendar', label: 'CALENDAR', patterns: [/\b(calendar|schedule|tomorrow|meeting|appointment|next week|this week|free time|busy)\b/i, /\bwhat do i have\b/i], allies: ['memory'] },
  { id: 'files', label: 'FILES', patterns: [/\b(file|document|pdf|folder|open my|show my|screenshot|image|photo)\b/i], allies: ['research'] },
  { id: 'web', label: 'WEB', patterns: [/\b(search|google|look up|find (online|on the internet)|news|latest|website|url|browse)\b/i], allies: ['research'] },
  { id: 'system', label: 'SYSTEM', patterns: [/\b(system|cpu|memory usage|battery|network status|diagnostic|health|performance|uptime)\b/i], allies: ['engineering'] },
  { id: 'automation', label: 'AUTOMATION', patterns: [/\b(automat|script that|cron|schedul\w* task|workflow|repeti\w+)\b/i], allies: ['coding', 'engineering'] },
];

/** Agents currently active for visualization + routing. */
export interface ActiveAgents {
  primary: AgentId[];
  support: AgentId[];
}

const ALWAYS_ON: AgentId[] = ['memory'];

/**
 * Select which agents a request should activate. Returns primary agents
 * (directly involved) and support agents (allies that lend context).
 * Pure function — unit-testable.
 */
export function selectAgents(text: string): ActiveAgents {
  const primary: AgentId[] = [];
  for (const node of AGENT_NODES) {
    if (node.patterns.some(p => p.test(text))) primary.push(node.id);
  }
  const support = new Set<AgentId>();
  for (const id of primary) {
    const node = AGENT_NODES.find(n => n.id === id);
    if (!node) continue;
    for (const ally of node.allies) {
      if (!primary.includes(ally)) support.add(ally);
    }
  }
  for (const id of ALWAYS_ON) {
    if (!primary.includes(id) && !support.has(id)) support.add(id);
  }
  return { primary, support: [...support] };
}

export function agentLabel(id: AgentId): string {
  return AGENT_NODES.find(n => n.id === id)?.label ?? id.toUpperCase();
}
