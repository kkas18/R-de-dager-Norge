# Revisjon: Røde dager v1.7.0

**Scope:** `index.html`, `sw.js`, `manifest.json`, `icons/`, `tools/`, `.claude/settings.json`
**Date:** 2026-09-27
**Goal:** Find what marks this app as AI-generated ("AI slop"), list real defects,
and plan the path to a professional, elegant product.

> **Status (v2.0.0):** Every phase below is implemented. See §8 for how
> each finding was resolved and which tests guard it.

---

## 1. Verdict

The core of the app is solid. The holiday math is correct: Easter via Meeus
matched 8 reference years from 1818 to 2285, and ISO week numbers matched every
edge case tested. The palette is restrained, and there are no gradients, emoji
or glassmorphism clichés. **This is above-average AI output.**

What gives it away is not *one* ugly screen. It is the **absence of decisions**:

- Every block is the same bordered, shadowed, rounded card.
- Every section has the same grey 13 px label.
- Every control carries a paragraph explaining it.
- Features have been added instead of chosen.
- The CSS has 17 font sizes and 11 corner radii instead of a system.

A professional designer's hand would show in what was *left out*.

It also has **10+ real bugs**, including two that lose or corrupt user data
and one XSS vector. Fix those before any polish (see §3).

| Area | Grade | One-line reason |
|---|---|---|
| Domain logic (dates, holidays) | **A-** | Correct and well sourced. One capitalization bug. |
| Visual design | **C+** | Tasteful palette, but no system: card soup, ad-hoc sizes. |
| Information architecture | **C** | 6 tabs, two of them showing the same data. |
| Copy (Norwegian) | **B-** | Correct but over-explains. One false promise. |
| Accessibility | **C-** | Contrast failures, focus leaks, small targets. |
| Code quality | **C** | One 1,600-line file, `innerHTML` concatenation, duplicated logic, no tests. |
| Robustness / PWA | **C** | Offline cache can be poisoned, duplicate notifications, restore loses data. |

---

## 2. AI-slop audit: the tells, with evidence

### 2.1 Visual design

| Tell | Evidence | Why it reads as generated |
|---|---|---|
| **Card soup** | `.hero`, `.list`, `.stat`, `.cal`, `.card`, `.plan`, `.prose`, `.evcard`, `.linkbtn` and `.search` all use `background:var(--card); border:1px solid var(--line); box-shadow:var(--shadow); border-radius:…` | When everything is a card, nothing has priority. The Kontakter tab puts *each letter group* in its own card (see `dark-kontakter.png`). |
| **No type scale** | 17 distinct sizes: 10, 11, 11.5, 12.5, 13, 14, 14.5, 15, 15.5, 16, 19, 22, 24, 26, 28, 30, 76 px | Half-pixel steps (11.5, 14.5, 15.5) are local tweaks, not a scale. |
| **No radius scale** | 11 radii: 2, 8, 9, 10, 11, 12, 13, 14, 16, 22, 999 px | Same problem. 11 vs 12 vs 13 px is invisible to users and costly to maintain. |
| **Border *and* shadow on everything** | `--shadow` plus `1px solid var(--line)` on every surface | Pick one elevation strategy. Both at once is the default "safe" AI look. |
| **Declared but never loaded font** | `--serif:"Noto Serif",Georgia,…` has no `@font-face` | The signature serif numerals render as Georgia on iOS, Noto on Android and DejaVu on Linux, so the brand looks different on every device. |
| **Stat-tile trio** | `8 på hverdag / 5 i helg / 52 søndager` (`light-kal.png`) | The classic generated dashboard row. The "i helg" number always includes Palmesøndag, 1. påskedag and 1. pinsedag, which are Sundays by definition, so it says nothing. |
| **Pill chips everywhere** | `.countdown`, `.facts span`, `.avatar.set` | The soft-tinted pill is the most over-used generated UI element. |
| **Decorative dot on the wordmark** | `.wordmark .dot` | A generic "brand accent" with no meaning. |
| **Hero duplicates the list below it** | The hero shows *Første juledag, om 89 dager*. The first row of "Neste helligdager" shows the same thing (`light-na.png`). | Repetition fills the screen instead of adding information. |
| **Generic icon** | A calendar sheet with one red square (`tools/make-icons.py`) | Indistinguishable from hundreds of calendar apps on a home screen. |
| **Micro-interaction everywhere** | `buzz()` on nearly every tap, `scale(.94)`, `scale(.88)`, `scale(.985)` and more | Haptics and motion lose meaning when they fire on everything. |

