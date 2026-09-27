# Revisjon 2: Røde dager v2.0.0

**Dato:** 27. september 2026
**Grunnlag:** skjermbilder av v2 i `docs/revisjon-2/for-*.png`, tatt med fast dato
27.09.2026, 390 px bredde og fem lagrede personer.
**Spørsmål:** Hvorfor ser v2 fortsatt KI-generert ut, og hvordan blir den
brukervennlig og elegant?

---

## 1. Kort svar

Versjon 2 rettet feilene og fikk et ordentlig designsystem. Den byttet likevel
bare ut én mal med en annen. Kombinasjonen av en pen serif, systemfonten, beige
bakgrunn, hvite avrundede kort, grå segmentknapper og små
VERSALER-MED-SPERRING er standardutseendet for «smakfull» KI-design i
2024–2026. Den er ryddig, men den kunne vært en app for hva som helst.

Det som mangler, er en **idé** som kommer fra selve emnet. Røde dager er en
norsk kalendertradisjon: almanakken, rivblokka på kjøkkenveggen og de trykte
kalenderne der søndager og helligdager står med rødt. Det er stoffet
designet bør hentes fra.

---

## 2. KI-kjennetegn som fortsatt er der

| # | Kjennetegn | Hvor (skjermbilde) | Hvorfor det avslører malen |
|---|---|---|---|
| 1 | Små VERSALER med sperring som etiketter | «NESTE HELLIGDAG», «KOMMENDE», «NY», «PLANLAGT / IGJEN / TOTALT» | Det er den vanligste etikettstilen i genererte grensesnitt. |
| 2 | Tre tall-fliser på rad | Planlegg: Planlagt 0 · Igjen 25 · Totalt 25 (`for-light-planlegg-full.png`) | Revisjon 1 kritiserte nettopp dette, og v2 innførte det igjen. |
| 3 | Grå segmentknapper | Måned/År, Alle/Med dato/Uten dato, Inneklemte/Virkedager | Hentet rett fra iOS. Det brukes tre ganger, så ingenting skiller seg ut. |
| 4 | Hvite avrundede lister på beige | Alle lister og skjemaer | Fortsatt kortsuppe, bare flatere. |
| 5 | Systemfonten til all brødtekst | Roboto, San Francisco eller DejaVu, avhengig av telefon | Appen får en ny stemme på hver enhet. Seriftitler over systemfont er KI-standardparet. |
| 6 | Knappesuppe | To store grå knapper i hvert ferieforslag, i tillegg til «Sett dato for 1 person» som en stor grå blokk | Når alt er en knapp, er ingenting den viktigste handlingen. |
| 7 | Etikett–verdi-rader som dashbord | «Langhelg · 25.–27. desember …», «Inneklemt · Ta fri …» | Det leses som et datakort, ikke som en setning et menneske ville sagt. |
| 8 | Samme avstand til «om N dager» på hver rad | Kommende: tolv rader, alle med «om 88 dager», «om 90 dager» … | Gjentakelse fyller plass uten å gi informasjon. |
| 9 | Fylt rød pille rundt dagens dato | Ukestripen, kalenderen | Det er typisk for maler og tar oppmerksomheten fra helligdagene, som burde være det røde. |
| 10 | Varmekart i årsvisningen | Røde firkanter uten tall (`for-dark-year.png`) | Et dashbord-grep, ikke en kalender. Man kan ikke lese en eneste dato. |

## 3. Brukervennlighet

| # | Problem | Konsekvens |
|---|---|---|
| U1 | **Tilbakeknappen på Android lukker ikke arket.** Arket blir liggende åpent når man bytter side. | Den vanligste gesten på Android gjør noe annet enn brukeren venter. |
| U2 | Skjemaet «Legg til» har sju felt med etikett til venstre og felt til høyre. «Årstall: Vis alder og år» og «Gjentas: Hvert år» er Ja/Nei-valg forkledd som nedtrekkslister. | Det er tregt, og ordene er uklare. |
| U3 | På Planlegg må man gjennom tre skjemarader, tre fliser og en forklaring før første forslag vises. | Selve svaret ligger under bretten. |
| U4 | Personer har søk, filter, «Sett dato», «Velg» og «Legg til» samtidig, og hovedhandlingen står nederst. | Det er for mange valg for en liste med fem personer. |
| U5 | Kommende viser tolv rader, blant dem palmesøndag og påskedag, som alltid er søndager. | Lista blir lang uten å fortelle noe nytt. |
| U6 | Månedslisten under kalenderen er et eget kort med «Ingen merkedager i september». | Et tomt kort bruker plass på å si ingenting. |

## 4. Designretning: «Almanakk»

**Idé:** En trykt norsk almanakk i lommeformat, med papir, blekk og rødt.
Informasjonen står i tabeller og setninger, ikke i kort og fliser.

### Prinsipper

1. **Ingen kort.** Innholdet står rett på papiret og skilles med hårstreker og
   luft. Flatene har rette hjørner, som trykksaker.
2. **Rødt betyr én ting:** en rød dag. Dagens dato får en blekkring, ikke en
   rød pille. Personlige dager står i blekk.
3. **To skrifter med roller:** Source Serif 4 til tall, titler og kursive
   stikkord, og Source Sans 3 til grensesnittet. Begge leveres fra egen
   server, så appen ser lik ut på alle telefoner. Systemfonten brukes ikke.
4. **Kursiv i stedet for VERSALER.** Sekundære etiketter settes i kursiv serif,
   slik almanakker og bøker gjør.
5. **Setninger i stedet for dashbord.** For eksempel: «Neste langhelg er jula.
   Tar du fri torsdag 24., får du fire dager.» Innstillingene i Planlegg er også
   en setning med valg inni: «Forslag for **2026** med inntil **3** feriedager.»
