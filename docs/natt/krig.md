# Pakke «krig» (nattarbeidet 18. nov)

Alle tall er **Claudes forslag** og ligger i `Krig.REGLER` (spill/krig.js), `Formasjon.TYPER` (fart) og `Enheter.REGLER.roller`.

## Filer
- **Nye:** `spill/krig.js` (regler uten DOM, `pipeline/fliser/test_krig.js`, 50 sjekker), `spill/krig-visning.js` (`window.KrigSpill`),
  `pipeline/fliser/vakter/krig.js`, `docs/natt/krig-hjelp.json`.
- **Endret (eies av pakka):** formasjon.js / formasjon-visning.js (marsjfart, erfaring per ildrunde), strid-visning.js (`s.egetValg`),
  enheter.js / enheter-visning.js (roller), fraksjoner-visning.js (`AI.nytt`, `AI.fred`, `AI.hvile`), tropper.js (utstyret «nattsikt»),
  lagring.js (fiendens lag, minne, stillinger, marsjmål, fanger, bakhold).
- **Fellesfil:** `index.html` – (1) i `sim()`: marsjfarten ganges med `KROKER.fart` (ny krok, lista lages av formasjon-visning.js);
  (2) to skript-tagger rett før `spill/kaier.js`.

## I testene
`KrigSpill.auto()` = `!navigator.webdriver || KrigSpill.test === true`. Når den er usann (kontrollskriptet), er de nye
stridsfaktorene (flanke, hus, væremåte, natt, sårede-fart, formasjonsfart, stridsvognas ekstra treff mot stillinger) lik 1, og
ingenting skjer av seg selv (overgivelse, stell, radiosamband, beleiring, bygdevern, røvervarianter, dronevarsel i loggen).
Det spilleren selv setter i gang (røyk, lys, støy, bakhold, artilleri, våpenhvile, helikopter, avhør) virker alltid.

## A. Forbedringer
| Punkt | Hva | Hvor |
|---|---|---|
| Retning teller | Skudd i flanken ×1,25, i ryggen ×1,5 (nedgravd: halve overtaket). Et lag som står stille, snur seg 12°/min mot den det skyter på / blir skutt av. Panelet: «beskutt i flanken/ryggen». | `Krig.flanke/snu`, KROKER.ild + sim |
| Formasjon gir fart | Kolonne ×1,1 (×1,2 ved veg), linje ×0,85, spredt ×0,9, kile ×1. | `Formasjon.fart`, KROKER.fart |
| Erfaring | Telles per ildrunde (hvert nye skudd i SKUDD én gang, 5 min erfaring per runde), ikke per minutt på klokka. | `Formasjon.runde` |
| Eget initiativ | `s.egetValg = { hva, grunn, t }` vises i lagpanelet i tre timer: «kl. 14:20 av seg selv: trakk seg tilbake – …». | strid-visning.js, krig-visning.js |
| Dekning bak hus | Lag som står stille i tettbebyggelse (terrengklasse 7) tar treff ×0,7. Panelet: «i dekning bak hus». (Ikke husomriss – en billig regel.) | `Krig.husVern` |
| Stridsvogn/artilleri | Stridsvogna: treff ×1,8 mot lag i skyttergrav/stilling, river stillingen (50 % per treff), og skyter på fiendens kjøretøy når ingen lag er i sikte. Salver river stillinger innen 100 m. Rollen står i kjøretøypanelet. | enheter.js / enheter-visning.js |
| Sårede | −6 % marsjfart per såret (minst ×0,6). Ved leiren (300 m, stille): én frisk per 180 min, med sykestue som virker per 30 min. Helikopteret kan hente laget. | `Krig.sårFart/stell` |
| Fanger | Fiendelag som er knust (6 ute, seige førere 8) med et eget lag innen 300 m, eller omringet (egne på to kanter innen 600 m) og under halv styrke, gir seg. Fangene følger laget (marsj ×0,9) og leveres ved leiren. | `Krig.girSeg`, `KrigSpill.overgi` |
| Førere | Fiendens lag viser «fører: Navn (pågående/forsiktig/slu/seig)» – væremåten følger navnet og gir små faktorer. | `Krig.væremåte` |
| Røverne | Bølge 1 rett på; siden på rundgang: fra to kanter (halvparten speiles gjennom leiren; krever to lag), sabotasje (ett lag går mot aggregat/tank/radiomast/lager, skader bygget 60 % og stikker av), venter på mørket (står til natta, har nattsikt, høyst 8 t), rett på. | `Krig.røverVariant`, røvere() |
| Lagring | «riksbrudd-verden» har nå fiendens lag (AI-lag og patruljen; ikke røvere/poster), AI.minne, STILLINGER og målet for egne marsjer (planlegges på nytt etter lasting). | lagring.js |

## B. Nye ideer
- **21 Etterretning:** `T.etter` = meldinger per fiendelag (sett av egne, drone, radio, avhør), tegnes som stiplet rute med «?» i kartet
  når du ikke ser laget, og listes i Leir → Mål («Etterretning og avtaler», «Vis»). Radiomast som virker: hvert 30. min 35 % sjanse
  per AI-lag innen 15 km (sted ±500 m). Avhør av fanger: 60 min, gir alle lagene til fraksjonen i fire timer.
- **22 Natt:** kl. 22–04:30 (glir over 1,5 t) ser alle ×0,45. Utstyret «Nattsikt» (400 000 kr, troppebyggeren) eller en lysrakett opphever det.
- **23 Artilleri fra lag:** «Tiltak → Kall inn artilleri …» – laget må ha radiomann/radio og se målet; salven er observert.
- **24 Røyk, lys, støy:** to av hver per lag, fylles ved leiren. Røyk 120 m i 15 min (treff ×0,4 på den som står i den, ×0,5 ut av den),
  lysrakett 800 m i 10 min, støy (høyst 1,5 km fra laget) setter AI.minne[side].sist for fraksjoner med lag innen 3 km.
- **25 Bakhold:** «Legg bakhold ved vegen» – fiendens kjøretøy innen 200 m stoppes, de om bord tar en dobbel ildrunde, og er ingen
  igjen til å forsvare det, blir kjøretøyet ditt («Erobret lastebil»).
- **26 Beleiring:** egne lag på to kanter (≥ 100°) innen 1,5 km av et tettsted fienden eier: garnisonen får ikke ammunisjon,
  etter 6 t skyter den ×0,7, etter 12 t gir den seg. Sprengt kraftverk (hvor som helst – forenkling) = ×1,5 fortere.
- **27 Våpenhvile:** Leir → Mål: 5 mill. kr for 24 t (×1,5 per avtale, ×2 etter brudd). `AI.fred[side]`: ingen ild begge veger,
  AI-en ser ikke lagene dine som fiender og går ikke mot leiren. «Bryt» finnes. AI-en bryter aldri selv.
- **28 Bygdevern:** nøytralt tettsted + eget lag inne: vern på 3–14 mann (1 per 150 innbyggere). Så lenge vernet står, tas ikke stedet,
  og hver kamprunde skyter de (6 % per mann) og laget tilbake. Avtale (2000 kr per innbygger, 0,5–8 mill.) eller knus dem (moral −5).
  Abstrakt – ikke egne lag i kartet. Gjelder bare spilleren, ikke AI-fraksjonene.
- **29 Helikopter:** «Hent med helikopter» / «Fly ut med helikopter …» i Tiltak (50 000 kr, 200 km/t, 60 km, 12 mann). Krever at
  helikopteret i spill/kjor.js finnes og at du ikke sitter i det. Vises som «H» i kartet; 3D-modellen i leiren flyttes ikke.
