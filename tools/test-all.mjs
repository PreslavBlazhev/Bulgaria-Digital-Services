/* ============================================================
   BDS — пуска всички проверки една след друга
   ------------------------------------------------------------
   Стартиране:

     node tools/test-all.mjs             всичко без интернет и браузър
     node tools/test-all.mjs --browser   + браузърните тестове на фунията
     node tools/test-all.mjs --live      + истинска заявка към CRM-а

   Изход: 0 = всичко минава. 1 = има провал.
   Блокирано от външна стъпка (липсващ endpoint, липсващ рекламен
   акаунт) НЕ е провал и не вдига изхода — но се брои и се вижда.
   ============================================================ */

import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const BROWSER = args.includes('--browser');
const LIVE = args.includes('--live');

const SUITES = [
  { name: 'Сайт — съдържание и данни', file: 'tools/check-site.mjs', args: [] },
  { name: 'Ресторантска фуния', file: 'tools/test-restaurant-funnel.mjs', args: BROWSER ? ['--browser'] : [] },
  { name: 'CRM интеграция (Phase 16)', file: 'tools/test-crm-integration.mjs', args: LIVE ? ['--live'] : [] },
  { name: 'Маркетингов тракер (Phase 18)', file: 'tools/test-marketing-tracker.mjs', args: [] },
  { name: 'Затворен кръг (Phase 20)', file: 'tools/test-marketing-pipeline.mjs', args: [] },
  { name: 'Офертен процес (Phase 17)', file: 'tools/test-proposal-workflow.mjs', args: [] },
  { name: 'Внос на реклами (Phase 19)', file: 'tools/test-ads-import.mjs', args: [] },
  { name: 'Meta retargeting (Phase 21)', file: 'tools/test-meta-retargeting.mjs', args: [] }
];

/* Проверките срещу живата таблица искат служебен ключ. Без него
   няма смисъл да се пускат — само биха мигали в жълто. */
if (process.env.BDS_OPS_TOKEN) {
  SUITES.push({ name: 'Живата таблица (18 · 20 · 17)', file: 'tools/test-live-ops.mjs', args: [] });
}

const results = [];
for (const suite of SUITES) {
  console.log('\n' + '═'.repeat(64));
  console.log('\x1b[1m' + suite.name + '\x1b[0m  \x1b[2m' + suite.file + '\x1b[0m');
  console.log('═'.repeat(64));
  const r = spawnSync(process.execPath, [path.join(ROOT, suite.file), ...suite.args], {
    stdio: 'inherit',
    cwd: ROOT
  });
  results.push({ suite, code: r.status ?? 1 });
}

console.log('\n' + '═'.repeat(64));
console.log('\x1b[1mОБОБЩЕНИЕ\x1b[0m');
console.log('═'.repeat(64));
let failed = 0;
for (const { suite, code } of results) {
  const ok = code === 0;
  if (!ok) failed++;
  console.log((ok ? '\x1b[32m  ok  \x1b[0m' : '\x1b[31m FAIL \x1b[0m') + ' ' + suite.name);
}
console.log('');
if (failed) {
  console.log('\x1b[31m' + failed + ' от ' + results.length + ' групи имат провал.\x1b[0m');
} else {
  console.log('\x1b[32mВсички ' + results.length + ' групи минават.\x1b[0m');
}
if (!LIVE) {
  console.log('\x1b[2mЖивите проверки срещу истинския CRM не са пускани: --live\x1b[0m');
}
process.exit(failed ? 1 : 0);
