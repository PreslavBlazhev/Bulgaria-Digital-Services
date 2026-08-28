/* ============================================================
   BDS Operations — САМОПРОВЕРКА НА ЖИВО (QaTest.gs)
   ------------------------------------------------------------
   Пусни функцията `runBdsSelfTest` от редактора. Тя минава цялото
   пътуване на една заявка през истинската таблица:

     заявка от сайта → New → Qualified → оферта → Proposal Sent
     → Won → приход в Marketing Daily → CAC и ROAS
     → преизчисляване два пъти → изтриване → чиста таблица

   и накрая изтрива всичко след себе си.

   Защо на живо, а не само в Node: тестовете в tools/test-*.mjs
   проверяват логиката. Те не могат да проверят дали падащото меню
   приема стойността, дали onEdit наистина се закача и дали
   формулата в клетката смята същото, което смята кодът. Това може
   само таблицата.

   Тестът работи с Lead ID, започващ с BDS-SELFTEST-. Ако нещо се
   счупи по средата и остане ред, търси този префикс.
   ============================================================ */

var QA_PREFIX = 'BDS-SELFTEST-';

/* Всички префикси, които значат „тестов ред, трие се“.
   BDS-QA- идва от tools/test-crm-integration.mjs --live.
   Истинските заявки са BDS-ГГГГ-XXXXXX и не съвпадат с нито един. */
var QA_PREFIXES = ['BDS-SELFTEST-', 'BDS-QA-'];

function bdsIsQaLeadId_(id) {
  var s = String(id || '').trim();
  for (var i = 0; i < QA_PREFIXES.length; i++) {
    if (s.indexOf(QA_PREFIXES[i]) === 0) return true;
  }
  return false;
}
var QA_CAMPAIGN = 'selftest_campaign';
var QA_CAMPAIGN_ID = '999000111';
var QA_DEAL_VALUE = 450;
var QA_SPEND = 36;

