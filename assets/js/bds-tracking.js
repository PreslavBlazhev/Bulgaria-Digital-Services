/* ============================================================
   BDS — Конфигурация и зареждане на маркетинговите тагове
   ------------------------------------------------------------
   ЕДИНСТВЕНОТО място, където се въвеждат ID-та. Празен низ значи
   „не е конфигурирано“. Никъде няма placeholder ID.

   ⚠ РЕДЪТ НА ЗАРЕЖДАНЕ Е ЧАСТ ОТ ДОГОВОРА.
   Този файл се зарежда СИНХРОННО в <head>, НАД снипета на Google
   Tag Manager. Причината е една: `gtag('consent', 'default', …)`
   по-долу трябва да е в dataLayer ПРЕДИ контейнерът да тръгне.
   Сложи ли се под него, контейнерът стартира без ограничение и
   съгласието вече не значи нищо. Не го мести в края на <body> и
   не му слагай defer.

   ⚠ КОЙ КАКВО ЗАРЕЖДА:
      · GTM контейнерът — от HTML, със снипета във всяка страница.
        Оттам се управляват GA4 и Google Ads. Отделен gtag.js
        loader НЯМА и не бива да се добавя: две независими GA4
        инсталации удвояват всяко събитие.
      · Meta Pixel — оттук, и то само при съгласие за реклама.
        Пикселът НЕ е в контейнера (виж metaViaGtm).

   ⚠ Съгласието остава единственият ключ. До избора на посетителя
   всички категории са `denied`, контейнерът не задава нито една
   аналитична или рекламна бисквитка, а Meta изобщо не се зарежда.
   ============================================================ */
