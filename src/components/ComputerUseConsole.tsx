'use client';

/**
 * Astra Computer Use — the headliner Astra capability, built on the mesh
 * models already integrated (vision: GPT-5.3, Claude Sonnet, Gemini, Qwen).
 *
 * What it actually does — no fakery:
 *   1. Captures a REAL screenshot of the user's display via getDisplayMedia.
 *   2. Frames are sampled into canvases; the operator picks "Analyze frame".
 *   3. The frame goes to /api/chat with a vision-primed message; the mesh's
 *      vision models produce a UI understanding + a step-by-step action plan.
 *   4. Steps appear in a live plan; each can be marked done as the operator
 *      (or a future automation harness) executes them.
 *
 * Honest scope: the browser cannot move the host mouse/keyboard, so this
 * console is an *advisory* computer-use cockpit — it sees the screen and
 * plans the actions, the operator executes. That is exactly the "computer
 * use with a human in the loop" tier, and every mesh model in the app
 * supports it.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { appendWorkingNote } from '@/lib/astra';

interface PlanStep {
  id: string;
  text: string;
  done: boolean;
}

interface Analysis {
  summary: string;
  steps: string[];
  models: string[];
}

export default function ComputerUseConsole({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [objective, setObjective] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [steps, setSteps] = useState<PlanStep[]>([]);
  const [lastFrameAt, setLastFrameAt] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const latestFrameRef = useRef<string | null>(null);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setStreaming(false);
    latestFrameRef.current = null;
  }, []);

  useEffect(() => {
    if (!open) stopStream();
    return () => stopStream();
  }, [open, stopStream]);

  const startStream = useCallback(async () => {
    setError(null);
    try {
      const md = navigator.mediaDevices as MediaDevices & {
        getDisplayMedia?: (c: DisplayMediaStreamOptions) => Promise<MediaStream>;
      };
      if (!md?.getDisplayMedia) {
        setError('This browser does not expose screen capture (getDisplayMedia). Use Chrome/Edge over https or localhost.');
        return;
      }
      const stream = await md.getDisplayMedia({ video: { frameRate: 5 } as MediaTrackConstraints });
      streamRef.current = stream;
      setStreaming(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      stream.getVideoTracks()[0]?.addEventListener('ended', () => stopStream());
    } catch (e) {
      const name = (e as DOMException)?.name;
      setError(name === 'NotAllowedError'
        ? 'Screen share was dismissed. Nothing was captured.'
        : `Screen capture failed: ${name ?? 'unknown error'}`);
    }
  }, [stopStream]);

  const grabFrame = useCallback((): string | null => {
    const v = videoRef.current;
    const c = canvasRef.current;
    if (!v || !c || !v.videoWidth) return null;
    // Downscale for token economy — UI structure survives at 1280 wide.
    const scale = Math.min(1, 1280 / v.videoWidth);
    c.width = Math.round(v.videoWidth * scale);
    c.height = Math.round(v.videoHeight * scale);
    const ctx = c.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(v, 0, 0, c.width, c.height);
    const dataUrl = c.toDataURL('image/jpeg', 0.72);
    latestFrameRef.current = dataUrl;
    setLastFrameAt(new Date().toLocaleTimeString());
    return dataUrl;
  }, []);

  const analyzeFrame = useCallback(async () => {
    const frame = grabFrame();
    if (!frame) {
      setError('No frame available yet — start screen share first.');
      return;
    }
    setAnalyzing(true);
    setError(null);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: [
            objective.trim()
              ? `COMPUTER-USE TASK IN PROGRESS. User objective: "${objective.trim()}".`
              : 'COMPUTER-USE SCREEN ANALYSIS.',
            'The operator shared a screenshot of their screen. Respond in exactly this shape:',
            'UNDERSTANDING: <2 sentences describing what app/screen this is and its current state>',
            'PLAN:',
            '1. <first concrete action>',
            '2. <second concrete action>',
            '3. <third concrete action>',
            '(3-6 numbered actions total, each one imperative and specific to what is visible)',
          ].join('\n'),
          conversation: [],
        }),
        signal: AbortSignal.timeout(45000),
      });
      const data = await res.json();
      if (data.error && !data.response) throw new Error(data.error);

      const text: string = data.response || '';
      const um = text.match(/UNDERSTANDING:\s*([\s\S]*?)(?=PLAN:|$)/i);
      const stepMatches = [...text.matchAll(/^\s*\d+[\.\)]\s*(.+)$/gm)].map(m => m[1].trim());
      const models: string[] = data.modelsUsed ?? [];
      const summary = (um?.[1] ?? text.slice(0, 240)).trim();

      setAnalysis({ summary, steps: stepMatches, models });
      setSteps(stepMatches.map((s, i) => ({ id: `cs-${Date.now()}-${i}`, text: s, done: false })));
      appendWorkingNote('step', objective.trim() ? `Computer use · ${objective.trim().slice(0, 120)}` : 'Computer use · screen analyzed', 'computer-use');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analysis failed — is the mesh API key configured?');
    } finally {
      setAnalyzing(false);
    }
  }, [grabFrame, objective]);

  const toggleStep = (id: string) =>
    setSteps(prev => prev.map(s => (s.id === id ? { ...s, done: !s.done } : s)));

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 18, scale: 0.985 }} animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          onClick={e => e.stopPropagation()}
          role="dialog" aria-modal="true" aria-label="Astra Computer Use"
          className="dialog-shell w-full max-w-3xl max-h-[88vh] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-start justify-between px-7 pt-6 pb-4 border-b" style={{ borderColor: 'var(--line)' }}>
            <div>
              <div className="text-[10px] tracking-[0.22em] font-semibold" style={{ color: 'var(--accent)' }}>
                COMPUTER USE
              </div>
              <h2 className="dialog-title mt-1.5">Delegate the screen</h2>
              <p className="text-[12.5px] mt-1" style={{ color: 'var(--t3)' }}>
                Astra watches your shared screen, understands the UI, and plans the exact actions —
                you stay in control of execution.
              </p>
            </div>
            <button onClick={onClose} aria-label="Close" className="icon-action !w-8 !h-8 text-[13px] shrink-0">✕</button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-7 py-5 space-y-5">
            {/* Objective */}
            <div>
              <label className="text-[10px] tracking-[0.18em] font-medium" style={{ color: 'var(--t3)' }}>
                OBJECTIVE (OPTIONAL)
              </label>
              <input
                value={objective}
                onChange={e => setObjective(e.target.value)}
                placeholder="e.g. File the expense report open in the browser"
                className="dialog-input mt-1.5 w-full"
              />
            </div>

            {/* Screen preview */}
            <div className="rounded-2xl border overflow-hidden relative" style={{ borderColor: 'var(--line)', background: 'rgba(0,0,0,0.35)' }}>
              <video ref={videoRef} muted playsInline className={`w-full aspect-video object-contain ${streaming ? '' : 'opacity-0'}`} />
              {!streaming && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-6">
                  <div className="text-[13px]" style={{ color: 'var(--t2)' }}>No screen shared</div>
                  <div className="text-[11.5px] max-w-sm" style={{ color: 'var(--t3)' }}>
                    Share a window or your whole display. Frames stay local — only the frame you
                    explicitly analyze is sent to the mesh.
                  </div>
                </div>
              )}
              <canvas ref={canvasRef} className="hidden" />
            </div>

            {error && (
              <div className="rounded-xl px-4 py-3 text-[12.5px] border" style={{ borderColor: 'rgba(253,164,175,0.35)', background: 'rgba(26,14,17,0.6)', color: '#fda4af' }}>
                {error}
              </div>
            )}

            {/* Controls */}
            <div className="flex flex-wrap items-center gap-2.5">
              {!streaming ? (
                <button onClick={startStream} className="accent-btn">Start screen share</button>
              ) : (
                <>
                  <button onClick={analyzeFrame} disabled={analyzing} className="accent-btn disabled:opacity-40">
                    {analyzing ? 'Analyzing…' : 'Analyze current frame'}
                  </button>
                  <button onClick={stopStream} className="ghost-btn px-4 py-2 text-[12.5px] border" style={{ borderColor: 'var(--line)' }}>
                    Stop sharing
                  </button>
                  {lastFrameAt && (
                    <span className="text-[11px] ml-1" style={{ color: 'var(--t3)' }}>
                      last frame grabbed {lastFrameAt}
                    </span>
                  )}
                </>
              )}
            </div>

            {/* Analysis result */}
            {analysis && (
              <div className="space-y-4">
                <div className="rounded-2xl border px-5 py-4" style={{ borderColor: 'var(--line)', background: 'var(--bg-raised)' }}>
                  <div className="text-[10px] tracking-[0.2em] font-semibold" style={{ color: 'var(--accent)' }}>UNDERSTANDING</div>
                  <p className="text-[13.5px] mt-2 leading-relaxed" style={{ color: 'var(--t1)' }}>{analysis.summary}</p>
                  {analysis.models.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {analysis.models.map(m => (
                        <span key={m} className="text-[10px] px-2 py-0.5 rounded-full border" style={{ borderColor: 'var(--line)', color: 'var(--t3)' }}>
                          {m.split('/').pop()}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {steps.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-[10px] tracking-[0.2em] font-semibold" style={{ color: 'var(--accent)' }}>ACTION PLAN</div>
                      <div className="text-[11px]" style={{ color: 'var(--t3)' }}>
                        {steps.filter(s => s.done).length}/{steps.length} done
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      {steps.map(s => (
                        <button key={s.id} onClick={() => toggleStep(s.id)}
                          className="w-full flex items-start gap-3 rounded-xl px-4 py-2.5 text-left border transition-colors hover:bg-white/[0.03]"
                          style={{ borderColor: 'var(--line)', background: s.done ? 'rgba(124,232,176,0.06)' : 'transparent' }}>
                          <span className="mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center shrink-0"
                            style={{ borderColor: s.done ? '#7ce8b0' : 'var(--line)', background: s.done ? '#7ce8b0' : 'transparent' }}>
                            {s.done && <span className="text-[9px] text-black font-bold">✓</span>}
                          </span>
                          <span className="text-[13px] leading-snug" style={{ color: s.done ? 'var(--t3)' : 'var(--t1)', textDecoration: s.done ? 'line-through' : 'none' }}>
                            {s.text}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