function runBdsSelfTest() {
  var log = [];
  var failures = 0;

  function ok(name, condition, detail) {
    if (condition) {
      log.push('  ok    ' + name + (detail ? '   [' + detail + ']' : ''));
    } else {
      failures++;
      log.push('  FAIL  ' + name + (detail ? '   [' + detail + ']' : ''));
    }
  }
  function note(text) { log.push(text); }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var leads = ss.getSheetByName(BDS_SHEETS.leads);
  var md = ss.getSheetByName(BDS_SHEETS.marketing);
  var raw = ss.getSheetByName(BDS_SHEETS.rawAds);
  var leadId = QA_PREFIX + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd-HHmmss');

  try {
    /* ---------- 0. изходно състояние ---------- */
    note('\n0. ИЗХОДНО СЪСТОЯНИЕ');
    var leadsBefore = bdsQaCountLeads_(leads);
    var mdRowsBefore = bdsQaLastDataRow_(md);
    ok('листовете съществуват', !!leads && !!md && !!raw);
    ok('заглавният ред на Leads е по схемата', bdsHeaderMatches_(leads, BDS_LEAD_COLUMNS));
    ok('заглавният ред на Marketing Daily е по схемата',
      bdsHeaderMatches_(md, BDS_MARKETING_COLUMNS));
    ok('заглавният ред на Raw Ads е по схемата',
      bdsHeaderMatches_(raw, BDS_RAW_ADS_COLUMNS));
    note('     заявки: ' + leadsBefore + ' · маркетинг редове: ' + mdRowsBefore);

    /* Marketing Daily не бива да е „пълен“ с празни редове — това беше
       следата от ARRAYFORMULA в заглавния ред. */
    ok('Marketing Daily няма фантомни редове',
      md.getLastRow() - 1 === mdRowsBefore,
      'getLastRow=' + md.getLastRow() + ' данни=' + mdRowsBefore);

    /* ---------- 1. заявка, както идва от сайта ---------- */
    note('\n1. ЗАЯВКА ОТ САЙТА (истинският doPost)');
    var payload = {
      lead_id: leadId,
      full_name: 'SELFTEST — не се обаждай',
      business_name: 'SELFTEST — този ред се трие сам',
      phone: '0000000000',
      email: 'selftest@example.invalid',
      service_interest: 'Тест',
      budget_range: 'няма',
      has_website: 'не',
      source_category: 'google_ads',
      source: 'google',
      medium: 'cpc',
      campaign: QA_CAMPAIGN,
      gclid: 'SELFTEST-GCLID',
      landing_page: '/restaurants',
      referrer: 'selftest',
      first_source_category: 'google_ads',
      first_source: 'google',
      first_medium: 'cpc',
      first_campaign: QA_CAMPAIGN,
      first_landing_page: '/restaurants',
      first_touch_at: new Date().toISOString()
    };
    var res1 = JSON.parse(doPost({ postData: { contents: JSON.stringify(payload) } }).getContent());
    ok('заявката се записва', res1.ok === true && !res1.duplicate, JSON.stringify(res1));
    ok('върнатият Lead ID е същият', res1.lead_id === leadId);

    var row = bdsQaFindRow_(leads, leadId);
    ok('редът се намира в листа', row > 1, 'ред ' + row);
    if (row < 2) throw new Error('няма ред — тестът не може да продължи');

    var v = bdsQaRead_(leads, row);
    ok('Status = New', v['Status'] === 'New', String(v['Status']));
    ok('Lead Owner = Преслав Блажев', v['Lead Owner'] === 'Преслав Блажев', String(v['Lead Owner']));
    ok('Next Action = Първо обаждане', v['Next Action'] === 'Първо обаждане', String(v['Next Action']));
    ok('Client = Не', v['Client'] === 'Не', String(v['Client']));
    ok('Source Category = google_ads', v['Source Category'] === 'google_ads');
    ok('Campaign = ' + QA_CAMPAIGN, v['Campaign'] === QA_CAMPAIGN);
    ok('GCLID е пренесен', v['GCLID'] === 'SELFTEST-GCLID');
    ok('първото докосване е пренесено', v['First Source Category'] === 'google_ads');
    ok('Created Date е попълнена', !!bdsDateKey(v['Created Date']), String(v['Created Date']));
    ok('Follow-up Date НЕ е измислена', !bdsDateKey(v['Follow-up Date']));
    ok('Health е празна — New с Next Action е наред', String(v['Health'] || '') === '');

    /* ---------- 2. дублиране ---------- */
    note('\n2. ЗАЩИТА ОТ ДУБЛИРАНЕ');
    var res2 = JSON.parse(doPost({ postData: { contents: JSON.stringify(payload) } }).getContent());
    ok('втори опит връща duplicate', res2.ok === true && res2.duplicate === true, JSON.stringify(res2));
    ok('сочи същия ред', res2.row === row);
    ok('няма втори ред', bdsQaCountLeads_(leads) === leadsBefore + 1);

    /* ---------- 3. рекламен разход ---------- */
    note('\n3. РЕКЛАМЕН РАЗХОД (Raw Ads)');
    var today = bdsDateKey(v['Created Date']);
    var importRes = bdsImportAdsRows([{
      date: today, platform: 'Google Ads',
      campaignId: QA_CAMPAIGN_ID, campaign: QA_CAMPAIGN,
      spend: QA_SPEND, impressions: 2400, clicks: 96, conversions: 1
    }]);
    ok('разходът се внася', importRes.ok === true, JSON.stringify(importRes));

    var mdRow = bdsQaFindMdRow_(md, today, 'Google Ads', QA_CAMPAIGN_ID);
    ok('маркетинговият ред съществува', mdRow > 1, 'ред ' + mdRow);
    var m = bdsQaReadMd_(md, mdRow);
    ok('заявката се лепна за реда с разход — не стана втори ред',
      bdsNum(m['Leads']) === 1 && bdsNum(m['Spend']) === QA_SPEND,
      'Leads=' + m['Leads'] + ' Spend=' + m['Spend']);
    ok('Campaign ID дойде от рекламните данни', String(m['Campaign ID']) === QA_CAMPAIGN_ID);
    ok('CPL = 36 / 1 = 36', bdsNum(m['CPL']) === 36, String(m['CPL']));
    ok('CAC още няма стойност — няма клиент', String(m['CAC'] || '') === '', String(m['CAC']));
    ok('ROAS е 0 — разход без приход', bdsNum(m['ROAS']) === 0, String(m['ROAS']));
    ok('принос = −36', bdsNum(m['Marketing Contribution']) === -QA_SPEND, String(m['Marketing Contribution']));

    /* ---------- 4. Qualified ---------- */
    note('\n4. QUALIFIED (през истинския onEdit)');
    bdsQaSetStatus_(leads, row, 'Qualified');
    v = bdsQaRead_(leads, row);
    ok('статусът се прие от падащото меню', v['Status'] === 'Qualified');
    ok('Health иска Follow-up Date', /Follow-up/.test(String(v['Health'])), String(v['Health']));
    bdsQaSet_(leads, row, 'Follow-up Date', new Date());
    bdsQaSet_(leads, row, 'Next Action', 'Изпращане на оферта');
    applyLeadAutomation_(leads, row);
    v = bdsQaRead_(leads, row);
    ok('Health се изчиства след попълване', String(v['Health'] || '') === '', String(v['Health']));
    ok('Qualified не прави клиент', v['Client'] === 'Не');

    /* ---------- 5. оферта ---------- */
    note('\n5. PROPOSAL SENT');
    bdsQaSetStatus_(leads, row, 'Proposal Sent');
    v = bdsQaRead_(leads, row);
    var propId = String(v['Proposal ID'] || '');
    ok('номерът се издава сам', bdsIsProposalId(propId), propId);
    ok('номерът е за тази година',
      propId.indexOf('BDS-PROP-' + new Date().getFullYear() + '-') === 0, propId);
    ok('датата се слага сама', !!bdsDateKey(v['Proposal Date']), String(v['Proposal Date']));
    var expectedValidity = bdsProposalValidity(v['Proposal Date']);
    ok('валидността е +14 календарни дни',
      bdsDateKey(v['Proposal Validity']) === expectedValidity,
      bdsDateKey(v['Proposal Validity']) + ' спрямо очаквано ' + expectedValidity);
    ok('Health иска стойност на офертата',
      /Proposal Value/.test(String(v['Health'])), String(v['Health']));
    bdsQaSet_(leads, row, 'Proposal Value', QA_DEAL_VALUE);
    applyLeadAutomation_(leads, row);
    v = bdsQaRead_(leads, row);
    ok('след попълване Health е чиста', String(v['Health'] || '') === '', String(v['Health']));

    /* ---------- 6. Won ---------- */
    note('\n6. WON');
    bdsQaSet_(leads, row, 'Deal Value', QA_DEAL_VALUE);
    bdsQaSetStatus_(leads, row, 'Won');
    v = bdsQaRead_(leads, row);
    ok('Client = Да', v['Client'] === 'Да', String(v['Client']));
    ok('Won/Lost = Won', v['Won/Lost'] === 'Won', String(v['Won/Lost']));
    ok('Close Date се попълва сама', !!bdsDateKey(v['Close Date']), String(v['Close Date']));
    ok('Deal Value стои', bdsNum(v['Deal Value']) === QA_DEAL_VALUE);
    ok('Health е чиста', String(v['Health'] || '') === '', String(v['Health']));

    /* Won без стойност трябва да вика — проверяваме и това. */
    bdsQaSet_(leads, row, 'Deal Value', '');
    applyLeadAutomation_(leads, row);
    ok('Won без Deal Value се маркира',
      /Deal Value/.test(String(bdsQaRead_(leads, row)['Health'])));
    bdsQaSet_(leads, row, 'Deal Value', QA_DEAL_VALUE);
    applyLeadAutomation_(leads, row);

    /* ---------- 7. приходът стига до маркетинга ---------- */
    note('\n7. ПРИХОДЪТ В MARKETING DAILY');
    rebuildMarketingFromCrm();
    mdRow = bdsQaFindMdRow_(md, today, 'Google Ads', QA_CAMPAIGN_ID);
    m = bdsQaReadMd_(md, mdRow);
    ok('Clients = 1', bdsNum(m['Clients']) === 1, String(m['Clients']));
    ok('Revenue = 450', bdsNum(m['Revenue']) === QA_DEAL_VALUE, String(m['Revenue']));
    ok('CAC = 36 / 1 = 36', bdsNum(m['CAC']) === 36, String(m['CAC']));
    ok('ROAS = 450 / 36 = 12.5', Math.abs(bdsNum(m['ROAS']) - 12.5) < 1e-9, String(m['ROAS']));
    ok('принос = 450 − 36 = 414',
      Math.abs(bdsNum(m['Marketing Contribution']) - 414) < 1e-9,
      String(m['Marketing Contribution']));
    ok('приходът стои на датата на ЗАЯВКАТА, не на затварянето',
      bdsDateKey(m['Date']) === today, bdsDateKey(m['Date']) + ' спрямо ' + today);

    /* ---------- 8. второ преизчисляване ---------- */
    note('\n8. ВТОРО И ТРЕТО ПРЕИЗЧИСЛЯВАНЕ');
    var snapshot = JSON.stringify(bdsQaReadMd_(md, mdRow));
    rebuildMarketingFromCrm();
    rebuildMarketingFromCrm();
    var after = bdsQaReadMd_(md, mdRow);
    ok('таблицата е буквално същата', JSON.stringify(after) === snapshot);
    ok('клиентите остават 1, не стават 3', bdsNum(after['Clients']) === 1, String(after['Clients']));
    ok('приходът остава 450, не 1350', bdsNum(after['Revenue']) === QA_DEAL_VALUE, String(after['Revenue']));
    ok('разходът не се натрупва', bdsNum(after['Spend']) === QA_SPEND, String(after['Spend']));

    /* ---------- 9. изтриване ---------- */
    note('\n9. ИЗТРИВАНЕ И ПОЧИСТВАНЕ');
    leads.deleteRow(row);
    rebuildMarketingFromCrm();
    mdRow = bdsQaFindMdRow_(md, today, 'Google Ads', QA_CAMPAIGN_ID);
    ok('редът остава — разходът е бил реален', mdRow > 1);
    if (mdRow > 1) {
      m = bdsQaReadMd_(md, mdRow);
      ok('заявките падат на 0', bdsNum(m['Leads']) === 0, String(m['Leads']));
      ok('клиентите падат на 0', bdsNum(m['Clients']) === 0, String(m['Clients']));
      ok('приходът пада на 0', bdsNum(m['Revenue']) === 0, String(m['Revenue']));
      ok('разходът остава непокътнат', bdsNum(m['Spend']) === QA_SPEND, String(m['Spend']));
    }

    bdsQaDeleteRawAds_(raw, today, QA_CAMPAIGN_ID);
    rebuildMarketingFromCrm();
    ok('след премахване на тестовия разход редът си отива',
      bdsQaFindMdRow_(md, today, 'Google Ads', QA_CAMPAIGN_ID) < 2);
    ok('заявките са колкото преди теста', bdsQaCountLeads_(leads) === leadsBefore,
      bdsQaCountLeads_(leads) + ' спрямо ' + leadsBefore);
    ok('маркетинговите редове са колкото преди теста',
      bdsQaLastDataRow_(md) === mdRowsBefore,
      bdsQaLastDataRow_(md) + ' спрямо ' + mdRowsBefore);

  } catch (err) {
    failures++;
    log.push('\n  ГРЕШКА: ' + err + (err.stack ? '\n' + err.stack : ''));
  } finally {
    /* Каквото и да е станало — не оставяме следа. */
    try { bdsQaCleanup_(ss, leadId); } catch (e) { log.push('  почистването не мина: ' + e); }
  }

  var head = failures === 0
    ? '\nВСИЧКО МИНАВА — затвореният кръг работи на живо.\n'
    : '\n' + failures + ' ПРОВАЛА. Виж редовете с FAIL по-горе.\n';
  var report = 'BDS — самопроверка на живо\n' +
    '==========================\n' + log.join('\n') + '\n' + head;
  Logger.log(report);
  try { SpreadsheetApp.getUi().alert(report.slice(0, 1400)); } catch (e) {}
  return report;
}

