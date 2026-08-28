/* ============================================================
   BDS — тест на маркетинговия тракер (Phase 18)
   ------------------------------------------------------------
   Стартиране:  node tools/test-marketing-tracker.mjs

   Какво проверява: схемата на Marketing Daily и Raw Ads, сметките,
   таксономията на каналите и това, че „Profit“ е изчистено от
   оперативния речник.

   Защо преименуването има тест: Revenue − Spend НЕ е печалба.
   Печалбата включва труд, инструменти и данъци. Число, наречено с
   грешно име, се ползва за грешни решения.
   ============================================================ */

import { loadLogic, loadGs, reporter, read, exists, near } from './lib/ops-test-kit.mjs';

const L = loadLogic();
const R = reporter('BDS — маркетингов тракер (Phase 18)');
const { G, check } = R;

/* ============================================================
   1. Схема
   ============================================================ */
G('Схема — Marketing Daily');

const REQUIRED_MD = [
  'Date', 'Channel', 'Campaign ID', 'Campaign',
  'Spend', 'Impressions', 'Clicks', 'CTR', 'CPC',
  'Leads', 'CPL', 'Clients', 'CAC',
  'Revenue', 'ROAS', 'Marketing Contribution'
];
for (const col of REQUIRED_MD) {
  check('колона ' + col, L.BDS_MARKETING_COLUMNS.includes(col));
}
check('Notes е накрая', L.BDS_MARKETING_COLUMNS[L.BDS_MARKETING_COLUMNS.length - 1] === 'Notes');
check('няма колона Profit', !L.BDS_MARKETING_COLUMNS.includes('Profit'));
check('индексите отговарят на реда на колоните',
  Object.entries(L.BDS_MD_IDX).every(([, i]) => i >= 0 && i < L.BDS_MARKETING_COLUMNS.length) &&
  L.BDS_MARKETING_COLUMNS[L.BDS_MD_IDX.spend] === 'Spend' &&
  L.BDS_MARKETING_COLUMNS[L.BDS_MD_IDX.revenue] === 'Revenue' &&
  L.BDS_MARKETING_COLUMNS[L.BDS_MD_IDX.contribution] === 'Marketing Contribution');

G('Схема — Raw Ads');
for (const col of ['Date', 'Platform', 'Campaign ID', 'Campaign', 'Spend',
  'Impressions', 'Clicks', 'Platform Conversions', 'Imported At']) {
  check('колона ' + col, L.BDS_RAW_ADS_COLUMNS.includes(col));
}
check('Raw Ads е отделен от Marketing Daily',
  L.BDS_SHEETS.rawAds !== L.BDS_SHEETS.marketing);

/* ============================================================
   2. Сметките
   ============================================================ */
G('Формули');

check('CTR = кликове / показвания', near(L.bdsCtr(50, 1000), 0.05));
check('CPC = разход / кликове', near(L.bdsCpc(100, 50), 2));
check('CPL = разход / заявки', near(L.bdsCpl(100, 4), 25));
check('CAC = разход / клиенти', near(L.bdsCac(300, 2), 150));
check('ROAS = приход / разход', near(L.bdsRoas(900, 300), 3));
check('Marketing Contribution = приход − разход',
  L.bdsMarketingContribution(900, 300) === 600);
check('отрицателен принос се получава, не се крие',
  L.bdsMarketingContribution(100, 300) === -200);

G('Деление на нула');
check('CTR без показвания → празно', L.bdsCtr(10, 0) === '');
check('CPC без кликове → празно', L.bdsCpc(100, 0) === '');
check('CPL без заявки → празно', L.bdsCpl(100, 0) === '');
check('CAC без клиенти → празно', L.bdsCac(100, 0) === '');
check('ROAS без разход → празно', L.bdsRoas(500, 0) === '');
check('празно, не нула — нулата би излъгала, че е измерено',
  L.bdsCpl(100, 0) !== 0 && L.bdsCpl(100, 0) === '');
check('принос без разход е самият приход', L.bdsMarketingContribution(500, '') === 500);

G('Числа от таблица');
check('текст с € и запетая се чете', near(L.bdsNum('1 250,50'), 1250.5));
check('празно е нула', L.bdsNum('') === 0);
check('глупост е нула, не NaN', L.bdsNum('няма') === 0);

