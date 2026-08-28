/* ============================================================
   BDS — тест на вноса на рекламни данни (Phase 19)
   ------------------------------------------------------------
   Стартиране:  node tools/test-ads-import.mjs

   Вносът живее на две места, защото Google Ads Scripts е отделна
   среда и не вижда кода на таблицата:

     tools/crm/Logic.gs          bdsUpsertRawAds()
     tools/ads/google-ads-script.js  upsertRawAds_()

   Две копия се разминават — освен ако нещо не ги сравнява. Този
   тест пуска двете върху един и същи вход и изисква еднакъв изход.

   Останалото, което проверява: че повторното пускане за същия ден
   не удвоява редове, че корекция назад се прилага, и че седемте
   дни презапис наистина са седем.
   ============================================================ */

import vm from 'node:vm';
import { loadLogic, reporter, read } from './lib/ops-test-kit.mjs';

const L = loadLogic();
const R = reporter('BDS — внос на рекламни данни (Phase 19)');
const { G, check } = R;
const RI = L.BDS_RAW_IDX;

/* ---------- зареждане на скрипта за Google Ads ----------
   Той е писан за друга среда: подменяме само това, което пипа
   Google, и запазваме логиката такава, каквато ще се изпълни. */

function loadAdsScript() {
  const src = read('tools/ads/google-ads-script.js');
  const ctx = {
    console, Date, JSON, Math, RegExp, String, Number, isNaN, isFinite, parseFloat, parseInt,
    Logger: { log() {} },
    SpreadsheetApp: {}, AdsApp: {}, Utilities: {}
  };
  vm.createContext(ctx);
  vm.runInContext(src, ctx, { filename: 'google-ads-script.js' });
  return ctx;
}

const A = loadAdsScript();

/** Достатъчно от Google Sheets, за да мине upsertRawAds_(). */
function fakeSheet(rows) {
  const store = rows.map(r => r.slice());
  const width = A.RAW_COLUMNS.length;
  let maxRows = Math.max(store.length + 1, 100);
  return {
    getLastRow: () => store.length + 1,
    getMaxRows: () => maxRows,
    insertRowsAfter: (_, n) => { maxRows += n; },
    getRange(row, col, numRows, numCols) {
      return {
        getValues() {
          const out = [];
          for (let i = 0; i < numRows; i++) {
            const src = store[row - 2 + i] || new Array(width).fill('');
            out.push(src.slice(col - 1, col - 1 + numCols));
          }
          return out;
        },
        setValues(values) {
          for (let i = 0; i < values.length; i++) {
            const target = row - 2 + i;
            while (store.length <= target) store.push(new Array(width).fill(''));
            for (let j = 0; j < values[i].length; j++) store[target][col - 1 + j] = values[i][j];
          }
          while (store.length > row - 2 + values.length) store.pop();
        },
        clearContent() {
          for (let i = 0; i < numRows; i++) {
            const target = row - 2 + i;
            if (store[target]) for (let j = 0; j < numCols; j++) store[target][col - 1 + j] = '';
          }
        }
      };
    },
    dump: () => store.map(r => r.slice())
  };
}

const ad = (o) => Object.assign({
  date: '2026-08-20', platform: 'Google Ads', campaignId: '22112233',
  campaign: 'restaurant_search_bg', spend: 12.5, impressions: 900, clicks: 40, conversions: 2
}, o);

/* Резултатът от двете реализации, сведен до сравними стойности. */
const normalize = (rows) => rows.map(r => [
  L.bdsDateKey(r[0]), r[1], String(r[2]), r[3],
  Number(r[4]), Number(r[5]), Number(r[6]), Number(r[7])
]);

/* ============================================================
   1. Схемата е една и съща на двете места
   ============================================================ */
G('Двете реализации ползват една схема');

check('колоните на Raw Ads съвпадат буква по буква',
  A.RAW_COLUMNS.join('|') === L.BDS_RAW_ADS_COLUMNS.join('|'),
  A.RAW_COLUMNS.join(', '));
check('платформата е етикет от таксономията',
  L.BDS_CHANNELS.includes(A.PLATFORM), A.PLATFORM);
check('листът се казва Raw Ads на двете места',
  A.SHEET_NAME === L.BDS_SHEETS.rawAds);

/* ============================================================
   2. Еднакво поведение при еднакъв вход
   ============================================================ */
G('Паритет между Logic.gs и Google Ads Script');

