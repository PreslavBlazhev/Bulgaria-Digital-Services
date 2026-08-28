/* ============================================================
   BDS Operations — ПРОДАЖБЕНА АВТОМАТИКА (Sales.gs)
   ------------------------------------------------------------
   Какво прави таблицата сама, когато сменяш статус:

     Won            → Client = Да, Won/Lost = Won, дата на затваряне
     Lost           → Client = Не, Won/Lost = Lost, иска причина
     Proposal Sent  → издава номер на оферта, дата и валидност +14 дни

   И винаги: пресмята колоната Health — какво липсва на този ред.
   Health не блокира нищо. Тя само не позволява да се забрави.

   Защо не блокираме: таблица, която отказва да приеме половин
   информация по време на разговор, се заобикаля. Таблица, която
   свети червено, се поправя.
   ============================================================ */

/** Колоните, чиято промяна пуска автоматиката. */
var BDS_TRIGGER_COLUMNS = [
  'Status', 'Deal Value', 'Close Date', 'Lost Reason',
  'Next Action', 'Follow-up Date',
  'Proposal ID', 'Proposal Date', 'Proposal Value', 'Proposal Validity',
  'Source Category', 'Campaign', 'Created Date'
];

/** Колоните, чиято промяна налага преизчисляване на маркетинга. */
var BDS_MARKETING_RELEVANT = [
  'Status', 'Deal Value', 'Source Category', 'Campaign', 'Created Date'
];

function bdsLeadIdx_(name) {
  for (var i = 0; i < BDS_LEAD_COLUMNS.length; i++) {
    if (BDS_LEAD_COLUMNS[i] === name) return i + 1;
  }
  throw new Error('Няма колона ' + name + ' в Leads');
}

/** Прост тригер. Google го вика при всяка ръчна редакция. */
function onEdit(e) {
  try {
    if (!e || !e.range) return;
    var sheet = e.range.getSheet();
    if (sheet.getName() !== BDS_SHEETS.leads) return;
    var row = e.range.getRow();
    if (row < 2) return;

    var col = e.range.getColumn();
    var colName = BDS_LEAD_COLUMNS[col - 1];
    /* Многоклетъчна редакция (paste): пипаме реда без филтър по колона. */
    var wide = e.range.getNumColumns() > 1 || e.range.getNumRows() > 1;
    if (!wide && bdsIndexOf_(BDS_TRIGGER_COLUMNS, colName) < 0) {
      applyLeadHealth_(sheet, row);
      return;
    }

    var startRow = e.range.getRow();
    var endRow = startRow + e.range.getNumRows() - 1;
    var needsMarketing = wide || bdsIndexOf_(BDS_MARKETING_RELEVANT, colName) >= 0;

    for (var r = startRow; r <= endRow; r++) {
      if (r < 2) continue;
      applyLeadAutomation_(sheet, r);
    }
    if (needsMarketing) rebuildMarketingFromCrm();
  } catch (err) {
    /* Тригерът никога не бива да оставя таблицата в недовършено
       състояние заради грешка — записваме и продължаваме. */
    Logger.log('onEdit: ' + err);
  }
}

