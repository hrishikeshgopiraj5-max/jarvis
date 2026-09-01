'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ═══════════════════════════════════════════════════════════════
// JARVIS Iron Man Boot Sequence
// Stage 1: Arc Reactor Ignition (0-1.5s)
// Stage 2: HUD Elements Fly In (1.5-3.5s)
// Stage 3: System Text Typing (3.5-6s)
// Stage 4: Full Activation (6-7.5s)
// ═══════════════════════════════════════════════════════════════

const BOOT_LINES = [
  { text: 'STARK INDUSTRIES // NEURAL MESH INITIALIZATION', delay: 120 },
  { text: 'ARK REACTOR POWER CORE ................ ONLINE', delay: 100 },
  { text: 'LOADING 14 AI MODELS ACROSS 6 PROVIDERS', delay: 110 },
  { text: 'SPIDER-WEB MESH ................. 182 NODES ACTIVE', delay: 90 },
  { text: 'KNOWLEDGE BASE ..................... 20+ ENTRIES', delay: 80 },
  { text: 'MEMORY SUBSYSTEM ................... RECORDING', delay: 80 },
  { text: 'VOICE RECOGNITION ........... ALWAYS-ON MODE', delay: 90 },
  { text: 'SECURITY PROTOCOLS ............. ARMED', delay: 80 },
  { text: 'ALL SYSTEMS NOMINAL. READY, SIR.', delay: 150 },
];

// ── Sound Engine (Web Audio API) ─────────────────────────────
function createSoundEngine() {
  let ctx: AudioContext | null = null;
  const getCtx = () => {
    if (!ctx) ctx = new AudioContext();
    return ctx;
  };

  return {
    // Deep power-up hum (arc reactor igniting)
    powerUp: () => {
      try {
        const c = getCtx();
        const osc1 = c.createOscillator();
        const osc2 = c.createOscillator();
        const gain = c.createGain();
        const filter = c.createBiquadFilter();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(60, c.currentTime);
        osc1.frequency.exponentialRampToValueAtTime(200, c.currentTime + 1.5);

        osc2.type = 'sawtooth';
        osc2.frequency.setValueAtTime(30, c.currentTime);
        osc2.frequency.exponentialRampToValueAtTime(100, c.currentTime + 1.5);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(200, c.currentTime);
        filter.frequency.exponentialRampToValueAtTime(800, c.currentTime + 1.5);
        filter.Q.value = 2;

        gain.gain.setValueAtTime(0, c.currentTime);
        gain.gain.linearRampToValueAtTime(0.12, c.currentTime + 0.3);
        gain.gain.linearRampToValueAtTime(0.08, c.currentTime + 1.2);
        gain.gain.linearRampToValueAtTime(0, c.currentTime + 1.6);

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(c.destination);

        osc1.start(c.currentTime);
        osc2.start(c.currentTime);
        osc1.stop(c.currentTime + 1.6);
        osc2.stop(c.currentTime + 1.6);
      } catch {}
    },

    // Arc reactor flash burst
    flashBurst: () => {
      try {
        const c = getCtx();
        const osc = c.createOscillator();
        const gain = c.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, c.currentTime);
        osc.frequency.exponentialRampToValueAtTime(200, c.currentTime + 0.15);

        gain.gain.setValueAtTime(0.08, c.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.2);

        osc.connect(gain);
        gain.connect(c.destination);
        osc.start(c.currentTime);
        osc.stop(c.currentTime + 0.2);
      } catch {}
    },

    // Mechanical click (for HUD elements locking in)
    click: () => {
      try {
        const c = getCtx();
        const osc = c.createOscillator();
        const gain = c.createGain();
        const filter = c.createBiquadFilter();

        osc.type = 'square';
        osc.frequency.setValueAtTime(2400, c.currentTime);
        osc.frequency.exponentialRampToValueAtTime(400, c.currentTime + 0.02);

        filter.type = 'highpass';
        filter.frequency.value = 800;

        gain.gain.setValueAtTime(0.04, c.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.04);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(c.destination);
        osc.start(c.currentTime);
        osc.stop(c.currentTime + 0.04);
      } catch {}
    },

    // Typewriter key tap
    tap: () => {
      try {
        const c = getCtx();
        const bufferSize = 400;
        const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.exp(-i / 60);
        }
        const source = c.createBufferSource();
        source.buffer = buffer;
        const gain = c.createGain();
        const filter = c.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 3000 + Math.random() * 2000;
        filter.Q.value = 3;
        gain.gain.value = 0.02;
        source.connect(filter);
        filter.connect(gain);
        gain.connect(c.destination);
        source.start(c.currentTime);
      } catch {}
    },

    // Line completion "ding"
    lineComplete: () => {
      try {
        const c = getCtx();
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1800, c.currentTime);
        gain.gain.setValueAtTime(0.03, c.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.08);
        osc.connect(gain);
        gain.connect(c.destination);
        osc.start(c.currentTime);
        osc.stop(c.currentTime + 0.08);
      } catch {}
    },

    // Final activation chime (two-tone)
    activationChime: () => {
      try {
        const c = getCtx();
        const notes = [880, 1320];
        notes.forEach((freq, i) => {
          const osc = c.createOscillator();
          const gain = c.createGain();
          osc.type = 'sine';
          osc.frequency.value = freq;
          const start = c.currentTime + i * 0.12;
          gain.gain.setValueAtTime(0, start);
          gain.gain.linearRampToValueAtTime(0.06, start + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, start + 0.4);
          osc.connect(gain);
          gain.connect(c.destination);
          osc.start(start);
          osc.stop(start + 0.4);
        });
      } catch {}
    },
  };
}

