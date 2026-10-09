# Røde dager 4.0 — en mer anvendelig almanakk

Dato: 9. oktober 2026. Utgangspunkt: `e631644`, versjon 3.0.0.

Dette prosjektet er en kalender- og ferieapp. «Spillfølelse» er derfor vurdert
som brukerflyt og respons. Poengene er en faglig, subjektiv vurdering av
koden og de eksisterende skjermbildene, ikke en brukertest.

## Vurdering av versjon 3

| Område | Poeng | Konkret vurdering |
| --- | --- | --- |
| Design | 7,5/10 | Almanakken har en klar idé, egne skrifter og konsekvent fargebruk. Kalenderbladet forteller likevel ikke tydelig at datoen gjelder neste helligdag. Høyreist blad og lange lister gjør oversikten treg å skanne. |
| Grafisk uttrykk | 7/10 | Skarpe vektorikoner og god typografi gir et bedre grunnlag enn generisk dekor. Papirbladet, toppteksten og navigasjonen kunne hatt et mer gjennomført hierarki. Fotografier og illustrasjoner ville ikke løst hovedoppgaven. |
| Animasjoner | 5/10 | Koden har enkle fade-overganger og et brukbart bunnark. Lite retning eller respons ved valg. Denne vurderingen bygger på animasjonskoden; eksisterende skjermbilder viser ikke bevegelse. |
| Brukerflyt | 8/10 | Fire klare faner, lokal lagring, bruk uten nett og støtte for Tilbake gir et solid fundament. Forsidens tips er ikke handlingsbare, ferieplanen er usynlig i kalenderen, og budsjettet varsler først etter overforbruk. |

Det særpregede almanakkdesignet beholdes. «Typisk AI-stil» er ingen objektiv
kvalitetskategori; forbedringen handler om en konsekvent idé, tydelig
prioritering og handlinger som faktisk henger sammen.

## Konkrete forbedringer i versjon 4

1. **Et lesbart kalenderblad.** «Neste helligdag» / «Neste røde dag» og år står
   over en perforert linje. Stor dato til venstre, navn og nedtelling til høyre.
   «Se dagen» åpner de samme detaljene som kalenderen. Et tynt underliggende
   papirlag gir diskret dybde. Små skjermer får tilpasset typografi.
2. **Topptekst og navigasjon.** Navnet får et enkelt rødt bokmerke. Dagens
   dato og ukenummer ligger under navnet og forsvinner ikke på smale skjermer.
   Den aktive fanen får en blekkstrek. På store skjermer følger topptekst,
   innhold og bunnmeny samme sentrerte bredde.
3. **Ett tips som kan brukes.** «Litt ferie. Mer fri.» forklarer én konkret
   mulighet og åpner planleggeren med riktig år og én feriedag per forslag,
   også når neste mulighet ligger neste år. Hvis ingen slik mulighet finnes,
   vises neste langhelg uten ferie.
4. **En kortere oversikt.** Egne merkedager kommer før den generelle listen.
   Kommende viser fire dager først. «Vis alle» og «Vis færre» beholder
   tastaturfokus og oppgir utvidet tilstand til skjermleseren.
5. **Et synlig feriebudsjett.** En enkel linje viser planlagt andel. Et forslag
   viser fri, feriekostnad, periode og hvilke dager man må ta fri. Hovedvalget
   er en tydelig «Planlegg»-knapp. For lite ferie forklares før planlegging,
   og et allerede lagret forslag kan alltid fjernes. Å senke budsjettet
   sletter aldri eksisterende feriedager.
6. **Ferieplanen følger kalenderen.** Stiplede datoflater markerer planlagt
   ferie i måneds- og årsvisning. Dagdetaljene og skjermleseretiketten sier
   «planlagt ferie». Eldre planer beholder samme lagringsnøkler og datoformat.
7. **Mer presis respons.** Faner glir inn 6 px mens de tones inn. Kalenderen
   flyttes 10 px i navigasjonsretningen. Lagring har kort taktil respons og en
   tekstbekreftelse. Budsjettlinjen følger endringen. Redusert bevegelse
   slår av disse overgangene og bunnarkets bevegelse.
8. **Årsgrenser.** Nye forslag kan strekke seg over nyttår med fridager, men
   feriedager må tilhøre budsjettåret. Kalenderen leser også nærliggende
   lagringsår, slik at eldre nyttårsplaner fortsatt er synlige.

## Verifisering

- Lokal `npm run check`: lint, 36 enhetstester og kontroll av helligdagsfeed.
- Nye enhetstester dekker ødelagte planer, overlappende perioder, senket
  budsjett og feriedager ved nyttår.
- GitHub CI kjører prosjektets nettlesertester med nye flyter for
  kalenderbladet, kompakt liste, årsskifte, budsjett, ferie i kalenderen,
  varig lagring og redusert bevegelse. Den eksisterende kontrollen dekker
  lyse/mørke temaer, 320/390 px, axe, tastatur, historikk og bruk uten nett.
- GitHub CI har bestått alle 23 nettlesertester. Ingen alvorlige eller kritiske
  axe-funn ble rapportert på de testede sidene i begge temaer ved 320/390 px.
- Nye installasjonsskjermbilder produseres som CI-artefakter. Skjermbildene fra
  første kjøring er visuelt gjennomgått i begge temaer.

Nettlesertestene er kjørt i GitHub CI. Ingen fysisk Samsung-telefon er testet.
Det nye visuelle uttrykket er kontrollert i CI-skjermbilder; animasjonenes
opplevde kvalitet er fortsatt ikke vurdert på en fysisk telefon.
