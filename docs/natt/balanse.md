# Pakke «balanse» – natt til 18. nov (fortsettelse av «test1»)

Gren `claude/natt18-test1`. Utgangspunktet var gjennomspillingen i `docs/natt/test1.md` (sju spilldøgn på /rogaland, leir ved Sand):
startbyggene brukte nesten hele kassa, røverbyttet var hovedinntekten, bølgene vokste fort, og stridsvogna/rakettartilleriet bar
forsvaret alene. Det uferdige utkastet (18f62fd) er beholdt og bygget videre på. **Alle tallene under er Claudes forslag.**

## Tallene (samlet) og hvorfor

| Hva | Før | Nå | Fil | Hvorfor |
|---|---|---|---|---|
| Røverbytte per bølge | 2 mill. + 1 mill. × nr (3, 4, 5 … mill.) | 300 000 + 150 000 × nr, høyst 1,5 mill. (450 000, 600 000 …) | `spillet.js` Trussel.BALANSE.bytte | Ett tettsted (Sand) ga 185 000–404 000 kr per døgn; byttet var 10 × det. Nå omtrent det en bølge koster i reparasjon og ammunisjon. |
| Lag per bølge | 1, 1, 2, 2, 3, 3 … høyst 6 | 1, 1, 1, 2, 2, 2, 3 … høyst 6 (perLag 3) | `Trussel.lag` | Vokser halvparten så fort. |
| Tak etter soldater | – | ett lag per 8 soldater (minst 1), +1 med stridsvogn/rakettartilleri | `Trussel.lagFor` (mennPerLag) | Bølgen følger det spilleren har; en ny gjeng på ti møter aldri fire lag. |
| Tak etter dagen | – | 1 lag dag 1–3, 2 dag 4–6, 3 dag 7–9 … (dagerPerLag 3) | `Trussel.lagFor` (o.dag) | «Følger dagen»: tidlig i spillet er det aldri mer enn ett lag. |
| Vanskelighetsgrad | ganger antall lag | som før (`SPILLREGLER.faktor.røvere`, lett 0,6 – hard 1,5) etter takene | `spillet-visning.js` | |
| Første bølge | 12 spilltimer / 18 ekte min | 24 spilltimer / 30 ekte min (det som kommer først) | `Trussel.BALANSE.først` | Brakke (2 t), aggregat, tank og vakttårn (1 t hver) og en tropp rekkes uansett fart. |
| Tid mellom bølger | 20 − nr t (min 10) / 26 − 2·nr min (min 12) | 27 − nr t (16–26) / 30 − 2·nr min (16–28) | `Trussel.vent` | Tid til å reparere mellom bølgene. |
| Lagret spill | ny bølge etter 12 t | halv vanlig ventetid (første bølge: 24 t som nytt spill) | `spillet-visning.js` start() | |
| Kontrollrom | 15 mill. kr | 9 mill. kr (materialer som før: 10 tre, 40 betong, 8 stål) | `leir.js` | Brakke + aggregat + dieseltank + kontrollrom med materialer (1,5 × pris) og 500 l diesel: 38,8 → 32,8 mill. av 40 (7,2 mill. igjen). |
| Betonghylla i markedet | 40 m³, fyll 10/døgn | 60 m³, fyll 12/døgn | `spillet.js` Marked.LAGER | De fire første byggene trenger 48 m³ betong. |
| Opplæringen/målene | – | «Kontrollrommet (9 mill. kr) kan vente til leiren står og du har en tropp og et vakttårn» | `maal.js`, loggen ved start (`oppstart-visning.js`) | |
| Startkjøretøy i nye spill | stridsvogn, rakettartilleri, lastebil, speiderbil | lastebil og speiderbil (S.lettStart) | `oppstart-visning.js` | Kan bygges på basen senere. Testene (webdriver) og lagrede spill som før. |
| Motstanderne og leiren | angrep leiren så snart den var funnet | fredstid i et ekte spill: 4 døgn på Vanlig (5 Lett, 3 Hard = 4 / faktor.fiende, 2–6): leiren er ikke mål, og lag innen 1,5 km fra leiren regnes ikke som mål | `fraksjoner-visning.js` (fredTid) | Gjennomspillingen: Kystalliansen i leiren på dag 2, Vaktlaget utslettet, byggene ned til 21–27 %, og på dag 3 var alt utenom vakttårnet borte. |
| Avbrutt bølge | røverne borte, bølgenummeret økt | samme bølge kommer igjen etter 20 spillminutter / 1 ekte min | `spillet-visning.js` start() | Røverlagene lagres ikke (lagring.js hopper over e.raid); å starte bølgen på nytt er enklere og sikrere enn å lagre dem. |
| Første hus du leter i | kunne være tomt | aldri tomt: 4 rasjoner og 20 000 kr hvis det ellers var tomt | `leting-visning.js` | Ikke i testene. |
| Butikk | 20 % tomme | aldri tomme (alltid mat) | `leting.js` | Butikken har fulle hyller i 3D. |
| **Runde 2:** sabotører | bølge 2 (med ett lag), 3, 7 … | med spilldøgnet: tidligst bølge 4 og fra dag 5 (`Krig.SABOTASJE_FRA` = { bølge 4, dag 4 }); ellers «rett på» | `krig.js` røverVariant(…, dag), `krig-visning.js` | Kjøring 2: sabotørene i bølge 3 (dag 4) ødela aggregatet, og brannen etterpå tok resten. Testene (webdriver) gir ikke dagen – som før. |
| Brann i leiren: spredning | som ellers i terrenget | ×0,25 innen 70 m fra leirens midte (grusplass) | `verden-visning.js` LEIRBRANN.grus/grusR | |
| Brann i leiren: slokking | ingen | folk på «vakt» og «bygg» (friske) slokker ruter innen 150 m: 12 % per person per 10 spillminutter, høyst 70 % | LEIRBRANN.perPerson/maks/slokkR, slokkILeiren() | Med fire hjemme er brannen i leiren ute på 10–20 minutter. |
| Brann i leiren: skade | `Math.max(1, hp × 0,2)` per 30 min – altså hele bygget på én gang (feil) | 0,12 av full helse per 30 min (ca. 4 timer fra helt til ødelagt) | LEIRBRANN.bygg | Byggene forsvant ett for ett så snart ruta brant. |
| Brann i leiren: varsel | «Brannen tar X i leiren – det er ødelagt» | «Brann i leiren! N på vakt og bygg prøver å slokke» (eller: ingen er hjemme – sett folk på det), stopper spolingen (riksbrudd-hendelse type brann), «Brannen i leiren er slukket», «Brannen skader X (76 % igjen)» | `verden-visning.js` | |
| Lite mat | logg ved under ett døgn, brikke ved 1,5 døgn | også logg ved under to døgn («kjøp mat, jakt, fisk, åker eller drivhus»), brikken «Lite mat» ved 2 døgn | `folk.js` (toDøgn), `narhud.js` | Kjøring 2: maten gikk fra 36 til 0 på fire døgn. |
| Mann per røverlag | 12 (nyttLag) | 4 + 2 × bølge, 6–12, høyst soldatene + 2 (minst 5) | `spillet.js` Trussel.menn, `spillet-visning.js` | Kjøring 3: 12 røvere mot 8 forsvarere i bølge 1, og leiren falt. Ikke i testene. |
| Mål og råd om mat | – | nytt mål i kapittel 1: «Ha mat til tre døgn» (matDøgn = mat / folk); rådet ved start nevner mat og drivhus | `maal.js`, `maal-visning.js`, `oppstart-visning.js`; tallet i vakta `spillform.js` er 19/15 mål | Startmaten (50) er ikke endret. |

Kostnaden for en nybegynner som følger rådet (brakke, aggregat, tank, 500 l diesel, en tropp, et vakttårn): 26,5 mill. – 13,5 mill.
igjen til mat, reparasjoner og kontrollrommet senere. Med kontrollrom første dag: 38,3 mill. (1,7 mill. igjen) – det er derfor rådet
sier at det kan vente.

## Sjudøgnsspillet (/rogaland, Sand 6825, 6627357, «Vanlig», webdriver av)

Spilt med scratchpad `natt/balanse/` (daemon.js + s/ny.js, hj.js, b1.js, b2.js, dag.js). Dag 1: brakke, aggregat, dieseltank,
tropp av fire (de to «fri» og to fra bygg) og vakttårn ved start, 500 l diesel når tanken sto. Spolingen med ⏭, første valg på
alle kort, «Forsvar leiren» ved alarm. NB: skriptet kjøpte kontrollrommet så snart kassa hadde 16 mill. – det skjedde alt på dag 1
(17,5 mill. igjen etter de andre byggene), altså ikke slik rådet sier. Kjøringen startet FØR fredstiden for motstanderne var lagt inn.

**Kjøring 1** (før fredstiden for motstanderne; skriptet kjøpte kontrollrommet alt på dag 1, 1,7 mill. igjen). Stoppet etter
tre døgn fordi leiren var borte – resten sa ikke noe om røverne:

| Etter døgn | Kassa | Folk | Moral | Mat | Bygg (* = under bygging, % = helse) | Lag (levende) | Bølger | Hva skjedde |
|---|---|---|---|---|---|---|---|---|
| 1 | 1.7 mill. | 6 | 63 | 44 | brakke aggregat drivstofftank vakttårn kontrollrom | Vaktlaget:4 Ola (deg):1 Tropp 1:4 | ? | KONTROLLROM OK kontrollrom -40,40 |
| 2 | 2.2 mill. | 6 | 49 | 28 | brakke(27%) aggregat(26%) drivstofftank(24%) vakttårn(81%) kontrollrom(21%) | Vaktlaget:0 Ola (deg):1 Tropp 1:1 | ? | FORSVAR |
| 3 | 2.2 mill. | 6 | 39 | 22 | vakttårn(19%) | Vaktlaget:0 Ola (deg):1 Tropp 1:1 | ? | FORSVAR |

- Bølge 1 (ett lag, 12 mann) kom etter 24 spilltimer og ble slått (+450 000 kr). Kystalliansens lag fant leiren på dag 2, slo ut
  Vaktlaget og ødela byggene (21–27 %); dag 3 sto bare vakttårnet igjen. Derfor fredstiden i `fraksjoner-visning.js`.

