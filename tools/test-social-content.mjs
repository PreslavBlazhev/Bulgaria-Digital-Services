/* ============================================================
   BDS — проверка на съдържанието за социалните профили (Phase 22)
   ------------------------------------------------------------
   Стартиране:  node tools/test-social-content.mjs

   Двете неща, които този тест пази:

   1. Всеки материал, посочен в публикация, СЪЩЕСТВУВА на диска.
      План, който сочи към несъществуващ файл, се разпада в деня на
      изработката.

   2. Никъде няма измислено доказателство. Отзив, процент, брой
      клиенти — все неща, които никой няма да провери, преди да са
      излезли публично.
   ============================================================ */

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { reporter, read, exists, ROOT } from './lib/ops-test-kit.mjs';

const R = reporter('BDS — съдържание за социалните профили (Phase 22)');
const { G, check, blocked } = R;

const DOCS = {
  profile: 'marketing/social-profile-setup.md',
  library: 'marketing/social-post-library.md',
  calendar: 'marketing/social-content-calendar.md',
  specs: 'marketing/social-creative-specs.md'
};

/* ============================================================
   1. Файловете
   ============================================================ */
G('Файлове');
for (const [key, file] of Object.entries(DOCS)) {
  check('съществува ' + file, exists(file));
}
const profile = read(DOCS.profile);
const library = read(DOCS.library);
const calendar = read(DOCS.calendar);
const specs = read(DOCS.specs);

check('няма дублиране — профилният файл сочи към останалите',
  library.includes('social-profile-setup') || profile.includes('social-post-library.md'));

/* ============================================================
   2. Публикациите
   ============================================================ */
G('Публикации');

