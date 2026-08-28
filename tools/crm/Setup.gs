/* ============================================================
   BDS Operations — ИЗГРАЖДАНЕ НА ТАБЛИЦАТА (Setup.gs)
   ------------------------------------------------------------
   Едно пускане на setupBdsOperations() построява цялата таблица:
   листове, заглавни редове, падащи менюта, формули, табло.

   Защо скрипт, а не ръчно: таблица, построена на ръка, не може да
   се възстанови еднакво втори път. Тази може. Функцията е
   безопасна за повторно пускане — не трие данни, само дописва и
   поправя схемата.
   ============================================================ */

/** ГЛАВНАТА ФУНКЦИЯ. Пусни я веднъж след поставяне на кода.
    Може да се пуска и после — данните не се пипат. */
function setupBdsOperations() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (ss.getName() === 'Untitled spreadsheet' || ss.getName() === 'Неозаглавена електронна таблица') {
    ss.rename('BDS Operations');
  }

  setupLeadsSheet_(ss);
  setupRawAdsSheet_(ss);
  setupMarketingSheet_(ss);
  setupConfigSheet_(ss);
  setupDashboardSheet_(ss);
  removeDefaultSheet_(ss);
  orderSheets_(ss);

  SpreadsheetApp.flush();
  var msg = 'BDS Operations е готова.\n\n' +
    'Листове: ' + ss.getSheets().map(function (s) { return s.getName(); }).join(', ') +
    '\n\nСледваща стъпка: Deploy → New deployment → Web app.';
  Logger.log(msg);
  try { SpreadsheetApp.getUi().alert(msg); } catch (e) { /* пуснато без UI */ }
  return msg;
}

/* ------------------------------------------------------------
   Помощни
   ------------------------------------------------------------ */

function bdsSheet_(ss, name) {
  var sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  return sh;
}

/** Заглавен ред: пише липсващите колони, НЕ мести съществуващите. */
function bdsEnsureHeader_(sheet, columns) {
  /* Нов лист идва с 26 колони. Leads иска 46 — без това дописване
     първото пускане би гръмнало с „range out of bounds“. */
  if (sheet.getMaxColumns() < columns.length) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), columns.length - sheet.getMaxColumns());
  }
  var width = Math.max(sheet.getLastColumn(), 1);
  var current = sheet.getRange(1, 1, 1, width).getValues()[0];
  var changed = false;
  for (var i = 0; i < columns.length; i++) {
    if (String(current[i] || '') !== columns[i]) changed = true;
  }
  if (changed) {
    sheet.getRange(1, 1, 1, columns.length).setValues([columns]);
  }
  sheet.getRange(1, 1, 1, columns.length)
    .setFontWeight('bold')
    .setBackground('#1f2937')
    .setFontColor('#ffffff')
    .setVerticalAlignment('middle');
  sheet.setFrozenRows(1);
  if (sheet.getMaxColumns() > columns.length) {
    sheet.deleteColumns(columns.length + 1, sheet.getMaxColumns() - columns.length);
  }
  return sheet;
}

