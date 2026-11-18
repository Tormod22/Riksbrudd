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
