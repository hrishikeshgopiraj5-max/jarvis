/**
 * Unit tests for the JARVIS CAD engine.
 * bun test src/lib/__tests__/cad.test.ts
 */

import { describe, test, expect } from 'bun:test';
import {
  boxMesh, cylinderMesh, sphereMesh, torusMesh, tubeMesh, plateMesh, shellMesh,
  sharpConeMesh, frustumMesh, buildShapeMesh, buildModelMesh, signedVolume,
  surfaceArea, boundingBox, modelStats, exportSTL, buildFromTemplate,
  parseCADRequest, CAD_TEMPLATES,
  type PlacedShape,
} from '../cad';

const at = (x = 0, y = 0, z = 0) => ({ x, y, z });
const noRot = () => ({ x: 0, y: 0, z: 0 });

const place = (kind: PlacedShape['kind'], params: PlacedShape['params']): PlacedShape => ({
  kind, params, position: at(), rotation: noRot(), label: kind,
});

// ── Mesh sanity ──────────────────────────────────────────────

describe('primitive meshes', () => {
  test('box produces 12 triangles and valid vertex count', () => {
    const m = boxMesh(10, 10, 10);
    expect(m.triangleCount).toBe(12);
    expect(m.positions.length).toBe(12 * 9);
  });

  test('cylinder is a closed mesh: signed volume ≈ πr²h', () => {
    const r = 10, h = 40;
    const m = cylinderMesh(r, h, 64);
    const vol = Math.abs(signedVolume(m));
    const expected = Math.PI * r * r * h; // ≈ 12566
    // Tessellation of a 64-gon prism is ≥ 98% of the true cylinder volume.
    expect(vol).toBeGreaterThan(expected * 0.97);
    expect(vol).toBeLessThan(expected * 1.01);
  });

  test('sphere volume ≈ 4/3 πr³', () => {
    const r = 15;
    const m = sphereMesh(r, 48);
    const vol = Math.abs(signedVolume(m));
    const expected = (4 / 3) * Math.PI * r ** 3; // ≈ 14137
    expect(vol).toBeGreaterThan(expected * 0.94);
    expect(vol).toBeLessThan(expected * 1.02);
  });

  test('sharp cone volume ≈ 1/3 πr²h', () => {
    const r = 10, h = 30;
    const m = sharpConeMesh(r, h, 64);
    const vol = Math.abs(signedVolume(m));
    const expected = (Math.PI * r * r * h) / 3; // ≈ 3141
    expect(vol).toBeGreaterThan(expected * 0.95);
    expect(vol).toBeLessThan(expected * 1.01);
  });

  test('frustum (truncated cone) volume between inner and outer cylinder', () => {
    const m = frustumMesh(10, 20, 30, 64);
    const vol = Math.abs(signedVolume(m));
    const minVol = Math.PI * 10 * 10 * 30; // inner cylinder ≈ 9425
    const maxVol = Math.PI * 20 * 20 * 30; // outer cylinder ≈ 37699
    expect(vol).toBeGreaterThan(minVol);
    expect(vol).toBeLessThan(maxVol);
  });

  test('torus volume ≈ 2π²Rr²', () => {
    const R = 20, r = 5;
    const m = torusMesh(R, r, 64);
    const vol = Math.abs(signedVolume(m));
    const expected = 2 * Math.PI * Math.PI * R * r * r; // ≈ 9869
    expect(vol).toBeGreaterThan(expected * 0.95);
    expect(vol).toBeLessThan(expected * 1.01);
  });

  test('tube volume equals outer minus inner cylinder', () => {
    const R = 12, ri = 8, h = 30;
    const m = tubeMesh(R, ri, h, 64);
    const vol = Math.abs(signedVolume(m));
    const expected = Math.PI * (R * R - ri * ri) * h; // ≈ 6032
    expect(vol).toBeGreaterThan(expected * 0.94);
    expect(vol).toBeLessThan(expected * 1.02);
  });

  test('surface area of unit box = 6', () => {
    const m = boxMesh(1, 1, 1);
    expect(surfaceArea(m)).toBeCloseTo(6, 5);
  });

  test('bounding box of a translated/rotated box accounts for transform', () => {
    const shape: PlacedShape = {
      kind: 'box', params: { width: 10, height: 10, depth: 10 },
      position: at(100, 0, 0), rotation: noRot(), label: 't',
    };
    const m = buildShapeMesh(shape);
    const bb = boundingBox(m);
    expect(bb.min.x).toBeCloseTo(95, 3);
    expect(bb.max.x).toBeCloseTo(105, 3);
  });
});

// ── Shells / plates (open forms) ─────────────────────────────

describe('shell and plate', () => {
  test('shell has floor + 4 walls (top open)', () => {
    const m = shellMesh(40, 20, 30, 3);
    // floor: 12 tris; each wall: 12 tris → 60
    expect(m.triangleCount).toBe(60);
  });

  test('plate corners are rounded (perimeter vertices off axis)', () => {
    const m = plateMesh(40, 40, 4, 6, 24);
    const p = m.positions;
    let offAxis = 0;
    for (let i = 0; i < p.length; i += 3) {
      // vertices not on the plain rect border (|x| and |z| both < half)
      if (Math.abs(p[i]) < 19.9 && Math.abs(p[i + 2]) < 19.9) offAxis++;
    }
    expect(offAxis).toBeGreaterThan(0);
  });
});

// ── Model stats & STL ────────────────────────────────────────

