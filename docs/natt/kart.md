# Pakke «kart» – lesbarheten i 2D-kartet og krigskartet (grenen claude/natt18-verden)

## Runde 6 (19. nov, kritikken)

Punktene fra `docs/anmeldelse-2026-11-19.md`. Alle tall er Claudes forslag (samlet i `Etikett.REGLER` og `KartLys.REGLER`).

1. **Navnelappene overlapper hverandre og markørene rundt leiren – RETTET.** `spill/etikett.js` (navnesystemet fra 12. nov) samler nå
   navnene i rammen og plasserer dem til slutt, viktigst først: fiender (6) > valgt (5) > tettsteder i krigskartet (3,5–4,5) > egne lag (3)
   > leirens navn (2,5) > kjøretøy (2) > bygg og steder (1). Hvert navn prøver plassen sin, én og to linjer unna, ved siden av merket og
   på andre siden av merket; finnes ingen ledig plass, skjules det (fiender og valgt står likevel – oppå kartnavn, ikke oppå merker).
   Merkene meldes inn som hindringer (`Etikett.hinder`): alle `Merker.tegn` (lag, kjøretøy, tettsteder, kaier), soldatene på nær zoom,
   leirens flagg, basen, feltbilen/helikopteret og fiender meldt over radio (`spill/kartlapper.js`). Navnene går utenom dem – merkene
   ligger altså over navnene. Slik virker det uten å endre de andre filene: `Etikett.tekst(g, t, x, y, retning, prio)` svarer `NaN` mens
   rammen pågår, og tegnerens egne `strokeText/fillText(t, x, NaN)` fanges opp (farge, skrift) av en innpakning av lerretets metoder;
   `Etikett.tegnAlle(g)` plasserer og tegner. Prioriteten kommer fra det 6. argumentet, ellers fra retningen (navn over merket = 2,
   under = 1) eller fra en regel (`Etikett.regel(fn)`). Utenfor en ramme virker `tekst()` som før.
2. **Røvernes markør gjemt under egne lapper – RETTET.** Fiendens lagmerke og «sist sett»-merket tegnes på nytt etter alle navn
   (`Etikett.øverst`), og navnet deres får plassen først. Fiender meldt over radio (krig-visning.js, «Røvere 1,1 · 8 min siden») meldes
   inn som hindring og tegnes på nytt øverst med navnet sitt (`spill/kartlapper.js`, leser `KrigSpill.T().etter`).
3. **«0 t olje» – RETTET.** Lappen vises ikke når basen har 0 t (regel i kartlapper.js). Basens navn «Leiren til …» vises ikke når basen
   står i leiren (flagget og leirens navn sier det samme). Tall i navnene i kartet skrives i en skrift med vanlige tall
   («Times New Roman»/Liberation Serif/Noto Serif) når navnet ellers er i Cormorant Garamond (gammeldagse tall: 0 som o, 1 som I) –
   bare sifrene, resten av navnet som før. Tallene på de tre beste målene i krigskartet likeså.
4. **Krigskartet oversvømt av kai-ankre – RETTET.** I krigskartet vises bare leirens egen kai (innen 3 km, `Kaier.LEIRVALG.leirKai`):
   `KAI_VIKTIG` i index.html (kaier.js) og `infraViktig` for ferjekaiene. Under 4 m per punkt vises alle som før. Krigskartet skriver
   tettstedsnavnene selv (gjennom Etikett, med viktighet), så infrastrukturens tettstedsnavn skjules mens det er åpent (før sto
   «Stavanger/Sandnes» to ganger). Prøvd på /rogaland med ekte data: ingen ankre, tettstedene og fronten kan leses.
5. **Krigskartet på telefon – RETTET (så langt kartet rekker).** `StrategiSpill.boks()`: det som vises er sirkelen, men bare delen der det
   finnes kartdata (Dovre-piloten har bare ca. 46 × 50 km), og alltid tettstedene og leiren. `passInn()` (telefon) og `åpne()` (PC)
   passer boksen inn i den frie plassen. På Dovre fyller kartet nå bredden (før en firkant på ca. 150 px i en svart sirkel).
6. **/norge: navnene i en lang søyle nord for symbolene – RETTET.** Årsaken var `Etikett.plass`: et navn som ikke fikk plass, ble flyttet
   en linje opp om gangen, opptil 30 linjer (450 px – på 200 km-zoom flere hundre km). Nå høyst to linjer, ved siden av eller under merket,
   ellers skjult. Prøvd på /norge: tre navn rundt Dombås-merket, ingen søyle.
