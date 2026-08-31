'use client';

import { useState, useEffect, useRef } from 'react';
import { useApp } from '@/lib/context';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Cpu, Mic, MessageSquare, StickyNote, Clock, Settings, Trash2,
  Search, ArrowRight
} from 'lucide-react';

interface PaletteCommand {
  id: string;
  label: string;
  description: string;
  icon: (props: { size?: number; className?: string }) => JSX.Element;
  action: () => void;
}

export default function CommandPalette() {
  const { commandPaletteOpen, setCommandPaletteOpen, setCurrentView, addNotification } = useApp();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands: PaletteCommand[] = [
    { id: 'chat', label: 'Ask JARVIS', description: 'Open the chat interface', icon: MessageSquare, action: () => { setCurrentView('chat'); setCommandPaletteOpen(false); } },
    { id: 'voice', label: 'Start Voice Mode', description: 'Activate the voice assistant', icon: Mic, action: () => { setCurrentView('voice'); setCommandPaletteOpen(false); } },
    { id: 'new-conv', label: 'New Conversation', description: 'Start a fresh conversation', icon: Cpu, action: () => { setCurrentView('chat'); setCommandPaletteOpen(false); } },
    { id: 'notes', label: 'Create Note', description: 'Open the notes panel', icon: StickyNote, action: () => { setCurrentView('notes'); setCommandPaletteOpen(false); } },
    { id: 'timer', label: 'Set Timer', description: 'Open the tasks panel', icon: Clock, action: () => { setCurrentView('tasks'); setCommandPaletteOpen(false); } },
    { id: 'settings', label: 'Open Settings', description: 'Configure JARVIS', icon: Settings, action: () => { setCurrentView('settings'); setCommandPaletteOpen(false); } },
    { id: 'clear', label: 'Clear Memory', description: 'Clear all local data', icon: Trash2, action: () => { localStorage.clear(); addNotification('SYSTEM', 'All local data cleared.', 'system'); setCommandPaletteOpen(false); } },
  ];

  const filtered = commands.filter(c =>
    c.label.toLowerCase().includes(query.toLowerCase()) ||
    c.description.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (commandPaletteOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [commandPaletteOpen]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(!commandPaletteOpen);
      }
      if (e.key === 'Escape' && commandPaletteOpen) {
        setCommandPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [commandPaletteOpen, setCommandPaletteOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && filtered[selectedIndex]) {
      filtered[selectedIndex].action();
    }
  };

  return (
    <AnimatePresence>
      {commandPaletteOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-start justify-center pt-[20vh]"
          onClick={() => setCommandPaletteOpen(false)}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-lg mx-4 bg-black/90 border border-cyan-500/30 rounded-2xl shadow-2xl shadow-cyan-500/10 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-cyan-500/20">
              <Search size={18} className="text-cyan-400" />
              <span className="text-xs text-cyan-400/60 tracking-widest font-medium">JARVIS COMMAND CENTER</span>
            </div>

            {/* Input */}
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search commands..."
              className="w-full bg-transparent px-4 py-3 text-white text-sm outline-none placeholder-gray-500"
            />

            {/* Commands */}
            <div className="max-h-72 overflow-y-auto border-t border-cyan-500/10">
              {filtered.map((cmd, idx) => {
                const Icon = cmd.icon;
                return (
                  <button
                    key={cmd.id}
                    onClick={cmd.action}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                      idx === selectedIndex
                        ? 'bg-cyan-500/10 text-cyan-400'
                        : 'text-gray-400 hover:bg-white/5'
                    }`}
                  >
                    <Icon size={16} className="shrink-0" />
                    <div className="flex-1">
                      <div className="text-sm font-medium">{cmd.label}</div>
                      <div className="text-xs opacity-60">{cmd.description}</div>
                    </div>
                    <ArrowRight size={14} className="opacity-40" />
                  </button>
                );
              })}
              {filtered.length === 0 && (
                <div className="px-4 py-6 text-center text-gray-500 text-sm">No matching commands</div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t border-cyan-500/10 flex gap-4 text-xs text-gray-500">
              <span>↑↓ Navigate</span>
              <span>↵ Select</span>
              <span>Esc Close</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
