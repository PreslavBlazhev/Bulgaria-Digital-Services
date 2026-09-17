/* ============================================================
   BDS — банер и настройки за съгласие
   ------------------------------------------------------------
   Без съгласие Google Consent Mode остава `denied` и нито един
   рекламен таг не се зарежда. Този файл е единственото място,
   което може да смени това състояние — през BDSTracking.grantConsent.

   Принципи, които не са козметични:
   • „Само необходимите“ е също толкова видим и достъпен, колкото
     „Приемам всички“. Без dark patterns.
   • Затварянето със или без избор НЕ значи съгласие.
   • Изборът се помни и може да се смени по всяко време — връзката
     „Настройки за бисквитките“ в подвала отваря същия панел.
   • Смяна на версията на съгласието (CONSENT_VERSION) кара банера
     да се появи отново — при промяна на това какво се зарежда.
   ============================================================ */
(function (global) {
  'use strict';

  var STORAGE_KEY = 'bds_consent';
  var CONSENT_VERSION = 1;

  /* ---------- Съхранение ---------- */
  function readChoice() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var saved = JSON.parse(raw);
      if (!saved || saved.version !== CONSENT_VERSION) return null;
      return saved;
    } catch (e) { return null; }
  }

  function writeChoice(choice) {
    var record = {
      version: CONSENT_VERSION,
      analytics: !!choice.analytics,
      ads: !!choice.ads,
      at: new Date().toISOString()
    };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(record)); } catch (e) {}
    return record;
  }

  /** Единственият път към таговете. */
  function apply(choice) {
    if (global.BDSTracking && typeof global.BDSTracking.grantConsent === 'function') {
      global.BDSTracking.grantConsent({ analytics: !!choice.analytics, ads: !!choice.ads });
    }
  }

  /* ---------- Изглед ---------- */
  var banner = null;
  var prefs = null;
  var lastFocused = null;

  function el(tag, className, html) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (html != null) node.innerHTML = html;
    return node;
  }

  function removeBanner() {
    if (banner && banner.parentNode) banner.parentNode.removeChild(banner);
    banner = null;
  }

  function decide(analytics, ads) {
    var record = writeChoice({ analytics: analytics, ads: ads });
    apply(record);
    removeBanner();
    closePrefs();
  }

  function buildBanner() {
    if (banner) return;
    banner = el('div', 'consent');
    banner.setAttribute('role', 'region');
    banner.setAttribute('aria-label', 'Съгласие за бисквитки');
    banner.innerHTML =
      '<div class="consent__inner">' +
        '<div class="consent__text">' +
          '<h2 class="consent__title">Бисквитки</h2>' +
          '<p>Без вашето съгласие не зареждаме нищо от Google или Meta. ' +
          'С него виждаме коя реклама носи запитвания. ' +
          '<a href="privacy.html" class="consent__link">Политика за поверителност</a></p>' +
        '</div>' +
        '<div class="consent__actions">' +
          '<button type="button" class="btn btn--ghost consent__btn" data-consent="reject">Само необходимите</button>' +
          '<button type="button" class="btn btn--secondary consent__btn" data-consent="manage">Настройки</button>' +
          '<button type="button" class="btn btn--brand consent__btn" data-consent="accept">Приемам всички</button>' +
        '</div>' +
      '</div>';

    /* Пътят до privacy.html е различен от подпапка (restaurants/). */
    var base = document.body.getAttribute('data-base') || '';
    if (base) {
      var link = banner.querySelector('.consent__link');
      if (link) link.setAttribute('href', base + 'privacy.html');
    }

    banner.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-consent]');
      if (!btn) return;
      var action = btn.getAttribute('data-consent');
      if (action === 'accept') decide(true, true);
      else if (action === 'reject') decide(false, false);
      else if (action === 'manage') openPrefs();
    });

    document.body.appendChild(banner);
  }

  /* ---------- Панел с настройки ---------- */
  function closePrefs() {
    if (prefs && prefs.parentNode) prefs.parentNode.removeChild(prefs);
    prefs = null;
    document.removeEventListener('keydown', onPrefsKey);
    document.body.classList.remove('consent-open');
    if (lastFocused && lastFocused.focus) { try { lastFocused.focus(); } catch (e) {} }
  }

  function onPrefsKey(e) {
    if (!prefs) return;
    if (e.key === 'Escape') { e.preventDefault(); closePrefs(); return; }
    if (e.key !== 'Tab') return;
    /* Задържа фокуса вътре в диалога, докато е отворен. */
    var focusable = prefs.querySelectorAll('button, input, a[href]');
    if (!focusable.length) return;
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  function openPrefs() {
    if (prefs) return;
    lastFocused = document.activeElement;
    var saved = readChoice() || { analytics: false, ads: false };

    prefs = el('div', 'consent-modal');
    prefs.innerHTML =
      '<div class="consent-modal__backdrop" data-close="1"></div>' +
      '<div class="consent-modal__panel" role="dialog" aria-modal="true" aria-labelledby="consentPrefsTitle">' +
        '<h2 class="consent-modal__title" id="consentPrefsTitle">Настройки за бисквитките</h2>' +
        '<div class="consent-opt">' +
          '<div class="consent-opt__head">' +
            '<span class="consent-opt__name">Необходими</span>' +
            '<span class="consent-opt__always">винаги активни</span>' +
          '</div>' +
          '<p class="consent-opt__desc">Нужни са, за да работи сайтът и формата. Не се ползват за проследяване и не могат да се изключат.</p>' +
        '</div>' +
        '<div class="consent-opt">' +
          '<label class="consent-opt__head" for="consentAnalytics">' +
            '<span class="consent-opt__name">Анализ</span>' +
            '<input type="checkbox" id="consentAnalytics" class="consent-opt__box"' + (saved.analytics ? ' checked' : '') + ' />' +
          '</label>' +
          '<p class="consent-opt__desc">Показва колко хора идват и кои страници четат. Помага да не правим страници, които никой не ползва.</p>' +
        '</div>' +
        '<div class="consent-opt">' +
          '<label class="consent-opt__head" for="consentAds">' +
            '<span class="consent-opt__name">Реклама</span>' +
            '<input type="checkbox" id="consentAds" class="consent-opt__box"' + (saved.ads ? ' checked' : '') + ' />' +
          '</label>' +
          '<p class="consent-opt__desc">Позволява да разберем коя реклама е довела до запитване и да показваме реклами на хора, които вече са били тук.</p>' +
        '</div>' +
        '<div class="consent-modal__actions">' +
          '<button type="button" class="btn btn--ghost" data-close="1">Отказ</button>' +
          '<button type="button" class="btn btn--brand" data-save="1">Запази избора</button>' +
        '</div>' +
      '</div>';

    prefs.addEventListener('click', function (e) {
      if (e.target.closest('[data-close]')) { closePrefs(); return; }
      if (e.target.closest('[data-save]')) {
        decide(
          prefs.querySelector('#consentAnalytics').checked,
          prefs.querySelector('#consentAds').checked
        );
      }
    });

    document.body.appendChild(prefs);
    document.body.classList.add('consent-open');
    document.addEventListener('keydown', onPrefsKey);
    var firstBox = prefs.querySelector('input');
    if (firstBox) firstBox.focus();
  }

  /* ---------- Връзка „Настройки за бисквитките“ ---------- */
  function wireFooterLink() {
    document.addEventListener('click', function (e) {
      var trigger = e.target.closest('[data-consent-open]');
      if (!trigger) return;
      e.preventDefault();
      openPrefs();
    });
  }

  /* ---------- Старт ---------- */
  function init() {
    var saved = readChoice();
    if (saved) {
      /* Изборът важи и при следващото зареждане — без него Consent Mode
         остава denied и таговете не тръгват втори път. */
      apply(saved);
    } else {
      buildBanner();
    }
    wireFooterLink();
  }

  global.BDSConsent = {
    open: openPrefs,
    state: readChoice,
    /* За тестове и за смяна на решение по административен път. */
    reset: function () {
      try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
      closePrefs();
      removeBanner();
      buildBanner();
    }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window);
