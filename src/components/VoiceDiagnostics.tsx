'use client';

/**
 * VoiceDiagnostics — one-click answer to "why is voice not working?"
 *
 * Checks, live:
 *   1. SpeechRecognition API present (Chrome/Edge have it; Electron shells
 *      often ship without the Google API key → recognition "starts" but
 *      errors with `network`)
 *   2. Microphone permission (prompted on demand)
 *   3. speechSynthesis + at least one voice
 *   4. Secure context (localhost / https)
 *
 * Each row shows pass/warn/fail and the FIX for failing rows, so voice
 * problems become self-diagnosing instead of silent.
 */

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Mark3D } from './Holo3D';

type RowStatus = 'ok' | 'warn' | 'fail' | 'checking';

interface DiagRow {
  id: string;
  label: string;
  status: RowStatus;
  note: string;
  fix?: string;
}

async function checkMicPermission(): Promise<{ status: RowStatus; note: string; fix?: string }> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(t => t.stop());
    return { status: 'ok', note: 'Microphone accessible' };
  } catch (e: unknown) {
    const err = e as DOMException;
    if (err.name === 'NotAllowedError') {
      return { status: 'fail', note: 'Microphone blocked', fix: 'Click the lock/site icon in the address bar → allow microphone → reload.' };
    }
    return { status: 'fail', note: `No microphone (${err.name})`, fix: 'Connect a microphone or check Windows sound settings.' };
  }
}

