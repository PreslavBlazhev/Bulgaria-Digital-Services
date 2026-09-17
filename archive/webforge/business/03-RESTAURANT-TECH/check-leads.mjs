/* ============================================================
   Проверка на lead базата — 04-lead-database-template.csv
   ------------------------------------------------------------
   Официалната schema е 37 колони. Скриптът проверява:
     1. всеки ред има точно толкова клетки, колкото header-ът
     2. няма дублирани ID
     3. задължителните полета са попълнени при реален lead
     4. source_urls и date_verified присъстват при реален lead
     5. lead_score е число, priority_class е A/B/C/D
     6. редовете EXAMPLE не се броят като leads

   Изпълнение:  node check-leads.mjs
   Изход: 0 при успех, 1 при поне една грешка.
   ============================================================ */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const FILE = join(dirname(fileURLToPath(import.meta.url)), '04-lead-database-template.csv');
const TARGET = 100;

/* Минимален CSV парсер с поддръжка на кавички и запетаи в тях. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; } else { quoted = false; }
      } else cell += c;
      continue;
    }
    if (c === '"') { quoted = true; continue; }
    if (c === ',') { row.push(cell); cell = ''; continue; }
    if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; continue; }
    if (c !== '\r') cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((v) => v.trim() !== ''));
}

const rows = parseCsv(readFileSync(FILE, 'utf8'));
const header = rows[0];
const COLS = header.length;
const idx = (n) => header.indexOf(n);

let errors = 0;
const err = (m) => { errors++; console.log(`  ✖ ${m}`); };

console.log(`\nПроверявам ${FILE}`);
console.log(`Официална schema: ${COLS} колони\n`);

/* --- 1. Брой клетки --- */
rows.forEach((r, i) => {
  if (i === 0) return;
  if (r.length !== COLS) err(`ред ${i + 1}: ${r.length} клетки вместо ${COLS}`);
});

/* --- Кои редове са реални leads --- */
const isExample = (r) =>
  String(r[idx('id')] || '').toUpperCase().startsWith('EXAMPLE') ||
  String(r[idx('crm_status')] || '').toUpperCase() === 'EXAMPLE';

const dataRows = rows.slice(1);
const leads = dataRows.filter((r) => !isExample(r));
const examples = dataRows.length - leads.length;

/* --- 2. Дублирани ID --- */
const seen = new Map();
leads.forEach((r, i) => {
  const id = (r[idx('id')] || '').trim();
  if (!id) { err(`lead ред ${i + 1}: липсва id`); return; }
  if (seen.has(id)) err(`дублиран id „${id}“ (редове ${seen.get(id)} и ${i + 1})`);
  else seen.set(id, i + 1);
});

/* --- 3-5. Задължителни полета при реален lead --- */
const REQUIRED = ['id', 'name', 'city', 'category', 'source_urls', 'date_verified',
  'lead_score', 'priority_class'];

leads.forEach((r, i) => {
  const label = `lead ${(r[idx('id')] || '?')}`;
  for (const col of REQUIRED) {
    if (!String(r[idx(col)] || '').trim()) err(`${label}: липсва задължително поле „${col}“`);
  }
  const score = String(r[idx('lead_score')] || '').trim();
  if (score && !/^\d+$/.test(score)) err(`${label}: lead_score „${score}“ не е число`);
  const cls = String(r[idx('priority_class')] || '').trim().toUpperCase();
  if (cls && !['A', 'B', 'C', 'D'].includes(cls)) err(`${label}: priority_class „${cls}“ не е A/B/C/D`);
  const dm = String(r[idx('decision_maker')] || '').trim();
  const dmSrc = String(r[idx('decision_maker_source')] || '').trim();
  if (dm && !dmSrc) err(`${label}: има decision_maker, но няма източник — не се приема`);
});

/* --- Обобщение --- */
console.log(`Примерни редове (не се броят): ${examples}`);
console.log(`Реални leads: ${leads.length} / ${TARGET}`);

if (leads.length < TARGET) {
  console.log(`\n  ⚠ БАЗАТА НЕ Е ГОТОВА — липсват ${TARGET - leads.length} записа.`);
  console.log('     Модул 03 не може да се отчете като завършен.');
  console.log('     Виж 04-lead-database-INSTRUCTIONS.md за процедурата.');
}

const byClass = {};
leads.forEach((r) => {
  const c = String(r[idx('priority_class')] || '?').toUpperCase();
  byClass[c] = (byClass[c] || 0) + 1;
});
if (leads.length) console.log('Разпределение по приоритет:', JSON.stringify(byClass));

console.log('\n' + '─'.repeat(56));
console.log(`Резултат: ${errors} грешки · ${leads.length}/${TARGET} leads`);
console.log('─'.repeat(56) + '\n');
process.exit(errors > 0 ? 1 : 0);
