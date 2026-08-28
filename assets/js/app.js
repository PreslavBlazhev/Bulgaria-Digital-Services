/* ============================================================
   BDS — shared app (multi-page shell + animations)
   Injects header/footer, handles transitions & all interactions
   ============================================================ */
(function () {
  'use strict';

  /* ---------- Preloader (кратък premium loader) ---------- */
  (function () {
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var pre = document.createElement('div');
    pre.className = 'preloader';
    pre.setAttribute('role', 'status');
    pre.setAttribute('aria-label', 'Зареждане');
    pre.innerHTML = '<div class="preloader__mark" aria-hidden="true">' +
      '<img src="' + ((document.body && document.body.getAttribute('data-base')) || '') + 'assets/img/bds-logo.webp" alt="" width="600" height="234" /></div>';
    // Към <html>, за да не го скрива body opacity fade
    document.documentElement.appendChild(pre);

    var start = Date.now();
    function finish() {
      var wait = Math.max(0, (reduce ? 0 : 650) - (Date.now() - start));
      setTimeout(function () {
        pre.classList.add('hide');
        setTimeout(function () { if (pre.parentNode) pre.parentNode.removeChild(pre); }, reduce ? 60 : 650);
      }, wait);
    }
    if (document.readyState === 'complete') finish();
    else window.addEventListener('load', finish);
  })();

  var LOGO = '<img class="brand__logo" src="assets/img/bds-logo.webp" alt="Bulgaria Digital Services" width="600" height="234" decoding="async" />';

  var NAV = [
    { href: 'index.html',    key: 'home',     label: 'Начало' },
    { href: 'services.html', key: 'services', label: 'Услуги' },
    { href: 'projects.html', key: 'projects', label: 'Проекти' },
    { href: 'process.html',  key: 'process',  label: 'Процес' },
    { href: 'about.html',    key: 'about',    label: 'За нас' },
    { href: 'contact.html',  key: 'contact',  label: 'Контакти' }
  ];

  var page = document.body.getAttribute('data-page') || 'home';
  /* Рекламните landing страници минимизират отклоненията: без пълно меню,
     с една ясна цел. Всяка друга страница ползва обичайния сайт shell. */
  var layout = document.body.getAttribute('data-layout') || 'site';
  var isLanding = layout === 'landing';

  /* ---------- Build header ---------- */
  function buildLandingHeader() {
    return '' +
      '<div class="scroll-progress" id="scrollProgress"></div>' +
      '<header class="header header--landing" id="header"><nav class="nav" aria-label="Основна навигация">' +
        '<a href="/restaurants" class="brand" aria-label="Bulgaria Digital Services — начало на страницата">' + LOGO + '</a>' +
        '<div class="nav__right">' +
          '<a href="index.html" class="nav__exit">Към основния сайт</a>' +
          '<a href="contact.html" class="btn btn--brand nav__cta" data-track="cta_header_landing">Заяви безплатна консултация</a>' +
        '</div>' +
      '</nav></header>';
  }

  function buildHeader() {
    if (isLanding) return buildLandingHeader();
    var links = NAV.map(function (n) {
      var active = n.key === page ? ' class="is-active"' : '';
      return '<li><a href="' + n.href + '"' + active + '>' + n.label + '</a></li>';
    }).join('');

    return '' +
      '<div class="scroll-progress" id="scrollProgress"></div>' +
      '<header class="header" id="header"><nav class="nav" aria-label="Основна навигация">' +
        '<a href="index.html" class="brand" aria-label="Bulgaria Digital Services — начало">' + LOGO + '</a>' +
        '<ul class="nav__links" id="navLinks">' + links +
          '<li class="nav__cta-mobile"><a href="contact.html" class="btn btn--brand">Безплатна консултация</a></li>' +
        '</ul>' +
        '<div class="nav__right">' +
          '<a href="contact.html" class="btn btn--brand nav__cta">Безплатна консултация</a>' +
          '<button class="nav__toggle" id="navToggle" aria-label="Отвори меню" aria-expanded="false" aria-controls="navLinks">' +
            '<span></span><span></span><span></span></button>' +
        '</div>' +
      '</nav></header>';
  }

  /* ---------- Build footer ---------- */
  function buildLandingFooter() {
    return '' +
      '<footer class="footer footer--landing"><div class="container footer__bottom">' +
        '<span>© <span id="year"></span> Bulgaria Digital Services · ' +
          '<a href="mailto:pr2.blazhev@gmail.com">pr2.blazhev@gmail.com</a> · ' +
          '<a href="tel:+359877364001">0877 364 001</a></span>' +
        '<div class="footer__legal">' +
          '<a href="index.html">Основен сайт</a>' +
          '<a href="privacy.html">Поверителност</a>' +
          '<a href="terms.html">Общи условия</a>' +
          /* Съгласието трябва да може да се оттегли толкова лесно, колкото е дадено. */
          '<button type="button" class="footer__consent" data-consent-open>Настройки за бисквитките</button>' +
        '</div>' +
      '</div></footer>' +
      '<a href="contact.html" class="fab" data-track="cta_fab_landing" aria-label="Заяви безплатна консултация">Заяви консултация</a>';
  }

  function buildFooter() {
    if (isLanding) return buildLandingFooter();
    return '' +
      '<footer class="footer"><div class="container footer__grid">' +
        '<div class="footer__brand reveal" data-delay="1"><a href="index.html" class="brand">' + LOGO + '</a>' +
          '<p>Изграждаме дигитално присъствие, което помага на бизнеса да изглежда по-професионално и да получава повече клиенти.</p>' +
          '<div class="footer__social"><a href="https://instagram.com/_.preslav._b" target="_blank" rel="noopener" aria-label="Instagram">IG</a></div>' +
        '</div>' +
        '<div class="footer__col reveal" data-delay="2"><h4>Навигация</h4>' +
          '<a href="index.html">Начало</a><a href="services.html">Услуги</a><a href="projects.html">Проекти</a><a href="process.html">Процес</a><a href="about.html">За нас</a></div>' +
        '<div class="footer__col reveal" data-delay="3"><h4>Оферта</h4>' +
          '<a href="services.html#packages">Пакети START, BUSINESS, PREMIUM</a>' +
          '<a href="packages.html">Кой пакет е за мен?</a>' +
          '<a href="services.html#systems">Дигитални бизнес системи</a>' +
          '<a href="services.html#addons">Add-ons</a>' +
          '<a href="projects.html">Case studies</a></div>' +
        '<div class="footer__col reveal" data-delay="4"><h4>Контакти</h4>' +
          '<span>Преслав Блажев</span>' +
          '<a href="mailto:pr2.blazhev@gmail.com">pr2.blazhev@gmail.com</a><a href="tel:+359877364001">0877 364 001</a>' +
          '<span>с. Къшин, общ. Плевен<br>ул. „Кирил и Методий“ 8</span>' +
          '<span>Отговаряме 24/7 · България</span><a href="contact.html">Запитване</a></div>' +
      '</div>' +
      '<div class="container footer__bottom">' +
        '<span>© <span id="year"></span> Bulgaria Digital Services. Всички права запазени.</span>' +
        '<div class="footer__legal"><a href="privacy.html">Поверителност</a><a href="terms.html">Общи условия</a>' +
          '<button type="button" class="footer__consent" data-consent-open>Настройки за бисквитките</button></div>' +
      '</div></footer>' +
      '<a href="contact.html" class="fab" aria-label="Заяви консултация">Запитване</a>';
  }

  /* ---------- Inject shell ---------- */
  var basePath = document.body.getAttribute('data-base') || '';

  function withBase(html) {
    if (!basePath) return html;
    return html
      .replace(/href="(?!https?:|mailto:|tel:|#|\/)/g, 'href="' + basePath)
      .replace(/src="(?!https?:|data:|\/)/g, 'src="' + basePath);
  }

  var headerMount = document.getElementById('site-header');
  var footerMount = document.getElementById('site-footer');
  if (headerMount) headerMount.innerHTML = withBase(buildHeader());
  if (footerMount) footerMount.innerHTML = withBase(buildFooter());

  /* ---------- Accessibility: skip-to-content link ---------- */
  var mainEl = document.querySelector('main');
  if (mainEl) {
    if (!mainEl.id) mainEl.id = 'main';
    var skip = document.createElement('a');
    skip.className = 'skip-link';
    skip.href = '#' + mainEl.id;
    skip.textContent = 'Към съдържанието';
    document.body.insertBefore(skip, document.body.firstChild);
  }

  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Header scroll + progress + FAB ---------- */
  var header = document.getElementById('header');
  var progress = document.getElementById('scrollProgress');
  var fab = document.querySelector('.fab');
  function onScroll() {
    var y = window.scrollY;
    var h = document.documentElement.scrollHeight - window.innerHeight;
    if (header) header.classList.toggle('scrolled', y > 20);
    if (progress) progress.style.width = (h > 0 ? (y / h) * 100 : 0) + '%';
    if (fab) fab.classList.toggle('show', y > 700);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Mobile menu ---------- */
  var toggle = document.getElementById('navToggle');
  var links = document.getElementById('navLinks');
  function closeMenu() {
    if (!links) return;
    links.classList.remove('open');
    toggle.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Отвори меню');
    document.body.classList.remove('menu-open');
  }
  if (toggle && links) {
    toggle.addEventListener('click', function () {
      var open = links.classList.toggle('open');
      toggle.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Затвори меню' : 'Отвори меню');
      document.body.classList.toggle('menu-open', open);
    });
    // затваряй fullscreen менюто при избор на линк
    links.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', closeMenu);
    });
    // затваряй с Escape
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && links.classList.contains('open')) closeMenu();
    });
  }

  /* ---------- Page transitions ---------- */
  var overlay = document.createElement('div');
  overlay.className = 'page-transition reveal-on-load';
  document.body.appendChild(overlay);

  // Класът `loaded` вече не управлява видимостта на страницата —
  // тя се рисува веднага щом CSS е готов (виж бележката в style.css).
  // Запазен е само като кука за евентуален бъдещ стил.
  requestAnimationFrame(function () {
    document.body.classList.add('loaded');
  });

  function isInternal(a) {
    if (!a) return false;
    var href = a.getAttribute('href') || '';
    if (a.target === '_blank' || a.hasAttribute('download')) return false;
    if (href.indexOf('#') === 0 || href.indexOf('mailto:') === 0 || href.indexOf('tel:') === 0) return false;
    if (href.indexOf('http') === 0 && a.host !== location.host) return false;
    return /\.html$/.test(href) || href === '' || href.indexOf('/') === 0;
  }

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a');
    if (!a || !isInternal(a)) return;
    var url = a.getAttribute('href');
    // same page? let default anchor handling occur
    if (url.split('#')[0] === location.pathname.split('/').pop()) return;
    if (reduceMotion) return;
    e.preventDefault();
    closeMenu();
    overlay.classList.remove('reveal-on-load');
    overlay.classList.add('cover');
    setTimeout(function () { window.location.href = url; }, 460);
  });

  /* ---------- Scroll reveal ---------- */
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add('in'); io.unobserve(entry.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- Count-up numbers ---------- */
  function countUp(el) {
    var target = parseFloat(el.getAttribute('data-count'));
    var suffix = el.getAttribute('data-suffix') || '';
    var dur = 1400, start = null;
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      var val = target * eased;
      el.textContent = (target % 1 === 0 ? Math.round(val) : val.toFixed(1)) + suffix;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  var counters = document.querySelectorAll('[data-count]');
  if ('IntersectionObserver' in window && counters.length) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { countUp(entry.target); cio.unobserve(entry.target); }
      });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { cio.observe(el); });
  }

  /* ---------- FAQ accordion ---------- */
  document.querySelectorAll('.faq__item').forEach(function (item) {
    var btn = item.querySelector('.faq__q');
    var answer = item.querySelector('.faq__a');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var isOpen = item.classList.contains('active');
      document.querySelectorAll('.faq__item').forEach(function (other) {
        other.classList.remove('active');
        var q = other.querySelector('.faq__q'); if (q) q.setAttribute('aria-expanded', 'false');
        var a = other.querySelector('.faq__a'); if (a) a.style.maxHeight = null;
      });
      if (!isOpen) {
        item.classList.add('active');
        btn.setAttribute('aria-expanded', 'true');
        answer.style.maxHeight = answer.scrollHeight + 'px';
      }
    });
  });

  /* ---------- Contact form (lead generation) ---------- */
  // Изпраща запитването директно на имейла чрез FormSubmit (без backend).
  // ВАЖНО: при ПЪРВОТО изпращане FormSubmit праща имейл за потвърждение на
  // pr2.blazhev@gmail.com — трябва да се кликне линкът в него ЕДНОКРАТНО, за да се активира.
  // За смяна на получателя — смени имейла в LEAD_ENDPOINT.
  var LEAD_ENDPOINT = 'https://formsubmit.co/ajax/pr2.blazhev@gmail.com';

  /* ---------- CRM ----------
     Адресът на Google Apps Script Web App-а, който записва заявката в
     таблицата. Празен низ = не е свързан; тогава просто не се вика и
     нищо не се чупи. Кодът и инструкцията са в tools/crm/.

     Имейлът остава първичният път. CRM записът се прави ДОПЪЛНИТЕЛНО
     и НИКОГА не блокира потребителя: ако таблицата е недостъпна,
     човекът пак вижда „благодарим“, а заявката пак е в пощата. */
  var CRM_ENDPOINT = '';

  /** Записва заявката в CRM. Не връща нищо и не хвърля — по проект. */
  function sendToCrm(leadId, form, attribution) {
    if (!CRM_ENDPOINT) return;
    var el = form.elements;
    var a = attribution || {};
    var payload = {
      lead_id: leadId,
      full_name: el.full_name ? el.full_name.value : '',
      business_name: el.business_name ? el.business_name.value : '',
      phone: el.phone ? el.phone.value : '',
      email: el.email ? el.email.value : '',
      service_interest: el.service_interest ? el.service_interest.value : '',
      budget_range: el.budget_range ? el.budget_range.value : '',
      has_website: el.has_website ? el.has_website.value : '',
      website_url: el.website_url ? el.website_url.value : '',
      _honey: el._honey ? el._honey.value : '',
      source_category: a.source_category || '',
      source: a.source || '',
      medium: a.medium || '',
      campaign: a.campaign || '',
      content: a.content || '',
      term: a.term || '',
      gclid: a.gclid || '',
      landing_page: a.landing_page || '',
      referrer: a.referrer || '',
      first_source_category: a.first_source_category || '',
      first_source: a.first_source || '',
      first_medium: a.first_medium || '',
      first_campaign: a.first_campaign || '',
      first_landing_page: a.first_landing_page || '',
      first_touch_at: a.first_touch_at || ''
    };
    try {
      /* text/plain нарочно: така заявката е „проста“ и не тръгва CORS
         preflight, който Apps Script не обслужва. Тялото пак е JSON. */
      fetch(CRM_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
        keepalive: true      /* оцелява навигацията към thank-you */
      })['catch'](function () { /* CRM-ът никога не проваля заявката */ });
    } catch (e) { /* същото */ }
  }
  /* FormSubmit праща таблица с плоски полета — вложен обект би се показал
     като [object Object]. Затова източникът се сплесква до един ред. */
  function attributionLine(attr) {
    if (!attr) return 'директно / без рекламни параметри';
    return Object.keys(attr)
      .map(function (k) { return k + '=' + attr[k]; })
      .join(' · ');
  }

  function submitLead(lead) {
    return fetch(LEAD_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        _subject: 'Ново запитване от сайта — ' + lead.name,
        _template: 'table',
        'Име': lead.name,
        'Телефон': lead.phone,
        'Имейл': lead.email,
        'Тип бизнес': lead.businessType,
        'Услуга': lead.service,
        'Съобщение': lead.message,
        'Страница': lead.page,
        'Източник': attributionLine(lead.attribution)
      })
    }).then(function (r) { return r.json(); });
  }

  /* Бутоните в hero-а подават ?service=... — формата се отваря вече попълнена,
     иначе четирите заявки водят до един и същ празен формуляр. */
  (function prefillService() {
    var f = document.getElementById('contactForm');
    if (!f || !f.service) return;
    var match = /[?&]service=([^&]+)/.exec(location.search);
    if (!match) return;
    var wanted = decodeURIComponent(match[1].replace(/\+/g, ' '));
    var opts = f.service.options;
    for (var i = 0; i < opts.length; i++) {
      if (opts[i].text === wanted) { f.service.selectedIndex = i; return; }
    }
  })();

  var form = document.getElementById('contactForm');
  if (form) {
    var note = document.getElementById('formNote');
    var submitBtn = form.querySelector('[type="submit"]');
    function showNote(text, type) {
      note.className = 'form__note';
      note.textContent = text;
      void note.offsetWidth; // reflow → transition-ът се превърта наново
      note.classList.add(type);
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault(); // без reload на страницата

      var name = form.name.value.trim();
      var email = form.email.value.trim();
      var emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      if (!name || !emailOk) {
        showNote('Моля, попълнете име и валиден имейл.', 'error');
        return;
      }

      // Структуриран lead — готов за CRM / email / AI / database
      var lead = {
        name: name,
        phone: form.phone.value.trim(),
        email: email,
        businessType: form.business.value,
        service: form.service.value,
        message: form.message.value.trim(),
        source: 'website-contact-form',
        attribution: (window.BDSAttribution && window.BDSAttribution.get()) || null,
        page: location.pathname,
        submittedAt: new Date().toISOString()
      };

      // premium loading state → изпращане → success/error с fade/slide
      note.className = 'form__note';
      if (submitBtn) submitBtn.classList.add('is-loading');
      submitLead(lead).then(function (res) {
        if (submitBtn) submitBtn.classList.remove('is-loading');
        if (res && (res.success === 'true' || res.success === true)) {
          showNote('Благодарим! Запитването е изпратено — ще се свържем с вас скоро.', 'success');
          form.reset();
        } else {
          showNote('Възникна проблем при изпращането. Пишете ни на pr2.blazhev@gmail.com', 'error');
        }
      }).catch(function () {
        if (submitBtn) submitBtn.classList.remove('is-loading');
        showNote('Няма връзка в момента. Пишете ни на pr2.blazhev@gmail.com', 'error');
      });
    });
  }

  /* ---------- Attribution ----------
     Рекламният клик носи UTM/gclid само в ПЪРВИЯ адрес. Затова всяко
     „докосване“ със сигнал се записва, а после се чете от формата.

     ДВА ЗАПИСА, и двата в localStorage (не sessionStorage — кампания
     от понеделник трябва да оцелее до заявка в сряда):

       bds_attr_first  — първото докосване. Пише се веднъж и НИКОГА
                         не се презаписва.
       bds_attr_last   — последното ЗНАЧИМО докосване. Обновява се
                         само когато има реален сигнал.

     РЕШЕНИЕ ЗА ДИРЕКТНИТЕ ПОСЕЩЕНИЯ: директно влизане (без UTM, без
     gclid, без външен referrer) НЕ пипа нито един от двата записа.
     Иначе човек, дошъл от реклама и върнал се на другия ден по памет,
     би изглеждал като „direct“ — а рекламата е платена.

     Тук няма и не бива да има лични данни. */
  var UTM_FIELDS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
  var CLICK_IDS = ['gclid', 'fbclid', 'ttclid', 'msclkid'];
  var FIRST_KEY = 'bds_attr_first';
  var LAST_KEY = 'bds_attr_last';

  var SOURCE_LABELS = {
    google_ads: 'Google Ads',
    meta_ads: 'Meta Ads',
    organic_google: 'Organic Google',
    instagram: 'Instagram',
    facebook: 'Facebook',
    referral: 'Referral',
    direct: 'Direct',
    other: 'Other'
  };

  var PAID_SEARCH = /^(cpc|ppc|paid_?search|paidsearch|sem|adwords)$/;
  var PAID_SOCIAL = /^(paid_?social|paidsocial|social_?paid|paid)$/;

  function lower(v) { return String(v || '').trim().toLowerCase(); }

  /** Домейнът на referrer-а, или '' при директно влизане.
     Приема И пълен адрес, И само домейн. Причината: currentTouch()
     записва в `touch.referrer` вече САМО домейна, а classify() после
     пак минава оттук. Докато тук се приемаше единствено пълен адрес,
     `new URL('google.com')` хвърляше, host оставаше празен и всяко
     посещение, чийто единствен сигнал е referrer-ът — органичен
     Google, referral от чужд сайт, органичен Instagram/Facebook —
     се класифицираше като `direct`. Платените кликове не бяха
     засегнати, защото gclid/utm_source излизат по-рано. */
  function refHost(referrer) {
    if (!referrer) return '';
    try { return new URL(referrer).hostname.replace(/^www\./, ''); } catch (e) { /* не е пълен адрес */ }
    var bare = String(referrer).trim().toLowerCase().replace(/^www\./, '');
    return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(bare) ? bare : '';
  }

  function isOwnDomain(host) {
    if (!host) return false;
    return host === location.hostname.replace(/^www\./, '');
  }

  /**
   * Класифицира докосването в една от осемте канонични категории.
   * Редът е важен: платеният сигнал бие referrer-а, защото referrer-ът
   * е по-слабо доказателство и би подменил платен клик с органичен.
   */
  function classify(touch) {
    var src = lower(touch.utm_source);
    var med = lower(touch.utm_medium);
    var host = refHost(touch.referrer);

    /* 1. Google Ads — най-силният сигнал е самият click ID. */
    if (touch.gclid) return 'google_ads';
    if (/google/.test(src) && PAID_SEARCH.test(med)) return 'google_ads';

    /* 2. Meta Ads. `utm_source=meta` е самостоятелно достатъчен;
          facebook/instagram изискват и платен medium, защото иначе
          може да е обикновен пост. */
    if (/^meta$/.test(src)) return 'meta_ads';
    if (touch.fbclid && PAID_SOCIAL.test(med)) return 'meta_ads';
    if (/facebook|instagram|^fb$|^ig$/.test(src) && (PAID_SOCIAL.test(med) || PAID_SEARCH.test(med))) return 'meta_ads';

    /* 3. Явен UTM източник без платен medium. */
    if (src) {
      if (/google/.test(src)) return 'organic_google';
      if (/instagram|^ig$/.test(src)) return 'instagram';
      if (/facebook|^fb$/.test(src)) return 'facebook';
      return 'other';
    }

    /* 4. Класификация по referrer. */
    if (host && !isOwnDomain(host)) {
      if (/(^|\.)google\./.test(host)) return 'organic_google';
      if (/instagram\.com$/.test(host)) return 'instagram';
      if (/(facebook\.com|fb\.com|messenger\.com)$/.test(host)) return 'facebook';
      return 'referral';
    }

    /* 5. Нищо не сочи източник. */
    return 'direct';
  }

  /** Чете текущото докосване от адреса и referrer-а. */
  function currentTouch() {
    var params;
    try { params = new URLSearchParams(location.search); } catch (e) { params = null; }
    var touch = {};

    UTM_FIELDS.concat(CLICK_IDS).forEach(function (f) {
      var v = params ? params.get(f) : null;
      if (v) touch[f] = String(v).slice(0, 180);
    });

    var host = refHost(document.referrer);
    /* Собственият домейн не е източник — вътрешната навигация не бива
       да се брои за referral. */
    touch.referrer = (host && !isOwnDomain(host)) ? host : '';
    touch.landing_page = location.pathname;
    touch.touch_at = new Date().toISOString();
    touch.source_category = classify(touch);
    touch.source_label = SOURCE_LABELS[touch.source_category];
    return touch;
  }

  /** Има ли изобщо какво да се запише. */
  function hasSignal(touch) {
    if (touch.referrer) return true;
    if (CLICK_IDS.some(function (f) { return touch[f]; })) return true;
    return UTM_FIELDS.some(function (f) { return touch[f]; });
  }

  function readStore(key) {
    try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) { return null; }
  }
  function writeStore(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
  }

  var firstTouch = readStore(FIRST_KEY);
  var lastTouch = readStore(LAST_KEY);

  (function captureTouch() {
    var touch;
    try { touch = currentTouch(); } catch (e) { return; }   /* никога не блокира страницата */
    if (!hasSignal(touch)) return;
    if (!firstTouch) { firstTouch = touch; writeStore(FIRST_KEY, touch); }
    lastTouch = touch;
    writeStore(LAST_KEY, touch);
  })();

  /** Плоският запис, който тръгва с заявката. Без лични данни. */
  function attributionSnapshot() {
    var f = firstTouch || {};
    var l = lastTouch || firstTouch || {};
    return {
      source_category: l.source_category || 'direct',
      source_label: l.source_label || SOURCE_LABELS.direct,
      source: l.utm_source || '',
      medium: l.utm_medium || '',
      campaign: l.utm_campaign || '',
      content: l.utm_content || '',
      term: l.utm_term || '',
      gclid: l.gclid || '',
      referrer: l.referrer || '',
      landing_page: l.landing_page || '',
      touch_at: l.touch_at || '',
      first_source_category: f.source_category || 'direct',
      first_source_label: f.source_label || SOURCE_LABELS.direct,
      first_source: f.utm_source || '',
      first_medium: f.utm_medium || '',
      first_campaign: f.utm_campaign || '',
      first_content: f.utm_content || '',
      first_term: f.utm_term || '',
      first_gclid: f.gclid || '',
      first_referrer: f.referrer || '',
      first_landing_page: f.landing_page || '',
      first_touch_at: f.touch_at || ''
    };
  }

  /* ---------- Lead ID ----------
     Бизнес идентификатор за човек и за бъдещ CRM — различен по
     предназначение от `lead_event_id`, който служи само за
     дедупликация в аналитиката.
     Формат: BDS-2026-A7K42P. Азбуката е без 0/O/1/I/L, за да не
     се бърка при преписване по телефона. */
  var ID_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

  function newLeadId() {
    var year = new Date().getFullYear();
    var n = 6;
    var out = '';
    var bytes = null;
    try {
      if (window.crypto && window.crypto.getRandomValues) {
        bytes = new Uint8Array(n);
        window.crypto.getRandomValues(bytes);
      }
    } catch (e) { bytes = null; }
    for (var i = 0; i < n; i++) {
      var r = bytes ? bytes[i] : Math.floor(Math.random() * 256);
      out += ID_ALPHABET.charAt(r % ID_ALPHABET.length);
    }
    return 'BDS-' + year + '-' + out;
  }

  window.BDSAttribution = {
    /* Съвместимост с Phase 10: същият плосък обект с UTM/gclid. */
    get: function () {
      var l = lastTouch || firstTouch;
      if (!l) return null;
      var out = {};
      UTM_FIELDS.concat(CLICK_IDS).forEach(function (f) { if (l[f]) out[f] = l[f]; });
      out.landing_page = l.landing_page || '';
      out.referrer = l.referrer || 'direct';
      out.first_seen = (firstTouch && firstTouch.touch_at) || l.touch_at || '';
      return out;
    },
    snapshot: attributionSnapshot,
    first: function () { return firstTouch ? JSON.parse(JSON.stringify(firstTouch)) : null; },
    last: function () { return lastTouch ? JSON.parse(JSON.stringify(lastTouch)) : null; },
    classify: classify,
    labels: SOURCE_LABELS,
    newLeadId: newLeadId
  };


  /* ---------- Ресторантска форма за запитване ----------
     Ползва същия FormSubmit endpoint като общата форма — не въвеждаме
     втора услуга. Разликата е в полетата, валидацията и това, че при
     успех се отива на отделна страница, а не се показва зелен ред. */
  (function restaurantLeadForm() {
    var form = document.getElementById('restaurantForm');
    if (!form) return;

    var note = document.getElementById('restaurantFormNote');
    var submitBtn = form.querySelector('[type="submit"]');
    var submitLabel = submitBtn ? submitBtn.textContent : '';
    var busy = false;
    var leadId = null;

    /* Скритите полета получават стойност чак тук — рекламните параметри
       живеят в sessionStorage от кацането, не в адреса на тази страница. */
    var attr = (window.BDSAttribution && window.BDSAttribution.get()) || {};
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach(function (key) {
      var field = form.elements[key];
      if (field) field.value = attr[key] || '';
    });
    var sourcePage = form.elements.source_page;
    if (sourcePage) sourcePage.value = location.pathname;

    /* Полето за адрес се появява само ако има какво да се въведе. */
    var hasSite = document.getElementById('rf-haswebsite');
    var urlWrap = document.getElementById('rf-url-wrap');
    if (hasSite && urlWrap) {
      hasSite.addEventListener('change', function () {
        urlWrap.hidden = hasSite.value !== 'Да';
        if (urlWrap.hidden) document.getElementById('rf-url').value = '';
      });
    }

    function setError(id, message) {
      var el = document.getElementById(id);
      if (!el) return;
      el.textContent = message || '';
      el.hidden = !message;
    }

    function clearErrors() {
      ['rf-name-err', 'rf-business-err', 'rf-contact-err', 'rf-interest-err', 'rf-url-err']
        .forEach(function (id) { setError(id, ''); });
      form.querySelectorAll('.is-invalid').forEach(function (el) { el.classList.remove('is-invalid'); });
    }

    function markInvalid(input) {
      if (input) input.classList.add('is-invalid');
    }

    var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    /* Достатъчно свободно за формати като 0877 364 001, +359 88 248 4777. */
    var PHONE = /^[+0-9()\s-]{6,}$/;

    function validate() {
      clearErrors();
      var first = null;
      var f = form.elements;

      if (!f.full_name.value.trim()) {
        setError('rf-name-err', 'Моля, въведете име.');
        markInvalid(f.full_name);
        first = first || f.full_name;
      }
      if (!f.business_name.value.trim()) {
        setError('rf-business-err', 'Моля, въведете името на заведението.');
        markInvalid(f.business_name);
        first = first || f.business_name;
      }

      var phone = f.phone.value.trim();
      var email = f.email.value.trim();
      if (!phone && !email) {
        setError('rf-contact-err', 'Оставете телефон или имейл.');
        markInvalid(f.phone); markInvalid(f.email);
        first = first || f.phone;
      } else if (email && !EMAIL.test(email)) {
        setError('rf-contact-err', 'Имейлът изглежда непълен. Проверете го или оставете само телефон.');
        markInvalid(f.email);
        first = first || f.email;
      } else if (!email && phone && !PHONE.test(phone)) {
        setError('rf-contact-err', 'Телефонът изглежда непълен. Проверете го или оставете имейл.');
        markInvalid(f.phone);
        first = first || f.phone;
      }

      if (!f.service_interest.value) {
        setError('rf-interest-err', 'Изберете какво търсите.');
        markInvalid(f.service_interest);
        first = first || f.service_interest;
      }

      var url = f.website_url ? f.website_url.value.trim() : '';
      if (url && !/^https?:\/\/.+\..+/i.test(url)) {
        setError('rf-url-err', 'Адресът трябва да започва с http:// или https://');
        markInvalid(f.website_url);
        first = first || f.website_url;
      }

      if (first) first.focus();
      return !first;
    }

    function showNote(text, type) {
      note.className = 'form__note';
      note.textContent = text || '';
      void note.offsetWidth;                 /* рестартира прехода */
      if (type) note.classList.add(type);    /* празен клас хвърля DOMException */
    }

    function clearNote() { showNote('', ''); }

    function payload(leadId) {
      var f = form.elements;
      var v = function (name) { return f[name] ? f[name].value.trim() : ''; };
      var a = (window.BDSAttribution && window.BDSAttribution.snapshot)
        ? window.BDSAttribution.snapshot()
        : {};
      return {
        _subject: 'Ресторантско запитване — ' + v('business_name'),
        _template: 'table',
        'Име': v('full_name'),
        'Ресторант / бизнес': v('business_name'),
        'Телефон': v('phone') || '—',
        'Имейл': v('email') || '—',
        'Какво търси': v('service_interest'),
        'Има ли сайт': v('has_website') || '—',
        'Адрес на сайта': v('website_url') || '—',
        'Бюджет': v('budget_range') || '—',
        'Тип заявка': v('lead_type'),
        'Страница': v('source_page'),

        '— ЗАЯВКА —': ' ',
        'Lead ID': leadId || '—',
        'Тип': 'Ресторант',
        'Създаден': new Date().toISOString(),

        '— КАНАЛ —': ' ',
        'Канал': a.source_label || 'Direct',
        'Категория': a.source_category || 'direct',
        'Source': a.source || '—',
        'Medium': a.medium || '—',
        'Кампания': a.campaign || '—',

        '— ATTRIBUTION —': ' ',
        'Term': a.term || '—',
        'Content': a.content || '—',
        'GCLID': a.gclid || '—',
        'Referrer': a.referrer || '—',
        'Landing': a.landing_page || '—',
        'Докосване': a.touch_at || '—',

        '— ПЪРВО ДОКОСВАНЕ —': ' ',
        'Първи канал': a.first_source_label || 'Direct',
        'Първи source': a.first_source || '—',
        'Първи medium': a.first_medium || '—',
        'Първа кампания': a.first_campaign || '—',
        'Първи term': a.first_term || '—',
        'Първи content': a.first_content || '—',
        'Първи GCLID': a.first_gclid || '—',
        'Първи referrer': a.first_referrer || '—',
        'Първи landing': a.first_landing_page || '—',
        'Първо докосване в': a.first_touch_at || '—'
      };
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (busy) return;                       /* пази от двойно изпращане */
      if (form.elements._honey && form.elements._honey.value) return;
      if (!validate()) return;

      busy = true;
      /* Един и същ ID при повторен опит след грешка — иначе една
         заявка би получила два различни номера. */
      if (!leadId) {
        leadId = (window.BDSAttribution && window.BDSAttribution.newLeadId)
          ? window.BDSAttribution.newLeadId()
          : 'BDS-' + new Date().getFullYear() + '-' + Math.random().toString(36).slice(2, 8).toUpperCase();
      }
      if (window.BDSAnalytics) {
        window.BDSAnalytics.track('restaurant_form_submit', { lead_type: 'restaurant' });
      }
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.classList.add('is-loading');
        submitBtn.textContent = 'Изпращане…';
      }
      clearNote();

      fetch(LEAD_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload(leadId))
      })
        .then(function (r) { return r.json(); })
        .then(function (res) {
          if (res && (res.success === 'true' || res.success === true)) {
            /* Конверсията се праща САМО тук — след потвърден успех.
               Нито при клик, нито при валидация, нито при грешка. */
            var leadEventId = 'lead-' + Date.now().toString(36) + '-' +
              Math.random().toString(36).slice(2, 10);
            try {
              sessionStorage.setItem('bds_lead_event_id', leadEventId);
              sessionStorage.setItem('bds_lead_id', leadId);
            } catch (err) {}

            /* CRM записът тръгва СЛЕД потвърдения успех и със същия
               Lead ID, който отива в имейла и се показва на thank-you —
               така един и същи номер води през целия процес. */
            sendToCrm(leadId, form, window.BDSAttribution && window.BDSAttribution.snapshot());
            /* Само неличните полета — име, телефон, имейл и бизнес
               остават единствено в имейла до собственика. */
            var el = form.elements;
            if (window.BDSAnalytics) {
              window.BDSAnalytics.track('generate_lead', {
                lead_event_id: leadEventId,
                lead_id: leadId,
                source_category: (window.BDSAttribution.snapshot() || {}).source_category,
                lead_type: 'restaurant',
                service_interest: el.service_interest.value,
                budget_range: el.budget_range.value || 'не е посочен',
                has_website: el.has_website.value || 'не е посочено',
                source_page: el.source_page.value
              });
            }
            window.location.href = '/restaurants/thank-you';
            return;
          }
          throw new Error('rejected');
        })
        .catch(function () {
          busy = false;
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.classList.remove('is-loading');
            submitBtn.textContent = submitLabel;
          }
          /* Попълненото остава на място — само съобщението се сменя. */
          showNote(
            'Не успяхме да изпратим запитването. Опитайте отново или ни пишете на pr2.blazhev@gmail.com, или се обадете на 0877 364 001.',
            'error'
          );
        });
    });
  })();

  /* ---------- Analytics ----------
     Бизнес кодът казва само `track('име', {...})`. Оттук нататък
     събитието отива в dataLayer, а при конфигурирани и разрешени
     тагове — и към gtag/fbq. Никъде другаде в проекта не се вика
     директно gtag(), fbq() или dataLayer.push().

     СХЕМА НА СЪБИТИЯТА
     ┌───────────────────────────┬──────────────────────────┬──────────┐
     │ събитие                   │ повод                    │ конверсия│
     ├───────────────────────────┼──────────────────────────┼──────────┤
     │ restaurant_page_view      │ зареждане на /restaurants│ не       │
     │ restaurant_cta_click      │ клик по CTA              │ не       │
     │ restaurant_form_start     │ първо докосване на форма │ не       │
     │ restaurant_form_submit    │ подаден валиден формуляр │ не       │
     │ generate_lead             │ ПОТВЪРДЕН успех          │ ДА       │
     │ restaurant_thank_you_view │ отваряне на thank-you    │ не       │
     │ phone_click / email_click │ tel: / mailto: клик      │ по избор │
     │ case_study_click          │ клик към case study      │ не       │
     └───────────────────────────┴──────────────────────────┴──────────┘
     Основната конверсия е ЕДНА: `generate_lead`. */
  (function () {
    var T = window.BDSTracking;
    var isRestaurant = document.body.getAttribute('data-page') === 'restaurants';

    window.dataLayer = window.dataLayer || [];

    function track(event, data) {
      var params = (T && T.scrub ? T.scrub(data) : data) || {};
      var payload = { event: event, page_path: location.pathname };
      if (isRestaurant) payload.page_type = 'restaurant_funnel';
      /* Кампанията е attribution, не лични данни — може да пътува. */
      var attr = window.BDSAttribution ? window.BDSAttribution.get() : null;
      if (attr) {
        ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid'].forEach(function (k) {
          if (attr[k]) payload[k] = attr[k];
        });
      }
      Object.keys(params).forEach(function (k) { payload[k] = params[k]; });

      window.dataLayer.push(payload);

      if (T && T.isLoaded()) {
        if (typeof window.gtag === 'function') window.gtag('event', event, payload);
        if (typeof window.fbq === 'function') {
          if (event === 'generate_lead') {
            /* eventID позволява по-късна дедупликация със сървърния CAPI. */
            window.fbq('track', 'Lead', {}, { eventID: params.lead_event_id });
          } else if (event === 'restaurant_form_start') {
            /* Без това Meta не може да изгради аудитория „започнали
               формата, но не изпратили“ — тя е най-ценната за
               retargeting. Няма параметри, за да не тръгват лични данни. */
            window.fbq('trackCustom', 'RestaurantFormStart');
          }
        }
      }

      if (window.BDSAnalytics && window.BDSAnalytics.debug) {
        console.info('[BDS event]', event, payload);
      }

      try {
        var s = JSON.parse(localStorage.getItem('bds_analytics') || '{}');
        s[event] = (s[event] || 0) + 1;
        localStorage.setItem('bds_analytics', JSON.stringify(s));
      } catch (e) {}
    }

    window.BDSAnalytics = {
      track: track,
      debug: (T && T.config && T.config.debug) || false
    };

    /* ---------- Зареждане на страница ---------- */
    if (isRestaurant) {
      var isThankYou = /thank-you/.test(location.pathname);
      if (isThankYou) {
        /* Бизнес номерът се показва на човека; аналитичният ID остава скрит. */
        try {
          var refBox = document.getElementById('leadRef');
          var refId = sessionStorage.getItem('bds_lead_id');
          if (refBox && refId) {
            refBox.querySelector('b').textContent = refId;
            refBox.hidden = false;
          }
        } catch (e) {}

        /* Thank-you НИКОГА не създава lead. Флагът само казва на GTM
           дали посещението идва от реално изпратена форма, или някой
           е отворил адреса директно. */
        var leadId = null;
        try { leadId = sessionStorage.getItem('bds_lead_event_id'); } catch (e) {}
        track('restaurant_thank_you_view', {
          has_lead_event: Boolean(leadId),
          lead_event_id: leadId || undefined
        });
      } else {
        track('restaurant_page_view', { referrer: document.referrer || 'direct' });
      }
    }

    /* ---------- Кликове ---------- */
    document.addEventListener('click', function (e) {
      var el = e.target.closest && e.target.closest('a, button');
      if (!el) return;

      var href = el.getAttribute('href') || '';
      /* placement идва от data-track, не от надписа на бутона —
         текстът може да се смени, идентификаторът не бива. */
      var placement = el.getAttribute('data-track') || 'unmarked';

      if (href.indexOf('tel:') === 0) {
        track('phone_click', { placement: placement });
        return;
      }
      if (href.indexOf('mailto:') === 0) {
        track('email_click', { placement: placement });
        return;
      }
      if (/case-[a-z-]+\.html/.test(href)) {
        track('case_study_click', { placement: placement });
        return;
      }
      if (isRestaurant && el.classList.contains('btn') && el.getAttribute('data-track')) {
        track('restaurant_cta_click', { placement: placement });
      }
    });

    /* ---------- Първо докосване на формата ---------- */
    var rform = document.getElementById('restaurantForm');
    if (rform) {
      var started = false;
      rform.addEventListener('focusin', function () {
        if (started) return;
        started = true;                       /* веднъж на зареждане */
        track('restaurant_form_start', {});
      });
    }
  })();

  /* ---------- Project filters ---------- */
  var filterBtns = document.querySelectorAll('.filter-btn');
  if (filterBtns.length) {
    var projectEls = document.querySelectorAll('.project');
    filterBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        filterBtns.forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        var cat = btn.getAttribute('data-filter');
        projectEls.forEach(function (p) {
          var match = cat === 'all' || p.getAttribute('data-cat') === cat;
          p.classList.add('filtering');
          setTimeout(function () {
            p.classList.toggle('hide', !match);
            requestAnimationFrame(function () { p.classList.remove('filtering'); });
          }, 200);
        });
      });
    });
  }

  /* ---------- Marquee: duplicate for seamless loop ---------- */
  document.querySelectorAll('.marquee__track').forEach(function (track) {
    track.innerHTML += track.innerHTML;
  });

  if (reduceMotion) return; // skip heavy pointer effects

  /* ---------- Card spotlight (mouse-follow glow) ---------- */
  document.querySelectorAll('.card').forEach(function (card) {
    card.addEventListener('mousemove', function (e) {
      var r = card.getBoundingClientRect();
      card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      card.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });

  /* ---------- Parallax hero (mouse) ---------- */
  var hero = document.querySelector('.hero');
  if (hero) {
    /* Визуалът вдясно е премахнат — паралаксът остава само върху сиянията.
       Мишка с висока честота вдига 500+ събития в секунда; преди това
       записваше inline transform при всяко от тях. Сега стойността само се
       запомня, а записът става веднъж на кадър. */
    var g1 = hero.querySelector('.hero__glow--1');
    var g2 = hero.querySelector('.hero__glow--2');
    if (g1 || g2) {
      var mx = 0, my = 0, queued = false;
      var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      hero.addEventListener('mousemove', function (e) {
        if (reduceMotion) return;
        mx = (e.clientX / window.innerWidth - 0.5);
        my = (e.clientY / window.innerHeight - 0.5);
        if (queued) return;
        queued = true;
        requestAnimationFrame(function () {
          queued = false;
          if (g1) g1.style.transform = 'translate3d(' + mx * 40 + 'px,' + my * 40 + 'px,0)';
          if (g2) g2.style.transform = 'translate3d(' + mx * -30 + 'px,' + my * -30 + 'px,0)';
        });
      }, { passive: true });
    }
  }
  /* Бутоните вече ползват единен CSS hover-lift + active scale (виж .btn) —
     без magnetic ефект, за консистентност и по-добра производителност. */
})();