const posts = [...library.matchAll(/^## (\d+)\. (.+)$/gm)].map(m => ({ n: Number(m[1]), title: m[2] }));
check('поне 9 публикации', posts.length >= 9, posts.length + ' намерени');
check('12 подготвени', posts.length === 12, posts.length);
check('номерата са последователни',
  posts.every((p, i) => p.n === i + 1), posts.map(p => p.n).join(','));

for (const need of ['**Кука:**', '**CTA:**', '**Хаштагове:**', '**Визуална посока:**',
  '**Доказателство:**', '**Забранено:**']) {
  const count = (library.match(new RegExp(need.replace(/\*/g, '\\*'), 'g')) || []).length;
  check('всяка публикация има ' + need.replace(/\*/g, ''), count >= posts.length,
    count + ' от ' + posts.length);
}

check('всяка публикация има пълен текст на български',
  (library.match(/```\n[\s\S]*?```/g) || []).length >= posts.length);

G('Покритие по видове');
check('има case study', /Pizza Pazzo — case study/.test(library));
check('има демонстрация на сайт', /Златната скара|Рибката/.test(library));
check('има демонстрация на система', /Как минава една поръчка/.test(library));
check('има ресторантска публикация', /ресторант|заведение|пицария/i.test(library));
check('има сравнение на процес', /Процесът преди и след/.test(library));
check('има контактна публикация', /Свържете се/.test(library));
check('има публикация за услугите и цените', /Пакети и цени/.test(library));

G('Закачени и видео');
check('три закачени публикации са определени',
  /## Закачени публикации/.test(library) &&
  (library.match(/\|\s*[123]\s*\|\s*\*\*№/g) || []).length === 3);
const reels = (library.match(/^### R\d/gm) || []).length;
check('поне 3 концепции за видео', reels >= 3, reels + ' намерени');
check('видеата имат кадрова разбивка', /\| Кадър \| Секунди \|/.test(library));
check('условният реел е отбелязан като условен',
  /само.{0,40}при достъп до админ панела|изисква достъп до админ панел/i.test(library));

/* ============================================================
   3. Материалите съществуват наистина
   ============================================================ */
G('Посочените материали съществуват');

const assetRefs = new Set();
for (const m of (library + calendar + specs).matchAll(/assets\/img\/[A-Za-z0-9._\/-]+/g)) {
  assetRefs.add(m[0]);
}
for (const m of (library + calendar).matchAll(/`(pp-[a-z]+\.jpg)`/g)) {
  assetRefs.add('assets/img/case/' + m[1]);
}
for (const m of (calendar).matchAll(/`([a-z-]+\.(webp|png|jpg))`/g)) {
  const guess = 'assets/img/' + m[1];
  if (fs.existsSync(path.join(ROOT, guess))) assetRefs.add(guess);
}
check('поне 8 материала са посочени поименно', assetRefs.size >= 8, assetRefs.size);
const missing = [...assetRefs].filter(a => !exists(a));
check('всеки посочен материал съществува на диска',
  missing.length === 0, missing.join(', '));

check('липсващата корица е отбелязана като липсваща',
  /Корица.{0,40}(липсва|не съществува|трябва да се направи)/is.test(specs + profile));

/* ============================================================
   4. Само реални проекти
   ============================================================ */
G('Проектите са реални и разрешени');

const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(read('assets/js/bds-data.js'), sandbox);
const D = sandbox.window.BDS_DATA;
const approved = D.projects.filter(p => p.publicationApproved).map(p => p.name);
const notApproved = D.projects.filter(p => !p.publicationApproved).map(p => p.name);

check('данните имат одобрени проекти', approved.length > 0, approved.length + ' одобрени');
for (const name of notApproved) {
  check('НЕ се ползва проект без разрешение: ' + name,
    !library.includes(name) && !calendar.includes(name));
}
check('Pizza Pazzo е използван и е одобрен',
  library.includes('Pizza Pazzo') && approved.includes('Pizza Pazzo'));

/* Числата за Pizza Pazzo трябва да идват от verified, не от въображение. */
const pp = D.getProject('pizza-pazzo');
const ppFacts = pp.verified.map(v => String(v.value));
for (const n of ['98', '84', '354', '7', '4']) {
  const inDoc = new RegExp('(^|[^\\d])' + n + '([^\\d]|$)').test(library);
  const inData = ppFacts.some(v => v.includes(n));
  if (inDoc) check('числото ' + n + ' идва от verified данните', inData);
}

/* ============================================================
   5. Никакви измислени доказателства
   ============================================================ */
G('Няма измислено доказателство');

const all = library + calendar + specs + profile;

/* Проверява се ТЕКСТЪТ, който ще излезе публично — заграденият в ```
   блокове, плюс заглавията и CTA-тата. Не целият документ: забранените
   фрази присъстват нарочно в списъците „какво не се пише“, и точно там
   присъствието им е правилно. */
const published = [
  ...[...(library + profile).matchAll(/```\n([\s\S]*?)```/g)].map(m => m[1]),
  ...[...library.matchAll(/\*\*(?:Заглавие|CTA|Кука):\*\*(.+)/g)].map(m => m[1])
].join('\n');
check('извлечен е публикуваният текст', published.length > 2000,
  published.length + ' знака за проверка');

const FORBIDDEN = [
  [/довериха ни се/i, 'твърдение за брой клиенти'],
  [/десетки (бизнеса|клиенти|заведения)/i, 'неизброен брой'],
  [/\+\s?\d+\s?% (повече|ръст|продажби|поръчки)/i, 'измислен процент резултат'],
  [/увеличих?ме? (продажбите|оборота|поръчките)/i, 'неизмерен резултат'],
  [/ROAS|възвръщаемост от \d/i, 'рекламен показател без данни'],
  [/номер\s?1|№\s?1 в|най-добрата агенция/i, 'неизмеримо превъзходство'],
  [/революционизира/i, 'клише без съдържание'],
  [/последен шанс|офертата изтича днес/i, 'изкуствен натиск']
];
for (const [re, why] of FORBIDDEN) {
  const hit = re.exec(published);
  check('няма ' + why, !hit, hit ? hit[0] : '');
}

check('няма измислен отзив в кавички',
  !/„[^“”]{40,}“\s*[—–-]\s*[А-Я]/.test(all));
check('няма събрани отзиви — и това е записано',
  /няма събрани|testimonials.{0,30}празен|още няма/i.test(all));
check('изрично е забранено измислянето на резултати',
  /Забранено|не се пише|НЕ се публикува/i.test(library));
check('фалшив „преди“ сайт е изрично забранен',
  /измислен стар сайт|не сравняваме нечия чужда работа/i.test(library));
check('фалшиви екрани на админ панел са изрично забранени',
  /да не се правят фалшиви екрани/i.test(library));

G('Контактите са реалните');
const c = D.meta.contact;
check('имейлът съвпада с данните', all.includes(c.email), c.email);
check('телефонът съвпада с данните',
  all.includes('877 364 001'), c.phone);
check('няма измислен адрес',
  /без адрес|Адрес не се посочва/i.test(profile));

/* ============================================================
   6. Календар и профилни полета
   ============================================================ */
G('Календар');
check('ритъмът е избран и обоснован', /3 публикации седмично/.test(calendar));
check('има ясен ден, преди който рекламата не тръгва',
  /РЕКЛАМАТА МОЖЕ ДА ТРЪГНЕ/.test(calendar));
check('всяка публикация е разпределена', (calendar.match(/\*\*№ \d+ —/g) || []).length >= 12);
check('reels са в календара', /R1|R3/.test(calendar));

G('Профилни полета');
check('име на страницата', /Bulgaria Digital Services/.test(profile));
check('предложени handle-и, без твърдение за наличност',
  /@bulgariadigitalservices/.test(profile) &&
  /не се твърди, че са|Дали са\s*\n?свободни/i.test(profile));
check('категория', /Web Designer/.test(profile));
check('bio за Instagram', /150 знака|137 знака/.test(profile));
check('CTA бутон', /Изпратете съобщение/.test(profile));
check('връзка с UTM', /utm_source=instagram/.test(profile) && /utm_source=facebook/.test(profile));
check('highlights структура', /## Instagram Highlights/.test(profile));
check('първият highlight е Ресторанти', /1 \| \*\*Ресторанти\*\*/.test(profile));
check('проверка преди реклама — 11 точки',
  (profile.match(/^- \[ \] /gm) || []).length >= 11,
  (profile.match(/^- \[ \] /gm) || []).length + ' точки');
check('минимумът е 9 публикации', /\*\*9 публикации\*\*/.test(profile));

G('Визуална система');
check('цветовете идват от tokens.css', /#05070d/.test(specs) && /#1e7bff/.test(specs));
const tokens = read('assets/css/tokens.css');
for (const hex of ['#05070d', '#1e7bff', '#0059ff', '#f2f5fa']) {
  check('цветът ' + hex + ' наистина е в tokens.css', tokens.includes(hex));
}
check('и трите формата са описани',
  /1080×1080/.test(specs) && /1080×1350/.test(specs) && /1080×1920/.test(specs));
check('безопасните зони са зададени', /250 px/.test(specs) && /310 px/.test(specs));
check('екраните не се редактират — правило',
  /екраните не се редактират/i.test(specs));
check('брандът не се преправя', /Брандът \*\*не се преправя/.test(specs));

/* ============================================================
   7. Външното състояние
   ============================================================ */
G('Външно състояние');
check('никъде не се твърди, че профил съществува',
  /няма профили|не съществуват|OWNER ACCOUNT REQUIRED/i.test(library + profile));
blocked('Instagram профил', 'BLOCKED — OWNER ACCOUNT REQUIRED');
blocked('Facebook страница', 'BLOCKED — OWNER ACCOUNT REQUIRED');
blocked('Публикувани публикации', 'BLOCKED — OWNER ACCOUNT REQUIRED');

console.log('');
process.exit(R.summary() ? 0 : 1);
