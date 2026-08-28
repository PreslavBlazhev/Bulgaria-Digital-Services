/* ============================================================
   Bulgaria Digital Services — проверка на статичния сайт
   ------------------------------------------------------------
   Без зависимости. Проверява:
     1. Счупени вътрешни връзки (href/src към несъществуващ файл)
     2. Липсващи alt атрибути на <img>
     3. Наличие на <title>, meta description, canonical, og:*
     4. Heading структура (точно един <h1>)
     5. Незатворени BDS:GEN маркери
     6. Забранени/непроверени твърдения в публичния HTML
        (проверката е по изречение и разпознава отрицание —
         „Microinvest не е внедрен“ е коректно, не е нарушение)
     7. Наличие на чувствителни низове (ключове, пароли)

   Изпълнение:  node tools/check-site.mjs
   Изход: 0 при успех, 1 при поне една грешка.
   ============================================================ */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const pages = readdirSync(ROOT).filter((f) => f.endsWith('.html'));

let errors = 0;
let warnings = 0;
let notes = 0;
const err = (p, m) => { errors++; console.log(`  ✖ [${p}] ${m}`); };
const warn = (p, m) => { warnings++; console.log(`  ⚠ [${p}] ${m}`); };
const note = (p, m) => { notes++; console.log(`  · [${p}] ${m}`); };

/* Твърдения, които НЕ трябва да се появяват в публичния HTML.
   Всяко е било премахнато нарочно — виж evidence sheets. */
const BANNED = [
  { re: /неограничен[аи]?\s+(корекции|ревизии|страници|интеграции)/i, why: 'обещание за неограничен обхват' },
  { re: /всичко необходимо/i, why: 'неясен обхват' },
  { re: /пълна оптимизация/i, why: 'неясен обхват' },
  { re: /демо проект/i, why: 'Dharma Tattoo е реален клиентски проект, не демо' },
  { re: /увеличи(хме)?\s+(продажбите|приходите|поръчките)/i, why: 'неизмерен KPI' },
  { re: /\bDSK\s*V-?POS\b|ДСК\s*\(?V-?POS\)?/i, why: 'непотвърден платежен доставчик' },
  { re: /Consent Mode v2/i, why: 'непотвърдено' },
  { re: /86\/86/, why: 'непотвърден брой тестове' },
  { re: /четирима бръснари/i, why: 'непотвърдено за FADEROOM' },
  { re: /Microinvest/i, why: 'интеграцията не е внедрена' },
  { re: /placeholder\s+цена|XXX\s*XXX/i, why: 'placeholder в публичен HTML' },
  /* Локацията на Pizza Pazzo е нерешен конфликт (D12) и не се публикува,
     докато адресът не бъде потвърден. */
  { re: /Pizza Pazzo[^.]{0,60}(Плевен|Варна)|(Плевен|Варна)[^.]{0,40}Pizza Pazzo/i, why: 'непотвърдена локация на Pizza Pazzo (D12)' },
  /* Границите идват от PRICES AND PACKETS: START до 4, BUSINESS до 7,
     PREMIUM до 10 основни страници. Предишните стойности са невалидни. */
  { re: /до\s*5\s+(публични\s+)?страници/i, why: 'остаряла граница — официалното за START е до 4' },
  { re: /до\s*8\s+(публични\s+)?страници/i, why: 'остаряла граница — официалното за BUSINESS е до 7' },
  { re: /до\s*(12|16)\s+(публични\s+)?страници/i, why: 'остаряла граница — официалното за PREMIUM е до 10' }
];

/* Езикови маркери за отрицание и дисклеймър.
   Забранена фраза в изречение с такъв маркер е коректно опровергана
   („Microinvest не е внедрен“, „не като „неограничени корекции““) и
   НЕ е нарушение. Такива попадения се отчитат само като бележка,
   за да остават видими при ръчен преглед.
   Без \b — в JS то работи само за латиница. */