### 2.2 Product and information architecture

- **Six bottom tabs** (Nå, Kalender, Mine, Kontakter, Beregn, Om). Platform
  guidance is 3–5. At 390 px the labels shrink to 10 px.
- **Mine and Kontakter show the same records.** Kari Nordmann appears in both
  (`light-mine.png` vs `dark-kontakter.png`). This is feature accretion: one
  "people and dates" concept split in two.
- **Settings live inside "Om".** The only real setting (what the countdown
  counts to) sits between two walls of prose.
- **Om is the README rendered as UI** (`light-om.png`): five long paragraphs in
  a card at a muted contrast of 4.4:1.
- **Scope creep for a holiday app:** Contact Picker import, a birthday wizard,
  long-press multi-select, periodic background sync, ICS export, JSON backup and
  restore. Each is individually reasonable. Together they make a birthday
  manager bolted onto a holiday calendar, and each one added a bug (see §3).

### 2.3 Copy (Norwegian)

- **It over-explains.** Nearly every control has a `.hint` or `.statusline`
  paragraph, e.g. under Beregn → Inneklemte: *"Forslagene viser hvor få
  feriedager som gir flest sammenhengende fridager. Stripen viser periodens
  dager: rødt er fridag, grått er dagen du tar ut."* A good legend makes this
  sentence unnecessary.
- **False promise.** Om says *"alarm på det tidspunktet du har valgt"*, but the
  user cannot choose a time. The alarm time is hard-coded to 09:00
  (`index.html:1285`).
- **Overpromise.** *"…få beskjed før bursdager og merkedager, også når appen er
  lukket"* (`index.html:1321`). On iPhone this never happens, and on Android the
  OS decides when.
- **Abbreviations.** "om 89 d" is not idiomatic Norwegian. Use "om 89 dager" or
  just "89 dager".
- **Awkward headings.** "Merkedager som ikke er røde" could be "Andre
  merkedager". "Sammenfall" is jargon.
- **A proper noun gets lowercased.** `nextH.n.toLowerCase()` produces *"Neste
  helligdag … er kristi himmelfartsdag"* every year (`index.html:574, 667, 700`).
  It should read "Kristi".

### 2.4 Code

- **One 1,600-line file** that mixes CSS, markup, domain logic, storage, UI and
  PWA plumbing.
- **HTML built by string concatenation** into `innerHTML` 30 times. Some
  paths escape (`esc()`) and some do not, which is how the XSS in §3 got in.
- **Duplicated logic:**
  - The event card is built identically in `renderNow` and `renderMine`.
  - The tel/sms buttons appear in `kontaktSheet` and `evSheet`.
  - The reminder `<option>` list appears in `evForm` and in the wizard.
  - `[...daysOf(y),...daysOf(y+1)]` is repeated 4 times.
  - Next-occurrence and notification-text logic is duplicated between
    `index.html` and `sw.js`.
- **Mixed-language identifiers** in the same scope: `renderMonth`, `valgModus`,
  `erKontakt`, `oppdaterValgLinje`, `kø`.
- **14 empty `catch(e){}` blocks.** Failures are silently swallowed,
  including a failed service-worker precache (`sw.js:20`).
- **Version in three places:** `VERSION` in index.html, `CACHE` in sw.js, and
  the README.