- **30 Droner:** en drone i lufta melder lag den ser (etterretning + varsel i loggen hvert 20. min per lag), og «Se gjennom» i
  Leir → Mål flytter kartet til dronen og åpner 3D ovenfra.

## KrigSpill (API)
`test`, `auto()`, `T()` (fanger, etter, fred, vern, beleiring, raid), `overgi(lag, til, grunn)`, `avhør(i)`, `settFri(i)`, `røyk(lag)`,
`lys(lag)`, `støy(lag, X, Y)`, `kallInn(lag, X, Y)`, `fred(side)`, `brytFred(side)`, `fredPris(side)`, `vernAvtale(id)`,
`heliHent(lag)`, `heliFly(lag, X, Y)`, `heliFins()`, `seDrone(i)`, `visTiltak(lag)`, `nullstill()`, `steg.*`. Lagres i «riksbrudd-krig» per leir.

## Runde 2 (samme natt)
- **Sabotørene:** slipper de unna, tas belønningen fra spillet-visning.js tilbake (og moral −5): «Sabotørene slapp unna – da ble det ingen
  belønning for dette angrepet.» (`V.slapp`/`V.trukket` i `T.raid`).
- **Dekning bak ekte hus:** `husSjekk()` spør `finnBygg` i midten og åtte punkter 14 m rundt et lag som står stille (én gang per sted) ->
  `s.vedHus`. Dekning = terrengklassen tettbebyggelse ELLER `vedHus` (`Krig.husVern(klasse, marsj, vedHus)`, `Krig.husPunkter`).
- **Væremåten i AI-ens valg:** `Fraksjoner.velg` tar `overtakF` (pågående 0,85, forsiktig 1,25) – terskelen for å angripe.
- **Egne lag kan gi seg** (flyttet til stridsreglene i runde 3, se under): Seks ute og fiender på to kanter
  innen 600 m -> laget er tapt. Valget ligger IKKE i Stridsregler-panelet fordi kontrollskriptet krever nøyaktig sju valg der
  (`str.valg === 7`) – flytt det dit (Strid.VALG) når sjekk.js kan endres.
- **Bygdevernet gjelder alle:** også motstandernes lag må slå vernet (de kan ikke gjøre avtaler). Vernets treff er 4 % per mann og runde.
- **3D:** `spill/krig3d.js` (KROKER.ramme3d) – røyken som seks myke flak per sky (høyst 8 skyer), lysraketten som ett lysende punkt
  som synker (høyst 4). Sprites, ingen lys. `Krig3d.antall()`.
- **Prøvd på /rogaland med ekte data** (leir 15607, 6622779, 990 tettsteder): AI-en i 8 spilltimer med alt slått på – begge fraksjonene
  holdt startstedet, de andre lagene marsjerte mot nye tettsteder hele tiden, forsterkninger kom etter seks timer, ingen overgivelser,
  ingen sidefeil. Bygdevern med makt (Hjelmelandsvågen) og med avtale (Vikedal, 1 mill. kr), dekning ved et ekte hus, og beleiring
  (svekket etter 6 t, ga seg etter 12 t) virket.

## Runde 3 (samme natt)
- **Bølgen tar slutt:** `Trussel.ferdig(lag, minutter)` i spill/spillet.js (`Trussel.borte` = 2500 m, `Trussel.borteMin` = 30): over når
  ingen røverlag kan kjempe (falt eller slått ut – også når restene står langt unna), eller når de som kan, har vært over 2,5 km fra
  leiren i 30 spillminutter. `angrepSteg` (spillet-visning.js) fjerner da lagene, gir belønningen som før («Røverne har trukket seg
  unna – angrepet er slått tilbake!») og planlegger neste bølge; `T.borteFra` husker når de trakk seg unna. Lag som er slått ut, får
  ikke lenger ordren mot leiren på nytt. Røvere som venter på mørket (`e.venterNatt`), teller ikke som unna.
  Sabotører som slapp unna (`KrigSpill.slapp(nr)`): ingen belønning, moral −5 (det gamle «ta pengene tilbake»-grepet er fjernet).
- **Stridsvalget:** `Strid.VALG.overgi` (nøkkel `overgi`, verdier `nei` = standard / `ja`) – åttende valg i Stridsregler-panelet.
  Raden under Tiltak er tatt bort. KONTROLLSKRIPTET må endres fra `str.valg === 7` til 8.
- **Økonomi-kroken:** fraksjoner-visning.js deler ventetiden på nye lag på `RegionSpill.fordel(side).forsterk` (minst 0,25) når RegionSpill finnes.
- **Hendelser som stopper spolingen** (`riksbrudd-hendelse`): et lag gir seg (fanger – lagt inn av «spillform»), et eget lag gir seg
  (fanger), bygdevern slått (annet), beleiring ferdig uten garnison (annet; med garnison kommer «gir seg»), våpenhvile ute (annet).

## IKKE gjort / svakheter
- Ingen dekning bak leirens egne bygg (bare kartets hus og tettbebyggelse).
- Fangene kan bare avhøres eller settes fri (ingen bytte, arbeid eller rekruttering).
- Kjøreordre for kjøretøy, røvere i et pågående angrep, røyk/lys og helikopter i lufta lagres ikke.
- Ingen 3D for helikopterfrakt eller etterretningsmerker (bare 2D-kartet).
- Våpenhvile på /rogaland: lagene i prøven så ikke hverandre (skog, dårlig vær), så «ingen kamp under hvilen, kamp etter brudd» er bare sett på kroknivå (ild = 0) og i AI-ens valg.
- En første prøve av beleiring midt i et tettsted der fienden og bygdevernet også sloss, startet ikke ringen – ikke gjenskapt i ren prøve.

## Runde 4 (18. nov dag)
Alle nye tall er **Claudes forslag** og står i `Krig.REGLER.leirbygg` og `Krig.REGLER.fange` (spill/krig.js).

### 1. Dekning bak leirens egne bygg
- `Krig.leirVern(b, a, bygg)`: et **eget** lag som står stille innen 6 m fra et ferdig bygg i leiren, med bygget mellom seg og
  skytteren (skuddlinja krysser byggets omriss, `Leir.hjørner`), tar treff ×0,55 (telt, drivhus, solceller og vakttårn ×0,8).
  Sandsekkvollen har sin egen regel (folk-visning.js, ×0,6 innen 15 m) og er ikke med; gjerde, port, veg, master og helikopterplass gir
  ingen dekning. Hjelpere: `inni`, `polyAvst`, `krysser`, `byggDekning`.
- I KROKER.ild (krig-visning.js) tas den beste av «bak hus i kartet» og «bak leirens bygg» (ganges ikke sammen). Lagpanelet: «i dekning bak
  brakke». Byggelista regnes på nytt hvert spillminutt eller når antallet bygg endres (`leirBygg`), og bare for lag innen 1,5 km fra leiren.
- Bare egne lag (dere kjenner leiren) – røverne får ikke dekning bak byggene dine. Som de andre stridsfaktorene: av i testene til `KrigSpill.test = true`.

