import { NextResponse } from 'next/server';
import { executeMeshQuery, getMeshInfo } from '@/lib/agent-mesh';
import { addMemory, addCommand } from '@/lib/memory';

export async function POST(request: Request) {
  try {
    const { message, conversation, apiKey: clientApiKey } = await request.json();

    const apiKey = clientApiKey || process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;

    if (!apiKey) {
      const response = generateLocalResponse(message);
      return NextResponse.json({
        response,
        intent: 'general',
        modelsUsed: ['local-fallback'],
        strategy: 'local',
        confidence: 0.5,
      });
    }

    // ── Route through the spider-web mesh with RAG + Memory ─────
    const meshResult = await executeMeshQuery({
      apiKey,
      message,
      conversation: conversation.map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      })),
      useKnowledge: true,
      useMemory: true,
    });

    // ── Record in memory system ─────────────────────────────────
    addMemory({
      type: 'conversation',
      content: `User: "${message.substring(0, 200)}" → Intent: ${meshResult.intent}, Strategy: ${meshResult.strategy}, Models: ${meshResult.modelsUsed.join(', ')}`,
      tags: [meshResult.intent, meshResult.strategy, ...meshResult.knowledgeUsed || []],
      importance: meshResult.strategy === 'triple' ? 7 : meshResult.strategy === 'dual' ? 5 : 3,
      context: meshResult.response.substring(0, 300),
    });

    // Record extracted commands
    if (meshResult.commands && meshResult.commands.length > 0) {
      for (const cmd of meshResult.commands.slice(0, 5)) {
        addCommand({
          command: cmd,
          tool: detectTool(cmd),
          purpose: `Auto-detected from ${meshResult.intent} response`,
          outcome: 'partial',
          tags: [meshResult.intent],
          notes: 'Planned by AI, awaiting execution',
        });
      }
    }

    return NextResponse.json({
      response: meshResult.response,
      intent: meshResult.intent,
      modelsUsed: meshResult.modelsUsed,
      strategy: meshResult.strategy,
      confidence: meshResult.confidence,
      commands: meshResult.commands || [],
      knowledgeUsed: meshResult.knowledgeUsed || [],
    });

  } catch (error) {
    console.error('[JARVIS API] Error:', error);
    return NextResponse.json(
      {
        response: 'Neural core is temporarily unavailable. Please try again, sir.',
        error: String(error),
        intent: 'general',
        modelsUsed: [],
        strategy: 'error',
        confidence: 0,
      },
      { status: 500 }
    );
  }
}

// ── Mesh status endpoint ─────────────────────────────────────
export async function GET() {
  const info = getMeshInfo();
  return NextResponse.json({
    status: 'online',
    ...info,
  });
}

function detectTool(cmd: string): string {
  const lower = cmd.toLowerCase();
  if (lower.includes('nmap')) return 'nmap';
  if (lower.includes('sqlmap')) return 'sqlmap';
  if (lower.includes('hydra')) return 'hydra';
  if (lower.includes('hashcat')) return 'hashcat';
  if (lower.includes('john')) return 'john-the-ripper';
  if (lower.includes('metasploit') || lower.includes('msf')) return 'metasploit';
  if (lower.includes('aircrack') || lower.includes('airodump') || lower.includes('aireplay')) return 'aircrack-ng';
  if (lower.includes('burp')) return 'burp-suite';
  if (lower.includes('bettercap')) return 'bettercap';
  if (lower.includes('wireshark') || lower.includes('tcpdump')) return 'wireshark';
  if (lower.includes('python')) return 'python';
  if (lower.includes('curl')) return 'curl';
  if (lower.includes('ping')) return 'ping';
  return 'shell';
}

function generateLocalResponse(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    return `${greeting}, sir. All systems are online and ready. How may I assist you today?`;
  }

  if (lower.includes('how are you')) {
    return 'All systems functioning at optimal capacity, sir. Thank you for asking. How can I help you today?';
  }

  if (lower.includes('your name') || lower.includes('who are you')) {
    return 'I am JARVIS — Just A Rather Very Intelligent System. Your personal AI assistant, powered by a mesh of neural networks, at your service.';
  }

  if (lower.includes('what can you do') || lower.includes('help')) {
    return `I can assist you with:\n\n- **Information**: Time, date, weather, calculations, general questions\n- **Web**: Search Google, YouTube, Wikipedia; open websites\n- **Productivity**: Create notes, set timers, create reminders\n- **AI**: Answer questions, write code, summarize text, explain concepts\n- **Security**: Ethical hacking knowledge, penetration testing guidance\n- **Voice**: Speak to me using the voice button\n- **System**: Toggle themes, adjust settings\n\n*Configure my OpenRouter API key in Settings to unlock my full neural mesh — 15+ AI models working together for you.*\n\nWhat would you like to do?`;
  }

  if (lower.includes('time')) {
    return `The current time is ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}, sir.`;
  }

  if (lower.includes('date') || lower.includes('today')) {
    return `Today is ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.`;
  }

  if (lower.includes('mesh') || lower.includes('model') || lower.includes('agent')) {
    const info = getMeshInfo();
    const providerList = info.providers.join(', ');
    return `The neural mesh is currently **offline** (no API key configured).\n\nMesh configuration:\n- **Total models**: ${info.totalModels}\n- **Providers**: ${providerList}\n- **Connections**: ${info.totalConnections} node-to-node links\n- **Knowledge base**: ${info.knowledgeBase.totalEntries} entries, ${info.knowledgeBase.totalCommands} commands\n\nTo activate the full mesh, set your OpenRouter API key in **Settings**.`;
  }

  return `I understand your request: *"${message}"*\n\nI'm currently running in **local mode** — the neural mesh is offline. To unlock my full capabilities, set your OpenRouter API key.\n\nIn the meantime, I can still help with:\n- Time and date queries\n- Setting timers and reminders\n- Creating and managing notes\n- Basic calculations\n\nWhat would you like to do?`;
}
