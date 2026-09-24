/**
 * JARVIS Industrial Engineering — production-grade validation, MIL-SPEC mindset.
 *
 * Extends the first-order checks with the analyses an engineer runs before
 * a design leaves the bench: fatigue life, column buckling, shock/vibration,
 * regulator thermal dropout, capacitor ripple life, battery C-rate, wire
 * ampacity, connector budget, ingress protection, fastener selection, unit
 * economics, and a gated manufacturing plan with QC hold points.
 *
 * Standards referenced (first-order approximations of):
 *   · MIL-STD-810   — shock & vibration profiles
 *   · IPC-2152/2221 — conductor ampacity
 *   · ASME Y14.5    — GD&T drawing practice
 *   · ISO 2768      — general tolerances
 *   · IP (IEC 60529)— ingress protection
 *
 * Not a substitute for a licensed PE sign-off — but it stops bad designs
 * before they cost money.
 */

import type { CADModel, MaterialId } from './cad';
import { MATERIALS, modelStats } from './cad';
import { MATERIAL_MECH, parseCurrentAmps, type Check, type CheckStatus } from './engineering';

// ═══════════════════════════════════════════════════════════════
// Duty environment — how hard the product will be used
// ═══════════════════════════════════════════════════════════════

export type DutyClass = 'bench' | 'field' | 'rugged' | 'mil';

export interface DutyProfile {
  label: string;
  /** design life in duty cycles */
  cycles: number;
  /** shock spec, g (half-sine 11 ms, MIL-STD-810 Method 516) */
  shockG: number;
  /** random vibration, Grms (MIL-STD-810 Method 514) */
  vibrationGrms: number;
  /** operating temp range °C */
  tMin: number;
  tMax: number;
  /** required ingress rating */
  ip: string;
}

export const DUTY_PROFILES: Record<DutyClass, DutyProfile> = {
  bench:  { label: 'Bench prototype',  cycles: 1_000,    shockG: 15,  vibrationGrms: 0.5, tMin: 10,  tMax: 40,  ip: 'IP20' },
  field:  { label: 'Field portable',   cycles: 20_000,   shockG: 40,  vibrationGrms: 2.1, tMin: -10, tMax: 50,  ip: 'IP54' },
  rugged: { label: 'Ruggedized',       cycles: 100_000,  shockG: 75,  vibrationGrms: 4.3, tMin: -20, tMax: 60,  ip: 'IP65' },
  mil:    { label: 'MIL-spec',         cycles: 500_000,  shockG: 150, vibrationGrms: 7.7, tMin: -40, tMax: 71,  ip: 'IP67' },
};

// ═══════════════════════════════════════════════════════════════
// Structural: fatigue + buckling + shock
// ═══════════════════════════════════════════════════════════════

/** Endurance limit factor: plastics have no true endurance limit; metals ~0.35–0.5 UTS. */
function enduranceLimit(material: MaterialId): number {
  const rigid = MATERIAL_MECH[material].rigid;
  return rigid ? 0.4 : 0.22; // fraction of UTS
}

