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
