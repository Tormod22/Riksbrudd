# ut1-selskap – fase Ø0: panelet «Selskapet», de fire trinnene og den første halvtimen

28. nov, gren `claude/ut1-selskap`. Plan: `docs/plan-selskap-okonomi.md` kapittel 1, 15 (punkt 1, 2 og 6) og 17.

## Hva som er laget

### 1. Panelet «Selskapet» (`spill/selskapspanel.js`, regler i `spill/selskapsbilde.js`)
- Ett panel (`#selskapet`) med fanene **Oversikt, Produksjon, Kontrakter, Byer, Partnere, Eiere**.
- **Oversikt**: merket og navnet, trinnet i overskriften, så ett tall per linje: kassa, ukas resultat (siste 7 spilldøgn fra
  `PengerSpill.døgn`, med inn og ut), nivå og rykte (`SelskapSpill.nivå()`, `Selskap.rykteTekst`), kontrakter (levert, aktive, tilbud),
  folk, lag og tettsteder. Under: **Veien videre** (de fire trinnene, det nåværende uthevet, hva som trengs for neste) og
  **Det viktigste nå** (de tre øverste fra `NesteSpill.liste()`, med «Gå til»).
- **Kontrakter**: IKKE en ny visning. Kontraktpanelet fra `selskap-visning.js` (`#selskap`) flyttes inn i fanen mens den står åpen
  (hode og lukkeknapp skjult med CSS), og settes tilbake i `body` og lukkes når fanen byttes eller panelet lukkes.
- **Byer**: tettstedene fra `SelskapSpill.steder()` med eier (`Garnison.tilstand(TETTSTEDER, id).eier` → Dere/Ravnsund/Mosevakt/Ingen),
  lojalitet for deres egne (`RegionSpill.tilstand().byer[id].loj`), «Vis» i kartet, og knapper til Regionen og Krigskartet.
- **Produksjon, Partnere, Eiere**: en rolig tekst om hva som kommer (Ø1, Ø5, Ø7).
- **Telefon**: bunnark over bunnmenyen (Skjermlag.LØFT/SELV får `selskapet`), fanene som rad øverst (kan sveipes), ett tall per linje.
- **Ett panel om gangen**: åpnes panelet, lukkes det som står på samme plass (samme regel som `spill/paneler.js`: `Paneler.viker('selskap', …)`);
  åpnes et annet panel på samme plass (Leir, Folk, Krig, lagpanelet …), lukkes Selskapet (vaktmesteren hvert 0,4 s).
- **Inngangene**: knappen i kommandolinja er den SAMME som før (`k: 'selskap'` fra `selskap-visning.js`) – den heter nå «Selskap», har
  tast S og åpner dette panelet (overstyrt fra min fil, `selskap-visning.js` er ikke endret). Ingen ny knapp. Tast S (ikke i tekstfelt, på
  startskjermen, mens du går eller bygger). «Selskapet» i ☰ åpner også dette panelet. På telefon: Mer → Selskap, Neste-lappen og Storlia-kortet.
- For spilleren (ikke i testene): åpnes kontraktpanelet et annet sted (Neste-lappen, Leir → Mål, leveringskortet), vises det i fanen
  Kontrakter i Selskapet. I testene (`navigator.webdriver`) er det gamle panelet som før til `SelskapetSpill.test = true`.
- Fanen spilleren velger selv, huskes. Huskes per leir i `localStorage` «riksbrudd-selskapet»: `{ leir, høyest, storlia, fane }`.

