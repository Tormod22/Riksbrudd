# Balansen R18 (23. nov 2026) – gjennomgang av tallene

Oppdrag R18-E (docs/plan-r18.md, spor E). Brukeren: «Mange av tallene er dine, men det går fint. Du kan også si hvis du føler at noen av
tallene er litt rare, og endre dem.» Tiden er fortsatt 1× = sanntid som standard (ikke rørt).

Alle tall i denne fila er **Claudes forslag**. Leirbyggenes priser og tider (spill/leir.js, spill/modeller-leir2.js) eies av spor B og
er **ikke** endret her – forslagene står i egen del nederst.

## Kort fortalt

- **Startleiren er det som koster.** Kontrollrom, brakke, aggregat og dieseltank (det spillet selv kaller minimum) + 500 l diesel koster
  **30,3 mill. kr = 76 % av 40 mill.** (med markedets påslag på materialene, som i spillet). Det er dette funn 13 i spilltesten handler om.
- **Drifta er billig.** En leir med ti personer bruker ca. **0,13 mill. kr i døgnet om sommeren** (diesel til 9 kW) og **0,5 mill. om
  vinteren** (fyring med diesel i tillegg). Maten (10 rasjoner à 3 000 kr) er bare 30 000 kr i døgnet. Folk får ingen lønn.
- **Uten inntekt** rekker de 9,7 mill. som er igjen etter startleiren ca. **73 døgn om sommeren og 19 om vinteren** – leiren går ikke
  tom på ti døgn (8,4 / 4,8 mill. igjen).
- **Med én vanlig kontrakt i døgnet** (0,65–1,3 mill.) tjener leiren ca. **0,95 mill. i døgnet = 7 × drifta**, og kassa vokser fra
  9,7 til 17,9 mill. på ti døgn. Et nytt grunnbygg koster da **4–14 døgn med kontrakter** (dieseltank 4,5, brakke 6, aggregat 10,
  kontrollrom 14). Det passer spor A («betaling gir neste steg i leiren») – men bare når leirbyggene blir billigere, ellers er de første
  døgnene for trange (se forslagene).
- **Mot loren:** Kronekrakket gjør kronen nesten verdiløs. Spillets prisnivå er omtrent **× 20–30 av 2020-priser** for mat (3 000 kr per
  rasjon), våpen i sekken og materialer (20 000–60 000 kr) – lagenes våpen er på 2020-nivå –, men **× 130 for diesel** (3 000 kr/l) – diesel er knapp etter
  kollapsen, så det er greit at den er dyrest. Inflasjonen var 0,4 % i døgnet; plan-kollaps.md sier 1–2 % – nå **1 %**.

Regnestykket ligger i `pipeline/fliser/test_balanse.js` (`BALANSE_VIS=1` skriver døgn for døgn).

## De ti viktigste endringene

