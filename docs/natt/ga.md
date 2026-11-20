# Pakke «gå» – gå selv i 3D, husene, været og 3D-varsler

## Runde 6 (19. nov, kritikken)

Grunnlag: `docs/anmeldelse-2026-11-19.md` (PC: 37-3d-gard, 38-ga-start, 40-ga-fram, 82-ga-bakover, 83/84-ga2-*, 30-3d-4, 39-sekken;
telefon: 88/89-gatt-*, 37-3d-40s, 39-ga-50s). Alle tall er Claudes forslag og står i REGLER-objektene.

### 1. «Gå» satte deg alltid ved leiren – RETTET
- Ny regelfil `spill/gaavalg.js` (uten DOM, `test_gaavalg.js`): `Gaavalg.valg(d)` gir `her` (kameraet ser innen 60 m fra karakteren),
  `spør` (60 m–6 km) eller `forLangt` (over 6 km). Reisetid `reiseMin(d)` = d · 1,25 (omveg) / 4 km/t, `tidTekst` («ca. 1 t 20 min»).
- `spill/gange.js`: knappen «Gå» (og G, som trykker på knappen) kaller `startValg()`. Ser kameraet langt fra karakteren, kommer kortet
  `#gaavalg` nederst i midten (ikke over stedet): «Hvor vil du gå? Kameraet ser på et sted 810 m fra deg.» med
  - **Reis hit (ca. 15 min til fots)** – karakteren går i rett linje dit mens spillet spoles med 600× (fartsknappen sp4), kortet viser
    framdriften «6 av 15 min», og framme starter du der. Farten (også pause) settes tilbake som den var. Senker spillet farten underveis
    (flyt.js: fienden i sikte, alarm …), stopper reisen der du er kommet, og du går videre selv. Stedet sjekkes med `ledig()` (ikke i vann/hus).
  - **Gå her, der du står** – som før (ved karakteren). Står karakteren utenfor utsnittet, flyr kameraet dit og du starter når kartet er bygget.
  - **Avbryt** (eller Esc). Enter velger det første valget.
  Midt i bildet står merket «Hit» (der kameraet ser) mens kortet er oppe. Valgt lag: ved laget som før. Uten karakter: der kameraet ser.
- `Gange.start()` starter som før uten å spørre, og i testene (webdriver) gjør knappen «Gå» det samme utenom med `Gange.test = true`
  (sjekk.js trykker på «Gå» i «gå selv» – første kontroll feilet på det). Nytt i API-et: `Gange.startValg, reis, valgÅpen, lukkValg, reiser`.
- Prøvd i nettleser (PC): kortet kom (810 m), «Reis hit» → tid +17,5 min, karakteren og du står på stedet, farten tilbake til 1×.

### 2. Vanskelig å komme inn i hus på telefon – RETTET
- Årsak: døråpningen er 1,1 m og kroppen 0,6 m (radius 0,3 + vegg 0,12): du måtte treffe innen 13 cm fra midten.
- **Døra trekker deg mot midten** (`Gaavalg.dørTrekk`, i `Gange.kamera`): innen 1,6 m fra døråpningen og høyst 0,8 m til siden av den,
  og når du går gjennom (inn når du står ute, ut når du står inne), skyves du sideveis mot midten (7 per sekund). Sjekkes mot `hindring3d`.
- **Knappen «Gå inn» / «Gå ut»** (`#dorknapp`, PC midt nederst over Let/Sikre-knappene (bottom 204 px), telefon til høyre over våpenknappen (bottom 262 px – midt på lå «Sikre huset» der)): ute innen 5 m fra
  en inngang («Inngang»-merket); inne «Gå ut» (PC innen 5 m fra døra, telefon alltid). Trykk = dørhjelpen styrer deg (midt foran døra,
  så 1 m inn – eller motsatt). Styrer du selv, slipper den. Står du fast (tiden i bevegelsen, ikke ekte tid), settes du på punktet bak døra.
- `Gange.dørNå()`, `Gange.dørHjelp()`.
- Prøvd (PC, prøvehus): «Gå inn» kom 2,5 m fra døra, trykket førte deg inn; inne kom «Gå ut».

