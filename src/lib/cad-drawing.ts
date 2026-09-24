/**
 * JARVIS CAD Drawing Pack — production documentation from the parametric model.
 *
 *  · threeViewSVG  — dimensioned 3-view engineering drawing (front/top/side,
 *                    third-angle projection, extension+dimension lines with
 *                    arrowheads, title block) per ASME Y14.5 practice
 *  · exportDXF     — wireframe outlines as DXF (R12) for import into
 *                    Fusion/FreeCAD/AutoCAD
 *  · modelBOM      — parts list with materials, quantities, and notes
 *
 * These outputs are what a machine shop or a prototyping house needs to
 * quote and build the part.
 */

import type { CADModel } from './cad';
import { MATERIALS, modelStats, buildShapeMesh, type PlacedShape } from './cad';

// ── helpers ─────────────────────────────────────────────────────

interface Dim2 { w: number; d: number } // projected size

function project(shape: PlacedShape, view: 'front' | 'top' | 'side'): Dim2 {
  const p = shape.params;
  // Torus/ring have no width/height — their extent is (R + r) × 2.
  const outer = p.ringRadius != null
    ? ((p.ringRadius ?? 10) + (p.sectionRadius ?? 2)) * 2
    : (p.radius ?? 10) * 2;
  switch (view) {
    case 'front': return { w: p.width ?? outer, d: p.height ?? (p.depth ?? outer) };
    case 'top':   return { w: p.width ?? outer, d: p.depth ?? outer };
    case 'side':  return { w: p.depth ?? outer, d: p.height ?? (p.width ?? outer) };
  }
}

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

interface DimLineOpts {
  x1: number; y1: number; x2: number; y2: number; // measured line in paper coords
  offset: number; // perpendicular offset for the dim line
  label: string;
  vertical?: boolean;
}

/** One extension-line pair + dimension line + arrowheads + text. */
function dimensionSvg(o: DimLineOpts): string {
  const { x1, y1, x2, y2, offset, label, vertical } = o;
  const c = '#e8e2d6'; // light ink for dark sheet
  const g = '#8a857a';
  if (vertical) {
    const x = Math.max(x1, x2) + offset;
    return `
  <line x1="${x1}" y1="${y1}" x2="${x + 4}" y2="${y1}" stroke="${g}" stroke-width="0.5"/>
  <line x1="${x2}" y1="${y2}" x2="${x + 4}" y2="${y2}" stroke="${g}" stroke-width="0.5"/>
  <line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" stroke="${c}" stroke-width="0.7"/>
  <path d="M ${x} ${y1} l 2.5 6 M ${x} ${y1} l -2.5 6 M ${x} ${y2} l 2.5 -6 M ${x} ${y2} l -2.5 -6" stroke="${c}" stroke-width="0.9" fill="none"/>
  <text x="${x - 5}" y="${(y1 + y2) / 2}" font-size="10" fill="${c}" text-anchor="middle" transform="rotate(-90 ${x - 5} ${(y1 + y2) / 2})" font-family="JetBrains Mono, monospace">${label}</text>`;
  }
  const y = Math.min(y1, y2) - offset;
  return `
  <line x1="${x1}" y1="${y1}" x2="${x1}" y2="${y - 4}" stroke="${g}" stroke-width="0.5"/>
  <line x1="${x2}" y1="${y2}" x2="${x2}" y2="${y - 4}" stroke="${g}" stroke-width="0.5"/>
  <line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${c}" stroke-width="0.7"/>
  <path d="M ${x1} ${y} l 6 2.5 M ${x1} ${y} l 6 -2.5 M ${x2} ${y} l -6 2.5 M ${x2} ${y} l -6 -2.5" stroke="${c}" stroke-width="0.9" fill="none"/>
  <text x="${(x1 + x2) / 2}" y="${y - 5}" font-size="10" fill="${c}" text-anchor="middle" font-family="JetBrains Mono, monospace">${label}</text>`;
}

function outlinePath(points: Array<[number, number]>): string {
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ') + ' Z';
}

