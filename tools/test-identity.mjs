/* ============================================================
   BDS — публичната идентичност (домейн и имейл)
   ------------------------------------------------------------
   Стартиране:  node tools/test-identity.mjs

   Един стар адрес, останал в един файл, се появява пред клиент
   точно веднъж — и точно тогава има значение. Затова проверката е
   машинна, а не „огледах ги“.

   Обхватът е ПУБЛИЧНОТО: страници, генератори, маркетингови и
   офертни документи. Технически файлове, в които личен адрес е
   легитимен (login, възстановяване), се изброяват поименно.
   ============================================================ */

import fs from 'node:fs';
import path from 'node:path';
import { reporter, read, exists, ROOT } from './lib/ops-test-kit.mjs';

const R = reporter('BDS — публична идентичност');
const { G, check } = R;

const BRAND = 'Bulgaria Digital Services';
const DOMAIN = 'bulgaria-digital-services.com';
const SITE = 'https://' + DOMAIN;
const EMAIL = 'info@' + DOMAIN;
const PHONE = '0877 364 001';

/* Отменени публични адреси. Всяко появяване извън allowlist е провал. */
const RETIRED_EMAILS = [
  'pr2.blazhev@gmail.com',
  'pr4.blazhev@gmail.com',
  'Bulgaria-Digital-Services@gmail.com'
];
const RETIRED_HOST = 'bulgaria-digital-services.netlify.app';

/* Файлове, на които е позволено да съдържат отменен адрес, и защо.
   Празен списък значи: никъде. */
const ALLOW_RETIRED_EMAIL = new Map([
  ['tools/test-identity.mjs', 'самата проверка изброява какво търси']
]);
const ALLOW_RETIRED_HOST = new Map([
  ['tools/test-identity.mjs', 'самата проверка'],
  ['tools/build-dist.mjs', 'бележка за произхода на деплоя']
]);

/* ------------------------------------------------------------
   Обхождане
   ------------------------------------------------------------ */
const SKIP_DIRS = new Set(['.git', 'dist', 'node_modules', 'out']);
const EXT = new Set(['.html', '.js', '.mjs', '.md', '.txt', '.xml', '.json', '.css']);

const files = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      walk(abs);
    } else if (EXT.has(path.extname(e.name))) {
      files.push(path.relative(ROOT, abs).replace(/\\/g, '/'));
    }
  }
})(ROOT);

check('проектът се обхожда', files.length > 30, files.length + ' файла');

/* ============================================================
   1. Отменените адреси ги няма
   ============================================================ */
G('Отменени адреси');

for (const bad of RETIRED_EMAILS) {
  const hits = files.filter(f => !ALLOW_RETIRED_EMAIL.has(f) && read(f).includes(bad));
  check('никъде не остава ' + bad, hits.length === 0, hits.join(', '));
}

{
  const hits = files.filter(f => !ALLOW_RETIRED_HOST.has(f) && read(f).includes(RETIRED_HOST));
  check('никъде не остава ' + RETIRED_HOST, hits.length === 0, hits.join(', '));
}

/* Личен Gmail като ПУБЛИЧЕН контакт — по-широка мрежа от трите горе. */
{
  const publicish = files.filter(f =>
    (f.endsWith('.html') || f.startsWith('marketing/') || f === 'assets/js/bds-data.js') &&
    !ALLOW_RETIRED_EMAIL.has(f));
  const hits = [];
  for (const f of publicish) {
    for (const m of read(f).matchAll(/[A-Za-z0-9._%+-]+@gmail\.com/g)) hits.push(f + ': ' + m[0]);
  }
  check('няма личен Gmail като публичен контакт', hits.length === 0, hits.join(' · '));
}

/* ============================================================
   2. Новата идентичност е на място
   ============================================================ */
G('Източниците на истината');

const data = read('assets/js/bds-data.js');
check('bds-data.js носи новия имейл', data.includes("email: '" + EMAIL + "'"));
check('bds-data.js носи телефона', data.includes(PHONE));
check('build-pages.mjs сочи производствения домейн',
  read('tools/build-pages.mjs').includes("const SITE_URL = '" + SITE + "'"));
check('check-site.mjs пази новия имейл',
  read('tools/check-site.mjs').includes("const OFFICIAL_EMAIL = '" + EMAIL + "'"));
check('формата праща уведомлението към новия адрес',
  read('assets/js/app.js').includes('formsubmit.co/ajax/' + EMAIL));

G('Публични страници');

