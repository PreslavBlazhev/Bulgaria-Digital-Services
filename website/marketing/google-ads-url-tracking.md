# Проследяване на адресите — Google Ads → CRM

**Дата:** 31.08.2026 · **Състояние:** `PREPARED` — няма рекламен акаунт.

---

## Препоръка

**Final URL**

```
https://bulgaria-digital-services.com/restaurants
```

**Final URL suffix** — на ниво кампания:

```
utm_source=google&utm_medium=cpc&utm_campaign={campaignid}&utm_content={creative}&utm_term={keyword}
```

**Auto-tagging: включено.** То добавя `gclid` самò и не се дублира с
горното.

### Suffix, а не tracking template

Tracking template пренасочва адреса и се чупи тихо при грешка. Final URL
suffix само добавя параметри към адреса, който така или иначе се отваря.
При една кампания без външна проследяваща система вторият вариант няма
предимство, а има начин да падне.

---

## Защо `{campaignid}`, а не име

`{campaignid}` е число и **преживява преименуване** на кампанията. Име,
записано в utm, замръзва в CRM-а такова, каквото е било в деня на клика;
след преименуване старите заявки сочат към кампания, която вече не се
казва така.

Това наложи една промяна в кода. Разрешаването на кампания в
`bdsCampaignIdResolver` (`tools/crm/Logic.gs`) досега търсеше по **име**:

```
utm_campaign=BDS | Search | Restaurants | BG   →   Campaign ID 22112233   ✅
utm_campaign=22112233                          →   ''                     ❌
```

Второто е точно това, което Google подава. Без поправката заявката
увисваше на отделен ред в `Marketing Daily` — с 0 разход срещу нея, а
разходът стоеше на съседния ред. CPL и CAC щяха да са грешни и за двата.

Сега резолверът приема и числов `utm_campaign`, ако вече е виждал такъв
Campaign ID в рекламните данни. Покрито от
`tools/test-marketing-pipeline.mjs` → „числов {campaignid} се разпознава
директно“.

---

## Как изглежда пътят

**Кликът:**

```
https://bulgaria-digital-services.com/restaurants
  ?utm_source=google
  &utm_medium=cpc
  &utm_campaign=22112233
  &utm_content=987654321
  &utm_term=сайт+за+ресторант
  &gclid=Cj0KCQ...
```

**Класификаторът** (`classify()` в `assets/js/app.js`):

| Вход | Резултат |
|---|---|
| `gclid` присъства | `source_category = google_ads` |
| `utm_source=google` + `utm_medium=cpc` | същото, и без gclid |

`cpc` е в списъка `PAID_SEARCH` — платеното търсене не се обърква с
органичното.

**Запазването:** `first touch` се записва при първото посещение и **не се
презаписва** при по-късно директно връщане. `latest touch` се обновява.
И двете влизат в CRM записа.

**CRM редът** (`лист Leads`):

| Колона | Стойност |
|---|---|
| `Source Category` | `google_ads` |
| `Source` / `Medium` | `google` / `cpc` |
| `Campaign` | `22112233` |
| `Content` / `Term` | `987654321` / `сайт за ресторант` |
| `GCLID` | пълният низ |
| `First Source Category` … | първото докосване, отделно |

**Тракерът:** `rebuildMarketingFromCrm()` групира по
`Дата + Канал + Campaign ID`. Заявката и разходът от Google Ads Script
попадат на **един и същи ред** — оттам излизат CPL, CAC и ROAS.

---

## Какво да не се прави

| Не | Защо |
|---|---|
| ръчни utm в Final URL | дублират suffix-а и се получават два `utm_source` |
| изключване на auto-tagging | губи се `gclid`, а с него и вносът на конверсии |
| `{lpurl}` в suffix | мястото му е в tracking template, не тук |
| различни utm на sitelink | наследяват кампанийния suffix; ръчните ги разсинхронизират |
| `utm_medium=ppc` или `paid` | `PAID_SEARCH` очаква `cpc`; друго пада в `other` |

---

## Проверка след пускане

1. Кликни собствената си реклама веднъж.
2. Виж адресната лента — трябва да има петте utm + `gclid`.
3. Попълни формата с тестови данни.
4. В `лист Leads`: `Source Category = google_ads`, `Campaign` = числото.
5. След първия внос от Google Ads Script: заявката и разходът да са на
   един ред в `Marketing Daily`.
6. Изчисти тестовия ред: меню **BDS → „Изчисти тестови редове“**.

---

## Състояние

| | |
|---|---|
| Suffix | ✅ определен |
| Съвместимост с класификатора | ✅ проверена в кода |
| Разрешаване на числов campaignid | ✅ поправено и тествано |
| Въведено в Google Ads | ❌ **BLOCKED — EXTERNAL ACCOUNT** |