/** Rectangular outline of a shape in a view, centered at (cx, cy). */
function shapeOutline(s: PlacedShape, view: 'front' | 'top' | 'side', cx: number, cy: number, scale: number): string {
  const { w, d } = project(s, view);
  const hw = (w * scale) / 2;
  const hd = (d * scale) / 2;
  const round = s.kind === 'cylinder' || s.kind === 'sphere' || s.kind === 'torus' || (s.params.cornerRadius ?? 0) > (s.params.width ?? 0) / 2;
  if (round && (view !== 'top' || s.kind !== 'cylinder')) {
    const rx = Math.min(hw, hd);
    if (view === 'front' && (s.kind === 'cylinder' || s.kind === 'sphere')) {
      return `<rect x="${cx - hw}" y="${cy - hd}" width="${hw * 2}" height="${hd * 2}" rx="${Math.min(hw, 8)}" fill="none" stroke="#cfc9bc" stroke-width="1"/>`;
    }
    return `<ellipse cx="${cx}" cy="${cy}" rx="${hw}" ry="${hd}" fill="none" stroke="#cfc9bc" stroke-width="1"/>`;
  }
  return `<rect x="${cx - hw}" y="${cy - hd}" width="${hw * 2}" height="${hd * 2}" rx="${s.params.cornerRadius ? s.params.cornerRadius * scale : 1}" fill="none" stroke="#cfc9bc" stroke-width="1"/>`;
}

// ── 3-view drawing ──────────────────────────────────────────────

export interface DrawingOptions {
  title: string;
  drawnBy?: string;
  material?: string;
  scaleText?: string;
}

/**
 * Third-angle projection sheet (A3 landscape ratio): front, top above,
 * right side. Dimensions: overall bbox in each view + wall thickness note.
 */