const PAGES = ['index.html', 'restaurants.html', 'restaurants/thank-you.html',
  'about.html', 'contact.html', 'services.html', 'projects.html', 'process.html',
  'packages.html', 'privacy.html', 'terms.html'];

for (const p of PAGES) {
  if (!exists(p)) { check('липсва ' + p, false); continue; }
  const html = read(p);
  const canon = /<link rel="canonical" href="([^"]+)"/.exec(html);

  /* Страница с noindex няма нужда от canonical — тя нарочно не влиза в
     индекса. Такава е thank-you: тя е стъпка от конверсията, не
     съдържание, което някой да търси. */
  const noindex = /<meta name="robots" content="[^"]*noindex/.test(html);
  if (noindex && !canon) {
    check(p + ' — noindex без canonical, коректно', true, 'noindex');
  } else {
    check(p + ' — canonical сочи производствения домейн',
      canon && canon[1].startsWith(SITE), canon ? canon[1] : 'няма canonical');
  }
  const og = /<meta property="og:url" content="([^"]+)"/.exec(html);
  if (og) {
    check(p + ' — og:url сочи производствения домейн', og[1].startsWith(SITE), og[1]);
  }
}

check('ресторантската страница канонизира чистия адрес',
  /<link rel="canonical" href="https:\/\/bulgaria-digital-services\.com\/restaurants"/.test(read('restaurants.html')));
check('няма canonical към .html вариант на фунията',
  !/canonical[^>]*restaurants\.html/.test(read('restaurants.html')));

G('sitemap и robots');
const sitemap = read('sitemap.xml');
check('sitemap ползва производствения домейн',
  sitemap.includes(SITE) && !sitemap.includes(RETIRED_HOST));
const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
check('всеки адрес в sitemap е по HTTPS и на домейна',
  locs.length > 0 && locs.every(l => l.startsWith(SITE)), locs.length + ' адреса');
check('sitemap не съдържа restaurants.html',
  !locs.some(l => /restaurants\.html/.test(l)));
const robots = read('robots.txt');
check('robots сочи sitemap на домейна', robots.includes(SITE + '/sitemap.xml'));

/* ============================================================
   3. Документите, които стигат до клиент
   ============================================================ */
G('Документи пред клиент');

const CLIENT_FACING = [
  'marketing/proposal-template.md',
  'marketing/social-profile-setup.md',
  'marketing/social-post-library.md',
  'marketing/google-ads-restaurants.md',
  'marketing/meta-retargeting-audiences.md'
];
for (const f of CLIENT_FACING) {
  if (!exists(f)) { check('липсва ' + f, false); continue; }
  const txt = read(f);
  check(f + ' — без отменен имейл',
    !RETIRED_EMAILS.some(e => txt.includes(e)));
  check(f + ' — без отменен домейн', !txt.includes(RETIRED_HOST));
}
check('офертният шаблон носи новия имейл',
  read('marketing/proposal-template.md').includes(EMAIL));
check('рекламните финални адреси са на домейна',
  !/netlify/.test(read('marketing/google-ads-restaurants.md')));

G('Генерираната оферта');
const gen = read('tools/generate-proposal.mjs');
check('генераторът взима контактите от данните, не ги преписва',
  /D\.meta\.contact/.test(gen) && !RETIRED_EMAILS.some(e => gen.includes(e)));

/* ============================================================
   4. Марката и телефонът
   ============================================================ */
G('Марка и телефон');
check('марката е изписана еднакво', read('index.html').includes(BRAND));
check('телефонът е един и същи навсякъде',
  read('assets/js/app.js').includes('tel:+359877364001'));
check('телефонът в данните съвпада', data.includes('+359877364001'));

/* ============================================================
   4б. Рекламни акаунти и класификация на трафика
   ------------------------------------------------------------
   ID-тата тук НЕ са тайни: Pixel ID се вижда в кода на всеки сайт с
   пиксел, а Ad Account и Customer ID са идентификатори, не достъп.
   Тайните — access token, developer token, OAuth — не влизат в
   проекта и това също се проверява.
   ============================================================ */
G('Рекламни акаунти');

const META_PIXEL = '1666581461701404';
const META_ACCOUNT = '1516967893518549';
const GOOGLE_CUSTOMER = '337-991-6058';

const trackingSrc = read('assets/js/bds-tracking.js');
check('Meta Pixel ID е в централната конфигурация',
  new RegExp("metaPixelId:\\s*'" + META_PIXEL + "'").test(trackingSrc));
check('Pixel ID не е разпръснат из страниците',
  !read('index.html').includes(META_PIXEL) && !read('restaurants.html').includes(META_PIXEL));
