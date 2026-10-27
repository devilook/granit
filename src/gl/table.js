import * as THREE from 'three';
import { mulberry32, smoothstep, clamp } from '../utils/random.js';
import { createNoise } from '../utils/noise.js';
import { createStoneMaterial, createMetalMaterial } from './stone.js';

export const TABLE_HEIGHT = 0.75;
const BAND = 0.018; // polished edge band under the top; the split begins below it
const DENSITY = 2700; // kg/m³, granite

/*
 * Two product lines, one generator.
 *
 *  «Скала»    shape: 'organic' — free-form outline (superellipse + slow
 *             lobes, never symmetric), dead-flat polished top, the sides and
 *             the underside split into flat chisel facets like the blocks in
 *             the workshop photos.
 *  «Классика» shape: 'rect' — strict rounded rectangle, 3 cm slab polished on
 *             every face, rolled edge, steel X-trestles.
 *
 * The stone is built as two grids sharing the rim: the top (flat, its own
 * normals, so the polished edge stays razor-sharp) and a "skirt" that runs
 * from the rim down the side and inward across the underside to the centre.
 * Every displacement is a pure function of position, so the mesh is closed.
 */

// --- small helpers -----------------------------------------------------------
const hash = (x, y, s) => {
  const h = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453;
  return h - Math.floor(h);
};

/**
 * Voronoi facets: every cell is a small tilted plane, so the surface breaks
 * into flat chips with sharp borders: how split granite actually looks.
 */
function facet(u, v, cell, seed, amp, tilt) {
  const cu = Math.floor(u / cell);
  const cv = Math.floor(v / cell);
  let best = 1e9, bx = 0, by = 0, bu = 0, bv = 0;
  for (let i = -1; i <= 1; i++) {
    for (let j = -1; j <= 1; j++) {
      const x = cu + i, y = cv + j;
      const fu = (x + 0.15 + 0.7 * hash(x, y, seed)) * cell;
      const fv = (y + 0.15 + 0.7 * hash(y, x, seed + 3)) * cell;
      const d = (u - fu) ** 2 + (v - fv) ** 2;
      if (d < best) { best = d; bx = x; by = y; bu = fu; bv = fv; }
    }
  }
  const h0 = hash(bx, by, seed + 7) * 2 - 1;
  const h1 = hash(bx, by, seed + 11) * 2 - 1;
  const h2 = hash(bx, by, seed + 13) * 2 - 1;
  return h0 * amp + (h1 * (u - bu) + h2 * (v - bv)) * tilt;
}

function makeOutline({ length, width, shape, rand, noise2 }) {
  const a = length / 2;
  const b = width / 2;
  if (shape === 'rect') {
    const n = 14;
    return (phi) => {
      const c = Math.cos(phi), s = Math.sin(phi);
      return [a * Math.sign(c) * Math.abs(c) ** (2 / n), b * Math.sign(s) * Math.abs(s) ** (2 / n)];
    };
  }
  // Organic: a soft superellipse, one end a little wider, slow lobes.
  const n = 2.5 + rand() * 0.9;
  const skew = (rand() - 0.5) * 0.22;
  const o = rand() * 50;
  return (phi) => {
    const c = Math.cos(phi), s = Math.sin(phi);
    let x = a * Math.sign(c) * Math.abs(c) ** (2 / n);
    let z = b * Math.sign(s) * Math.abs(s) ** (2 / n);
    z *= 1 + skew * (x / a);
    const k = 1 + 0.05 * noise2(c * 1.1 + o, s * 1.1) + 0.018 * noise2(c * 3.2, s * 3.2 + o);
    return [x * k, z * k];
  };
}