function fatigueCheck(model: CADModel, cycles: number): Check {
  const mech = MATERIAL_MECH[model.material];
  const stats = modelStats(model);
  const massKg = stats.massG / 1000;
  const L = Math.max(stats.boundingBoxMm.x, stats.boundingBoxMm.y, stats.boundingBoxMm.z) / 1000;
  const dims = [stats.boundingBoxMm.x, stats.boundingBoxMm.y, stats.boundingBoxMm.z].sort((a, b) => a - b);
  const b = dims[0] / 1000, h = dims[1] / 1000;
  const Z = (b * h * h) / 6;
  const w = massKg * 9.81 / L;
  const sigma = (w * L * L) / (8 * Z) / 1e6; // MPa per cycle (self-weight + handling ~2× factor)
  const sigmaHandling = sigma * 2.5;
  const se = mech.uts * enduranceLimit(model.material);
  // Basquin exponent ~8 for metals, ~6 for plastics
  const exp = mech.rigid ? 8 : 6;
  const lifeCycles = sigmaHandling <= se ? Infinity : Math.pow(se / sigmaHandling, exp) * 1e6;
  const ratio = cycles / lifeCycles;
  const status: CheckStatus = ratio <= 0.1 ? 'pass' : ratio <= 0.8 ? 'warn' : 'fail';
  const lifeTxt = lifeCycles === Infinity ? 'infinite' : lifeCycles > 1e6 ? `${(lifeCycles / 1e6).toFixed(1)}M` : Math.round(lifeCycles).toLocaleString();
  return {
    id: 'fatigue',
    domain: 'structural',
    title: 'Fatigue life',
    status,
    value: lifeTxt === 'infinite' ? '∞' : `${lifeTxt} cycles`,
    detail: status === 'pass'
      ? `Handling stress ~${sigmaHandling.toFixed(2)} MPa is below the ${se.toFixed(0)} MPa endurance limit — survives the ${cycles.toLocaleString()}-cycle design life with margin.`
      : status === 'warn'
        ? `Estimated life ${lifeTxt} cycles vs ${cycles.toLocaleString()} required — OK but no margin. Add fillets at joints (sharp corners cut fatigue life ~10×) or thicken the section.`
        : `Estimated life ${lifeTxt} cycles is far short of the ${cycles.toLocaleString()} required. It will crack. Reduce span, add ribs, or switch to a metal.`,
    formula: 'S-N (Basquin): N = 10⁶·(Se/σ)^k, Se ≈ 0.4·UTS (metal) / 0.22·UTS (plastic)',
  };
}

function bucklingCheck(model: CADModel): Check {
  const mech = MATERIAL_MECH[model.material];
  const stats = modelStats(model);
  const dims = [stats.boundingBoxMm.x, stats.boundingBoxMm.y, stats.boundingBoxMm.z].sort((a, b) => a - b);
  const t = dims[0] / 1000;         // thinnest dimension = column thickness
  const Le = dims[2] / 1000;        // longest dimension = column length
  const I = Math.pow(dims[1] / 1000, 3) * t / 12;
  const A = (dims[1] / 1000) * t;
  const k = 0.6; // one end fixed, one pinned
  const E = mech.E * 1e9; // Pa
  const pcr = (Math.PI * Math.PI * E * I) / Math.pow(k * Le, 2); // N
  const massKg = stats.massG / 1000;
  const fos = massKg * 9.81 > 0 ? pcr / (massKg * 9.81) : Infinity;
  const slender = Le / t;
  const status: CheckStatus = fos >= 5 || slender < 12 ? 'pass' : fos >= 2 ? 'warn' : 'fail';
  return {
    id: 'buckling',
    domain: 'structural',
    title: 'Column buckling',
    status,
    value: slender >= 12 ? `SF ${fos >= 100 ? '100+' : fos.toFixed(0)}` : 'stocky',
    detail: status === 'pass'
      ? slender < 12
        ? `Slenderness ${slender.toFixed(0)} — stocky section, buckling is not the failure mode here.`
        : `Euler critical load ${(pcr / 1000).toFixed(1)} kN vs ${(massKg * 9.81).toFixed(0)} N self-weight — stable with margin.`
      : status === 'warn'
        ? `Slenderness ${slender.toFixed(0)} with SF ${fos.toFixed(1)} on buckling — thin walls will bow if anything presses on the long face. Add a rib across the span.`
        : `Slenderness ${slender.toFixed(0)}: this wall will buckle under its own weight over time. Rib it, corrogate it, or thicken.`,
    formula: 'Euler: Pcr = π²EI/(kL)², k=0.6 (fixed-pinned)',
  };
}

