# Pakke «sjø» (nattarbeid 18. nov) – båter, havner, fiske, landgang, sperring, ferjer

ALLE TALL ER CLAUDES FORSLAG (samlet i `Sjo.REGLER` og `Sjo.TYPER` i `spill/sjo.js`).

## Filer
- `site/dovre-fliser/spill/sjo.js` – regler uten DOM (`window.Sjo` / `require`). Test: `node pipeline/fliser/test_sjo.js`.
- `site/dovre-fliser/spill/sjo-visning.js` – kart, panel, 3D-modeller, lagring (`window.SjoSpill`). Lastes rett før `kameravakt-visning.js`.
- `site/dovre-fliser/spill/kaier.js` – trykk-kroken spør `SjoSpill.trykk(X, Y)` først (båter, mål på sjøen) og `SjoSpill.kai(i)` ved trykk på en kai.
- `site/dovre-fliser/spill/kjoretoy-visning.js` – `kjørTil` avviser mål utenfor spillkartet (`OMRÅDE_OK`), én linje.
- `pipeline/fliser/vakter/sjo.js` – vakten «sjøen» (prøvekaier + prøvekart av sjøen; setter alt tilbake).
- `docs/natt/sjo-hjelp.json` – hjelpetekstene.

## Hva som finnes
- BÅTER (`Sjo.TYPER`): småbåt 400 000 kr (6 m/s, 1 lag, last 3), sjark 2 mill. (4,5 m/s, 1 lag, last 20, fisker best), lekter 6 mill.
  (3 m/s, 3 lag, last 150, trenger middels kai), ferje (kan bare tas: 6,5 m/s, 4 lag, last 250, bare store kaier).
  Kjøp ved en kai innen 3 km fra leiren eller i/innen 1,5 km fra et tettsted du holder (`SjoSpill.kjøp(type, kaiIndeks)`).
- RUTE OVER SJØEN: `Sjo.rute(vindu, x0, y0, x1, y1, { sperringer })` – A* over vannrutene (terrengklasse 3) i et vindu fra
  `lagVindu(b, false, ZV)`; ZV etter avstanden (`Sjo.nivå`: ≤ 15 km 32 m-ruter, ≤ 45 km 64 m, ellers 128 m; lengste seilas 160 km).
  Start og mål flyttes til nærmeste vann (kaiene ligger ofte på land), ruta rettes ut der det er fri sikt over vann, ruter inntil land
  koster mer. Finnes ingen lei: «det går ingen lei over sjøen dit» (båten kjører aldri over land). Gir det grove kartet ingen lei
  eller en lang omveg (> 1,8 × luftlinja) og turen er under 40 km, prøves det én gang til med finere kart.
- LAG OM BORD: `s.påBåt = båten` (eget felt, ikke `s.ombord`, som er kjøretøy). «Om bord i …» i lagpanelet når en båt ligger innen
  250 m, «Gå i land» når båten ligger ved en kai (laget settes på nærmeste land). Laget følger båten, tar ikke ordre, og lagres
  med båten (navnene i `b.lag`).
- HAVNER: holder du (blå) et tettsted med en STOR kai i tettstedet eller innen 1,5 km, samler varer seg på kaia jevnt gjennom uka
  (per uke: 20 tre, 10 betong, 6 stål, 800 l diesel, 60 rasjoner; × 1,5 fra 2000 innbyggere, × 2 fra 10 000; tak fire uker).
  En båt ved kaia kan «Last om bord»; ved en kai innen 3 km fra leiren «Loss til leiren» (Leir.leggInn, dieseltanken, Folk-maten;
  det som ikke får plass, blir om bord). Det ingen har hentet etter 7 døgn, kjøres landevegen: halvparten kommer fram.
  Gullring og «Havn: N på kaia» i kartet, liste i panelet.
- FISKE: «Fisk her» på en båt (småbåt 0,4, sjark 1,5 rasjoner per spilltime; × 1,2 vinter, × 0,8 sommer; ingenting i storm ≥ 14 m/s).
  Innen 3 km fra leiren går fangsten rett i leirens mat, ellers i lasterommet.
