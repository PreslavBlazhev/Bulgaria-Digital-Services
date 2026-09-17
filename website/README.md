# BDS — сайт и оперативна система

Статичен multi-page сайт на Bulgaria Digital Services + веригата
реклама → заявка → CRM → оферта → маркетингов отчет.

Чист HTML, CSS и vanilla JS. Без framework, без `npm install`.
Всички команди се пускат **от тази папка** (`website/`).

## Команди

```bash
node server.js                         # локално → http://localhost:3000
node tools/check-site.mjs              # съдържание, цени, забранени твърдения
node tools/test-all.mjs                # всички тестове
node tools/test-all.mjs --browser      # + браузърните тестове
node tools/test-all.mjs --live         # + истинска заявка към CRM-а
node tools/build-pages.mjs             # регенерира секциите между BDS:GEN маркерите
node tools/build-dist.mjs              # сглобява dist/ — него качваме
node tools/generate-proposal.mjs       # оферта BDS-PROP-2026-NNNN като HTML
```

## Къде какво се сменя

| Какво | Къде |
|---|---|
| Цени и пакети | `PRICES AND PACKETS/` → `assets/js/bds-data.js` → `build-pages.mjs` |
| Проекти / case studies | `assets/js/bds-data.js` → `build-pages.mjs` |
| Меню и footer | `assets/js/app.js` (`buildHeader`, `buildFooter`, `buildLandingFooter`) |
| Рекламни ID-та (GTM, GA4, Ads, Meta) | `assets/js/bds-tracking.js` |
| Банер за съгласие | `assets/js/bds-consent.js` |
| Цветове и дизайн токени | `assets/css/tokens.css`, `assets/css/style.css` |
| Пренасочвания (Netlify) | `_redirects` |
| `sitemap.xml`, `robots.txt` | генерират се от `build-pages.mjs` — не се пипат на ръка |

HTML-ът между `<!-- BDS:GEN start:X -->` маркерите е генериран — редакциите
на ръка там се губят при следващия build.

## Папки

| Папка | Съдържание |
|---|---|
| `assets/` | CSS, JS, изображения, PDF — публично |
| `restaurants/`, `print/` | страница „Благодарим“, печатна версия на пакетите — публично |
| `marketing/` | Google Ads, Meta retargeting, CRM полета, продажбен процес, съдържание — **вътрешно** |
| `tools/` | build, тестове, `crm/` (Apps Script), `ads/` (Google Ads Script, Meta import) — **вътрешно** |
| `PRICES AND PACKETS/` | официалните цени — **вътрешно** |

Как работи цялата верига и защо е направена така: [`OPERATIONS.md`](OPERATIONS.md).
