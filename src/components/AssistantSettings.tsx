'use client';

/**
 * Assistant Settings panel — voice, sound, motion, privacy, memory controls.
 * Persisted through the same Settings storage the rest of the app uses.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAssistant } from '@/lib/assistant-provider';
import { tts } from '@/lib/audio-manager';
import { getVoicesSync, loadVoices } from '@/lib/voice-settings';
import { clearDeniedHistory } from '@/lib/permissions';

interface Props { open: boolean; onClose: () => void }

export default function AssistantSettings({ open, onClose }: Props) {
  const { settings, updateSettings, clearConversation } = useAssistant();
  const [voices, setVoices] = useState(getVoicesSync);
  useEffect(() => { loadVoices().then(setVoices); }, []);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[75] flex items-center justify-center p-4"
          style={{ background: 'rgba(2,4,8,0.85)' }}
          onClick={e => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            initial={{ scale: 0.97, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.97, opacity: 0 }}
            className="dialog-shell w-full max-w-lg max-h-[84vh] overflow-y-auto"
            role="dialog" aria-modal="true" aria-label="Assistant settings"
          >
            <div className="dialog-head">
              <div>
                <div className="dialog-eyebrow">Preferences · local only</div>
                <div className="dialog-title mt-1">Settings</div>
              </div>
              <button onClick={onClose} className="dialog-close" aria-label="Close settings">
                ✕
              </button>
            </div>
            <div className="p-6">

            {/* Voice output */}
            <Section title="VOICE OUTPUT">
              <Toggle
                label="Speak responses aloud"
                checked={settings.autoSpeak !== false}
                onChange={v => updateSettings({ autoSpeak: v })}
              />
              {tts.supported && (
                <>
                  <Select
                    label="Voice"
                    value={settings.voiceName}
                    onChange={v => updateSettings({ voiceName: v })}
                    options={[{ value: '', label: 'System default' }, ...voices.map(v => ({ value: v.name, label: v.name }))]}
                  />
                  <Range label="Speech rate" min={0.6} max={1.6} step={0.05} value={settings.speechRate} onChange={v => updateSettings({ speechRate: v })} format={v => `${v.toFixed(2)}×`} />
                  <Range label="Pitch" min={0.5} max={1.5} step={0.05} value={settings.speechPitch} onChange={v => updateSettings({ speechPitch: v })} format={v => v.toFixed(2)} />
                </>
              )}
            </Section>

            {/* Sound + motion */}
            <Section title="FEEDBACK">
              <Toggle label="Interface sounds" checked={settings.soundEffects !== false} onChange={v => updateSettings({ soundEffects: v })} />
              <Toggle
                label="Respect reduced motion"
                checked={settings.reducedMotion === true}
                onChange={v => {
                  updateSettings({ reducedMotion: v });
                  if (typeof window !== 'undefined') {
                    document.documentElement.dataset.reducedMotion = v ? 'true' : 'false';
                  }
                }}
              />
            </Section>

            {/* Memory & privacy */}
            <Section title="MEMORY &amp; PRIVACY">
              <p className="text-[11.5px] leading-relaxed text-[color:var(--t2)] mb-3">
                Conversation history, notes, and reminders are stored locally in your browser only.
                Nothing is uploaded except the text of AI requests.
              </p>
              <button
                onClick={() => clearConversation()}
                className="pill-btn w-full"
              >
                Clear conversation history
              </button>
              <button
                onClick={() => { clearDeniedHistory(); }}
                className="pill-btn mt-2 w-full"
              >
                Reset tool permission denials
              </button>
            </Section>

            <div className="dialog-sub mt-4 pb-1 text-center">
              Neural mesh API key is stored server-side in .env.local — never in the browser
            </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <div className="field-label mb-2.5">{title}</div>
      <div className="space-y-2.5">{children}</div>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between group">
      <span className="text-[12.5px] text-[color:var(--t2)] transition group-hover:text-[color:var(--t1)]">{label}</span>
      <button
        role="switch" aria-checked={checked} aria-label={label}
        onClick={() => onChange(!checked)}
        className="relative h-[22px] w-10 rounded-full border transition-colors"
        style={{
          background: checked ? 'rgba(212, 165, 116, 0.35)' : 'rgba(255,255,255,0.06)',
          borderColor: checked ? 'rgba(212, 165, 116, 0.6)' : 'var(--line)',
        }}
      >
        <span
          className="absolute top-[2px] h-4 w-4 rounded-full transition-all"
          style={{
            left: checked ? '21px' : '3px',
            background: checked ? '#e2b98c' : 'rgba(240,238,232,0.55)',
          }}
        />
      </button>
    </label>
  );
}

function Range({ label, min, max, step, value, onChange, format }: {
  label: string; min: number; max: number; step: number; value: number;
  onChange: (v: number) => void; format?: (v: number) => string;
}) {
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-[11.5px]">
        <span className="text-[color:var(--t2)]">{label}</span>
        <span className="font-mono text-[color:var(--t1)]">{format ? format(value) : value}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="studio-range w-full" aria-label={label}
      />
    </div>
  );
}

function Select({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11.5px] text-[color:var(--t2)]">{label}</span>
      <select
        value={value} onChange={e => onChange(e.target.value)} aria-label={label}
        className="w-full rounded-xl border bg-white/[0.03] px-2.5 py-2 text-[12px] text-[color:var(--t1)] focus:outline-none"
        style={{ borderColor: 'var(--line)' }}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}