**Kjøring 2** (all koden i denne pakka; kontrollrommet først fra dag 3 når kassa har 14 mill., slik rådet sier):

| Etter døgn | Kassa | Folk | Moral | Mat | Bygg (* = under bygging, % = helse) | Lag (levende) | Bølger | Hva skjedde |
|---|---|---|---|---|---|---|---|---|
| 1 | 13.5 mill. | 6 | 63 | 36 | brakke aggregat drivstofftank vakttårn | Vaktlaget:4 Ola (deg):1 Tropp 1:4 | ? | FORSVAR |
| 2 | 14.0 mill. | 6 | 63 | 30 | brakke(95%) aggregat(95%) drivstofftank(95%) vakttårn(95%) | Vaktlaget:4 Ola (deg):1 Tropp 1:4 | 1 | Angrepet er slått tilbake! Dere tok 450 000 kr fra røverne. |
| 3 | 2.7 mill. | 9 | 57 | 24 | brakke(94%) aggregat(34%) drivstofftank(94%) vakttårn(93%) kontrollrom | Vaktlaget:4 Ola (deg):1 Tropp 1:4 | 2 | Varsel: et røverlag er på vei mot leiren fra sørøst (1,7 km unna). Bølge 2.; Angrepet er slått tilbake! Dere tok 600 000 kr fra røverne. |
| 4 | 2.7 mill. | 9 | 30 | 6 |  | Vaktlaget:3 Ola (deg):1 Tropp 1:3 | 3 | Varsel: et røverlag er på vei mot leiren fra sørvest (1,4 km unna). Bølge 3.; Sabotasje! Røverne har ødelagt aggregat i leiren og stikker av.; Spolingen stoppet: et lag er i ildkamp, et bygg i leiren er ødelagt.; Brannen tar Vakttårn i leiren – det er ødelagt.; Brannen tar Brakke i leiren – det er ødelagt.; Spolingen stoppet: et bygg i leiren er ødelagt.; Brannen tar Dieseltank i leiren – det er ødelagt.; Brannen tar Kontrollrom i leiren – det er ødelagt. |
| 5 | 2.7 mill. | 9 | 5 | 0 |  | Vaktlaget:0 Ola (deg):1 Tropp 1:3 | 4 (aktiv) | Varsel: et røverlag er på vei mot leiren fra sørvest (1,9 km unna). Bølge 4.; Flommen 9,3 km øst for leiren har trukket seg tilbake. |

- Røverne er ikke lenger hovedinntekten: 450 000 og 600 000 kr for bølge 1 og 2; kassa holdt seg på 13,5–14 mill. til
  kontrollrommet ble kjøpt på dag 3. Bølgene kom etter 24 og 50 spilltimer med ett lag hver, og leiren tålte dem (byggene 94–95 %).
- Motstanderne kom ikke til leiren i fredstiden.
- **Dag 4 falt leiren likevel** – ikke på grunn av røverbølgens størrelse, men fordi bølge 3 var en sabotørbølge (krig-visning.js:
  «Sabotasje! Røverne har ødelagt aggregat i leiren og stikker av») og brannen etterpå (verden-visning.js) spredte seg til vakttårn,
  brakke, dieseltank og kontrollrom. Samtidig var maten nesten tom (6 rasjoner, moral 30): skriptet kjøpte aldri mat, og
  opplæringen sier ikke at det må gjøres. Det er de neste tingene å balansere (filene eies av andre pakker, så de er ikke rørt her):
  ingen sabotører de første bølgene/døgnene, brann som ikke tar hele leiren (avstand mellom byggene, slukking med folk), og et råd/mål om mat.
- Dag 5: ingen bygg, ingen mat, moral 5, Vaktlaget slått ut, bølge 4 på vei. Kjøringen ble stoppet der (fristen).
- Målet («står støtt etter sju døgn») ble altså ikke nådd i kjøring 2.

**Kjøring 3** (runde 2: ingen tidlige sabotører, brannen i leiren, varsel og mål for mat; skriptet kjøper 50 rasjoner når maten
rekker under to døgn). Stoppet etter tre døgn:

| Etter døgn | Kassa | Folk | Moral | Mat | Bygg (* = under bygging, % = helse) | Lag (levende) | Bølger | Hva skjedde |
|---|---|---|---|---|---|---|---|---|
| 1 | 13.5 mill. | 6 | 70 | 44 | brakke aggregat drivstofftank vakttårn | Vaktlaget:4 Ola (deg):1 Tropp 1:4 | 1 (aktiv) | Varsel: et røverlag er på vei mot leiren fra sør (1,9 km unna). Bølge 1. |
| 2 | 13.5 mill. | 6 | 21 | 38 |  | Vaktlaget:1 Ola (deg):1 Tropp 1:0 | 1 (aktiv) | Vakttårn er ødelagt av Røvere 1.1!; Spolingen stoppet: et bygg i leiren er ødelagt.; Brakke er ødelagt av Røvere 1.1!; Aggregat er ødelagt av Røvere 1.1!; Dieseltank er ødelagt av Røvere 1.1! 500 l diesel gikk tapt.; Spolingen stoppet: et bygg i leiren er ødelagt. |
| 3 | 13.5 mill. | 5 | 25 | 32 |  | Vaktlaget:1 Ola (deg):1 Tropp 1:0 | 1 (aktiv) | Kristin Nygård har forlatt gjengen (moralen er for lav). |

- Denne gangen tapte forsvaret alt i bølge 1: ett røverlag på 12 mann mot Vaktlaget (4) og Tropp 1 (4) – Tropp 1 ble slått ut, og
  røverne ødela vakttårn, brakke, aggregat og dieseltank (HERJER i leir-visning.js). I kjøring 2 vant de samme to lagene mot det
  samme røverlaget – utfallet var på vippen. Derfor: røverlagene har nå 4 + 2 mann per bølge (6, 8, 10, 12), og aldri flere enn
  soldatene dine + 2 (`Trussel.menn`, bare i ekte spill).

**Kjøring 4** (all koden, også de små røverlagene). Stoppet etter seks døgn (fristen):

| Etter døgn | Kassa | Folk | Moral | Mat | Bygg (* = under bygging, % = helse) | Lag (levende) | Bølger | Hva skjedde |
|---|---|---|---|---|---|---|---|---|
| 1 | 13.0 mill. | 6 | 63 | 44 | brakke aggregat drivstofftank vakttårn | Vaktlaget:4 Ola (deg):1 Tropp 1:4 | 1 (aktiv) | Varsel: et røverlag er på vei mot leiren fra sør (2,0 km unna). Bølge 1. |
| 2 | 13.5 mill. | 6 | 69 | 38 | brakke(95%) aggregat(95%) drivstofftank(95%) vakttårn(95%) | Vaktlaget:4 Ola (deg):1 Tropp 1:4 | 1 | Angrepet er slått tilbake! Dere tok 450 000 kr fra røverne. |
| 3 | 2.2 mill. | 9 | 76 | 31 | brakke(89%) aggregat(90%) drivstofftank(90%) vakttårn(90%) kontrollrom | Vaktlaget:4 Ola (deg):1 Tropp 1:4 | 2 | Varsel: et røverlag er på vei mot leiren fra øst (2,1 km unna). Bølge 2.; Angrepet er slått tilbake! Dere tok 600 000 kr fra røverne.; KONTROLLROM OK kontrollrom -40,40 |
| 4 | 2.5 mill. | 9 | 77 | 63 | brakke(75%) aggregat(77%) drivstofftank(77%) vakttårn(76%) kontrollrom(87%) | Vaktlaget:3 Ola (deg):1 Tropp 1:3 | 3 | Varsel: et røverlag er på vei mot leiren fra øst (1,6 km unna). Bølge 3.; Angrepet er slått tilbake! Dere tok 750 000 kr fra røverne.; MAT kjøpte 50 rasjoner |
| 5 | 2.5 mill. | 9 | 55 | 53 | brakke(23%) aggregat(27%) drivstofftank(25%) vakttårn(25%) kontrollrom(37%) | Vaktlaget:3 Ola (deg):1 Tropp 1:2 | 4 (aktiv) | Varsel: et røverlag er på vei mot leiren fra øst (1,7 km unna). Bølge 4.; Radio: Rykte: det skal ligge noe (forlatt leir) 7,2 km sørøst for leiren.; Radio: Rykte: det skal ligge noe (forlatt leir) 1,3 km øst for leiren. |
| 6 | 2.5 mill. | 9 | 45 | 34 |  | Vaktlaget:3 Ola (deg):1 Tropp 1:2 | 4 (aktiv) | Brakke er ødelagt av Røvere 4.1!; Spolingen stoppet: et bygg i leiren er ødelagt.; Vakttårn er ødelagt av Røvere 4.1!; Dieseltank er ødelagt av Røvere 4.1! 156 l diesel gikk tapt.; Spolingen stoppet: et bygg i leiren er ødelagt.; Aggregat er ødelagt av Røvere 4.1! 200 l diesel gikk tapt.; Spolingen stoppet: et bygg i leiren er ødelagt.; Kontrollrom er ødelagt av Røvere 4.1!; Spolingen stoppet: et bygg i leiren er ødelagt. |

- Døgn 1–4 sto leiren: bølge 1–3 (ett lag hver) ble slått, byttet 450 000 / 600 000 / 750 000 kr, moralen 63–77, maten kjøpt i tide
  (varselet kom), ingen sabotører og ingen brann. Kontrollrommet ble bygget på dag 3.
- **Det som veltet leiren på dag 6:** bølge 4 (ett lag på 8) ble ikke slått ut. Røverne ble stående inne i leiren og ødela bygg etter
  bygg (HERJER i leir-visning.js) i et døgn, mens Vaktlaget (3) og Tropp 1 (2) ikke fikk has på dem. Byggene var alt slitt ned til
  23–37 % (skriptet reparerer aldri, og byggene tar skade i hver bølge). Neste ting å se på: at røvere som har herjet en stund
  trekker seg med byttet (bølgen er over), at forsvarerne søker mot herjerne, og at opplæringen sier «reparer byggene» og
  «lag en tropp til» (skriptet laget aldri mer enn én tropp på fire).
