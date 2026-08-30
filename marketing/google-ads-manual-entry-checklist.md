# Google Ads — точните полета за въвеждане

**Дата:** 31.08.2026 · **Състояние:** `BLOCKED — EXTERNAL ACCOUNT`

Всичко по-долу е готово. Липсва само рекламният акаунт.
Полетата се въвеждат буквално както са изписани.

---

## 0. Преди всичко

- [ ] Google Ads акаунт на `info@bulgaria-digital-services.com`
- [ ] Валута **EUR**, часова зона **Europe/Sofia** — **не се сменят после**
- [ ] Плащане потвърдено
- [ ] **Auto-apply recommendations: изключено** (Recommendations → ⚙)

---

## 1. Кампания

| Поле | Стойност |
|---|---|
| Име | `BDS \| Search \| Restaurants \| BG` |
| Тип | Search |
| Цел | Leads · **без** цел на ниво кампания, ако пита |
| Мрежи | Search ✅ · **Search Partners ❌** · **Display ❌** |
| Локация | България |
| Настройка на локацията | **Presence: хора в целевата локация** — не „интерес“ |
| Езици | Български · Английски |
| Аудитория | **Observation**, не Targeting |
| Бюджет | **10 €/ден** |
| Наддаване | **ОСТАВЯ СЕ НА СОБСТВЕНИКА** — виж по-долу |

### Наддаване — умишлено незапълнено

Без история от конверсии автоматичните стратегии нямат от какво да учат.
Обичайният ред е: `Maximise clicks` с ограничение на цената, докато се
натрупат ~15–30 конверсии, после `Maximise conversions`. Точният момент
зависи от това какво показва акаунтът — затова тук не се записва
стойност, която да се въведе на сляпо.

`TO BE SET IN GOOGLE ADS UI`

---

## 2. Ключови думи

Импорт: **Tools → Bulk actions → Uploads** →
`marketing/google-ads-restaurants-import.csv`

Файлът съдържа:

| | Брой |
|---|---|
| Платени думи | **24** (12 Exact + 12 Phrase) |
| Негативи | **98** (10 Exact + 88 Phrase) |
| Ad group-и | 4 |

Негативите отиват и в споделен списък: **Tools → Shared library →
Negative keyword lists** → `BDS | Irrelevant Traffic | BG`.

> Проверено машинно: нито един негатив не изключва платена дума
> (`tools/test-google-ads.mjs`).

---

## 3. Обявата

| Поле | Стойност |
|---|---|
| Final URL | `https://bulgaria-digital-services.com/restaurants` |
| Display path 1 | `restaurants` |
| Display path 2 | `order-system` |
| Заглавия | **15** — от `google-ads-rsa-final.md` |
| Описания | **4** — оттам |
| Пиниране | **няма** |

> Display path е само визуален. Не се прави адрес
> `/restaurants/order-system` — такъв не съществува и не е нужен.

---

## 4. Активи

### Sitelinks — 5

От `google-ads-sitelinks.md`. Ниво: **кампания**.

| Заглавие | Адрес |
|---|---|
| Цени | `…/restaurants#packages` |
| Как работи | `…/restaurants#components` |
| Ресторантска система | `…/restaurants#system` |
| Реален проект | `…/restaurants#proof` |
| Получи оферта | `…/restaurants#restaurant-contact` |

### Callouts — 10
От `google-ads-callouts.md`. Ниво: кампания.

### Structured snippets — 1
Header **Service catalog**, 8 стойности от `google-ads-structured-snippets.md`.

### Price asset — **не се добавя**
Обосновката е в `google-ads-price-assets.md`. Ако Google го предложи —
отказва се.

### Call asset — **препоръчва се**

| Поле | Стойност |
|---|---|
| Телефон | `0877 364 001` |
| Държава | България |
| Часове | само когато наистина се вдига |
| Отчитане на обаждания | по избор |

Телефонът е реален и се вдига — активът е честен. Часовете се попълват
според действителната наличност, не „24/7“.

### Lead form asset — **не**
Заявката трябва да мине през сайта: там се хващат източникът и
кампанията и оттам тръгва CRM записът. Формата на Google заобикаля и
двете.

---

## 5. Проследяване

| Поле | Стойност |
|---|---|
| Final URL suffix (кампания) | `utm_source=google&utm_medium=cpc&utm_campaign={campaignid}&utm_content={creative}&utm_term={keyword}` |
| Auto-tagging | **включено** (Settings → Account settings) |
| Tracking template | **не се ползва** |

Пълното обяснение: `google-ads-url-tracking.md`.

### Конверсия

| Поле | Стойност |
|---|---|
| Име | `Restaurant Lead` |
| Категория | Submit lead form |
| Стойност | без стойност — реалната стойност идва от `Deal Value` в CRM |
| Броене | **One** — една заявка е една конверсия |
| Прозорец | 30 дни |
| Основна ли е | да |

> `BLOCKED — EXTERNAL ACCOUNT`: изисква GA4 или Google Ads tag. Няма
> нито GA4 ID, нито GTM ID. Кодът е готов и чака ID в
> `assets/js/bds-tracking.js` → `CONFIG`.

---

## 6. Преди пускане

- [ ] Search Partners и Display са изключени
- [ ] Локацията е „присъствие“, не „интерес“
- [ ] Auto-apply е изключено
- [ ] Негативният списък е прикачен
- [ ] Всичките 5 sitelink-а отварят правилната секция
- [ ] Final URL suffix е записан на ниво кампания
- [ ] Auto-tagging е включено
- [ ] Конверсията е създадена и е основна
- [ ] Бюджетът е 10 €/ден
- [ ] Един собствен клик → заявката се вижда в CRM с `google_ads`
- [ ] Тестовият ред е изчистен: меню **BDS → „Изчисти тестови редове“**

---

## Какво остава на собственика

| # | Действие |
|---|---|
| 1 | Създава Google Ads акаунт |
| 2 | Задава стратегията за наддаване |
| 3 | Създава GA4 / GTM или Google Ads tag за конверсията |
| 4 | Импортира CSV-то |
| 5 | Въвежда обявата и активите |
| 6 | Прави контролния клик и проверява CRM записа |