### 2. Fanger: bytte, arbeid og rekruttering
Fangegruppene i `T.fanger` (`{ side, n, t, avhørt, til }`) har fått `arbeid` (oppgave eller null), `god`, `godMin`, `nei`. Nytt: `T.tatt` =
dine egne som er tatt (lagt inn når et eget lag gir seg: navn, rolle, hp, persondata). Alt i «riksbrudd-krig» per leir. Leir → Mål → **Fanger**:
- **Bytt (150 000 kr per fange)** – `KrigSpill.byttPenger(i)`: motstanderen kjøper dem tilbake.
- **Bytt mot dine** – `KrigSpill.byttEgne(i)`: én mot én med `T.tatt` fra samme side; de som kommer hjem, blir personer i Folk («fri»)
  via `Tropper.oppløs` (persondata og erfaring følger med).
- **Arbeid: bygg/hogst/riving/frakt/nei** – `KrigSpill.arbeid(i, o)` (uten o: blar). En fange = en halv arbeider, men bare der minst én av
  dine arbeider (`Krig.arbeidF`, høyst ×2). Virker gjennom `FolkRegler.oppgaveF` (overlev.js bruker den også – krig-visning.js henger seg på
  det som står der, og kobler seg på igjen hvis noen setter den på nytt). Rømming (bare av seg selv, ikke i testene): per døgn per fange
  3 % + opptil 25 % når få vokter (`Krig.rømSjanse`: én vakt holder fire; vakter = folk på «vakt» + friske soldater i lag innen 300 m).
  De som rømmer, sier fra hvor leiren ligger (`AI.minne[side].leir = true`).
- **God behandling** – `KrigSpill.behandling(i)`: 1 rasjon per fange per døgn fra Folk-maten. Etter 3 døgn: **Spør om de vil bli med**
  (`KrigSpill.spør(i)`): sjanse 30 % + 30 % × moral/100 per fange, krever `FolkRegler.kanRekruttere` (seng og moral ≥ 40) og høyst så
  mange som det er ledige senger. De nye får lojalitet 0,4–0,6 (fanger som «slippes rett inn» i Samfunn-panelet får 0,15–0,35 og koster moral),
  `p.fange` = fraksjonen. 10 % av dem som blir med, er forrædere: `p.spion = true` (det samfunn.js bruker – de kan lekke og sabotere til
  de blir avslørt) og `p.krigForræder = true`. Nei: spør igjen om ett døgn.

### 3. Lagring mellom øktene
- «riksbrudd-krig» (per leir) har nå også `røyk`, `lys` (sted og «til» i spillminutter – `tid` lagres av lagring.js), `heli` (lagets navn,
  fase, sted, mål, `fra`) og `kjør` (egne kjøretøy med kjøreordre: målet = siste punkt i ruta; ikke økonomiens oppdrag). Leses ved
  «riksbrudd-spill»; helikopteret og kjøreordrene settes inn 2 s senere (etter at lagring.js har lest lagene og kjøretøyene), og
  kjøreordrene legges på nytt med `window.kjørTil` (vegnettet hentes). Loggen: «Fortsetter der dere slapp: …». `KrigSpill.gjenopprettet`.
- **Fiendens stillinger og minne** lagres allerede i «riksbrudd-verden» av lagring.js (lagt inn i nattarbeidet): ikke endret, prøvd på nytt
  med omlasting – stillingen (side, kjent) og `AI.minne.rød` (leir, sist) kom tilbake.
- Prøvd i nettleser (Dovre): røyk, lys, helikopter på veg hjem med laget om bord, kjøreordre for «1. lastebilkolonne», en kjent stilling
  og minnet – alt var der etter omlasting. Kjøreordren ble lagt på nytt, men testserveren har ikke vegnettet («Fikk ikke lastet vegnettet»);
  på den ekte siden hentes det fra kartlageret.

### 4. 3D (krig3d.js)
- **Stillinger**: ring av sandsekker (`MODELLER.sandsekkvoll`, 7 biter på en bue av 300°, radius 4,2 m, tre rader ≈ 0,55 m – lav brystvern),
  åpningen bak, fronten mot leiren din. Én InstancedMesh (høyst 12), bare kjente stillinger (`q.kjent`) i utsnittet; matrisene settes bare
  når lista/utsnittet endres. Frigjøres når scenen byttes (`frigjør`). Trærne inne i ringen ryddes ikke.
- **Helikopterfrakt**: helikoptermodellen fra kjor.js flyttes ut på turen (stiger 0,3 m per meter fra start, synker mot målet, høyst 110 m,
  rotoren går) og står på plassen sin igjen etterpå (kjor.js setter den hver ramme før krig3d.js). Ingen ny modell.
- **Etterretning**: rombe med «?», navn og alder over stedet laget sist ble meldt, i overlegget (KROKER.tegn3d, proj3 – skjules bak åser og hus).
- `Krig3d.antall()` = { røyk, lys, stillinger, heli, merker }.

### 5. Prøvd: beleiring i et tettsted der fienden og bygdevernet sloss, og våpenhvile der lagene ser hverandre
- **Beleiring, /rogaland med ekte data** (dev.py, leir 15607 6622779; scratchpad natt/krig/p5.js): Sand (1203 innbyggere, 10,5 km fra
  leiren, ingen eier), et rødt lag midt i stedet (Kystalliansens 2. lag sto der fra før), egne lag 1,1 km øst og vest, 600× i ca. 14 spilltimer.
  FUNN 1: ringen startet aldri i et tettsted ingen eier – beleiringen krevde en eier, og mens bygdevernet sloss, har stedet ingen.
  RETTET: et tettsted uten eier der fiendens lag (ikke røvere/poster) står inne, kan beleires; meldingen sier «Kystalliansen sitter fast
  der». FUNN 2: når garnisonen hadde gitt seg, startet en ny beleiring av det tomme stedet med en gang (og meldte «beleiret» på nytt).
  RETTET: en ny ring startes ikke uten noen å beleire. Etter rettingene: beleiret fra første minutt, bygdevernet (8 mann) var knust på
  under 50 spillminutter av de to røde lagene (24 mann), Kystalliansen tok stedet etter 53 min, garnisonen svekket etter 6 t, begge lagene
  ga seg etter 12 t (24 fanger til «Ring vest»), ingen ny ring etterpå, 0 sidefeil. Under våpenhvile med dem som sitter i stedet, står
  beleiringen stille.
- **Våpenhvile, Dovre** (scratchpad natt/krig/p6.js): et blått og et rødt lag 250 m fra hverandre på åpen hei. Under hvilen (17 spillminutter
  på 60×): ingen skudd, ingen tap – men den røde brukte 6 % ammunisjon uten å skyte (Forsyning.skyt kalles i KROKER.ild selv når en annen
  krok gir 0). RETTET i index.html: kamprunde() hopper over par med våpenhvile før krokene kalles (ammunisjonen står på 100 %). Etter
  «Bryt»: det røde laget åpnet ild med en gang (2 av de blå ute på 17 min). Overgivelser skjer ikke under hvile.
  Samme prøve med lagene 120 m fra hverandre på flat hei (scratchpad natt/krig/p6b.js): begge så hverandre, 0 skudd og 100 % ammunisjon
  under hvilen, 52 skudd begge veger og tap på begge sider etter «Bryt».
  SETT, IKKE RETTET: på 250 m så det blå laget ikke det røde (ser() usann den ene vegen, sann den andre): det røde sto på flata bak en brekk
  (1118 -> 1127 moh.), og siktfeltet (terreng.js) prøver bakken der målet står, ikke et mål på ca. 2 m – den som står høyt, ser ned, den
  som står lavt, ser ikke opp over brekken. Radioen meldte også «Fiende sett» om laget under hvilen (ikke krig-filene). Og: et blått lag med «Ild: bare svar» bruker trolig også ammunisjon uten å skyte
  (samme Forsyning.skyt) – ikke målt.

