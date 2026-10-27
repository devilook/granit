import './styles/main.css';

import { env } from './utils/env.js';
import { HERO, CONTACTS, PHILOSOPHY } from './config/content.js';
import { applyTorn, splitLinePath } from './ui/torn.js';
import { drawContours } from './ui/contours.js';
import { renderCollection, fillCollection } from './ui/collection.js';
import { initForm } from './ui/form.js';
import { initStones } from './ui/stones.js';

const root = document.documentElement;
root.classList.add(env.reducedMotion ? 'motion-reduced' : 'motion-ok');
if (env.touch) root.classList.add('is-touch');

// ---- static content -------------------------------------------------------
document.querySelectorAll('[data-contact]').forEach((el) => {
  const key = el.dataset.contact;
  if (el.tagName === 'A') el.href = key === 'phone' ? CONTACTS.phoneHref : key === 'email' ? `mailto:${CONTACTS.email}` : CONTACTS[key];
  if (el.dataset.contactText !== undefined) el.textContent = CONTACTS[key];
});

document.querySelectorAll('[data-split-line]').forEach((svg) => {
  svg.querySelector('.split-raw').setAttribute('d', splitLinePath(Number(svg.dataset.splitLine) || 3));
});

drawContours(document.querySelector('.trust__contours'), { seed: 5, cx: 0.85, cy: 0.9, rings: 9 });

const collection = document.querySelector('#collection');
renderCollection(collection.querySelector('.collection__track'));
applyTorn();
initForm(document.querySelector('#lead-form'));
initStones(document.querySelector('#stones'), { webgl: env.webgl });

// Philosophy macro: real photo if given; otherwise a close-up of the 3D stone.
function initMacro() {
  const box = document.querySelector('.pair__image');
  const img = box.querySelector('img');
  const generate = () => {
    if (!env.webgl) return;
    const io = new IntersectionObserver(async ([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const { renderStills } = await import('./gl/stills.js');
      renderStills([{ ...HERO.table, id: 'macro', views: ['macro'], detail: 1.6 }], {
        width: 900, height: 1125, onItem: (_, urls) => { img.src = urls.macro; },
      });
    }, { rootMargin: '100% 0px' });
    io.observe(box);
  };
  if (PHILOSOPHY.photo) {
    img.loading = 'lazy';
    img.onerror = generate;
    img.src = PHILOSOPHY.photo;
  } else generate();
}
initMacro();

// ---- hero -----------------------------------------------------------------
const heroEl = document.querySelector('.hero');
const card = heroEl.querySelector('.hero__card');
const canvas = heroEl.querySelector('.hero__canvas');
const leaders = heroEl.querySelector('.hero__leaders');
let hero = null;

/*
 * Leaders: each note gets a dotted underline that continues to its anchor on
 * the stone, ending in a small ring. Note boxes are measured on resize only;
 * the anchor end moves every frame with the table.
 */
function initLeaders() {
  const notes = [...heroEl.querySelectorAll('[data-note]')];
  const NS = 'http://www.w3.org/2000/svg';
  const items = notes.map((el) => {
    const path = document.createElementNS(NS, 'path');
    const pulse = document.createElementNS(NS, 'circle');
    const ring = document.createElementNS(NS, 'circle');
    pulse.setAttribute('class', 'pulse');
    ring.setAttribute('r', 4.5);
    leaders.append(path, pulse, ring);
    return { key: el.dataset.note, el, path, ring, pulse, box: null };
  });
  const measure = () => {
    const c = card.getBoundingClientRect();
    items.forEach((it) => {
      const r = it.el.getBoundingClientRect();
      it.box = { l: r.left - c.left, r: r.right - c.left, b: r.bottom - c.top + 14 };
    });
  };
  measure();
  window.addEventListener('resize', measure);
  document.fonts?.ready.then(measure);

  let t0 = performance.now();
  return (points) => {
    const pulse = 4.5 + ((performance.now() - t0) / 1000 % 2.4) / 2.4 * 10;
    for (const it of items) {
      const p = points[it.key];
      if (!p || !it.box) continue;
      const toRight = p.x > (it.box.l + it.box.r) / 2;
      const sx = toRight ? it.box.l : it.box.r;
      const ex = toRight ? it.box.r : it.box.l;
      it.path.setAttribute('d', `M${sx.toFixed(1)} ${it.box.b.toFixed(1)} L${ex.toFixed(1)} ${it.box.b.toFixed(1)} L${p.x.toFixed(1)} ${p.y.toFixed(1)}`);
      it.ring.setAttribute('cx', p.x.toFixed(1));
      it.ring.setAttribute('cy', p.y.toFixed(1));
      it.pulse.setAttribute('cx', p.x.toFixed(1));
      it.pulse.setAttribute('cy', p.y.toFixed(1));
      it.pulse.setAttribute('r', pulse.toFixed(1));
      it.pulse.style.opacity = (1 - (pulse - 4.5) / 10) * 0.7;
    }
  };
}

function useVideoFallback() {
  heroEl.classList.add('is-fallback');
  const video = heroEl.querySelector('.hero__video');
  if (HERO.video.poster) video.poster = HERO.video.poster;
  if (HERO.video.src && !env.reducedMotion) {
    video.src = HERO.video.src;
    video.play().catch(() => {});
  }
}

async function initHero() {
  if (HERO.mode !== 'webgl' || !env.webgl) return useVideoFallback();
  const { createHero } = await import('./gl/hero.js');
  const drawLeaders = env.narrow ? null : initLeaders();
  hero = createHero(canvas, { table: HERO.table, backdrop: HERO.backdrop, onFrame: drawLeaders });
  // The weight is computed from the actual generated stone.
  heroEl.querySelector('[data-weight]').textContent = `≈ ${hero.dims.weight.toLocaleString('ru-RU')} кг`;
  return hero;
}

// ---- motion ---------------------------------------------------------------
async function boot() {
  if (env.reducedMotion) {
    await initHero();
    hero?.renderStatic();
    fillCollection(collection, { webgl: env.webgl });
    return;
  }

  const { gsap, ScrollTrigger, initSmoothScroll, initReveals, initHorizontal } = await import('./ui/motion.js');
  initSmoothScroll();
  await initHero();

  // Intro: the light finds the stone, the table turns into place and settles.
  const intro = { v: 0 };
  hero?.start();
  const tl = gsap.timeline({ delay: 0.15 });
  if (hero) tl.to(intro, { v: 1, duration: 3, ease: 'heavy', onUpdate: () => hero.setIntro(intro.v) }, 0);
  tl.to('.hero__canvas', { opacity: 1, duration: 2.2, ease: 'settle' }, 0.1)
    .to('.hero__title .line > span', { y: 0, duration: 1.6, ease: 'settle', stagger: 0.14 }, 0.4)
    .to('.hero [data-hero-fade]', { autoAlpha: 1, y: 0, duration: 1.3, ease: 'settle', stagger: 0.09 }, 1.1)
    .to('.hero__leaders', { opacity: 1, duration: 1.6, ease: 'settle' }, 2.0);

  if (env.finePointer) {
    const { initCursor } = await import('./ui/cursor.js');
    initCursor();
  }

  // Leaving the hero: the camera lifts a little, the card's content sinks.
  ScrollTrigger.create({
    trigger: heroEl, start: 'top top', end: 'bottom top', scrub: true,
    onUpdate: (st) => hero?.setScroll(st.progress),
  });

  initReveals();
  initHorizontal(collection);
  fillCollection(collection, { webgl: env.webgl });
}

boot();
