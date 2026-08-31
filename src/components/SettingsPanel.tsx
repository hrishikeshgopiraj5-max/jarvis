'use client';

import { useEffect, useState } from 'react';
import { useApp } from '@/lib/context';
import { motion } from 'framer-motion';
import { Settings, Mic, Palette, Brain, Shield, Trash2, Save, Eye, EyeOff, Zap, Network } from 'lucide-react';
import { storage, saveSettings } from '@/lib/storage';
import { getMeshStatus } from '@/lib/ai';

export default function SettingsPanel() {
  const { settings, updateSettings, addNotification } = useApp();
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [showApiKey, setShowApiKey] = useState(false);
  const [meshInfo, setMeshInfo] = useState<any>(null);
  const [testingKey, setTestingKey] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const loadVoices = () => setVoices(window.speechSynthesis.getVoices());
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  useEffect(() => {
    getMeshStatus().then(info => setMeshInfo(info));
  }, []);

  const handleSave = () => {
    saveSettings(settings);
    addNotification('SETTINGS', 'Settings saved successfully. Neural mesh updated.', 'system');
  };

  const handleTestApiKey = async () => {
    if (!settings.openrouterApiKey) {
      addNotification('SETTINGS', 'Please enter an API key first.', 'error');
      return;
    }
    setTestingKey(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Hello, confirm you are online.',
          conversation: [],
          apiKey: settings.openrouterApiKey,
        }),
      });
      const data = await res.json();
      if (data.response && !data.error) {
        addNotification('JARVIS', `Neural mesh online! Strategy: ${data.strategy || 'single'}`, 'jarvis');
      } else {
        addNotification('ERROR', 'API key test failed. Check your key.', 'error');
      }
    } catch {
      addNotification('ERROR', 'Connection failed. Check your network.', 'error');
    }
    setTestingKey(false);
  };

  const handleClearAll = () => {
    storage.clearAll();
    addNotification('SETTINGS', 'All local data cleared.', 'system');
    setTimeout(() => window.location.reload(), 500);
  };

  const Section = ({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) => (
    <div className="bg-black/40 border border-white/10 rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-2 text-cyan-400 text-xs tracking-widest">
        <Icon size={14} /> {title}
      </div>
      {children}
    </div>
  );

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="flex items-center justify-between">
      <label className="text-sm text-gray-300">{label}</label>
      {children}
    </div>
  );

  const Toggle = ({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) => (
    <button
      onClick={() => onChange(!value)}
      className={`w-11 h-6 rounded-full transition-colors relative ${value ? 'bg-cyan-500/30' : 'bg-white/10'}`}
    >
      <div className={`w-5 h-5 rounded-full transition-all absolute top-0.5 ${value ? 'left-[22px] bg-cyan-400' : 'left-0.5 bg-gray-400'}`} />
    </button>
  );

  return (
    <div className="flex flex-col h-full p-6 max-w-3xl mx-auto w-full overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-cyan-400 tracking-wider">SETTINGS</h1>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-3 py-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-cyan-400 text-sm hover:bg-cyan-500/20 transition-colors"
        >
          <Save size={14} /> Save
        </button>
      </div>

      <div className="space-y-6">
        {/* ── NEURAL MESH (AI) ────────────────────────────────── */}
        <Section icon={Network} title="NEURAL MESH — OPENROUTER API">
          <div className="space-y-3">
            <label className="text-sm text-gray-300">API Key</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={settings.openrouterApiKey}
                  onChange={e => updateSettings({ openrouterApiKey: e.target.value })}
                  placeholder="sk-or-v1-..."
                  className="w-full bg-white/5 border border-cyan-500/20 rounded-lg px-4 py-2.5 pr-10 text-sm text-white placeholder-gray-500 outline-none focus:border-cyan-500/50 transition-colors font-mono"
                />
                <button
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-cyan-400 transition-colors"
                >
                  {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <button
                onClick={handleTestApiKey}
                disabled={testingKey || !settings.openrouterApiKey}
                className="px-4 py-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-cyan-400 text-sm hover:bg-cyan-500/20 disabled:opacity-30 transition-colors whitespace-nowrap"
              >
                {testingKey ? '⏳' : '⚡'} Test
              </button>
            </div>
            <div className="text-xs text-gray-500">
              Your key is stored locally in your browser only. Never sent to any server except OpenRouter.
            </div>

            {/* Mesh Status */}
            {meshInfo && (
              <div className="bg-white/5 rounded-lg p-3 space-y-1 mt-2">
                <div className="text-xs text-cyan-400 font-semibold tracking-wider mb-2">MESH STATUS</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="text-gray-400">Total Models:</div>
                  <div className="text-cyan-400 font-mono">{meshInfo.totalModels}</div>
                  <div className="text-gray-400">Providers:</div>
                  <div className="text-cyan-400 font-mono">{meshInfo.uniqueProviders}</div>
                  <div className="text-gray-400">Connections:</div>
                  <div className="text-cyan-400 font-mono">{meshInfo.totalConnections}</div>
                  <div className="text-gray-400">Provider List:</div>
                  <div className="text-gray-300 font-mono text-[10px]">{meshInfo.providers?.join(', ')}</div>
                </div>
              </div>
            )}
          </div>
        </Section>

        {/* ── MESH STRATEGY ───────────────────────────────────── */}
        <Section icon={Zap} title="AGENT STRATEGY">
          <Field label="Mesh Strategy">
            <select
              value={settings.meshStrategy}
              onChange={e => updateSettings({ meshStrategy: e.target.value as any })}
              className="bg-white/5 border border-cyan-500/20 rounded-lg px-3 py-1.5 text-sm text-white outline-none"
            >
              <option value="auto">Auto (Smart Routing)</option>
              <option value="single">Single (Fast)</option>
              <option value="dual">Dual (Primary + Review)</option>
              <option value="triple">Triple (Full Mesh)</option>
            </select>
          </Field>
          <div className="text-xs text-gray-500 bg-white/5 rounded-lg p-3">
            <div className="text-cyan-400/60 font-semibold mb-1">HOW THE SPIDER WEB WORKS:</div>
            <div className="space-y-1 text-gray-400">
              <div>• <strong>Auto</strong> — Jarvis decides how many agents to use based on query complexity</div>
              <div>• <strong>Single</strong> — One fast model (best for simple questions)</div>
              <div>• <strong>Dual</strong> — Primary generates, specialist reviews (balanced)</div>
              <div>• <strong>Triple</strong> — Primary + specialist + critic (maximum accuracy)</div>
            </div>
          </div>
          <div className="flex items-center justify-between mt-2">
            <label className="text-sm text-gray-300">Temperature</label>
            <div className="flex items-center gap-2">
              <input
                type="range" min={0} max={2} step={0.1}
                value={settings.aiTemperature}
                onChange={e => updateSettings({ aiTemperature: parseFloat(e.target.value) })}
                className="w-32 accent-cyan-400"
              />
              <span className="text-xs text-gray-500 w-8 text-right">{settings.aiTemperature}</span>
            </div>
          </div>
        </Section>

        {/* ── VOICE ───────────────────────────────────────────── */}
        <Section icon={Mic} title="VOICE">
          <Field label="Enable Voice">
            <Toggle value={settings.voiceEnabled} onChange={v => updateSettings({ voiceEnabled: v })} />
          </Field>
          <Field label="Auto-speak Responses">
            <Toggle value={settings.autoSpeak} onChange={v => updateSettings({ autoSpeak: v })} />
          </Field>
          <Field label="Speech Rate">
            <input
              type="range" min={0.5} max={2} step={0.1}
              value={settings.speechRate}
              onChange={e => updateSettings({ speechRate: parseFloat(e.target.value) })}
              className="w-32 accent-cyan-400"
            />
            <span className="text-xs text-gray-500 w-8 text-right">{settings.speechRate}x</span>
          </Field>
          <Field label="Speech Pitch">
            <input
              type="range" min={0.5} max={2} step={0.1}
              value={settings.speechPitch}
              onChange={e => updateSettings({ speechPitch: parseFloat(e.target.value) })}
              className="w-32 accent-cyan-400"
            />
            <span className="text-xs text-gray-500 w-8 text-right">{settings.speechPitch}</span>
          </Field>
          {voices.length > 0 && (
            <Field label="Voice">
              <select
                value={settings.voiceName}
                onChange={e => updateSettings({ voiceName: e.target.value })}
                className="bg-white/5 border border-cyan-500/20 rounded-lg px-3 py-1.5 text-sm text-white outline-none w-48"
              >
                <option value="">Default</option>
                {voices.filter(v => v.lang.startsWith('en')).map(v => (
                  <option key={v.name} value={v.name}>{v.name}</option>
                ))}
              </select>
            </Field>
          )}
        </Section>

        {/* ── APPEARANCE ──────────────────────────────────────── */}
        <Section icon={Palette} title="APPEARANCE">
          <Field label="Animation Intensity">
            <select
              value={settings.animationIntensity}
              onChange={e => updateSettings({ animationIntensity: e.target.value as 'low' | 'medium' | 'high' })}
              className="bg-white/5 border border-cyan-500/20 rounded-lg px-3 py-1.5 text-sm text-white outline-none"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </Field>
          <Field label="Reduced Motion">
            <Toggle value={settings.reducedMotion} onChange={v => updateSettings({ reducedMotion: v })} />
          </Field>
          <Field label="Accent Color">
            <div className="flex gap-2">
              {['#00e5ff', '#00ff88', '#ffaa00', '#ff3366', '#8855ff'].map(c => (
                <button
                  key={c}
                  onClick={() => updateSettings({ accentColor: c })}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${
                    settings.accentColor === c ? 'border-white scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </Field>
        </Section>

        {/* ── PRIVACY ─────────────────────────────────────────── */}
        <Section icon={Shield} title="PRIVACY">
          <div className="space-y-2">
            <div className="text-xs text-gray-500 bg-white/5 rounded-lg p-3 mb-3">
              All data is stored locally in your browser. Nothing is sent to any server except OpenRouter (when processing AI queries). Your API key is never stored on any server.
            </div>
            <button
              onClick={() => { localStorage.removeItem('jarvis_conversations'); addNotification('MEMORY', 'Conversations cleared.', 'memory'); }}
              className="w-full flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-300 hover:border-yellow-500/30 hover:text-yellow-400 transition-colors"
            >
              <Trash2 size={14} /> Clear Conversations
            </button>
            <button
              onClick={() => { localStorage.removeItem('jarvis_notes'); addNotification('MEMORY', 'Notes cleared.', 'memory'); }}
              className="w-full flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-300 hover:border-yellow-500/30 hover:text-yellow-400 transition-colors"
            >
              <Trash2 size={14} /> Clear Notes
            </button>
            <button
              onClick={handleClearAll}
              className="w-full flex items-center gap-2 px-4 py-2.5 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400 hover:bg-red-500/20 transition-colors"
            >
              <Trash2 size={14} /> Clear All Local Data
            </button>
          </div>
        </Section>
      </div>
    </div>
  );
}
