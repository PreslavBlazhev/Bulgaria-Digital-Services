/* ============================================================
   BDS — тест на Meta Pixel и retargeting логиката (Phase 21)
   ------------------------------------------------------------
   Стартиране:  node tools/test-meta-retargeting.mjs

   Тестът зарежда истинските `bds-tracking.js` и `app.js` в
   изкуствен браузър — свой `window`, свой `document`, подставено
   `fbq` — и гледа какво НАИСТИНА тръгва към Meta при всяка
   комбинация от съгласие и събития.

   Смисълът: рекламният таг е точно онзи код, който не бива да се
   проверява „на око“. Ако тръгне преди съгласие, това е нарушение,
   което не се вижда никъде в интерфейса.
   ============================================================ */

import vm from 'node:vm';
import { reporter, read, exists } from './lib/ops-test-kit.mjs';

const R = reporter('BDS — Meta Pixel и retargeting (Phase 21)');
const { G, check, blocked } = R;

/* ------------------------------------------------------------
   Малък изкуствен браузър — колкото трябва, за да тръгне кодът.
   ------------------------------------------------------------ */
function makeWindow({ pixelId = '', gtmId = '', page = 'restaurants', path = '/restaurants' } = {}) {
  const calls = { fbq: [], gtag: [], scripts: [] };
  const listeners = {};

  const el = () => ({
    setAttribute() {}, getAttribute: () => null, addEventListener() {},
    appendChild() {}, querySelector: () => null, querySelectorAll: () => [],
    classList: { add() {}, remove() {}, contains: () => false },
    style: {}, focus() {}, closest: () => null, elements: {}, hidden: false
  });

  const body = {
    getAttribute: (n) => (n === 'data-page' ? page : null),
    appendChild() {}, classList: { add() {}, remove() {}, contains: () => false }
  };

  const doc = {
    body,
    referrer: '',
    documentElement: el(),
    head: { appendChild: (s) => calls.scripts.push(s.src) },
    cookie: '',
    createElement: () => ({ ...el(), set src(v) { this._src = v; }, get src() { return this._src; } }),
    getElementById: (id) => (id === 'restaurantForm' ? formEl : null),
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: (t, fn) => { (listeners[t] = listeners[t] || []).push(fn); },
    getElementsByTagName: () => [{ parentNode: { insertBefore() {} } }]
  };

  const formListeners = {};
  const formEl = {
    ...el(),
    addEventListener: (t, fn) => { (formListeners[t] = formListeners[t] || []).push(fn); },
    elements: {}
  };

  const store = {};
  const storage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear: () => { for (const k of Object.keys(store)) delete store[k]; }
  };

  const win = {
    document: doc,
    location: { pathname: path, href: 'https://x' + path, search: '', hostname: 'x' },
    navigator: { userAgent: 'node', language: 'bg' },
    localStorage: storage,
    sessionStorage: {
      getItem: () => null, setItem() {}, removeItem() {}
    },
    addEventListener() {},
    matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
    IntersectionObserver: class { observe() {} unobserve() {} disconnect() {} },
    requestAnimationFrame: (fn) => fn(),
    setTimeout: (fn) => { try { fn(); } catch {} return 0; },
    clearTimeout() {},
    fetch: () => Promise.resolve({ json: () => Promise.resolve({}) }),
    console: { info() {}, warn() {}, error() {}, log() {} },
    Date, JSON, Math, String, Number, Boolean, Object, Array, RegExp, Error,
    isNaN, isFinite, parseFloat, parseInt, encodeURIComponent, decodeURIComponent
  };
  win.window = win;
  win.self = win;
  win.top = win;

  vm.createContext(win);
  vm.runInContext(read('assets/js/bds-tracking.js'), win, { filename: 'bds-tracking.js' });

  const T = win.BDSTracking;
  T.config.metaPixelId = pixelId;
  T.config.gtmId = gtmId;

  /* Подставяме fbq ПРЕДИ съгласието: така се вижда и дали кодът е
     тръгнал да го зарежда, и какво му е подал. */
  win.fbq = (...args) => { calls.fbq.push(args); };
  win.gtag = (...args) => { calls.gtag.push(args); };

  return { win, T, calls, doc, formEl, formListeners, listeners };
}

/** Зарежда аналитичния слой на app.js — само нужното парче. */
function loadAnalytics(env) {
  const src = read('assets/js/app.js');
  const start = src.indexOf('/* ---------- Analytics ----------');
  const end = src.indexOf('/* ---------- Project filters ---------- */');
  const slice = src.slice(start, end);
  vm.runInContext('(function(){' + slice + '})();', env.win, { filename: 'app.js#analytics' });
  return env.win.BDSAnalytics;
}