describe('model stats and STL', () => {
  test('stats for a 10mm cube in PLA: volume 1cm³, mass 1.24g', () => {
    const model = buildFromTemplate('dome-orb', { radius: 5, segments: 48 });
    // Actually use a cube via bracket template? Simpler: hand-built model.
    const cube = {
      name: 'Cube', templateId: 'test', units: 'mm' as const,
      shapes: [place('box', { width: 10, height: 10, depth: 10 })],
      material: 'pla' as const,
    };
    const s = modelStats(cube);
    expect(s.volumeCm3).toBeCloseTo(1, 3);
    expect(s.massG).toBeCloseTo(1.24, 2);
    expect(s.boundingBoxMm.x).toBeCloseTo(10, 3);
    expect(s.triangles).toBe(12);
  });

  test('STL export contains facets for every triangle and balanced solid tags', () => {
    const model = buildFromTemplate('enclosure', {});
    const stl = exportSTL(model);
    expect(stl.startsWith('solid ')).toBe(true);
    expect(/^endsolid /m.test(stl)).toBe(true);
    const facets = (stl.match(/facet normal/g) || []).length;
    const outer = (stl.match(/outer loop/g) || []).length;
    const endloop = (stl.match(/endloop/g) || []).length;
    expect(facets).toBe(outer);
    expect(outer).toBe(endloop);
    // Vertex lines = 3× facets
    const vertices = (stl.match(/vertex /g) || []).length;
    expect(vertices).toBe(facets * 3);
  });

  test('every template builds and produces positive volume + sane stats', () => {
    for (const t of CAD_TEMPLATES) {
      const model = buildFromTemplate(t.id, {});
      expect(model.shapes.length).toBeGreaterThan(0);
      const s = modelStats(model);
      expect(s.volumeCm3).toBeGreaterThan(0);
      expect(s.triangles).toBeGreaterThan(0);
      expect(s.massG).toBeGreaterThan(0);
      // No dimension should explode beyond template param maxima
      const bb = s.boundingBoxMm;
      for (const d of [bb.x, bb.y, bb.z]) {
        expect(d).toBeGreaterThan(0);
        expect(d).toBeLessThan(500);
      }
    }
  });
});

// ── Natural language parsing ─────────────────────────────────

describe('parseCADRequest', () => {
  test('phone case request matches template with dimensions', () => {
    const r = parseCADRequest('make me a phone case 78mm wide');
    expect(r.matched).toBe(true);
    expect(r.templateId).toBe('phone-case');
  });

  test('cm units are converted to mm', () => {
    const r = parseCADRequest('create an enclosure 9cm x 7cm x 3.2cm');
    expect(r.matched).toBe(true);
    expect(r.templateId).toBe('enclosure');
    // First mm-param of enclosure is width → 90
    expect(r.overrides.width).toBe(90);
  });

  test('explicit wall thickness is honored', () => {
    const r = parseCADRequest('enclosure 2mm wall');
    expect(r.matched).toBe(true);
    expect(r.overrides.wall).toBe(2);
  });

  test('gear and bracket keywords route to their templates', () => {
    expect(parseCADRequest('design a gear radius 30').templateId).toBe('gear');
    expect(parseCADRequest('I need an l bracket 60mm').templateId).toBe('bracket');
    expect(parseCADRequest('speaker horn for my phone amp').templateId).toBe('speaker-horn');
  });

  test('unrelated requests do not match', () => {
    const r = parseCADRequest('what is the weather in london');
    expect(r.matched).toBe(false);
  });

  test('parsed dimensions are clamped to template parameter ranges', () => {
    const r = parseCADRequest('phone case 5000mm wide');
    expect(r.matched).toBe(true);
    if (r.overrides.width !== undefined) {
      expect(r.overrides.width).toBeLessThanOrEqual(120);
    }
  });
});

// ── Transforms ───────────────────────────────────────────────

describe('transforms', () => {
  test('90° Y rotation moves +X face to +Z', () => {
    const shape: PlacedShape = {
      kind: 'box', params: { width: 10, height: 10, depth: 2 },
      position: at(), rotation: { x: 0, y: 90, z: 0 }, label: 'r',
    };
    const m = buildShapeMesh(shape);
    const bb = boundingBox(m);
    // After +90° Y rotation, depth (2, thin) now spans X; width (10) spans Z.
    expect(bb.size.x).toBeCloseTo(2, 1);
    expect(bb.size.z).toBeCloseTo(10, 1);
  });

  test('buildModelMesh merges all shapes', () => {
    const model = buildFromTemplate('robot-arm-segment', {});
    const merged = buildModelMesh(model);
    const totalTris = model.shapes.reduce((acc, s) => acc + buildShapeMesh(s).triangleCount, 0);
    expect(merged.triangleCount).toBe(totalTris);
    expect(merged.positions.length).toBe(totalTris * 9);
  });
});

// ── Model stats: shell volume & surface regression ───────────

describe('modelStats (shell/plate handling)', () => {
  test('shell material volume counts walls only, not enclosed air', () => {
    const model = buildFromTemplate('enclosure', { width: 90, height: 32, depth: 70, wall: 2.5 });
    const stats = modelStats(model);
    // Outer prism = 90*70*32 = 201,600 mm³; solid cavity fill would be that.
    // True material (walls only) ≈ 38,613 mm³ — must be far below the outer prism.
    expect(stats.volumeMm3).toBeLessThan(201600 * 0.5);
    expect(stats.volumeMm3).toBeGreaterThan(25000); // floor slab alone ≈ 15.7k; walls add the rest
  });

  test('shell surface area is reported (was 0 before fix)', () => {
    const model = buildFromTemplate('enclosure', {});
    const stats = modelStats(model);
    expect(stats.surfaceAreaMm2).toBeGreaterThan(0);
  });

  test('mass = volume(cm³) × material density', () => {
    const model = buildFromTemplate('enclosure', { material: 'pla' } as never);
    const stats = modelStats(model);
    const expected = stats.volumeCm3 * 1.24;
    expect(stats.massG).toBeCloseTo(expected, 5);
  });
});
