# ut3-riving – rive og åpne husene, del for del (fase B3)

28. nov, utbyggingen av docs/plan-selskap-okonomi.md, kapittel 5.4 (5.7 bare som bakgrunn), figurene «plan» og «ras», B3 i kapittel 16.
Bygger på ut1-bygning (Bygning.endre/vurder/medEndringer, ras) og ut2-hus2d (plantegningen, endringsloggen, kommandoen «husEndre»).
Gren `claude/ut3-riving`.

**Åpent spørsmål 11 (ekte ras eller bare advarsel):** planens forslag – EKTE ras, men byggelaget advarer først.

## Hva spilleren ser og gjør (i plantegningen i 2D)
- **Trykk på en vegg** (når huset er stort nok på skjermen, som for vinduene): veggen lyser gull, og raden i etasjevelgeren #plan2d sier
  «Bærende skillevegg · tre · 6,5 m i 1. etasje» med knappene – hver med hva det gir/koster/tar (på telefon under knappeteksten):
  - «Riv veggen» / «Riv den bærende veggen» (gir materialer etter stoffet, tar tid etter stoffet – fra Bygning.vurder; ⚠ når noe raser),
  - «Sett inn bjelke» (bare bærende vegger uten bjelke; stål fra lageret),
  - «Lag en dør her» (og «Lag et vindu her» i yttervegger) der du trykket – i en bærende vegg «(med bjelke over)», bjelken er med i
    jobben og stålet tas fra lageret. Står det en åpning der, flyttes den nye inntil (høyst 3 m).
- **Trykk i et rom**: «Riv gulvet her» (dekket under rommet, ikke nederste etasje), «Riv taket over» (i øverste etasje som står),
  «Sett inn en søyle her» (bærer dekket over).
- **Trykk på et vindu/en dør**: som før «Barrikader» / «Fjern plankene» (ut2-hus2d), og nytt «Tett (0,1 m³ tre)» (bord på begge sider) /
  «Fjern bordene». Tetting gjør du SELV: karakteren går til huset (Plantegning2D.handling, som barrikader).
- **Ingenting valgt**: «Riv loftet» / «Riv 2. etasje» (øverste etasje som står, når det er flere) og «Riv hele huset» (med en bekreftelse).
  Mens huset rives: «Huset rives: 40 %» og «Stopp rivingen».
- **Advarselen** før noe som raser: «Dette er en bærende vegg. Uten bjelke raser dekket og taket over (ca. 66 m²).» med «Gjør det likevel»,
  «Sett inn bjelke» (= bjelke og riv i én jobb, ingen ras) og «Avbryt». Kommandoen avviser også ras uten `likevel: true`
  («Byggelaget sier fra: …»), så det samme gjelder om noe annet enn panelet sender den.
- **Tegningen** (egen tegnekrok oppå plantegningen): valgt vegg/rom i gull, bestilt arbeid oransje stiplet (vegg, ny åpning, gulv, søyle;
  hele huset med oransje omriss), rast/revet gulv rødt skravert med «rast» / «hull i gulvet», rast tak skravert i øverste etasje.
  Rast og revne vegger er stiplet (det gjorde plantegningen alt).

## Arbeidet (jobber)
- Alt utenom tetting er **husarbeid** for folk på **«riving»** – samme kø, haug og frakt som «Riv hus» i ressurser.js (jobbtavla teller
  dem som riving-plasser; innen 150 m bæres materialene rett i lageret, lenger unna fraktes de til fots eller med lastebil).
  Valg: også bjelker og søyler gjøres av folk på «riving» (ikke «bygg») – de står i husets kø, og byggelagene i leir.js vet ikke om hus i kartet.
- `Ressurser.startDel(R, { hus, endringer, mat, timer, navn })` lager jobben (type 'riving', `j.endringer`). Når arbeidet er gjort, legges
  endringene i `R.husFerdig` og hendelsen er «husFerdig» (ikke «ferdig») – huset rives IKKE. Visningen fører endringene i husets logg
  (KROKER.sim), og regner raset med `HusEndringRegler.prøv` på modellen slik den er da.
