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

## Runde 5 (18.–19. nov kveld)

Oppdraget: (1) hakkete strandkanter, (2) steinmønster på heia, (3) blomster/bregner/gress inne i hus, (4) tom låve, (5) annet rart i
Rogaland. Alle tall er Claudes forslag (REGLER øverst i spill/kartbilde.js og spill/lave3d.js).

### 1. Myk strandkant (spill/kartbilde.js `strandG`, kalt i bygg3d i index.html rett før `vannmaske`)
- Årsaken: vannet i kartbildet er kartflisenes vannfarge strukket fra grove ruter (trapper i kanten), og rundt innsjøene på heia lå en
  mørk ring (satellittbildets vann utenfor kartets vannflate). Høydedataene har innsjøene helt flate, så vannstanden er kjent.
- strandG: (a) vann per rute (ca. 2,5 m, `strandCelle`) og utjevnet (`strandGlatt` 5 m, to glidende snitt per akse); (b) vannstanden fra
  ruter som er helt vann, spredt til ruter innen `strandRekk` = 40 m (nærmeste vanns høyde, to gjennomløp); (c) hvert punkt nær stranda:
  vann der terrenget ligger under vannstanden + `strandNivå` 0,3 m (støy på høyden ±0,15 m i to størrelser, 9 m og 3,2 m, fast i kartets
  meter), land over – også der kartet hadde vann. Høyden bestemmer helt nær vannet og tones ut den siste tredjedelen av rekkevidden; uten
  kjent vannstand brukes kartets vann, utjevnet med støy. Kanten tones over ca. én meter. (d) På land: lys sone av stein og grus opp til
  `strandSone` 1,3 m over vannet (bredere der det er slakt), mørk fuktig kant de første 0,14 m. Ikke lys sone ved havet (havnivå() har sin).
- Terreng mer enn `strandUnder` = 0,8 m UNDER vannstanden (nedenfor et utløp, en foss, en demning) regnes ikke med – der bestemmer kartet
  (uten dette ble opptil 40 m nedenfor et utløp gjort til vann; testen fanget 96 punkter med vernet slått av). Prisen: noen få steder
  står litt av den mørke ringen igjen (bilde slutt-strand-ovenfra, nede i midten).
- Ruter der ingenting kan skje, hoppes over (tørt land høyt over vannet, vann godt under vannstanden). Generator med yield (kjørAsynk).
- Vannmasken (u.vann/u.vannData) lages av det ferdige kartbildet som før, så gange, dyr, trær, siv og bygg følger det du ser.
- `window.STRAND_AV = true` før 3D bygges slår det av (til før/etter-bilder). `u.strand` = antall punkter som skiftet vann/land.
- Test: test_kartbilde.js (kunstig bukt med 32 m-trapper: 92 % -> 99,5 % enig med høyden, ingen landflekker i vannet, lys sone).

### 2. Lyng og gress på heia i stedet for stein (index.html: `bunnkart`, `gress3d`, `detaljIBakken`, `smått3d`)
- Årsaken: nær bakken ble brun lyng regnet som «ikke vegetasjon» tre steder: bunnkartet ga ikke gress der rødt var over grønt (bar bakke),
  bakkeshaderens nærdetalj målte vegetasjon som grønt minus blått (brun lyng fikk 40–50 % småstein/grus), og smått3d satte 7 steiner per
  32 m-rute på alt som er snaufjell i arealklassene (heia i Rogaland er snaufjell).
- Nå: bunnkartet har klasse 3 = lyng på åpen mark (brunt/oliven, metning ≥ 18, ikke vann, ikke for lyst); gress3d setter lyngtuster der
  (halvt bakkens egen farge, så de ikke blir mørke prikker ovenfra). Bakkeshaderen (begge variantene, med og uten «Lys og skygger»)
  måler vegetasjon som max(grønt, rødt·0,97) − blått − 0,02: lyng og gress gir gress-/lyngmønster, bare grått gir stein og grus.
  smått3d: på snaufjell der kartet er brunt/grønt står bare en firedel av steinene; der det er grått berg som før.
