/**
 * JARVIS CAD Engine — parametric 3D modeling core
 *
 * Real geometry math: primitives → meshes (BufferGeometry data), exact volume
 * and surface area for closed triangle soups, composite assemblies with rigid
 * placement, and ASCII-STL export for slicers. No fake numbers.
 *
 * Units: millimeters. Meshes are non-indexed triangle soups, which keeps
 * volume/area/STL computation simple and robust.
 */

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface Vec3 { x: number; y: number; z: number }

export interface TriSoup {
  /** Flat positions, 9 floats per triangle (3 vertices). */
  positions: Float32Array;
  triangleCount: number;
}

export type ShapeKind =
  | 'box' | 'cylinder' | 'sphere' | 'cone' | 'torus'
  | 'tube' | 'plate' | 'shell' | 'ring';

export interface ShapeParams {
  /** box/plate: full dimensions. */
  width?: number;
  height?: number;
  depth?: number;
  /** cylinder/cone: radius at base. */
  radius?: number;
  /** cone: top radius (0 → sharp). */
  radiusTop?: number;
  /** sphere: segments for tessellation. */
  segments?: number;
  /** torus: ring radius + cross-section radius. */
  ringRadius?: number;
  sectionRadius?: number;
  /** tube/ring/shell: inner radius (0 < inner < radius). */
  innerRadius?: number;
  /** plate: corner rounding radius. */
  cornerRadius?: number;
  /** shell: wall thickness. */
  wall?: number;
}

export interface PlacedShape {
  kind: ShapeKind;
  params: ShapeParams;
  /** Position of the shape origin, mm. */
  position: Vec3;
  /** Rotation in degrees around each axis. */
  rotation: Vec3;
  /** Part name shown in the model tree and BOM-ish summary. */
  label: string;
}

export interface CADModel {
  name: string;
  templateId: string;
  /** mm — for printability / scale sanity checks. */
  units: 'mm';
  shapes: PlacedShape[];
  /** Material key for mass estimation (see MATERIALS). */
  material: MaterialId;
  /** Optional free-text design brief that produced this model. */
  brief?: string;
}

// ── Materials: density in g/cm³ (real values) ──────────────────
export type MaterialId = 'pla' | 'abs' | 'petg' | 'resin' | 'aluminium' | 'steel' | 'titanium' | 'carbon_fiber';

export const MATERIALS: Record<MaterialId, { label: string; density: number }> = {
  pla: { label: 'PLA', density: 1.24 },
  abs: { label: 'ABS', density: 1.04 },
  petg: { label: 'PETG', density: 1.27 },
  resin: { label: 'Resin (SLA)', density: 1.12 },
  aluminium: { label: 'Aluminium 6061', density: 2.70 },
  steel: { label: 'Steel 304', density: 8.00 },
  titanium: { label: 'Titanium Ti-6Al-4V', density: 4.43 },
  carbon_fiber: { label: 'Carbon Fiber', density: 1.60 },
};

// ═══════════════════════════════════════════════════════════════
// MESH GENERATION — parametric primitives → triangle soups
// ═══════════════════════════════════════════════════════════════

const DEFAULT_SEGMENTS = 32;

/** Rotation matrix application (degrees → radians internally). */
function rotatePoint(p: Vec3, rot: Vec3): Vec3 {
  const rx = (rot.x * Math.PI) / 180;
  const ry = (rot.y * Math.PI) / 180;
  const rz = (rot.z * Math.PI) / 180;
  // Rx
  let { x, y, z } = p;
  let cy = y * Math.cos(rx) - z * Math.sin(rx);
  let cz = y * Math.sin(rx) + z * Math.cos(rx);
  y = cy; z = cz;
  // Ry
  let cx = x * Math.cos(ry) + z * Math.sin(ry);
  cz = -x * Math.sin(ry) + z * Math.cos(ry);
  x = cx; z = cz;
  // Rz
  cx = x * Math.cos(rz) - y * Math.sin(rz);
  cy = x * Math.sin(rz) + y * Math.cos(rz);
  return { x: cx, y: cy, z };
}

function pushTri(out: number[], a: Vec3, b: Vec3, c: Vec3) {
  out.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
}

function pushQuad(out: number[], a: Vec3, b: Vec3, c: Vec3, d: Vec3) {
  // Outward-facing CCW: a,b,c + a,c,d
  pushTri(out, a, b, c);
  pushTri(out, a, c, d);
}