const DISCLAIMERS = [
  /(?<!\p{L})не\s+(е|са|бе|беше|бяха|се|като|значи|включва|включват|предлагаме|обещаваме|твърдим)(?!\p{L})/iu,
  /(?<!\p{L})(без|нито|вместо)(?!\p{L})/iu,
  /(?<!\p{L})непотвърден\p{L}*/iu,
  /(?<!\p{L})чакат?(?!\p{L})\s+потвърждение/iu,
  /(?<!\p{L})остава\s+непубликуван/iu
];

/* Видимият текст на страницата, нарязан на изречения.
   Таговете са граници, за да не се слепват съседни елементи.
   Стойностите на content/alt/title се проверяват отделно —
   иначе забранено твърдение в meta description би останало скрито. */
function scannableSentences(html) {
  const out = new Set();
  const push = (chunk) => {
    chunk
      .replace(/(\d)\.(\d)/g, '$1$2') /* 15.07.2026 не е край на изречение */
      .split(/[.!?]+/)
      .forEach((s) => {
        const t = s.replace(/\s+/g, ' ').trim();
        if (t) out.add(t);
      });
  };

  push(
    html
      .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<[^>]+>/g, ' . ') /* тагът е край на изречение */
      .replace(/&nbsp;/g, ' ')
      .replace(/&[a-z]+;|&#\d+;/gi, ' ')
  );
  for (const m of html.matchAll(/(?:content|alt|title)="([^"]*)"/gi)) push(m[1]);

  return [...out];
}

/* Официални контакти. Всяко отклонение проваля проверката. */
const OFFICIAL_EMAIL = 'pr2.blazhev@gmail.com';
const RETIRED_EMAILS = [/pr4\.blazhev@gmail\.com/i];
const OFFICIAL_PHONE = /0877\s?364\s?001|\+359\s?877\s?364\s?001/;

/* Низове, които никога не бива да попадат в публичен файл. */
const SECRETS = [
  /sk_live_[A-Za-z0-9]/,
  /pk_live_[A-Za-z0-9]/,
  /whsec_[A-Za-z0-9]/,
  /AUTH_SECRET\s*=/,
  /ADMIN_PASSWORD\s*=/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/
];

console.log(`\nПроверявам ${pages.length} страници в ${ROOT}\n`);

