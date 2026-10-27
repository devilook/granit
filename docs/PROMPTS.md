# Промпты для генерации кадров сайта

Промпты на английском: генераторы понимают его заметно лучше. Для Midjourney допишите
параметры в конце (`--ar …  --style raw`), для Flux / Krea / других задайте соотношение
сторон в интерфейсе, а параметры уберите.

## Общие блоки (вставляются в промпты ниже)

**[TABLE_ROCK]** — стол линии «Скала»:
> a massive designer garden table made of a single natural stone slab, free-form organic rounded-oval outline with an irregular natural contour, slab 15–20 cm thick, the top surface perfectly flat and mirror-polished, while the entire edge and underside are rough natural split stone with chunky hand-split layered chips, standing on minimal thin matte black powder-coated steel legs (two slim rectangular sled frames set far inward, so the stone appears to float)

**[TABLE_CLASSIC]** — стол линии «Классика»:
> a designer table with a strict rectangular stone top with softly rounded corners, 3 cm thick, polished on every face with a gently rounded edge, on slim matte black steel X-shaped trestle legs joined by a single thin stretcher

**[GABBRO]** — карельский габбро-диабаз:
> Karelian gabbro-diabase stone: deep jet-black polished surface with an extremely fine, even, barely visible dark-grey crystalline grain, crisp mirror reflections; the split edge is matte ash-grey with a fine granular crystalline texture and tiny glints

**[LEZNIKI]** — лезниковский красный:
> Leznikovsky red granite: medium-grained, brick-red to salmon-red feldspar, translucent grey quartz, small scattered black biotite flecks, dense even pattern; the split edge is paler pinkish-red and matte

**[DYMOVSKY]** — дымовский коричневый:
> Dymovsky brown granite: medium-to-coarse grain, warm reddish-brown and chocolate-brown feldspar with black inclusions and occasional pinkish grains; the split edge is lighter, matte and granular

**[PHOTO]** — фотографический стиль:
> editorial architectural photography, shot on a full-frame camera, natural light, true-to-life colours, subtle film grain, ultra-detailed stone texture, quiet luxury, photorealistic

**[NEG]** — чего не должно быть (Midjourney: `--no …`; в других — фраза в конце):
> no people, no chairs, no stools, no benches, no vases, no flowers on the table, no tableware, no text, no logo, no watermark, no stone pedestal or stone legs, no glass, no tablecloth

---

## 1. Главный экран (самый важный кадр)

**Что это:** обложка сайта. Стол из габбро-диабаза в саду, солнце, гравий. Из этого кадра
сделаем объём при движении мыши, блик по полировке и рябь.

**Требования к кадру:**
- 16:9, от 2400 px по ширине;
- стол в нижней половине по центру или чуть правее;
- **верх-лево свободно** (там заголовок), справа — тоже немного воздуха;
- сад за столом не в фокусе;
- края кадра ничего важного не режут.

```
[TABLE_ROCK], [GABBRO]. The table stands on a light beige fine gravel terrace in a lush private garden in southern Russia, late afternoon, warm low sun from the left raking across the split stone edge, soft long shadow of the table on the gravel, the polished black top reflecting dark green foliage and a sliver of sky. Background: dense soft out-of-focus garden — layered hedges, ornamental grasses, a few muted pink and purple flowers, trees and a little pale sky at the top. Camera at standing eye level, 50mm lens, f/2.8, shallow depth of field, the table sharp, the garden melting into bokeh. Calm, generous empty space in the upper left of the frame. [PHOTO]. [NEG]
--ar 16:9 --style raw
```

**Вариант для телефона** (тот же промпт, другое соотношение, стол в нижней трети, сверху небо и сад):
`--ar 4:5`

**Как выбрать лучший результат:**
- ножки тонкие металлические, не каменные;
- верх ровный, край рваный;
- камень чёрный, а не серый и не синий;
- на столе и вокруг ничего лишнего;
- горизонт не завален.

