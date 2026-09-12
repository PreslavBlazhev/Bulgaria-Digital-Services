/* ============================================================
   BDS — постоянен тест за ресторантската фуния
   ------------------------------------------------------------
   Стартиране:

     node tools/test-restaurant-funnel.mjs            статични проверки
     node tools/test-restaurant-funnel.mjs --browser  + реален браузър
     node tools/test-restaurant-funnel.mjs --browser --url https://…  срещу production

   Статичната част няма никакви зависимости и работи навсякъде.
   Браузърната част иска Chrome на машината и говори с него по CDP.
   Node < 22 иска флага --experimental-websocket; скриптът сам се
   рестартира с него, ако липсва.

   Изход: 0 = всичко минава, 1 = има провал.
   ============================================================ */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
/* Сървърът, Chrome и CDP клиентът са общи с другите браузърни проверки. */
import { sleep, startServer, launchChrome, newPage, respawnForWebSocket }
  from './lib/browser-kit.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const WANT_BROWSER = args.includes('--browser');
const REMOTE = (() => { const i = args.indexOf('--url'); return i !== -1 ? args[i + 1] : null; })();

/* WebSocket липсва при Node 21 без флаг — рестартирай се с него. */
if (WANT_BROWSER) respawnForWebSocket(import.meta.url, args);

/* ---------- отчитане ---------- */
const results = [];
let group = '';
const G = (name) => { group = name; console.log('\n\x1b[1m' + name + '\x1b[0m'); };
function check(name, ok, detail = '') {
  results.push({ group, name, ok: !!ok, detail });
  const tag = ok ? '\x1b[32m  ok  \x1b[0m' : '\x1b[31m FAIL \x1b[0m';
  console.log(tag + ' ' + name + (detail ? '  \x1b[2m' + detail + '\x1b[0m' : ''));
  return !!ok;
}

/* ============================================================
   ЧАСТ 1 — статични проверки върху файловете
   ============================================================ */

const FUNNEL_PAGES = ['restaurants.html', 'restaurants/thank-you.html'];
const SUPPORT_PAGES = ['privacy.html', 'terms.html', 'contact.html', 'case-pizza-pazzo.html'];
const REQUIRED_ANCHORS = ['restaurant-contact', 'components', 'packages', 'compare', 'proof'];

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));

