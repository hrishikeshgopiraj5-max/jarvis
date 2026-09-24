import { describe, expect, test } from 'bun:test';
import { generateSparks, seedFromString } from '../invent';

describe('invention sparks', () => {
  test('generates the requested count', () => {
    const sparks = generateSparks(42, 4);
    expect(sparks.length).toBe(4);
  });

  test('deterministic for the same seed', () => {
    const a = generateSparks(1234, 3);
    const b = generateSparks(1234, 3);
    expect(a.map(s => s.title)).toEqual(b.map(s => s.title));
  });

  test('different seeds give different ideas', () => {
    const a = generateSparks(1, 4).map(s => s.title);
    const b = generateSparks(2, 4).map(s => s.title);
    expect(a).not.toEqual(b);
  });

  test('every spark has a usable brief and components', () => {
    for (const s of generateSparks(7, 6)) {
      expect(s.brief.length).toBeGreaterThan(30);
      expect(s.components.length).toBeGreaterThanOrEqual(2);
      expect(s.cadTemplate.length).toBeGreaterThan(0);
      expect(s.engineeringAngle.length).toBeGreaterThan(10);
    }
  });

  test('seedFromString is stable', () => {
    expect(seedFromString('weather station')).toBe(seedFromString('weather station'));
    expect(seedFromString('weather station')).not.toBe(seedFromString('robot arm'));
  });
});