| # | Tall | Fra | Til | Hvorfor |
|---|------|-----|-----|---------|
| 1 | Reserveammunisjon i startsekken (spill/utstyr.js:29) | 90 skudd 5,56 mm + 30 skudd 9 mm | 60 + 15 | «Knappe ressurser» (se egen del): to fulle magasiner til hvert våpen i tillegg til det som sitter i. |
| 2 | Ammunisjon i husene (spill/lut.js:83–86) | esker på 5–30 skudd | 3–15 skudd | Et vanlig hus ga 0,7 skudd 5,56 mm og 3–4 skudd hagl/7,62 i snitt; hyttene 10 av hver. Nå ca. halvparten. |
| 3 | Førstehjelp i husene (lut.js:88) | vekt 2, 1–2 stk. | vekt 1,2, 1 stk. | Annethvert hus hadde førstehjelp (0,5 i snitt). Nå ca. hvert fjerde (0,3); sykehuset gir fortsatt over fem. |
| 4 | Smertestillende og batterier i husene (lut.js:89, 92) | 1–3 stk. | 1–2 stk., litt sjeldnere | Batteriene (8 t lys hver) lå i nesten hvert hus; nå ca. annethvert. Lyset skal også telle. |
| 5 | Inflasjon (spill/spillet.js:93) | 0,4 % per døgn | 1 % per døgn (Marked.INFL) | Loren sier 1–2 %; 0,4 % merktes ikke (4 % på ti døgn). Nå 10 % på ti døgn, ca. 35 % på en måned – det lønner seg å bruke pengene. |
| 6 | Oppdraget «Hent forsyninger» (spillet.js:146) | 0,6–1,2 mill. kr | 0,3–0,6 mill. kr | Et ufarlig oppdrag 0,7–2,6 km unna betalte mer enn en eskortekontrakt over 8 km med røvere. Kontraktene skal være den røde tråden (spor A). |
| 7 | Oppdraget «Ta en røverpost» (spillet.js:148) | 1,5 mill. + 500 kr/m per røverlag (opptil 6,6 mill.) | 0,8 mill. + 250 kr/m per røverlag (1,2–1,7 mill. per lag) | Var opptil 8 × en kontrakt og 4 × det største røverbyttet (1,5 mill.). |
| 8 | Drivhus (spill/folk.js:51) | 3 rasjoner per døgn | 6 rasjoner per døgn | Drivhuset bruker 1 kW = ca. 7 l diesel = 21 600 kr i døgnet med aggregat; 3 rasjoner var verdt 9 000 kr, så drivhuset tapte penger hver dag. 6 rasjoner (18 000 kr) metter seks personer om sommeren. |
| 9 | Nattsikt på svartebørsen (spill/region.js:217) | 6 mill. kr | 2 mill. kr | Troppebyggeren selger nattsikt til én tropp for 400 000 kr (og den ser like langt som om dagen). 6 mill. for +40 % til alle lag var et dårlig kjøp. |
| 10 | Bakgrunnen «Forretningsmann» (spill/oppstart.js:25) | +10 mill. kr | +5 mill. kr | Med 40 mill. i start var bonusen en firedel av kassa – langt sterkere enn de andre (bonden sparer ca. 8 000 kr i døgnet). Nå en åttendedel, som da starten var 100 mill. og bonusen 10. |

Testene som sjekket tallene med vilje er oppdatert: `test_oppstart.js` (forretningsmann 105 mill. i testene, der starten er 100 mill.) og
`test_utstyr.js` (startsekken 60 skudd i reserve).
De andre testene (spillet, folk, region, utstyr, tropper, strid, dagbok, lut) gikk uten endring.

## Tabellen

Vurdering: **greit** = henger sammen med resten; **rart** = hvorfor i kolonnen; **endret** = se tabellen over.

### Penger inn og ut