7. **«Brakke −1 kW · 8 senger» oppå bygget – RETTET.** byggevisning.js: nøkkeltallene står under byggets omriss (laveste hjørne + 13 px),
   ikke oppå taket.
8. **«Leiren her?» 100 px fra flagget – RETTET.** Navnet har høy viktighet (regel i kartlapper.js), så det står under flagget selv om
   kartnavn er i veien (det ble skjøvet ned av navnene på infrastrukturen). Prøvd på /rogaland. (Pakka «start» har samtidig latt
   forslaget tegne navnet rett under flagget uten Etikett – det virker sammen; regelen gjelder da bare om det går gjennom Etikett igjen.)
9. **2D-kartet viser verken natt eller regn – RETTET.** `spill/kartlys.js` (`KartLys.tone`, test_kartlys.js): kartet ganges med en blå
   farge etter solhøyden (`Vaer.solHøyde`, samme myke overgang som lys3d: dag fra −8° til 8°; de lyse sommernettene gir litt lys tilbake,
   `tussmørke` 0,35), høyst 0,62; regn og snø trekker fargene mot grått (metning, høyst 0,45) og gjør kartet litt mørkere. Tegnes rett etter
   kartflisene (én linje i `tegn()`), så navn og merker er like lyse. Kartet tegnes på nytt når tonen endrer seg (KROKER.sim).
   I testene (navigator.webdriver) er det av til `KartLys.test = true` (vakter som leser fargene i kartet påvirkes ikke).
10. **Nær zoom uskarpt og flatt – DELVIS.** `KartLys.detaljTegn`: et fint mønster i bakken (verdistøy i tre størrelser, gresstrå og
    småstein; 25,6 m per mønster, følger kartet) legges over med «soft-light» fra 0,6 m per punkt (helt inne ved 0,25). Kartet er mindre
    flatt, men trærne er fortsatt myke klatter (kartflisene er laget av 5–32 m-data). Leirens bygg er fortsatt grå bokser (leir-visning.js,
    ikke min fil). Også: lagnavnet på nær zoom står like over den øverste mannen (før 30 m over midten – 150 punkter unna for én mann).

### Filer
- `site/dovre-fliser/spill/etikett.js` – utsatt plassering (`plasser`, `kandidater`, `tegnAlle`, `hinder`, `regel`, `øverst`, `tegnet`,
  `hindringer`, `aktiv`, `skrivTekst` (sifre i vanlige tall for tekst utenom køen), `REGLER`). Test: `pipeline/fliser/test_etikett.js` (gamle + 9 nye).
- `site/dovre-fliser/spill/kartlapper.js` (ny, rett etter merker.js) – hindringer og regler for leiren, basen, kjøretøyene, meldte fiender.
  `window.KartLapper`.
- `site/dovre-fliser/spill/kartlys.js` (ny, rett etter kartlapper.js) – natt/regn og mønsteret i bakken. `window.KartLys` (tone, nå,
  tegn, detaljTegn, detalj, forskyv, av, test). Test: `pipeline/fliser/test_kartlys.js`.
- `site/dovre-fliser/spill/merker.js` – `Merker.tegn` melder merket inn i `Etikett.hinder`.
- `site/dovre-fliser/spill/strategi-visning.js` – `boks()`, `passInn`/`åpne` bruker den, tettstedsnavn gjennom Etikett, tall på målene.
- Vakt: `pipeline/fliser/vakter/kart.js` (ca. 0,5 s; rører ikke tilfeldighetene `frø` – nyttLag bruker dem, og krig-vakta etter
  denne regner med samme rekke –, ikke tida og ikke 3D: krigskartet åpnes ikke, `StrategiSpill.erÅpen` svarer ja en stund): leiren på 5 og 2 m uten overlapp og uten «0 t olje»/«Leiren til», ingen navn oppå
  merker; fiende + tre egne lag på samme sted (fiendens merke øverst, lest som piksel); seks lag på samme punkt på 150 m gir ingen søyle;
  kaier i krigskartet; krigskartets boks på Dovre; natt mørkere og blåere og regn gråere på et eget lite lerret med kjent farge (`KartLys.tegnTone`), og kartet tegnes med kartlyset på.
  Tegner med `tegn()` direkte (3D kan stå på).