- **No tests, lint or CI**, even though the date logic is ideal for unit tests.

---

## 3. Defects

Sources: a high-effort code review, manual review, and Playwright runs at 390 px
and 320 px in both themes. Line numbers refer to v1.7.0.

### High: data loss, security, broken offline

| # | Where | Defect | Failure scenario |
|---|---|---|---|
| H1 | `sw.js:132` | Every same-origin navigation response is cached as `index.html`, with no status or URL check. | Opening a 404, `manifest.json` or `README.md` in scope overwrites the offline app. The next offline launch shows a 404 page. |
| H2 | `index.html:1485` | Restore skips entries without `day`/`month`, but export includes them. Kontakter is not re-rendered after a restore. | Backup 50 contacts, 10 with birthdays, restore on a new phone: 40 contacts are gone. |
| H3 | `index.html:1120` | **XSS:** `data-id="'+ev.id+'"` is not escaped, and restore accepts arbitrary objects. | A crafted backup with `"id":"x\"><img src=x onerror=…>"` runs script when Kontakter renders. |
| H4 | `sw.js:103` / `index.html:1340` | Two separate "already notified" stores: localStorage in the page, and the *versioned* cache in the SW, which is wiped on every release. | The same birthday is notified by the page, again by background sync, and again after every update. |
| H5 | `index.html:908` | The bridge-day planner includes periods that are already past. | On 27 Sep 2026 the top suggestion is "1.–4. januar 2026" (`light-beregn-b.png`). |
| H6 | `index.html:1595` | `controllerchange` reloads the page on the *first* install, because `clients.claim()` fires it. | A first-time visitor loses whatever they were typing about a second after load. |

### Medium: wrong output or broken UX

| # | Where | Defect |
|---|---|---|
| M1 | `index.html:1225` | A one-time event with "Bruk årstallet = Nei" is stored with `year:null`. It never shows in the calendar, but the front page treats it as yearly. |
| M2 | `index.html:1245`, `1025` | A past one-time event shows "om -200 dager" in its sheet and disappears from Mine, so it can no longer be edited. |
| M3 | `index.html:1278` | ICS for 29 Feb birthdays uses a plain `FREQ=YEARLY`. The alarm then fires only in leap years or on the wrong day. |
| M4 | `index.html:385`, `1064` | `.selhead{display:flex}` overrides `[hidden]`, and "Merk alle" is visible before select mode starts (see `dark-kontakter.png`). |
| M5 | `index.html:1439` | The birthday wizard re-renders only when finished. If the sheet is closed part-way, the saved dates don't appear anywhere. |
| M6 | `index.html:574, 667, 700` | "kristi himmelfartsdag" is lowercased, as is the merged name, e.g. "Syttende mai og kristi himmelfartsdag" (2007, 2012, 2091). |
| M7 | `index.html:984` | The IndexedDB mirror is written only on save. After installing, background reminders do nothing until the user edits something. |
| M8 | `index.html:609` | The theme is applied by a script at the end of `<body>`, so dark-mode users see a light flash. Once toggled, the theme never follows the OS again, and there is no "System" option. |
| M9 | `index.html:886` | `renderRange` loops day by day with no limit. Picking dates centuries apart freezes the tab. |
| M10 | `index.html:858` | The "i helg" stat counts Sunday-only holidays (see §2.1). |

### Low

These are cosmetic or rarely reached:

- The "Merk alle/Fjern alle" label is not reset when select mode ends.
- The 3.2 s timeout of an earlier toast can hide the "Ny versjon er klar" toast.
- `reg.waiting` is never checked, so an update already waiting is never offered.
- `manifest.json` hard-codes `"id": "/rode-dager/"` while the repo is
  `R-de-dager-Norge`.
- `cache.addAll(...).catch(()=>{})` hides a failed precache.
- A long press can select and then immediately deselect a contact.

---

## 4. Accessibility (WCAG 2.2 AA)

### Contrast (measured)