const metaEvents = (calls) => calls.fbq
  .filter(a => a[0] === 'track' || a[0] === 'trackCustom')
  .map(a => a[1]);

/* ============================================================
   1. Конфигурация
   ============================================================ */
G('Конфигурация');

const tracking = read('assets/js/bds-tracking.js');

/* Датасетът „BDS Website“ в Meta. Pixel ID не е тайна — вижда се в кода
   на всеки сайт с пиксел. Тайна е access token-ът, а той не е тук. */
const META_PIXEL_ID = '1666581461701404';

const cfgPixel = /metaPixelId:\s*'([^']*)'/.exec(tracking);
check('Pixel ID идва от една централна стойност', !!cfgPixel);
check('Pixel ID е реалният, не измислен',
  cfgPixel && cfgPixel[1] === META_PIXEL_ID, cfgPixel ? cfgPixel[1] : '');
check('Pixel ID е само в конфигурацията, не разпръснат из кода',
  (read('assets/js/app.js').includes(META_PIXEL_ID)) === false &&
  (read('restaurants.html').includes(META_PIXEL_ID)) === false);
check('base code не е копиран в HTML',
  !/connect\.facebook\.net/.test(read('restaurants.html')) &&
  !/connect\.facebook\.net/.test(read('index.html')));
check('fbq init взима ID от конфигурацията, не от литерал',
  /fbq\('init', CONFIG\.metaPixelId\)/.test(tracking));
check('Pixel ID не е записан в HTML',
  !/connect\.facebook\.net/.test(read('restaurants.html')));
check('няма втори, паралелен tracker',
  (read('assets/js/app.js').match(/connect\.facebook\.net/g) || []).length === 0);

/* ============================================================
   2. Празен Pixel ID
   ============================================================ */
G('Без Pixel ID');

{
  const env = makeWindow({ pixelId: '' });
  let threw = '';
  try {
    env.T.grantConsent({ analytics: true, ads: true });
    const a = loadAnalytics(env);
    a.track('restaurant_page_view', {});
    a.track('restaurant_form_start', {});
    a.track('generate_lead', { lead_event_id: 'x' });
  } catch (e) { threw = String(e); }
  check('нищо не гърми при празен Pixel ID', threw === '', threw);
  check('Meta не се смята за зареден', env.T.isMetaLoaded() === false);
  check('нито едно събитие не тръгва към Meta', metaEvents(env.calls).length === 0,
    metaEvents(env.calls).join(', '));
  check('не се тегли скрипт от Facebook',
    !env.calls.scripts.some(s => /facebook/.test(String(s))));
}

/* ============================================================
   3. Съгласие
   ============================================================ */
G('Съгласие — Meta тръгва само при разрешена реклама');

{
  const env = makeWindow({ pixelId: '111' });
  const a = loadAnalytics(env);
  a.track('restaurant_page_view', {});
  check('преди съгласие няма нито едно събитие', metaEvents(env.calls).length === 0);
  check('преди съгласие ad_storage е denied',
    env.T.consentState().ad_storage === 'denied');
  check('adsAllowed() е false преди съгласие', env.T.adsAllowed() === false);
}

{
  /* Google ID също е попълнен — иначе „анализът не се зарежда“ би
     било вярно по грешна причина: няма какво да се зареди. */
  const env = makeWindow({ pixelId: '111' });
  env.T.config.ga4Id = 'G-TEST';
  env.T.grantConsent({ analytics: true, ads: false });
  const a = loadAnalytics(env);
  a.track('restaurant_page_view', {});
  check('съгласие САМО за анализ не зарежда Meta', env.T.isMetaLoaded() === false);
  check('съгласие само за анализ не праща събития към Meta',
    metaEvents(env.calls).length === 0, metaEvents(env.calls).join(', '));
  check('но Google слоят е позволен', env.T.isLoaded() === true);
}

{
  const env = makeWindow({ pixelId: '111' });
  env.T.grantConsent({ analytics: false, ads: true });
  check('съгласие за реклама зарежда Meta', env.T.isMetaLoaded() === true);
  check('PageView тръгва веднъж, след съгласието',
    metaEvents(env.calls).filter(e => e === 'PageView').length === 1,
    metaEvents(env.calls).join(', '));
}

