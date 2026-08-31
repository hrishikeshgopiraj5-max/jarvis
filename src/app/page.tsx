'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { sendChatMessage } from '@/lib/ai';

// ═══════════════════════════════════════════════════════════════
// JARVIS v2 — Always listening. Responds on "Hey Jarvis".
// Improvements: persistent responses, timestamps, keyboard shortcuts,
// better orb, error toasts, optimized rendering.
// ═══════════════════════════════════════════════════════════════

type OrbMode = 'idle' | 'listening' | 'thinking' | 'speaking' | 'error';
const WAKE_WORDS = ['hey jarvis', 'jarvis', 'hey jervis', 'jervis'];
const MSG_EXPIRY_MS = 12000; // response stays on screen for 12 seconds

export default function JarvisPage() {
  const [mode, setMode] = useState<OrbMode>('idle');
  const [setupOpen, setSetupOpen] = useState(false);
  const [setupKey, setSetupKey] = useState('');
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
  const [orbPulse, setOrbPulse] = useState(0);

  const [pcHealth, setPcHealth] = useState({
    cores: 0, memory: '', platform: '', language: '',
    online: true, time: '', date: '', uptime: '',
  });

  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isProcessingRef = useRef(false);

  // ── Check API key on mount — show setup if missing ───────────
  useEffect(() => {
    const settings = localStorage.getItem('jarvis_settings');
    const parsed = settings ? JSON.parse(settings) : {};
    if (!parsed.openrouterApiKey) {
      setSetupOpen(true);
    }
  }, []);
  const wakeModeRef = useRef(false);
  const lastSpokeAtRef = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Helpers ──────────────────────────────────────────────────
  const now = () => new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  const showError = (msg: string) => { setError(msg); setTimeout(() => setError(''), 5000); };

  // ── PC Health + Clock ────────────────────────────────────────
  useEffect(() => {
    const update = () => {
      const d = new Date();
      setPcHealth({
        cores: navigator.hardwareConcurrency || 0,
        memory: (navigator as any).deviceMemory ? `${(navigator as any).deviceMemory} GB` : 'Unknown',
        platform: navigator.platform || 'Unknown',
        language: navigator.language || 'en-US',
        online: navigator.onLine,
        time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }),
        date: d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
        uptime: `${Math.floor(performance.now() / 60000)}m ${Math.floor((performance.now() % 60000) / 1000)}s`,
      });
    };
    update();
    const i = setInterval(update, 1000);
    return () => clearInterval(i);
  }, []);

  // ── Orb pulse animation ──────────────────────────────────────
  useEffect(() => {
    if (mode === 'listening') {
      const i = setInterval(() => setOrbPulse(p => (p + 1) % 360), 50);
      return () => clearInterval(i);
    }
  }, [mode]);

  // ── Keyboard shortcuts ───────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Escape closes panels
      if (e.key === 'Escape') {
        if (infoOpen) setInfoOpen(false);
        else if (chatOpen) setChatOpen(false);
      }
      // Focus input on any letter key when not in input
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag !== 'INPUT' && tag !== 'TEXTAREA') {
          inputRef.current?.focus();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [infoOpen, chatOpen]);

  // ── Speech Synthesis ──────────────────────────────────────────
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
    // Try to pick a male voice
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

  // ── Process Message Through Mesh ─────────────────────────────
  const processMessage = useCallback(async (text: string) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    wakeModeRef.current = false;
    setMode('thinking');
    setStatus('SOCH RAHA HU...');
    setTranscript('');
    setMessages(prev => [...prev, { role: 'user', text, time: now() }]);

    try {
      const settingsRaw = localStorage.getItem('jarvis_settings');
      const settings = settingsRaw ? JSON.parse(settingsRaw) : {};
      const result = await sendChatMessage(text, messages.map(m => ({
        role: m.role === 'jarvis' ? 'assistant' : 'user',
        content: m.text,
      })));
      const reply = result.response || result.error || 'Kuch gadbad ho gayi sir, dubara try karo.';
      setMessages(prev => [...prev, { role: 'jarvis', text: reply, time: now() }]);
      setResponse(reply);
      setResponseTime(Date.now());
      speak(reply);
    } catch {
      const errorMsg = 'Neural connection toot gaya sir. Dubara try karo.';
      setMessages(prev => [...prev, { role: 'jarvis', text: errorMsg, time: now() }]);
      setResponse(errorMsg);
      setResponseTime(Date.now());
      showError('API connection failed');
      speak(errorMsg);
    }
    isProcessingRef.current = false;
  }, [messages, speak]);

  // ── Always-On Wake Word Listener ──────────────────────────────
  const startListening = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setStatus('Voice not supported'); return; }
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
          setStatus('BOLIYE SIR...');
          setTranscript('');
          // Play a subtle beep to confirm wake word
          try { const ctx = new AudioContext(); const osc = ctx.createOscillator(); const gain = ctx.createGain(); osc.connect(gain); gain.connect(ctx.destination); osc.frequency.value = 880; gain.gain.value = 0.1; osc.start(); osc.stop(ctx.currentTime + 0.1); } catch {}

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

  // ── Start listening on mount (only if API key exists) ────────
  useEffect(() => {
    if (setupOpen) return;
    const timer = setTimeout(() => startListening(), 1500);
    return () => clearTimeout(timer);
  }, [setupOpen]); // eslint-disable-line

  // ── Pause voice when input is focused ────────────────────────
  const handleInputFocus = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.abort();
      recognitionRef.current = null;
    }
  }, []);

  const handleInputBlur = useCallback(() => {
    if (!isProcessingRef.current && mode !== 'speaking') {
      setTimeout(() => startListening(), 300);
    }
  }, [mode]);

  // ── Text Input ───────────────────────────────────────────────
  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isProcessingRef.current) return;
    if (recognitionRef.current) { recognitionRef.current.abort(); recognitionRef.current = null; }
    processMessage(inputText.trim());
    setInputText('');
  };

  // ── Auto-scroll chat ─────────────────────────────────────────
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // ── Waveform (optimized with useMemo) ────────────────────────
  const waveBars = 48;
  const [waveLevels, setWaveLevels] = useState<number[]>(new Array(waveBars).fill(0.05));

  useEffect(() => {
    const interval = setInterval(() => {
      setWaveLevels(prev => prev.map((_, i) => {
        if (mode === 'listening' || mode === 'speaking') {
          return 0.15 + Math.abs(Math.sin(Date.now() / 200 + i * 0.4)) * audioLevel * 0.8;
        }
        return 0.04 + Math.sin(Date.now() / 1500 + i * 0.3) * 0.02;
      }));
    }, 60); // Reduced from 50ms to 60ms for performance
    return () => clearInterval(interval);
  }, [mode, audioLevel]);

  useEffect(() => {
    if (mode === 'listening') {
      const i = setInterval(() => setAudioLevel(0.15 + Math.random() * 0.3), 100);
      return () => clearInterval(i);
    }
  }, [mode]);

  // ── Orb glow intensity (memoized) ────────────────────────────
  const orbGlow = useMemo(() => {
    switch (mode) {
      case 'listening': return 'bg-cyan-500/12';
      case 'thinking': return 'bg-indigo-500/18';
      case 'speaking': return 'bg-cyan-400/15';
      default: return 'bg-cyan-500/5';
    }
  }, [mode]);

  const orbGlowSize = useMemo(() => {
    switch (mode) {
      case 'listening': return '-inset-20';
      case 'thinking': return '-inset-16';
      case 'speaking': return '-inset-20';
      default: return '-inset-16';
    }
  }, [mode]);

  // ── Trending Ideas ───────────────────────────────────────────
  const trendingIdeas = [
    { icon: '🔒', title: 'Cybersecurity Audit', desc: 'Apna network scan karo aur vulnerabilities dhundho', tag: 'HACKING' },
    { icon: '🤖', title: 'Build an AI Bot', desc: 'Discord/Telegram bot banao multiple AI models se', tag: 'CODING' },
    { icon: '📊', title: 'Market Analysis', desc: 'Crypto/stocks ka AI se deep research karo', tag: 'ANALYSIS' },
    { icon: '🎨', title: 'UI/UX Design', desc: 'Ek complete web app design karo scratch se', tag: 'DESIGN' },
    { icon: '📝', title: 'Pitch Deck', desc: 'Professional investor pitch deck banao', tag: 'BUSINESS' },
    { icon: '🧠', title: 'Learn Anything', desc: 'Kuch bhi seekho — quantum physics se cooking tak', tag: 'LEARNING' },
    { icon: '⚡', title: 'Automate Tasks', desc: 'Boring kaam automate karo scripts se', tag: 'AUTOMATION' },
    { icon: '🎮', title: 'Game Dev', desc: 'Ek game banao concept se playable tak', tag: 'GAMING' },
  ];

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-between overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #080c14 0%, #0a1020 40%, #0c1428 100%)' }}>

      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[55%] w-[600px] h-[600px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.06) 0%, rgba(99,102,241,0.03) 40%, transparent 70%)' }} />
      </div>

      {/* First-Launch API Key Setup */}
      <AnimatePresence>
        {setupOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#0c1018] border border-white/10 rounded-2xl p-8 max-w-md w-[90vw] text-center space-y-5">
              <div className="text-4xl mb-2">⬡</div>
              <div className="text-lg text-white font-light">Welcome to JARVIS</div>
              <div className="text-sm text-slate-400">Enter your OpenRouter API key to activate the neural mesh.</div>
              <input type="password" value={setupKey} onChange={e => setSetupKey(e.target.value)}
                placeholder="sk-or-v1-..."
                className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-cyan-500/30 transition-all font-mono text-center"
                onKeyDown={e => { if (e.key === 'Enter' && setupKey.trim()) { localStorage.setItem('jarvis_settings', JSON.stringify({ openrouterApiKey: setupKey.trim() })); setSetupOpen(false); } }}
                autoFocus />
              <button onClick={() => { if (setupKey.trim()) { localStorage.setItem('jarvis_settings', JSON.stringify({ openrouterApiKey: setupKey.trim() })); setSetupOpen(false); } }}
                disabled={!setupKey.trim()}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 border border-cyan-500/30 text-cyan-400 text-sm font-medium hover:from-cyan-500/30 hover:to-indigo-500/30 disabled:opacity-30 transition-all">
                Activate JARVIS
              </button>
              <div className="text-[10px] text-slate-600">Get your key at <span className="text-cyan-400/60">openrouter.ai</span></div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Toast */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="absolute top-4 left-1/2 -translate-x-1/2 z-[60] px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-xs">
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Bar */}
      <div className="relative z-10 w-full flex items-center justify-between px-6 pt-6 md:pt-8">
        <div className="text-[10px] tracking-[0.5em] text-slate-500 font-light">J.A.R.V.I.S.</div>
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full transition-all ${
            mode === 'listening' ? 'bg-green-400 animate-pulse' :
            mode === 'thinking' ? 'bg-yellow-400 animate-pulse' :
            mode === 'speaking' ? 'bg-cyan-400' :
            'bg-slate-600'
          }`} />
          <div className="text-[10px] tracking-wider text-slate-600 font-mono">{pcHealth.time}</div>
          <button onClick={() => setInfoOpen(!infoOpen)}
            className="w-8 h-8 rounded-full bg-white/[0.04] border border-white/10 flex items-center justify-center text-slate-500 hover:text-cyan-400 hover:border-cyan-500/30 transition-all text-xs">
            i
          </button>
        </div>
      </div>

      {/* Center Orb */}
      <div className="relative z-10 flex-1 flex items-center justify-center">
        <div className="relative">
          <div className={`absolute ${orbGlowSize} rounded-full blur-3xl transition-all duration-700 ${orbGlow}`} />

          <svg viewBox="0 0 200 200" className="w-48 h-48 md:w-64 md:h-64 relative z-10">
            <defs>
              <radialGradient id="orbGrad" cx="40%" cy="35%" r="60%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.35)" />
                <stop offset="30%" stopColor="rgba(168,132,252,0.25)" />
                <stop offset="60%" stopColor="rgba(99,102,241,0.15)" />
                <stop offset="100%" stopColor="rgba(6,182,212,0.05)" />
              </radialGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>
            <g opacity={mode === 'listening' ? 0.25 : mode === 'thinking' ? 0.35 : 0.15} filter="url(#glow)">
              <motion.ellipse cx="100" cy="100" rx="85" ry="85" stroke="rgba(6,182,212,0.4)" strokeWidth="0.5" fill="none"
                animate={{ rotate: 360 }} transition={{ duration: 30, repeat: Infinity, ease: 'linear' }} style={{ transformOrigin: '100px 100px' }} />
              <motion.ellipse cx="100" cy="100" rx="92" ry="60" stroke="rgba(99,102,241,0.3)" strokeWidth="0.5" fill="none"
                animate={{ rotate: -360 }} transition={{ duration: 45, repeat: Infinity, ease: 'linear' }} style={{ transformOrigin: '100px 100px' }} />
              <motion.ellipse cx="100" cy="100" rx="70" ry="95" stroke="rgba(168,132,252,0.25)" strokeWidth="0.5" fill="none"
                animate={{ rotate: 360 }} transition={{ duration: 60, repeat: Infinity, ease: 'linear' }} style={{ transformOrigin: '100px 100px' }} />
            </g>
            <polygon points="100,20 155,55 170,100 155,145 100,180 45,145 30,100 45,55"
              fill="url(#orbGrad)" stroke="rgba(168,132,252,0.3)" strokeWidth="0.8" filter="url(#glow)" />
            <polygon points="100,20 130,70 100,100 70,70" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
            <polygon points="100,100 155,55 170,100" fill="rgba(168,132,252,0.06)" stroke="rgba(168,132,252,0.08)" strokeWidth="0.3" />
            <polygon points="100,100 30,100 45,55" fill="rgba(99,102,241,0.05)" stroke="rgba(99,102,241,0.06)" strokeWidth="0.3" />
            <polygon points="100,100 155,145 100,180" fill="rgba(6,182,212,0.04)" stroke="rgba(6,182,212,0.06)" strokeWidth="0.3" />
            <circle cx="88" cy="72" r="18" fill="rgba(255,255,255,0.12)" />
            <circle cx="88" cy="72" r="8" fill="rgba(255,255,255,0.2)" />
          </svg>

          {/* Status */}
          <motion.div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap"
            animate={{ opacity: mode === 'idle' ? 0.5 : 1 }}>
            <span className={`text-[10px] tracking-[0.4em] font-light ${
              wakeDetected ? 'text-cyan-300' : 'text-cyan-400/60'
            }`}>{status}</span>
          </motion.div>
        </div>
      </div>

      {/* Transcript / Response — stays visible for MSG_EXPIRY_MS */}
      <AnimatePresence>
        {transcript && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="absolute bottom-36 left-1/2 -translate-x-1/2 max-w-md px-6">
            <p className="text-sm text-cyan-300/70 text-center italic">"{transcript}"</p>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {response && (Date.now() - responseTime < MSG_EXPIRY_MS || mode === 'speaking') && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="absolute bottom-36 left-1/2 -translate-x-1/2 max-w-lg px-6">
            <p className="text-xs text-slate-400 text-center leading-relaxed line-clamp-3">
              {response.slice(0, 400)}{response.length > 400 ? '...' : ''}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom: Waveform + Text Input + Status indicator */}
      <div className="relative z-10 w-full pb-6 px-4">
        <div className="flex items-end justify-center gap-[2px] h-10 mb-4 px-8">
          {waveLevels.map((level, i) => {
            const ratio = i / waveBars;
            const color = ratio < 0.33 ? `rgba(34,197,94,${0.4 + level * 0.6})`
              : ratio < 0.66 ? `rgba(34,211,238,${0.4 + level * 0.6})`
              : `rgba(139,92,246,${0.4 + level * 0.6})`;
            return <div key={i} className="flex-1 rounded-full transition-all duration-75"
              style={{ height: `${Math.max(2, level * 100)}%`, backgroundColor: color, minWidth: '2px' }} />;
          })}
        </div>
        <div className="flex items-center justify-center gap-4">
          <button onClick={() => setChatOpen(!chatOpen)}
            className="w-12 h-12 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </button>
          <form onSubmit={handleTextSubmit} className="flex-1 max-w-md">
            <input ref={inputRef} type="text" value={inputText} onChange={e => setInputText(e.target.value)}
              placeholder='Bolo ya type karo...'
              className="w-full bg-white/[0.04] border border-white/10 rounded-full px-5 py-3 text-sm text-white placeholder-slate-500 focus:border-cyan-500/30 focus:bg-white/[0.06] transition-all"
              disabled={mode === 'thinking'}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur} />
          </form>
          <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all border ${
            mode === 'listening' ? 'border-green-500/30 bg-green-500/10' :
            mode === 'thinking' ? 'border-yellow-500/30 bg-yellow-500/10 animate-pulse' :
            mode === 'speaking' ? 'border-cyan-500/30 bg-cyan-500/10' :
            'border-white/10 bg-white/[0.03]'
          }`}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
              className={mode === 'listening' ? 'text-green-400' : mode === 'thinking' ? 'text-yellow-400' : mode === 'speaking' ? 'text-cyan-400' : 'text-slate-500'}>
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          </div>
        </div>
      </div>

      {/* INFO PANEL */}
      <AnimatePresence>
        {infoOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) setInfoOpen(false); }}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#0c1018]/95 border border-white/10 rounded-2xl w-[90vw] max-w-2xl max-h-[80vh] overflow-y-auto p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs tracking-[0.3em] text-cyan-400/60">SYSTEM OVERVIEW</div>
                  <div className="text-lg font-light text-white mt-1">J.A.R.V.I.S. Dashboard</div>
                </div>
                <button onClick={() => setInfoOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-slate-500 hover:text-white transition-colors">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
                <div className="text-4xl font-mono text-white font-light tracking-wider">{pcHealth.time}</div>
                <div className="text-sm text-slate-400 mt-1">{pcHealth.date}</div>
              </div>
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
                <div className="text-[10px] tracking-[0.3em] text-cyan-400/60 mb-3">PC HEALTH</div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { label: 'CPU CORES', value: pcHealth.cores || '—', icon: '⚡' },
                    { label: 'MEMORY', value: pcHealth.memory, icon: '🧠' },
                    { label: 'PLATFORM', value: pcHealth.platform, icon: '💻' },
                    { label: 'LANGUAGE', value: pcHealth.language, icon: '🌐' },
                    { label: 'STATUS', value: pcHealth.online ? 'ONLINE' : 'OFFLINE', icon: pcHealth.online ? '🟢' : '🔴' },
                    { label: 'SESSION', value: pcHealth.uptime, icon: '⏱' },
                  ].map(item => (
                    <div key={item.label} className="bg-white/[0.02] rounded-lg p-3">
                      <div className="text-[9px] tracking-wider text-slate-500 mb-1">{item.icon} {item.label}</div>
                      <div className="text-sm text-white font-mono">{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
                <div className="text-[10px] tracking-[0.3em] text-cyan-400/60 mb-3">NEURAL MESH — 14 MODELS, 6 PROVIDERS</div>
                <div className="flex flex-wrap gap-2">
                  {['Google', 'Anthropic', 'OpenAI', 'DeepSeek', 'Meta', 'Qwen'].map(p => (
                    <span key={p} className="px-3 py-1 rounded-full text-[10px] border border-cyan-500/20 bg-cyan-500/5 text-cyan-400/80">{p}</span>
                  ))}
                </div>
                <div className="text-[10px] text-slate-600 mt-2">182 node-to-node connections · Spider-web orchestration</div>
              </div>
              <div>
                <div className="text-[10px] tracking-[0.3em] text-cyan-400/60 mb-3">AAP AUR JARVIS MILKE KYA KAR SAKTE HO</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {trendingIdeas.map(idea => (
                    <button key={idea.title}
                      onClick={() => { setInfoOpen(false); processMessage(`Help me with: ${idea.title}`); }}
                      className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 text-left hover:border-cyan-500/20 hover:bg-cyan-500/[0.03] transition-all group">
                      <div className="flex items-start gap-3">
                        <span className="text-xl mt-0.5">{idea.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-white group-hover:text-cyan-300 transition-colors">{idea.title}</span>
                            <span className="text-[8px] px-1.5 py-0.5 rounded bg-white/5 text-slate-500 tracking-wider">{idea.tag}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{idea.desc}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Drawer */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute right-0 top-0 h-full w-[360px] max-w-[85vw] bg-[#0c1018]/95 backdrop-blur-xl border-l border-white/5 flex flex-col z-50">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
              <div>
                <div className="text-sm font-medium text-cyan-400/80 tracking-wider">CONVERSATION</div>
                <div className="text-[10px] text-slate-600 mt-0.5">{messages.length} messages</div>
              </div>
              <button onClick={() => setChatOpen(false)}
                className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-slate-500 hover:text-white transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {messages.length === 0 && (
                <div className="text-center text-slate-600 text-xs mt-12">
                  <div className="text-2xl mb-3 opacity-30">⬡</div>
                  <p>Jarvis se baat karo.</p>
                  <p className="mt-1 text-slate-700">&quot;Hey Jarvis, mujhe kuch help chahiye&quot;</p>
                </div>
              )}
              {messages.map((msg, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-cyan-500/10 border border-cyan-500/20 text-slate-200'
                      : 'bg-white/[0.03] border border-white/[0.06] text-slate-300'
                  }`}>
                    <div>{msg.text}</div>
                    <div className="text-[9px] text-slate-600 mt-1">{msg.time}</div>
                  </div>
                </motion.div>
              ))}
              {mode === 'thinking' && (
                <div className="flex justify-start">
                  <div className="px-4 py-2.5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                    <div className="flex gap-1.5">
                      <span className="w-1.5 h-1.5 bg-cyan-400/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-cyan-400/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-cyan-400/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            <div className="px-4 py-3 border-t border-white/5">
              <form onSubmit={handleTextSubmit} className="flex gap-2">
                <input type="text" value={inputText} onChange={e => setInputText(e.target.value)}
                  placeholder="Ya yahan type karo..."
                  className="flex-1 bg-white/[0.04] border border-white/10 rounded-full px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:border-cyan-500/30 transition-colors"
                  disabled={mode === 'thinking'}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur} />
                <button type="submit" disabled={!inputText.trim() || mode === 'thinking'}
                  className="w-10 h-10 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 hover:bg-cyan-500/20 disabled:opacity-20 transition-all">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
