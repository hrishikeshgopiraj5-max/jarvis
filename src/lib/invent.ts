/**
 * JARVIS Invention Sparks — cross-domain idea engine.
 *
 * Innovation rarely comes from inventing physics; it comes from combining
 * known primitives in ways nobody bothered to. This module cross-combines:
 *
 *   sensing × actuation × energy × connectivity × constraint
 *
 * into concrete, buildable project briefs — each with a CAD template, the
 * components it would actually use, and the engineering angle that makes it
 * more than a toy. Deterministic given a seed so the same idea can be
 * retrieved, shared, and built.
 */

// ── Primitive libraries ─────────────────────────────────────────

export interface Spark {
  id: string;
  title: string;
  pitch: string;        // one-sentence why it matters
  problem: string;      // what real problem it solves
  brief: string;        // paste-into-studio brief
  cadTemplate: string;
  domains: string[];    // e.g. ['sensing','energy']
  components: string[];
  engineeringAngle: string; // why it's interesting to build
  novelty: number;      // 1–5, cross-domain count drives this
}

interface Sense  { name: string; comp: string; what: string }
interface Act    { name: string; comp: string; what: string }
interface Energy { name: string; comp: string; what: string }
interface Link   { name: string; comp: string; what: string }
interface Con    { name: string; what: string }

const SENSES: Sense[] = [
  { name: 'air quality',   comp: 'SGP30 + PMS5003',            what: 'CO₂/VOC/PM2.5 concentrations' },
  { name: 'soil moisture', comp: 'capacitive soil probe',      what: 'volumetric water content' },
  { name: 'vibration',     comp: 'MPU-6050 + piezo disc',      what: 'machine vibration signature' },
  { name: 'body motion',   comp: 'BNO085 IMU',                 what: '9-DOF posture and gesture' },
  { name: 'thermal camera',comp: 'MLX90640 array',             what: '32×24 temperature map' },
  { name: 'sound level',   comp: 'MEMS mic + FFT',             what: 'dB spectrum per band' },
  { name: 'water quality', comp: 'EC + pH + turbidity probes', what: 'dissolved chemistry' },
  { name: 'magnetic field',comp: 'MLX90393 3-axis magnetometer', what: 'field vector' },
  { name: 'depth',         comp: 'VL53L1X ToF sensor',         what: 'millimetre distance' },
  { name: 'gas',           comp: 'MQ-2 + MQ-7',                what: 'combustible/CO gas presence' },
];

const ACTUATORS: Act[] = [
  { name: 'valve',        comp: '12V solenoid + MOSFET',   what: 'switches water/air flow' },
  { name: 'haptics',      comp: 'LRA motor + DRV2605',     what: 'silent tactile feedback' },
  { name: 'servo joint',  comp: 'DS3225 servo ×4',         what: ' articulated motion' },
  { name: 'pump',         comp: 'peristaltic pump',        what: 'metered fluid dosing' },
  { name: 'peltier',      comp: 'TEC1-12706 + H-bridge',   what: 'heats or cools a surface' },
  { name: 'light engine', comp: 'SK6812 RGBW strip',       what: 'per-pixel ambient light' },
  { name: 'audio',        comp: 'MAX98357 I2S amp',        what: 'clear spoken output' },
  { name: 'lock',         comp: 'solenoid lock + driver',  what: 'physical securing' },
];

const ENERGIES: Energy[] = [
  { name: 'solar',        comp: '5V 2W panel + CN3065',    what: 'indoor/outdoor light harvesting' },
  { name: 'kinetic',      comp: 'piezo + bridge rectifier',what: 'harvests button-press / shake energy' },
  { name: 'thermal grad', comp: 'TM-1270 TEG + boost',     what: 'harvests waste heat gradients' },
  { name: 'USB-C PD',     comp: 'CH224K PD trigger',       what: 'negotiates 5–20V from any PD brick' },
  { name: 'LiFePO4',      comp: '32700 cell + BMS',        what: '3000+ cycle safe chemistry' },
];

