/* ============================================================
   Bulgaria Digital Services — генератор на страници от централния data source
   ------------------------------------------------------------
   Чете assets/js/bds-data.js и записва:
     • маркираните региони в services.html, packages.html,
       projects.html  (<!-- BDS:GEN start:ИМЕ --> … <!-- BDS:GEN end -->)
     • пълните case study страници case-*.html
     • print/packages-print.html — източник за PDF-а

   Изпълнение:  node tools/build-pages.mjs
   Нула външни зависимости. Не пипа нищо извън маркерите.

   ВАЖНО: съдържанието вътре в маркерите се презаписва при всяко
   изпълнение. Редактирай bds-data.js, не генерирания HTML.
   ============================================================ */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE_URL = 'https://bulgaria-digital-services.com';
/* Кой проект носи доказателството на /restaurants. Смяната му е един ред. */
const RESTAURANT_PROOF_SLUG = 'pizza-pazzo';

/* ---------- 1. Зареждане на data source-а ---------- */
function loadData() {
  const src = readFileSync(join(ROOT, 'assets/js/bds-data.js'), 'utf8');
  const sandbox = {};
  // bds-data.js е IIFE, която пише в подадения global — подаваме си свой.
  new Function('window', src)(sandbox);
  if (!sandbox.BDS_DATA) throw new Error('bds-data.js не е дефинирал BDS_DATA');
  return sandbox.BDS_DATA;
}

const D = loadData();

/* ---------- 2. Помощни ---------- */
const esc = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const li = (items, cls = '') =>
  items.map((i) => `<li${cls ? ` class="${cls}"` : ''}>${esc(i)}</li>`).join('\n            ');

const written = [];
function write(rel, content) {
  const abs = join(ROOT, rel);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, content, 'utf8');
  written.push(rel);
}

/** Заменя съдържанието между <!-- BDS:GEN start:name --> и <!-- BDS:GEN end --> */
function patchRegion(rel, name, html) {
  const abs = join(ROOT, rel);
  if (!existsSync(abs)) throw new Error(`Липсва файл за пач: ${rel}`);
  const src = readFileSync(abs, 'utf8');
  const startTag = `<!-- BDS:GEN start:${name} -->`;
  const endTag = `<!-- BDS:GEN end:${name} -->`;
  const s = src.indexOf(startTag);
  const e = src.indexOf(endTag);
  if (s === -1 || e === -1) throw new Error(`Липсва маркер "${name}" в ${rel}`);
  const next =
    src.slice(0, s + startTag.length) + '\n' + html + '\n        ' + src.slice(e);
  writeFileSync(abs, next, 'utf8');
  if (!written.includes(rel)) written.push(rel);
}

/* ---------- 3. Блокове ---------- */

/** Двете основни категории (сайт vs система). */
function categoriesHtml() {
  return D.categories
    .map(
      (c, idx) => `        <article class="cat-card reveal" data-delay="${idx + 1}">
          <span class="cat-card__kicker">${esc(c.short)}</span>
          <h3 class="cat-card__title">${esc(c.name)}</h3>
          <p class="cat-card__lead">${esc(c.lead)}</p>
          <p class="cat-card__sub">Какво прави</p>
          <ul class="cat-card__list">
            ${li(c.does)}
          </ul>
          <p class="cat-card__sub">Какво не прави</p>
          <ul class="cat-card__list cat-card__list--no">
            ${li(c.doesNot)}
          </ul>
          <div class="cat-card__foot">
            <a href="${esc(c.cta.href)}" class="btn ${c.id === 'site' ? 'btn--brand' : 'btn--outline'} btn--block">${esc(c.cta.label)}</a>
          </div>
        </article>`
    )
    .join('\n');
}

/** Помощник „сайт или система?“ */
function deciderHtml() {
  const items = D.systemTriggers
    .map(
      (t) =>
        `            <div class="decider__item"><span aria-hidden="true">✓</span><span>${esc(t)}</span></div>`
    )
    .join('\n');
  return `        <div class="decider reveal">
          <h3 class="decider__title">Сайт или система? Проверете за 30 секунди.</h3>
          <p class="decider__lead">Отбележете наум всичко, което проектът ви трябва да прави след като клиентът е натиснал бутона.</p>
          <div class="decider__grid">
${items}
          </div>
          <p class="decider__verdict">Ако <b>нито едно</b> от горните не важи за вас — търсите <b>професионален бизнес сайт</b> и пакетите START, BUSINESS или PREMIUM ви върши работа. Ако <b>поне едно</b> важи — проектът е <b>дигитална бизнес система</b> и се офертира индивидуално, а не по пакет.</p>
        </div>`;
}

/** Карти на пакетите. */
/* Задължителна бележка, докато packagesStatus е PROVISIONAL.
   Пакетите се показват, но НЕ като окончателно одобрени (Вариант B). */
function packagesNoteHtml() {
  if (D.meta.packagesStatus !== 'PROVISIONAL') return '';
  return `        <p class="pkg-note reveal" data-bds-packages-note>
          <b>Ориентировъчни пакети.</b> ${esc(D.meta.packagesNote)}
        </p>\n`;
}

function packagesHtml() {
  return packagesNoteHtml() + D.packages
    .map((p, idx) => {
      const price = D.priceLabel(p);
      const limits = D.visibleLimits(p);
      const addons = (p.allowedAddons || [])
        .map((id) => D.getAddon(id))
        .filter(Boolean);

      const priceBlock = price
        ? `          <div class="pkg__price">${esc(price)}</div>
          <p class="pkg__price-note">${esc(p.priceNote)}</p>`
        : `          <div class="pkg__price"><small>Цена по оферта</small></div>`;

      const timelineBlock = p.timeline
        ? `<dl class="pkg__limit"><dt>Срок</dt><dd>${esc(p.timeline)}</dd></dl>`
        : '';

      return `        <article class="pkg${p.featured ? ' pkg--featured' : ''} reveal" data-delay="${idx + 1}" id="pkg-${esc(p.id)}">
          ${p.badge ? `<span class="pkg__badge">${esc(p.badge)}</span>` : ''}
          <h3 class="pkg__name">${esc(p.name)}</h3>
          <p class="pkg__positioning">${esc(p.positioning)}</p>
${priceBlock}

          <div class="pkg__block">
            <p class="pkg__block-title">За кого е</p>
            <p class="pkg__text">${esc(p.forWhom)}</p>
          </div>

          <div class="pkg__block">
            <p class="pkg__block-title">Какъв проблем решава</p>
            <p class="pkg__text">${esc(p.problem)}</p>
          </div>

          <div class="pkg__block">
            <p class="pkg__block-title">Какъв резултат цели</p>
            <p class="pkg__text">${esc(p.outcome)}</p>
          </div>

          <div class="pkg__block">
            <p class="pkg__block-title">Какво включва</p>
            <ul class="pkg__list pkg__list--yes">
            ${li(p.includes)}
            </ul>
          </div>

          <div class="pkg__block">
            <p class="pkg__block-title">Измерими лимити</p>
            <div class="pkg__limits">
              ${limits
                .map(
                  (l) =>
                    `<dl class="pkg__limit"><dt>${esc(l.label)}</dt><dd>${esc(l.value)}</dd></dl>`
                )
                .join('\n              ')}
              ${timelineBlock}
            </div>
            <p class="pkg__note">Броят ревизии и лимитите по съдържание се фиксират писмено в персоналната оферта преди старта.</p>
          </div>

          <div class="pkg__block">
            <p class="pkg__block-title">Какво не включва</p>
            <ul class="pkg__list pkg__list--no">
            ${li(p.excludes)}
            </ul>
          </div>

          <div class="pkg__block">
            <p class="pkg__block-title">Допустими add-ons</p>
            <p class="pkg__text">${esc(addons.map((a) => a.name).join(' · '))}</p>
          </div>

          <div class="pkg__block">
            <p class="pkg__block-title">Кога ви трябва по-висок пакет</p>
            <ul class="pkg__list pkg__list--yes">
            ${li(p.upgradeTriggers)}
            </ul>
          </div>

          <div class="pkg__foot">
            <a href="${esc(p.cta.href)}" class="btn ${p.featured ? 'btn--brand' : 'btn--outline'} btn--block">${esc(p.cta.label)}</a>
            <p class="pkg__note">Ориентировъчен срок за пакетите: ${esc(D.meta.timelineGeneral)}. Точният срок се фиксира в офертата.</p>
          </div>
        </article>`;
    })
    .join('\n');
}

