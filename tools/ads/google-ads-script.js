/* ============================================================
   BDS — ВНОС НА ДАННИ ОТ GOOGLE ADS
   ------------------------------------------------------------
   Къде живее: Google Ads → Tools → Bulk actions → Scripts.
   НЕ в Apps Script проекта на таблицата.

   Защо Google Ads Scripts, а не Google Ads API
   ------------------------------------------------------------
   API-то иска developer token (одобрява се от Google, отнема дни),
   OAuth клиент, refresh token и сървър, който да ги пази. Всичко
   това — за да прочете числата на ЕДИН акаунт.

   Google Ads Scripts работи вътре в акаунта: няма token, няма
   OAuth, няма тайна за пазене, и има собствен дневен график в
   същия екран. За BDS с един акаунт това покрива Phase 19 изцяло.

   Ако някой ден акаунтите станат много или трябва да се пише
   назад в кампаниите — тогава API. Дотогава по-простото решение
   е и по-надеждното.

   Какво прави
   ------------------------------------------------------------
   Всяка сутрин взима по кампания и по ден: разход, показвания,
   кликове, конверсии — за последните LOOKBACK_DAYS дни — и ги
   записва в лист Raw Ads на таблицата BDS Operations.

   Ключът е Дата + Платформа + Campaign ID. Ред със същия ключ се
   ОБНОВЯВА, не се добавя втори път. Затова второ пускане за същия
   ден не удвоява нищо, а поправя числата — рекламните платформи
   коригират разхода си с дни назад.
   ============================================================ */

/* ---------- Настройка ---------- */

/* Адресът на таблицата BDS Operations. Не е тайна: за да го отвори,
   човек трябва да има достъп до самата таблица. */
var SPREADSHEET_URL = '';

/* Акаунтът, в който този скрипт се поставя: Google Ads Customer ID
   337-991-6058. Записан е само за ориентир — скриптът работи вътре в
   акаунта и не се нуждае от ID, за да чете данните му. */

/* Колко дни назад се презаписват при всяко пускане. Седем, защото
   Google коригира разхода и конверсиите с няколко дни закъснение. */
var LOOKBACK_DAYS = 7;

var SHEET_NAME = 'Raw Ads';
var PLATFORM = 'Google Ads';

/* Колоните на Raw Ads. Огледало на BDS_RAW_ADS_COLUMNS в
   tools/crm/Logic.gs — двата списъка ТРЯБВА да съвпадат.
   tools/test-ads-import.mjs проверява точно това. */
var RAW_COLUMNS = [
  'Date',
  'Platform',
  'Campaign ID',
  'Campaign',
  'Spend',
  'Impressions',
  'Clicks',
  'Platform Conversions',
  'Imported At'
];

/* ---------- Вход ---------- */

function main() {
  if (!SPREADSHEET_URL) {
    throw new Error(
      'SPREADSHEET_URL е празен. Отвори таблицата BDS Operations, копирай ' +
      'адреса от лентата на браузъра и го сложи горе в скрипта.'
    );
  }
  var ss = SpreadsheetApp.openByUrl(SPREADSHEET_URL);
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    throw new Error(
      'Няма лист "' + SHEET_NAME + '". В таблицата: меню BDS → ' +
      '„Построй/поправи таблицата“.'
    );
  }

  var range = lookbackRange_(LOOKBACK_DAYS);
  var incoming = fetchCampaignDays_(range.from, range.to);
  Logger.log('Google Ads: ' + incoming.length + ' реда за ' +
    range.from + ' – ' + range.to + '.');

  var result = upsertRawAds_(sheet, incoming);
  Logger.log('Raw Ads: ' + result.added + ' нови, ' + result.updated + ' обновени, ' +
    result.total + ' общо.');

  /* Marketing Daily се преизчислява от дневния тригер в самата
     таблица (dailyRebuild). Оттук не се пипа — Ads Scripts няма
     достъп до функциите на другия проект. */
}

/* ---------- Данни от акаунта ---------- */