/* ============================================================
   3. Канали
   ============================================================ */
G('Таксономия на каналите');

const EXPECTED_MAP = {
  google_ads: 'Google Ads',
  meta_ads: 'Meta Ads',
  organic_google: 'Organic Google',
  instagram: 'Instagram',
  facebook: 'Facebook',
  referral: 'Referral',
  direct: 'Direct',
  other: 'Other'
};
for (const [key, label] of Object.entries(EXPECTED_MAP)) {
  check(key + ' → ' + label, L.bdsChannelFromSourceCategory(key) === label);
}
check('точно осем канала', L.BDS_CHANNELS.length === 8, L.BDS_CHANNELS.join(', '));
check('няма TikTok', !L.BDS_CHANNELS.includes('TikTok Ads'));
check('няма LinkedIn', !L.BDS_CHANNELS.includes('LinkedIn Ads'));
check('липсващ източник → Direct', L.bdsChannelFromSourceCategory('') === 'Direct');
check('непознат източник → Other, не измислен канал',
  L.bdsChannelFromSourceCategory('tiktok_ads') === 'Other');
check('вече изписан етикет се приема',
  L.bdsChannelFromSourceCategory('Google Ads') === 'Google Ads');
check('Platform в Raw Ads е същият етикет',
  L.bdsChannelFromPlatform('Google Ads') === 'Google Ads' &&
  L.bdsChannelFromPlatform('Meta Ads') === 'Meta Ads');

/* Каналите на сайта и на тракера трябва да са ЕДИН списък. Разминаване
   тук значи заявка, която влиза в таблицата под име, което таблото не
   сумира — и разход без приход срещу него. */
G('Сайтът и тракерът говорят за едно и също');

const appJs = read('assets/js/app.js');
const labelsBlock = /var SOURCE_LABELS = \{([\s\S]*?)\};/.exec(appJs);
check('app.js има таблица със категориите', !!labelsBlock);
const siteMap = {};
if (labelsBlock) {
  for (const m of labelsBlock[1].matchAll(/(\w+):\s*'([^']+)'/g)) siteMap[m[1]] = m[2];
}
check('сайтът класифицира точно осемте категории',
  Object.keys(siteMap).length === 8, Object.keys(siteMap).join(', '));
check('всяка категория на сайта има същия етикет в тракера',
  Object.entries(siteMap).every(([k, v]) => L.bdsChannelFromSourceCategory(k) === v),
  Object.entries(siteMap).map(([k, v]) => k + '→' + v).join(' · '));
check('тракерът няма канал, който сайтът не може да произведе',
  L.BDS_CHANNELS.every(ch => Object.values(siteMap).includes(ch)));

/* Реалните връщания на classify() — не само етикетите. */
const classifyReturns = [...appJs.matchAll(/return '([a-z_]+)';/g)]
  .map(m => m[1])
  .filter(v => Object.keys(EXPECTED_MAP).includes(v));
check('всяка стойност, която classify() връща, е позната на тракера',
  [...new Set(classifyReturns)].every(v => L.BDS_CHANNEL_MAP[v]),
  [...new Set(classifyReturns)].join(', '));

/* ============================================================
   4. Ключ на ред и дати
   ============================================================ */
G('Ключ Дата + Канал + Campaign ID');

check('един и същи ключ за едни и същи данни',
  L.bdsMdKey('2026-08-28', 'Google Ads', '123') === L.bdsMdKey(new Date(2026, 7, 28), 'Google Ads', '123'));
check('различна кампания = различен ключ',
  L.bdsMdKey('2026-08-28', 'Google Ads', '123') !== L.bdsMdKey('2026-08-28', 'Google Ads', '124'));
check('различен канал = различен ключ',
  L.bdsMdKey('2026-08-28', 'Google Ads', '') !== L.bdsMdKey('2026-08-28', 'Meta Ads', ''));
check('дата по местно време, не UTC',
  L.bdsDateKey(new Date(2026, 0, 1, 0, 30)) === '2026-01-01');
check('български формат се чете', L.bdsDateKey('28.08.2026') === '2026-08-28');
check('празна дата не става ключ', L.bdsDateKey('') === '');

/* ============================================================
   5. Изграждането на листа
   ============================================================ */
G('Setup.gs строи каквото трябва');

