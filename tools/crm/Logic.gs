/* ============================================================
   BDS Operations — ЧИСТА ЛОГИКА (Logic.gs)
   ------------------------------------------------------------
   Тук няма нито едно извикване към Apps Script. Само данни навън,
   данни навътре. Затова същият файл се изпълнява и в Google, и в
   Node — тестовете в tools/test-*.mjs го зареждат буквално и
   проверяват СЪЩИЯ код, който после работи в таблицата.

   Правилото е просто: всичко, което може да сгреши сметка, живее
   тук и има тест. Всичко, което пипа лист, живее в другите файлове.
   ============================================================ */

/* ------------------------------------------------------------
   1. Схема — имената на колоните са ДОГОВОР.
   Нова колона се добавя САМО накрая. Преместена колона разбива
   всички стари редове и всички формули, които сочат по буква.
   ------------------------------------------------------------ */

var BDS_SHEETS = {
  leads: 'Leads',
  marketing: 'Marketing Daily',
  rawAds: 'Raw Ads',
  dashboard: 'Dashboard',
  config: 'Config'
};

var BDS_LEAD_COLUMNS = [
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
  'Proposal Validity',
  'Health'
];

/* Marketing Daily: A..Q. Буквите се ползват във формулите на
   Dashboard, затова редът тук е заключен. */
var BDS_MARKETING_COLUMNS = [
  'Date',                     /* A */
  'Channel',                  /* B */
  'Campaign ID',              /* C */
  'Campaign',                 /* D */
  'Spend',                    /* E */
  'Impressions',              /* F */
  'Clicks',                   /* G */
  'CTR',                      /* H  формула */
  'CPC',                      /* I  формула */
  'Leads',                    /* J */
  'CPL',                      /* K  формула */
  'Clients',                  /* L */
  'CAC',                      /* M  формула */
  'Revenue',                  /* N */
  'ROAS',                     /* O  формула */
  'Marketing Contribution',   /* P  формула */
  'Notes'                     /* Q */
];

/* Колоните, които СКРИПТ пише. Останалите са формули и не се пипат. */
var BDS_MD_IDX = {
  date: 0, channel: 1, campaignId: 2, campaign: 3,
  spend: 4, impressions: 5, clicks: 6,
  ctr: 7, cpc: 8,
  leads: 9, cpl: 10,
  clients: 11, cac: 12,
  revenue: 13, roas: 14, contribution: 15,
  notes: 16
};
var BDS_MD_FORMULA_COLS = [7, 8, 10, 12, 14, 15];

