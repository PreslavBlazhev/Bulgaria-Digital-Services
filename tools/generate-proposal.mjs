/* ============================================================
   BDS — генератор на оферти (Phase 17)
   ------------------------------------------------------------
   Стартиране:

     node tools/generate-proposal.mjs --brief <file.json>
     node tools/generate-proposal.mjs --example        показва празен бриф
     node tools/generate-proposal.mjs --brief x.json --id BDS-PROP-2026-0007

   Изход: HTML файл в tools/out/, готов за печат в PDF
   (Ctrl+P → Save as PDF; форматирането е нагласено за A4).

   ------------------------------------------------------------
   Три правила, които генераторът налага, а не подсеща:

   1. ЦЕНАТА НЕ СЕ ИЗМИСЛЯ. При избран пакет цената идва от
      bds-data.js, който на свой ред идва от `PRICES AND PACKETS`.
      При система брифът задава цената изрично — иначе генераторът
      отказва да произведе оферта.

   2. ВАЛИДНОСТТА СЕ СМЯТА. Дата + 14 календарни дни. Същата
      функция, която ползва и CRM-ът (tools/crm/Logic.gs).

   3. НЯМА ОСТАНАЛИ ПЛЕЙСХОЛДЪРИ. Оферта с `[…]` в текста не
      излиза — програмата спира и казва кое поле липсва.
   ============================================================ */

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'tools', 'out');

/* ---------- данни ---------- */

function loadData() {
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'assets/js/bds-data.js'), 'utf8'), sandbox);
  if (!sandbox.window.BDS_DATA) throw new Error('bds-data.js не е дефинирал BDS_DATA');
  return sandbox.window.BDS_DATA;
}

function loadLogic() {
  const ctx = { console, Date, JSON, Math, RegExp, String, Number, isNaN, isFinite, parseFloat, parseInt };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'tools/crm/Logic.gs'), 'utf8'), ctx);
  return ctx;
}

export const D = loadData();
export const L = loadLogic();

/* ---------- бриф ---------- */

export const EXAMPLE_BRIEF = {
  leadId: 'BDS-2026-XXXXXX',
  date: '',
  client: { business: '', contact: '', phone: '', email: '' },
  project: '',
  currentSituation: '',
  objectives: [],
  solution: '',
  scope: { package: 'business' },
  scopeDetails: { pages: '', languages: '', forms: '', revisions: '' },
  included: [],
  notIncluded: ['thirdParty', 'adBudget', 'content'],
  deliverables: [],
  extras: [],
  maintenance: 'site-2',
  timelineDays: null,
  feedbackDays: 3,
  clientResponsibilities: [],
  nextStep: ''
};

/* Стандартните изключения. Брифът избира кои са приложими — списък с
   десет изключения при проект за 250 € плаши повече, отколкото пази. */
const NOT_INCLUDED = {
  thirdParty: 'Такси на трети страни — домейн, хостинг, платежен доставчик, SMS',
  adBudget: 'Бюджет за реклама',
  subscriptions: 'Абонаменти за външни услуги',
  content: 'Създаване на съдържание — текстове, фотография, видео',
  integrations: 'Интеграции, които не са изброени в обхвата',
  extraRevisions: 'Промени над договорените кръгове корекции'
};

const REQUIRED = [
  ['leadId', 'Lead ID от CRM'],
  ['client.business', 'име на заведението'],
  ['client.contact', 'лице за контакт'],
  ['project', 'едно изречение какво се изгражда'],
  ['currentSituation', 'какво има клиентът днес'],
  ['solution', 'как решението отговаря на проблема'],
  ['nextStep', 'следваща стъпка']
];

function get(obj, dotted) {
  return dotted.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
}

/* ---------- цена ---------- */

