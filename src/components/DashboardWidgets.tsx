'use client';

import { useState, useEffect } from 'react';
import { useApp } from '@/lib/context';
import { motion } from 'framer-motion';
import {
  Cpu, Mic, Globe, Radio, Clock, Activity, ListTodo, Wifi, WifiOff,
  Network, Zap, Brain, Shield
} from 'lucide-react';
import { getReminders, getSettings } from '@/lib/storage';
import { getMeshStatus } from '@/lib/ai';
import { getMeshInfo, MODEL_MESH } from '@/lib/agent-mesh';

function ClockWidget() {
  const [time, setTime] = useState('');
  const [date, setDate] = useState('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }));
      setDate(now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
    };
    update();
    const i = setInterval(update, 1000);
    return () => clearInterval(i);
  }, []);

  return (
    <div className="bg-black/40 backdrop-blur border border-cyan-500/20 rounded-2xl p-6 col-span-2">
      <div className="flex items-center gap-2 mb-3 text-cyan-400/60 text-xs tracking-widest">
        <Clock size={14} /> LOCAL TIME
      </div>
      <div className="text-4xl font-mono text-white font-light tracking-wider">{time}</div>
      <div className="text-sm text-gray-400 mt-2">{date}</div>
    </div>
  );
}

function SystemStatusWidget() {
  const { voiceSupported, orbState } = useApp();
  const [online, setOnline] = useState(true);
  const [meshOnline, setMeshOnline] = useState(false);
  const settings = getSettings();

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);

  useEffect(() => {
    if (settings.openrouterApiKey) {
      getMeshStatus().then(info => setMeshOnline(!!info && info.status === 'online'));
    }
  }, [settings.openrouterApiKey]);

  const statuses = [
    { label: 'NEURAL CORE', value: 'ONLINE', color: 'text-green-400', icon: Cpu },
    { label: 'AGENT MESH', value: meshOnline ? 'ACTIVE' : 'OFFLINE', color: meshOnline ? 'text-green-400' : 'text-yellow-400', icon: Network },
    { label: 'VOICE ENGINE', value: voiceSupported ? 'READY' : 'UNAVAILABLE', color: voiceSupported ? 'text-green-400' : 'text-yellow-400', icon: Mic },
    { label: 'INTERNET', value: online ? 'CONNECTED' : 'OFFLINE', color: online ? 'text-green-400' : 'text-red-400', icon: online ? Wifi : WifiOff },
    { label: 'AI STATUS', value: orbState === 'IDLE' ? 'STANDBY' : orbState.toUpperCase(), color: orbState === 'ERROR' ? 'text-red-400' : 'text-cyan-400', icon: Radio },
  ];

  return (
    <div className="bg-black/40 backdrop-blur border border-cyan-500/20 rounded-2xl p-6 col-span-1">
      <div className="flex items-center gap-2 mb-4 text-cyan-400/60 text-xs tracking-widest">
        <Activity size={14} /> SYSTEM STATUS
      </div>
      <div className="space-y-3">
        {statuses.map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Icon size={12} />
                {s.label}
              </div>
              <span className={`text-xs font-mono ${s.color}`}>{s.value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TasksWidget() {
  const reminders = getReminders().filter(r => !r.completed).slice(0, 5);

  return (
    <div className="bg-black/40 backdrop-blur border border-cyan-500/20 rounded-2xl p-6 col-span-1">
      <div className="flex items-center gap-2 mb-4 text-cyan-400/60 text-xs tracking-widest">
        <ListTodo size={14} /> UPCOMING TASKS
      </div>
      {reminders.length === 0 ? (
        <p className="text-sm text-gray-500">No pending tasks.</p>
      ) : (
        <div className="space-y-2">
          {reminders.map(r => (
            <div key={r.id} className="flex items-center gap-2 text-sm text-gray-300">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              <span className="truncate">{r.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AIStatusWidget() {
  const { orbState } = useApp();
  const settings = getSettings();
  const meshInfo = getMeshInfo();
  const hasKey = !!settings.openrouterApiKey;

  const lines = [
    { label: 'NEURAL CORE', status: 'ONLINE', color: 'text-green-400' },
    { label: 'VOICE ENGINE', status: 'READY', color: 'text-green-400' },
    { label: 'MEMORY', status: 'ACTIVE', color: 'text-green-400' },
    { label: 'CURRENT MODE', status: orbState.toUpperCase(), color: 'text-cyan-400' },
  ];

  return (
    <div className="bg-black/40 backdrop-blur border border-cyan-500/20 rounded-2xl p-6 col-span-2">
      <div className="flex items-center gap-2 mb-4 text-cyan-400/60 text-xs tracking-widest">
        <Cpu size={14} /> AI CORE STATUS
      </div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        {lines.map(l => (
          <div key={l.label} className="flex flex-col">
            <span className="text-xs text-gray-500">{l.label}</span>
            <span className={`text-sm font-mono ${l.color}`}>{l.status}</span>
          </div>
        ))}
      </div>
      {/* Mesh quick info */}
      <div className="border-t border-cyan-500/10 pt-3 mt-3">
        <div className="flex items-center gap-2 text-xs text-cyan-400/60 mb-2">
          <Network size={10} /> SPIDER WEB MESH
        </div>
        {hasKey ? (
          <div className="flex gap-3 text-xs">
            <span className="text-gray-400">{meshInfo.totalModels} models</span>
            <span className="text-gray-600">·</span>
            <span className="text-gray-400">{meshInfo.uniqueProviders} providers</span>
            <span className="text-gray-600">·</span>
            <span className="text-gray-400">{meshInfo.totalConnections} links</span>
          </div>
        ) : (
          <div className="text-xs text-yellow-400/60">
            Configure API key in Settings to activate
          </div>
        )}
      </div>
    </div>
  );
}

function MeshVisualWidget() {
  const [active, setActive] = useState(false);
  const settings = getSettings();

  useEffect(() => {
    if (settings.openrouterApiKey) {
      getMeshStatus().then(info => setActive(!!info));
    }
  }, [settings.openrouterApiKey]);

  // Show provider badges
  const providers = ['Google', 'Anthropic', 'OpenAI', 'DeepSeek', 'Meta', 'Qwen', 'ByteDance'];

  return (
    <div className="bg-black/40 backdrop-blur border border-cyan-500/20 rounded-2xl p-6 col-span-2">
      <div className="flex items-center gap-2 mb-4 text-cyan-400/60 text-xs tracking-widest">
        <Zap size={14} /> NEURAL AGENT MESH
      </div>
      <div className="flex flex-wrap gap-2">
        {providers.map((p, i) => (
          <motion.div
            key={p}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className={`px-3 py-1 rounded-full text-xs border ${
              active
                ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400'
                : 'border-gray-700 bg-white/5 text-gray-500'
            }`}
          >
            {p}
          </motion.div>
        ))}
      </div>
      {active && (
        <div className="mt-3 text-xs text-gray-500">
          All agents connected in spider-web formation. Every model can communicate with every other model.
          When you ask a question, the mesh routes it through the optimal path of agents.
        </div>
      )}
    </div>
  );
}

function ActivityWidget() {
  const { notifications } = useApp();
  const recent = notifications.slice(0, 8);

  return (
    <div className="bg-black/40 backdrop-blur border border-cyan-500/20 rounded-2xl p-6 col-span-1">
      <div className="flex items-center gap-2 mb-4 text-cyan-400/60 text-xs tracking-widest">
        <Activity size={14} /> RECENT ACTIVITY
      </div>
      {recent.length === 0 ? (
        <p className="text-sm text-gray-500">No recent activity.</p>
      ) : (
        <div className="space-y-2">
          {recent.map(n => (
            <div key={n.id} className="flex items-start gap-2 text-xs">
              <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                n.type === 'error' ? 'bg-red-400' : n.type === 'jarvis' ? 'bg-cyan-400' : 'bg-blue-400'
              }`} />
              <div>
                <span className="text-gray-300">{n.body}</span>
                <span className="text-gray-600 ml-2">{new Date(n.timestamp).toLocaleTimeString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export { ClockWidget, SystemStatusWidget, TasksWidget, AIStatusWidget, ActivityWidget, MeshVisualWidget };
