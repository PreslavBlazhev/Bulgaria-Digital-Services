/* ============================================================
   BDS — тест на затворения кръг CRM ↔ маркетинг (Phase 20)
   ------------------------------------------------------------
   Стартиране:  node tools/test-marketing-pipeline.mjs

   Тества функциите, които наистина смятат числата в таблицата —
   заредени от tools/crm/Logic.gs, не преписани тук.

   Най-важната проверка е неочевидната: пускането на
   преизчислението два пъти трябва да даде БУКВАЛНО същата таблица.
   Ако вместо това някъде има „+= 1“, вторият път удвоява клиентите
   и ROAS започва да лъже в посока, която ласкае.
   ============================================================ */

import { loadLogic, reporter, read, near } from './lib/ops-test-kit.mjs';

const L = loadLogic();
const R = reporter('BDS — затворен кръг CRM ↔ маркетинг (Phase 20)');
const { G, check } = R;
const I = L.BDS_MD_IDX;

/* ---------- помощни ---------- */

const lead = (o) => Object.assign({
  leadId: 'TEST', createdDate: '2026-08-20', sourceCategory: 'google_ads',
  campaign: 'restaurant_search_bg', status: 'New', dealValue: ''
}, o);

const adRow = (o) => Object.assign({
  date: '2026-08-20', platform: 'Google Ads', campaignId: '22112233',
  campaign: 'restaurant_search_bg', spend: 0, impressions: 0, clicks: 0, conversions: 0
}, o);

/** Целият кръг: Raw Ads → резолвър → CRM → редове на Marketing Daily. */
function rebuild(existing, leads, rawAds, overrides) {
  const adsAgg = L.bdsAggregateAds(rawAds || []);
  const resolver = L.bdsCampaignIdResolver(adsAgg, overrides || {});
  const crmAgg = L.bdsAggregateCrm(leads || [], resolver);
  return L.bdsRebuildMarketingRows(existing || [], crmAgg, adsAgg);
}

const rowFor = (rows, date, channel) =>
  rows.find(r => r[I.date] === date && r[I.channel] === channel);

/* ============================================================
   1. Групиране на заявките
   ============================================================ */
G('CRM → групи');

{
  const agg = L.bdsAggregateCrm([
    lead({ leadId: 'A' }), lead({ leadId: 'B' }),
    lead({ leadId: 'C', createdDate: '2026-08-21' })
  ]);
  const keys = Object.keys(agg);
  check('заявки от един ден и една кампания се групират', keys.length === 2, keys.join(' / '));
  check('две заявки в един ден се броят като две',
    agg[L.bdsMdKey('2026-08-20', 'Google Ads', '')].leads === 2);
}

{
  const agg = L.bdsAggregateCrm([
    lead({ leadId: 'A', status: 'Won', dealValue: 450 }),
    lead({ leadId: 'B', status: 'Lost' }),
    lead({ leadId: 'C', status: 'Proposal Sent' })
  ]);
  const g = agg[L.bdsMdKey('2026-08-20', 'Google Ads', '')];
  check('три заявки', g.leads === 3);
  check('само Won брои клиент', g.clients === 1);
  check('само Won носи приход', g.revenue === 450);
  check('Lost не намалява приход', g.revenue === 450);
}

{
  const agg = L.bdsAggregateCrm([lead({ createdDate: '' })]);
  check('заявка без дата не влиза в маркетинга', Object.keys(agg).length === 0);
}

/* ============================================================
   2. Привързване към канал и кампания
   ============================================================ */
G('Привързване');

{
  const rows = rebuild([], [
    lead({ leadId: 'A', sourceCategory: 'google_ads' }),
    lead({ leadId: 'B', sourceCategory: 'organic_google', campaign: '' }),
    lead({ leadId: 'C', sourceCategory: '', campaign: '' })
  ], []);
  check('google_ads → Google Ads', !!rowFor(rows, '2026-08-20', 'Google Ads'));
  check('organic_google → Organic Google', !!rowFor(rows, '2026-08-20', 'Organic Google'));
  check('без източник → Direct', !!rowFor(rows, '2026-08-20', 'Direct'));
  check('органичната заявка не измисля кампания',
    rowFor(rows, '2026-08-20', 'Organic Google')[I.campaign] === '');
}