| Pair | Ratio | Needs | Result |
|---|---|---|---|
| `--muted` on `--bg`, light (nav labels, all `h2`, hints) | 4.07 | 4.5 | ❌ |
| `--muted` on `--card`, light | 4.44 | 4.5 | ❌ |
| `--faint` on card, light (week numbers, weekday headers, letter headers) | **2.53** | 4.5 | ❌ |
| `--faint` on card, dark | **2.71** | 4.5 | ❌ |
| White on `--red`, dark (today cell, 16 px) | 4.06 | 4.5 | ❌ |
| `--red` on card, dark | 4.29 | 4.5 | ❌ |
| `--red` on card, light | 6.60 | 4.5 | ✅ |

### Other issues

- **Focus leaks.** The closed sheet is only moved off-screen, and
  `.todaybtn[hidden]` is forced to `display:flex`. Keyboard and screen-reader
  users can tab into invisible controls. Use `inert` and real `display:none`.
- **The dialog has no focus management.** Focus is not moved into the sheet,
  not trapped, and not restored on close.
- **Year chips are `<span>`s** with click handlers (`.jump`), so they are not
  keyboard reachable.
- **Incomplete tablist.** `role="tablist"` has no `tabpanel`s, no
  `aria-controls` and no arrow-key support.
- **Small targets.** At 320 px, calendar cells are 29×29 px, week-strip days
  28 px wide and the theme button 38×38 px. The minimum is 44 px.
- **Nav labels at 10 px.** `user-select:none` on `body` blocks copying dates.
- **Headings.** There is no `<h1>`, and every section heading is a muted 13 px
  `h2`.
- **Native `confirm()`** for deletes breaks the visual language and offers no
  undo.
- **Motion.** `prefers-reduced-motion` is handled, but it does not disable
  `element.animate()` in `renderMonth`.

---

## 5. Security and repository hygiene

1. **XSS via backup restore** (H3). Escape *every* interpolation, or better,
   stop using `innerHTML` for data (see §6.4). Validate imported records against
   a schema: types, ranges, and an id pattern `^[a-z0-9_]+$`.
2. **No Content Security Policy.** Add
   `<meta http-equiv="Content-Security-Policy" content="default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'">`.
   Moving scripts out of inline blocks lets `script-src 'self'` apply.
3. **`esc()` does not escape `'`.** It is safe today because all attributes are
   double-quoted, but it is fragile.
4. **`.claude/settings.json` enables a third-party plugin marketplace**
   (`affaan-m/everything-claude-code`) for everyone who opens the repo with
   Claude Code. That is a supply-chain trust decision. Keep it only if you have
   reviewed and pinned it, or move it to your personal user settings.
5. Good: nothing is sent off-device, `tel:`/`sms:` numbers are sanitized, and
   there is no third-party JS.

---

## 6. Path to a professional, elegant app

Ordered by value. Each phase is shippable on its own.

### Phase 0: Correctness (≈ 1 day)
Fix H1–H6 and M1–M10. Add `node:test` unit tests for `easter`, `isoWeek`,
`daysOf`, `bridges` and `occIn` (29 Feb), plus a restore round-trip test.

### Phase 1: A real design system (≈ 2 days)

**Type.** Two families and six sizes, all on a scale:

| Token | Size / line height | Use |
|---|---|---|
| `--t-display` | 64/64 serif | Hero date |
| `--t-title` | 28/32 serif | Sheet titles, month |
| `--t-head` | 20/26 serif | Section heads |
| `--t-body` | 16/24 sans | Default |
| `--t-small` | 14/20 sans | Secondary |
| `--t-micro` | 12/16 sans, 500 weight, +0.02em | Labels, nav |

