# ut2-balanse – balansen etter økonomitesten

28. nov 2026. Pakka retter de tre funnene i `docs/natt/ut1-okotest.md` (planen `docs/plan-selskap-okonomi.md` kapittel 1 og 13.4:
«produksjon dekker driften, kontrakter og byer gir vekst, børsen gir de store sprangene»). **Alle nye tall er Claudes forslag.**
Grenen: `claude/ut2-balanse`.

## Målene (Claudes forslag – står i `REGLER` i `test_okonomitest.js`)

| mål | før | nå (60 frø, sommer) |
|---|---|---|
| «bare kontrakter»: median 80–150 mill. på 30 døgn | 448 mill. | **ca. 101 mill.** [10–90 %: 51–138], høyst 191 i 100 frø |
| nivå 4 tidligst rundt dag 10 | dag 6 | **dag 13** |
| ingen strategi over 200 mill. i noen kjøring | 57/60 over | 0 av 100 (kontrakter høyst 164–191, blandet høyst 177–198) |
| «byer med makt» blakk ≤ 10 % og minst 2 mill. over «gjør ingenting» | 18 % blakk, median 3,1 | **3–7 % blakk, median ca. 5 mill.** (ingenting 0) |
| å sitte hjemme med røverbølgene tjener ikke penger | «forsvarer leiren» 18 -> 38 mill. | **18 -> ca. 1 mill.**; belønningen (14,8 mill.) ≤ det forsvaret koster (15,7) |

`OKO_STRENG=1 node pipeline/fliser/test_okonomitest.js` er grønn (KJENT-lista er tom), båndet `okonomitest-band.json` er lagret på nytt.
Om vinteren (30 frø, prøvd for hånd): kontrakter 100 mill., byer 3,1 (3 av 30 blakk), blandet høyst 175.

## Først: stemmer modellen med spillet?

Sjekket mot `selskap-visning.js`:
- **Tilbudene** kommer hver morgen (`dagSteg` + `lagTilbud`, høyst 6 åpne, 30 t), og en tropp kan bare ha én jobb – det har modellen også.
  Spillet lar deg ha **3 aktive** kontrakter (flere tropper), modellen bruker én tropp – modellen er altså ikke for snill der.
- **Eskorten**: i spillet settes bilen ut ved «fra» (`lagBil`), så strekket fra leiren dit er ikke en del av jobben. En rolig eskorte trenger
  ikke engang en tropp (bilen kan kjøres alene). Modellen lar troppen kjøre leir -> fra -> til -> leir på 40 km/t – heller treg.
- **Ingen trøtthet** på troppene i spillet, så «én time reaksjonstid» i modellen er rimelig for en spiller på 60×. På 1× (sanntid) tar ingen
  2 kontrakter i døgnet – det sto alt i ut1-notatet.
- **Påfyll** (fant to ting spillet gjorde som modellen ikke gjorde): (1) åpnet du Selskapet uten tilbud og uten aktive kontrakter, kom nye tilbud
  **straks, så ofte du ville** (`vis()` i selskap-visning.js) – det var en snarveg forbi «nye tilbud kommer i morgen tidlig»; (2) når den
  første kontrakten leveres, kommer nye tilbud straks (`kobling`). Begge er nå med i modellen, og (1) er strammet inn i spillet (se under).
- **Byene**: modellens strategi kuttet troppen til 12 og gikk igjen og igjen mot et bygdevern på 12–14, tapte og rekrutterte for 15 mill. Det
  gjør ingen fornuftig spiller (Krig sier «for svakt»). **Modellen var for dum her, ikke spillet for slemt** – rettet i modellen (se under).

Konklusjon: spillet var for snilt (betaling, nivåer, tilbud, røverbelønning, påfyll); modellen var for streng mot byene. Begge er rettet.

## Tallendringer i spillet (før -> etter)

