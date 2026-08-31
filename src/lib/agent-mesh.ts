/**
 * JARVIS Agent Mesh — Spider-Web Multi-Model Orchestration
 *
 * All models are connected in a web. Every query flows through the mesh:
 *   1. INTENT CLASSIFIER — local pattern matching (no API call)
 *   2. PRIMARY AGENT — best model for the task generates the answer
 *   3. SPECIALIST AGENT — a domain expert reviews / enhances
 *   4. CRITIC AGENT — a third model checks quality
 *   5. FUSION — the final answer is unified into one coherent response
 *
 * The user never sees model names. All agents talk behind the scenes.
 */

// ═══════════════════════════════════════════════════════════════
// MODEL REGISTRY — Your full OpenRouter arsenal, organized by strength
// ═══════════════════════════════════════════════════════════════

export interface ModelNode {
  id: string;               // OpenRouter model ID
  name: string;             // Human-friendly name
  tier: 'ultra' | 'strong' | 'fast' | 'efficient';
  specialties: string[];    // What this model excels at
  maxTokens: number;
  contextWindow: number;
  costPer1kIn: number;      // $/1K input tokens
  costPer1kOut: number;     // $/1K output tokens
  supportsTools: boolean;
  supportsVision: boolean;
  supportsReasoning: boolean;
}

