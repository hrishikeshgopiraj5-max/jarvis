/**
 * JARVIS Audio Manager
 *
 * Three independent concerns in one module:
 *  1. Micro metering — REAL microphone amplitude via Web Audio AnalyserNode
 *     (drives waveform + AI-core audio reactivity; never simulated).
 *  2. UI sounds — tiny original synthesized tones, no copyrighted assets.
 *  3. Speech output — interruptible speech synthesis with a provider-shaped
 *     surface so a neural TTS can replace it later.
 */

export type MicPermission = 'unknown' | 'granted' | 'denied' | 'unavailable';

interface MicMetering {
  stream: MediaStream | null;
  ctx: AudioContext | null;
  analyser: AnalyserNode | null;
  buf: Float32Array | null;
  raf: number | null;
  level: number;
  peaks: number;
}

const metering: MicMetering = { stream: null, ctx: null, analyser: null, buf: null, raf: null, level: 0, peaks: 0 };

type LevelListener = (level: number) => void;
const levelListeners = new Set<LevelListener>();

export function onMicLevel(fn: LevelListener): () => void {
  levelListeners.add(fn);
  return () => levelListeners.delete(fn);
}

/** Request mic access + start amplitude metering. Throws DOMException on denial. */
export async function startMicMetering(): Promise<void> {
  if (metering.stream) return;
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new DOMException('Media devices unsupported', 'NotSupportedError');
  }
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  });
  metering.stream = stream;
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  metering.ctx = new Ctx();
  const src = metering.ctx.createMediaStreamSource(stream);
  const analyser = metering.ctx.createAnalyser();
  analyser.fftSize = 512;
  analyser.smoothingTimeConstant = 0.6;
  src.connect(analyser);
  metering.analyser = analyser;
  metering.buf = new Float32Array(analyser.fftSize);

  const tick = () => {
    if (!metering.analyser || !metering.buf) return;
    metering.analyser.getFloatTimeDomainData(metering.buf as Float32Array<ArrayBuffer>);
    let sum = 0;
    for (let i = 0; i < metering.buf.length; i++) sum += metering.buf[i] * metering.buf[i];
    const rms = Math.sqrt(sum / metering.buf.length);
    // perceptual curve: quiet speech should still be visible
    metering.level = Math.min(1, Math.pow(rms * 4.5, 0.6));
    if (metering.level > metering.peaks) metering.peaks = metering.level;
    levelListeners.forEach(fn => fn(metering.level));
    metering.raf = requestAnimationFrame(tick);
  };
  metering.raf = requestAnimationFrame(tick);
}

export function stopMicMetering() {
  if (metering.raf) cancelAnimationFrame(metering.raf);
  metering.raf = null;
  metering.stream?.getTracks().forEach(t => t.stop());
  metering.stream = null;
  metering.ctx?.close().catch(() => {});
  metering.ctx = null;
  metering.analyser = null;
  metering.buf = null;
  metering.level = 0;
  levelListeners.forEach(fn => fn(0));
}

export function getMicLevel(): number {
  return metering.level;
}

// ── UI sounds (original, synthesized) ────────────────────────────────────

let soundCtx: AudioContext | null = null;
let soundEnabled = true;

export function setSoundEnabled(v: boolean) { soundEnabled = v; }
export function isSoundEnabled() { return soundEnabled; }

function ctx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!soundCtx) soundCtx = new AudioContext();
    if (soundCtx.state === 'suspended') soundCtx.resume().catch(() => {});
    return soundCtx;
  } catch { return null; }
}

interface ToneSpec {
  freq: number;
  endFreq?: number;
  dur: number;
  type?: OscillatorType;
  gain?: number;
  delay?: number;
}

function tone({ freq, endFreq, dur, type = 'sine', gain = 0.05, delay = 0 }: ToneSpec) {
  const c = ctx();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (endFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), t0 + dur);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