// --- table -------------------------------------------------------------------
export function buildTable({
  length = 3,
  width = 1.1,
  seed = 1,
  stone = 'speckle',
  shape = 'organic',
  detail = 1,
} = {}) {
  const rand = mulberry32(seed);
  const { noise2 } = createNoise(rand);
  const classic = shape === 'rect';
  const outline = makeOutline({ length, width, shape, rand, noise2 });

  // Rim samples + outward normals + arc length (for the facet field on the side).
  const M = Math.round(260 * detail + 60);
  const rim = [];
  for (let j = 0; j < M; j++) rim.push(outline((j / M) * Math.PI * 2));
  const nrm = [];
  const arc = [0];
  for (let j = 0; j < M; j++) {
    const p = rim[(j + M - 1) % M], q = rim[(j + 1) % M];
    const tx = q[0] - p[0], tz = q[1] - p[1];
    const l = Math.hypot(tx, tz) || 1;
    nrm.push([tz / l, -tx / l]);
    if (j) arc.push(arc[j - 1] + Math.hypot(rim[j][0] - rim[j - 1][0], rim[j][1] - rim[j - 1][1]));
  }
  // Make sure normals point outward (outline winding).
  if (nrm[0][0] * rim[0][0] + nrm[0][1] * rim[0][1] < 0) nrm.forEach((v) => { v[0] *= -1; v[1] *= -1; });

  // Thickness field: a heavy belly, thinner at the rim, broken into chips.
  const tMin = classic ? 0.03 : 0.1 + rand() * 0.02;
  const tRange = classic ? 0 : 0.09 + rand() * 0.05;
  const ox = rand() * 40, oz = rand() * 40;
  const depthAt = (x, z, rimness) => {
    if (classic) return tMin;
    const base = 0.5 + 0.5 * (noise2(x * 0.8 + ox, z * 0.8 + oz) * 0.7 + noise2(x * 2.2, z * 2.2 + ox) * 0.3);
    const belly = 0.35 + 0.65 * (1 - rimness);
    const chips = facet(x, z, 0.13, seed, 0.022, 0.32) + facet(x + 3, z + 7, 0.045, seed + 5, 0.006, 0.18);
    return tMin + tRange * base * belly + chips + noise2(x * 25, z * 25) * 0.0025;
  };

  const pos = [];
  const normals = [];
  const idx = [];
  const push = (x, y, z, up) => {
    pos.push(x, y, z);
    normals.push(0, up ? 1 : 0, 0);
    return pos.length / 3 - 1;
  };
  const grid = (start, rows, flip) => {
    for (let r = 0; r < rows - 1; r++) {
      for (let j = 0; j < M; j++) {
        const a = start + r * M + j;
        const b = start + r * M + ((j + 1) % M);
        const c = a + M;
        const d = b + M;
        if (flip) idx.push(a, b, c, b, d, c);
        else idx.push(a, c, b, b, c, d);
      }
    }
  };

  // 1. Top: concentric rings from the centre to the rim, y = 0, normal = up.
  const TR = 18;
  const topStart = 0;
  for (let r = 0; r <= TR; r++) {
    const f = r / TR;
    for (let j = 0; j < M; j++) push(rim[j][0] * f, 0, rim[j][1] * f, true);
  }
  grid(topStart, TR + 1, true);

  // 2. Skirt: rim → polished band → split side → underside → centre.
  const skirtStart = pos.length / 3;
  const SIDE = classic ? 10 : Math.round(12 * detail + 6);
  const UNDER = Math.round(22 * detail + 8);
  const rows = [];
  rows.push({ kind: 'rim', t: 0 });
  rows.push({ kind: 'band', t: 0 });
  for (let k = 1; k <= SIDE; k++) rows.push({ kind: 'side', t: k / SIDE });
  for (let k = 1; k <= UNDER; k++) rows.push({ kind: 'under', t: k / UNDER });

  const lastSide = new Array(M);
  for (const row of rows) {
    for (let j = 0; j < M; j++) {
      const [px, pz] = rim[j];
      const [nx, nz] = nrm[j];
      let x = px, z = pz, y = 0;
      if (row.kind === 'band') {
        y = classic ? -0.004 : -BAND;
      } else if (row.kind === 'side') {
        const t = row.t;
        if (classic) {
          // Rolled edge: a soft round from the top to the flat underside.
          const off = 0.006 * Math.sin(Math.PI * t) - 0.004 * t;
          x += nx * off; z += nz * off;
          y = -(0.004 + t * (tMin - 0.004));
        } else {
          const d = depthAt(px, pz, 1);
          y = -(BAND + t * (d - BAND));
          // Split face: flat chips, a slight belly, a small undercut at the bottom.
          const w = smoothstep(0, 0.12, t);
          const chip = facet(arc[j], y, 0.07, seed + 2, 0.016, 0.38) + facet(arc[j] + 9, y, 0.028, seed + 9, 0.004, 0.25);
          const off = (chip + 0.012 * Math.sin(Math.PI * t) - 0.02 * t * t) * w;
          x += nx * off; z += nz * off;
        }
        if (row.t === 1) lastSide[j] = [x, y, z];
      } else if (row.kind === 'under') {
        const t = row.t;
        const [sx, sy, sz] = lastSide[j];
        x = sx * (1 - t);
        z = sz * (1 - t);
        if (classic) {
          y = -tMin;
        } else {
          // Blend from the side's bottom row into the thickness field.
          const d = depthAt(x, z, clamp(1 - t * 1.6, 0, 1));
          y = sy + (-d - sy) * smoothstep(0, 0.12, t);
          x += noise2(x * 30 + 1, z * 30) * 0.004;
          z += noise2(x * 30, z * 30 + 9) * 0.004;
        }
      }
      push(x, y, z, false);
    }
  }
  grid(skirtStart, rows.length, true);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  // Smooth normals for the skirt (the split is flat-shaded in the shader anyway),
  // then restore the perfect "up" on the polished plane.
  geo.computeVertexNormals();
  const na = geo.attributes.normal;
  for (let i = 0; i < (TR + 1) * M; i++) na.setXYZ(i, 0, 1, 0);
  geo.computeBoundingSphere();

  const stoneMat = createStoneMaterial(stone, { seed, band: classic ? 10 : BAND });
  const slab = new THREE.Mesh(geo, stoneMat);
  slab.position.y = TABLE_HEIGHT;
  slab.castShadow = true;
  slab.receiveShadow = true;

  // Width of the slab at a given x (to place legs inside any outline).
  const halfWidthAt = (x) => {
    let w = 0;
    for (const [px, pz] of rim) if (Math.abs(px - x) < 0.05) w = Math.max(w, Math.abs(pz));
    return w || width / 2;
  };

  const metal = createMetalMaterial();
  const legs = classic ? buildTrestles(length, halfWidthAt, metal) : buildSleds(length, halfWidthAt, metal);

  const group = new THREE.Group();
  group.add(slab, legs.group);

  // Weight: area of the outline × mean thickness. A number worth printing.
  let area = 0;
  for (let j = 0; j < M; j++) {
    const [x1, z1] = rim[j], [x2, z2] = rim[(j + 1) % M];
    area += x1 * z2 - x2 * z1;
  }
  area = Math.abs(area) / 2;
  let meanDepth = tMin;
  if (!classic) {
    let s = 0, n = 0;
    for (let i = 0; i < 400; i++) {
      const j = Math.floor(rand() * M), f = Math.sqrt(rand());
      s += depthAt(rim[j][0] * f, rim[j][1] * f, f);
      n++;
    }
    meanDepth = s / n;
  }

  // Points the hero annotates (local space of the group).
  const front = rim.reduce((best, p, j) => (p[1] > rim[best][1] ? j : best), 0);
  const fj = (front + Math.round(M * 0.06)) % M;
  const anchors = {
    polish: new THREE.Vector3(-length * 0.16, TABLE_HEIGHT, -width * 0.05),
    split: new THREE.Vector3(rim[fj][0] + nrm[fj][0] * 0.01, TABLE_HEIGHT - depthAt(rim[fj][0], rim[fj][1], 1) * 0.55, rim[fj][1] + nrm[fj][1] * 0.01),
    leg: legs.anchor,
  };

  const dispose = () => {
    geo.dispose();
    stoneMat.dispose();
    metal.dispose();
    legs.dispose();
  };

  return {
    group,
    slab,
    anchors,
    dispose,
    dims: { length, width, weight: Math.round((area * meanDepth * DENSITY) / 10) * 10 },
  };
}