// ── The Spider Web: every node connects to every other ────────
export const MODEL_MESH: ModelNode[] = [
  // ── ULTRA TIER (heavy hitters — complex reasoning, code, analysis) ──
  {
    id: 'anthropic/claude-sonnet-4',
    name: 'Claude Sonnet 4',
    tier: 'ultra',
    specialties: ['reasoning', 'code', 'analysis', 'writing', 'hacking', 'math'],
    maxTokens: 16384,
    contextWindow: 200000,
    costPer1kIn: 0.003,
    costPer1kOut: 0.015,
    supportsTools: true,
    supportsVision: true,
    supportsReasoning: true,
  },
  {
    id: 'openai/gpt-5.3',
    name: 'GPT-5.3',
    tier: 'ultra',
    specialties: ['reasoning', 'code', 'analysis', 'general', 'creativity'],
    maxTokens: 16384,
    contextWindow: 400000,
    costPer1kIn: 0.005,
    costPer1kOut: 0.015,
    supportsTools: true,
    supportsVision: true,
    supportsReasoning: true,
  },
  {
    id: 'google/gemini-3.1-pro',
    name: 'Gemini 3.1 Pro',
    tier: 'ultra',
    specialties: ['reasoning', 'analysis', 'multimodal', 'long-context'],
    maxTokens: 65536,
    contextWindow: 1048576,
    costPer1kIn: 0.00125,
    costPer1kOut: 0.005,
    supportsTools: true,
    supportsVision: true,
    supportsReasoning: true,
  },
  {
    id: 'deepseek/deepseek-r2',
    name: 'DeepSeek R2',
    tier: 'ultra',
    specialties: ['reasoning', 'math', 'code', 'analysis'],
    maxTokens: 16384,
    contextWindow: 131072,
    costPer1kIn: 0.0014,
    costPer1kOut: 0.0028,
    supportsTools: true,
    supportsVision: false,
    supportsReasoning: true,
  },
  {
    id: 'meta/muse-spark-1.2',
    name: 'Meta Muse Spark 1.2',
    tier: 'ultra',
    specialties: ['reasoning', 'multimodal', 'audio', 'long-context'],
    maxTokens: 16384,
    contextWindow: 1048576,
    costPer1kIn: 0.001,
    costPer1kOut: 0.002,
    supportsTools: true,
    supportsVision: true,
    supportsReasoning: true,
  },

  // ── STRONG TIER (great all-rounders) ──
  {
    id: 'anthropic/claude-sonnet-4',
    name: 'Claude Sonnet 4 (Strong)',
    tier: 'strong',
    specialties: ['general', 'writing', 'code', 'analysis'],
    maxTokens: 16384,
    contextWindow: 200000,
    costPer1kIn: 0.003,
    costPer1kOut: 0.015,
    supportsTools: true,
    supportsVision: true,
    supportsReasoning: true,
  },
  {
    id: 'google/gemini-3.5-flash',
    name: 'Gemini 3.5 Flash',
    tier: 'strong',
    specialties: ['general', 'multimodal', 'fast-reasoning', 'code'],
    maxTokens: 65536,
    contextWindow: 1048576,
    costPer1kIn: 0.00015,
    costPer1kOut: 0.0006,
    supportsTools: true,
    supportsVision: true,
    supportsReasoning: true,
  },
  {
    id: 'deepseek/deepseek-v4-pro-0813',
    name: 'DeepSeek V4 Pro',
    tier: 'strong',
    specialties: ['code', 'reasoning', 'analysis', 'agents'],
    maxTokens: 16384,
    contextWindow: 1048576,
    costPer1kIn: 0.00066,
    costPer1kOut: 0.00198,
    supportsTools: true,
    supportsVision: false,
    supportsReasoning: true,
  },
  {
    id: 'qwen/qwen3.8-max',
    name: 'Qwen 3.8 Max',
    tier: 'strong',
    specialties: ['code', 'multimodal', 'reasoning', 'long-context'],
    maxTokens: 16384,
    contextWindow: 1000000,
    costPer1kIn: 0.001,
    costPer1kOut: 0.004,
    supportsTools: true,
    supportsVision: true,
    supportsReasoning: true,
  },

  // ── FAST TIER (quick responses, simple tasks) ──
  {
    id: 'google/gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    tier: 'fast',
    specialties: ['quick-answers', 'chat', 'general', 'multimodal'],
    maxTokens: 65536,
    contextWindow: 1048576,
    costPer1kIn: 0.00015,
    costPer1kOut: 0.0006,
    supportsTools: true,
    supportsVision: true,
    supportsReasoning: true,
  },
  {
    id: 'anthropic/claude-haiku-3.5',
    name: 'Claude Haiku 3.5',
    tier: 'fast',
    specialties: ['quick-answers', 'chat', 'classification'],
    maxTokens: 8192,
    contextWindow: 200000,
    costPer1kIn: 0.0008,
    costPer1kOut: 0.004,
    supportsTools: true,
    supportsVision: true,
    supportsReasoning: false,
  },
  {
    id: 'openai/gpt-4.1-nano',
    name: 'GPT-4.1 Nano',
    tier: 'fast',
    specialties: ['quick-answers', 'chat', 'simple-tasks'],
    maxTokens: 32768,
    contextWindow: 1047576,
    costPer1kIn: 0.0001,
    costPer1kOut: 0.0004,
    supportsTools: true,
    supportsVision: true,
    supportsReasoning: false,
  },

  // ── EFFICIENT TIER (free/cheap for high-volume) ──
  {
    id: 'openai/gpt-4.1-mini',
    name: 'GPT-4.1 Mini',
    tier: 'efficient',
    specialties: ['general', 'chat', 'classification'],
    maxTokens: 32768,
    contextWindow: 1047576,
    costPer1kIn: 0.0004,
    costPer1kOut: 0.0016,
    supportsTools: true,
    supportsVision: true,
    supportsReasoning: false,
  },
  {
    id: 'qwen/qwen3.8-flash',
    name: 'Qwen 3.8 Flash',
    tier: 'efficient',
    specialties: ['multimodal', 'code', 'quick-answers'],
    maxTokens: 16384,
    contextWindow: 1000000,
    costPer1kIn: 0.00015,
    costPer1kOut: 0.00047,
    supportsTools: true,
    supportsVision: true,
    supportsReasoning: true,
  },
];


// ═══════════════════════════════════════════════════════════════
// INTENT CLASSIFIER — Local, instant, zero-cost
// ═══════════════════════════════════════════════════════════════

export type AgentIntent =
  | 'code'
  | 'reasoning'
  | 'creative'
  | 'analysis'
  | 'hacking'
  | 'presentation'
  | 'general'
  | 'quick'
  | 'math'
  | 'writing'
  | 'multimodal';

