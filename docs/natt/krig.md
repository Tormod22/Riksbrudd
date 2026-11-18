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