| Tall | Hvor | Hva | Vurdering |
|------|------|-----|-----------|
| 40 mill. kr (100 mill. i testene) | spill/oppstart.js:15 | Startpengene | Greit (loren). Men startleiren tar 76 % – se leirbyggene. |
| Forretningsmann +5 mill. | oppstart.js:25 | Bakgrunnsbonus | **Endret** (10 → 5). |
| Bonde: mat × 0,75 | oppstart.js:22 | Bakgrunnsbonus | Rart: maten er så billig (30 000 kr i døgnet) at bonusen sparer ca. 8 000 kr i døgnet. Forslag: også drivhus × 1,5 (krever ny bonusnøkkel i folk.js – ikke gjort). |
| Tre 20 000 / betong 30 000 kr per m³, stål 60 000 kr per t | spill/leir.js:58 | Grunnpris på materialene | Greit. I spillet kjøpes de for 1,5 × (påslaget). |
| Påslag × 1,5 | spill/spillet.js:103 | Markedets påslag på materialer | Greit – gjør hogst og riving verdt det. |
| Salg 80 % av markedsprisen (i testene 50 %) | spillet.js:88, leir.js:71 | Salg av overskudd | Greit. |
| Kjøpertak 25 m³ tre, 15 m³ betong, 6 t stål per døgn | spillet.js:115 | Hvor mye markedet kjøper | Greit (hindrer salg av hele skogen). |
| Hyller: tre 60, betong 60, stål 20, diesel 2 500 l, mat 300 | spillet.js:100 | Hva markedet har | Greit. |
| Inflasjon 1 % per døgn, høyst × 3 | spillet.js:93 | Kronen taper verdi | **Endret** (0,4 → 1 %). Kontraktsbetaling, skatt og oppdrag følger ikke inflasjonen – se forslag. |
| Prissvingning ± 12 % per døgn, 0,55–1,8 | spillet.js:94 | Markedet | Greit. |
| Diesel 3 000 kr/l, 0,3 l per kWt, 200 l i aggregatet | leir.js:68 | Leirens diesel | Greit for loren (knapp vare). 9 kW = 65 l = ca. 195 000 kr i døgnet. |
| Smuglerdiesel 3 mill. for 800 l (3 750 kr/l) | region.js:221 | Svartebørsen | Greit (25 % over markedet). |
| Veksling 1 t olje → 10 l diesel, 15 l → 1 t | region.js:44 | Olje ↔ diesel | Greit (feltraffineri med tap). |
| Mat 3 000 kr per rasjon | spill/folk.js:52 | Kjøpt mat | Greit (× 30 av en dags mat før krakket). |
| 1 rasjon per person per døgn, 1,2 om vinteren | folk.js:46 | Matforbruk | Greit. |
| Fyring 0,5 m³ ved eller 50 l diesel per åtte personer per døgn (vinter; halvt vår/høst) | folk.js:55 | Varme | Greit. Ti personer om vinteren = 100 l = 300 000 kr i døgnet – vinteren merkes. |
| Drivhus 6 rasjoner per døgn | folk.js:51 | Mat fra drivhuset | **Endret** (3 → 6). |
| Rekruttering 500 000 kr | folk.js:53 | Ny person | Greit: litt under én kontrakt, og folk arbeider gratis etterpå. |
| Ingen lønn | – | Folk koster bare mat og seng | Rart for et militærselskap (spor A/Wardogs), men det er en ny mekanikk – se «Spørsmål til brukeren». |
| Skatt 100 kr per innbygger per døgn, høyst 1,5 mill. per tettsted | region.js:29 | Inntekt fra tettsteder | Greit. Dombås (ca. 1 300) gir 130 000 kr i døgnet; en stor by 1,5 mill. – å holde en by er som en kontrakt hver dag. |
| Eskorte 650 000, hold 850 000 (× timer/6), rydd 750 000, hent 500 000 kr | spill/selskap.js:37–40 | Kontraktenes grunnbetaling | Greit: 0,65–1,3 mill. med avstand og rykte = 6 døgn med drift om sommeren. (Fila eies av spor A – ikke rørt.) |
| Bot 35 % av betalingen | selskap.js:29 | Brutt kontrakt | Greit. |
| Hent forsyninger 0,3–0,6 mill. + mat/tre/stål | spillet.js:146 | Oppdrag | **Endret**. |
| Redd overlevende: 1–3 personer + 300 000 kr | spillet.js:147 | Oppdrag | Greit (verdt opptil 1,8 mill. i rekruttering). |
| Røverpost 1,2–1,7 mill. per røverlag | spillet.js:148 | Oppdrag | **Endret**. |
| To oppdrag ved start, høyst tre, nytt etter 6–10 spilltimer | spillet.js:136 | Oppdragstakt | Greit. |
| Røverbytte 300 000 + 150 000 per bølge, høyst 1,5 mill. | spillet.js:20 | Belønning for slått bølge | Greit (dekker reparasjonene). |
| Herjing: 5 % av kassa (høyst 0,5 mill.), 20 % materialer, 10 % diesel, 15 % mat | spillet.js:67 | Røvere som herjer | Greit. |
| Leiesoldater 0,8–1,6 mill. / 4 mann 2,5 mill. etter tap | spill/morgen.js:41, 74 | Morgenmøtet | Greit (samme nivå som fiendens lag, 2,5 mill.). |
| Beskyttelsespenger 1,5 mill. + 0,5 mill. per bølge | morgen.js:65 | Morgenmøtet | Greit. |
| Medisiner 2,5 mill., tunge våpen 5 mill. (× 2) | region.js:214, 218 | Svartebørsen | Greit (dyre, men sterke). |
| Nattsikt 2 mill. (alle lag) | region.js:217 | Svartebørsen | **Endret** (6 → 2). |
| Nattsikt 400 000 kr per tropp | spill/tropper.js:31, spill/krig.js:24 | Troppeutstyr | Greit. |
| Feltradio 1 mill., kikkert 150 000, ekstra ammo 100 000, sanitet 200 000 kr | tropper.js:27–32 | Troppeutstyr | Greit. |
| Påfyll av ammunisjon hjemme: 200 000 kr for full last | spill/forsvar-hjemme.js:21 | Lagene hjemme | Greit. |
| Våpenhvile 5 mill. | krig.js:37 | Krig | Greit. |
| Bygdevern 2 000 kr per innbygger (0,5–8 mill.) | krig.js:40 | Krig | Greit. |
| Fiendens økonomi 1,6 mill. + 0,1 mill. per 1 000 innbyggere per døgn; lag 2,5 mill., lastebil 1,5 mill., stridsvogn 7 mill. | spill/eskalering.js:26–27 | Motstanderne | Greit (fienden tjener ca. det du gjør med én kontrakt og ett tettsted). |
| Sjark 2 mill. (36 rasjoner i døgnet), småbåt 0,4 mill., lekter 6 mill. | spill/sjo.js:60–62 | Båter | Greit. Sjarken betaler seg på ca. 19 døgn i mat – mye bedre enn drivhuset. |
| Jernbane 150 000 kr per km | spill/verden.js:69 | Gjenåpne sporet | Greit. |
| Åker: såkorn 20 000, rydding 1 mill. | verden.js:57 | Åker | Greit. |