- LANDGANG: går laget i land innen 1,5 km fra et tettsted andre holder, er fienden overrasket i 30 spillminutter (laget treffer
  × 1,25, fienden × 0,6 mot det). Om bord: laget er vanskelig å treffe (× 0,3) og skyter dårlig (× 0,4). Alt via `KROKER.ild`.
- SPERRING: «Legg miner her» (1,5 mill. kr, 300 m radius; kan ryddes for 500 000) og «Senk båten her» (vrak, 160 m, for godt).
  Rutene går utenom; er leia helt stengt: «leia er sperret». En båt underveis som møter et nytt minefelt, stopper.
- FIENDENS FORSYNING: havnebyer andre holder innen 60 km fra leiren (høyst 4) får en forsyningsbåt annethvert døgn fra en kai
  6–25 km unna. Kommer den ikke forbi sperringene (eller går den på en mine), er garnisonen AVSKÅRET: fiendens lag i tettstedet
  treffer × 0,75 til en båt kommer igjennom. Båtene vises bare der du ser dem. Skjer ikke av seg selv i testene.
- FERJER: ved en ferjeterminal (kaitype 4, eller stor kai med en ferjekai fra INFRA innen 500 m) kan et lag innen 400 m «Ta ferja»
  – én ferje per kai (`S.ferjerTatt`).
- STYRING: knappen «Sjø» i kommandolinja (PC), «Sjøen» i Leir-menyen (fanen Lager), trykk på en kai (ankermerket) eller en båt.
  Panelet `#sjopanel`: oversikt (båter, havner, fiendens havner, sperringer), kai (kjøp, havn, ferje) og båt (seil til kai / sted på
  sjøen, stopp, lag, last, fiske, miner, senk).
- 3D: enkle modeller per båttype (ett nett per båt, felles materiale, ingen lys) som følger båten.
- LAGRING: `riksbrudd-sjo` per leir (båter med rute og last, lag om bord, sperringer, haugene i havnene, tatte ferjer, fiendens havner).
- /rogaland: kjøretøy tar ikke lenger ordre ut av fylket; båter heller ikke.

## API (window.SjoSpill)
`tilstand()`, `klar()`, `start()`, `lagre()`, `vis(på)`, `velg(båt)`, `kjøp(type, kai)`, `taFerje(kai)`, `seil(båt, x, y, kai, { vindu })`,
`seilTilKai(båt, kai, { vindu })`, `gåOmBord(lag, båt)`, `gåILand(lag)`, `omBord(båt)`, `lastOm(båt)`, `loss(båt)`, `fisk(båt, på)`,
`miner(båt)`, `senk(båt)`, `rydd(id)`, `havner()`, `fiendeHavner()`, `sendFrakt(havn)`, `avskåret()`, `test` (true = ting skjer av seg selv
også i testene, og panelet åpnes ved trykk på en kai).

## Runde 2 (etter flettingen med claude/nattfiks)
- REGIONEN (spill/region.js) OG HAVNENE – ÉN REGEL, INGEN DOBBEL LEVERANSE: når Regionen er i gang, frakter den alt et tettsted gir, over
  land til leiren. Sjøen gir da bare DET VEGEN IKKE FÅR FRAM: er Regionens rute fra en havneby (tettsted du holder med stor kai innen
  1,5 km) «truet» eller «stengt», legges mangelen (full leveranse minus det som kom fram; mat → rasjoner, diesel → l diesel, tre, betong,
  stål) på kaia, høyst sju døgns full leveranse (`Sjo.havnMangel`, `REGLER.regionTak`). Åpen veg = ingenting på kaia. Folk og skatt går
  aldri sjøvegen. Ukesvarene (`havnUke`) og landevegen en gang i uka gjelder bare UTEN Regionen (og i testene, der Regionen står stille
  uten `RegionSpill.test`). Forklaringen står i sjøpanelet (kaia og «Havner du holder»). Region-panelet er ikke endret.