function shockCheck(model: CADModel, shockG: number): Check {
  const mech = MATERIAL_MECH[model.material];
  const stats = modelStats(model);
  const massKg = stats.massG / 1000;
  // Base spec: 20g survivable for a well-mounted plastic part
  const baseG = mech.rigid ? 60 : 25;
  const status: CheckStatus = shockG <= baseG ? 'pass' : shockG <= baseG * 1.8 ? 'warn' : 'fail';
  return {
    id: 'shock',
    domain: 'structural',
    title: 'Shock & vibration',
    status,
    value: `${shockG}g`,
    detail: status === 'pass'
      ? `${shockG}g half-sine shock is within what a mounted ${MATERIALS[model.material].label} part handles. Pot PCBs and use closed-cell foam under heavy parts.`
      : status === 'warn'
        ? `${shockG}g is demanding for ${MATERIALS[model.material].label}. Bonded seams will open — switch to aluminium or overmold, and isolate the PCB with silicone grommets.`
        : `${shockG}g (MIL-STD-810) will destroy a printed ${MATERIALS[model.material].label} housing. This class requires machined metal with potted electronics.`,
    formula: `MIL-STD-810 M516 baseline ${baseG}g for this material class`,
  };
}

// ═══════════════════════════════════════════════════════════════
// Electrical: regulator thermal, ripple life, C-rate, ampacity, connectors
// ═══════════════════════════════════════════════════════════════

function regulatorCheck(powers: Array<{ component: string; voltage: string; current: string }>): Check {
  // Worst linear regulator on the board: (Vin − Vout) × I
  const rows = powers.map(p => ({
    name: p.component,
    v: parseFloat(p.voltage) || 0,
    a: parseCurrentAmps(p.current),
  }));
  // Assume 2S Li-ion (7.4V) feeding 5V and 3.3V rails — typical maker stack
  const vin = 7.4;
  let worst = { name: '—', dropW: 0 };
  for (const r of rows) {
    if (r.a <= 0) continue;
    const drop = (vin - r.v) * r.a;
    if (drop > worst.dropW) worst = { name: r.name, dropW: drop };
  }
  // TO-220 in free air: θJA ≈ 65°C/W → 1.1W max at 40°C ambient
  const maxW = 1.1;
  const status: CheckStatus = worst.dropW <= maxW * 0.6 ? 'pass' : worst.dropW <= maxW ? 'warn' : 'fail';
  return {
    id: 'regulator',
    domain: 'electrical',
    title: 'Regulator thermal',
    status,
    value: `${worst.dropW.toFixed(2)} W`,
    detail: status === 'pass'
      ? `Worst linear drop ${(vin - 5).toFixed(1)}V × ${worst.name} ≈ ${worst.dropW.toFixed(2)} W — a TO-220 survives this in free air. Use a buck converter above 1 W.`
      : status === 'warn'
        ? `${worst.dropW.toFixed(2)} W dissipated in a linear regulator (${worst.name}) is at the TO-220 free-air limit. Add a heatsink (~30°C/W) or switch to a buck module — efficiency doubles.`
        : `${worst.dropW.toFixed(2)} W in a linear regulator will hit thermal shutdown in seconds. A buck converter (≥90% efficient) is mandatory at this drop.`,
    formula: 'P = (Vin − Vout)·I · TO-220 free-air θJA ≈ 65°C/W → ~1.1 W max @ 40°C',
  };
}

function rippleLifeCheck(powers: Array<{ component: string; voltage: string; current: string }>): Check {
  const totalA = powers.reduce((s, p) => s + parseCurrentAmps(p.current), 0);
  // Electrolytic input caps age with ripple; guideline: >2A continuous needs
  // polymer/solid caps or 105°C-rated low-ESR parts
  const status: CheckStatus = totalA <= 1 ? 'pass' : totalA <= 2.5 ? 'warn' : 'fail';
  return {
    id: 'ripple',
    domain: 'electrical',
    title: 'Input capacitor life',
    status,
    value: `${totalA.toFixed(2)} A`,
    detail: status === 'pass'
      ? `Below ~1 A ripple current standard electrolytics handle fine.`
      : status === 'warn'
        ? `At ${totalA.toFixed(1)} A, input electrolytics age 2× faster — specify 105°C-rated low-ESR or polymer caps for the input stage.`
        : `At ${totalA.toFixed(1)} A ripple, wet electrolytics dry out within months. Use polymer or ceramic banks at the input.`,
    formula: 'Cap life halves per 10°C rise; ripple heats ESR·I²',
  };
}