/** Axis-aligned box of full size w×h×d centered on origin. */
export function boxMesh(w: number, h: number, d: number): TriSoup {
  const hw = w / 2, hh = h / 2, hd = d / 2;
  const pts: Vec3[] = [];
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
    pts.push({ x: sx * hw, y: sy * hh, z: sz * hd });
  }
  // Index corners: bit0=x, bit1=y, bit2=z sign
  const P = (i: number) => pts[i];
  const idx = (x: number, y: number, z: number) => ((x ? 4 : 0) | (y ? 2 : 0) | (z ? 1 : 0));
  const out: number[] = [];
  // +Z face (CCW seen from +Z): (-,-,+) ( +,-,+) ( +,+,+) ( -,+,+)
  pushQuad(out, P(idx(0, 0, 1)), P(idx(1, 0, 1)), P(idx(1, 1, 1)), P(idx(0, 1, 1)));
  // -Z face: ( +,-,-) ( -,-,-) ( -,+, -) ( +,+,-)
  pushQuad(out, P(idx(1, 0, 0)), P(idx(0, 0, 0)), P(idx(0, 1, 0)), P(idx(1, 1, 0)));
  // +X face: ( +,-,-) ( +,+,-) ( +,+,+) ( +,-,+)
  pushQuad(out, P(idx(1, 0, 0)), P(idx(1, 1, 0)), P(idx(1, 1, 1)), P(idx(1, 0, 1)));
  // -X face: ( -,-,+) ( -,+,+) ( -,+, -) ( -,-,-)
  pushQuad(out, P(idx(0, 0, 1)), P(idx(0, 1, 1)), P(idx(0, 1, 0)), P(idx(0, 0, 0)));
  // +Y face: ( -,+,-) ( - ,+,+) ( +,+,+) ( +,+,-)
  pushQuad(out, P(idx(0, 1, 0)), P(idx(0, 1, 1)), P(idx(1, 1, 1)), P(idx(1, 1, 0)));
  // -Y face: ( -,-,+) ( -,-,-) ( +,-,-) ( +,-,+)
  pushQuad(out, P(idx(0, 0, 1)), P(idx(0, 0, 0)), P(idx(1, 0, 0)), P(idx(1, 0, 1)));
  return { positions: new Float32Array(out), triangleCount: out.length / 9 };
}

/** Cylinder along Y. height = full height, centered. */
export function cylinderMesh(radius: number, height: number, segments = DEFAULT_SEGMENTS): TriSoup {
  const out: number[] = [];
  const half = height / 2;
  for (let i = 0; i < segments; i++) {
    const a0 = (i / segments) * Math.PI * 2;
    const a1 = ((i + 1) / segments) * Math.PI * 2;
    const x0 = Math.cos(a0) * radius, z0 = Math.sin(a0) * radius;
    const x1 = Math.cos(a1) * radius, z1 = Math.sin(a1) * radius;
    // Side quad (outward normal)
    pushQuad(out,
      { x: x0, y: -half, z: z0 },
      { x: x0, y: half, z: z0 },
      { x: x1, y: half, z: z1 },
      { x: x1, y: -half, z: z1 });
    // Top cap (normal +Y): CCW seen from above
    pushTri(out,
      { x: 0, y: half, z: 0 },
      { x: x1, y: half, z: z1 },
      { x: x0, y: half, z: z0 });
    // Bottom cap (normal -Y)
    pushTri(out,
      { x: 0, y: -half, z: 0 },
      { x: x0, y: -half, z: z0 },
      { x: x1, y: -half, z: z1 });
  }
  return { positions: new Float32Array(out), triangleCount: out.length / 9 };
}

/** Truncated cone (frustum) along Y. radiusTop=0 → see sharpConeMesh. */
export function frustumMesh(rBottom: number, rTop: number, height: number, segments = DEFAULT_SEGMENTS): TriSoup {
  const out: number[] = [];
  const half = height / 2;
  for (let i = 0; i < segments; i++) {
    const a0 = (i / segments) * Math.PI * 2;
    const a1 = ((i + 1) / segments) * Math.PI * 2;
    const c = Math.cos, s = Math.sin;
    const b0 = { x: c(a0) * rBottom, z: s(a0) * rBottom }, b1 = { x: c(a1) * rBottom, z: s(a1) * rBottom };
    const t0 = { x: c(a0) * rTop, z: s(a0) * rTop }, t1 = { x: c(a1) * rTop, z: s(a1) * rTop };
    // Side: quad b0(bottom,a0) → t0(top,a0) → t1(top,a1) → b1(bottom,a1)
    pushQuad(out,
      { x: b0.x, y: -half, z: b0.z },
      { x: t0.x, y: half, z: t0.z },
      { x: t1.x, y: half, z: t1.z },
      { x: b1.x, y: -half, z: b1.z });
    // Top cap (normal +Y)
    pushTri(out, { x: 0, y: half, z: 0 }, { x: t1.x, y: half, z: t1.z }, { x: t0.x, y: half, z: t0.z });
    // Bottom cap (normal -Y)
    pushTri(out, { x: 0, y: -half, z: 0 }, { x: b0.x, y: -half, z: b0.z }, { x: b1.x, y: -half, z: b1.z });
  }
  return { positions: new Float32Array(out), triangleCount: out.length / 9 };
}

/** UV sphere. */
export function sphereMesh(radius: number, segments = DEFAULT_SEGMENTS): TriSoup {
  const out: number[] = [];
  const rings = Math.max(8, Math.floor(segments / 2));
  const lat = (i: number) => (i / rings) * Math.PI - Math.PI / 2; // -π/2..π/2
  const P = (i: number, j: number): Vec3 => {
    const phi = (j / segments) * Math.PI * 2;
    const th = lat(i);
    return {
      x: Math.cos(th) * Math.cos(phi) * radius,
      y: Math.sin(th) * radius,
      z: Math.cos(th) * Math.sin(phi) * radius,
    };
  };
  for (let i = 0; i < rings; i++) {
    for (let j = 0; j < segments; j++) {
      const a = P(i, j), b = P(i, j + 1), c = P(i + 1, j + 1), d = P(i + 1, j);
      if (i === 0) pushTri(out, a, c, d);            // bottom cap region
      else if (i === rings - 1) pushTri(out, a, b, c); // top cap region
      else pushQuad(out, a, b, c, d);
    }
  }
  return { positions: new Float32Array(out), triangleCount: out.length / 9 };
}