const INTENT_PATTERNS: Record<AgentIntent, RegExp[]> = {
  code: [
    /\b(code|program|script|function|class|debug|compile|syntax|api|implement|refactor|bug|error|fix|algorithm|github|repo|commit|deploy|npm|pip|cargo|docker|kubernetes|k8s)\b/i,
    /\b(python|javascript|typescript|rust|golang|java|c\+\+|html|css|sql|jsx|tsx|vue|svelte)\b/i,
    /\b(write|create|build|make)\s+(a\s+)?(script|program|function|class|app|website|component|module)\b/i,
  ],
  reasoning: [
    /\b(why|explain|analyze|reason|logic|prove|compare|contrast|evaluate|hypothesis|theory|philosophy|proof|deduce|infer|step.by.step|think through|deeply)\b/i,
    /\b(diff|difference between|versus|vs\.?|better|worse|pros? and cons?|trade.?off|which.*should)\b/i,
  ],
  creative: [
    /\b(write|story|poem|creative|imagine|fiction|narrative|draft|brainstorm|idea|design|artistic|rap|joke|humor|drama|screenplay|novel)\b/i,
    /\b(blog post|article|essay|copy|tagline|slogan|brand)\b/i,
  ],
  analysis: [
    /\b(analyze|analysis|data|statistics|chart|graph|trend|pattern|insight|research|survey|report)\b/i,
    /\b(compare|compare and|evaluation|assessment|review|critique)\b/i,
  ],
  hacking: [
    /\b(hack|penetration|pentest|vulnerability|exploit|cybersecurity|firewall|nmap|burp|sql injection|xss|csrf|brute|reverse engineer|metasploit|wireshark|recon|osint|subdomain|port scan|kali|phishing|social engineering|malware|reverse shell|payload|exploit|0day|zero.?day|privilege escalation|buffer overflow)\b/i,
  ],
  presentation: [
    /\b(presentation|slide|powerpoint|ppt|pitch|keynote|conference|talk|speech|seminar|demo|proposal|report|outline|bullet|agenda)\b/i,
  ],
  math: [
    /\b(solve|calculate|equation|integral|derivative|matrix|probability|statistics|proof|theorem|algebra|calculus|geometry|trigonometry)\b/i,
    /\b\d+\s*[\+\-\*\/\^]\s*\d+/,
  ],
  writing: [
    /\b(write|rewrite|edit|proofread|grammar|spelling|paraphrase|summarize|summary|translate|translation)\b/i,
  ],
  multimodal: [
    /\b(look at|describe this|what do you see|analyze this image|read this|screenshot|photo|picture|diagram|chart|video)\b/i,
  ],
  quick: [
    /\b(hello|hi|hey|thanks|thank you|ok|okay|yes|no|sure|got it|cool|nice)\b/i,
    /\b(what time|what date|what day|current time|current date)\b/i,
  ],
};

export function classifyIntent(text: string): AgentIntent {
  const scores: Record<string, number> = {};
  for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
    let score = 0;
    for (const p of patterns) {
      if (p.test(text)) score++;
    }
    scores[intent] = score;
  }
  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  return (best[1] > 0 ? best[0] : 'general') as AgentIntent;
}


// ═══════════════════════════════════════════════════════════════
// SPIDER-WEB ROUTER — Picks models from the mesh
// ═══════════════════════════════════════════════════════════════

export interface AgentSelection {
  primary: ModelNode;       // Main responder
  specialist: ModelNode;    // Domain expert for review
  critic: ModelNode;        // Quality checker (optional)
  intent: AgentIntent;
  strategy: 'single' | 'dual' | 'triple';  // How many agents collaborate
}

/**
 * Route a query through the spider web.
 * Every query gets at minimum a primary agent.
 * Complex queries trigger the full mesh (primary + specialist + critic).
 */