/** Много груб, но достатъчен извадчик на атрибути — не е HTML парсер. */
function attrs(tag) {
  const out = {};
  for (const m of tag.matchAll(/([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*"([^"]*)"/g)) out[m[1]] = m[2];
  for (const m of tag.matchAll(/(?:^|\s)([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?=[\s>/]|$)/g)) {
    if (!(m[1] in out)) out[m[1]] = '';
  }
  return out;
}
const tags = (html, name) => [...html.matchAll(new RegExp('<' + name + '\\b[^>]*>', 'gi'))].map(m => m[0]);

function staticTests() {
  G('Файлове');
  for (const p of [...FUNNEL_PAGES, ...SUPPORT_PAGES, '_redirects', 'robots.txt', 'sitemap.xml',
    'assets/css/tokens.css', 'assets/css/style.css', 'assets/css/restaurants.css',
    'assets/js/app.js', 'assets/js/bds-tracking.js']) {
    check('съществува ' + p, exists(p));
  }

  for (const page of FUNNEL_PAGES) {
    if (!exists(page)) continue;
    const html = read(page);
    const dir = path.dirname(path.join(ROOT, page));
    G('Страница: ' + page);

    /* --- дублирани id --- */
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]);
    const dupes = ids.filter((v, i) => ids.indexOf(v) !== i);
    check('няма дублирани id', dupes.length === 0, dupes.length ? [...new Set(dupes)].join(', ') : ids.length + ' id общо');

    /* --- вътрешни котви --- */
    const anchors = [...html.matchAll(/href="#([^"]+)"/g)].map(m => m[1]);
    const missing = [...new Set(anchors)].filter(a => !ids.includes(a));
    check('всяка вътрешна котва има цел', missing.length === 0, missing.join(', ') || anchors.length + ' котви');

    /* --- локални файлови връзки --- */
    const hrefs = [...html.matchAll(/href="([^"#][^"]*)"/g)].map(m => m[1])
      .filter(h => !/^(https?:|mailto:|tel:|data:|\/\/)/.test(h));
    const brokenHref = hrefs.filter(h => {
      const clean = h.split('#')[0].split('?')[0];
      /* Адрес от корена (/restaurants) се сервира от restaurants.html —
         и от Netlify, и от server.js. Проверяваме и трите варианта. */
      const candidates = clean.startsWith('/')
        ? [path.join(ROOT, clean), path.join(ROOT, clean + '.html'), path.join(ROOT, clean, 'index.html')]
        : [path.resolve(dir, clean)];
      return !candidates.some(c => fs.existsSync(c));
    });
    check('няма счупени вътрешни връзки', brokenHref.length === 0, brokenHref.join(', ') || hrefs.length + ' връзки');

    /* --- изображения --- */
    const imgs = tags(html, 'img').map(attrs);
    const brokenImg = imgs.filter(a => a.src && !/^(https?:|data:)/.test(a.src) && !fs.existsSync(path.resolve(dir, a.src)));
    check('всяко изображение съществува', brokenImg.length === 0, brokenImg.map(a => a.src).join(', ') || imgs.length + ' изображения');
    const noDims = imgs.filter(a => a.src && !(a.width && a.height));
    check('всяко изображение има width и height', noDims.length === 0, noDims.map(a => a.src).join(', '));
    const noAlt = imgs.filter(a => a.src && a.alt === undefined);
    check('всяко изображение има alt', noAlt.length === 0, noAlt.map(a => a.src).join(', '));

    /* --- скриптове и стилове --- */
    const scripts = tags(html, 'script').map(attrs).filter(a => a.src);
    const brokenScript = scripts.filter(a => !/^https?:/.test(a.src) && !fs.existsSync(path.resolve(dir, a.src)));
    check('всеки скрипт съществува', brokenScript.length === 0, brokenScript.map(a => a.src).join(', '));
    /* Един синхронен скрипт е разрешен и е нарочен: bds-tracking.js
       трябва да сложи consent default-а в dataLayer ПРЕДИ снипета на
       GTM. С defer това се случва след контейнера и съгласието губи
       смисъл. Затова проверката е двойна — че няма ДРУГ блокиращ
       скрипт и че bootstrap-ът е точно един, а не два. */
    const blocking = scripts.filter(a => !/^https?:/.test(a.src) && !('defer' in a) && !('async' in a));
    const CONSENT_BOOTSTRAP = /(^|\/)assets\/js\/bds-tracking\.js$/;
    const unexpected = blocking.filter(a => !CONSENT_BOOTSTRAP.test(a.src));
    check('няма блокиращи локални скриптове извън consent bootstrap-а',
      unexpected.length === 0, unexpected.map(a => a.src).join(', '));
    check('consent bootstrap-ът е точно един и е синхронен',
      blocking.length === 1, blocking.map(a => a.src).join(', ') || 'няма');

    const links = tags(html, 'link').map(attrs).filter(a => a.rel === 'stylesheet');
    const brokenCss = links.filter(a => !/^https?:/.test(a.href) && !fs.existsSync(path.resolve(dir, a.href)));
    check('всеки stylesheet съществува', brokenCss.length === 0, brokenCss.map(a => a.href).join(', '));
    check('tokens.css се зарежда директно, не само през @import',
      links.some(a => /tokens\.css$/.test(a.href || '')));

    /* --- вложени интерактивни елементи --- */
    const nested = /<a\b[^>]*>(?:(?!<\/a>)[\s\S])*?<(?:a|button)\b/i.test(html) ||
      /<button\b[^>]*>(?:(?!<\/button>)[\s\S])*?<(?:a|button)\b/i.test(html);
    check('няма вложени интерактивни елементи (a в a, button в a)', !nested);
  }

  /* --- специфично за landing страницата --- */
  const rest = read('restaurants.html');
  G('Ресторантска landing страница');

  for (const a of REQUIRED_ANCHORS) {
    check('котва за реклама #' + a, new RegExp('id="' + a + '"').test(rest));
  }

  const ctaHrefs = [...rest.matchAll(/<a\b[^>]*>[\s\S]{0,80}?Получи оферта/g)]
    .map(m => (m[0].match(/href="([^"]*)"/) || [])[1]);
  check('има поне 5 CTA „Получи оферта“', ctaHrefs.length >= 5, ctaHrefs.length + ' намерени');
  check('всяко CTA сочи към #restaurant-contact',
    ctaHrefs.length > 0 && ctaHrefs.every(h => h === '#restaurant-contact'),
    [...new Set(ctaHrefs)].join(', '));

  check('формата съществува', /id="restaurantForm"/.test(rest));
  for (const f of ['full_name', 'business_name', 'phone', 'email', 'service_interest', 'has_website', 'budget_range', 'website_url']) {
    check('поле ' + f, new RegExp('name="' + f + '"').test(rest));
  }
  check('honeypot поле', /name="_honey"/.test(rest));
  check('скрити UTM полета', ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']
    .every(u => new RegExp('name="' + u + '"').test(rest)));

  const hero = (rest.match(/<img[^>]*pizza-pazzo-hero[^>]*>/) || [])[0] || '';
  const heroAttr = attrs(hero);
  check('hero изображението не е lazy', heroAttr.loading !== 'lazy', 'loading=' + heroAttr.loading);
  check('hero изображението е с висок приоритет', heroAttr.fetchpriority === 'high');
  const lazyCount = tags(rest, 'img').map(attrs).filter(a => a.loading === 'lazy').length;
  check('изображенията под линията са lazy', lazyCount >= 5, lazyCount + ' lazy');

  G('Thank You');
  const ty = read('restaurants/thank-you.html');
  check('noindex', /name="robots"[^>]*noindex/.test(ty));
  check('място за референцията на заявката', /id="leadRef"/.test(ty));
  check('референцията е скрита по подразбиране', /id="leadRef"[^>]*\shidden/.test(ty));
  check('има tel: връзка', /href="tel:/.test(ty));

  G('Маршрути и canonical');
  const canonical = (rest.match(/rel="canonical"\s+href="([^"]+)"/) || [])[1] || '';
  const ogUrl = (rest.match(/property="og:url"\s+content="([^"]+)"/) || [])[1] || '';
  check('canonical съществува', !!canonical, canonical);
  check('og:url съвпада с canonical', canonical === ogUrl, ogUrl);
  const sitemap = read('sitemap.xml');
  const inSitemap = (sitemap.match(/<loc>([^<]*restaurants[^<]*)<\/loc>/) || [])[1] || '';
  check('sitemap сочи същия адрес като canonical', inSitemap === canonical, 'sitemap: ' + inSitemap);
  check('sitemap не съдържа thank-you', !/thank-you/.test(sitemap));
  check('canonical е чистият рекламен адрес', /\/restaurants$/.test(canonical), canonical);
  const restLinks = [];
  for (const f of ['services.html', 'case-pizza-pazzo.html', 'restaurants/thank-you.html']) {
    if (!exists(f)) continue;
    for (const m of read(f).matchAll(/href="([^"]*restaurants[^"]*)"/g)) restLinks.push(f + ': ' + m[1]);
  }
  check('вътрешните връзки към фунията ползват чистия адрес',
    restLinks.every(l => !/restaurants\.html/.test(l)), restLinks.join(' | '));

  const redirects = read('_redirects');
  check('_redirects покрива /restaurants/', /^\/restaurants\/\s/m.test(redirects));
  check('_redirects покрива /restaurants/thank-you/', /^\/restaurants\/thank-you\/\s/m.test(redirects));
  const loops = redirects.split('\n').filter(l => {
    const p = l.trim().split(/\s+/);
    return p.length >= 2 && !l.startsWith('#') && p[0] === p[1];
  });
  check('няма redirect цикъл', loops.length === 0, loops.join(' | '));

  G('Проследяване — конфигурация');
  const track = read('assets/js/bds-tracking.js');
  const idFields = ['gtmId', 'ga4Id', 'adsConversionId', 'adsLeadLabel', 'metaPixelId'];
  const configured = idFields.filter(f => {
    const m = track.match(new RegExp(f + ":\\s*'([^']*)'"));
    return m && m[1].trim() !== '';
  });
  check('няма измислени/placeholder ID-та', !/['"](GTM-XXXX|G-XXXX|AW-XXXX)/.test(track));
  check('Consent Mode по подразбиране е denied', /analytics_storage:\s*'denied'/.test(track));
  console.log('       \x1b[2mпопълнени ID-та: ' + (configured.length ? configured.join(', ') : 'няма — таговете няма да се зареждат') + '\x1b[0m');

  const app = read('assets/js/app.js');
  check('refHost приема и само домейн (organic/referral attribution)',
    /bare\s*=\s*String\(referrer\)/.test(app));
  /* Проверяваме ПОДРЕДБАТА, не разстоянието — иначе всяко вмъкване между
     двете места чупи теста без нищо да се е счупило в сайта. */
  const okIdx = app.indexOf("res.success === 'true'");
  const glIdx = app.indexOf("'generate_lead'");
  const redirIdx = app.indexOf('/restaurants/thank-you');
  check('generate_lead се праща след потвърден успех и преди пренасочването',
    okIdx > 0 && glIdx > okIdx && redirIdx > glIdx,
    'success@' + okIdx + ' → generate_lead@' + glIdx + ' → redirect@' + redirIdx);
  check('пази от двойно изпращане', /if \(busy\) return;/.test(app));
  check('Lead ID се преизползва при повторен опит', /if \(!leadId\)/.test(app));
}

/* ============================================================
   ЧАСТ 2 — статичен сървър за браузърните тестове
   ============================================================ */

/* Статичният сървър, Chrome и CDP клиентът живеят в
   tools/lib/browser-kit.mjs — същата машинария ползва и проверката
   на Google Tag Manager. Едно копие, една поправка. */

/* ============================================================
   ЧАСТ 3 — браузърни проверки
   ============================================================ */

async function browserTests(base) {
  const chrome = await launchChrome('bds-funnel-test');
  if (!chrome) { check('Chrome е наличен', false, 'не е намерен — браузърните тестове се пропускат'); return; }

  /** Отваря страница с прихванат FormSubmit. Нула реални имейли. */
  let sessionSeq = 0;
  async function session(fn, opts = {}) {
    /* Собствен ключ за всяка сесия: localStorage е споделен по origin между
       табовете, значи без това събитията от предишен тест изтичат в следващия. */
    const KEY = '__qa_events_' + (++sessionSeq);
    const p = await newPage(chrome.port);
    const errs = []; const posts = []; const crmPosts = [];
    p.on(m => {
      if (m.method === 'Runtime.exceptionThrown') errs.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
      if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') errs.push(m.params.entry.text);
    });
    await p.send('Page.enable'); await p.send('Runtime.enable');
    await p.send('Log.enable'); await p.send('Network.enable');
    /* Бисквитките са на ниво браузър, не на таб — а всички сесии делят
       един профил. Без това _fbp, оставен от сесия с дадено съгласие,
       се появява в сесия, която тепърва отказва, и обвинява кода в
       нещо, което не е правил. Същата причина като собствения ключ за
       localStorage по-горе. */
    await p.send('Network.clearBrowserCookies');
    /* Реалният посетител почти никога не е с намалена анимация; headless по
       подразбиране е — а това крие поведението, което искаме да тестваме. */
    await p.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
    /* Fetch.enable ЗАМЕНЯ списъка с шаблони, не го допълва. Затова всички
       адреси се подават ТУК, наведнъж, и то за ВСЯКА сесия.

       И двата адреса се прихващат винаги, не само в теста, който се
       занимава с тях:

         formsubmit.co      иначе тестът праща истински имейл;
         script.google.com  иначе тестът пише истински ред в живия CRM.

       Първата версия прихващаше CRM-а само в CRM теста. Другите сесии
       също изпращат формата — и три тестови заявки се озоваха в
       истинската таблица, преди това да се забележи. */
    await p.send('Fetch.enable', {
      patterns: [{ urlPattern: '*formsubmit.co*' }, { urlPattern: '*script.google.com*' }]
    });
    p.on(async m => {
      if (m.method !== 'Fetch.requestPaused') return;

      /* CRM-ът се спира тук, при всяка сесия, и никога не тръгва навън. */
      if (/script\.google\.com/.test(m.params.request.url)) {
        if (m.params.request.method === 'POST') crmPosts.push(m.params.request.postData);
        try {
          await p.send('Fetch.fulfillRequest', {
            requestId: m.params.requestId, responseCode: 200,
            responseHeaders: [{ name: 'Content-Type', value: 'application/json' },
              { name: 'Access-Control-Allow-Origin', value: '*' }],
            body: Buffer.from('{"ok":true}').toString('base64'),
          });
        } catch {}
        return;
      }
      if (!/formsubmit\.co/.test(m.params.request.url)) return;
      const CORS = [{ name: 'Access-Control-Allow-Origin', value: '*' },
        { name: 'Access-Control-Allow-Methods', value: 'POST, OPTIONS' },
        { name: 'Access-Control-Allow-Headers', value: 'Content-Type, Accept' }];
      try {
        if (m.params.request.method === 'OPTIONS')
          return await p.send('Fetch.fulfillRequest', { requestId: m.params.requestId, responseCode: 204, responseHeaders: CORS, body: '' });
        posts.push({ body: m.params.request.postData });
        if (opts.formMode === 'netfail')
          return await p.send('Fetch.failRequest', { requestId: m.params.requestId, errorReason: 'ConnectionFailed' });
        const body = opts.formMode === 'reject' ? '{"success":"false"}' : '{"success":"true"}';
        await p.send('Fetch.fulfillRequest', {
          requestId: m.params.requestId, responseCode: 200,
          responseHeaders: [{ name: 'Content-Type', value: 'application/json' }, ...CORS],
          body: Buffer.from(body).toString('base64'),
        });
      } catch {}
    });
    /* Трайно записва събитията, за да преживеят пренасочването.

       Записват се ДВАТА възможни маршрута, не само единият:
         · `{event:'име', …}`      — нормалният push, който GTM чака;
         · `gtag('event','име',…)` — arguments обект, който GTM СЪЩО
           брои за събитие.
       Първата версия виждаше само първия. Затова „точно веднъж“
       минаваше зелено, докато в GA4 влизаха по две копия: вторият
       маршрут беше невидим за проверката, не за Google. */
    await p.send('Page.addScriptToEvaluateOnNewDocument', {
      source: `(function(){window.dataLayer=window.dataLayer||[];var _p=window.dataLayer.push.bind(window.dataLayer);
        window.dataLayer.push=function(){try{var r=JSON.parse(localStorage.getItem('${KEY}')||'[]');
        for(var i=0;i<arguments.length;i++){var a=arguments[i];
          if(a&&a.event)r.push({event:a.event,via:'push'});
          else if(a&&typeof a==='object'&&a[0]==='event'&&a[1])r.push({event:a[1],via:'gtag'});}
        localStorage.setItem('${KEY}',JSON.stringify(r));}catch(e){}return _p.apply(null,arguments);};})();`,
    });
    try { await fn(p, () => errs, () => posts, KEY, () => crmPosts); } finally { p.close(); }
  }

  const go = async (p, url, wait = 2200) => { await p.send('Page.navigate', { url }); await sleep(wait); };
  const EVENTS = (k) => "JSON.stringify(JSON.parse(localStorage.getItem('" + k + "')||'[]').map(x=>x.event))";
  /* Пълните записи, с маршрута. */
  const EVENTS_VIA = (k) => "localStorage.getItem('" + k + "')||'[]'";
  const SNAP = 'JSON.stringify(window.BDSAttribution ? window.BDSAttribution.snapshot() : null)';
  const FILL = `(function(){var f=document.getElementById('restaurantForm');
    function s(n,v){var e=f.elements[n];if(!e)return;e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));}
    s('full_name','QA TEST - not a real person');s('business_name','QA Test Restaurant (internal)');
    s('phone','0000000000');s('email','qa-test@example.invalid');
    s('service_interest',f.elements.service_interest.options[1].value);return true;})()`;

  const AD = base + '/restaurants?utm_source=google&utm_medium=cpc&utm_campaign=restaurant_search_bg&utm_content=e2e_test&utm_term=sait_za_restorant&gclid=TEST-SYNTHETIC';

  G('Браузър — зареждане и attribution');
  await session(async (p, errs) => {
    await go(p, AD);
    check('landing се зарежда', /ресторант/i.test(await p.eval('document.title')));
    check('нула конзолни грешки', errs().length === 0, errs().join(' | '));
    const a = JSON.parse(await p.eval(SNAP) || 'null');
    check('attribution се хваща', !!a);
    if (a) {
      check('source_category = google_ads', a.source_category === 'google_ads', a.source_category);
      check('кампанията се пази', a.campaign === 'restaurant_search_bg', a.campaign);
      check('gclid се пази', a.gclid === 'TEST-SYNTHETIC', a.gclid);
      check('първото докосване се пази', a.first_source === 'google', a.first_source);
    }
    check('header и footer се сглобяват',
      await p.eval("!!document.querySelector('#site-header .header') && !!document.querySelector('#site-footer')>0 || !!document.querySelector('#site-footer').children.length"));
    check('страницата е видима без да чака JS клас',
      (await p.eval('getComputedStyle(document.body).opacity')) === '1');
    check('нула хоризонтално превъртане',
      (await p.eval('document.documentElement.scrollWidth - window.innerWidth')) <= 0);
  });

  G('Браузър — форма');
  await session(async (p, errs, posts, KEY) => {
    await go(p, AD);
    await p.eval("document.getElementById('restaurantForm').requestSubmit()");
    await sleep(700);
    check('празна форма не праща заявка', posts().length === 0);

    /* Истинско писане през браузъра, не dispatchEvent: кодът нарочно
       отхвърля isTrusted:false, за да не брои фокус, сложен от скрипт.
       Само така restaurant_form_start се пали както при жив посетител
       и влиза в измерването по-долу. */
    await p.eval("document.getElementById('restaurantForm').elements['full_name'].focus()");
    await sleep(200);
    await p.send('Input.insertText', { text: 'QA' });
    await sleep(400);
    await p.eval(FILL);
    await p.eval("(function(){var b=document.querySelector('#restaurantForm [type=submit]')||document.querySelector('#restaurantForm button');b.click();b.click();})()");
    await sleep(2600);
    check('двойният клик праща точно една заявка', posts().length === 1, posts().length + ' заявки');
    if (posts()[0]) {
      let body = {}; try { body = JSON.parse(posts()[0].body); } catch {}
      const blob = JSON.stringify(body);
      check('пакетът носи Lead ID', /BDS-\d{4}-/.test(body['Lead ID'] || ''), body['Lead ID']);
      check('пакетът носи кампанията', blob.includes('restaurant_search_bg'));
      check('пакетът носи gclid', blob.includes('TEST-SYNTHETIC'));
      check('пакетът носи първото докосване', Object.keys(body).filter(k => /Първ/.test(k)).length >= 5);
    }
    await sleep(1200);
    const ev = JSON.parse(await p.eval(EVENTS(KEY)) || '[]');
    const rec = JSON.parse(await p.eval(EVENTS_VIA(KEY)) || '[]');
    const once = (name) => ev.filter(e => e === name).length;
    check('generate_lead точно веднъж', once('generate_lead') === 1,
      once('generate_lead') + ' | записани: ' + ev.join(','));
    /* Цялата верига от едно изпращане. Всяко от тези събития беше по
       две в GA4, докато track() буташе и по втория маршрут. */
    check('restaurant_form_start точно веднъж', once('restaurant_form_start') === 1,
      once('restaurant_form_start') + ' | ' + ev.join(','));
    check('restaurant_form_submit точно веднъж', once('restaurant_form_submit') === 1,
      once('restaurant_form_submit') + ' | ' + ev.join(','));
    check('restaurant_thank_you_view точно веднъж', once('restaurant_thank_you_view') === 1,
      once('restaurant_thank_you_view') + ' | ' + ev.join(','));
    const viaGtag = rec.filter(x => x.via === 'gtag');
    check('нито едно събитие не минава по втори маршрут',
      viaGtag.length === 0, viaGtag.map(x => x.event).join(', '));
    check('пренасочва към Thank You', /thank-you/.test(await p.eval('location.pathname')));
    check('Thank You показва референцията', /BDS-\d{4}-/.test(await p.eval("(document.querySelector('#leadRef')||{}).textContent||''")));
    check('Thank You е noindex', /noindex/.test(await p.eval("(document.querySelector('meta[name=robots]')||{}).content||''")));
    check('нула конзолни грешки по целия път', errs().length === 0, errs().join(' | '));
  });

  G('Браузър — сценарии на провал');
  for (const [label, mode] of [['сървърът отказва', 'reject'], ['мрежата пада', 'netfail']]) {
    await session(async (p, errs, posts, KEY) => {
      await go(p, AD);
      await p.eval(FILL);
      await p.eval("document.getElementById('restaurantForm').requestSubmit()");
      await sleep(2600);
      const ev = JSON.parse(await p.eval(EVENTS(KEY)) || '[]');
      check(label + ': нула конверсии', ev.filter(e => e === 'generate_lead').length === 0);
      check(label + ': остава на страницата', !/thank-you/.test(await p.eval('location.pathname')));
      const btn = JSON.parse(await p.eval("JSON.stringify((function(){var b=document.querySelector('#restaurantForm [type=submit]')||document.querySelector('#restaurantForm button');return {d:b.disabled,l:b.classList.contains('is-loading')};})())"));
      check(label + ': формата не замръзва', btn.d === false && !btn.l);
      check(label + ': показва се съобщение',
        (await p.eval("(document.getElementById('restaurantFormNote')||{}).textContent||''")).trim().length > 0);
      check(label + ': въведеното се запазва',
        (await p.eval("document.getElementById('restaurantForm').elements.full_name.value")).length > 0);
    }, { formMode: mode });
  }

  G('Браузър — Thank You директно');
  await session(async (p, _e, _q, KEY) => {
    await go(p, base + '/restaurants/thank-you');
    const ev = JSON.parse(await p.eval(EVENTS(KEY)) || '[]');
    check('директното отваряне не създава конверсия', ev.filter(e => e === 'generate_lead').length === 0);
    check('референцията остава скрита', (await p.eval("(document.querySelector('#leadRef')||{}).hidden")) === true);
  });

  G('Браузър — класификация на източника');
  const cases = [
    ['?gclid=abc', null, 'google_ads'],
    ['?utm_source=meta', null, 'meta_ads'],
    ['?utm_source=instagram&utm_medium=paid_social', null, 'meta_ads'],
    ['', 'https://www.google.com/', 'organic_google'],
    ['', 'https://someblog.example.com/', 'referral'],
    ['', '', 'direct'],
  ];
  for (const [query, referrer, expect] of cases) {
    await session(async (p) => {
      await go(p, base + '/restaurants', 900);
      await p.eval('try{localStorage.clear();sessionStorage.clear();}catch(e){}');
      if (referrer !== null) {
        await p.send('Page.addScriptToEvaluateOnNewDocument', {
          source: 'Object.defineProperty(document,"referrer",{get:function(){return ' + JSON.stringify(referrer) + ';},configurable:true});',
        });
      }
      await go(p, base + '/restaurants' + query, 2000);
      const a = JSON.parse(await p.eval(SNAP) || 'null');
      check('source_category ' + (query || 'referrer=' + (referrer || 'няма')) + ' → ' + expect,
        a && a.source_category === expect, a && a.source_category);
    });
  }

  /* Контейнерът на Google Tag Manager се зарежда с отварянето на
     страницата — това е официалната инсталация и тя е нарочна.
     Договорът не е „навън не тръгва нищо“, а „нищо не се записва и
     нищо рекламно не тръгва, докато посетителят не избере“. Точно
     тази граница се проверява тук, и то поотделно: контейнер, мрежи,
     бисквитки. Слети в едно, първото би скрило останалите две. */
  G('Браузър — проследяване без съгласие');
  await session(async (p) => {
    const external = [];
    p.on(m => {
      if (m.method === 'Network.requestWillBeSent') {
        const u = m.params.request.url;
        if (/googletagmanager|google-analytics|connect\.facebook|doubleclick|googleadservices/.test(u)) external.push(u);
      }
    });
    await go(p, AD, 2600);
    const container = external.filter(u => /googletagmanager\.com\/(gtm\.js|ns\.html)/.test(u));
    const adNets = external.filter(u => /connect\.facebook|doubleclick|googleadservices/.test(u));
    check('контейнерът на GTM се зарежда', container.length > 0, container.length + ' заявки');
    check('без съгласие нищо рекламно не тръгва', adNets.length === 0, adNets.join(' | '));
    const cookies = await p.eval('document.cookie');
    check('без съгласие няма аналитични и рекламни бисквитки',
      !/(^|;\s*)(_ga|_gid|_gcl_|_fbp|_fbc)/.test(cookies || ''), cookies || 'няма');
    const t = JSON.parse(await p.eval('JSON.stringify(window.BDSTracking ? {c:window.BDSTracking.isConfigured(),l:window.BDSTracking.isLoaded(),s:window.BDSTracking.consentState()} : null)') || 'null');
    check('Consent Mode е denied по подразбиране', t && t.s.ad_storage === 'denied' && t.s.analytics_storage === 'denied');
  });

  G('Браузър — CRM');
  {
    const appJs = read('assets/js/app.js');
    const configured = /var CRM_ENDPOINT = '(.+)'/.exec(appJs);
    check('CRM кодът е свързан с успешното изпращане',
      /res\.success === 'true'[\s\S]{0,700}?sendToCrm\(/.test(appJs));
    const crmFn = appJs.slice(appJs.indexOf('function sendToCrm'), appJs.indexOf('form.addEventListener'));
    check('CRM грешка не проваля заявката (има catch)',
      /\['catch'\]\(/.test(crmFn) && /catch \(e\)/.test(crmFn));
    check('CRM ползва text\/plain (без CORS preflight към Apps Script)',
      /'Content-Type': 'text\/plain;charset=utf-8'/.test(appJs));

    if (!configured) {
      check('CRM endpoint е попълнен', false,
        'BLOCKED — CRM WEB APP URL REQUIRED. Виж tools/crm/SETUP.md, после сложи адреса в CRM_ENDPOINT.');
    } else {
      /* Свързан е — прихващаме адреса и проверяваме какво реално заминава. */
      const host = configured[1];
      await session(async (p, errs, posts, KEY, crm) => {
        const crmPosts = crm();          /* прихванато от самата сесия */
        await go(p, AD);
        await p.eval(FILL);
        await p.eval("document.getElementById('restaurantForm').requestSubmit()");
        await sleep(3200);
        check('CRM получава точно една заявка', crmPosts.length === 1, crmPosts.length + ' заявки към ' + host);
        if (crmPosts[0]) {
          let b = {};
          try { b = JSON.parse(crmPosts[0]); } catch {}
          check('CRM записът носи Lead ID', /BDS-\d{4}-/.test(b.lead_id || ''), b.lead_id);
          check('CRM записът носи източник и кампания',
            b.source_category === 'google_ads' && b.campaign === 'restaurant_search_bg',
            b.source_category + ' / ' + b.campaign);
          check('CRM записът носи първото докосване', !!b.first_source, b.first_source);
          check('CRM записът носи контактните данни',
            !!b.full_name && !!b.business_name, b.business_name);
          /* Lead ID-то в CRM трябва да е СЪЩОТО като в имейла. */
          let emailBody = {};
          try { emailBody = JSON.parse(posts()[0].body); } catch {}
          check('Lead ID в CRM и в имейла съвпадат',
            b.lead_id === emailBody['Lead ID'], b.lead_id + ' / ' + emailBody['Lead ID']);
        }
      });
    }
  }

  G('Браузър — пътят до /contact.html');
  await session(async (p, errs, posts) => {
    /* Реалният път на човек от рекламата: ресторантската страница,
       после CTA към общата форма. Дълго време цялата инструментация
       седеше само на #restaurantForm — тоест точно този път не
       произвеждаше нито RestaurantFormStart, нито Lead. */
    await p.send('Page.addScriptToEvaluateOnNewDocument', { source: "(function(){  try {    localStorage.setItem(\"bds_consent\", JSON.stringify({      version: 1, analytics: true, ads: true, at: new Date().toISOString()    }));  } catch (e) {}  function push(rec){    try {      var all = JSON.parse(sessionStorage.getItem(\"__bds_meta\") || \"[]\");      all.push(rec);      sessionStorage.setItem(\"__bds_meta\", JSON.stringify(all));    } catch (e) {}  }  var held;  Object.defineProperty(window, \"BDSTracking\", {    configurable: true,    get: function(){ return held; },    set: function(v){      held = v;      if (v && typeof v.meta === \"function\") {        var real = v.meta;        v.meta = function(kind, name, params, opts){          push({ kind: kind, name: name, params: params || {}, opts: opts || null });          return real.apply(v, arguments);        };      }    }  });})()" });

    await go(p, base + '/restaurants', 2400);
    const onLanding = JSON.parse(await p.eval("sessionStorage.getItem(\"__bds_meta\") || \"[]\""));
    check('на /restaurants тръгва RestaurantLandingView',
      onLanding.some(e => e.name === 'RestaurantLandingView'),
      onLanding.map(e => e.name).join(', ') || 'нищо');
    /* PageView се праща от loadMetaPixel() директно през fbq, не през
       meta(), затова не минава през прихващача. Че се зарежда изобщо,
       се проверява в групата „съгласие“ и се вижда в Meta Test Events. */

    /* Преход към общата форма — както го прави CTA-то. */
    await go(p, base + '/contact.html', 2400);
    const funnel = await p.eval("sessionStorage.getItem('bds_funnel')");
    check('контекстът на фунията оцелява при смяна на страницата',
      funnel === 'restaurant', String(funnel));

    /* Истинско писане през браузъра, не dispatchEvent: кодът нарочно
       отхвърля събития с isTrusted:false, за да не брои фокус, сложен
       от скрипт. Само така се проверява това, което прави човек. */
    await p.eval("document.getElementById('contactForm').elements.name.focus()");
    await sleep(200);
    await p.send('Input.insertText', { text: 'QA TEST - not a real person' });
    await sleep(600);
    await p.eval("(function(){var f=document.getElementById('contactForm');f.elements.email.value='qa-test@example.invalid';f.elements.phone.value='0000000000';f.elements.message.value='QA synthetic submission';return 'ok';})()");
    await sleep(800);
    const afterStart = JSON.parse(await p.eval("sessionStorage.getItem(\"__bds_meta\") || \"[]\""));
    const starts = afterStart.filter(e => e.name === 'RestaurantFormStart');
    check('истинско докосване праща RestaurantFormStart', starts.length > 0,
      afterStart.map(e => e.name).join(', ') || 'нищо');
    check('RestaurantFormStart тръгва точно веднъж', starts.length === 1,
      starts.length + ' пъти');

    await p.eval("document.getElementById('contactForm').requestSubmit()");
    await sleep(2800);
    const afterSubmit = JSON.parse(await p.eval("sessionStorage.getItem(\"__bds_meta\") || \"[]\""));
    const leads = afterSubmit.filter(e => e.name === 'Lead');
    check('успешното изпращане праща Lead', leads.length > 0,
      afterSubmit.map(e => e.name).join(', ') || 'нищо');
    check('Lead тръгва точно веднъж', leads.length === 1, leads.length + ' пъти');
    check('Lead е стандартно събитие с eventID',
      leads[0] && leads[0].kind === 'track' && !!(leads[0].opts && leads[0].opts.eventID),
      leads[0] ? JSON.stringify(leads[0].opts) : '');
    check('Lead не носи параметри към Meta',
      leads[0] && JSON.stringify(leads[0].params) === '{}',
      leads[0] ? JSON.stringify(leads[0].params) : '');

    const flat = JSON.stringify(afterSubmit);
    check('нищо лично не тръгва към Meta',
      !/not a real person/.test(flat) && !/example\\.invalid/.test(flat) &&
      !/0000000000/.test(flat), flat.slice(0, 140));

    check('заявката наистина е изпратена', posts().length === 1,
      posts().length + ' заявки');

    /* localStorage е споделен по origin. Оставено съгласие тук би
       направило следващата сесия „вече избрал“ и проверката „преди
       избор: нула заявки“ би паднала без вина. */
    await p.eval("try{localStorage.removeItem('bds_consent');sessionStorage.clear();}catch(e){}");
  });

  G('Браузър — връщане назад');
  await session(async (p) => {
    await go(p, base + '/restaurants', 2200);
    /* Завесата се спуска при клик по вътрешна връзка и ОСТАВА спусната:
       animation-fill-mode е forwards. При връщане от bfcache браузърът
       възстановява DOM-а точно такъв — с покрит екран — а `load` не идва
       втори път, значи никой не я вдига. Оттам и празният екран, който
       се „оправя“ с рефреш. Проверява се, че pageshow я вдига. */
    await p.eval("document.querySelector('.page-transition').classList.add('cover')");
    await sleep(600);
    const covered = JSON.parse(await p.eval("JSON.stringify((function(){var o=document.querySelector(\".page-transition\");var r=o.getBoundingClientRect();var st=getComputedStyle(o);return { covers: r.top<=1 && r.height>=window.innerHeight-2 };})())"));
    check('завесата наистина покрива екрана', covered.covers);

    await p.eval("window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}))");
    await sleep(400);
    const after = JSON.parse(await p.eval("JSON.stringify((function(){var o=document.querySelector(\".page-transition\");var r=o.getBoundingClientRect();var st=getComputedStyle(o);return { covers: r.top<=1 && r.height>=window.innerHeight-2, pointer: st.pointerEvents, preloader: !!document.querySelector(\".preloader\") };})())"));
    check('при връщане назад завесата се вдига', !after.covers);
    check('кликовете не остават блокирани', after.pointer === 'none', after.pointer);
    check('не остава залепнал preloader', !after.preloader);
  });

  G('Браузър — съгласие');
  await session(async (p, errs) => {
    const external = [];
    p.on(m => {
      if (m.method === 'Network.requestWillBeSent' &&
        /googletagmanager|google-analytics|connect\.facebook|doubleclick|googleadservices/.test(m.params.request.url)) {
        external.push(m.params.request.url);
      }
    });
    await go(p, base + '/restaurants', 900);
    await p.eval('try{localStorage.clear();}catch(e){}');
    await go(p, base + '/restaurants', 2600);

    check('банерът се показва на нов посетител', await p.eval("!!document.querySelector('.consent')"));
    check('банерът предлага и отказ, и приемане',
      await p.eval("!!document.querySelector('[data-consent=\"reject\"]') && !!document.querySelector('[data-consent=\"accept\"]')"));
    check('банерът не мести съдържанието (fixed)',
      (await p.eval("getComputedStyle(document.querySelector('.consent')).position")) === 'fixed');
    check('преди избор: нула заявки към рекламни мрежи',
      external.filter(u => /connect\.facebook|doubleclick|googleadservices/.test(u)).length === 0,
      external.join(' | '));

    /* Отказ */
    await p.eval("document.querySelector('[data-consent=\"reject\"]').click()");
    await sleep(1200);
    let st = JSON.parse(await p.eval('JSON.stringify(window.BDSTracking.consentState())'));
    check('отказ: analytics остава denied', st.analytics_storage === 'denied', st.analytics_storage);
    check('отказ: ads остава denied', st.ad_storage === 'denied', st.ad_storage);
    check('отказ: банерът се скрива', !(await p.eval("!!document.querySelector('.consent')")));
    check('отказ: нула заявки към рекламни мрежи',
      external.filter(u => /connect\.facebook|doubleclick|googleadservices/.test(u)).length === 0,
      external.join(' | '));
    const afterReject = await p.eval('document.cookie');
    check('отказ: не остава аналитична или рекламна бисквитка',
      !/(^|;\s*)(_ga|_gid|_gcl_|_fbp|_fbc)/.test(afterReject || ''), afterReject || 'няма');

    /* Изборът преживява презареждане */
    await go(p, base + '/restaurants', 2400);
    check('изборът се помни след презареждане', !(await p.eval("!!document.querySelector('.consent')")));
    st = JSON.parse(await p.eval('JSON.stringify(window.BDSTracking.consentState())'));
    check('запомненият отказ пак дава denied', st.ad_storage === 'denied');

    /* Панелът може да се отвори пак */
    check('връзката „Настройки за бисквитките“ съществува',
      await p.eval("!!document.querySelector('[data-consent-open]')"));
    await p.eval("document.querySelector('[data-consent-open]').click()");
    await sleep(700);
    check('панелът се отваря', await p.eval("!!document.querySelector('.consent-modal')"));
    check('панелът е диалог с aria-modal',
      (await p.eval("(document.querySelector('.consent-modal__panel')||{}).getAttribute && document.querySelector('.consent-modal__panel').getAttribute('aria-modal')")) === 'true');
    check('панелът има превключвател за анализ и за реклама',
      await p.eval("!!document.getElementById('consentAnalytics') && !!document.getElementById('consentAds')"));

    /* Приемане на реклама. От тук нататък гледаме само какво добавя
       СЪГЛАСИЕТО — иначе в списъка стоят контейнерите от трите
       зареждания дотук и нищо не се вижда. */
    external.length = 0;
    await p.eval("document.getElementById('consentAds').checked = true; document.getElementById('consentAnalytics').checked = true;");
    await p.eval("document.querySelector('[data-save]').click()");
    await sleep(1400);
    st = JSON.parse(await p.eval('JSON.stringify(window.BDSTracking.consentState())'));
    check('приемане: analytics става granted', st.analytics_storage === 'granted', st.analytics_storage);
    check('приемане: ads става granted', st.ad_storage === 'granted', st.ad_storage);
    check('приемане: ad_user_data и ad_personalization също',
      st.ad_user_data === 'granted' && st.ad_personalization === 'granted');
    /* Meta Pixel-ът е конфигуриран. Затова при дадено рекламно
       съгласие ТРЯБВА да се зареди — това е доказателството, че
       съгласието наистина отключва пиксела, а не че кодът мълчи,
       защото няма ID.

       Контейнерът вече е на страницата от <head>. Съгласието му
       изпраща update, а не втори скрипт: нов gtm.js тук би значел
       двойна инсталация и удвоени числа. */
    const meta = external.filter(u => /connect\.facebook/.test(u));
    const container2 = external.filter(u => /googletagmanager\.com\/(gtm\.js|ns\.html)/.test(u));

    check('след съгласие Meta Pixel се зарежда', meta.length > 0,
      meta.length + ' заявки');
    check('зарежда се точно конфигурираният пиксел',
      meta.some(u => u.includes('1666581461701404')) ||
      meta.some(u => /fbevents\.js/.test(u)),
      meta[0] || '');
    check('съгласието не зарежда втори контейнер',
      container2.length === 0, container2.join(' | '));
    check('нула конзолни грешки в целия поток', errs().length === 0, errs().join(' | '));
  });

  G('Браузър — мобилни изрезки');
  for (const [w, h] of [[320, 568], [360, 800], [375, 812], [390, 844], [412, 915], [430, 932]]) {
    await session(async (p, errs) => {
      await p.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 3, mobile: true });
      /* Изчистваме избора нарочно: банерът за съгласие ТРЯБВА да е на екрана,
         докато мерим. Той е първото, което вижда посетител от реклама, и
         най-лесното място да се появи хоризонтално превъртане. */
      await go(p, base + '/restaurants', 900);
      await p.eval('try{localStorage.clear();}catch(e){}');
      await go(p, base + '/restaurants', 2400);
      check(w + '×' + h + ' банерът за съгласие е на екрана', await p.eval("!!document.querySelector('.consent')"));
      const bannerFits = await p.eval("(function(){var c=document.querySelector('.consent');if(!c)return true;var b=c.getBoundingClientRect();return b.height <= window.innerHeight*0.6 && b.right <= window.innerWidth+1 && b.left >= -1;})()");
      check(w + '×' + h + ' банерът се побира (≤60% височина, без изнасяне)', bannerFits);
      const r = JSON.parse(await p.eval(`JSON.stringify((function(){
        var cta=document.querySelector('[data-track="cta_hero_primary"]').getBoundingClientRect();
        /* offsetHeight е кутията в оформлението. getBoundingClientRect връща
           ВИЗУАЛНАТА кутия, а .reveal държи scale(0.985) докато секцията не е
           превъртяна — това правеше 44px да изглеждат като 43px. */
        var small=[].slice.call(document.querySelectorAll('a,button,select,input,[role=button]')).filter(function(e){
          if (e.type==='hidden') return false;
          if (!e.offsetWidth || !e.offsetHeight) return false;
          /* WCAG 2.5.8 не иска 44px от връзка, вградена в изречение. */
          var p2=e.parentElement;
          if (getComputedStyle(e).display==='inline' && p2 && /^(P|LI|SPAN|SMALL|LABEL|TD)$/.test(p2.tagName)) return false;
          return e.offsetHeight<44 || e.offsetWidth<24;
        }).map(function(e){return (e.textContent||e.tagName).trim().slice(0,22)+' '+e.offsetHeight+'x'+e.offsetWidth;});
        /* ВАЖНО: не сравнявай scrollWidth с innerWidth. Когато съдържанието
           не се побира, Chrome разтяга САМИЯ layout viewport (innerWidth
           става 370 при екран 320) и разликата излиза 0, докато човекът
           реално дърпа страницата настрани. Мерим спрямо ширината на
           устройството. */
        return {layoutViewport:window.innerWidth,
                overflow:Math.max(document.documentElement.scrollWidth, window.innerWidth) - ${w},
                ctaVisible:cta.bottom<=window.innerHeight, ctaH:Math.round(cta.height), small:small};})())`));
      check(w + '×' + h + ' нула препълване', r.overflow <= 0, 'overflow=' + r.overflow + 'px, layout viewport=' + r.layoutViewport);
      check(w + '×' + h + ' CTA е на първия екран', r.ctaVisible, 'височина ' + r.ctaH + 'px');
      check(w + '×' + h + ' всички цели ≥44px', r.small.length === 0, r.small.slice(0, 6).join(' | '));
      check(w + '×' + h + ' нула грешки', errs().length === 0);
    });
  }

  try { chrome.proc.kill(); } catch {}
}

/* ============================================================
   Изпълнение
   ============================================================ */

console.log('\x1b[1mBDS — тест на ресторантската фуния\x1b[0m');
console.log('\x1b[2m' + ROOT + '\x1b[0m');

staticTests();

if (WANT_BROWSER) {
  let base = REMOTE, srv = null;
  if (!base) { srv = await startServer(ROOT); base = 'http://localhost:' + srv.port; }
  console.log('\n\x1b[2mбраузърни тестове срещу ' + base + '\x1b[0m');
  try { await browserTests(base.replace(/\/$/, '')); } finally { if (srv) srv.server.close(); }
} else {
  console.log('\n\x1b[2m(браузърните тестове се пропускат — пусни с --browser)\x1b[0m');
}

const failed = results.filter(r => !r.ok);
console.log('\n' + '─'.repeat(60));
console.log(failed.length
  ? '\x1b[31m' + failed.length + ' от ' + results.length + ' проверки се провалят\x1b[0m'
  : '\x1b[32mвсички ' + results.length + ' проверки минават\x1b[0m');
if (failed.length) {
  console.log('');
  for (const f of failed) console.log('  \x1b[31m×\x1b[0m ' + f.group + ' → ' + f.name + (f.detail ? '  (' + f.detail + ')' : ''));
}
console.log('─'.repeat(60));
process.exit(failed.length ? 1 : 0);
