/* ============================================================
   BDS — рекламна структура и негативи (Phase 12 · 13)
   ------------------------------------------------------------
   Стартиране:  node tools/test-google-ads.mjs

   Най-важната проверка тук е сблъсъкът между негативите и
   ключовите думи, за които плащаме.

   Веднъж вече се е случвало: широк негатив `меню` изключваше
   `меню за ресторант` — тоест кампанията плащаше за структура,
   която сама си е забранила да показва. Такава грешка не се вижда
   в интерфейса; вижда се като „няма импресии“ седмица по-късно.

   Затова: негативът `меню` днес е Exact. Този тест пази точно това
   решение да не се върне обратно.
   ============================================================ */

import { reporter, read, exists } from './lib/ops-test-kit.mjs';

const R = reporter('BDS — Google Ads структура и негативи');
const { G, check, blocked } = R;

const CSV = 'marketing/google-ads-restaurants-import.csv';
const NEG = 'marketing/google-ads-negative-keywords.md';
const PLAN = 'marketing/google-ads-restaurants.md';

/* ------------------------------------------------------------
   Разчитане на кампанията
   ------------------------------------------------------------ */
function parseCsv(text) {
  const rows = [];
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter(Boolean);
  const head = lines.shift().split(',');
  for (const line of lines) {
    /* Полетата с кавички съдържат запетаи — прост, но достатъчен разбор. */
    const cells = [];
    let cur = '', inQ = false;
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ; continue; }
      if (ch === ',' && !inQ) { cells.push(cur); cur = ''; continue; }
      cur += ch;
    }
    cells.push(cur);
    const row = {};
    head.forEach((h, i) => { row[h.trim()] = (cells[i] || '').trim(); });
    rows.push(row);
  }
  return rows;
}

/** Негативите от документа. Само редовете, които са СПИСЪК —
    обяснителната проза също съдържа думи в апострофи. */