{
  /* utm_campaign съвпада с името на кампанията в рекламния акаунт —
     връзката трябва да стане сама, без ръчна таблица. */
  const rows = rebuild([], [lead({ leadId: 'A' })],
    [adRow({ spend: 12, impressions: 900, clicks: 40 })]);
  const r = rowFor(rows, '2026-08-20', 'Google Ads');
  check('заявката се лепва за реда с разход, не прави втори ред', rows.length === 1);
  check('Campaign ID идва от рекламните данни', r[I.campaignId] === '22112233');
  check('разходът и заявката са на един ред', r[I.spend] === 12 && r[I.leads] === 1);
}

{
  /* Различно utm име — тогава решава ръчното съответствие в Config. */
  const rows = rebuild([],
    [lead({ leadId: 'A', campaign: 'restoranti_avgust' })],
    [adRow({ spend: 10, impressions: 500, clicks: 20 })],
    { restoranti_avgust: '22112233' });
  check('ръчното съответствие от Config се прилага', rows.length === 1 &&
    rows[0][I.campaignId] === '22112233' && rows[0][I.leads] === 1);
}

{
  const rows = rebuild([],
    [lead({ leadId: 'A', campaign: 'непозната_кампания' })],
    [adRow({ spend: 10, impressions: 500, clicks: 20 })]);
  check('непозната кампания НЕ се лепва наслуки за чужд Campaign ID',
    rows.length === 2);
  const orphan = rows.find(r => r[I.campaignId] === '');
  check('тя остава с името си и без измислен ID',
    orphan[I.campaign] === 'непозната_кампания' && orphan[I.leads] === 1);
}

/* ============================================================
   3. Идемпотентност — сърцевината
   ============================================================ */
G('Второ пускане не удвоява нищо');

{
  const leads = [
    lead({ leadId: 'A', status: 'Won', dealValue: 450 }),
    lead({ leadId: 'B' })
  ];
  const ads = [adRow({ spend: 30, impressions: 2000, clicks: 80 })];

  const first = rebuild([], leads, ads);
  const second = rebuild(first, leads, ads);
  const third = rebuild(second, leads, ads);

  check('първо пускане дава един ред', first.length === 1);
  check('второто пускане дава същата таблица',
    JSON.stringify(second) === JSON.stringify(first));
  check('третото също', JSON.stringify(third) === JSON.stringify(first));

  const r = third[0];
  check('клиентите остават 1, не стават 2', r[I.clients] === 1);
  check('приходът остава 450, не 900', r[I.revenue] === 450);
  check('заявките остават 2', r[I.leads] === 2);
  check('разходът не се натрупва', r[I.spend] === 30);

  check('CAC = 30 / 1', near(L.bdsCac(r[I.spend], r[I.clients]), 30));
  check('ROAS = 450 / 30 = 15', near(L.bdsRoas(r[I.revenue], r[I.spend]), 15));
  check('CPL = 30 / 2 = 15', near(L.bdsCpl(r[I.spend], r[I.leads]), 15));
  check('Marketing Contribution = 450 − 30 = 420',
    L.bdsMarketingContribution(r[I.revenue], r[I.spend]) === 420);
}

/* ============================================================
   4. Премахване на заявка — следата трябва да изчезне
   ============================================================ */
G('Изтрита заявка изчезва и от тракера');

{
  const qa = lead({ leadId: 'QA', status: 'Won', dealValue: 999 });
  const withQa = rebuild([], [qa], []);
  check('тестовата заявка се вижда',
    withQa.length === 1 && withQa[0][I.revenue] === 999);

  const without = rebuild(withQa, [], []);
  check('след изтриване редът си отива изцяло', without.length === 0);
}

{
  /* Същото, но редът има и рекламен разход — тогава редът ОСТАВА,
     защото разходът е бил реален; изчистват се само CRM числата. */
  const qa = lead({ leadId: 'QA', status: 'Won', dealValue: 999 });
  const ads = [adRow({ spend: 25, impressions: 1000, clicks: 40 })];
  const withQa = rebuild([], [qa], ads);
  const without = rebuild(withQa, [], ads);
  check('редът с разход остава', without.length === 1);
  check('приходът пада на нула', without[0][I.revenue] === 0);
  check('клиентите падат на нула', without[0][I.clients] === 0);
  check('заявките падат на нула', without[0][I.leads] === 0);
  check('разходът остава непокътнат', without[0][I.spend] === 25);
  /* Разход без приход е ROAS 0 — това е измерен, лош резултат.
     Различно е от липса на разход, където ROAS няма стойност. */
  check('ROAS пада на 0 — разход без приход', L.bdsRoas(0, 25) === 0);
  check('без разход ROAS няма стойност', L.bdsRoas(0, 0) === '');
}

