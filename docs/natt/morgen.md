# Morgenmøtet (pakke «morgen»)

## Runde 8 (20. nov natt, ny kritikk)

Kritiker C (PC, /rogaland): «Jeg følte at spillet spilte seg selv: hogst, frakt, mat og forsvar går av seg selv, og jeg hadde lite å
avgjøre de første døgnene.» (Det verste nr. 13.)

| Punkt i oppdraget | Status |
|---|---|
| 1. Morgenmøtet: kort hver morgen kl. 06 med 2–3 valg ut fra det som står på, virker på ekte tilstand, rapport neste morgen, pausereglene, «Ingen endring i dag» | **Rettet** |
| 2. Én viktig beslutning noen dager (nabogården, tankbilen med oppdrag i kartet, røvernes beskyttelse, handelskaravanen) | **Rettet** |
| 3. Tallene i REGLER, ingenting av seg selv i testene (MorgenSpill.test) | **Rettet** |
| 4. Prøvd som spiller (webdriver av) på PC og telefon gjennom tre–fire spilldøgn, med bilder | **Gjort** |

### Hva som er laget
- `site/dovre-fliser/spill/morgen.js` – reglene uten DOM (`globalThis.Morgen`; test `pipeline/fliser/test_morgen.js`, 40 sjekker):
  - `Morgen.dagensValg(s, rng)` – 2–3 valg ut fra situasjonen `s` (mat i døgn, røvere ventet om timer, kassa, arbeidsføre, moral,
    tre på lageret, en ledig røverpost …), de viktigste først:
    lite mat (< 3 døgn) → «Send to på jakt og fiske» / «Kjøp 20 rasjoner (pris)» / «Halve rasjoner i dag»;
    røvere ventet innen 20 t eller angrep i gang → «Dobbel vakt i natt (folk blir slitne)»;
    kassa under 12 mill. → «Selg N m³ tre» og «Ta et risikabelt oppdrag: røverposten» (et ledig oppdrag fra SpilletSpill) eller
    «Lei ut to som vakter til en nabogård»; minst seks arbeidsføre → «Send to på speidertur mot <tettsted>»;
    minst seks arbeidsføre → også «Våpenøvelse for to (bedre soldater)» (+15 min kamperfaring hver, `p.erf`, som følger dem inn i en tropp);
    moral under 45 → «Fridag for alle»; moral over 62 → «Ekstra skift i dag». Står ingenting på, fylles det med fridag/ekstra skift.
  - `Morgen.erStorDag(dag, sist)` (dag 2, så hver tredje dag) og `Morgen.storBeslutning(s, rng, sist)`: nabo, tankbil, vern, karavane
    (aldri den samme to ganger på rad; tankbilen bare med plass i tankene, beskyttelsen bare etter første bølge, karavanen selger bare den
    dieselen som får plass).
  - `Morgen.utfall(plan, o, rng)` – hvordan det gikk (jakt etter ferdighet i hogst og årstid, leie med fare for såret / borte, speidertur
    som melder neste bølge og finner mat og materialer, tankbilen til fots).
  - `Morgen.velgFolk(personer, n, ferdighet)` – de frie først, så de beste fra oppgavene med flest folk; aldri syke, borte eller den eneste
    på en oppgave.
