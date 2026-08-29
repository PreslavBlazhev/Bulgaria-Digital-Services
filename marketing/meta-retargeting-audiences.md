# Meta аудитории — оперативна спецификация

**Дата:** 29.08.2026 (Phase 21)
**Състояние:** `PREPARED — EXTERNAL CREATION BLOCKED`

Няма Meta Business портфолио, няма рекламен акаунт, няма Dataset/Pixel.
Затова **нито една от тези аудитории не съществува в Meta.** Тук е
описано какво точно да се създаде и с кои събития — за деня, в който
акаунтът се появи.

Стратегическият контекст е в `meta-retargeting-plan.md`. Този файл е
операционният: имена, събития, прозорци, стъпки.

---

## Събитията, на които стъпват

Всички идват от `assets/js/app.js`, през `BDSTracking.meta()`.
Проверяват се от `node tools/test-meta-retargeting.mjs`.

| Събитие | Тип | Кога | Носи ли данни |
|---|---|---|---|
| `PageView` | стандартно | всяка страница, след рекламно съгласие | не |
| `RestaurantLandingView` | custom | само `/restaurants` | не |
| `RestaurantFormStart` | custom | първо истинско докосване на формата | не |
| `Lead` | стандартно | само след потвърдено успешно изпращане | само `eventID` |

Нито едно събитие не носи име, телефон, имейл или име на заведение.
Аудиториите се строят от **факта**, че събитието се е случило.

---

## Аудиториите

### 1. `BDS | All Website Visitors | 30d`

| | |
|---|---|
| INCLUDE | `PageView` |
| EXCLUDE | `Lead` |
| Прозорец | **30 дни** |
| За какво | най-широката. Ползва се само ако по-тесните са твърде малки за доставка. |
| Изисква | Meta Dataset/Pixel |

### 2. `BDS | Restaurant Landing Visitors | 30d`

| | |
|---|---|
| INCLUDE | `RestaurantLandingView` |
| EXCLUDE | `Lead` |
| Прозорец | **30 дни** |
| За какво | **основната retargeting аудитория.** Човекът е стигнал до ресторантското предложение и си е тръгнал. |
| Изисква | Meta Dataset/Pixel |

### 3. `BDS | Restaurant Form Starters — No Lead | 14d`

| | |
|---|---|
| INCLUDE | `RestaurantFormStart` |
| EXCLUDE | `Lead` |
| Прозорец | **14 дни** |
| За какво | най-топлата аудитория. Започнал е да пише и е спрял. |
| Изисква | Meta Dataset/Pixel |

### 4. `BDS | Leads | 180d`

| | |
|---|---|
| INCLUDE | `Lead` |
| EXCLUDE | — |
| Прозорец | **180 дни** |
| За какво | **само за изключване.** Не се таргетира. |
| Изисква | Meta Dataset/Pixel |

---

## Защо тези прозорци

| Аудитория | Прозорец | Причина |
|---|---|---|
| Visitors | 30 дни | Решението за сайт на заведение узрява седмици, не часове. Под 30 дни аудиторията няма да е достатъчна за доставка при този трафик. |
| Landing Visitors | 30 дни | Същото, плюс: тези хора вече са видели цените. |
| Form Starters | **14 дни** | Прекъснатата форма е горещо, но бързо изстиващо намерение. След две седмици напомнянето вече не е напомняне, а нова реклама на човек, който е решил друго. |
| Leads | **180 дни** | Изключването трябва да преживее целия цикъл: разговор, оферта, изработка. Клиент, който получава реклама „получи оферта“, докато му правим сайта, е по-лош от пропуснат клик. |

Един прозорец е нарочно различен от препоръчаното: няма такъв случай —
30 / 30 / 14 / 180 са точно предложените.

---

## Как се комбинират

```
Restaurant Form Starters — No Lead   (14d)   ← започни оттук
   INCLUDE  RestaurantFormStart
   EXCLUDE  Lead

Restaurant Landing Visitors          (30d)   ← основната
   INCLUDE  RestaurantLandingView
   EXCLUDE  Lead

All Website Visitors                 (30d)   ← само при нужда от обем
   INCLUDE  PageView
   EXCLUDE  Lead
```

