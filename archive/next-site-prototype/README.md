# BDS — Bulgaria Digital Services

**Digital infrastructure for ambitious businesses.**

The BDS digital platform: a production multipage website with four working
interactive systems built in. The site is the reference implementation of the
work BDS sells — it is engineered the same way client projects are, not
described in a brochure.

---

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 16 (App Router, Turbopack) | Server rendering for content, real interactivity where it earns its place |
| Language | TypeScript 6, `strict` + `noUncheckedIndexedAccess` | Shape mismatches become build failures |
| UI | React 19 | Interactive surfaces are state problems |
| Styling | Tailwind CSS 4 (CSS-first `@theme`) | Design tokens in one file, no growing stylesheet |
| Motion | CSS keyframes + `framer-motion` (available) | Most motion here is CSS; no JS for what CSS does |
| Icons | `lucide-react` | Consistent, tree-shaken |
| Forms | `react-hook-form` + `zod` | One schema validates on client and server |
| Analytics | GA4 + Consent Mode v2 | Consent changes collection, not just the banner |

No CSS-in-JS runtime, no component library, no state manager. Everything in
`components/ui` is written for this project.

---

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in what you need
npm run dev                  # http://localhost:3000
```

### Scripts

| Command | Does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint (flat config, `next/core-web-vitals` + `next/typescript`) |
| `npm run lint:fix` | ESLint with autofix |
| `npm run typecheck` | `tsc --noEmit` |

> `next lint` was removed in Next.js 16 — `npm run lint` calls `eslint` directly.

---

## Environment variables

All optional. The app degrades honestly when they are unset rather than
pretending to work.

| Variable | Effect when unset |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Falls back to `http://localhost:3000` for canonical URLs, Open Graph, sitemap and robots |
| `NEXT_PUBLIC_GA_ID` | **No analytics script is injected at all.** Events log to the console in development |
| `AI_API_KEY` | `/consultant` runs on the built-in deterministic rule engine |
| `CONTACT_INBOX_EMAIL` | `/api/contact` validates and logs the enquiry, and the UI says it was recorded but **not** transmitted |

Never prefix a server secret with `NEXT_PUBLIC_`.

---

## Structure

```
app/                      Routes (App Router)
  api/contact/            Enquiry intake — validates with the shared schema
  solutions/[slug]/       Six solution detail pages
  work/[slug]/            Case studies
  insights/[slug]/        Articles
  build/  consultant/     Interactive systems
  client/ status/
  privacy/ cookies/ terms/
  opengraph-image.tsx     Generated social card
  sitemap.ts  robots.ts   Generated from the same data the pages use

components/
  ui/                     Primitives: Button, Card, Tabs, Modal, Toast, …
  layout/                 Header, Footer, Logo, Analytics, CookieConsent
  sections/               Page-level compositions
  interactive/            The four systems + the architecture graph
  case-studies/           Case-study-specific pieces
  seo/                    JSON-LD emitter

data/                     All content, typed against `types/`
hooks/                    useMediaQuery, usePersistentState, useHandoff
lib/                      Engines, site config, metadata, analytics, schema
types/                    Shared domain types
```

**Content is data, not JSX.** Adding a case study means adding an object to
`data/projects.ts`; the route, sitemap entry, command palette entry and
solution cross-links follow automatically.

---

## The interactive systems

### 1. Solution Architect — `/build`
Five steps, then a **generated** architecture. `lib/builder-engine.ts` maps the
answers to modules, each module contributes nodes and edges, and the graph is
laid out from those. It is not a set of prebuilt diagrams.

### 2. Live Project Simulator — `/build` (after step 5)
Toggling a module re-runs the engine: components, connections and the
complexity score all change. Modules required by the project type cannot be
removed.

### 3. AI Project Consultant — `/consultant`
A qualification conversation that produces a structured project brief.
Currently a deterministic rule engine behind the `ConsultantEngine` interface,
so the same answers always give the same brief. A model-backed implementation
drops in behind that interface without touching the UI.

### 4. Client Portal — `/client`
An unauthenticated demonstration of BDS delivery: progress by workstream,
milestones, blocked items, approvals, infrastructure. All data lives in
`data/client-demo.ts` so real records replace one import.

Both `/build` and `/consultant` hand their output to `/contact` through
`lib/handoff.ts` (sessionStorage, not URL parameters — a project summary does
not belong in a query string or a referrer header).

---

## Architecture graph

`components/interactive/ArchitectureGraph.tsx` measures node positions from the
DOM and draws SVG elbow connectors between them, re-measuring on resize. No
hardcoded coordinates, so it survives long labels and font changes.

Below `lg` it becomes a vertical stack rather than a scaled-down diagram — a
node graph shrunk to 360px is not a diagram, it is a smudge.

---

## Conventions worth knowing

- **No setState in effects.** Browser-only state is read through
  `useSyncExternalStore` (`lib/browser-store.ts`, `hooks/useMediaQuery.ts`), and
  state derived from a prop change is adjusted during render.
- **`cn()` is not `tailwind-merge`.** Put layout and visibility on a wrapper
  rather than overriding a component's base display class — see the note in
  `lib/cn.ts`.
- **Every claim is sourced.** `ProjectMetric` carries a `source` field, and it
  is rendered. If a number cannot be traced to a delivered system, it does not
  ship.
- **No testimonials.** None have been formally collected, so the site says so.

---

## Accessibility

Semantic landmarks, a skip link, visible focus rings, keyboard-operable tabs
(arrows / Home / End), a focus-trapping modal, real checkboxes behind the
custom multi-select, `aria-describedby` wiring on every field, and
`prefers-reduced-motion` honoured through a media-query hook rather than CSS
alone.

---

## Deployment

Static except `/api/contact`. Works on any Node host; Vercel needs no
configuration. Set `NEXT_PUBLIC_SITE_URL` to the production origin so canonical
URLs, Open Graph and the sitemap are correct.

```bash
npm run build && npm run start
```

---

## Known gaps

See `PROJECT.md` for the full list. Short version: the logo is a placeholder,
company registration details in the legal pages are explicit TODOs, contact
delivery needs a provider, and `/status` reports a demo state.
