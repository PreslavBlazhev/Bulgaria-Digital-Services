/* ============================================================
   BDS — проверки срещу ЖИВАТА таблица (Phase 18 · 20 · 17)
   ------------------------------------------------------------
   Стартиране:

     BDS_OPS_TOKEN=xxx node tools/test-live-ops.mjs
     BDS_OPS_TOKEN=xxx node tools/test-live-ops.mjs --token-arg xxx

   Няма нито един макет. Всяка проверка тук говори с истинската
   таблица BDS Operations през Web App-а и чете това, което наистина
   стои в клетките.

   Ключът се пази в Script Properties на скрипта, не в проекта.
   Показва се веднъж с showOpsToken() в редактора.

   Какво прави:

     1. проверява коя версия на кода е качена;
     2. пуска самопроверката вътре в таблицата (цялото пътуване
        New → Qualified → Proposal Sent → Won → приход);
     3. чете състоянието и проверява числата отвън, независимо от
        това какво твърди самопроверката;
     4. пуска преизчисляването втори и трети път и изисква същите
        числа;
     5. чисти и изисква следата да е изчезнала.

   Изход: 0 = всичко минава.
   ============================================================ */

import { loadLogic, reporter, read, near } from './lib/ops-test-kit.mjs';

const L = loadLogic();
const R = reporter('BDS — живата таблица');
const { G, check, blocked } = R;

const ENDPOINT = (() => {
  const m = /var CRM_ENDPOINT = '([^']*)'/.exec(read('assets/js/app.js'));
  return m ? m[1] : '';
})();

const TOKEN = (() => {
  const i = process.argv.indexOf('--token-arg');
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  return process.env.BDS_OPS_TOKEN || '';
})();

if (!ENDPOINT) {
  blocked('CRM endpoint', 'BLOCKED — CRM_ENDPOINT е празен в assets/js/app.js');
  R.summary();
  process.exit(1);
}
if (!TOKEN) {
  blocked('Служебен ключ',
    'BLOCKED — липсва BDS_OPS_TOKEN. В Apps Script пусни showOpsToken() и подай ключа.');
  R.summary();
  process.exit(1);
}

/** Apps Script понякога връща JSON-а увит в HTML страница (userContent
    wrapper). Не е грешка и не зависи от нас — просто трябва да се
    очаква и от двете страни. */
function unwrapJson(text) {
  const trimmed = text.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return JSON.parse(trimmed);

  const stripped = text
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');
  const start = stripped.indexOf('{');
  const end = stripped.lastIndexOf('}');
  if (start >= 0 && end > start) {
    const candidate = stripped.slice(start, end + 1)
      .replace(/&quot;/g, '"').replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&#39;/g, "'");
    return JSON.parse(candidate);
  }
  throw new Error('таблицата отговори с нещо, което не е JSON:\n' + text.slice(0, 400));
}

/** Една служебна команда към таблицата. */
async function ops(action, extra = {}) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, token: TOKEN, ...extra }),
    redirect: 'follow'
  });
  return unwrapJson(await res.text());
}

const mdRow = (state, campaignId) =>
  state.marketing.find(r => String(r['Campaign ID']) === String(campaignId));

/* ============================================================
   1. Коя версия е жива
   ============================================================ */
G('Качена версия');

let version = null;
try {
  const ping = await ops('ping');
  if (ping.error === 'forbidden') {
    blocked('Ключът е приет', 'ключът не съвпада с BDS_OPS_TOKEN в таблицата');
    R.summary();
    process.exit(1);
  }
  if (/ops disabled/.test(String(ping.error || ''))) {
    blocked('Служебните команди са включени', ping.error);
    R.summary();
    process.exit(1);
  }
  check('таблицата отговаря на служебна команда', ping.ok === true, JSON.stringify(ping));
  version = ping.version || {};
} catch (err) {
  check('таблицата отговаря на служебна команда', false, String(err));
  R.summary();
  process.exit(1);
}

check('формулите се пишат ред по ред (поправката от 28.08)',
  version.per_row_formulas === true);
check('преизчисляването има вариант без ключалка',
  version.lockfree_core === true);
check('самопроверката е качена', version.selftest === true);

if (!version.per_row_formulas || !version.selftest) {
  console.log('\n\x1b[33m  Качената версия е стара. Обнови файловете в Apps Script\n' +
    '  и направи нов Deploy, после пусни това пак.\x1b[0m');
  R.summary();
  process.exit(1);
}

/* ============================================================
   2. Изходно състояние — тракерът трябва да е чист
   ============================================================ */
G('Изходно състояние');

let before = await ops('state');
check('състоянието се чете', before.ok === true);