- Materialene: Bygning sine (planker, betong, stål; raset gir 30 % skrot – Bygning.REGLER.rasGir). **Glass** kommer med i modellen, men
  leiren har ikke glass ennå (Leir.MATERIALER) – det blir igjen i huset.
- **Ras**: delene raser i modellen (dekke, vegger og møbler på det, tak – Bygning.ras), og loggen sier «Raset! … dekket (ca. 34 m²) og taket
  (ca. 32 m²) falt ned.» Ved minst 2 m² treffer raset i halvparten av tilfellene (fast per jobb) én av dem på «riving»: helsa ned 0,012 per m²
  (minst 0,12, høyst 0,6): «Odd Haugen sto under og ble skadet (helse 40 %).» Karakteren din skades ikke (gjør ikke arbeidet selv).
- **Riv hele huset** (fra plantegningen, og «Riv hus …» i Leir-menyen): ressurser.js som før, men `HusEndring.rivInfo(hus)` gir
  `andel` (det som står igjen; loftet teller halvt) og `etasjer` (ovenfra). Etasjene forsvinner fra modellen etter framdriften
  (`HusEndringRegler.rivSteg`: den nederste står til jobben er ferdig – da er huset borte og ruinen står, som før). Stoppes jobben, står
  resten; en ny riving gir bare `andel` av materialene og tiden.

## 3D
Valg (oppdraget punkt 4): hus3d sin kropp får IKKE ekte hull (det krever at hus3d bygges fra modellen). I stedet, for hus i utsnittet med
endringer i loggen (som plankene i ut2-hus2d): **mørke hull på fasaden** (ett instansnett, MeshBasicMaterial nesten svart, 4 cm utenfor
veggen) der en yttervegg er revet/rast (hele flaten; gavlen den nederste halvdelen) og der en ny dør/et nytt vindu er laget i en yttervegg,
og **steinhauger/rester** på bakken (ett instansnett med farge per haug: grå for mur/betong, brun for tre) under vegger som er revet eller
har rast og midt i rom der gulvet over har rast. Bygges i KROKER.sett3d og på nytt etter hver endring (`HusEndring.hull3d()`).
Revne etasjer og rast tak synes IKKE på kroppen i 3D (huset står i full høyde) – bare haugene. Ikke prøvd mot interiøret (interior3d.js lager
fortsatt rommene fra Interior.plan, så innervegger som er revet, står inne i 3D).

## Lagring
- Endringene: endringsloggen `riksbrudd-bygninger` (ut2-hus2d, localStorage, per leir) – bare endringene + det kartet vet om huset
  (`kart`: omriss, egenskaper, tetthet), så modellen lages igjen etter ny lasting uten kartflisene (`HusEndring.husFor`).
- Bestilt arbeid: i `riksbrudd-ressurser` (jobbene med `endringer`, og `husFerdig` til de er ført).
- **Ikke flyttet til LagringStor**: en endring er ca. 60 tegn, et hus med 20 endringer og omrisset ca. 2 kB – 100 endrede hus ≈ 200 kB, ca. 4 %
  av localStorage. Loggen leses synkront av plantegning-visning.js ved lasting; å flytte den krever en omgjøring (`l.senere`) og lesing ved
  `riksbrudd-spill` – gjør det når hus kan tas over (B7) eller flerspiller kommer.

## Filer
- NY `site/dovre-fliser/spill/husendring.js` – regler uten DOM (`window.HusEndringRegler`, Node: `require`): handlinger, prøv, rasAreal/rasTekst,
  stål, tettTre, veggVed/romVed/takFelt, etasjerOvenfra/andelIgjen/rivSteg, skade, matTekst/tidTekst/jobbNavn.
- NY `site/dovre-fliser/spill/husendring-visning.js` – `window.HusEndring` (eier, sjekk, utfør, beskriv, rad, knapper, rivInfo, husFor,
  handlingFor, trykkKnapp, send, velg, hull3d, sjekk3d, S).
- NY `pipeline/fliser/test_husendring.js` (30 sjekker, < 1 s), NY `pipeline/fliser/vakter/ut3-riving.js`, NY `docs/natt/ut3-riving-hjelp.json`.
- `site/dovre-fliser/spill/ressurser.js` (eier): `startDel`, `husFerdig` (ny, fraJSON), «husFerdig»-hendelsen i `steg`, `startRiving` med
  `hus.andel` og `hus.etasjer`, og «Huset rives allerede» bare for en hel riving som ikke er stoppet.