- KJØRETØY OM BORD: lekter 2, ferje 6 (`TYPER.kj`). Båten må ligge ved en kai, kjøretøyet stå innen 250 m og ikke være på oppdrag.
  `k.påBåt = båten`; kjøretøyet følger båten og tar ikke ordre (en ordre stoppes med beskjed), lag som sitter i kjøretøyet følger med.
  «Kjør i land» ved kai setter det på nærmeste land. Lagres (navnene i `b.kj`). `SjoSpill.kjørOmBord/kjørILand/kjOmBord`.
- FISKE MED FOLK: har leiren en kai innen 3 km, kan du i sjøpanelet («Fiske fra kaia», − / +) be om opptil 10 fiskere. De tas av dem
  som står på «fri» i Folk (oppgavelista er ikke endret; får de en annen oppgave, slutter de). 0,1 rasjon per person per spilltime
  (2,4 i døgnet), årstid og storm som for båtene. `S.fiskere`, `SjoSpill.settFiskere/fiskere`.
- KJØR SELV VED FYLKESGRENSA: `spill/omraade.js` har en `KROKER.ramme3d`-krok som setter føreren (`KjorSpill.fører()`) tilbake til
  siste sted innenfor og nuller farten. IKKE PRØVD I NETTLESER (bare lest mot kjor.js: rammen regner fra k.X/k.Y hver gang).
- 3D PÅ SJØEN: sett på /rogaland (ferja fra Sand i Saudafjorden): modellen ligger i vannflata, og båtene har kjølvann via
  `window.Kjølvann` (ett spor per båt).
- IKKE GJORT i runde 2: fiendens AI bruker fortsatt ikke sjøen utover forsyningsbåtene. Kjøretøy om bord tegnes av kjøretøy3d i
  sjøhøyde (inne i/bak skroget – en kolonne på flere biler henger etter ferja på vannet); det må rettes i kjøretøy3d i index.html.

## IKKE gjort / svakheter
- Fiendens AI vet ikke om båtene: den bruker ikke båter selv, og «ser» et lag om bord som et hvilket som helst lag (men treffer det dårlig).
- Forsyningsbåtene kan ikke bordes eller senkes med ild – bare stoppes med miner/vrak.
- Ferjene i rute i 3D (ferje3d.js) er pynt og forsvinner ikke når du «tar ferja».
- I 3D kan du ikke trykke på kaier/båter (panelet virker, men «Seil til en kai» krever 2D-kartet). Lagene om bord tegnes som
  figurer ved båten i 3D. 
- Mørkleggingen utenfor fylkesgrensa finnes fortsatt ikke i 3D (tåkebildet tegnes i index.html; ikke billig å få til utenfra).
- Kaier i innsjøer gir båter som bare kan seile på innsjøen. Det grove sjøkartet (128 m) kan lukke trange sund på lange turer.
- Havneinntekten krever en «stor» kai (Claudes inndeling i kaier.js); tettsteder med bare småkaier gir ingenting.
- Prøvd på /rogaland (Sand/Sauda) med ekte data i 2D; 3D-modellene er bare sett på Dovre-testsiden (på land).

## Runde 4 (18. nov dag) – sjøen og det som sto igjen fra «økonomi»
ALLE NYE TALL ER CLAUDES FORSLAG (samlet i `Sjo.REGLER.fiendeBåt`, `Sjo.REGLER.aiBåt`, `Sjo.REGLER.middelsHavn`, `Region.REGLER.lojGjentatt`,
`Kaier.LEIRVALG`). Økonomipunktene (1–3) står også i `docs/natt/okonomi.md`.

1. **Krigskartet** viser hva et valgt tettsted gir: ny krok `window.KRIG_TILLEGG = { by: [], trekk: [], side: [] }` i
   `spill/strategi-visning.js` (én samlet endring: `tillegg()` øverst, `...tillegg('by', b.ref, e)` i boksen for valgt tettsted,
   `...tillegg('trekk', t.by.ref, t.eier)` i radene i «Neste trekk», `...tillegg('side', side)` under hver side i stillingen, og én CSS-linje
   `#krig small.tillegg`). `region-visning.js` fyller den (MutationObserveren `pyntKrig` er tatt bort; `RegionSpill.pyntKrig()` ber bare
   krigskartet tegne på nytt): typen, «Gir deg nå per døgn: … og N t olje til basen», strøm, lojalitet, skatt og handelsrute for dine;
   «Hvis du tar det, per døgn: …» og hva det gir motstanderen som holder det; under hver side hva tettstedene gir (deg) / hva fordelen er (dem).