interface BootSequenceProps {
  onComplete: () => void;
}

export default function BootSequence({ onComplete }: BootSequenceProps) {
  const [stage, setStage] = useState(0); // 0=dark, 1=reactor, 2=hud, 3=text, 4=activate
  const [bootLines, setBootLines] = useState<string[]>([]);
  const [reactorScale, setReactorScale] = useState(0);
  const [hudOpacity, setHudOpacity] = useState(0);
  const [flashOpacity, setFlashOpacity] = useState(0);
  const [crosshairScale, setCrosshairScale] = useState(0);
  const [bracketsVisible, setBracketsVisible] = useState(false);
  const [progressWidth, setProgressWidth] = useState(0);
  const [activateText, setActivateText] = useState(false);
  const cancelledRef = useRef(false);
  const soundsRef = useRef<ReturnType<typeof createSoundEngine> | null>(null);

  const runBoot = useCallback(async () => {
    const sounds = createSoundEngine();
    soundsRef.current = sounds;

    // ── Stage 0: Brief darkness ──
    await sleep(400);
    if (cancelledRef.current) return;

    // ── Stage 1: Arc Reactor Ignition ──
    setStage(1);
    sounds.powerUp();

    // Reactor core grows from nothing
    await animate(setReactorScale, 0, 1, 1200);
    if (cancelledRef.current) return;

    // Flash burst when reactor reaches full
    setFlashOpacity(0.6);
    sounds.flashBurst();
    await sleep(100);
    setFlashOpacity(0);
    await sleep(200);
    if (cancelledRef.current) return;

    // ── Stage 2: HUD Elements Fly In ──
    setStage(2);
    setHudOpacity(1);
    await sleep(100);
    sounds.click();

    // Crosshair scales in
    animate(setCrosshairScale, 0, 1, 400);
    await sleep(200);
    sounds.click();
    if (cancelledRef.current) return;

    // Corner brackets appear
    setBracketsVisible(true);
    sounds.click();
    await sleep(300);
    if (cancelledRef.current) return;

    // ── Stage 3: System Text Typing ──
    setStage(3);
    for (let i = 0; i < BOOT_LINES.length; i++) {
      if (cancelledRef.current) return;
      const line = BOOT_LINES[i];

      // Type out the line character by character
      const fullText = line.text;
      let currentText = '';
      for (let j = 0; j < fullText.length; j++) {
        if (cancelledRef.current) return;
        currentText += fullText[j];
        setBootLines(prev => {
          const next = [...prev];
          next[i] = currentText;
          return next;
        });
        // Tap sound every 3 chars
        if (j % 3 === 0) sounds.tap();
        await sleep(8 + Math.random() * 8);
      }

      sounds.lineComplete();
      setProgressWidth(((i + 1) / BOOT_LINES.length) * 100);
      await sleep(BOOT_LINES[i].delay);
    }
    if (cancelledRef.current) return;

    // ── Stage 4: Full Activation ──
    setStage(4);
    await sleep(200);
    setActivateText(true);
    sounds.activationChime();
    await sleep(800);

    // Flash the whole screen briefly
    setFlashOpacity(0.3);
    await sleep(150);
    setFlashOpacity(0);
    await sleep(400);

    // Done
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    runBoot();
    return () => { cancelledRef.current = true; };
  }, [runBoot]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden"
      style={{ background: '#020306' }}
    >
      {/* Flash overlay */}
      <div className="absolute inset-0 pointer-events-none z-50 transition-opacity"
        style={{ opacity: flashOpacity, background: 'radial-gradient(circle, rgba(0,200,255,0.5), transparent 70%)' }} />

      {/* Hex grid (fades in) */}
      <div className="hex-grid" style={{ opacity: stage >= 2 ? 0.02 : 0, transition: 'opacity 1s ease' }} />

      {/* ═══ STAGE 1: Arc Reactor ═══ */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div style={{ transform: `scale(${reactorScale})`, transition: 'none' }}>
          <svg width="300" height="300" viewBox="0 0 300 300" className="md:w-[350px] md:h-[350px]">
            {/* Outer ring */}
            <circle cx="150" cy="150" r="140" fill="none" stroke="rgba(0,200,255,0.06)" strokeWidth="0.5"
              style={{ opacity: stage >= 2 ? 1 : 0, transition: 'opacity 0.5s' }} />

            {/* Rotating rings */}
            <g style={{ opacity: stage >= 1 ? 1 : 0, transition: 'opacity 0.8s' }}>
              <circle cx="150" cy="150" r="130" fill="none" stroke="rgba(0,200,255,0.12)" strokeWidth="0.5"
                strokeDasharray="8 12" style={{ transformOrigin: '150px 150px', animation: 'ring-rotate 20s linear infinite' }} />
              <circle cx="150" cy="150" r="110" fill="none" stroke="rgba(0,200,255,0.1)" strokeWidth="0.5"
                style={{ transformOrigin: '150px 150px', animation: 'ring-rotate 15s linear infinite reverse' }} />
              <circle cx="150" cy="150" r="90" fill="none" stroke="rgba(0,200,255,0.15)" strokeWidth="1"
                style={{ transformOrigin: '150px 150px', animation: 'ring-rotate 25s linear infinite' }} />
              <circle cx="150" cy="150" r="70" fill="none" stroke="rgba(0,200,255,0.12)" strokeWidth="0.5"
                strokeDasharray="4 8" style={{ transformOrigin: '150px 150px', animation: 'ring-rotate 10s linear infinite reverse' }} />
            </g>

            {/* Arc segments */}
            <g style={{ opacity: stage >= 1 ? 1 : 0, transition: 'opacity 0.8s', transformOrigin: '150px 150px', animation: 'ring-rotate 15s linear infinite' }}>
              {Array.from({ length: 12 }, (_, i) => i * 30).map((deg) => (
                <line key={deg} x1="150" y1="15" x2="150" y2="40"
                  stroke="rgba(0,200,255,0.3)" strokeWidth="1.5"
                  transform={`rotate(${deg} 150 150)`} />
              ))}
            </g>
            <g style={{ opacity: stage >= 1 ? 1 : 0, transformOrigin: '150px 150px', animation: 'ring-rotate 10s linear infinite reverse' }}>
              {Array.from({ length: 8 }, (_, i) => i * 45).map((deg) => (
                <line key={deg} x1="150" y1="60" x2="150" y2="80"
                  stroke="rgba(0,200,255,0.2)" strokeWidth="1"
                  transform={`rotate(${deg} 150 150)`} />
              ))}
            </g>

            {/* Core glow */}
            <defs>
              <radialGradient id="bootCoreGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(0,230,255,1)" />
                <stop offset="30%" stopColor="rgba(0,180,255,0.7)" />
                <stop offset="60%" stopColor="rgba(0,120,255,0.3)" />
                <stop offset="100%" stopColor="transparent" />
              </radialGradient>
            </defs>
            <circle cx="150" cy="150" r="25" fill="url(#bootCoreGlow)"
              style={{ filter: 'blur(2px)' }} />
            <circle cx="150" cy="150" r="12" fill="rgba(0,220,255,0.9)"
              style={{ filter: 'drop-shadow(0 0 15px rgba(0,200,255,0.8))' }} />
            <circle cx="150" cy="150" r="5" fill="rgba(255,255,255,0.9)" />

            {/* Orbiting particles */}
            {stage >= 2 && (
              <>
                <circle cx="150" cy="150" r="2.5" fill="rgba(0,200,255,0.7)"
                  style={{ filter: 'drop-shadow(0 0 4px rgba(0,200,255,0.5))', transformOrigin: '150px 150px', animation: 'orbit-1 6s linear infinite' }} />
                <circle cx="150" cy="150" r="2" fill="rgba(0,180,255,0.6)"
                  style={{ filter: 'drop-shadow(0 0 4px rgba(0,180,255,0.4))', transformOrigin: '150px 150px', animation: 'orbit-2 9s linear infinite' }} />
                <circle cx="150" cy="150" r="1.5" fill="rgba(0,160,255,0.5)"
                  style={{ filter: 'drop-shadow(0 0 3px rgba(0,160,255,0.3))', transformOrigin: '150px 150px', animation: 'orbit-3 12s linear infinite' }} />
              </>
            )}
          </svg>
        </div>
      </div>

      {/* ═══ STAGE 2: HUD Elements ═══ */}
      <div className="absolute inset-0 pointer-events-none" style={{ opacity: hudOpacity, transition: 'opacity 0.5s' }}>

        {/* Crosshair */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ transform: `translate(-50%, -50%) scale(${crosshairScale})`, transition: 'transform 0.4s ease-out' }}>
          <svg width="400" height="400" viewBox="0 0 400 400" style={{ opacity: 0.08 }}>
            <circle cx="200" cy="200" r="180" fill="none" stroke="rgba(0,200,255,1)" strokeWidth="0.5" />
            <circle cx="200" cy="200" r="160" fill="none" stroke="rgba(0,200,255,0.5)" strokeWidth="0.3" strokeDasharray="2 4" />
            {/* Crosshair lines */}
            <line x1="200" y1="10" x2="200" y2="80" stroke="rgba(0,200,255,0.6)" strokeWidth="0.5" />
            <line x1="200" y1="320" x2="200" y2="390" stroke="rgba(0,200,255,0.6)" strokeWidth="0.5" />
            <line x1="10" y1="200" x2="80" y2="200" stroke="rgba(0,200,255,0.6)" strokeWidth="0.5" />
            <line x1="320" y1="200" x2="390" y2="200" stroke="rgba(0,200,255,0.6)" strokeWidth="0.5" />
            {/* Tick marks */}
            {Array.from({ length: 36 }, (_, i) => i * 10).map(deg => (
              <line key={deg}
                x1={200 + 175 * Math.cos((deg * Math.PI) / 180)}
                y1={200 + 175 * Math.sin((deg * Math.PI) / 180)}
                x2={200 + 180 * Math.cos((deg * Math.PI) / 180)}
                y2={200 + 180 * Math.sin((deg * Math.PI) / 180)}
                stroke="rgba(0,200,255,0.4)" strokeWidth="0.5" />
            ))}
          </svg>
        </div>

        {/* Scanning line */}
        {stage >= 2 && (
          <div className="scan-line" />
        )}

        {/* Corner brackets */}
        {bracketsVisible && (
          <>
            {/* Top-left */}
            <div className="absolute top-6 left-6" style={{ opacity: 0.3 }}>
              <div className="w-16 h-[1px] bg-gradient-to-r from-cyan-400 to-transparent" />
              <div className="w-[1px] h-16 bg-gradient-to-b from-cyan-400 to-transparent" />
            </div>
            {/* Top-right */}
            <div className="absolute top-6 right-6" style={{ opacity: 0.3 }}>
              <div className="w-16 h-[1px] bg-gradient-to-l from-cyan-400 to-transparent ml-auto" />
              <div className="w-[1px] h-16 bg-gradient-to-b from-cyan-400 to-transparent ml-auto" />
            </div>
            {/* Bottom-left */}
            <div className="absolute bottom-6 left-6" style={{ opacity: 0.3 }}>
              <div className="w-[1px] h-16 bg-gradient-to-t from-cyan-400 to-transparent" />
              <div className="w-16 h-[1px] bg-gradient-to-r from-cyan-400 to-transparent" />
            </div>
            {/* Bottom-right */}
            <div className="absolute bottom-6 right-6" style={{ opacity: 0.3 }}>
              <div className="w-[1px] h-16 bg-gradient-to-t from-cyan-400 to-transparent ml-auto" />
              <div className="w-16 h-[1px] bg-gradient-to-l from-cyan-400 to-transparent ml-auto" />
            </div>

            {/* Top HUD bar */}
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 0.3, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="absolute top-6 left-1/2 -translate-x-1/2">
              <div className="hud-text text-[9px] text-cyan-400/40 text-center tracking-[0.6em]"
                style={{ fontFamily: 'Courier New, monospace' }}>
                J.A.R.V.I.S. // JUST A RATHER VERY INTELLIGENT SYSTEM
              </div>
            </motion.div>

            {/* Left data readout */}
            <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 0.25, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="absolute left-8 top-1/3" style={{ fontFamily: 'Courier New, monospace' }}>
              <div className="text-[8px] text-cyan-400/30 space-y-1">
                <div>PWR: 100%</div>
                <div>NET: ONLINE</div>
                <div>MEM: ACTIVE</div>
                <div>CPU: NOMINAL</div>
                <div>SYS: ARMED</div>
              </div>
            </motion.div>

            {/* Right data readout */}
            <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 0.25, x: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="absolute right-8 top-1/3 text-right" style={{ fontFamily: 'Courier New, monospace' }}>
              <div className="text-[8px] text-cyan-400/30 space-y-1">
                <div>MESH: 182</div>
                <div>MODELS: 14</div>
                <div>PROV: 6</div>
                <div>KB: 20+</div>
                <div>VOICE: ON</div>
              </div>
            </motion.div>
          </>
        )}
      </div>

      {/* ═══ STAGE 3: System Text ═══ */}
      {stage >= 3 && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-full max-w-lg px-8">
          <div className="space-y-0.5">
            {bootLines.map((line, i) => (
              <div key={i} className="flex items-center gap-2"
                style={{ fontFamily: 'Courier New, monospace' }}>
                <span className="text-[8px] text-cyan-500/25">[{String(i + 1).padStart(2, '0')}]</span>
                <span className="text-[9px] text-cyan-400/40 flex-1">
                  {line || '\u00A0'}
                  {line && line.length === BOOT_LINES[i]?.text?.length && (
                    <span className="text-emerald-400/60 ml-2">OK</span>
                  )}
                </span>
              </div>
            ))}
          </div>
          {/* Progress bar */}
          <div className="mt-4 h-[1px] bg-cyan-500/5 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-cyan-500/40 to-cyan-400/20 transition-all duration-300"
              style={{ width: `${progressWidth}%` }} />
          </div>
        </div>
      )}

      {/* ═══ STAGE 4: Activation Text ═══ */}
      <AnimatePresence>
        {activateText && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none">
            <div className="text-center">
              <motion.div initial={{ opacity: 0, letterSpacing: '0.2em' }}
                animate={{ opacity: 1, letterSpacing: '0.5em' }}
                transition={{ duration: 0.6 }}
                className="text-[11px] text-cyan-400/70"
                style={{ fontFamily: 'Courier New, monospace' }}>
                ALL SYSTEMS NOMINAL
              </motion.div>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.3 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="text-[9px] text-cyan-400/20 mt-2 tracking-[0.3em]"
                style={{ fontFamily: 'Courier New, monospace' }}>
                READY, SIR
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom status line */}
      {stage >= 2 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4"
          style={{ fontFamily: 'Courier New, monospace' }}>
          <div className="text-[7px] text-cyan-400/15 tracking-wider">STARK INDUSTRIES</div>
          <div className="w-[1px] h-2 bg-cyan-500/10" />
          <div className="text-[7px] text-cyan-400/15 tracking-wider">v3.0</div>
          <div className="w-[1px] h-2 bg-cyan-500/10" />
          <div className={`text-[7px] tracking-wider ${stage >= 4 ? 'text-emerald-400/40' : 'text-cyan-400/15'}`}>
            {stage >= 4 ? 'ONLINE' : 'INITIALIZING'}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ── Helpers ───────────────────────────────────────────────────
function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

function animate(
  setter: (v: number) => void,
  from: number,
  to: number,
  duration: number
): Promise<void> {
  return new Promise(resolve => {
    const start = performance.now();
    const step = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setter(from + (to - from) * eased);
      if (progress < 1) requestAnimationFrame(step);
      else resolve();
    };
    requestAnimationFrame(step);
  });
}
