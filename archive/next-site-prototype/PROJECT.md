# PROJECT.md — BDS platform state

Working document. What is built, what is deliberately unfinished, and what
needs a decision or an asset from the owner.

---

## 1. Routes

| Route | Type | Notes |
|---|---|---|
| `/` | Static | Hero network, problem→ecosystem, solutions, featured work, platform, build system, CTA |
| `/solutions` | Static | Overview + scoping principles |
| `/solutions/[slug]` | SSG × 6 | websites, commerce, business-systems, automation, analytics, restaurant-technology |
| `/work` | Static | Case study index |
| `/work/[slug]` | SSG × 2 | pizza-pazzo, makeup-by-denitsa |
| `/technology` | Static | Interactive stack explorer |
| `/process` | Static | Scroll-driven seven-stage build system |
| `/about` | Static | Positioning, evolution, operating principles |
| `/insights` | Static | Article index |
| `/insights/[slug]` | SSG × 5 | Long-form articles |
| `/contact` | Static | Intelligent enquiry form + tool handoff |
| `/build` | Static | Solution Architect + live simulator |
| `/consultant` | Static | AI Project Consultant |
| `/client` | Static | Client portal demo |
| `/status` | Static | Systems status |
| `/privacy` `/cookies` `/terms` | Static | Legal, with review markers |
| `/api/contact` | Dynamic | Enquiry intake |
| `sitemap.xml` `robots.txt` `icon.svg` `opengraph-image` | Generated | |

**35 prerendered pages.**

---

## 2. Requires owner input

### 2.1 Brand asset — placeholder in use
The logo is an SVG placeholder built from the stated concept (horizontal
ellipse, BDS as focus, full name beneath). It is drawn in code, not designed.

Replace in **two** places, which are the only references:
- `components/layout/Logo.tsx` — `LogoMark`
- `app/icon.svg` — favicon

`app/opengraph-image.tsx` draws its own version of the mark inline and should
be updated at the same time.

### 2.2 Company registration data — deliberately blank
`data/legal.ts` contains explicit `TODO(legal)` markers where the registered
name, ЕИК, VAT number and address belong. These were **not** invented. The
legal pages render those markers visibly, and sections needing a lawyer are
badged "Needs review" on the page itself.

### 2.3 Production domain
`NEXT_PUBLIC_SITE_URL` is unset, so canonical URLs, Open Graph and the sitemap
currently point at `localhost:3000`. This must be set before any deployment or
the SEO metadata is wrong everywhere.

### 2.4 Contact delivery
`/api/contact` validates, rate-limits and logs, but does not send email. The
UI is honest about it: with `CONTACT_INBOX_EMAIL` unset, the success screen
says the enquiry was recorded but **not** transmitted, and shows the direct
email address. Wire a provider at the marked `TODO(delivery)`.

### 2.5 GA4 measurement ID
`NEXT_PUBLIC_GA_ID` is unset, so no analytics script loads at all. The event
schema is already defined and typed in `lib/analytics.ts`.

### 2.6 AI provider (optional)
`/consultant` runs on a deterministic rule engine. `AI_API_KEY` is reserved;
`getConsultantEngine()` in `lib/consultant-engine.ts` is the single swap point.

### 2.7 Project screenshots
Case study interfaces are DOM/CSS constructions in
`components/case-studies/ScreenMock.tsx`, marked `REPLACEABLE`. They are sharp
at any size and cannot go stale, so replacing them with real screenshots is
optional rather than pending.

---

## 3. Content decisions taken

- **No testimonials.** None have been formally collected and approved, so the
  section does not exist. `/work` states this explicitly rather than leaving a
  gap the reader has to interpret.
- **No pricing.** No number is generated anywhere. The builder reports
  "Custom scope required" and complexity as a relative band.
- **Every metric is sourced.** `ProjectMetric.source` is rendered on the page.
- **Trade-offs are published.** Each engineering decision on a case study shows
  what it cost, not only what it bought.
- **Makeup by Denitsa is marked "In development"**, not delivered.
- **Technologies not yet shipped are labelled as such** on `/technology`
  instead of being padded into the "used in" list.

---

## 4. Verification performed

| Check | Result |
|---|---|
| `npm run typecheck` | Pass — no errors |
| `npm run lint` | Pass — no errors, no warnings |
| `npm run build` | Pass — 35 pages prerendered |
| Route status sweep (27 routes) | All 200; unknown route correctly 404 |
| Internal link crawl | 28 unique links, 0 broken |
| Responsive sweep | 105 page × viewport combinations at 360 / 390 / 820 / 1440 / 1920 |
| Horizontal overflow | 0 |
| Console errors and warnings | 0 |
| `<h1>` per page | Exactly 1 everywhere |

### Bugs found and fixed during QA
1. **Horizontal scroll on case study pages at mobile widths.** The implicit
   single grid column sized to `max-content`, letting the sticky section rail
   widen the page to 577px on a 390px screen. Fixed with an explicit
   `grid-cols-1` (`minmax(0,1fr)`) plus `min-w-0`.
2. **Header CTA visible on mobile despite `hidden sm:inline-flex`.** The
   button's own `inline-flex` base class and the passed `hidden` are equal
   specificity, so stylesheet order decided the winner. Visibility moved to a
   wrapper; the constraint is now documented in `lib/cn.ts`.
3. **4px tap target** on the builder's step indicators. The button now has a
   padded 20px hit area with a 4px visual bar.
4. **`beforeInteractive` script outside `_document`.** Consent defaults and the
   GA tag were merged into one `afterInteractive` script that injects the tag
   itself, preserving ordering without the invalid strategy.
5. **setState-in-effect across nine components.** Replaced with
   `useSyncExternalStore` for browser storage and media queries, and with
   render-phase state adjustment for prop-derived resets.

### Remaining advisory items (not defects)
Footer and breadcrumb text links are 17–20px tall. Vertical pitch is ≥ 24px
via `gap`, so WCAG 2.5.8 is satisfied through the spacing exception. Worth
revisiting if the footer is ever redesigned.

---

## 5. Not built (out of scope for this pass)

- Real authentication for `/client` — the data layer is isolated in
  `data/client-demo.ts` so this is an integration, not a rebuild.
- A database. No persistence is needed yet; `lib/` boundaries assume one later.
- A CMS. Content is typed data files, which is cheaper to operate at this size.
- Bulgarian localisation of this site. The client work is bilingual; this
  platform is English-only by decision.
- Automated tests. The engines in `lib/builder-engine.ts` and
  `lib/consultant-engine.ts` are pure functions written to be testable.