- Klasse 3 i u.bunn.gress: vegetasjon3d gir den sted «hei» på snaufjell/hei; fjernby3d og lyd teller bare 2 (skog) som før.

### 3. Planter og gress ikke inne i hus (index.html `gress3d`, spill/vegetasjon3d.js `fri`)
- Fra før: gress mot u.husRute (husene fra kartet) og Interior3d.iLeirbygg; blomster/bregner/siv mot nærHus.
- Nytt: begge sjekker også R3.hindre (hus lagt inn etter at utsnittet ble bygget – prøvehus i vaktene, byggesettets vegger) og ALLE
  leirens bygg (Leir.hjørner + 0,4 m; telt, tanker og bygg under arbeid hadde gress inni – sett på bilde: gress gjennom lagerteltet).
  `Vegetasjon3d.iLeir(x, y)` brukes av gress3d. Når antallet ting i R3.hindre eller leirens bygg endres, settes planter og gress rundt
  kameraet på nytt (sjekkes hvert 0,7 s) – før sto de til du hadde gått 12 m.

### 4. Låven (ny fil spill/lave3d.js, regler øverst, test_lave3d.js; skripttagg rett etter vegetasjon3d.js)
- Interiøret ga alt høyballer, båser, tønne og (over 90 m²) traktor – men rommet så tomt ut. lave3d.js legger til, OPPÅ interiøret
  (ingen endring i interior.js/interior3d.js, som eies av lut-hjelperen): høy strødd på gulvet (flak med mykere farge mot kanten),
  høyhauger i enden lengst fra døra når taket er lavt, høyloft på stolper med høyhauger, høyballer, høy som henger over kanten og stige
  når taket er minst 3,3 m, redskap lent mot ytterveggen (høygaffel, rive, spade, ljå, kost), trillebår ved døra, melkespann og en
  gammel grå traktor («gråtass») i låver over 45 m² uten traktor. Uthus over 18 m² får redskap og trillebår.
- Ett samlet nett per bygg (MeshLambertMaterial med hjørnefarger, ingen tekstur, ingen nye lys), laget når interiøret lages
  (Interior3d.aktive(), sjekkes hvert 0,4 s mens du går) og fjernet med det. Målt: 950–1150 trekanter per låve i Ryfylke.
- Gråtassen legges inn i planens møbler som type «gråtass» med sperrer: true (Interior.blokkert stopper deg). lut.js kjenner ikke typen,
  så den blir ingen beholder. ENESTE berøring med interiøret: `pl.møbler.push(...)` i lave3d.js `oppdater`.
- `window.Lave3d` = { REGLER, slag, plasser, antall, trekanter, oppdater, sjekk }.
- Sett i Ryfylke: de fleste låvene har himlingen ved veggtoppen (1,95 m – interior3d.js holder himlingen under P.veggTopp), så høyloftet
  kommer sjelden; da står høyhaugene der i stedet.

### 5. Annet som så rart ut når du går i Rogaland
- Gresset vokste opp gjennom lagerteltet i leiren (se punkt 3: alle leirens bygg holdes nå fri for gress og planter).
- Heia i 1000 moh. hadde høyt, frodig gress og busker: tregrensen var 1250 m i hele Sør-Norge (Vegetasjon.tregrense(y) stiger
  sørover). Nå tregrense(y, x): 3,5 m lavere per km vest for x = 150 000 (kystklima; Sirdalsheiane ca. 860 m, Ryfylke 780, Bergen 600 –
  Claudes forslag). Kalles med x fra gress3d og vegetasjon3d (gress, blomster, busker, treslag); natt3d/vind3d/fjern3d kaller fortsatt
  bare med y (som før). Dovre (x ≈ 200 000) er uendret. Test i test_vegetasjon.js.
- Lyngtustene på åpen hei har halvt bakkens farge (ikke mørke prikker ovenfra).

