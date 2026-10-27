import { gsap } from 'gsap';

/*
 * Thin cursor: a dot that is exact, a ring that lags behind with weight.
 * Interactive elements marked [data-magnetic] pull the ring (and themselves)
 * slightly toward the pointer. Desktop + motion-allowed only.
 */
export function initCursor() {
  const dot = document.createElement('div');
  const ring = document.createElement('div');
  dot.className = 'cursor-dot';
  ring.className = 'cursor-ring';
  document.body.append(ring, dot);
  document.documentElement.classList.add('has-cursor');

  const pos = { x: innerWidth / 2, y: innerHeight / 2 };
  const ringPos = { ...pos };
  let magnet = null;

  window.addEventListener('pointermove', (e) => {
    pos.x = e.clientX;
    pos.y = e.clientY;
    dot.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
  }, { passive: true });

  gsap.ticker.add(() => {
    let tx = pos.x;
    let ty = pos.y;
    if (magnet) {
      const r = magnet.getBoundingClientRect();
      tx = r.left + r.width / 2 + (pos.x - (r.left + r.width / 2)) * 0.25;
      ty = r.top + r.height / 2 + (pos.y - (r.top + r.height / 2)) * 0.25;
    }
    ringPos.x += (tx - ringPos.x) * 0.14;
    ringPos.y += (ty - ringPos.y) * 0.14;
    ring.style.transform = `translate3d(${ringPos.x}px, ${ringPos.y}px, 0)`;
  });

  document.querySelectorAll('[data-magnetic]').forEach((el) => {
    const xTo = gsap.quickTo(el, 'x', { duration: 1, ease: 'power3.out' });
    const yTo = gsap.quickTo(el, 'y', { duration: 1, ease: 'power3.out' });
    el.addEventListener('pointerenter', () => { magnet = el; ring.classList.add('is-magnet'); });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      xTo((e.clientX - (r.left + r.width / 2)) * 0.25);
      yTo((e.clientY - (r.top + r.height / 2)) * 0.25);
    });
    el.addEventListener('pointerleave', () => {
      magnet = null;
      ring.classList.remove('is-magnet');
      xTo(0);
      yTo(0);
    });
  });

  document.querySelectorAll('a, button, input, textarea, [data-cursor]').forEach((el) => {
    el.addEventListener('pointerenter', () => ring.classList.add('is-hover'));
    el.addEventListener('pointerleave', () => ring.classList.remove('is-hover'));
  });
  document.querySelectorAll('[data-cursor-label]').forEach((el) => {
    el.addEventListener('pointerenter', () => { ring.dataset.label = el.dataset.cursorLabel; ring.classList.add('is-label'); });
    el.addEventListener('pointerleave', () => ring.classList.remove('is-label'));
  });
}
