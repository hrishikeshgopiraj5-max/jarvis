import { createNote, getNotes, deleteNote, getReminders, createReminder } from './storage';

export interface ParsedCommand {
  type: 'builtin' | 'ai';
  action?: string;
  payload?: string;
  args?: Record<string, string>;
}

const COMMANDS: Record<string, { patterns: RegExp[]; action: string }> = {
  time: {
    patterns: [/\b(what('s| is| are)?\s+)?time\b/i, /current time/i],
    action: 'time',
  },
  date: {
    patterns: [/\b(what('s| is| are)?\s+)?(date|today)\b/i, /current date/i],
    action: 'date',
  },
  timer: {
    patterns: [/timer\s+(\d+)\s*(m|min|s|sec|h|hr|hour)/i, /set\s+timer/i],
    action: 'timer',
  },
  reminder: {
    patterns: [/remind\s+me\s+in\s+(\d+)\s*(m|min|s|sec|h|hr|hour)/i, /set\s+reminder/i],
    action: 'reminder',
  },
  note_create: {
    patterns: [/(create|add|make|new|save)\s+(a\s+)?note/i, /remember\s+that/i, /jot\s+down/i],
    action: 'note_create',
  },
  note_list: {
    patterns: [/(show|view|list|open|read)\s+(my\s+)?notes/i, /my\s+notes/i],
    action: 'note_list',
  },
  note_delete: {
    patterns: [/(delete|remove|clear)\s+(a\s+)?note/i],
    action: 'note_delete',
  },
  search_google: {
    patterns: [/search\s+(google|for|the\s+web)\s+(.+)/i, /google\s+(.+)/i],
    action: 'search_google',
  },
  search_youtube: {
    patterns: [/search\s+youtube\s+(.+)/i, /youtube\s+(.+)/i, /play\s+(.+)/i],
    action: 'search_youtube',
  },
  search_wiki: {
    patterns: [/search\s+wikipedia\s+(.+)/i, /wikipedia\s+(.+)/i, /wiki\s+(.+)/i],
    action: 'search_wiki',
  },
  open_website: {
    patterns: [/(open|go\s+to|launch)\s+(https?:\/\/.+|[\w.]+\.(com|org|net|io|dev))/i],
    action: 'open_website',
  },
  weather: {
    patterns: [/weather\s+(?:in\s+)?(.+)/i, /what('s| is)\s+the\s+weather/i],
    action: 'weather',
  },
  calculate: {
    patterns: [/(calculate|compute|what('s| is)?)\s+(.+)/i, /(\d+[\s]*[\+\-\*\/][\s]*\d+)/],
    action: 'calculate',
  },
  joke: {
    patterns: [/(tell\s+me\s+)?a\s+joke/i, /make\s+me\s+laugh/i],
    action: 'joke',
  },
  theme: {
    patterns: [/(toggle|switch|change)\s+(dark|light)\s*mode/i, /dark\s+mode/i, /light\s+mode/i],
    action: 'theme',
  },
};

export function parseCommand(input: string): ParsedCommand {
  const trimmed = input.trim();
  if (!trimmed) return { type: 'ai' };

  for (const [key, cmd] of Object.entries(COMMANDS)) {
    for (const pattern of cmd.patterns) {
      const match = trimmed.match(pattern);
      if (match) {
        return {
          type: 'builtin',
          action: cmd.action,
          payload: match[1] || trimmed,
          args: { match: match[0] },
        };
      }
    }
  }

  return { type: 'ai', payload: trimmed };
}

export async function executeBuiltinCommand(
  command: ParsedCommand,
  speak: (text: string) => void,
  onTimerSet?: (minutes: number, label: string) => void,
  onReminderSet?: (minutes: number, message: string) => void,
  onThemeToggle?: () => void,
  sendNotification?: (title: string, body: string) => void
): Promise<string> {
  switch (command.action) {
    case 'time': {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
      return `The current time is ${timeStr}.`;
    }

    case 'date': {
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      return `Today is ${dateStr}.`;
    }

    case 'timer': {
      const match = command.args?.match?.match(/(\d+)\s*(m|min|s|sec|h|hr|hour)/i);
      if (match) {
        const value = parseInt(match[1]);
        const unit = match[2].toLowerCase();
        let ms = 0;
        if (unit.startsWith('h')) ms = value * 60 * 60 * 1000;
        else if (unit.startsWith('m')) ms = value * 60 * 1000;
        else ms = value * 1000;
        onTimerSet?.(ms / 60000, `Timer: ${value}${unit}`);
        return `Timer set for ${value} ${unit}. I'll notify you when it's done.`;
      }
      return 'Please specify a duration, e.g., "timer 5 minutes".';
    }

    case 'reminder': {
      const match = command.args?.match?.match(/(\d+)\s*(m|min|s|sec|h|hr|hour)/i);
      if (match) {
        const value = parseInt(match[1]);
        const unit = match[2].toLowerCase();
        const payload = command.payload || 'Reminder';
        const extract = payload.match(/to\s+(.+)/i);
        const message = extract ? extract[1] : payload;
        onReminderSet?.(value * (unit.startsWith('h') ? 60 : 1), message);
        return `Reminder set: "${message}" in ${value} ${unit}.`;
      }
      return 'Please specify when to remind you, e.g., "remind me in 30 minutes to study".';
    }

    case 'note_create': {
      const content = command.payload || 'Untitled note';
      const titleMatch = content.match(/(?:note|about|regarding|that)\s+(.+)/i);
      const title = titleMatch ? titleMatch[1].slice(0, 50) : content.slice(0, 50);
      createNote(title, content);
      return `Note saved: "${title}"`;
    }

    case 'note_list': {
      const notes = getNotes();
      if (notes.length === 0) return 'You have no notes saved.';
      const list = notes
        .slice(0, 10)
        .map((n, i) => `${i + 1}. ${n.title}${n.pinned ? ' 📌' : ''}`)
        .join('\n');
      return `Here are your notes:\n${list}`;
    }

    case 'note_delete': {
      const notes = getNotes();
      if (notes.length === 0) return 'No notes to delete.';
      const last = notes[0];
      deleteNote(last.id);
      return `Deleted note: "${last.title}"`;
    }

    case 'search_google': {
      const q = command.args?.match || command.payload || 'search';
      window.open(`https://www.google.com/search?q=${encodeURIComponent(q)}`, '_blank');
      return `Searching Google for "${q}". I've opened it in a new tab.`;
    }

    case 'search_youtube': {
      const q = command.args?.match || command.payload || 'search';
      window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`, '_blank');
      return `Searching YouTube for "${q}". Opening in a new tab.`;
    }

    case 'search_wiki': {
      const q = command.args?.match || command.payload || 'search';
      window.open(`https://en.wikipedia.org/wiki/${encodeURIComponent(q)}`, '_blank');
      return `Opening Wikipedia for "${q}".`;
    }

    case 'open_website': {
      const url = command.args?.match || '';
      const fullUrl = url.startsWith('http') ? url : `https://${url}`;
      window.open(fullUrl, '_blank');
      return `Opening ${url}.`;
    }

    case 'weather': {
      const city = command.payload?.replace(/weather\s*(in)?\s*/i, '').trim() || '';
      return `Fetching weather data for ${city || 'your location'}...`;
    }

    case 'calculate': {
      const expr = command.payload || '';
      try {
        // Simple safe math evaluation
        const sanitized = expr.replace(/[^0-9+\-*/().%\s]/g, '');
        if (!sanitized) return 'I need a mathematical expression to calculate.';
        // eslint-disable-next-line no-eval
        const result = Function(`"use strict"; return (${sanitized})`)();
        return `${expr} = ${result}`;
      } catch {
        return 'I could not evaluate that expression. Please check the syntax.';
      }
    }

    case 'joke': {
      const jokes = [
        "Why do programmers prefer dark mode? Because light attracts bugs.",
        "I would tell you a UDP joke, but you might not get it.",
        "There are 10 types of people in the world: those who understand binary and those who don't.",
        "Why did the scarecrow win an award? He was outstanding in his field.",
        "A SQL query walks into a bar, sees two tables and asks... Can I join you?",
        "Why do Java developers wear glasses? Because they can't C#.",
        "What's a programmer's favorite hangout place? Foo Bar.",
        "How many programmers does it take to change a light bulb? None, that's a hardware problem.",
      ];
      return jokes[Math.floor(Math.random() * jokes.length)];
    }

    case 'theme': {
      onThemeToggle?.();
      return 'Theme toggled.';
    }

    default:
      return 'Command recognized but not yet implemented.';
  }
}
