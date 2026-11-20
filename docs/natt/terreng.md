# Pakke «terreng» – leirplass, helling og plassering av bygg (grenen claude/natt18-verden)

## Runde 8 (20. nov natt, ny kritikk)

Kritiker D (telefon, /norge, `scratchpad/kritikk2/tlf/anmeldelse.md`). Alle tall er Claudes forslag og står samlet i
`Helling.REGLER` (spill/helling.js) og `HellingVis.REGLER` (spill/helling-visning.js).

### 1. Bratt leirplass godtas uten varsel (alvor høy) – RETTET
Ved Aurland fikk det første bygget «For bratt her (11 m høydeforskjell under bygget)», og eneste vei ut var nytt spill.
- **Regler uten DOM: `spill/helling.js`** (ny, rett etter leirvalg.js; test `pipeline/fliser/test_helling.js`, 25 sjekker).
  Samme bratt-regel som `Leir.kanBygge`: den er trukket ut av kanBygge som `Leir.bratt(b, høyde)` / `Leir.brattGrense(b)` (samme svar –
  testen sjekker 63 steder, og test_leir.js er grønn).
  - `vurder(b, høyde, tørt)` / `vurderer(type, ret, høyde, tørt)`: FLATT (høydeforskjell under hjørnene ≤ halve grensa), SKRÅTT (opp til
    grensa: bygget får grunnmur), BRATT («For bratt her»), VANN, UKJENT (ingen høyder).
  - `førsteBygg(høyde, tørt, x, y, { flatFørst })`: får brakke, dieseltank, vakttårn og aggregat plass (tørt, ikke for bratt, ikke oppå
    hverandre, 2 m mellom) innen `nær` = 80 m fra flagget? Grådig, største først, nærmest flagget. flatFørst: brakka helst helt flatt.
  - `finnPlass(…, { lovlig, flatFørst })`: nærmeste sted innen `søk` = 2 km der brakka kan stå og alle fire får plass (punktet er der
    brakka står); `lovlig` = ikke i tettsted, i Norge, i spillområdet (`lovligLeir` i oppstart-visning.js). Høyst 600 forsøk.
  - `brattTekst(r)`: «Bratt – ingen flat plass for en brakke her (11 m høydeforskjell under den).» eller «For lite flat plass: …».
- **Leirvalget (oppstart-visning.js)**: etter trykket står «Sjekker om det er flatt nok for de første byggene …» (ingen «Legg leiren her»
  før svaret). Høydene er 8 m-rutene (lagVindu z11) som bratt-sjekken i leiren bruker.
  - Går det ikke: rød linje «✋ Bratt – ingen flat plass …», «Nærmeste flate sted: 140 m vest (405 moh.)», et grønt flagg «Plass her» med
    stiplet strek i kartet, og knappen **«Flytt hit»** (kartet går dit og stedet prøves på nytt). «Legg leiren her» vises ikke, og
    `bekreft()` gjør ingenting (`forslag.ok = false`). Finnes ikke noe innen 2 km: «Fant ikke noe flatt nok sted …».
  - Går det, men flagget står bratt/vått/skrått og brakka kan stå flatt like ved: «Det er bratt der flagget står, men flatt nok 50 m
    nordøst …» med «Flytt hit» (valgfritt) og «Legg leiren her».
  - Faktalinja sier grunnen: «grunnen: flat» / «litt skrå (byggene får grunnmur)».
  - **Vann og tettsted**: «Leiren kan ikke ligge i vann.» + «Nærmeste tørre sted med plass til leiren: 20 m vest» + «Flytt hit»
    (tettsted: «Nærmeste sted utenfor tettstedet …»).
  - Telefon: banneret er tettere, og ligger stedet under banneret, flyttes kartet så flagget står i det frie feltet over (`synligForslag`).
  - Steg 3-teksten og banneret sier at de første byggene trenger flat grunn («Velg et flatt sted, gjerne i en dalbunn»).
  - I testene (navigator.webdriver) skjer flatsjekken og forslagene bare med `OppstartSpill.test = true` – kontrollskriptet bekrefter
    leiren straks som før. `OppstartSpill.forslag()` og `OppstartSpill.flyttHit(f)` er nye.

### 2. Man ser ikke hvor det er flatt – RETTET (2D)
**`spill/helling-visning.js`** (ny, rett etter helling.js; `window.HellingVis`). Mens du plasserer et bygg (Leir → Bygg, ikke gjerde/veg/
maler) og mens du velger leirplass, farges bakken rundt for DET bygget du holder, med retningen det har nå (roterer du, regnes det på
nytt): grønt = flatt, gult = skrått (grunnmur), rødt med skravur = for bratt, blått = vann. Under fargene: svak skyggelegging (lys fra
nordvest) og høydekurver hver 2 m (hver 10. m sterkere; de svake tas bort der det er bratt). En rund flekk med myk kant.
- Tre skalaer etter zoom: under 0,45 m per punkt 150 m rundt (0,5 m bilde, 2 m ruter), ellers 240 m (1 m, 2 m ruter), fra 2 m per punkt
  500 m (2 m, 4 m ruter); vises til 6 m per punkt. Midten: skissen når den står, ellers kartets midte. Regnes på nytt når midten har
  flyttet seg en tredel av radien.
- Tegnekroken ligger først i KROKER.tegn (under byggene, skissen og leirflagget) og er merket `bygg = true` (over sløret i byggevisningen).
- Banneret forklarer fargene («Bakken for brakke: grønt = flatt, gult = skrått (grunnmur), rødt = for bratt.»), eller «Zoom inn for å
  se i kartet hvor det er flatt nok.» Står bygget skrått: «skrå grunn: 5 m grunnmur».
