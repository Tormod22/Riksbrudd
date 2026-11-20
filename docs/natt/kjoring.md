# Kjøring (kjøre feltbilen selv i 3D)

## Runde 10 (20. nov kveld, brukerens bilder)

Brukeren sendte bilder fra iPhone liggende (844 × 390): bilen sto vippet opp på skrå / på siden i en bakke (3, 4), «Gå ut» sto midt i
bildet over bilen, to knapper het «Brems», en lys strek lå over bilen, og bilen så kantete og billig ut. Kameraet (5) var «nesten ok».

### Hva som er gjort
1. **Bilen står på fire hjul** (`spill/kjor.js`, reglene øverst uten DOM):
   - `Kjor.STILLING` (Claudes tall): hjulene ±1,33 m / ±0,86 m, største helling som vises 0,6 rad (ca. 34°) fram/bak og 0,45 rad
     (ca. 26°) til siden, `tanOpp` 0,75 (ca. 37°), `tanSide` 0,6 (ca. 31°), `tanGli` 0,9 (ca. 42°), `gliFart` 1,6 m/s, `krabbe` 3 m/s,
     `glatt` 9/s. (Først strengere – 31° opp og glid fra 37° – men da kom ikke speiderbilen opp lia ved Dombås i kontrollen, som den
     gjorde før; en terrenggående bil klarer ca. 35–40°.)
   - `Kjor.hjulHøyder(x, y, a, høyde)` gir høyden under hvert hjul, `Kjor.stilling(...)` gir `{ stigning, side, z }` med vinklene
     begrenset og z slik at ingen hjul står under bakken (minst ett står på den), `Kjor.zFor(h, st, sd)`.
   - Visningen (ramme3d i kjor.js) glatter vinklene over tid (`k.sSt`, `k.sSd`, `k.sZ`). Før ble nesa og siden regnet fra to punkter
     hver, uten grense.
   - **Årsaken** til bildet 3: vegbanen (`Liv3d.dekke`) ligger ofte over terrengnettet (målt 0,7–1,4 m ved Dombås). Et hjul på asfalten
     og et ved siden av ga 20–45°. Nå: for bilen skrår bakken jevnt ned fra vegkanten (`vegFylling` i `verdenFor`, `VEGSKULDER` = 2,5 m,
     bredere når vegen ligger høyt – aldri brattere enn 1 : 2,5). Bakken er terrengnettet slik det tegnes (`nettHoyde`), ikke `hoyde3d`.
   - **Kjøring i bratt terreng** (`bilSteg`): for bratt rett opp → bilen stopper (og sklir tilbake over `tanGli`); for bratt nedover eller
     på skrå → den kryper (høyst `krabbe`) og sklir sidelengs nedover (`gli`). Den kan altså aldri sitte fast – en første utgave som
     stoppet bilen helt satte den fast i en vegkant (sett i nettleseren).
2. **«Gå ut» nede ved kjøreknappene**: på telefonen er den en rund knapp i raden nede til høyre (`#gangeknapper > .pedal.ut`), og den
   store `#kjorknapp` skjules mens du kjører bil. På PC står «Gå ut (F)» rett over fartsruta nede til høyre (right 296 px, bottom 136 px).
3. **Riktige knapper på telefonen**: «Gå ut», «Brems» (rygger når bilen står) og «Gass» med SVG-ikoner og farget kant (gul, rød, grønn)
   i samme rad som Huk/Hopp (som skjules når `body.kjorbil`). Styrespaken styrer og gir gass som før. Helikopteret har fortsatt Ned/Opp.
4. **Den lyse streken** over bilen var utholdenhetsstreken fra gange.js (du hadde løpt før du satte deg inn). Du hviler nå mens du
   kjører: `kr.utholdenhet = 1` hver ramme, så streken vises ikke. Farten står i ruta nede til høyre (narhud.js) som før.
5. **Penere feltbil** (`bilModellRund` i kjor.js; byggeklossene i `spill/kjoretoy3d.js` → `Kjoretoy3d.form`): `rundBoks` (boks med avrundede
   kanter og myke normaler, valg `smal` = smalere mot taket, `skrå` = fronten heller bakover), `rundHjul` (dekk med runde skuldre, felg og
   nav), `skjerm` (avrundet bue over hjulet), `lykt` (rund lykt med ring). Karosseri, panser, førerhus, skrå frontrute og ruter med mørk
   ramme, skjermer, hjul, runde lykter, grill, støtfangere, reservehjul, speil, kanne og antenne. Ca. 7000 trekanter (én bil). Den gamle
   `bilModell` brukes bare hvis `Kjoretoy3d.form` mangler.
6. **Kameraet**: `KAMERA_BIL = { avst: 9,6, opp: 3,0, foran: 5, siktOpp: 1,3, følg: 7 }` – litt høyere og lenger bak, ser på et punkt
   5 m foran bilen, og glir mykt etter (posisjon og siktepunkt). Pitch ved start −0,12.