export function VoiceDiagnosticsButton({ voiceSupported, ttsSupported }: { voiceSupported: boolean; ttsSupported: boolean }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<DiagRow[] | null>(null);
  const [running, setRunning] = useState(false);

  const run = useCallback(async () => {
    setRunning(true);
    const results: DiagRow[] = [];

    // 1. Secure context
    results.push(window.isSecureContext
      ? { id: 'secure', label: 'Secure context', status: 'ok', note: 'localhost / https' }
      : { id: 'secure', label: 'Secure context', status: 'fail', note: 'Insecure origin', fix: 'Speech APIs require https or localhost. Serve the app over http://localhost.' });

    // 2. Recognition API presence
    const hasRecog = !!(window.SpeechRecognition ?? (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition);
    results.push(hasRecog
      ? { id: 'recog', label: 'Speech recognition API', status: 'ok', note: 'Web Speech available' }
      : { id: 'recog', label: 'Speech recognition API', status: 'fail', note: 'Not available in this browser', fix: 'Use Chrome or Edge. If running inside the Electron desktop app, launch the web version in Chrome — Electron shells usually lack the Google speech key.' });

    // 3. Mic permission (real probe)
    results.push({ id: 'mic', label: 'Microphone', status: 'checking', note: 'Checking…' });
    setRows([...results]);
    const mic = await checkMicPermission();
    results[results.length - 1] = { id: 'mic', label: 'Microphone', ...mic };

    // 4. TTS + voices
    const hasTTS = 'speechSynthesis' in window;
    const voiceCount = hasTTS ? window.speechSynthesis.getVoices().length : 0;
    results.push(
      hasTTS
        ? voiceCount > 0
          ? { id: 'tts', label: 'Speech output', status: 'ok', note: `${voiceCount} voice${voiceCount > 1 ? 's' : ''} installed` }
          : { id: 'tts', label: 'Speech output', status: 'warn', note: 'No system voices found', fix: 'Install a TTS voice (Windows: Settings → Time & Language → Speech → Add voices).' }
        : { id: 'tts', label: 'Speech output', status: 'fail', note: 'speechSynthesis unavailable', fix: 'Use a Chromium-based browser.' },
    );

    // 5. Recognition end-to-end: can it actually start? (catches the Electron
    //    no-API-key case, which only surfaces as an async `network` error)
    if (hasRecog) {
      results.push({ id: 'live', label: 'Recognition session', status: 'checking', note: 'Starting a 5 s test…' });
      setRows([...results]);
      const live = await probeRecognition();
      results[results.length - 1] = {
        id: 'live',
        label: 'Recognition session',
        status: live.ok ? 'ok' : 'fail',
        note: live.ok ? 'Starts and streams' : `Fails: ${live.error}`,
        fix: live.ok ? undefined : live.error === 'network'
          ? 'The speech service was refused — this Chromium build has no speech API key (typical for Electron or offline Chromium). Use regular Chrome/Edge, or configure a local STT provider.'
          : live.error === 'not-allowed'
            ? 'Permission was denied during the test. Allow the microphone and rerun.'
            : 'Retry, or use a standard Chrome/Edge install.',
      };
    }

    setRows(results);
    setRunning(false);
  }, []);

  const dots: Record<RowStatus, string> = {
    ok: '#7ce8b0',
    warn: '#fbbf24',
    fail: '#fda4af',
    checking: 'rgba(255,255,255,0.35)',
  };

  return (
    <>
      <button
        onClick={() => { setOpen(o => !o); if (!rows && !running) run(); }}
        title="Voice diagnostics"
        aria-label="Voice diagnostics"
        className="ghost-btn h-9 w-9"
      >
        <Mark3D kind="ring" size={16} hue={voiceSupported && ttsSupported ? 158 : 8} speed={8} />
      </button>

      {open && (
        <motion.div
          initial={{ opacity: 0, y: -8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.98 }}
          className="absolute right-5 top-14 z-[70] w-[380px] max-w-[92vw] rounded-2xl border p-5"
          style={{ borderColor: 'var(--line-strong)', background: 'rgba(16,16,19,0.97)', backdropFilter: 'blur(28px)', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}
          role="dialog"
          aria-label="Voice diagnostics"
        >
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-[14px] font-semibold" style={{ fontFamily: 'var(--font-display)' }}>Voice diagnostics</div>
              <div className="hud-text text-[9px] mt-0.5">Live capability probe</div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={run} disabled={running} className="ghost-btn px-3 py-1 text-[11px]" style={{ borderColor: 'var(--line)' }}>
                {running ? 'Running…' : 'Re-run'}
              </button>
              <button onClick={() => setOpen(false)} aria-label="Close" className="icon-action !h-7 !w-7 text-[12px]">✕</button>
            </div>
          </div>

          <div className="space-y-2.5">
            {(rows ?? []).map(r => (
              <div key={r.id} className="diag-row rounded-xl border px-3 py-2.5" style={{ borderColor: 'var(--line)' }}>
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: dots[r.status], boxShadow: r.status === 'checking' ? 'none' : `0 0 8px ${dots[r.status]}55`, animation: r.status === 'checking' ? 'holo-pulse 1.2s ease-in-out infinite' : undefined }} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[12px] font-medium text-[color:var(--t1)]/90">{r.label}</span>
                    <span className={`text-[10.5px] ${r.status === 'ok' ? 'diag-ok' : r.status === 'warn' ? 'diag-warn' : r.status === 'fail' ? 'diag-fail' : 'text-[color:var(--t3)]'}`}>
                      {r.note}
                    </span>
                  </div>
                  {r.fix && <p className="mt-1 text-[10.5px] leading-relaxed text-[color:var(--t2)]">Fix: {r.fix}</p>}
                </div>
              </div>
            ))}
            {!rows && !running && <p className="text-[12px] text-[color:var(--t3)]">Press Re-run to probe.</p>}
          </div>

          <p className="mt-4 border-t pt-3 text-[10px] leading-relaxed text-white/25" style={{ borderColor: 'var(--line)' }}>
            Voice input uses your browser&#39;s speech service (Chrome/Edge). Speech output uses installed system voices.
          </p>
        </motion.div>
      )}
    </>
  );
}

/** Start a real recognition session and see if it comes up (or how it fails). */
function probeRecognition(): Promise<{ ok: boolean; error?: string }> {
  return new Promise(resolve => {
    const w = window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) return resolve({ ok: false, error: 'unsupported' });
    const r = new Ctor();
    let settled = false;
    const done = (res: { ok: boolean; error?: string }) => {
      if (settled) return;
      settled = true;
      try { r.abort(); } catch { /* dead */ }
      resolve(res);
    };
    const timer = setTimeout(() => done({ ok: true }), 4000); // stayed up 4s → service works
    r.onstart = () => { /* wait out the timer — onstart alone doesn't prove the service responded */ };
    r.onerror = (ev: { error: string }) => {
      clearTimeout(timer);
      done({ ok: false, error: ev.error });
    };
    try {
      r.lang = 'en-US';
      r.continuous = false;
      r.interimResults = false;
      r.start();
    } catch (e) {
      clearTimeout(timer);
      done({ ok: false, error: (e as Error).message });
    }
  });
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  abort(): void;
  onstart: (() => void) | null;
  onerror: ((ev: { error: string }) => void) | null;
}
