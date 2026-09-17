# Bulgaria Digital Services (BDS)

Частно репо на агенцията — сайтът, системата за заявки и оферти, рекламата,
маркетингът, цените, брандът и архивът от времето на WebForge.

**Домейн:** https://bulgaria-digital-services.com ·
**Имейл:** info@bulgaria-digital-services.com ·
**Собственик:** Преслав Блажев

> Репото е **private**. Тук има вътрешни цени, рекламна стратегия и бизнес
> документи. Не го правете публично.

---

## Структура

```
.
├── website/                 Сайтът + цялата оперативна система (deploy-ва се dist/)
│   ├── *.html               публичните страници, /restaurants фунията
│   ├── assets/              CSS, JS (bds-data.js = цените), изображения, PDF
│   ├── PRICES AND PACKETS/  официалните цени и пакети — източникът на bds-data.js
│   ├── marketing/           Google Ads, Meta, CRM схема, продажби, съдържание
│   ├── tools/               build, проверки, тестове, CRM (Apps Script), ads скриптове
│   ├── OPERATIONS.md        как работи веригата реклама → заявка → оферта → отчет
│   └── bds_master_command.txt  първоначалното задание
│
├── brand/                   Лого, визитки (за печат + изходници), Facebook корици
│
├── business/                Работни материали извън сайта
│   ├── marketing/           checklist + Marketing Performance Tracker (xlsx)
│   ├── google-ads/          CSV пакет за внос на кампанията (Phase 12–13)
│   └── domain/              DMARC отчети за домейна
│
└── archive/                 История — само за справка, не се развива
    ├── webforge/            всичко от периода WebForge: knowledge base, master plan,
    │                        бизнес документи, intake въпросник, CRM и финансов модел
    ├── next-site-prototype/ ранният Next.js 16 прототип на BDS сайта
    └── marketing-*.rar      снимка на marketing/ от 13.09.2026
```

---

## Бърз старт

Изисква само Node.js (без `npm install` — сайтът няма зависимости).

```bash
cd website
node server.js                   # локално → http://localhost:3000
node tools/check-site.mjs        # проверка на съдържанието и данните
node tools/test-all.mjs          # всички 13 групи тестове
node tools/build-pages.mjs       # регенерира секциите между BDS:GEN маркерите
node tools/build-dist.mjs        # сглобява dist/ за качване
```

**Качва се съдържанието на `website/dist/`, не цялото репо.** `build-dist.mjs`
копира само позволените файлове и спира, ако нещо вътрешно (цени, marketing,
tools) попадне в dist.

Подробности: [`website/OPERATIONS.md`](website/OPERATIONS.md) ·
CRM инсталация: [`website/tools/crm/SETUP.md`](website/tools/crm/SETUP.md)

---

## Правила

- **Цените се сменят само в `website/PRICES AND PACKETS/`** → `assets/js/bds-data.js`
  → `node tools/build-pages.mjs`. Никаква цена не се пише на ръка в HTML.
- **Рекламните ID-та живеят само в `assets/js/bds-tracking.js`.** Всичко е зад
  Consent Mode v2 (`denied` по подразбиране).
- Тайни (`.env`, токени, ключове) **не се комитват** дори в private репо —
  `.gitignore` ги изключва.
- Преди commit: `node tools/test-all.mjs` трябва да е зелен.