/** Единственото място, където се решава колко струва. */
export function resolvePricing(brief) {
  const scope = brief.scope || {};
  const items = [];

  if (scope.package) {
    const pkg = D.getPackage(scope.package);
    if (!pkg) throw new Error('Няма пакет „' + scope.package + '“. Позволени: start, business, premium.');
    if (typeof pkg.priceFrom !== 'number') {
      throw new Error('Пакет ' + pkg.shortName + ' няма одобрена цена в bds-data.js.');
    }
    items.push({ label: 'BDS ' + pkg.shortName + ' — изработка на сайт', price: pkg.priceFrom, source: 'PRICES AND PACKETS' });
  } else if (scope.systemClass) {
    if (typeof scope.price !== 'number') {
      throw new Error(
        'Система без цена. Класът задава диапазон, не цена — сложи "price" в scope ' +
        'с числото, което си потвърдил. Генераторът не измисля цени.'
      );
    }
    const cls = (D.systemPricing.classes || []).find(c => c.name === scope.systemClass);
    if (!cls) {
      throw new Error('Няма клас „' + scope.systemClass + '“. Позволени: ' +
        D.systemPricing.classes.map(c => c.name).join(', '));
    }
    const min = cls.from == null ? 0 : cls.from;
    const max = cls.to == null ? Infinity : cls.to;
    if (scope.price < min || scope.price > max) {
      throw new Error(
        'Цена ' + scope.price + ' € е извън класа „' + cls.name + '“ (' +
        (cls.from == null ? 'до ' + cls.to : cls.from + '–' + cls.to) + ' €). ' +
        'Или цената е сгрешена, или класът.'
      );
    }
    items.push({ label: scope.systemClass, price: scope.price, source: 'потвърден обхват' });
  } else {
    throw new Error('scope трябва да съдържа "package" или "systemClass".');
  }

  for (const extra of brief.extras || []) {
    if (typeof extra.price !== 'number') {
      throw new Error('Допълнение „' + extra.label + '“ е без цена. Без утвърдена цена не се пише число.');
    }
    items.push({ label: extra.label, price: extra.price, source: 'потвърден обхват' });
  }

  const total = items.reduce((s, i) => s + i.price, 0);
  return { items, total };
}

export function resolveMaintenance(brief) {
  const id = brief.maintenance;
  if (!id) return null;
  const all = [...D.maintenance.site.plans, ...D.maintenance.system.plans];
  const plan = all.find(p => p.id === id);
  if (!plan) throw new Error('Няма ниво поддръжка „' + id + '“. Позволени: ' + all.map(p => p.id).join(', '));
  return plan;
}

/* ---------- номер ---------- */

const REGISTRY = path.join(OUT_DIR, 'proposals.json');

function readRegistry() {
  if (!fs.existsSync(REGISTRY)) return [];
  try { return JSON.parse(fs.readFileSync(REGISTRY, 'utf8')); } catch { return []; }
}

/** CRM-ът е авторитетът за номерата. Ако не е подаден номер оттам,
    генераторът продължава редицата от собствения си регистър — така
    два теста подред не получават един и същи номер. */
export function issueProposalId(explicit, date) {
  const year = Number(L.bdsDateKey(date).slice(0, 4)) || new Date().getFullYear();
  if (explicit) {
    if (!L.bdsIsProposalId(explicit)) {
      throw new Error('Номерът „' + explicit + '“ не е във формат BDS-PROP-YYYY-XXXX.');
    }
    return explicit;
  }
  const known = readRegistry().map(r => r.proposalId);
  return L.bdsNextProposalId(known, year);
}

function recordProposal(entry) {
  const reg = readRegistry();
  if (!reg.some(r => r.proposalId === entry.proposalId)) reg.push(entry);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(REGISTRY, JSON.stringify(reg, null, 2) + '\n');
}

