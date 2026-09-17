/* ============================================================
   BDS — Google Tag Manager и съгласието (Phase 25)
   ------------------------------------------------------------
   Стартиране:  node tools/test-gtm.mjs

   Този тест пази четири неща, всяко от които се чупи тихо:

   1. ЕДИН контейнер, ЕДИН път, на ВСЯКА публична страница.
      Втори снипет удвоява всяко събитие и никой не го забелязва,
      докато числата не станат невъзможни.

   2. РЕДЪТ в <head>. Ако контейнерът тръгне преди
      `gtag('consent','default', …)`, той стартира без ограничение
      и банерът за съгласие става украса. Тук се проверява точно
      подредбата, не само наличието.

   3. НЯМА втори GA4 loader. GTM носи GA4 вътре в себе си; отделен
      gtag.js редом с него прави втора инсталация на същия поток.

   4. Отказът значи отказ. След „Само необходимите“ и четирите
      категории остават `denied`.
   ============================================================ */

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';
import { reporter, read, exists, ROOT } from './lib/ops-test-kit.mjs';
import { sleep, startServer, launchChrome, newPage, respawnForWebSocket }
  from './lib/browser-kit.mjs';

const args = process.argv.slice(2);
const WANT_BROWSER = args.includes('--browser');
/* WebSocket липсва при Node 21 без флаг — рестартирай се с него. */
if (WANT_BROWSER) respawnForWebSocket(import.meta.url, args);

const R = reporter('BDS — Google Tag Manager и съгласие (Phase 25)');
const { G, check, blocked } = R;

/* Официалните идентификатори. Стоят изписани ТУК нарочно: тестът е
   независимият свидетел. Ако ги четеше от същия файл, който проверява,
   щеше да мине и при подменен ID. */
const GTM_ID = 'GTM-W4PX4KPR';
const GA4_ID = 'G-K3GKSLPE1N';

/** Страниците, които трябва да носят контейнера. */
const PAGES = [
  'index.html', 'services.html', 'packages.html', 'projects.html',
  'process.html', 'about.html', 'contact.html', 'privacy.html', 'terms.html',
  'restaurants.html', 'restaurants/thank-you.html',
  'case-pizza-pazzo.html', 'case-makeup-denitsa.html', 'case-dharma-tattoo.html',
  /* Не се публикува (noindex, Disallow, извън dist), но се генерира от
     същия шаблон — блокът трябва да е и в нея, иначе шаблонът се е
     разклонил, без някой да забележи. */
  'case-faderoom-infinity.html'
];

/** Страници БЕЗ контейнер, с причина. */
const NO_GTM = [
  ['print/packages-print.html', 'източник за PDF: Disallow в robots.txt, без банер за съгласие']
];

const count = (hay, needle) => hay.split(needle).length - 1;

/* ============================================================
   1. Централната конфигурация
   ============================================================ */
G('Централна конфигурация');

const tracking = read('assets/js/bds-tracking.js');
const builder = read('tools/build-pages.mjs');

