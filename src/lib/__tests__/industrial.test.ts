import { describe, it, expect } from 'bun:test';
import {
  industrialValidation,
  costBreakdown,
  manufacturingPlan,
  DUTY_PROFILES,
  type DutyClass,
} from '../industrial';
import { buildFromTemplate } from '../cad';

const enclosure = () => buildFromTemplate('enclosure', {});

const piPower = [
  { component: 'Raspberry Pi 4', voltage: '5', current: '80-240mA', source: 'Buck 5V' },
  { component: 'Servo SG90', voltage: '5', current: '100-500mA', source: '5V rail' },
];

describe('industrial validation', () => {
  it('produces the full check set with electronics', () => {
    const r = industrialValidation({ model: enclosure(), powers: piPower, duty: 'field' });
    const ids = r.checks.map(c => c.id);
    for (const id of ['fatigue', 'buckling', 'shock', 'temp', 'ingress', 'fasteners', 'regulator', 'ripple', 'crate', 'ampacity']) {
      expect(ids).toContain(id);
    }
    expect(r.plan.length).toBeGreaterThanOrEqual(5);
    expect(r.cost.unitTotal).toBeGreaterThan(0);
  });

  it('ratchets severity with duty class', () => {
    const statuses = (d: DutyClass) => industrialValidation({ model: enclosure(), duty: d }).checks
      .filter(c => c.id === 'shock' || c.id === 'fatigue')
      .map(c => c.status);
    const bench = statuses('bench');
    const mil = statuses('mil');
    const rank = { pass: 0, warn: 1, fail: 2 } as const;
    const sum = (arr: Array<'pass' | 'warn' | 'fail'>) => arr.reduce((s, x) => s + rank[x], 0);
    expect(sum(mil)).toBeGreaterThanOrEqual(sum(bench));
    expect(DUTY_PROFILES.mil.shockG).toBeGreaterThan(DUTY_PROFILES.bench.shockG);
  });

  it('flags small plastic enclosure under MIL shock', () => {
    const r = industrialValidation({ model: enclosure(), duty: 'mil' });
    const shock = r.checks.find(c => c.id === 'shock')!;
    expect(shock.status).not.toBe('pass');
  });

  it('cost scales with volume discounts', () => {
    const c = costBreakdown(enclosure(), 25);
    expect(c.at100).toBeLessThan(c.at10);
    expect(c.at10).toBeLessThan(c.unitTotal);
    expect(c.margin50).toBeGreaterThan(c.unitTotal);
  });

  it('adds qualification gate G5 for rugged/mil duty only', () => {
    expect(manufacturingPlan('bench', true).some(p => p.gate === 'G5')).toBe(false);
    expect(manufacturingPlan('mil', true).some(p => p.gate === 'G5')).toBe(true);
  });
});