### Prøvd i nettleser (runde 5)
- Rogaland med ekte data (dev.py, leir 37880 6617991, PC 1400 × 820): ovenfra, skrått og høyt over innsjøen sør-øst for leiren, til fots
  ved stranda og på heia, før (window.STRAND_AV) og etter. Bilder i scratchpad natt5/natur/: for-strand-ovenfra/skraa/hoy, for-gaa-strand
  (før), etter-strand-ovenfra/skraa/hoy, etter-gaa-strand, etter-gaa-strand-ned, etter-gaa-hei, etter-gaa-hei-ned (etter);
  etter-mobil-strand/-gaa (telefon 390 × 800); heia før: scratchpad syn/9-gaa.png (samme leir, tatt før kveldens endringer).
  Sett: trappekanten og den mørke ringen er borte, kanten er ujevn og myk med en lys stein-/grussone, holmene er runde; til fots
  står lyng og gress helt ned til stranda, og heia er dekket av lyng/gress-tuster i stedet for steinmønster.
- Ryfylke (/norge, 15607 6622779): låve på 93 m² – bilder lave2-dor/-midt-a/-midt-b (trillebår, høy på gulvet, redskap ved veggen,
  melkespann, gråtass). Planter i ekte hus: 0 av 6033 planter og 0 av 12 000 gresstuster; prøvehus lagt inn etterpå: 0 og 0 (før
  rettingen av gresset: 735 gresstuster inne i prøvehuset).
- Vakta «natur» på Dovre-testsiden (PC, 3D på): ok på ca. 20 s, uten sidefeil (Dombås-utsnittet har ikke vann i kartet, så u.strand = 0).

### Målt (regel 10)
- Trekanter: stranda er bare kartbildet (0 nye). Samme kameraplass før/etter: ovenfra 870 376 -> 868 014, skrått 1 100 524 ->
  1 098 042, til fots ved stranda 953 310 -> 954 410. Lyngen: like mange gresstuster som før (taket 12 000), færre steiner på grønn/brun
  snaufjell. Låven: 950–1250 trekanter per låve (ett tegnekall), bare mens du går nær.
- Byggetid for strandG (Node, samme kartbilde fra Rogaland, stille maskin): ca. 0,65 s for 4096² (PC nær) og 0,2 s for 2048² (telefon /
  PC fjernt), lengste bit mellom yield 8–40 ms (med pust() i kjørAsynk). Med seks hjelpere på fire kjerner varierte det 0,65–2,8 s.
  Første 3D-utsnitt i nettleseren (hele byggingen): 24 s før, 26 s etter (samme sted; programvare-grafikk og delt maskin – usikkert).

### Ikke gjort / svakheter (runde 5)
- Vannmasken (u.vann) er fortsatt binær i halv oppløsning (ca. 1,4 m ved 4096²): glansen og bølgene på vannet har små trapper på 1,4 m
  helt ytterst – kartbildets kant er myk. Mange moduler leser masken med terskel, så den er ikke gjort myk.
- Små mørke tjern som ikke er vann i kartet (svarte flekker på heia) er IKKE gjort om til vann – prøvd med en regel (mørkt, flatt), men
  den traff også mørk mark; for usikkert.
- Store lyse flekker der satellittbildet hadde snø/is (malt som berg av snøTilBergG) har fortsatt den grove formen fra satellittbildet.
- Høyloftet kommer bare i låver med høy himling (minst 3,3 m); i Ryfylke har de fleste låvene himlingen ved veggtoppen (1,95 m).
- Låveinnholdet ble ikke prøvd på telefon.
- Ved leiren står en teltmodell (ikke et av leirens bygg – LeirSpill.tilstand().bygg var tom; trolig basen) med gress tett inntil;
  om gresset står inne i den, er ikke avklart (den er ikke i R3.hindre, så gress og planter vet ikke om den).
- Bilder etter tregrensen ble senket: etter2-gaa-strand, etter2-gaa-strand-ned, etter2-gaa-hei, etter2-gaa-hei-ned (glisnere gress på heia).

### Filer i runde 5 (til flettingen)
- Nye: site/dovre-fliser/spill/lave3d.js, pipeline/fliser/test_lave3d.js.
- Mine: spill/kartbilde.js (REGLER strand*, glidLinje, strandG), spill/vegetasjon.js (tregrense(y, x)), spill/vegetasjon3d.js (fri: R3.hindre +
  iLeir, leirFot/iLeir, hindreEndret i ramme3d-kroken, Vegetasjon3d.iLeir, tregrense med x), test_kartbilde.js, test_vegetasjon.js,
  vakter/natur.js, docs/natt/natur.md, docs/natt/natur-hjelp.json.
