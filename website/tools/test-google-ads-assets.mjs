/* ============================================================
   BDS — рекламни активи и котви (Google Ads)
   ------------------------------------------------------------
   Стартиране:

     node tools/test-google-ads-assets.mjs             без браузър
     node tools/test-google-ads-assets.mjs --browser   + реален скрол

   Две неща, които се чупят тихо:

   1. Лимит на знаците. Google просто отказва актива и обявата
      излиза без него — никой не получава известие.

   2. Котва, която сочи в нищото. Sitelink „Цени“, който отваря
      началото на страницата, изглежда като работещ и хаби клик.

   Затова текстовете се броят от таблиците в документите, а котвите
   се отварят в истински браузър и се проверява дали заглавието се
   вижда под закачения header.
   ============================================================ */

import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
import os from 'node:os';
import { reporter, read, exists, ROOT } from './lib/ops-test-kit.mjs';

const WANT_BROWSER = process.argv.includes('--browser');

if (WANT_BROWSER && typeof WebSocket === 'undefined') {
  if (process.env.__BDS_RESPAWNED) {
    console.error('WebSocket липсва. Нужен е Node 21+.');
    process.exit(1);
  }
  const r = spawnSync(process.execPath,
    ['--experimental-websocket', fileURLToPath(import.meta.url), ...process.argv.slice(2)],
    { stdio: 'inherit', env: { ...process.env, __BDS_RESPAWNED: '1' } });
  process.exit(r.status ?? 1);
}

const R = reporter('BDS — рекламни активи и котви');
const { G, check, blocked } = R;

const SITE = 'https://bulgaria-digital-services.com';
const LANDING = SITE + '/restaurants';

/* Официалните лимити на Google Ads. */
const LIMIT = {
  headline: 30, description: 90,
  sitelinkTitle: 25, sitelinkDesc: 35,
  callout: 25, snippetValue: 25, path: 15
};
const len = (s) => [...String(s)].length;

/** Клетките на markdown таблица, без водещите и крайните тръби. */
function tableRows(md, headingRe) {
  const start = md.search(headingRe);
  if (start < 0) return [];
  const rest = md.slice(start);
  const rows = [];
  for (const line of rest.split(/\r?\n/)) {
    if (!line.trim().startsWith('|')) { if (rows.length) break; continue; }
    const cells = line.split('|').slice(1, -1).map(c => c.trim());
    if (cells.every(c => /^-+$/.test(c.replace(/:/g, '')))) continue;
    rows.push(cells);
  }
  return rows;
}

const html = read('restaurants.html');

/* ============================================================
   1. Котвите съществуват и са уникални
   ============================================================ */
G('Котви на /restaurants');

const ANCHORS = {
  'Цени': 'packages',
  'Как работи': 'components',
  'Ресторантска система': 'system',
  'Реален проект': 'proof',
  'Получи оферта': 'restaurant-contact'
};

const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]);
check('страницата има котви', ids.length > 0, ids.length + ' id');
const dupes = ids.filter((v, i) => ids.indexOf(v) !== i);
check('всички id са уникални', dupes.length === 0, [...new Set(dupes)].join(', '));

for (const [label, id] of Object.entries(ANCHORS)) {
  check('котва „' + label + '“ → #' + id, ids.includes(id));
  /* Котвата трябва да е върху истинска секция, не върху празен елемент. */
  const onSection = new RegExp('<section[^>]*id="' + id + '"').test(html);
  check('#' + id + ' е върху <section>, не празна котва', onSection);
}

check('няма скрити котви само за реклама',
  !/<(span|div|a)[^>]*id="(pricing|how-it-works|case-study|contact)"[^>]*>\s*<\/(span|div|a)>/.test(html));

G('Отместване при закачен header');
const css = read('assets/css/style.css');
const pad = /scroll-padding-top:\s*(\d+)px/.exec(css);
check('html има scroll-padding-top', !!pad, pad ? pad[1] + 'px' : 'няма');
check('отместването покрива header-а',
  pad && Number(pad[1]) >= 70, pad ? pad[1] + 'px' : '');
/* Правилото живее в блока за намалена анимация — той е дълъг, затова се
   търси самият блок, а не съседство от N знака. */