- Målet (sju døgn) er dermed ikke nådd, men leiren holdt to døgn lenger enn i kjøring 2 og tre lenger enn i kjøring 1.



## Også gjort (punkt 5)
- (a) Avbrutt bølge: se tabellen (samme bølge igjen etter 20 spillminutter). Ikke prøvd i nettleser med en ekte omlasting.
- (b) Du sover av deg selv i leiren også før brakka står, halvt så godt (`karakter.js`, Claudes forslag). Ikke prøvd i nettleser.
- (c) Første hus og butikker, se tabellen. Ikke prøvd i nettleser.
- (d) Steget «Gå i 3D» i opplæringen velger karakterlaget før Gå trykkes, så du starter ved karakteren (`opplaering.js`,
  lytter i fangstfasen). Ikke prøvd i nettleser.

## Ikke gjort
- En full sjudøgnskjøring der leiren står (se over: sabotører, brann og mat).
- Vakten «ui» ga KAST på mobil i mitt eget prøveskript (`… reading 'getBoundingClientRect'`); de andre vaktene var OK på PC og
  mobil, og «ui» var OK på PC. Ikke undersøkt om det er prøveskriptet (390 × 844, isMobile) eller en feil.

## Vakt
`pipeline/fliser/vakter/balanse.js`: tallene for bølgene, byttet, første bølge, kostnaden for de fire første byggene + diesel
(≤ 35 mill.), hyllene, og at testspillet har stridsvogna og rakettartilleriet. OK på PC og mobil (32,8 mill.).

## Runde 4 (18. nov dag)

Målet: en ny spiller som følger rådene, skal klare sju spilldøgn på /rogaland med «Vanlig» – uten at det blir lett. Kjøring 4 falt på
dag 6 fordi røverne i bølge 4 ble stående inne i leiren et døgn, ingen slo dem, og byggene var aldri reparert. **Alle tallene er Claudes forslag.**

### Det som er laget