### Fellesfiler endret i runde 4
- `site/dovre-fliser/index.html` – i `kamprunde()`, rett etter `if (a.side === b.side || !levende(b)) continue;`: én linje (med kommentar
  over) `if (window.AI && AI.hvile && AI.hvile(a.side, b.side)) continue;`. Og versjonsmerkene (versjon.py).
- Ingen endring i fraksjoner-visning.js, lagring.js, leir.js eller folk-filene.

### IKKE gjort / svakheter (runde 4)
- Dekningen bak leirens bygg ser bare på omrisset (2D) – ikke høyden på bygget, og ikke om laget står på riktig side for andre skyttere enn
  den som skyter nå (regnes per skytter, så det stemmer i hver ildrunde).
- Fangene: bytte skjer straks (ingen forhandling eller levering); motstanderen tar aldri initiativ til bytte; dine som er tatt, finnes bare
  når et eget lag har gitt seg etter denne runden (eldre spill har ingen i `T.tatt`). Fanger som ikke arbeider, rømmer aldri.
- Lagring: røverne i et pågående angrep lagres fortsatt ikke, heller ikke fiendens kjøretøy-ordre.
- 3D: ingen figurer i stillingene; etterretningsmerket er i overlegget (ikke i scenen); trær ryddes i ringen, men ikke busker fra
  vegetasjon3d som ikke ligger i R.treMesh/R.småMesh.
- Bygdevernet faller fort mot fulle lag (8 mann på under 50 min mot 24) – tallene i `Krig.REGLER.vern` er ikke endret.

## Runde 4, del 2 (18. nov dag)
### 1. Sikten er lik begge veger (terreng.js)
- `Terreng.siktfelt(v, X, Y, radius, oyne = 2, mål = 1.8)`: målet i en rute er en person 1,8 m over bakken (`MÅL_HØYDE`, Claudes
  forslag); den som ser, har fortsatt øynene 2 m oppe. Før ble bakken prøvd: på brekken ved Dovre (1118 -> 1127 moh. på 250 m) så laget
  på flata laget nedenfor, men ikke omvendt. Ingen andre endringer i terreng.js (to linjer + kommentar).
- test_terreng.js (5b): brekkprofilen fra Dovre i 18 plasseringer – 0 skjeve nå, 3 skjeve med bakken som mål (mål = 0, testen finner feilen),
  og en person bak en 60 m rygg synes fortsatt ikke. Alle regeltestene (alle pipeline/fliser/test_*.js) går som før – ingen eksisterende
  test endret svar. I nettleser: de to lagene på brekken ser nå hverandre begge veger.
- Virkning i spillet: det lyse siktfeltet viser nå der en person ville synes (litt større i kupert terreng, likt på flatt).

### 2. Ingen ammunisjon uten skudd
- MÅLT (scratchpad natt/krig/p8.js, Dovre, to lag 120 m fra hverandre som ser hverandre, fem kamprunder): «Ild: bare svar» uten å være
  beskutt (den røde var tom) ga 0 skudd, men ammunisjonen gikk fra 100 % til 90 % – like mye som med fri ild (5 skudd, 90 %). Årsak:
  Forsyning.skyt trekker ammunisjon i KROKER.ild, og alle krokene kalles selv når en annen gir 0. Under våpenhvile: 100 % (rettet i del 1).
- RETTET med én samlet endring i index.html, kamprunde(): ammunisjonen før krokene huskes (`ammo0 = a.ammo`) og legges tilbake når
  produktet er 0 (`if (ildf <= 0) { a.ammo = ammo0; continue; }`). Etter: «bare svar» 0 skudd og 100 %, fri ild som før (5 skudd, 90 %).

### 3. Radioen og våpenhvile
- spill/kontrollrom-visning.js, `rapport()`: lag fra en side dere har våpenhvile med (`AI.hvile('blå', side)`), tas ut av lista radioen
  melder «Fiende sett» fra (én hjelpefunksjon + filter på `nå.fiender`). De står fortsatt på kartet som «sist sett» (e.sett settes for alle).
- Prøvd (p6c.js, to lag 120 m fra hverandre): 0 «Fiende sett» under hvilen, 2 rett etter «Bryt».

### 4b. Motstanderen foreslår fangebytte
- Har en side noen av dine (`T.tatt`) og du noen av deres (`T.fanger`), kan den foreslå et bytte én mot én (`Krig.forslagBytte`): hvert
  6. spilltime 50 % sjanse (bare av seg selv utenfor testene), forslaget står i 12 timer (`Krig.REGLER.fange.forslagHver/-Sjanse/-Varer`,
  Claudes forslag). Melding i loggen (og «riksbrudd-hendelse» som stopper spolingen), og øverst i Leir → Mål → Fanger en rad med
  «Godta» / «Avslå». `KrigSpill.foreslå(side)`, `KrigSpill.svarForslag(ja)`, `T.forslag` (lagres). «Godta» bruker `byttEgne(i, maks)`.
- Vakta prøver forslag + Godta (din mann kommer hjem i Folk, én av deres fanger går). test_krig.js har to nye sjekker.

### 4a. Soldater i fiendens stillinger (3D)
- krig3d.js `figurer()`: tre figurer på kne bak sandsekkene (våpenet over vollen), vendt mot leiren, i hver kjent stilling som har et lag
  fra samme side innen 25 m som du ser (`synlig` – tåka gjelder). Én InstancedMesh (høyst 36) med egen figur (bein, kropp, armer, sekk,
  hode, hjelm, gevær; hjørnefarger) og sidens farge som et skjær (instanceColor, laget selv). Oppdateres høyst hvert halve sekund, og bare
  når lista endres. Eget materiale (MeshLambert med hjørnefarger) – frigjøres sammen med resten når scenen byttes. `Krig3d.antall().soldater`.
- Prøvd med bilde (p9.js): en kjent rød stilling 180 m fra leiren med et rødt lag i: 3 figurer bak vollen mot leiren, laget selv rundt.
- Lagets egne soldater (soldater3d i index.html) står fortsatt i formasjonen sin rundt laget – figurene i stillingen kommer i tillegg.

### Fellesfiler endret i del 2
- `site/dovre-fliser/terreng.js`: `MÅL_HØYDE = 1.8`, ny parameter `mål` i `siktfelt` og `helling = (z + mål - oz) / d` (+ kommentar).
- `site/dovre-fliser/index.html`, `kamprunde()`: `ammo0 = a.ammo` før krokene, og `if (ildf <= 0) { a.ammo = ammo0; continue; }` (+ kommentar).
- `site/dovre-fliser/spill/kontrollrom-visning.js`, `rapport()`: `hvile`-hjelper og `fiender: fiender.filter(f => !hvile(f))` i `nå` (+ kommentar).
- `pipeline/fliser/test_terreng.js`: ny blokk 5b (brekken).

## Runde 4, del 3: «det røde laget skjøt aldri tilbake» (funnet fra pakka «folk», docs/natt/folk.md punkt 9)
- GJENSKAPT (scratchpad natt/krig/p10.js, samme oppsett: Dovre, AI av, «1. lag, Dombås» 100 m fra leiren, nytt rødt lag 360 m unna,
  tempo 60 i 25 s), skudd talt per skytter: «Stridsvogn 1 -> Prøvefiende» 4–5, ellers ingen. Det blå laget og det røde laget skjøt ikke
  på hverandre i det hele tatt: begge sto i skog (terrengklasse 1, trærne er 8 m høye i siktfeltet), og på 360 m så ingen av dem den andre
  (`ser` usann begge veger – likt, så ingen feil der). Alle tapene til det røde kom fra stridsvogna i leiren, som skyter på alt som er
  `synlig()` for deg – også det vaktene i leiren melder (KROKER.ser, 400–800 m) – uten å se målet selv. Det røde laget kunne ikke svare:
  lag skyter bare mot kjøretøy de ser (`motKjøretøy`, enheter-visning.js). Skytterens bonus i folk-prøven virket altså ikke på
  utfallet (kanonen bruker ikke KROKER.ild) – forskjellen der var tilfeldig.