/** Цялата логика за един ред: статус → последствия → Health. */
function applyLeadAutomation_(sheet, row) {
  var width = BDS_LEAD_COLUMNS.length;
  var range = sheet.getRange(row, 1, 1, width);
  var v = range.getValues()[0];

  var iLeadId = bdsLeadIdx_('Lead ID') - 1;
  if (!String(v[iLeadId] || '').trim()) return;      /* празен ред */

  var iStatus = bdsLeadIdx_('Status') - 1;
  var iClient = bdsLeadIdx_('Client') - 1;
  var iWonLost = bdsLeadIdx_('Won/Lost') - 1;
  var iDeal = bdsLeadIdx_('Deal Value') - 1;
  var iClose = bdsLeadIdx_('Close Date') - 1;
  var iPropId = bdsLeadIdx_('Proposal ID') - 1;
  var iPropDate = bdsLeadIdx_('Proposal Date') - 1;
  var iPropVal = bdsLeadIdx_('Proposal Validity') - 1;
  var iNext = bdsLeadIdx_('Next Action') - 1;

  var status = String(v[iStatus] || '').trim();
  var changed = false;

  if (status === 'Won') {
    if (v[iClient] !== 'Да') { v[iClient] = 'Да'; changed = true; }
    if (v[iWonLost] !== 'Won') { v[iWonLost] = 'Won'; changed = true; }
    /* Дата на затваряне: слага се ДНЕШНАТА, в момента на маркирането.
       Стара дата не се измисля — ако сделката е затворена по-рано,
       човекът я поправя на ръка и Health не вдига шум. */
    if (!bdsDateKey(v[iClose])) { v[iClose] = new Date(); changed = true; }
    if (!String(v[iNext] || '').trim()) { v[iNext] = 'Стартиране на проекта'; changed = true; }
  } else if (status === 'Lost') {
    if (v[iClient] !== 'Не') { v[iClient] = 'Не'; changed = true; }
    if (v[iWonLost] !== 'Lost') { v[iWonLost] = 'Lost'; changed = true; }
    if (!bdsDateKey(v[iClose])) { v[iClose] = new Date(); changed = true; }
    /* Печелившата стойност не се пренася в загубена сделка. */
    if (bdsNum(v[iDeal]) > 0) { v[iDeal] = ''; changed = true; }
  } else {
    if (v[iWonLost] !== '') { v[iWonLost] = ''; changed = true; }
    if (v[iClient] !== 'Не') { v[iClient] = 'Не'; changed = true; }
  }

  if (status === 'Proposal Sent') {
    if (!bdsIsProposalId(v[iPropId])) {
      v[iPropId] = bdsIssueProposalId_(sheet);
      changed = true;
    }
    if (!bdsDateKey(v[iPropDate])) { v[iPropDate] = new Date(); changed = true; }
    var validity = bdsProposalValidity(v[iPropDate]);
    if (bdsDateKey(v[iPropVal]) !== validity) {
      var p = validity.split('-');
      v[iPropVal] = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
      changed = true;
    }
  }

  if (changed) range.setValues([v]);
  applyLeadHealthFromValues_(sheet, row, sheet.getRange(row, 1, 1, width).getValues()[0]);
}

function applyLeadHealth_(sheet, row) {
  var v = sheet.getRange(row, 1, 1, BDS_LEAD_COLUMNS.length).getValues()[0];
  applyLeadHealthFromValues_(sheet, row, v);
}

function applyLeadHealthFromValues_(sheet, row, v) {
  var iHealth = bdsLeadIdx_('Health');
  if (!String(v[bdsLeadIdx_('Lead ID') - 1] || '').trim()) return;
  var health = bdsLeadHealth({
    status: v[bdsLeadIdx_('Status') - 1],
    dealValue: v[bdsLeadIdx_('Deal Value') - 1],
    closeDate: v[bdsLeadIdx_('Close Date') - 1],
    lostReason: v[bdsLeadIdx_('Lost Reason') - 1],
    nextAction: v[bdsLeadIdx_('Next Action') - 1],
    followUpDate: v[bdsLeadIdx_('Follow-up Date') - 1],
    proposalId: v[bdsLeadIdx_('Proposal ID') - 1],
    proposalDate: v[bdsLeadIdx_('Proposal Date') - 1],
    proposalValue: v[bdsLeadIdx_('Proposal Value') - 1],
    proposalValidity: v[bdsLeadIdx_('Proposal Validity') - 1]
  });
  var cell = sheet.getRange(row, iHealth);
  if (String(cell.getValue() || '') !== health) cell.setValue(health);
}

