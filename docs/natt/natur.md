# Nattarbeid 18. nov – pakka «natur»

Mål: tingene i 3D skal se bedre ut på nært hold, og verden skal ikke slutte brått. Alle tall er Claudes forslag.

## Hva som er laget

### 3. Bedre trær (index.html `TreDeler`, `treGeo`; spill/vegetasjon3d.js `krone`)
- `TreDeler` (index.html, rett over `TREGEO`): bladtekstur laget i koden (256², fire felt: løvklase, frynse, bar-dusk, tett),
  `kort()` (to trekanter med tekstur), `klase()` (kort jevnt rundt en klump), `samle()` (slår delene sammen, med uv),
  `materiale(m, geo)` (alphaMap + alphaTest 0,4 + begge sider når nettet har kort), `skygge(m)` (castShadow + dybdemateriale
  med samme bladtekstur; `TreDeler.SKYGGE = false` slår det av).
- Teksturen brukes bare som gjennomsiktighet (alphaMap, ikke blanding – ingen sortering). Fargene ligger fortsatt i hjørnene, så
  høstfarger, snø, vind (Vind3d) og svidde trær virker som før. Kortenes normaler peker ut fra kronens midte (rund lyssetting).
- Gran: fem lag greiner med frynset, hengende kant + sju bar-dusker som stikker ut (144 trekanter, før ca. 130).
  Bjørk: lys stamme med mørke merker, mørk kjerne og 29 kort (126 trekanter, før ca. 150). Furu, osp, rogn, fjellbjørk og selje i
  vegetasjon3d.js: kjerne + kort per klump (furu med bar-dusker). De enkle (fjerne) modellene er uendret.
- Vinter: nakne løvtrær mister ca. 78 % av løvet (discard i skyggeleggeren: vaer-visning.js `treVær` «løv» og vegetasjon3d.js).
- Plasseringen og antallet er IKKE endret (treVed/trær3d er urørt). Detaljnivåene (lodTrær) er urørt.

### 5. Gress og lyng (index.html `gressTekstur`, `gressMateriale`, `gress3d`)
- Teksturen har to felt: gresstrå (noen med aks) og lyng (kvister med små blader, noen rosa). `aFelt` per tust velger felt.
- Vind: stråene svaier i toppen med Vind3d (`uVindT`, `uVindK`), lyngen nesten ikke. Uten Vind3d står gresset stille.
- Høyt gress (0,45–0,85 m) i faste flekker i kartet, lyng/blåbærlyng i skogbunnen (bredere, noen brunlige), tustene heller litt
  hver sin veg, og flere av dem ligger nær kameraet. Antallet er som før (12 000 PC / 5000 mobil × KVAL.p.gress).

### 10. Figurer (index.html `soldater3d`)
- Lår, legger, kropp, skuldre og armer er runde (sylindre med 7–9 kanter, kuler for skuldre og hender). 1118 trekanter per figur.
- Bevegelse i skyggeleggeren: `aLem` per hjørne (1/2 = venstre/høyre bein med støvel, 3 = underarmer, hender og våpen) og
  `aGang` per figur (takt, sving, stilling). På marsj går beina i takt og våpenet bæres lavt; i ildkamp (`s.skyterPå`) sikter de
  (våpenet løftes til skulderen); ellers står de klare. Fortsatt fem instansnett og ingen ny regning per figur.
- Soldatene og kjøretøyene har `castShadow = true`.

### 11–13. Effekter (ny fil spill/effekter3d.js, regler øverst, test_effekter3d.js)
- Kjøretøy (KJORETOY og bilen du kjører selv fra KjorSpill.liste()): eksos når de flytter seg, støv på tørr grus og i terrenget (`Effekter.underlag`: ikke på asfalt, ikke når
  VAER.våt > 0,35), snøføyke over snøgrensen, og hjulspor (ett instansnett, MultiplyBlending – mørkner bakken) som ligger 100 s
  og tones bort de siste 30. Hopp over 40 m (ny ordre, spoling) gir ingen spor.
- Kamp: for hvert innslag i SKUDD: sporlys (LineSegments, 320 m/s), munningsild, kruttrøyk og nedslag ved målet (jord eller snø).
  2D: et blink foran laget som skyter og et støt ved målet (KROKER.tegn, bare når kam.m ≤ 40).
