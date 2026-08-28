/* ============================================================
   BDS — тест на офертния процес (Phase 17)
   ------------------------------------------------------------
   Стартиране:  node tools/test-proposal-workflow.mjs

   Проверява трите неща, които не бива да се доверяват на паметта:
   номерът, валидността и цената.

   Тестът НАИСТИНА произвежда оферта — с тестов клиент, ясно
   маркиран като такъв — проверява я и я изтрива след себе си.
   ============================================================ */

import fs from 'node:fs';
import path from 'node:path';
import { loadLogic, reporter, read, exists, ROOT } from './lib/ops-test-kit.mjs';
import { buildProposal, resolvePricing, issueProposalId, D, L as GenLogic } from './generate-proposal.mjs';

const L = loadLogic();
const R = reporter('BDS — офертен процес (Phase 17)');
const { G, check } = R;

/* ============================================================
   1. Номер на офертата
   ============================================================ */
G('Формат BDS-PROP-YYYY-XXXX');

check('първият номер за годината е 0001',
  L.bdsNextProposalId([], 2026) === 'BDS-PROP-2026-0001');
check('форматът съвпада', /^BDS-PROP-\d{4}-\d{4}$/.test(L.bdsNextProposalId([], 2026)));
check('следва последния', L.bdsNextProposalId(['BDS-PROP-2026-0007'], 2026) === 'BDS-PROP-2026-0008');
check('не се влияе от друга година',
  L.bdsNextProposalId(['BDS-PROP-2025-0099'], 2026) === 'BDS-PROP-2026-0001');
check('нова година започва от 0001',
  L.bdsNextProposalId(['BDS-PROP-2026-0042'], 2027) === 'BDS-PROP-2027-0001');
check('празнина в редицата НЕ се запълва — издаден номер не се преизползва',
  L.bdsNextProposalId(['BDS-PROP-2026-0001', 'BDS-PROP-2026-0005'], 2026) === 'BDS-PROP-2026-0006');
check('боклук в колоната не чупи броенето',
  L.bdsNextProposalId(['', 'не знам', 'BDS-PROP-2026-0003'], 2026) === 'BDS-PROP-2026-0004');
check('номерът не съдържа лични данни',
  !/[а-яА-Я@]/.test(L.bdsNextProposalId([], 2026)));

G('Уникалност');
{
  /* Симулация: издаваме сто номера подред, всеки път подавайки вече
     издадените. Нито един не бива да се повтори. */
  const issued = [];
  for (let i = 0; i < 100; i++) issued.push(L.bdsNextProposalId(issued, 2026));
  check('сто последователни номера са различни', new Set(issued).size === 100);
  check('последният е 0100', issued[99] === 'BDS-PROP-2026-0100');
}
check('невалиден номер се разпознава',
  !L.bdsIsProposalId('BDS-PROP-26-1') && !L.bdsIsProposalId('BDS-2026-A8HDG8'));
check('валиден номер се разпознава', L.bdsIsProposalId('BDS-PROP-2026-0001'));

/* ============================================================
   2. Валидност — 14 календарни дни
   ============================================================ */
G('Валидност +14 календарни дни');

check('28.08 → 11.09', L.bdsProposalValidity('2026-08-28') === '2026-09-11');
check('прескача края на месеца', L.bdsProposalValidity('2026-08-25') === '2026-09-08');
check('прескача края на годината', L.bdsProposalValidity('2026-12-28') === '2027-01-11');
check('високосна година', L.bdsProposalValidity('2028-02-20') === '2028-03-05');
check('календарни, не работни дни — точно 14',
  (new Date('2026-09-11') - new Date('2026-08-28')) / 86400000 === 14);
check('правилото е 14 в кода', L.BDS_PROPOSAL_VALIDITY_DAYS === 14);
check('без дата няма валидност', L.bdsProposalValidity('') === '');

/* ============================================================
   3. Цената идва от PRICES AND PACKETS
   ============================================================ */
G('Цена');

check('START = 250 €', resolvePricing({ scope: { package: 'start' } }).total === 250);
check('BUSINESS = 450 €', resolvePricing({ scope: { package: 'business' } }).total === 450);
check('PREMIUM = 600 €', resolvePricing({ scope: { package: 'premium' } }).total === 600);
check('цените идват от bds-data.js, не от теста',
  D.getPackage('business').priceFrom === 450);

