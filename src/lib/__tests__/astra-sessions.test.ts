import { describe, expect, test } from 'bun:test';
import {
  AstraSession, getAstraSessions, saveAstraSession, deleteAstraSession,
  autoTitle, newAstraSessionId, messagesToAstraSession,
} from '../astra-sessions';

// storage.ts guards on typeof window — in bun it writes nothing, so these
// tests exercise the pure logic (title, ordering, shapes). Persistence is
// browser-verified in the preview.

describe('astra sessions', () => {
  test('autoTitle trims and ellipsizes', () => {
    expect(autoTitle('  hello   world  ')).toBe('hello world');
    const long = autoTitle('x'.repeat(80));
    expect(long.length).toBeLessThanOrEqual(43);
    expect(long.endsWith('…')).toBe(true);
    expect(autoTitle('')).toBe('New chat');
  });

  test('session ids are unique', () => {
    expect(newAstraSessionId()).not.toBe(newAstraSessionId());
  });

  test('messagesToAstraSession shapes correctly', () => {
    const s = messagesToAstraSession(
      { id: 's1', title: 'Test chat' },
      [{ id: 'e1', role: 'user', text: 'hi', time: '1pm' }],
      [{ role: 'user', content: 'hi', timestamp: '' }],
    );
    expect(s.title).toBe('Test chat');
    expect(s.entries.length).toBe(1);
    expect(s.context[0].role).toBe('user');
    expect(s.createdAt).toBe(s.updatedAt);
  });

  test('save/delete are safe without DOM storage', () => {
    const s: AstraSession = {
      id: 'sx', title: 'T', createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(), entries: [], context: [],
    };
    expect(() => saveAstraSession(s)).not.toThrow();
    expect(() => deleteAstraSession('sx')).not.toThrow();
    expect(Array.isArray(getAstraSessions())).toBe(true);
  });
});