### Endret i fellesfiler
- `index.html`: `tegn()` – `KartLys.tegn(ctx)` etter flisene, `Etikett.tegnAlle(ctx)` etter lagene (to ganger i byggevisningen: før
  sløret og etter byggene); 3D-overlegget – `Etikett.tegnAlle(g)` etter `tegnLag`; `tegnLag` – prioritet på lagnavn, «sist sett» gjennom
  Etikett, fiendens merker øverst, soldatene som hindringer, navnet over formasjonen; `KAI_VIKTIG` og `infraViktig` (krigskartet);
  tettstedsnavnene i `tegnInfra` skjules i krigskartet; skripttaggene for kartlapper.js og kartlys.js etter merker.js.
- `spill/byggevisning.js`: nøkkeltallene under omrisset (to linjer).

### Ikke gjort / svakheter
- Krig-visning.js tegner fortsatt sin egen tekst for meldte fiender under navnene; kartlapper.js tegner den på nytt øverst (samme sted).
- Langt ute med mange lag på samme sted vises de som får plass (høyst sju plasser rundt merket); lag og kjøretøy som skjules,
  telles som «+3» etter navnet som står nærmest (innen 30 punkter, `REGLER.klynge`).
- Mønsteret i bakken ligger også på vann (svakt). Trærne på nær zoom er fortsatt uskarpe.
- Oljetekst på terminalene («300 t olje», okonomi-visning.js) går ikke gjennom Etikett.

## Runde 12 (21. nov natt, kritikk E/F) – grenen claude/natt18-spillform

Kritiker E (liggende telefon, Rogaland) og F (PC, Svorkmo). Alle nye tall er Claudes forslag og står i REGLER-objektene som nevnt.

1. **Lappene rundt leiren oppå hverandre – RETTET.** «hogst 100 % · 25,4 t i haug» (ressurser-visning.js) gikk utenom Etikett; nå går den
   gjennom `Etikett.tekst` med lavest viktighet (sted), og vises bare helt nær (under 0,9 m per punkt) eller når jobben er valgt (da med
   viktigheten «valgt»). «Helikopter»/«Feltbil», «7 t olje», lagnavnene og byggnavnene gikk alt gjennom Etikett. Prøvd på Dovre (PC og
   telefon, 0,5/2/8/30 m per punkt) og i Ryfylke: ingen lapper oppå hverandre.
2. **To skrifttyper i kartet – RETTET.** `Etikett.skrift(g)` gir hovedkartets lerret (`<canvas id="c">`) en `font`-egenskap som bytter
   sans-serif (og Arial/Helvetica/system-ui) med kartets skrift MENS en ramme tegnes (nullstill … tegnAlle): `Etikett.kartFont` –
   «11px sans-serif» → «600 12.6px "Cormorant Garamond", Georgia, serif» (`REGLER.kartSkrift`, `sansSkala` 1,15, `sansVekt` 600).
   Slik får alle tegnekroker samme skrift uten å endre filene deres; tegnHud og 3D-overlegget røres ikke. Leir2d (Feltbil/Helikopter),
   byggevisningen (nøkkeltall, «5000 l», «+20 kW») og hogstlappen er også satt direkte; byggevisningens tall skrives med vanlige sifre
   (`Etikett.skrivTekst`).
3. **Krigskartet for mørkt, infotekst oppå stedsnavn – RETTET.** strategi-visning.js: kartet under løftes med «screen» (`KART_LØFT`
   rgba(140,128,100,.6)) i stedet for å mørknes (rgba(12,10,6,.3)). Infoteksten i region-visning.js («Bygd: mat · tre · lojalitet 58»)
   går gjennom Etikett etter stedsnavnene (skjules når den ikke får plass).
4. **Brakka synes ikke på 1 km-målestokk – RETTET.** leir2d.js: over `REGLER.klynge.fra` (1,6 m per punkt) tegnes leiren som en klynge:
   byggene står som om kartet hadde `klyngeM(m)` = fra + (m − fra) · 0,12 meter per punkt (på 1 km-målestokk ca. 3,4 × forstørret), hvert
   bygg minst 5 × 8,5 punkter i takets farge med mørk og lys kant (stiplet under bygging, mørkt når ødelagt, rødt kors på sykestua), og
   skjøvet ut til minst 20 punkter fra midten (lagmerkene og flagget står der). Byggene meldes som hindringer til Etikett. Ikke mens du
   bygger/plasserer (da i ekte målestokk). Over 150 m per punkt tegnes de ikke.