/** Сравнителна таблица — само редове, които имат стойност поне за един пакет. */
function comparisonHtml() {
  const rows = [
    { label: 'Цена за изработка', get: (p) => D.priceLabel(p) },
    { label: 'Подходящ за', get: (p) => p.forWhom },
    { label: 'Основни страници', get: (p) => limitOf(p, 'pages') },
    { label: 'Индивидуални секции', get: (p) => limitOf(p, 'sections') },
    { label: 'Езици', get: (p) => limitOf(p, 'languages') },
    { label: 'Контактни форми', get: (p) => limitOf(p, 'forms') },
    { label: 'Кръгове корекции', get: (p) => limitOf(p, 'revisions') },
    { label: 'Галерия / портфолио', get: (p) => pick(p, null, 'включено', 'разширена') },
    { label: 'Google Analytics и Search Console', get: (p) => pick(p, null, 'включено', 'включено') },
    { label: 'Conversion tracking', get: (p) => pick(p, null, 'включено', 'включено') },
    { label: 'CMS за съдържанието', get: (p) => pick(p, null, 'частичен', 'включено') },
    { label: 'Blog / News', get: (p) => pick(p, null, null, 'включено') },
    { label: 'Advanced SEO', get: (p) => pick(p, null, 'частично', 'включено') },
    { label: 'Custom анимации', get: (p) => pick(p, null, 'базови', 'включено') },
    { label: 'Meta Pixel', get: (p) => pick(p, null, null, 'включено') },
    { label: 'Онлайн поръчки и плащания', get: () => null }
  ];

  /* Трите стойности са по реда START / BUSINESS / PREMIUM. */
  function pick(p, start, business, premium) {
    if (p.id === 'start') return start;
    if (p.id === 'business') return business;
    if (p.id === 'premium') return premium;
    return null;
  }


  /* Търси се по стабилен `key`, не по надпис — надписите се различават
     между пакетите („Публични страници“ / „Публични content страници“),
     а сравнението трябва да сравнява едно и също нещо. */
  function limitOf(p, key) {
    const l = p.limits.find((x) => x.key === key);
    if (!l) throw new Error(`Пакет ${p.id}: липсва лимит с key "${key}" — сравнението би показало „—“ по погрешка`);
    return l.value !== null ? l.value : null;
  }

  const head = D.packages
    .map((p) => `<th scope="col"${p.featured ? ' class="is-featured"' : ''}>${esc(p.shortName)}</th>`)
    .join('');

  const body = rows
    .map((r) => {
      const cells = D.packages
        .map((p) => {
          const v = r.get(p);
          const cls = p.featured ? ' class="is-featured"' : '';
          if (v === null) return `<td${p.featured ? ' class="is-featured cmp-no"' : ' class="cmp-no"'}>—</td>`;
          return `<td${cls}>${esc(v)}</td>`;
        })
        .join('');
      return `            <tr><th scope="row">${esc(r.label)}</th>${cells}</tr>`;
    })
    .join('\n');

  return packagesNoteHtml() + `        <div class="cmp-wrap reveal">
          <table class="cmp">
            <caption>Сравнение на трите пакета за професионални бизнес сайтове. „—“ означава, че услугата не е включена в пакета.</caption>
            <thead>
              <tr><th scope="col">Какво сравняваме</th>${head}</tr>
            </thead>
            <tbody>
${body}
            </tbody>
          </table>
        </div>`;
}

/** Add-on карти. */
function addonsHtml() {
  return D.addons
    .map(
      (a, idx) => `        <article class="addon reveal" data-delay="${(idx % 3) + 1}">
          <h3 class="addon__name">${esc(a.name)}</h3>
          <p class="addon__row"><b>Решава:</b> ${esc(a.problem)}</p>
          <p class="addon__row"><b>Обхват:</b> ${esc(a.scope)}</p>
          <p class="addon__row"><b>Цена:</b> ${a.price === null ? 'по оферта' : esc(a.price)}</p>
          <p class="addon__note">${esc(a.note)}</p>
        </article>`
    )
    .join('\n');
}

/** Карта на проект — ползва се САМО от featured секцията на index.html.
    Страницата „Проекти“ вече е един широк списък, виж projectRow. */
function projectCard(p, idx) {
  const flag = p.category === 'system' ? 'system' : 'site';
  const flagLabel = p.category === 'system' ? 'Дигитална бизнес система' : 'Професионален бизнес сайт';
  const thumb = p.hero
    ? `<div class="cs-card__thumb"><span class="cs-card__flag cs-card__flag--${flag}">${esc(flagLabel)}</span><img src="${esc(p.hero)}" alt="${esc(p.heroAlt)}" loading="lazy" decoding="async" /></div>`
    : '';
  const facts = (p.verified || [])
    .slice(0, 3)
    .map((f) => `              <li><span>${esc(f.label)}</span><b>${esc(f.value)}</b></li>`)
    .join('\n');
  /* Връзка към case study се слага САМО при потвърдено разрешение
     от клиента. Без него страницата остава подготвена, но скрита. */
  const link = D.caseLinkAllowed(p)
    ? `<a href="${esc(p.page)}" class="btn btn--outline btn--block">Виж case study <span class="btn__arrow">→</span></a>`
    : `<a href="${esc(p.cta.href)}" class="btn btn--outline btn--block">${esc(p.cta.label)}</a>`;

  return `          <article class="cs-card reveal" data-delay="${idx + 1}">
            ${thumb}
            <div class="cs-card__body">
              <span class="cs-card__industry">${esc(p.industry)}</span>
              <h3 class="cs-card__name">${esc(p.name)}</h3>
              <p class="cs-card__summary">${esc(p.summary)}</p>
              <ul class="cs-card__facts">
${facts}
              </ul>
              <div class="cs-card__foot">${link}</div>
            </div>
          </article>`;
}

/** Скъсява един ред от `built` до нещо, което се чете за секунда:
    реже поясненията в скоби и тиретата, после подрежданията след запетая. */
function shortLine(text) {
  let t = String(text).split(' (')[0].split(' — ')[0].trim();
  if (t.length > 58) {
    const cut = t.slice(0, 58);
    const at = Math.max(cut.lastIndexOf(', '), cut.lastIndexOf(': '));
    if (at > 26) t = cut.slice(0, at);
    else {
      /* Не бива да свършва на предлог — „...в брой при…“ звучи счупено. */
      let w = cut.slice(0, cut.lastIndexOf(' ')).split(' ');
      while (w.length > 3 && /^(при|и|с|в|във|на|за|от|до|като|по|или|към|през)$/i.test(w[w.length - 1])) w.pop();
      t = w.join(' ') + '…';
    }
  }
  return t.replace(/[.,;:]$/, '');
}

