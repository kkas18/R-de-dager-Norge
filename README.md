# Røde dager

Norske røde dager, virkedager og inneklemte dager. Én HTML-fil, ingen eksterne
kall, virker uten nett og kan installeres som app på telefonen.

## Innhold

| Fil | Hva den gjør |
|---|---|
| `index.html` | Hele appen: grensesnitt, datologikk og beregninger |
| `manifest.json` | Navn, farger og ikoner for installasjon |
| `sw.js` | Service worker: offline-drift og automatisk oppdatering |
| `icons/` | Ikoner for Android, iOS og nettleserfane |
| `tools/make-icons.py` | Lager ikonene på nytt hvis du endrer designet |

## Funksjoner

**Nå** viser neste røde dag med nedtelling, denne ukens dager og de neste
helligdagene. Trykk på en dag for detaljer i et bunnark.

**Kalender** er et månedsrutenett med ukenummer. Dra sidelengs for å bla
mellom måneder, trykk månedsnavnet for å hoppe til en annen måned eller et
annet år, og «Se hele året» for hele årslisten. Har du bladd deg langt bort,
dukker en «I dag»-knapp opp nederst som tar deg rett tilbake til dagens måned. Under kalenderen står hvor
mange røde dager som faller på hverdag og hvor mange som forsvinner i helgen.

**Mine** er dine egne datoer: bursdager, jubileer og andre merkedager. De vises
i kalenderen med grå prikk, på forsiden med nedtelling, og kan legges i
telefonkalenderen som årlig hendelse med alarm. Navn og telefonnummer kan
hentes fra telefonens kontaktliste med Contact Picker API, som finnes i Chrome
på Android. Fødselsdato er ikke blant feltene nettleseren gir ut, så datoen
skrives inn manuelt. Velger du flere kontakter samtidig, havner alle i Kontakter-fanen,
og du setter datoen på hver av dem der. Har dagen et nummer, får du ringe- og meldingsknapp. Dagene lagres lokalt på
telefonen, og kan tas sikkerhetskopi av som JSON-fil.

**Kontakter** er personene dine som en telefonliste: sortert på navn, gruppert
på forbokstav, med søk på navn og nummer. Hentes fra telefonens kontaktliste
eller legges inn manuelt. Trykk et navn for å sette bursdag, ringe, sende
melding eller legge dagen i telefonkalenderen. Knappen «Sett bursdager» går
gjennom alle uten dato på rad, med «Lagre og neste» og «Hopp over». Langt trykk
på et navn, eller «Velg» over listen, gir avkrysning der du kan slette eller
eksportere flere samtidig. Kontakter uten bursdag ligger i
listen til du setter datoen, og holdes utenfor kalender, nedtelling og varsler.

**Beregn** har to verktøy: antall virkedager mellom to datoer, og forslag til
inneklemte dager — hvilke få feriedager som gir flest sammenhengende fridager.

Bevegelige dager regnes ut fra påskedagen med Meeus' formel, så alle år virker,
også langt fram i tid.

Appen navigeres med sveip mellom sidene, gir kort vibrasjon ved valg, husker
siste side og tema, og tilbyr en installasjonsknapp under Om når nettleseren
støtter det.

## Legg ut på GitHub Pages

1. Lag et nytt repo, for eksempel `rode-dager`.
2. Last opp alle filene slik de ligger her, med mappene `icons/` og `tools/`.
   `index.html` må ligge i rota av repoet.
3. Gå til **Settings → Pages**. Under *Build and deployment* velger du
   *Deploy from a branch*, branch `main` og mappe `/ (root)`. Trykk **Save**.
4. Etter et par minutter ligger appen på
   `https://<brukernavn>.github.io/rode-dager/`.

Bruker du et annet reponavn, endre `"id"` i `manifest.json` til samme navn.

## Installer på telefonen

**Android og Samsung Internet / Chrome:** åpne adressen, trykk menyen og velg
*Installer app* eller *Legg til på startskjerm*. Appen starter uten
nettleserlinje, i stående format.

**iPhone:** åpne adressen i Safari, trykk del-knappen og velg
*Legg til på Hjem-skjerm*.

## Søndager og helligdager

Etter helligdagsloven er alle søndager helligdager, mens 1. og 17. mai er røde
dager uten å være helligdager. I arbeidslivet menes med helligdag som regel de
navngitte høytidsdagene, og appen skiller derfor mellom dem: søndager er røde i
kalenderen, men listene over helligdager tar bare med de navngitte. Under Om
kan nedtellingen settes til å telle til neste helligdag, som er standard, eller
til nærmeste røde dag inkludert vanlige søndager.

## Varsler

Appen varsler på tre måter, i økende grad av pålitelighet:

1. Melding når du åpner appen, hvis en dag er innenfor varselgrensen.
2. Bakgrunnssjekk via `periodicSync` i service workeren. Krever installert app
   og gis bare av Chrome på Android. Systemet bestemmer når sjekken kjøres,
   vanligvis en gang i døgnet.
3. Eksport til telefonkalenderen som `.ics` med `RRULE:FREQ=YEARLY` og
   `VALARM`. Dette er den eneste måten som gir alarm på et bestemt klokkeslett
   uten en server, og fungerer på både Android og iPhone.

Dagene lagres i `localStorage` og speiles til IndexedDB, siden service workeren
ikke kan lese `localStorage`.

## Oppdatering

HTML-filen hentes fra nett først, resten ligger i cache. Når du pusher nye
filer til GitHub, får du meldingen «Ny versjon er klar» neste gang appen
åpnes med nett. Trykk **Last inn**, så byttes den ut.

Endrer du ikoner eller filnavn: øk `CACHE`-nummeret øverst i `sw.js`, for
eksempel til `rode-dager-v1.0.1`, så tømmes den gamle cachen.

## Lage ikoner på nytt

```bash
pip install pillow
python3 tools/make-icons.py
```

Fargene ligger øverst i skriptet: blekk `#17181A`, papir `#F5F5F3`,
rød `#BA0C2F`.

## Forbehold

Appen dekker helligdagene i lov om helligdager og helligdagsfred, samt 1. mai
og 17. mai. Den tar ikke hensyn til turnusordninger, lokale avtaler eller
bransjeavtaler om fri på jul- og nyttårsaften.