### 3. Esc med sekken åpen kastet deg ut av førsteperson – RETTET
- `gange.js` har en Esc-lytter i fangstfasen (kjører før de andre): lukker valget over; et kort med valg (hendelse/samfunnskort) som står
  oppe, går tilbake i køen; er noe annet åpent (`ÅPNE`: sekk, lutpanel, karakterark, degmeny, evpanel, hjelp, lagmeny, stridpanel,
  tropppanel, krigpanel, region, sjopanel, verdenpanel, forklaring, folkmeny, krig, kontrollrom – eller `LutSpill.erÅpen()`), gjør den
  ingenting, så panelets egen Esc lukker det. Først når ingenting er åpent: Esc slipper musa / flyr opp som før. `Gange.noeÅpent()`.

### 4. Været i 3D stemte ikke med toppstripa – RETTET (to feil)
- **Feil 1 (den kritikeren så):** værskiftet ble blandet over 45–90 *spillminutter* – ved 1× (sanntid) i opptil halvannen time – mens
  toppstripa straks viste det nye været («Regn») og 3D fortsatt viste nesten klart vær tidlig i overgangen. Nå: `Vaer.tilstand(...).navnNå`
  = «Klart → regn» i første halvdel av overgangen (`S.fraVær` huskes i `skift`, `Vaer.overgang(S, t)` 0–1), og overgangen tar 25–45
  spillminutter. `test_vaer.js` er oppdatert (største endring per minutt < 6,5 %, ny test for statusteksten).
- **Feil 2:** den glattede 3D-kopien av været (`vist` i vaer-visning.js) ble bare oppdatert i 3D-bildene, og høyst 0,1 s per bilde.
  Regnet det mens du var i 2D, viste 3D det gamle været til kopien tok det igjen – med programvare-grafikk (1–2 s per bilde) over et
  minutt. Nå følger kopien reglene direkte når 3D ikke vises, glattingen regnes i ekte tid, og etter en pause på over 3 s kommer
  været straks. Målt før rettingen: 30 min regn i 2D → 3D-kopien sky 0,1 mot reglenes 0,37, og bare 0,3 etter 8 s i 3D.

### 5. Maskinvarevarselet midt i bildet hver gang – RETTET
- `spill/kvalitet.js`: `KVAL.programvareVarsel()` – en liten lapp `#grafikkvarsel` (høyst 290 px, PC oppe til høyre under knappene,
  telefon oppe til venstre under loggen), bare én gang i nettleseren («riksbrudd-grafikkvarsel» settes når den vises), × lukker, borte av
  seg selv etter 25 s. Rådet står også i loggen og i verktøytipset på «Grafikk»-knappen. `visMelding` (midt i bildet) brukes ikke lenger for dette.

### 6. Snikemåleren uten forklaring – RETTET
- `spill/eventyr-visning.js`: en linje under måleren – «fiende 340 m unna», «– han har hørt noe», «– du er oppdaget» – og første gang
  måleren vises (i nettleseren, «riksbrudd-snikforklart») en kort forklaring i meldingen øverst (`si('Snikemåleren', …)`). Hjelpetekst i ga-hjelp.json.

