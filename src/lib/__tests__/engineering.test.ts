import { describe, it, expect } from 'bun:test';
import {
  validateBuild,
  estimateHeat,
  recommendMaterial,
  parseCurrentAmps,
  type PowerRow,
} from '../engineering';
import { buildFromTemplate } from '../cad';

const enclosure = () => buildFromTemplate('enclosure', {});

const noPower: PowerRow[] = [];

const piPower: PowerRow[] = [
  { component: 'Raspberry Pi 4', voltage: '5', current: '3', source: 'USB-C' },
  { component: 'Servo SG90', voltage: '5', current: '0.8', source: '5V rail' },
];

describe('engineering validation', () => {
  it('estimates heat from power rows using component hints', () => {
    const heat = estimateHeat(piPower);
    // Pi contributes absolute 4.5W; servo 5V*0.8A*0.85
    expect(heat).toBeGreaterThan(4.5);
    expect(heat).toBeLessThan(10);
  });

  it('runs structural, thermal and print checks without power info', () => {
    const report = validateBuild({ model: enclosure(), powers: noPower });
    const domains = report.checks.map(c => c.domain);
    expect(domains).toContain('structural');
    expect(domains).toContain('thermal');
    expect(domains).toContain('print');
    expect(domains).not.toContain('electrical');
    expect(report.checks.every(c => ['pass', 'warn', 'fail'].includes(c.status))).toBe(true);
    expect(report.headline.length).toBeGreaterThan(3);
  });

  it('adds electrical and battery checks when power rows exist', () => {
    const report = validateBuild({ model: enclosure(), powers: piPower });
    const domains = report.checks.map(c => c.domain);
    expect(domains).toContain('electrical');
    expect(domains).toContain('battery');
    const batt = report.checks.find(c => c.domain === 'battery')!;
    // 5*3 + 5*0.8 = 19W → 9.25Wh pack < 1h → fail
    expect(batt.status).toBe('fail');
    expect(batt.value).toMatch(/min/);
  });

  it('flags a low-draw build as passing battery runtime', () => {
    const low: PowerRow[] = [{ component: 'ESP32', voltage: '3.3', current: '0.15', source: 'LDO' }];
    const report = validateBuild({ model: enclosure(), powers: low });
    const batt = report.checks.find(c => c.domain === 'battery')!;
    expect(['pass', 'warn']).toContain(batt.status);
  });

  it('recommends aluminium for hot builds and long spans', () => {
    expect(recommendMaterial(12, 100).id).toBe('aluminium');
    expect(recommendMaterial(2, 500).id).toBe('carbon_fiber');
    expect(recommendMaterial(2, 100).id).toBe('petg');
  });

  it('parses the hardware engine\'s current formats correctly', () => {
    expect(parseCurrentAmps('80-240mA')).toBeCloseTo(0.24, 5);
    expect(parseCurrentAmps('0.1-5mA')).toBeCloseTo(0.005, 5);
    expect(parseCurrentAmps('500mA')).toBeCloseTo(0.5, 5);
    expect(parseCurrentAmps('1.5A')).toBeCloseTo(1.5, 5);
    expect(parseCurrentAmps('3')).toBeCloseTo(3, 5);
    expect(parseCurrentAmps('N/A')).toBe(0);
  });

  it('thermal check warns on high heat with small enclosure', () => {
    // 19W into a small PLA enclosure should not pass silently
    const report = validateBuild({ model: enclosure(), powers: piPower });
    const therm = report.checks.find(c => c.domain === 'thermal')!;
    expect(therm.status).not.toBe('pass');
  });
});