function parseNegatives(md) {
  const body = md.slice(md.indexOf('## Групи'), md.indexOf('## Съзнателно НЕ добавени'));
  const phrase = [], exact = [];
  for (const line of body.split(/\r?\n/)) {
    if (/^###/.test(line) || !line.trim()) continue;
    const items = [...line.matchAll(/`([^`]+)`/g)].map(m => m[1].trim().toLowerCase());
    if (!items.length) continue;
    const rest = line.replace(/`[^`]+`/g, '').replace(/\*\*Exact:\*\*/g, '').replace(/[·\s]/g, '');
    if (rest.length > 0) continue;              /* проза, не списък */
    (/\*\*Exact:\*\*/.test(line) ? exact : phrase).push(...items);
  }
  return { phrase, exact };
}

const words = (s) => String(s).toLowerCase().trim().split(/\s+/);
/** Дали `needle` се среща като ЦЯЛА последователност от думи в `hay`. */
function containsPhrase(hay, needle) {
  const h = words(hay), n = words(needle);
  for (let i = 0; i + n.length <= h.length; i++) {
    if (n.every((w, j) => h[i + j] === w)) return true;
  }
  return false;
}

/* ============================================================
   1. Файловете
   ============================================================ */
G('Файлове');
for (const f of [CSV, NEG, PLAN]) check('съществува ' + f, exists(f));

const rows = parseCsv(read(CSV));
const neg = parseNegatives(read(NEG));
const plan = read(PLAN);

/* CSV-то е пълният файл за импорт: в него са И платените думи, И
   негативите, разделени по Criterion Type. */
const all = rows.filter(r => r.Keyword).map(r => ({
  campaign: r.Campaign,
  group: r['Ad Group'],
  kw: r.Keyword.toLowerCase(),
  type: (r['Criterion Type'] || '').toLowerCase()
}));
const positives = all.filter(r => !r.type.startsWith('negative'));
const csvNeg = {
  phrase: all.filter(r => r.type === 'negative phrase').map(r => r.kw),
  exact: all.filter(r => r.type === 'negative exact').map(r => r.kw)
};

check('кампанията има платени думи', positives.length > 0, positives.length + ' думи');
check('негативите са прочетени от документа', neg.phrase.length + neg.exact.length > 0,
  neg.phrase.length + ' phrase · ' + neg.exact.length + ' exact');
check('броят негативи съвпада с обявения в документа',
  neg.phrase.length + neg.exact.length === 98,
  (neg.phrase.length + neg.exact.length) + ' спрямо 98');

/* Двата източника трябва да казват едно и също — иначе импортът и
   документът се разминават и никой не разбира кой е верният. */
G('CSV и документът се съгласуват');
check('еднакъв брой phrase негативи',
  csvNeg.phrase.length === neg.phrase.length,
  'CSV ' + csvNeg.phrase.length + ' · документ ' + neg.phrase.length);
check('еднакъв брой exact негативи',
  csvNeg.exact.length === neg.exact.length,
  'CSV ' + csvNeg.exact.length + ' · документ ' + neg.exact.length);
{
  const onlyCsv = csvNeg.phrase.concat(csvNeg.exact)
    .filter(k => ![...neg.phrase, ...neg.exact].includes(k));
  const onlyDoc = [...neg.phrase, ...neg.exact]
    .filter(k => !csvNeg.phrase.concat(csvNeg.exact).includes(k));
  check('няма негатив само в CSV', onlyCsv.length === 0, onlyCsv.join(' · '));
  check('няма негатив само в документа', onlyDoc.length === 0, onlyDoc.join(' · '));
}
check('„меню“ е Negative Exact и в CSV-то',
  csvNeg.exact.includes('меню') && !csvNeg.phrase.includes('меню'));

/* ============================================================
   2. СБЛЪСЪК — негатив, който изключва платена дума
   ============================================================ */
G('Сблъсък между негативи и платени думи');

const collisions = [];
for (const p of positives) {
  for (const n of neg.phrase) {
    /* Phrase негатив блокира всяко търсене, което го съдържа. */
    if (containsPhrase(p.kw, n)) {
      collisions.push({ kw: p.kw, neg: n, type: 'phrase', group: p.group });
    }
  }
  for (const n of neg.exact) {
    /* Exact негатив блокира само точното съвпадение. */
    if (p.kw === n) {
      collisions.push({ kw: p.kw, neg: n, type: 'exact', group: p.group });
    }
  }
}
check('нито един негатив не изключва платена дума',
  collisions.length === 0,
  collisions.slice(0, 6).map(c => '„' + c.neg + '“ (' + c.type + ') ✕ „' + c.kw + '“').join(' · '));

G('Историческият дефект — „меню“');
check('„меню“ е сред негативите', [...neg.exact, ...neg.phrase].includes('меню'));
check('„меню“ е Exact, не Phrase',
  neg.exact.includes('меню') && !neg.phrase.includes('меню'),
  neg.exact.includes('меню') ? 'exact' : 'phrase — ВЪРНАТ ДЕФЕКТ');
const menuKeywords = positives.filter(p => containsPhrase(p.kw, 'меню'));
check('има платени думи, съдържащи „меню“',
  menuKeywords.length > 0, menuKeywords.length + ' думи');
check('нито една от тях не е блокирана',
  !menuKeywords.some(k => neg.phrase.some(n => containsPhrase(k.kw, n))),
  menuKeywords.map(k => k.kw).slice(0, 3).join(' · '));

for (const risky of ['ресторант', 'храна', 'пица', 'ресторанти']) {
  check('„' + risky + '“ е Exact, не Phrase',
    !neg.phrase.includes(risky),
    neg.phrase.includes(risky) ? 'ОПАСНО: широк негатив' : 'ok');
}

/* ============================================================
   3. Структура на кампанията
   ============================================================ */
G('Структура');

const campaigns = [...new Set(positives.map(p => p.campaign))];
check('една кампания, не разпиляна', campaigns.length === 1, campaigns.join(' · '));
check('кампанията е за ресторанти', /Restaurants/i.test(campaigns[0] || ''), campaigns[0]);

const groups = [...new Set(positives.map(p => p.group))];
check('няколко тесни ad group-а', groups.length >= 3 && groups.length <= 10,
  groups.length + ': ' + groups.join(' · '));

const perGroup = groups.map(g => positives.filter(p => p.group === g).length);
check('никой ad group не е прекалено широк',
  Math.max(...perGroup) <= 15, 'най-голям: ' + Math.max(...perGroup) + ' платени думи');

const types = [...new Set(positives.map(p => p.type))];
check('само Exact и Phrase — без Broad',
  types.every(t => t === 'exact' || t === 'phrase'), types.join(' · '));
check('платените думи са малко и подбрани',
  positives.length <= 40, positives.length + ' думи');
check('има и Exact, и Phrase',
  types.includes('exact') && types.includes('phrase'));

G('Съдържание на плана');
check('поне два различни рекламни ъгъла',
  (plan.match(/Headline|Заглавие/gi) || []).length >= 2);
check('описани са sitelinks', /sitelink/i.test(plan));
check('описани са callouts', /callout/i.test(plan));
check('географията е описана', /България|Bulgaria|geo/i.test(plan));
check('search partners са описани', /search partners|партнь/i.test(plan));
check('display мрежата е описана', /display/i.test(plan));
check('зависимостта от конверсии е описана', /конверси/i.test(plan));
check('бюджетът е записан като чернова', /10\s*€|€\s*10|10 евро/i.test(plan));

G('Финалните адреси');
const urls = [...plan.matchAll(/https?:\/\/[^\s)`"]+/g)].map(m => m[0]);
check('няма финален адрес към netlify',
  !urls.some(u => /netlify\.app/.test(u)),
  urls.filter(u => /netlify/.test(u)).join(' · '));
check('финалните адреси са на производствения домейн',
  urls.filter(u => /bulgaria-digital-services/.test(u))
    .every(u => u.includes('bulgaria-digital-services.com')),
  urls.filter(u => /bulgaria-digital-services/.test(u))[0] || 'няма');
check('рекламата води към ресторантската страница',
  plan.includes('bulgaria-digital-services.com/restaurants'));

/* ============================================================
   4. Външното състояние
   ============================================================ */
G('Външно състояние');
check('никъде не се твърди, че кампанията е пусната',
  /BLOCKED|няма.{0,30}акаунт|не съществува/i.test(plan + read('marketing/ad-data-automation.md')));
blocked('Кампания в Google Ads', 'BLOCKED — EXTERNAL ACCOUNT (няма рекламен акаунт)');

process.exit(R.summary() ? 0 : 1);