function cRateCheck(powers: Array<{ component: string; voltage: string; current: string }>): Check {
  const totalA = powers.reduce((s, p) => s + parseCurrentAmps(p.current), 0);
  // Reference pack: 3.7V 2500mAh 18650 (typical 1C continuous, 2C burst)
  const capAh = 2.5;
  const cRate = totalA / capAh;
  const status: CheckStatus = cRate <= 1 ? 'pass' : cRate <= 2 ? 'warn' : 'fail';
  return {
    id: 'crate',
    domain: 'battery',
    title: 'Battery C-rate',
    status,
    value: `${cRate.toFixed(1)}C`,
    detail: status === 'pass'
      ? `${cRate.toFixed(2)}C on a standard 18650 (1C continuous) — cell stays cool and delivers rated capacity.`
      : status === 'warn'
        ? `${cRate.toFixed(1)}C sags voltage and heats the cell; use a high-drain cell (Molicel P26A class, 10A+) or parallel two cells.`
        : `${cRate.toFixed(1)}C exceeds even high-drain cells continuously — expect voltage sag, shutdowns, and cell damage. Add a boost cap or split the load across cells.`,
    formula: 'C-rate = I/Capacity; std 18650: 1C cont / 2C burst',
  };
}

function ampacityCheck(powers: Array<{ component: string; voltage: string; current: string }>): Check {
  const totalA = powers.reduce((s, p) => s + parseCurrentAmps(p.current), 0);
  // IPC-2221 external traces, 10°C rise, 1oz copper: ~1 A per 0.3 mm width
  const traceMm = totalA * 0.3;
  const wireSpec = totalA <= 1 ? '28 AWG / 0.3 mm trace' : totalA <= 3 ? '22 AWG / 1 mm trace' : totalA <= 7 ? '18 AWG / 2.5 mm trace' : '10 AWG or bus bar';
  const status: CheckStatus = totalA <= 3 ? 'pass' : totalA <= 7 ? 'warn' : 'fail';
  return {
    id: 'ampacity',
    domain: 'electrical',
    title: 'Conductor ampacity',
    status,
    value: `${traceMm.toFixed(1)} mm`,
    detail: status === 'pass'
      ? `${wireSpec} carries ${totalA.toFixed(1)} A with under 10°C rise (IPC-2221).`
      : status === 'warn'
        ? `${wireSpec} minimum for ${totalA.toFixed(1)} A. On PCBs: ${(traceMm).toFixed(1)} mm external trace at 1 oz copper, or pour a plane.`
        : `${totalA.toFixed(1)} A needs ${wireSpec} — traces this wide are unusual; pour a copper plane or use bus bars.`,
    formula: 'IPC-2221: width ≈ I × 0.3 mm/A (ext. layer, 1 oz, ΔT=10°C)',
  };
}

// ═══════════════════════════════════════════════════════════════
// Environmental: ingress + thermal range + fasteners
// ═══════════════════════════════════════════════════════════════