function bdsColLetter_(index1) {
  var s = '';
  var n = index1;
  while (n > 0) {
    var r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function bdsColOf_(columns, name) {
  for (var i = 0; i < columns.length; i++) if (columns[i] === name) return i + 1;
  throw new Error('Няма колона ' + name);
}

/* ------------------------------------------------------------
   Leads
   ------------------------------------------------------------ */

function setupLeadsSheet_(ss) {
  var sh = bdsSheet_(ss, BDS_SHEETS.leads);
  bdsEnsureHeader_(sh, BDS_LEAD_COLUMNS);

  var C = BDS_LEAD_COLUMNS;
  var lastRow = sh.getMaxRows();
  var dataRows = Math.max(lastRow - 1, 1);

  /* Status — истинско падащо меню, не свободен текст. */
  var statusCol = bdsColOf_(C, 'Status');
  sh.getRange(2, statusCol, dataRows, 1).setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireValueInList(BDS_STATUSES, true)
      .setAllowInvalid(false)
      .setHelpText('Само тези девет статуса. Друг статус означава друг процес.')
      .build()
  );

  /* Won/Lost и Client се попълват от автоматиката, но държим менюто —
     ако някой пише на ръка, поне да пише позволеното. */
  var wlCol = bdsColOf_(C, 'Won/Lost');
  sh.getRange(2, wlCol, dataRows, 1).setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireValueInList(['Won', 'Lost'], true).setAllowInvalid(false).build()
  );
  var clientCol = bdsColOf_(C, 'Client');
  sh.getRange(2, clientCol, dataRows, 1).setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireValueInList(['Да', 'Не'], true).setAllowInvalid(false).build()
  );

  /* Формати: дати като дати, пари като пари. Иначе сортирането лъже. */
  ['Created Date', 'First Touch At'].forEach(function (n) {
    sh.getRange(2, bdsColOf_(C, n), dataRows, 1).setNumberFormat('dd.mm.yyyy hh:mm');
  });
  ['Follow-up Date', 'Last Contact Date', 'Close Date', 'Proposal Date', 'Proposal Validity'].forEach(function (n) {
    sh.getRange(2, bdsColOf_(C, n), dataRows, 1).setNumberFormat('dd.mm.yyyy');
  });
  ['Deal Value', 'Proposal Value'].forEach(function (n) {
    sh.getRange(2, bdsColOf_(C, n), dataRows, 1).setNumberFormat('#,##0.00 "€"');
  });

  /* Health — колоната, която вика. Пише се от Sales.gs при всяка
     редакция и се маркира в червено, докато не е празна. */
  var healthCol = bdsColOf_(C, 'Health');
  var healthLetter = bdsColLetter_(healthCol);
  var statusLetter = bdsColLetter_(statusCol);

  var rules = [];
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=AND($A2<>"",LEN($' + healthLetter + '2)>0)')
    .setBackground('#fde8e8')
    .setFontColor('#b91c1c')
    .setRanges([sh.getRange(2, 1, dataRows, C.length)])
    .build());
  /* Спечелена заявка — зелено. Загубена — сиво. Видимо от два метра. */
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=$' + statusLetter + '2="Won"')
    .setBackground('#e7f6ec')
    .setRanges([sh.getRange(2, 1, dataRows, C.length)])
    .build());
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=$' + statusLetter + '2="Lost"')
    .setBackground('#f3f4f6')
    .setFontColor('#6b7280')
    .setRanges([sh.getRange(2, 1, dataRows, C.length)])
    .build());
  sh.setConditionalFormatRules(rules);

  sh.setColumnWidth(1, 140);
  sh.setColumnWidth(bdsColOf_(C, 'Business Name'), 180);
  sh.setColumnWidth(healthCol, 260);
  return sh;
}

/* ------------------------------------------------------------
   Raw Ads — суровата истина от рекламните платформи.
   ------------------------------------------------------------ */

function setupRawAdsSheet_(ss) {
  var sh = bdsSheet_(ss, BDS_SHEETS.rawAds);
  bdsEnsureHeader_(sh, BDS_RAW_ADS_COLUMNS);
  var dataRows = Math.max(sh.getMaxRows() - 1, 1);

  sh.getRange(2, 1, dataRows, 1).setNumberFormat('dd.mm.yyyy');
  sh.getRange(2, 5, dataRows, 1).setNumberFormat('#,##0.00 "€"');
  sh.getRange(2, 6, dataRows, 3).setNumberFormat('#,##0');
  sh.getRange(2, 9, dataRows, 1).setNumberFormat('dd.mm.yyyy hh:mm');

  /* Platform е същият етикет като Channel — така съединяването с
     Marketing Daily става без превод. */
  sh.getRange(2, 2, dataRows, 1).setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireValueInList(BDS_CHANNELS, true)
      .setAllowInvalid(false)
      .setHelpText('Platform = Channel. Ръчно въведен разход също влиза тук.')
      .build()
  );
  sh.setColumnWidth(4, 220);
  return sh;
}

/* ------------------------------------------------------------
   Marketing Daily — слой за анализ, не за въвеждане.

   Три от колоните са формули в ЗАГЛАВНИЯ ред. Затова никой запис
   на данни не може да ги изтрие: скриптовете пишат от ред 2 надолу
   и никога не пипат ред 1.
   ------------------------------------------------------------ */