---

## 2. Видео для главного экрана (необязательно)

**Что это:** живая обложка на 5–8 секунд, по кругу. Делается **из кадра №1**
(режим image-to-video в Kling, Runway, Veo или Higgsfield).

```
Static locked-off shot, almost imperceptible slow push-in. Leaves and grasses in the background sway gently in a light breeze, dappled sunlight flickers softly over the gravel, the table's shadow breathes very slightly. The stone table stays perfectly still and unchanged: no morphing, no new objects, no people, no camera shake. Calm, cinematic, natural light.
```

Если сервис спрашивает параметры, ставьте 5–8 с и максимальное качество; звук не нужен.

---

## 3. Кромка крупно (блок «Философия»)

**Что это:** макро, ради которого всё: полированный верх и рваный скол в одном кадре.
4:5, от 1600 px.

```
Extreme close-up of the edge of a thick natural stone table slab, [GABBRO]. Upper third of the frame: the mirror-polished black top surface, a soft reflection of sky sliding across it. Lower two thirds: the rough hand-split edge, chunky layered stone chips, ash-grey matte granular texture with tiny crystalline glints. Raking warm side light from the left emphasises every chip, deep soft shadows. Background: blurred garden greens. Macro lens 100mm, f/5.6, razor-sharp detail. [PHOTO]. [NEG]
--ar 4:5 --style raw
```

---

## 4. Коллекция: два кадра на каждый стол

**Что это:** карточки товара. Кадр «верх» показывается сразу, кадр «скол» или «кромка»
появляется при наведении. **Все карточки должны быть в одном стиле:**
одинаковый фон, свет и ракурс. Генерируйте их одной серией и с одними и теми же словами.
4:5, от 1200 px.

### 4а. «Верх» (для всех столов)
```
Studio product photograph of [TABLE_ROCK], [STONE]. Three-quarter view from above at about 35 degrees, the whole table in frame with comfortable margins. Seamless warm light-grey stone-coloured studio backdrop and floor (#e3e0d9), soft large window light from the upper left, gentle soft shadow under the table. Clean, minimal, catalogue consistency. [PHOTO]. [NEG]
--ar 4:5 --style raw
```

### 4б. «Скол» (вид снизу, для линии «Скала»)
```
Studio product photograph of [TABLE_ROCK], [STONE]. Low camera angle, slightly below the tabletop, looking up at the rough split underside and the chunky hand-split edge, the thin black steel legs visible. Same seamless warm light-grey backdrop (#e3e0d9), same soft window light from the upper left. [PHOTO]. [NEG]
--ar 4:5 --style raw
```

### 4в. «Кромка» (для линии «Классика»)
```
Studio product photograph, close three-quarter view of the corner of [TABLE_CLASSIC], [STONE]: the softly rounded polished edge and one black steel X-trestle leg. Same seamless warm light-grey backdrop (#e3e0d9), soft window light from the upper left, crisp reflections in the polish. [PHOTO]. [NEG]
--ar 4:5 --style raw
```

Вместо `[TABLE_ROCK]` для «Классики» подставляйте `[TABLE_CLASSIC]`.

### Список столов на сайте (подставьте [STONE] и форму)

| Стол | Линия | Камень | Размер | Кадры |
|---|---|---|---|---|
| Утёс | Скала | [GABBRO] | 290 × 130 | 4а + 4б |
| Закат | Скала | [LEZNIKI] | 260 × 110 | 4а + 4б |
| Дымка | Скала | [DYMOVSKY] | 280 × 105 | 4а + 4б |
| Хребет | Скала | [GABBRO], более вытянутый | 340 × 115 | 4а + 4б |
| Очаг | Скала | [LEZNIKI], компактный | 220 × 100 | 4а + 4б |
| Плато | Скала | [DYMOVSKY] | 240 × 110 | 4а + 4б |
| Графит | Классика | [GABBRO] | 240 × 100 | 4а + 4в |
| Кармин | Классика | [LEZNIKI] | 200 × 90 | 4а + 4в |