export function threeViewSVG(model: CADModel, opts: DrawingOptions): string {
  const stats = modelStats(model);
  const bb = stats.boundingBoxMm;
  const W = 1120, H = 640; // sheet
  const scale = Math.min(1, 340 / Math.max(bb.x, bb.z, bb.y));
  const midX = W / 2, midY = H / 2;

  // View centers (third-angle: top view above front, right view right of front)
  const frontC = { x: midX - 180, y: midY + 40 };
  const topC = { x: midX - 180, y: midY + 40 - (bb.y * scale) / 2 - (bb.z * scale) / 2 - 60 };
  const sideC = { x: midX - 180 + (bb.x * scale) / 2 + (bb.z * scale) / 2 + 80, y: midY + 40 };

  const bodies: string[] = [];
  const shapes = model.shapes.filter(s => ['shell', 'plate', 'box', 'cylinder', 'sphere', 'tube', 'ring', 'torus', 'cone'].includes(s.kind));

  for (const s of shapes) {
    bodies.push(shapeOutline(s, 'front', frontC.x, frontC.y, scale));
    bodies.push(shapeOutline(s, 'top', topC.x, topC.y, scale));
    bodies.push(shapeOutline(s, 'side', sideC.x, sideC.y, scale));
  }

  // Dimensions per view (overall size)
  const dims: string[] = [];
  dims.push(dimensionSvg({ x1: frontC.x - (bb.x * scale) / 2, y1: frontC.y + (bb.y * scale) / 2, x2: frontC.x + (bb.x * scale) / 2, y2: frontC.y + (bb.y * scale) / 2, offset: 34, label: `${fmt(bb.x)}` }));
  dims.push(dimensionSvg({ x1: frontC.x - (bb.x * scale) / 2, y1: frontC.y - (bb.y * scale) / 2, x2: frontC.x - (bb.x * scale) / 2, y2: frontC.y + (bb.y * scale) / 2, offset: 34, label: `${fmt(bb.y)}`, vertical: true }));
  dims.push(dimensionSvg({ x1: topC.x - (bb.x * scale) / 2, y1: topC.y + (bb.z * scale) / 2, x2: topC.x + (bb.x * scale) / 2, y2: topC.y + (bb.z * scale) / 2, offset: 30, label: `${fmt(bb.x)}` }));
  dims.push(dimensionSvg({ x1: sideC.x - (bb.z * scale) / 2, y1: sideC.y + (bb.y * scale) / 2, x2: sideC.x + (bb.z * scale) / 2, y2: sideC.y + (bb.y * scale) / 2, offset: 34, label: `${fmt(bb.z)}` }));

  // Wall thickness note with leader
  const walls = model.shapes.filter(s => s.params.wall != null).map(s => s.params.wall!);
  const wall = walls.length ? Math.min(...walls) : null;
  const leader = wall ? `
  <line x1="${frontC.x + (bb.x * scale) / 2 - 8}" y1="${frontC.y - (bb.y * scale) / 2 + 8}" x2="${frontC.x + (bb.x * scale) / 2 + 46}" y2="${frontC.y - (bb.y * scale) / 2 - 24}" stroke="#8a857a" stroke-width="0.6"/>
  <circle cx="${frontC.x + (bb.x * scale) / 2 - 8}" cy="${frontC.y - (bb.y * scale) / 2 + 8}" r="1.6" fill="#e8e2d6"/>
  <text x="${frontC.x + (bb.x * scale) / 2 + 50}" y="${frontC.y - (bb.y * scale) / 2 - 26}" font-size="9.5" fill="#e8e2d6" font-family="JetBrains Mono, monospace">WALL ${fmt(wall)} ±0.2</text>` : '';

  // Title block (bottom-right)
  const tbX = W - 340, tbY = H - 92;
  const date = new Date().toISOString().slice(0, 10);
  const titleBlock = `
  <g>
    <rect x="${tbX}" y="${tbY}" width="320" height="72" fill="none" stroke="#6b665c" stroke-width="0.8"/>
    <line x1="${tbX}" y1="${tbY + 24}" x2="${tbX + 320}" y2="${tbY + 24}" stroke="#6b665c" stroke-width="0.6"/>
    <line x1="${tbX}" y1="${tbY + 48}" x2="${tbX + 320}" y2="${tbY + 48}" stroke="#6b665c" stroke-width="0.6"/>
    <line x1="${tbX + 200}" y1="${tbY}" x2="${tbX + 200}" y2="${tbY + 72}" stroke="#6b665c" stroke-width="0.6"/>
    <text x="${tbX + 8}" y="${tbY + 16}" font-size="11" fill="#f0ece2" font-family="Sora, sans-serif" font-weight="600">${opts.title}</text>
    <text x="${tbX + 208}" y="${tbY + 16}" font-size="9" fill="#8a857a" font-family="JetBrains Mono, monospace">DWG NO. JR-${model.templateId.toUpperCase().slice(0, 6)}-01</text>
    <text x="${tbX + 8}" y="${tbY + 40}" font-size="9" fill="#8a857a" font-family="JetBrains Mono, monospace">MATERIAL: ${opts.material ?? MATERIALS[model.material].label}</text>
    <text x="${tbX + 208}" y="${tbY + 40}" font-size="9" fill="#8a857a" font-family="JetBrains Mono, monospace">SCALE 1:${opts.scaleText ?? (scale < 1 ? '2' : '1')}</text>
    <text x="${tbX + 8}" y="${tbY + 64}" font-size="9" fill="#8a857a" font-family="JetBrains Mono, monospace">TOL ISO 2768-m UNLESS NOTED</text>
    <text x="${tbX + 208}" y="${tbY + 64}" font-size="9" fill="#8a857a" font-family="JetBrains Mono, monospace">DRAWN ${opts.drawnBy ?? 'JARVIS'} · ${date}</text>
  </g>`;

  // View labels
  const labels = `
  <text x="${frontC.x}" y="${frontC.y + (bb.y * scale) / 2 + 58}" font-size="10" fill="#8a857a" text-anchor="middle" font-family="JetBrains Mono, monospace">FRONT</text>
  <text x="${topC.x}" y="${topC.y - (bb.z * scale) / 2 - 12}" font-size="10" fill="#8a857a" text-anchor="middle" font-family="JetBrains Mono, monospace">TOP</text>
  <text x="${sideC.x}" y="${sideC.y + (bb.y * scale) / 2 + 58}" font-size="10" fill="#8a857a" text-anchor="middle" font-family="JetBrains Mono, monospace">RIGHT</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="monospace">
  <rect width="${W}" height="${H}" fill="#121216"/>
  <rect x="12" y="12" width="${W - 24}" height="${H - 24}" fill="none" stroke="#6b665c" stroke-width="1"/>
  ${bodies.join('\n')}
  ${dims.join('\n')}
  ${leader}
  ${labels}
  ${titleBlock}
</svg>`;
}