function setupMarketingSheet_(ss) {
  var sh = bdsSheet_(ss, BDS_SHEETS.marketing);

  /* Първата версия слагаше ARRAYFORMULA в заглавния ред. Тя пълнеше
     хиляда реда с празни низове и getLastRow() почваше да връща 1000.
     Тук се чисти следата от нея, ако листът е строен по стария начин.
     Изведените колони вече се пишат ред по ред от Marketing.gs. */
  sh.getRange(1, 1, 1, sh.getMaxColumns()).clearContent();
  bdsEnsureHeader_(sh, BDS_MARKETING_COLUMNS);
  for (var i = 0; i < BDS_MD_FORMULA_COLS.length; i++) {
    var col = BDS_MD_FORMULA_COLS[i] + 1;
    sh.getRange(2, col, sh.getMaxRows() - 1, 1).clearContent();
  }

  var dataRows = Math.max(sh.getMaxRows() - 1, 1);
  sh.getRange(2, 1, dataRows, 1).setNumberFormat('dd.mm.yyyy');
  sh.getRange(2, 5, dataRows, 1).setNumberFormat('#,##0.00 "€"');    /* Spend */
  sh.getRange(2, 6, dataRows, 2).setNumberFormat('#,##0');           /* Impr, Clicks */
  sh.getRange(2, 8, dataRows, 1).setNumberFormat('0.00%');           /* CTR */
  sh.getRange(2, 9, dataRows, 1).setNumberFormat('#,##0.00 "€"');    /* CPC */
  sh.getRange(2, 10, dataRows, 1).setNumberFormat('#,##0');          /* Leads */
  sh.getRange(2, 11, dataRows, 1).setNumberFormat('#,##0.00 "€"');   /* CPL */
  sh.getRange(2, 12, dataRows, 1).setNumberFormat('#,##0');          /* Clients */
  sh.getRange(2, 13, dataRows, 1).setNumberFormat('#,##0.00 "€"');   /* CAC */
  sh.getRange(2, 14, dataRows, 1).setNumberFormat('#,##0.00 "€"');   /* Revenue */
  sh.getRange(2, 15, dataRows, 1).setNumberFormat('0.00');           /* ROAS */
  sh.getRange(2, 16, dataRows, 1).setNumberFormat('#,##0.00 "€"');   /* Contribution */

  sh.getRange(2, 2, dataRows, 1).setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireValueInList(BDS_CHANNELS, true).setAllowInvalid(false).build()
  );

  /* Отрицателен принос — червено. Числото не бива да се чете спокойно. */
  sh.setConditionalFormatRules([
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=AND($A2<>"",N($P2)<0)')
      .setFontColor('#b91c1c')
      .setRanges([sh.getRange(2, 16, dataRows, 1)])
      .build()
  ]);
  sh.setColumnWidth(4, 200);
  sh.setColumnWidth(16, 170);
  return sh;
}

/* ------------------------------------------------------------
   Config — таксономията и ръчните съответствия, на видимо място.
   ------------------------------------------------------------ */

function setupConfigSheet_(ss) {
  var sh = bdsSheet_(ss, BDS_SHEETS.config);
  sh.clear();

  var rows = [];
  rows.push(['BDS Operations — конфигурация', '', '', '']);
  rows.push(['Не се пипа без причина. Тези стойности се четат от скриптовете.', '', '', '']);
  rows.push(['', '', '', '']);
  rows.push(['1. Канали — source_category от сайта → Channel в тракера', '', '', '']);
  rows.push(['source_category', 'Channel', '', '']);
  for (var i = 0; i < BDS_CHANNELS.length; i++) {
    var label = BDS_CHANNELS[i];
    var key = '';
    for (var k in BDS_CHANNEL_MAP) {
      if (BDS_CHANNEL_MAP[k] === label) { key = k; break; }
    }
    rows.push([key, label, '', '']);
  }
  rows.push(['', '', '', '']);
  rows.push(['2. Кампании — utm_campaign → Campaign ID', '', '', '']);
  rows.push(['Попълва се САМО ако utm_campaign се различава от името на', '', '', '']);
  rows.push(['кампанията в рекламния акаунт. При съвпадение връзката е автоматична.', '', '', '']);
  rows.push(['utm_campaign', 'Campaign ID', '', '']);
  rows.push(['', '', '', '']);
  rows.push(['', '', '', '']);
  rows.push(['3. Модел на датата', '', '', '']);
  rows.push(['Разходът се води по датата на рекламата.', '', '', '']);
  rows.push(['Заявката и приходът от нея се водят по датата на ПОЯВЯВАНЕ', '', '', '']);
  rows.push(['на заявката и по кампанията, която я е довела — не по Close Date.', '', '', '']);
  rows.push(['Отчет по Close Date стои отделно в Dashboard.', '', '', '']);
  rows.push(['', '', '', '']);
  rows.push(['4. Източник на истината', '', '', '']);
  rows.push(['Продажби:', 'лист Leads', '', '']);
  rows.push(['Рекламни разходи:', 'лист Raw Ads', '', '']);
  rows.push(['Анализ:', 'лист Marketing Daily (не се въвежда на ръка)', '', '']);
  rows.push(['Архив:', 'BDS_Marketing_Performance_Tracker.xlsx — само за справка', '', '']);

  sh.getRange(1, 1, rows.length, 4).setValues(rows);
  sh.getRange('A1').setFontSize(14).setFontWeight('bold');
  [4, 8, 15, 21].forEach(function (r) { sh.getRange(r, 1).setFontWeight('bold'); });
  sh.getRange(5, 1, 1, 2).setFontWeight('bold').setBackground('#e5e7eb');
  sh.getRange(12, 1, 1, 2).setFontWeight('bold').setBackground('#e5e7eb');
  sh.setColumnWidth(1, 380);
  sh.setColumnWidth(2, 320);
  sh.setFrozenRows(0);
  return sh;
}