{
  /* Точният сценарий, който беше счупен: първо анализ, после реклама. */
  const env = makeWindow({ pixelId: '111' });
  env.T.grantConsent({ analytics: true, ads: false });
  check('след „само анализ“ Meta мълчи', env.T.isMetaLoaded() === false);
  env.T.grantConsent({ analytics: true, ads: true });
  check('по-късно дадено рекламно съгласие ЗАРЕЖДА Meta',
    env.T.isMetaLoaded() === true);
  check('PageView не се дублира при смяна на избора',
    metaEvents(env.calls).filter(e => e === 'PageView').length === 1,
    metaEvents(env.calls).join(', '));
}

{
  const env = makeWindow({ pixelId: '111' });
  env.T.grantConsent({ analytics: true, ads: true });
  const before = metaEvents(env.calls).length;
  env.T.grantConsent({ analytics: true, ads: true });
  check('повторно същото съгласие не инициализира втори път',
    metaEvents(env.calls).length === before);
}

{
  /* Оттегляне: рекламата се изключва и събитията спират. */
  const env = makeWindow({ pixelId: '111' });
  env.T.grantConsent({ analytics: true, ads: true });
  const a = loadAnalytics(env);
  env.T.grantConsent({ analytics: true, ads: false });
  const before = metaEvents(env.calls).length;
  a.track('restaurant_page_view', {});
  a.track('generate_lead', { lead_event_id: 'x' });
  check('след оттегляне на съгласието не тръгва нищо ново',
    metaEvents(env.calls).length === before);
  check('ad_storage се връща на denied',
    env.T.consentState().ad_storage === 'denied');
}

/* ============================================================
   4. Събитията
   ============================================================ */
G('Модел на събитията');

function readyEnv(opts) {
  const env = makeWindow(Object.assign({ pixelId: '111' }, opts));
  env.T.grantConsent({ analytics: true, ads: true });
  env.analytics = loadAnalytics(env);
  env.calls.fbq.length = 0;          /* PageView вече е отчетен по-горе */
  return env;
}

{
  const env = readyEnv();
  env.analytics.track('restaurant_page_view', { referrer: 'direct' });
  check('restaurant_page_view → RestaurantLandingView',
    metaEvents(env.calls).join(',') === 'RestaurantLandingView',
    metaEvents(env.calls).join(', '));
  check('праща се като trackCustom, не като стандартно събитие',
    env.calls.fbq[0][0] === 'trackCustom');
}

{
  const env = readyEnv({ page: 'home', path: '/' });
  env.analytics.track('page_view', {});
  check('RestaurantLandingView НЕ тръгва извън /restaurants',
    !metaEvents(env.calls).includes('RestaurantLandingView'),
    metaEvents(env.calls).join(', '));
}

{
  const env = readyEnv();
  env.analytics.track('restaurant_form_start', {});
  check('restaurant_form_start → RestaurantFormStart',
    metaEvents(env.calls).join(',') === 'RestaurantFormStart');
  check('без параметри — нищо лично не пътува',
    JSON.stringify(env.calls.fbq[0][2]) === '{}', JSON.stringify(env.calls.fbq[0][2]));
}

{
  const env = readyEnv();
  env.analytics.track('generate_lead', {
    lead_event_id: 'lead-abc', lead_id: 'BDS-2026-AAAAAA',
    source_category: 'google_ads', service_interest: 'Само сайт'
  });
  const call = env.calls.fbq.find(c => c[1] === 'Lead');
  check('generate_lead → Lead', !!call);
  check('Lead е стандартно събитие (track)', call && call[0] === 'track');
  check('Lead няма параметри', call && JSON.stringify(call[2]) === '{}',
    call && JSON.stringify(call[2]));
  check('Lead носи eventID за дедупликация с CAPI',
    call && call[3] && call[3].eventID === 'lead-abc',
    call && JSON.stringify(call[3]));
}

{
  const env = readyEnv();
  ['restaurant_form_submit', 'restaurant_cta_click', 'phone_click',
    'email_click', 'case_study_click', 'restaurant_thank_you_view'].forEach(e => {
      env.analytics.track(e, {});
    });
  check('никое друго събитие не тръгва към Meta',
    metaEvents(env.calls).length === 0, metaEvents(env.calls).join(', '));
  check('thank-you страницата НЕ праща втори Lead',
    !metaEvents(env.calls).includes('Lead'));
}

/* ============================================================
   5. Лични данни
   ============================================================ */
G('Лични данни не стигат до Meta');

