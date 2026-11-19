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

### Ikke gjort
- Mykere figurer (soldater3d i index.html, folk3d.js, karakter.js og våpenet i hånda i narhud.js er ikke mine).
- Reisen går i rett linje (omvegen er bare regnet inn i tiden); den sjekker ikke fiender underveis utover at spillet senker farten.
- Med programvare-grafikk kan reisen bli noen minutter lengre enn sagt (600× og trege bilder: opptil 2,5 spillminutter per bilde).
- «Gå inn» gjelder byggene som har interiør (de nærmeste innen 30 m når du går), ikke byggesettets egne hus.