- Ødeleggelse: `Effekter3d.krater(X, Y, r, smell)` (merke i bakken + eksplosjon), kalt av seg selv når et kjøretøy blir ødelagt
  eller kjører på en mine (window.skadKjoretoy pakkes inn) og når en veg sprenges (KROKER.ødelagt); sprengt bru, tunnel, kraftverk
  og dam gir smell og røyk. Hus i brente områder får et sotlag (et mørkt skall utenpå omrisset, høyst 60 hus). Brente områder leses tolerant fra `window.BRENT` og branner fra `window.BRANNER`
  (`Effekter.områder`: liste, Map eller objekt; { x, y, r }, { X, Y, radius } eller [x, y, r]; mangler r = 12 m; høyst 160):
  svidd bakke (ett nett som følger terrenget, hver rute én gang), svarte trær (fargen per tre i R3.treLOD), flammer og røyk der
  det brenner. Lista leses hver 20. ramme; `Effekter3d.oppdater()` leser den straks.
- API: `window.Effekter3d` = { krater, eksplosjon(X, Y, r), røyk(X, Y, mengde), brente(), branner(), tall(), oppdater(), tøm() }.
- Alt er: én punktsky (høyst 700/400/160 partikler etter grafikknivå), ett linjenett, ett spornett (1600/900/300), ett kraternett
  (40) og ett nett for brent bakke. Ingen nye lys.

### 14. Fjern skog og bebyggelse (ny fil spill/fjernby3d.js, regler øverst, test_fjernby3d.js)
- Skogholt (fire tresidede kjegler, 12 trekanter) inne i utsnittet der skogen er tynnet (u.treTall.andel; lenger enn 520 m fra
  midten) og ute i fjernringen der arealklassen er skog (ut til 2 × utsnittet; høyden leses fra nettet «fjernring» i scenen).
  Husklynger (30 trekanter) der ringen har arealklassen tettsted. Holtene krymper bort 350–650 m fra kameraet.
- Tak: 4500 holt PC / 1800 mobil på Høy, det halve på Middels, ingenting på Lav. Delt i 8 × 8 ruter som bare tegnes i synsfeltet.
- `window.FjernBy3d.tall()` / `.sjekk()`.

## Filer
- Endret: site/dovre-fliser/index.html (TreDeler, treGeo gran/løv, tre-materialene i sett3d, gressTekstur/gressMateriale/gress3d,
  soldater3d, castShadow på kjøretøy, to skript-tagger før knapper.js), spill/vegetasjon3d.js (krone, samle, materiale, vinterløv),
  spill/vaer-visning.js (fire linjer i `treVær` «løv»: vinterløv faller).
- Nye: spill/effekter3d.js, spill/fjernby3d.js, pipeline/fliser/test_effekter3d.js, test_fjernby3d.js, vakter/natur.js,
  docs/natt/natur.md, natur-hjelp.json.

## Ikke gjort / kjente svakheter
- Brente hus er bare et sotlag utenpå (husene er ett sammenslått nett og kan ikke bygges om ett og ett). Prøvd med et kunstig
  omriss på testsiden – IKKE sett på ekte hus (testsiden har ingen husdata).
- Miner mot fotfolk og rakettartilleri lager ikke krater ennå (de har ingen krok å henge seg på). Sprengning via KROKER.ødelagt
  er ikke prøvd i nettleser (krever et ingeniørlag som sprenger ferdig).
- Sivile biler (liv3d.js) og helikopteret lager ikke støv eller spor. Bilen du kjører selv er koblet på, men ikke prøvd kjørt.
- Hjulspor og kratere lagres ikke og er borte etter en ny innlasting.
- Fjerne tettsteder: bare der fjernringen har arealklassen tettsted (ikke sett på Dovre-testsiden, der er det ingen utenfor utsnittet).
- Skygger fra trær er bare forberedt (castShadow + dybdemateriale); om de tegnes, bestemmer pakka «lys». Ikke prøvd med skygger på.
- Ovenfra (30–110 m) ser lyngtustene mørke ut mot lys bakke.
- spill/kjoretoy3d.js og spill/liv3d.js er ikke endret.

## Målt (Dombås, testsiden, programvare-grafikk, PC 1400 × 820, Høy grafikk)
Trekanter før -> etter fra samme sted: nær gran 335 830 -> 366 786, nær bjørk 367 030 -> 389 538, vidt (1500 m) 507 492 -> 550 026,
ved laget 334 828 -> 368 820, lavt over gresset 325 594 -> 353 706. Økningen (6–10 %) er de fjerne skogholtene (høyst 54 000
trekanter, bare rutene i synsfeltet tegnes); trærne selv har omtrent like mange trekanter som før. Tegnekall: +15 til +40.
Ingen GL-feil. 3D av og på to ganger: geometrier 74 -> 74, teksturer 24 -> 24. Mobilstørrelse (390 × 800): 241 000–267 000 trekanter.
Bilder: scratchpad natt/natur/ (for-*.png = før, e8-*.png = etter fra samme sted, e4-gå*.png og e10-gå.png til fots, e6-bil.png
hjulspor og støv, e8-kamp.png kamp/krater/brann, e5-vinter.png vinter, m1-gå.png mobil).