- EKTE FEIL i spillet, ikke bare oppsettet: røvere (side «rød», e.raid) som kommer gjennom skogen mot leiren, blir skutt av stridsvogna
  så snart vaktene melder dem, og kan ikke svare før de selv ser vogna.
- RETTET (enheter-visning.js, `motKjøretøy`, én betingelse med kommentar): et kjøretøy som skyter på laget (`k.skyterPå === a`), røper seg,
  og laget svarer innen 600 m selv om det ikke ser det. Etter: «Stridsvogn 1 -> Prøvefiende» 5 og «Prøvefiende -> Stridsvogn 1» 5.
  `motKjøretøy` er lagt til i `window.S6` (for vakta).
- VAKT (vakter/krig.js, del «RUNDE 4»): et rødt lag uten siktfelt og en blå stridsvogn 300 m unna – uten at vogna skyter på laget, skyter
  laget ikke; når vogna skyter på det, svarer det. Prøvd med feilen lagt inn igjen med vilje: vakta gir «svarer kjøretøy som skyter false».
- IKKE ENDRET (designvalg, bør vurderes): stridsvogna skyter fortsatt på mål den selv ikke ser, så lenge du vet om dem (vakter, kameraer,
  droner). Et blått lag som står og ser på, deltar ikke – det trenger egen sikt.

## Runde 5 (18.–19. nov kveld)
Alle nye tall er **Claudes forslag**: `Enheter.REGLER.egenSikt` (spill/enheter.js), `UTSNITT_HALV`/`UTSNITT_KANT` og `VEG_TLF` (spill/kjoretoy-visning.js).
Prøveskript og bilder: scratchpad `natt5/krig/` (p1 stridsvogn, p2 vegnett på telefon, p3 krigskartet, p4 lagring med omlasting, p5 bilde av vogna,
vakt.js / vakt2.js kjører vakta på PC og mobil, vakt2.js med infrastrukturen som i sjekk.js).

### 1. Stridsvogna skyter bare på det den selv ser
- Før: `kanon()` (enheter-visning.js) valgte nærmeste fiende som var `synlig()` – altså alt du visste om, også det vaktene, kameraene, dronene og
  radaren meldte, bak åser og inne i skogen. Kjøretøy som mål: det samme (`kjoretoySes`).
- Nå: vogna har sitt eget siktfelt fra tårnet (`Terreng.siktfelt`, øyne 3 m, radius `R.stridsvogn.sikt` = 1,2 km), regnet i bakgrunnen når den
  har flyttet seg over 40 m (høyst hver 1,5 s per vogn; lagres i en WeakMap, ikke på kjøretøyet). Til det nye siktfeltet er klart (vogna har flyttet
  seg over 200 m siden sist), gjelder den gamle regelen (sirkel, ikke inn i skog). Et lag inne i skogen ses bare innen 150 m.
- Kanonen skyter på et mål bare når vogna selv ser det, eller et eget lag innen 150 m fra vogna ser det (`Enheter.kanonFaktor`, `velgKanonmål`,
  `tynn`). Meldte mål gir faktor `egenSikt.meldt` = 0: ingen skudd (valgt framfor «kraftig lavere treff» – enklere å forstå for spilleren).
  Samme regel for kjøretøy som mål. Det vogna ser, er også det den melder som synlig (KROKER.ser bruker samme `vognSer`).
- Spilleren får vite det: loggen sier «Stridsvogn 1: Røverlag Vest er meldt 500 m unna, men vogna ser dem ikke selv – kjør nærmere eller send et lag
  dit» (høyst hvert 30. spillminutt per lag), og kjøretøypanelet får knappen **«Kjør mot …»** (meldte fiender innen 6 km, `kjørTil`).
- Også rettet: vogna skjøt under våpenhvile (kamprunde() hoppet over paret, men kanon() gjorde det ikke). Nå hopper den over sider med `AI.hvile`.
- **Rakettartilleriet**: skyter på et punkt, ikke et mål det ser selv – en observatør er greit (slik artilleri virker), og uten observatør er
  spredningen stor (som før). Men observasjonen må nå fram: et lag teller som observatør bare når det har radiokontakt (`KROKER.innsyn`, samme
  regel som for det du ser i kartet), eller en drone ser stedet. Vaktene og kameraene i leiren er ikke observatører.
- Prøvd (p1.js): sjekk.js-scenariet S6 (patruljen med drone over, vogna 600 m unna) ga 6 treff på 12 runder (vogna ser den selv); et rødt lag
  400 m unna bak terrenget, meldt av en drone: 0 skudd og meldingen i loggen; med et eget lag rett ved som ser det: skyter. Bilder:
  `natt5/krig/stridsvogn-1400x820.png` og `stridsvogn-390x844.png` (panelet med «Kjør mot Røverlag Vest (0,5 km)»).
- test_enheter.js: nye sjekker (kanonFaktor, velgKanonmål – det nærmeste vogna ser, ikke det nærmeste som er meldt –, tynn).

### 2. Fienden bruker kjøretøy på telefon
- HVORFOR IKKE FØR: fraksjoner-visning.js `vegnett()` ber om vegnettet bare når `innerWidth >= 900` (og ikke webdriver/datasparing) – valgt for å
  spare telefonen for 25 MB og minnet. Uten vegnett går fiendens lag alltid til fots. (region-visning.js har samme sperre.)
- MÅLT (Node, hele landet: 2 030 683 lenker, 1 915 412 noder, 41 MB utpakket): ca. 210–220 MB i minnet når det er lest (den utpakkede fila
  beholdes for geometrien, pluss tabellene), lest på 0,6–1,5 s. I Chromium med telefonprofil (390 × 844, Dovre, vegnettet fra lokal kopi):
  JS-minne + ArrayBuffer etter opprydding **+214 MB** for hele landet; prosessens RSS +247 MB (topp +345 MB).