/* ------------------------------------------------------------
   Помощни — само за теста
   ------------------------------------------------------------ */

function bdsQaCountLeads_(sheet) {
  var last = sheet.getLastRow();
  if (last < 2) return 0;
  var ids = sheet.getRange(2, 1, last - 1, 1).getValues();
  var n = 0;
  for (var i = 0; i < ids.length; i++) if (String(ids[i][0]).trim()) n++;
  return n;
}

/** Последният ред с ДАННИ, а не последният ред, който Google смята за
    зает. Разликата издава празни низове, останали от формула. */
function bdsQaLastDataRow_(sheet) {
  var last = sheet.getLastRow();
  if (last < 2) return 0;
  var dates = sheet.getRange(2, 1, last - 1, 1).getValues();
  var n = 0;
  for (var i = 0; i < dates.length; i++) if (String(dates[i][0]).trim()) n++;
  return n;
}

function bdsQaFindRow_(sheet, leadId) {
  var last = sheet.getLastRow();
  if (last < 2) return 0;
  var ids = sheet.getRange(2, 1, last - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]).trim() === leadId) return i + 2;
  }
  return 0;
}

function bdsQaRead_(sheet, row) {
  var values = sheet.getRange(row, 1, 1, BDS_LEAD_COLUMNS.length).getValues()[0];
  var out = {};
  for (var i = 0; i < BDS_LEAD_COLUMNS.length; i++) out[BDS_LEAD_COLUMNS[i]] = values[i];
  return out;
}