- index.html (små, samlede endringer):
  1. bygg3d: tre linjer rett før `u.vann = await vannmaske(...)` – kallet på Kartbilde.strandG (u.strand).
  2. detaljIBakken: `float vegK = …` (BAKKE_FX) og `float veg = …` (uten FX) måler vegetasjon som max(grønt, rødt·0,97) − blått − 0,02.
  3. bunnkart: én ny linje – klasse 3 (lyng på åpen mark).
  4. gress3d: `lyng = type === 2 || type === 3`; husene i R.hindre i tillegg til u.husRute; `Vegetasjon3d.iLeir`; tregrense(u.cy, u.cx);
     lyngfarge for klasse 3.
  5. smått3d: én ny linje – på snaufjell med brun/grønn kartfarge står bare en firedel av steinene.
  6. Skripttaggen `spill/lave3d.js` rett etter vegetasjon3d.js. versjon.py er kjørt.
- interior.js / interior3d.js er IKKE endret. lave3d.js legger én møbeloppføring av den nye typen «gråtass» inn i planen (pl.møbler) for
  kollisjon.

## Runde 15 (21. nov kveld)

Oppdraget: (1) bakkens farge («av og til litt for sandaktig, litt for gul»), (2) gressflater (eng, beite, plen), og tillegget
(3) «trær og steiner skal ikke stå på fotballbaner». Alle tall er Claudes forslag (REGLER øverst i spill/bakkefarge.js og spill/anleggfri.js).

### Ekte bilder (ikke i repoet – lagret i scratchpad natt15/natur/ekte/)
Wikimedia Commons: «Field - Klepp, Norway 2021-08-07.jpg» (åker på Jæren), «Aerial view of Sandnes, Norway in 2015.jpg» (fra lufta),
«Field with large round bales in white plastic.jpg» (Hovet, Hol – slått eng og grønne enger, CC BY-SA 4.0, DutchColours),
«Dovrefjell.jpg» (Fokstua mot Snøhetta, fri, Jensens), «Hardangerviddaflora.jpg», «Vivassvatnet panorama.jpg» (Hardangervidda),
«Sheep on Korgfjellet 20090628 D.JPG» (beite i fjellet), «Skoger landskap.jpg» (kulturlandskap), «Trondheim-grainfield-tungasletta.jpg»
(moden kornåker). Snittfarge (HSV) i bakken, målt med scratchpad natt15/natur/hsv.py:
- Åker/eng på Jæren (Klepp): tone 73°, metning 0,81, lys 0,45. Grønne enger (Hovet): 75°, 0,57, 0,48. Slått eng: 46° (gulbrun – riktig).
- Heia på Dovre (Fokstua, forgrunn): 64°, 0,41, 0,34. Hardangervidda: 53°, 0,49, 0,39 (lav og gras – brunlig/gulgrå).
- Moden kornåker: 40° (gul – riktig om høsten).

### Hvor det gule kom fra
- Kartbildet i 3D er satellittmosaikken fra kartflisene. Den gir enger og beiter på Jæren en gulbrun/oliven farge (ca. 50–55°, matt).
- naturfarger() (index.html) økte metning og lys likt for alle farger (×1,15 og ×1,1): den gulbrune marka ble mer gul og lysere – «sand».
- Nærdetaljene i bakkeshaderen (detaljIBakken) ga gresset et skjær av halm: snittet av de to gressfargene tok bort 29 % av det blå
  (fG 0,6/0,74/0,54 – 1,4/1,36/0,88), og varianten uten effekter likeså (0,8/0,97/0,74 – 1,2/1,12/0,78).
- Lyset (lys3d: sol 1/0,95/0,88, himmellys blåhvitt) er IKKE endret – det eies av pakka «lys», og med kl. 13 er det nesten nøytralt.
  Kl. 19 (lav sol, gullys) blir alt gulere – det er riktig.