- LØSNING: (a) **Utsnitt**: `Vegnett.les(data, { boks })` / `Vegnett.utsnitt(R, boks)` (vegnett.js) beholder bare lenkene med begge ender i boksen,
  med nye nummer, egen geometri (Int32Array) og infrastrukturkoblingene – så kan hele landets fil og tabeller slippes. Samme ruter, lengder,
  tider og geometri som hele grafen (prøvd på tre ruter ved Dovre, og i test_vegnett.js). På telefon (`VEG_TLF.telefon()`: vindu under 900 px,
  eller grov peker og skjerm under 900 px) er boksen leiren ±150 km, utvidet så basene og nærmeste oljeterminal er med (+20 km). Andel av landet
  (±150 km): rundt Dovre 20 %, Ryfylke 24 %, Oslo 44 % (±100 km: 6/11/35 %, ±200 km: 32/35/52 %). MÅLT i telefonprofilen: **+49 MB** i stedet for
  +214 MB (403 502 lenker), RSS +73–82 MB. **Toppen** mens det leses: `Vegnett.råUtsnitt` leser utsnittet rett fra fila (bare nodene for hele
  landet, lenkene én og én) i stedet for å lage hele landets tabeller først – samme svar felt for felt (prøvd på tre bokser med ekte data og i
  test_vegnett.js). Målt i Node (høyvannsmerket, utover selve fila): +39 MB mot +204 MB for utsnitt(rå(...)) og +133 MB for hele landet; i
  telefonprofilen RSS-topp +202 MB (før: +252, hele landet +345 – resten er nedlastingen og den utpakkede fila). (b) **Når**: ikke ved oppstart. `VEG_TLF.sjekk()` (hvert 5. s) henter
  vegnettet første gang et fiendelag har et mål over 3 km unna og lastebilen sin innen 200 m (samme regel som `Fraksjoner.kjør`); lag som da går
  til fots mot et slikt mål, tenker på nytt og setter seg i bilen. Ikke med datasparing, `navigator.deviceMemory` < 3, eller i testene
  (`VEG_TLF.test`). (c) Bitene pakkes ut rett fra en Blob (før ble de kopiert sammen først: 25 MB ekstra på toppen – gjelder også PC).
- Prøvd (p2.js, telefonprofil): et rødt lag 9 km fra Dombås med lastebilen ved seg – vegnettet ble hentet (2,6–4,2 s fra lokal kopi), laget satte seg
  i bilen og kjørte til Dombås, 0 sidefeil. Spillet var klart etter 11–12 s både før og etter (ingenting nytt lastes ved oppstart).
- Prøvd ende til ende på /rogaland med ekte data (p8.js, telefon 390 × 844, AI på, 600×, `VEG_TLF.test = true`): etter ca. 20 s hentet telefonen
  vegnettet selv (483 242 lenker rundt Ryfylke), og etter ca. 55 s satt Kystalliansens 3. lag og Folkefrontens 3. lag i hver sin lastebil og kjørte
  (mot Vikedal 20 km og Sand 18 km). 0 sidefeil. Bilde: `natt5/krig/fiende-kjorer-390x844.png`.
- Spillerens egne kjøreordre på telefon bruker samme utsnitt; et mål utenfor gir «på telefon er bare vegene i området rundt leiren lastet (ca. 150 km
  hver veg) – velg et mål nærmere». PC og testene: hele landet som før.

### 3. Krigskartet i liggende telefon (844 × 390)
- Før (bilde `krig-844x390-før.png`): panelet tok 400 av 844 px i full høyde og kunne bare lukkes helt; valgt tettsted lå under stillingen.
- Nå (strategi-visning.js): knappen **«Skjul»** i overskriftsraden gjør panelet til en stripe (andelen din, seiersstreken, valgt tettsted og «Send …»
  for det, «Vis mer», ×) – huskes i nettleseren (`riksbrudd-krigpanel`). Liggende er panelet 330 px / 40 % bredt, stillingen står på én linje per
  side med stolpen ved siden av, mindre luft, og det valgte tettstedet står øverst (på alle små skjermer). Teksten er minst 12,5 px.
  `passInn()`/`friDel()`: på telefon passes hele området inn i den frie delen – ved siden av eller over panelet/stripa, under statuslinja og
  knappene, til venstre for knappesøyla (`.ctl`) – også når panelet skjules/vises og når telefonen snus. PC som før (bortsett fra «Skjul»-knappen).
- Bilder (/rogaland med ekte data): `krig-844x390-rogaland.png`, `krig-844x390-rogaland-skjult.png`, `krig-390x844-begge.png` (stående: åpent og skjult),
  og Dovre: `krig-844x390-etter.png`, `krig-844x390-etter-skjult.png`.

### 4. Fienden mellom øktene
- Runde 4 hadde allerede (spill/lagring.js, «riksbrudd-verden»): fiendens lag (sted, helse, hva de holdt på med), AI.minne og stillingene (med
  «kjent»), og målet for marsjen – men bare dine egne marsjer ble satt i gang igjen. Prøvd på nytt: dette virker.
- Nytt (krig-visning.js, «riksbrudd-krig» → `fiende`): «sist sett» for hvert fiendelag (`e.sett`), fiendens lastebiler (sted, retning, antall, skade,
  borte, målet for kjøreturen og hvem som satt på), og fiendens marsjer i gang settes i gang igjen mot målet (`s.målLagret` fra lagring.js; AI-lagene
  får `ai.mål`, så de ikke tenker om igjen). Lastebilen legges inn 2 s etter lesingen og på nytt etter `AI.flytt` (som ellers flytter den hjem).
  Uten vegnett (testene, eller telefon før det trengs) går laget av der bilen står, og AI-en tenker på nytt. `KrigSpill.fiendePakk()/fiendeBruk(f)`.
  Lagres også når siden skjules (visibilitychange – pagehide kommer ikke alltid på telefon).
- Prøvd med omlasting (p4.js): marsjen (mål 188100, 6904100) gikk videre, «sist sett» kom tilbake, bilen sto der den var med 37 % skade, stillingen og
  minnet (leir funnet) var der; med vegnettet lastet satte laget seg i bilen og kjørte videre mot Dombås.

### 5. Fiendens lag går inn i hus og tar det som ligger der – IKKE GJORT
- Lut-hjelperen har ikke pushet «husene tømmes»-reglene ennå (ingen gren i kveld da jeg så etter), og LeteSpill/LutSpill har ikke noe API for å tømme
  et hus fra utsiden. Jeg har ikke rørt lut-filene. ØNSKE TIL LUT-HJELPEREN: `LutSpill.tøm(byggNr, { av: side, andel })` (husene som er ransaket av
  fienden, med hva som er igjen) og `LutSpill.ransaket(byggNr)` – da kan fraksjoner-visning/krig-visning la et AI-lag som står ved et hus i
  et tettsted i X minutter tømme det (og ta mat/ammunisjon til seg).

### Vakt (vakter/krig.js, del «RUNDE 5»)
- Vogna skyter ikke på et meldt mål den ikke ser (drone over et lag bak terrenget: 0 skudd), men gjør det når et eget lag rett ved ser det.
- `fiendePakk`/`fiendeBruk` gir «sist sett» tilbake, og en lagret fiendemarsj settes i gang igjen.
- Krigskartet: «Skjul» gir en stripe (under 120 px høy, stillingen skjult), «Vis mer» henter panelet tilbake (bare når tettstedene er lastet).
- Prøvd med feilene lagt inn med vilje: `egenSikt.meldt = 1` ga «skyter på et meldt mål: 3» (FEIL), og stillingen synlig i stripa ga
  «krigskartet kan skjules: NEI» (FEIL). Vakta tar 2–6 s (PC og mobil).

### Fellesfiler endret i runde 5
- `site/dovre-fliser/index.html`: bare versjonsmerkene for mine filer (versjon.py).
- Ingen andre fellesfiler. (fraksjoner-visning.js og region-visning.js er IKKE endret – vegnettet hentes på telefon fra kjoretoy-visning.js, og når
  `window.VEGNETT` finnes, bruker AI-en det.)

### IKKE gjort / svakheter (runde 5)
- Vogna har ingen egen 3D-sikt eller tegning av siktfeltet; det lyse feltet i kartet viser fortsatt bare lagenes sikt.
- Utsnittet på telefon leses én gang per økt: starter du et nytt spill med leiren et helt annet sted i samme økt, gjelder det gamle området.
  Toppen i minnet mens fila hentes og pakkes ut er fortsatt ca. +200 MB RSS i noen sekunder (25 MB nedlasting + 41 MB utpakket + resten) – enda
  lettere må gjøres i byggejobben (egne vegnettfiler per område).