/* ============================================================
   5. Рекламните данни не се трият отдалеч
   ============================================================ */
G('Частичен внос не изтрива стар разход');

{
  const oldAds = [adRow({ date: '2026-08-01', spend: 40, impressions: 3000, clicks: 120 })];
  const base = rebuild([], [], oldAds);
  check('старият ден е записан', base.length === 1 && base[0][I.spend] === 40);

  /* Следващият внос носи само последните дни — 1 август не е в него. */
  const newAds = [adRow({ date: '2026-08-20', spend: 15, impressions: 800, clicks: 30 })];
  const after = rebuild(base, [], newAds);
  const first = rowFor(after, '2026-08-01', 'Google Ads');
  check('старият разход оцелява', !!first && first[I.spend] === 40);
  check('новият ден се добавя', !!rowFor(after, '2026-08-20', 'Google Ads'));
  check('общо два дни', after.length === 2);
}

{
  /* Рекламната платформа коригира вчерашния разход надолу. */
  const day1 = rebuild([], [], [adRow({ spend: 20, impressions: 1000, clicks: 50 })]);
  const day2 = rebuild(day1, [], [adRow({ spend: 18.4, impressions: 1010, clicks: 49 })]);
  check('корекцията се прилага, не се сумира',
    day2.length === 1 && near(day2[0][I.spend], 18.4));
}

/* ============================================================
   6. Ръчна бележка не се губи
   ============================================================ */
G('Ръчните бележки оцеляват');

{
  const ads = [adRow({ spend: 10, impressions: 500, clicks: 20 })];
  const rows = rebuild([], [], ads);
  rows[0][I.notes] = 'тестов период, само първи ден';
  const after = rebuild(rows, [], ads);
  check('бележката остава', after[0][I.notes] === 'тестов период, само първи ден');
}

/* ============================================================
   7. Пълното QA пътуване, както е описано в командата
   ============================================================ */
G('QA пътуване: заявка → Qualified → Won → тракер → изчистване');

{
  const CAMPAIGN = 'restaurant_search_bg';
  const CAMPAIGN_ID = '22112233';
  const DATE = '2026-08-20';
  const ads = [adRow({ date: DATE, campaignId: CAMPAIGN_ID, campaign: CAMPAIGN, spend: 36, impressions: 2400, clicks: 96 })];

  let qa = lead({ leadId: 'BDS-2026-QATEST', createdDate: DATE, campaign: CAMPAIGN, status: 'New' });
  let rows = rebuild([], [qa], ads);
  let r = rows[0];
  check('стъпка 1 — заявката влиза с канал и кампания',
    r[I.channel] === 'Google Ads' && r[I.campaignId] === CAMPAIGN_ID && r[I.leads] === 1);
  check('стъпка 1 — още няма клиент и приход', r[I.clients] === 0 && r[I.revenue] === 0);
  check('стъпка 1 — CPL = 36 / 1', near(L.bdsCpl(r[I.spend], r[I.leads]), 36));
  check('стъпка 1 — CAC още не се смята', L.bdsCac(r[I.spend], r[I.clients]) === '');

  qa = Object.assign({}, qa, { status: 'Qualified' });
  rows = rebuild(rows, [qa], ads);
  check('стъпка 2 — Qualified не прави клиент', rows[0][I.clients] === 0);

  qa = Object.assign({}, qa, { status: 'Won', dealValue: 450 });
  rows = rebuild(rows, [qa], ads);
  r = rows[0];
  check('стъпка 3 — Won прави клиент', r[I.clients] === 1);
  check('стъпка 3 — приходът е привързан към кампанията', r[I.revenue] === 450);
  check('стъпка 3 — CAC = 36 / 1', near(L.bdsCac(r[I.spend], r[I.clients]), 36));
  check('стъпка 3 — ROAS = 450 / 36 = 12.5', near(L.bdsRoas(r[I.revenue], r[I.spend]), 12.5));
  check('стъпка 3 — принос = 414', L.bdsMarketingContribution(r[I.revenue], r[I.spend]) === 414);

  const again = rebuild(rows, [qa], ads);
  check('стъпка 4 — повторно преизчисление не удвоява',
    JSON.stringify(again) === JSON.stringify(rows));

  const cleaned = rebuild(again, [], ads);
  check('стъпка 5 — изтритата заявка си отива',
    cleaned[0][I.leads] === 0 && cleaned[0][I.clients] === 0 && cleaned[0][I.revenue] === 0);
  check('стъпка 5 — рекламният разход остава реален', cleaned[0][I.spend] === 36);
}

