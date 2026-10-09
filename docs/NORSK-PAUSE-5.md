# Røde dager 5.0.0 — Norsk pause

Forsiden er bygget på det godkjente naturkonseptet: en reell kommende feriemulighet, kompakt landskapsbilde, kostnad/gevinst og én hovedhandling. Kalender og merkedager åpnes ved behov. Tre hovedfaner: Fridager, Kalender og Mine planer. Merkedager ligger under Mine planer.

## Fargeharmoni og størrelse

Fjordblå #10283F og lysere blå flater deler samme fargefamilie. Varm hvit #F7F5EF gir lesbarhet. Dempa flaggrød #BA3546 brukes på handlinger, mens lysere rødt #FF9FA9 gir kontrast for helligdager mot blå bakgrunn. Et lyst tema bruker samme fargefamilie. Fotografiet er generert med imagegen som eget lokalt landskapsmotiv. Ikonet er et kodebasert fjellmerke med rødt fundament.

Forsiden tilpasses 320–430 px. Bildet blir lavere ved korte skjermer, og hovedkontroller har minst 44 px trykkflate. Økt tekststørrelse og lange detaljlister kan rulle; innhold klippes aldri for å tvinge det inn på én skjerm.

## Android

- App-ID: no.rodedager.app, versjon 5.0.0 (50000), Android 8+ (API26), target35.
- Alle filer pakkes i APK-en. Ingen nettverkstillatelse; appen virker fra første åpning uten nett. Eksterne lenker åpnes i andre apper.
- WebView med lokal HTTPS-opprinnelse, kun pakkede filer, ingen file://-tilgang, blokkering av eksterne ressurser og av blandet innhold. Broen eksporterer kun kalender/JSON gjennom Androids filvelger. Import bruker Androids dokumentvelger.
- Systemets statuslinje, navigasjonslinje, skjermutskjæring, tastatur og Tilbake håndteres i Android-skallet. Ingen lagringstillatelse kreves.
- Personlige merkedager og ferieplaner sikkerhetskopieres som JSON. Data fra PWA flyttes manuelt med sikkerhetskopi/import; APK-en har egen lagring.
- Varsler via telefonens kalender (ICS). Ingen egen bakgrunnsvarsling i APK-en.
- Signeringsnøkkelen er privat, utelatt fra Git. Ta vare på signeringspakken for å kunne oppdatere samme installasjon senere. Ikke del den offentlig.

## Bygg APK

Installer JDK17 og Android SDK platform/build-tools35.0.0. Sett ANDROID_SDK_ROOT, RD_KEYSTORE og RD_STORE_PASS_FILE til lokale stier. Aliaset må være rode-dager. Kjør `python3 tools/build-android.py`. Bygget bruker aapt2, javac, d8, zipalign og apksigner. APK havner i android/build. Signatur og zipjustering sjekkes automatisk. Ingen Gradle-nedlastinger kreves.

Nettversjonen bruker fortsatt PWA-installasjon og service worker. Native utgaver oppdateres ved å installere en nyere APK signert med samme nøkkel.
