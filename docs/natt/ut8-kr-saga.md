# ut8-kr-saga – kritikeren Ingrid Sæther: produksjon og varekontrakter (28. nov)

Gren `claude/ut8-kr-saga`. Gjenskapt med kritikerens eget lagrede spill (localStorage fra profilen hennes, lastet på /norge via dev.py)
og på Dovre-testsiden.

## 1. Saga sto med «Folk 0 av 3 · venter på folk» (HØY)
ÅRSAK (gjenskapt): «+» på Maskiner i Selskap → Produksjon endret `p.oppgave`, men leiren (med folkene i `L.folk`, «riksbrudd-k2»)
ble bare lagret hvert 10. spillminutt og ved byggejobber – ikke ved pagehide. Kritikerens skript lukket siden noen sekunder etter
klikket, så etter omlasting var Marte og Randi tilbake på sine gamle oppgaver, mens loggen (som lagres for seg) sa «Marte Aas er nå på
maskiner». Saga fikk aldri folk (29,3 t «ingen folk» i hennes lagrede `riksbrudd-produksjon`). Med Marte satt på igjen og på skift gikk
saga straks i hennes lagrede spill.
RETTET:
- `produksjon-visning.js`: «+/−» lagrer leiren straks (`LeirSpill.lagre()`).
- `leir-visning.js` (fellesfil, 5 linjer ved `let speilNøkkel`): leiren lagres på `pagehide` og når siden skjules (ikke i speil-modus).
- VARSEL (`produksjon-visning.js`, `vakt`): forsvinner noen fra «Maskiner» (annen oppgave, sendt ut, syk, inn i en tropp) sier loggen
  «Sagbruk mister folk: Marte Aas er flyttet til bygg – 1 igjen …» eller «Sagbruk står: … – ingen igjen på «Maskiner». Sett folk på i
  Selskap → Produksjon.» Det spilleren selv gjør med − / + på Maskiner meldes ikke. Står maskinene uten folk i 45 spillminutter
  (VAKT_R.tomMin, Claudes forslag): påminnelse i loggen én gang og varselbrikka «Sagbruk står: ingen folk» (VARSEL_TILLEGG).
- Raden i fanen Produksjon: «ingen folk» (ikke «venter på tømmer») når ingen er på Maskiner, og linja «Hvorfor: Marte Aas: på vei ·
  Randi Myhre: sover – maskiner fra 06:00» (`ProduksjonSpill.hvorforFolk(b)`: borte, syk, fri/sover med neste skift, på vei, står fast,
  bærer, kjører en annen maskin).
- Folk-panelet: «tempo 0» heter nå «ingen i arbeid akkurat nå (fri, spiser eller på vei)» (`folk-visning.js`, fellesfil, én linje).
IKKE ENDRET (sett på Dovre): med færre operatører på skift enn maskinene trenger får fyrkjelen den første (rekkefølgen i baering.js),
så saga kan stå mens kjelen går. «Hvorfor»-linja sier det («kjører fyrkjele»). En smartere fordeling (kjelen bare når strømmen trengs)
er ikke laget.

## 2. Tilbudene regnet med full drift (MIDDELS)
- `produksjon.js`: `døgnTell(P, tid)` – det maskinene laget i forrige døgn (`P.døgn.iGår`, per døgn; et døgn under 6 t eller et hopp i
  klokka over 180 min = ukjent). Lagres i «riksbrudd-produksjon». `ProduksjonSpill.laget()`.
- `vare-visning.js` `perDøgn()`: det maskinene faktisk laget siste døgn; uten et målt døgn bare maskinene som går nå (× drift), ellers 0.
- `vare.js` `rekker(k, har, perDøgn, kjøreTimer, { kilde, maskin })`: «sagbruket laget 26,4 m³ siste døgn», «… men sagbruket laget
  ingenting siste døgn», «… men sagbruket står nå». Uten `o` som før.

## 3. Kjøpsavtale med fullt lager (HØY)
VALG (Claudes, «mest rettferdig og tydelig»): DET SOM IKKE FÅR PLASS, BETALES IKKE. Selgeren tar resten med tilbake.
- `vare.js` steg: betaling = andelen av døgnets pris for det som får plass (hele `dagKr` når alt får plass); `k.ikkePlass` teller m³.
  0 m³ = 0 kr, døgnet regnes ikke som levert (rød rute), ingen bot. Kravteksten sier «… og det betaler dere ikke for».
