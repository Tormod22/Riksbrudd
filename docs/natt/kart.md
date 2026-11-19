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