- «For bratt» ved skissen: byggevisning.js skriver alt årsaken ved skissen, og på PC følger skissen musa før du trykker.
  Nytt: står skissen for bratt, gir banneret «Drei 90° (da går det)» når det går med bygget dreid, og «Flytt skissen 12 m nord» til
  nærmeste sted innen 150 m der bygget ikke står for bratt (også 1,25 m til hver side, så rutenettet ikke flytter den tilbake) –
  `HellingVis.forslag(type, ret, x, y)`.
- Trykk på leirflagget mens du plasserer, plasserer bygget (før åpnet det basepanelet «Leiren til …» – sett på telefon). leir-visning.js
  legger en krok først i KROKER.trykk/trykk3d (etter at alle skriptene er lastet) som bare gjelder mens en plassering pågår (og ikke når
  byggesettet er åpent).
- **Uten bygging, helt nær leiren** (under 0,8 m per punkt, kartets midte innen 400 m fra leiren): bare skyggesiden og høydekurvene,
  svakere og uten farger («gjerne svak skyggelegging/høydekurver i leirområdet på nær zoom»). Ingen lyse flekker (de ville lyst om
  natta – hellingsbildet tegnes etter kartlyset). `tilstand().hvor === 'terreng'`.
- I 3D sier banneret «I 2D-kartet ser du hvor det er flatt nok (grønt) og for bratt (rødt).»
- I testene bare med `HellingVis.test = true` (da regnes kartet også mens 3D er på, men det tegnes bare i 2D). API: `tilstand()` (type, ret, midte, antall ruter per nivå, vises), `ved(x, y)`,
  `nivåVed(x, y)`, `oppdater()`, `venter()`, `av(bool)`.

### 3. Pris i loggen – RETTET
«Kjøp materialene og bygg: 5 mill. kr i alt» husker hva materialene faktisk kostet (kassa før/etter), og loggen sier
«Brakke bestilt: 5 mill. kr i alt (arbeid 4 mill. kr + materialer 974 551 kr), 2 t byggetid.» Med materialene på lageret som før
(«Brakke bestilt: 4 mill. kr»). Det samme i byggesettet («Byggesettet: 16 deler bestilt for … i alt (arbeid … + materialer …)»).

### 4. Småting – RETTET
- Navnefeltet i steg 1 får fokus bare med mus/tastatur (`pointer: coarse` / `hover: none` = ingen autofokus).
- Fargeprøvene (flagg og portrett) er 44 × 44 px på telefon og berøringsskjerm (før 34).

### Filer og fellesfiler
- Nye: `spill/helling.js`, `spill/helling-visning.js` (skripttagger rett etter leirvalg.js), `pipeline/fliser/test_helling.js`,
  `pipeline/fliser/vakter/terreng.js`, dette notatet, `docs/natt/terreng-hjelp.json`.
- `spill/leir.js`: `kanBygge` bruker nye `bratt(b, høyde)` / `brattGrense(b)` (eksportert) – samme regel, bare trukket ut.
- `spill/oppstart-visning.js` (leirvalget, CSS for fargeprøver, autofokus), `spill/leir-visning.js` (banneret, loggen, trykk først),
  `spill/byggesett-visning.js` (loggen).
- `index.html`: bare de to skripttaggene.

### Prøvd
- Hele mobilkontrollen (`SJEKK_PROFIL=mobil node pipeline/fliser/sjekk.js`, kopi av treet 01:50 UTC): 122 ok, 0 FEIL (425 s).
- `node pipeline/fliser/test_helling.js`, test_leir.js, test_oppstart.js, test_leirvalg.js, test_byggesett.js: grønne.
- Vakten `pipeline/fliser/vakter/terreng.js` (Dovre-testsiden, PC og telefon): ok på 2–10 s; start-vakta grønn etterpå. Den prøver
  reglene, leirvalget i en bratt li vest for Dombås (stopp, ingen bekreftelse, «Flytt hit» gir et sted der alt får plass), et trykk i
  vann (forslag), hellingskartet i leirvalget og ved plassering (og at det er enig med kanBygge på 6 steder), «Flytt skissen» for en
  bratt skisse, et ferdig hus (brakke 3 × 4) i lia avvises og ved leiren godtas, prisen i loggen = knappen = kassa, og
  fargeprøvene/fokus, og at kurvene vises nær leiren uten bygging. Den slår ikke 3D av eller på og går uten 3D-tegning (`utenTegning` fra sjekk.js) – 3–4 s også med 3D på.
- Som ny spiller (webdriver = false) på /norge med ekte data (dev.py), telefon 390 × 844 og PC 1400 × 820: Aurland (trykk i lia sør
  for Aurlandsvangen og i den bratte lia lenger vest), Lærdalsøyri. Bilder i `scratchpad/natt8/terreng/`.

### IKKE gjort
- Hellingen vises ikke i 3D (der sier skissen og banneret «For bratt» etter trykket som før).
- Byggesettet får ikke hellingskart (delene er 2,4 m og nesten alltid «flate» etter regelen). Men et ferdig hus (hytte, brakke,
  betongbu) sjekkes nå som ett bygg i `byggesett-visning.js` oppdater(): høydeforskjellen under alle delene mot samme grense som
  leirens bygg (Leir.BRATT eller 35 % av diagonalen) – «For bratt for huset (9 m høydeforskjell under det).» Før ble hver del godtatt
  for seg, og huset fikk en mange meter høy sokkel. Rader av gulv/vegger sjekkes fortsatt del for del.
- Retningen: leirvalget regner brakka med retning 0 (den du får uten å rotere). Et sted som bare går med brakka dreid, regnes som bratt.
- Hus fra kartet (forlatte hus) og leirens egne bygg er ikke med i hellingskartet (kanBygge sier fra ved skissen).
