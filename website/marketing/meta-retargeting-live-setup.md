# Meta retargeting — стъпки за живо пускане

**Дата:** 31.08.2026
**Статус:** пикселът е конфигуриран в кода · аудиториите се създават на ръка

> Файлът стои в `marketing/`, не в `docs/marketing/`. Заданието искаше
> второто, но `docs/` не съществува, а `build-dist.mjs` изключва от
> публичния билд точно `marketing/`. Нова папка би останала извън тази
> защита. Всичките 25 вътрешни документа са тук.

---

## Какво вече е налице

| | Стойност | Къде |
|---|---|---|
| Dataset / Pixel | **BDS Website** · `1666581461701404` | `assets/js/bds-tracking.js` → `CONFIG.metaPixelId` |
| Ad Account | **BDS Ads** · `1516967893518549` | този документ · `tools/ads/MetaImport.gs` |
| Business Portfolio | Bulgaria Digital Services | Meta |
| Facebook Page | Bulgaria Digital Services | Meta |
| Instagram | `@bulgaria_digital_services` | линкнат от сайта |

Pixel ID не е тайна — вижда се в кода на всеки сайт с пиксел. Тайна е
**access token-ът**; той не е в проекта и не бива да влиза в него.

---

## Събитията, които кодът праща

Всички минават през `BDSTracking.meta()` и **никое не тръгва без съгласие
за реклама**.

| Събитие | Тип | Кога | Данни |
|---|---|---|---|
| `PageView` | стандартно | всяка страница, след съгласие | няма |
| `RestaurantLandingView` | custom | само `/restaurants` | няма |
| `RestaurantFormStart` | custom | първо **истинско** докосване на формата | няма |
| `Lead` | стандартно | само след потвърден успешен запис | само `eventID` |

`RestaurantFormStart` изисква `event.isTrusted` — фокус, сложен от код
(например при грешка във валидацията), не го задейства. `Lead` носи
`eventID`, за да може Meta да схлупи дублирани събития, ако някой ден
се добави и сървърният Conversions API.

---

## Аудиториите — точни стъпки

**Ads Manager → Audiences → Create audience → Custom Audience → Website**
Източник: **BDS Website** (`1666581461701404`).

### 1. `BDS | Website Visitors | 180d`

| Поле | Стойност |
|---|---|
| Условие | **All website visitors** |
| Retention | **180** дни |
| За какво | най-широката; ползва се само ако по-тесните нямат обем |

### 2. `BDS | Restaurant Visitors | 180d`

| Поле | Стойност |
|---|---|
| Условие | **URL contains** → `/restaurants` |
| Retention | **180** дни |
| За какво | видял е ресторантското предложение и цените |

> Може и по събитие `RestaurantLandingView` — резултатът е същият. По URL
> е по-устойчиво: работи и ако някой ден събитието се преименува.

### 3. `BDS | Restaurant Form Start | 30d`

| Поле | Стойност |
|---|---|
| Условие | **Event** → `RestaurantFormStart` |
| Retention | **30** дни |
| За какво | започнал е да пише и е спрял |

### 4. `BDS | Leads | 180d`

| Поле | Стойност |
|---|---|
| Условие | **Event** → `Lead` |
| Retention | **180** дни |
| За какво | **само за изключване.** Не се таргетира. |

### 5. `BDS | Form Start No Lead | 30d`

| Поле | Стойност |
|---|---|
| Include | **Event** → `RestaurantFormStart`, 30 дни |
| Exclude | **Event** → `Lead`, 180 дни |
| Retention | **30** дни |
| За какво | най-топлата аудитория |

> Прозорецът на изключването (180) нарочно е по-дълъг от този на
> включването (30): клиент, спечелен преди четири месеца, не бива да
> вижда „довършете запитването“.

---

## Кампанията

```
BDS | Retargeting | Restaurants

  Ad set 1: Restaurant Visitors
            INCLUDE  BDS | Restaurant Visitors | 180d
            EXCLUDE  BDS | Leads | 180d

  Ad set 2: Form Starters
            INCLUDE  BDS | Form Start No Lead | 30d
            EXCLUDE  BDS | Leads | 180d
```

Изключването на `Leads` се задава **на ниво ad set**, не в самата
аудитория — така се поддържа на едно място.

Материалите са в `meta-retargeting-creatives.md`.

---

## Проверка с Test Events

**Events Manager → BDS Website → Test Events**, отвори сайта в отделен
раздел и минавай по реда:

| # | Действие | Очаквано |
|---|---|---|
| 1 | Отвори сайта в **инкогнито** | банерът се показва · **нула** заявки към `facebook.net` |
| 2 | Натисни **„Само необходимите“** | пак нула заявки към Meta |
| 3 | Изчисти данните за сайта, презареди, натисни **„Приемам всички“** | `PageView` |
| 4 | Отвори `/restaurants` | `PageView` + **`RestaurantLandingView`** |
| 5 | Щракни в поле от формата и напиши нещо | **`RestaurantFormStart`** — веднъж |
| 6 | Щракни в друго поле | **без** втори `RestaurantFormStart` |
| 7 | Изпрати формата с истински данни | **`Lead`**, с `eventID` |
| 8 | Виж страницата „Благодарим“ | **без** втори `Lead` |
| 9 | Върни се и изпрати пак | Meta схлупва по `eventID` |
| 10 | Подвал → „Настройки за бисквитките“ → изключи „Реклама“ → презареди | **нула** нови събития |

**Провали ли се 1, 2 или 10 — спри и не пускай реклама.** Това е
съгласие, не настройка.

За стъпка 7 ползвай тестови данни и изчисти реда после: в таблицата
меню **BDS → „Изчисти тестови редове“**. Имейл в зона `.invalid` се
разпознава като тестов автоматично.

---

## Domain verification и Aggregated Event Measurement

**Business Settings → Brand Safety → Domains → Add** →
`bulgaria-digital-services.com`

Три начина: DNS TXT запис, HTML файл или meta таг. **Мета тагът се
добавя чак когато Meta даде реалния token** — произволен таг не се
измисля и не се комитва.

Препоръчаният начин тук е **DNS TXT**: не изисква промяна по кода и не
се губи при следващ деплой.

След верификацията: **Events Manager → Aggregated Event Measurement →
Configure Web Events** и подреди по приоритет:

```
1. Lead
2. RestaurantFormStart
3. RestaurantLandingView
4. PageView
```

Има значение само за посетители с iOS 14.5+, но подредбата се задава
веднъж и се забравя.

---

## Състояние

| | |
|---|---|
| Pixel в кода | ✅ конфигуриран |
| Събития | ✅ четирите, тествани |
| Съгласие | ✅ Meta не тръгва без него — тествано |
| Аудитории в Meta | ❌ **MANUAL** — създават се в UI |
| Domain verification | ❌ **MANUAL** |
| Проверка с Test Events | ❌ **MANUAL** — иска реален браузър |
| Conversions API | не е внедрен · `eventID` вече го подготвя |