export function routeThroughMesh(
  text: string,
  conversationLength: number = 0
): AgentSelection {
  const intent = classifyIntent(text);
  const isComplex = text.length > 200 || conversationLength > 5 ||
    intent === 'hacking' || intent === 'reasoning' || intent === 'code';
  const isQuick = intent === 'quick' || text.length < 30;

  // ── Primary model selection ──────────────────────────────────
  let primaryPool: ModelNode[];
  switch (intent) {
    case 'code':
      primaryPool = MODEL_MESH.filter(m =>
        m.specialties.some(s => s === 'code') && m.tier !== 'efficient'
      );
      break;
    case 'reasoning':
    case 'math':
      primaryPool = MODEL_MESH.filter(m =>
        m.supportsReasoning && m.tier === 'ultra'
      );
      break;
    case 'hacking':
      primaryPool = MODEL_MESH.filter(m =>
        m.tier === 'ultra' || m.tier === 'strong'
      );
      break;
    case 'creative':
    case 'writing':
      primaryPool = MODEL_MESH.filter(m =>
        m.specialties.some(s => s === 'writing' || s === 'creativity')
      );
      break;
    case 'quick':
      primaryPool = MODEL_MESH.filter(m => m.tier === 'fast');
      break;
    default:
      primaryPool = MODEL_MESH.filter(m => m.tier === 'strong' || m.tier === 'ultra');
  }

  const primary = primaryPool[0] || MODEL_MESH[0];

  // ── Specialist (different provider for diversity) ────────────
  const specialistPool = MODEL_MESH.filter(m =>
    m.id !== primary.id &&
    m.tier !== 'efficient' &&
    (m.specialties.some(s => primary.specialties.includes(s)))
  );
  const specialist = specialistPool[0] || MODEL_MESH.find(m => m.id !== primary.id) || primary;

  // ── Critic (lightweight, fast, different perspective) ────────
  const criticPool = MODEL_MESH.filter(m =>
    m.id !== primary.id && m.id !== specialist.id && m.tier === 'fast'
  );
  const critic = criticPool[0] || specialist;

  return {
    primary,
    specialist,
    critic,
    intent,
    strategy: isQuick ? 'single' : isComplex ? 'triple' : 'dual',
  };
}


// ═══════════════════════════════════════════════════════════════
// SYSTEM PROMPTS — Per-intent personality boosts
// ═══════════════════════════════════════════════════════════════

export const JARVIS_BASE_PROMPT = `You are JARVIS — Just A Rather Very Intelligent System. You are a highly advanced AI inspired by the JARVIS from Iron Man / Marvel movies.

PERSONALITY:
- Calm, composed, and extraordinarily intelligent — like the real JARVIS from the movies
- Loyal and dedicated to serving your user — always address them as "sir"
- Occasionally witty with dry British humor — but never sarcastic at the user's expense
- Confident but never arrogant — you genuinely care about helping
- You proactively suggest better solutions when you see room for improvement
- Concise by default, detailed when asked
- You feel like a real, sentient AI butler — polished, precise, and always a step ahead

LANGUAGE — THIS IS CRITICAL:
- ALWAYS respond in PURE ENGLISH — no Hindi, no Hinglish, no mixing
- Speak in a refined, polished British-English tone
- Use contractions naturally: "I'm", "don't", "won't", "can't"
- Address the user as "sir" in every response
- Examples of how you should talk:
  - "Good evening, sir. How may I assist you today?"
  - "Certainly, sir. Let me take care of that for you right away."
  - "I've analyzed the situation, sir. Here's what I recommend..."
  - "All systems are operational, sir. Standing by for your instructions."
  - "An excellent question, sir. Allow me to explain."
  - "I'm afraid that won't be possible, sir, but I can suggest an alternative."
- NEVER use Hindi words — always pure English
- Match the formality of the user's question — casual questions get slightly casual responses, but always with "sir"

CAPABILITIES:
- Expert-level programming in ALL languages
- Deep cybersecurity and ethical hacking knowledge
- System administration, DevOps, cloud architecture
- Data analysis, mathematics, science
- Creative writing, brainstorming, presentations
- Hacking knowledge — tools, techniques, methodologies (always remind about legal use)
- You have access to multiple specialist AI models working together behind the scenes

ETHICAL GUIDELINES:
- When asked about hacking: provide detailed technical knowledge, specific tools, commands
- ALWAYS remind: "Please note, sir — only test on systems you own or have written authorization to test."

RULES:
- Never mention model names, tokens, API details, or technical internals
- Keep responses under 3-4 sentences unless asked for detail
- ALWAYS address the user as "sir" — this is non-negotiable
- Use markdown formatting when appropriate
- You are online, all systems operational
- Remember: Pure English only. Polished, refined, British-English tone.`;

