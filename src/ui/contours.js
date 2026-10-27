import { mulberry32 } from '../utils/random.js';
import { createNoise } from '../utils/noise.js';

/*
 * Topographic contour lines: the mountain the stone came from, drawn as a
 * map behind it. Nested noisy closed curves around a "summit" point.
 */
export function drawContours(svg, { seed = 3, cx = 0.52, cy = 0.72, rings = 11 } = {}) {
  const W = 1600, H = 1000;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const { noise2 } = createNoise(mulberry32(seed));
  let d = '';
  for (let r = 1; r <= rings; r++) {
    const base = 70 + r * r * 9 + r * 40;
    const steps = 120;
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const c = Math.cos(a), s = Math.sin(a);
      const wob = 1 + noise2(c * 1.4 + r * 0.13, s * 1.4) * 0.22 + noise2(c * 3.5, s * 3.5 + r * 0.2) * 0.06;
      const x = cx * W + c * base * 1.9 * wob;
      const y = cy * H + s * base * 0.8 * wob;
      d += `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
    }
    d += 'Z';
  }
  svg.innerHTML = `<path d="${d}" />`;
}