### Våpen og utstyr

| Tall | Hvor | Hva | Vurdering |
|------|------|-----|-----------|
| Pistol 150 000, maskinpistol 400 000, automatgevær 600 000, hagle 300 000, skarpskyttergevær 1 200 000 kr | spill/utstyr.js:12–16 | Våpen i sekken | **Rart**: 15 × troppebyggerens pris for samme våpen. Spor C eier våpnene – se forslag. |
| 9 mm 300, 5,56 mm 500, hagl 600, 7,62 mm 900 kr per skudd | utstyr.js:19–20 | Ammunisjon i butikken | Greit med knappe ressurser (dyrt er riktig), men kjøpet har ingen grense – se forslag. |
| Førstehjelp 50 000, feltrasjon 3 000 kr | utstyr.js:21 | Ting i sekken | Greit (rasjonen = matprisen; førstehjelpen skal være dyr). |
| Startsekken: 60 + 30 skudd 5,56 mm, 15 + 15 skudd 9 mm, 1 førstehjelp, 2 rasjoner | utstyr.js:29 | Det du starter med | **Endret** (reserven 90/30 → 60/15). |
| Ammunisjon i esker på 3–15 skudd, førstehjelp 1 stk. med vekt 1,2 | lut.js:83–92 | Det du finner | **Endret**. |
| Maskinpistol 25 000, hagle 20 000, presisjonsrifle 80 000, maskingevær 150 000 kr | spill/tropper.js:24–25 | Troppebyggeren, per våpen | Rart: på 2020-nivå, mens resten er × 20 (lik pakkeprisen i strid.js). Se forslag. |
| Nærstrid 200 000, avstand 400 000, tung 600 000 kr | spill/strid.js:19–21 | Bevæpning for hele laget | Greit, men lav for Kronekrakket – låst av sjekk.js (se forslag). |
| Riflen [600 m, 0,05], maskingevær [900 m, 0,09], skarpskytter [900 m, 0,08] per skudd | terreng.js:127 | Treffsjanse | Greit. Kampreglene er Claudes forslag – CLAUDE.md sier spør før store endringer. Ikke rørt. |
| Maskinpistol [300 m, 0,11], hagle [150 m, 0,16], pistol [120 m, 0,05], presisjonsrifle [1100 m, 0,07] | strid.js:15 | Treffsjanse | Greit (samme). |
| Kamprunde hvert 5. spillminutt, 6 ute = slått ut | terreng.js:128 | Ildkamp | Greit. |