(function (global) {
  'use strict';

  var CONFIG = {
    /* Google Tag Manager — контейнерът, който управлява останалите.
       Снипетът във всяка страница носи същия ID: генераторът
       tools/build-pages.mjs го чете ОТТУК и го записва в HTML-а,
       за да няма как двете места да се разминат. */
    gtmId: 'GTM-W4PX4KPR',

    /* GA4 — таг ВЪТРЕ в контейнера, не втори loader тук. Стойността
       стои записана, за да има едно място, което казва кой поток се
       пълни, и за да могат тестовете да го проверят. */
    ga4Id: 'G-K3GKSLPE1N',

    /* Конверсиите на Google Ads още нямат ID и етикет. */
    adsConversionId: '',    /* AW-XXXXXXXXX */
    adsLeadLabel: '',       /* етикетът на lead конверсията */

    /* Meta Dataset „BDS Website“. Pixel ID НЕ е тайна — той е видим в
       кода на всеки сайт с пиксел и служи само за изпращане на събития.
       Тайна е access token-ът, а той не живее тук и не влиза в проекта.

       Въпреки че е попълнен, пикселът не се зарежда, докато посетителят
       не даде съгласие за реклама. Виж loadMetaPixel(). */
    metaPixelId: '1666581461701404',

    /* Влиза ли Meta Pixel в GTM контейнера? Докато е false, пикселът
       се зарежда оттук. Вдигни го на true САМО след като пикселът
       наистина е добавен като таг в контейнера — иначе Meta спира да
       получава каквото и да било. */
    metaViaGtm: false,

    /* Включва подробен изход в конзолата. В production остава false. */
    debug: false
  };

  /* Полета, които НИКОГА не заминават към analytics. Списъкът е
     denylist по име плюс проверка по стойност — в аналитиката не
     влизат лични данни, дори случайно. */
  var PII_KEYS = [
    'name', 'full_name', 'fullname', 'business_name', 'businessname',
    'phone', 'tel', 'email', 'mail', 'website_url', 'url', 'message',
    'address', 'contact'
  ];
  var LOOKS_PERSONAL = /[^\s@]+@[^\s@]+\.[^\s@]+|(\+?\d[\d\s()-]{7,})/;

  function scrub(params) {
    var clean = {};
    if (!params) return clean;
    Object.keys(params).forEach(function (key) {
      var lower = String(key).toLowerCase();
      if (PII_KEYS.indexOf(lower) !== -1) return;
      var value = params[key];
      if (typeof value === 'string' && LOOKS_PERSONAL.test(value)) return;
      clean[key] = value;
    });
    return clean;
  }

  /* ---------- Съгласие ----------
     Consent Mode v2 по подразбиране отказва всичко освен
     функционалното. Банерът (когато го има) трябва да извика
     grantConsent() със заявеното от потребителя. */
  var consentState = {
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied'
  };

  global.dataLayer = global.dataLayer || [];
  function gtag() { global.dataLayer.push(arguments); }

  gtag('consent', 'default', {
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    wait_for_update: 500
  });

  /* Двата свята се зареждат ПООТДЕЛНО и всеки помни себе си.

     Първата версия имаше един общ флаг `loaded` и една функция
     `loadTags()`, викана при „анализ ИЛИ реклама“. Две последствия,
     и двете грешни:

       · съгласие само за анализ зареждаше и рекламния Pixel;
       · съгласие за реклама, дадено ПО-КЪСНО, не зареждаше нищо —
         общият флаг вече беше вдигнат и функцията излизаше веднага.

     Затова: отделен флаг за Google и отделен за Meta, и всяка
     функция може да се вика повторно без да дублира нищо. */
  var googleLoaded = false;
  var metaLoaded = false;

  /** Google. Контейнерът вече е на страницата — оттук не се тегли
      скрипт. Отключването е `consent update`-ът, който grantConsent()
      изпраща непосредствено преди това извикване. Затова флагът значи
      „Google таговете са отключени“, а не „скриптът е изтеглен“.

      Тук нарочно НЯМА gtag.js loader: редом с GTM той прави втора,
      независима GA4 инсталация и удвоява всяко събитие. */
  function loadGoogleTags() {
    if (googleLoaded) return;
    if (!CONFIG.gtmId) return;
    global.gtag = global.gtag || gtag;
    googleLoaded = true;
  }

  /** Meta Pixel. Иска съгласие за РЕКЛАМА — анализът не го отключва.
      Празен Pixel ID значи, че нищо не се зарежда и нищо не гърми. */
  function loadMetaPixel() {
    if (metaLoaded) return;
    if (!CONFIG.metaPixelId) return;
    /* Оттук пикселът се зарежда, ДОКАТО не е добавен в контейнера.
       Условието е metaViaGtm, а не gtmId: наличието на контейнер не
       значи, че пикселът е вътре в него. Обратното изключваше Meta в
       мига, в който GTM получи ID. */
    if (CONFIG.metaViaGtm) return;

    /* eslint-disable */
    !function (f, b, e, v, n, t, s) {
      if (f.fbq) return; n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = [];
      t = b.createElement(e); t.async = !0; t.src = v;
      s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    }(global, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    /* eslint-enable */
    global.fbq('init', CONFIG.metaPixelId);
    /* PageView тръгва ЧАК тук — след съгласието, не при зареждане. */
    global.fbq('track', 'PageView');
    metaLoaded = true;
    if (CONFIG.debug) console.info('[BDS tracking] Meta Pixel зареден');
  }

  /**
   * Извиква се от банера за съгласие. Може да се вика многократно —
   * при смяна на избора се зарежда само това, което още го няма.
   * @param {{analytics?:boolean, ads?:boolean}} choice
   */
  function grantConsent(choice) {
    choice = choice || {};
    consentState.analytics_storage = choice.analytics ? 'granted' : 'denied';
    consentState.ad_storage = choice.ads ? 'granted' : 'denied';
    consentState.ad_user_data = choice.ads ? 'granted' : 'denied';
    consentState.ad_personalization = choice.ads ? 'granted' : 'denied';
    gtag('consent', 'update', consentState);

    if (choice.analytics || choice.ads) loadGoogleTags();
    if (choice.ads) loadMetaPixel();

    if (CONFIG.debug) console.info('[BDS tracking] съгласие:', consentState);
  }

  function adsAllowed() {
    return consentState.ad_storage === 'granted';
  }

  /** Единственият път към fbq. Мълчи, ако рекламата не е разрешена
      или Pixel-ът не е зареден — така извикването е безопасно
      навсякъде и не иска проверки на всяко място. */
  function meta(kind, name, params, options) {
    if (!adsAllowed()) return false;
    if (typeof global.fbq !== 'function') return false;
    try {
      global.fbq(kind, name, scrub(params) || {}, options || undefined);
      return true;
    } catch (e) {
      return false;
    }
  }

  function isConfigured() {
    return Boolean(CONFIG.gtmId || CONFIG.ga4Id || CONFIG.adsConversionId || CONFIG.metaPixelId);
  }

  global.BDSTracking = {
    config: CONFIG,
    scrub: scrub,
    grantConsent: grantConsent,
    consentState: function () { return JSON.parse(JSON.stringify(consentState)); },
    isConfigured: isConfigured,
    isLoaded: function () { return googleLoaded || metaLoaded; },
    isMetaLoaded: function () { return metaLoaded; },
    adsAllowed: adsAllowed,
    meta: meta,
    gtag: gtag
  };
})(window);