| Hva | Tall | Fil | Hvorfor |
|---|---|---|---|
| **1. Røvere som har herjet** trekker seg ut med byttet | inne i leiren = innen 150 m fra midten eller så nær et bygg at de skader det (HERJER i leir-visning.js); etter 90 spillminutter der (kjøring 5a: 45, 5b–6b: 60) tar laget byttet og går samme vei ut som det kom (e.fra); fjernes ved 1,8 km eller etter 90 spillminutter | `spillet.js` Trussel.HERJ, herjet(), bytte(), bytteTekst(), ferdig() → 'herjet'; `spillet-visning.js` (KROKER.sim teller e.inne, trekkUt, utSteg) | Røverne sto et døgn i leiren i kjøring 4. |
| Byttet per røverlag | 5 % av kassa (høyst 500 000 kr), 20 % av tre/betong/stål, 10 % av dieselen, 15 % av maten | Trussel.HERJ | Merkes, men tar ikke alt. Kjøring 5a/5b: 8 %/800 000 kr og 25 % av dieselen (8000 kr literen: over 1 mill. kr) var for mye. |
| Røverne gir opp | et røverlag der en tredel er falt eller såret (HERJ.brudd 1/3; kjøring 5b–6b: halvparten), flykter samme vei som det kom og teller som slått ut – bølgen kan bli «slått tilbake» med belønning | Trussel.brutt(), `spillet-visning.js` | Terreng regner et lag som slått ut først ved 6 ute: et røverlag på 6 måtte slås helt ut. |
| Bølgen er over («herjet») | ikke «slått tilbake», ingen belønning, moral −4; melding i loggen og varselet; neste bølge planlegges som vanlig; T.herjet teller | `spillet-visning.js` | |
| **2. Forsvarerne går mot røverne** | fiender i leiren – røvere og (etter kjøring 7) også fraksjonenes lag – innen 150 m (Forsvar.R.mot.inne) eller nær et bygg (HERJER) → egne lag innen 3 km som står stille, er i forsvarsstilling eller allerede går mot dem (ikke på vei et annet sted, ikke om bord, ikke slått ut) og Leirvakta går til et punkt 25 m fra nærmeste røver; et lag på vei får ny ordre når målet har flyttet seg 40 m, og et lag som står mer enn 55 m unna, sendes på nytt (høyst hvert 4. sekund) – men ikke et lag som står stille og skyter mot en røver innen 120 m (mot.skyter). Kjøring 5b: med 50 m sto lagene i skogen uten å se røverne og løsnet ikke et skudd. Leirvakta tar opp våpen av seg selv (≥ 2 på vakt), og legger dem ned igjen når fienden er ute hvis det ikke var en røverbølge. Når fienden er ute: tilbake til forsvarsstillingen. | `forsvar.js` motHerjere(), `forsvar-visning.js` motSteg/motFerdig | |
| Hjem igjen | et lag som trakk seg tilbake av seg selv (stridsreglene: egetValg «trakk …»), står stille mer enn 400 m fra leiren (innen 3 km) og har ingen fiende innen 900 m, går hjem når det har gått 30 spillminutter | `forsvar.js` R.hjem, `forsvar-visning.js` hjemSteg | Kjøring 6a: lagene sto 1,6 km unna i døgn. |
| **3. Reparasjon** av seg selv | ledige byggelag (Leir.byggelag − jobbene) reparerer bygg under 95 % helse, de mest skadde først, bare mellom bølgene og ikke mens fiender er innen 200 m fra leiren, og 300 000 kr blir alltid igjen i kassa. Standard på, også i lagrede spill; bryter i Leir → Bygg → Forsvar («riksbrudd-reparer», per leir). Prisen og farten er Leir.reparer som før (25 % av prisen × skaden, 30 % av byggetiden × skaden). | `forsvar.js` velgReparasjon(), `forsvar-visning.js` repSteg | Byggene var 23–37 % før bølge 4 i kjøring 4. |
| Skadevarsel etter angrep | «N bygg er skadet» i banneret øverst (#alarm) med «Reparer alle (X kr)» og «Lukk», i 3 minutter eller til alt repareres; knappen også i Leir → Bygg → Forsvar | `forsvar.js` skadet(), `forsvar-visning.js` etterAngrep/visSkade/reparerAlle | |
| **4. Opplæringen**: fire nye steg etter de fem | «Lag en tropp til» (to tropper), «Ha mat til tre døgn», «Sett lagene i forsvar» (alarmen eller en øvelse), «Reparer byggene etter et angrep» (et angrep er over og ingen bygg under 98 % står ureparert) | `opplaering.js` (NYE; lagret opplæring som var ferdig og lukket, får dem som «hoppet over»), `test_opplaering.js` | |
| Målet «Bygg kontrollrommet» | hjelpeteksten sier «to tropper og et vakttårn» | `maal.js` | (Antallet mål er uendret: vakta «spillform» teller 19/15.) |

Alt som skjer av seg selv (herjing, mot røverne, reparasjon, skadevarsel) skjer bare når `!navigator.webdriver || SpilletSpill.test / ForsvarSpill.test`.
API: `SpilletSpill.trekkUt(e)`, `SpilletSpill.utSteg()`; `ForsvarSpill.test`, `motSteg()`, `motFerdig()`, `hjemSteg()`, `herjere()`, `repSteg(tving)`, `reparerAlle()`,
`repPå()`, `settRep(på)`, `etterAngrep()`, `skade()`, `lukkSkade()`; `Forsvar.R.mot`, `Forsvar.R.rep`, `Forsvar.R.hjem`, `Trussel.brutt`, `Forsvar.motHerjere`, `velgReparasjon`, `skadet`.
Fellesfiler: ingen (leir.js og leir-visning.js er IKKE endret – reparasjonen går gjennom Leir.reparer/Leir.jobber/Leir.byggelag fra forsvar-visning.js).


### Gjennomspillingen (/rogaland, Sand 6825, 6627357, «Vanlig», webdriver av)

Skriptene ligger i scratchpad `natt/balanse4/` (daemon.js med dev.py, `kjor.sh` kjører alt, `s/ny.js`, `hj.js`, `hj2.js`, `b1.js`, `b2.js`,
`dag.js`; `tabell.py` lager tabellen). Skriptet spiller slik rådene sier: brakke, aggregat, dieseltank, Tropp 1 (fire som ikke er på bygg/vakt)
og vakttårn ved start, 500 l diesel når tanken står og under 300 l, «Forsvar leiren» ved alarm, «Reparer alle» når skadevarselet kommer,
Tropp 2 fra dag 2 (rekrutterer opp til 8 folk først; de som er igjen: to på bygg, én på vakt), rekrutterer når færre enn 4 er hjemme
(og kassa har 3 mill.), kjøper 50 rasjoner når maten rekker under to døgn, og kontrollrommet først når to tropper står og kassa har 16 mill.
Første valg på alle kort. Hvert døgn får inntil 6–7,5 minutter ekte tid (spoling med ⏭).

**Kjøring 5a** (første utgave av punkt 1–3: herjing etter 45 min, bytte 8 % / høyst 800 000 kr og 25 % av dieselen). Stoppet etter to døgn for å rette:

| Etter døgn | Kassa | Folk | Moral | Mat | Bygg (* = under bygging, % = helse) | Lag (levende) | Bølger | Hva skjedde |
|---|---|---|---|---|---|---|---|---|
| 1 | 13.5 mill. | 6 | 65 | 44 | brakke aggregat drivstofftank vakttårn | Vaktlaget:4 Ola (deg):1 Tropp 1:4 | 1 (aktiv) | Varsel: et røverlag er på vei mot leiren fra sørøst (1,5 km unna). Bølge 1. |
| 2 | 10.5 mill. | 4 | 67 | 23 | brakke(96%) aggregat(97%) drivstofftank(97%) vakttårn(95%) | Vaktlaget:2 Ola (deg):1 Tropp 1:4 Tropp 2:4 | 1 | Røverne er inne i leiren! Vaktlaget, Tropp 1 går mot dem.; Røvere 1.1 har herjet i leiren og trekker seg ut med byttet: 800 000 kr, 125 l diesel og 6; Bølge 1 er over: røverne har trukket seg ut med byttet. Det ble ingen belønning denne gang; REPARER Reparer alle (200 310 kr); TROPP 2 ok rekrutt,rekrutt folk igjen bygg,bygg,vakt,bygg; 14 reparasjoner av seg selv |

- Bølge 1 (ett lag på 6) kom inn i leiren; Vaktlaget og Tropp 1 gikk mot dem, men røverne herjet i 41 minutter og tok 800 000 kr. Et røverlag
  på 6 regnes først som slått ut når alle 6 er ute (Terreng: 6 ute) – derfor «gir opp ved halvparten» (Trussel.brutt).
- Røverne som trakk seg ut, ble stående i leiren (ruta bort fantes ikke), og byggene ble reparert og skadet om igjen i nesten tre timer
  (14 reparasjoner, 1,2 mill. kr). Derfor: samme vei ut som de kom, fjernet etter 90 min, og ingen reparasjon mens fiender er i leiren.

**Kjøring 5b** (herjing etter 60 min, bytte 5 % / høyst 500 000 kr, gir opp ved halvparten). Døgn 6 ble ikke ferdig innen tidsgrensen (raden «5» to ganger):

| Etter døgn | Kassa | Folk | Moral | Mat | Bygg (* = under bygging, % = helse) | Lag (levende) | Bølger | Hva skjedde |
|---|---|---|---|---|---|---|---|---|
| 1 | 13.5 mill. | 6 | 65 | 44 | brakke aggregat drivstofftank vakttårn | Vaktlaget:4 Ola (deg):1 Tropp 1:4 | 1 (aktiv) | Varsel: et røverlag er på vei mot leiren fra øst (1,7 km unna). Bølge 1. |
| 2 | 12.7 mill. | 4 | 68 | 39 | brakke(97%) aggregat drivstofftank vakttårn(96%) | Vaktlaget:4 Ola (deg):1 Tropp 1:4 Tropp 2:4 | 1 | Angrepet er slått tilbake! Dere tok 450 000 kr fra røverne.; TROPP 2 ok rekrutt,rekrutt folk igjen bygg,bygg,vakt,bygg; 4 reparasjoner av seg selv |
| 3 | 12.9 mill. | 6 | 80 | 53 | brakke aggregat drivstofftank vakttårn | Vaktlaget:4 Ola (deg):1 Tropp 1:4 Tropp 2:4 | 2 | Varsel: et røverlag er på vei mot leiren fra øst (2,1 km unna). Bølge 2.; Røverne er inne i leiren! Vaktlaget går mot dem.; Angrepet er slått tilbake! Dere tok 600 000 kr fra røverne.; REPARER Reparer alle (112 945 kr); 2 reparasjoner av seg selv |
| 4 | 12.0 mill. | 6 | 95 | 28 | brakke aggregat drivstofftank vakttårn | Vaktlaget:4 Ola (deg):1 Tropp 1:4 Tropp 2:4 | 3 | Flommen 9,4 km øst for leiren har trukket seg tilbake.; Varsel: et røverlag er på vei mot leiren fra sørøst (1,8 km unna). Bølge 3.; Røverne er inne i leiren! Vaktlaget går mot dem.; Røvere 3.1 har herjet i leiren og trekker seg ut med byttet: 500 000 kr, 125 l diesel og 7; Bølge 3 er over: røverne har trukket seg ut med byttet. Det ble ingen belønning denne gang; 4 reparasjoner av seg selv |
| 5 | 7.3 mill. | 6 | 90 | 17 | brakke aggregat drivstofftank vakttårn | Vaktlaget:4 Ola (deg):1 Tropp 1:4 Tropp 2:4 | 4 | Varsel: et røverlag er på vei mot leiren fra vest (1,6 km unna). Bølge 4.; Røvere 4.1 har herjet i leiren og trekker seg ut med byttet: 500 000 kr, 93 l diesel og 3 ; Bølge 4 er over: røverne har trukket seg ut med byttet. Det ble ingen belønning denne gang; 4 reparasjoner av seg selv |
| 5 | 5.5 mill. | 7 | 53 | 42 | brakke aggregat drivstofftank vakttårn | Vaktlaget:0 Ola (deg):1 Tropp 1:4 Tropp 2:4 | 5 | Varsel: 2 røverlag er på vei mot leiren fra sørvest (2,1 km unna). Bølge 5.; Røverne er inne i leiren! Vaktlaget går mot dem.; Røvere 5.1 har herjet i leiren og trekker seg ut med byttet: 356 000 kr, 193 l diesel og 8; Røvere 5.2 har herjet i leiren og trekker seg ut med byttet: 338 000 kr, 145 l diesel og 7; Bølge 5 er over: røverne har trukket seg ut med byttet. Det ble ingen belønning denne gang; MAT kjøpte 50 rasjoner; 4 reparasjoner av seg selv |
| 6 | 5.5 mill. | 7 | 53 | 41 | brakke aggregat drivstofftank vakttårn | Vaktlaget:0 Ola (deg):1 Tropp 1:4 Tropp 2:4 | 5 |  |

- Leiren sto: alle fire byggene var hele ved hver døgnslutt (reparert av seg selv 2–4 ganger per døgn). Bølge 1 og 2 ble slått tilbake
  (450 000 og 600 000 kr), bølge 3, 4 og 5 endte med at røverne herjet og tok byttet. Kassa falt fra 13,5 til 5,5 mill. – mest diesel (500 l koster 4 mill. kr), og i byttet tok røverne
  25 % av tanken per røverlag (8000 kr literen: 0,7–1,5 mill. kr hver gang). Nå 10 %.
- Troppene løsnet aldri et skudd (4 og 4 mann hele veien), Vaktlaget ble slått ut i bølge 5. Prøvd på Dovre-testsiden (prov3.js):
  lagene gikk 50 m fra røverne, ble stående i skogen 75–100 m fra røverne midt i leiren og så dem ikke. Nå går de til 25 m, og lag som står
  over 55 m unna, sendes på nytt. Etter det: alle tre lagene skjøt, og røverne hadde 5 av 8 ute etter 40 spillminutter.

**Kjøring 6a** (lagene går til 25 m, 10 % av dieselen i byttet). Stoppet etter fire døgn for å rette:

| Etter døgn | Kassa | Folk | Moral | Mat | Bygg (* = under bygging, % = helse) | Lag (levende) | Bølger | Hva skjedde |
|---|---|---|---|---|---|---|---|---|
| 1 | 13.5 mill. | 6 | 65 | 44 | brakke aggregat drivstofftank vakttårn | Vaktlaget:4 Ola (deg):1 Tropp 1:4 | 1 (aktiv) | Varsel: et røverlag er på vei mot leiren fra sørøst (2,1 km unna). Bølge 1. |
| 2 | 12.4 mill. | 4 | 63 | 29 | brakke(99%) aggregat drivstofftank vakttårn(99%) | Vaktlaget:4 Ola (deg):1 Tropp 1:4 Tropp 2:2 | 1 | Røverne er inne i leiren! Vaktlaget, Tropp 1 går mot dem.; Angrepet er slått tilbake! Dere tok 450 000 kr fra røverne.; REPARER Reparer alle (223 545 kr); TROPP 2 ok rekrutt,rekrutt folk igjen bygg,bygg,vakt,bygg; 4 reparasjoner av seg selv |
| 3 | 11.4 mill. | 4 | 63 | 20 | brakke aggregat drivstofftank vakttårn | Vaktlaget:4 Ola (deg):1 Tropp 1:4 Tropp 2:2 | 2 | Varsel: et røverlag er på vei mot leiren fra øst (1,9 km unna). Bølge 2.; Røvere 2.1 har herjet i leiren og trekker seg ut med byttet: 500 000 kr, 50 l diesel og 4 ; Bølge 2 er over: røverne har trukket seg ut med byttet. Det ble ingen belønning denne gang; 4 reparasjoner av seg selv |
| 4 | 10.3 mill. | 6 | 74 | 60 | brakke aggregat drivstofftank vakttårn | Vaktlaget:4 Ola (deg):1 Tropp 1:4 Tropp 2:2 | 3 | Varsel: et røverlag er på vei mot leiren fra sørøst (2,0 km unna). Bølge 3.; Røvere 3.1 har herjet i leiren og trekker seg ut med byttet: 500 000 kr, 45 l diesel og 2 ; Bølge 3 er over: røverne har trukket seg ut med byttet. Det ble ingen belønning denne gang; Lite mat: den rekker under to døgn. Kjøp mat i Folk-panelet, send et lag på jakt, fisk med; Lite mat! Dag 5: 6 personer, moral 74. Mat til 1,4 døgn. Diesel 404 l (rekker ca. 8,7 døgn; MAT kjøpte 50 rasjoner; 4 reparasjoner av seg selv |

- Bølge 1 ble slått tilbake etter en halv time i leiren (lagene gikk inn og skjøt: røverne hadde 2 av 6 ute etter 5 minutter).
- Bølge 2 og 3 endte med herjing, og grunnen var en annen: på dag 2 (spillminutt 1867–1923) «trakk» Vaktlaget, Tropp 1 og Tropp 2 «seg
  tilbake» 1,5 km etter stridsreglene sine (underlegen: trekk) og ble stående der i døgn – 1,6–1,8 km fra leiren da bølge 2 kom. De rakk
  ikke inn før røverne hadde herjet en time. Derfor «hjem igjen» (Forsvar.R.hjem): et lag som trakk seg tilbake av seg selv, går hjem
  til leiren når det har gått 30 spillminutter og ingen fiende er nærmere enn 900 m.
- Leiren sto likevel: byggene ble reparert, kassa 10,3 mill. etter fire døgn.

**Kjøring 6b** (med «hjem igjen»). Stoppet etter to døgn for å rette:

| Etter døgn | Kassa | Folk | Moral | Mat | Bygg (* = under bygging, % = helse) | Lag (levende) | Bølger | Hva skjedde |
|---|---|---|---|---|---|---|---|---|
| 1 | 13.5 mill. | 6 | 62 | 43 | brakke aggregat drivstofftank vakttårn | Vaktlaget:4 Ola (deg):1 Tropp 1:4 | 1 (aktiv) | Varsel: et røverlag er på vei mot leiren fra nordøst (1,4 km unna). Bølge 1. |
| 2 | 11.5 mill. | 4 | 52 | 52 | brakke(96%) aggregat drivstofftank(95%) vakttårn(96%) | Vaktlaget:3 Ola (deg):1 Tropp 1:2 Tropp 2:4 | 1 | Røverne er inne i leiren! Vaktlaget, Tropp 1 går mot dem.; Røvere 1.1 har herjet i leiren og trekker seg ut med byttet: 500 000 kr, 50 l diesel og 6 ; Bølge 1 er over: røverne har trukket seg ut med byttet. Det ble ingen belønning denne gang; REPARER Reparer alle (215 070 kr); TROPP 2 ok rekrutt,rekrutt folk igjen bygg,bygg,vakt,bygg; 4 reparasjoner av seg selv |

- Bølge 1: Vaktlaget og Tropp 1 (8 mann) gikk inn mot røverne (6), men fikk bare én ute på en time – de flyttet seg hele tiden etter
  røverne (på marsj treffer de dårligere), og røverne herjet og tok 500 000 kr. Derfor: røverne gir opp ved en tredel ute, herjer i
  halvannen time før de tar byttet, og et lag som står og skyter, flyttes ikke.

**Kjøring 7** (røverne gir opp ved en tredel ute, herjer i 90 min, lag som skyter flyttes ikke). Hele sju døgn:

| Etter døgn | Kassa | Folk | Moral | Mat | Bygg (* = under bygging, % = helse) | Lag (levende) | Bølger | Hva skjedde |
|---|---|---|---|---|---|---|---|---|
| 1 | 13.5 mill. | 6 | 62 | 43 | brakke aggregat drivstofftank vakttårn | Vaktlaget:4 Ola (deg):1 Tropp 1:4 | 1 (aktiv) | Varsel: et røverlag er på vei mot leiren fra sør (2,2 km unna). Bølge 1. |
| 2 | 12.7 mill. | 4 | 61 | 26 | brakke aggregat drivstofftank vakttårn | Vaktlaget:2 Ola (deg):1 Tropp 1:4 Tropp 2:4 | 1 | Røverne er inne i leiren! Vaktlaget går mot dem.; Angrepet er slått tilbake! Dere tok 450 000 kr fra røverne.; TROPP 2 ok rekrutt,rekrutt folk igjen bygg,bygg,vakt,bygg; 4 reparasjoner av seg selv |
| 3 | 13.1 mill. | 4 | 70 | 21 | brakke aggregat drivstofftank vakttårn | Vaktlaget:2 Ola (deg):1 Tropp 1:4 Tropp 2:4 | 2 | Flommen 5,9 km nordvest for Sand har trukket seg tilbake.; Varsel: et røverlag er på vei mot leiren fra øst (1,7 km unna). Bølge 2.; Røverne er inne i leiren! Vaktlaget, Tropp 2 går mot dem.; Angrepet er slått tilbake! Dere tok 600 000 kr fra røverne.; REPARER Reparer alle (128 397 kr) |
| 4 | 13.8 mill. | 5 | 83 | 55 | brakke aggregat drivstofftank vakttårn | Vaktlaget:2 Ola (deg):1 Tropp 1:4 Tropp 2:4 | 3 | Varsel: et røverlag er på vei mot leiren fra sørvest (1,5 km unna). Bølge 3.; Angrepet er slått tilbake! Dere tok 750 000 kr fra røverne.; Lite mat: den rekker under to døgn. Kjøp mat i Folk-panelet, send et lag på jakt, fisk med; MAT kjøpte 50 rasjoner |
| 5 | 10.2 mill. | 5 | 78 | 67 | brakke(56%) aggregat(56%) drivstofftank(54%) vakttårn(58%) | Vaktlaget:0 Ola (deg):1 Tropp 1:0 Tropp 2:3 | 4 | Varsel: et røverlag er på vei mot leiren fra nordøst (1,8 km unna). Bølge 4.; Angrepet er slått tilbake! Dere tok 900 000 kr fra røverne.; Flommen 11 km øst for leiren har trukket seg tilbake.; REPARER Reparer alle (3,1 mill. kr); 4 reparasjoner av seg selv |
| 6 | 9.7 mill. | 5 | 28 | 51 |  | Vaktlaget:0 Ola (deg):1 Tropp 1:0 Tropp 2:3 | 5 | Dieseltank er ødelagt av Kystalliansens 3. lag! 286 l diesel gikk tapt.; Aggregat er ødelagt av Kystalliansens 3. lag! 200 l diesel gikk tapt.; Brakke er ødelagt av Kystalliansens 3. lag!; Vakttårn er ødelagt av Kystalliansens 3. lag!; Varsel: et røverlag er på vei mot leiren fra sør (2,1 km unna). Bølge 5.; Røvere 5.1 har herjet i leiren og trekker seg ut med byttet: 500 000 kr og 9 rasjoner.; Bølge 5 er over: røverne har trukket seg ut med byttet. Det ble ingen belønning denne gang; Flommen 9 km nordvest for Sand har trukket seg tilbake. |
| 7 | 8.9 mill. | 7 | 22 | 35 |  | Vaktlaget:0 Ola (deg):1 Tropp 1:0 Tropp 2:3 | 6 | Varsel: et røverlag er på vei mot leiren fra nordøst (1,5 km unna). Bølge 6.; Røvere 6.1 har herjet i leiren og trekker seg ut med byttet: 483 000 kr og 6 rasjoner.; Bølge 6 er over: røverne har trukket seg ut med byttet. Det ble ingen belønning denne gang |

- **Røverne: bølge 1–4 ble slått tilbake** (450 000, 600 000, 750 000 og 900 000 kr), byggene ble reparert av seg selv, og leiren sto
  fullt oppe i fem døgn med 10–14 mill. kr i kassa og moral 61–83.
- Bølge 4 varte i ti spilltimer: røverne sto like utenfor 150 m fra midten, men nær byggene, og skadet dem (ned til 54–58 %) uten å telle
  som «inne» – og lagene gikk ikke mot dem. Rettet etter kjøringen: røvere som skader bygg (HERJER), teller som inne.
- **Dag 6 falt leiren – for Kystalliansen, ikke for røverne:** fredstiden (4 døgn på Vanlig, `fraksjoner-visning.js`) var over, og
  «Kystalliansens 3. lag» ødela dieseltank, aggregat, brakke og vakttårn (spillminutt 7604–7640). Da var Vaktlaget og Tropp 1 slått ut
  (alle sårede, Tropp 1 uten ammunisjon) og Tropp 2 sto 1,5 km unna etter å ha trukket seg tilbake (en fiende innen 900 m holdt den
  ute – «hjem igjen» venter til faren er over). Bølge 5 og 6 herjet i den tomme leiren (500 000 og 483 000 kr).
- Rettet etter kjøringen: lagene hjemme går nå mot ALLE fiender i leiren (også fraksjonenes lag), og Leirvakta som kom av seg selv
  uten røverbølge, legger ned våpnene når fienden er ute.
- Skriptet erstatter ikke sårede og falne (ingen nye tropper etter dag 2), og kjøper aldri ammunisjon eller kontrollrom (kassa nådde
  aldri 16 mill.). En spiller som gjør det, står sterkere enn skriptet.

**Kjøring 8** (all koden i runde 4, også fiender i leiren og HERJER som «inne»). Hele sju døgn:

| Etter døgn | Kassa | Folk | Moral | Mat | Bygg (* = under bygging, % = helse) | Lag (levende) | Bølger | Hva skjedde |
|---|---|---|---|---|---|---|---|---|
| 1 | 13.5 mill. | 6 | 71 | 44 | brakke aggregat drivstofftank vakttårn | Vaktlaget:4 Ola (deg):1 Tropp 1:4 | 1 (aktiv) | Varsel: et røverlag er på vei mot leiren fra nordøst (2,0 km unna). Bølge 1. |
| 2 | 13.0 mill. | 4 | 65 | 37 | brakke aggregat drivstofftank vakttårn | Vaktlaget:4 Ola (deg):1 Tropp 1:4 Tropp 2:4 | 1 | Angrepet er slått tilbake! Dere tok 450 000 kr fra røverne.; TROPP 2 ok rekrutt,rekrutt folk igjen bygg,bygg,vakt,bygg |
| 3 | 13.2 mill. | 4 | 62 | 52 | brakke aggregat drivstofftank vakttårn | Vaktlaget:4 Ola (deg):1 Tropp 1:4 Tropp 2:3 | 2 | Varsel: et røverlag er på vei mot leiren fra nord (1,6 km unna). Bølge 2.; Angrepet er slått tilbake! Dere tok 600 000 kr fra røverne.; 4 reparasjoner av seg selv |
| 4 | 13.7 mill. | 8 | 56 | 44 | brakke aggregat drivstofftank vakttårn | Vaktlaget:3 Ola (deg):1 Tropp 1:4 Tropp 2:3 | 3 | Varsel: et røverlag er på vei mot leiren fra nordøst (2,0 km unna). Bølge 3.; Angrepet er slått tilbake! Dere tok 750 000 kr fra røverne.; REPARER Reparer alle (97 949 kr); 3 reparasjoner av seg selv |
| 5 | 12.1 mill. | 8 | 21 | 27 | vakttårn | Vaktlaget:0 Ola (deg):1 Tropp 1:0 Tropp 2:0 | 4 | Fienden er inne i leiren! Vaktlaget, Tropp 1, Tropp 2 går mot dem.; Varsel: et røverlag er på vei mot leiren fra sørøst (1,4 km unna). Bølge 4.; Dieseltank er ødelagt av Kystalliansens 4. lag! 300 l diesel gikk tapt.; Spolingen stoppet: et bygg i leiren er ødelagt.; Aggregat er ødelagt av Røvere 4.1! 200 l diesel gikk tapt.; Brakke er ødelagt av Kystalliansens 4. lag!; Spolingen stoppet: et bygg i leiren er ødelagt.; Røvere 4.1 har herjet i leiren og trekker seg ut med byttet: 500 000 kr og 5 rasjoner.; Bølge 4 er over: røverne har trukket seg ut med byttet. Det ble ingen belønning denne gang; REPARER Reparer alle (168 605 kr); 4 reparasjoner av seg selv |
| 6 | 11.2 mill. | 10 | 18 | 63 | vakttårn | Vaktlaget:0 Ola (deg):1 Tropp 1:0 Tropp 2:0 | 5 | Lite mat: den rekker under to døgn. Kjøp mat i Folk-panelet, send et lag på jakt, fisk med; Varsel: et røverlag er på vei mot leiren fra øst (1,6 km unna). Bølge 5.; Røvere 5.1 har herjet i leiren og trekker seg ut med byttet: 500 000 kr og 2 rasjoner.; Bølge 5 er over: røverne har trukket seg ut med byttet. Det ble ingen belønning denne gang; REPARER Reparer alle (155 220 kr); MAT kjøpte 50 rasjoner |
| 7 | 10.4 mill. | 9 | 24 | 49 | vakttårn(39%) | Vaktlaget:0 Ola (deg):1 Tropp 1:0 Tropp 2:0 | 6 | Varsel: et røverlag er på vei mot leiren fra sørøst (1,7 km unna). Bølge 6.; Vakta melder: Sabotører 6 600 m fra leiren!; 1. lastebilkolonne er under ild fra Sabotører 6 (36 m)!; Sabotører 6 åpner ild mot Ola (deg).; Sabotasje! Røverne har skadet vakttårn i leiren og stikker av.; Jon Stølen har forlatt gjengen (moralen er for lav).; Sabotørene er borte.; Sabotørene slapp unna. Angrepet er over, men det ble ingen belønning denne gangen.; REPARER Reparer alle (763 385 kr) |

- Røverne: bølge 1–3 slått tilbake (450 000, 600 000, 750 000 kr), byggene reparert av seg selv (3–4 ganger per døgn), kassa 13–14 mill.
- Dag 5, spillminutt 5819 (natt til dag 5, rett etter at fredstiden på fire døgn var over): «Fienden er inne i leiren! Vaktlaget,
  Tropp 1, Tropp 2 går mot dem» – Kystalliansens 4. lag (12 mann). Alle tre lagene gikk inn, ble slått ut (alle sårede) og trakk seg
  1,5 km tilbake. Bølge 4 kom samtidig, og Kystalliansen og røverne ødela dieseltank, aggregat og brakke (6813–6820). Bølge 5 og 6
  (sabotører) herjet i den tomme leiren.

### Konklusjon (runde 4)

- **Røverne alene velter ikke lenger leiren.** I kjøring 7 og 8 ble alle røverbølgene som kom mens lagene var hele, slått tilbake
  (bølge 1–4 i kjøring 7, 1–3 i kjøring 8), byggene ble reparert av seg selv, og røvere som får herje, tar et merkbart, men ikke
  knusende bytte (høyst 500 000 kr og litt av lageret) og går – de blir ikke stående et døgn som i kjøring 4.
- **Målet (sju døgn på Vanlig) er ikke nådd:** begge de hele kjøringene falt på dag 5–6 for **Kystalliansen** da fredstiden (4 døgn
  på Vanlig, `fraksjoner-visning.js`) var over. Et lag på 12 mot tre egne lag på 4 vinner, og skriptet bygger ikke opp igjen sårede
  lag. Forslag til den som eier fraksjonene (ikke gjort her, filene er ikke mine): fredstid på minst 7 døgn på Vanlig, eller at
  fraksjonens første angrep på leiren er et lite lag (som røverne: høyst soldatene dine + 2), med et varsel i forkant.
- Ikke gjort: skriptet kjøper aldri ammunisjon, helbreder ikke sårede og lager ikke nye tropper etter dag 2, og kontrollrommet ble aldri
  kjøpt (kassa nådde ikke 16 mill.). Hvordan en menneskelig spiller som gjør det, klarer seg mot Kystalliansen, er ikke prøvd.
- Én ting jeg ikke har forklart: i kjøring 7 sto Tropp 2 1,5 km unna i over to døgn etter å ha trukket seg tilbake. «Hjem igjen»
  venter til ingen fiende er innen 900 m; trolig sto Kystalliansens lag i nærheten hele tiden. Ikke undersøkt nærmere.

### Etter flettingen (18. nov kl. 13, hovedøkta)
Fredstiden for motstanderne i `fraksjoner-visning.js` er satt fra 4 til **7 døgn på «Vanlig»** (7 / fiendens faktor, 4–10: Lett ca. 9,
Hard ca. 5), etter forslaget over (kjøring 7 og 8 falt for Kystalliansen på dag 5–6). Ett døgn før den slutter, kommer et varsel i
loggen («Motstanderne samler seg …»). Claudes forslag – ikke spilt gjennom på nytt.

## Runde 5 (18.–19. nov kveld)

Utgangspunktet: det som ble publisert kl. 22:45 (`claude/nattfiks`): fredstid 7 døgn på Vanlig, røvere som tar bytte og flykter,
lagene hjemme forsvarer, reparasjon mellom bølgene, lut og sekk. **Alle tallene er Claudes forslag.**

### Feil: last på nytt midt i et angrep fjernet røverne (rettet)
- Ny fil `spill/trussel-lagring.js` (regler øverst uten DOM, `test_trussel_lagring.js`; visningen `window.TrusselLagringSpill`), lastet
  rett etter `forsvar-visning.js`. Lagrer hvert femte sekund og ved `pagehide`/skjult fane i `riksbrudd-angrep` = `{ leir: 'x,y', d }`
  (per leir, som resten): bølgen (`aktiv`), klokka, og hvert røverlag med det `Lagring.pakkLag` tar med (sted, menn og helse, ammunisjon,
  målet for marsjen) + `raid`, `fra`, `inne`, `trekker`/`flykter`, `trekkerFra`, `bytte`, `venterNatt`. Lag som går bort fra en bølge
  som er over (raid < 0), kommer også med. Egne lag i forsvar får tilbake stridsreglene fra før forsvaret og plassen (`stridFør`,
  `forsvar` – lagring.js tar dem ikke med), og reglene settes tilbake når bølgen er over (`etterBølgen`).
- Lagringen leses bare for samme bølge, ikke når den er eldre enn to spilldøgn (`REGLER.maksAlder`) eller lagret mer enn to spilltimer
  «etter» klokka (`REGLER.framtid` – et nytt spill på samme sted). Røverne står stille og får ordren på nytt etter 1,5 s (de som trakk
  seg ut eller flyktet: samme vei ut). Loggen (ekte spill): «Angrepet fortsetter: ett røverlag i bølge N er fortsatt ved leiren.»
- I testene (navigator.webdriver) som før – ingen røvere tilbake – med mindre `TrusselLagringSpill.test`, `window.TRUSSEL_LAGRING_TEST
  = true` før skriptene lastes (omlastingsprøven), eller `tilbake(bølge, true)` (vakta).
- Prøvd i nettleser (scratchpad `natt5/balanse/prov/omlast.js`, Dovre, PC og mobil): et angrep med to røverlag (ett 220 m fra leiren
  med 37 min «inne», én såret og én falt; ett som trakk seg ut med 123 000 kr i bytte) – etter omlasting var bølge 1 fortsatt aktiv,
  begge lagene sto der de sto med samme helse, tid inne og bytte, og gikk videre (alarmen «Angrep: 2 røverlag fra vest 220 m unna»
  kom igjen). En omlasting etter at bølgen var over ga ingen røvere. Bilder: `natt5/balanse/omlast-pc.png`, `omlast-mobil.png`.
- **Fellesfil:** `spillet-visning.js` start() – én linje før den gamle: `if (avbrutt && TrusselLagringSpill.tilbake(avbrutt) > 0)` beholder
  bølgen (T.aktiv), ellers som før (samme bølge på nytt om 20 spillminutter).

### Feil: hjelpen og opplæringen kom samtidig første gang
- Rettet alt i runde 4 av pakka «telefon2» i `hjelp.js` (første(): åpnes ikke av seg selv mens opplæringen går og ikke er ferdig;
  opplæringen har «Les mer i hjelpen»). Prøvd på nytt her i et ekte spill (scratchpad `natt5/balanse/prov/forste.js`: webdriver av,
  tomt minne, startskjermen, leiren lagt): 1, 3, 6 og 12 s etter start var bare opplæringen oppe (hjelpen lukket), både på PC og
  mobil; «Les mer i hjelpen» og «?» åpnet hjelpen. Ingen kodeendring trengtes. Vakta sjekker det nå (Hjelp.første() gir false mens
  opplæringen går). Bilder: `natt5/balanse/forste-pc.png`, `forste-mobil.png`.

### Døgnoppgjøret om morgenen (nytt)
- Dagboka (`dagbok.js`) fantes: folk, moral, mat, diesel og kassa kl. 06. Den sa ikke hva som hendte. Ny fil `spill/forsvar-oppgjor.js`
  (regler øverst, `test_forsvar_oppgjor.js`; `window.OppgjorSpill`): rett etter dagbokas rapport en linje «Siste døgn: Bølge 3 slått
  tilbake. 2 nye sårede, 1 falt. Brakke ødelagt. 1 bygg skadet. 2 hus gjennomsøkt. 1 har dratt.» (eller «Et rolig døgn»). Maten står i
  dagbokas linje rett over (og i oppgjøret bare når dagboka mangler). Bildet fra i går lagres i `riksbrudd-oppgjor` per leir.
  Ikke i testene (OppgjorSpill.test).

### Gjennomspillingene (/rogaland, Sand 6825, 6627357, webdriver av)

Skriptet fra runde 4 (scratchpad `natt5/balanse/kjA/`: `daemon.js` med `dev.py`, `kjor.sh <døgn> <vanskelighet>`, `s/ny.js`, `hj.js`, `hj2.js`,
`b1.js`, `b2.js`, `dag.js`; `tabell2.py` lager tabellen) – samme «fornuftige nye spiller» som i runde 4: brakke, aggregat, dieseltank,
Tropp 1 og vakttårn ved start, 500 l diesel, «Forsvar leiren» ved alarm, «Reparer alle», Tropp 2 fra dag 2, kjøper mat under to døgn,
første valg på alle kort. Skriptet lager ingen nye tropper etter dag 2, bygger ikke sykestue og henter aldri olje til basen.
Spilt på en kopi av siden (`snapA/`, `snapB/` …), så arbeidstreet kunne endres imens. «Lag» = sårede eller falne av mennene i laget.

**Kjøring A** (det som var publisert, Vanlig, 10 døgn):

| Etter døgn | Kassa | Folk | Moral | Mat | Bygg (% = helse) | Lag: sårede eller falne / mann | Slått ut | Bølge | Hva skjedde |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 12.5 mill. | 4 | 65 | 44 | brakke aggregat drivstofftank vakttårn | Vaktlaget:0/4 Tropp 1:0/4 Tropp 2:0/4 | 0 | 1 (aktiv) |  |
| 2 | 12.9 mill. | 4 | 65 | 39 | brakke aggregat drivstofftank vakttårn | Vaktlaget:0/4 Tropp 1:0/4 Tropp 2:0/4 | 0 | 1 | Angrepet er slått tilbake! Dere tok 450 000 kr fra røverne.; REPARER Reparer alle (129 121 kr) |
| 3 | 13.5 mill. | 5 | 77 | 33 | brakke(99%) aggregat(99%) drivstofftank(99%) vakttårn(99%) | Vaktlaget:0/4 Tropp 1:0/4 Tropp 2:0/4 | 0 | 2 | Angrepet er slått tilbake! Dere tok 600 000 kr fra røverne. |
| 4 | 13.5 mill. | 7 | 66 | 25 | brakke aggregat drivstofftank vakttårn | Vaktlaget:0/4 Tropp 1:0/4 Tropp 2:0/4 | 0 | 3 | Angrepet er slått tilbake! Dere tok 750 000 kr fra røverne.; 4 rep. av seg selv |
| 5 | 12.0 mill. | 7 | 70 | 47 | brakke aggregat drivstofftank vakttårn | Vaktlaget:1/4 Tropp 1:4/4 Tropp 2:4/4 | 2 | 4 | Røvere 4.2 har herjet i leiren og trekker seg ut med byttet: 500 000 kr, 49 l di; MAT kjøpte 50 rasjoner; REPARER Reparer alle (543 784 kr); 2 rep. av seg selv |
| 6 | 10.3 mill. | 7 | 58 | 32 | brakke aggregat drivstofftank vakttårn | Vaktlaget:4/4 Tropp 1:4/4 Tropp 2:4/4 | 3 | 5 | Røvere 5.1 har herjet i leiren og trekker seg ut med byttet: 500 000 kr, 44 l di; Motstanderne samler seg. Om et døgn kan de gå løs på leiren din – ha minst to tr; REPARER Reparer alle (648 675 kr) |
| 7 | 9.0 mill. | 8 | 45 | 22 | brakke(99%) aggregat drivstofftank vakttårn(99%) | Vaktlaget:4/4 Tropp 1:4/4 Tropp 2:4/4 | 3 | 6 | Sabotasje! Røverne har skadet aggregat i leiren og stikker av.; 1 rep. av seg selv |
| 8 | 7.6 mill. | 9 | 50 | 61 | brakke aggregat drivstofftank vakttårn | Vaktlaget:4/4 Tropp 1:4/4 Tropp 2:4/4 | 3 | 7 | Sabotasje! Røverne har skadet aggregat i leiren og stikker av.; MAT kjøpte 50 rasjoner; REPARER Reparer alle (94 243 kr); 1 rep. av seg selv |
| 9 | 6.5 mill. | 9 | 59 | 32 | brakke aggregat drivstofftank vakttårn | Vaktlaget:4/4 Tropp 1:4/4 Tropp 2:4/4 | 3 | 8 | Røvere 8.1 har herjet i leiren og trekker seg ut med byttet: 378 000 kr, 37 l di; 4 rep. av seg selv |
| 10 | 7.9 mill. | 9 | 46 | 20 | brakke aggregat drivstofftank vakttårn | Vaktlaget:4/4 Tropp 1:4/4 Tropp 2:4/4 | 3 | 9 | Angrepet er slått tilbake! Dere tok 1,5 mill. kr fra røverne.; REPARER Reparer alle (166 320 kr) |

- Døgn 1–4: bølge 1–3 (ett lag på 6, 8 og 10) ble slått tilbake (450 000 / 600 000 / 750 000 kr) **uten et eneste sårede** – for lett.
- Døgn 5: bølge 4 var **to lag på 12 – 24 røvere mot 12 soldater** (taket «soldatene + 2» gjaldt per lag), og lagene hadde bare 46 %
  ammunisjon igjen (86 % etter bølge 3): basen starter uten olje, og skriptet (som en ny spiller) vet ikke at ammunisjonen fylles med
  olje på basen. Alle tre lagene ble slått ut (4/4 sårede), og røverne herjet. Vaktlaget sto med 0 % ammunisjon i bølge 5.
- Fra dag 5 hadde leiren ingen forsvarere: bølge 4, 5 og 8 herjet (500 000 / 500 000 / 378 000 kr + diesel og mat), 6 og 7 var
  sabotører som slapp unna. Byggene sto likevel (reparert av seg selv), og kassa sank fra 13,5 til 6,5–7,9 mill.
- Motstanderne (fredstid 7 døgn) kom ikke til leiren på dag 8–10.
- Svar: leiren **sto** den første uka (byggene), men alle lagene var slått ut fra dag 5 – og de første fire døgnene var uten trykk.

**Det som ble endret etter kjøring A** (alle tallene Claudes forslag):

| Hva | Før | Nå | Fil |
|---|---|---|---|
| Taket på røverne | soldatene + 2 per lag (to lag: 2 × 12) | hele bølgen: ⌈(soldatene × faktor + 2) / antall lag⌉ per lag, 5–12 (`Trussel.BALANSE.ekstra` = 2). Med ett lag som før. Vanlig, 12 soldater, to lag: 2 × 7. Hard (faktor 1,5): 3 × 7. Lett (0,6): ett lag på 10. | `spillet.js` Trussel.menn, `spillet-visning.js` (sender antall lag og faktoren) |
| Ammunisjon hjemme | bare fra olje på basen (starter med 0 t) | et lag som står stille innen 250 m fra leiren mellom angrepene, uten fiender innen 800 m, fyller 25 % av en full last per spilltime når basen ikke har olje; full last 200 000 kr, 300 000 kr blir igjen i kassa. Loggen: «Tropp 1 fyller ammunisjon i leiren (ca. 110 000 kr for full last)», lagpanelet: «fyller ammunisjon i leiren» | ny `forsvar-hjemme.js` (Hjemme.REGLER.ammo) |
| Sårede hjemme | ble aldri friske uten sykestue | +0,03 helse per spilltime for sårede (0 < helse < 1) i lag hjemme mellom angrepene (hardt såret til frisk på ca. et døgn); falne blir ikke friske; sykestua gjør det fortere som før | `forsvar-hjemme.js` (Hjemme.REGLER.hvile) |

**Kjøring B** (med endringene over, Vanlig; maskinen ble startet på nytt midt i døgn 10, så kjøringen har ni døgn):

| Etter døgn | Kassa | Folk | Moral | Mat | Bygg (% = helse) | Lag: sårede eller falne / mann | Slått ut | Bølge | Hva skjedde |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 13.0 mill. | 6 | 65 | 44 | brakke aggregat drivstofftank vakttårn | Vaktlaget:0/4 Tropp 1:0/4 | 0 | 1 (aktiv) |  |
| 2 | 10.4 mill. | 4 | 52 | 33 | brakke aggregat drivstofftank vakttårn | Vaktlaget:2/4 Tropp 1:3/4 Tropp 2:0/4 | 0 | 1 | Røvere 1.1 har herjet i leiren og trekker seg ut med byttet: 500 000 kr, 50 l di; REPARER Reparer alle (637 580 kr) |
| 3 | 10.7 mill. | 7 | 58 | 25 | brakke aggregat drivstofftank vakttårn | Vaktlaget:2/4 Tropp 1:3/4 Tropp 2:0/4 | 0 | 2 | Angrepet er slått tilbake! Dere tok 600 000 kr fra røverne.; Siste døgn: Bølge 2 slått tilbake. 3 nye i gjengen.; 4 rep. av seg selv |
| 4 | 10.2 mill. | 7 | 66 | 55 | brakke aggregat drivstofftank vakttårn | Vaktlaget:4/4 Tropp 1:3/4 Tropp 2:0/4 | 1 | 3 | Brann i leiren! 4 på vakt og bygg prøver å slokke.; Angrepet er slått tilbake! Dere tok 750 000 kr fra røverne.; Brann i leiren! 4 på vakt og bygg prøver å slokke.; Brann i leiren! 4 på vakt og bygg prøver å slokke.; Brann i leiren! 4 på vakt og bygg prøver å slokke.; Siste døgn: Bølge 3 slått tilbake. 2 falt. Ett lag er slått ut.; MAT kjøpte 50 rasjoner; REPARER Reparer alle (154 904 kr); 4 rep. av seg selv |
| 5 | 10.7 mill. | 7 | 61 | 44 | brakke aggregat drivstofftank vakttårn | Vaktlaget:4/4 Tropp 1:3/4 Tropp 2:1/4 | 1 | 4 | Angrepet er slått tilbake! Dere tok 900 000 kr fra røverne.; Siste døgn: Bølge 4 slått tilbake. 1 falt.; 4 rep. av seg selv |
| 6 | 11.6 mill. | 8 | 50 | 25 | brakke aggregat drivstofftank vakttårn | Vaktlaget:4/4 Tropp 1:3/4 Tropp 2:1/4 | 1 | 5 | Angrepet er slått tilbake! Dere tok 1,1 mill. kr fra røverne.; Siste døgn: Bølge 5 slått tilbake. 1 ny i gjengen.; Motstanderne samler seg. Om et døgn kan de gå løs på leiren din – ha minst to tr; REPARER Reparer alle (142 177 kr) |
| 7 | 10.6 mill. | 8 | 48 | 64 | brakke aggregat drivstofftank vakttårn | Vaktlaget:4/4 Tropp 1:3/4 Tropp 2:2/4 | 1 | 6 | Sabotasje! Røverne har skadet aggregat i leiren og stikker av.; Sabotører 6 gir opp og flykter – for mange av dem er falt eller såret.; Angrepet er slått tilbake! Dere tok 1,2 mill. kr fra røverne.; Siste døgn: Bølge 6 slått tilbake. 1 falt.; MAT kjøpte 50 rasjoner; 4 rep. av seg selv |
| 8 | 9.2 mill. | 8 | 39 | 52 | brakke aggregat drivstofftank vakttårn | Vaktlaget:4/4 Tropp 1:3/4 Tropp 2:2/4 | 1 | 7 | Sabotasje! Røverne har skadet aggregat i leiren og stikker av.; Siste døgn: Bølge 7 slått tilbake.; REPARER Reparer alle (24 149 kr); 1 rep. av seg selv |
| 9 | 10.6 mill. | 11 | 34 | 37 | brakke aggregat drivstofftank vakttårn | Vaktlaget:4/4 Tropp 1:3/4 Tropp 2:2/4 | 1 | 8 | Angrepet er slått tilbake! Dere tok 1,5 mill. kr fra røverne.; Siste døgn: Bølge 8 slått tilbake. 3 nye i gjengen.; REPARER Reparer alle (159 489 kr) |

- Døgn 2: bølge 1 (ett lag på 6) herjet denne gangen – Vaktlaget og Tropp 1 gikk inn, fikk tre sårede/falne og ingen røvere ute;
  røverne tok 500 000 kr, 50 l diesel og 6 rasjoner. (I kjøring A ble den samme bølgen slått uten tap – utfallet varierer.)
- Bølge 2–8 ble alle slått tilbake (600 000 kr – 1,5 mill.), også bølge 4 som nå var 2 × 7 røvere (kjøring A: 2 × 12). Bølge 6 og
  7 var sabotører: aggregatet ble skadet og reparert. Byggene sto hele hver morgen.
- Tap: Vaktlaget mistet alle fire (falne) innen dag 4, Tropp 2 to av fire innen dag 8; Tropp 1 ble stående 1,65 km fra leiren med tre
  av fire ute fra dag 2 (se «hjem for å hvile» under – rettet etter kjøringen). Lagene hjemme fylte ammunisjon (Tropp 2: 84 → 100 %)
  og de sårede ble friske; de falne blir ikke erstattet av skriptet.
- Kassa holdt seg på 9,2–11,6 mill. (A: falt til 6,5). Moralen sank fra 66 til 34 (mange falne og hendelser), folket økte til 11.
- Døgnoppgjøret kom hver morgen: «Siste døgn: Bølge 3 slått tilbake. 2 falt. Ett lag er slått ut.»
- Motstanderne (fredstid 7 døgn) kom heller ikke nå til leiren på dag 8–9.
- **Svar på spørsmålet:** med endringene holder leiren den første uka på Vanlig, og spilleren mister noe (ett bytte, en hel vaktstyrke,
  halve Tropp 2, moral) – men aldri leiren. Uten endringene (A) sto byggene, men forsvaret var borte fra dag 5.

**Rettet etter kjøring B:** `forsvar-hjemme.js` – HJEM FOR Å HVILE: et lag der minst halvparten er sårede eller falne (eller under 30 %
ammunisjon), som har stått i ro i en time 400 m – 3 km fra leiren uten fiender innen 600 m, går hjem mellom angrepene («Tropp 1 er
hardt skadet eller har lite ammunisjon og går hjem til leiren for å hvile og fylle opp.»). Døgnoppgjøret regner sabotører som slapp
unna som «slapp unna», ikke «slått tilbake».

### Filer, API og fellesfiler (runde 5)
- Nye filer (skripttaggene rett etter `forsvar-visning.js`, i denne rekkefølgen): `spill/trussel-lagring.js` (TrusselLagring /
  TrusselLagringSpill: `lagre`, `tilbake(bølge, tving)`, `etterBølgen`, `glem`, `test`), `spill/forsvar-oppgjor.js` (Oppgjor.tekst /
  OppgjorSpill: `bilde`, `morgen(tving)`, `test`), `spill/forsvar-hjemme.js` (Hjemme.påfyll/hvil/hjemme/børHjem, Hjemme.REGLER /
  HjemmeSpill: `steg(min)`, `hjemSteg`, `test`). Tester: `test_trussel_lagring.js`, `test_forsvar_oppgjor.js`, `test_forsvar_hjemme.js`.
- Nye lagringsnøkler (per leir): `riksbrudd-angrep`, `riksbrudd-oppgjor`.
- **Fellesfiler endret:** `spillet.js` – Trussel.menn(nr, soldater, n, faktor) og `BALANSE.ekstra = 2` (taket for hele bølgen);
  `spillet-visning.js` – angrep() sender antall lag og faktoren til Trussel.menn, og start() spør TrusselLagringSpill.tilbake før
  bølgen startes på nytt (to linjer); `index.html` – tre skripttagger; `test_spillet.js` – én ny test for taket.
- Vakta `pipeline/fliser/vakter/balanse.js` har fått `runde5`: angrepet lagres og legges tilbake (to røverlag, sted, helse, tid inne,
  bytte), feil bølge gir ingenting, døgnoppgjøret, påfyll og hvile hjemme (basen uten olje), og at hjelpen ikke åpnes av seg selv mens
  opplæringen går. Alt settes tilbake – også tilfeldighetsrekka `frø` (nyttLag bruker den; uten det feilet vakta «krig» etterpå fordi
  lagene den lager fikk andre navn og væremåter). Prøvd: balanse + krig etter hverandre, OK på PC og mobil.
- Hjelpetekst: `docs/natt/balanse-hjelp.json` – «Siste døgn» og «Ammunisjon og hvile hjemme» er nye, «Røverne og byttet» er rettet
  (omlasting, taket for hele bølgen).

**Kort kontroll på Hard** (all koden i runde 5, også «hjem for å hvile»; 24 mill. kr i start, fiendens treff × 1,3, røverlag × 1,5,
fredstid 5 døgn). Fire døgnkall – det tredje døgnet ble ikke ferdig innen tidsgrensen (raden «2» to ganger), så det er tre døgn:

| Etter døgn | Kassa | Folk | Moral | Mat | Bygg (% = helse) | Lag: sårede eller falne / mann | Slått ut | Bølge | Hva skjedde |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 1.5 mill. | 6 | 71 | 44 | brakke aggregat drivstofftank vakttårn | Vaktlaget:0/4 Tropp 1:0/4 | 0 | 1 (aktiv) |  |
| 2 | 0.0 mill. | 4 | 67 | 38 | brakke aggregat drivstofftank vakttårn | Vaktlaget:0/4 Tropp 1:0/4 Tropp 2:0/4 | 0 | 1 | Angrepet er slått tilbake! Dere tok 450 000 kr fra røverne.; Siste døgn: Bølge 1 slått tilbake. 2 har dratt.; 4 rep. av seg selv |
| 2 | 0.0 mill. | 4 | 57 | 32 | brakke(80%) aggregat(80%) drivstofftank(81%) vakttårn(80%) | Vaktlaget:3/4 Tropp 1:1/4 Tropp 2:4/4 | 1 | 2 | Røvere 2.2 har herjet i leiren og trekker seg ut med byttet: 5 rasjoner.; REPARER Reparer alle (950 137 kr) |
| 3 | 0.0 mill. | 4 | 52 | 28 | brakke(80%) aggregat(80%) drivstofftank(81%) vakttårn(80%) | Vaktlaget:3/4 Tropp 1:1/4 Tropp 2:4/4 | 1 | 2 | Vaktlaget ser noe 1,3 km øst for leiren: forlatt leir. Send et lag dit og unders |

- Startbyggene, Tropp 1 og vakttårnet tok nesten hele kassa (1,5 mill. igjen etter døgn 1); skriptet fikk aldri kjøpt diesel
  (500 l = 4–4,7 mill. kr) og hadde 9 000 kr fra dag 3.
- Bølge 1 var to røverlag på 6 (12 mot 8) og ble slått tilbake (450 000 kr, som gikk til reparasjon). Bølge 2 (to lag) kom inn i
  leiren: Tropp 2 ble slått ut (4/4), Vaktlaget mistet tre, og røverne herjet – byggene står på 80 % uten penger til reparasjon.
- Leiren hadde ikke falt etter tre døgn, men den er på vei: ingen penger, ingen diesel, to lag nesten borte. **På Hard kan leiren falle.**

### Konklusjon og det som ikke er gjort (runde 5)
- **Vanlig:** med det publiserte (kjøring A) sto byggene den første uka, men forsvaret var borte fra dag 5 (24 røvere mot 12, tom
  ammunisjon, sårede som aldri ble friske), og de fire første døgnene var uten tap. Med endringene (kjøring B) sto leiren hele veien,
  og spilleren mistet noe: ett bytte i bølge 1, alle i Vaktlaget, halve Tropp 2, og moralen. Det er det målet sa.
- **Hard:** tydelig hardere – pengene tar slutt, ingen diesel, røverne herjer i bølge 2. Leiren kan falle (ikke spilt til den gjorde det).
- **Lett:** se under (kort kontroll, hvis den rakk å bli ferdig). Lett er lettere av konstruksjonen: 60 mill. kr, ett røverlag på
  høyst ca. 60 % av soldatene + 2, fiendens treff × 0,75 og fredstid 9 døgn.
- Ikke gjort: en tredje kjøring på Vanlig med «hjem for å hvile» (lagt inn etter kjøring B – prøvd bare i regeltesten og i Hard-
  kontrollen); motstanderne etter fredstiden ble ikke prøvd (de kom ikke til leiren på dag 8–10 i noen av kjøringene); skriptet lager
  ingen nye tropper etter dag 2 og bygger ikke sykestue – en menneskelig spiller som gjør det, står sterkere.
- Startdøgnene på Vanlig er fortsatt rolige når bølge 1 går bra (A), men kan gi tap (B). Ikke endret.