### 7. Hendelseskort midt i førsteperson – RETTET
- `gange.js` kobler seg på `Kortkø` (spill/samfunn-visning.js) etter at alle skriptene er lastet: mens du går (`R3.fot`) eller reiser,
  svarer `Kortkø.ta` false, så kortene venter i køen (de som bruker køen: #hendelse og #samfunnkort). `Kortkø.nå()` slipper gjennom.
  Øverst kommer `#gaakort` «Et kort venter: I leiren · Enter eller trykk her» (telefon: «trykk her»); trykk/Enter = `Gange.visKort()`.
  Et kort som står oppe når du begynner å gå, går tilbake i køen. Når du slutter å gå, kommer kortet (0,7 s etter).
  I testene (webdriver) venter kortene bare når `Gange.test = true` (vakta setter det), så de andre vaktene ser kortene som før.
  Plassering: PC midt øverst (`top: --topp + 78px`), telefon til venstre under «Lag noe» (`top: --topp + 172px`).
- **Til samkjøringen med hud-hjelperen (som setter spillet på pause når kort venter):** kortene venter nå også *fordi du går*. Spør
  `Gange.kortVenter()` / `typeof R3 !== 'undefined' && R3 && R3.fot` hvis pausen ikke skal slå til mens spilleren går (ellers står verden
  stille hver gang et kort kommer mens du går – det kan være greit, men da bør varselet si «spillet står på pause»). `#gaakort` ligger
  `top: calc(var(--topp) + 78px)`, midt på, z-index 12. Vi har ikke snakket sammen – sjekk dette ved flettingen.
- formkort og krigkort (seier/tap) går utenom køen og kommer fortsatt.

### 8. Fjellet tomt / kantete figurer – DELVIS
- **Fjellmark (gjort):** ny fil `spill/fjellmark3d.js` (regler øverst, `test_fjellmark3d.js`): når du går (eller er under 110 m), legges
  småstein, lav/mose, lyngtuer og snøflekker innen 48 m rundt deg der det er fjellmark (over tregrensen, eller grått/brunt i kartet nær den;
  brun hei også lavere), fordelt på nytt per 12 m. Snøflekker 0–420 m under snøgrensen, ikke om vinteren. Aldri i vann/bekk/veg/spor/hus/
  leirbygg. Fire instansnett med hjørnefarger, mengden følger `KVAL.p.gress`, men minst 40 % også på Lav (telefonen med programvare-grafikk
  starter på Lav, og der var bakken helt tom – det var det kritikeren så). Frigjøres når du flyr opp (`Fjellmark.bort()` fra `Gange.stopp`;
  interiørvakta i sjekk.js krever at geometriene ikke øker). `Fjellmark.antall()`.
- Prøvd: ved 1665 moh. på Dovre (tregrensen 1075 m): 520 steiner, 700 lav/mose, 520 lyngtuer, 26 snøflekker rundt deg
  (scratchpad natt6/ga/fjellmark-hoyt-pc.png). Lyngtuene var først to kryssede flak – de så ut som små røde kasser på avstand og er
  nå lave, mørke puter. Ved 1231 moh. står gresset (gress3d) fortsatt høyt og dekker det meste; over ca. 1,35 × tregrensen er det bare fjellmarka.
- **Figurene (ikke gjort):** soldatene er i index.html (soldater3d), folkene i folk3d.js og karakteren i karakter.js – ingen av dem er mine.

### Filer
- Nye: `spill/gaavalg.js`, `spill/fjellmark3d.js`, `pipeline/fliser/test_gaavalg.js`, `pipeline/fliser/test_fjellmark3d.js`,
  `pipeline/fliser/vakter/ga.js`, `docs/natt/ga-hjelp.json`.
- Endret (mine): `spill/gange.js`, `spill/vaer.js`, `spill/vaer-visning.js`, `spill/kvalitet.js`, `spill/eventyr-visning.js`,
  `spill/ytelse.js` (navnet «fjellmark nær deg» i målingen), `pipeline/fliser/test_vaer.js`.
- Fellesfil: `index.html` – bare to skripttagger rett etter lykt.js (`gaavalg.js`, `fjellmark3d.js`) + versjonsmerkene fra versjon.py.

### Vakt og prøver
- `pipeline/fliser/vakter/ga.js`: uten 3D – reglene, statusteksten under et ekte værskifte («Klart → skyet» → «Skyet»), at 3D-kopien
  følger reglene i 2D, maskinvarelappen (liten, ikke midt i bildet, kommer ikke igjen), at Esc-sjekken ser sekken og at kortkøen er koblet
  til. Med 3D også: valget (Esc lukker det), en reise på 90 m (tiden går, farten tilbake), prøvehus med «Gå inn» → inne → «Gå ut», Esc med
  sekken åpen, og et prøvekort som venter mens du går (med `Gange.test`). Dørhjelpen kjøres med faste steg (`Gange.kamera(R, dt)`), så
  vakta tar ca. 7 s i 3D også under last (første utgave ventet på bildene: 8 min). Grønn på PC i 2D og 3D (to kjøringer).
- Prøveskript: scratchpad `natt6/ga/` (kjor.js + e_*.js; LEIR=x,y velger leiren). Bilder: ga-valg-pc/mobil, ga-reiser-pc, ga-framme-pc/mobil,
  dor-knapp-pc/mobil, dor-inne-pc/mobil, esc-sekk-pc, kort-venter-pc, kort-varsel-snik-mobil, fjellmark-hoyt-pc, vaer-3d/vaer-gaar (før).
- Kontrollforsøk for døra: samme gange mot veggen 0,45 m til siden uten trekket → står fast mot veggen; med trekket → inne.

### Kontrollen
- `SJEKK_PROFIL=mobil` og `SJEKK_PROFIL=PC` (PORT 8906, 19. nov ca. 10:30 og 10:50 UTC): 117 ok, 0 FEIL i begge. Første mobilkjøring hadde
  4 feil (sjekk.js trykker på «Gå» og fikk valget; fjellmarka ga +4 geometrier i interiørvakta; vakta prøvde døra etter et nytt utsnitt) –
  rettet. I sjekk.js står karakteren utenfor 3D-utsnittet, så vakta hopper over valget og reisen der (de er prøvd i egne kjøringer).

### Ikke gjort
- Mykere figurer (soldater3d i index.html, folk3d.js, karakter.js og våpenet i hånda i narhud.js er ikke mine).
- Reisen går i rett linje (omvegen er bare regnet inn i tiden); den sjekker ikke fiender underveis utover at spillet senker farten.
- Med programvare-grafikk kan reisen bli noen minutter lengre enn sagt (600× og trege bilder: opptil 2,5 spillminutter per bilde).
- «Gå inn» gjelder byggene som har interiør (de nærmeste innen 30 m når du går), ikke byggesettets egne hus.

## Runde 8 (20. nov natt, ny kritikk)

Grunnlag: scratchpad `kritikk2/pc/anmeldelse.md` (40-ga-gard-start, 53-ga-ved-gard, 35-ga-40s) og `kritikk2/tlf/anmeldelse.md`
(24-gaa-start, 24-snudd, 32-reist). Alle tall er Claudes forslag og står i `Gaavalg.REGLER` (berøring, peker, inn, reise, snu) og
`Byggeplass.REGLER`. Bilder: scratchpad `natt8/ga/` (se lista nederst).

### 1. «Reis hit» hang, og bildet frøs når du snudde deg – RETTET (det meste)
- **Målt først** (Dovre, PC, last 10–20 på fire kjerner): selve reisen tok 13 s (8 bilder på 1–4 s – 3D ble tegnet hvert bilde, og
  `kar.siktSkitten` ga ny siktberegning og nytt tåkebilde hvert bilde). Det tunge kom ETTERPÅ: «Gå» satte `avst = 1000`, så det
  grove utsnittet (S 3828) ble bygget på nytt (S 1700) i bakgrunnen MENS du gikk – og hvert bilde i førsteperson tok sekunder, så
  byggingen kom ett lite stykke fram per bilde. Etter 9 minutter bygget den fortsatt (målingen ble stoppet). Det var kritikerens heng.
- Nå (`gange.js`):
  - **3D tegnes ikke mens du reiser** (`KROKER.bilde3d` svarer true – bildet står, navnene i overlegget går videre). Karakteren
    flyttes hvert bilde, men siktfeltet regnes først når han er framme. I 2D viser kartet både deg og målet og flyttes bare når
    karakteren er på vei ut av bildet (å flytte kartet hvert bilde gjorde hvert bilde tungt: en tur på 5 min tok 12 s).
  - **Farten settes tilbake straks du er framme** (før gikk 600× videre til kortet hadde stått i 1,2 s: en tur på 2 min ble 15).
  - **`klarGå(X, Y, ferdig)`: kartet rundt deg bygges FØR du begynner å gå** når utsnittet ikke passer (samme regel som tegn3d,
    `utsnittS(1000)`): kameraet flyttes dit, 3D tegnes ikke, navnene skjules, og kortet «Henter kartet rundt deg … (trinnet) 12 s»
    med Avbryt står til utsnittet er satt inn. Brukes av «Gå» (her), «Gå her, der du står», «Reis hit» og «Gå inn i huset».
    `Gange.start()` (testene, andre moduler) går som før med en gang.
  - **Rask snuing**: tar bildene over 120 ms (eget snitt i `Gange.kamera`, `rammeSnitt` teller ikke bilder over 240 ms), tegnes 3D
    i halv oppløsning (`R3.målPr = .5`, `R3.snuPr`) mens du snur deg, og full igjen 0,7 s etter. Ikke mens ytelsen måles.
  - Musa på PC: får nettleseren ikke låst musa (eller før låsen kommer), ser du rundt ved å dra med knappen nede.
- **Målt etter** (samme maskin og sted): «Reis hit» 11 min → framme etter 9,8 s, går etter 29 s (før: over 9 min). På /rogaland
  med ekte data som spiller (webdriver av), kritikerens vei: kartet over en gård 500 m unna, 3D, Gå, Reis hit → framme 6 s, går 8 s.
  Snu med musa (ti drag): 0,6–2,1 s per drag på /rogaland (last 11); på Dovre 3–11 s per drag under last 20 (før: 20 drag over
  4,5 min, stoppet). Hvert bilde i førsteperson med programvare-grafikk er fortsatt tregt – det er tegningen selv (ytelse-pakka).

### 2. Rask vei inn i et hus fra 2D-kartet – RETTET
- `visByggVed` (index.html) pakkes inn i gange.js: panelet for et bygg sier «Bygget har en innside – du kan gå inn og lete.» og har
  **«Gå inn i huset (ca. 5 min til fots)»** (`#gaainnknapp`). Runde bygg (tank, fyr) sier at de ikke har innside; uten karakter / om
  bord / over 6 km står det hvorfor. Lappen og knappen ligger i `#handl` (de forsvant ikke da panelet byttet til et kjøretøy – rettet).
- `Gange.gåInn(h)`: reiser til et punkt 5 m utenfor huset (`Gaavalg.utenfor`, spilltid som «Reis hit»; nærmere enn 40 m: ingen reise),
  åpner 3D med kartet midt på huset i målestokken som gir gangens utsnitt (ingen dobbel bygging), finner huset (`P.bygg.i`, ellers
  nærmeste med dør), setter deg 2,4 m foran døra med blikket mot den, og når interiøret er laget, **rett innenfor døra** (med dørhjelpen
  tok de tre metrene over et minutt med programvare-grafikk). Avbrytes reisen underveis, går du ikke inn.
- **Også i «Hvor vil du gå?»**: ser kameraet på et hus (en dør innen 25 m fra midten av bildet), står «Gå inn i huset (ca. 9 min til
  fots)» først i valget. Prøvd på /rogaland: kritikerens vei (kartet over en gård 500 m unna, 3D, Gå) → inne i uthuset 9 s etter trykket.
- Prøvd på /rogaland (ekte data, Ryfylke-leiren): låve 257 m unna – PC inne etter 139 s (før rett-innenfor-døra; bildene tok sekunder),
  telefon (webdriver av, trykk på knappen) inne etter 24 s: reisen 11 s, 3D 9 s, inne 4 s. Bilder inn-panel/-reiser/-inne (pc, mobil).

### 3. Fant ikke «Gå inn» etter «Reis hit» – RETTET
- **Pila mot inngangen**: under siktet står «Inngang 14 m» med en pil som peker dit (opp = rett fram, dreier når du snur deg), og
  «· rundt huset» når døra er på den andre siden. Nærmeste bygg med dør (P.dør fra hus3d, også leirens bygg) innen 70 m, ikke nærmere
  enn 4,5 m (da kommer «Gå inn»), og ikke når døra er rett foran deg og synlig innen 28 m (da står «Inngang»-merket over døra).
  Reglene: `Gaavalg.inngang/pekerMot/pekerTekst`. Ikke i kompasset (kompass.js er ikke min, og har ingen krok for egne merker).
- Hvilke bygg som har innside: panelet sier det (2.). Alle bygg med dør i 3D har innside (interior3d), runde bygg ikke.

### 4. Snu seg med én finger på telefon – RETTET
- Årsak: hele nedre venstre firedel av skjermen var styrespak (`x < 45 % og y > 50 %`). Kritikerens drag fra (150, 450) til (300, 450)
  på 390 × 844 startet altså i spak-sonen og flyttet ham i stedet for å snu ham. Nå er bare et trykk innen 110 punkter fra spaken
  (90, høyden − 120) eller helt nede til venstre (nederste 220 punkter, venstre 42 %) styrespak (`Gaavalg.erSpak`).
- Tilbakemelding: mens du drar for å se, står en ring med piler der fingeren er og kursen («065°») over den.
- Prøvd med CDP-berøring nøyaktig som kritikeren: snudd 43°, kompasset viser 065° (bilde mobil-snur-mobil.png).

### 5. Leiren i 3D: tomt jorde og flat plate – RETTET
- Ny fil `spill/byggeplass3d.js` (regler øverst, `test_byggeplass3d.js` 17 ok; modellene nederst):
  - **Byggeplassen i trinn** som leir2d.js: under 2 %: stikker og snor; grunnmur som støpes (0–20 %, med forskaling); reisverket reises
    (25–45 %: andelen stendere, svill og toppsvill); taket legges fra den ene enden (45–95 %, sperrer først); kledningen nedenfra
    (60–97 %, døra åpen); stillas med to stolperader, rekkverk og plankedekke (8–97 %); plankestabel og pall med sekker (til 90 %).
    For hus-formene i leir2d (`Leir2d.HUS`; saltak for «sal», ellers flatt) – ikke tanken, porten og små kasser (aggregat, batteri).
    Andre bygg reiser seg som før. Modellen lages på nytt
    for hvert 5. prosent (`Byggeplass.nøkkel`, i leir-visning.js sin sekund-løkke). Ca. 240–1700 trekanter.
  - **Den nye leiren**: bål (steinring, ved, flammer som flakker og en glød som er sterkere om natta – MeshBasicMaterial og en
    sprite, ingen nye lys), vedstabel, kasser og oljefat (MODELLER.kasser/fatpall), tre telt (ett når den første brakka eller et
    egenbygd rom er ferdig) og en presenning over kasser – i ringer på 8/12,5/17 m rundt flaggstanga, ikke i bygg, skisser, vann eller
    på vegen, fast per leir (`Byggeplass.leirting`). Telt, kasser og presenning står i `R3.hindre` (du går ikke gjennom dem).
- `leir-visning.js` (3D-delen, min): `byggeplassHus`, `leirting3d`, lagLeir3d bruker byggeplassen, sekund-løkka bytter modell.

### 6. Angrepsbanneret i førsteperson – RETTET
- CSS i gange.js (`html body.gaar #alarm …`): én linje – «Angrep: ett røverlag fra sør» og «Forsvar leiren»; «Vis» er borte, avstanden
  står på PC (kuttes med …), ikke på telefon. Telefon: 255 × 48 px (knappen er 40 px – telefon.js gir alle knapper 40 px), under
  kompasstavla. PC: 38 px. Før: en tredjedel av skjermen.

### Fellesfiler
- `index.html`: én skripttagg rett etter gaavalg.js (`spill/byggeplass3d.js`) + versjonsmerkene fra versjon.py. Ellers ingenting.

### Vakt og prøver
- `pipeline/fliser/vakter/ga.js` (runde 8 i tillegg): erSpak, panelknappen «Gå inn i huset» (finnBygg byttes ut med et prøvehus en
  stund), byggeplassens trinn og leirtingene (regler); i 3D: drag med fingeren midt på skjermen snur deg, banneret er én linje mens du
  går, pila mot et prøvehus bak deg, «Gå inn i huset» → inne (bare når utsnittet ikke må bygges på nytt), byggeplassen i 3D (grunnmur
  på bakken, reiser seg), telt og bål i scenen. Reisen venter på kartet rundt målet. Grønn: PC 2D 0,1 s, PC 3D 16 s, mobil 3D 2,9 s.
- Regeltester: `test_gaavalg.js` (29 ok), `test_byggeplass3d.js` (17 ok).
- Prøveskript: scratchpad `natt8/ga/` – kjor.js (Dovre), kjor_rog.js (/rogaland via dev.py), e_reise.js (måling med profil),
  e_leir.js, e_mobil.js, e_inn.js, e_reis_rog.js, e_vakt.js. Logger: reise-for.log (før), reise-etter*.log.

### Ikke gjort
- Selve tegningen i førsteperson er fortsatt treg med programvare-grafikk (hvert bilde 1–10 s under last). Rask snuing hjelper litt.
- Pila står ikke i kompasset. Reisen går fortsatt i rett linje.
- Byggeplass for byggesettets deler og for ikke-hus (voll, mast …): som før (reiser seg).
