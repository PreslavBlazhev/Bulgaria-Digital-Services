# Bulgaria Digital Services — Premium Digital Agency Website (Multi-page)

Модерен, тъмен, премиум **multi-page** сайт за дигитална агенция **Bulgaria Digital Services**.
Построен с **чист HTML, CSS и Vanilla JavaScript** — без framework, без build стъпка.
Бърз, SEO-оптимизиран, напълно responsive (mobile-first), с богати анимации.

---

## 📁 Структура на файловете

```
07. BULGARIA DIGITAL SERVICES/
├── index.html          # Начало (Hero, stats, услуги, проекти, отзиви, CTA)
├── services.html       # Услуги (детайлно + цени + FAQ)
├── projects.html       # Проекти (с филтри по категория + case studies)
├── process.html        # Процес (вертикален timeline + FAQ)
├── about.html          # За нас (мисия, ценности, статистики, отзиви)
├── contact.html        # Контакти (голяма форма + FAQ)
├── README.md
└── assets/
    ├── css/style.css   # Пълен дизайн-систем + всички компоненти + анимации
    ├── js/app.js       # ОБЩ скрипт: header/footer, анимации, форма, филтри
    └── img/
        ├── favicon.svg
        ├── og-image.svg
        └── PROJECTS_README.txt
```

### 🔑 Как работи multi-page структурата (важно!)
- Всяка страница е отделен `.html` файл с уникален `<title>` и meta description (добро SEO).
- **Header-ът и footer-ът НЕ се дублират.** Те се генерират автоматично от `assets/js/app.js`
  и се инжектират в `<div id="site-header"></div>` и `<div id="site-footer"></div>`.
  👉 Това значи, че **менюто и footer-ът се редактират на ЕДНО място** — в `app.js`
  (променливите `NAV`, `LOGO`, функциите `buildHeader` / `buildFooter`).
- Активната страница в менюто се маркира автоматично чрез `<body data-page="...">`.

### ✨ Анимации и ефекти
- **Page transitions** — плавен преход при смяна на страница (overlay + fade).
- **Scroll progress bar** — златна лента най-горе, показва прогреса на скрола.
- **Scroll reveal** — секциите изплуват при скролване (със stagger чрез `data-delay`).
- **Count-up** — числата в статистиките броят нагоре (`data-count`).
- **Parallax hero** — визуалът и glow-овете реагират на мишката.
- **3D spotlight карти** — златен border + светлинно петно, следящо курсора.
- **Magnetic бутони** — златните бутони леко „примагнитват“ курсора.
- **Marquee** — безкрайна лента с услуги.
- **Филтри за проекти** — плавно филтриране по категория.
- **Animated aurora background** — фонови златни градиенти в движение.
- Всичко уважава `prefers-reduced-motion` (изключва се при потребители с тази настройка).

---

## 🚀 Как да го стартирам локално

Статичен сайт — **не изисква инсталация**. Заради multi-page навигацията и
инжектирания header е **препоръчително да го пуснете през локален сървър** (не само двоен клик).

**С Node (наличен на тази машина):**
```bash
node server.js        # ако запазите примерния сървър, или:
```
Или бърз вариант с всеки статичен сървър, напр. VS Code разширението **Live Server**:
десен клик върху `index.html` → „Open with Live Server“.

После отворете: **http://localhost:5500**

> Забележка: при отваряне директно с двоен клик (`file://`) повечето неща работят,
> но е по-добре през `http://` за коректни пътища и transitions.

---

## ✏️ Къде да сменя текстове, проекти и снимки

| Какво | Къде |
|------|------|
| **Меню и footer** (линкове, соц. мрежи) | `assets/js/app.js` → `NAV`, `buildHeader`, `buildFooter` — **на едно място за целия сайт** |
| **Текстове на страница** | Съответният `.html` файл (напр. услугите → `services.html`) |
| **Цветове / стил** | `assets/css/style.css` → блок `:root` в началото |
| **Проекти** (име, категория, case study) | `projects.html` (пълен списък — 8 проекта) и `index.html` (6 featured case studies) |
| **Категории за филтъра** | `projects.html` — бутоните `.filter-btn` (`data-filter`) + `data-cat` на всяка карта. Налични: `restaurant`, `beauty`, `auto`, `service`, `creative` |
| **Снимки на проекти** | Виж `assets/img/PROJECTS_README.txt` |
| **Статистики (числата)** | Атрибутите `data-count` и `data-suffix` в `index.html` / `about.html` |
| **Контакти** (имейл, телефон) | `contact.html` + `buildFooter` в `app.js` |
| **SEO** (title, description) | `<head>` на всеки `.html` файл поотделно |

---

## 📨 Контактната форма

Формата (в `contact.html`) е **frontend-only**, но структурирана за backend/CRM.
Логиката е в `assets/js/app.js` (търсете `contactForm`). Събира:
`name`, `phone`, `email`, `business`, `service`, `message` (+ `submittedAt`).

За реално изпращане заменете `console.log` с заявка:
```js
fetch('/api/lead', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
});
```

---

## 📦 Проектите в портфолиото

`projects.html` съдържа 8 проекта; `index.html` показва 6 от тях като featured case studies.

| Проект | Категория | Featured | Технологии |
|---|---|---|---|
| Pizza Pazzo | `restaurant` | ✅ | Next.js 15, React 19, TypeScript, Tailwind, Supabase, Kotlin (Android) |
| Make up by Denitsa | `beauty` | ✅ | Node.js, Express, SQLite, Stripe, JWT |
| Elite Vehicle Detail | `auto` | ✅ | React 18, Vite, TypeScript, React Router |
| Механа Златната Скара | `restaurant` | ✅ | Дигитално меню, BG/EN, алергени |
| TechDrive Diagnostics | `auto` | ✅ | Бизнес сайт за услуга |
| Bankov Klima | `service` | ✅ | Бизнес сайт за услуга |
| Ресторант Рибката | `restaurant` | — | Меню + галерия |
| Dharma Tattoo | `creative` | — | Демо проект (не е клиентски сайт) |

Screenshot-ите се обновяват по инструкциите в `assets/img/PROJECTS_README.txt`.

---

## ✅ Какво остава за production-ready

1. **Линкове към живите сайтове** — в момента бутоните на project картите водят към `contact.html`, а не към реалните домейни.
2. **Свързване на формата** с backend / email сервиз (Formspree, Resend) / CRM / AI lead система.
3. **Реални контакти и соц. мрежи** — сменете placeholder имейл, телефон и линкове.
4. **Домейн и хостинг** — статичен сайт, качва се навсякъде (Netlify, Vercel, Render, GitHub Pages, cPanel).
   Обновете `canonical` и `og:url` във всеки `.html` с реалния домейн.
5. **Analytics** (Google Analytics / Plausible) в `<head>`.
6. **robots.txt + sitemap.xml** — за всичките 6 страници.
7. **Оптимизация на изображения** — WebP, lazy-loading при реални снимки.
8. **Правни страници** — Политика за поверителност / бисквитки (GDPR).

---

### Технологии
Semantic HTML5 · CSS (custom properties, grid, flexbox, keyframes) ·
Vanilla JS (IntersectionObserver, page transitions) · Google Fonts: **Sora** + **Inter**.
Без framework, без build — максимална скорост и лесна поддръжка.
