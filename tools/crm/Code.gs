/* ============================================================
   BDS CRM — Google Apps Script Web App (Code.gs)
   ------------------------------------------------------------
   Приема заявките от формата на /restaurants и ги записва като
   редове в лист Leads. Това е входът към CRM-а.

   Защо Apps Script, а не Airtable/HubSpot: сайтът е статичен.
   Всеки друг вариант иска API ключ, а ключ в браузъра е публичен
   ключ. Този адрес не е тайна — той само ДОБАВЯ редове и не връща
   нищо от базата.

   Схемата на колоните живее в Logic.gs. Тук не се преписва.

   ВАЖНО за реда на файловете: Apps Script изпълнява файловете по
   азбучен ред, а Code.gs е първи. Затова тук НЕ се пипа нищо от
   Logic.gs на ниво файл — само вътре във функции, които се викат
   след като всичко е заредено.

   Инсталация: виж SETUP.md в същата папка.
   ============================================================ */

/* Полетата, които идват автоматично от сайта. Всичко останало се
   попълва от човек по време на продажбата. */
var FROM_SITE = {
  'Lead ID': 'lead_id',
  'Contact Name': 'full_name',
  'Business Name': 'business_name',
  'Phone': 'phone',
  'Email': 'email',
  'Service Interest': 'service_interest',
  'Budget': 'budget_range',
  'Has Website': 'has_website',
  'Website URL': 'website_url',
  'Source Category': 'source_category',
  'Source': 'source',
  'Medium': 'medium',
  'Campaign': 'campaign',
  'Content': 'content',
  'Term': 'term',
  'GCLID': 'gclid',
  'Landing Page': 'landing_page',
  'Referrer': 'referrer',
  'First Source Category': 'first_source_category',
  'First Source': 'first_source',
  'First Medium': 'first_medium',
  'First Campaign': 'first_campaign',
  'First Landing Page': 'first_landing_page',
  'First Touch At': 'first_touch_at'
};

/* Стойностите, с които всяка нова заявка тръгва. */
var LEAD_DEFAULTS = {
  'Lead Owner': 'Преслав Блажев',
  'Status': 'New',
  'Next Action': 'Първо обаждане',
  'Client': 'Не'
};

function getLeadsSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(BDS_SHEETS.leads);
  if (!sheet) {
    /* Липсващ лист значи, че таблицата не е построена. Строим я цялата,
       вместо да сглобим половин лист без падащи менюта и формули. */
    setupBdsOperations();
    sheet = ss.getSheetByName(BDS_SHEETS.leads);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(BDS_LEAD_COLUMNS);
    sheet.getRange(1, 1, 1, BDS_LEAD_COLUMNS.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/** Дали този Lead ID вече съществува — за да не се дублира при повторно
    изпращане от нервен клиент или при повторен опит след мрежова грешка. */
function findRowByLeadId_(sheet, leadId) {
  if (!leadId) return 0;
  var last = sheet.getLastRow();
  if (last < 2) return 0;
  var ids = sheet.getRange(2, 1, last - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]).trim() === String(leadId).trim()) return i + 2;
  }
  return 0;
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    /* Две заявки в една и съща секунда иначе биха писали на един ред. */
    lock.waitLock(20000);
  } catch (err) {
    return json_({ ok: false, error: 'busy' });
  }

  try {
    var body = {};
    try {
      body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    } catch (err) {
      return json_({ ok: false, error: 'bad json' });
    }

    /* Honeypot: ако скритото поле е попълнено, това е бот. Отговаряме
       успех, за да не му подскажем, но не записваме нищо. */
    if (body._honey) return json_({ ok: true, skipped: 'honeypot' });

    var sheet = getLeadsSheet_();
    var leadId = String(body.lead_id || '').trim();
    if (!leadId) return json_({ ok: false, error: 'missing lead_id' });

    var existing = findRowByLeadId_(sheet, leadId);
    if (existing) {
      return json_({ ok: true, duplicate: true, lead_id: leadId, row: existing });
    }

    var row = [];
    for (var i = 0; i < BDS_LEAD_COLUMNS.length; i++) {
      var col = BDS_LEAD_COLUMNS[i];
      if (col === 'Created Date') { row.push(new Date()); continue; }
      if (LEAD_DEFAULTS.hasOwnProperty(col)) { row.push(LEAD_DEFAULTS[col]); continue; }
      var key = FROM_SITE[col];
      row.push(key && body[key] != null ? String(body[key]) : '');
    }

    sheet.appendRow(row);
    var written = sheet.getLastRow();

    /* Заявката влиза веднага в маркетинговите числа — иначе таблото
       щеше да я показва чак след първата ръчна редакция. */
    try {
      /* doPost вече държи ключалката — оттук минаваме без нея. */
      bdsRebuildMarketingCore_();
    } catch (err2) {
      Logger.log('rebuild след нова заявка: ' + err2);
    }

    return json_({ ok: true, lead_id: leadId, row: written });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/** Проверка, че адресът работи: отвори го в браузър. */
function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var leads = ss.getSheetByName(BDS_SHEETS.leads);
  var md = ss.getSheetByName(BDS_SHEETS.marketing);
  var raw = ss.getSheetByName(BDS_SHEETS.rawAds);

  return json_({
    ok: true,
    service: 'BDS Operations',
    spreadsheet: ss.getName(),
    sheets: ss.getSheets().map(function (s) { return s.getName(); }),
    leads: leads ? Math.max(0, leads.getLastRow() - 1) : 0,
    marketing_rows: md ? Math.max(0, md.getLastRow() - 1) : 0,
    raw_ads_rows: raw ? Math.max(0, raw.getLastRow() - 1) : 0,
    columns_ok: leads ? bdsHeaderMatches_(leads, BDS_LEAD_COLUMNS) : false,
    statuses: BDS_STATUSES,
    channels: BDS_CHANNELS
  });
}

function bdsHeaderMatches_(sheet, columns) {
  if (sheet.getLastColumn() < columns.length) return false;
  var head = sheet.getRange(1, 1, 1, columns.length).getValues()[0];
  for (var i = 0; i < columns.length; i++) {
    if (String(head[i]) !== columns[i]) return false;
  }
  return true;
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ------------------------------------------------------------
   Ежедневно преизчисляване. Слага се като времеви тригер от
   installDailyRebuild() — виж SETUP.md.
   ------------------------------------------------------------ */

function dailyRebuild() {
  recheckAllLeadHealth();
  return rebuildMarketingFromCrm();
}

/** Пуска се веднъж на ръка. Слага дневен тригер и не дублира стария. */
function installDailyRebuild() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'dailyRebuild') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  ScriptApp.newTrigger('dailyRebuild').timeBased().atHour(6).everyDays(1).create();
  var msg = 'Дневният преизчислител е включен — всяка сутрин около 6:00.';
  Logger.log(msg);
  try { SpreadsheetApp.getUi().alert(msg); } catch (e) {}
  return msg;
}