function bdsQaSet_(sheet, row, column, value) {
  sheet.getRange(row, bdsLeadIdx_(column)).setValue(value);
}

/** Смяна на статус ПРЕЗ onEdit — както става, когато човек го пипне.
    Така се проверява и че тригерът е закачен, не само логиката. */
function bdsQaSetStatus_(sheet, row, status) {
  var col = bdsLeadIdx_('Status');
  sheet.getRange(row, col).setValue(status);
  SpreadsheetApp.flush();
  onEdit({ range: sheet.getRange(row, col) });
  SpreadsheetApp.flush();
}

function bdsQaFindMdRow_(sheet, dateKey, channel, campaignId) {
  var last = sheet.getLastRow();
  if (last < 2) return 0;
  var values = sheet.getRange(2, 1, last - 1, 4).getValues();
  for (var i = 0; i < values.length; i++) {
    if (bdsDateKey(values[i][0]) === dateKey &&
        String(values[i][1]).trim() === channel &&
        String(values[i][2]).trim() === String(campaignId)) return i + 2;
  }
  return 0;
}

function bdsQaReadMd_(sheet, row) {
  var values = sheet.getRange(row, 1, 1, BDS_MARKETING_COLUMNS.length).getValues()[0];
  var out = {};
  for (var i = 0; i < BDS_MARKETING_COLUMNS.length; i++) out[BDS_MARKETING_COLUMNS[i]] = values[i];
  return out;
}

