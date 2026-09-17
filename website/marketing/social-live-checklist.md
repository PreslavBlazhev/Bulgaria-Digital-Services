# Социални профили — чеклист за живо

**Дата:** 31.08.2026

Профилите **съществуват**. Този файл разделя онова, което е потвърдено,
от онова, което не е проверявано оттук.

| Ниво | Какво значи | Как се доказва |
|---|---|---|
| **EXISTS** | акаунтът съществува | адресът отговаря |
| **LINKED** | свързан с останалото | видимо в Meta / на сайта |
| **BRANDED** | аватар, корица, име | визуална проверка |
| **CONTACT** | сайт, имейл, телефон, бутон | визуална проверка |
| **PUBLISHED** | има публикации | преброяване в профила |
| **ACTIVE** | публикува се редовно | история |

---

## Потвърдено оттук

| Какво | Състояние | Доказателство |
|---|---|---|
| Instagram `@bulgaria_digital_services` | **EXISTS** | адресът връща 200, заглавието е „Bulgaria Digital Services“ |
| Профилът е линкнат от сайта | **LINKED** | подвал, „За нас“, „Контакти“, `sameAs` в двете JSON-LD схеми |
| Facebook Page „Bulgaria Digital Services“ | **EXISTS** | по данни от собственика |
| Meta Business Portfolio | **EXISTS** | по данни от собственика |
| Ad Account „BDS Ads“ `1516967893518549` | **EXISTS** | по данни от собственика |
| Dataset „BDS Website“ `1666581461701404` | **EXISTS · свързан с кода** | `CONFIG.metaPixelId` |
| Корица за Facebook | **готова** | `Facebook photos/Cover/cover.png` 1737×905 |

**Не е проверявано оттук и не се твърди:** брой публикации, дали
профилът е Business, дали Instagram е свързан с Page-а, дали контактните
полета са попълнени, дали има highlights.

---

## Facebook Page

| # | Поле | Стойност | ✓ |
|---|---|---|---|
| 1 | Име | `Bulgaria Digital Services` | |
| 2 | Потребителско име | `@bulgariadigitalservices` или свободното | |
| 3 | Категория | **Web Designer** · втора: Software Company | |
| 4 | Профилна снимка | `assets/img/bds-favicon.png` | |
| 5 | Корица | `Facebook photos/Cover/cover.png` | |
| 6 | Кратко описание | от `social-profile-setup.md` (197 зн.) | |
| 7 | „За нас“ | оттам | |
| 8 | Уебсайт | `https://bulgaria-digital-services.com/?utm_source=facebook&utm_medium=social&utm_campaign=profile` | |
| 9 | Телефон | `+359 877 364 001` | |
| 10 | Имейл | `info@bulgaria-digital-services.com` | |
| 11 | Локация | Варна, България — **град, без адрес** | |
| 12 | Бутон за действие | **„Изпратете съобщение“** | |
| 13 | Instagram свързан | Settings → Linked accounts | |
| 14 | Business Portfolio | Page-ът е вътре в портфолиото | |

## Instagram

| # | Поле | Стойност | ✓ |
|---|---|---|---|
| 1 | Тип акаунт | **Business** (не Creator) | |
| 2 | Име | `Bulgaria Digital Services` | ✅ |
| 3 | Потребителско име | `@bulgaria_digital_services` | ✅ |
| 4 | Аватар | `assets/img/bds-favicon.png` | |
| 5 | Bio | от `social-profile-setup.md` (137 зн.) | |
| 6 | Уебсайт | `https://bulgaria-digital-services.com/?utm_source=instagram&utm_medium=social&utm_campaign=profile` | |
| 7 | Контактни бутони | имейл + телефон | |
| 8 | Facebook Page свързан | **задължително за реклама** | |

---

## Съдържание преди платен трафик

От `social-post-library.md` (12 готови текста) и `social-content-calendar.md`.

| # | Изискване | ✓ |
|---|---|---|
| 1 | **9 публикации** — първият екран в Instagram е 3×3 | |
| 2 | **3 закачени** — № 1 „Кои сме“, № 3 „Pizza Pazzo“, № 12 „Свържете се“ | |
| 3 | Поне 1 case study — № 3 | |
| 4 | Поне 2 демонстрации на сайт/система — № 2, 4, 6, 7 | |
| 5 | Поне 1 ресторантска — № 3, 4, 6, 7 | |
| 6 | Обяснение на цените — № 9 | |
| 7 | Зад кулисите / процес — № 1, 10 | |
| 8 | Преди/след **като процес** — № 8 | |
| 9 | Highlights: Ресторанти · Системи · Сайтове · Проекти · Услуги · Контакт | |
| 10 | Поне 1 reel — R1 или R3 | |

**Нито един пост с резултат на клиент.** Няма измерен резултат и няма
събран отзив — `testimonials` е празен масив. Постът с такова твърдение
не се прави, докато няма какво да се посочи.

---

## UTM за профилните връзки

| Къде | Адрес |
|---|---|
| Instagram bio | `https://bulgaria-digital-services.com/?utm_source=instagram&utm_medium=social&utm_campaign=profile` |
| Facebook уебсайт | `https://bulgaria-digital-services.com/?utm_source=facebook&utm_medium=social&utm_campaign=profile` |
| Ресторантско съдържание | `https://bulgaria-digital-services.com/restaurants?utm_source=instagram&utm_medium=social&utm_campaign=restaurant_content` |

`utm_medium=social` се класифицира като **органичен** `instagram` /
`facebook`. Платеният трафик ползва `paid_social` и става `meta_ads` —
двете не се смесват в тракера.

Без UTM трафикът от профила се брои за `referral` и се губи сред
всичко останало.

> Главната връзка сочи началната страница. Ресторантската се ползва в
> конкретните постове. Не е сменяна автоматично — това е препоръка.

---

## Готовност

| | Състояние |
|---|---|
| Текстове за профилите | ✅ готови |
| 12 публикации | ✅ готови текстове · ❌ непубликувани |
| Материали | ✅ 5 екрана Pizza Pazzo + 8 проекта + корица |
| Профили | ✅ съществуват · останалото е **MANUAL** |
| Платен трафик | ❌ **не преди 9-те публикации** |
