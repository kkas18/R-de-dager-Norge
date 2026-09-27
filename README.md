# Røde dager

Norske røde dager, inneklemte dager og merkedager. En installerbar webapp uten
byggesteg og uten eksterne kall. Den virker uten nett.

## Sidene

- **I dag** teller ned til neste helligdag og viser denne uken. Du ser også
  neste langhelg, neste inneklemte dag, hva som kommer det neste året og dine
  neste dager.
- **Kalender** har månedsvisning med ukenummer og en stille forklaring under,
  og årsvisning med alle tolv måneder. Sveip sidelengs for å bytte måned, og
  trykk på månedsnavnet for å hoppe.
- **Personer** samler bursdager, jubileer og andre dager, med eller uten dato.
  Du kan søke og filtrere. «Sett dato» går gjennom alle uten dato, én om gangen.
  Langt trykk eller «Velg» gir flervalg. Sletting kan angres, i stedet for et
  spørsmål først.
- **Planlegg** foreslår inneklemte dager. Forslag som ligger i fortiden vises
  ikke. Hvert forslag har en ukestripe, og du kan planlegge perioder mot dine
  egne feriedager og legge dem i kalenderen. Her regner du også ut virkedager
  mellom to datoer.
- **Innstillinger** (knappen øverst til høyre):
  - tema (som telefonen, lyst eller mørkt)
  - hva nedtellingen viser
  - tidspunkt for alarmen i kalenderen
  - varsler, sikkerhetskopi og abonnement på helligdagene

## Filer

| Sti | Innhold |
|---|---|
| `index.html` | Skall: markup, CSP og temaskript som kjører før første tegning |
| `css/app.css` | Designsystemet: tokens for type, avstand, radius og farge |
| `js/dates.js`, `js/holidays.js` | Rene dato- og helligdagsfunksjoner (testet) |
| `js/people.js`, `js/reminders.js`, `js/ics.js` | Datamodell, varsler og kalenderfiler (testet) |
| `js/store.js`, `js/kv.js` | Lagring i localStorage, speilet til IndexedDB for service workeren |
| `js/dom.js`, `js/ui.js` | `h()`-hjelper uten innerHTML, bunnark og toast |
| `js/views/*.js` | De fire sidene og innstillingene |
| `js/version.js` | Versjonsnummeret, som bare står her |
| `sw.js` | Service worker (ES-modul): app-skall per versjon, bakgrunnsvarsler |
| `helligdager.ics` | Abonnerbar kalender for 2020–2045, generert |
| `fonts/` | Source Serif 4 (SIL OFL), levert fra egen server |
| `icons/`, `screenshots/` | Ikoner og skjermbilder til installasjonen |
| `tools/` | Generatorer for ikoner, kalenderfeed og skjermbilder |
| `test/`, `e2e/` | Enhetstester (`node:test`) og Playwright-tester |

## Utvikling

```bash
npm install
npm run serve        # http://localhost:8080
npm run lint         # ESLint, blant annet forbud mot innerHTML og confirm()
npm test             # enhetstester for dato, helligdager, personer, ics, CSP og app-skall
npx playwright test  # alle sider i begge temaer ved 390 og 320 px, axe (WCAG 2.2 AA), offline, flyter
```

Når du endrer noe:

- **Helligdagsreglene:** kjør `npm run feed`. CI stopper hvis `helligdager.ics`
  er utdatert.
- **Temaskriptet i `<head>`:** oppdater hashen i CSP-en. `test/csp.test.mjs`
  forteller hvilken hash som mangler.
- **Nye filer i `js/` eller `css/`:** legg dem i `SHELL` i `sw.js`.
  `test/shell.test.mjs` sier fra hvis du glemmer det.
- **Ikonene:** `pip install pillow fonttools brotli`, deretter `npm run icons`.

## Ny versjon

Øk `VERSION` i `js/version.js` og push. Installerte apper henter den nye
versjonen i bakgrunnen og viser «En ny versjon er klar» med knappen
**Oppdater**. Siden lastes aldri inn på nytt uten at du trykker.

## Legg ut på GitHub Pages

Gå til **Settings → Pages** og velg *Deploy from a branch*, `main` og `/ (root)`.
Appen bruker bare relative stier, så reponavnet spiller ingen rolle.

## Installer

- **Android (Chrome eller Samsung Internet):** menyen → *Installer app*, eller
  knappen under Innstillinger.
- **iPhone:** Safari → del-knappen → *Legg til på Hjem-skjerm*.

## Varsler

1. **Kalenderfilen** er den eneste måten å få alarm til fast tid uten server.
   Den har årlig gjentakelse og alarm på klokkeslettet du velger. Bursdager
   29. februar havner på siste dag i februar hvert år.
2. **Når du åpner appen**, får du varsel om dager som er innenfor varselgrensen.
3. **Bakgrunnssjekk** via `periodicSync` finnes bare i Chrome på Android, i
   installert app, og systemet bestemmer når den kjører.

Appen og service workeren deler én oversikt over sendte varsler i IndexedDB,
så samme varsel kommer bare én gang.

## Nettlesere

Appen krever en moderne nettleser: ES-moduler, `inert`, `:has()` og
`color-mix()`. Service workeren er en ES-modul. I nettlesere uten støtte for
det virker appen fortsatt, men ikke uten nett.

## Forbehold

Appen dekker helligdagsloven og lov om 1. og 17. mai. Den tar ikke hensyn til
turnus, lokale avtaler eller tariffavtaler om fri på jul- og nyttårsaften.

Revisjonen som ligger bak versjon 2 finner du i `docs/REVISJON.md`.