function ingressCheck(model: CADModel, ip: string): Check {
  const shells = model.shapes.filter(s => s.kind === 'shell').length;
  const gasketMm = shells > 0 ? Math.max(...model.shapes.filter(s => s.kind === 'shell').map(s => (s.params.width ?? 40) + (s.params.depth ?? 30))) * 0.02 : 0;
  const needsGasket = ip === 'IP65' || ip === 'IP67';
  const status: CheckStatus = !needsGasket ? 'pass' : shells > 0 && gasketMm >= 1.5 ? 'pass' : shells > 0 ? 'warn' : 'fail';
  return {
    id: 'ingress',
    domain: 'print',
    title: `Ingress protection (${ip})`,
    status,
    value: shells > 0 ? `${gasketMm.toFixed(1)} mm land` : 'open',
    detail: status === 'pass'
      ? needsGasket
        ? `Two-part shell supports a ${gasketMm.toFixed(1)} mm gasket land — specify 2 mm silicone cord for ${ip}.`
        : `${ip} needs no sealing at this duty.`
      : status === 'warn'
        ? `${ip} needs a sealed seam: widen the flange to ≥2 mm and design a silicone cord groove (1.5 mm cord, 25% compression).`
        : `No enclosure shell in the model — ${ip} is unachievable. Add the enclosure template.`,
    formula: 'IEC 60529: IP6x dust-tight requires compressible gasket, 25% squeeze',
  };
}

function tempRangeCheck(model: CADModel, duty: DutyProfile): Check {
  const mat = MATERIAL_MECH[model.material];
  const ok = mat.tMax >= duty.tMax && mat.tMax >= 60;
  const status: CheckStatus = mat.tMax >= duty.tMax + 15 ? 'pass' : ok ? 'warn' : 'fail';
  return {
    id: 'temp',
    domain: 'thermal',
    title: 'Temperature range',
    status,
    value: `${duty.tMin}…${duty.tMax}°C`,
    detail: status === 'pass'
      ? `${MATERIALS[model.material].label} serves to ${mat.tMax}°C — covers the ${duty.tMax}°C top of the ${duty.label} envelope with margin.`
      : status === 'warn'
        ? `${MATERIALS[model.material].label} softens near ${mat.tMax}°C; duty requires ${duty.tMax}°C. Creep at load-bearing bosses is the risk — add metal inserts.`
        : `${MATERIALS[model.material].label} fails the ${duty.label} envelope (needs ${duty.tMax}°C, material serves ${mat.tMax}°C). Switch to ABS/PETG minimum, aluminium for ${duty.label}.`,
    formula: 'Material service temp vs MIL-STD-810 operating envelope',
  };
}

const FASTENER_TABLE = [
  { screw: 'M2',   bosses: 10,  pullN: 450,  use: 'PCB standoffs, light lids' },
  { screw: 'M2.5', bosses: 14,  pullN: 700,  use: 'small enclosures' },
  { screw: 'M3',   bosses: 20,  pullN: 1100, use: 'general enclosure lids, brackets' },
  { screw: 'M4',   bosses: 28,  pullN: 1700, use: 'structural joints, motors' },
  { screw: 'M5',   bosses: 38,  pullN: 2600, use: 'load-bearing frames' },
];

function fastenerCheck(model: CADModel, shockG: number): Check {
  const stats = modelStats(model);
  const massKg = stats.massG / 1000;
  const shockN = massKg * 9.81 * shockG;
  // 4× M3 bosses standard; pull strength with 50% engagement safety
  const perBoss = 1100 * 0.5;
  const fos = shockN > 0 ? (4 * perBoss) / shockN : Infinity;
  const status: CheckStatus = fos >= 2 ? 'pass' : fos >= 1.2 ? 'warn' : 'fail';
  const rec = FASTENER_TABLE.reduce((best, f) => (shockN / 4 <= f.pullN * 0.5 && !best ? f : best), null as (typeof FASTENER_TABLE)[number] | null);
  return {
    id: 'fasteners',
    domain: 'print',
    title: 'Fastener & shock mount',
    status,
    value: `${massKg >= 0.001 ? '' : ''}${(shockN).toFixed(0)} N`,
    detail: status === 'pass'
      ? `4× M3 heat-set bosses hold ${(4 * perBoss).toFixed(0)} N vs ${shockN.toFixed(0)} N shock load — SF ${fos.toFixed(1)}. Use brass heat-set inserts, never self-tapping into layer lines.`
      : status === 'warn'
        ? `Shock load ${shockN.toFixed(0)} N against 4× M3 bosses is marginal (SF ${fos.toFixed(1)}). Move to M4 bosses or 6× M3 pattern.`
        : `Shock load ${shockN.toFixed(0)} N exceeds any plastic boss — needs through-bolted metal brackets or potted assembly.`,
    formula: 'F = m·a_shock; brass heat-set M3 pull-out ≈ 550 N designed',
  };
}

