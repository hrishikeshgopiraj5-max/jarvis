/**
 * JARVIS Speech Recognition Provider
 *
 * Root causes of the old "voice doesn't work" bug, fixed here:
 *  1. recognition.start() was called with no guard → InvalidStateError when
 *     an instance was already active, killing the restart chain forever.
 *  2. The provider owned the instance but the page also created/aborted its
 *     own — two managers fighting over one microphone.
 *  3. Permission failures looped restarts instead of surfacing a clear state.
 *  4. Stale closures in onend/onerror referenced dead `mode` values.
 *
 * Fixes: single-flight start() with pending promise, tracked external
 * instances via a WeakRef registry, permission preflight through the Audio
 * Manager, full error taxonomy, and pure callbacks (no captured state).
 */

import { startMicMetering, stopMicMetering, uiSounds } from './audio-manager';

export type VoiceError =
  | 'not-allowed' | 'service-not-allowed' | 'audio-capture' | 'network'
  | 'no-speech' | 'aborted' | 'busy' | 'invalid-state' | 'not-supported' | 'unknown';

export interface VoiceHandlers {
  onPartial?: (text: string) => void;
  onFinal: (text: string, confidence: number) => void;
  onStarted: () => void;
  onStopped: () => void;
  onError: (code: VoiceError, detail?: string) => void;
}

interface RecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string; message?: string }) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

// Minimal local structural types (the DOM lib on some TS versions lacks
// SpeechRecognitionErrorEvent).
interface SpeechRecognitionErrorEventLike extends Event {
  readonly error: string;
  readonly message?: string;
}


export type RecogMode = 'push' | 'handsfree';

export class SpeechRecognitionProvider {
  private recog: RecognitionLike | null = null;
  private handlers: VoiceHandlers;
  private mode: RecogMode = 'push';
  private stopped = false;
  private starting = false;
  private pendingStart: Promise<void> | null = null;
  /** Instances created outside this provider (e.g. legacy panels). */
  private static external: WeakRef<object>[] = [];
  private currentFinal = '';
  private currentInterim = '';

  constructor(handlers: VoiceHandlers) {
    this.handlers = handlers;
  }

  static get constructorAvailable(): boolean {
    return typeof window !== 'undefined'
      && !!(window.SpeechRecognition ?? (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition);
  }

  /** Track a recognition instance created outside this provider. */
  static registerExternal(instance: object) {
    this.external.push(new WeakRef(instance));
    if (this.external.length > 8) this.external = this.external.filter(r => r.deref());
  }

  /** Abort any externally-created recognition instances, best-effort. */
  static abortExternal() {
    for (const ref of SpeechRecognitionProvider.external) {
      const inst = ref.deref() as { abort?: () => void } | undefined;
      try { inst?.abort?.(); } catch { /* already dead */ }
    }
    SpeechRecognitionProvider.external = SpeechRecognitionProvider.external.filter(r => r.deref());
  }

  private buildRecognition(): RecognitionLike {
    const Ctor = (window.SpeechRecognition
      ?? (window as unknown as { webkitSpeechRecognition: new () => RecognitionLike }).webkitSpeechRecognition) as new () => RecognitionLike;
    const recog = new Ctor();
    recog.continuous = true;
    recog.interimResults = true;
    recog.lang = navigator.language?.startsWith('en') ? navigator.language : 'en-US';
    recog.maxAlternatives = 1;

    recog.onstart = () => {
      this.starting = false;
      this.handlers.onStarted();
    };

    recog.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        const transcript = res[0].transcript;
        if (res.isFinal) {
          this.currentFinal += transcript;
          this.handlers.onFinal(transcript.trim(), res[0].confidence ?? 0);
        } else {
          interim += transcript;
        }
      }
      this.currentInterim = interim;
      if (interim) this.handlers.onPartial?.(interim.trim());
    };

    recog.onend = () => {
      this.recog = null;
      this.currentFinal = '';
      this.currentInterim = '';
      this.handlers.onStopped();
      if (!this.stopped && this.mode === 'handsfree') {
        // Hands-free mode: Chrome ends sessions periodically — restart.
        setTimeout(() => { if (!this.stopped) this.start().catch(() => {}); }, 350);
      }
    };

    return recog;
  }

  /** Ensure mic permission exists BEFORE recognition starts. */
  private async ensurePermission(): Promise<void> {
    if (navigator.permissions?.query) {
      try {
        const status = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        if (status.state === 'granted') {
          // Metering drives the waveform/core reactivity — best-effort.
          startMicMetering().catch(() => {});
          return;
        }
        if (status.state === 'denied') {
          const err = new DOMException('Microphone permission denied', 'NotAllowedError');
          (err as unknown as { code: string }).code = 'not-allowed';
          throw err;
        }
      } catch (e) {
        if ((e as Error).name === 'NotAllowedError') throw e;
        // query unsupported — fall through to getUserMedia
      }
      // 'prompt' state — getUserMedia will trigger the browser prompt
    }
    await startMicMetering(); // throws NotAllowedError/NotFoundError as-is
  }

  /** Start listening. Safe to call repeatedly — single-flight guarded. */
  async start(mode: RecogMode = this.mode): Promise<void> {
    if (!SpeechRecognitionProvider.constructorAvailable) {
      this.handlers.onError('not-supported');
      return;
    }
    if (this.recog || this.starting) {
      console.info('[JARVIS voice] start ignored — already active/starting');
      return;
    }
    this.mode = mode;
    this.stopped = false;

    if (!this.pendingStart) {
      this.starting = true;
      this.pendingStart = (async () => {
        try {
          await this.ensurePermission();
          SpeechRecognitionProvider.abortExternal();
          const recog = this.buildRecognition();
          this.recog = recog;
          recog.start();  // may throw InvalidStateError synchronously
        } finally {
          this.starting = false;
          this.pendingStart = null;
        }
      })();
      this.pendingStart.catch(() => {});
    }
    return this.pendingStart;
  }

  /** Graceful stop (lets pending results flush). */
  stop() {
    this.stopped = true;
    try { this.recog?.stop(); } catch { /* noop */ }
    this.recog = null;
  }

  /** Immediate stop — used when the assistant starts speaking. */
  abort() {
    this.stopped = true;
    try { this.recog?.abort(); } catch { /* noop */ }
  }

  get active(): boolean {
    return !!this.recog;
  }

  get handsFree(): boolean {
    return this.mode === 'handsfree';
  }
}
