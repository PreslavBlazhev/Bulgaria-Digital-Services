/* ============================================================
   BDS — ВНОС НА ДАННИ ОТ META ADS (MetaImport.gs)
   ------------------------------------------------------------
   Къде живее: в СЪЩИЯ Apps Script проект на таблицата BDS
   Operations (заедно с Code.gs, Logic.gs, Marketing.gs).

   Защо тук, а не като Google Ads Script: Meta няма собствена
   среда за скриптове вътре в рекламния акаунт. Данните се вземат
   през Marketing API с HTTPS заявка, а токенът трябва да живее на
   сигурно място. Script Properties е такова място; кодът на сайта
   не е.

   СЪСТОЯНИЕ: кодът е готов, но НЕ Е СВЪРЗАН, докато няма рекламен
   акаунт в Meta. Функциите отказват работа с ясно съобщение,
   вместо да се преструват на успешни.

   Какво трябва, за да заработи (виж SETUP.md, раздел Meta):
     META_AD_ACCOUNT_ID   напр. act_1234567890   — НЕ е тайна
     META_ACCESS_TOKEN    дълготраен токен       — ТАЙНА
   И двете се въвеждат в Project Settings → Script Properties.
   Никога в код, никога в таблицата, никога в сайта.
   ============================================================ */

var META_API_VERSION = 'v21.0';
var META_LOOKBACK_DAYS = 7;      /* Meta също коригира числата си назад */
var META_PLATFORM = 'Meta Ads';

function bdsMetaConfig_() {
  var props = PropertiesService.getScriptProperties();
  return {
    accountId: String(props.getProperty('META_AD_ACCOUNT_ID') || '').trim(),
    token: String(props.getProperty('META_ACCESS_TOKEN') || '').trim()
  };
}

/** Проверка на връзката. Не пише нищо в таблицата. */
function metaConnectionTest() {
  var cfg = bdsMetaConfig_();
  if (!cfg.accountId || !cfg.token) {
    var blocked = 'BLOCKED — META НЕ Е СВЪРЗАНА.\n\n' +
      'Липсва ' + (!cfg.accountId ? 'META_AD_ACCOUNT_ID' : '') +
      (!cfg.accountId && !cfg.token ? ' и ' : '') +
      (!cfg.token ? 'META_ACCESS_TOKEN' : '') + '.\n' +
      'Project Settings → Script Properties.';
    Logger.log(blocked);
    return blocked;
  }
  var url = 'https://graph.facebook.com/' + META_API_VERSION + '/' +
    encodeURIComponent(cfg.accountId) +
    '?fields=name,currency,account_status&access_token=' + encodeURIComponent(cfg.token);
  var res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  var body = res.getContentText();
  if (res.getResponseCode() !== 200) {
    var err = 'Meta отказа връзката (' + res.getResponseCode() + '): ' + body;
    Logger.log(err);
    return err;
  }
  var data = JSON.parse(body);
  var ok = 'Meta е свързана: ' + data.name + ' (' + data.currency + ').';
  Logger.log(ok);
  return ok;
}

/** Дневният внос. Слага се на тригер с installMetaTrigger(). */
function metaDailyImport() {
  var cfg = bdsMetaConfig_();
  if (!cfg.accountId || !cfg.token) {
    var blocked = 'BLOCKED — META НЕ Е СВЪРЗАНА. Вносът не е пуснат.';
    Logger.log(blocked);
    return blocked;
  }

  var range = bdsMetaRange_(META_LOOKBACK_DAYS);
  var rows = bdsMetaFetchInsights_(cfg, range.since, range.until);
  if (!rows.length) {
    var none = 'Meta: няма данни за ' + range.since + ' – ' + range.until + '.';
    Logger.log(none);
    return none;
  }
  var result = bdsImportAdsRows(rows);
  var msg = 'Meta: ' + rows.length + ' реда → ' + result.added + ' нови, ' +
    result.updated + ' обновени.';
  Logger.log(msg);
  return msg;
}

function bdsMetaRange_(days) {
  var tz = Session.getScriptTimeZone();
  var today = new Date();
  var since = new Date(today.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
  return {
    since: Utilities.formatDate(since, tz, 'yyyy-MM-dd'),
    until: Utilities.formatDate(today, tz, 'yyyy-MM-dd')
  };
}

/** Един ред на кампания на ден. time_increment=1 дава разбивка по дни. */
function bdsMetaFetchInsights_(cfg, since, until) {
  var base = 'https://graph.facebook.com/' + META_API_VERSION + '/' +
    encodeURIComponent(cfg.accountId) + '/insights';
  var params = [
    'level=campaign',
    'time_increment=1',
    'fields=campaign_id,campaign_name,spend,impressions,clicks,actions',
    'time_range=' + encodeURIComponent(JSON.stringify({ since: since, until: until })),
    'limit=500',
    'access_token=' + encodeURIComponent(cfg.token)
  ];
  var url = base + '?' + params.join('&');

  var out = [];
  var guard = 0;
  while (url && guard++ < 20) {          /* страниране, с таван */
    var res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    if (res.getResponseCode() !== 200) {
      throw new Error('Meta API ' + res.getResponseCode() + ': ' + res.getContentText());
    }
    var data = JSON.parse(res.getContentText());
    var list = data.data || [];
    for (var i = 0; i < list.length; i++) {
      var r = list[i];
      out.push({
        date: r.date_start,
        platform: META_PLATFORM,
        campaignId: String(r.campaign_id || ''),
        campaign: String(r.campaign_name || ''),
        spend: Number(r.spend || 0),
        impressions: Number(r.impressions || 0),
        clicks: Number(r.clicks || 0),
        conversions: bdsMetaLeads_(r.actions)
      });
    }
    url = data.paging && data.paging.next ? data.paging.next : '';
  }
  return out;
}

/** Конверсиите на Meta са списък от действия. Взимаме само заявките.
    Това число остава СПРАВКА — истинският брой заявки идва от CRM. */
function bdsMetaLeads_(actions) {
  if (!actions || !actions.length) return 0;
  for (var i = 0; i < actions.length; i++) {
    var t = String(actions[i].action_type || '');
    if (t === 'lead' || t === 'offsite_conversion.fb_pixel_lead') {
      return Number(actions[i].value || 0);
    }
  }
  return 0;
}

/** Пуска се веднъж на ръка, СЛЕД като Meta е свързана. */
function installMetaTrigger() {
  var cfg = bdsMetaConfig_();
  if (!cfg.accountId || !cfg.token) {
    var blocked = 'BLOCKED — първо въведи META_AD_ACCOUNT_ID и META_ACCESS_TOKEN.';
    Logger.log(blocked);
    try { SpreadsheetApp.getUi().alert(blocked); } catch (e) {}
    return blocked;
  }
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'metaDailyImport') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  ScriptApp.newTrigger('metaDailyImport').timeBased().atHour(5).everyDays(1).create();
  var msg = 'Дневният внос от Meta е включен — всяка сутрин около 5:00.';
  Logger.log(msg);
  try { SpreadsheetApp.getUi().alert(msg); } catch (e) {}
  return msg;
}
