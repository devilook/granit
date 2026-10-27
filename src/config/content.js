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
  // The hero table. Change `seed` to get another stone with another outline.
  table: { length: 3.0, width: 1.2, seed: 12, stone: 'speckle', shape: 'organic' },
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
 * Collection — two lines.
 *  line 'rock'    «Скала»: free-form outline, polished top, split underside.
 *  line 'classic' «Классика»: rounded rectangle, polished all round, X-trestles.
 * `seed` drives the generated stone and outline. When real photography exists,
 * put the URLs in `photos` and the generated renders are skipped.
 */
const rock = { line: 'rock', shape: 'organic' };
const classic = { line: 'classic', shape: 'rect' };
export const COLLECTION = [
  { ...rock, id: 'utes', name: 'Утёс', stone: 'speckle', stoneName: 'Серо-зелёный гранит', length: 3.0, width: 1.2, seed: 12, price: 260000, photos: { top: '', raw: '' } }, // REPLACE_ME photos
  { ...rock, id: 'ohra', name: 'Охра', stone: 'ochre', stoneName: 'Тёплый бежевый гранит', length: 2.6, width: 1.1, seed: 31, price: 220000, photos: { top: '', raw: '' } },
  { ...rock, id: 'fiord', name: 'Фьорд', stone: 'bluepearl', stoneName: 'Блю Перл', length: 2.8, width: 1.05, seed: 34, price: 290000, photos: { top: '', raw: '' } },
  { ...rock, id: 'khrebet', name: 'Хребет', stone: 'gabbro', stoneName: 'Габбро-диабаз', length: 3.4, width: 1.15, seed: 48, price: 280000, photos: { top: '', raw: '' } },
  { ...rock, id: 'zakat', name: 'Закат', stone: 'redwood', stoneName: 'Красный гранит', length: 2.4, width: 1.0, seed: 57, price: 190000, photos: { top: '', raw: '' } },
  { ...rock, id: 'plato', name: 'Плато', stone: 'kashmir', stoneName: 'Светлый гранит', length: 2.2, width: 1.0, seed: 66, price: 170000, photos: { top: '', raw: '' } },
  { ...classic, id: 'grafit', name: 'Графит', stone: 'absolute', stoneName: 'Чёрный гранит', length: 2.4, width: 1.0, seed: 72, price: 140000, photos: { top: '', raw: '' } },
  { ...classic, id: 'verde', name: 'Верде', stone: 'ubatuba', stoneName: 'Тёмно-зелёный гранит', length: 2.0, width: 0.9, seed: 81, price: 120000, photos: { top: '', raw: '' } },
];

export const LINES = { rock: 'Скала', classic: 'Классика' };

export const formatPrice = (n) => n.toLocaleString('ru-RU').replace(/,/g, ' ');