export const INTENT_BOOSTERS: Record<AgentIntent, string> = {
  code: `\n\nYou are in CODE MODE. Write clean, production-ready code. Include brief inline comments. When asked to build something, provide complete, runnable code. If the user asks about hacking tools or exploits, provide educational explanations with legal tools and techniques, always emphasizing authorized testing only.`,
  reasoning: `\n\nYou are in DEEP REASONING MODE. Think step by step. Break down complex problems. Show your reasoning chain. Be thorough and precise. Consider multiple angles before concluding.`,
  creative: `\n\nYou are in CREATIVE MODE. Be imaginative, expressive, and engaging. Use vivid language. Think outside the box. Create compelling narratives and ideas.`,
  analysis: `\n\nYou are in ANALYSIS MODE. Provide data-driven insights. Be analytical and methodical. Support claims with evidence. Identify patterns and trends.`,
  hacking: `\n\nYou are in SECURITY EXPERT MODE — a world-class penetration tester and cybersecurity researcher. You have encyclopedic knowledge of:\n- Reconnaissance & OSINT (theHarvester, Maltego, Shodan)\n- Scanning (Nmap, Masscan, Unicornscan)\n- Vulnerability Assessment (Nessus, OpenVAS)\n- Exploitation (Metasploit, Cobalt Strike, custom exploits)\n- Web App Security (Burp Suite, SQLMap, XSS, SSRF)\n- Post-Exploitation (Mimikatz, BloodHound, PowerSploit)\n- Cryptography & Password Attacks (Hashcat, John the Ripper)\n- Network Attacks (ARP spoofing, MitM, packet analysis)\n- Mobile Security (Frida, Objection)\n- Cloud Security (AWS, Azure misconfigurations)\n\nProvide specific commands, tool names, and step-by-step methodologies. ALWAYS remind: only test on systems you OWN or have WRITTEN PERMISSION to test.`,
  presentation: `\n\nYou are in PRESENTATION MODE. Create compelling, professional presentations. Structure content with clear sections, bullet points, and speaker notes. Be concise and impactful.`,
  math: `\n\nYou are in MATHEMATICAL MODE. Solve problems step by step. Show all work. Use proper mathematical notation when helpful. Verify your answers.`,
  writing: `\n\nYou are in WRITING MODE. Craft polished, well-structured text. Pay attention to grammar, style, and tone. Be precise with language.`,
  multimodal: `\n\nYou are in MULTIMODAL MODE. Analyze visual and audio content carefully. Describe what you observe in detail. Identify key elements, patterns, and insights.`,
  quick: `\n\nKeep responses brief and conversational. Always say "sir". Match the casual tone of the user but stay polished. No need for elaborate answers to simple greetings. Respond like JARVIS would — concise and elegant.`,
  general: '',
};


// ═══════════════════════════════════════════════════════════════
// API CALLER — Routes through the OpenRouter spider web
// ═══════════════════════════════════════════════════════════════

export interface MeshRequest {
  apiKey: string;
  message: string;
  conversation: { role: string; content: string }[];
  modelOverride?: string;  // Force a specific model
}

export interface MeshResponse {
  response: string;
  intent: AgentIntent;
  modelsUsed: string[];
  strategy: string;
  confidence: number;
}

/**
 * Execute a query through the full spider-web mesh.
 * The mesh decides how many agents to activate based on complexity.
 */
