/*
 * All replaceable content in one place.
 * Search the project for REPLACE_ME to find every placeholder.
 */

export const CONTACTS = {
  phone: '+7 (900) 000-00-00', // REPLACE_ME
  phoneHref: 'tel:+79000000000', // REPLACE_ME
  whatsapp: 'https://wa.me/79000000000', // REPLACE_ME
  telegram: 'https://t.me/your_handle', // REPLACE_ME
  email: 'hello@example.ru', // REPLACE_ME
  address: 'Краснодар, ул. Примерная, 1 — производство', // REPLACE_ME
};

export const HERO = {
  // 'webgl' — the live 3D table (default).
  // 'video' — use the video below instead (e.g. once a real film is shot).
  mode: 'webgl',
  // The hero table. Change `seed` to get another outline; `stone` is a key of STONE_INFO.
  // thickness: [minimum at the rim, extra in the belly] in metres.
  table: { length: 2.9, width: 1.3, seed: 12, stone: 'gabbro', shape: 'organic', thickness: [0.13, 0.09] },
  // Optional real photo behind the table (a garden/terrace plate, landscape, ≥ 2000 px wide).
  // Empty = the generated garden. REPLACE_ME: '/media/hero-garden.jpg'
  backdrop: '',
  video: {
    src: '', // REPLACE_ME: /media/hero.mp4 (H.264, 1920×1080, ≤ 6 MB, no audio)
    poster: '', // REPLACE_ME: /media/hero-poster.jpg — also the no-WebGL fallback
  },
};

export const PHILOSOPHY = {
  // REPLACE_ME: macro photo of a real split edge, 4:5. Leave empty to render
  // a close-up of the 3D stone instead.
  photo: '',
};

/*
 * Stones — the catalogue shown in the «Камни» section and used by every table.
 * Key = palette in src/gl/stone.js. Facts are general for the variety;
 * REPLACE_ME: check deposit and figures against your supplier's certificates.
 */
export const STONE_INFO = {
  gabbro: {
    name: 'Габбро-диабаз',
    short: 'Габбро-диабаз, Карелия',
    origin: 'Республика Карелия, Россия',
    deposit: 'Карельские месторождения Прионежья — Другорецкое, Рыборецкое',
    color: 'Чёрный, при сколе — пепельно-серый',
    grain: 'Мелкое, равномерное',
    density: '≈ 2 950 кг/м³',
    text: 'Самый тёмный и плотный камень северного Прионежья. Полируется до глубокого чёрного зеркала, а на сколе становится серым, словно припорошённым.',
  },
  leznikovsky: {
    name: 'Лезниковский красный',
    short: 'Лезниковский гранит',
    origin: 'Житомирская область, Украина',
    deposit: 'Лезниковское месторождение, с. Лезники, Коростышевский район',
    color: 'Красный с серым кварцем и чёрными вкраплениями',
    grain: 'Среднее',
    density: '≈ 2 650 кг/м³',
    text: 'Тёплый красный гранит с густым рисунком. На солнце раскрывается розовым, в тени уходит в кирпичный.',
  },
  dymovsky: {
    name: 'Дымовский коричневый',
    short: 'Дымовский гранит',
    origin: 'Кировоградская область, Украина',
    deposit: 'Дымовское месторождение, с. Дымово, Новоукраинский район',
    color: 'Красно-коричневый с чёрными включениями',
    grain: 'Среднее и крупное',
    density: '≈ 2 650 кг/м³',
    text: 'Коричневый гранит с выразительным крупным зерном. Хорошо держит тёплый вечерний свет и не теряет цвет на открытом воздухе.',
  },
};

/*
 * Collection — two lines.
 *  line 'rock'    «Скала»: free-form outline, polished top, split underside.
 *  line 'classic' «Классика»: rounded rectangle, polished all round, X-trestles.
 * `stone` is a key of STONE_INFO. `seed` drives the generated outline and pattern.
 * When real photography exists, put the URLs in `photos` and the renders are skipped.
 * REPLACE_ME: names, sizes and prices are placeholders.
 */
const rock = { line: 'rock', shape: 'organic' };
const classic = { line: 'classic', shape: 'rect' };
export const COLLECTION = [
  { ...rock, id: 'utes', name: 'Утёс', stone: 'gabbro', length: 2.9, width: 1.3, seed: 12, price: 280000, photos: { top: '', raw: '' } },
  { ...rock, id: 'zakat', name: 'Закат', stone: 'leznikovsky', length: 2.6, width: 1.1, seed: 31, price: 240000, photos: { top: '', raw: '' } },
  { ...rock, id: 'dymka', name: 'Дымка', stone: 'dymovsky', length: 2.8, width: 1.05, seed: 34, price: 250000, photos: { top: '', raw: '' } },
  { ...rock, id: 'khrebet', name: 'Хребет', stone: 'gabbro', length: 3.4, width: 1.15, seed: 48, price: 320000, photos: { top: '', raw: '' } },
  { ...rock, id: 'kamin', name: 'Очаг', stone: 'leznikovsky', length: 2.2, width: 1.0, seed: 57, price: 190000, photos: { top: '', raw: '' } },
  { ...rock, id: 'plato', name: 'Плато', stone: 'dymovsky', length: 2.4, width: 1.1, seed: 66, price: 210000, photos: { top: '', raw: '' } },
  { ...classic, id: 'grafit', name: 'Графит', stone: 'gabbro', length: 2.4, width: 1.0, seed: 72, price: 160000, photos: { top: '', raw: '' } },
  { ...classic, id: 'karmin', name: 'Кармин', stone: 'leznikovsky', length: 2.0, width: 0.9, seed: 81, price: 130000, photos: { top: '', raw: '' } },
];

export const LINES = { rock: 'Скала', classic: 'Классика' };

export const formatPrice = (n) => n.toLocaleString('ru-RU').replace(/,/g, ' ');