6. **Én hovedhandling per skjerm** som fylt blekkknapp. Alt annet er
   tekstlenker.
7. **Tekstfaner i stedet for segmentknapper:** ord med en tynn strek under det
   valgte.

### Skjerm for skjerm

- **I dag:** Et rivblokkark med rød topplist, ukedag i kursiv, stort rødt
  dagstall, måned og navnet på dagen. Under står nedtellingen som en setning,
  og tipset om langhelg eller inneklemt dag som én setning. Uken vises som en
  tallrekke med blekkring rundt i dag. «Kommende» er en almanakktabell gruppert
  på måned, uten gjentatt «om N dager». Søndager som alltid er søndager, er
  utelatt.
- **Kalender:** Månedsnavn og år som tittel, piler og tekstfaner «Måned · År».
  Røde tall med en liten strek under for navngitte helligdager, prikk for dine
  dager og ring rundt i dag. Under kalenderen står månedens merkedager som
  tabell, eller én setning hvis det ikke er noen. **Årsvisningen er en trykt
  årskalender med ekte tall**, ikke et varmekart.
- **Personer:** Tittel og «Ny» som eneste knapp. Personene er gruppert på
  måned, som en bursdagsalmanakk. Seksjonen «Uten dato» har lenken «Sett
  datoer». Søk vises først når det er seks personer eller flere. Filteret og
  den grå blokkknappen er fjernet.
- **Planlegg:** Innstillingene er én setning. Feriebudsjettet er én setning med
  tallet redigerbart inni. Forslagene står i en tabell med tallrekke, der røde
  tall er helligdager og en ring betyr at du tar fri, og har handlingene
  «Planlegg» og «Til kalender» som tekst.
- **Skjema:** Etiketter over feltene og understrekede felt. Ja/Nei-valgene er
  avkrysningsbokser: «Gjentas hvert år» og «Vis alder». Telefon ligger under
  «Flere valg».
- **Ark:** Lukkes med tilbakeknappen på Android. Tittelen på dagsarket er
  bygget som et lite rivblokkark.
- **Innstillinger:** Samme tabellstil, lenker med pil og ingen hvite kort.

### Uendret fra v2

Logikken, dataformatet, frakoblet drift, CSP, testene og tilgjengeligheten
(WCAG 2.2 AA, 44 px trykkflater) beholdes. Designet endres, ikke
fundamentet.

---

## 5. Før og etter

| Skjerm | Før (v2) | Etter (v3) |
|---|---|---|
| I dag | `for-light-idag-full.png` | `etter-light-idag-full.png`, `etter-dark-idag.png` |
| Kalender | `for-light-kalender.png` | `etter-light-kalender.png` |
| År | `for-dark-year.png` | `etter-dark-year.png` |
| Personer | `for-light-personer.png` | `etter-light-personer.png` |
| Skjema | `for-light-form.png` | `etter-light-form.png` |
| Planlegg | `for-light-planlegg-full.png` | `etter-light-planlegg-full.png` |
| Innstillinger | `for-light-om.png` | `etter-light-om.png` |

Alle bildene ligger i `docs/revisjon-2/`.

## 6. Status (v3.0.0)

| Funn | Løst slik |
|---|---|
| 1 VERSALER som etiketter | Borte. Sekundære etiketter står i kursiv serif. |
| 2 Tre tall-fliser | Erstattet av setningen «Du har 25 feriedager. 1 er planlagt, 24 igjen.» |
| 3 Grå segmentknapper | Tekstfaner med strek under det valgte ordet. |
| 4 Kortsuppe | Ingen kort. Innholdet står på papiret med hårstreker. Bare rivblokkarket og bunnarket er egne flater. |
| 5 Systemfonten | Source Sans 3 og Source Serif 4 (vanlig, kursiv og halvfet) leveres fra egen server og caches for bruk uten nett. |
| 6 Knappesuppe | Én fylt knapp per skjerm («Ny» og «Lagre»). Alt annet er tekstlenker. |
| 7 Etikett–verdi-rader | Tipsene er hele setninger, for eksempel «Neste langhelg er jula …». |
| 8 Gjentatt «om N dager» | Almanakktabellen viser relativ tid de nærmeste 45 dagene og ukedag etter det. |
| 9 Fylt rød pille for i dag | Blekkring. Rødt brukes bare om røde dager. |
| 10 Varmekart i årsvisningen | En trykt årskalender med ekte tall, der røde dager står i rødt. |
| U1 Tilbakeknappen | Arket eier én historikkoppføring, og Tilbake lukker det. Det tåler rask åpne/lukk, omlasting og Frem. |
| U2 Skjemaet | Etiketter står over feltene, Ja/Nei er avkrysningsbokser, og telefonnummeret ligger under «Flere valg». |
| U3 Planlegg under bretten | Innstillinger og budsjett er to setninger. Første forslag er synlig uten å rulle. |
| U4 For mange valg | Personer har bare «Ny» som knapp. Søket vises fra seks personer, og «Velg flere» ligger nederst. |
| U5 Lang liste | Kommende viser de åtte neste dagene, uten dager som alltid er søndager. |
| U6 Tomt kort | Én setning i kursiv. |

**Kvalitetssikring:**
- ESLint er ren.
- 32 enhetstester og 18 ende-til-ende-tester passerer.
- axe finner ingen brudd på WCAG 2.2 AA i begge temaer ved 390 og 320 px.
- Alle trykkflater er minst 44 px.
- Kontrasten er minst 5,5:1 for all tekst.
- Nye tester dekker Tilbake-knappen, historikken ved rask åpne/lukk og omlasting, skjermleseretikettene og årskalenderen.
- Kodegjennomgangen (`code-review`) fant 10 punkter i redesignet, og alle er rettet.