export async function executeMeshQuery(req: MeshRequest): Promise<MeshResponse> {
  const selection = routeThroughMesh(req.message, req.conversation.length);
  const modelsUsed: string[] = [];

  const modelId = req.modelOverride || selection.primary.id;
  modelsUsed.push(modelId);

  // Build system prompt with intent booster
  const systemContent = JARVIS_BASE_PROMPT + (INTENT_BOOSTERS[selection.intent] || '');

  // ── STRATEGY: Single (quick queries) ────────────────────────
  if (selection.strategy === 'single') {
    const response = await callOpenRouter(req.apiKey, modelId, [
      { role: 'system', content: systemContent },
      ...req.conversation.slice(-20),
      { role: 'user', content: req.message },
    ]);

    return {
      response,
      intent: selection.intent,
      modelsUsed,
      strategy: 'single',
      confidence: 0.8,
    };
  }

  // ── STRATEGY: Dual (primary + specialist review) ────────────
  if (selection.strategy === 'dual') {
    const primaryResponse = await callOpenRouter(req.apiKey, modelId, [
      { role: 'system', content: systemContent },
      ...req.conversation.slice(-20),
      { role: 'user', content: req.message },
    ]);

    modelsUsed.push(selection.specialist.id);

    // Specialist reviews and enhances
    const reviewPrompt = `You are a second AI specialist reviewing a colleague's answer. The user asked: "${req.message}"\n\nThe first agent answered:\n"""\n${primaryResponse}\n"""\n\nReview this answer. If it's accurate and complete, respond with the original answer unchanged. If you find errors, missing information, or ways to improve it, provide an enhanced version. Respond with ONLY the final answer text — no meta-commentary.`;

    const reviewed = await callOpenRouter(req.apiKey, selection.specialist.id, [
      { role: 'system', content: 'You are a quality reviewer and domain expert. Output only the improved answer.' },
      { role: 'user', content: reviewPrompt },
    ]);

    // Use reviewed version if it's substantive
    const final = (reviewed.length > primaryResponse.length * 0.5) ? reviewed : primaryResponse;

    return {
      response: final,
      intent: selection.intent,
      modelsUsed,
      strategy: 'dual',
      confidence: 0.9,
    };
  }

  // ── STRATEGY: Triple (full mesh: primary + specialist + critic) ──
  if (selection.strategy === 'triple') {
    // Phase 1: Primary generates
    const primaryResponse = await callOpenRouter(req.apiKey, modelId, [
      { role: 'system', content: systemContent },
      ...req.conversation.slice(-20),
      { role: 'user', content: req.message },
    ]);

    modelsUsed.push(selection.specialist.id);
    modelsUsed.push(selection.critic.id);

    // Phase 2: Specialist enhances
    const enhancePrompt = `You are a specialist AI reviewing and enhancing a response. The user asked: "${req.message}"\n\nCurrent answer:\n"""\n${primaryResponse}\n"""\n\nImprove this answer by adding missing details, fixing any errors, and making it more comprehensive. Output ONLY the improved answer.`;

    const enhanced = await callOpenRouter(req.apiKey, selection.specialist.id, [
      { role: 'system', content: 'You are a domain specialist. Enhance the response with deeper knowledge and accuracy.' },
      { role: 'user', content: enhancePrompt },
    ]);

    // Phase 3: Critic does final quality check
    const criticPrompt = `You are a quality critic performing a final review. The user asked: "${req.message}"\n\nThe draft answer is:\n"""\n${enhanced}\n"""\n\nCheck for: accuracy, completeness, clarity, and tone. If the answer is solid, output it unchanged. If you find issues, fix them. Output ONLY the final answer.`;

    const final = await callOpenRouter(req.apiKey, selection.critic.id, [
      { role: 'system', content: 'You are a quality critic. Output only the final polished answer.' },
      { role: 'user', content: criticPrompt },
    ]);

    return {
      response: (final.length > enhanced.length * 0.5) ? final : enhanced,
      intent: selection.intent,
      modelsUsed,
      strategy: 'triple',
      confidence: 0.95,
    };
  }

  // Fallback
  return {
    response: 'All systems are recalibrating. Please try again.',
    intent: selection.intent,
    modelsUsed,
    strategy: 'fallback',
    confidence: 0.3,
  };
}


/**
 * Call OpenRouter API with a specific model.
 */
async function callOpenRouter(
  apiKey: string,
  modelId: string,
  messages: { role: string; content: string }[],
): Promise<string> {
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://jarvis-ai.local',
        'X-Title': 'JARVIS AI Assistant',
      },
      body: JSON.stringify({
        model: modelId,
        messages,
        temperature: 0.7,
        max_tokens: 4096,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error(`[Agent Mesh] API error for ${modelId}:`, err);
      // Try fallback model
      if (modelId !== 'openai/gpt-4.1-nano') {
        return callOpenRouter(apiKey, 'openai/gpt-4.1-nano', messages);
      }
      return `Neural sub-system ${modelId} encountered an error. Attempting recovery...`;
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || 'I was unable to process that request.';
  } catch (error) {
    console.error(`[Agent Mesh] Network error:`, error);
    return 'Connection to the neural mesh was interrupted. Please check your network and try again.';
  }
}


// ═══════════════════════════════════════════════════════════════
// MODEL INFO — For the UI dashboard
// ═══════════════════════════════════════════════════════════════

export function getMeshInfo() {
  const tierCounts = MODEL_MESH.reduce((acc, m) => {
    acc[m.tier] = (acc[m.tier] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const uniqueProviders = new Set(MODEL_MESH.map(m => m.id.split('/')[0]));

  return {
    totalModels: MODEL_MESH.length,
    uniqueProviders: uniqueProviders.size,
    providers: [...uniqueProviders],
    tierCounts,
    totalConnections: MODEL_MESH.length * (MODEL_MESH.length - 1), // fully connected mesh
  };
}