/* ---------- сглобяване ---------- */

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const money = (n) => new Intl.NumberFormat('bg-BG', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
  .format(n) + ' €';

const bgDate = (key) => {
  const p = String(key).split('-');
  return p.length === 3 ? `${p[2]}.${p[1]}.${p[0]}` : key;
};

export function buildProposal(brief, options = {}) {
  /* 1. Задължителните полета. */
  const missing = REQUIRED.filter(([p]) => !String(get(brief, p) || '').trim());
  if (missing.length) {
    throw new Error('Липсват полета:\n' + missing.map(([p, why]) => '  · ' + p + ' — ' + why).join('\n'));
  }

  const date = L.bdsDateKey(brief.date || new Date());
  const validity = L.bdsProposalValidity(date);
  const proposalId = issueProposalId(options.id || brief.proposalId, date);
  const pricing = resolvePricing(brief);
  const plan = resolveMaintenance(brief);
  const pkg = brief.scope && brief.scope.package ? D.getPackage(brief.scope.package) : null;
  const c = D.meta.contact;

  const limits = pkg ? D.visibleLimits(pkg) : [];
  const notIncluded = (brief.notIncluded || [])
    .map(k => NOT_INCLUDED[k] || k)
    .filter(Boolean);

  const section = (n, title, body) =>
    `  <section class="s">\n    <h2><span>${n}</span>${esc(title)}</h2>\n${body}\n  </section>`;
  const list = (items) => items && items.length
    ? '    <ul>\n' + items.map(i => '      <li>' + esc(i) + '</li>').join('\n') + '\n    </ul>'
    : '';

  const parts = [];

  parts.push(section(1, 'Клиент', `    <table class="kv">
      <tr><th>Заведение</th><td>${esc(brief.client.business)}</td></tr>
      <tr><th>Лице за контакт</th><td>${esc(brief.client.contact)}</td></tr>
      ${brief.client.phone ? `<tr><th>Телефон</th><td>${esc(brief.client.phone)}</td></tr>` : ''}
      ${brief.client.email ? `<tr><th>Имейл</th><td>${esc(brief.client.email)}</td></tr>` : ''}
    </table>`));

  parts.push(section(2, 'Проект', `    <p>${esc(brief.project)}</p>`));
  parts.push(section(3, 'Текуща ситуация', `    <p>${esc(brief.currentSituation)}</p>`));

  if (brief.objectives && brief.objectives.length) {
    parts.push(section(4, 'Цели', list(brief.objectives)));
  }
  parts.push(section(5, 'Предложено решение', `    <p>${esc(brief.solution)}</p>`));

  const scopeRows = [];
  if (pkg) {
    scopeRows.push(`      <tr><th>Пакет</th><td><b>BDS ${esc(pkg.shortName)}</b> — ${esc(D.priceLabel(pkg))}</td></tr>`);
    for (const l of limits) {
      scopeRows.push(`      <tr><th>${esc(l.label)}</th><td>${esc(l.value)}</td></tr>`);
    }
  } else {
    scopeRows.push(`      <tr><th>Клас</th><td><b>${esc(brief.scope.systemClass)}</b></td></tr>`);
  }
  const sd = brief.scopeDetails || {};
  for (const [key, label] of [['pages', 'Страници / модули'], ['languages', 'Езици'],
  ['forms', 'Форми'], ['revisions', 'Кръгове корекции']]) {
    if (sd[key]) scopeRows.push(`      <tr><th>${label} — за този проект</th><td>${esc(sd[key])}</td></tr>`);
  }
  parts.push(section(6, 'Обхват', '    <table class="kv">\n' + scopeRows.join('\n') + '\n    </table>'));

  if (brief.included && brief.included.length) {
    parts.push(section(7, 'Включено', list(brief.included)));
  }
  if (notIncluded.length) {
    parts.push(section(8, 'Не е включено', list(notIncluded)));
  }
  if (brief.deliverables && brief.deliverables.length) {
    parts.push(section(9, 'Какво получавате', list(brief.deliverables)));
  }

  const priceRows = pricing.items
    .map(i => `      <tr><td>${esc(i.label)}</td><td class="num">${money(i.price)}</td></tr>`)
    .join('\n');
  const maintRow = plan
    ? `    <h3>Поддръжка — месечно, по избор</h3>
    <table class="price">
      <tr><td>${esc(plan.name)} — ${esc(plan.forWhom)}</td><td class="num">${money(plan.price)}/месец</td></tr>
    </table>
    <p class="note">Изграждането и поддръжката са отделни. Поддръжката не е задължителна.</p>`
    : '';
  parts.push(section(10, 'Цена', `    <h3>Изграждане — еднократно</h3>
    <table class="price">
${priceRows}
      <tr class="total"><td>Общо</td><td class="num">${money(pricing.total)}</td></tr>
    </table>
${maintRow}`));

  parts.push(section(11, 'Условия за плащане', `    <div class="pay">
      <p><b>50%</b> при потвърждаване на офертата.</p>
      <p><b>50%</b> при предаване на готовия проект, преди прехвърляне на достъпите.</p>
    </div>
    <p class="note">Работата започва след получената предплата. Поддръжката се заплаща отделно, месечно и предварително.</p>`));

  const timeline = brief.timelineDays
    ? `    <p><b>${esc(brief.timelineDays)} работни дни</b> от:</p>
    <ul>
      <li>получаване на всички материали (текстове, снимки, лого, меню), и</li>
      <li>отговор на всеки кръг корекции в рамките на ${esc(brief.feedbackDays || 3)} работни дни.</li>
    </ul>
    <p class="note">Забавен материал измества крайната дата със същото време.</p>`
    : `    <p>Срокът се фиксира при потвърждаване на обхвата. Ориентировъчно: ${esc(D.meta.timelineGeneral)}.</p>`;
  parts.push(section(12, 'Срок', timeline));

  if (plan) {
    parts.push(section(13, 'Поддръжка след предаване', `${list(plan.includes)}
    <p class="note">Разумни промени включват текстове, снимки, цени, услуги, контакти, малки секции и корекции по съществуващи форми. Не включват цялостен redesign, нови големи функционалности или нови модули.</p>`));
  }

  if (brief.clientResponsibilities && brief.clientResponsibilities.length) {
    parts.push(section(14, 'Какво е нужно от вас', list(brief.clientResponsibilities)));
  }

  parts.push(section(15, 'Валидност', `    <p>Офертата важи <b>14 календарни дни</b> — до <b>${bgDate(validity)}</b>.</p>
    <p class="note">След тази дата цените и сроковете се потвърждават наново, с нов номер на офертата.</p>`));

  parts.push(section(16, 'Следваща стъпка', `    <p>${esc(brief.nextStep)}</p>`));

  const html = `<!DOCTYPE html>
<html lang="bg">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Оферта ${esc(proposalId)} — ${esc(brief.client.business)}</title>
<style>
  @page { size: A4; margin: 18mm 16mm; }
  :root { --ink:#111827; --muted:#6b7280; --line:#e5e7eb; --accent:#1f2937; }
  * { box-sizing: border-box; }
  body { margin:0; font:15px/1.6 -apple-system,"Segoe UI",Roboto,Arial,sans-serif; color:var(--ink); background:#f3f4f6; }
  .page { max-width: 820px; margin: 24px auto; background:#fff; padding: 48px 52px; box-shadow:0 1px 3px rgba(0,0,0,.1); }
  header { border-bottom:3px solid var(--accent); padding-bottom:20px; margin-bottom:28px; }
  .brand { font-size:13px; letter-spacing:.14em; text-transform:uppercase; color:var(--muted); }
  h1 { font-size:30px; margin:6px 0 4px; letter-spacing:-.01em; }
  .who { color:var(--muted); font-size:14px; }
  .meta { margin-top:22px; width:100%; border-collapse:collapse; font-size:14px; }
  .meta th { text-align:left; color:var(--muted); font-weight:500; padding:5px 14px 5px 0; width:150px; white-space:nowrap; }
  .meta td { padding:5px 0; font-variant-numeric:tabular-nums; }
  .s { margin: 0 0 26px; page-break-inside: avoid; }
  .s h2 { font-size:16px; margin:0 0 10px; padding-bottom:6px; border-bottom:1px solid var(--line); display:flex; gap:10px; align-items:baseline; }
  .s h2 span { color:var(--muted); font-weight:500; font-size:13px; min-width:20px; }
  .s p { margin:0 0 10px; }
  .s ul { margin:0 0 10px; padding-left:20px; }
  .s li { margin:3px 0; }
  table.kv { width:100%; border-collapse:collapse; }
  table.kv th { text-align:left; font-weight:500; color:var(--muted); padding:6px 14px 6px 0; width:200px; vertical-align:top; }
  table.kv td { padding:6px 0; border-bottom:1px solid var(--line); }
  table.price { width:100%; border-collapse:collapse; margin:8px 0 14px; }
  table.price td { padding:9px 0; border-bottom:1px solid var(--line); }
  table.price .num { text-align:right; font-variant-numeric:tabular-nums; white-space:nowrap; }
  table.price tr.total td { font-weight:700; font-size:17px; border-bottom:none; border-top:2px solid var(--accent); padding-top:12px; }
  h3 { font-size:14px; margin:16px 0 4px; color:var(--muted); text-transform:uppercase; letter-spacing:.06em; }
  .pay p { margin:2px 0; }
  .note { color:var(--muted); font-size:13.5px; }
  footer { margin-top:34px; padding-top:16px; border-top:1px solid var(--line); color:var(--muted); font-size:13px; display:flex; justify-content:space-between; gap:16px; flex-wrap:wrap; }
  @media print { body { background:#fff; } .page { box-shadow:none; margin:0; max-width:none; padding:0; } }
</style>
</head>
<body>
<div class="page">
  <header>
    <div class="brand">Bulgaria Digital Services</div>
    <h1>Оферта</h1>
    <div class="who">${esc(c.name)} · ${esc(c.email)} · ${esc(c.phone)}</div>
    <table class="meta">
      <tr><th>Оферта №</th><td><b>${esc(proposalId)}</b></td></tr>
      <tr><th>По заявка</th><td>${esc(brief.leadId)}</td></tr>
      <tr><th>Дата</th><td>${bgDate(date)}</td></tr>
      <tr><th>Валидна до</th><td><b>${bgDate(validity)}</b></td></tr>
    </table>
  </header>

${parts.join('\n\n')}

  <footer>
    <span>Bulgaria Digital Services · ${esc(c.name)}</span>
    <span>${esc(c.email)} · ${esc(c.phone)}</span>
  </footer>
</div>
</body>
</html>
`;

  /* 3. Никакви останали плейсхолдъри. */
  const leftovers = html.match(/\[[^\]]{0,40}…[^\]]{0,40}\]|\[\.\.\.\]|\[…\]|XXXX/g);
  if (leftovers && !options.allowPlaceholders) {
    throw new Error('В офертата има непопълнени места: ' + [...new Set(leftovers)].join(', '));
  }

  return {
    proposalId,
    leadId: brief.leadId,
    date,
    validity,
    value: pricing.total,
    maintenance: plan ? { id: plan.id, price: plan.price } : null,
    html
  };
}

