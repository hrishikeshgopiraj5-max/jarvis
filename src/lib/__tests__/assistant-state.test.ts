/**
 * Unit tests for the assistant state machine.
 * bun test src/lib/__tests__/assistant-state.test.ts
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { AssistantStateMachine, STATE_LABELS, ERROR_MESSAGES } from '../assistant-state';

describe('AssistantStateMachine completion paths', () => {
  test('allows thinking → success (response with TTS disabled)', () => {
    const m = new AssistantStateMachine();
    m.transition('listening');
    m.transition('processing');
    m.transition('thinking');
    expect(m.transition('success')).toBe(true);
    expect(m.getState()).toBe('success');
  });

  test('allows processing → success (tool result, no TTS)', () => {
    const m = new AssistantStateMachine();
    m.transition('processing');
    expect(m.transition('success')).toBe(true);
  });

  test('success returns to idle via scheduleIdle', () => {
    const m = new AssistantStateMachine();
    m.forceState('success');
    m.scheduleIdle(10);
    return new Promise(r => setTimeout(() => { expect(m.getState()).toBe('idle'); r(null); }, 30));
  });
});

describe('AssistantStateMachine', () => {
  let machine: AssistantStateMachine;

  beforeEach(() => {
    machine = new AssistantStateMachine();
  });

  test('starts idle', () => {
    expect(machine.getState()).toBe('idle');
  });

  test('follows the happy path idle→listening→processing→thinking→speaking→idle', () => {
    expect(machine.transition('listening')).toBe(true);
    expect(machine.transition('processing')).toBe(true);
    expect(machine.transition('thinking')).toBe(true);
    expect(machine.transition('speaking')).toBe(true);
    expect(machine.transition('idle')).toBe(true);
    expect(machine.getState()).toBe('idle');
  });

  test('rejects illegal transitions (no jumping from idle to speaking)', () => {
    expect(machine.transition('speaking')).toBe(false);
    expect(machine.getState()).toBe('idle');
  });

  test('error is reachable from every active state', () => {
    for (const s of ['listening', 'processing', 'thinking', 'planning', 'executing', 'speaking'] as const) {
      machine.forceState(s);
      expect(machine.transition('error')).toBe(true);
      machine.forceState('idle');
    }
  });

  test('notifies state subscribers per transition', () => {
    const seen: string[] = [];
    machine.onState(s => seen.push(s));
    machine.transition('listening');
    machine.transition('idle');
    expect(seen).toEqual(['listening', 'idle']);
  });

  test('emits typed events with state + data', () => {
    let captured: { name: string; data: unknown } | null = null;
    machine.on(e => { captured = { name: e.name, data: e.data }; });
    machine.emit('VOICE_FINAL_TRANSCRIPT', { transcript: 'hello world' });
    expect(captured!.name).toBe('VOICE_FINAL_TRANSCRIPT');
    expect((captured!.data as { transcript?: string }).transcript).toBe('hello world');
  });

  test('listener errors do not break the bus', () => {
    machine.on(() => { throw new Error('bad listener'); });
    let called = false;
    machine.on(() => { called = true; });
    machine.emit('AI_REQUEST_STARTED');
    expect(called).toBe(true);
  });

  test('every state has a label and every error a message', () => {
    for (const s of Object.keys(STATE_LABELS)) {
      expect(typeof STATE_LABELS[s as keyof typeof STATE_LABELS]).toBe('string');
    }
    for (const c of Object.keys(ERROR_MESSAGES)) {
      expect(ERROR_MESSAGES[c as keyof typeof ERROR_MESSAGES].message.length).toBeGreaterThan(10);
    }
  });

  test('scheduleIdle returns to idle after success', async () => {
    machine.forceState('speaking');
    machine.transition('success');
    expect(machine.getState()).toBe('success');
    machine.scheduleIdle(20);
    await new Promise(r => setTimeout(r, 60));
    expect(machine.getState()).toBe('idle');
  });
});