/** Ръчните съответствия utm_campaign → Campaign ID от лист Config. */
function bdsReadCampaignOverrides_(ss) {
  var sh = ss.getSheetByName(BDS_SHEETS.config);
  if (!sh) return {};
  var values = sh.getRange(1, 1, Math.max(sh.getLastRow(), 1), 2).getValues();
  var start = -1;
  for (var i = 0; i < values.length; i++) {
    if (String(values[i][0]).trim() === 'utm_campaign') { start = i + 1; break; }
  }
  if (start < 0) return {};
  var out = {};
  for (var j = start; j < values.length; j++) {
    var name = String(values[j][0] || '').trim();
    var id = String(values[j][1] || '').trim();
    if (!name) break;                 /* празен ред = край на таблицата */
    if (id) out[name] = id;
  }
  return out;
}

/* ------------------------------------------------------------
   Dashboard — само показателите, които водят до решение.
   ------------------------------------------------------------ */

function setupDashboardSheet_(ss) {
  var sh = bdsSheet_(ss, BDS_SHEETS.dashboard);
  sh.clear();
  var MD = "'" + BDS_SHEETS.marketing + "'";
  var LD = "'" + BDS_SHEETS.leads + "'";
  /* Буквите на колоните в Leads се смятат от схемата, а не се пишат
     наизуст — добавена колона иначе би оставила таблото да сочи в
     съседната клетка и никой не би забелязал. */
  var LDEAL = bdsColLetter_(bdsColOf_(BDS_LEAD_COLUMNS, 'Deal Value'));
  var LSTATUS = bdsColLetter_(bdsColOf_(BDS_LEAD_COLUMNS, 'Status'));
  var LBIZ = bdsColLetter_(bdsColOf_(BDS_LEAD_COLUMNS, 'Business Name'));
  var LHEALTH = bdsColLetter_(bdsColOf_(BDS_LEAD_COLUMNS, 'Health'));

  sh.getRange('A1').setValue('BDS — маркетинг и продажби');
  sh.getRange('A1').setFontSize(16).setFontWeight('bold');
  sh.getRange('A2').setValue('Всичко се смята от Marketing Daily и Leads. Тук не се въвежда нищо.');
  sh.getRange('A2').setFontColor('#6b7280');

  sh.getRange('A4').setValue('Период');
  sh.getRange('B4').setValue('От');
  sh.getRange('C4').setValue('До');
  sh.getRange('B4:C4').setFontWeight('bold');
  sh.getRange('B5').setFormula('=IFERROR(MIN(' + MD + '!$A$2:$A),"")');
  sh.getRange('C5').setFormula('=IFERROR(MAX(' + MD + '!$A$2:$A),"")');
  sh.getRange('B5:C5').setNumberFormat('dd.mm.yyyy');
  sh.getRange('A5').setValue('Празно = още няма данни').setFontColor('#6b7280');

  /* --- Общо --- */
  var kpi = [
    ['Spend', '=SUM(' + MD + '!$E$2:$E)', '#,##0.00 "€"'],
    ['Impressions', '=SUM(' + MD + '!$F$2:$F)', '#,##0'],
    ['Clicks', '=SUM(' + MD + '!$G$2:$G)', '#,##0'],
    ['CTR', '=IFERROR(SUM(' + MD + '!$G$2:$G)/SUM(' + MD + '!$F$2:$F),"—")', '0.00%'],
    ['CPC', '=IFERROR(SUM(' + MD + '!$E$2:$E)/SUM(' + MD + '!$G$2:$G),"—")', '#,##0.00 "€"'],
    ['Leads', '=SUM(' + MD + '!$J$2:$J)', '#,##0'],
    ['CPL', '=IFERROR(SUM(' + MD + '!$E$2:$E)/SUM(' + MD + '!$J$2:$J),"—")', '#,##0.00 "€"'],
    ['Clients', '=SUM(' + MD + '!$L$2:$L)', '#,##0'],
    ['CAC', '=IFERROR(SUM(' + MD + '!$E$2:$E)/SUM(' + MD + '!$L$2:$L),"—")', '#,##0.00 "€"'],
    ['Revenue', '=SUM(' + MD + '!$N$2:$N)', '#,##0.00 "€"'],
    ['ROAS', '=IFERROR(SUM(' + MD + '!$N$2:$N)/SUM(' + MD + '!$E$2:$E),"—")', '0.00'],
    ['Marketing Contribution', '=SUM(' + MD + '!$N$2:$N)-SUM(' + MD + '!$E$2:$E)', '#,##0.00 "€"']
  ];
  sh.getRange('A7').setValue('ОБЩО').setFontWeight('bold');
  for (var i = 0; i < kpi.length; i++) {
    var row = 8 + i;
    sh.getRange(row, 1).setValue(kpi[i][0]);
    sh.getRange(row, 2).setFormula(kpi[i][1]).setNumberFormat(kpi[i][2]);
  }
  sh.getRange(8, 1, kpi.length, 1).setFontColor('#374151');
  sh.getRange(8, 2, kpi.length, 1).setFontWeight('bold');

  /* --- По канал --- */
  var top = 7;
  sh.getRange(top, 4).setValue('ПО КАНАЛ').setFontWeight('bold');
  var head = ['Channel', 'Spend', 'Leads', 'CPL', 'Clients', 'CAC', 'Revenue', 'ROAS', 'Marketing Contribution'];
  sh.getRange(top + 1, 4, 1, head.length).setValues([head])
    .setFontWeight('bold').setBackground('#e5e7eb');
  for (var c = 0; c < BDS_CHANNELS.length; c++) {
    var r = top + 2 + c;
    sh.getRange(r, 4).setValue(BDS_CHANNELS[c]);
    sh.getRange(r, 5).setFormula('=SUMIF(' + MD + '!$B$2:$B,$D' + r + ',' + MD + '!$E$2:$E)').setNumberFormat('#,##0.00 "€"');
    sh.getRange(r, 6).setFormula('=SUMIF(' + MD + '!$B$2:$B,$D' + r + ',' + MD + '!$J$2:$J)').setNumberFormat('#,##0');
    sh.getRange(r, 7).setFormula('=IFERROR($E' + r + '/$F' + r + ',"—")').setNumberFormat('#,##0.00 "€"');
    sh.getRange(r, 8).setFormula('=SUMIF(' + MD + '!$B$2:$B,$D' + r + ',' + MD + '!$L$2:$L)').setNumberFormat('#,##0');
    sh.getRange(r, 9).setFormula('=IFERROR($E' + r + '/$H' + r + ',"—")').setNumberFormat('#,##0.00 "€"');
    sh.getRange(r, 10).setFormula('=SUMIF(' + MD + '!$B$2:$B,$D' + r + ',' + MD + '!$N$2:$N)').setNumberFormat('#,##0.00 "€"');
    sh.getRange(r, 11).setFormula('=IFERROR($J' + r + '/$E' + r + ',"—")').setNumberFormat('0.00');
    sh.getRange(r, 12).setFormula('=$J' + r + '-$E' + r).setNumberFormat('#,##0.00 "€"');
  }

  /* --- По кампания --- */
  var camp = top + 2 + BDS_CHANNELS.length + 2;
  sh.getRange(camp, 4).setValue('ПО КАМПАНИЯ').setFontWeight('bold');
  sh.getRange(camp + 1, 4).setFormula(
    '=IFERROR(QUERY(' + MD + '!$A$2:$Q,' +
    '"select D, B, sum(E), sum(J), sum(L), sum(N) ' +
    'where A is not null and D is not null and D <> \'\' ' +
    'group by D, B ' +
    'label D \'Campaign\', B \'Channel\', sum(E) \'Spend\', sum(J) \'Leads\', sum(L) \'Clients\', sum(N) \'Revenue\'",0),' +
    '"още няма кампании")'
  );

  /* --- Продажби по дата на затваряне --- */
  var close = 8 + kpi.length + 2;
  sh.getRange(close, 1).setValue('ПРОДАЖБИ ПО CLOSE DATE').setFontWeight('bold');
  sh.getRange(close + 1, 1).setValue('Отделен поглед: приходът тук се брои по датата на затваряне,');
  sh.getRange(close + 2, 1).setValue('а в Marketing Daily — по датата на заявката. Двете отговарят');
  sh.getRange(close + 3, 1).setValue('на различни въпроси и няма да съвпадат по дни.');
  sh.getRange(close + 1, 1, 3, 1).setFontColor('#6b7280');
  sh.getRange(close + 5, 1).setValue('Won сделки');
  sh.getRange(close + 5, 2).setFormula('=COUNTIF(' + LD + '!$' + LSTATUS + '$2:$' + LSTATUS + ',"Won")').setNumberFormat('#,##0');
  sh.getRange(close + 6, 1).setValue('Приход (Won)');
  sh.getRange(close + 6, 2).setFormula(
    '=SUMIF(' + LD + '!$' + LSTATUS + '$2:$' + LSTATUS + ',"Won",' +
    LD + '!$' + LDEAL + '$2:$' + LDEAL + ')'
  ).setNumberFormat('#,##0.00 "€"');
  sh.getRange(close + 7, 1).setValue('Средна сделка');
  sh.getRange(close + 7, 2).setFormula('=IFERROR($B$' + (close + 6) + '/$B$' + (close + 5) + ',"—")').setNumberFormat('#,##0.00 "€"');
  sh.getRange(close + 8, 1).setValue('Заявки общо');
  sh.getRange(close + 8, 2).setFormula('=COUNTA(' + LD + '!$A$2:$A)').setNumberFormat('#,##0');
  sh.getRange(close + 9, 1).setValue('Win rate');
  sh.getRange(close + 9, 2).setFormula('=IFERROR($B$' + (close + 5) + '/$B$' + (close + 8) + ',"—")').setNumberFormat('0.0%');

  /* --- Заявки, които висят --- */
  var health = close + 11;
  sh.getRange(health, 1).setValue('ЗАЯВКИ С ПРОБЛЕМ').setFontWeight('bold');
  sh.getRange(health + 1, 1).setFormula(
    '=IFERROR(QUERY(' + LD + '!$A$2:$' + LHEALTH + ',' +
    '"select A, ' + LBIZ + ', ' + LSTATUS + ', ' + LHEALTH +
    ' where ' + LHEALTH + ' is not null and ' + LHEALTH + ' <> \'\' ' +
    'label A \'Lead ID\', ' + LBIZ + ' \'Business\', ' + LSTATUS + ' \'Status\', ' +
    LHEALTH + ' \'Какво липсва\'",0),' +
    '"няма — всичко е попълнено")'
  );

  sh.setColumnWidth(1, 200);
  sh.setColumnWidth(2, 130);
  sh.setColumnWidth(4, 190);
  sh.setColumnWidth(12, 170);
  return sh;
}