## Fellesfiler endret (små, samlet)
- `site/dovre-fliser/spill/plantegning-visning.js` (B2 «etasjer» endrer samme fil):
  1. `visVelger`: «Fjern plankene» bare for planker (`o.sperre === 'planker'`), `HusEndring.knapper(h, n, o)` før «Avbryt» i raden for en
     åpning, og `HusEndring.rad(h, n, et)` i stedet for hjelpelinja når ingen åpning er valgt (hjelpelinja er reserven).
  2. `sjekk(k)` og `utfør(k)`: første linje sender videre til HusEndring når `k.he` er satt (`HusEndring.eier(k)`).
  3. `registrer`: `beskriv` spør HusEndring først.
  4. API: `oppdater` lagt til i `window.Plantegning2D`.
- `site/dovre-fliser/spill/ressurser-visning.js`: `jobbLinje` («Husarbeid: riv veggen (bolig)»), sjekken «Huset rives allerede» i `prøv`,
  `start()` sender huset gjennom `HusEndring.rivInfo`, og trykk på et hus med husarbeid åpner ikke ressurspanelet (det hører til plantegningen).
- `site/dovre-fliser/index.html`: to skript-tagger rett etter `plantegning-visning.js` (`husendring.js`, `husendring-visning.js`) +
  versjonsmerkene fra `versjon.py`.

## Tall (Claudes forslag – REGLER i husendring.js)
Bjelke 0,06 t stål per m (minst 0,12 t), søyle 0,08 t, bjelke over ny åpning 0,05 t per m (åpningen + 2 × 0,3 m); tetting 0,07 m³ tre per m²
(minst 0,1); nye åpninger dør 0,9 m, vindu 1,2 m, port 2,4 m; skade ved ras se over. Riving, tid og skrot: Bygning.REGLER (ut1-bygning).

## Prøvd
- Node: `node pipeline/fliser/test_husendring.js` (0 feil), test_ressurser, test_bygning (RASK=1), test_plantegning, test_kommando.
- Nettleser, Dovre-testsiden med prøvehus 12 × 8 m (PC 1400 × 860 og telefon 390 × 844, bilder sett): trykk på vegg → raden; riv lett
  vegg → jobb → revet, 0,41 m³ planker i lageret; bærende halvdel uten ras; andre halvdel → advarselen → «Gjør det likevel» → ras i
  2. etasje (skravert), loggen «Raset! …» og en skadet arbeider; ny dør med bjelke i bærende vegg (stål trukket); «Tett» på et vindu;
  «Riv hele huset» → loftet forsvant ved ⅓ → «Stopp rivingen» → resten står; ny lasting av siden: døra, tettingen og det revne loftet er der,
  `rivInfo` gir andel 0,8. 0 sidefeil.
- 3D på testsiden (ingen husdata – et prøveomriss lagt inn i utsnittet): hull og hauger lages (1 hull, 18 hauger), 0 sidefeil.
- 3D med ekte husdata (/rogaland via dev.py, Ryfylke): se rapporten (ekte3d-*.png i scratchpad natt/ut3-riving).
- Vakta `ut3-riving`: ok på PC (1,6 s), telefon (1,8 s) og med 3D på (10 s); alt tilbake som før (lager, kasse, logg, jobber).
  Selvtest: med en feil lagt inn med vilje (føre() hoppet over den første endringen) feilet vakta på «den lette veggen er ikke revet» m.fl.

## Ikke gjort
- Ekte hull i hus3d-kroppen og lavere hus når etasjer er revet (3D viser hull-flater og hauger). Interiøret i 3D følger ikke endringene.
- Glass som materiale i leiren. Bjelker/søyler i byggelagenes kø (de er husarbeid for folk på «riving»).
- «Sikre huset» er ikke erstattet av barrikadene; barrikader og revne vegger gir ingen virkning i kamp ennå (B6).
- Karakteren skades ikke av ras; folk står ikke som figurer ved huset mens de river.
- Revne vegger åpner ikke nye veier for gange i 3D (interiørets vegger og husets kropp står).
