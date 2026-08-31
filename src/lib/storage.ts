const PREFIX = 'jarvis_';

function getItem<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function setItem<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch (e) {
    console.error('Storage write failed:', e);
  }
}

function removeItem(key: string): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(PREFIX + key);
}

function clearAll(): void {
  if (typeof window === 'undefined') return;
  const keys = Object.keys(localStorage).filter(k => k.startsWith(PREFIX));
  keys.forEach(k => localStorage.removeItem(k));
}

export const storage = { getItem, setItem, removeItem, clearAll };

// --- Types ---
export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Reminder {
  id: string;
  message: string;
  triggerAt: string;
  completed: boolean;
  createdAt: string;
}

export interface TimerState {
  id: string;
  label: string;
  durationMs: number;
  remainingMs: number;
  running: boolean;
  createdAt: string;
}

export interface Settings {
  voiceEnabled: boolean;
  voiceName: string;
  speechRate: number;
  speechPitch: number;
  autoSpeak: boolean;
  darkMode: boolean;
  accentColor: string;
  animationIntensity: 'low' | 'medium' | 'high';
  reducedMotion: boolean;
  aiModel: string;
  aiTemperature: number;
  openrouterApiKey: string;
  meshStrategy: 'auto' | 'single' | 'dual' | 'triple';
}

// --- Conversation helpers ---
export function getConversations(): Conversation[] {
  return getItem<Conversation[]>('conversations', []);
}

export function saveConversations(convs: Conversation[]) {
  setItem('conversations', convs);
}

export function getConversation(id: string): Conversation | undefined {
  return getConversations().find(c => c.id === id);
}

export function createConversation(title?: string): Conversation {
  const conv: Conversation = {
    id: crypto.randomUUID(),
    title: title || 'New Conversation',
    messages: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const convs = getConversations();
  convs.unshift(conv);
  saveConversations(convs);
  return conv;
}

export function updateConversation(id: string, updates: Partial<Conversation>) {
  const convs = getConversations();
  const idx = convs.findIndex(c => c.id === id);
  if (idx >= 0) {
    convs[idx] = { ...convs[idx], ...updates, updatedAt: new Date().toISOString() };
    saveConversations(convs);
  }
}

export function deleteConversation(id: string) {
  saveConversations(getConversations().filter(c => c.id !== id));
}

// --- Notes helpers ---
export function getNotes(): Note[] {
  return getItem<Note[]>('notes', []);
}

export function saveNotes(notes: Note[]) {
  setItem('notes', notes);
}

export function createNote(title: string, content: string): Note {
  const note: Note = {
    id: crypto.randomUUID(),
    title,
    content,
    pinned: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const notes = getNotes();
  notes.unshift(note);
  saveNotes(notes);
  return note;
}

export function updateNote(id: string, updates: Partial<Note>) {
  const notes = getNotes();
  const idx = notes.findIndex(n => n.id === id);
  if (idx >= 0) {
    notes[idx] = { ...notes[idx], ...updates, updatedAt: new Date().toISOString() };
    saveNotes(notes);
  }
}

export function deleteNote(id: string) {
  saveNotes(getNotes().filter(n => n.id !== id));
}

// --- Reminders ---
export function getReminders(): Reminder[] {
  return getItem<Reminder[]>('reminders', []);
}

export function saveReminders(reminders: Reminder[]) {
  setItem('reminders', reminders);
}

export function createReminder(message: string, triggerAt: string): Reminder {
  const r: Reminder = {
    id: crypto.randomUUID(),
    message,
    triggerAt,
    completed: false,
    createdAt: new Date().toISOString(),
  };
  const reminders = getReminders();
  reminders.push(r);
  saveReminders(reminders);
  return r;
}

// --- Settings ---
const defaultSettings: Settings = {
  voiceEnabled: true,
  voiceName: '',
  speechRate: 1,
  speechPitch: 1,
  autoSpeak: true,
  darkMode: true,
  accentColor: '#00e5ff',
  animationIntensity: 'medium',
  reducedMotion: false,
  aiModel: 'auto',
  aiTemperature: 0.7,
  openrouterApiKey: '',
  meshStrategy: 'auto',
};

export function getSettings(): Settings {
  return getItem<Settings>('settings', defaultSettings);
}

export function saveSettings(settings: Settings) {
  setItem('settings', settings);
}
