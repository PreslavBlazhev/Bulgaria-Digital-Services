/* ============================================================
   BDS — сглобява папката за качване (dist/)
   ------------------------------------------------------------
   Стартиране:  node tools/build-dist.mjs

   Защо изобщо съществува: папката на проекта НЕ е папка за качване.
   В нея живеят вътрешни неща, които нямат работа в публичния интернет:

     marketing/            рекламна стратегия, негативни ключови думи,
                           продажбен процес, CRM схема, шаблон за оферта
     PRICES AND PACKETS/   вътрешни цени и списъци с функции
     bds_master_command.txt
     tools/                build и test скриптове
     readme.md, server.js  вътрешни
     logo/                 изходен актив, не се реферира от сайта

   Плюс страниците без разрешение за публикуване: те са извън sitemap
   и са Disallow в robots.txt, но това НЕ е контрол на достъпа — файлът
   пак се отваря по адрес. Тук просто не се копира.

   Резултатът е `dist/`. Него качваме, не корена.
   ============================================================ */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');

/* Папки и файлове, които се качват. Всичко останало НЕ се качва —
   списъкът е позволителен, не забранителен, за да не изтече нещо
   ново само защото никой не се е сетил да го добави в изключенията. */
const COPY_DIRS = ['assets', 'restaurants', 'print'];
const COPY_FILES = ['_redirects', 'robots.txt', 'sitemap.xml'];

/* Файлове, които не тръгват дори от разрешените папки. */
const SKIP_PATTERNS = [/\.bak$/i, /\.rar$/i, /Thumbs\.db$/i, /^\._/, /\.psd$/i];

/** Страници без разрешение за публикуване — четат се от robots.txt,
    който се генерира от същия източник като sitemap-а. */
function disallowedPages() {
  const robots = fs.readFileSync(path.join(ROOT, 'robots.txt'), 'utf8');
  return [...robots.matchAll(/^Disallow:\s*\/(\S+)$/gm)].map(m => m[1]).filter(Boolean);
}

function skip(rel) {
  return SKIP_PATTERNS.some(p => p.test(path.basename(rel)));
}

let copied = 0;
function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name);
    const dst = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(src, dst);
    else if (!skip(entry.name)) { fs.copyFileSync(src, dst); copied++; }
  }
}

/* ---------- Сглобяване ---------- */
fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });

const blocked = disallowedPages();
const skippedPages = [];
const htmlPages = fs.readdirSync(ROOT)
  .filter(f => f.endsWith('.html'))
  .filter(f => {
    if (blocked.includes(f)) {
      skippedPages.push(f);
      console.log('  ✗ пропуснат (без разрешение): ' + f);
      return false;
    }
    return true;
  });

for (const f of htmlPages) { fs.copyFileSync(path.join(ROOT, f), path.join(DIST, f)); copied++; }
for (const f of COPY_FILES) {
  if (fs.existsSync(path.join(ROOT, f))) { fs.copyFileSync(path.join(ROOT, f), path.join(DIST, f)); copied++; }
}
for (const d of COPY_DIRS) {
  if (fs.existsSync(path.join(ROOT, d))) copyDir(path.join(ROOT, d), path.join(DIST, d));
}

/* ---------- Проверка, че нищо вътрешно не е влязло ---------- */
const MUST_NOT_SHIP = ['marketing', 'tools', 'PRICES AND PACKETS', 'logo',
  'bds_master_command.txt', 'readme.md', 'server.js', 'dist',
  'OPERATIONS.md', '.git', '.gitignore'];
const leaked = MUST_NOT_SHIP.filter(x => fs.existsSync(path.join(DIST, x)));

/* Втора проверка: търсим текст от вътрешните документи вътре в dist. */
const canaries = ['bds_master_command', 'PAYMENT STRUCTURE: BUSINESS DECISION'];
const leakedText = [];
(function scan(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { scan(p); continue; }
    if (!/\.(html|js|css|txt|xml|json)$/i.test(e.name)) continue;
    const body = fs.readFileSync(p, 'utf8');
    for (const c of canaries) if (body.includes(c)) leakedText.push(path.relative(DIST, p) + ' → ' + c);
  }
})(DIST);

console.log('\n  ' + copied + ' файла в dist/');
console.log('  ' + htmlPages.length + ' HTML страници' + (skippedPages.length ? '  (' + skippedPages.length + ' пропуснати: ' + skippedPages.join(', ') + ')' : ''));

if (leaked.length || leakedText.length) {
  console.error('\n  ГРЕШКА — вътрешно съдържание е влязло в dist:');
  leaked.forEach(x => console.error('    · ' + x));
  leakedText.forEach(x => console.error('    · ' + x));
  process.exit(1);
}

console.log('\n  Нищо вътрешно не е попаднало в dist. Готово за качване.');
console.log('  Качва се СЪДЪРЖАНИЕТО на dist/, не коренът на проекта.\n');
