# Røde dager — Norsk pause

Norske helligdager, ferieplaner og personlige merkedager. Versjon 5.1.0 har et kompakt naturkonsept i harmonisk fjordblått, varm hvitt og dempet flaggrødt. Appen finnes som PWA og som en fullt pakket, offline Android-APK (Android 8+).

- **Fridager:** én reell feriemulighet med norsk fjordmotiv. «Se planen» viser datoene, lar deg lagre ferien og eksportere til telefonens kalender.
- **Kalender:** måned og år, helligdager, egne merkedager og planlagte feriedager. Trykk på en dag for detaljer.
- **Mine planer:** feriebudsjett, forslag og virkedagsberegning. «Dine merkedager» åpner bursdager og andre egne dager.
- **Innstillinger:** lyst/mørkt/systemtema, kalenderalarmer, sikkerhetskopi og import. APK bruker telefonens kalender for varsler.

Se [design og Android-bygg](docs/NORSK-PAUSE-5.md) for farger, begrensninger og signering.

## Installer APK

Last ned `Rode-dager-5.1.0.apk` som leveres sammen med oppdateringen, åpne filen på telefonen og tillat installasjon fra appen du åpner den med. Ingen konto eller nettforbindelse kreves. APK-en har separat lagring fra nettversjonen. Flytt tidligere data med Innstillinger → Ta sikkerhetskopi, og hent filen inn i APK-en. Senere APK-oppdateringer må bruke samme private signeringsnøkkel for å beholde installasjon og data.

## Nettversjon

Aktiver GitHub Pages fra `main` / rotmappen. Åpne https://kkas18.github.io/R-de-dager-Norge/ på telefonen og velg Installer appen i nettleseren. Nettversjonen krever én nettåpning før den fungerer offline. Merge den nye PR-en for å oppdatere Pages.

## Utvikling

```bash
npm ci
npm run serve
npm run check
npx playwright install --with-deps chromium
npx playwright test
```

Testene dekker dato/helligdag, ferieplaner, merkedager, kalenderfiler, CSP, lokale ressurser, begge temaer, små skjermer, tilgjengelighet, Tilbake og bruk uten nett. `tools/build-android.py` bygger og kontrollerer APK-en med JDK17/SDK35. Byggeoppskriften står i designrapporten.

Versjon styres av `js/version.js`; endringer i temaskript krever ny CSP-hash. Nye runtimefiler legges i `SHELL` i `sw.js`. `npm run feed` lager helligdagskalenderen, `npm run icons` bygger ikoner fra fjellmerket (Pillow), og `npm run screenshots` tar installasjonsbilder.

Alle data lagres på enheten. Landskapsbildet er generert som en egen appressurs. Source Sans 3 leveres lokalt under SIL OFL. Tidligere almanakkvurdering er bevart i `docs/REVISJON-3.md` som historikk.

Telefonnummerfeltet har «Velg fra kontakter» i APK og støttede nettlesere. Se [kontaktvelger 5.1](docs/KONTAKTVELGER-5.1.md).