/* ------------------------------------------------------------
   Подредба и почистване
   ------------------------------------------------------------ */

function removeDefaultSheet_(ss) {
  var names = ['Sheet1', 'Лист1'];
  for (var i = 0; i < names.length; i++) {
    var sh = ss.getSheetByName(names[i]);
    if (sh && sh.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(sh);
  }
}

function orderSheets_(ss) {
  var order = [
    BDS_SHEETS.dashboard,
    BDS_SHEETS.leads,
    BDS_SHEETS.marketing,
    BDS_SHEETS.rawAds,
    BDS_SHEETS.config
  ];
  for (var i = 0; i < order.length; i++) {
    var sh = ss.getSheetByName(order[i]);
    if (sh) { ss.setActiveSheet(sh); ss.moveActiveSheet(i + 1); }
  }
  ss.setActiveSheet(ss.getSheetByName(BDS_SHEETS.leads));
}

/* ------------------------------------------------------------
   Меню в таблицата — за да не се търсят функции в редактора.
   ------------------------------------------------------------ */

function onOpen() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('BDS')
      .addItem('Обнови маркетинга от CRM', 'rebuildMarketingFromCrm')
      .addItem('Издай номер на оферта за избрания ред', 'assignProposalIdToSelection')
      .addSeparator()
      .addItem('Провери всички заявки', 'recheckAllLeadHealth')
      .addItem('Построй/поправи таблицата', 'setupBdsOperations')
      .addSeparator()
      .addItem('Самопроверка на живо', 'runBdsSelfTest')
      .addItem('Изчисти тестови редове', 'cleanupSelfTestRows')
      .addToUi();
  } catch (e) { /* без UI (тригер) */ }
}