### Folk, karakter, fart og sikt

| Tall | Hvor | Hva | Vurdering |
|------|------|-----|-----------|
| Tørst tom på 24 t, sult 48 t, søvn 36 t | spill/karakter.js:13–15 | Behov hos karakteren | Greit ved 1× sanntid (du spiser og drikker i leiren av deg selv). |
| Til fots: veg 5, sti 4, tettsted 3,5, hei/åker 3, snaufjell 2,2, skog 2, myr 1,8, snø 1,5 km/t | terreng.js:16–22 | Marsjfart | Greit (realistisk med full oppakning). |
| Siktvidde 4 km (speider 8 km), skog × 0,35, tettsted × 0,4, i bevegelse × 0,55 | terreng.js:76–84 | Sikt | Greit. |
| Byggelaget reiser 10 km/t, de første 300 m fritt | leir.js:71 | Utposter | Greit. |
| Radiomast 15/25/40 km, ellers 8 km, håndradio 3 km | leir.js:49 | Radio | Greit. |

### Angrep

| Tall | Hvor | Hva | Vurdering |
|------|------|-----|-----------|
| Bølge 1, 1, 1, 2, 2, 2, 3 … høyst 6 lag | spillet.js:22 | Røverlag per bølge | Greit (justert i runde 4–5 etter gjennomspillinger). |
| 6–12 mann per lag, aldri flere enn soldatene + 2 | spillet.js:34 | Røverlagets størrelse | Greit. |
| 16–26 spilltimer mellom bølgene, første tidligst etter 24 t | spillet.js:36 | Takt | Greit. |
| Start 3–4 km unna, 0,75 m/s, vakttårn ser dem på 1,5 km | spillet.js:51 | Varsel | Greit. |

## Regnestykket (test_balanse.js)

Modellen: startgjengen på ti, kontrollrom + brakke + aggregat + dieseltank (ferdige) og 500 l diesel, materialene med påslaget, maten
kjøpes når det er under tre døgn igjen, diesel fylles til 500 l når tanken er under 150 l, markedet går et døgn om gangen med fast frø.

| | Sommer, uten inntekt | Vinter, uten inntekt | Sommer, én kontrakt i døgnet |
|---|---|---|---|
| Startleiren | 30,3 mill. (76 %) | 30,3 mill. | 30,3 mill. |
| Igjen etter start | 9,7 mill. | 9,7 mill. | 9,7 mill. |
| Drift per døgn | 0,13 mill. | 0,49 mill. | 0,13 mill. |
| Inn per døgn | – | – | 0,95 mill. |
| Kassa etter ti døgn | 8,4 mill. | 4,8 mill. | 17,9 mill. |
| Rekker (drift alene) | ca. 73 døgn | ca. 19 døgn | – |