/* ============================================================
   8. Здраве на заявката — правилата Won/Lost
   ============================================================ */
G('Правила при затваряне');

check('Won без Deal Value се маркира',
  /Deal Value/.test(L.bdsLeadHealth({ status: 'Won', closeDate: '2026-08-20' })));
check('Won без Close Date се маркира',
  /Close Date/.test(L.bdsLeadHealth({ status: 'Won', dealValue: 450 })));
check('пълен Won е чист',
  L.bdsLeadHealth({ status: 'Won', dealValue: 450, closeDate: '2026-08-20' }) === '');
check('Lost без причина се маркира',
  /Lost Reason/.test(L.bdsLeadHealth({ status: 'Lost' })));
check('Lost с причина е чист',
  L.bdsLeadHealth({ status: 'Lost', lostReason: 'избра друг изпълнител' }) === '');
check('отворена заявка без Next Action се маркира',
  /Next Action/.test(L.bdsLeadHealth({ status: 'New' })));
check('New без Follow-up още не е пропуск',
  !/Follow-up/.test(L.bdsLeadHealth({ status: 'New', nextAction: 'Първо обаждане' })));
check('Contacted без Follow-up вече е пропуск',
  /Follow-up/.test(L.bdsLeadHealth({ status: 'Contacted', nextAction: 'обаждане' })));

/* ============================================================
   9. Кодът в таблицата действително прави горното
   ============================================================ */
G('Apps Script кодът е свързан с тази логика');

const marketing = read('tools/crm/Marketing.gs');
const sales = read('tools/crm/Sales.gs');

check('rebuildMarketingFromCrm() съществува', /function rebuildMarketingFromCrm\(/.test(marketing));
check('преизчислява от източника, не увеличава клетки',
  /bdsRebuildMarketingRows\(/.test(marketing) && !/\+=\s*1/.test(marketing));
check('чете и Leads, и Raw Ads',
  /bdsReadLeadsForMarketing_/.test(marketing) && /bdsReadRawAds_/.test(marketing));
check('заключва, за да не се засекат две пускания',
  /LockService/.test(marketing));
check('викачите, които вече държат ключалката, минават без нея',
  /function bdsRebuildMarketingCore_\(/.test(marketing) &&
  /bdsRebuildMarketingCore_\(\);/.test(marketing) &&
  /bdsRebuildMarketingCore_\(\);/.test(read('tools/crm/Code.gs')));
check('не пише в колоните с формули',
  !/setValues\(\s*rows\s*\)/.test(marketing) && /I\.leads \+ 1/.test(marketing));
check('вносът на реклама минава през UPSERT',
  /bdsUpsertRawAds\(/.test(marketing));
check('след внос се преизчислява маркетингът',
  /bdsImportAdsRows[\s\S]*?bdsRebuildMarketingCore_\(\);/.test(marketing));

check('Won слага Client = Да', /v\[iClient\] = 'Да'/.test(sales));
check('Won слага Won\/Lost = Won', /v\[iWonLost\] = 'Won'/.test(sales));
check('Won слага дата на затваряне, ако липсва',
  /if \(!bdsDateKey\(v\[iClose\]\)\) \{ v\[iClose\] = new Date\(\)/.test(sales));
check('Lost слага Client = Не', /v\[iClient\] = 'Не'/.test(sales));
check('Lost изчиства пренесена стойност на сделка',
  /if \(bdsNum\(v\[iDeal\]\) > 0\) \{ v\[iDeal\] = ''/.test(sales));
check('промяна на статус пуска преизчисление',
  /BDS_MARKETING_RELEVANT/.test(sales) && /rebuildMarketingFromCrm\(\)/.test(sales));
check('Health се записва при всяка редакция',
  /applyLeadHealthFromValues_/.test(sales));

process.exit(R.summary() ? 0 : 1);