/** Един широк ред: снимка вляво, обяснение и списък вдясно. */
function projectRow(p, idx) {
  const isSystem = p.category === 'system';
  const flagLabel = isSystem ? 'Дигитална бизнес система' : 'Професионален бизнес сайт';
  const media = p.hero
    ? `<img src="${esc(p.hero)}" alt="${esc(p.heroAlt)}" loading="lazy" decoding="async" />`
    : `<span class="proj__noshot">Предстои екран</span>`;

  const items = (p.built || []).slice(0, 4)
    .map((b) => `                <li>${esc(shortLine(b))}</li>`)
    .join('\n');

  /* Връзка към case study се слага САМО при потвърдено разрешение
     от клиента. Без него страницата остава подготвена, но скрита. */
  const link = D.caseLinkAllowed(p)
    ? `<a href="${esc(p.page)}" class="btn btn--outline">Виж case study <span class="btn__arrow">→</span></a>`
    : `<a href="${esc(p.cta.href)}" class="btn btn--outline">${esc(p.cta.label)}</a>`;

  return `          <article class="proj reveal" data-delay="${(idx % 3) + 1}">
            <div class="proj__media">${media}</div>
            <div class="proj__body">
              <div class="proj__meta">
                <span class="proj__flag proj__flag--${isSystem ? 'system' : 'site'}">${esc(flagLabel)}</span>
                <span class="proj__industry">${esc(p.industry)}</span>
              </div>
              <h3 class="proj__name">${esc(p.name)}</h3>
              <p class="proj__summary">${esc(p.summary)}</p>
              <span class="proj__list-label">Какво включва</span>
              <ul class="proj__list">
${items}
              </ul>
              <div class="proj__foot">${link}</div>
            </div>
          </article>`;
}

/* ============================================================
   Секции на рекламната страница за ресторанти.
   Всяка чете от bds-data.js, който на свой ред отразява
   `PRICES AND PACKETS`. Никаква цена не се пише на ръка.
   ============================================================ */

/** Реалният case study на /restaurants.
    Числата идват от `verified` на проекта в bds-data.js — същият
    източник, който храни и страницата case-pizza-pazzo.html. */
function restaurantCaseHtml() {
  const p = D.getProject(RESTAURANT_PROOF_SLUG);
  if (!p || !p.localReady) {
    return `          <p class="evidence-note">Проектът „${RESTAURANT_PROOF_SLUG}“ не е готов за показване.</p>`;
  }

  /* Само потвърдени стойности, взети по етикет. Липсващ етикет се
     пропуска, вместо да се показва празна карта. */
  const metricLabels = ['Продукти в менюто', 'Варианти и размери', 'Статуси на поръчката', 'Езици'];
  const metrics = metricLabels
    .map((label) => (p.verified || []).find((v) => v.label === label))
    .filter(Boolean)
    .map((v) => `            <div class="cs-metric">
              <b>${esc(v.value)}</b>
              <span>${esc(v.label)}</span>
            </div>`)
    .join('\n');

  const modules = [
    'Сайт за клиента', 'Онлайн меню', 'Варианти по размер', 'Количка',
    'Checkout', 'Доставка и вземане', 'Админ панел', 'Статуси на поръчките',
    'Кухненско устройство', 'Имейл известия', 'Отчети и смени', 'BG / EN'
  ]
    .map((m) => `            <li>${esc(m)}</li>`)
    .join('\n');

  const link = D.caseLinkAllowed(p)
    ? `<a href="${esc(p.page)}" class="btn btn--outline" data-track="cta_case_full">Виж пълния case study <span class="btn__arrow">&rarr;</span></a>`
    : '';

  return `        <div class="cs-summary reveal">
          <div class="cs-metrics">
${metrics}
          </div>
          <div class="cs-modules">
            <h3 class="cs-modules__title">Какво съдържа системата</h3>
            <ul class="cs-modules__list">
${modules}
            </ul>
          </div>
        </div>

        <p class="cs-status reveal">${esc(p.statusNote)}</p>

        <div class="cs-flow reveal">
          <h3 class="cs-flow__title">Пътят на една поръчка</h3>
          <ol class="cs-flow__steps">
            <li class="cs-step">
              <span class="cs-step__n">1</span>
              <h4>Клиентът поръчва</h4>
              <p>Отваря менюто, избира продукт и размер, добавя в количката и минава през checkout с доставка или вземане от място.</p>
              <figure class="cs-step__shot">
                <a href="assets/img/case/pp-product.jpg" target="_blank" rel="noopener" aria-label="Отвори екрана в пълен размер"><img src="assets/img/case/pp-product.jpg" width="1440" height="760" loading="lazy" decoding="async" alt="Продуктовата страница на Pizza Pazzo с избор на размер 30 или 40 см, добавки, сосове и количество" /></a>
                <figcaption>Продуктова страница: размер, добавки, сосове, количество</figcaption>
              </figure>
            </li>
            <li class="cs-step">
              <span class="cs-step__n">2</span>
              <h4>Поръчката влиза в системата</h4>
              <p>Записва се със съдържанието, сумата, начина на получаване и бележката, и се появява при екипа.</p>
              <figure class="cs-step__shot">
                <a href="assets/img/case/pp-checkout.jpg" target="_blank" rel="noopener" aria-label="Отвори екрана в пълен размер"><img src="assets/img/case/pp-checkout.jpg" width="1440" height="1199" loading="lazy" decoding="async" alt="Checkout на Pizza Pazzo с полета за контакт, доставка, бележка и обобщение на поръчката" /></a>
                <figcaption>Checkout: контакт, доставка, бележка, обобщение</figcaption>
              </figure>
            </li>
            <li class="cs-step">
              <span class="cs-step__n">3</span>
              <h4>Кухнята я вижда</h4>
              <p>Поръчката се показва на отделно устройство с продуктите, количествата и бележките и може да се разпечата.</p>
              <p class="cs-step__missing">Екран от кухненското устройство не е заснет — то е Android приложение и изисква вход.</p>
            </li>
            <li class="cs-step">
              <span class="cs-step__n">4</span>
              <h4>Поръчката се обработва</h4>
              <p>Екипът я приема или отказва със срок за изпълнение и тя минава през статусите до предаване.</p>
              <p class="cs-step__missing">Екран от административния панел не е заснет — изисква вход с роля.</p>
            </li>
          </ol>
        </div>

        <div class="cs-gallery reveal">
          <h3 class="cs-gallery__title">Останалите екрани</h3>
          <div class="cs-gallery__grid">
            <figure>
              <a href="assets/img/case/pp-homepage.jpg" target="_blank" rel="noopener" aria-label="Отвори екрана в пълен размер"><img src="assets/img/case/pp-homepage.jpg" width="1440" height="1400" loading="lazy" decoding="async" alt="Началната страница на Pizza Pazzo с представяне на заведението и вход към менюто" /></a>
              <figcaption>Начална страница — представяне и вход към менюто</figcaption>
            </figure>
            <figure>
              <a href="assets/img/case/pp-menu.jpg" target="_blank" rel="noopener" aria-label="Отвори екрана в пълен размер"><img src="assets/img/case/pp-menu.jpg" width="1440" height="1400" loading="lazy" decoding="async" alt="Дигиталното меню на Pizza Pazzo с категории, продукти, цени и обозначени алергени" /></a>
              <figcaption>Меню — категории, цени, обозначени алергени</figcaption>
            </figure>
            <figure>
              <a href="assets/img/case/pp-cart.jpg" target="_blank" rel="noopener" aria-label="Отвори екрана в пълен размер"><img src="assets/img/case/pp-cart.jpg" width="1440" height="533" loading="lazy" decoding="async" alt="Количката на Pizza Pazzo с избран продукт, количество, междинна сума, доставка и общо" /></a>
              <figcaption>Количка — количество, доставка, обща сума</figcaption>
            </figure>
          </div>
        </div>

        <div class="cs-cta reveal">
          <a href="#restaurant-contact" class="btn btn--brand btn--lg" data-track="cta_case_primary">Получи оферта</a>
          ${link}
        </div>`;
}

/** Кои проекти носят доверието на /restaurants.
    Само реални, одобрени за публикуване проекти от ресторантския сектор. */
