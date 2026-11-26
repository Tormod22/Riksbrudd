# Kritikerløkka runde 1 – pakke «kontrakt» (26. nov)

Rettet etter anmeldelsene til Ingrid Sæther og Jonas Bakke (docs/kritikk/2026-11-26-r1-*.md). Alle tall er Claudes forslag.

## Hva som er laget
1. **Trygg første kontrakt** (spill/selskap.js `førsteKontrakt`, spill/selskap-visning.js `lagerPlass`): nødlageret ligger alltid i
   «låven <retning> for leiren», `REGLER.første.avstand` = 900 m fra leiren (under 35 % av håndradioens 3 km, så en ås aldri bryter
   kontakten), minst `utenfor` = 250 m utenfor alle tettsteder (Garnison.avstand), på land og i spillkartet, i retning bygda som gir
   jobben. Giveren er «Bygdelaget i <nærmeste tettsted>» (giver.by = tettstedets id). Kartet viser en kasse «Nødlageret · 900 m» med en
   stiplet linje fra leiren, og «Lever nødlageret her» ved leiren når troppen bærer det. Ingen bot ved brudd, og et brudd koster bare
   halve ryktetapet (`bruddRykte` 0,5).
   **Bygdevernet** (spill/krig-visning.js `vern`) angriper ikke egne lag i et tettsted når dere har en aktiv kontrakt for bygdelaget
   eller kommunen der (`SelskapSpill.oppdragFor(byId)`); loggen sier det én gang. Krigskartets vurdering (strategi-visning.js `vern`)
   sier da «bygdevernet slipper dere inn (oppdrag for …)». Kommunen/bygdelaget som gir en jobb i et tettsted, er nå stedets egen.
2. **Tittelen** «Hent nødlageret i nødlageret» → «Hent nødlageret nord for leiren» (`Selskap.tittel`); gamle lagrede kontrakter får ny
   tittel ved lesing (`fraJSON`).
3. **Brudd uten ros**: TRÅD-steget «neste» sier etter et brudd hva som skjedde og hva du gjør nå (`Selskap.bruttTekst`); `S.tråd.brutt`
   lagres. Loggen: «Kontrakt brutt (troppen som bar nødlageret, ble slått ut) … Ingen bot for den første jobben», så «3 nye kontrakter står i
   Selskapet …» (nye tilbud straks). Ingen «Ryktet ditt har vokst» og ingen «Første kontrakt er fullført» etter et brudd.
   «har lastet nødlageret» kom 22 ganger (vurder() ble kalt av lappen hvert halve sekund) – nå én gang (k.hentet settes i vurder).
4. **Ruter utenom fiendtlige tettsteder**: ny krok `KROKER.rute` i `ordre()` (index.html). spill/krig.js: `gjennomByer`, `sperrByer`
   (kopi av vinduet med byens ruter sperret), `omvegOk` (`REGLER.rute.omveg` = 2,5 × tida). krig-visning.js `fiendtligeByer` (bygdevern
   som står og ikke er avtalt/gitt opp/på oppdrag, eller motstanderens tettsted) – ruta prøves på nytt utenom; loggen sier «ruta går
   utenom Otta (bygdevern 14 mann) – omvegen tar ca. 0,9 t ekstra», ellers en advarsel. Krig → Send: advarselen sier «Ruta kan gå gjennom
   Otta (bygdevern 14 mann) …» med knappen «Avtale med Otta (… kr) og send» (strategi-visning.js `farer`, rett linje). Bare egne lag,
   og bare når ting skjer av seg selv (ikke i testene – `KrigSpill.test = true` slår det på, som bygdevernet).
5. **Samme vurdering**: `Selskap.kanTa` gir `advarsel` «For svakt: 4 mann mot et forsvar på ca. 5» når det kjente forsvaret (samme tall
   som Krig: `StrategiSpill.kjentForsvar`, uten bygdevernet når jobben er for bygda selv) er minst like stort som det største laget.
   Kortet viser ⚠ i stedet for ✓ (stopper ikke kontrakten, som «Send likevel» i Krig).
6. **Tap trekker ned forslag**: strategi-visning.js husker der egne lag ble slått ut (`meldt.tap` i «riksbrudd-strategi», høyst 12, ett
   døgn); `Strategi.trekk(…, tap)` ganger poengene med `REGLER.tap.faktor` 0,2 innen 3 km og setter stedet etter de andre; linja
   «Speidertropp 1 ble slått ut her for 2 t siden – vurder et sterkere lag» i Neste trekk.
7. **Eskorter**: `lagTilbud` bruker ikke steder et annet selskap holder (`q.eier`, som visningen nå legger på tettstedene fra Garnison); finnes bare
   de, sier kravteksten «Obs: … holdes av et annet selskap – regn med kamp der» (k.fare).
8. **Selskapspanelet**: «Privat militærselskap · lilla» (navnet på flaggets hovedfarge, `SelskapSpill.fargeNavn`). De andre selskapene
   starter med eget rykte (`REGLER.rykte.sider`; gamle lagringer uten leverte kontrakter får det ved start). «dere er holder ord» →
   «dere er til å stole på».
9. **Knappens navn**: send-steget sier «trykk «Kjør dit»» når troppen sitter i en bil (`SelskapSpill.knappFor`).
10. **Økonomien**: grunnbetalingen ×2,5 (eskorte 1,6 mill., hold 2,1, rydd 1,9, hent 1,25; første kontrakt 1,5 mill., før 400 000).
    Én kontrakt på nivå 1 ≈ 1,5–2,5 mill. ≈ ett grunnbygg. Startpengene er ikke endret. test_balanse.js: rammene byggDøgn 2 → 0,8 og
    kontraktDøgn 15 → 20 (med begrunnelse).

## Filer
spill/selskap.js, selskap-visning.js, krig.js, krig-visning.js, strategi.js, strategi-visning.js; index.html (KROKER.rute i ordre(),
3 linjer); tester: test_selskap.js, test_krig.js, test_strategi.js, test_balanse.js (rammer); vakter: vakter/kontrakt-r1.js (ny),
vakter/kontrakter.js (kjøper stål til vakttårnet – den feilet før endringene mine).

## Ikke gjort / delvis
- Kjøretøyruter (Kjør dit, vegnettet) går fortsatt gjennom fiendtlige tettsteder – kroken gjelder bare marsj til fots (ordre()).
- hjelp-natt.js sier fortsatt «400 000 kr» – ny tekst i lokke-r1-kontrakt-hjelp.json.