const CASES = [
  {
    name: 'празен лист, три нови реда',
    existing: [],
    incoming: [
      ad({ campaignId: '1', campaign: 'a' }),
      ad({ campaignId: '2', campaign: 'b' }),
      ad({ date: '2026-08-21', campaignId: '1', campaign: 'a' })
    ]
  },
  {
    name: 'повторно пускане за същия ден',
    existing: [['2026-08-20', 'Google Ads', '1', 'a', 10, 500, 20, 1, '']],
    incoming: [ad({ campaignId: '1', campaign: 'a', spend: 10, impressions: 500, clicks: 20, conversions: 1 })]
  },
  {
    name: 'платформата коригира вчерашния разход',
    existing: [['2026-08-20', 'Google Ads', '1', 'a', 20, 1000, 50, 3, '']],
    incoming: [ad({ campaignId: '1', campaign: 'a', spend: 18.4, impressions: 1010, clicks: 49, conversions: 2 })]
  },
  {
    name: 'стар ден, който вносът не покрива',
    existing: [['2026-08-01', 'Google Ads', '1', 'a', 40, 3000, 120, 6, '']],
    incoming: [ad({ date: '2026-08-20', campaignId: '1', campaign: 'a' })]
  },
  {
    name: 'нищо за внасяне',
    existing: [['2026-08-01', 'Google Ads', '1', 'a', 40, 3000, 120, 6, '']],
    incoming: []
  }
];

for (const c of CASES) {
  const viaLogic = L.bdsUpsertRawAds(c.existing.map(r => r.slice()), c.incoming, '');
  const sheet = fakeSheet(c.existing.map(r => r.slice()));
  A.upsertRawAds_(sheet, c.incoming);
  const same = JSON.stringify(normalize(viaLogic.rows)) === JSON.stringify(normalize(sheet.dump()));
  check(c.name + ' — двете реализации дават едно и също', same,
    same ? '' : JSON.stringify(normalize(viaLogic.rows)) + '  ≠  ' + JSON.stringify(normalize(sheet.dump())));
}

/* ============================================================
   3. UPSERT: ключ Дата + Платформа + Campaign ID
   ============================================================ */
G('UPSERT');

{
  const r1 = L.bdsUpsertRawAds([], [ad()], '');
  check('нов ред се добавя', r1.rows.length === 1 && r1.added === 1);

  const r2 = L.bdsUpsertRawAds(r1.rows, [ad()], '');
  check('второ пускане не добавя втори ред', r2.rows.length === 1);
  check('второто пускане е обновяване, не добавяне', r2.updated === 1 && r2.added === 0);

  const r3 = L.bdsUpsertRawAds(r2.rows, [ad()], '');
  check('трето пускане — все още един ред', r3.rows.length === 1);
}

{
  const rows = L.bdsUpsertRawAds([], [
    ad({ campaignId: '1' }), ad({ campaignId: '2' })
  ], '').rows;
  check('различни кампании в един ден са различни редове', rows.length === 2);
}
{
  const rows = L.bdsUpsertRawAds([], [
    ad({ platform: 'Google Ads' }), ad({ platform: 'Meta Ads' })
  ], '').rows;
  check('различни платформи са различни редове', rows.length === 2);
}
{
  const corrected = L.bdsUpsertRawAds(
    [['2026-08-20', 'Google Ads', '22112233', 'restaurant_search_bg', 20, 1000, 50, 3, '']],
    [ad({ spend: 17.2 })], '');
  check('корекцията заменя стойността, не се сумира',
    corrected.rows.length === 1 && corrected.rows[0][RI.spend] === 17.2);
}
{
  /* Ако някой е добавил ръчно дублиран ред, вносът го схлупва. */
  const dupes = L.bdsUpsertRawAds([
    ['2026-08-20', 'Google Ads', '1', 'a', 10, 100, 5, 0, ''],
    ['2026-08-20', 'Google Ads', '1', 'a', 99, 999, 99, 9, '']
  ], [], '');
  check('стар дубликат се схлупва до един ред', dupes.rows.length === 1);
  check('оцелява последният, не първият', dupes.rows[0][RI.spend] === 99);
}
{
  const bad = L.bdsUpsertRawAds([], [
    { date: '', platform: 'Google Ads', campaignId: '1' },
    { date: '2026-08-20', platform: '', campaignId: '1' }
  ], '');
  check('ред без дата или платформа не влиза', bad.rows.length === 0);
}

G('Подредба');
{
  const rows = L.bdsUpsertRawAds([], [
    ad({ date: '2026-08-22' }), ad({ date: '2026-08-20' }), ad({ date: '2026-08-21' })
  ], '').rows;
  check('редовете излизат подредени по дата',
    rows.map(r => r[RI.date]).join(',') === '2026-08-20,2026-08-21,2026-08-22');
}

/* ============================================================
   4. Скриптът за Google Ads
   ============================================================ */
G('Google Ads Script');

/* Коментарите обясняват защо НЕ ползваме token и OAuth. Затова
   проверката за тайни гледа кода без коментарите — иначе обяснението
   защо нещо липсва би се броило за негово присъствие. */
const stripComments = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');

const ads = read('tools/ads/google-ads-script.js');
const adsCode = stripComments(ads);
check('обяснено е защо Scripts, а не API',
  /Защо Google Ads Scripts, а не Google Ads API/.test(ads));