const RESTAURANT_TRUST_SLUGS = ['pizza-pazzo', 'zlatnata-skara', 'restaurant-ribkata'];

/** Trust секцията: реални проекти, кой стои зад BDS, контакти, правно.
    Нищо тук не е декоративно — всяко твърдение е проверимо. */
/* Реалните размери на изображение — за коректно aspect-ratio в HTML,
   което държи CLS на нула. Поддържа PNG, JPEG и WebP. */
function imageSize(relPath) {
  const abs = join(ROOT, relPath);
  if (!existsSync(abs)) return null;
  const b = readFileSync(abs);
  if (b.length > 24 && b.toString("ascii", 1, 4) === "PNG") {
    return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
  }
  if (b.length > 30 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") {
    const type = b.toString("ascii", 12, 16);
    if (type === "VP8X") return { w: (b.readUIntLE(24, 3) + 1), h: (b.readUIntLE(27, 3) + 1) };
    if (type === "VP8 ") return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff };
    if (type === "VP8L") {
      const n = b.readUInt32LE(21);
      return { w: (n & 0x3fff) + 1, h: ((n >> 14) & 0x3fff) + 1 };
    }
  }
  if (b.length > 4 && b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i < b.length - 9) {
      if (b[i] !== 0xff) { i++; continue; }
      const m = b[i + 1];
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
        return { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7) };
      }
      i += 2 + b.readUInt16BE(i + 2);
    }
  }
  return null;
}

function restaurantTrustHtml() {
  const projects = RESTAURANT_TRUST_SLUGS
    .map((slug) => D.getProject(slug))
    .filter((p) => p && p.localReady && p.publicationApproved === true);

  const cards = projects
    .map((p) => {
      const shot = p.hero
        ? (() => {
          const d = imageSize(p.hero) || { w: 1900, h: 880 };
          return `<img src="${esc(p.hero)}" width="${d.w}" height="${d.h}" loading="lazy" decoding="async" alt="Екран от проекта ${esc(p.name)} — ${esc(p.industry)}" />`;
        })()
        : '';
      const link = D.caseLinkAllowed(p)
        ? `<a href="${esc(p.page)}" class="tproj__link" data-track="link_trust_case">Виж case study <span class="btn__arrow">&rarr;</span></a>`
        : '';
      return `            <article class="tproj">
              <div class="tproj__shot">${shot}</div>
              <div class="tproj__body">
                <span class="tproj__industry">${esc(p.industry)}</span>
                <h4 class="tproj__name">${esc(p.name)}</h4>
                <p class="tproj__summary">${esc(p.summary)}</p>
                ${link}
              </div>
            </article>`;
    })
    .join('\n');

  const c = D.meta.contact;

  return `        <div class="tprojects reveal">
          <h3 class="trust__label">Реални проекти в ресторантския сектор</h3>
          <div class="tprojects__grid">
${cards}
          </div>
        </div>

        <div class="tinfo">
          <article class="tinfo__col reveal" data-delay="1">
            <h3 class="trust__label">Кой стои зад BDS</h3>
            <p>Bulgaria Digital Services изгражда сайтове и дигитални системи за български бизнеси. Работим с локални заведения, салони и сервизи — хора, за които сайтът не е витрина, а част от работния процес.</p>
            <p>Зад марката стои <b>${esc(c.name)}</b>, основател и уеб разработчик. Всеки проект се води от него, от първия разговор до пускането.</p>
          </article>

          <article class="tinfo__col reveal" data-delay="2">
            <h3 class="trust__label">Контакти</h3>
            <ul class="tinfo__list">
              <li><span>Имейл</span><a href="mailto:${esc(c.email)}">${esc(c.email)}</a></li>
              <li><span>Телефон</span><a href="tel:${esc(c.phoneHref)}">${esc(c.phone)}</a></li>
              <li><span>Запитване</span><a href="contact.html">Форма за контакт</a></li>
            </ul>
            <h3 class="trust__label trust__label--spaced">Правно и технически</h3>
            <ul class="tinfo__list">
              <li><span>Поверителност</span><a href="privacy.html">Политика за поверителност</a></li>
              <li><span>Условия</span><a href="terms.html">Общи условия</a></li>
              <li><span>Връзка</span>Сайтът работи по HTTPS</li>
            </ul>
          </article>
        </div>`;
}

/* Пакетите са общи за целия сайт, но на /restaurants читателят е
   собственик на заведение. Затова редът „подходящ за“ се превежда на
   неговия език — без да се обещава функционалност, каквато пакетът
   няма. Всичко останало (цена, лимити, включено) идва от данните. */
const RESTAURANT_PACKAGE_FIT = {
  start: 'Малко заведение, което иска да изглежда професионално онлайн — меню, контакти и локация на едно място.',
  business: 'Ресторант с по-богато меню и повече съдържание: галерия, отзиви, отделни страници и измеримост на запитванията.',
  premium: 'По-голямо представяне — няколко езика, повече съдържание и сайт, върху който стъпва и реклама.',
};

/** Пакетите за сайт — компактна карта: цена, за кого, най-важното, CTA. */
function restaurantPackagesHtml() {
  const cards = D.packages
    .map((pkg) => {
      const price = D.priceLabel(pkg);
      const fit = RESTAURANT_PACKAGE_FIT[pkg.id] || pkg.forWhom;
      const top = pkg.includes
        .slice(0, 6)
        .map((x) => `              <li>${esc(x)}</li>`)
        .join('\n');
      const limits = D.visibleLimits(pkg)
        .slice(0, 3)
        .map((l) => `              <li><span>${esc(l.label)}</span><b>${esc(l.value)}</b></li>`)
        .join('\n');
      const all = pkg.includes.map((x) => `                <li>${esc(x)}</li>`).join('\n');

      return `          <article class="rpkg reveal">
            <h3 class="rpkg__name">${esc(pkg.shortName)}</h3>
            <p class="rpkg__price">${esc(price)}</p>
            <p class="rpkg__price-note">фиксирана цена за изработка</p>
            <p class="rpkg__for">${esc(fit)}</p>
            <ul class="rpkg__list">
${top}
            </ul>
            <ul class="rpkg__limits">
${limits}
            </ul>
            <details class="rpkg__more">
              <summary>Виж всички включени функции</summary>
              <ul>
${all}
              </ul>
            </details>
            <a href="#restaurant-contact" class="btn btn--outline rpkg__cta" data-track="cta_package_${esc(pkg.id)}">Получи оферта</a>
          </article>`;
    })
    .join('\n');

  /* Най-честото недоразумение: пакетът за сайт НЕ приема поръчки.
     Затова разграничението стои веднага под картите, а не някъде другаде. */
  const bridge = `        <div class="rbridge reveal">
          <h3 class="rbridge__title">Искате не само сайт?</h3>
          <p class="rbridge__lead">Трите пакета по-горе изграждат <b>сайт</b>. В тях <b>не</b> влизат онлайн поръчки, количка, админ панел за поръчките, доставка, вземане от място и кухненски работен процес.</p>
          <p class="rbridge__lead">При тях цената се формира според нужните модули — виж по-долу.</p>
        </div>`;

  return `        <div class="rpkg-grid">
${cards}
        </div>
        <p class="rest-note">${esc(D.meta.packagesNote)}</p>
${bridge}`;
}