`site/dovre-fliser/spill/selskap.js` (REGLER):
| hva | før | etter |
|---|---|---|
| `tilbudPerDag` | 3 (4 når pålitelig ≥ 70) | **2** (3 når pålitelig ≥ 70) |
| eskorte: vegen som betales | leir -> til + fra -> til | **bare fra -> til** (strekket bilen kjøres) |
| eskorte: vegfaktoren (1 + m / 40 000) | uten tak | **høyst × 1,25** (`TYPER.eskorte.meterTak`; ny `REGLER.meterPer` = 40 000) |
| eskorte: grunnbetaling | 700 000 | **600 000** |
| `RISIKO.bakhold.faktor` | 2,6 | **1,6** |
| `RISIKO.rolig.faktor` (ny) | 1 | **0,75** (rolig er fortsatt høyst halvparten av bakhold, test_balanse.js) |
| `TYPER.hold.betaling` | 2 100 000 | **1 700 000** |
| `NIVÅER` levert (2/3/4) | 2 / 5 / 10 | **3 / 8 / 20** (pålitelig 55/65/78 som før) |
| `NIVÅER` faktor (2/3/4) | 1,35 / 1,8 / 2,4 | **1,15 / 1,35 / 1,55** |
| påfyll når Selskapet åpnes tomt | så ofte du vil | **høyst én gang per spilldøgn, og bare før dere har levert/brutt mer enn den første** (`Selskap.påfyll(S, dag, id)`, `S.påfylt` lagres) |
| første kontrakt | 1 500 000, ingen bot | **uendret** |

Et vanlig tilbud på nivå 1 (startryktet) er nå: rolig eskorte ca. 0,4–0,6 mill., eskorte med bakhold ca. 1,0–1,2 mill., hent ca. 1,4–1,6, rydd
ca. 2,1, hold 4 t ca. 1,4 og hold 10 t ca. 3,1 mill. I økonomitesten (bare kontrakter, 30 døgn): 53 kontrakter (1,8 i døgnet), eskorte 1,8 mill.
for 1,3 t, hold 5,1 mill. for 12 t, hent 3,1 for 8 t – eskorten er fortsatt best per time (1,3 mill./t mot 0,4–0,7), men ikke lenger 5,3.

`site/dovre-fliser/spill/spillet.js` (Trussel.BALANSE.bytte – belønningen for en slått røverbølge):
| | før | etter |
|---|---|---|
| fast | 300 000 | **100 000** |
| per bølge | 150 000 | **50 000** |
| tak | 1 500 000 | **400 000** |
Bølge 1 gir 150 000 kr, fra bølge 6 400 000. En falt mann koster 500 000 å erstatte, så belønningen dekker omtrent tapene, ikke mer.

`site/dovre-fliser/spill/region.js` (skatt):
| | før | etter |
|---|---|---|
| skatt brutto per døgn (vanlig) | `folk × 100`, høyst 1,2 mill. | **høyst 1,2 mill. av max(6000 × √folk (hele tusen), folk × 100)** (`REGLER.skattRot` = 6000) |
Bygd på 800: 80 000 -> 170 000 brutto (netto ca. 60 000 -> 127 000, mot 45 000 i lønn til en garnison på tre). 1200: 120 000 -> 208 000.
1500: 150 000 -> 232 000. Fra 3600 innbyggere som før – byene og taket er uendret (by på 20 000: 0,9 mill. netto, test_balanse.js).
`garnison.js` er ikke endret (garnisonen har ingen egen lønn der; lønna er brukerens 15 000 kr).

## Endringer i økonomitesten (modellen)

`pipeline/fliser/okosim.js`:
- «byer med makt»: troppen får den størrelsen krigskartet anbefaler (Strategi.anbefalt + 1 + garnisonen), opptil **to fulle tropper sammen**
  (`REGLER.byTropper` = 2; spillet lar flere lag gå mot samme sted), og steder som trenger mer, lar den være. Tar **tapte steder tilbake**
  (slår motstanderens garnison på 8, `by.mistet`). **Selger varene** tettstedene sender (tre, betong, stål over 20, `sim.selgVarer`, som i
  «hogst og salg»). Garnisonen står **i dekning** i husene når motstanderen angriper (som forsvarerne i leiren; før i åpent lende).
- Kontraktene: påfyll når lista er tom (én gang per døgn, bare i starten, som i spillet), og nye tilbud straks etter den første kontrakten.
- `okosim-hogst.js`: når startleiren er bygget, går byggelaget på vakt (før sto leiren åpen; belønningen dekket det). Uten dette ble
  «hogst og salg» blakk i 13 %.

`pipeline/fliser/test_okonomitest.js`: KJENT er tom; nye krav (`kontraktMål`, `nivå4Tidligst`, `byerOver`, røverbølgene) og en **selvtest**:
med den gamle røverbelønningen sier kravet fra («forsvarer leiren» 17,8 -> 39,6 mill.).

## Andre tester (forventninger oppdatert)

- `test_selskap.js`: «tre tilbud» -> to (`tilbudPerDag`), antallTilbud 4/2 -> 3/1, nivå 2 krever 3 leverte; nye tester for påfyll og at
  eskortens betaling følger strekket og risikoen.