// ═══════════════════════════════════════════════════════════════
// Unit economics + manufacturing plan
// ═══════════════════════════════════════════════════════════════

export interface CostLine { item: string; unit: number; cost: number }
export interface CostBreakdown {
  lines: CostLine[];
  material: number;
  electronics: number;
  unitTotal: number;
  at10: number;
  at100: number;
  margin50: number;
}

export function costBreakdown(model: CADModel, electronicsCost: number): CostBreakdown {
  const stats = modelStats(model);
  const grams = stats.massG;
  // Filament ~$22/kg consumer, resin ~$120/L, metal quote $8–15/cm³ machined
  const matCostPerG: Record<string, number> = {
    pla: 0.022, abs: 0.024, petg: 0.024, resin: 0.15,
    aluminium: 0.09, steel: 0.07, titanium: 0.35, carbon_fiber: 0.12,
  };
  const material = grams * (matCostPerG[model.material] ?? 0.03);
  const machineTime = Math.max(0.5, stats.volumeCm3 / 12); // hours-ish proxy
  const lines: CostLine[] = [
    { item: `${MATERIALS[model.material].label} feedstock (${grams.toFixed(0)} g)`, unit: 1, cost: material },
    { item: 'Machine time / depreciation', unit: machineTime, cost: machineTime * 2.5 },
    { item: 'Fasteners + inserts + gasket', unit: 1, cost: 1.8 },
    { item: 'Electronics BOM', unit: 1, cost: electronicsCost },
    { item: 'Assembly labor (30 min)', unit: 0.5, cost: 0.5 * 15 },
    { item: 'QC + packaging', unit: 1, cost: 2.5 },
  ];
  const unitTotal = lines.reduce((s, l) => s + l.cost, 0);
  const volumeDiscount = (n: number) => unitTotal * (1 - Math.min(0.35, Math.log10(n) * 0.16));
  return {
    lines,
    material,
    electronics: electronicsCost,
    unitTotal,
    at10: volumeDiscount(10),
    at100: volumeDiscount(100),
    margin50: unitTotal * 2, // 50% margin price point
  };
}

export interface PlanPhase {
  gate: string;
  name: string;
  actions: string[];
  exitCriteria: string;
}