/** Модулната логика на системата + ориентировъчните класове по мащаб. */
function restaurantSystemHtml() {
  const cur = D.meta.currency;

  /* Компактно: по една група на ред, най-важните модули с цените им.
     Пълният списък остава в details, за да не се превърне секцията в
     таблица от трийсет реда. */
  const groups = D.restaurantModules
    .map((g) => {
      const chips = g.items
        .slice(0, 4)
        .map((i) => `                <li>${esc(i.label)} <b>${i.exact ? '' : 'от '}${i.from} ${esc(cur)}</b></li>`)
        .join('\n');
      return `            <div class="rsys__group">
              <h4>${esc(g.group)}</h4>
              <ul>
${chips}
              </ul>
            </div>`;
    })
    .join('\n');

  const allGroups = D.restaurantModules
    .map((g) => {
      const items = g.items
        .map((i) => `                <li><span>${esc(i.label)}</span><b>${i.exact ? '' : 'от '}${i.from} ${esc(cur)}</b></li>`)
        .join('\n');
      return `              <div class="rsys__group">
                <h4>${esc(g.group)}</h4>
                <ul>
${items}
                </ul>
              </div>`;
    })
    .join('\n');

  const classes = D.systemPricing.classes
    .map((c) => {
      const range = c.from ? `${c.from} – ${c.to}` : `до ${c.to}`;
      return `              <li><span>${esc(c.name)}</span><b>${range} ${esc(cur)}</b></li>`;
    })
    .join('\n');

  return `        <div class="rsys">
          <p class="rsys__rule">${esc(D.systemPricing.rule)}</p>

          <div class="rsys__why">
            <h4>Защо няма една цена</h4>
            <p>Две заведения рядко работят еднакво. Броят продукти, вариантите и добавките, доставката, админ функциите, кухненският процес и отчетите определят обхвата — и затова определят цената.</p>
          </div>

          <div class="rsys__scale">
            <h4>Ориентир за мащаб на проекта</h4>
            <ul>
${classes}
            </ul>
          </div>

          <div class="rsys__extras">
            <h4>Допълнителни възможности</h4>
            <div class="rsys__groups">
${groups}
            </div>
            <details class="rsys__modules">
              <summary>Виж всички модули за заведение и цените им</summary>
              <div class="rsys__groups rsys__groups--full">
${allGroups}
              </div>
            </details>
          </div>

          <p class="rest-note">${esc(D.systemPricing.note)} Поддръжката се предлага отделно.</p>
          <a href="#restaurant-contact" class="btn btn--brand btn--lg" data-track="cta_system_quote">Получи оферта</a>
        </div>`;
}

/** Една карта план за поддръжка. */
function maintenanceCard(plan, cur) {
  const list = (plan.includes || []).map((x) => `              <li>${esc(x)}</li>`).join('\n');
  const listBlock = list ? `            <ul class="rmaint__list">\n${list}\n            </ul>` : '';
  const free = plan.freeChanges
    ? `            <p class="rmaint__free"><b>${plan.freeChanges.months} месеца безплатни разумни промени.</b> Включва ${esc(plan.freeChanges.what)}. Не включва ${esc(plan.freeChanges.excluded)}.</p>`
    : '';

  return `          <article class="rmaint${plan.featured ? ' rmaint--featured' : ''} reveal">
            <h4 class="rmaint__name">${esc(plan.name)}</h4>
            <p class="rmaint__price">${plan.price} ${esc(cur)}<small>/месец</small></p>
            <p class="rmaint__for">${esc(plan.forWhom)}</p>
${listBlock}
${free}
          </article>`;
}

/** Поддръжка след старта — отделно за сайт и за система. */
function restaurantMaintenanceHtml() {
  const cur = D.meta.currency;
  const site = D.maintenance.site.plans.map((x) => maintenanceCard(x, cur)).join('\n');
  const sys = D.maintenance.system.plans.map((x) => maintenanceCard(x, cur)).join('\n');

  return `        <div class="rmaint-block">
          <h3 class="rmaint__title">Ако имате сайт</h3>
          <p class="rmaint__intro">${esc(D.maintenance.site.intro)}</p>
          <div class="rmaint-grid">
${site}
          </div>
        </div>
        <div class="rmaint-block">
          <h3 class="rmaint__title">Ако имате система</h3>
          <p class="rmaint__intro">${esc(D.maintenance.system.intro)}</p>
          <div class="rmaint-grid">
${sys}
          </div>
        </div>
        <p class="rest-note">Поддръжката се предлага отделно от изработката и се заплаща месечно.</p>`;
}

/** Един общ списък — без разделяне по категории. */
/** Доказателството на рекламната страница за ресторанти.
    Чете се от bds-data.js — същият източник, който храни case study-то,
    за да не се разминат двете, ако проектът се обнови. */
function restaurantProofHtml() {
  const p = D.getProject(RESTAURANT_PROOF_SLUG);
  if (!p || !p.localReady) {
    return `          <p class="evidence-note">Проектът „${RESTAURANT_PROOF_SLUG}“ не е готов за показване.</p>`;
  }

  const media = p.hero
    ? `<img src="${esc(p.hero)}" alt="${esc(p.heroAlt)}" loading="lazy" decoding="async" />`
    : "";

  const facts = (p.verified || [])
    .slice(0, 5)
    .map((f) => `                <li><span>${esc(f.label)}</span><b>${esc(f.value)}</b></li>`)
    .join("\n");

  /* Честният статус на проекта се пренася както е записан — рекламна
     страница не е причина да се твърди повече, отколкото е вярно. */
  const note = p.statusNote
    ? `              <p class="rest-proof__note">${esc(p.statusNote)}</p>`
    : "";

  const link = D.caseLinkAllowed(p)
    ? `<a href="${esc(p.page)}" class="btn btn--outline" data-track="cta_proof_case">Виж пълния case study <span class="btn__arrow">&rarr;</span></a>`
    : `<a href="contact.html" class="btn btn--outline" data-track="cta_proof_contact">Заяви консултация</a>`;

  return `        <article class="rest-proof reveal">
          <div class="rest-proof__media">${media}</div>
          <div class="rest-proof__body">
            <span class="rest-proof__industry">${esc(p.industry)}</span>
            <h3 class="rest-proof__name">${esc(p.name)}</h3>
            <p class="rest-proof__summary">${esc(p.summary)}</p>
            <span class="rest-proof__label">Проверими данни</span>
            <ul class="rest-proof__facts">
${facts}
            </ul>
${note}
            <div class="rest-proof__foot">${link}</div>
          </div>
        </article>`;
}

function projectsListHtml() {
  const list = D.publicProjects();
  if (!list.length) return '          <p class="evidence-note">Няма проекти, готови за публикуване.</p>';
  return `        <div class="projects-list">
${list.map(projectRow).join('\n')}
        </div>`;
}

/* ---------- 4. Case study страници ---------- */

function caseHead(p) {
  const title = `${p.name} — case study | Bulgaria Digital Services`;
  const desc = p.summary.slice(0, 155);
  const url = `${SITE_URL}/${p.page}`;
  const og = p.hero ? `${SITE_URL}/${p.hero}` : `${SITE_URL}/assets/img/bds-og.png`;
  /* Без потвърдено разрешение страницата е подготвена, но скрита:
     noindex пази срещу индексиране, ако попадне онлайн по погрешка. */
  const robots = D.caseLinkAllowed(p)
    ? ''
    : '\n  <meta name="robots" content="noindex, nofollow" />' +
      '\n  <!-- ПОДГОТВЕНА, НО СКРИТА: няма потвърдено разрешение от клиента.' +
      '\n       Виж 02-CASE-STUDIES/publication-permission-register.md -->';
  return `<!DOCTYPE html>
<html lang="bg">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(desc)}" />${robots}
  <meta name="theme-color" content="#08080a" />
  <link rel="canonical" href="${esc(url)}" />
  <meta property="og:type" content="article" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(desc)}" />
  <meta property="og:image" content="${esc(og)}" />
  <meta property="og:url" content="${esc(url)}" />
  <meta property="og:locale" content="bg_BG" />
  <meta name="twitter:card" content="summary_large_image" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
  <link rel="icon" type="image/png" href="assets/img/bds-favicon.png" />
  <link rel="apple-touch-icon" href="assets/img/bds-favicon.png" />
  <link rel="stylesheet" href="assets/css/style.css" />
  <link rel="stylesheet" href="assets/css/offer.css" />
</head>`;
}