const LINKS: Link[] = [
  { name: 'LoRa',     comp: 'SX1276 module',        what: 'km-range, battery-for-year telemetry' },
  { name: 'WiFi',     comp: 'ESP32 radio',          what: 'LAN + cloud, high bandwidth' },
  { name: 'BLE',      comp: 'nRF52840',             what: 'phone-direct, ultra low power' },
  { name: 'RFID',     comp: 'PN532 NFC',            what: 'tap interaction, no battery on tag' },
];

const CONSTRAINTS: Con[] = [
  { name: 'must survive outdoors year-round', what: 'drives IP65 sealing, UV-stable PETG/ASA, thermal design' },
  { name: 'must run a year on one charge',    what: 'drives deep-sleep duty cycling and LoRa over WiFi' },
  { name: 'must be silent',                   what: 'rules out fans — conduction cooling + Peltier only' },
  { name: 'must be kid-safe',                 what: 'rounded geometry, no accessible >24V, auto-off heater' },
  { name: 'must fit a shirt pocket',          what: 'drives the entire enclosure envelope' },
];

// ── Archetype templates (the sentence patterns) ─────────────────

interface Archetype {
  title: (s: Sense, a: Act, e: Energy, l: Link, c: Con) => string;
  pitch: (s: Sense, a: Act, e: Energy, l: Link, c: Con) => string;
  problem: (s: Sense, a: Act, e: Energy, l: Link, c: Con) => string;
  brief: (s: Sense, a: Act, e: Energy, l: Link, c: Con) => string;
  cadFor: (s: Sense, a: Act) => string;
  angle: (s: Sense, a: Act, e: Energy) => string;
  needs: { sense: boolean; act: boolean };
}