const rmStart = css.search(/@media[^{]*prefers-reduced-motion/);
check('има блок за намалена анимация', rmStart >= 0);
check('плавният скрол се изключва при намалена анимация',
  rmStart >= 0 && /scroll-behavior:\s*auto/.test(css.slice(rmStart)));

/* ============================================================
   2. Формата остава непокътната
   ============================================================ */
G('Формата зад #restaurant-contact');
check('формата е вътре в секцията',
  html.indexOf('id="restaurantForm"') > html.indexOf('id="restaurant-contact"'));
check('id-то на формата е стабилно', /id="restaurantForm"/.test(html));
const appJs = read('assets/js/app.js');
check('уведомлението отива към служебния имейл',
  appJs.includes('formsubmit.co/ajax/info@bulgaria-digital-services.com'));
check('CRM записът е непокътнат', /function sendToCrm/.test(appJs));
check('thank-you адресът не е пипан',
  appJs.includes("'/restaurants/thank-you'") && exists('restaurants/thank-you.html'));

/* ============================================================
   3. Активите — знаци
   ============================================================ */
G('Sitelinks');
const slDoc = read('marketing/google-ads-sitelinks.md');
const slRows = tableRows(slDoc, /\| # \| Заглавие \| Зн\./)
  .filter(r => /^\d+$/.test(r[0]));
check('пет sitelink-а', slRows.length === 5, slRows.length + '');
for (const r of slRows) {
  const [, title, tn, d1, d1n, d2, d2n, url] = r;
  check('„' + title + '“ ≤ 25', len(title) <= LIMIT.sitelinkTitle, len(title) + '');
  check('„' + title + '“ — обявеният брой знаци е верен',
    Number(tn) === len(title) && Number(d1n) === len(d1) && Number(d2n) === len(d2),
    tn + '/' + d1n + '/' + d2n + ' срещу ' + len(title) + '/' + len(d1) + '/' + len(d2));
  check('„' + title + '“ — описанията ≤ 35',
    len(d1) <= LIMIT.sitelinkDesc && len(d2) <= LIMIT.sitelinkDesc,
    len(d1) + '/' + len(d2));
  const anchor = (url.match(/#([a-z-]+)/) || [])[1];
  check('„' + title + '“ сочи съществуваща котва', ids.includes(anchor), '#' + anchor);
  check('„' + title + '“ е на производствения домейн', /restaurants#/.test(url) && !/netlify/.test(url));
}

G('Callouts');
const coRows = tableRows(read('marketing/google-ads-callouts.md'), /\| # \| Текст \| Зн\./)
  .filter(r => /^\d+$/.test(r[0]));
check('поне 8 callout-а', coRows.length >= 8, coRows.length + '');
for (const [, text, n] of coRows) {
  check('„' + text + '“ ≤ 25 и броят е верен',
    len(text) <= LIMIT.callout && Number(n) === len(text),
    n + ' срещу ' + len(text));
}
const coText = coRows.map(r => r[1]).join(' ');
check('няма недоказуемо твърдение в callout',
  !/най-добр|№\s?1|гарантир|удвоя/i.test(coText), coText);

G('Structured snippets');
const ssDoc = read('marketing/google-ads-structured-snippets.md');
const VALID_HEADERS = ['Amenities', 'Brands', 'Courses', 'Degree programs', 'Destinations',
  'Featured hotels', 'Insurance coverage', 'Models', 'Neighborhoods', 'Service catalog',
  'Shows', 'Styles', 'Types'];
const chosen = VALID_HEADERS.filter(h => new RegExp('`' + h + '`').test(ssDoc));
check('избран е валиден Google header', chosen.length >= 1, chosen.join(', '));
const ssRows = tableRows(ssDoc, /\| # \| Стойност \| Зн\./).filter(r => /^\d+$/.test(r[0]));
check('между 3 и 10 стойности', ssRows.length >= 3 && ssRows.length <= 10, ssRows.length + '');
for (const [, value, n] of ssRows) {
  check('„' + value + '“ ≤ 25 и броят е верен',
    len(value) <= LIMIT.snippetValue && Number(n) === len(value), n + ' срещу ' + len(value));
}

G('Обявата');
const rsa = read('marketing/google-ads-rsa-final.md');
const hRows = tableRows(rsa, /\| # \| Заглавие \| Зн\. \| Роля \|/).filter(r => /^\d+$/.test(r[0]));
check('точно 15 заглавия', hRows.length === 15, hRows.length + '');
for (const [, text, n] of hRows) {
  check('заглавие ≤ 30: „' + text + '“',
    len(text) <= LIMIT.headline && Number(n) === len(text), n + ' срещу ' + len(text));
}
const dRows = tableRows(rsa, /\| # \| Описание \| Зн\. \|/).filter(r => /^\d+$/.test(r[0]));
check('точно 4 описания', dRows.length === 4, dRows.length + '');
for (const [, text, n] of dRows) {
  check('описание ≤ 90 (' + n + ' зн.)',
    len(text) <= LIMIT.description && Number(n) === len(text), n + ' срещу ' + len(text));
}
const heads = hRows.map(r => r[1]);
check('няма две еднакви заглавия', new Set(heads).size === heads.length);
check('има заглавие за марката', heads.some(h => /BDS|Bulgaria Digital/.test(h)));
check('има подкана', heads.some(h => /Получи|Заяви/.test(h)));
check('има заглавие за системата', heads.some(h => /поръчк|Система/i.test(h)));
check('има заглавие за сайта', heads.some(h => /[Сс]айт/.test(h)));
check('цената винаги е до думата „сайт“',
  heads.filter(h => /€/.test(h)).every(h => /сайт/i.test(h)),
  heads.filter(h => /€/.test(h)).join(' · '));
check('няма пиниране', /Пиниране: \*\*не\*\*|не се пинва/.test(rsa));

G('Display path');
for (const p of ['restaurants', 'order-system']) {
  check('„' + p + '“ ≤ 15', len(p) <= LIMIT.path, len(p) + '');
}
check('не е създаден несъществуващ маршрут',
  !exists('restaurants/order-system.html') && !exists('restaurants/order-system'));

/* ============================================================
   4. Цена и проследяване
   ============================================================ */
G('Price asset — решението');
const price = read('marketing/google-ads-price-assets.md');
check('решението е записано изрично', /## Решение: \*\*SKIP\*\*/.test(price));
check('обосновано е с реалния ценови модел', /модул/.test(price) && /фиксирана/i.test(price));
check('цените съвпадат с източника на истината',
  ['250', '450', '600'].every(p => price.includes(p)));

G('Проследяване');
const track = read('marketing/google-ads-url-tracking.md');
check('препоръчан е Final URL suffix', /Final URL suffix/.test(track));
check('tracking template е отхвърлен изрично',
  /Suffix, а не tracking template/.test(track));
for (const p of ['utm_source=google', 'utm_medium=cpc', 'utm_campaign={campaignid}',
  'utm_content={creative}', 'utm_term={keyword}']) {
  check('suffix съдържа ' + p, track.includes(p));
}
check('auto-tagging за gclid', /[Aa]uto-tagging/.test(track));
check('cpc се разпознава от класификатора',
  /PAID_SEARCH\s*=\s*\/\^\([^)]*cpc/.test(appJs));
const logic = read('tools/crm/Logic.gs');
check('числов campaignid се разрешава в CRM',
  /knownIds\.hasOwnProperty\(n\)/.test(logic));

/* ============================================================
   5. Намерението остава B2B
   ============================================================ */
G('Намерение');
const csv = read('marketing/google-ads-restaurants-import.csv');
const paid = csv.split(/\r?\n/).slice(1).filter(Boolean)
  .filter(l => !/Negative/i.test(l))
  .map(l => (l.split(',')[2] || '').toLowerCase());
const CONSUMER = ['пица', 'доставка на храна', 'храна за вкъщи', 'ресторант близо до мен',
  'поръчка на пица', 'поръчки на храна', 'близо до мен'];
const leaked = paid.filter(k => CONSUMER.some(c => k === c));
check('нито една платена дума не е потребителска', leaked.length === 0, leaked.join(', '));
check('политиката за препоръките съществува',
  exists('marketing/google-ads-recommendation-policy.md'));
const policy = read('marketing/google-ads-recommendation-policy.md');
for (const no of ['Broad match', 'Performance Max', 'Display', 'Search Partners']) {
  check('политиката отхвърля ' + no, new RegExp(no, 'i').test(policy));
}
check('optimisation score не е обявен за цел',
  /не е показател|не е KPI/i.test(policy));

G('Чеклист за въвеждане');
const cl = read('marketing/google-ads-manual-entry-checklist.md');
check('наддаването е оставено на собственика', /TO BE SET IN GOOGLE ADS UI/.test(cl));
check('бюджетът е записан', /10 €\/ден/.test(cl));
check('Final URL е производственият', cl.includes(LANDING));
check('display path е документиран', /order-system/.test(cl));

/* ============================================================
   6. Браузър — котвата наистина ли работи
   ============================================================ */
if (!WANT_BROWSER) {
  console.log('\n\x1b[2m  Скролът не е проверяван в браузър: --browser\x1b[0m');
  process.exit(R.summary() ? 0 : 1);
}

G('Браузър — скрол до котвите');

function startServer() {
  const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
    '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp' };
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p === '/restaurants') p = '/restaurants.html';
    if (p === '/restaurants/thank-you') p = '/restaurants/thank-you.html';
    if (p === '/') p = '/index.html';
    const file = path.join(ROOT, p);
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end('404'); }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise(r => server.listen(0, () => r({ server, port: server.address().port })));
}

function findChrome() {
  const c = [process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome'].filter(Boolean);
  return c.find(p => fs.existsSync(p));
}

const { server, port } = await startServer();
const base = 'http://127.0.0.1:' + port;
const chromePath = findChrome();

if (!chromePath) {
  blocked('Скрол в браузър', 'Chrome не е намерен на машината');
  server.close();
  process.exit(R.summary() ? 0 : 1);
}

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'bds-ads-'));
const chrome = spawn(chromePath, ['--headless=new', '--remote-debugging-port=0',
  '--user-data-dir=' + profile, '--no-first-run', '--disable-gpu', 'about:blank'],
  { stdio: ['ignore', 'ignore', 'pipe'] });

const wsUrl = await new Promise((resolve, reject) => {
  let buf = '';
  const t = setTimeout(() => reject(new Error('Chrome не тръгна')), 20000);
  chrome.stderr.on('data', d => {
    buf += d;
    const m = /ws:\/\/[^\s]+/.exec(buf);
    if (m) { clearTimeout(t); resolve(m[0]); }
  });
});

const ws = new WebSocket(wsUrl);
await new Promise(r => { ws.onopen = r; });
let msgId = 0;
const pending = new Map();
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
};
const send = (method, params = {}, sessionId) => new Promise(res => {
  const id = ++msgId;
  pending.set(id, res);
  ws.send(JSON.stringify({ id, method, params, sessionId }));
});

const { result: target } = await send('Target.createTarget', { url: 'about:blank' });
const { result: att } = await send('Target.attachToTarget', { targetId: target.targetId, flatten: true });
const sid = att.sessionId;
await send('Page.enable', {}, sid);
await send('Runtime.enable', {}, sid);

const evalJs = async (expr) => {
  const r = await send('Runtime.evaluate',
    { expression: expr, returnByValue: true, awaitPromise: true }, sid);
  return r.result?.result?.value;
};
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

for (const [width, label] of [[390, 'телефон 390px'], [1280, 'десктоп 1280px']]) {
  await send('Emulation.setDeviceMetricsOverride',
    { width, height: 844, deviceScaleFactor: 1, mobile: width < 768 }, sid);

  for (const [name, id] of Object.entries(ANCHORS)) {
    await send('Page.navigate', { url: base + '/restaurants#' + id }, sid);
    await sleep(1500);
    const r = await evalJs(`(function(){
      var el = document.getElementById(${JSON.stringify(id)});
      if (!el) return { found:false };
      var h = document.querySelector('.nav') || document.querySelector('.header');
      var head = el.querySelector('h2, h3') || el;
      var b = head.getBoundingClientRect();
      return {
        found: true,
        top: Math.round(b.top),
        headerBottom: h ? Math.round(h.getBoundingClientRect().bottom) : 0,
        visible: b.top >= 0 && b.top < window.innerHeight
      };
    })()`);
    check(label + ' · #' + id + ' — заглавието се вижда',
      r && r.found && r.visible, r ? 'top=' + r.top : 'няма елемент');
    check(label + ' · #' + id + ' — не е скрито под header-а',
      r && r.found && r.top >= r.headerBottom - 2,
      r ? 'top=' + r.top + ' header=' + r.headerBottom : '');
  }
}

const errs = await evalJs('window.__err || 0');
check('без JS грешки при отваряне с котва', !errs);

ws.close();
chrome.kill();
server.close();
try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}

process.exit(R.summary() ? 0 : 1);
