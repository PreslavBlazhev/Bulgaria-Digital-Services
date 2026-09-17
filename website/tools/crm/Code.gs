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
  var body = {};
  try {
    body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    return json_({ ok: false, error: 'bad json' });
  }

  /* Заявките от сайта нямат поле `action`. Служебните команди имат —
     и минават по съвсем друг път, със собствена проверка и собствено
     заключване. Разделението е нарочно: входът за заявки трябва да
     остане възможно най-скучен. */
  if (body.action) return bdsOpsRouter_(body);

  return bdsIntakeLead_(body);
}

/** Входът за заявки от сайта. */
function bdsIntakeLead_(body) {
  var lock = LockService.getScriptLock();
  try {
    /* Две заявки в една и съща секунда иначе биха писали на един ред. */
    lock.waitLock(20000);
  } catch (err) {
    return json_({ ok: false, error: 'busy' });
  }

  try {
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

/* ============================================================
   СЛУЖЕБНИ КОМАНДИ
   ------------------------------------------------------------
   Позволяват преизчисляване, проверка на състоянието и пълната
   самопроверка да се пускат отдалеч, без някой да отваря
   редактора. Иначе всяка проверка иска човек пред екрана.

   Защита: споделен ключ в Script Properties. Адресът на Web App-а
   не е тайна и не бива да е единственото, което пази командите,
   които ПИШАТ в таблицата.

   Ключът се вижда веднъж, с showOpsToken(). Не се записва в
   проекта и не тръгва към сайта.

   Какво НЕ връщат тези команди: имена, телефони и имейли. Дори с
   ключ — операциите нямат нужда от лични данни, за да се проверят.
   ============================================================ */

function bdsOpsToken_() {
  return String(PropertiesService.getScriptProperties().getProperty('BDS_OPS_TOKEN') || '');
}

/** Пуска се веднъж на ръка. Създава ключа, ако го няма, и го показва. */
function showOpsToken() {
  var props = PropertiesService.getScriptProperties();
  var token = String(props.getProperty('BDS_OPS_TOKEN') || '');
  if (!token) {
    token = Utilities.getUuid().replace(/-/g, '') +
      Utilities.getUuid().replace(/-/g, '').slice(0, 8);
    props.setProperty('BDS_OPS_TOKEN', token);
  }
  var msg = 'Служебен ключ:\n\n' + token +
    '\n\nПазù го като парола. Смяна: изтрий BDS_OPS_TOKEN от\n' +
    'Project Settings → Script Properties и пусни това пак.';
  Logger.log(msg);
  try { SpreadsheetApp.getUi().alert(msg); } catch (e) {}
  return token;
}

function bdsOpsRouter_(body) {
  var expected = bdsOpsToken_();
  if (!expected) {
    return json_({ ok: false, error: 'ops disabled — пусни showOpsToken() веднъж' });
  }
  /* Сравнението е по дължина и съдържание наведнъж; ранното връщане
     при първата разлика тук няма значение — ключът е 40 знака шум. */
  if (String(body.token || '') !== expected) {
    return json_({ ok: false, error: 'forbidden' });
  }

  try {
    switch (body.action) {
      case 'ping':      return json_({ ok: true, action: 'ping', version: bdsOpsVersion_() });
      case 'state':     return json_(bdsOpsState_());
      case 'rebuild':   return json_({ ok: true, message: rebuildMarketingFromCrm(), state: bdsOpsState_() });
      case 'health':    return json_({ ok: true, message: recheckAllLeadHealth() });
      case 'selftest':  return json_({ ok: true, report: runBdsSelfTest() });
      case 'cleanup':   return json_({ ok: true, message: cleanupSelfTestRows(), state: bdsOpsState_() });
      case 'setup':     return json_({ ok: true, message: setupBdsOperations() });
      default:          return json_({ ok: false, error: 'непозната команда: ' + body.action });
    }
  } catch (err) {
    return json_({ ok: false, error: String(err), stack: err && err.stack ? String(err.stack) : '' });
  }
}

/** Кои промени вече са живи — за да не се гадае коя версия е качена. */
function bdsOpsVersion_() {
  return {
    per_row_formulas: typeof bdsMarketingFormulas === 'function',
    lockfree_core: typeof bdsRebuildMarketingCore_ === 'function',
    selftest: typeof runBdsSelfTest === 'function'
  };
}

/** Състоянието на операциите — числа и статуси, без лични данни. */
function bdsOpsState_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var leads = ss.getSheetByName(BDS_SHEETS.leads);
  var md = ss.getSheetByName(BDS_SHEETS.marketing);
  var raw = ss.getSheetByName(BDS_SHEETS.rawAds);

  var out = { ok: true, leads: [], marketing: [], raw_ads: [] };

  var lastLead = leads.getLastRow();
  if (lastLead > 1) {
    var lv = leads.getRange(2, 1, lastLead - 1, BDS_LEAD_COLUMNS.length).getValues();
    for (var i = 0; i < lv.length; i++) {
      var v = lv[i];
      if (!String(v[0] || '').trim()) continue;
      out.leads.push({
        lead_id: String(v[0]),
        created: bdsDateKey(v[bdsLeadIdx_('Created Date') - 1]),
        status: String(v[bdsLeadIdx_('Status') - 1] || ''),
        owner: String(v[bdsLeadIdx_('Lead Owner') - 1] || ''),
        source_category: String(v[bdsLeadIdx_('Source Category') - 1] || ''),
        campaign: String(v[bdsLeadIdx_('Campaign') - 1] || ''),
        next_action: String(v[bdsLeadIdx_('Next Action') - 1] || ''),
        deal_value: bdsNum(v[bdsLeadIdx_('Deal Value') - 1]),
        close_date: bdsDateKey(v[bdsLeadIdx_('Close Date') - 1]),
        client: String(v[bdsLeadIdx_('Client') - 1] || ''),
        won_lost: String(v[bdsLeadIdx_('Won/Lost') - 1] || ''),
        proposal_id: String(v[bdsLeadIdx_('Proposal ID') - 1] || ''),
        proposal_date: bdsDateKey(v[bdsLeadIdx_('Proposal Date') - 1]),
        proposal_value: bdsNum(v[bdsLeadIdx_('Proposal Value') - 1]),
        proposal_validity: bdsDateKey(v[bdsLeadIdx_('Proposal Validity') - 1]),
        health: String(v[bdsLeadIdx_('Health') - 1] || '')
      });
    }
  }

  var lastMd = md.getLastRow();
  if (lastMd > 1) {
    var mv = md.getRange(2, 1, lastMd - 1, BDS_MARKETING_COLUMNS.length).getValues();
    for (var j = 0; j < mv.length; j++) {
      if (!bdsDateKey(mv[j][0])) continue;
      var row = {};
      for (var c = 0; c < BDS_MARKETING_COLUMNS.length; c++) {
        var val = mv[j][c];
        row[BDS_MARKETING_COLUMNS[c]] = (c === 0) ? bdsDateKey(val) : val;
      }
      out.marketing.push(row);
    }
  }

  var lastRaw = raw.getLastRow();
  if (lastRaw > 1) {
    var rv = raw.getRange(2, 1, lastRaw - 1, BDS_RAW_ADS_COLUMNS.length).getValues();
    for (var k = 0; k < rv.length; k++) {
      if (!bdsDateKey(rv[k][0])) continue;
      out.raw_ads.push({
        date: bdsDateKey(rv[k][0]),
        platform: String(rv[k][1] || ''),
        campaign_id: String(rv[k][2] || ''),
        campaign: String(rv[k][3] || ''),
        spend: bdsNum(rv[k][4]),
        impressions: bdsNum(rv[k][5]),
        clicks: bdsNum(rv[k][6])
      });
    }
  }

  /* Разликата между „последен зает ред“ и „последен ред с данни“
     издава празни низове, останали от формула. */
  out.counts = {
    leads: out.leads.length,
    marketing: out.marketing.length,
    raw_ads: out.raw_ads.length,
    marketing_last_row: Math.max(0, lastMd - 1),
    phantom_rows: Math.max(0, (lastMd - 1) - out.marketing.length)
  };
  return out;
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
