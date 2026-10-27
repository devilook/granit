import { STONE_INFO } from '../config/content.js';
import { STONES } from '../gl/stone.js';

/*
 * «Камни»: the catalogue list (from STONE_INFO) + the live swatch.
 * The WebGL swatch is created only when the section approaches the viewport.
 */
export function initStones(section, { webgl }) {
  const list = section.querySelector('.stones__list');
  const viewer = section.querySelector('.stones__viewer');
  const canvas = section.querySelector('.stones__canvas');
  const nameEl = section.querySelector('[data-stone-name]');
  const keys = Object.keys(STONE_INFO);
  const state = { stone: keys[0], mode: 'polish' };
  let swatch = null;

  list.innerHTML = keys.map((k, i) => {
    const s = STONE_INFO[k], p = STONES[k];
    return `
      <div class="stone${i === 0 ? ' is-active' : ''}" data-stone="${k}">
        <button class="stone__tab" type="button" role="tab" aria-selected="${i === 0}" id="stone-tab-${k}" aria-controls="stone-body-${k}">
          <span class="stone__chip" style="--a:${p.a};--b:${p.b};--c:${p.c}" aria-hidden="true"></span>
          <span><span class="stone__name">${s.name}</span><span class="stone__origin">${s.origin}</span></span>
          <span class="stone__plus" aria-hidden="true"></span>
        </button>
        <div class="stone__body" id="stone-body-${k}" role="tabpanel" aria-labelledby="stone-tab-${k}">
          <div class="stone__inner">
            <p class="stone__text">${s.text}</p>
            <dl class="stone__facts">
              <dt>Месторождение</dt><dd>${s.deposit}</dd>
              <dt>Цвет</dt><dd>${s.color}</dd>
              <dt>Зерно</dt><dd>${s.grain}</dd>
              <dt>Плотность</dt><dd>${s.density}</dd>
            </dl>
          </div>
        </div>
      </div>`;
  }).join('');

  const paintFallback = () => {
    const p = STONES[state.stone];
    viewer.style.setProperty('--stone-fallback', `radial-gradient(circle at 40% 35%, ${p.c}, ${p.b} 45%, ${p.a})`);
  };

  const select = (k) => {
    if (k === state.stone) return;
    state.stone = k;
    list.querySelectorAll('.stone').forEach((el) => {
      const on = el.dataset.stone === k;
      el.classList.toggle('is-active', on);
      el.querySelector('.stone__tab').setAttribute('aria-selected', on);
    });
    nameEl.textContent = STONE_INFO[k].name;
    paintFallback();
    if (swatch) {
      canvas.classList.add('is-switching');
      setTimeout(() => { swatch.setStone(k); canvas.classList.remove('is-switching'); }, 220);
    }
  };
  list.addEventListener('click', (e) => {
    const item = e.target.closest('.stone');
    if (item) select(item.dataset.stone);
  });

  section.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => {
    state.mode = b.dataset.mode;
    section.querySelectorAll('[data-mode]').forEach((x) => {
      x.classList.toggle('is-active', x === b);
      x.setAttribute('aria-pressed', x === b);
    });
    swatch?.setMode(state.mode);
  }));

  paintFallback();
  if (!webgl) { canvas.hidden = true; return; }
  const io = new IntersectionObserver(async ([e]) => {
    if (!e.isIntersecting) return;
    io.disconnect();
    const { createSwatch } = await import('../gl/swatch.js');
    swatch = createSwatch(canvas, state);
  }, { rootMargin: '60% 0px' });
  io.observe(section);
}