5. **Byggemodus: trappetrinn og hele kartet grønt – RETTET.** helling-visning.js: fargene (flatt/skrått/bratt) ligger i et eget bilde og
   blandes mykt mellom de fire nærmeste rutene (før: rutene som trappetrinn). De vises bare rundt det du plasserer (skissen, ellers
   kartets midte): fullt innen `fargeInne` 18 m (minst `fargeInnePx` 70 punkter), tonet ut til 2,4 × den avstanden (rund maske på et
   lerret like stort som skjermen). Skyggeleggingen og høydekurvene dekker hele flekken som før.
6. **Kartflisene – DELVIS (det som kunne rettes i visningen).**
   - *Skjøter ved nær zoom:* trekronene (med skygge) ble kuttet rett av i flisskjøten fordi trær bare 6 m / 12 punkter utenfor flisen
     ble tatt med. Nå 13 m (`KANT` i traer()). Sett på /norge ved Svorkmo (z16): kuttene ved x ≈ 825/1035/1250 er borte.
     Jernbanens stipler begynte på nytt i hver flis (hakk i skjøten): fasen står nå fast i verden.
   - *«Sjakkbrett» ved Varhaug–Vigrestad:* det var Jærbanen (lys/mørk stiplet strek på 4 punkter, forstørret). På z 8–10 er den nå en
     mørk strek med en tynn, dempet og lengre stiplet kjerne.
   - *Utvasket mellomzoom med gulhvite flekker:* hovedårsaken var siktfeltene – hvert eget lag la sitt lyse felt (0,17) oppå de andre, så
     med ti lag ved leiren ble åsene nesten hvite. index.html (tegnEnheter): feltene samles per side i ett bilde (unionen) og legges på
     én gang (0,17 blå, 0,2 andre, det valgte + 0,09). I kartflis.js løftes solsidene mindre jo lysere punktet er (`KARTLYS_TAK` 1,4).
   - Ikke funnet: rektangler i annen tone som ikke er trær – kan være fliser som ble laget mens noe ikke lot seg hente (de lages på nytt
     etter 4 s, 8 s …). Ikke sett i mine bilder etter full lasting.

### Filer (runde 12)
- `spill/etikett.js` – `kartFont`, `skrift`, REGLER.kartSkrift/sansSkala/sansVekt. Test: `test_etikett.js` (+3).
- `spill/leir2d.js` – `klyngeM`, klyngeBygg, REGLER.klynge; Feltbil/Helikopter i kartets skrift. Test: `test_leir2d.js` (+3).
- `spill/helling-visning.js` – fargebildet `cvF` (myk blanding), `tegnFarger` (maske), REGLER.fargeInne/fargeInnePx/fargeUt.
- `spill/strategi-visning.js` – `KART_LØFT`.
- `spill/byggevisning.js` – kartets skrift, vanlige sifre.
- `kartflis.js` – `KARTLYS_TAK`, trær over flisskjøten (`KANT`), jernbanen på mellomzoom og stipler faste i verden.
- Vakt: `pipeline/fliser/vakter/kart.js` – nye deler 6 (sans-serif blir kartets skrift i rammen, ikke utenom) og 7 (et bygg 25 m øst for
  flagget blir et merke på 1 km-målestokk; ingen hogst-/rivingstall ved leiren på 2 m per punkt). Selvtest: med `klynge.fra = 1000`
  og uten skriftbyttet feiler begge.

### Endret i fellesfiler (runde 12)
- `index.html` (tegnEnheter): siktfeltene samles per side i `siktC` og tegnes én gang (ny `let siktC` over tegnTåke).
- `spill/ressurser-visning.js` (én blokk i kartkroken): hogst-/rivingslappen gjennom Etikett, bare under 0,9 m per punkt eller valgt.
- `spill/region-visning.js` (én linje): infoteksten ved tettstedene gjennom Etikett.

### Ikke gjort / svakheter (runde 12)
- Klyngen langt ute kan ikke trykkes på (trykk på bygg virker som før bare nær). Gjerder og veger i leiren tegnes ikke i klyngen.
- Skriftbyttet gjelder bare hovedkartet i 2D – navn i 3D-overlegget er som før.
- Krigskartet utenfor området (øst for sirkelen) er fortsatt mørkere enn inne i det.

