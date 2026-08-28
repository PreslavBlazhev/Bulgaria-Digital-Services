/* ============================================================
   BDS Operations — ЗАТВОРЕНИЯТ КРЪГ (Marketing.gs)
   ------------------------------------------------------------
   Свързва двата източника на истина:

     Leads     → колко заявки, колко клиенти, колко приход
     Raw Ads   → колко е похарчено, показвания, кликове

   и ги слага в Marketing Daily, откъдето CPL, CAC и ROAS излизат
   сами, като формули.

   Правилото, което пази числата от удвояване:
   НИЩО не се увеличава с +1. Всичко се ПРЕСМЯТА наново от
   източника. Затова второ пускане дава същия резултат, а изтрита
   заявка изчезва и от тракера.
   ============================================================ */

/** Главната функция на затворения кръг. Пуска се от менюто, от
    onEdit при промяна на статус, и от вносителите на реклама. */
function rebuildMarketingFromCrm() {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(30000); } catch (e) { return 'Заето — пробвай пак.'; }
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var mdSheet = ss.getSheetByName(BDS_SHEETS.marketing);
    if (!mdSheet) throw new Error('Няма лист ' + BDS_SHEETS.marketing + '. Пусни setupBdsOperations().');

    var rawRows = bdsReadRawAds_(ss);
    var adsAgg = bdsAggregateAds(rawRows);
    var overrides = bdsReadCampaignOverrides_(ss);
    var resolver = bdsCampaignIdResolver(adsAgg, overrides);

    var leads = bdsReadLeadsForMarketing_(ss);
    var crmAgg = bdsAggregateCrm(leads, resolver);

    var existing = bdsReadMarketingRows_(mdSheet);
    var rows = bdsRebuildMarketingRows(existing, crmAgg, adsAgg);

    bdsWriteMarketingRows_(mdSheet, rows);

    var msg = 'Marketing Daily: ' + rows.length + ' реда от ' +
      leads.length + ' заявки и ' + rawRows.length + ' рекламни реда.';
    Logger.log(msg);
    return msg;
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

/* ------------------------------------------------------------
   Четене
   ------------------------------------------------------------ */

function bdsReadLeadsForMarketing_(ss) {
  var sh = ss.getSheetByName(BDS_SHEETS.leads);
  if (!sh) return [];
  var last = sh.getLastRow();
  if (last < 2) return [];
  var values = sh.getRange(2, 1, last - 1, BDS_LEAD_COLUMNS.length).getValues();

  var iId = bdsLeadIdx_('Lead ID') - 1;
  var iCreated = bdsLeadIdx_('Created Date') - 1;
  var iSrcCat = bdsLeadIdx_('Source Category') - 1;
  var iCampaign = bdsLeadIdx_('Campaign') - 1;
  var iStatus = bdsLeadIdx_('Status') - 1;
  var iDeal = bdsLeadIdx_('Deal Value') - 1;

  var out = [];
  for (var i = 0; i < values.length; i++) {
    var v = values[i];
    if (!String(v[iId] || '').trim()) continue;
    out.push({
      leadId: String(v[iId]).trim(),
      createdDate: v[iCreated],
      sourceCategory: v[iSrcCat],
      campaign: v[iCampaign],
      status: v[iStatus],
      dealValue: v[iDeal]
    });
  }
  return out;
}

function bdsReadRawAds_(ss) {
  var sh = ss.getSheetByName(BDS_SHEETS.rawAds);
  if (!sh) return [];
  var last = sh.getLastRow();
  if (last < 2) return [];
  var values = sh.getRange(2, 1, last - 1, BDS_RAW_ADS_COLUMNS.length).getValues();
  var R = BDS_RAW_IDX;
  var out = [];
  for (var i = 0; i < values.length; i++) {
    var v = values[i];
    if (!bdsDateKey(v[R.date])) continue;
    out.push({
      date: v[R.date],
      platform: v[R.platform],
      campaignId: v[R.campaignId],
      campaign: v[R.campaign],
      spend: v[R.spend],
      impressions: v[R.impressions],
      clicks: v[R.clicks],
      conversions: v[R.conversions]
    });
  }
  return out;
}

function bdsReadMarketingRows_(sheet) {
  var last = sheet.getLastRow();
  if (last < 2) return [];
  var values = sheet.getRange(2, 1, last - 1, BDS_MARKETING_COLUMNS.length).getValues();
  var out = [];
  for (var i = 0; i < values.length; i++) {
    if (bdsDateKey(values[i][BDS_MD_IDX.date])) out.push(values[i]);
  }
  return out;
}

