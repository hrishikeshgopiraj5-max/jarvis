/**
 * Unit tests for agent selection and tool routing.
 * bun test src/lib/__tests__/agents-tools.test.ts
 */

import { describe, test, expect } from 'bun:test';
import { selectAgents, agentLabel, AGENT_NODES } from '../agents';
import { findTool, evaluateExpression, TOOLS } from '../tools';

describe('selectAgents', () => {
  test('research query activates WEB + RESEARCH', () => {
    const { primary } = selectAgents('research the latest AI developments');
    expect(primary).toContain('research');
    expect(primary).toContain('web');
  });

  test('coding request activates CODING', () => {
    const { primary } = selectAgents('write code for a python script');
    expect(primary).toContain('coding');
  });

  test('calendar question activates CALENDAR with MEMORY support', () => {
    const result = selectAgents('what do I have tomorrow?');
    expect(result.primary).toContain('calendar');
    expect(result.support).toContain('memory');
  });

  test('casual conversation activates no agents beyond memory standby', () => {
    const { primary } = selectAgents('hello there, how are you today?');
    expect(primary).toEqual([]);
  });

  test('every agent node has id, label and allies', () => {
    for (const node of AGENT_NODES) {
      expect(typeof node.id).toBe('string');
      expect(node.label.length).toBeGreaterThan(2);
      expect(Array.isArray(node.allies)).toBe(true);
    }
  });

  test('agentLabel resolves', () => {
    expect(agentLabel('research')).toBe('RESEARCH');
  });
});

describe('evaluateExpression (safe calculator, no eval)', () => {
  test('basic arithmetic', () => {
    expect(evaluateExpression('2 + 3 * 4')).toBe(14);
    expect(evaluateExpression('10 / 4')).toBe(2.5);
    expect(evaluateExpression('2 ^ 10')).toBe(1024);
  });

  test('parentheses and unary minus', () => {
    expect(evaluateExpression('(2 + 3) * 4')).toBe(20);
    expect(evaluateExpression('-5 + 3')).toBe(-2);
    expect(evaluateExpression('10 * -2')).toBe(-20);
  });

  test('rejects malformed input', () => {
    expect(() => evaluateExpression('2 + +')).toThrow();
    expect(() => evaluateExpression('abc')).toThrow();
  });
});

describe('tool routing', () => {
  test('time questions route to the time tool', () => {
    expect(findTool('what time is it')?.name).toBe('time');
  });

  test('date questions route to the date tool', () => {
    expect(findTool("what's the date today")?.name).toBe('date');
  });

  test('calculation requests route to the calculator', () => {
    expect(findTool('calculate 15 * 3 + 7')?.name).toBe('calculator');
    expect(findTool('what is 12 * 7')?.name).toBe('calculator');
  });

  test('note creation routes to notes tool', () => {
    expect(findTool('create a note about the meeting')?.name).toBe('notes');
  });

  test('reminders route to the reminders tool', () => {
    expect(findTool('remind me in 30 minutes to stretch')?.name).toBe('reminders');
  });

  test('weather routes to weather tool', () => {
    expect(findTool("what's the weather in Tokyo")?.name).toBe('weather');
  });

  test('system status routes to system_status', () => {
    expect(findTool('show system status')?.name).toBe('system_status');
  });

  test('web search routes to web_search', () => {
    expect(findTool('search wikipedia for quantum physics')?.name).toBe('web_search');
  });

  test('normal conversation routes to NO tool (goes to AI)', () => {
    expect(findTool('tell me about the history of computing')).toBeNull();
    expect(findTool('how are you doing today my friend')).toBeNull();
  });

  test('every tool declares risk level and agents', () => {
    for (const tool of TOOLS) {
      expect(['low', 'medium', 'high']).toContain(tool.risk);
      expect(tool.agents.length).toBeGreaterThan(0);
      expect(typeof tool.execute).toBe('function');
    }
  });
});