- `site/dovre-fliser/spill/morgen-visning.js` – kortet `#morgenkort` og virkningene (`window.MorgenSpill`):
  - KROKER.sim: ny dag (samme regel som dagboka: `floor(tid/1440)+1`) → gårsdagens planer kommer hjem (`hjem()`), rapporten (dagbokas
    linje, døgnoppgjøret via `Oppgjor.tekst` på egne øyeblikksbilder, «I går: …») og et nytt kort. Første kort dag 2 kl. 06.
  - Folk som sendes ut får `p.borte = 1e12` og `p.morgen = id` (arbeider ikke; `Folk` viser «borte»; samfunn.js sin klokke rydder dem
    aldri), og kommer hjem neste morgen. Planene lagres, så de er fortsatt ute etter en omlasting.
  - Dobbel vakt: to flyttes til «vakt» (tårnene bemannes, varslingen øker) og tilbake neste morgen; KROKER.ild ×1,2 for egne lag innen
    450 m fra leiren så lenge vakta står; dagen etter «sliten» (tempo ×0,9, moral −8).
  - Dagsvirkninger (fridag, ekstra skift, halve rasjoner, sliten) virker til neste morgen gjennom en innpakning av `SamfunnSpill.valg`
    (tempoFaktor, moralTillegg, matFaktor i `FolkRegler.steg`). Samfunn-fila er IKKE endret – innpakningen skjer når spillet starter
    (`koblValg`, merket `valg.morgen`).
  - Kjøp mat via `FolkRegler.kjøpMat` (markedets hyller og pris), salg via `Leir.selgMateriale` (markedets kjøpere), røverposten via
    `SpilletSpill.ta(id)`, nye folk via `FolkRegler.nyPerson` (ingen seng kreves – moralen faller hvis sengene mangler), beskyttelsen
    flytter `SpilletSpill.T().nesteSpill` +1440 og `nesteEkte` +20 ekte minutter (huskes i `vernTil` og settes igjen etter omlasting).
  - Tankbilen: et sted på land 2,4–3,4 km unna (`lagVindu`), merke i 2D (KROKER.tegn) og 3D (KROKER.tegn3d), brikke i `#varsler`
    (VARSEL_TILLEGG) med «Send <lag>» for det nærmeste laget; et eget lag innen 60 m tømmer den (så langt tankene har plass); ca. hver
    tredje gang settes det ut et røverlag på fire (`e.tankbil`) når et eget lag er innen 450 m – dieselen kan først tas når de er slått;
    borte etter to døgn (røverlaget tas bort da).
  - Kortet går gjennom kortkøen (`Kortkø.ta('morgenkort', true, vis)` – det haster, så det venter ikke to minutter etter forrige kort,
    men aldri oppå et annet kort; viker for seier/tap-kort og forræderen og kommer tilbake etterpå). `Skjermlag.KORT` og `Skjermlag.VENTER`
    får 'morgenkort' når spillet starter (lista utvides i minnet – skjermlag.js er ikke endret): spillet står på pause mens kortet er oppe,
    og kortet er skjult mens leiren angripes. På telefon viker loggen for kortet.
  - Leir → Mål: «Morgenmøtet» med hvem som er ute, dagens virkninger, tankbilen og «Vis dagens morgenmøte» når kortet ikke er besvart.
  - Lagres per leir i `riksbrudd-morgen` ({ leir, d: { dag, planer, effekter, kort, storSist, storId, tankbil, vernTil, oppFør } }).
  - API: `MorgenSpill.morgen(tving, { stor })`, `situasjon()`, `vis()`, `velg(i)`, `velgStor(i)`, `lukk()`, `tilstand()`, `virkning()`,
    `vaktNå()`, `åpen()`, `start()`, `test`.
- `site/dovre-fliser/spill/dagbok.js` (eid av denne pakka): `DagbokSpill.siste()` gir den siste morgenrapporten (vises øverst på kortet).
  Gårsdagens utfall skrives også inn i dagboka (`DagbokSpill.noter`).
- `pipeline/fliser/vakter/morgen.js` – vakta: kortet med matvalgene når maten er lav, «Send to på jakt» (to borte, arbeider ikke),
  nabogården som steg 2 («Ta inn to» = +2 folk, +4 mat), neste morgen hjem med mat og «I går: …» på kortet, fridag virker gjennom
  `SamfunnSpill.valg` og er borte morgenen etter, «Ingen endring i dag» lukker. Setter alt tilbake. ~50–100 ms. Prøvd med en feil lagt inn
  med vilje (jakta satte ikke `borte`): vakta fant den.