- Region-visning.js (balanse) bruker vegnettet på telefon når det først er lastet, men utsnittet har ikke veger utenfor ±150 km.
- Fiendens lastebil: kjøreturen legges på nytt bare når vegnettet finnes; ellers går laget av.

## Runde 6 (19. nov, kritikken)
Kritikken: docs/anmeldelse-2026-11-19.md. Bilder: scratchpad `kritikk/pc` og `kritikk/tlf`; mine bilder i scratchpad `natt6/krig/`.
Alle tall under er Claudes forslag (samlet i REGLER-objektene som står nevnt).

### 1. Krigen er nesten tapt på dag 1 – RETTET (regler + AI), prøvd i gjennomspilling (tall under)
- **Inntak etter størrelse og styrke** (`spill/garnison.js`, `REGLER.størrelse = { små: 4000, maksTid: 8 t, perMann: 7, minMann: 4, minst: .5 }`):
  tettsteder opp til 4000 innbyggere tas som før på 30 min av et lag (Dombås og testene uendret). Større tar `30 min × √(folk / 4000)`
  ved full styrke (høyst 8 t) og trenger `√folk / 7` mann (minst 4) for full fart; med færre går det saktere (andelen), og under halvparten
  står inntaket stille. Stavanger/Sandnes (234 757): 69 mann for full fart (3,8 t), minst 35 (7,7 t). Ålgård/Figgjo (11 876): 16 mann, 52 min.
  Framdriften telles om til «30-minutters-sekunder», så `t.inntar.sek / innta` er fortsatt andelen (krigskartet, lagteksten og ringen i kartet
  virker uten endring). Nye funksjoner: `Garnison.mannFor`, `minstFor`, `inntaTid`, `mann`, `fart`, `tidMed`; hendelsen `forFå` («For få til å ta
  Stavanger/Sandnes: det trengs minst 35 mann, dere har 12. Send flere lag.»).
- **Fredstid i regionkrigen** (`Fraksjoner.REGLER.regionFred = 2.5` døgn på Vanlig, delt på fiendens faktor, 1,5–4 døgn; `Fraksjoner.fredDøgn`):
  motstanderne samler seg i sitt eget tettsted (eller hjemme) og tar ingen andre tettsteder. De forsvarer seg fortsatt. Melding i loggen ved start
  og når fredstiden er over (`AI.regionFred` i fraksjoner-visning.js). Ikke i testene (navigator.webdriver) uten `AI.test`.
- **Småstedene først** (`Fraksjoner.REGLER.storEtter = 1`, `ettLag = 12`): det første døgnet etter fredstiden går motstanderne bare mot tettsteder ett
  lag kan ta (minst ≤ 12 mann); storbyene blir mål etterpå (`v.småFørst`, `AI.småFørst`). Lagt inn etter den første gjennomspillingen, der begge gikk
  rett mot Stavanger/Sandnes da freden var over.
- **Motstanderne bygger seg opp over dager**: `Fraksjoner.lagTak(byer, dag)` = 3 + ½ per tettsted + ½ per døgn (høyst 6).
- **AI-en regner med styrken** (`Fraksjoner.velg`): et tettsted med `b.minst` tas bare når lagets og de frie vennenes styrke (ikke eneste garnison)
  er minst `minst`; laget venter i byen («venter på flere for å ta …») når vennene er på vei, og ellers velger det noe annet. Store tettsteder er
  «ledige» for flere lag til de som går dit, er mange nok for full fart (`v.mot`: Map tettsted → lag på vei; `s.ai.målBy` settes også mens laget
  står og tar byen). Uten `b.minst` (gamle tester) som før.
- **Ingen vinner før dag 4** (`Strategi.REGLER.tidligst = 3 × 1440`): `Strategi.utfall(st, R, tid)` gir ingen vinner (og ikke kortet «… har
  overtaket») før tre døgn har gått; krigskartet sier «Krigen avgjøres tidligst dag 4». I testene (webdriver) sendes ikke tida inn (som før).
- **Startstedet er ikke storbyen** (`Fraksjoner.REGLER.startMaks = 8000`): byer over 8000 innbyggere velges sist som startsted.

#### Gjennomspilling på /rogaland (19. nov, webdriver av, nytt spill på Vanlig, leiren midt mellom Sviland og Oltedal, spilleren gjør ingenting i krigen)
Skript: scratchpad `natt/krig/gjennom6.js` (ekte klokke på 600×, dev.py med ekte kartdata; 600× ga bare ca. 240× på denne maskinen, så den kom til
dag 2) og `natt/krig/rask6.js` (samme start, men spoler med `sim(.1)` i biter – samme regler). Tallene: andel av folket i området (41 tettsteder,
47 km), tettstedene hver side holder. Siste kjøring (rask7, med alle rettingene under):

| Tid | Kystalliansen (rød) | Folkefronten (grønn) | Hva skjer |
|---|---|---|---|
| dag 1 06:00 | Oltedal (1 011) – «under 1 %» | Sviland (742) – «under 1 %» | startstedene er deres; «samler styrker» |
| dag 1 14:00 (der kritikeren tapte) | Oltedal | Sviland | ingenting tatt; 3 lag hver (også med ekte klokke) |
| dag 2 06:00 | Oltedal | Sviland | 4 lag hver; første røverbølge, «ventet om ca. 85–90 min (anslag)» |
| dag 3 18:00 | Oltedal | Sviland | fredstiden slutter; ingen seier mulig før dag 4 06:00 |
| dag 4 06:00 | + Kvernaland, Høle – 2,7 % | + Ålgård/Figgjo, Vatne – 4 % | småstedene først |
| dag 4 12:00 | 2,7 % | + Hommersåk – 6 % | |
| dag 6 12:00 | + Kleppe/Verdalen, Bryne – 9,5 % | 6 % | 6 lag hver |
| dag 9 06:00 | 9,5 % | 6 % | ingen tar Stavanger/Sandnes: med 6 lag og en garnison per tettsted har ingen 35 frie mann |

Før (kritikeren, samme område): Stavanger/Sandnes tatt kl. 14:19 dag 1, «Kystalliansen har overtaket – 69 %». Etter: ingen side over 10 % på åtte
døgn når spilleren ikke gjør noe; spilleren har 2,5 døgn i fred og kan ta småstedene rundt leiren med Vaktlaget (4 mann holder til steder under ca.
1500 innbyggere). Krigen avgjøres i praksis av Stavanger/Sandnes (78 % av folket i området): den som får 35–69 mann dit. Mellomkjøringene fant tre
AI-feil som er rettet (se under): begge gikk rett mot Stavanger da freden var over (→ småstedene først), lag fra to sider sto i hver sin kant av
Ålgård og 51 m fra hverandre i skogen i Sviland i flere døgn uten å se hverandre (→ inn mot midten, og mot en fiende de vet står i tettstedet), og
slåtte lag talte ikke mot taket, så Kystalliansen hadde 26 lag på dag 8 (→ de teller, og et slått lag i et eget tettsted samles til det nye).
Bilder: scratchpad `natt6/krig/gjennom-etter-*.png` (ekte klokke), `gjennom-rask7-*.png`, `rask-rask-krig-start.png` (krigskartet ved start:
«Stavanger/Sandnes … trenger ca. 69 mann (minst 35) – dere har 4», knappen «For få»), `rask-rask*-banner-*.png`. Loggene: scratchpad `natt/krig/gj-*.log`.

