# Arbeidsplan natt og formiddag 22. nov (ca. 03:00–12:30 norsk tid)

Brukeren: «lag en plan til hva du kan jobbe med etter dette – arbeid som varer fram til klokken 12:30». Rekkefølgen og innholdet er
Claudes forslag. Ingenting publiseres før brukeren sier «Publiser». Arbeidet deles mellom Claude og egne skymaskiner (brukerens ønske);
hver hjelper får en smal oppgave med egne filer, og Claude kontrollerer og fletter alt på `claude/nattfiks`.

## Blokk 1 · 03:00–05:00 · Grunnmuren for flerspiller (M0, del 2)
- **Kommandoer for alt spilleren gjør** (`spill/kommando.js`): ordre, stopp, grav ned, formasjon, stridsregler, bygg/riv i leiren,
  folk på oppgaver, tropper. Knappene går gjennom kommandoene, så de samme kan sendes over nettet. Test i Node.
- **Simuleringen ut av index.html, første bit** (`spill/simulering.js`): marsj, patrulje og kamprunde uten DOM, med test som kjører
  verden i Node uten nettleser.
- **Skymaskin:** felles tilfeldighet også i `*-visning.js` der den bestemmer utfallet (spillet, eventyr, morgenmøtet, samfunn,
  eskalering, tropper, garnison, forsvar, region, verden).

## Blokk 2 · 05:00–07:00 · Bedre samspill (M2b)
- Gjestene får flere kommandoer: grav ned, formasjon, stridsregler – via kommandolaget fra blokk 1.
- Gjesten kan ta med **egne folk**: verten oppretter en tropp for gjesten fra leirens folk, eller gjesten får et startlag.
- De andre spillerne som **figurer i 3D** når de går (ikke bare navn), og meldinger i en egen liten chat-rute.
- Lagring av hvem som eier hvilke lag, så det overlever at verten laster siden på nytt.

## Blokk 3 · 07:00–09:00 · Selskapet ditt (W1 fra Wardogs-planen)
- Flette reglene som venter på `claude/natt18-krig` (selskap, rykte, kontrakter) og lage visningen: selskapets side med navn,
  merke, rykte og kontrakter. Hver spiller i flerspiller har sitt selskap.
- **Skymaskin:** selskapsmerket (fra designretningen) i spillets brukerflate.

## Blokk 4 · 09:00–11:00 · Kvalitet
- Hele kontrollen (`sjekk.js`, PC og telefon) og prøven med to nettlesere etter hver blokk.
- **Spilltest som ny spiller** med skjermbilder på PC (1400 px) og telefon (390 px), både alene og to sammen; rett det som er galt.
- Se etter i 3D at elvestrømmen ser riktig ut på ekte brede elver (Glomma, Nidelva) – det er ikke kontrollert ennå.
- Rette den kjente ustabile vakten («fanene i Leir-menyen rulles ut av syne»).

## Blokk 5 · 11:00–12:30 · Rapport
- Rapport som PDF (hva som er gjort, hvordan du prøver flerspiller med en venn, hva som gjenstår), oppdatert flerspillerplan,
  CLAUDE.md og natterapport. Alt klart til publisering.

## Trenger ditt ja (gjøres ikke uten)
- **Publiser** (alt over ligger på grenen til du sier det).
- **Nye kartdata** (GitHub Actions, flere timer): vegtyper for gågater (vektorflisene), nye bygningstyper (sykehjem/legevakt) og
  kailinjer fra OpenStreetMap.