const ARCHETYPES: Archetype[] = [
  {
    title: (s, a) => `Sentinel ${s.name} guardian`,
    pitch: (s, a, e, l, c) => `A ${c.name} device that watches ${s.name} around it and ${a.what} when thresholds cross — no cloud, no subscription.`,
    problem: (s) => `People notice ${s.name} problems only after damage is done; continuous local monitoring with autonomous response removes the human from the loop.`,
    brief: (s, a, e, l, c) => `Build a ${c.name} monitor that senses ${s.name} (${s.what}), decides with local thresholds, and ${a.what} via ${a.comp}. Power: ${e.name} (${e.comp}). Link: ${l.name} (${l.comp}).`,
    cadFor: (s, a) => (a.name === 'valve' || a.name === 'pump' ? 'enclosure' : 'enclosure'),
    angle: (s, a, e) => `${e.name} energy budget vs ${a.name} duty cycle is the core engineering tradeoff — the power analysis will show exactly how long it survives.`,
    needs: { sense: true, act: true },
  },
  {
    title: (s, _a, e, l, c) => `${e.name}-powered ${s.name} mesh node`,
    pitch: (s, e, l, c) => `A ${c.name} node that measures ${s.name} and reports over ${l.name} — deployed in numbers, they map an entire building or field.`,
    problem: (s, _a, e) => `${s.name} data exists nowhere today because running power and network cable everywhere is impractical; self-powered nodes erase both constraints.`,
    brief: (s, _a, e, l, c) => `Build a self-powered ${s.name} sensor node (${s.comp}, ${s.what}) reporting over ${l.comp}. Power from ${e.comp}. Duty-cycle everything for ${c.name}.`,
    cadFor: () => 'enclosure',
    angle: (s, _a, e) => `${e.name} harvesting vs sleep current defines the whole design; the runtime and C-rate checks become the interesting part.`,
    needs: { sense: true, act: false },
  },
  {
    title: (s, a) => `Auto-${a.name} ${s.name} loop`,
    pitch: (s, a) => `A benchtop instrument that measures ${s.name} and autonomously ${a.what} to hold a setpoint — a closed control loop in a box.`,
    problem: (s, a) => `Manual ${s.name} correction is inconsistent; closed-loop control makes quality repeatable.`,
    brief: (s, a, e, l, c) => `Build a closed-loop controller: sense ${s.name} (${s.comp}), PID in firmware, actuate via ${a.comp}. ${e.name} powered, ${l.name} telemetry, ${c.name}.`,
    cadFor: (_s, a) => (a.name === 'peltier' ? 'enclosure' : 'robot-arm-segment'),
    angle: (s, a) => `Control-loop stability plus ${a.name} sizing — the physics panel will validate the actuator can actually move the system.`,
    needs: { sense: true, act: true },
  },
  {
    title: (_s, a) => `Silent ${a.name} interface`,
    pitch: (a, _e, l) => `A ${l.name} device that talks to you through ${a.what} instead of screens — for when eyes and hands are busy.`,
    problem: () => `Screens demand attention; tactile and ambient channels deliver information in the periphery.`,
    brief: (s, a, e, l, c) => `Build a screenless interface: ${a.comp} for output (${a.what}), ${s.comp} for gesture input, ${l.comp} for phone link, ${e.comp} power. ${c.name}.`,
    cadFor: (_s, a) => (a.name === 'haptics' ? 'phone-case' : 'enclosure'),
    angle: (_s, a) => `Haptic duty cycle and battery life dominate; the thermal check will catch a Peltier overdriven past its COP cliff.`,
    needs: { sense: true, act: true },
  },
  {
    title: (s) => `${s.name} laboratory`,
    pitch: (s, _a, _e, l, c) => `A pocket instrument that quantifies ${s.name} with lab-grade repeatability — ${c.what}.`,
    problem: (s) => `Lab instruments cost thousands and stay in the lab; field quantification of ${s.name} unlocks science everywhere.`,
    brief: (s, _a, e, l, c) => `Build a field instrument measuring ${s.name} (${s.comp}, ${s.what}) with calibration routine, ${l.comp} logging, ${e.comp} power, ${c.name}.`,
    cadFor: () => 'enclosure',
    angle: (s) => `Measurement repeatability: temperature compensation and calibration curves are the engineering meat.`,
    needs: { sense: true, act: false },
  },
];

// ── Generation ──────────────────────────────────────────────────

/** Small deterministic PRNG (mulberry32). */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(arr: T[], r: number): T {
  return arr[Math.floor(r * arr.length) % arr.length];
}

const CONJ = ['for', 'against', 'around'];

export function generateSparks(seed: number, count = 4): Spark[] {
  const r = rng(seed);
  const out: Spark[] = [];
  const seen = new Set<string>();
  let guard = 0;
  while (out.length < count && guard++ < 200) {
    const s = pick(SENSES, r());
    const a = pick(ACTUATORS, r());
    const e = pick(ENERGIES, r());
    const l = pick(LINKS, r());
    const c = pick(CONSTRAINTS, r());
    const arch = pick(ARCHETYPES, r());
    if (arch.needs.act && !a) continue;
    const title = arch.title(s, a, e, l, c);
    const key = title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const domains = [s.name, a.name, e.name, l.name].filter(Boolean);
    out.push({
      id: `spark-${seed}-${out.length}`,
      title,
      pitch: arch.pitch(s, a, e, l, c),
      problem: arch.problem(s, a, e, l, c),
      brief: arch.brief(s, a, e, l, c),
      cadTemplate: arch.cadFor(s, a),
      domains,
      components: [s.comp, arch.needs.act ? a.comp : '', e.comp, l.comp].filter(Boolean),
      engineeringAngle: arch.angle(s, a, e),
      novelty: Math.min(5, 1 + new Set(domains).size),
    });
  }
  return out;
}

/** Hash a string to a seed (so "weather station" always regenerates the same sparks). */
export function seedFromString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