- `vare-visning.js`: meldingen «Storlia Tømmer kom med 20 m³ tømmer, men lageret var fullt – ingenting levert, ingenting betalt (døgn 1
  av 5). Lag plass …» / «… leverte 6,7 m³ … for 37 500 kr – 13,3 m³ fikk ikke plass og ble ikke betalt.»
- BEKREFTELSE: tilbudskortet for en kjøpsavtale når lageret ikke har plass til ett døgn: rød linje «Lageret er fullt – avtalen gir 0 m³ i
  dag av 20 m³. Det som ikke får plass, betales ikke.» og «Inngå avtalen» (`data-s="varebekreft"`) må trykkes to ganger – andre gang står
  det «Ja, inngå likevel» (den vanlige `data-s="ta"`). Lagerlinja er rød når plassen ikke rekker (også på aktive avtaler).
- `ressurser-visning.js`: «Lageret i leiren er fullt …» høyst hver sjette spilltime (FULLT_HVERT 360, Claudes forslag), med hva som venter
  og «(N ganger siden sist)».

## 4. Leveranse til et sted en rival holder (MIDDELS)
`vare-visning.js` `rivalVed(sted)` (Garnison.tilstand(TETTSTEDER, id).eier ≠ blå): nye leveringer tilbys ikke dit (morgen og Storlias
plankeleveranse filtrerer stedene), og et tilbud som står, merkes `k.rival` + `k.risiko = 'bakhold'`: «⚠ Lismarka holdes av Ravnsund»
og kravteksten «Lismarka holdes av Ravnsund – de kan ta lasten og bilen. Ikke send en bil alene …» (vare.js `krav`). Sett i hennes
lagrede spill: Lismarka-tilbudet viser nå dette.

## 5. Hogst (LAV)
- `penger-visning.js`: «Hogstlaget fant skog … (gir ca. 46,2 m³ tømmer)» (brukte `mat.tre`, som nå er 0) og «bærer tømmeret».
- `ressurser-visning.js`: de tre meldingene var tre ulike felt (hogstlaget starter et nytt felt når et er ferdig). Nå «Hogstfeltet er hogd
  (felt nr. 3): 46,2 m³ tømmer.» (starten er lik, så loggdemp.js gjenkjenner den).

## 6. Utløpte tilbud og «regner ut marsjen …» (LAV)
`selskap-visning.js` (fellesfil, små endringer): tilbud med under ett minutt igjen vises ikke (`synligTilbud`), og utregningen av marsjen
har en frist (MARSJ_FRIST 20 s, Claudes forslag) – svarer ikke kartet, brukes luftlinja, og neste tilbud får tur.

## Fellesfiler endret
- `spill/leir-visning.js`: lagring ved pagehide/visibilitychange (5 linjer ved `let speilNøkkel`).
- `spill/folk-visning.js`: teksten for tempo 0 (én linje + kommentar).
- `spill/selskap-visning.js`: `synligTilbud` (ved `function steder`), filteret i «Ledige tilbud», `MARSJ_FRIST` + `Promise.race` i `marsj()`.
- `spill/penger-visning.js`: hogstmeldingen (tømmer).
- `spill/ressurser-visning.js`: fullt-lager-meldingen og hogstmeldingen.
- Mine: `produksjon.js`, `produksjon-visning.js`, `vare.js`, `vare-visning.js`.
- Tester: `test_produksjon.js` (døgnTell), `test_vare.js` (betaling etter plass, rekker med kilde, rival).

## Vakt
`pipeline/fliser/vakter/ut8-kr-saga.js` (ca. 1 s): «+» lagres i leiren, varsel ved flytting / tropp, påminnelse + brikke, hvorfor-linja,
tilbud uten falsk produksjon, rivalens sted, fullt lager må bekreftes og betales ikke. Prøvd med to feil lagt inn med vilje (uten
`LeirSpill.lagre` og med full betaling) – vakta fant begge. Grønn på PC og mobil sammen med ut2-sagbruk, ut4-maskinfolk,
ut3-varekontrakt, ut1-jobber og ut3-folkgar.
