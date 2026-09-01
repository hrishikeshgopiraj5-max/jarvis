'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { sendChatMessage } from '@/lib/ai';
import AutoRecon from '@/components/AutoRecon';
import HardwareDesigner from '@/components/HardwareDesigner';
import BootSequence from '@/components/BootSequence';
import WireframeGlobe from '@/components/WireframeGlobe';

// ═══════════════════════════════════════════════════════════════
// JARVIS v3 — IRON MAN HUD INTERFACE
// ═══════════════════════════════════════════════════════════════

type OrbMode = 'idle' | 'listening' | 'thinking' | 'speaking' | 'error';
const WAKE_WORDS = ['hey jarvis', 'jarvis', 'hey jervis', 'jervis'];
const MSG_EXPIRY_MS = 15000;

export default function JarvisPage() {
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<OrbMode>('idle');
  const [booting, setBooting] = useState(true);
  const [setupOpen, setSetupOpen] = useState(false);
  const [setupKey, setSetupKey] = useState('');
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [terminalLines, setTerminalLines] = useState<{ type: 'cmd' | 'out' | 'err' | 'info'; text: string }[]>([]);
  const [status, setStatus] = useState('INITIALIZING...');
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [responseTime, setResponseTime] = useState(0);
  const [chatOpen, setChatOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'jarvis'; text: string; time: string }[]>([]);
  const [inputText, setInputText] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);
  const [wakeDetected, setWakeDetected] = useState(false);
  const [error, setError] = useState('');
  const [reconOpen, setReconOpen] = useState(false);
  const [hardwareOpen, setHardwareOpen] = useState(false);
  const [showHUD, setShowHUD] = useState(true);

  const [pcHealth, setPcHealth] = useState({
    cores: 0, memory: '', platform: '', language: '',
    online: true, time: '', date: '', uptime: '',
  });

  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isProcessingRef = useRef(false);
  const wakeModeRef = useRef(false);
  const lastSpokeAtRef = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Boot completed callback ────────────────────────────────
  const handleBootComplete = useCallback(() => setBooting(false), []);

  // ── Safety: force-complete boot after 5 seconds ──────────
  useEffect(() => {
    if (!booting) return;
    const timer = setTimeout(() => setBooting(false), 5000);
    return () => clearTimeout(timer);
  }, [booting]);

  // ── Mounted state (prevents hydration mismatch) ────────────
  useEffect(() => { setMounted(true); }, []);

  // ── Check API key ──────────────────────────────────────────
  useEffect(() => {
    const settings = localStorage.getItem('jarvis_settings');
    const parsed = settings ? JSON.parse(settings) : {};
    if (!parsed.openrouterApiKey) setSetupOpen(true);
  }, []);

  // ── Helpers ────────────────────────────────────────────────
  const now = () => new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  const showError = (msg: string) => { setError(msg); setTimeout(() => setError(''), 5000); };

  // ── PC Health + Clock ──────────────────────────────────────
  useEffect(() => {
    const update = () => {
      const d = new Date();
      setPcHealth({
        cores: navigator.hardwareConcurrency || 0,
        memory: (navigator as any).deviceMemory ? `${(navigator as any).deviceMemory} GB` : 'Unknown',
        platform: navigator.platform || 'Unknown',
        language: navigator.language || 'en-US',
        online: navigator.onLine,
        time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
        date: d.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }),
        uptime: `${Math.floor(performance.now() / 60000)}m ${Math.floor((performance.now() % 60000) / 1000)}s`,
      });
    };
    update();
    const i = setInterval(update, 1000);
    return () => clearInterval(i);
  }, []);

  // ── Keyboard shortcuts ─────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (infoOpen) setInfoOpen(false);
        else if (chatOpen) setChatOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [infoOpen, chatOpen]);

  // ── Speech Synthesis ───────────────────────────────────────
  useEffect(() => {
    if (typeof window !== 'undefined') synthRef.current = window.speechSynthesis;
  }, []);

  const speak = useCallback((text: string) => {
    if (!synthRef.current) return;
    synthRef.current.cancel();
    const clean = text.replace(/[*_`#>\[\]()]/g, '').replace(/\n+/g, '. ');
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = 1.05;
    utterance.pitch = 0.95;
    const voices = synthRef.current.getVoices();
    const maleVoice = voices.find(v => /david|mark|daniel|male|google uk english male/i.test(v.name));
    if (maleVoice) utterance.voice = maleVoice;
    utterance.onstart = () => setMode('speaking');
    utterance.onend = () => {
      lastSpokeAtRef.current = Date.now();
      setMode('idle');
      setStatus('LISTENING...');
      setTimeout(() => startListening(), 1500);
    };
    utterance.onerror = () => {
      lastSpokeAtRef.current = Date.now();
      setMode('idle');
      setStatus('LISTENING...');
      setTimeout(() => startListening(), 1500);
    };
    synthRef.current.speak(utterance);
  }, []);

  // ── Process Message ────────────────────────────────────────
  const processMessage = useCallback(async (text: string) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    wakeModeRef.current = false;
    setMode('thinking');
    setStatus('ANALYZING...');
    setTranscript('');
    setMessages(prev => [...prev, { role: 'user', text, time: now() }]);

    try {
      const result = await sendChatMessage(text, messages.map(m => ({
        role: m.role === 'jarvis' ? 'assistant' : 'user',
        content: m.text,
      })));
      const reply = result.response || result.error || 'Something went wrong, sir.';
      setMessages(prev => [...prev, { role: 'jarvis', text: reply, time: now() }]);
      setResponse(reply);
      setResponseTime(Date.now());
      if ((result as any).commands?.length > 0) {
        setTerminalLines(prev => [
          ...prev,
          { type: 'info', text: `[${new Date().toLocaleTimeString()}] Commands detected:` },
          ...(result as any).commands.map((cmd: string) => ({ type: 'out' as const, text: cmd })),
        ]);
      }
      speak(reply);
    } catch {
      const errorMsg = 'Neural connection interrupted, sir.';
      setMessages(prev => [...prev, { role: 'jarvis', text: errorMsg, time: now() }]);
      setResponse(errorMsg);
      setResponseTime(Date.now());
      showError('Connection failed');
      speak(errorMsg);
    }
    isProcessingRef.current = false;
  }, [messages, speak]);

  // ── Always-On Wake Word Listener ────────────────────────────
  const startListening = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setStatus('VOICE NOT SUPPORTED'); return; }
    if (recognitionRef.current || isProcessingRef.current || mode === 'speaking') return;

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-IN';

    recognition.onresult = (event: any) => {
      if (Date.now() - lastSpokeAtRef.current < 2000) return;
      let finalText = '';
      let interimText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript.toLowerCase().trim();
        if (event.results[i].isFinal) finalText += t;
        else interimText += t;
      }
      if (interimText && !wakeModeRef.current) setTranscript(interimText);
      if (finalText) {
        const hasWakeWord = WAKE_WORDS.some(w => finalText.includes(w));
        if (hasWakeWord && !wakeModeRef.current) {
          setWakeDetected(true);
          wakeModeRef.current = true;
          setMode('listening');
          setStatus('LISTENING...');
          setTranscript('');
          try {
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 880;
            gain.gain.value = 0.08;
            osc.start();
            osc.stop(ctx.currentTime + 0.08);
          } catch {}
          let command = finalText;
          for (const w of WAKE_WORDS) command = command.replace(new RegExp(w, 'gi'), '').trim();
          if (command.length > 3) processMessage(command);
          return;
        }
        if (wakeModeRef.current) {
          wakeModeRef.current = false;
          setWakeDetected(false);
          processMessage(finalText);
        }
      }
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      if (!isProcessingRef.current && mode !== 'speaking') {
        setTimeout(() => startListening(), 300);
      }
    };
    recognition.onerror = (e: any) => {
      recognitionRef.current = null;
      if (e.error !== 'aborted' && e.error !== 'no-speech' && mode !== 'speaking') {
        setTimeout(() => startListening(), 500);
      }
    };
    recognitionRef.current = recognition;
    recognition.start();
    setMode('listening');
    setStatus('LISTENING...');
  }, [processMessage, mode]);

  useEffect(() => {
    if (setupOpen) return;
    const timer = setTimeout(() => startListening(), 1500);
    return () => clearTimeout(timer);
  }, [setupOpen]);

  const handleInputFocus = useCallback(() => {
    if (recognitionRef.current) { recognitionRef.current.abort(); recognitionRef.current = null; }
  }, []);
  const handleInputBlur = useCallback(() => {
    if (!isProcessingRef.current && mode !== 'speaking') setTimeout(() => startListening(), 300);
  }, [mode]);

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isProcessingRef.current) return;
    if (recognitionRef.current) { recognitionRef.current.abort(); recognitionRef.current = null; }
    processMessage(inputText.trim());
    setInputText('');
  };

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // ── Waveform ───────────────────────────────────────────────
  const waveBars = 64;
  const [waveLevels, setWaveLevels] = useState<number[]>(new Array(waveBars).fill(0.03));

  useEffect(() => {
    const interval = setInterval(() => {
      setWaveLevels(prev => prev.map((_, i) => {
        if (mode === 'listening' || mode === 'speaking') {
          return 0.25 + Math.abs(Math.sin(Date.now() / 180 + i * 0.35)) * audioLevel * 0.8;
        }
        return 0.15 + Math.sin(Date.now() / 2000 + i * 0.25) * 0.08;
      }));
    }, 50);
    return () => clearInterval(interval);
  }, [mode, audioLevel]);

  useEffect(() => {
    if (mode === 'listening') {
      const i = setInterval(() => setAudioLevel(0.2 + Math.random() * 0.35), 80);
      return () => clearInterval(i);
    }
  }, [mode]);

  // ── Data stream columns (background — client-only) ─────────
  const [dataColumns, setDataColumns] = useState<Array<{left: string; duration: number; delay: number; chars: string}>>([]);
  useEffect(() => {
    setDataColumns(Array.from({ length: 12 }, (_, i) => ({
      left: `${(i / 12) * 100}%`,
      duration: 15 + Math.random() * 20,
      delay: Math.random() * 10,
      chars: Array.from({ length: 40 }, () =>
        Math.random() > 0.5
          ? String.fromCharCode(0x30 + Math.floor(Math.random() * 10))
          : String.fromCharCode(0x41 + Math.floor(Math.random() * 6))
      ).join(' '),
    })));
  }, []);

  // ── Trending Ideas (no emojis) ─────────────────────────────
  const trendingIdeas = [
    { icon: '+', title: 'Network Recon & Audit', desc: 'Scan your network for open ports, services, and vulnerabilities', tag: 'SECURITY' },
    { icon: '</>', title: 'Build an AI Agent', desc: 'Create a Discord/Telegram bot powered by multiple AI models', tag: 'CODING' },
    { icon: '%', title: 'Deep Research', desc: 'Analyze crypto, stocks, or any topic with AI-powered intelligence', tag: 'ANALYSIS' },
    { icon: '#', title: 'Build a Web App', desc: 'Design and build a complete web application from scratch', tag: 'CREATION' },
    { icon: '~', title: 'Professional Pitch Deck', desc: 'Create a compelling investor pitch deck or business proposal', tag: 'BUSINESS' },
    { icon: '@', title: 'Master Any Subject', desc: 'Learn anything -- from quantum physics to machine learning', tag: 'LEARNING' },
    { icon: '!', title: 'Automate Everything', desc: 'Write scripts to automate repetitive tasks and workflows', tag: 'AUTOMATION' },
    { icon: '*', title: 'Game Development', desc: 'Build a game from concept to playable -- with AI assistance', tag: 'GAMING' },
  ];

  // ── Arc Reactor SVG segments ───────────────────────────────
  const segmentsOuter = Array.from({ length: 12 }, (_, i) => i * 30);
  const segmentsInner = Array.from({ length: 8 }, (_, i) => i * 45);

  if (!mounted) return (
    <div className="fixed inset-0 flex items-center justify-center"
      style={{ background: '#020306' }} />
  );

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-between overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #030508 0%, #040a14 30%, #050c18 60%, #040810 100%)' }}>

      {/* Hex grid background */}
      <div className="hex-grid" />

      {/* Data stream background */}
      <div className="data-stream">
        {dataColumns.map((col, i) => (
          <div key={i} className="data-stream-column"
            style={{ left: col.left, animationDuration: `${col.duration}s`, animationDelay: `${col.delay}s` }}>
            {col.chars}
          </div>
        ))}
      </div>

      {/* Scan lines */}
      <div className="jarvis-scanlines" />

      {/* Mode glow */}
      <div className="mode-glow" data-mode={mode} />

      {/* ═══ IRON MAN BOOT SEQUENCE ═══ */}
      <AnimatePresence>
        {booting && <BootSequence onComplete={handleBootComplete} />}
      </AnimatePresence>

      {/* ═══ API KEY SETUP ═══ */}
      <AnimatePresence>
        {setupOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center"
            style={{ background: 'rgba(2,4,8,0.92)' }}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="hud-panel rounded-lg p-8 max-w-md w-[90vw] text-center relative">
              <div className="corner-line-tl" />
              <div className="corner-line-br" />
              <div className="hud-text-bright mb-6">SYSTEM ACTIVATION REQUIRED</div>
              <div className="hud-text mb-1">STARK INDUSTRIES NEURAL MESH</div>
              <div className="text-[10px] text-slate-500 mb-6" style={{ fontFamily: 'Courier New, monospace' }}>
                Enter your OpenRouter API key to initialize the neural mesh network.
              </div>
              <input type="password" value={setupKey} onChange={e => setSetupKey(e.target.value)}
                placeholder="sk-or-v1-..."
                className="w-full bg-transparent border border-cyan-500/30 rounded px-4 py-3 text-sm text-cyan-100 placeholder-slate-600 focus:border-cyan-400/30 transition-all text-center"
                style={{ fontFamily: 'Courier New, monospace' }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && setupKey.trim()) {
                    localStorage.setItem('jarvis_settings', JSON.stringify({ openrouterApiKey: setupKey.trim() }));
                    setSetupOpen(false);
                  }
                }} autoFocus />
              <button onClick={() => {
                if (setupKey.trim()) {
                  localStorage.setItem('jarvis_settings', JSON.stringify({ openrouterApiKey: setupKey.trim() }));
                  setSetupOpen(false);
                }
              }}
                disabled={!setupKey.trim()}
                className="w-full mt-4 py-3 rounded border border-cyan-500/20 text-cyan-400/80 text-[11px] tracking-[0.2em] hover:bg-cyan-500/5 disabled:opacity-20 transition-all"
                style={{ fontFamily: 'Courier New, monospace' }}>
                INITIALIZE SYSTEM
              </button>
              <div className="text-[9px] text-slate-600 mt-4" style={{ fontFamily: 'Courier New, monospace' }}>
                OBTAIN KEY FROM OPENROUTER.AI
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ ERROR TOAST ═══ */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="absolute top-4 left-1/2 -translate-x-1/2 z-[60] px-4 py-2 hud-panel border-red-500/20 text-red-400/80 text-[10px] tracking-wider"
            style={{ fontFamily: 'Courier New, monospace' }}>
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ TOP HUD BAR ═══ */}
      <div className="relative z-10 w-full flex items-center justify-between px-4 md:px-8 pt-4 md:pt-6">
        {/* Left: JARVIS label */}
        <div className="flex items-center gap-3">
          <div className="hud-text tracking-[0.5em] text-cyan-300">J.A.R.V.I.S.</div>
          <div className="hidden md:block w-12 h-[1px] bg-gradient-to-r from-cyan-500/20 to-transparent" />
        </div>

        {/* Right: Status + Time + Buttons */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* Status dot */}
          <div className={`status-dot ${
            mode === 'listening' ? 'bg-green-400' :
            mode === 'thinking' ? 'bg-amber-400' :
            mode === 'speaking' ? 'bg-cyan-400' :
            'bg-slate-600'
          }`} style={{
            boxShadow: mode === 'listening' ? '0 0 6px rgba(74,222,128,0.5)' :
              mode === 'thinking' ? '0 0 6px rgba(251,191,36,0.5)' :
              mode === 'speaking' ? '0 0 6px rgba(0,200,255,0.5)' : 'none'
          }} />

          {/* Time */}
          <div className="hud-text text-cyan-400/70 text-[10px]">{pcHealth.time}</div>

          {/* Separator */}
          <div className="w-[1px] h-3 bg-cyan-500/10" />

          {/* Auto-Recon */}
          <button onClick={() => setReconOpen(true)}
            className="w-7 h-7 rounded border border-cyan-500/25 flex items-center justify-center text-cyan-400/70 hover:text-cyan-400/60 hover:border-cyan-500/25 transition-all"
            title="Auto-Recon">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" />
              <line x1="12" y1="2" x2="12" y2="6" /><line x1="12" y1="18" x2="12" y2="22" />
              <line x1="2" y1="12" x2="6" y2="12" /><line x1="18" y1="12" x2="22" y2="12" />
            </svg>
          </button>

          {/* Hardware */}
          <button onClick={() => setHardwareOpen(true)}
            className="w-7 h-7 rounded border border-cyan-500/25 flex items-center justify-center text-cyan-400/70 hover:text-cyan-400/60 hover:border-cyan-500/25 transition-all"
            title="Hardware Designer">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
            </svg>
          </button>

          {/* Terminal */}
          <button onClick={() => setTerminalOpen(!terminalOpen)}
            className="w-7 h-7 rounded border border-cyan-500/25 flex items-center justify-center text-cyan-400/70 hover:text-cyan-400/60 hover:border-cyan-500/25 transition-all text-[10px] font-mono"
            title="Terminal">
            {'>'}
          </button>

          {/* Info */}
          <button onClick={() => setInfoOpen(!infoOpen)}
            className="w-7 h-7 rounded border border-cyan-500/25 flex items-center justify-center text-cyan-400/70 hover:text-cyan-400/60 hover:border-cyan-500/25 transition-all text-[10px] font-mono"
            title="System Info">
            i
          </button>
        </div>
      </div>

      {/* ═══ LEFT HUD PANEL ═══ */}
      <div className="hidden lg:block absolute left-6 top-20 z-10 w-48">
        <div className="hud-panel rounded p-3 hud-animate-in" style={{ animationDelay: '0.1s' }}>
          <div className="hud-text mb-2">SYSTEM STATUS</div>
          <div className="space-y-1.5">
            {[
              { label: 'CORE', value: `${pcHealth.cores} THREADS`, ok: pcHealth.cores > 0 },
              { label: 'MEMORY', value: pcHealth.memory, ok: pcHealth.memory !== 'Unknown' },
              { label: 'NETWORK', value: pcHealth.online ? 'ONLINE' : 'OFFLINE', ok: pcHealth.online },
              { label: 'SESSION', value: pcHealth.uptime, ok: true },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between">
                <div className="hud-text text-[8px]">{item.label}</div>
                <div className="flex items-center gap-1.5">
                  <div className={`w-1 h-1 rounded-full ${item.ok ? 'bg-emerald-400' : 'bg-red-400'}`} />
                  <div className="hud-value text-[9px]">{item.value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="hud-panel rounded p-3 mt-2 hud-animate-in" style={{ animationDelay: '0.2s' }}>
          <div className="hud-text mb-2">VOICE INPUT</div>
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${
              mode === 'listening' ? 'bg-green-400' : mode === 'speaking' ? 'bg-cyan-400' : 'bg-slate-600'
            }`} />
            <div className="hud-value text-[9px]">{status}</div>
          </div>
          {transcript && (
            <div className="mt-2 text-[9px] text-cyan-300/40 italic truncate" style={{ fontFamily: 'Courier New, monospace' }}>
              &quot;{transcript}&quot;
            </div>
          )}
        </div>

        <div className="hud-panel rounded p-3 mt-2 hud-animate-in" style={{ animationDelay: '0.3s' }}>
          <div className="hud-text mb-2">NEURAL MESH</div>
          <div className="grid grid-cols-3 gap-1">
            {['GEM', 'CLD', 'GPT', 'DSK', 'MTA', 'QWN'].map(p => (
              <div key={p} className="text-center py-1 border border-cyan-500/20 rounded text-[8px] text-cyan-400/80"
                style={{ fontFamily: 'Courier New, monospace' }}>
                {p}
              </div>
            ))}
          </div>
          <div className="text-[7px] mt-2" style={{ fontFamily: 'Courier New, monospace', color: 'rgba(0,220,255,0.4)' }}>182 NODE LINKS ACTIVE</div>
        </div>
      </div>

      {/* ═══ RIGHT HUD PANEL ═══ */}
      <div className="hidden lg:block absolute right-6 top-20 z-10 w-48">
        <div className="hud-panel rounded p-3 hud-animate-in" style={{ animationDelay: '0.15s' }}>
          <div className="hud-text mb-2">CAPABILITIES</div>
          <div className="space-y-1">
            {[
              { label: 'VOICE RECOGNITION', status: 'ACTIVE' },
              { label: 'KNOWLEDGE BASE', status: '20+ ENTRIES' },
              { label: 'RECON ENGINE', status: 'READY' },
              { label: 'HARDWARE DESIGN', status: 'READY' },
              { label: 'SELF-LEARNING', status: 'RECORDING' },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between">
                <div className="hud-text text-[8px]">{item.label}</div>
                <div className="hud-value text-[8px] text-emerald-400/50">{item.status}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="hud-panel rounded p-3 mt-2 hud-animate-in" style={{ animationDelay: '0.25s' }}>
          <div className="hud-text mb-2">KNOWLEDGE DOMAINS</div>
          <div className="flex flex-wrap gap-1">
            {['RECON', 'WEB SEC', 'EXPLOIT', 'CRYPTO', 'WIRELESS', 'FORENSICS', 'SOCIAL', 'CAD', 'BUG BOUNTY'].map(cat => (
              <span key={cat} className="px-1.5 py-0.5 border border-cyan-500/20 text-[7px] text-cyan-400/70"
                style={{ fontFamily: 'Courier New, monospace' }}>
                {cat}
              </span>
            ))}
          </div>
        </div>

        <div className="hud-panel rounded p-3 mt-2 hud-animate-in" style={{ animationDelay: '0.35s' }}>
          <div className="hud-text mb-2">QUICK COMMANDS</div>
          <div className="space-y-1">
            {['FIND BUG BOUNTY TARGETS', 'SCAN NETWORK', 'BUILD AI AGENT', 'CREATE PITCH DECK'].map(cmd => (
              <button key={cmd}
                onClick={() => { processMessage(cmd.toLowerCase()); }}
                className="block w-full text-left hud-value text-[8px] text-cyan-400/70 hover:text-cyan-400/60 transition-colors py-0.5 truncate">
                &gt; {cmd}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ CENTER ARC REACTOR ═══ */}
      <div className="relative z-10 flex-1 flex items-center justify-center">
        {/* Holographic Globe — behind arc reactor */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <WireframeGlobe size={600} speed={0.6} opacity={0.2} mode={mode} className="hidden md:block" />
          <WireframeGlobe size={380} speed={0.6} opacity={0.15} mode={mode} className="md:hidden" />
        </div>

        <div className="relative">
          {/* Ambient glow behind reactor */}
          <div className="absolute -inset-32 rounded-full pointer-events-none"
            style={{
              background: mode === 'thinking'
                ? 'radial-gradient(circle, rgba(255,180,0,0.1) 0%, transparent 60%)'
                : 'radial-gradient(circle, rgba(0,180,255,0.1) 0%, transparent 60%)',
              transition: 'all 1s ease',
            }} />

          {/* Arc Reactor */}
          <div className="arc-reactor-core" data-mode={mode}>
            {/* Outer dashed ring */}
            <div className="reactor-outer-dashed" />

            {/* Ring 1 — outermost, slow */}
            <div className="reactor-ring reactor-ring-1" />

            {/* Ring 2 — dashed, reverse */}
            <div className="reactor-ring reactor-ring-2" />

            {/* Ring 3 — solid */}
            <div className="reactor-ring reactor-ring-3" />

            {/* Ring 4 — outermost thin */}
            <div className="reactor-ring reactor-ring-4" />

            {/* Segments outer ring */}
            <div className="reactor-segments">
              {segmentsOuter.map((deg, i) => (
                <div key={i} className="reactor-segment" style={{ transform: `rotate(${deg}deg)` }} />
              ))}
            </div>

            {/* Segments inner ring */}
            <div className="reactor-segments-inner">
              {segmentsInner.map((deg, i) => (
                <div key={i} className="reactor-segment-inner" style={{ transform: `rotate(${deg}deg)` }} />
              ))}
            </div>

            {/* Core glow */}
            <div className="arc-core-glow" />

            {/* Orbiting particles */}
            <div className="orbit-particle" />
            <div className="orbit-particle" />
            <div className="orbit-particle" />
          </div>

          {/* HUD crosshair behind reactor */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 hud-crosshair"
            style={{ width: '280px', height: '280px', opacity: 0.3 }} />

          {/* Status label below reactor */}
          <motion.div className="absolute -bottom-12 left-1/2 -translate-x-1/2 whitespace-nowrap"
            animate={{ opacity: mode === 'idle' ? 0.4 : 1 }}>
            <div className={`hud-text-bright tracking-[0.4em] text-[10px] ${
              wakeDetected ? 'text-cyan-300' : 'text-cyan-400/80'
            }`}>
              {status}
            </div>
          </motion.div>

          {/* Response time */}
          {responseTime > 0 && mode === 'speaking' && (
            <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 whitespace-nowrap">
              <div className="hud-text text-[8px] text-cyan-400/60">RESPONSE DELIVERED</div>
            </div>
          )}
        </div>
      </div>

      {/* ═══ TRANSCRIPT / RESPONSE ═══ */}
      <AnimatePresence>
        {transcript && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="absolute bottom-28 md:bottom-32 left-1/2 -translate-x-1/2 max-w-lg px-8">
            <p className="text-[11px] text-cyan-300/40 text-center italic"
              style={{ fontFamily: 'Courier New, monospace' }}>
              &quot;{transcript}&quot;
            </p>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {response && (Date.now() - responseTime < MSG_EXPIRY_MS || mode === 'speaking') && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="absolute bottom-28 md:bottom-32 left-1/2 -translate-x-1/2 max-w-xl px-8">
            <p className="text-[11px] text-slate-400/70 text-center leading-relaxed line-clamp-3"
              style={{ fontFamily: 'Courier New, monospace' }}>
              {response.slice(0, 500)}{response.length > 500 ? '...' : ''}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ BOTTOM WAVEFORM + INPUT ═══ */}
      <div className="relative z-10 w-full pb-4 md:pb-6 px-4 md:px-8">
        {/* Waveform */}
        <div className="flex items-end justify-center gap-[1px] h-8 mb-3 px-12 md:px-24">
          {waveLevels.map((level, i) => {
            const ratio = i / waveBars;
            const isActive = mode === 'listening' || mode === 'speaking';
            const color = isActive
              ? `rgba(0, 220, 255, ${0.35 + level * 0.6})`
              : `rgba(0, 180, 220, ${0.15 + level * 0.25})`;
            return (
              <div key={i} className="wave-bar flex-1 rounded-full"
                style={{
                  height: `${Math.max(2, level * 100)}%`,
                  backgroundColor: color,
                  minWidth: '1px',
                }} />
            );
          })}
        </div>

        {/* Input row */}
        <div className="flex items-center justify-center gap-3">
          {/* Chat toggle */}
          <button onClick={() => setChatOpen(!chatOpen)}
            className="w-10 h-10 rounded border border-cyan-500/25 flex items-center justify-center text-cyan-400/70 hover:text-cyan-400/60 hover:border-cyan-500/25 transition-all">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </button>

          {/* Text input */}
          <form onSubmit={handleTextSubmit} className="flex-1 max-w-md">
            <input ref={inputRef} type="text" value={inputText} onChange={e => setInputText(e.target.value)}
              placeholder="Type a command or say Hey Jarvis..."
              className="w-full bg-transparent border border-cyan-500/25 rounded px-4 py-2.5 text-[11px] text-cyan-100/80 placeholder-slate-600/50 focus:border-cyan-400/25 transition-all"
              style={{ fontFamily: 'Courier New, monospace' }}
              disabled={mode === 'thinking'}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur} />
          </form>

          {/* Listen toggle */}
          <button onClick={() => {
            if (mode === 'listening') {
              if (recognitionRef.current) { recognitionRef.current.abort(); recognitionRef.current = null; }
              setMode('idle'); setStatus('PAUSED');
            } else if (mode === 'idle' || mode === 'error') {
              startListening();
            }
          }}
            title={mode === 'listening' ? 'Pause listening' : 'Start listening'}
            className={`w-10 h-10 rounded flex items-center justify-center transition-all border ${
              mode === 'listening'
                ? 'border-green-500/20 bg-green-500/5 text-green-400/60'
                : mode === 'thinking'
                ? 'border-amber-500/20 bg-amber-500/5 text-amber-400/60'
                : mode === 'speaking'
                ? 'border-cyan-500/20 bg-cyan-500/5 text-cyan-400/60'
                : 'border-cyan-500/25 text-cyan-400/70 hover:border-cyan-500/25 hover:text-cyan-400/50'
            }`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          </button>
        </div>

        {/* Bottom status bar */}
        <div className="flex items-center justify-center gap-4 mt-3">
          <div className="hud-text text-[7px] text-cyan-400/45">J.A.R.V.I.S. v3.0</div>
          <div className="w-[1px] h-2 bg-cyan-500/10" />
          <div className="hud-text text-[7px] text-cyan-400/45">STARK INDUSTRIES</div>
          <div className="w-[1px] h-2 bg-cyan-500/10" />
          <div className="hud-text text-[7px] text-cyan-400/45">NEURAL MESH ACTIVE</div>
        </div>
      </div>

      {/* ═══ INFO PANEL (System Dashboard) ═══ */}
      <AnimatePresence>
        {infoOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center"
            style={{ background: 'rgba(2,4,8,0.85)' }}
            onClick={e => { if (e.target === e.currentTarget) setInfoOpen(false); }}>
            <motion.div initial={{ scale: 0.97, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.97, opacity: 0 }}
              className="hud-panel rounded-lg w-[90vw] max-w-2xl max-h-[80vh] overflow-y-auto relative">
              <div className="corner-line-tl" />
              <div className="corner-line-br" />

              <div className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <div className="hud-text">SYSTEM OVERVIEW</div>
                    <div className="hud-value text-lg text-cyan-100/80 mt-1">J.A.R.V.I.S. Dashboard</div>
                  </div>
                  <button onClick={() => setInfoOpen(false)}
                    className="w-7 h-7 rounded border border-cyan-500/25 flex items-center justify-center text-cyan-400/70 hover:text-cyan-400/60 transition-colors">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>

                {/* Time Display */}
                <div className="hud-panel rounded p-4 mb-4">
                  <div className="hud-value text-3xl text-cyan-100/70 font-light tracking-wider">{pcHealth.time}</div>
                  <div className="hud-text text-[10px] mt-1">{pcHealth.date}</div>
                </div>

                {/* PC Health */}
                <div className="hud-panel rounded p-4 mb-4">
                  <div className="hud-text mb-3">SYSTEM DIAGNOSTICS</div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {[
                      { label: 'CPU CORES', value: pcHealth.cores || '--' },
                      { label: 'MEMORY', value: pcHealth.memory },
                      { label: 'PLATFORM', value: pcHealth.platform },
                      { label: 'LANGUAGE', value: pcHealth.language },
                      { label: 'NETWORK', value: pcHealth.online ? 'ONLINE' : 'OFFLINE' },
                      { label: 'SESSION UPTIME', value: pcHealth.uptime },
                    ].map(item => (
                      <div key={item.label} className="bg-cyan-500/[0.06] border border-cyan-500/15 rounded p-2.5">
                        <div className="text-[8px] mb-1" style={{ fontFamily: 'Courier New, monospace', letterSpacing: '0.1em', color: 'rgba(0,220,255,0.65)' }}>{item.label}</div>
                        <div className="hud-value text-[11px]">{item.value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Neural Mesh */}
                <div className="hud-panel rounded p-4 mb-4">
                  <div className="hud-text mb-3">NEURAL MESH -- 14 MODELS, 6 PROVIDERS</div>
                  <div className="flex flex-wrap gap-2">
                    {['Google', 'Anthropic', 'OpenAI', 'DeepSeek', 'Meta', 'Qwen'].map(p => (
                      <span key={p} className="px-3 py-1 rounded border border-cyan-500/30 text-[10px] text-cyan-400/60"
                        style={{ fontFamily: 'Courier New, monospace' }}>
                        {p}
                      </span>
                    ))}
                  </div>
                  <div className="hud-text text-[8px] mt-2 text-cyan-400/45">182 NODE-TO-NODE CONNECTIONS</div>
                </div>

                {/* What JARVIS Can Do */}
                <div>
                  <div className="hud-text mb-3">CAPABILITIES</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {trendingIdeas.map(idea => (
                      <button key={idea.title}
                        onClick={() => { setInfoOpen(false); processMessage(`Help me with: ${idea.title}`); }}
                        className="hud-panel rounded p-3 text-left hover:border-cyan-500/20 transition-all group">
                        <div className="flex items-start gap-3">
                          <span className="hud-value text-sm text-cyan-400/70 group-hover:text-cyan-400/60 mt-0.5 w-5 text-center">
                            {idea.icon}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="hud-value text-[11px] text-cyan-100/60 group-hover:text-cyan-100/90 transition-colors">
                                {idea.title}
                              </span>
                              <span className="text-[7px] px-1 py-0.5 border border-cyan-500/25 text-cyan-400/65"
                                style={{ fontFamily: 'Courier New, monospace' }}>
                                {idea.tag}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500/60 mt-0.5 leading-relaxed">{idea.desc}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ TERMINAL PANEL ═══ */}
      <AnimatePresence>
        {terminalOpen && (
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute bottom-0 left-0 right-0 h-[40vh] bg-[#04060c]/95 backdrop-blur-xl border-t border-cyan-500/25 flex flex-col z-50">
            <div className="flex items-center justify-between px-4 py-2 border-b border-cyan-500/15">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-red-500/40" />
                  <div className="w-2 h-2 rounded-full bg-amber-500/40" />
                  <div className="w-2 h-2 rounded-full bg-emerald-500/40" />
                </div>
                <span className="hud-text text-[9px] text-cyan-400/70">TERMINAL</span>
              </div>
              <button onClick={() => setTerminalOpen(false)}
                className="hud-text text-[8px] text-cyan-400/60 hover:text-cyan-400/50 transition-colors">
                CLOSE
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 font-mono text-[10px] space-y-1">
              {terminalLines.length === 0 && (
                <div className="text-cyan-400/40 text-center mt-12 text-[10px]">
                  Terminal output will appear here when commands are executed.
                </div>
              )}
              {terminalLines.map((line, i) => (
                <div key={i} className={`flex items-start gap-2 ${
                  line.type === 'cmd' ? 'text-emerald-400/70' :
                  line.type === 'err' ? 'text-red-400/70' :
                  line.type === 'info' ? 'text-cyan-400/80' :
                  'text-slate-400/60'
                }`}>
                  {line.type === 'cmd' && <span className="text-emerald-500/30">$</span>}
                  <span className="whitespace-pre-wrap break-all">{line.text}</span>
                </div>
              ))}
            </div>
            <div className="px-4 py-2 border-t border-cyan-500/15">
              <form onSubmit={e => {
                e.preventDefault();
                const input = (e.target as any).elements.cmd;
                if (input.value.trim()) {
                  setTerminalLines(prev => [...prev, { type: 'cmd', text: input.value }]);
                  processMessage(input.value);
                  input.value = '';
                }
              }} className="flex gap-2">
                <input name="cmd" type="text" placeholder="Enter command..."
                  className="flex-1 bg-transparent border-none outline-none text-emerald-400/60 font-mono text-[10px] placeholder-cyan-500/10"
                  onFocus={handleInputFocus} onBlur={handleInputBlur} />
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ CHAT DRAWER ═══ */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute right-0 top-0 h-full w-[360px] max-w-[85vw] flex flex-col z-50"
            style={{ background: 'rgba(4,6,12,0.95)', borderLeft: '1px solid rgba(0,200,255,0.05)' }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-cyan-500/15">
              <div>
                <div className="hud-text text-cyan-400/80">CONVERSATION LOG</div>
                <div className="text-[9px] text-slate-600 mt-0.5" style={{ fontFamily: 'Courier New, monospace' }}>
                  {messages.length} ENTRIES
                </div>
              </div>
              <button onClick={() => setChatOpen(false)}
                className="w-7 h-7 rounded border border-cyan-500/25 flex items-center justify-center text-cyan-400/70 hover:text-cyan-400/60 transition-colors">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {messages.length === 0 && (
                <div className="text-center text-cyan-400/45 text-[10px] mt-12"
                  style={{ fontFamily: 'Courier New, monospace' }}>
                  <div className="mb-3 text-lg text-cyan-400/40">[ ]</div>
                  <p>INITIATE CONVERSATION</p>
                  <p className="mt-1 text-cyan-400/40">&quot;Hey Jarvis&quot; or type below</p>
                </div>
              )}
              {messages.map((msg, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] px-3 py-2 rounded ${
                    msg.role === 'user'
                      ? 'border border-cyan-500/30 bg-cyan-500/5'
                      : 'border border-cyan-500/20 bg-cyan-500/[0.06]'
                  }`}>
                    <div className="text-[11px] text-cyan-100/50 leading-relaxed"
                      style={{ fontFamily: 'Courier New, monospace' }}>
                      {msg.text}
                    </div>
                    <div className="text-[8px] text-slate-600 mt-1"
                      style={{ fontFamily: 'Courier New, monospace' }}>
                      {msg.time}
                    </div>
                  </div>
                </motion.div>
              ))}
              {mode === 'thinking' && (
                <div className="flex justify-start">
                  <div className="px-3 py-2 rounded border border-cyan-500/20 bg-cyan-500/[0.06]">
                    <div className="flex gap-2">
                      {[0, 1, 2].map(i => (
                        <motion.div key={i}
                          className="w-1 h-1 rounded-full bg-cyan-400/40"
                          animate={{ opacity: [0.2, 0.8, 0.2] }}
                          transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            <div className="px-4 py-3 border-t border-cyan-500/15">
              <form onSubmit={handleTextSubmit} className="flex gap-2">
                <input type="text" value={inputText} onChange={e => setInputText(e.target.value)}
                  placeholder="Enter command..."
                  className="flex-1 bg-transparent border border-cyan-500/25 rounded px-3 py-2 text-[11px] text-cyan-100/60 placeholder-slate-600/40 focus:border-cyan-500/25 transition-colors"
                  style={{ fontFamily: 'Courier New, monospace' }}
                  disabled={mode === 'thinking'}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur} />
                <button type="submit" disabled={!inputText.trim() || mode === 'thinking'}
                  className="w-9 h-9 rounded border border-cyan-500/30 flex items-center justify-center text-cyan-400/80 hover:bg-cyan-500/5 disabled:opacity-15 transition-all">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Auto-Recon Panel */}
      <AutoRecon isOpen={reconOpen} onClose={() => setReconOpen(false)} />

      {/* Hardware Designer Panel */}
      <HardwareDesigner isOpen={hardwareOpen} onClose={() => setHardwareOpen(false)} />
    </div>
  );
}