**Font.** Self-host the serif, because the app is offline-first; 1–2 WOFF2
files at about 30 KB each is fine. Choose one with **tabular old-style and
lining figures**, since numbers *are* the product. Open-licensed candidates
suited to date numerals are Source Serif 4 or Newsreader. If there is a budget
for a commercial grotesque for UI text, a font search suggested *Relative*
(Colophon) or *Binate* (Monotype), both calm, legible "professional/serene"
grotesques. Otherwise keep `system-ui`.

**Spacing.** A 4 pt grid with tokens `--s-1…--s-8` (4, 8, 12, 16, 24, 32, 48, 64).

**Radius.** Three values only: 6 (controls), 12 (surfaces), 999 (true pills,
used sparingly).

**Elevation.** Choose one. Recommended: *no shadows*. Use hairline dividers on a
single surface, and reserve one soft shadow for floating elements (sheet,
toast, today button).

**Colour.** Keep the Norwegian flag red as the *only* accent. Re-tune the
neutral ramp so that `--muted` reaches 4.5:1 and `--faint` is used only for
non-text decoration. Add `--red-ink` for red *text* in dark mode, about
`#FF6B7D`, which reaches 6:1.

**Themes.** "System / Lys / Mørk", resolved in an inline `<head>` script before
first paint.

### Phase 2: Information architecture (≈ 2–3 days)

- **Four tabs:** **I dag · Kalender · Personer · Planlegg**.
  - Merge Mine and Kontakter into **Personer**: one list, optional phone, a
    "has date / no date" filter.
  - Rename Beregn to **Planlegg** and lead with the bridge-day planner, which is
    the most useful and most distinctive feature.
  - Move Om and settings behind a header icon.
- **Rethink the "I dag" hero.** Show one confident number, not a card:

  ```
  89
  dager til første juledag
  fredag 25. desember
  ```

  Replace the duplicated list with a compact "Resten av året" timeline, and add
  one insight line, e.g. *"Neste langhelg: påsken, 5 fridager for 3
  feriedager"*.
- **Calendar.** Full-bleed, no card; cells of at least 44 px; holiday names
  shown under the grid as a quiet legend. Add a **year view** as a 12-month
  mini-grid heatmap. This makes a strong signature screen.
- **Planner.**
  - Hide past periods.
  - Show each suggestion on a horizontal week timeline with real weekday
    letters, instead of the unlabeled 7 px bar.
  - Add a vacation-day budget ("Jeg har 25 feriedager") and a running total.
  - Allow "legg i kalender" per suggestion.
- **Copy.** Delete every hint paragraph a better label or legend can replace.
  Keep Om to about 5 lines plus a "Kilder" link to Lovdata.

### Phase 3: Craft and polish (≈ 2 days)

- **Undo instead of `confirm()`.** Delete immediately, then show a toast with
  "Angre" for 5 s.
- **Haptics and motion** only for state changes that matter: save, delete and
  month change. Use one easing curve and one duration token.
- **A distinctive app icon.** Candidates:
  - A bold red numeral "17" or a torn-off date-block silhouette, drawn in the
    same serif as the app.
  - A single red square on off-white, with no calendar rings.
- **Richer install.** Add `screenshots` and `description` to the manifest for
  the Android install UI. Add shortcuts to *Kalender* and *Planlegg*.
- **Subscribable holiday feed.** Generate `helligdager.ics` for 10 years so
  users can subscribe in Google or Apple Calendar. This gives the app a reason
  to exist outside itself.
- **Real empty states.** Use one line of copy plus one primary action, with no
  paragraph.

### Phase 4: Engineering foundations (≈ 2 days, can run in parallel)

- Split into native ES modules, still without a build step:
  - `holidays.js` (pure, tested)
  - `people.js` (storage and schema validation)
  - `ics.js`
  - `ui/*.js`
  - `sw.js` imports the shared date logic instead of duplicating it.
- Render with `document.createElement` or a 30-line `h()` helper, and ban
  `innerHTML` for data.
- Keep the version in one place (`version.js`) and derive `CACHE` from it.
- Add `package.json` scripts for lint (ESLint), test (`node --test`) and
  Playwright visual snapshots at 390/320 px in both themes.