// --- legs ----------------------------------------------------------------------
function bar(from, to, size, mat, geos) {
  const dir = new THREE.Vector3().subVectors(to, from);
  const g = new THREE.BoxGeometry(size, dir.length(), size);
  geos.push(g);
  const m = new THREE.Mesh(g, mat);
  m.position.copy(from).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  m.castShadow = m.receiveShadow = true;
  return m;
}

/** «Скала»: two thin sled frames, tucked far in so the stone seems to float. */
function buildSleds(length, halfWidthAt, mat) {
  const group = new THREE.Group();
  const geos = [];
  const s = 0.028;
  const top = TABLE_HEIGHT - BAND - 0.012; // hidden inside the stone
  let anchor = null;
  for (const sx of [-1, 1]) {
    const fx = sx * length * 0.3;
    const hz = halfWidthAt(fx) * 0.62;
    const V = THREE.Vector3;
    group.add(
      bar(new V(fx, 0, -hz), new V(fx, top, -hz), s, mat, geos),
      bar(new V(fx, 0, hz), new V(fx, top, hz), s, mat, geos),
      bar(new V(fx, s / 2, -hz - s / 2), new V(fx, s / 2, hz + s / 2), s, mat, geos)
    );
    if (sx > 0) anchor = new V(fx, 0.32, hz);
  }
  return { group, anchor, dispose: () => geos.forEach((g) => g.dispose()) };
}

/** «Классика»: steel X-trestles joined by a stretcher, a lighter take on the shop's table. */
function buildTrestles(length, halfWidthAt, mat) {
  const group = new THREE.Group();
  const geos = [];
  const s = 0.045;
  const top = TABLE_HEIGHT - 0.03 - s / 2;
  const V = THREE.Vector3;
  let anchor = null;
  const xs = [-1, 1].map((sx) => sx * length * 0.32);
  for (const fx of xs) {
    const hz = halfWidthAt(fx) * 0.72;
    group.add(
      bar(new V(fx, 0, -hz), new V(fx, top, hz), s, mat, geos),
      bar(new V(fx, 0, hz), new V(fx, top, -hz), s, mat, geos),
      bar(new V(fx, top, -hz - 0.04), new V(fx, top, hz + 0.04), s * 0.8, mat, geos)
    );
    if (fx > 0) anchor = new V(fx, 0.25, hz * 0.6);
  }
  group.add(bar(new V(xs[0], top * 0.48, 0), new V(xs[1], top * 0.48, 0), s * 0.8, mat, geos));
  return { group, anchor, dispose: () => geos.forEach((g) => g.dispose()) };
}