## Runde 13 (21. nov, kritikk G/H) – grenen claude/natt18-spillform

Kritiker G (liggende telefon, Lærdal på /norge) og H (PC, Rogaland). Alle nye tall er Claudes forslag og står i REGLER/konstanter som nevnt.

1. **Navn oppå hverandre ved leiren – RETTET.** `Etikett.samleSted(S)` (spill/etikett.js): egne lag og kjøretøy med merket innen
   `REGLER.samle.r` = 56 punkter fra leiren blir én lapp «Leiren: 3 lag, 2 kjøretøy ›» `samle.dy` = 47 punkter under leiren (gull, viktighet som
   egne lag), når minst `samle.min` = 2 står der. Det valgte laget og fiender har alltid sitt eget navn. Regelen `Etikett.samle(lapper, S)` og
   `Etikett.samleTekst(n)` er rene (test_etikett.js); `Etikett.samling()` gir lappen i siste ramme. spill/kartlapper.js setter stedet hver ramme
   fra 1,6 m per punkt til NAVN_UTE (14; lenger ute står tallet bak leirens navn som før), og i 3D (KROKER.tegn3d, uten «›»). Trykk på lappen
   (KROKER.trykk, lagt først) zoomer inn på leiren til 1,2 m per punkt (`KartLapper.SAMLE`). Prøvd: Dovre (mobil 3/8/12 m), /norge Lærdal, Rogaland
   og 3D ovenfra – 0 overlapp.
2. **Brakka nesten usynlig på 100 m-målestokk – RETTET.** spill/leir2d.js: små bygg forstørres om midten til minst `REGLER.flat` 8 × 12,5
   punkter (høyst ×2) fra 0,6 m per punkt (`tegneM`, `forstørr`; ikke skissen, ikke mens du bygger). Med flate farger (fra 1,2 m per punkt) og i
   klyngen er taket blandet med leirens farge (`leirTak`, `REGLER.leirTak` 0,6) og bygget har mørk kant under den lyse (`mørkKant` 2,4).
   Klyngens minstemål er 6,5 × 10,5 (før 5 × 8,5). Hogstfeltene og ruinene (ressurser-visning.js) tegnes nå FØRST (KROKER.tegn.unshift), under
   byggene – den stiplede sirkelen i kritikerens bilde var et hogstfelt (hogstlaget begynner ofte rett ved leiren). Hurtiglageret i bygg() regner
   med forstørringen.
3. **Velge bygg zoomet til 20 m – RETTET.** spill/byggevisning.js: `KAMERA = { nærmest: .5, lengst: .9, godNok: 1.2 }` (før 0,2–0,6 og 0,8) –
   kartet går til ca. 50–100 m-målestokk, og står du nærmere enn 1,2 m per punkt med leiren i bildet, beholdes zoomen. test_byggevisning.js.
4. **Uskarpt og pikselert i leirvalget – RETTET.** index.html (tegnReserve): en reserve to eller flere nivåer opp tegnes fra en glattet kopi
   (`flisGlatt`: dobbel størrelse, uskarp 1,6 punkter, høyst 14 kopier – `GLATT`) med høy kvalitet. Ingen ruter og ingen synlige skjøter
   inne i den grove flisen (bilder s4-uten/med). Den myke kanten mot ferdige fliser er som før.
5. **Diamantene uten navn – RETTET.** spill/spillet-visning.js (oppdragsmerkene): navnet sto bare under 6 m per punkt (derfor «etter
   omlasting» – kameraet sto lenger ute). Nå alltid, gjennom Etikett (lav viktighet lenger ute, så det bare skjules når det ikke er plass), og
   ruta har en lys kjerne og lysere kant. Prøvd før og etter omlasting.
6. **Leirvalget – RETTET.** spill/leirvalg.js: over tregrensen står «skog: bare nede i dalen (innen 2,5 km)» (eller ingenting når det ikke er
   skog) – aldri «skog: mye» (test_leirvalg.js). index.html: mens du velger leirplass (ingen leir ennå, `velgerLeir()`) vises oljeinnretninger,
   felt og rør bare nærmere enn `LEIRVALG_OLJE` = 300 m per punkt (500 km-målestokk på telefon er ca. 5000). Ikke i testene (webdriver) uten
   INFRA_FOKUS.test.