### 2. De fire trinnene (`spill/trinn.js`, test `pipeline/fliser/test_trinn.js`)
Overleve → Leverandør → Makt i regionen → Konsern. `Trinn.regn({ levert, nivå, bygg, tettsteder }, høyest)` gir
`{ nr, trinn, neste, krav, mangler, steg }`. **Kravene er Claudes forslag:**
| Trinn | Krav |
|---|---|
| 2 Leverandør | den første kontrakten levert + 3 ferdige bygg i leiren (byggesettdeler teller ikke) |
| 3 Makt i regionen | nivå 3 «Etablert» i `Selskap` + minst 1 tettsted dere holder |
| 4 Konsern | nivå 4 «Ettertraktet» + minst 3 tettsteder (investorer/børs blir krav i Ø7) |
Trinnene tas i rekkefølge, og et trinn dere har nådd, mister dere ikke (husket i «riksbrudd-selskapet»). Når et nytt trinn nås: én linje i
loggen og i dagboka (bare for spilleren).
`window.TrinnSpill`: `regn()`, `bilde()`, `lappInfo()`, `høyest()`.

**Neste-lappen** (`spill/neste.js`, små endringer): ny kilde `trinn` med prioritet 42 (under tilbud 50 og utsatt opplæring 45, over målene 40),
navnet «Veien videre». Et steg om kontraktene (`om: 'kontrakt'`) tas ikke med når kontraktene alt har en linje (`l0`). Trykk på steget går
dit det gjøres: Leir → Bygg (bygg), Selskapet → Byer (tettsteder), Selskapet → Kontrakter (kontrakter).

### 3. Den første halvtimen: «Storlia Tømmer har hørt om dere»
Etter den første leverte kontrakten (hendelsen `riksbrudd-kontrakt` med `type: 'levert'`): når leveringskortet og andre kort er borte, venter
det 25 s (Claudes tall) og viser et rolig kort øverst (`#storliakort`) med «Åpne Selskapet» (Oversikt, der trinn 2 Leverandør og hva som
mangler står) og «Senere»; borte av seg selv etter 40 s. Én gang per leir. Et lagret spill der den første kontrakten alt er levert, får kortet
én gang ca. 4 s etter start (pluss ventetida). Ikke i testene (`SelskapetSpill.test = true` slår det på). Teksten: `Selskapsbilde.storliaTekst`.

### 4. Ro i skjermen
Ingen nye knapper i toppraden eller bunnraden: kommandoknappen fantes fra før og står fortsatt bak «Mer». Sjekket med bilder på 390 × 844
(før/etter: samme topprad og bunnrad). Panelet er et bunnark som slutter over bunnmenyen.

## Filer
- Nye: `spill/trinn.js`, `spill/selskapsbilde.js`, `spill/selskapspanel.js`, `pipeline/fliser/test_trinn.js`, `pipeline/fliser/test_selskapsbilde.js`,
  `pipeline/fliser/vakter/ut1-selskap.js`, `docs/natt/ut1-selskap.md`, `docs/natt/ut1-selskap-hjelp.json`.
- Endret: `spill/neste.js` (prio/NAVN `trinn` + én kilde i `kilder()`), `pipeline/fliser/test_neste.js` (én test), `index.html` (tre skript-tagger
  rett etter `selskap-visning.js`, versjonsmerker fra `versjon.py`).

## API
`window.SelskapetSpill`: `vis(på, fane)`, `erÅpen()`, `fane()`, `velgFane(id)`, `tegn()`, `trinn()`, `storlia(tving)`, `husk()`, `nullstillHusk(d)`,
`lesPåNytt()`, `test`, `NØKKEL`. `window.Trinn`, `window.Selskapsbilde` (regler), `window.TrinnSpill`.

## Ikke gjort
- Produksjon, Partnere og Eiere har bare tekst (hører til Ø1, Ø5, Ø7).
- Byene viser ikke tillit/frykt/behov eller avtaler (Ø3); kartet får ikke ringer i avtalefargen.
- «Verdi» og «kurs» i Oversikt (kapittel 17) – finnes ikke før Ø7.
- Målene i Mål følger ikke trinnene ennå (punkt 2 i kapittel 15) – `maal.js` er ikke rørt.
- Tømmerkontrakten fra Storlia Tømmer finnes ikke (kortet peker bare videre); den hører til Ø1/Ø2.
- Når kontraktene alt har en linje i Neste-lappen, står et kontraktsteg fra trinnene ikke der (med vilje, for å unngå to like linjer).