/* Следата от ARRAYFORMULA се чисти от setupBdsOperations(). Щом мога
   да я пусна отдалеч, няма причина да я искам от човек. */
if (before.counts.phantom_rows > 0) {
  console.log('\x1b[2m  ' + before.counts.phantom_rows +
    ' фантомни реда — пускам setupBdsOperations() и проверявам пак\x1b[0m');
  const fix = await ops('setup');
  check('пресглобяването на листовете минава', fix.ok === true, fix.error || '');
  before = await ops('state');
}
check('няма фантомни редове в Marketing Daily',
  before.counts.phantom_rows === 0,
  'зает до ред ' + before.counts.marketing_last_row +
  ', данни ' + before.counts.marketing);
/* Ред от предишен тест също се чисти отдалеч, вместо да се търси на ръка. */
if (before.leads.some(l => /^BDS-(QA|SELFTEST)-/.test(l.lead_id))) {
  console.log('\x1b[2m  има останали тестови заявки — чистя\x1b[0m');
  const cleaned = await ops('cleanup');
  check('изчистването минава', cleaned.ok === true, cleaned.message || cleaned.error);
  before = await ops('state');
}
check('няма останали тестови заявки',
  !before.leads.some(l => /^BDS-(QA|SELFTEST)-/.test(l.lead_id)),
  before.leads.map(l => l.lead_id).join(', ') || 'нула заявки');

const realLeads = before.leads.filter(l => !/^BDS-(QA|SELFTEST)-/.test(l.lead_id));
console.log('\n\x1b[2m  истински заявки: ' + realLeads.length +
  ' · маркетинг редове: ' + before.counts.marketing +
  ' · рекламни редове: ' + before.counts.raw_ads + '\x1b[0m');

/* ============================================================
   3. Пълното пътуване, вътре в таблицата
   ============================================================ */
G('QA пътуване през живата таблица');

const run = await ops('selftest');
check('самопроверката се изпълнява', run.ok === true, run.error || '');
const report = String(run.report || '');
if (report) {
  console.log('\n\x1b[2m' + report.split('\n').map(l => '  │ ' + l).join('\n') + '\x1b[0m\n');
}
const failLines = report.split('\n').filter(l => /^\s*FAIL/.test(l));
check('нито една проверка в таблицата не се проваля',
  failLines.length === 0, failLines.join(' · '));
check('самопроверката стига до края',
  /ВСИЧКО МИНАВА|ПРОВАЛА/.test(report));

/* Всяка стъпка от заданието — потвърдена поотделно в текста на отчета. */
const step = (label, needle) =>
  check(label, new RegExp('ok\\s+' + needle).test(report), needle);

G('Phase 18 — показателите в живите клетки');
step('показванията и кликовете влизат', 'показванията и кликовете влизат');
step('CTR се смята в клетката', 'CTR = 96 / 2400 = 4%');
step('CPC се смята в клетката', 'CPC = 36 / 96 = 0.375');
step('CPL се смята в клетката', 'CPL = 36 / 1 = 36');
step('липсващ показател е празен, не нула', 'празните показатели са празни, не нули');
step('Marketing Contribution е отрицателен преди приход', 'принос = −36');

G('Phase 20 — пътуването');
step('Status = New при пристигане', 'Status = New');
step('Lead Owner е попълнен', 'Lead Owner = Преслав Блажев');
step('Next Action е попълнено', 'Next Action = Първо обаждане');
step('Qualified не прави клиент', 'Qualified не прави клиент');
step('номерът на офертата се издава сам', 'номерът се издава сам');
step('валидността е +14 календарни дни', 'валидността е \\+14');
step('Won слага Client = Да', 'Client = Да');
step('Close Date се попълва', 'Close Date се попълва сама');
step('приходът стига до Marketing Daily', 'Revenue = 450');
step('клиентите се увеличават', 'Clients = 1');
step('CAC се преизчислява', 'CAC = 36 / 1 = 36');
step('ROAS се преизчислява', 'ROAS = 450 / 36 = 12.5');
step('второто преизчисляване не удвоява', 'таблицата е буквално същата');
step('клиентите не стават 3', 'клиентите остават 1');
step('приходът не става 1350', 'приходът остава 450');
step('след изтриване приходът пада на 0', 'приходът пада на 0');
step('след изтриване клиентите падат на 0', 'клиентите падат на 0');
step('разходът остава непокътнат', 'разходът остава непокътнат');

/* ---- Phase 17: номерът, издаден от ЖИВАТА таблица ---- */
G('Phase 17 — офертата, издадена на живо');