check('Meta base code не е копиран в HTML',
  !read('index.html').includes('connect.facebook.net') &&
  !read('restaurants.html').includes('connect.facebook.net'));

check('Meta Ad Account ID е записан там, където трябва',
  read('marketing/meta-retargeting-live-setup.md').includes(META_ACCOUNT) &&
  read('tools/ads/MetaImport.gs').includes(META_ACCOUNT));
check('Google Ads Customer ID е записан за ориентир',
  read('tools/ads/google-ads-script.js').includes(GOOGLE_CUSTOMER));

/* Тайните остават извън проекта. */
const secretHunt = ['tools/ads/MetaImport.gs', 'tools/ads/google-ads-script.js',
  'assets/js/bds-tracking.js', 'assets/js/app.js'];
for (const file of secretHunt) {
  const src = read(file).replace(/\/\*[\s\S]*?\*\//g, '');
  check(file + ' — без access token', !/EAA[A-Za-z0-9]{20,}/.test(src));
  check(file + ' — без developer token', !/developer[_-]?token\s*[:=]\s*['\"]\S/i.test(src));
}
check('токенът на Meta се чете от Script Properties',
  /getProperty\('META_ACCESS_TOKEN'\)/.test(read('tools/ads/MetaImport.gs')));

G('Класификация на трафика');
const appSrc = read('assets/js/app.js');
check('социалният трафик има своя категория',
  /instagram: 'Instagram'/.test(appSrc) && /facebook: 'Facebook'/.test(appSrc));
check('платеният социален се отделя от органичния',
  /PAID_SOCIAL/.test(appSrc) && /meta_ads/.test(appSrc));
check('cpc се разпознава като платено търсене',
  /PAID_SEARCH\s*=\s*\/\^\([^)]*cpc/.test(appSrc));
check('числов Campaign ID се разрешава',
  /knownIds\.hasOwnProperty\(n\)/.test(read('tools/crm/Logic.gs')));

G('Профили и препоръчани връзки');
const social = read('marketing/social-live-checklist.md');
check('чеклистът за профилите съществува', social.length > 500);
check('Instagram профилът е записан', social.includes('@bulgaria_digital_services'));
check('препоръчаните UTM връзки са на производствения домейн',
  social.includes(SITE + '/?utm_source=instagram') &&
  social.includes(SITE + '/?utm_source=facebook'));
check('не се твърди, че има публикации',
  /не е проверявано оттук и не се твърди/i.test(social));
check('сайтът линква фирмения Instagram, не личния',
  appSrc.includes('instagram.com/bulgaria_digital_services') &&
  !appSrc.includes('_.preslav._b'));

/* ============================================================
   5. Живата продукция — само при --production
   ------------------------------------------------------------
   Локално вярно ≠ качено. Домейнът може да сервира предишния
   деплой и всичко по-горе да минава, докато посетителят вижда
   стария адрес.
   ============================================================ */
if (process.argv.includes('--production')) {
  G('Жива продукция');
  const pages = [
    ['/', SITE + '/'],
    ['/restaurants', SITE + '/restaurants']
  ];
  for (const [label, url] of pages) {
    let html = '', status = 0;
    try {
      const res = await fetch(url, { redirect: 'follow' });
      status = res.status;
      html = await res.text();
    } catch (e) {
      check(label + ' отговаря', false, String(e.cause?.code || e.message));
      continue;
    }
    check(label + ' отговаря с 200', status === 200, String(status));
    if (!html) continue;
    check(label + ' — без отменен имейл', !RETIRED_EMAILS.some(e => html.includes(e)));
    check(label + ' — без отменен домейн', !html.includes(RETIRED_HOST));
    check(label + ' — носи служебния имейл', html.includes(EMAIL));
    const canon = /<link rel="canonical" href="([^"]+)"/.exec(html);
    if (canon) {
      check(label + ' — canonical е на домейна', canon[1].startsWith(SITE), canon[1]);
    }
  }
  try {
    const robots = await (await fetch(SITE + '/robots.txt')).text();
    check('robots в продукция сочи домейна',
      robots.includes(SITE + '/sitemap.xml') && !robots.includes(RETIRED_HOST),
      (robots.match(/Sitemap:.*/) || [''])[0]);
  } catch (e) {
    check('robots.txt се чете', false, String(e.message));
  }
  console.log('\n\x1b[2m  Провал тук при зелено по-горе значи едно: качено е старо.\x1b[0m');
} else {
  console.log('\n\x1b[2m  Живата продукция не е проверявана: --production\x1b[0m');
}

process.exit(R.summary() ? 0 : 1);