#### AI-rettinger funnet i gjennomspillingene (fraksjoner.js / fraksjoner-visning.js)
- `REGLER.midten = 150`: et lag som tar et tettsted, går inn til 150 m fra midten før det blir stående (før stoppet det i kanten).
- `v.iByFiende` / `REGLER.inntil = 25`: en fiende som står i tettstedet laget vil ta, vet laget om; er laget sterkt nok (som ved angrep), går det helt
  inntil den («går mot … i …»), også når skogen skjuler dem. Visningen gir da også korte flytt (under 150 m).
- Forsterkninger: slåtte lag teller mot taket; er alle plassene brukt, samles et slått lag som står i et eget tettsted, til det nye laget (ikke i testene).

### 2. «Kystalliansen holder til i Vatne», men 0 tettsteder – RETTET
`AI.startEie(ut)` (fraksjoner-visning.js): i et nytt spill (de første tre spilltimene) får hver motstander tettstedet den holder til i, når det er
nøytralt og den ikke holder noe annet. Meldingen sier nå «Kystalliansen (rød) holder til i Vatne, 7 km nordvest for leiren, og holder tettstedet.» Dovre (uten AI.flytt): tettstedet der
HJEM ligger, 3 s etter «riksbrudd-spill». Lagres som før med tettstedene. Ikke i testene.

### 3. «Neste trekk» foreslo 3 mann mot Stavanger/Sandnes – RETTET
`Strategi.trekk` gir per tettsted `mann`, `minst`, `har` (mann i lagene innen marsjavstand), `nok`, `ettLag` og `flere` (lagene som til sammen
trengs, nærmeste først); et tettsted dere ikke har mann nok til, teller en firedel, ett som trenger flere lag 0,7. `Strategi.kravTekst(t)` =
«trenger ca. 69 mann (minst 35) – dere har 3». Det dere har mann nok til, står først (storbyen etter). I krigskartet (strategi-visning.js, små tekstendringer): teksten står i raden, knappen sier «For
få» (av) eller «Send 3 lag» (sender alle i `t.flere`), og `send()` sier fra når ett lag ikke kan ta det alene. Boksen for det valgte tettstedet får
«Ca. 69 mann (minst 35) tar det på 3,8 t uten fiender der» via `KRIG_TILLEGG.by` (garnison-visning.js). Tettstedspanelet i kartet sier det samme.

### 4. Røvervarselet kom 50 m unna – RETTET
- Røverne starter 3–4 km unna (før 1,4–2,2 km; `Trussel.VARSEL.start`), ca. 40–55 spillminutter fra leiren. Lag som ennå ikke har vært innen
  2,5 km av leiren, teller som «på vei», ikke «unna» (høyst 4 t, `VARSEL.kommerMaks`; `e.startTid`, `e.nærVært` lagres med angrepet).
- Varselet sier «Ventet om ca. 85 min.»: `angrep()` venter høyst 3 s på ruta deres og bruker tida den tar (`timerIgjen`, rundet til 5 min); uten
  rute 0,75 m/s i terrenget (`VARSEL.fart` – målt i gjennomspillingen: 3,7 km tok over 80 min; med 1,3 m/s sa banneret «kan være framme når som
  helst» i en halv time). Banneret bruker det samme (tida som er igjen av marsjen), så de sier det samme.
- Banneret viser **anslaget** («ikke sett ennå · ventet om ca. 39 min (anslag) – vakttårn og kameraer ser
  dem før», `Trussel.anslag`) til noen ser dem, og så «2,1 km unna · framme om ca. 27 min · sett fra vakttårnet».
- **Vakttårnet har verdi**: et bemannet vakttårn ser røverne på 1,5 km (`VARSEL.tårn`, KROKER.ser i forsvar-visning.js; vaktene ellers 400/800 m).
- Senest ca. 10 min før de er framme (`VARSEL.snart`): «Røverne er snart framme (ca. 7 min) – trykk «Forsvar leiren».» i loggen og farten ned (hendelsen «riksbrudd-hendelse» type alarm til flyt.js) – én
  gang per bølge, ikke i testene.

### 5. «Ikke sett ennå» mens Vaktlaget er under ild – RETTET
`ForsvarSpill.kjent(e)`: en røver er kjent når den er synlig, skyter på et av lagene dine, blir skutt på av dem, eller står i leiren. Banneret sier da
avstanden/«i leiren» og «· i ildkamp med Vaktlaget».

### 6. «Forsvar leiren» huskes ikke etter omlasting – RETTET
`trussel-lagring.js` lagrer `satt` (ForsvarSpill.erSatt) med angrepet; når angrepet kommer tilbake, kaller den `ForsvarSpill.gjenopprett()` – banneret
sier «lagene holder stillingen» (lagene hadde alt plassen og reglene sine fra lagringen).

### 7. Ildkraften «stiger med avstanden» – FORKLART
Prosentene var troppen *mot et vanlig lag på tolv*, og et vanlig lag har maskingevær som treffer dårlig på langt hold – derfor kunne andelen stige.
Troppsoppsettet (tropper-visning.js) viser nå treff per salve først («Treff per salve: 1,4 på 100 m, 0,5 på 400 m, 0,1 på 800 m»), og prosentene
etter med forklaringen.

### 8. «de 1 tettstedene» – RETTET (og «0 %» for en side som holder et lite sted: nå «under 1 %», `Strategi.prosent`)
Målteksten sier «i det ene tettstedet» / «i de 41 tettstedene»; resten av krigskartet hadde alt entall/flertall (`Strategi.tettsteder(n)` finnes for
nye tekster).

### Vakt (vakter/krig.js, del «RUNDE 6»)
Storbyen (Dombås med 235 000 innbyggere i prøven) tas ikke av ett lag på seks timer, men av tre lag; «trenger … mann» i «Neste trekk» og kravet i
boksen; entall i målteksten; ingen vinner på dag 1; fredstid/lagtak finnes; banneret viser anslag og «i ildkamp med …» (ikke «ikke sett ennå»);
forsvaret lagres med angrepet og kommer tilbake. Den gamle bølgeprøven setter `nærVært` på røverne (de har vært ved leiren og trukket seg unna).
Prøvd med feil lagt inn: uten `nærVært` i bølgeprøven ble «røvere som trekker seg unna avslutter bølgen: false» (FEIL) – det var slik vakta fant at
den nye «på vei»-regelen må skille på det. Tar ca. 3 s (PC, 2D). Krigskartpanelet prøves bare i 2D (krigskartet slår 3D av); i 3D prøves tekstene fra
reglene, og vakta sjekker at 3D står som før (`i3d`). Den første mobilkontrollen krasjet i «bygg i skråning» fordi runde 6-delen lot 3D være av –
rettet; runde 5-delen venter nå også på at 3D er bygget igjen (`await slå3d(true)`). Prøvd i 3D på mobil: ok, 3D på etterpå.

### Fellesfiler endret i runde 6
- `spill/strategi-visning.js` (eies av kart): små endringer – `bilde()` sender tida til `Strategi.utfall` (ikke i testene), målteksten (entall og
  «avgjøres tidligst dag 4»), raden i «Neste trekk» (kravteksten, knappen «For få»/«Send N lag»), `send()` (flere lag og melding når ett lag er for
  lite), og tipset nederst («… i et lite tettsted …»). Ingen endring i tegningen.
- `pipeline/fliser/vakter/krig.js` (min): bølgeprøven setter `nærVært`.
- `site/dovre-fliser/index.html`: bare versjonsmerkene (versjon.py).