Размер в промпт можно вписать словами: *"about 2.9 m long and 1.3 m wide"*.
Названия и размеры — заглушки, поменяйте под реальный ассортимент.

---

## 5. Текстуры камней (раздел «Камни»)

**Что это:** образец 40 × 40 см строго сверху. По два кадра на камень: полировка и скол.
1:1, от 2048 px.

> **Важно:** генератор не знает, как выглядит именно карельский габбро-диабаз или лезниковский
> гранит, и «придумает» похожий камень. Для этого раздела лучше всего **реальные фото ваших плит**:
> телефон, дневной свет у окна, без вспышки, строго сверху, плита заполняет весь кадр.
> Генерация — временная замена.

### 5а. Полировка
```
Top-down flat lay photograph of a polished stone slab filling the entire frame edge to edge, [STONE], mirror-polished surface, soft even diffused daylight with one gentle soft window reflection in the upper corner, no visible edges of the slab, no objects, true colour, ultra-detailed crystalline grain, texture reference photography.
--ar 1:1 --style raw
```

### 5б. Скол
```
Top-down photograph of a natural split stone surface filling the entire frame edge to edge, [STONE], rough cleft (rock-faced) texture, granular crystals, gentle undulations and a few flat conchoidal flakes, soft low raking daylight from the left revealing the relief, no visible edges, no objects, true colour, ultra-detailed, texture reference photography.
--ar 1:1 --style raw
```

Сгенерируйте для [GABBRO], [LEZNIKI] и [DYMOVSKY], всего 6 кадров.

---

## 6. Атмосфера (дополнительно, по желанию)

### 6а. Ужин на террасе (фон для блока «Расчёт» или «Без посредников»)
```
[TABLE_ROCK], [GABBRO], on a stone terrace of a modern private house in southern Russia at blue hour, warm string lights and candle glow, two wine glasses and a simple linen napkin on the polished black top reflecting the lights, garden silhouettes in the background, no people. [PHOTO]. no text, no logo, no watermark
--ar 16:9 --style raw
```

### 6б. Раскол блока (блок «Производство»)
```
Documentary photograph in a stone workshop: steel wedges driven into a large block of black gabbro-diabase, a fresh split line opening across the stone, stone dust in a shaft of daylight, worn work gloves on the block, no faces visible. [PHOTO]. no text, no logo, no watermark
--ar 4:5 --style raw
```

### 6в. Полировка плиты (блок «Производство»)
```
Documentary close-up in a stone workshop: a polishing head gliding over a wet black stone slab, the freshly polished area turning into a deep black mirror reflecting the workshop windows, water sheen, fine spray, hands in gloves at the edge of the frame, no faces. [PHOTO]. no text, no logo, no watermark
--ar 4:5 --style raw
```

---

## Куда класть файлы

Положите готовые файлы в `public/media/` с такими именами — я подключу их на сайт:

| Кадр | Имя файла |
|---|---|
| 1. Главный | `hero.jpg` (+ `hero-mobile.jpg`) |
| 2. Видео | `hero.mp4` |
| 3. Кромка | `edge-macro.jpg` |
| 4. Коллекция | `table-<id>-top.jpg`, `table-<id>-raw.jpg` (id: utes, zakat, dymka, khrebet, kamin, plato, grafit, karmin) |
| 5. Текстуры | `stone-<камень>-polish.jpg`, `stone-<камень>-raw.jpg` (камень: gabbro, leznikovsky, dymovsky) |
| 6. Атмосфера | `mood-terrace.jpg`, `mood-split.jpg`, `mood-polish.jpg` |

Форматы JPG или PNG в максимальном качестве. Сжатие в WebP и размеры под экраны я сделаю сам.