Rammene i testen (med forklaring i fila): startleiren 35–85 % av startpengene, drift 0,05–1,2 mill. om sommeren og 0,1–2 mill. om
vinteren, leiren klarer ti døgn uten inntekt, drifta tar minst 2 % av startpengene på ti døgn, en kontrakt = 1–15 døgn med drift, et nytt
grunnbygg = 2–20 døgn med kontrakter, en ny person ≤ én kontrakt, «hent» ≤ én eskorte, røverpost ≤ 2,5 eskorter per lag,
knappe ressurser (se egen del), drivhuset dekker minst 80 % av strømmen det bruker.

## Forslag for leirbyggene (spor B eier spill/leir.js og spill/modeller-leir2.js – ikke endret)

Prisene under er grunnpris (utstyr og deler); materialene kommer i tillegg (× 1,5 i spillet).

| Bygg | Nå (med materialer) | Forslag | Hvorfor |
|------|---------------------|---------|---------|
| Aggregat | 8 mill. (8,4) | **3,5 mill.** | Funn 13: dyrere enn brakka og dieseltanken til sammen. Et aggregat er et ferdig kjøp, men ikke mer enn et kontrollrom-utstyr. Solcellene (3 mill., 5 kW gratis) blir da et reelt valg mot aggregat + diesel. |
| Kontrollrom | 9 mill. (11,8) | **6 mill.** | Det dyreste av grunnbyggene og et krav for kameravakt/overvåking; 14 døgn med kontrakter er for lenge for det første store målet. |
| Vakttårn | 5 mill. (5,5) | **1,5 mill.** | Et tretårn med lyskaster koster mer enn en brakke med åtte senger. Forsvaret (spor C) trenger flere tårn. |
| Dieseltank | 3 mill. (3,7) | **1,5 mill.** | En tank er enkel; dieselen er det dyre. |
| Helikopterplass | 10 mill. (12,7) | **4 mill.** | En betongplate med merking (60 m³ betong = 2,7 mill. alene). |
| Gjerde | 50 000 kr/m | **8 000 kr/m** | 100 m gjerde = 5 mill. + 2 t stål, mens grusveg er 6 000 kr/m. Et gjerde rundt leiren (300 m) kostet 15 mill. |
| Solcellepaneler | 3 mill. | 2 mill. | Gratis strøm om dagen; bør være billigere enn aggregatet per kW over tid (gjelder hvis aggregatet blir 3,5). |
| Brakke | 4 mill. (5,0) | greit (ev. 3 mill.) | – |
| Byggetider | kontrollrom 6 t, verksted 3 t, helikopterplass 4 t | kontrollrom 3 t, helikopterplass 2 t | Med 1× = sanntid venter en ny spiller seks ekte timer på kontrollrommet med ett byggelag. |
| De 66 nye (modeller-leir2.js) | 20 000 kr – 14 mill. | se over de dyreste: kommandosenter 14 mill., verkstedhall 12 mill., stort feltsykehus 10 mill. | Bør måles mot virkningen spor B gir dem. Ingen virkning = ingen grunn til å betale 10 mill. |

Med forslagene for aggregat, kontrollrom og dieseltank koster startleiren ca. **21,3 mill. = 53 %** av 40 mill. (i stedet for 76 %), og
et nytt grunnbygg tar ca. 3–11 døgn med kontrakter. test_balanse.js tåler begge.

## Knappe ressurser (tillegg fra hovedøkta: brukeren valgte «knappe ressurser», med Silent Hill som stemning)

Målet: ammunisjon, førstehjelp og lys skal føles verdifulle når du går alene – knapt, men ikke umulig. Målt med de ekte reglene
(lut.js + interior.js) på 300 prøvehus før og etter:

