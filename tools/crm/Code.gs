/* ============================================================
   BDS CRM — Google Apps Script Web App
   ------------------------------------------------------------
   Приема заявките от формата на /restaurants и ги записва като
   редове в Google Sheet. Това е CRM-ът: таблицата е базата,
   този скрипт е входът към нея.

   Защо Apps Script, а не директно към Airtable/HubSpot:
   сайтът е статичен. Всеки друг вариант иска API ключ, а ключ в
   браузъра е публичен ключ. Web App адресът тук не е тайна — той
   само ДОБАВЯ редове и не връща нищо от базата.

   Инсталация: виж SETUP.md в същата папка.
   ============================================================ */

/* Име на листа, в който влизат заявките. */
var SHEET_NAME = 'Leads';

/* Ред 1 на листа. Редът на колоните ТУК определя реда в таблицата.
   Добавяй нови колони само НАКРАЯ — иначе старите редове се разместват. */
var COLUMNS = [
  'Lead ID',
  'Created Date',
  'Lead Owner',
  'Status',
  'Contact Name',
  'Business Name',
  'Phone',
  'Email',
  'Service Interest',
  'Budget',
  'Has Website',
  'Website URL',
  'Source Category',
  'Source',
  'Medium',
  'Campaign',
  'Content',
  'Term',
  'GCLID',
  'Landing Page',
  'Referrer',
  'First Source Category',
  'First Source',
  'First Medium',
  'First Campaign',
  'First Landing Page',
  'First Touch At',
  'Current Setup',
  'Main Problem',
  'Desired Outcome',
  'Timeline',
  'Decision Maker',
  'Next Action',
  'Follow-up Date',
  'Last Contact Date',
  'Notes',
  'Deal Value',
  'Close Date',
  'Won/Lost',
  'Lost Reason',
  'Client',
  'Proposal ID',
  'Proposal Date',
  'Proposal Value',
  'Proposal Validity'
];

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

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  /* Заглавен ред — създава се веднъж и не се пипа после. */
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(COLUMNS);
    sheet.getRange(1, 1, 1, COLUMNS.length).setFontWeight('bold');
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
    /* Две заявки в една и съща секунда иначе биха писали на един и същи ред. */
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

    var sheet = getSheet_();
    var leadId = String(body.lead_id || '').trim();

    var existing = findRowByLeadId_(sheet, leadId);
    if (existing) {
      return json_({ ok: true, duplicate: true, lead_id: leadId, row: existing });
    }

    var row = [];
    for (var i = 0; i < COLUMNS.length; i++) {
      var col = COLUMNS[i];
      if (col === 'Created Date') { row.push(new Date()); continue; }
      if (col === 'Lead Owner') { row.push('Преслав Блажев'); continue; }
      if (col === 'Status') { row.push('New'); continue; }
      if (col === 'Next Action') { row.push('Първо обаждане'); continue; }
      if (col === 'Client') { row.push('Не'); continue; }
      var key = FROM_SITE[col];
      row.push(key && body[key] != null ? String(body[key]) : '');
    }

    sheet.appendRow(row);
    return json_({ ok: true, lead_id: leadId, row: sheet.getLastRow() });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/** Проверка, че адресът работи: отвори го в браузър. */
function doGet() {
  var sheet = getSheet_();
  return json_({
    ok: true,
    service: 'BDS CRM',
    sheet: SHEET_NAME,
    leads: Math.max(0, sheet.getLastRow() - 1)
  });
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