for (const page of pages) {
  const html = readFileSync(join(ROOT, page), 'utf8');

  /* --- 1. Вътрешни връзки и ресурси --- */
  const refs = [...html.matchAll(/(?:href|src)="([^"#?]+)"/g)].map((m) => m[1]);
  for (const ref of refs) {
    if (/^(https?:|mailto:|tel:|data:|\/\/)/.test(ref)) continue;
    /* Чист адрес от корена, напр. /restaurants. Публичният адрес на
       рекламната фуния е без .html — и Netlify, и server.js сервират
       restaurants.html за него. Затова приемаме и трите варианта. */
    const candidates = ref.startsWith('/')
      ? [resolve(ROOT, '.' + ref), resolve(ROOT, '.' + ref + '.html'), resolve(ROOT, '.' + ref, 'index.html')]
      : [resolve(ROOT, ref)];
    if (!candidates.some((c) => existsSync(c))) err(page, `счупена връзка: ${ref}`);
  }

  /* --- 2. alt атрибути --- */
  for (const tag of html.match(/<img\b[^>]*>/g) || []) {
    if (!/\balt="/.test(tag)) err(page, `<img> без alt: ${tag.slice(0, 70)}…`);
    else if (/\balt=""/.test(tag)) warn(page, '<img> с празен alt');
  }

  /* --- 3. SEO мета --- */
  if (!/<title>[^<]{10,}<\/title>/.test(html)) err(page, 'липсва или е твърде кратък <title>');
  if (!/<meta name="description" content="[^"]{50,}"/.test(html)) err(page, 'липсва или е твърде кратък meta description');
  if (!/<link rel="canonical"/.test(html)) err(page, 'липсва canonical');
  if (!/<meta property="og:title"/.test(html)) warn(page, 'липсва og:title');
  if (!/<meta property="og:image"/.test(html)) warn(page, 'липсва og:image');

  /* --- 4. Heading структура --- */
  const h1 = (html.match(/<h1[\s>]/g) || []).length;
  if (h1 === 0) err(page, 'няма <h1>');
  if (h1 > 1) err(page, `${h1} броя <h1> (трябва точно 1)`);

  /* --- 5. Незатворени маркери --- */
  const starts = (html.match(/<!-- BDS:GEN start:/g) || []).length;
  const ends = (html.match(/<!-- BDS:GEN end:/g) || []).length;
  if (starts !== ends) err(page, `несъответстващи BDS:GEN маркери (${starts} start / ${ends} end)`);

  /* --- 6. Забранени твърдения --- */
  const scannable = scannableSentences(html);
  for (const b of BANNED) {
    for (const s of scannable) {
      const m = s.match(b.re);
      if (!m) continue;
      if (DISCLAIMERS.some((d) => d.test(s))) {
        note(page, `„${m[0]}“ — изрично опровергано в текста, ОК`);
      } else {
        err(page, `забранено твърдение „${m[0]}“ — ${b.why}`);
        console.log(`      ↳ „${s.length > 130 ? s.slice(0, 130) + '…' : s}“`);
      }
    }
  }

  /* --- 7. Чувствителни низове --- */
  for (const s of SECRETS) {
    if (s.test(html)) err(page, `⚠ ЧУВСТВИТЕЛЕН НИЗ в публичен файл: ${s}`);
  }

  /* --- 7б. Официални контакти --- */
  for (const re of RETIRED_EMAILS) {
    const m = html.match(re);
    if (m) err(page, `ОТМЕНЕН имейл „${m[0]}“ — официалният е ${OFFICIAL_EMAIL}`);
  }
  /* Телефонът трябва да е коректен там, където изобщо се среща. */
  if (/tel:\+?\d/.test(html)) {
    for (const t of html.match(/tel:\+?[\d\s()-]+/g) || []) {
      if (!OFFICIAL_PHONE.test(t.replace(/[^\d+]/g, (c) => (c === '+' ? '+' : '')))) {
        err(page, `непознат tel: линк „${t}“ — официалният е ${OFFICIAL_PHONE}`);
      }
    }
  }
}

/* --- 8. Проверка на data source-а --- */
const dataSrc = readFileSync(join(ROOT, 'assets/js/bds-data.js'), 'utf8');
const sandbox = {};
new Function('window', dataSrc)(sandbox);
const D = sandbox.BDS_DATA;

console.log('\nDATA SOURCE');
for (const p of D.packages) {
  const open = D.openLimits(p).map((l) => l.label);
  console.log(`  • ${p.name}: ${D.priceLabel(p)} · ${D.visibleLimits(p).length} публикувани лимита` +
    (open.length ? ` · ${open.length} чакащи решение (${open.join(', ')})` : ''));
  if (typeof p.priceFrom !== 'number') err('bds-data.js', `${p.name} няма начална цена`);
  if (!p.includes.length) err('bds-data.js', `${p.name} няма включени елементи`);
  if (!p.excludes.length) err('bds-data.js', `${p.name} няма изключения`);
}

/* Без потвърдено разрешение страницата е „подготвена, но скрита“. */
const unpublished = D.projects.filter((p) => p.publicationApproved !== true);
console.log(`  • Проекти: ${D.projects.length} общо · ${D.publicProjects().length} готови локално · ` +
  `${D.approvedForPublication().length} с разрешение за публикуване`);
if (unpublished.length) {
  console.log(`      ↳ ${unpublished.length} чакат разрешение — не се линкват и не са в sitemap`);
}
/* Пакетите са PROVISIONAL → всяка страница, която ги показва, ТРЯБВА
   да носи бележката „ориентировъчни“ (Вариант B). Без нея временните
   стойности изглеждат окончателно одобрени — това блокира deployment. */
if (D.meta.packagesStatus === 'PROVISIONAL') {
  console.log('  • Пакетите са PROVISIONAL — показват се като ориентировъчни.');
  const withPackages = pages.filter((p) => {
    const h = readFileSync(join(ROOT, p), 'utf8');
    return /class="pkg-grid"|class="cmp"/.test(h);
  });
  for (const p of withPackages) {
    const h = readFileSync(join(ROOT, p), 'utf8');
    if (!/data-bds-packages-note/.test(h)) {
      err(p, 'показва пакети без задължителната бележка „ориентировъчни“');
    }
  }
  console.log(`        Бележката присъства на: ${withPackages.join(', ') || '(няма такива страници)'}`);
  /* Думи, които не бива да описват непотвърдените стойности. */
  for (const p of withPackages) {
    const h = readFileSync(join(ROOT, p), 'utf8');
    const m = h.match(/(официал\p{L}*|окончателн\p{L}*|гарантиран\p{L}*)\s+(цена|обхват|scope|пакет\p{L}*|лимит\p{L}*)/iu);
    if (m) err(p, `представя PROVISIONAL пакет като „${m[0]}“`);
  }
}

/* Отзиви — публикува се само напълно одобрен отзив. */
const REQUIRED_T = ['name', 'business', 'text', 'approvedDate', 'approvedVia'];
for (const t of D.testimonials) {
  const who = t.name || t.business || '(без име)';
  if (t.approved !== true) {
    err('bds-data.js', `отзив „${who}“ е в данните без approved: true — драфтовете стоят в регистъра`);
    continue;
  }
  const missing = REQUIRED_T.filter((k) => !t[k]);
  if (missing.length) err('bds-data.js', `одобрен отзив „${who}“ без: ${missing.join(', ')}`);
}
console.log(`  • Отзиви: ${D.approvedTestimonials().length} одобрени от ${D.testimonialsMin} необходими` +
  (D.testimonialsVisible() ? ' — секцията се показва' : ' — секцията коректно не се рендерира'));

/* Всеки main проект трябва да има подготвена страница. */
for (const p of D.publicProjects(null, 'main')) {
  if (!p.page) err('bds-data.js', `${p.name} е main, но няма страница`);
  else if (!existsSync(join(ROOT, p.page))) err('bds-data.js', `липсва файл ${p.page} за ${p.name}`);
}

/* Проект без потвърдено разрешение НЕ се линква отникъде. */
for (const p of unpublished) {
  if (!p.page) continue;
  for (const page of pages) {
    if (page === p.page) continue;
    if (readFileSync(join(ROOT, page), 'utf8').includes(p.page)) {
      err(page, `линква проект без разрешение за публикуване: ${p.page}`);
    }
  }
  /* Скритата страница трябва да носи noindex. */
  if (existsSync(join(ROOT, p.page))) {
    const h = readFileSync(join(ROOT, p.page), 'utf8');
    if (!/<meta name="robots" content="noindex/.test(h)) {
      err(p.page, 'подготвена, но скрита страница без noindex');
    }
  }
}

/* --- 9. Sitemap --- */
/* Само реалните <loc> записи се броят. Коментарите в sitemap.xml
   обясняват КОЕ е изключено и нарочно съдържат имена на файлове —
   те не са записи и не бива да се четат като такива. */
const sitemapRaw = readFileSync(join(ROOT, 'sitemap.xml'), 'utf8');
const locs = [...sitemapRaw.replace(/<!--[\s\S]*?-->/g, '').matchAll(/<loc>([^<]+)<\/loc>/g)]
  .map((m) => m[1].trim());
for (const page of pages) {
  /* Приемаме и чистия адрес: /restaurants покрива restaurants.html. */
  const clean = page.replace(/\.html$/, '');
  const inSitemap = locs.some((l) => l.endsWith('/' + page) || l.endsWith('/' + clean)) ||
    (page === 'index.html' && locs.some((l) => /\/$/.test(l)));
  const shouldSkip = ['privacy.html', 'terms.html', 'index.html'].includes(page) ||
    unpublished.some((u) => u.page === page);
  if (!inSitemap && !shouldSkip) warn('sitemap.xml', `${page} липсва в sitemap`);
  if (inSitemap && unpublished.some((u) => u.page === page)) {
    err('sitemap.xml', `страница без разрешение за публикуване в sitemap: ${page}`);
  }
}

/* --- Резултат --- */
console.log('\n' + '─'.repeat(56));
console.log(`Резултат: ${errors} грешки · ${warnings} предупреждения · ${notes} бележки`);
console.log('─'.repeat(56) + '\n');
process.exit(errors > 0 ? 1 : 0);