2. **Handelsrutene følger vegnettet** når `window.VEGNETT` er lastet (det hentes på PC når Region eller krigskartet er åpent – ikke i
   testene, ikke på telefon). `Region.rute(…, veger)` tar en valgfri `veger(a, b) -> { sti, brutt }`; trusler måles mot vegen
   (`Region.tilSti`), lengden er vegens. Vegene regnes én om gangen (høyst 40 ms per halve sekund) og huskes til sperringene endres.
   **En sprengt bru/tunnel på vegen stenger leddet** (også med vakt): vegen regnes med alle sperringene i `graf._sperretAv` åpne, og ligger
   en av dem på vegen, er ruta «stengt» (`rute.brutt`, melding i loggen, «BRUA ER SPRENGT» i kartet). Ingen veg (øyer): luftlinja som før.
   **Lojaliteten**: et tettsted du mister, merkes (`Region.mistet`, `b.tapt` lagres); tar du det igjen, er lojaliteten høyst 35 og skatten vanlig.
3. **Motstandernes tettsteder**: sjekket at `RegionSpill.fordel` faktisk virker – treff (KROKER.ild), garnisonene forsterkes raskere
   (garnison-visning.js) og AI-en får nye lag oftere (`fraksjoner-visning.js` deler ventetiden på `fordel(side).forsterk`); `Fraksjoner.lagTak`
   gir flere lag jo flere tettsteder de holder. Motstanderne har ingen kasse, så «penger» får de ikke. Fordelen vises nå i krigskartet.
   Prøvd på /rogaland: rød med Vikedal (havn) gir `{ treff: 1, forsterk: 1.25 }`.
4. **Fiendens båter**: forsyningsbåtene (og AI-båtene) har helse 60. Et eget lag som ser båten innen 450 m (innen 150 m ser alle den; om
   bord alltid), skyter på den hvert spillminutt: 2 skade per frisk mann × KROKER.ild-faktoren (om bord ×0,4, mål på båt ×0,3, ammunisjon og
   stridsregler teller). Senket forsyningsbåt = garnisonen avskåret. **Bording**: en egen båt med et lag om bord innen 60 m tar lasten
   (betong 4, stål 3, 400 l diesel, 40 rasjoner – det som ikke får plass, går over bord). «Bord den» i båtpanelet setter båten til å jage
   (ny lei mot der forsyningsbåten er om et minutt, hvert annet spillminutt, rett på den innen 400 m). Trykk på en fiendebåt i kartet sier hva
   den er; er en egen båt med lag valgt, starter jakten.
   **AI-en bruker båter**: et AI-lag på marsj med en kai innen 1,5 km og en kai innen 1,5 km fra målet (minst 4 km unna) tar båt når vegen som
   er igjen er over 1,6 × sjøvegen + 2 km. Laget går til kaia (`s.båtPlan`, AI-en tenker ikke imens), går om bord i en sjark (samme regler,
   sjøkart og sperringer som spillerens båter; ligger i `S.frakt` med `ai: true`), og går i land ved målkaia (`s.ai.neste = 0`, AI-en tar over).
   Høyst én båt per side, ser etter hvert 10. spillminutt, bare når `AI.på` og ikke av seg selv i testene. Senkes båten, mister laget
   halvparten av mennene og svømmer i land. Fiendens båter lagres ikke (som fiendens lag).
5. **3D**: `ferje3d.js` (liten endring i `flyttFerjer`): har du tatt ferja ved en av kaiene i et samband (innen 600 m), skjules ruteferja der
   (`f.tatt`, `Ferje3d.sjekk().ferjeliste[].tatt`). **Trykk i 3D** (`KROKER.trykk3d`, `SjoSpill.trykk3d`): egen båt, fiendebåt eller nær en
   kai (60 m) – samme panel som i 2D, og mål for «Seil til en kai» / «Seil til et sted på sjøen». Er et lag valgt, eller står et lag innen 30 m
   fra trykket, tar ikke sjøen trykket (så marsjordre og valg av lag virker som før).
