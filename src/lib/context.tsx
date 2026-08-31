'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { getSettings, saveSettings, Settings } from './storage';

export type OrbState = 'IDLE' | 'LISTENING' | 'THINKING' | 'SPEAKING' | 'ERROR';

interface Notification {
  id: string;
  title: string;
  body: string;
  type: 'system' | 'jarvis' | 'memory' | 'error';
  timestamp: string;
}

interface AppContextType {
  // Orb
  orbState: OrbState;
  setOrbState: (state: OrbState) => void;
  // Navigation
  currentView: string;
  setCurrentView: (view: string) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  // Voice
  isListening: boolean;
  setIsListening: (listening: boolean) => void;
  voiceSupported: boolean;
  startListening: () => void;
  stopListening: () => void;
  speak: (text: string) => void;
  // Settings
  settings: Settings;
  updateSettings: (updates: Partial<Settings>) => void;
  // Notifications
  notifications: Notification[];
  addNotification: (title: string, body: string, type?: Notification['type']) => void;
  dismissNotification: (id: string) => void;
  // Command Palette
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  // Startup
  startupComplete: boolean;
  setStartupComplete: (complete: boolean) => void;
  // Timers
  activeTimers: { id: string; label: string; remainingMs: number; durationMs: number; running: boolean }[];
  startTimer: (minutes: number, label: string) => void;
  // Reminders
  pendingReminders: { id: string; message: string; triggerAt: string; completed: boolean }[];
  setPendingReminders: React.Dispatch<React.SetStateAction<{ id: string; message: string; triggerAt: string; completed: boolean }[]>>;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [orbState, setOrbState] = useState<OrbState>('IDLE');
  const [currentView, setCurrentView] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [settings, setSettings] = useState<Settings>(getSettings);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [startupComplete, setStartupComplete] = useState(false);
  const [activeTimers, setActiveTimers] = useState<{ id: string; label: string; remainingMs: number; durationMs: number; running: boolean }[]>([]);
  const [pendingReminders, setPendingReminders] = useState<{ id: string; message: string; triggerAt: string; completed: boolean }[]>([]);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  // Check voice support
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      setVoiceSupported(!!SpeechRecognition);
      synthRef.current = window.speechSynthesis;
    }
  }, []);

  // Save settings
  useEffect(() => {
    if (startupComplete) saveSettings(settings);
  }, [settings, startupComplete]);

  // Timer ticks
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTimers(prev =>
        prev.map(t => {
          if (!t.running) return t;
          const next = t.remainingMs - 1000;
          if (next <= 0) {
            addNotification('Timer Complete', `${t.label} has finished!`, 'jarvis');
            return { ...t, remainingMs: 0, running: false };
          }
          return { ...t, remainingMs: next };
        })
      );
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Reminder checks
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setPendingReminders(prev =>
        prev.map(r => {
          if (!r.completed && new Date(r.triggerAt) <= now) {
            addNotification('Reminder', r.message, 'jarvis');
            return { ...r, completed: true };
          }
          return r;
        })
      );
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const addNotification = useCallback((title: string, body: string, type: Notification['type'] = 'system') => {
    const n: Notification = {
      id: crypto.randomUUID(),
      title,
      body,
      type,
      timestamp: new Date().toISOString(),
    };
    setNotifications(prev => [n, ...prev].slice(0, 20));
    setTimeout(() => {
      setNotifications(prev => prev.filter(x => x.id !== n.id));
    }, 6000);
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const speak = useCallback((text: string) => {
    if (!settings.voiceEnabled || !synthRef.current) return;
    synthRef.current.cancel();
    const cleanText = text.replace(/[*_`#>\[\]()]/g, '').replace(/\n+/g, '. ');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    if (settings.voiceName) utterance.voice = synthRef.current.getVoices().find(v => v.name === settings.voiceName) || null;
    utterance.rate = settings.speechRate;
    utterance.pitch = settings.speechPitch;
    utterance.onstart = () => setOrbState('SPEAKING');
    utterance.onend = () => setOrbState('IDLE');
    synthRef.current.speak(utterance);
  }, [settings.voiceEnabled, settings.voiceName, settings.speechRate, settings.speechPitch]);

  const startListening = useCallback(() => {
    if (!voiceSupported) return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = () => {}; // handled externally
    recognition.onend = () => {
      setIsListening(false);
      setOrbState('IDLE');
    };
    recognition.onerror = () => {
      setIsListening(false);
      setOrbState('ERROR');
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
    setOrbState('LISTENING');
  }, [voiceSupported]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
    setOrbState('IDLE');
  }, []);

  const updateSettings = useCallback((updates: Partial<Settings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  }, []);

  const startTimer = useCallback((minutes: number, label: string) => {
    const id = crypto.randomUUID();
    setActiveTimers(prev => [...prev, {
      id,
      label,
      durationMs: minutes * 60 * 1000,
      remainingMs: minutes * 60 * 1000,
      running: true,
    }]);
    addNotification('Timer Set', `${label} — ${minutes} minute${minutes > 1 ? 's' : ''}`, 'system');
  }, [addNotification]);

  return (
    <AppContext.Provider value={{
      orbState, setOrbState,
      currentView, setCurrentView,
      sidebarOpen, setSidebarOpen,
      isListening, setIsListening,
      voiceSupported,
      startListening, stopListening, speak,
      settings, updateSettings,
      notifications, addNotification, dismissNotification,
      commandPaletteOpen, setCommandPaletteOpen,
      startupComplete, setStartupComplete,
      activeTimers, startTimer,
      pendingReminders, setPendingReminders,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