const setup = read('tools/crm/Setup.gs');
check('изведените колони са ARRAYFORMULA в заглавния ред',
  /H: '=\{"CTR"/.test(setup) && /P: '=\{"Marketing Contribution"/.test(setup));
check('CTR формулата дели кликове на показвания', /\$G\$2:\$G\/\$F\$2:\$F/.test(setup));
check('CPL формулата дели разход на заявки', /\$E\$2:\$E\/\$J\$2:\$J/.test(setup));
check('CAC формулата дели разход на клиенти', /\$E\$2:\$E\/\$L\$2:\$L/.test(setup));
check('ROAS формулата дели приход на разход', /\$N\$2:\$N\/\$E\$2:\$E/.test(setup));
check('приносът вади разхода от прихода', /N\(\$N\$2:\$N\)-N\(\$E\$2:\$E\)/.test(setup));
check('делението на нула е поето с IFERROR', (setup.match(/IFERROR/g) || []).length >= 5);
check('нов лист се разширява до нужния брой колони преди запис',
  /insertColumnsAfter\(sheet\.getMaxColumns\(\)/.test(setup));
check('Leads иска повече от 26-те колони по подразбиране',
  L.BDS_LEAD_COLUMNS.length > 26, L.BDS_LEAD_COLUMNS.length + ' колони');
check('Status има истинско падащо меню',
  /requireValueInList\(BDS_STATUSES/.test(setup));
check('Channel има падащо меню', /requireValueInList\(BDS_CHANNELS/.test(setup));
check('незавършена заявка се оцветява по колоната Health',
  /newConditionalFormatRule/.test(setup) &&
  /LEN\(\$' \+ healthLetter \+ '2\)>0/.test(setup));
check('отрицателният принос се оцветява',
  /N\(\$P2\)<0/.test(setup));
check('таблото има всички основни показатели',
  ['Spend', 'Impressions', 'Clicks', 'CTR', 'CPC', 'Leads', 'CPL', 'Clients',
    'CAC', 'Revenue', 'ROAS', 'Marketing Contribution']
    .every(k => setup.includes("['" + k + "'")));
check('таблото има разбивка по канал', /ПО КАНАЛ/.test(setup));
check('таблото има разбивка по кампания', /ПО КАМПАНИЯ/.test(setup));
check('таблото показва и продажби по Close Date', /ПРОДАЖБИ ПО CLOSE DATE/.test(setup));
check('Config листът описва модела на датата', /Модел на датата/.test(setup));
check('Config листът сочи кой лист е източник на истината',
  /Източник на истината/.test(setup));

/* ============================================================
   6. Речник — „Profit“ е сменено навсякъде, където се работи
   ============================================================ */
G('Речник — Marketing Contribution, не Profit');

const OPERATIONAL = [
  'tools/crm/Logic.gs',
  'tools/crm/Setup.gs',
  'tools/crm/Marketing.gs',
  'marketing/marketing-performance-template.csv'
];
for (const file of OPERATIONAL) {
  const txt = read(file);
  check(file + ' не ползва „Profit“', !/\bProfit\b/.test(txt));
}
const csv = read('marketing/marketing-performance-template.csv');
check('CSV шаблонът има Marketing Contribution', /Marketing Contribution/.test(csv));
const csvHead = csv.replace(/^﻿/, '').split(/\r?\n/)[0].split(',');
check('CSV шаблонът е дума по дума схемата на Marketing Daily',
  csvHead.join('|') === L.BDS_MARKETING_COLUMNS.join('|'),
  csvHead.join(','));
check('CSV шаблонът изброява точно осемте канала',
  csv.trim().split(/\r?\n/).length - 1 === L.BDS_CHANNELS.length);
check('CSV шаблонът няма TikTok/LinkedIn редове', !/TikTok|LinkedIn/i.test(csv));

/* ============================================================
   7. Архивът
   ============================================================ */
G('Стария XLSX');

const trackerDoc = read('marketing/marketing-performance-tracker.md');
check('документацията сочи Google Sheets като източник на истината',
  /BDS Operations/.test(trackerDoc) && /Google Sheet/.test(trackerDoc));
check('документацията маркира XLSX като архив',
  /АРХИВ|ARCHIVED|архив/i.test(trackerDoc));

process.exit(R.summary() ? 0 : 1);
