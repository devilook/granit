import { mulberry32 } from '../utils/random.js';

/*
 * The brand motif in CSS: a perfectly straight top edge and a broken bottom.
 * Generates a seeded clip-path, so every card, image and wordmark breaks
 * differently, like the stone. Usage: <div data-torn="12" data-torn-depth="18">
 */
export function tornClip(seed, depth = 16, steps = 26, radius = 0) {
  const rand = mulberry32(seed);
  const pts = [];
  // Rounded top corners (the calm side), approximated with short arcs.
  const arc = (right) => {
    for (let k = 0; k <= 6; k++) {
      const a = ((right ? 6 - k : k) / 6) * (Math.PI / 2);
      const dx = (radius - radius * Math.cos(a)).toFixed(1);
      const dy = (radius - radius * Math.sin(a)).toFixed(1);
      pts.push(right ? `calc(100% - ${dx}px) ${dy}px` : `${dx}px ${dy}px`);
    }
  };
  if (radius) { arc(false); arc(true); } else pts.push('0 0', '100% 0');
  let x = 100;
  let y = rand() * depth * 0.5;
  pts.push(`100% calc(100% - ${y.toFixed(1)}px)`);
  // (left edge closes back to the first point automatically)
  while (x > 0) {
    // Mostly small chips, now and then a deep bite — that is how stone splits.
    const big = rand() < 0.16;
    x -= (100 / steps) * (0.4 + rand() * 1.2);
    y = big ? depth * (0.7 + rand() * 0.3) : rand() * depth * 0.45;
    pts.push(`${Math.max(0, x).toFixed(2)}% calc(100% - ${y.toFixed(1)}px)`);
  }
  return `polygon(${pts.join(', ')})`;
}

export function applyTorn(root = document) {
  root.querySelectorAll('[data-torn]').forEach((el) => {
    const seed = Number(el.dataset.torn) || 1;
    const depth = Number(el.dataset.tornDepth) || 16;
    const radius = parseFloat(getComputedStyle(el).getPropertyValue('--torn-radius')) || 0;
    el.style.clipPath = tornClip(seed, depth, 26, radius);
  });
}

/** SVG motif: the polished line and the split line beneath it. */
export function splitLinePath(seed, width = 1200, base = 22, depth = 18) {
  const rand = mulberry32(seed);
  let d = `M0 ${base}`;
  let x = 0;
  while (x < width) {
    x += 10 + rand() * 38;
    const bite = rand() < 0.18 ? depth : rand() * depth * 0.45;
    d += ` L${Math.min(width, x).toFixed(1)} ${(base + bite).toFixed(1)}`;
  }
  return d;
}