function bdsQaDeleteRawAds_(sheet, dateKey, campaignId) {
  var last = sheet.getLastRow();
  if (last < 2) return;
  var values = sheet.getRange(2, 1, last - 1, 3).getValues();
  for (var i = values.length - 1; i >= 0; i--) {
    if (bdsDateKey(values[i][0]) === dateKey &&
        String(values[i][2]).trim() === String(campaignId)) {
      sheet.deleteRow(i + 2);
    }
  }
}

/** Маха всяка следа от теста — включително от прекъснато пускане. */
function bdsQaCleanup_(ss, leadId) {
  var leads = ss.getSheetByName(BDS_SHEETS.leads);
  var raw = ss.getSheetByName(BDS_SHEETS.rawAds);
  var removed = 0;

  var last = leads.getLastRow();
  if (last > 1) {
    var ids = leads.getRange(2, 1, last - 1, 1).getValues();
    for (var i = ids.length - 1; i >= 0; i--) {
      if (bdsIsQaLeadId_(ids[i][0])) { leads.deleteRow(i + 2); removed++; }
    }
  }
  var lastRaw = raw.getLastRow();
  if (lastRaw > 1) {
    var rows = raw.getRange(2, 1, lastRaw - 1, 3).getValues();
    for (var j = rows.length - 1; j >= 0; j--) {
      if (String(rows[j][2]).trim() === QA_CAMPAIGN_ID) { raw.deleteRow(j + 2); removed++; }
    }
  }
  if (removed) rebuildMarketingFromCrm();
  return removed;
}

/** Ръчна аварийна команда, ако тестът е прекъснат по средата. */
function cleanupSelfTestRows() {
  var n = bdsQaCleanup_(SpreadsheetApp.getActiveSpreadsheet(), '');
  var msg = 'Премахнати тестови редове: ' + n;
  Logger.log(msg);
  try { SpreadsheetApp.getUi().alert(msg); } catch (e) {}
  return msg;
}