7. **Striper i lia – ÅRSAK FUNNET OG RETTET.** Det var høydekurvene: i Lærdal er lia ca. 45°, så 5 m-kurvene sto 4–5 punkter fra hverandre
   (bilder s7b: med kurver striper, uten kurver glatt; høydene er glatte – ingen terrasser i dataene, skyggen er glatt). kartflis.js `koter`:
   der kurvene står tettere enn `KOTE_TETT.svak` = 9 flisepunkter tegnes de svakere, under `bort` = 5 bare hver femte (og tynt), under `tykk` =
   2,2 (stup) ingen. test_koter.js (ny).
8. **Vegnettet på /rogaland – DELVIS.** spill/kjoretoy-visning.js: på et mindre spillkart (window.SPILLOMRÅDE) beholdes bare vegene i området
   ± 20 km, også på PC (`VEG_TLF.område`, `VEG_TLF.boks`): 240 775 vegstrekninger i stedet for 2,03 mill. (mye mindre minne), og meldingen sier
   «Laster vegnettet (24 MB) – bare vegene i Rogaland beholdes …». NEDLASTINGEN er fortsatt hele fila (24 MB): den er én gzip-fil for hele
   landet. Svarene fra /api/kart har `immutable` i ett år, så nettleseren bør ha bitene lagret etter første gang. Det som må til for bare
   fylket: vegnett.py må skrive én fil per fylke (eller per blokk med et manifest), vegnett.yml må lage en ny release, og lastVegnett må hente
   fila for SPILLOMRÅDE. Lastingen ble ikke satt i gang av seg selv de første 25 s på /rogaland (PC, tempo 0) – den kommer når fienden vil
   kjøre (fraksjoner-visning.js), når kartet er zoomet langt ut / regionpanelet er åpent (region-visning.js), eller ved første ordre.

Etter første mobilkontroll (1 feil, i min vakt): leirens navn kom ikke med når mange lag og kjøretøy sto ved leiren (samlelappen tok plassen
– nå plasseres leirens navn før egne lag, `kartlapper.js`), trykket på lappen ble tatt av en annen krok (samletrykket legges nå først i lista når
alle skriptene er lastet), og vegnettets boks ble utvidet av basene langt unna (på et spillkart brukes bare området).

Mobilkontrollen etter rettingen: 130 ok, 0 feil (477 s).

### Filer (runde 13)
- `spill/etikett.js` – samleSted/samle/samleTekst/samling, REGLER.samle. Test: test_etikett.js (+4).
- `spill/kartlapper.js` – samlelappen i 2D og 3D, trykk, KartLapper.SAMLE/hvem.
- `spill/leir2d.js` – leirTak, forstørr, tegneM, REGLER.leirTak/mørkKant/flat, klynge.kort/lang. Test: test_leir2d.js (+4).
- `spill/ressurser-visning.js` – feltene i egen krok først i KROKER.tegn.
- `spill/leirvalg.js` – skogteksten over tregrensen. Test: test_leirvalg.js (+2).
- `kartflis.js` – KOTE_TETT, koteAvstand, koter. Test: test_koter.js (ny).
- Vakt: `pipeline/fliser/vakter/kart.js` del 8 (samlelapp på 1 km uten overlapp og trykk zoomer inn; brakka synlig på 1,3 m per punkt med
  hogstfelt og forstørret; kurvene i bratt li; olje i leirvalget; vegnettets boks; glattet reserve). Selvtest: med samle.min 99, flat.maks 1 og
  KOTE_TETT 0 feiler tre deler. Rekkefølgen hogstfelt/bygg fanges IKKE (fargen gjennom feltet er nesten lik).

### Endret i fellesfiler (runde 13)
- `index.html`: (1) tegnReserve + ny `GLATT`/`flisGlatt` rett over (flistegningen); (2) `LEIRVALG_OLJE`, `velgerLeir()` og en løkke som pakker
  VISES.olje/felt/ror, rett under løkka for bru/tunnel/kraft (etter KAI_VIKTIG). Ingen skript-tagger lagt til.
- `spill/byggevisning.js`: KAMERA-konstantene i ramme() (og i api). test_byggevisning.js oppdatert.
- `spill/spillet-visning.js`: oppdragsmerkene i kartkroken (én blokk).
- `spill/kjoretoy-visning.js`: VEG_TLF.område/boks og meldingene i lastVegnett.

