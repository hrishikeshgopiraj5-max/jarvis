/**
 * JARVIS Voice Manager
 *
 * Facade over SpeechRecognitionProvider + AudioManager. Owns:
 *  - push-to-talk and hands-free (wake word) modes
 *  - wake-word detection from continuous transcripts
 *  - interruption: TTS is cut the instant the mic hears speech
 *  - self-hearing suppression (don't process JARVIS's own voice)
 *
 * Provider-independent: swap SpeechRecognitionProvider for a realtime
 * WebSocket provider later without touching the UI.
 */

import {
  SpeechRecognitionProvider, RecogMode, VoiceError,
} from './speech-recognition-provider';
import { tts, uiSounds } from './audio-manager';
import { assistantMachine } from './assistant-state';

const WAKE_WORDS = ['astra', 'hey astra', 'ok astra', 'jarvis', 'hey jarvis'];
const SELF_ECHO_SUPPRESS_MS = 1200;

export type HandsFreeStatus = 'off' | 'sleeping' | 'wake_detected' | 'listening';

export interface VoiceManagerHandlers {
  onPartial: (text: string) => void;
  onCommand: (text: string) => void;
  onHandsFreeStatus: (status: HandsFreeStatus) => void;
  onVoiceError: (code: VoiceError, detail?: string) => void;
  onMicLevel: (level: number) => void;
}

export class VoiceManager {
  private provider: SpeechRecognitionProvider;
  private h: VoiceManagerHandlers;
  private handsFree = false;
  private hfStatus: HandsFreeStatus = 'off';
  private mutedUntil = 0;
  private wakeArmed = true;
  private echoTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(handlers: VoiceManagerHandlers) {
    this.h = handlers;
    this.provider = new SpeechRecognitionProvider({
      onStarted: () => {
        assistantMachine.emit('VOICE_STARTED');
      },
      onPartial: (t) => {
        // Any speech while JARVIS speaks = interruption (barge-in).
        if (assistantMachine.getState() === 'speaking') this.interruptSpeech();
        this.h.onPartial(t);
      },
      onFinal: (text) => this.handleFinal(text),
      onStopped: () => {
        this.h.onHandsFreeStatus(this.handsFree ? 'sleeping' : 'off');
      },
      onError: (code, detail) => this.h.onVoiceError(code, detail),
    });
  }

  private handleFinal(text: string) {
    const clean = text.trim();
    if (!clean) return;
    if (Date.now() < this.mutedUntil) return; // self-hearing suppression
    const lower = clean.toLowerCase();

    // Interruption: any speech while JARVIS is speaking cuts the TTS.
    if (assistantMachine.getState() === 'speaking') this.interruptSpeech();

    if (this.handsFree) {
      const wakeHit = WAKE_WORDS.some(w => lower.includes(w));
      if (this.wakeArmed) {
        if (!wakeHit) {
          // Not addressed to us — show a faint transcript, stay sleeping.
          this.h.onPartial(clean);
          setTimeout(() => this.h.onPartial(''), 2500);
          return;
        }
        this.wakeArmed = false;
        this.setHfStatus('wake_detected');
        uiSounds.wake();
        assistantMachine.transition('listening');
        const command = stripWakeWords(clean);
        if (command.length > 3) {
          // command in the same breath as the wake word
          setTimeout(() => this.h.onCommand(command), 250);
        }
        return;
      }
      // Already awake — treat as a command.
      this.h.onCommand(clean);
      return;
    }

    // Push-to-talk: every final result is a command.
    this.h.onCommand(clean);
  }

  /** Cut TTS immediately and re-arm listening. */
  interruptSpeech(): boolean {
    if (assistantMachine.getState() !== 'speaking') return false;
    tts.stop();
    assistantMachine.emit('TTS_STOPPED', { detail: 'interrupted' });
    this.armAfterSpeech();
    return true;
  }

  /** Suppress processing of JARVIS's own TTS picked up by the mic. */
  suppressSelfEcho(ms = SELF_ECHO_SUPPRESS_MS) {
    this.mutedUntil = Date.now() + ms;
  }

  private armAfterSpeech() {
    if (this.echoTimer) clearTimeout(this.echoTimer);
    this.suppressSelfEcho();
    if (this.handsFree) {
      this.wakeArmed = true;
      this.setHfStatus('sleeping');
    } else {
      assistantMachine.transition('listening');
    }
  }

  /** Called by the orchestrator when TTS finishes naturally or is stopped. */
  handleTTSEnd() {
    this.armAfterSpeech();
  }

  private setHfStatus(s: HandsFreeStatus) {
    if (this.hfStatus !== s) {
      this.hfStatus = s;
      this.h.onHandsFreeStatus(s);
    }
  }

  async startPushToTalk(): Promise<void> {
    if (this.handsFree) await this.stopHandsFree();
    await this.provider.start('push');
  }

  stopPushToTalk() {
    this.provider.stop();
  }

  async startHandsFree(): Promise<void> {
    if (this.provider.active) this.provider.stop();
    await this.provider.start('handsfree');
    this.handsFree = true;
    this.wakeArmed = true;
    this.setHfStatus('sleeping');
  }

  async stopHandsFree(): Promise<void> {
    this.handsFree = false;
    this.wakeArmed = true;
    this.setHfStatus('off');
    this.provider.stop();
  }

  get isHandsFree() { return this.handsFree; }
  get hfStatusValue() { return this.hfStatus; }
  get active() { return this.provider.active; }

  dispose() {
    if (this.echoTimer) clearTimeout(this.echoTimer);
    this.provider.abort();
  }
}

export function stripWakeWords(text: string): string {
  return WAKE_WORDS.reduce((acc, w) => acc.replace(new RegExp(w, 'gi'), ''), text).trim();
}