| Per bygg i snitt | Før | Nå |
|---|---|---|
| Vanlig hus: førstehjelp / smertestillende | 0,50 / 1,64 | 0,28 / 1,22 |
| Vanlig hus: skudd 5,56 mm / 9 mm / hagl / 7,62 mm | 0,7 / 1,1 / 3,7 / 3,4 | 0,3 / 0,7 / 1,7 / 1,9 |
| Vanlig hus: batterier / lommelykt | 0,96 / 0,45 | 0,56 / 0,49 |
| Hytte: hagl / 7,62 mm (jaktvåpnene) | 10,1 / 9,8 | 5,0 / 5,2 |
| Sykehus: førstehjelp / smertestillende | 9,8 / 24,3 | 5,4 / 17,4 |
| Startsekken: reserve 5,56 mm / 9 mm | 90 / 30 | 60 / 15 |

Valget: geværammunisjon (5,56 mm) er det knappeste – den finnes nesten bare i startsekken, i hangarer og i butikken. Jaktammunisjon
(hagl, 7,62 mm) finnes i hytter og uthus, så jaktrifla og hagla blir våpnene du klarer deg med ute. Førstehjelp må letes etter (3–4
hus for én), men sykehus og legevakter er verdt turen. Boligene nærmest en ny leir har fortsatt alltid noe (lut.js, «første hus»), så
starten er ikke umulig. test_balanse.js har rammene (0,1–0,4 førstehjelp og 0,1–1,5 skudd 5,56 mm per hus, minst 3 førstehjelp på et
sykehus, høyst ett batteri per hus).

Ikke gjort (spor C eier utstyr.js): **butikken i Leir-menyen selger ammunisjon og førstehjelp uten grense** (en pakke 5,56 mm =
15 000 kr). Forslag: la ammunisjonen gå gjennom markedets hyller (spillet.js Marked.LAGER, f.eks. 300 skudd 5,56 mm og 5 førstehjelp,
påfyll en tredel per døgn), så knappheten også gjelder kjøp. Lagenes ammunisjon (påfyll hjemme, forsvar-hjemme.js) er ikke rørt.

## Andre forslag som krever filer jeg ikke skulle røre

- **Samme våpen, samme prisnivå** (spill/utstyr.js eies av spor C): sekkens våpen koster 15 × troppebyggerens (automatgevær 600 000 kr
  mot maskinpistol 25 000 kr for et lag). Forslag: sekken ca. 2 × troppens pris når våpennivået for lagene er hevet (under).

- **Høyere våpennivå for lagene** (spill/strid.js BEVÆPNING og spill/tropper.js VÅPEN): pakkene for hele laget (0,2–0,6 mill.) og
  troppebyggerens priser (20 000–150 000 kr) ligger på 2020-nivå, mens resten av spillet er × 20. Forslag: × 3 (nærstrid 0,6, avstand
  1,0, tung 1,2 mill.; maskinpistol 75 000 … maskingevær 450 000), og sekken × 2 av det. **Ikke gjort**: vakta «stridsregler» i
  pipeline/fliser/sjekk.js:1224 krever `betalt === 200000` – den bør heller sjekke `StridSpill`/`Strid.BEVÆPNING.nærstrid.pris`.
- **Kontraktene følger inflasjonen** (spill/selskap.js, spor A): betalingen kunne ganges med markedets `M.infl`, ellers taper
  kontraktene 35 % av verdien på en måned med den nye inflasjonen. Det samme gjelder skatten (region.js) og oppdragene (spillet.js).
  Jeg har latt det være til spor A har landet kontraktene.

## Spørsmål til brukeren (ikke gjort)

1. **Lønn til folkene?** Folk koster i dag bare mat (3 000 kr i døgnet per person) og en seng. For et militærselskap (Wardogs, spor A)
   ville en dagslønn (f.eks. 15 000–20 000 kr per person i døgnet = 0,15–0,2 mill. for ti) gjøre kontraktene nødvendige og ikke bare
   lønnsomme. Det er en ny regel, ikke et tall, så den er ikke laget.
2. **Inflasjonen** er nå 1 % i døgnet (laveste ende av plan-kollaps.md). Skal den være 2 %?