/* ------------------------------------------------------------
   Писане

   Изведените колони (CTR, CPC, CPL, CAC, ROAS, Marketing
   Contribution) са ARRAYFORMULA в ЗАГЛАВНИЯ ред. Затова тук се
   пишат само базовите колони — иначе формулата би била изтрита от
   първия запис и никой не би разбрал защо показателите са спрели.
   ------------------------------------------------------------ */

function bdsWriteMarketingRows_(sheet, rows) {
  var I = BDS_MD_IDX;
  var n = rows.length;
  var needed = n + 1;
  if (sheet.getMaxRows() < needed + 1) {
    sheet.insertRowsAfter(sheet.getMaxRows(), needed + 1 - sheet.getMaxRows());
  }

  if (n > 0) {
    var head = [];      /* A..G */
    var leadsCol = [], clientsCol = [], revenueCol = [], notesCol = [];
    for (var i = 0; i < n; i++) {
      var r = rows[i];
      head.push([
        bdsToSheetDate_(r[I.date]),
        r[I.channel],
        r[I.campaignId],
        r[I.campaign],
        r[I.spend],
        r[I.impressions],
        r[I.clicks]
      ]);
      leadsCol.push([r[I.leads]]);
      clientsCol.push([r[I.clients]]);
      revenueCol.push([r[I.revenue]]);
      notesCol.push([r[I.notes]]);
    }
    sheet.getRange(2, 1, n, 7).setValues(head);
    sheet.getRange(2, I.leads + 1, n, 1).setValues(leadsCol);
    sheet.getRange(2, I.clients + 1, n, 1).setValues(clientsCol);
    sheet.getRange(2, I.revenue + 1, n, 1).setValues(revenueCol);
    sheet.getRange(2, I.notes + 1, n, 1).setValues(notesCol);
  }

  /* Излишните стари редове се чистят колона по колона — формулите
     в H, I, K, M, O, P не се пипат, те се празнят сами. */
  var lastRow = sheet.getLastRow();
  var extra = lastRow - 1 - n;
  if (extra > 0) {
    var from = 2 + n;
    sheet.getRange(from, 1, extra, 7).clearContent();
    sheet.getRange(from, I.leads + 1, extra, 1).clearContent();
    sheet.getRange(from, I.clients + 1, extra, 1).clearContent();
    sheet.getRange(from, I.revenue + 1, extra, 1).clearContent();
    sheet.getRange(from, I.notes + 1, extra, 1).clearContent();
  }
}

function bdsToSheetDate_(key) {
  var k = bdsDateKey(key);
  if (!k) return '';
  var p = k.split('-');
  return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
}

/* ------------------------------------------------------------
   Вход за рекламните вносители

   Викa се от Google Ads Script (през API на таблицата) и от
   вносителя за Meta. Ключът е Дата + Платформа + Campaign ID:
   повторно пускане за същия ден обновява реда, не добавя втори.
   ------------------------------------------------------------ */

function bdsImportAdsRows(incoming) {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(30000); } catch (e) { return { ok: false, error: 'busy' }; }
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName(BDS_SHEETS.rawAds);
    if (!sh) throw new Error('Няма лист ' + BDS_SHEETS.rawAds);

    var last = sh.getLastRow();
    var existing = last > 1
      ? sh.getRange(2, 1, last - 1, BDS_RAW_ADS_COLUMNS.length).getValues()
      : [];

    var result = bdsUpsertRawAds(existing, incoming, new Date());
    var rows = result.rows;

    if (rows.length > 0) {
      var toWrite = rows.map(function (r) {
        var copy = r.slice();
        copy[BDS_RAW_IDX.date] = bdsToSheetDate_(copy[BDS_RAW_IDX.date]);
        return copy;
      });
      if (sh.getMaxRows() < toWrite.length + 1) {
        sh.insertRowsAfter(sh.getMaxRows(), toWrite.length + 1 - sh.getMaxRows());
      }
      sh.getRange(2, 1, toWrite.length, BDS_RAW_ADS_COLUMNS.length).setValues(toWrite);
    }
    var extra = sh.getLastRow() - 1 - rows.length;
    if (extra > 0) {
      sh.getRange(2 + rows.length, 1, extra, BDS_RAW_ADS_COLUMNS.length).clearContent();
    }

    rebuildMarketingFromCrm();
    return { ok: true, added: result.added, updated: result.updated, total: rows.length };
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}