{
  let threw = '';
  try { resolvePricing({ scope: { package: 'мега' } }); } catch (e) { threw = e.message; }
  check('измислен пакет се отказва', /Няма пакет/.test(threw), threw);
}
{
  let threw = '';
  try { resolvePricing({ scope: { systemClass: 'Средна бизнес система' } }); } catch (e) { threw = e.message; }
  check('система без цена се отказва — генераторът не измисля число',
    /не измисля цени/.test(threw), threw);
}
{
  let threw = '';
  try { resolvePricing({ scope: { systemClass: 'Средна бизнес система', price: 300 } }); } catch (e) { threw = e.message; }
  check('цена извън класа се отказва', /извън класа/.test(threw), threw);
}
check('цена в класа се приема',
  resolvePricing({ scope: { systemClass: 'Средна бизнес система', price: 1800 } }).total === 1800);
{
  let threw = '';
  try {
    resolvePricing({ scope: { package: 'start' }, extras: [{ label: 'Меню' }] });
  } catch (e) { threw = e.message; }
  check('допълнение без утвърдена цена се отказва', /без цена/.test(threw), threw);
}
check('допълнение с цена се събира',
  resolvePricing({ scope: { package: 'start' }, extras: [{ label: 'Меню', price: 120 }] }).total === 370);

/* ============================================================
   4. Истинска оферта — произвежда се, проверява се, трие се
   ============================================================ */
G('QA оферта — реално генериране');

const QA_BRIEF = {
  leadId: 'BDS-2026-QATEST',
  date: '2026-08-28',
  client: {
    business: 'ТЕСТОВ ОБЕКТ — не изпращай',
    contact: 'QA',
    phone: '000',
    email: 'qa@example.invalid'
  },
  project: 'Тестова оферта, произведена от tools/test-proposal-workflow.mjs.',
  currentSituation: 'Тестов запис. Не описва реален клиент.',
  objectives: ['проверка на номера', 'проверка на валидността'],
  solution: 'Няма реално решение — това е тест на генератора.',
  scope: { package: 'business' },
  scopeDetails: { pages: '5', languages: '2', forms: '2', revisions: 'до 3' },
  included: ['тестова позиция'],
  notIncluded: ['thirdParty', 'adBudget'],
  deliverables: ['тестов резултат'],
  extras: [{ label: 'Тестово допълнение', price: 100 }],
  maintenance: 'site-2',
  timelineDays: 12,
  feedbackDays: 3,
  clientResponsibilities: ['нищо — това е тест'],
  nextStep: 'Изтрий този файл.'
};

let out = null;
let buildError = '';
try {
  out = buildProposal(QA_BRIEF, { id: 'BDS-PROP-2026-9999' });
} catch (e) { buildError = e.message; }

check('офертата се произвежда', !!out, buildError);

if (out) {
  check('номерът е този, който подадохме', out.proposalId === 'BDS-PROP-2026-9999');
  check('стойността е 450 + 100 = 550', out.value === 550);
  check('валидността е 11.09.2026', out.validity === '2026-09-11');

  const h = out.html;
  const has = (needle, label) => check(label || ('съдържа „' + needle + '“'), h.includes(needle));

  has('BDS-PROP-2026-9999', 'номерът на офертата е в документа');
  has('BDS-2026-QATEST', 'Lead ID-то от CRM е в документа');
  has('11.09.2026', 'датата на валидност е изписана');
  has('14 календарни дни', 'валидността е обяснена');
  check('плащането е 50 / 50',
    /<b>50%<\/b> при потвърждаване/.test(h) && /<b>50%<\/b> при предаване/.test(h));
  check('всички задължителни раздели присъстват', [
    'Клиент', 'Проект', 'Текуща ситуация', 'Цели', 'Предложено решение',
    'Обхват', 'Включено', 'Не е включено', 'Какво получавате', 'Цена',
    'Условия за плащане', 'Срок', 'Поддръжка след предаване',
    'Какво е нужно от вас', 'Валидност', 'Следваща стъпка'
  ].every(s => h.includes(s)));
  check('изграждане и поддръжка са две отделни числа',
    h.includes('550 €') && h.includes('40 €/месец'));
  check('поддръжката идва от данните, не от текста',
    D.maintenance.site.plans.find(p => p.id === 'site-2').price === 40);
  check('лимитите на пакета са в офертата', h.includes('до 25'));
  check('няма останали плейсхолдъри', !/\[…\]|\[\.\.\.\]|XXXX/.test(h));
  check('документът е валиден HTML документ',
    h.startsWith('<!DOCTYPE html>') && h.trim().endsWith('</html>'));
  check('готов за печат на A4', h.includes('@page') && h.includes('size: A4'));
}