/** Минава през всички редове. За менюто и след внос на стари данни. */
function recheckAllLeadHealth() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(BDS_SHEETS.leads);
  var last = sheet.getLastRow();
  if (last < 2) return 'Няма заявки.';
  var width = BDS_LEAD_COLUMNS.length;
  var values = sheet.getRange(2, 1, last - 1, width).getValues();
  var iHealth = bdsLeadIdx_('Health') - 1;
  var flagged = 0;

  for (var i = 0; i < values.length; i++) {
    var v = values[i];
    if (!String(v[0] || '').trim()) { v[iHealth] = ''; continue; }
    var h = bdsLeadHealth({
      status: v[bdsLeadIdx_('Status') - 1],
      dealValue: v[bdsLeadIdx_('Deal Value') - 1],
      closeDate: v[bdsLeadIdx_('Close Date') - 1],
      lostReason: v[bdsLeadIdx_('Lost Reason') - 1],
      nextAction: v[bdsLeadIdx_('Next Action') - 1],
      followUpDate: v[bdsLeadIdx_('Follow-up Date') - 1],
      proposalId: v[bdsLeadIdx_('Proposal ID') - 1],
      proposalDate: v[bdsLeadIdx_('Proposal Date') - 1],
      proposalValue: v[bdsLeadIdx_('Proposal Value') - 1],
      proposalValidity: v[bdsLeadIdx_('Proposal Validity') - 1]
    });
    v[iHealth] = h;
    if (h) flagged++;
  }
  sheet.getRange(2, iHealth + 1, values.length, 1).setValues(
    values.map(function (v) { return [v[iHealth]]; })
  );
  var msg = flagged + ' заявк(и) искат внимание от ' + values.length + '.';
  Logger.log(msg);
  return msg;
}

/* ------------------------------------------------------------
   Номера на оферти
   ------------------------------------------------------------ */

/** Издава следващия свободен номер. Заключва, за да не се падне
    един и същи номер на две оферти в една и съща секунда. */
function bdsIssueProposalId_(sheet) {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(15000); } catch (e) { /* продължаваме, рискът е нищожен */ }
  try {
    var col = bdsLeadIdx_('Proposal ID');
    var last = sheet.getLastRow();
    var existing = last > 1
      ? sheet.getRange(2, col, last - 1, 1).getValues().map(function (r) { return r[0]; })
      : [];
    return bdsNextProposalId(existing, new Date().getFullYear());
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

/** Меню: издава номер за реда, върху който стои курсорът. Ползва се,
    когато офертата се готви ПРЕДИ статусът да стане Proposal Sent. */
function assignProposalIdToSelection() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getActiveSheet();
  var ui = null;
  try { ui = SpreadsheetApp.getUi(); } catch (e) {}

  if (sheet.getName() !== BDS_SHEETS.leads) {
    if (ui) ui.alert('Застани на ред в лист ' + BDS_SHEETS.leads + '.');
    return;
  }
  var row = sheet.getActiveRange().getRow();
  if (row < 2) { if (ui) ui.alert('Избери ред със заявка.'); return; }

  var colId = bdsLeadIdx_('Proposal ID');
  var current = sheet.getRange(row, colId).getValue();
  if (bdsIsProposalId(current)) {
    if (ui) ui.alert('Този ред вече има оферта ' + current + '.');
    return current;
  }
  var id = bdsIssueProposalId_(sheet);
  sheet.getRange(row, colId).setValue(id);

  var colDate = bdsLeadIdx_('Proposal Date');
  if (!bdsDateKey(sheet.getRange(row, colDate).getValue())) {
    sheet.getRange(row, colDate).setValue(new Date());
  }
  var validity = bdsProposalValidity(sheet.getRange(row, colDate).getValue());
  var p = validity.split('-');
  sheet.getRange(row, bdsLeadIdx_('Proposal Validity'))
    .setValue(new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2])));

  applyLeadHealth_(sheet, row);
  if (ui) ui.alert('Оферта ' + id + '\nВалидна до ' + validity + ' (14 календарни дни).');
  return id;
}