check('GTM ID е в bds-tracking.js', new RegExp("gtmId:\\s*'" + GTM_ID + "'").test(tracking));
check('GA4 ID е в bds-tracking.js', new RegExp("ga4Id:\\s*'" + GA4_ID + "'").test(tracking));
check('няма placeholder ID', !/['"](GTM-XXXX|G-XXXX|AW-XXXX)/.test(tracking));

/* Един ID в целия проект. Стар или втори контейнер се хваща тук. */
const scanned = [...PAGES, 'assets/js/bds-tracking.js', 'assets/js/app.js',
  'assets/js/bds-consent.js', 'assets/js/bds-data.js', 'tools/build-pages.mjs'];
const foundIds = new Set();
for (const f of scanned) {
  if (!exists(f)) continue;
  for (const m of read(f).matchAll(/GTM-[A-Z0-9]{4,}/g)) foundIds.add(m[0]);
}
check('в проекта има точно един GTM ID и той е официалният',
  foundIds.size === 1 && foundIds.has(GTM_ID), [...foundIds].join(', ') || 'няма');

check('генераторът чете ID-то от конфигурацията, не го преписва',
  builder.includes("/gtmId:") && !builder.includes(GTM_ID));

/* ============================================================
   2. Снипетът във всяка страница
   ============================================================ */
G('Снипетът във всяка публична страница');

for (const page of PAGES) {
  if (!exists(page)) { check('липсва ' + page, false); continue; }
  const html = read(page);
  const label = page + ' — ';

  check(label + 'точно един GTM <script>', count(html, 'googletagmanager.com/gtm.js') === 1,
    count(html, 'googletagmanager.com/gtm.js') + ' бр.');
  check(label + 'точно един GTM <noscript>', count(html, 'googletagmanager.com/ns.html') === 1,
    count(html, 'googletagmanager.com/ns.html') + ' бр.');
  check(label + 'снипетът носи официалния ID',
    html.includes("'dataLayer','" + GTM_ID + "'") &&
    html.includes('ns.html?id=' + GTM_ID));

  /* <script> в <head> */
  const headEnd = html.indexOf('</head>');
  const snippet = html.indexOf('googletagmanager.com/gtm.js');
  check(label + '<script> е в <head>', snippet > 0 && headEnd > 0 && snippet < headEnd);

  /* Възможно най-високо: преди <title>, преди всеки стил и всеки друг
     скрипт. Пред него остават само charset и viewport. */
  const title = html.indexOf('<title');
  const firstLink = html.indexOf('<link');
  check(label + 'стои над <title> и над стиловете',
    snippet < title && snippet < firstLink);

  /* <noscript> непосредствено след отварящия <body>: между двете има
     само празни знаци и HTML коментари (маркерът на генератора). */
  const bodyOpen = /<body[^>]*>/.exec(html);
  const after = bodyOpen ? html.slice(bodyOpen.index + bodyOpen[0].length) : '';
  const upToNoscript = after.slice(0, after.indexOf('<noscript'));
  check(label + '<noscript> е непосредствено след <body>',
    !!bodyOpen && after.indexOf('<noscript') > -1 &&
    upToNoscript.replace(/<!--[\s\S]*?-->/g, '').trim() === '',
    JSON.stringify(upToNoscript.slice(0, 60)));

  /* Конфигурацията се зарежда синхронно и ПРЕДИ контейнера. */
  const cfg = /<script src="[^"]*assets\/js\/bds-tracking\.js"([^>]*)><\/script>/.exec(html);
  check(label + 'bds-tracking.js се зарежда веднъж',
    count(html, 'assets/js/bds-tracking.js') === 1);
  check(label + 'bds-tracking.js е синхронен (без defer/async)',
    !!cfg && !/defer|async/.test(cfg[1]), cfg ? cfg[1].trim() : 'липсва');
  check(label + 'конфигурацията е НАД снипета', !!cfg && cfg.index < snippet);

  /* Банерът е задължителен спътник: без него никой не може да даде или
     откаже съгласие, а контейнерът остава завинаги ограничен. */
  check(label + 'банерът за съгласие е на страницата',
    html.includes('assets/js/bds-consent.js'));

  /* Никакъв втори, директен GA4. */
  check(label + 'няма директен gtag.js loader', !html.includes('gtag/js?id='));
  check(label + 'GA4 ID-то не е разпръснато в HTML', !html.includes(GA4_ID));
}

G('Страници без контейнер');
for (const [page, why] of NO_GTM) {
  if (!exists(page)) { check('липсва ' + page, false); continue; }
  const html = read(page);
  check(page + ' — без GTM (' + why + ')',
    !html.includes('googletagmanager.com/gtm.js') && !html.includes('ns.html?id='));
}

/* ============================================================
   3. Съгласието
   ============================================================ */
G('Съгласие — подредба и стойности');

const defaultIdx = tracking.indexOf("gtag('consent', 'default'");
const grantIdx = tracking.indexOf('function grantConsent');
const loadIdx = tracking.indexOf('function loadGoogleTags');
check('consent default се задава в bds-tracking.js', defaultIdx > 0);
check('задава се ПРЕДИ каквото и да е отключване на тагове',
  defaultIdx > 0 && defaultIdx < grantIdx && defaultIdx < loadIdx);
check('четирите категории са denied по подразбиране',
  /analytics_storage:\s*'denied'/.test(tracking) &&
  /ad_storage:\s*'denied'/.test(tracking) &&
  /ad_user_data:\s*'denied'/.test(tracking) &&
  /ad_personalization:\s*'denied'/.test(tracking));
check('има wait_for_update, за да не тръгнат таговете преди избора',
  /wait_for_update:\s*\d+/.test(tracking));
check('при избор се изпраща consent update',
  /gtag\('consent', 'update', consentState\)/.test(tracking));

/* ---------- Един маршрут към GA4 ----------
   track() бута ЕДНО нещо в dataLayer. Всяко второ бутане на същото
   събитие — независимо дали като обект или като gtag команда — GTM
   брои отделно и в GA4 влизат по две копия. */
/* Коментарите се махат: те описват точно този дефект и биха
   провалили проверката, която обясняват. */
const appSrc = read('assets/js/app.js').replace(/\/\*[\s\S]*?\*\//g, '');
check('app.js не праща събития и през gtag()',
  !/window\.gtag\(\s*'event'/.test(appSrc) && !/gtag\(\s*'event'/.test(appSrc));
check('app.js бута в dataLayer точно на едно място',
  (appSrc.match(/dataLayer\.push\(/g) || []).length === 1,
  (appSrc.match(/dataLayer\.push\(/g) || []).length + ' места');
check('bds-tracking.js не публикува window.gtag',
  !/global\.gtag\s*=/.test(tracking));

/* Контейнерът идва от HTML. Ако някой го върне и тук, страницата ще
   зареди два контейнера — затова се проверява изрично. */
check('bds-tracking.js НЕ тегли втори контейнер', !tracking.includes('gtm.js?id='));
check('bds-tracking.js НЯМА gtag.js loader', !tracking.includes('gtag/js?id='));

/* ---------- Поведение, не текст ---------- */
function sandbox() {
  const scripts = [];
  const node = () => {
    const n = { async: false, src: '' };
    return n;
  };
  const win = {
    document: {
      createElement: () => node(),
      getElementsByTagName: () => [{ parentNode: { insertBefore(n) { scripts.push(String(n.src || '')); } } }],
      head: { appendChild(n) { scripts.push(String(n.src || '')); } },
      addEventListener() {},
      readyState: 'complete'
    },
    console: { info() {}, warn() {}, error() {}, log() {} },
    Date, JSON, Math, String, Number, Boolean, Object, Array, RegExp, Error,
    isNaN, isFinite, parseFloat, parseInt, encodeURIComponent, decodeURIComponent
  };
  win.window = win; win.self = win; win.top = win;
  vm.createContext(win);
  vm.runInContext(tracking, win, { filename: 'bds-tracking.js' });
  return { win, T: win.BDSTracking, scripts };
}

{
  const { T } = sandbox();
  const s = T.consentState();
  check('преди избор: analytics_storage е denied', s.analytics_storage === 'denied', s.analytics_storage);
  check('преди избор: ad_storage е denied', s.ad_storage === 'denied', s.ad_storage);
  check('преди избор: ad_user_data е denied', s.ad_user_data === 'denied', s.ad_user_data);
  check('преди избор: ad_personalization е denied', s.ad_personalization === 'denied', s.ad_personalization);
  check('преди избор нищо не е отключено', T.isLoaded() === false);
}

{
  /* Отказ. */
  const { win, T } = sandbox();
  const before = win.dataLayer.length;
  T.grantConsent({ analytics: false, ads: false });
  const s = T.consentState();
  check('отказ: и четирите категории остават denied',
    s.analytics_storage === 'denied' && s.ad_storage === 'denied' &&
    s.ad_user_data === 'denied' && s.ad_personalization === 'denied');
  check('отказ: Meta не се зарежда', T.isMetaLoaded() === false);
  check('отказ: изпраща се consent update, а не мълчание', win.dataLayer.length > before);
}

{
  /* Само анализ. */
  const { T } = sandbox();
  T.grantConsent({ analytics: true, ads: false });
  const s = T.consentState();
  check('само анализ: analytics_storage става granted', s.analytics_storage === 'granted');
  check('само анализ: рекламните категории остават denied',
    s.ad_storage === 'denied' && s.ad_user_data === 'denied' && s.ad_personalization === 'denied');
  check('само анализ: Google слоят е отключен', T.isLoaded() === true);
  check('само анализ: Meta мълчи', T.isMetaLoaded() === false);
}

{
  /* Пълно съгласие. */
  const { T, scripts } = sandbox();
  T.grantConsent({ analytics: true, ads: true });
  const s = T.consentState();
  check('приемане: и четирите категории са granted',
    s.analytics_storage === 'granted' && s.ad_storage === 'granted' &&
    s.ad_user_data === 'granted' && s.ad_personalization === 'granted');
  check('приемане: Meta Pixel се зарежда', T.isMetaLoaded() === true);
  check('приемане: не се тегли втори контейнер',
    !scripts.some(u => /googletagmanager/.test(u)), scripts.join(' | '));
}

/* ============================================================
   4. Папката за качване
   ------------------------------------------------------------
   Вярно в корена ≠ качено. dist/ е това, което отива в Netlify.
   ============================================================ */
G('dist — папката, която се качва');

if (!existsSync(join(ROOT, 'dist'))) {
  check('dist/ съществува (пусни node tools/build-dist.mjs)', false);
} else {
  const expected = PAGES.filter((p) => !p.startsWith('case-faderoom'));
  const bad = [];
  for (const page of expected) {
    const p = 'dist/' + page;
    if (!exists(p)) { bad.push(page + ': липсва'); continue; }
    const html = read(p);
    if (count(html, 'googletagmanager.com/gtm.js') !== 1 ||
        count(html, 'googletagmanager.com/ns.html') !== 1 ||
        !html.includes(GTM_ID)) bad.push(page);
  }
  check('всяка публична страница в dist носи контейнера',
    bad.length === 0, bad.join(' | ') || expected.length + ' страници');
  check('dist носи същата конфигурация',
    exists('dist/assets/js/bds-tracking.js') &&
    read('dist/assets/js/bds-tracking.js').includes(GTM_ID));
  check('скритата страница не е в dist',
    !exists('dist/case-faderoom-infinity.html'));
}

/* ============================================================
   5. Живият контейнер
   ------------------------------------------------------------
   Дотук всичко се доказва от файловете. Файловете обаче не знаят
   какво има ВЪТРЕ в публикувания контейнер — а точно там се решава
   дали съгласието значи нещо. Оттук нататък се гледа истински
   Chrome срещу истинския GTM-W4PX4KPR.
   ============================================================ */

/** Групира заявките, които ни интересуват, по смисъл. */
function classify(urls) {
  const one = (re) => urls.filter((u) => re.test(u));
  return {
    container: one(/googletagmanager\.com\/gtm\.js/),
    googleTag: one(/googletagmanager\.com\/gtag\/js/),
    collect: one(/google-analytics\.com\/g\/collect|analytics\.google\.com\/g\/collect/),
    meta: one(/connect\.facebook\.net|facebook\.com\/tr/),
    ads: one(/doubleclick\.net|googleadservices\.com/)
  };
}

const AD_COOKIES = /(^|;\s*)(_ga|_gid|_gcl_|_fbp|_fbc)/;
const param = (url, name) => new URL(url).searchParams.get(name);

async function browserTests() {
  const srv = await startServer(ROOT);
  const basePort = srv.port;
  const chrome = await launchChrome('bds-gtm-test');
  if (!chrome) {
    check('Chrome е наличен', false, 'не е намерен — живите проверки се пропускат');
    srv.server.close();
    return;
  }
  const base = 'http://localhost:' + basePort;

  async function open() {
    const p = await newPage(chrome.port);
    const urls = [];
    /* Броят на заявките НЕ е броят на събитията: GA4 пакетира няколко
       събития в едно POST тяло, по едно на ред. Дублиране, преброено
       по заявки, се скрива вътре в пакета. */
    const gaEvents = [];
    p.on((m) => {
      if (m.method !== 'Network.requestWillBeSent') return;
      const r = m.params.request;
      urls.push(r.url);
      if (!/google-analytics|analytics\.google/.test(r.url)) return;
      const q = new URL(r.url).searchParams.get('en');
      if (q) gaEvents.push(q);
      for (const mm of (r.postData || '').matchAll(/(?:^|&|\r?\n)en=([^&\r\n]*)/g)) gaEvents.push(mm[1]);
    });
    await p.send('Page.enable'); await p.send('Runtime.enable'); await p.send('Network.enable');
    /* Бисквитките са на ниво браузър, не на таб: без това остатък от
       предишна сесия с дадено съгласие обвинява следващата. */
    await p.send('Network.clearBrowserCookies');
    return { p, urls, gaEvents };
  }

  /** Колко пъти името е влязло в dataLayer — по двата възможни начина. */
  const DL_COUNT = (name) => `(function(){
    var dl = window.dataLayer || [], named = 0, viaGtag = 0;
    for (var i = 0; i < dl.length; i++) {
      var x = dl[i];
      if (x && x.event === ${JSON.stringify(name)}) named++;
      else if (x && typeof x === 'object' && x[0] === 'event' && x[1] === ${JSON.stringify(name)}) viaGtag++;
    }
    return JSON.stringify({ named: named, viaGtag: viaGtag });
  })()`;
  const go = async (p, url, wait = 6000) => { await p.send('Page.navigate', { url }); await sleep(wait); };

  try {
    /* ---------- Нов посетител, преди избор ---------- */
    G('Живо — преди избор');
    const { p, urls } = await open();
    await go(p, base + '/restaurants', 1500);
    await p.eval('try{localStorage.clear()}catch(e){}');
    urls.length = 0;
    await go(p, base + '/restaurants');

    let net = classify(urls);
    check('банерът за съгласие се показва', await p.eval("!!document.querySelector('.consent')"));
    let st = JSON.parse(await p.eval('JSON.stringify(window.BDSTracking.consentState())'));
    check('consent default: и четирите категории са denied',
      st.analytics_storage === 'denied' && st.ad_storage === 'denied' &&
      st.ad_user_data === 'denied' && st.ad_personalization === 'denied', JSON.stringify(st));
    check('контейнерът се зарежда точно веднъж', net.container.length === 1, net.container.length + ' бр.');
    check('контейнерът е официалният',
      net.container.every((u) => param(u, 'id') === GTM_ID), net.container[0] || '');
    check('Google Tag-ът от контейнера е точно един',
      net.googleTag.length === 1, net.googleTag.join(' | '));
    check('Google Tag-ът носи официалния GA4 ID',
      net.googleTag.every((u) => param(u, 'id') === GA4_ID), net.googleTag[0] || '');
    check('без съгласие няма аналитични и рекламни бисквитки',
      !AD_COOKIES.test(await p.eval('document.cookie') || ''), await p.eval('document.cookie') || 'няма');
    check('Meta Pixel не се зарежда', net.meta.length === 0 &&
      (await p.eval('typeof window.fbq')) === 'undefined', net.meta.join(' | '));
    check('нула заявки към doubleclick.net и googleadservices.com',
      net.ads.length === 0, net.ads.join(' | '));
    /* Cookieless ping-ът е позволеното изключение: Google Tag-ът има право
       да се обади с отказано съгласие, стига да носи gcs=G100 и да не пише
       бисквитка. Всичко друго би значело, че съгласието е заобиколено. */
    check('ако GA4 се обади, то е cookieless и с отказано съгласие',
      net.collect.every((u) => param(u, 'gcs') === 'G100'),
      net.collect.map((u) => param(u, 'en') + '/' + param(u, 'gcs')).join(', ') || 'нито една заявка');
    check('всяка GA4 заявка е към официалния поток',
      net.collect.every((u) => param(u, 'tid') === GA4_ID),
      net.collect.map((u) => param(u, 'tid')).join(', ') || 'няма');

    /* ---------- Отказ ---------- */
    G('Живо — отказ');
    urls.length = 0;
    await p.eval("document.querySelector('[data-consent=\"reject\"]').click()");
    await sleep(4000);
    net = classify(urls);
    st = JSON.parse(await p.eval('JSON.stringify(window.BDSTracking.consentState())'));
    check('отказ: и четирите категории остават denied',
      st.analytics_storage === 'denied' && st.ad_storage === 'denied' &&
      st.ad_user_data === 'denied' && st.ad_personalization === 'denied', JSON.stringify(st));
    check('отказ: не се появява аналитична или рекламна бисквитка',
      !AD_COOKIES.test(await p.eval('document.cookie') || ''), await p.eval('document.cookie') || 'няма');
    check('отказ: Meta Pixel не се зарежда', net.meta.length === 0 &&
      (await p.eval('typeof window.fbq')) === 'undefined', net.meta.join(' | '));
    check('отказ: нищо рекламно не тръгва', net.ads.length === 0, net.ads.join(' | '));
    check('отказ: ако GA4 се обади, пак е с gcs=G100',
      net.collect.every((u) => param(u, 'gcs') === 'G100'),
      net.collect.map((u) => param(u, 'gcs')).join(', ') || 'нито една заявка');
    p.close();

    /* ---------- Приемане ---------- */
    G('Живо — приемане');
    const b = await open();
    await go(b.p, base + '/restaurants', 1500);
    await b.p.eval('try{localStorage.clear()}catch(e){}');
    await go(b.p, base + '/restaurants');
    b.urls.length = 0;
    await b.p.eval("document.querySelector('[data-consent=\"accept\"]').click()");
    await sleep(6000);

    net = classify(b.urls);
    st = JSON.parse(await b.p.eval('JSON.stringify(window.BDSTracking.consentState())'));
    check('приемане: analytics_storage става granted', st.analytics_storage === 'granted', st.analytics_storage);
    check('приемане: и рекламните категории стават granted',
      st.ad_storage === 'granted' && st.ad_user_data === 'granted' &&
      st.ad_personalization === 'granted', JSON.stringify(st));
    check('приемане: Meta Pixel се зарежда', net.meta.length > 0 &&
      (await b.p.eval('typeof window.fbq')) === 'function', net.meta.length + ' заявки');
    check('приемане: GA4 получава заявка с дадено съгласие',
      net.collect.some((u) => param(u, 'gcs') === 'G111'),
      net.collect.map((u) => param(u, 'en') + '/' + param(u, 'gcs')).join(', ') || 'няма');
    check('приемане: не се зарежда втори контейнер',
      net.container.length === 0, net.container.join(' | '));
    check('приемане: не се зарежда втори Google Tag',
      net.googleTag.length === 0, net.googleTag.join(' | '));
    const cookies = await b.p.eval('document.cookie') || '';
    check('приемане: GA4 бисквитката е на официалния поток',
      cookies.includes('_ga_' + GA4_ID.replace('G-', '')), cookies);

    /* ---------- Презареждане с дадено съгласие ---------- */
    G('Живо — презареждане с дадено съгласие');
    b.urls.length = 0; b.gaEvents.length = 0;
    await go(b.p, base + '/restaurants');
    net = classify(b.urls);
    /* Името на събитието се чете от gaEvents, не от адреса: при дадено
       съгласие GA4 праща POST и `en` живее в тялото, не в query-то. */
    const pageViews = b.gaEvents.filter((e) => e === 'page_view');
    check('точно един контейнер на зареждане', net.container.length === 1, net.container.length + ' бр.');
    check('точно един Google Tag на зареждане', net.googleTag.length === 1, net.googleTag.length + ' бр.');
    check('точно един page_view към GA4, не два',
      pageViews.length === 1, pageViews.length + ' бр. | ' + JSON.stringify(b.gaEvents));
    check('page_view-ът е с granted съгласие',
      net.collect.length > 0 && net.collect.every((u) => param(u, 'gcs') === 'G111'),
      net.collect.map((u) => param(u, 'gcs')).join(', '));
    check('page_view-ът е към официалния поток',
      net.collect.length > 0 && net.collect.every((u) => param(u, 'tid') === GA4_ID),
      net.collect.map((u) => param(u, 'tid')).join(', '));
    check('Meta Pixel се зарежда и след презареждане', net.meta.length > 0, net.meta.length + ' заявки');

    /* ---------- Едно действие → едно събитие ----------
       Регресията, заради която този блок съществува: track() буташе и
       по втори маршрут (gtag команда), GTM броеше и двете и в GA4
       влизаха по две копия на всяко custom събитие. Затова тук се
       брои на трите нива поотделно — dataLayer, мрежа, име. */
    G('Живо — едно действие, едно събитие');
    b.urls.length = 0; b.gaEvents.length = 0;
    const tel = await b.p.eval("(function(){var a=document.querySelector('a[href^=\"tel:\"]');if(!a)return '';a.click();return a.getAttribute('href')})()");
    await sleep(5000);
    let dl = JSON.parse(await b.p.eval(DL_COUNT('phone_click')));
    check('един клик → едно dataLayer събитие', dl.named === 1, JSON.stringify(dl) + ' ' + tel);
    check('един клик → нула събития по втори маршрут', dl.viaGtag === 0, JSON.stringify(dl));
    check('при granted: точно едно GA4 събитие phone_click',
      b.gaEvents.filter((e) => e === 'phone_click').length === 1,
      JSON.stringify(b.gaEvents));

    b.urls.length = 0; b.gaEvents.length = 0;
    await b.p.eval("(function(){var a=document.querySelector('a[href^=\"mailto:\"]');if(a)a.click();return !!a})()");
    await sleep(5000);
    dl = JSON.parse(await b.p.eval(DL_COUNT('email_click')));
    check('email_click също е един път в dataLayer', dl.named === 1 && dl.viaGtag === 0, JSON.stringify(dl));
    check('при granted: точно едно GA4 събитие email_click',
      b.gaEvents.filter((e) => e === 'email_click').length === 1,
      JSON.stringify(b.gaEvents));
    b.p.close();

    /* ---------- Същото действие при отказ ---------- */
    G('Живо — едно действие при отказано съгласие');
    const d = await open();
    await go(d.p, base + '/restaurants', 1500);
    await d.p.eval('try{localStorage.clear()}catch(e){}');
    /* localStorage е общ за origin-а между табовете: първото зареждане
       тук още помни съгласието от предишната сесия и вече е сложило
       _ga и _fbp. Чистят се СЛЕД него, иначе проверката по-долу мери
       чужди следи и обвинява отказа за тях. */
    await d.p.send('Network.clearBrowserCookies');
    await go(d.p, base + '/restaurants');
    await d.p.eval("document.querySelector('[data-consent=\"reject\"]').click()");
    await sleep(2000);
    d.urls.length = 0; d.gaEvents.length = 0;
    await d.p.eval("(function(){var a=document.querySelector('a[href^=\"tel:\"]');if(a)a.click();return !!a})()");
    await sleep(5000);
    dl = JSON.parse(await d.p.eval(DL_COUNT('phone_click')));
    /* dataLayer се пълни винаги — гейтът е в GTM, не в сайта. Така
       събитието е налично за тагове, които нямат нужда от съгласие. */
    check('отказ: събитието пак влиза в dataLayer веднъж',
      dl.named === 1 && dl.viaGtag === 0, JSON.stringify(dl));
    check('отказ: нула GA4 custom събития',
      d.gaEvents.filter((e) => e === 'phone_click' || e === 'email_click').length === 0,
      JSON.stringify(d.gaEvents));
    check('отказ: нула аналитични бисквитки след действието',
      !AD_COOKIES.test(await d.p.eval('document.cookie') || ''), await d.p.eval('document.cookie') || 'няма');
    d.p.close();
  } finally {
    srv.server.close();
    try { chrome.proc.kill(); } catch {}
  }
}

if (WANT_BROWSER) {
  await browserTests();
} else {
  console.log('\n\x1b[2m(живите проверки срещу контейнера се пропускат — пусни с --browser)\x1b[0m');
}

console.log('');
process.exit(R.summary() ? 0 : 1);
