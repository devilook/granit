import { COLLECTION, LINES, formatPrice } from '../config/content.js';
import { STONES } from '../gl/stone.js';

/* Renders the collection cards and fills them with real photos or generated stills. */
export function renderCollection(track) {
  const cards = COLLECTION.map((item, i) => {
    const st = STONES[item.stone];
    const size = `${Math.round(item.length * 100)} × ${Math.round(item.width * 100)} см`;
    const second = item.line === 'classic' ? 'Кромка' : 'Скол';
    return `
      <article class="card card--${item.line}" data-id="${item.id}">
        <div class="card__media" ${item.line === 'rock' ? `data-torn="${item.seed}" data-torn-depth="20"` : ''} data-cursor-label="${second}"
             style="--stone-a:${st.a};--stone-b:${st.b}" tabindex="0"
             aria-label="Стол «${item.name}»: показать ${item.line === 'classic' ? 'кромку' : 'нижнюю сторону'}">
          <span class="card__line">${LINES[item.line]}</span>
          <div class="card__frame">
            <div class="card__ph" aria-hidden="true"></div>
            <img class="card__img card__img--top" alt="Стол «${item.name}», ${item.stoneName}: полированная поверхность" decoding="async" />
            <img class="card__img card__img--raw" alt="Стол «${item.name}»: ${item.line === 'classic' ? 'кромка и опоры' : 'колотая нижняя сторона'}" decoding="async" />
          </div>
          <span class="card__face"><span>Полировка</span><span>${second}</span></span>
        </div>
        <div class="card__meta">
          <span class="card__num">${String(i + 1).padStart(2, '0')}</span>
          <h3 class="card__name">${item.name}</h3>
          <p class="card__stone">${item.stoneName}</p>
          <p class="card__size">${size}</p>
          <p class="card__price">от ${formatPrice(item.price)} ₽</p>
        </div>
      </article>`;
  }).join('');

  track.innerHTML = cards + `
    <article class="card card--cta">
      <div class="card__media card__media--cta">
        <p class="card__cta-title">Ваш камень</p>
        <p class="card__cta-text">Подберём блок под размер вашей террасы и покажем его до распила.</p>
        <a href="#lead" class="pill pill--accent" data-magnetic>Подобрать камень</a>
      </div>
    </article>`;

  // Touch: tap flips between the polished top and the split underside.
  track.querySelectorAll('.card__media[tabindex]').forEach((m) => {
    const flip = () => m.classList.toggle('is-raw');
    m.addEventListener('click', () => { if (matchMedia('(hover: none)').matches) flip(); });
    m.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); } });
  });
}

function setImages(card, { top, raw }) {
  const [imgTop, imgRaw] = card.querySelectorAll('.card__img');
  const done = () => card.classList.add('is-loaded');
  imgTop.onload = done;
  imgTop.src = top;
  imgRaw.src = raw;
}

/** Real photos first; generate the rest lazily when the section approaches. */
export function fillCollection(section, { webgl }) {
  const pending = [];
  for (const item of COLLECTION) {
    const card = section.querySelector(`[data-id="${item.id}"]`);
    if (item.photos.top && item.photos.raw) {
      card.querySelectorAll('.card__img').forEach((img) => (img.loading = 'lazy'));
      setImages(card, item.photos);
    } else if (webgl) {
      pending.push(item);
    }
  }
  if (!pending.length) return;

  const io = new IntersectionObserver(async ([entry]) => {
    if (!entry.isIntersecting) return;
    io.disconnect();
    const { renderStills } = await import('../gl/stills.js');
    renderStills(pending, {
      onItem: (item, urls) => setImages(section.querySelector(`[data-id="${item.id}"]`), { top: urls.top, raw: urls.raw || urls.edge }),
    });
  }, { rootMargin: '120% 0px' });
  io.observe(section);
}
