import { describe, expect, test } from 'bun:test';
import {
  computeContextMeter, estimateTokens, newLedger, advanceLedger, setStepStatus,
  ledgerSummary, appendWorkingNote, searchWorkingNotes, clearWorkingNotes,
  getWorkingNotes, buildAstraSystemPrompt, ASTRA_MODES, getMode, setNotesBackend,
} from '../astra';

// Notes backend: bun has no localStorage, so use the injectable in-memory store.
function memoryBackend() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); } };
}

// astra.ts uses crypto.randomUUID in appendWorkingNote; Node 19+/Bun provide it globally.
// storage.ts is localStorage-backed — the astra tests below only exercise the pure parts.

describe('astra engine', () => {
  test('mode lineup covers the three tiers and resolves', () => {
    expect(ASTRA_MODES.map(m => m.id)).toEqual(['flash', 'astra', 'pro']);
    expect(getMode('pro').strategy).toBe('triple');
    expect(getMode('flash').strategy).toBe('single');
    expect(getMode('astra').strategy).toBe('dual');
    // Unknown ids fall back to the default balanced mode.
    expect(getMode('nope' as never).id).toBe('astra');
  });

  test('context meter zones and clamping', () => {
    expect(estimateTokens(400)).toBe(100);
    const m1 = computeContextMeter(1000, 1_000_000);
    expect(m1.zone).toBe('safe');
    expect(m1.pct).toBeLessThan(1);

    // 1.2M tokens ≈ 4.8M chars — 40% of a 3M window → elevated zone
    const m2 = computeContextMeter(4_800_000, 3_000_000);
    expect(m2.zone).toBe('elevated');
    expect(m2.pct).toBeCloseTo(40, 5);

    const m3 = computeContextMeter(-5, 1000);
    expect(m3.usedTokens).toBe(0);
    expect(m3.zone).toBe('safe');

    // Never divides by zero
    const m4 = computeContextMeter(100, 0);
    expect(Number.isFinite(m4.pct)).toBe(true);
  });

  test('ledger plan/execute/verify lifecycle', () => {
    let ledger = newLedger([{ label: 'Plan' }, { label: 'Execute' }, { label: 'Verify' }]);
    expect(ledger[0].status).toBe('running');
    expect(ledgerSummary(ledger)).toBe('0/3 steps');

    ledger = advanceLedger(ledger, 0);
    expect(ledger[0].status).toBe('done');
    expect(ledger[1].status).toBe('running');
    expect(ledgerSummary(ledger)).toBe('1/3 steps');

    ledger = setStepStatus(ledger, 2, 'failed', 'aborted');
    expect(ledger[2].status).toBe('failed');
    expect(ledgerSummary(ledger)).toContain('halted');

    // Finishing everything reports all done
    let done = advanceLedger(newLedger([{ label: 'A' }, { label: 'B' }]), 0);
    done = advanceLedger(done, 1);
    expect(ledgerSummary(done)).toBe('2/2 steps');
  });

  test('working notes persist, search, and cap', () => {
    setNotesBackend(memoryBackend());
    clearWorkingNotes();
    expect(getWorkingNotes()).toEqual([]);

    appendWorkingNote('step', 'Set up the harness', 's1');
    appendWorkingNote('finding', 'The bug was in the parser', 's1');
    appendWorkingNote('decision', 'Use token auth over cookies', 's2');

    const notes = getWorkingNotes();
    expect(notes.length).toBe(3);
    expect(notes[0].text).toBe('Set up the harness');

    const hits = searchWorkingNotes('parser');
    expect(hits.length).toBe(1);
    expect(hits[0].kind).toBe('finding');

    // Empty query returns newest first
    const all = searchWorkingNotes('');
    expect(all[0].text).toBe('Use token auth over cookies');

    // Empty notes are refused
    expect(appendWorkingNote('step', '   ', 's1')).toBeNull();
    clearWorkingNotes();
    setNotesBackend(null); // restore browser/localStorage behavior
  });

  test('system prompt adapts to mode and embeds notes', () => {
    const p1 = buildAstraSystemPrompt('flash');
    expect(p1).toContain('ASTRA');
    expect(p1).toContain('Optimize for speed');

    const p2 = buildAstraSystemPrompt('pro');
    expect(p2).toContain('verify your answer');

    const withNotes = buildAstraSystemPrompt('astra', [{
      id: 'n1', ts: new Date().toISOString(), kind: 'decision',
      text: 'Chose the sharded queue', sessionId: 's9',
    }]);
    expect(withNotes).toContain('WORKING NOTES');
    expect(withNotes).toContain('Chose the sharded queue');
  });
});