/** Torus in XZ plane (hole along Y). ringRadius major, sectionRadius minor. */
export function torusMesh(ringRadius: number, sectionRadius: number, segments = DEFAULT_SEGMENTS): TriSoup {
  const out: number[] = [];
  const tube = Math.max(8, Math.floor(segments / 2));
  const P = (i: number, j: number): Vec3 => {
    const u = (i / segments) * Math.PI * 2;
    const v = (j / tube) * Math.PI * 2;
    return {
      x: (ringRadius + sectionRadius * Math.cos(v)) * Math.cos(u),
      y: sectionRadius * Math.sin(v),
      z: (ringRadius + sectionRadius * Math.cos(v)) * Math.sin(u),
    };
  };
  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < tube; j++) {
      pushQuad(out, P(i, j), P(i + 1, j), P(i + 1, j + 1), P(i, j + 1));
    }
  }
  return { positions: new Float32Array(out), triangleCount: out.length / 9 };
}

/** Tube (hollow cylinder, capped) along Y. */
export function tubeMesh(radius: number, innerRadius: number, height: number, segments = DEFAULT_SEGMENTS): TriSoup {
  const out: number[] = [];
  const half = height / 2;
  const ri = Math.max(0.1, Math.min(innerRadius, radius * 0.95));
  for (let i = 0; i < segments; i++) {
    const a0 = (i / segments) * Math.PI * 2;
    const a1 = ((i + 1) / segments) * Math.PI * 2;
    const c = Math.cos, s = Math.sin;
    const o0 = { x: c(a0) * radius, z: s(a0) * radius }, o1 = { x: c(a1) * radius, z: s(a1) * radius };
    const i0 = { x: c(a0) * ri, z: s(a0) * ri }, i1 = { x: c(a1) * ri, z: s(a1) * ri };
    // Outer wall
    pushQuad(out, { x: o0.x, y: -half, z: o0.z }, { x: o0.x, y: half, z: o0.z }, { x: o1.x, y: half, z: o1.z }, { x: o1.x, y: -half, z: o1.z });
    // Inner wall (normal inward → reversed winding)
    pushQuad(out, { x: i0.x, y: -half, z: i0.z }, { x: i1.x, y: -half, z: i1.z }, { x: i1.x, y: half, z: i1.z }, { x: i0.x, y: half, z: i0.z });
    // Top annulus
    pushQuad(out, { x: o0.x, y: half, z: o0.z }, { x: i0.x, y: half, z: i0.z }, { x: i1.x, y: half, z: i1.z }, { x: o1.x, y: half, z: o1.z });
    // Bottom annulus (reversed)
    pushQuad(out, { x: o0.x, y: -half, z: o0.z }, { x: o1.x, y: -half, z: o1.z }, { x: i1.x, y: -half, z: i1.z }, { x: i0.x, y: -half, z: i0.z });
  }
  return { positions: new Float32Array(out), triangleCount: out.length / 9 };
}

/**
 * Shell: box minus inner box from the top (open-top container wall).
 * Built as a single closed soup: 4 walls + floor. Open top — volume math
 * treats it as the closed equivalent (see volumeOf for 'shell').
 */
export function shellMesh(width: number, height: number, depth: number, wall = 3): TriSoup {
  const t = Math.max(0.5, wall);
  const hw = width / 2, hd = depth / 2;
  const out: number[] = [];
  // Floor slab
  const floor = boxMesh(width, t, depth);
  const f = floor.positions;
  for (let i = 0; i < f.length; i += 3) out.push(f[i], f[i + 1] - (height / 2 - t / 2), f[i + 2]);
  // 4 walls standing on the floor, up to total height
  const wallH = height - t;
  const addWall = (w: number, d: number, ox: number, oz: number) => {
    const m = boxMesh(w, wallH, d);
    const p = m.positions;
    const baseY = -height / 2 + t + wallH / 2;
    for (let i = 0; i < p.length; i += 3) out.push(p[i] + ox, p[i + 1] + baseY, p[i + 2] + oz);
  };
  addWall(width, t, 0, -(hd - t / 2));   // front wall (-Z)
  addWall(width, t, 0, hd - t / 2);      // back wall (+Z)
  addWall(t, depth - 2 * t, -(hw - t / 2), 0); // left wall
  addWall(t, depth - 2 * t, hw - t / 2, 0);    // right wall
  return { positions: new Float32Array(out), triangleCount: out.length / 9 };
}