**Изключването на `Lead` е задължително и в трите.** Не е оптимизация —
то е разликата между напомняне и досаждане на вече спечелен клиент.

Аудитории 2 и 3 се застъпват: всеки, който е започнал формата, е видял
и страницата. Ако вървят едновременно в един и същ период, се изключват
взаимно на ниво ad set, за да не наддават една срещу друга.

---

## Точни стъпки в Meta — за деня, в който има акаунт

Терминологията на Meta се мени. Ако някой етикет не съвпада, търси по
смисъл: **Audiences → Custom Audience → Website**.

### Преди всичко

1. **Meta Business** → `business.facebook.com` → създай портфолио.
2. Свържи **Facebook страница** на BDS.
3. **Ad Account** → Business settings → Accounts → Ad accounts → Add.
4. **Dataset (Pixel)** → Events Manager → **Connect data source** →
   **Web** → име: `BDS Website`.
5. Копирай **Dataset ID** (числов) — това е Pixel ID.
6. Сложи го в `assets/js/bds-tracking.js` → `CONFIG.metaPixelId`.
   Единственото място; никъде другаде не се пише.
7. Провери с **Meta Pixel Helper** на `/restaurants`, **след като
   приемеш рекламните бисквитки** в банера. Без съгласие Pixel-ът
   нарочно не се зарежда — това не е грешка.

### За всяка аудитория

**Ads Manager → Audiences → Create audience → Custom Audience → Website**

| Поле | Стойност |
|---|---|
| Source | `BDS Website` (Dataset-ът от стъпка 4) |
| Events | събитието от таблицата по-долу |
| Retention | прозорецът от таблицата |
| Name | точното име от таблицата |

| Име | Include event | Retention |
|---|---|---|
| `BDS \| All Website Visitors \| 30d` | `PageView` | 30 |
| `BDS \| Restaurant Landing Visitors \| 30d` | `RestaurantLandingView` | 30 |
| `BDS \| Restaurant Form Starters — No Lead \| 14d` | `RestaurantFormStart` | 14 |
| `BDS \| Leads \| 180d` | `Lead` | 180 |

**Изключването на `Lead`** се задава на **ниво ad set**, не в самата
аудитория: Ad set → Audience → **Exclude** → `BDS | Leads | 180d`.
Така едно изключване се поддържа на едно място.

> Custom Audience по събитие се пълни **само занапред**. В деня на
> създаването е празна и остава такава, докато няма трафик със
> съгласие. Това не е счупено.

---

## Стартова структура на кампанията

```
Campaign:  BDS | Retargeting | Restaurants
           Objective: Leads (или Traffic при много малка аудитория)

  Ad set 1:  Restaurant Visitors 30d
             INCLUDE  BDS | Restaurant Landing Visitors | 30d
             EXCLUDE  BDS | Leads | 180d

  Ad set 2:  Form Starters 14d
             INCLUDE  BDS | Restaurant Form Starters — No Lead | 14d
             EXCLUDE  BDS | Leads | 180d
```

Два ad set-а, не повече. При аудитория от няколкостотин души всяко
допълнително разделяне само разкъсва бюджета.

**Очаквай малки аудитории в началото.** Възможно е Meta да откаже
доставка, докато аудиторията не набере обем. Тогава: изчакай трафик,
не разширявай прозорците изкуствено.

Тук не се обещава доставка, честота или резултат — няма на какво да
стъпи такова обещание.

### UTM за връщащия се трафик

```
utm_source=meta
utm_medium=paid_social
utm_campaign=retargeting_restaurants
utm_content=<име на creative-а>
```

`meta` + `paid_social` се разпознават от класификатора в `app.js` и
влизат в CRM-а като `meta_ads` — същата таксономия, която ползва и
`Marketing Daily`.

---

## Състояние

| | |
|---|---|
| Дефинициите | ✅ готови |
| Събитията в кода | ✅ реализирани и тествани |
| Meta Business портфолио | ❌ няма |
| Ad Account | ❌ няма |
| Dataset / Pixel | ❌ няма |
| Аудитории в Meta | ❌ **не са създадени** |

`PREPARED — EXTERNAL CREATION BLOCKED`