function lookbackRange_(days) {
  var tz = AdsApp.currentAccount().getTimeZone();
  var today = new Date();
  var from = new Date(today.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
  return {
    from: Utilities.formatDate(from, tz, 'yyyy-MM-dd'),
    to: Utilities.formatDate(today, tz, 'yyyy-MM-dd')
  };
}

/** Един ред на кампания на ден. GAQL, защото AWQL е пенсиониран. */
function fetchCampaignDays_(fromDate, toDate) {
  var query =
    'SELECT campaign.id, campaign.name, segments.date, ' +
    'metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.conversions ' +
    'FROM campaign ' +
    'WHERE segments.date BETWEEN "' + fromDate + '" AND "' + toDate + '" ' +
    'AND metrics.impressions > 0';

  var rows = [];
  var iterator = AdsApp.search(query);
  while (iterator.hasNext()) {
    var r = iterator.next();
    var m = r.metrics || {};
    rows.push({
      date: String(r.segments.date),
      platform: PLATFORM,
      campaignId: String(r.campaign.id),
      campaign: String(r.campaign.name),
      /* cost_micros: милионни от единица валута. 1 500 000 = 1.50 €.
         Валутата е тази на акаунта — не се преобразува тук. */
      spend: Number(m.costMicros || 0) / 1000000,
      impressions: Number(m.impressions || 0),
      clicks: Number(m.clicks || 0),
      conversions: Number(m.conversions || 0)
    });
  }
  return rows;
}

/* ---------- UPSERT ----------
   Същата логика като bdsUpsertRawAds() в tools/crm/Logic.gs.
   Стои тук отделно, защото Google Ads Scripts е друга среда и не
   вижда кода на таблицата. tools/test-ads-import.mjs пуска двете
   реализации върху един и същ вход и сравнява резултата. */

function upsertRawAds_(sheet, incoming) {
  var last = sheet.getLastRow();
  var width = RAW_COLUMNS.length;
  var existing = last > 1 ? sheet.getRange(2, 1, last - 1, width).getValues() : [];

  var rows = [];
  var index = {};

  for (var i = 0; i < existing.length; i++) {
    var src = existing[i].slice();
    var d = dateKey_(src[0]);
    var p = String(src[1] || '').trim();
    if (!d || !p) continue;
    src[0] = d;
    var key = d + '|' + p + '|' + String(src[2] == null ? '' : src[2]).trim();
    if (index.hasOwnProperty(key)) { rows[index[key]] = src; continue; }
    index[key] = rows.length;
    rows.push(src);
  }

  var importedAt = new Date();
  var added = 0, updated = 0;
  for (var j = 0; j < incoming.length; j++) {
    var inc = incoming[j];
    var dk = dateKey_(inc.date);
    if (!dk) continue;
    var k = dk + '|' + inc.platform + '|' + String(inc.campaignId || '').trim();
    var row = [
      dk, inc.platform, String(inc.campaignId || ''), String(inc.campaign || ''),
      Number(inc.spend) || 0, Number(inc.impressions) || 0, Number(inc.clicks) || 0,
      Number(inc.conversions) || 0, importedAt
    ];
    if (index.hasOwnProperty(k)) { rows[index[k]] = row; updated++; }
    else { index[k] = rows.length; rows.push(row); added++; }
  }

  rows.sort(function (a, b) {
    if (a[0] !== b[0]) return a[0] < b[0] ? -1 : 1;
    if (a[1] !== b[1]) return a[1] < b[1] ? -1 : 1;
    return String(a[2]) < String(b[2]) ? -1 : 1;
  });

  if (rows.length > 0) {
    var out = rows.map(function (r) {
      var copy = r.slice();
      copy[0] = toDate_(copy[0]);
      return copy;
    });
    if (sheet.getMaxRows() < out.length + 1) {
      sheet.insertRowsAfter(sheet.getMaxRows(), out.length + 1 - sheet.getMaxRows());
    }
    sheet.getRange(2, 1, out.length, width).setValues(out);
  }
  var extra = sheet.getLastRow() - 1 - rows.length;
  if (extra > 0) sheet.getRange(2 + rows.length, 1, extra, width).clearContent();

  return { added: added, updated: updated, total: rows.length };
}

/* ---------- Дати ----------
   YYYY-MM-DD по местно време. ISO низът на Date обект би преместил
   полунощ в предишния ден и цял ден разход би отишъл в грешен ред. */

function dateKey_(v) {
  if (v == null || v === '') return '';
  if (v instanceof Date) {
    if (isNaN(v.getTime())) return '';
    return v.getFullYear() + '-' + pad2_(v.getMonth() + 1) + '-' + pad2_(v.getDate());
  }
  var s = String(v).trim();
  var iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (iso) return iso[1] + '-' + iso[2] + '-' + iso[3];
  var bg = /^(\d{1,2})[.\/](\d{1,2})[.\/](\d{4})/.exec(s);
  if (bg) return bg[3] + '-' + pad2_(bg[2]) + '-' + pad2_(bg[1]);
  var d = new Date(s);
  return isNaN(d.getTime()) ? '' : dateKey_(d);
}

function pad2_(n) {
  n = String(n);
  return n.length < 2 ? '0' + n : n;
}

function toDate_(key) {
  var p = String(key).split('-');
  return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
}