function caseStep(label, title, bodyHtml) {
  return `        <section class="cs-step reveal">
          <p class="cs-step__label">${esc(label)}</p>
          <div class="cs-step__body">
            <h2>${esc(title)}</h2>
${bodyHtml}
          </div>
        </section>`;
}

function casePage(p) {
  const catCls = p.category === 'system' ? 'system' : 'site';
  const catLabel = p.category === 'system' ? 'Дигитална бизнес система' : 'Професионален бизнес сайт';

  const shot = p.hero
    ? `          <div class="cs-hero__shot reveal" data-delay="2"><img src="${esc(p.hero)}" alt="${esc(p.heroAlt)}" /></div>`
    : `          <div class="evidence-note reveal" data-delay="2">Реални екранни снимки от този проект още не са одобрени за публикуване. Виж missing-materials документа.</div>`;

  const goals = (p.goals || []).length
    ? `            <ul class="cs-list">\n            ${li(p.goals)}\n            </ul>`
    : '';

  const built = (p.built || []).length
    ? `            <ul class="cs-list">\n            ${li(p.built)}\n            </ul>`
    : '';

  const facts = (p.verified || []).length
    ? `            <div class="cs-facts">
${p.verified.map((f) => `              <dl class="cs-fact"><dt>${esc(f.label)}</dt><dd>${esc(f.value)}</dd></dl>`).join('\n')}
            </div>`
    : '';

  const caps = (p.capabilities || []).length
    ? `            <p><b>Какво вече може бизнесът:</b></p>
            <ul class="cs-list">\n            ${li(p.capabilities)}\n            </ul>`
    : '';

  const tech = (p.technical || []).length
    ? `            <p><b>Техническа валидация:</b></p>
            <ul class="cs-list">\n            ${li(p.technical)}\n            </ul>`
    : '';

  const status = p.statusNote
    ? `        <div class="cs-status reveal">
          <p class="cs-status__title">Точен статус на проекта</p>
          <p>${esc(p.statusNote)}</p>
        </div>`
    : '';

  const related = (p.relatedProjects || [])
    .map((slug) => D.getProject(slug))
    .filter((r) => D.caseLinkAllowed(r));

  /* Проект от ресторантския сектор води и към специализираната страница —
     тя е следващата логична стъпка точно за такъв читател. */
  const restaurantCard = p.slug === RESTAURANT_PROOF_SLUG
    ? `
          <a href="/restaurants" class="cs-next__card" data-track="link_to_restaurants">
            <span class="cs-next__kicker">За ресторанти</span>
            <span class="cs-next__title">Сайтове и системи за заведения</span>
            <span class="cs-card__summary">Онлайн поръчки, меню, което екипът движи сам, и път на поръчката до кухнята.</span>
          </a>`
    : '';

  const nextCards =
    `          <a href="${esc(p.cta.href)}" class="cs-next__card">
            <span class="cs-next__kicker">Следваща стъпка</span>
            <span class="cs-next__title">${esc(p.cta.label)}</span>
            <span class="cs-card__summary">${p.relatedService === 'system'
              ? 'Проектът ви управлява данни и процес? Офертира се индивидуално, след анализ на работния поток.'
              : 'Проектът ви представя бизнеса? Вижте кой от трите пакета отговаря на нуждата ви.'}</span>
          </a>` +
    (related.length
      ? `\n          <a href="${esc(related[0].page)}" class="cs-next__card">
            <span class="cs-next__kicker">Свързан проект</span>
            <span class="cs-next__title">${esc(related[0].name)}</span>
            <span class="cs-card__summary">${esc(related[0].summary.slice(0, 120))}…</span>
          </a>`
      : `\n          <a href="projects.html" class="cs-next__card">
            <span class="cs-next__kicker">Още проекти</span>
            <span class="cs-next__title">Всички реални проекти</span>
            <span class="cs-card__summary">Разгледайте останалите системи и сайтове, изградени от Bulgaria Digital Services.</span>
          </a>`) + restaurantCard;

  const live = p.liveUrl
    ? `            <div><dt>Проектът на живо</dt><dd><a href="${esc(p.liveUrl)}" target="_blank" rel="noopener">Отвори ↗</a></dd></div>`
    : '';

  return `${caseHead(p)}
<body data-page="projects">
  <div class="bg-aurora" aria-hidden="true"></div>
  <div class="bg-grid" aria-hidden="true"></div>
  <div id="site-header"></div>

  <main>
    <section class="cs-hero">
      <div class="page-hero__glow" aria-hidden="true"></div>
      <div class="container">
        <nav class="breadcrumb" style="justify-content:flex-start"><a href="index.html">Начало</a> / <a href="projects.html">Проекти</a> / <span>${esc(p.name)}</span></nav>
        <div class="cs-hero__inner">
          <div class="reveal">
            <span class="cs-hero__cat cs-hero__cat--${catCls}">${esc(catLabel)}</span>
            <h1>${esc(p.name)}</h1>
            <p class="cs-hero__summary">${esc(p.summary)}</p>
            <dl class="cs-hero__meta">
              <div><dt>Клиент</dt><dd>${esc(p.client)}</dd></div>
              <div><dt>Индустрия</dt><dd>${esc(p.industry)}</dd></div>
              <div><dt>Категория</dt><dd>${esc(catLabel)}</dd></div>
${live}
            </dl>
          </div>
${shot}
        </div>
      </div>
    </section>

    <section class="section section--tight-top">
      <div class="container">
        <div class="cs-narrative">
${caseStep('01 · Проблем', 'С какво е започнало', `            <p>${esc(p.problem)}</p>${goals ? `\n            <p><b>Целите на проекта:</b></p>\n${goals}` : ''}`)}

${caseStep('02 · Решение', 'Какво предложихме', `            <p>${esc(p.solution)}</p>`)}

${caseStep('03 · Изпълнение', 'Какво конкретно е изградено', built)}

${caseStep('04 · Трудната част', 'Кое беше сложното и как е решено', `            <p>${esc(p.hardPart)}</p>\n            <p>${esc(p.resolution)}</p>`)}

${caseStep('05 · Резултат', 'Проверими резултати', `${facts}\n${caps}\n${tech}`)}
        </div>

${status}

        <div class="cs-stack">
${p.stack.map((s) => `          <span>${esc(s)}</span>`).join('\n')}
        </div>
      </div>
    </section>

    <section class="section section--alt">
      <div class="container">
        <div class="section__head reveal">
          <span class="eyebrow">Накъде оттук</span>
          <h2 class="section__title">Подобен проект за вашия бизнес</h2>
        </div>
        <div class="cs-next">
${nextCards}
        </div>
      </div>
    </section>
  </main>

  <div id="site-footer"></div>
  <script src="assets/js/bds-data.js" defer></script>
  <script src="assets/js/app.js" defer></script>
</body>
</html>
`;
}