- Add a GitHub Actions workflow: lint, test, Lighthouse CI (PWA plus a11y ≥ 95).
- One language for identifiers (English), Norwegian for UI strings, and
  strings collected in one `strings.nb.js`.

---

## 7. Method

| Step | Tool | Output |
|---|---|---|
| Full source read | manual | All files, all 1,604 lines of `index.html` |
| Correctness review | `code-review` skill, high effort | 10 findings plus 8 candidates, merged into §3 |
| Security pass | manual (the `security-review` skill needs a diff, and this branch has none) | §5 |
| Runtime and visual audit | Playwright / Chromium at 390×844 and 320×640, light and dark, seeded data | Screenshots in `docs/revisjon/`; no console errors; no horizontal overflow |
| Contrast | WCAG relative-luminance calculation on the CSS tokens | §4 |
| Domain verification | Extracted the date code and checked Easter (8 years) and ISO week edge cases, then scanned 2000–2099 for merged holidays | All pass; M6 found |
| Typography research | Font recommendation search | §6 Phase 1 |

Screenshots: `docs/revisjon/*.png`

---

## 8. Implementation status (v2.0.0)

| Finding | Resolution | Guarded by |
|---|---|---|
| H1 offline cache poisoning | Versioned app shell, cache-first; only app navigations are served from cache; precache bypasses the HTTP cache | `e2e`: works offline; `test/shell.test.mjs` |
| H2 restore drops contacts | `mergeImport` keeps undated people; every view re-renders on change | `test/people.test.mjs`, `e2e` restore test |
| H3 XSS via backup | `normalizePerson` validates every field; no `innerHTML` anywhere (ESLint rule); CSP | `e2e` restore test, `eslint.config.js`, `test/csp.test.mjs` |
| H4 duplicate reminders | One `runReminders` shared by page and worker, one record in IndexedDB, v1 record migrated | `test/people.test.mjs` |
| H5 past bridge suggestions | `bridges(y, max, notBefore)` | `test/holidays.test.mjs`, `e2e` planner test |
| H6 reload on first install | Reload only after the user taps «Oppdater» | `js/app.js` |
| M1–M2 one-time and past days | One-time days require a year; «Passert» group; no negative countdowns | `test/people.test.mjs` |
| M3 29 Feb in ICS | `RRULE:FREQ=YEARLY;BYMONTH=2;BYMONTHDAY=-1` | `test/ics.test.mjs` |
| M4 hidden header visible | Global `[hidden]` rule; select mode reworked | `e2e` view tests |
| M5 wizard not re-rendering | Store listeners re-render on every save | — |
| M6 «kristi» | Separate `inline` names keep proper nouns | `test/holidays.test.mjs` |
| M7 empty IndexedDB mirror | Mirrored on every start | `js/app.js` |
| M8 theme flash | Hashed inline `<head>` script; System/Lys/Mørk | `e2e` theme test |
| M9 unbounded range | `MAX_RANGE_DAYS` | `test/holidays.test.mjs` |
| M10 «i helg» stat | Replaced by «X av Y helligdager faller på en hverdag», excluding Sunday-only days | `test/holidays.test.mjs` |
| §4 contrast, focus, targets | New tokens (≥ 5.2:1), `inert` background, focus return, 44 px targets, arrow-key tabs | `e2e`: axe WCAG 2.2 AA in both themes at 390 and 320 px |
| §6 Phases 1–4 | Design tokens, Source Serif 4, 4 tabs, year view, planner budget, undo, «17» icon, manifest screenshots and shortcuts, `helligdager.ics`, ES modules, CI | `npm run check`, `npx playwright test` |

**Deliberately not changed:** `.claude/settings.json` still enables the
third-party plugin marketplace. Whether to trust it is the repo owner's
decision.

**Known limit:** the service worker is an ES module. Browsers without module
worker support run the app online only.