export const uiSounds = {
  activate: () => { tone({ freq: 520, endFreq: 880, dur: 0.12, gain: 0.04 }); tone({ freq: 880, endFreq: 1320, dur: 0.1, gain: 0.03, delay: 0.1 }); },
  listen: () => { tone({ freq: 660, endFreq: 990, dur: 0.14, gain: 0.035 }); },
  process: () => { tone({ freq: 440, endFreq: 560, dur: 0.1, gain: 0.03, type: 'triangle' }); },
  success: () => { tone({ freq: 660, dur: 0.09, gain: 0.04 }); tone({ freq: 990, dur: 0.12, gain: 0.04, delay: 0.09 }); },
  warn: () => { tone({ freq: 300, dur: 0.16, gain: 0.045, type: 'square' }); },
  error: () => { tone({ freq: 240, endFreq: 180, dur: 0.22, gain: 0.05, type: 'sawtooth' }); },
  wake: () => { tone({ freq: 880, endFreq: 1320, dur: 0.08, gain: 0.035 }); tone({ freq: 1320, endFreq: 880, dur: 0.08, gain: 0.03, delay: 0.08 }); },
};

// ── Speech synthesis (interruptible, provider-shaped) ────────────────────

export interface TTSOptions {
  voiceName?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
}

export interface TTSProvider {
  readonly supported: boolean;
  /** Start speaking; resolves when finished or rejected when interrupted. */
  speak(text: string, opts?: TTSOptions): Promise<void>;
  stop(): void;
}

type TTSListener = (speaking: boolean) => void;
const ttsListeners = new Set<TTSListener>();

export function onTTSStateChange(fn: TTSListener): () => void {
  ttsListeners.add(fn);
  return () => ttsListeners.delete(fn);
}

class WebSpeechTTS implements TTSProvider {
  private current: SpeechSynthesisUtterance | null = null;
  private cancelled = false;

  get supported() {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  get speaking() {
    return this.supported && window.speechSynthesis.speaking;
  }

  speak(text: string, opts: TTSOptions = {}): Promise<void> {
    if (!this.supported) return Promise.reject(new DOMException('Speech synthesis unsupported', 'NotSupportedError'));
    // strip markdown so the voice doesn't read symbols
    const clean = text
      .replace(/```[\s\S]*?```/g, ' code block omitted. ')
      .replace(/[*_`#>[\]()]/g, '')
      .replace(/\n+/g, '. ')
      .trim();
    if (!clean) return Promise.resolve();

    this.stop();
    this.cancelled = false;
    return new Promise((resolve, reject) => {
      const u = new SpeechSynthesisUtterance(clean.slice(0, 1200));
      u.rate = opts.rate ?? 1.02;
      u.pitch = opts.pitch ?? 0.95;
      u.volume = opts.volume ?? 1;
      if (opts.voiceName) {
        const v = window.speechSynthesis.getVoices().find(v => v.name === opts.voiceName);
        if (v) u.voice = v;
      }
      u.onstart = () => ttsListeners.forEach(fn => fn(true));
      u.onend = () => {
        ttsListeners.forEach(fn => fn(false));
        if (!this.cancelled) resolve(); else reject(new DOMException('interrupted', 'AbortError'));
      };
      u.onerror = (e) => {
        ttsListeners.forEach(fn => fn(false));
        if (this.cancelled || e.error === 'interrupted' || e.error === 'canceled') {
          reject(new DOMException('interrupted', 'AbortError'));
        } else {
          reject(new Error(`TTS failed: ${e.error}`));
        }
      };
      this.current = u;
      window.speechSynthesis.speak(u);
    });
  }

  stop() {
    if (!this.supported) return;
    this.cancelled = true;
    if (this.current) {
      this.current.onend = null;
      this.current.onerror = null;
      this.current = null;
    }
    window.speechSynthesis.cancel();
    ttsListeners.forEach(fn => fn(false));
  }
}

export const tts: TTSProvider = new WebSpeechTTS();
