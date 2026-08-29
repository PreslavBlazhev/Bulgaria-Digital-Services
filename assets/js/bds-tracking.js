/* ============================================================
   BDS — Конфигурация и зареждане на маркетинговите тагове
   ------------------------------------------------------------
   ЕДИНСТВЕНОТО място, където се въвеждат ID-та. Празен низ значи
   „не е конфигурирано“ — тогава НИЩО не се зарежда и няма нито
   една външна заявка. Никъде няма placeholder ID.

   ⚠ ДВЕ УСЛОВИЯ, за да тръгне таг:
      1. попълнено ID тук;
      2. дадено съгласие (виж БЛОКЕР по-долу).

   ⚠ БЛОКЕР ПРЕДИ РЕКЛАМА: сайтът НЯМА банер за съгласие. Google
   Consent Mode е инициализиран със стойност „denied“, както
   изисква ЕС. Докато няма банер, който да извика
   `BDSTracking.grantConsent(...)`, рекламните тагове НЯМА да се
   заредят — и това е правилното поведение, не пропуск.
   ============================================================ */
(function (global) {
  'use strict';

  var CONFIG = {
    /* Google Tag Manager — контейнерът, който управлява останалите. */
    gtmId: '',              /* GTM-XXXXXXX */

    /* Ползват се само ако таговете НЕ минават през GTM. */
    ga4Id: '',              /* G-XXXXXXXXXX */
    adsConversionId: '',    /* AW-XXXXXXXXX */
    adsLeadLabel: '',       /* етикетът на lead конверсията */
    metaPixelId: '',        /* цифров Pixel ID */

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

  function loadScript(src) {
    var s = document.createElement('script');
    s.async = true;
    s.src = src;
    document.head.appendChild(s);
    return s;
  }

  /** GA4 / Google Ads / GTM. Иска съгласие за анализ ИЛИ за реклама. */
  function loadGoogleTags() {
    if (googleLoaded) return;

    if (CONFIG.gtmId) {
      /* GTM се зарежда сам и оттам нататък управлява GA4, Ads и Meta. */
      loadScript('https://www.googletagmanager.com/gtm.js?id=' + encodeURIComponent(CONFIG.gtmId));
      global.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
      googleLoaded = true;
    } else if (CONFIG.ga4Id || CONFIG.adsConversionId) {
      var first = CONFIG.ga4Id || CONFIG.adsConversionId;
      loadScript('https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(first));
      gtag('js', new Date());
      if (CONFIG.ga4Id) gtag('config', CONFIG.ga4Id);
      if (CONFIG.adsConversionId) gtag('config', CONFIG.adsConversionId);
      global.gtag = global.gtag || gtag;
      googleLoaded = true;
    }
  }

  /** Meta Pixel. Иска съгласие за РЕКЛАМА — анализът не го отключва.
      Празен Pixel ID значи, че нищо не се зарежда и нищо не гърми. */
  function loadMetaPixel() {
    if (metaLoaded) return;
    if (!CONFIG.metaPixelId) return;
    /* Ако Meta минава през GTM, не се зарежда втори път оттук. */
    if (CONFIG.gtmId) return;

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