check('кодът не иска developer token', !/developer[_ ]?token/i.test(adsCode));
check('кодът не иска OAuth тайни', !/client_secret|refresh_token/i.test(adsCode));
check('няма записан адрес на таблица — попълва се от собственика',
  /var SPREADSHEET_URL = '';/.test(ads));
check('без адрес спира с ясно съобщение', /SPREADSHEET_URL е празен/.test(ads));
check('липсващ лист дава указание, не мълчалива грешка',
  /Построй\/поправи таблицата/.test(ads));

check('презаписва последните 7 дни', /var LOOKBACK_DAYS = 7;/.test(ads));
check('обяснено е защо 7 дни', /коригира разхода/.test(ads));
check('чете разход, показвания, кликове и конверсии',
  /metrics\.cost_micros/.test(ads) && /metrics\.impressions/.test(ads) &&
  /metrics\.clicks/.test(ads) && /metrics\.conversions/.test(ads));
check('чете и Campaign ID, и име', /campaign\.id/.test(ads) && /campaign\.name/.test(ads));
check('разбива по дни', /segments\.date/.test(ads) && /time_increment|segments\.date/.test(ads));
check('превръща микро-единиците в евро', /1000000/.test(ads));
check('ползва GAQL, не пенсионирания AWQL', /AdsApp\.search\(/.test(ads));

{
  /* Прозорецът наистина ли е седем дни, включително днешния. */
  A.AdsApp.currentAccount = () => ({ getTimeZone: () => 'Europe/Sofia' });
  A.Utilities.formatDate = (d) => d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const range = A.lookbackRange_(7);
  const days = (new Date(range.to) - new Date(range.from)) / 86400000 + 1;
  check('прозорецът е точно 7 дни', days === 7, range.from + ' – ' + range.to);
  check('прозорецът свършва днес',
    range.to === A.Utilities.formatDate(new Date()), range.to);
}

/* ============================================================
   5. Meta — код готов, връзка блокирана
   ============================================================ */
G('Meta');

const meta = read('tools/ads/MetaImport.gs');
const metaCode = stripComments(meta);
check('токенът се чете от Script Properties, не от кода',
  /PropertiesService\.getScriptProperties\(\)/.test(metaCode));
/* Токен изглежда като дълъг непрозрачен низ. Търсим точно такъв
   литерал — не думата „token“, която в този файл е име на поле. */
const opaqueLiterals = [...metaCode.matchAll(/'([A-Za-z0-9_\-]{20,})'/g)].map(m => m[1]);
check('в кода няма записан токен', opaqueLiterals.length === 0, opaqueLiterals.join(', '));
check('в кода няма записан account id', !/act_\d{6,}/.test(metaCode));
check('стойностите са само имена на свойства, не самите тайни',
  /getProperty\('META_ACCESS_TOKEN'\)/.test(metaCode) &&
  /getProperty\('META_AD_ACCOUNT_ID'\)/.test(metaCode));
check('без креденшъли отказва работа с ясен текст',
  /BLOCKED — META НЕ Е СВЪРЗАНА/.test(meta));
check('без креденшъли НЕ пише в таблицата',
  /if \(!cfg\.accountId \|\| !cfg\.token\)[\s\S]{0,200}return blocked;/.test(meta));
check('има проверка на връзката', /function metaConnectionTest\(/.test(meta));
check('има дневен внос', /function metaDailyImport\(/.test(meta));
check('има тригер, който се инсталира', /function installMetaTrigger\(/.test(meta));
check('тригерът отказва да се сложи преди свързване',
  /installMetaTrigger[\s\S]{0,400}BLOCKED/.test(meta));
check('и Meta презаписва 7 дни назад', /META_LOOKBACK_DAYS = 7/.test(meta));
check('вносът минава през същия UPSERT', /bdsImportAdsRows\(/.test(meta));
check('конверсиите на платформата остават справка, не истина',
  /истинският брой заявки идва от CRM/.test(meta));

/* ============================================================
   6. Разделението raw ↔ анализ
   ============================================================ */
G('Raw Ads е суровината, Marketing Daily е анализът');

const marketing = read('tools/crm/Marketing.gs');
check('Marketing Daily се сглобява от Raw Ads + CRM',
  /bdsAggregateAds\(/.test(marketing) && /bdsAggregateCrm\(/.test(marketing));
check('вносителят не пише директно в Marketing Daily',
  /function bdsImportAdsRows\(/.test(marketing) &&
  /bdsUpsertRawAds\(/.test(marketing));
check('Raw Ads пази кога е внесено', L.BDS_RAW_ADS_COLUMNS.includes('Imported At'));
check('Raw Ads пази конверсиите на платформата отделно',
  L.BDS_RAW_ADS_COLUMNS.includes('Platform Conversions'));
check('Marketing Daily НЕ носи конверсии на платформата — заявките идват от CRM',
  !L.BDS_MARKETING_COLUMNS.includes('Platform Conversions'));

process.exit(R.summary() ? 0 : 1);