/* ---------- 5. Print страница за PDF ---------- */
function printPage() {
  const pkgBlocks = D.packages
    .map((p) => {
      const price = D.priceLabel(p);
      const limits = D.visibleLimits(p);
      return `      <section class="p-pkg">
        <header class="p-pkg__head">
          <h3>${esc(p.name)}</h3>
          <span class="p-pkg__price">${price ? esc(price) : 'по оферта'}</span>
        </header>
        <p class="p-pkg__pos">${esc(p.positioning)}</p>
        <div class="p-cols">
          <div>
            <h4>Кога е правилният избор</h4>
            <p>${esc(p.forWhom)}</p>
            <p><b>Решава:</b> ${esc(p.problem)}</p>
            <p><b>Цели:</b> ${esc(p.outcome)}</p>
          </div>
          <div>
            <h4>Измерими лимити</h4>
            <ul>${limits.map((l) => `<li>${esc(l.label)}: <b>${esc(l.value)}</b></li>`).join('')}</ul>
            <h4>Не включва</h4>
            <ul>${p.excludes.slice(0, 5).map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
          </div>
        </div>
      </section>`;
    })
    .join('\n');

  /* По стабилен `key`, не по надпис — надписите се различават между
     пакетите, а сравнението трябва да сравнява едно и също нещо.
     Липсващ ключ е грешка в данните, не тихо „—“. */
  function byKey(p, key) {
    const l = p.limits.find((x) => x.key === key);
    if (!l) throw new Error(`Пакет ${p.id}: липсва лимит с key "${key}" (печатна таблица)`);
    return l.value === null ? '—' : l.value;
  }

  const pick = (p, start, business, premium) =>
    p.id === 'start' ? start : p.id === 'business' ? business : p.id === 'premium' ? premium : '—';

  const cmpRows = [
    ['Цена за изработка', (p) => D.priceLabel(p)],
    ['Основни страници', (p) => byKey(p, 'pages')],
    ['Индивидуални секции', (p) => byKey(p, 'sections')],
    ['Езици', (p) => byKey(p, 'languages')],
    ['Контактни форми', (p) => byKey(p, 'forms')],
    ['Кръгове корекции', (p) => byKey(p, 'revisions')],
    ['Галерия / портфолио', (p) => pick(p, '—', 'включено', 'разширена')],
    ['Analytics и tracking', (p) => pick(p, '—', 'включено', 'включено')],
    ['CMS за съдържанието', (p) => pick(p, '—', 'частичен', 'включено')],
    ['Blog / News', (p) => pick(p, '—', '—', 'включено')],
    ['Meta Pixel', (p) => pick(p, '—', '—', 'включено')],
    ['Онлайн поръчки и плащания', () => '—']
  ]
    .map(
      ([label, fn]) =>
        `          <tr><th>${esc(label)}</th>${D.packages.map((p) => `<td>${esc(fn(p))}</td>`).join('')}</tr>`
    )
    .join('\n');

  return `<!DOCTYPE html>
<html lang="bg">
<head>
<meta charset="UTF-8" />
<title>Кой BDS пакет е подходящ за моя бизнес?</title>
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
<style>
  /* Sora няма кирилски глифове — затова навсякъде има изричен
     fallback стек. Без него част от текста пада в serif. */
  :root {
    --head: 'Sora', 'Segoe UI', system-ui, -apple-system, sans-serif;
    --body: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif;
  }
  @page { size: A4; margin: 14mm 14mm 16mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: var(--body); color: #16161b; font-size: 9.4pt; line-height: 1.5; background: #fff; }
  h1, h2, h3, h4 { font-family: var(--head); color: #0d0d10; }
  a { color: #0b4fd0; text-decoration: none; }

  .p-cover { border-top: 5px solid #0b4fd0; padding-top: 8mm; margin-bottom: 7mm; }
  .p-brand { font-family: var(--head); font-weight: 800; letter-spacing: .18em; font-size: 10pt; color: #0b4fd0; text-transform: uppercase; }
  .p-cover h1 { font-size: 21pt; line-height: 1.15; margin-top: 3mm; letter-spacing: -0.02em; }
  .p-cover p { color: #4a4a52; margin-top: 3mm; max-width: 150mm; }

  .p-rule { background: #eef4fd; border: 1px solid #c3d8fb; border-radius: 3mm; padding: 4mm 5mm; margin: 5mm 0 7mm; text-align: center; }
  .p-note { border-left: 1mm solid #1e7bff; background: #f5f9ff; padding: 3.5mm 5mm; margin: 0 0 7mm; font-size: 8.6pt; line-height: 1.55; color: #4a4a4a; }
  .p-note b { color: #1a1a1a; }
  .p-rule b { font-family: var(--head); font-size: 11pt; color: #083aa0; }

  h2.p-h { font-size: 13pt; margin: 0 0 4mm; padding-bottom: 2mm; border-bottom: 1.5px solid #0b4fd0; }

  .p-two { display: grid; grid-template-columns: 1fr 1fr; gap: 6mm; margin-bottom: 6mm; }
  .p-box { border: 1px solid #ddd; border-radius: 3mm; padding: 4mm 5mm; }
  .p-box h3 { font-size: 10.5pt; margin-bottom: 2mm; }
  .p-box .kick { font-size: 7.6pt; letter-spacing: .12em; text-transform: uppercase; color: #0b4fd0; font-family: var(--head); font-weight: 600; }
  .p-box ul { margin: 2mm 0 0 4mm; }
  .p-box li { margin-bottom: 1mm; color: #45454d; }

  .p-pkg { border: 1px solid #ddd; border-radius: 3mm; padding: 4mm 5mm; margin-bottom: 5mm; page-break-inside: avoid; break-inside: avoid; }
  .p-pkg__head { display: flex; justify-content: space-between; align-items: baseline; gap: 4mm; border-bottom: 1px solid #eee; padding-bottom: 2mm; margin-bottom: 2mm; }
  .p-pkg__head h3 { font-size: 12pt; letter-spacing: -0.01em; }
  .p-pkg__price { font-family: var(--head); font-weight: 700; color: #0b4fd0; font-size: 11pt; white-space: nowrap; }
  .p-pkg__pos { color: #45454d; margin-bottom: 3mm; }
  .p-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 6mm; }
  .p-cols h4 { font-size: 8.4pt; letter-spacing: .1em; text-transform: uppercase; color: #6b6b74; margin: 0 0 1.5mm; }
  .p-cols h4 + h4 { margin-top: 3mm; }
  .p-cols p { margin-bottom: 2mm; color: #45454d; }
  .p-cols ul { margin: 0 0 0 4mm; }
  .p-cols li { margin-bottom: 1mm; color: #45454d; }

  table.p-cmp { width: 100%; border-collapse: collapse; margin-bottom: 6mm; page-break-inside: avoid; break-inside: avoid; }
  table.p-cmp th, table.p-cmp td { border: 1px solid #ddd; padding: 2mm 3mm; text-align: left; font-size: 8.8pt; }
  table.p-cmp thead th { background: #eef4fd; font-family: var(--head); font-size: 8.4pt; letter-spacing: .08em; text-transform: uppercase; color: #083aa0; }
  table.p-cmp tbody th { font-weight: 500; color: #45454d; width: 34%; }

  .p-next { border-left: 3px solid #0b4fd0; background: #f3f6fc; padding: 4mm 5mm; border-radius: 0 3mm 3mm 0; page-break-inside: avoid; }
  .p-next h3 { font-size: 11pt; margin-bottom: 2mm; }
  .p-next ol { margin: 2mm 0 0 5mm; }
  .p-next li { margin-bottom: 1.5mm; color: #45454d; }

  .p-foot { margin-top: 7mm; padding-top: 3mm; border-top: 1px solid #ddd; display: flex; justify-content: space-between; gap: 5mm; font-size: 8.4pt; color: #6b6b74; }
  .p-foot b { color: #16161b; }
  .p-break { page-break-before: always; break-before: page; }
</style>
</head>
<body>

  <div class="p-cover">
    <div class="p-brand">Bulgaria Digital Services</div>
    <h1>Кой BDS пакет е подходящ<br />за моя бизнес?</h1>
    <p>Кратко ръководство за 2 минути. Първо разбирате дали ви трябва сайт или система, после кой от трите пакета отговаря на нуждата ви — и кога стандартен пакет вече не стига.</p>
  </div>

${D.meta.packagesStatus === 'PROVISIONAL'
  ? `
  <div class="p-note" data-bds-packages-note>
    <b>Ориентировъчни пакети.</b> ${esc(D.meta.packagesNote)}
  </div>`
  : ''}

  <h2 class="p-h">1. Първо: сайт или система?</h2>
  <div class="p-two">
${D.categories
  .map(
    (c) => `    <div class="p-box">
      <span class="kick">${esc(c.short)}</span>
      <h3>${esc(c.name)}</h3>
      <p style="color:#45454d">${esc(c.lead)}</p>
      <ul>${c.does.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
    </div>`
  )
  .join('\n')}
  </div>
  <p style="color:#45454d;margin-bottom:6mm"><b>Правилото на практика:</b> ако решението съхранява данни и управлява работен процес след първоначалното запитване — профили, поръчки, плащания, роли, статуси или одобрения — това е дигитална бизнес система и се офертира индивидуално, а не по пакет.</p>

  <div class="p-break"></div>
  <h2 class="p-h">2. Трите пакета за професионални бизнес сайтове</h2>
${pkgBlocks}

  <div class="p-break"></div>
  <h2 class="p-h">3. Кратко сравнение</h2>
  <table class="p-cmp">
    <thead><tr><th>Какво сравняваме</th>${D.packages.map((p) => `<th>${esc(p.shortName)}</th>`).join('')}</tr></thead>
    <tbody>
${cmpRows}
    </tbody>
  </table>
  <p style="color:#6b6b74;font-size:8.4pt;margin-bottom:6mm">„—“ означава, че услугата не е включена в пакета. Броят ревизии и лимитите по съдържание се фиксират писмено в персоналната оферта. Ориентировъчен срок за пакетите: ${esc(D.meta.timelineGeneral)}.</p>

  <h2 class="p-h">4. Кога стандартен пакет НЕ е достатъчен</h2>
  <div class="p-box" style="margin-bottom:6mm">
    <p style="color:#45454d;margin-bottom:2mm">Ако поне едно от изброените важи за вашия проект, той излиза извън START, BUSINESS и PREMIUM и се офертира като дигитална бизнес система:</p>
    <ul style="columns:2;column-gap:6mm">${D.systemTriggers.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
  </div>

  <h2 class="p-h">5. Следваща стъпка</h2>
  <div class="p-next">
    <h3>Безплатна консултация</h3>
    <ol>
      <li>Разказвате накратко какъв е бизнесът и какъв проблем трябва да бъде решен.</li>
      <li>Заедно определяме дали проектът е сайт или система.</li>
      <li>Получавате персонална оферта с точен обхват, лимити, срок и цена.</li>
      <li>Обхватът се одобрява писмено, преди работата да започне.</li>
    </ol>
  </div>

  <div class="p-foot">
    <div><b>${esc(D.meta.contact.name)}</b> · Bulgaria Digital Services<br />${esc(D.meta.contact.email)} · ${esc(D.meta.contact.phone)}</div>
    <div style="text-align:right">Документът отразява актуалните пакети към<br />датата на изпращане. Цените са в ${esc(D.meta.currency)} без включени third-party разходи.</div>
  </div>

</body>
</html>
`;
}

/** Featured case studies за началната страница. */
function featuredHtml() {
  const list = D.publicProjects(null, 'main');
  return `        <div class="cs-grid">
${list.map(projectCard).join('\n')}
        </div>`;
}

/* ---------- 6. Изпълнение ---------- */
patchRegion('index.html', 'featured', featuredHtml());

patchRegion('services.html', 'categories', categoriesHtml());
patchRegion('services.html', 'decider', deciderHtml());
patchRegion('services.html', 'packages', packagesHtml());
patchRegion('services.html', 'addons', addonsHtml());

patchRegion('packages.html', 'categories', categoriesHtml());
patchRegion('packages.html', 'decider', deciderHtml());
patchRegion('packages.html', 'comparison', comparisonHtml());

patchRegion('projects.html', 'all', projectsListHtml());
patchRegion('restaurants.html', 'restaurant-case', restaurantCaseHtml());
patchRegion('restaurants.html', 'restaurant-trust', restaurantTrustHtml());
patchRegion('restaurants.html', 'restaurant-packages', restaurantPackagesHtml());
patchRegion('restaurants.html', 'restaurant-system', restaurantSystemHtml());
patchRegion('restaurants.html', 'restaurant-maintenance', restaurantMaintenanceHtml());

for (const p of D.projects) {
  if (p.status === 'main' && p.page) write(p.page, casePage(p));
}

write('print/packages-print.html', printPage());

/* ---------- 7. Sitemap ----------
   Генерира се от данните, за да не се разминава с тях.
   Влизат САМО страници с publicationApproved: true. */
function sitemapXml() {
  const staticPages = [
    { loc: '', freq: 'monthly', pri: '1.0' },
    { loc: 'services.html', freq: 'monthly', pri: '0.9' },
    { loc: 'packages.html', freq: 'monthly', pri: '0.9' },
    { loc: 'projects.html', freq: 'monthly', pri: '0.9' },
    { loc: 'process.html', freq: 'monthly', pri: '0.7' },
    { loc: 'about.html', freq: 'monthly', pri: '0.7' },
    { loc: 'contact.html', freq: 'monthly', pri: '0.8' },
    /* Рекламна landing страница — индексируема, но с по-нисък приоритет
       от основните секции на сайта. */
    /* Рекламният адрес е чистият /restaurants — canonical, sitemap и
       рекламите сочат него. /restaurants.html се пренасочва към него в _redirects. */
    { loc: 'restaurants', freq: 'monthly', pri: '0.8' }
  ];
  const casePages = D.approvedForPublication(null, 'main')
    .filter((p) => p.page)
    .map((p) => ({ loc: p.page, freq: 'monthly', pri: '0.8' }));

  const notApproved = D.projects.filter((p) => p.publicationApproved !== true);
  const blockedNote = notApproved.length
    ? `\n  <!-- Извън sitemap (няма разрешение за публикуване): ${notApproved.map((p) => p.page || p.slug).join(', ')} -->`
    : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${blockedNote}
${[...staticPages, ...casePages].map((u) => `  <url>
    <loc>${SITE_URL}/${u.loc}</loc>
    <changefreq>${u.freq}</changefreq>
    <priority>${u.pri}</priority>
  </url>`).join('\n')}
</urlset>
`;
}

write('sitemap.xml', sitemapXml());

/* robots.txt се генерира от същите данни като sitemap-а, за да не
   се разминават. Disallow се пише само за проекти без разрешение. */
function robotsTxt() {
  const notApproved = D.projects
    .filter((p) => p.publicationApproved !== true && p.page)
    .map((p) => `Disallow: /${p.page}`);
  return `User-agent: *
Allow: /

# Изходниците за PDF не са предназначени за индексиране.
Disallow: /print/

# Проекти без разрешение за публикуване (publicationApproved: false).
# Не се линкват отникъде и не са в sitemap.xml.
${notApproved.join('\n')}

Sitemap: ${SITE_URL}/sitemap.xml
`;
}

write('robots.txt', robotsTxt());

console.log('Генерирани / обновени файлове:');
for (const f of written) console.log('  ✔ ' + f);
/* „Публичен“ = publicationApproved: true. localReady НЕ е публичен. */
console.log(`\nПакети: ${D.packages.length} · Add-ons: ${D.addons.length}`);
console.log(
  `Проекти: ${D.projects.length} общо · ` +
  `${D.publicProjects().length} готови локално · ` +
  `${D.approvedForPublication().length} РАЗРЕШЕНИ за публикуване`
);
const blocked = D.projects.filter((p) => p.publicationApproved !== true);
if (blocked.length) {
  console.log(`  ↳ без разрешение (не се линкват, не са в sitemap): ${blocked.map((p) => p.slug).join(', ')}`);
}