{
  const env = readyEnv();
  env.analytics.track('generate_lead', {
    lead_event_id: 'lead-abc',
    full_name: 'Иван Иванов', phone: '0888123456',
    email: 'ivan@example.com', business_name: 'Механа Х'
  });
  const flat = JSON.stringify(env.calls.fbq);
  check('няма име в заявката към Meta', !/Иван/.test(flat));
  check('няма телефон', !/0888123456/.test(flat));
  check('няма имейл', !/ivan@example\.com/.test(flat));
  check('няма име на бизнес', !/Механа/.test(flat));
  check('минава само eventID', /lead-abc/.test(flat));
}

{
  const env = makeWindow({ pixelId: '111' });
  env.T.grantConsent({ analytics: true, ads: true });
  env.calls.fbq.length = 0;
  env.T.meta('trackCustom', 'Test', { email: 'a@b.bg', phone: '+359888111222', ok: 'да' });
  const flat = JSON.stringify(env.calls.fbq);
  check('BDSTracking.meta() чисти параметрите си',
    !/a@b\.bg/.test(flat) && !/359888111222/.test(flat) && /"ok":"да"/.test(flat), flat);
}

/* ============================================================
   6. Дублирано изпращане
   ============================================================ */
G('Дублиране');

{
  const env = readyEnv();
  env.analytics.track('generate_lead', { lead_event_id: 'lead-1' });
  env.analytics.track('generate_lead', { lead_event_id: 'lead-1' });
  const leads = metaEvents(env.calls).filter(e => e === 'Lead');
  check('един и същи eventID остава един и същи',
    env.calls.fbq.filter(c => c[1] === 'Lead').every(c => c[3].eventID === 'lead-1'));
  check('дедупликацията е задача на eventID, не на броя извиквания',
    leads.length === 2, 'Meta схлупва по eventID: ' + leads.length + ' извиквания, 1 събитие');
}

const appJs = read('assets/js/app.js');
G('Кога се пали Lead');
/* Числото е разстояние в знаци — груба проверка, че двете стоят в
   един и същи блок. Реалният ред на събитията се проверява в
   браузъра, от test-restaurant-funnel.mjs. */
check('Lead тръгва само след потвърден успех',
  /res\.success === 'true'[\s\S]{0,1500}?generate_lead/.test(appJs));