### Tallene (Claudes forslag, alle i `Morgen.REGLER`)
Mat lav < 3 døgn; røvere innen 20 t; lite penger < 12 mill. kr; speidertur fra 6 arbeidsføre; lav moral < 45, god > 62; to personer per
utsending; jakt 4–8 rasjoner per person (× hogst-ferdighet, × årstid 0,6–1,2), 10 % skade; kjøp 20 rasjoner; halve rasjoner mat ×0,6 og
moral −12; dobbel vakt +2 vakter, ild ×1,2 innen 450 m, dagen etter tempo ×0,9 og moral −8; selg halvparten av treet (4–20 m³); leie ut
0,8–1,6 mill. kr, 30 % såret, 6 % kommer ikke tilbake; speidertur 1–4 m³ tre, 0–1,2 t stål, 2–7 rasjoner, 8 % skade; våpenøvelse +15 min erfaring, 5 % liten skade; fridag tempo ×0,5
og moral +12; ekstra skift tempo ×1,25 og moral −10; stor beslutning dag 2 og hver 3. dag; nabogården 4 folk og 8 rasjoner (avvist moral −3);
tankbil 2,4–3,4 km, 600–1000 l, frist 2 døgn, 35 % røvere (4 mann), til fots 55 % 250–450 l og 25 % skade; beskyttelse 1,5 mill. + 0,5 mill.
per bølge, +1 døgn / +20 ekte minutter, nekt = moral +3; karavanen 500 l diesel + 30 rasjoner til 70 % av markedsprisen, kjøper 15 m³ tre til
1,3 × salgsprisen.

### Fellesfiler endret
- `site/dovre-fliser/index.html`: to skripttagger rett etter `forsvar-oppgjor.js` (`morgen.js`, `morgen-visning.js`) + versjonsmerker
  (`versjon.py`).
- Ingen andre fellesfiler. Krokene som brukes: KROKER.sim, KROKER.ild, KROKER.tegn, KROKER.tegn3d, LEIR_MENY, VARSEL_TILLEGG. I minnet
  (ikke i filene): `Skjermlag.KORT/VENTER` får 'morgenkort', `SamfunnSpill.valg` pakkes inn.

### Prøvd i nettleser
- Som spiller (webdriver av), PC 1400 × 820 og telefon 390 × 844, dag 1 → dag 5 (scratchpad `natt8/morgen/spill.js`): kortet kom hver
  morgen kl. 06, spillet sto på pause med lappen «Spillet står på pause til du svarer», dobbel vakt satte to på vakt og de gikk tilbake
  neste morgen (dagen etter: slitne), nabogården ga fire nye, karavanen solgte mat (uten diesel når tanken mangler), speiderturen meldte
  neste bølge og kom hjem med funn, jakta ga 16 og 21 rasjoner, «Ingen endring i dag» lukket kortet. Kortet ventet mens bølge 2 pågikk.
  Bølge 1 kom dag 2 mens dobbel vakt sto: «Bølge 1 slått tilbake» sto i neste morgens rapport. 0 sidefeil.
  (For å få matvalgene ble maten satt til 8 rasjoner før dag 4 – det er et oppsett for prøven, ikke spill.)
- `natt8/morgen/prov2.js`: tankbilen kom i kartet og som brikke, røverne kom da laget nærmet seg, dieselen ble hentet når de var slått;
  beskyttelsen flyttet neste bølge et døgn og trakk 2 mill. kr; folk som var ute, var fortsatt ute etter omlasting, og et ubesvart kort
  kom tilbake etter omlasting.
- Bilder: scratchpad `natt8/morgen/pc-2a-kort.png`, `pc-2b-valgt.png` (steg 2: nabogården), `pc-4a-kort.png` (lite mat), `pc-5-leirmeny-maal.png`,
  `pc-6-tankbil-kart.png`, `tlf-2a-kort.png`, `tlf-4a-kort.png` m.fl.

### Ikke gjort / svakheter
- Sannsynligheter og mengder er ikke balansert mot resten av økonomien over mange døgn (bare 4–5 døgn er spilt).
- Jakta/fisket ser ikke på terrenget (vann/skog rundt leiren) – bare årstiden og ferdigheten.
- Tankbilens røverlag får ingen ordre (de står ved bilen), lagres ikke ved omlasting, og bilen har ingen 3D-modell (bare merke og navn).
- Tastene 1–3 velger på PC (ikke mens du går); telefonen har bare knappene.
- Ved 1× (sanntid) kommer kortet bare én gang per ekte døgn – det følger klokka i spillet, ikke ekte minutter.
- Dagbokas linje på kortet er tatt før gårsdagens utfall er lagt inn (maten i linja kan være litt lavere enn etter at jegerne kom hjem).