### Filer
- `site/dovre-fliser/spill/kjor.js` – regler (STILLING, stilling, hjulHøyder, zFor, gli, bilSteg), vegfylling, visning, pedaler, kamera, modell.
- `site/dovre-fliser/spill/kjoretoy3d.js` – `Kjoretoy3d.form` (rundBoks, rundHjul, skjerm, lykt, farg, FARGE).
- `pipeline/fliser/test_kjor.js` – ti nye prøver (flat, motbakke, sideheng 50°, kant 2 m, ingen hjul under bakken, stopper i 45° bakke,
  krabbefart på skrå, sklir i 39° heng, sitter ikke fast langs et 33° heng og kan rygge ut).
- `pipeline/fliser/vakter/kjoring.js` – vakten (reglene, knappene, og i 3D: feltbilen i leiren innenfor grensene og uten hjul under bakken).
- `docs/natt/kjoring-hjelp.json` – to hjelpetekster («Kjøre feltbilen», «Bratt terreng med bilen»).
- Ingen fellesfiler endret utenom versjonsmerkene i `index.html` (versjon.py).

### Prøvd i nettleseren (scratchpad `natt10/kjoring/`)
- `prov.js` (MOBIL=1: 844 × 390, isMobile, hasTouch, webdriver av; ellers PC 1400 × 820; VEG=1: bilen på en veg ved Dombås).
  Bilder `a-*`, `v*-*`: bilen i en 29° li (vinklene stopper på 21°/22°, hjulene på bakken), kjører med Gass-knappen, rygger med Brems.
  På vegen: før rettingen ble bilen stående på skrå i vegkanten og satt fast; etter: kjører 110 m langs/av vegen og rygger 50 m.
- `modell.js` – bilder av den nye feltbilen forfra, fra siden og bakfra (`m-*.png`).
- `vakt.js` (VAKT=1) – vakten: ok på 0,7 s.
- **/rogaland med ekte data** (ROG=1, dev.py, leir i Ryfylke 15607, 6622779): det verste vegstedet innen 1,5 km (to veger i ulik høyde
  ved en bru/rampe) ga med den gamle regelen 49° sidehelling – akkurat som brukerens bilde 3. Nå 18°/21° (taket). Fant også at vegfyllingen
  må ta med ALLE veger innen 20 m (den nærmeste kan ligge lavere enn en annen rett ved siden av), og at kameraet kunne havne inne i en høy
  vegbane (holdes nå over `V.høyde`). Bilder `r*-mob-*.png`. Et sted i en 38° li (VANLIG=1): bilen står på 21° og kryper.
- **Kontrollen (mobil)** i en kopi (scratchpad `snap-r10kjor`): første gang 126 ok, 1 FEIL – «kjørbare biler og helikopter»: speiderbilen
  kom ikke opp lia ved Dombås (34° og glid fra 37°: den gled 11 m baklengs). Grensene ble gjort slakere (se over); andre gang
  **127 ok, 0 FEIL** (speiderbilen kjørte 19 m, vakten «kjoring» ok på 0,3 s). PC-kontrollen: 126 ok, 1 FEIL – «ui: farten du valgte med kortet oppe,
  gjelder ikke etter svaret (10)» (vakten ui.js, tempo/kort – ikke kjøring; ikke rørt). «kjørbare biler» og «kjoring» ok på PC.
- Kameraet når et hus står bak bilen (HUS=1 på /rogaland): kameraet kommer til 2,5–2,8 m og lavere (før: inne i veggen).
  `husMellom(R, x0, y0, x1, y1)` i kjor.js leser husomrissene i R.hindre (trær teller ikke).

7. **Kolonnekjøretøyene** (`spill/kjoretoy3d.js`): alle hjul er runde dekk med felg og nav (`rundHjul` med 10 kanter), førerhuset på
   lastebil/rakettartilleri/radarbil er avrundet og smalner mot taket, og speiderbilen har avrundet kropp/panser og skjermer over hjulene.
   Trekanter (Node, `scratchpad natt10/kjoring/tell.js`): lastebil 3080 -> 4940, speiderbil 1340 -> 2936, rakettartilleri 3924 -> 5784,
   radar 3120 -> 4980, stridsvogn uendret 2792 (sjekk.js krever 400–6000 per type).

### Ikke gjort
- Stridsvogna og resten av lastebilenes påbygg er fortsatt klosser (bare hjul og førerhus er avrundet).
- Bilen kan ikke kjøre under en bru: `Liv3d.dekke` gir brudekket (det høyeste) – slik var det før også.
- Kameraet bak bilen kan havne inne i trekroner (ingen kollisjon med trær for kameraet).
- Kolonnenes kjøretøy (kjøretøy3d i index.html) følger fortsatt bare stigningen fra to punkter (ikke sidehelling) – ikke rørt.
- Helikopteret er uendret.
