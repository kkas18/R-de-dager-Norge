# Kontaktvelger 5.1.0

Ved Ny/Endre merkedag, åpne Telefonnummer og trykk Velg fra kontakter. Android åpner sin kontaktvelger for et konkret telefonnummer. Bare det valgte nummeret og navnet returneres til skjemaet. Navnet fylles bare hvis navnefeltet er tomt. Dato og øvrige felt beholdes. Valget lagres først når du trykker Lagre.

Android bruker ACTION_PICK med CommonDataKinds.Phone.CONTENT_TYPE og leser kun den returnerte data-URI-en. Ingen READ_CONTACTS eller WRITE_CONTACTS-tillatelse legges til. Feil i kontaktappen gir en beskjed og lar brukeren skrive nummeret selv. Avbryt endrer ingen felt. Tilgjengelige nettlesere bruker Contact Picker API; flere numre kan velges i en nedtrekksliste. Kontaktknappen skjules der kontaktvalg ikke er støttet.

APK 5.1.0 (50100) bruker samme app-ID og signeringsnøkkel som 5.0.0. Installer oppdateringen over eksisterende app for å beholde data. Byggeskriptet henter nå APK-filnavnets versjon fra js/version.js.

Testdekning: automatisk utfylling og lagring, bevaring av dato og eksisterende navn, avbryt og feil, sene svar fra et tidligere skjema, flere numre i nettleservarianten samt axe-kontroll av skjemaet. Android-koden kompileres og APK-signatur/zipjustering kontrolleres. Kontaktvelgeren er ikke prøvd på en fysisk Samsung i denne økten.

Androids dokumentasjon: https://developer.android.com/guide/components/intents-common.html