check('формата пази от двойно изпращане', /if \(busy\) return;/.test(appJs));
check('при мрежова грешка няма конверсия',
  /\.catch\(function \(\) \{[\s\S]{0,400}?showNote\(/.test(appJs) &&
  !/catch[\s\S]{0,200}generate_lead/.test(appJs));
check('при отказ от сървъра се хвърля грешка, не се брои конверсия',
  /throw new Error\('rejected'\)/.test(appJs));

G('Кога се пали RestaurantFormStart');
check('иска истинско докосване от човек', /e\.isTrusted === false/.test(appJs));
check('пази се да не се повтори', /if \(started\) return;/.test(appJs));
check('хваща и автоматично попълване', /addEventListener\('input', markStarted\)/.test(appJs));
check('обяснено е защо programmatic focus не се брои',
  /\.focus\(\) върху първото сгрешено/.test(appJs));

/* ============================================================
   7. Документите
   ============================================================ */
G('Аудитории — документ');

const AUD = 'marketing/meta-retargeting-audiences.md';
check('файлът съществува', exists(AUD));
if (exists(AUD)) {
  const doc = read(AUD);
  for (const name of ['BDS | All Website Visitors | 30d',
    'BDS | Restaurant Landing Visitors | 30d',
    'BDS | Restaurant Form Starters — No Lead | 14d',
    'BDS | Leads | 180d']) {
    check('аудитория: ' + name, doc.includes(name));
  }
  for (const ev of ['PageView', 'RestaurantLandingView', 'RestaurantFormStart', 'Lead']) {
    check('описано е събитие ' + ev, doc.includes(ev));
  }
  check('всяка аудитория изключва заявилите',
    (doc.match(/EXCLUDE/g) || []).length >= 3);
  check('прозорците са записани', /30 дни/.test(doc) && /14 дни/.test(doc) && /180 дни/.test(doc));
  /* Не изискваме точния етикет на Meta — той се мени. Изискваме пътят
     да е описан и да е ясно откъде идва Dataset-ът. */
  check('има точни стъпки за Meta UI',
    /Ads Manager/.test(doc) && /Custom Audience/.test(doc) && /Website/.test(doc));
  check('казано е откъде се взима Pixel/Dataset ID',
    /Events Manager/.test(doc) && /Dataset ID/.test(doc));
  check('казано е къде се слага Pixel ID в проекта',
    /CONFIG\.metaPixelId/.test(doc));
  check('изключването се задава на ниво ad set',
    /ниво ad set/.test(doc));
  check('не се твърди, че аудиториите са създадени',
    /PREPARED — EXTERNAL CREATION BLOCKED/.test(doc));
  check('записано е, че няма акаунт', /няма.{0,40}(Meta|акаунт)/i.test(doc));
}

G('Творчески материали — документ');
const CRE = 'marketing/meta-retargeting-creatives.md';
check('файлът съществува', exists(CRE));
if (exists(CRE)) {
  const doc = read(CRE);
  const concepts = (doc.match(/^### Creative \d/gm) || []).length;
  check('поне шест концепции', concepts >= 6, concepts + ' концепции');
  for (const need of ['Аудитория', 'Основен текст', 'Заглавие', 'CTA',
    'Визуална посока', 'Нужни материали', 'Доказателство', 'Забранено']) {
    check('всяка концепция описва: ' + need, doc.includes(need));
  }
  check('трите нива са налице',
    /A\. ПОСЕТИТЕЛИ/.test(doc) && /B\. РЕСТОРАНТСКА СТРАНИЦА/.test(doc) && /C\. ЗАПОЧНАЛИ ФОРМАТА/.test(doc));
  check('форматите са специфицирани',
    /1080×1080/.test(doc) && /1080×1350/.test(doc) && /1080×1920/.test(doc));
  check('няма измислени числа за резултат',
    !/\d+%\s*(повече|ръст|увеличение|conversion|lift)/i.test(doc));
  check('няма измислен отзив от клиент', !/„[^"]{0,200}каза[^"]{0,80}"/.test(doc));
  check('изрично е забранено измислянето на резултати',
    /не се твърди|забранено/i.test(doc));
}

/* ============================================================
   8. Правно
   ============================================================ */
G('Политика за поверителност');

const privacy = read('privacy.html');
check('описва рекламни бисквитки', /Реклама/.test(privacy));
check('споменава Meta Pixel поименно', /Meta Pixel/.test(privacy));
check('обяснява ремаркетинга разбираемо',
  /реклами на хора, които вече са били на сайта/.test(privacy));
check('не твърди, че рекламни бисквитки не се ползват',
  !/не използваме реклам/i.test(privacy));
check('казва, че съгласието може да се смени',
  /Настройки за бисквитките|може да се смени|оттегл/i.test(privacy));
/* Страницата и кодът трябва да казват едно и също. Щом пикселът е
   конфигуриран, политиката не бива да твърди, че нищо не е включено. */
const pixelConfigured = !!(cfgPixel && cfgPixel[1]);
check('политиката не твърди „нищо не е включено“, щом пиксел има',
  pixelConfigured ? !/Към момента — никоя/.test(privacy) : true);
check('Meta е описана като конфигурирана',
  !pixelConfigured || /единствената конфигурирана/.test(privacy));
check('описано е кога се зарежда — след съгласие',
  !pixelConfigured || /само след като изберете/.test(privacy));
check('изброени са бисквитките поименно',
  !pixelConfigured || (/_fbp/.test(privacy) && /_fbc/.test(privacy)));
check('казано е какво НЕ се изпраща',
  !pixelConfigured || /Не<\/b> се изпращат име, телефон, имейл/.test(privacy));
check('GA4 и Google Ads са отбелязани като още неконфигурирани',
  /още не са конфигурирани/.test(privacy));
check('оттеглянето на съгласие е описано',
  /оттегля по всяко време/.test(privacy));

/* ============================================================
   9. Външният блокер
   ============================================================ */
G('Външно състояние');

check('Pixel ID е попълнен и кодът е готов да го ползва', pixelConfigured);
/* Аудиториите се създават в Meta UI. Repository-то няма Meta API
   креденшъли, значи оттук те не могат нито да се създадат, нито да се
   проверят. Стъпките са в marketing/meta-retargeting-live-setup.md. */
blocked('Custom Audiences в Meta',
  'MANUAL — създават се в Meta Ads Manager (няма API креденшъли в проекта)');
blocked('Проверка с Test Events',
  'MANUAL — иска реален браузър със съгласие и Meta Events Manager');

console.log('');
process.exit(R.summary() ? 0 : 1);