- `test_balanse.js`: rolig eskorte regnes med `RISIKO.rolig.faktor` som i lagTilbud; «en bygd på 1500 gir mindre enn en full garnison
  på 12» -> «høyst halvparten av drifta i startleiren (0,44 mill.)» og «mer enn lønna til en garnison på tre». (Den gamle regelen var R3-vakten
  mot pengemaskiner; en bygd på 1500 gir nå 0,19 mill. – fortsatt ingen pengemaskin.)
- `test_spillet.js`: belønning(1) 450 000 -> 150 000, belønning(40) 1,5 mill. -> 400 000.
- `test_region.js`: bygd på 1200 gir 208 000 kr (før 120 000).
- Grønne uten endring: test_garnison, test_krig, test_fraksjoner, test_paneler, test_oppstart, test_scenario, test_forsvar_kamp,
  test_lagringsside, test_selskapsbilde, test_eventyr, test_strid, test_kommando. (test_kontrakter finnes ikke.)

## Fellesfil endret

`site/dovre-fliser/spill/selskap-visning.js` – én linje i `vis()`: påfyllet når panelet åpnes tomt går nå gjennom
`SK.påfyll(S, dagNå(), ID)` i spillet (`auto()`); i testene (webdriver) som før.
`docs/natt/balanse-hjelp.json`: «450 000 kr for den første, høyst 1,5 mill.» -> «150 000 kr for den første, høyst 400 000 kr».
**`spill/hjelp-natt.js` er IKKE laget på nytt** – kjør `pipeline/fliser/samle_hjelp.py` ved flettingen, ellers står de gamle tallene i hjelpen.
`versjon.py` er ikke kjørt (ingen nye skript-tagger; de endrede filene trenger nytt versjonsmerke ved flettingen).

## Vakt

`pipeline/fliser/vakter/ut2-balanse.js` (ca. 0,1–1 s): den første kontrakten (1 500 000, ingen bot, teksten), 40 runder tilbud – hver eskorte
betaler det reglene sier (strekket, taket, risikoen, nivået, prisstigningen) og teksten sier «rolig … lav» / «bakhold», ingen over 2 mill. på
nivå 1; en eskorte **tatt og levert i spillet** gir akkurat betalingen i kassa; en **røverbølge startet og slått i spillet** gir 150 000 kr og
rapporten sier tallet; påfyll. Setter tilbake selskapet, kassa, lagene, kjøretøyene, bølgen, moralen, loggen og lagringen. Prøvd på PC og mobil
(ok), og med den gamle røverbelønningen lagt inn med vilje (feiler: «røverbelønningen er 450 000 kr for bølge 1»). Også kjørt i samme side:
selskap, kontrakter, kontrakt-r1, kontrakt-r3, lokke-r1/r2/r3-okonomi, ut1-selskap og balanse – alle ok.
Dovre-testsiden har ingen steder for kontrakter (`SelskapSpill.steder()` er tom der), så vakten bruker to prøvesteder 4 og 12 km fra leiren.

## Ikke gjort / usikkert

- «Byer med makt» **gir fortsatt ikke vekst** (dag 1 ca. 10 mill. -> dag 30 ca. 5): rekrutteringen (500 000 kr per mann, ca. 25 mill. på 30 døgn)
  og tapene mot motstanderens angrep spiser skatten. Den slår «gjør ingenting» og blir ikke blakk, men vekst fra byene trenger byavtalene (Ø3).
  Motstanderens 4 % per døgn med 8 mann er fortsatt modellens anslag.
- Røverbølgene kommer også etter **ekte minutter** (`Trussel.vent`: 16–28 min). På 1× kan en spiller få mange bølger per spilldøgn; med det
  nye taket (400 000) er det ikke lenger en pengemaskin, men det er ikke regnet i modellen.
- Belønningen er fortsatt et fast beløp per bølge – ikke etter fiender som falt eller skade på bygg (det krever endring i spillet-visning.js).
- En rolig eskorte trenger fortsatt ingen tropp i spillet (bilen kan kjøres alene) – betalingen er lav (0,4–0,6 mill.), så det er greit nå.
- Modellens resultater avhenger litt av rekkefølgen kjøringene gjøres i (Selskap.lever bruker den felles tilfeldigheten `Tilfeldig.verden`
  når ingen `rand` gis) – derfor kan samme frø gi litt ulike tall i ulike skript. Ikke rettet.
