/* ============================================================
   BDS — тест на CRM интеграцията (Phase 16)
   ------------------------------------------------------------
   Стартиране:

     node tools/test-crm-integration.mjs          статични проверки
     node tools/test-crm-integration.mjs --live   + истинска заявка

   БЕЗ --live скриптът не пипа интернет. Проверява само кода.

   С --live праща ЕДНА тестова заявка към истинския Web App и
   проверява, че се е появил ред, че вторият опит със същия Lead ID
   не създава втори ред, и че началните стойности са правилните.
   Тестовият Lead ID започва с BDS-QA- — виждаш го веднага в
   таблицата и го триеш след теста.

   Адресът се взима от CRM_ENDPOINT в assets/js/app.js — едно място,
   без второ копие някъде другаде.
   ============================================================ */

import vm from 'node:vm';
import { loadLogic, reporter, read, exists } from './lib/ops-test-kit.mjs';

const L = loadLogic();
const R = reporter('BDS — CRM интеграция (Phase 16)');
const { G, check, blocked } = R;

const LIVE = process.argv.includes('--live');
const KEEP = process.argv.includes('--keep');

/* ============================================================
   0. Файловете изобщо се четат ли
   ------------------------------------------------------------
   Синтактична грешка в .gs файл се вижда чак когато човек го
   постави в Apps Script и натисне Run. Тук се хваща по-рано.
   ============================================================ */
G('Apps Script проектът се зарежда');

const GS_FILES = [
  'tools/crm/Logic.gs',
  'tools/crm/Code.gs',
  'tools/crm/Marketing.gs',
  'tools/crm/Sales.gs',
  'tools/crm/Setup.gs',
  'tools/crm/QaTest.gs',
  'tools/ads/MetaImport.gs'
];
{
  /* Азбучен ред — точно както Apps Script изпълнява файловете. */
  const ordered = [...GS_FILES].sort((a, b) =>
    a.split('/').pop().localeCompare(b.split('/').pop()));
  const ctx = {
    console, Date, JSON, Math, RegExp, String, Number,
    isNaN, isFinite, parseFloat, parseInt, Utilities: {}, Logger: { log() {} }
  };
  vm.createContext(ctx);
  for (const file of ordered) {
    let err = '';
    try { vm.runInContext(read(file), ctx, { filename: file }); } catch (e) { err = String(e); }
    check(file + ' се изпълнява без грешка', err === '', err);
  }
  check('всички функции от менюто съществуват',
    ['setupBdsOperations', 'rebuildMarketingFromCrm', 'recheckAllLeadHealth',
      'assignProposalIdToSelection', 'runBdsSelfTest', 'cleanupSelfTestRows',
      'doPost', 'doGet', 'onEdit', 'installDailyRebuild']
      .every(fn => typeof ctx[fn] === 'function'),
    Object.keys(ctx).filter(k => typeof ctx[k] === 'function').length + ' функции');
  check('нищо на ниво файл не пипа Logic.gs преди зареждането му',
    typeof ctx.BDS_LEAD_COLUMNS !== 'undefined' && ctx.BDS_LEAD_COLUMNS.length > 0);
}

/* ============================================================
   1. Схемата на CRM-а
   ============================================================ */
G('Схема на лист Leads');

const REQUIRED_LEAD_COLUMNS = [
  'Lead ID', 'Created Date', 'Lead Owner', 'Contact Name', 'Business Name',
  'Phone', 'Email', 'Service Interest', 'Budget', 'Has Website', 'Website URL',
  'Source Category', 'Source', 'Medium', 'Campaign', 'Content', 'Term', 'GCLID',
  'Landing Page', 'Referrer',
  'First Source Category', 'First Source', 'First Medium', 'First Campaign',
  'First Landing Page', 'First Touch At',
  'Current Setup', 'Main Problem', 'Desired Outcome', 'Timeline', 'Decision Maker',
  'Status', 'Next Action', 'Follow-up Date', 'Last Contact Date', 'Notes',
  'Client', 'Deal Value', 'Close Date', 'Won/Lost', 'Lost Reason',
  'Proposal ID', 'Proposal Date', 'Proposal Value', 'Proposal Validity'
];
const missing = REQUIRED_LEAD_COLUMNS.filter(c => !L.BDS_LEAD_COLUMNS.includes(c));
check('всички изискани колони съществуват', missing.length === 0, missing.join(', '));
check('Lead ID е първата колона', L.BDS_LEAD_COLUMNS[0] === 'Lead ID');
check('има колона Health за неприключени неща', L.BDS_LEAD_COLUMNS.includes('Health'));
check('няма дублирани имена на колони',
  new Set(L.BDS_LEAD_COLUMNS).size === L.BDS_LEAD_COLUMNS.length);