6. **Leirvalget**: ny krok `window.LEIRVALG_TILLEGG = [(x, y) => tekst]` i `oppstart-visning.js` (én samlet endring i `prøvLeir`: teksten
   legges etter «Her? N moh.» når stedet er gyldig). `kaier.js` fyller den med `Kaier.leirTekst`: nærmeste kai innen 10 km, størrelsen,
   om den er leirens egen (innen 3 km) og hvilke båter den tar, og nærmeste store kai hvis den nærmeste er mindre.
   **Middels kai gir havnevarer**: `havnFor` velger stor kai først, ellers middels; en middels havn gir 40 % (`Sjo.REGLER.middelsHavn`,
   både ukesvarene og Regionens mangel).
7. **Båtene i 2D** tegnes med det felles merkesettet (`Merker.tegn` med slag 'tom' + en liten båt med mast inni, sidens farge og form,
   kursstrek, helsestolpe for fiendebåter) når skroget er under 16 punkter langt; nærmere som skrog i riktig størrelse som før.

Nye API-er: `SjoSpill.fiendeBåter/skyttereMot/bord/senket/startJakt/aiSteg/planAI/gåOmAI/iLandAI/trykk3d/tatteFerjer`, `Sjo.skadBåt/kanBorde/
fraktLast/aiTarBåt/igjenAvSti`, `Region.tilSti/stiLengde/mistet`, `Kaier.leirTekst`, `window.KRIG_TILLEGG`, `window.LEIRVALG_TILLEGG`.
Tester: `test_sjo.js` (9 nye), `test_region.js` (7 nye), `test_kaier.js` (4 nye). Vakten «sjøen» prøver bording, senking, AI-båt, trykk i 3D,
leirvalget, krigskartet og lojaliteten.

### Fellesfiler endret (runde 4)
- `spill/strategi-visning.js`: kroken KRIG_TILLEGG (se punkt 1) – fire små innsettinger og én CSS-regel.
- `spill/oppstart-visning.js`: kroken LEIRVALG_TILLEGG i `prøvLeir` (tre linjer).

### Prøvd i nettleser (/rogaland, ekte data, leir ved Sand 6825, 6627357)
- Leirvalget: «Nærmeste kai: Sand hurtigbåtkai, stor (1,7 km) – leirens egen kai: alle båter, også lekter og ferje.»
- Krigskartet: Sand (ditt) «Gir deg nå per døgn: 2,4 m³ betong, 1,8 t stål, 120 000 kr, og 28,9 t olje til basen», Vikedal (rød) «Hvis du
  tar det …» + «Nå gir det Kystalliansen: garnisonene forsterkes 25 % raskere», sidene med sine linjer. Ingen sidefeil.
- Vegnettet (24 MB) lastet på ca. 9 s; Sauda–leiren følger vegen 52,5 km (18 km i luftlinje), Sand 4,7 km. En sperret lenke midt på vegen
  ga «stengt» og meldingen i panelet; åpnet igjen ga ruta tilbake. Lojalitet 90 -> mistet -> tatt igjen = 35.
- Bording fra en småbåt (tok 3 betong, resten over bord), senking med ild fra laget om bord, et rødt lag som tok sjark fra Sand
  hurtigbåtkai 40 km over sjøen og gikk i land ved målkaia. Båtmerkene i kartet.
- 3D (/rogaland, Jelsa ferjekai, utsnitt 1700 m): «Ta ferja» ga «Ferja fra Jelsa ferjekai»; trykk-kroken i 3D ved kaia og ved båten åpnet
  sjøpanelet med båten. Jelsa hadde ingen ferjerute i utsnittet (ferje3d trenger begge kaiene innenfor), så skjulingen av ruteferja er prøvd
  med den ekte ferje3d.js i Node (scratchpad natt/sjo/ferje3d-tatt.js: går før, borte når ferja er tatt ved kai B, går når en ferje er tatt
  et annet sted). Et ekte musetrykk i 3D rakk ikke å bli prøvd (maskinen var svært treg, belastning 27).