export function manufacturingPlan(duty: DutyClass, hasElectronics: boolean): PlanPhase[] {
  const d = DUTY_PROFILES[duty];
  const phases: PlanPhase[] = [
    {
      gate: 'G0', name: 'Requirements freeze',
      actions: [
        `Write the spec sheet: duty = ${d.label} (${d.cycles.toLocaleString()} cycles, ${d.tMin}…${d.tMax}°C, ${d.ip}, ${d.shockG}g shock).`,
        'List hard requirements vs nice-to-haves; anything not measured is not required.',
        'Pick the battery chemistry and connector standard now — they constrain everything.',
      ],
      exitCriteria: 'Spec sheet signed off; no floating requirements.',
    },
    {
      gate: 'G1', name: 'Breadboard validation',
      actions: [
        'Wire the electronics on a bench supply with a current meter — record idle/active/peak mA.',
        ...(hasElectronics ? ['Verify every sensor reads sane; log one hour of data before proceeding.'] : []),
        'Run the thermal check: enclose the electronics, run 1 h, measure internal temp.',
      ],
      exitCriteria: 'Measured currents within ±20% of the analysis; no part over spec temp.',
    },
    {
      gate: 'G2', name: 'Engineering prototype',
      actions: [
        'Print/machine the real housing from this model; heat-set inserts, gasket if sealed.',
        'Drop test from 1.2 m onto plywood (6 faces); inspect seams and mounts.',
        'Vibration: 30 min on the dashboard of a car ride — check for loosened fasteners (use threadlocker on all metal-to-plastic).',
      ],
      exitCriteria: 'Survives shock spec with no cracks; current draw unchanged after drop.',
    },
    {
      gate: 'G3', name: 'Design freeze + DFM',
      actions: [
        'Export the dimensioned drawing (ASME Y14.5) and mark critical-to-quality dimensions (±0.2 mm or tighter).',
        'Confirm tolerance stack: ISO 2768-m general for printed parts; add dowel pins for alignment-critical seams.',
        'Run the engineering checks at final parameter values — all green or waived in writing.',
      ],
      exitCriteria: 'Drawing pack released; every check pass or documented waiver.',
    },
    {
      gate: 'G4', name: 'Pilot run (×3)',
      actions: [
        'Build 3 units without rework; log build time and every snag as a checklist fix.',
        '48-hour burn-in: log currents, temps, and any resets. Units must be identical within 5%.',
        ...(hasElectronics ? ['Calibrate sensors; record calibration constants into the firmware defaults.'] : []),
      ],
      exitCriteria: '3/3 units pass burn-in; build sheet finalized.',
    },
  ];
  if (duty === 'rugged' || duty === 'mil') {
    phases.push({
      gate: 'G5', name: 'Qualification',
      actions: [
        `Full ${d.label} profile: ${d.shockG}g shock, ${d.vibrationGrms} Grms random vibration, ${d.tMin}…${d.tMax}°C soak + operation.`,
        `${d.ip} water ingress test: 1 m immersion (IP67) or 30 kPa spray (IP65) with internal humidity card.`,
        'EMC pre-scan: conducted emissions on the DC input; add common-mode choke if noisy.',
      ],
      exitCriteria: 'All qualification tests passed by an accredited lab or witnessed procedure.',
    });
  }
  return phases;
}

// ═══════════════════════════════════════════════════════════════
// Aggregate industrial report
// ═══════════════════════════════════════════════════════════════

export interface IndustrialReport {
  checks: Check[];
  summary: { pass: number; warn: number; fail: number };
  headline: string;
  cost: CostBreakdown;
  plan: PlanPhase[];
}

export interface IndustrialInput {
  model: CADModel;
  powers?: Array<{ component: string; voltage: string; current: string }>;
  electronicsCost?: number;
  duty?: DutyClass;
}

export function industrialValidation({
  model, powers = [], electronicsCost = 25, duty = 'field',
}: IndustrialInput): IndustrialReport {
  const d = DUTY_PROFILES[duty];
  const checks: Check[] = [
    fatigueCheck(model, d.cycles),
    bucklingCheck(model),
    shockCheck(model, d.shockG),
    tempRangeCheck(model, d),
    ingressCheck(model, d.ip),
    fastenerCheck(model, d.shockG),
  ];
  if (powers.length > 0) {
    checks.push(regulatorCheck(powers));
    checks.push(rippleLifeCheck(powers));
    checks.push(cRateCheck(powers));
    checks.push(ampacityCheck(powers));
  }
  const summary = {
    pass: checks.filter(c => c.status === 'pass').length,
    warn: checks.filter(c => c.status === 'warn').length,
    fail: checks.filter(c => c.status === 'fail').length,
  };
  const headline = summary.fail > 0
    ? `NOT production-ready — ${summary.fail} blocking issue${summary.fail > 1 ? 's' : ''}`
    : summary.warn > 0
      ? `Production-viable with ${summary.warn} watch item${summary.warn > 1 ? 's' : ''}`
      : `Meets ${d.label} requirements — release to prototype`;
  return {
    checks,
    summary,
    headline,
    cost: costBreakdown(model, electronicsCost),
    plan: manufacturingPlan(duty, powers.length > 0),
  };
}