G('Статуси');
const REQUIRED_STATUSES = ['New', 'Contacted', 'Qualified', 'Discovery Complete',
  'Proposal Needed', 'Proposal Sent', 'Negotiation', 'Won', 'Lost'];
check('точно деветте статуса, в реда на процеса',
  L.BDS_STATUSES.join('|') === REQUIRED_STATUSES.join('|'), L.BDS_STATUSES.join(' → '));
check('статусът е падащо меню, не свободен текст',
  /requireValueInList\(BDS_STATUSES, true\)[\s\S]{0,120}setAllowInvalid\(false\)/.test(read('tools/crm/Setup.gs')));

/* ============================================================
   2. Web App-ът
   ============================================================ */
G('Apps Script Web App');

const code = read('tools/crm/Code.gs');
check('doPost приема заявки', /function doPost\(/.test(code));
check('doGet е здравна проверка', /function doGet\(/.test(code));
check('липсващ Lead ID се отхвърля', /missing lead_id/.test(code));
check('дублиран Lead ID връща duplicate: true',
  /findRowByLeadId_/.test(code) && /duplicate: true/.test(code));
check('дублиран Lead ID НЕ добавя втори ред',
  /if \(existing\) \{\s*\n\s*return json_/.test(code));
check('honeypot полето се разпознава като бот', /_honey/.test(code));
check('две едновременни заявки не пишат на един ред', /LockService/.test(code));
check('началните стойности са на едно място', /var LEAD_DEFAULTS = \{/.test(code));
check('Lead Owner = Преслав Блажев', /'Lead Owner': 'Преслав Блажев'/.test(code));
check('Status = New', /'Status': 'New'/.test(code));
check('Next Action = Първо обаждане', /'Next Action': 'Първо обаждане'/.test(code));
check('Client = Не', /'Client': 'Не'/.test(code));
check('НЕ се измисля Follow-up Date при създаване',
  !/'Follow-up Date':/.test(code));
check('схемата не е преписана втори път — чете се от Logic.gs',
  /BDS_LEAD_COLUMNS/.test(code) && !/^var COLUMNS = \[/m.test(code));
check('нова заявка веднага влиза в маркетинговите числа',
  /rebuildMarketingFromCrm\(\)/.test(code));
check('има дневен тригер за преизчисляване',
  /function installDailyRebuild\(/.test(code) && /timeBased\(\)/.test(code));

/* ------------------------------------------------------------
   Служебните команди пишат в таблицата. Адресът на Web App-а не е
   тайна, затова той не може да е единственото, което ги пази.
   ------------------------------------------------------------ */
G('Служебни команди');

check('заявка от сайта и служебна команда вървят по различни пътища',
  /if \(body\.action\) return bdsOpsRouter_\(body\);/.test(code) &&
  /function bdsIntakeLead_\(/.test(code));
check('без ключ командите са изключени',
  /ops disabled/.test(code));
check('грешен ключ се отхвърля',
  /!== expected[\s\S]{0,120}forbidden/.test(code));
check('ключът живее в Script Properties, не в кода',
  /getProperty\('BDS_OPS_TOKEN'\)/.test(code) &&
  ![...code.matchAll(/'([A-Za-z0-9]{24,})'/g)].length);
check('ключът се създава от самия скрипт', /Utilities\.getUuid\(\)/.test(code));

const opsState = code.slice(code.indexOf('function bdsOpsState_'), code.indexOf('/** Проверка, че адресът работи'));
check('състоянието не връща имена, телефони и имейли',
  !/'Contact Name'|'Phone'|'Email'/.test(opsState));
check('състоянието връща това, което е нужно за проверка',
  ["'Status'", "'Deal Value'", "'Close Date'", "'Client'", "'Proposal ID'"]
    .every(k => opsState.includes(k)));
check('състоянието брои фантомните редове', /phantom_rows/.test(opsState));

G('Тайни');
check('в Code.gs няма записан Spreadsheet ID',
  !/[01][a-zA-Z0-9_-]{25,}/.test(code));
/* Думата „token“ я има — служебният ключ се ЧЕТЕ тук. Търсим самата
   стойност: дълъг непрозрачен литерал. */
/* Дълъг низ без нито една цифра и само с малки букви е име на поле
   (`first_source_category`), не ключ. Ключът тук е шестнайсетичен —
   винаги има цифри. */
const codeLiterals = [...code.replace(/\/\*[\s\S]*?\*\//g, '')
  .matchAll(/'([A-Za-z0-9_\-]{20,})'/g)]
  .map(m => m[1])
  .filter(s => /\d/.test(s) || /[a-z]/.test(s) === /[A-Z]/.test(s));
check('в Code.gs няма записана стойност на ключ',
  codeLiterals.length === 0, codeLiterals.join(', '));
check('ключът само се чете от хранилището, не се пише в кода',
  /PropertiesService\.getScriptProperties\(\)/.test(code));
/* doGet е публичен адрес. Той може да каже КОЛКО заявки има, но не и
   какви са — иначе всеки с адреса чете клиентските данни. */
const doGetBody = code.slice(code.indexOf('function doGet'), code.indexOf('function bdsHeaderMatches_'));
check('doGet не чете съдържание на редове', !/getValues\(\)/.test(doGetBody));
check('doGet връща само броячи и схема',
  /leads:/.test(doGetBody) && !/Contact Name|Phone|Email'/.test(doGetBody));

/* ============================================================
   3. Сайтът
   ============================================================ */
G('Сайт → CRM');

const appJs = read('assets/js/app.js');
const endpointMatch = /var CRM_ENDPOINT = '([^']*)'/.exec(appJs);
check('CRM_ENDPOINT съществува на едно място', !!endpointMatch);
check('адресът не е копиран в друг файл',
  ['assets/js/bds-tracking.js', 'assets/js/bds-data.js', 'assets/js/bds-consent.js']
    .every(f => !/script\.google\.com/.test(read(f))));

check('CRM се вика чак след потвърден успех',
  /res\.success === 'true'[\s\S]{0,700}?sendToCrm\(/.test(appJs));
const crmFn = appJs.slice(appJs.indexOf('function sendToCrm'), appJs.indexOf('function attributionLine'));
check('грешка в CRM не проваля заявката',
  /\['catch'\]\(/.test(crmFn) && /catch \(e\)/.test(crmFn));
check('заявката оцелява навигацията към thank-you', /keepalive: true/.test(crmFn));
check('text\/plain — без CORS preflight, който Apps Script не обслужва',
  /text\/plain/.test(crmFn));
check('изпраща същия Lead ID', /lead_id: leadId/.test(crmFn));
check('изпраща източника и кампанията',
  /source_category:/.test(crmFn) && /campaign:/.test(crmFn) && /gclid:/.test(crmFn));
check('изпраща първото докосване', /first_source_category:/.test(crmFn));
check('FormSubmit остава като резерва',
  /formsubmit\.co/.test(appJs) && appJs.indexOf('LEAD_ENDPOINT') < appJs.indexOf('CRM_ENDPOINT'));

/* Всяко поле, което CRM-ът очаква от сайта, наистина се праща. */
const fromSite = [...code.matchAll(/'([^']+)': '([a-z_]+)'/g)]
  .filter(m => L.BDS_LEAD_COLUMNS.includes(m[1]))
  .map(m => m[2]);
const notSent = fromSite.filter(k => !new RegExp('\\b' + k + ':').test(crmFn));
check('всяко поле от картата на CRM се праща от сайта',
  notSent.length === 0, notSent.join(', '));

/* ============================================================
   4. Живият тест
   ============================================================ */
G('Жива връзка');

const endpoint = endpointMatch ? endpointMatch[1] : '';

if (!endpoint) {
  blocked('CRM endpoint е конфигуриран',
    'BLOCKED — липсва Web App URL. Виж tools/crm/SETUP.md, стъпки 1–5.');
  console.log('\n\x1b[2m  Статичните проверки минаха. Живият тест чака адреса на\n' +
    '  Apps Script Web App-а в assets/js/app.js → CRM_ENDPOINT.\x1b[0m');
} else {
  check('адресът е Apps Script /exec, не /dev',
    /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(endpoint), endpoint);

  if (!LIVE) {
    console.log('\n\x1b[2m  Адресът е налице. За истинска заявка:\n' +
      '  node tools/test-crm-integration.mjs --live\x1b[0m');
  } else {
    await liveTests(endpoint);
  }
}

async function liveTests(url) {
  const leadId = 'BDS-QA-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' +
    Math.random().toString(36).slice(2, 6).toUpperCase();

  /* --- здраве --- */
  let health = null;
  try {
    const res = await fetch(url, { redirect: 'follow' });
    health = await res.json();
  } catch (e) {
    check('здравната проверка отговаря', false, String(e));
    return;
  }
  check('здравната проверка отговаря', !!health && health.ok === true, JSON.stringify(health));
  if (health) {
    check('свързаната таблица е BDS Operations',
      /BDS Operations/i.test(String(health.spreadsheet || '')), health.spreadsheet);
    check('листът Leads съществува', (health.sheets || []).includes('Leads'));
    check('листът Marketing Daily съществува', (health.sheets || []).includes('Marketing Daily'));
    check('листът Raw Ads съществува', (health.sheets || []).includes('Raw Ads'));
    check('заглавният ред отговаря на схемата', health.columns_ok === true);
    check('статусите в таблицата са същите деветте',
      (health.statuses || []).join('|') === L.BDS_STATUSES.join('|'));
  }
  const leadsBefore = health ? Number(health.leads || 0) : 0;

  /* --- запис --- */
  const payload = {
    lead_id: leadId,
    full_name: 'QA — тестова заявка',
    business_name: 'ТЕСТ — изтрий този ред',
    phone: '0000000000',
    email: 'qa@example.invalid',
    service_interest: 'Тест',
    budget_range: 'няма',
    has_website: 'не',
    website_url: '',
    source_category: 'google_ads',
    source: 'google',
    medium: 'cpc',
    campaign: 'restaurant_search_bg',
    content: 'qa',
    term: 'qa',
    gclid: 'QA-TEST-GCLID',
    landing_page: '/restaurants',
    referrer: 'qa-test',
    first_source_category: 'google_ads',
    first_source: 'google',
    first_medium: 'cpc',
    first_campaign: 'restaurant_search_bg',
    first_landing_page: '/restaurants',
    first_touch_at: new Date().toISOString()
  };

  const post = async (body) => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body),
      redirect: 'follow'
    });
    return res.json();
  };

  let first = null;
  try { first = await post(payload); } catch (e) {
    check('заявката се записва', false, String(e));
    return;
  }
  check('заявката се записва', first && first.ok === true, JSON.stringify(first));
  check('върнатият Lead ID е същият', first && first.lead_id === leadId, first && first.lead_id);
  check('получи номер на ред', first && first.row > 1, first && String(first.row));

  /* --- дублиране --- */
  const second = await post(payload);
  check('втори опит със същия Lead ID връща duplicate',
    second && second.ok === true && second.duplicate === true, JSON.stringify(second));
  check('дубликатът сочи същия ред', second && second.row === first.row);

  /* --- бот --- */
  const bot = await post(Object.assign({}, payload, {
    lead_id: leadId + '-BOT', _honey: 'спам'
  }));
  check('попълнен honeypot не се записва',
    bot && bot.ok === true && bot.skipped === 'honeypot', JSON.stringify(bot));

  /* --- брой --- */
  const after = await (await fetch(url, { redirect: 'follow' })).json();
  check('точно една нова заявка в таблицата',
    Number(after.leads) === leadsBefore + 1,
    leadsBefore + ' → ' + after.leads);
  check('маркетингът се е преизчислил сам', Number(after.marketing_rows) >= 1,
    'Marketing Daily редове: ' + after.marketing_rows);

  console.log('\n\x1b[33m  ТЕСТОВ РЕД: ' + leadId + '\x1b[0m');
  console.log('\x1b[33m  Отвори таблицата, провери реда и го изтрий.\x1b[0m');
  console.log('\x1b[2m  След изтриването: меню BDS → „Обнови маркетинга от CRM“ —\n' +
    '  тестовият ред трябва да изчезне и от Marketing Daily.\x1b[0m');
  if (KEEP) console.log('\x1b[2m  (--keep: редът е оставен нарочно)\x1b[0m');
}

process.exit(R.summary() ? 0 : 1);