### 1. Bakkens farge – LAGET (spill/bakkefarge.js, test_bakkefarge.js)
- Bakkefarge.punkt / naturfarger: gul-oliven vegetasjon (tone 34–84°, med metning, ikke lys) dreies mot grønt (høyst 16°), får mer metning
  (×1,22) og beholder lyset (×1,0 – før ×1,1 for alt: det gjorde den gulbrune marka lys som sand). Brunt (lyng, myr: under 34°), grått (berg, grus, veg, by), lyst (sand, strand,
  snø) og vann får nøyaktig samme farge som før (testen sammenligner med den gamle regelen).
- DYRKET MARK: terrengklasse 5 (32 m-rutene fra lagVindu, utjevnet – Bakkefarge.dyrketMaske/dyrket) gir sterkere dreining (26°) fra 26°,
  metning ×1,38 og lys ×1,05 – så eng og beite blir grønne mens heia rundt beholder sin grågrønne/brune farge. u.dyrket = andel, u.dyrketMaske = masken
  (512², 256 KB), Bakkefarge.verdi(u, x, y).
- Nærdetaljene i bakkeshaderen er grønnere (fG 0,58/0,74/0,6 – 1,3/1,38/1,04; uten effekter 0,8/0,98/0,8 – 1,14/1,14/0,86).
- window.BAKKEFARGE_AV = true før 3D bygges gir den gamle fargen (til før/etter-bilder).
- Fart: en stripe på 4096 × 256 punkter tar ca. 50 ms i Node (iStriper tar 64 rader om gangen, ca. 13 ms).

### 2. Gressflater – LAGET (gress3d i index.html, vegetasjon3d.js)
- PLEN: på baner og anlegg (u.påAnlegg) og i tettstedene (u.iBy) er gresstustene klippet (6–12 cm, GRESS_FARGE.plen), uten lyng og uten
  høye engflekker. Klipperstriper og oppmerking på fotballbanene står i kartbildet som før (kartflis.js anlegg()).
- ENG OG BEITE: på dyrket mark står det høye graset i større flekker (terskelen for engflekkene senkes med 0,6 × dyrket), og blomstene
  regnes som «eng» (ikke hei) med 1,4 × tettheten – smørblomst, hvitkløver, prestekrage osv.
- Parker og plener utenfor tettstedene og uten anleggsdata vet kartet ikke om (ingen landuse=grass i dataene).

### 3. Ingen trær, steiner eller høyt gress på baner og anlegg – LAGET (spill/anleggfri.js, test_anleggfri.js)
- AnleggFri.hent(u) (kalt i bygg3d rett før trær3d) leser omrissene for anlegg a 1–5 (fotball, tennis, ballbane, løpebane, lekeplass) og
  7–9 (rullebane, taksebane, oppstillingsplass) fra husflisene z13 og setter u.påAnlegg(x, y, kant) (kant 2 m, rutenett 50 m).
  Parkering (a 6) er by-pakkas.
- AnleggFri.rydd(u) (rett etter ryddHus) tar bort trær (alle treslag) og steiner/busker fra smått3d på anleggene (u.anleggRyddet = antall).
- vegetasjon3d.js: einer/vier/fjellbjørk på åpen mark, blomster/bregner/siv (fri) og nærskogen sjekker u.påAnlegg; fjellmark3d.js fri()
  likeså (stein, lav, lyng, snøflekker); gress3d: klippet gress (se 2).

### Fellesfiler endret (index.html)
1. bygg3d: `if (window.AnleggFri) await AnleggFri.hent(u);` før trær3d; `AnleggFri.rydd(u)` etter ryddHus; dyrket-masken
   (Bakkefarge.dyrket) og `naturfarger(px, TW, y0, y1, dyrk)`.
2. naturfarger: tar dyrk og bruker Bakkefarge (BAKKEFARGE_AV = gammel regel); den gamle koden står igjen som reserve.
3. detaljIBakken: to linjer (fG og naerF uten effekter).
4. GRESS_FARGE.plen og gress3d: plen/dyrket (fire linjer).
5. Skripttaggene anleggfri.js og bakkefarge.js rett etter anlegg3d.js. versjon.py er kjørt.