### Ikke gjort / svakheter (runde 13)
- Vegnettet lastes fortsatt som hele landet (se punkt 8).
- Samlelappen i 3D kan ikke trykkes på.
- Bygg nær leiren er litt større enn i virkeligheten fra 0,6 m per punkt – trykk på et bygg treffer fortsatt det ekte fotavtrykket.
- Topplinja viser «OLJE 0 t» i steg 3 (ikke min pakke).


## Runde 14 (21. nov kveld, kritikk I/J)

Laget og prøvd:
- **Samlelappen (I):** «Leiren: 1 lag + deg, 2 kjøretøy · 1 lag ute ›». Tallene regnes av spillet (`KartLapper.telling()`), ikke av navnene som ble
  skjult: egne levende lag innen `KartLapper.SAMLE.r` fra flagget (også det valgte laget), uten karakteren (`s.karakter`) – den står som «deg»;
  kjøretøyene innen samme avstand; egne lag lenger unna = «N lag ute». Navnene som skjules bak lappen er de samme (hvem() spør om avstanden i kartet,
  ikke på skjermen). `Etikett.samle` kjenner typen 'deg', `Etikett.samleTekst({ lag, deg, kjøretøy, ute })`. Uten lag: «Leiren: deg og 2 kjøretøy ›».
  **Valg:** fasiten sa «ca. 300 m», men startlagene (Vaktlaget) settes 380 m fra flagget (oppstart-visning.js) – med 300 m sto Vaktlaget som «1 lag ute».
  Derfor 450 m (Claudes forslag, SAMLE.r).
- **Kainavn (J):** `Kaier.stedsnavn(n)` – et navn som starter med et fartøyprefiks (M/K, M/S, M/F, M/Y, D/S, S/Y, MS, MK, MF, MY, MT, DS, SY, RS, KNM)
  blir stedsnavnet etter siste komma («M/K Ørsdølen II, Odlandstø» → «Odlandstø»); uten komma: ingen navn (typen «Kai»/«Havn» brukes).
  `Kaier.navn` bruker den, så det gjelder leirvalget, kartmerkene og trykkpanelet. (kaier.js er ikke min fil – liten, samlet endring.)
- **Flisskjøter (J):** årsaken var naboruter med reserver fra forskjellige nivåer (én fra nivået rett over, skarp og ikke glattet; én fire nivåer opp,
  svært uskarp) – rette kanter langs flisnettet. Nå (index.html, tegnFliser/tegnReserve/mykFlis): `GLATT.fra = 1` (også nivået rett over glattes),
  og når reservene i bildet kommer fra flere nivåer, legges først et felles underlag fra det groveste nivået D under alle ruter som ikke er ferdige;
  bedre reserver og ferdige fliser legges oppå med myk kant (FLISLAST.kant) mot naboer som er dårligere. `FLISLAST.sist.underlag/nivåer` teller.
  `FLISLAST.felles = false` slår underlaget av (for vakta). GLATT.maks 14 → 24.
  Prøvd: Dovre med reserver fra to nivåer i sjakkmønster – før: rett skjøt gjennom vegen; etter: ingen (natt14/kart2d/skjot-for.png / skjot-ny.png).
- **Vakt** (`vakter/kart.js`, del 9): telling (lag inn/ut, «deg», «lag ute»), kainavnet, og felles underlag når reservene kommer fra to nivåer.
  Feil lagt inn med vilje (`FLISLAST.felles = false`, `Kaier.stedsnavn = n => n`): vakta fant begge. Grønn på PC og mobil (844 × 390).

Ikke gjort / funnet:
- På /rogaland (Sokndal/Jøssingfjord, 2 km-målestokk) er det fortsatt en rett skjøt i lysstyrke de første sekundene: to grove fliser på SAMME nivå
  (z6, begge ferdige) er ulikt lyse (den ene mørkere, som omlandet med OMLAND_LYS), mens de fine flisene (z10) ikke har skjøten. Det er altså de grove
  flisene for én blokk (satellittmosaikken / omlandsblandingen i kartflis.js), ikke glattingen. Ikke rettet i denne runden (bilder natt14/kart2d/dalane3-3000.png
  og dalane2-15000.png).
- Hvor raskt de fine flisene kommer, er ikke endret (på /rogaland via mellomstasjonen tok det 3–15 s her).