G('Отказва непълна оферта');
{
  let threw = '';
  try { buildProposal({ scope: { package: 'start' } }); } catch (e) { threw = e.message; }
  check('липсващи полета се изброяват поименно',
    /leadId/.test(threw) && /client.business/.test(threw) && /nextStep/.test(threw), threw.split('\n')[0]);
}
{
  const partial = Object.assign({}, QA_BRIEF, { currentSituation: '' });
  let threw = '';
  try { buildProposal(partial, { id: 'BDS-PROP-2026-9998' }); } catch (e) { threw = e.message; }
  check('едно липсващо поле също спира офертата', /currentSituation/.test(threw));
}

/* ============================================================
   5. Преходът в CRM
   ============================================================ */
G('CRM — статусът Proposal Sent');

const sales = read('tools/crm/Sales.gs');
check('Proposal Sent издава номер, ако липсва',
  /if \(status === 'Proposal Sent'\)/.test(sales) && /bdsIssueProposalId_/.test(sales));
check('Proposal Sent слага дата, ако липсва', /v\[iPropDate\] = new Date\(\)/.test(sales));
check('валидността се смята, не се въвежда',
  /bdsProposalValidity\(v\[iPropDate\]\)/.test(sales));
check('издаването е заключено срещу два еднакви номера',
  /LockService\.getScriptLock\(\)/.test(sales));
check('номерът се търси в самата колона Proposal ID',
  /bdsLeadIdx_\('Proposal ID'\)/.test(sales));
check('има ръчна команда за издаване преди изпращане',
  /function assignProposalIdToSelection\(/.test(sales));

check('Proposal Sent без стойност се маркира като непълен',
  /Proposal Value/.test(L.bdsLeadHealth({
    status: 'Proposal Sent', nextAction: 'изпращане', followUpDate: '2026-09-01',
    proposalId: 'BDS-PROP-2026-0001', proposalDate: '2026-08-28', proposalValidity: '2026-09-11'
  })));
check('пълен Proposal Sent е чист',
  L.bdsLeadHealth({
    status: 'Proposal Sent', nextAction: 'изпращане', followUpDate: '2026-09-01',
    proposalId: 'BDS-PROP-2026-0001', proposalDate: '2026-08-28',
    proposalValue: 450, proposalValidity: '2026-09-11'
  }) === '');
check('Proposal Sent без номер се маркира',
  /Proposal ID/.test(L.bdsLeadHealth({
    status: 'Proposal Sent', nextAction: 'изпращане', followUpDate: '2026-09-01',
    proposalValue: 450, proposalDate: '2026-08-28', proposalValidity: '2026-09-11'
  })));

G('Не се твърди изпратен имейл');
check('няма код, който да „праща“ оферта сам',
  !/MailApp|GmailApp/.test(sales) && !/MailApp|GmailApp/.test(read('tools/crm/Code.gs')));
check('процесът описва ръчното изпращане и статуса след него',
  /изпращ/i.test(read('marketing/proposal-process.md')) &&
  /Proposal Sent/.test(read('marketing/proposal-process.md')));

/* ============================================================
   6. Чистене след теста
   ============================================================ */
G('След теста');
const qaFile = path.join(ROOT, 'tools', 'out', 'BDS-PROP-2026-9999.html');
if (fs.existsSync(qaFile)) fs.unlinkSync(qaFile);
check('тестовата оферта не остава на диска', !fs.existsSync(qaFile));

process.exit(R.summary() ? 0 : 1);