// ── DXF (R12) — polylines of each view's outline ────────────────

export function exportDXF(model: CADModel): string {
  const bb = modelStats(model).boundingBoxMm;
  const scale = 1; // DXF in real mm
  const lines: string[] = ['0', 'SECTION', '2', 'ENTITIES'];

  const addRect = (cx: number, cy: number, w: number, d: number) => {
    const x1 = cx - w / 2, x2 = cx + w / 2, y1 = cy - d / 2, y2 = cy + d / 2;
    const pts: Array<[number, number]> = [[x1, y1], [x2, y1], [x2, y2], [x1, y2]];
    for (let i = 0; i < 4; i++) {
      const [ax, ay] = pts[i];
      const [bx, by] = pts[(i + 1) % 4];
      lines.push('0', 'LINE', '8', 'OUTLINE', '10', ax.toFixed(3), '20', ay.toFixed(3), '11', bx.toFixed(3), '21', by.toFixed(3));
    }
  };

  // Lay out front at origin, top above, side right (paper mm)
  const off = Math.max(bb.x, bb.z, bb.y) + 30;
  for (const s of model.shapes) {
    const f = project(s, 'front');
    const t = project(s, 'top');
    const sd = project(s, 'side');
    addRect(0, 0, f.w * scale, f.d * scale);
    addRect(0, off, t.w * scale, t.d * scale);
    addRect(off, 0, sd.w * scale, sd.d * scale);
  }
  lines.push('0', 'ENDSEC', '0', 'EOF');
  return lines.join('\n');
}

// ── Model BOM ───────────────────────────────────────────────────

export interface BomRow { part: string; qty: number; material: string; note: string }

export function modelBOM(model: CADModel): BomRow[] {
  const rows: BomRow[] = model.shapes.map((s, i) => ({
    part: `${String(i + 1).padStart(2, '0')} · ${s.label}`,
    qty: 1,
    material: MATERIALS[model.material].label,
    note: describeShape(s),
  }));
  return rows;
}

function describeShape(s: PlacedShape): string {
  const p = s.params;
  switch (s.kind) {
    case 'shell': return `Open-top box ${fmt(p.width ?? 0)}×${fmt(p.depth ?? 0)}×${fmt(p.height ?? 0)} mm, wall ${fmt(p.wall ?? 0)} mm`;
    case 'plate': return `Flat plate ${fmt(p.width ?? 0)}×${fmt(p.depth ?? 0)}×${fmt(p.height ?? 0)} mm, r${fmt(p.cornerRadius ?? 0)}`;
    case 'box': return `Solid box ${fmt(p.width ?? 0)}×${fmt(p.height ?? 0)}×${fmt(p.depth ?? 0)} mm`;
    case 'cylinder': return `Ø${fmt((p.radius ?? 0) * 2)} × ${fmt(p.height ?? 0)} mm`;
    case 'tube': case 'ring': return `Tube Ø${fmt((p.radius ?? 0) * 2)}/Ø${fmt((p.innerRadius ?? 0) * 2)} × ${fmt(p.height ?? 0)} mm`;
    case 'sphere': return `Sphere Ø${fmt((p.radius ?? 0) * 2)} mm`;
    case 'cone': return `Cone Ø${fmt((p.radius ?? 0) * 2)}→Ø${fmt((p.radiusTop ?? 0) * 2)} × ${fmt(p.height ?? 0)} mm`;
    case 'torus': return `Torus R${fmt(p.ringRadius ?? 0)}, r${fmt(p.sectionRadius ?? 0)} mm`;
    default: return s.kind;
  }
}

// ── Download helpers (browser) ──────────────────────────────────

export function downloadText(filename: string, content: string, mime = 'image/svg+xml'): string {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return filename;
}