/** Flat plate with rounded corners (rounded rect extrusion along Y). */
export function plateMesh(width: number, depth: number, thickness: number, corner = 4, segments = 24): TriSoup {
  const hw = width / 2, hd = depth / 2;
  const r = Math.min(corner, hw - 0.1, hd - 0.1);
  const half = thickness / 2;
  const out: number[] = [];
  // Perimeter points of rounded rectangle (in XZ plane), CCW seen from +Y
  const perim: { x: number; z: number }[] = [];
  const arc = (cx: number, cz: number, a0: number, a1: number, n: number) => {
    for (let i = 0; i <= n; i++) {
      const a = a0 + (a1 - a0) * (i / n);
      perim.push({ x: cx + Math.cos(a) * r, z: cz + Math.sin(a) * r });
    }
  };
  arc(hw - r, hd - r, 0, Math.PI / 2, Math.ceil(segments / 4));       // +X+Z corner
  arc(-(hw - r), hd - r, Math.PI / 2, Math.PI, Math.ceil(segments / 4));
  arc(-(hw - r), -(hd - r), Math.PI, Math.PI * 1.5, Math.ceil(segments / 4));
  arc(hw - r, -(hd - r), Math.PI * 1.5, Math.PI * 2, Math.ceil(segments / 4));
  const n = perim.length;
  // Side wall quads
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const a = perim[i], b = perim[j];
    pushQuad(out,
      { x: a.x, y: -half, z: a.z },
      { x: a.x, y: half, z: a.z },
      { x: b.x, y: half, z: b.z },
      { x: b.x, y: -half, z: b.z });
  }
  // Caps by triangle fan around centroid
  const centroid = perim.reduce((acc, p) => ({ x: acc.x + p.x / n, z: acc.z + p.z / n }), { x: 0, z: 0 });
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const a = perim[i], b = perim[j];
    pushTri(out, { x: centroid.x, y: half, z: centroid.z }, { x: a.x, y: half, z: a.z }, { x: b.x, y: half, z: b.z });
    pushTri(out, { x: centroid.x, y: -half, z: centroid.z }, { x: b.x, y: -half, z: b.z }, { x: a.x, y: -half, z: a.z });
  }
  return { positions: new Float32Array(out), triangleCount: out.length / 9 };
}

// ═══════════════════════════════════════════════════════════════
// PUBLIC MESH BUILDER
// ═══════════════════════════════════════════════════════════════

/** Build the transformed triangle soup for a single placed shape. */
export function buildShapeMesh(shape: PlacedShape): TriSoup {
  const p = shape.params;
  let mesh: TriSoup;
  switch (shape.kind) {
    case 'box':
      mesh = boxMesh(p.width ?? 20, p.height ?? 20, p.depth ?? 20);
      break;
    case 'cylinder':
      mesh = cylinderMesh(p.radius ?? 10, p.height ?? 20, p.segments);
      break;
    case 'cone': {
      const rt = p.radiusTop ?? 0;
      mesh = rt > 0.0001 ? frustumMesh(p.radius ?? 10, rt, p.height ?? 20, p.segments) : sharpConeMesh(p.radius ?? 10, p.height ?? 20, p.segments);
      break;
    }
    case 'sphere':
      mesh = sphereMesh(p.radius ?? 10, p.segments);
      break;
    case 'torus':
      mesh = torusMesh(p.ringRadius ?? 12, p.sectionRadius ?? 4, p.segments);
      break;
    case 'tube':
      mesh = tubeMesh(p.radius ?? 10, p.innerRadius ?? 6, p.height ?? 20, p.segments);
      break;
    case 'plate':
      mesh = plateMesh(p.width ?? 40, p.depth ?? 40, p.height ?? 4, p.cornerRadius, p.segments);
      break;
    case 'shell':
      mesh = shellMesh(p.width ?? 40, p.height ?? 20, p.depth ?? 30, p.wall);
      break;
    case 'ring':
      mesh = torusMesh(p.ringRadius ?? 12, p.sectionRadius ?? 4, p.segments);
      break;
    default:
      mesh = boxMesh(20, 20, 20);
  }
  // Apply rotation + translation
  const src = mesh.positions;
  const out = new Float32Array(src.length);
  for (let i = 0; i < src.length; i += 3) {
    const r = rotatePoint({ x: src[i], y: src[i + 1], z: src[i + 2] }, shape.rotation);
    out[i] = r.x + shape.position.x;
    out[i + 1] = r.y + shape.position.y;
    out[i + 2] = r.z + shape.position.z;
  }
  return { positions: out, triangleCount: mesh.triangleCount };
}

/** Sharp cone helper (kept separate for clarity). */
export function sharpConeMesh(radius: number, height: number, segments = DEFAULT_SEGMENTS): TriSoup {
  const out: number[] = [];
  const half = height / 2;
  const apex = { x: 0, y: half, z: 0 };
  for (let i = 0; i < segments; i++) {
    const a0 = (i / segments) * Math.PI * 2;
    const a1 = ((i + 1) / segments) * Math.PI * 2;
    const x0 = Math.cos(a0) * radius, z0 = Math.sin(a0) * radius;
    const x1 = Math.cos(a1) * radius, z1 = Math.sin(a1) * radius;
    pushTri(out, { x: x0, y: -half, z: z0 }, apex, { x: x1, y: -half, z: z1 });
    pushTri(out, { x: 0, y: -half, z: 0 }, { x: x0, y: -half, z: z0 }, { x: x1, y: -half, z: z1 });
  }
  return { positions: new Float32Array(out), triangleCount: out.length / 9 };
}