var BDS_RAW_ADS_COLUMNS = [
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

var BDS_RAW_IDX = {
  date: 0, platform: 1, campaignId: 2, campaign: 3,
  spend: 4, impressions: 5, clicks: 6, conversions: 7, importedAt: 8
};

/* ------------------------------------------------------------
   2. Статуси — точно тези девет, в този ред.
   ------------------------------------------------------------ */

var BDS_STATUSES = [
  'New',
  'Contacted',
  'Qualified',
  'Discovery Complete',
  'Proposal Needed',
  'Proposal Sent',
  'Negotiation',
  'Won',
  'Lost'
];

var BDS_CLOSED_STATUSES = ['Won', 'Lost'];

/* Статусите, при които липсваща дата за проследяване е пропуск, а
   не още непопълнено поле. При New още не е имало разговор. */
var BDS_FOLLOWUP_REQUIRED_FROM = [
  'Contacted',
  'Qualified',
  'Discovery Complete',
  'Proposal Needed',
  'Proposal Sent',
  'Negotiation'
];

/* ------------------------------------------------------------
   3. Канали — ЕДНА таксономия за сайта и за тракера.
   Ляво: source_category, както го праща bds-tracking.js.
   Дясно: Channel, както се вижда в Marketing Daily.
   ------------------------------------------------------------ */

var BDS_CHANNEL_MAP = {
  google_ads: 'Google Ads',
  meta_ads: 'Meta Ads',
  organic_google: 'Organic Google',
  instagram: 'Instagram',
  facebook: 'Facebook',
  referral: 'Referral',
  direct: 'Direct',
  other: 'Other'
};

var BDS_CHANNELS = [
  'Google Ads',
  'Meta Ads',
  'Organic Google',
  'Instagram',
  'Facebook',
  'Referral',
  'Direct',
  'Other'
];

/** source_category -> Channel. Непознат вход не се измисля: става Other. */
function bdsChannelFromSourceCategory(sc) {
  var key = String(sc == null ? '' : sc).trim().toLowerCase();
  if (!key) return 'Direct';                 /* няма източник = директно */
  if (BDS_CHANNEL_MAP.hasOwnProperty(key)) return BDS_CHANNEL_MAP[key];
  /* Толерантност към вече изписан етикет ("Google Ads" вместо google_ads). */
  for (var i = 0; i < BDS_CHANNELS.length; i++) {
    if (BDS_CHANNELS[i].toLowerCase() === key) return BDS_CHANNELS[i];
  }
  return 'Other';
}

/** Платформата в Raw Ads е същият етикет като Channel. */
function bdsChannelFromPlatform(platform) {
  var p = String(platform == null ? '' : platform).trim();
  for (var i = 0; i < BDS_CHANNELS.length; i++) {
    if (BDS_CHANNELS[i].toLowerCase() === p.toLowerCase()) return BDS_CHANNELS[i];
  }
  if (/google/i.test(p)) return 'Google Ads';
  if (/meta|facebook ads/i.test(p)) return 'Meta Ads';
  return p ? 'Other' : '';
}

/* ------------------------------------------------------------
   4. Дати — един ключ, YYYY-MM-DD, по МЕСТНО време.
   Ако вземем ISO низа на Date обект, полунощ в София става
   предишният ден в UTC и цял ден разходи отиват в грешен ред.
   ------------------------------------------------------------ */

function bdsDateKey(v) {
  if (v == null || v === '') return '';
  if (v instanceof Date) {
    if (isNaN(v.getTime())) return '';
    return v.getFullYear() + '-' +
      bdsPad2_(v.getMonth() + 1) + '-' +
      bdsPad2_(v.getDate());
  }
  var s = String(v).trim();
  var iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (iso) return iso[1] + '-' + iso[2] + '-' + iso[3];
  var bg = /^(\d{1,2})[.\/](\d{1,2})[.\/](\d{4})/.exec(s);   /* 28.08.2026 */
  if (bg) return bg[3] + '-' + bdsPad2_(bg[2]) + '-' + bdsPad2_(bg[1]);
  var d = new Date(s);
  if (!isNaN(d.getTime())) return bdsDateKey(d);
  return '';
}

function bdsPad2_(n) {
  n = String(n);
  return n.length < 2 ? '0' + n : n;
}

/** Календарни дни напред. Валидността на оферта е календарна, не работна. */
function bdsAddDays(dateLike, days) {
  var key = bdsDateKey(dateLike);
  if (!key) return '';
  var parts = key.split('-');
  var d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  d.setDate(d.getDate() + Number(days));
  return bdsDateKey(d);
}

/* ------------------------------------------------------------
   5. Числа — нулево-безопасни. Деление на нула връща '' (празно),
   не 0 и не грешка: 0 би излъгал, че показателят е измерен.
   ------------------------------------------------------------ */

function bdsNum(v) {
  if (v === '' || v == null) return 0;
  if (typeof v === 'number') return isFinite(v) ? v : 0;
  var n = parseFloat(String(v).replace(/\s/g, '').replace(',', '.'));
  return isFinite(n) ? n : 0;
}

/** Празно НЕ е нула. Ако разходът още не е внесен, CPL не е 0 лева —
    той е неизвестен. Затова липсващ числител също дава празно, не 0:
    „0 € на заявка“ е твърдение, което би повело към грешно решение. */
function bdsDiv(a, b) {
  if (a === '' || a == null) return '';
  if (b === '' || b == null) return '';
  var y = bdsNum(b);
  if (y === 0) return '';
  return bdsNum(a) / y;
}

function bdsCtr(clicks, impressions) { return bdsDiv(clicks, impressions); }
function bdsCpc(spend, clicks) { return bdsDiv(spend, clicks); }
function bdsCpl(spend, leads) { return bdsDiv(spend, leads); }
function bdsCac(spend, clients) { return bdsDiv(spend, clients); }
function bdsRoas(revenue, spend) { return bdsDiv(revenue, spend); }

/** Приход минус рекламен разход. НЕ е печалба — оперативните разходи
    (труд, инструменти, данъци) не участват. Затова се казва принос. */
function bdsMarketingContribution(revenue, spend) {
  return bdsNum(revenue) - bdsNum(spend);
}

/* ------------------------------------------------------------
   5б. Същите правила, но като формули в таблицата.

   Защо на всеки ред, а не една ARRAYFORMULA в заглавния ред:
   ARRAYFORMULA се разпростира до дъното на листа и запълва хиляда
   реда с празни низове. Празният низ е съдържание — getLastRow()
   започва да връща 1000, а таблицата изглежда пълна с нищо.
   Първата версия правеше точно това.

   Формулите се пишат наново при всяко преизчисляване, затова
   изтрита формула се връща сама на следващото пускане.

   IF(OR(...="")) отпред е важното: без него празен разход, разделен
   на една заявка, дава CPL = 0 — число, което изглежда като измерено.
   ------------------------------------------------------------ */

/** Формулите за ред `r` (номер на ред в листа, започва от 2). */
function bdsMarketingFormulas(r) {
  function ratio(num, den) {
    return '=IF(OR($' + num + r + '="",$' + den + r + '=""),"",' +
      'IFERROR($' + num + r + '/$' + den + r + ',""))';
  }
  return {
    ctr: ratio('G', 'F'),          /* кликове / показвания */
    cpc: ratio('E', 'G'),          /* разход / кликове */
    cpl: ratio('E', 'J'),          /* разход / заявки */
    cac: ratio('E', 'L'),          /* разход / клиенти */
    roas: ratio('N', 'E'),         /* приход / разход */
    /* Приносът се смята дори когато едната страна липсва — приход без
       разход е валиден резултат. Празен е само когато липсват и двете. */
    contribution: '=IF(AND($N' + r + '="",$E' + r + '=""),"",N($N' + r + ')-N($E' + r + '))'
  };
}

/* ------------------------------------------------------------
   6. Ключ на ред в Marketing Daily: Дата + Канал + Campaign ID.
   ------------------------------------------------------------ */

function bdsMdKey(date, channel, campaignId) {
  return bdsDateKey(date) + '|' +
    String(channel || '').trim() + '|' +
    String(campaignId == null ? '' : campaignId).trim();
}

/* ------------------------------------------------------------
   7. Оферти — номер и валидност.
   ------------------------------------------------------------ */

var BDS_PROPOSAL_PREFIX = 'BDS-PROP-';
var BDS_PROPOSAL_VALIDITY_DAYS = 14;      /* одобрено бизнес правило */

function bdsProposalId(year, seq) {
  var s = String(seq);
  while (s.length < 4) s = '0' + s;
  return BDS_PROPOSAL_PREFIX + year + '-' + s;
}

function bdsIsProposalId(v) {
  return /^BDS-PROP-\d{4}-\d{4}$/.test(String(v || '').trim());
}

/** Следващият свободен номер за годината. Пропуските в редицата не се
    запълват — номер, който вече е излязъл при клиент, не се преизползва. */
function bdsNextProposalId(existingIds, year) {
  var max = 0;
  var y = String(year);
  for (var i = 0; i < (existingIds || []).length; i++) {
    var m = /^BDS-PROP-(\d{4})-(\d{4})$/.exec(String(existingIds[i] || '').trim());
    if (m && m[1] === y) {
      var n = parseInt(m[2], 10);
      if (n > max) max = n;
    }
  }
  return bdsProposalId(y, max + 1);
}

function bdsProposalValidity(proposalDate) {
  return bdsAddDays(proposalDate, BDS_PROPOSAL_VALIDITY_DAYS);
}

/* ------------------------------------------------------------
   8. Здраве на заявката — какво липсва, за да не се забрави.
   Връща празен низ при наред. Не блокира редакция; само вика.
   ------------------------------------------------------------ */

function bdsLeadHealth(lead) {
  var status = String(lead.status || '').trim();
  var problems = [];

  if (status === 'Won') {
    if (bdsNum(lead.dealValue) <= 0) problems.push('липсва Deal Value');
    if (!bdsDateKey(lead.closeDate)) problems.push('липсва Close Date');
  } else if (status === 'Lost') {
    if (!String(lead.lostReason || '').trim()) problems.push('липсва Lost Reason');
  } else {
    if (!String(lead.nextAction || '').trim()) problems.push('липсва Next Action');
    if (bdsIndexOf_(BDS_FOLLOWUP_REQUIRED_FROM, status) >= 0 &&
        !bdsDateKey(lead.followUpDate)) {
      problems.push('липсва Follow-up Date');
    }
    if (status === 'Proposal Sent') {
      if (!bdsIsProposalId(lead.proposalId)) problems.push('липсва Proposal ID');
      if (!bdsDateKey(lead.proposalDate)) problems.push('липсва Proposal Date');
      if (bdsNum(lead.proposalValue) <= 0) problems.push('липсва Proposal Value');
      if (!bdsDateKey(lead.proposalValidity)) problems.push('липсва Proposal Validity');
    }
  }
  return problems.join('; ');
}

function bdsIndexOf_(arr, v) {
  for (var i = 0; i < arr.length; i++) if (arr[i] === v) return i;
  return -1;
}

/* ------------------------------------------------------------
   9. Обобщение на CRM към маркетингови редове.

   Моделът на датата (важно, документирано и в marketing/):
   заявката и приходът от нея се отчитат на ДАТАТА НА ПОЯВЯВАНЕ на
   заявката и на кампанията, която я е довела — не на датата на
   затваряне. Иначе сделка, затворена днес, би се появила върху
   днешния рекламен разход, а кликът е бил преди месец.
   Отчет по Close Date се прави отделно, в Dashboard.
   ------------------------------------------------------------ */

/** leads: [{createdDate, sourceCategory, campaign, status, dealValue}]
    resolveCampaignId: функция(campaignName, channel) -> Campaign ID или ''. */
function bdsAggregateCrm(leads, resolveCampaignId) {
  var agg = {};
  var resolve = resolveCampaignId || function () { return ''; };

  for (var i = 0; i < (leads || []).length; i++) {
    var l = leads[i] || {};
    var date = bdsDateKey(l.createdDate);
    if (!date) continue;                         /* ред без дата не се брои */

    var channel = bdsChannelFromSourceCategory(l.sourceCategory);
    var campaign = String(l.campaign || '').trim();
    var campaignId = String(resolve(campaign, channel) || '').trim();
    var key = bdsMdKey(date, channel, campaignId);

    if (!agg[key]) {
      agg[key] = {
        key: key, date: date, channel: channel,
        campaignId: campaignId, campaign: campaign,
        leads: 0, clients: 0, revenue: 0
      };
    }
    /* Името на кампанията се пази, ако първият ред е бил без него. */
    if (!agg[key].campaign && campaign) agg[key].campaign = campaign;

    agg[key].leads += 1;
    if (String(l.status || '').trim() === 'Won') {
      agg[key].clients += 1;
      agg[key].revenue += bdsNum(l.dealValue);
    }
  }
  return agg;
}

/** Raw Ads -> обобщение по Дата + Канал + Campaign ID. */
function bdsAggregateAds(rawRows) {
  var agg = {};
  for (var i = 0; i < (rawRows || []).length; i++) {
    var r = rawRows[i] || {};
    var date = bdsDateKey(r.date);
    var channel = bdsChannelFromPlatform(r.platform);
    if (!date || !channel) continue;
    var campaignId = String(r.campaignId == null ? '' : r.campaignId).trim();
    var key = bdsMdKey(date, channel, campaignId);
    if (!agg[key]) {
      agg[key] = {
        key: key, date: date, channel: channel,
        campaignId: campaignId, campaign: String(r.campaign || '').trim(),
        spend: 0, impressions: 0, clicks: 0, conversions: 0
      };
    }
    if (!agg[key].campaign && r.campaign) agg[key].campaign = String(r.campaign).trim();
    agg[key].spend += bdsNum(r.spend);
    agg[key].impressions += bdsNum(r.impressions);
    agg[key].clicks += bdsNum(r.clicks);
    agg[key].conversions += bdsNum(r.conversions);
  }
  return agg;
}

/** Име на кампания -> Campaign ID, по вече внесените рекламни данни.
    Ако utm_campaign съвпада с името на кампанията в рекламния акаунт
    (както е при restaurant_search_bg), връзката става сама.
    overrides позволява ръчно съответствие в лист Config. */
function bdsCampaignIdResolver(adsAgg, overrides) {
  var byName = {};
  for (var k in adsAgg) {
    if (!adsAgg.hasOwnProperty(k)) continue;
    var a = adsAgg[k];
    if (!a.campaign || !a.campaignId) continue;
    byName[a.channel + '|' + a.campaign.toLowerCase()] = a.campaignId;
  }
  var ov = {};
  for (var name in (overrides || {})) {
    if (overrides.hasOwnProperty(name)) ov[String(name).toLowerCase()] = overrides[name];
  }
  return function (campaignName, channel) {
    var n = String(campaignName || '').trim().toLowerCase();
    if (!n) return '';
    if (ov[n]) return ov[n];
    var hit = byName[channel + '|' + n];
    return hit || '';
  };
}

/* ------------------------------------------------------------
   10. Сглобяване на Marketing Daily.

   Два източника, два ясни договора:

   · CRM е ПЪЛЕН източник за Leads / Clients / Revenue. Затова липса
     в обобщението значи НУЛА — така изтрита тестова заявка изчезва
     и от тракера.

   · Рекламните данни са ЧАСТИЧЕН източник: вносителят обикновено
     носи последните дни. Затова липса значи „не знам“ и старият
     разход се ЗАПАЗВА. Никога не се занулява отдалеч.

   Резултатът зависи само от входа, не от това колко пъти е викан —
   затова второ пускане дава същата таблица.
   ------------------------------------------------------------ */

function bdsRebuildMarketingRows(existingRows, crmAgg, adsAgg) {
  var I = BDS_MD_IDX;
  var byKey = {};
  var order = [];

  function ensure(key, date, channel, campaignId, campaign) {
    if (!byKey[key]) {
      var row = [];
      for (var i = 0; i < BDS_MARKETING_COLUMNS.length; i++) row.push('');
      row[I.date] = date;
      row[I.channel] = channel;
      row[I.campaignId] = campaignId;
      row[I.campaign] = campaign || '';
      row[I.leads] = 0;
      row[I.clients] = 0;
      row[I.revenue] = 0;
      byKey[key] = row;
      order.push(key);
    }
    return byKey[key];
  }

  /* Съществуващите редове влизат първи — така Notes и ръчно въведен
     разход остават на мястото си. */
  for (var r = 0; r < (existingRows || []).length; r++) {
    var src = existingRows[r] || [];
    var date = bdsDateKey(src[I.date]);
    var channel = String(src[I.channel] || '').trim();
    if (!date || !channel) continue;                 /* празен/счупен ред */
    var cid = String(src[I.campaignId] == null ? '' : src[I.campaignId]).trim();
    var key = bdsMdKey(date, channel, cid);
    if (byKey[key]) continue;                        /* дубликат в листа */
    var row = ensure(key, date, channel, cid, src[I.campaign]);
    row[I.spend] = src[I.spend] === '' || src[I.spend] == null ? '' : bdsNum(src[I.spend]);
    row[I.impressions] = src[I.impressions] === '' || src[I.impressions] == null ? '' : bdsNum(src[I.impressions]);
    row[I.clicks] = src[I.clicks] === '' || src[I.clicks] == null ? '' : bdsNum(src[I.clicks]);
    row[I.notes] = src[I.notes] == null ? '' : src[I.notes];
  }

  /* Рекламните данни са истина за периода, който носят. */
  for (var ak in (adsAgg || {})) {
    if (!adsAgg.hasOwnProperty(ak)) continue;
    var a = adsAgg[ak];
    var arow = ensure(ak, a.date, a.channel, a.campaignId, a.campaign);
    if (!arow[I.campaign] && a.campaign) arow[I.campaign] = a.campaign;
    arow[I.spend] = a.spend;
    arow[I.impressions] = a.impressions;
    arow[I.clicks] = a.clicks;
  }

  /* CRM е истина за всички редове — включително за нулите. */
  for (var ck in (crmAgg || {})) {
    if (!crmAgg.hasOwnProperty(ck)) continue;
    var c = crmAgg[ck];
    var crow = ensure(ck, c.date, c.channel, c.campaignId, c.campaign);
    if (!crow[I.campaign] && c.campaign) crow[I.campaign] = c.campaign;
  }
  for (var i2 = 0; i2 < order.length; i2++) {
    var k2 = order[i2];
    var row2 = byKey[k2];
    var c2 = (crmAgg || {})[k2];
    row2[I.leads] = c2 ? c2.leads : 0;
    row2[I.clients] = c2 ? c2.clients : 0;
    row2[I.revenue] = c2 ? c2.revenue : 0;
  }

  /* Ред без нито едно число и без бележка е остатък — маха се, за да
     не остава следа от изтрита тестова заявка. */
  var out = [];
  for (var j = 0; j < order.length; j++) {
    var row3 = byKey[order[j]];
    var adsNonZero = bdsNum(row3[I.spend]) !== 0 ||
      bdsNum(row3[I.impressions]) !== 0 ||
      bdsNum(row3[I.clicks]) !== 0;
    var hasCrm = bdsNum(row3[I.leads]) !== 0 ||
      bdsNum(row3[I.clients]) !== 0 ||
      bdsNum(row3[I.revenue]) !== 0;
    var hasNote = String(row3[I.notes] || '').trim() !== '';
    if (!hasCrm && !hasNote && !adsNonZero) continue;
    out.push(row3);
  }

  out.sort(function (a, b) {
    if (a[I.date] !== b[I.date]) return a[I.date] < b[I.date] ? -1 : 1;
    if (a[I.channel] !== b[I.channel]) return a[I.channel] < b[I.channel] ? -1 : 1;
    var ca = String(a[I.campaign] || ''), cb = String(b[I.campaign] || '');
    if (ca !== cb) return ca < cb ? -1 : 1;
    return String(a[I.campaignId]) < String(b[I.campaignId]) ? -1 : 1;
  });
  return out;
}

/** UPSERT в Raw Ads. Ключ: Дата + Платформа + Campaign ID.
    Повторно пускане за същия ден ОБНОВЯВА реда, не добавя втори —
    рекламните платформи коригират числата си с дни назад. */
function bdsUpsertRawAds(existingRows, incoming, importedAt) {
  var R = BDS_RAW_IDX;
  var rows = [];
  var index = {};

  for (var i = 0; i < (existingRows || []).length; i++) {
    var src = (existingRows[i] || []).slice();
    var date = bdsDateKey(src[R.date]);
    var platform = String(src[R.platform] || '').trim();
    if (!date || !platform) continue;
    src[R.date] = date;
    var key = date + '|' + platform + '|' +
      String(src[R.campaignId] == null ? '' : src[R.campaignId]).trim();
    if (index.hasOwnProperty(key)) { rows[index[key]] = src; continue; }  /* стар дубликат се схлупва */
    index[key] = rows.length;
    rows.push(src);
  }

  var added = 0, updated = 0;
  for (var j = 0; j < (incoming || []).length; j++) {
    var inc = incoming[j] || {};
    var d = bdsDateKey(inc.date);
    var p = String(inc.platform || '').trim();
    if (!d || !p) continue;
    var cid = String(inc.campaignId == null ? '' : inc.campaignId).trim();
    var k = d + '|' + p + '|' + cid;
    var row = [
      d, p, cid, String(inc.campaign || ''),
      bdsNum(inc.spend), bdsNum(inc.impressions), bdsNum(inc.clicks),
      bdsNum(inc.conversions), importedAt || ''
    ];
    if (index.hasOwnProperty(k)) { rows[index[k]] = row; updated++; }
    else { index[k] = rows.length; rows.push(row); added++; }
  }

  rows.sort(function (a, b) {
    if (a[R.date] !== b[R.date]) return a[R.date] < b[R.date] ? -1 : 1;
    if (a[R.platform] !== b[R.platform]) return a[R.platform] < b[R.platform] ? -1 : 1;
    return String(a[R.campaignId]) < String(b[R.campaignId]) ? -1 : 1;
  });
  return { rows: rows, added: added, updated: updated };
}