/** Записва офертата и връща къде е. */
export function writeProposal(result) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const file = path.join(OUT_DIR, result.proposalId + '.html');
  fs.writeFileSync(file, result.html, 'utf8');
  recordProposal({
    proposalId: result.proposalId,
    leadId: result.leadId,
    date: result.date,
    validity: result.validity,
    value: result.value,
    file: path.relative(ROOT, file)
  });
  return file;
}

/* ---------- команден ред ---------- */

function cli() {
  const args = process.argv.slice(2);
  const flag = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };

  if (args.includes('--example')) {
    console.log(JSON.stringify(EXAMPLE_BRIEF, null, 2));
    console.log('\nПолетата notIncluded приемат: ' + Object.keys(NOT_INCLUDED).join(', '));
    console.log('scope: { "package": "start|business|premium" }  или');
    console.log('scope: { "systemClass": "' + D.systemPricing.classes[0].name + '", "price": 800 }');
    return 0;
  }

  const briefPath = flag('--brief');
  if (!briefPath) {
    console.error('Употреба: node tools/generate-proposal.mjs --brief <file.json> [--id BDS-PROP-YYYY-XXXX]');
    console.error('          node tools/generate-proposal.mjs --example');
    return 1;
  }
  const brief = JSON.parse(fs.readFileSync(briefPath, 'utf8'));
  let result;
  try {
    result = buildProposal(brief, { id: flag('--id') });
  } catch (err) {
    console.error('\x1b[31mОфертата не е произведена:\x1b[0m\n' + err.message);
    return 1;
  }
  const file = writeProposal(result);

  console.log('\x1b[32mГотово.\x1b[0m ' + path.relative(ROOT, file));
  console.log('');
  console.log('  Оферта №      ' + result.proposalId);
  console.log('  По заявка     ' + result.leadId);
  console.log('  Стойност      ' + money(result.value));
  console.log('  Дата          ' + bgDate(result.date));
  console.log('  Валидна до    ' + bgDate(result.validity) + '  (+14 календарни дни)');
  console.log('');
  console.log('  В CRM, на реда на заявката:');
  console.log('    Proposal ID        ' + result.proposalId);
  console.log('    Proposal Date      ' + bgDate(result.date));
  console.log('    Proposal Value     ' + result.value);
  console.log('    Proposal Validity  ' + bgDate(result.validity));
  console.log('    Status             Proposal Sent   ← чак СЛЕД като офертата е изпратена');
  console.log('');
  console.log('  PDF: отвори файла в браузър → Ctrl+P → Save as PDF.');
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(cli());
}