/** Merge all shapes of a model into one triangle soup (for STL + volume). */
export function buildModelMesh(model: CADModel): TriSoup {
  let totalTris = 0;
  for (const s of model.shapes) totalTris += buildShapeMesh(s).triangleCount;
  const out = new Float32Array(totalTris * 9);
  let off = 0;
  for (const s of model.shapes) {
    const m = buildShapeMesh(s);
    out.set(m.positions, off);
    off += m.positions.length;
  }
  return { positions: out, triangleCount: totalTris };
}

// ═══════════════════════════════════════════════════════════════
// GEOMETRY MATH — exact for closed soups
// ═══════════════════════════════════════════Signed volume ═════

/**
 * Exact signed volume of a closed triangle soup (divergence theorem).
 * Positive when winding is consistently outward.
 */
export function signedVolume(mesh: TriSoup): number {
  const p = mesh.positions;
  let v = 0;
  for (let i = 0; i < p.length; i += 9) {
    const ax = p[i], ay = p[i + 1], az = p[i + 2];
    const bx = p[i + 3], by = p[i + 4], bz = p[i + 5];
    const cx = p[i + 6], cy = p[i + 7], cz = p[i + 8];
    v += (ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)) / 6;
  }
  return v;
}

/** Surface area (sum of triangle areas). */
export function surfaceArea(mesh: TriSoup): number {
  const p = mesh.positions;
  let a = 0;
  for (let i = 0; i < p.length; i += 9) {
    const ux = p[i + 3] - p[i], uy = p[i + 4] - p[i + 1], uz = p[i + 5] - p[i + 2];
    const vx = p[i + 6] - p[i], vy = p[i + 7] - p[i + 1], vz = p[i + 8] - p[i + 2];
    const cx = uy * vz - uz * vy;
    const cy = uz * vx - ux * vz;
    const cz = ux * vy - uy * vx;
    a += Math.sqrt(cx * cx + cy * cy + cz * cz) / 2;
  }
  return a;
}

/** Axis-aligned bounding box. */
export function boundingBox(mesh: TriSoup): { min: Vec3; max: Vec3; size: Vec3 } {
  const p = mesh.positions;
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (let i = 0; i < p.length; i += 3) {
    if (p[i] < minX) minX = p[i]; if (p[i] > maxX) maxX = p[i];
    if (p[i + 1] < minY) minY = p[i + 1]; if (p[i + 1] > maxY) maxY = p[i + 1];
    if (p[i + 2] < minZ) minZ = p[i + 2]; if (p[i + 2] > maxZ) maxZ = p[i + 2];
  }
  const size = { x: maxX - minX, y: maxY - minY, z: maxZ - minZ };
  return { min: { x: minX, y: minY, z: minZ }, max: { x: maxX, y: maxY, z: maxZ }, size };
}

export interface ModelStats {
  volumeMm3: number;
  volumeCm3: number;
  surfaceAreaMm2: number;
  /** Estimated mass in grams via material density. */
  massG: number;
  boundingBoxMm: Vec3;
  triangles: number;
  /** Wall thickness sanity for shell/plate kinds. */
  printability: {
    ok: boolean;
    notes: string[];
  };
}

/** Compute full stats for a model. */
export function modelStats(model: CADModel): ModelStats {
  let vol = 0;
  let area = 0;
  let tris = 0;
  const perShape: TriSoup[] = [];
  for (const s of model.shapes) {
    const m = buildShapeMesh(s);
    perShape.push(m);
    // Volume: shell and plate kinds are open/odd closed forms — handle explicitly.
    if (s.kind === 'shell') {
      const w = s.params.width ?? 40, h = s.params.height ?? 20, d = s.params.depth ?? 30;
      const t = Math.max(0.5, s.params.wall ?? 3);
      // Exact open-top box material volume: outer prism minus inner cavity.
      vol += w * h * d - Math.max(0, w - 2 * t) * Math.max(0, d - 2 * t) * Math.max(0, h - t);
      area += surfaceArea(m);
      tris += m.triangleCount;
      continue;
    }
    if (s.kind === 'plate') {
      const w = s.params.width ?? 40, d = s.params.depth ?? 40, th = s.params.height ?? 4;
      vol += w * d * th; // plates are solid
      area += surfaceArea(m);
      tris += m.triangleCount;
      continue;
    }
    vol += Math.abs(signedVolume(m));
    area += surfaceArea(m);
    tris += m.triangleCount;
  }
  // Combined bbox across all shapes
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (const m of perShape) {
    const bb = boundingBox(m);
    minX = Math.min(minX, bb.min.x); minY = Math.min(minY, bb.min.y); minZ = Math.min(minZ, bb.min.z);
    maxX = Math.max(maxX, bb.max.x); maxY = Math.max(maxY, bb.max.y); maxZ = Math.max(maxZ, bb.max.z);
  }
  const density = MATERIALS[model.material]?.density ?? 1.2;
  const size = { x: maxX - minX, y: maxY - minY, z: maxZ - minZ };
  const volumeCm3 = vol / 1000;
  const notes: string[] = [];
  const minDim = Math.min(size.x, size.y, size.z);
  if (minDim < 5) notes.push(`Smallest dimension is ${minDim.toFixed(1)} mm — thin features may not print below 2 mm wall rules.`);
  if (model.shapes.some(s => s.kind === 'sphere') && model.shapes.length === 1) notes.push('Spheres print well with supports on the lower hemisphere; consider a flat cut if FDM.');
  if (model.shapes.length > 30) notes.push('Model has many parts — check assembly clearances (0.2–0.4 mm typical FDM fit).');
  return {
    volumeMm3: vol,
    volumeCm3,
    surfaceAreaMm2: area,
    massG: volumeCm3 * density,
    boundingBoxMm: size,
    triangles: tris,
    printability: { ok: minDim >= 2, notes },
  };
}