const issued = /номерът се издава сам\s+\[([^\]]+)\]/.exec(report);
check('таблицата издаде номер на оферта', !!issued, issued ? issued[1] : 'не намерен в отчета');
if (issued) {
  const liveProposalId = issued[1].trim();
  check('форматът е BDS-PROP-ГГГГ-NNNN',
    L.bdsIsProposalId(liveProposalId), liveProposalId);
  check('номерът е за текущата година',
    liveProposalId.startsWith('BDS-PROP-' + new Date().getFullYear() + '-'), liveProposalId);
  check('номерът не съдържа лични данни', !/[а-яА-Я@]/.test(liveProposalId));
  process.env.__BDS_LIVE_PROPOSAL_ID = liveProposalId;
}
step('датата на офертата се слага сама', 'датата се слага сама');
step('валидността е +14 календарни дни', 'валидността е \\+14');
step('липсваща стойност на офертата се маркира', 'Health иска стойност на офертата');
step('след попълване Health е чиста', 'след попълване Health е чиста');

/* ============================================================
   4. Проверка отвън — не вярваме на отчета за думите му
   ============================================================ */
G('Проверка отвън, след теста');

const after = await ops('state');
check('таблицата е чиста от тестови заявки',
  !after.leads.some(l => /^BDS-(QA|SELFTEST)-/.test(l.lead_id)),
  after.leads.map(l => l.lead_id).join(', ') || 'нула');
check('маркетинговите редове са колкото преди',
  after.counts.marketing === before.counts.marketing,
  after.counts.marketing + ' спрямо ' + before.counts.marketing);
check('рекламните редове са колкото преди',
  after.counts.raw_ads === before.counts.raw_ads);
check('не са се появили фантомни редове', after.counts.phantom_rows === 0);
check('истинските заявки са непокътнати',
  after.leads.filter(l => !/^BDS-(QA|SELFTEST)-/.test(l.lead_id)).length === realLeads.length);

/* ============================================================
   5. Идемпотентност — още два пъти, отвън
   ============================================================ */
G('Преизчисляване отвън — два пъти подред');

const r1 = await ops('rebuild');
check('първото преизчисляване минава', r1.ok === true, r1.message || r1.error);
const snapshot1 = JSON.stringify(r1.state.marketing);

const r2 = await ops('rebuild');
check('второто преизчисляване минава', r2.ok === true, r2.message || r2.error);
check('таблицата е буквално същата след второто пускане',
  JSON.stringify(r2.state.marketing) === snapshot1);
check('броят редове не расте',
  r2.state.counts.marketing === r1.state.counts.marketing,
  r1.state.counts.marketing + ' → ' + r2.state.counts.marketing);

/* ============================================================
   6. Формулите в клетките смятат същото като кода
   ============================================================ */
G('Клетката и кодът смятат едно и също');

const rows = r2.state.marketing;
if (rows.length === 0) {
  console.log('\x1b[2m  няма редове за сверяване — тракерът е празен, което е вярното\n' +
    '  състояние преди първата реклама\x1b[0m');
  check('празен тракер е допустимо състояние', true);
} else {
  let mismatches = [];
  for (const row of rows) {
    const expect = {
      CTR: L.bdsCtr(row.Clicks, row.Impressions),
      CPC: L.bdsCpc(row.Spend, row.Clicks),
      CPL: L.bdsCpl(row.Spend, row.Leads),
      CAC: L.bdsCac(row.Spend, row.Clients),
      ROAS: L.bdsRoas(row.Revenue, row.Spend),
      'Marketing Contribution': L.bdsMarketingContribution(row.Revenue, row.Spend)
    };
    for (const [key, want] of Object.entries(expect)) {
      const got = row[key];
      const same = want === ''
        ? (got === '' || got === null)
        : near(Number(got), Number(want), 1e-6);
      if (!same) mismatches.push(row.Date + '/' + row.Channel + ' ' + key +
        ': клетка=' + JSON.stringify(got) + ' код=' + JSON.stringify(want));
    }
  }
  check('всички изведени показатели съвпадат с кода',
    mismatches.length === 0, mismatches.slice(0, 4).join(' · '));
}

/* ============================================================
   7. Колоната Health на живо
   ============================================================ */
G('Health');

const h = await ops('health');
check('проверката на заявките минава', h.ok === true, h.message || h.error);
const stillOpen = after.leads.filter(l => l.health);
check('никоя истинска заявка не е забравена',
  stillOpen.length === 0,
  stillOpen.map(l => l.lead_id + ': ' + l.health).join(' · ') || 'няма');

console.log('');
process.exit(R.summary() ? 0 : 1);