// ═══════════════════════════════════════════════════════════════
// STL EXPORT
// ═══════════════════════════════════════════════════════════════

/** Export model to ASCII STL (widely compatible with slicers). */
export function exportSTL(model: CADModel): string {
  const lines: string[] = [];
  lines.push(`solid ${model.name.replace(/\s+/g, '_')}`);
  for (const s of model.shapes) {
    const mesh = buildShapeMesh(s);
    const p = mesh.positions;
    for (let i = 0; i < p.length; i += 9) {
      const nx = 0, ny = 1, nz = 0; // slicers recompute; normal not critical
      lines.push(`  facet normal ${nx} ${ny} ${nz}`);
      lines.push('    outer loop');
      for (let v = 0; v < 9; v += 3) {
        lines.push(`      vertex ${p[i + v].toFixed(4)} ${p[i + v + 1].toFixed(4)} ${p[i + v + 2].toFixed(4)}`);
      }
      lines.push('    endloop');
      lines.push('  endfacet');
    }
  }
  lines.push(`endsolid ${model.name.replace(/\s+/g, '_')}`);
  return lines.join('\n');
}

/**
 * Download STL via Blob (browser). Returns filename.
 */
export function downloadSTL(model: CADModel): string {
  const stl = exportSTL(model);
  const blob = new Blob([stl], { type: 'model/stl' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const fname = `${model.name.replace(/[^a-z0-9_-]+/gi, '_').toLowerCase() || 'model'}.stl`;
  a.href = url;
  a.download = fname;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return fname;
}

// ═══════════════════════════════════════════════════════════════
// TEMPLATES — one-command parametric starting points
// ═══════════════════════════════════════════════════════════════

export interface CADTemplate {
  id: string;
  name: string;
  description: string;
  /** Default parameter values, overridable by the user. */
  defaults: Record<string, number>;
  /** Human-readable parameter schema for the UI. */
  params: { key: string; label: string; min: number; max: number; step: number; unit: 'mm' | 'deg' }[];
  material: MaterialId;
  build: (p: Record<string, number>) => PlacedShape[];
}

const at = (x = 0, y = 0, z = 0): Vec3 => ({ x, y, z });
const noRot = (): Vec3 => ({ x: 0, y: 0, z: 0 });

export const CAD_TEMPLATES: CADTemplate[] = [
  {
    id: 'phone-case',
    name: 'Phone Case',
    description: 'Protective shell with camera cutout spacing. Print with TPU or PETG for flexibility.',
    defaults: { width: 78, depth: 160, height: 14, wall: 3 },
    params: [
      { key: 'width', label: 'Width', min: 50, max: 120, step: 1, unit: 'mm' },
      { key: 'depth', label: 'Depth (height of phone)', min: 100, max: 220, step: 1, unit: 'mm' },
      { key: 'height', label: 'Case height', min: 8, max: 30, step: 1, unit: 'mm' },
      { key: 'wall', label: 'Wall thickness', min: 1.5, max: 6, step: 0.5, unit: 'mm' },
    ],
    material: 'petg',
    build: p => [
      { kind: 'shell', params: { width: p.width, height: p.height, depth: p.depth, wall: p.wall }, position: at(), rotation: noRot(), label: 'Case body' },
      { kind: 'plate', params: { width: p.width * 0.4, depth: 4, height: p.wall + 2, corner: 2 }, position: at(0, p.height / 2 - 2, -p.depth / 2 + 12), rotation: noRot(), label: 'Camera bump guard' },
    ],
  },
  {
    id: 'enclosure',
    name: 'Electronics Enclosure',
    description: 'Box with wall thickness for PCBs and small electronics. Ventilation slots omitted (drill or model cutouts later).',
    defaults: { width: 90, depth: 70, height: 32, wall: 2.5 },
    params: [
      { key: 'width', label: 'Width', min: 40, max: 200, step: 1, unit: 'mm' },
      { key: 'depth', label: 'Depth', min: 40, max: 200, step: 1, unit: 'mm' },
      { key: 'height', label: 'Height', min: 15, max: 100, step: 1, unit: 'mm' },
      { key: 'wall', label: 'Wall thickness', min: 1.5, max: 6, step: 0.5, unit: 'mm' },
    ],
    material: 'pla',
    build: p => [
      { kind: 'shell', params: { width: p.width, height: p.height, depth: p.depth, wall: p.wall }, position: at(), rotation: noRot(), label: 'Enclosure body' },
      { kind: 'plate', params: { width: p.width + 4, depth: p.depth + 4, height: 3, corner: 2 }, position: at(0, p.height / 2 + 1.5, 0), rotation: noRot(), label: 'Snap-on lid' },
    ],
  },
  {
    id: 'gear',
    name: 'Spur Gear (simplified)',
    description: 'Cylindrical gear blank with hub. True involute teeth require a slicing plugin; this produces the base hub to print as a starting point.',
    defaults: { radius: 25, height: 8, hubRadius: 6, boreRadius: 3 },
    params: [
      { key: 'radius', label: 'Gear radius', min: 8, max: 60, step: 1, unit: 'mm' },
      { key: 'height', label: 'Thickness', min: 3, max: 20, step: 1, unit: 'mm' },
      { key: 'hubRadius', label: 'Hub radius', min: 3, max: 15, step: 0.5, unit: 'mm' },
      { key: 'boreRadius', label: 'Bore radius', min: 1.5, max: 8, step: 0.5, unit: 'mm' },
    ],
    material: 'petg',
    build: p => [
      { kind: 'cylinder', params: { radius: p.radius, height: p.height }, position: at(), rotation: noRot(), label: 'Gear blank' },
      { kind: 'cylinder', params: { radius: p.hubRadius, height: p.height + 4 }, position: at(0, 2, 0), rotation: noRot(), label: 'Hub' },
    ],
  },
  {
    id: 'dome-orb',
    name: 'Dome / Orb',
    description: 'Solid or hollow sphere for markers, knobs, and decorative orbs.',
    defaults: { radius: 20, segments: 48 },
    params: [
      { key: 'radius', label: 'Radius', min: 5, max: 50, step: 1, unit: 'mm' },
      { key: 'segments', label: 'Smoothness', min: 16, max: 64, step: 8, unit: 'deg' },
    ],
    material: 'resin',
    build: p => [
      { kind: 'sphere', params: { radius: p.radius, segments: p.segments }, position: at(), rotation: noRot(), label: 'Orb' },
    ],
  },
  {
    id: 'robot-arm-segment',
    name: 'Robot Arm Segment',
    description: 'Tubular arm segment with flange mounts at both ends — a building block for articulated rigs.',
    defaults: { radius: 15, innerRadius: 11, height: 120, flangeRadius: 22, flangeThickness: 5 },
    params: [
      { key: 'radius', label: 'Tube outer radius', min: 8, max: 30, step: 1, unit: 'mm' },
      { key: 'innerRadius', label: 'Tube inner radius', min: 4, max: 24, step: 1, unit: 'mm' },
      { key: 'height', label: 'Length', min: 40, max: 300, step: 5, unit: 'mm' },
      { key: 'flangeRadius', label: 'Flange radius', min: 12, max: 40, step: 1, unit: 'mm' },
      { key: 'flangeThickness', label: 'Flange thickness', min: 3, max: 12, step: 1, unit: 'mm' },
    ],
    material: 'carbon_fiber',
    build: p => [
      { kind: 'tube', params: { radius: p.radius, innerRadius: p.innerRadius, height: p.height }, position: at(), rotation: noRot(), label: 'Arm tube' },
      { kind: 'cylinder', params: { radius: p.flangeRadius, height: p.flangeThickness }, position: at(0, p.height / 2 + p.flangeThickness / 2, 0), rotation: noRot(), label: 'Top flange' },
      { kind: 'cylinder', params: { radius: p.flangeRadius, height: p.flangeThickness }, position: at(0, -p.height / 2 - p.flangeThickness / 2, 0), rotation: noRot(), label: 'Bottom flange' },
    ],
  },
  {
    id: 'speaker-horn',
    name: 'Acoustic Horn',
    description: 'Exponential-ish flare (truncated cone) for passive phone amps and speaker prototypes.',
    defaults: { radius: 18, radiusTop: 45, height: 90, segments: 48 },
    params: [
      { key: 'radius', label: 'Throat radius', min: 5, max: 40, step: 1, unit: 'mm' },
      { key: 'radiusTop', label: 'Mouth radius', min: 10, max: 80, step: 1, unit: 'mm' },
      { key: 'height', label: 'Length', min: 30, max: 200, step: 5, unit: 'mm' },
      { key: 'segments', label: 'Smoothness', min: 16, max: 64, step: 8, unit: 'deg' },
    ],
    material: 'pla',
    build: p => [
      { kind: 'cone', params: { radius: p.radius, radiusTop: p.radiusTop, height: p.height, segments: p.segments }, position: at(), rotation: noRot(), label: 'Horn flare' },
    ],
  },
  {
    id: 'bracket',
    name: 'L-Bracket',
    description: 'Right-angle mounting bracket with gusset. Strength comes from the gusset — don\u2019t skip it.',
    defaults: { width: 60, depth: 60, thickness: 6, height: 60, gusset: 0.8 },
    params: [
      { key: 'width', label: 'Arm width', min: 20, max: 120, step: 1, unit: 'mm' },
      { key: 'depth', label: 'Arm length', min: 20, max: 120, step: 1, unit: 'mm' },
      { key: 'thickness', label: 'Thickness', min: 3, max: 15, step: 1, unit: 'mm' },
      { key: 'height', label: 'Vertical arm length', min: 20, max: 120, step: 1, unit: 'mm' },
      { key: 'gusset', label: 'Gusset size (0 = none)', min: 0, max: 1, step: 0.05, unit: 'deg' },
    ],
    material: 'abs',
    build: p => [
      { kind: 'box', params: { width: p.width, height: p.thickness, depth: p.depth }, position: at(0, -p.height / 2, 0), rotation: noRot(), label: 'Base arm' },
      { kind: 'box', params: { width: p.width, height: p.height, depth: p.thickness }, position: at(0, 0, -p.depth / 2 + p.thickness / 2), rotation: noRot(), label: 'Vertical arm' },
      ...(p.gusset > 0 ? [{ kind: 'cone' as const, params: { radius: Math.min(p.depth, p.height) * p.gusset * 0.5, height: Math.min(p.depth, p.height) * p.gusset }, position: at(0, -p.height / 2 + Math.min(p.depth, p.height) * p.gusset / 2, -p.depth / 2 + p.thickness), rotation: { x: 90, y: 0, z: 0 } as Vec3, label: 'Gusset' }] : []),
    ],
  },
];

/** Build a CADModel from a template + parameter overrides. */
export function buildFromTemplate(templateId: string, overrides: Record<string, number> = {}): CADModel {
  const t = CAD_TEMPLATES.find(x => x.id === templateId);
  if (!t) throw new Error(`Unknown template: ${templateId}`);
  const params = { ...t.defaults, ...overrides };
  return {
    name: t.name,
    templateId: t.id,
    units: 'mm',
    shapes: t.build(params),
    material: t.material,
  };
}

// ═══════════════════════════════════════════════════════════════
// NATURAL LANGUAGE → MODEL
// ═══════════════════════════════════════════════════════════════

const TEMPLATE_KEYWORDS: Record<string, string[]> = {
  'phone-case': ['phone case', 'phone cover', 'mobile case', 'case for my phone'],
  'enclosure': ['enclosure', 'case for', 'project box', 'pcb box', 'electronics box', 'arduino case', 'esp32 case', 'raspberry pi case'],
  'gear': ['gear', 'cog', 'sprocket'],
  'dome-orb': ['orb', 'ball', 'sphere', 'dome', 'knob', 'marble'],
  'robot-arm-segment': ['arm segment', 'robot arm', 'arm tube', 'articulated'],
  'speaker-horn': ['horn', 'speaker horn', 'acoustic', 'phone amp', 'passive amplifier'],
  'bracket': ['bracket', 'angle mount', 'l bracket', 'mounting bracket', 'shelf bracket'],
};

/**
 * Parse a natural-language request into (template, overrides).
 * Extracts dimensions like "80mm", "3 mm wall", "radius 25".
 */
export function parseCADRequest(text: string): { templateId: string; overrides: Record<string, number>; matched: boolean } {
  const lower = text.toLowerCase();

  let best: { id: string; score: number } | null = null;
  for (const [id, kws] of Object.entries(TEMPLATE_KEYWORDS)) {
    for (const kw of kws) {
      if (lower.includes(kw)) {
        const score = kw.length; // longer keyword = more specific
        if (!best || score > best.score) best = { id, score };
      }
    }
  }
  if (!best) return { templateId: '', overrides: {}, matched: false };

  // Dimension extraction: "80mm", "80 mm", "3mm wall", "radius of 25", "30cm"
  const overrides: Record<string, number> = {};
  const dims: number[] = [];
  const re = /(\d+(?:\.\d+)?)\s*(mm|cm|in)?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(lower)) !== null) {
    let v = parseFloat(m[1]);
    const unit = m[2] ?? 'mm';
    if (unit === 'cm') v *= 10;
    else if (unit === 'in') v *= 25.4;
    if (Number.isFinite(v) && v > 0) dims.push(v);
  }

  // Assign dimensions heuristically in the order the template lists params.
  const t = CAD_TEMPLATES.find(x => x.id === best!.id)!;
  if (dims.length > 0) {
    // Skip segments/smoothness params (unitless-ish) when consuming dims.
    const dimKeys = t.params.filter(p => p.unit === 'mm').map(p => p.key);
    for (let i = 0; i < Math.min(dims.length, dimKeys.length); i++) {
      const key = dimKeys[i];
      const pdef = t.params.find(p => p.key === key)!;
      overrides[key] = clamp(pdef.min, pdef.max, dims[i]);
    }
  }

  // "wall" keyword targeting
  const wallMatch = lower.match(/(\d+(?:\.\d+)?)\s*mm?\s*wall/);
  if (wallMatch) {
    const w = parseFloat(wallMatch[1]);
    if (t.params.some(p => p.key === 'wall')) overrides.wall = clamp(1.5, 6, w);
  }

  return { templateId: best.id, overrides, matched: true };
}

function clamp(min: number, max: number, v: number): number {
  return Math.max(min, Math.min(max, v));
}
