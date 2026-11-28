# ut8-kr-hus – det kritikeren Jonas Bakke fant om husene (28. nov)

Anmeldelsen: docs/kritikk/2026-11-28-ut-jonas-bakke.md (telefon, leiren ved Ulvik). Prøvd på /norge ved Ulvik (dev.py, leir 59345 6742690,
boligen 2556336 ved 59278 6742421) og på Dovre-testsiden, PC 1400 × 860 og telefon 390 × 844.

## 1. Husvinduet (#plan2d) – [HØY]
`spill/plantegning-visning.js`:
- **×** (`#plan2dlukk`, `data-h="lukk"`) lukker vinduet for huset: `S.lukket = husets nummer`, fokuset slippes. Det kommer tilbake når du
  trykker på huset i plantegningen (første `KROKER.trykk` i fila), trykker «Se inn» (`seInn` → `åpneIgjen`), velger en etasje i huspanelet
  (etasjer-visning.js) eller zoomer ut og inn igjen. Et annet hus på skjermen får vinduet som før. Den gamle «Lukk» (bare med fokus) er erstattet.
- **Bare hus på skjermen**: `påSkjerm(h)` – midten av huset i den delen av kartet du ser (SKJERM: 70 punkter fra toppen, 100 fra bunnen
  (kommandolinja), 150 på telefon (bunnmenyen), og ikke i de ytterste 10 % av bredden) og huset minst `minPunkter × 0,8` stort. Et hus i fokus som er ute av bildet, slippes (`S.fokus = null`).
  Før viste vinduet nærmeste hus i skannet (rx + 30 m rundt kartets midte), også utenfor bildet – derfor «viste huset selv når kartet sto på leiren».
- **Ett overlegg om gangen** (bare for spilleren: `!navigator.webdriver || Plantegning2D.test === true`, som Paneler/Skjermlag):
  panelene i `LUKKER` (Leir, Folk, Samfunn, Krig, Deg, Tropper, Selskap, sekken, funnet, hjelpen …) lukker vinduet når du åpner dem selv
  (ekte trykk/tast siste 1,5 s), ellers skjuler de det. `SKJULER` (angrepsbanneret, morgenmøtet, hendelser og andre kort som venter på svar,
  kontrollrommet, personkortet, Gå-valget) og på telefon lagpanelet (#panel) og #flytgruppe skjuler det så lenge de står oppe. Sjekkes hvert
  250 ms (`andre()`, mellomlagret) og vinduet tegnes på nytt hvert 500 ms når et hus er nær.
- **Kompakt på telefon** (CSS `max-width:700px`): første rad (`.hode`) = navnet, etasjene, «Mer»/«Mindre» og ×; resten bak «Mer» (`S.mer`,
  per hus). Det som alltid vises (klassen `viktig`, `merk()`): raden for en valgt dør/vindu/vegg/rom (har «Avbryt»), og etasjeraden når
  karakteren går, leter eller står i huset med en knapp («Let gjennom loftet», «Gå hit»). Vinduet er høyst 46 % av skjermen (ruller).
- API: `Plantegning2D.test`, `.lukk()`, `.åpneIgjen()`, `.påSkjerm(h)`, `.VINDU`; `S.lukket`, `S.mer`.

## 2. Romnavn og loftet – [LAV]
- Romnavnene settes når de får plass i rommet på skjermen (bredde × 0,9 og høyde ≥ 13 punkter), ned til 10 px skrift, ellers med kortere navn
  (`KORT`: Kjøk., Sov., Vindf., Korr. …). Før krevde de minst 46 punkter (√areal). `S.tegnet[].navn` teller navnene (vakta).
  På telefon ved Ulvik: 8 av 8 rom har navn fra ca. 0,05 m per punkt (målestokk 5 m).
- Loftet (`tegnLoft`): gulvbord (LOFT.bord = 0,6 m) der du kan stå oppreist, mørkere der taket er lavere enn LOFT.lav = 1,5 m (utenfor
  knelinjene, stiplet), mønet i gull (valmtak: kortere møne og grater), sperrer hver 1,2 m når de er store nok, takvinduene (m.tak.vinduer)
  i blått; tingene på loftet (kasser, kiste, skrot, hylle) i tre med navn når de er store nok; «Loft» midt i loftet med «ikke gjennomsøkt /
  gjennomsøkt / noe ligger igjen / N ting» under. Tallene er Claudes forslag.

## 3. Leting i alle etasjer teller – [LAV]
`Etasjer2D.husLett(lett1)` (etasjer-visning.js) = husene i 1. etasje (LeteSpill.lett) + husene i S.lett ('husnr:etasje'), samme hus én gang.
`LeteSpill.antall()` (leting-visning.js, én linje) bruker den, så «Din historie» (eventyr-visning.js tellere().hus), målene (maal-visning.js),
Deg og forsvar-oppgjøret teller leting på loft og i kjeller. Prøvd ved Ulvik: loftet gjennomsøkt → antall 0 → 1.

## 4. «Gå her» starter inne i huset – [MIDDELS]
`spill/gange.js`: `iHus2d(kar)` – står karakteren inne i et hus i 2D (Etasjer2D.S.hus og omrisset), gir den huset og etasjen.
«Gå her, der du står» (`gåHer`) og «Gå» når kameraet ser på karakteren (`v.type === 'her'`) går da via `innHer` → `vedDøra(h, mål)`:
du settes ved døra, interiøret bygges, og `innTilMål` setter deg der karakteren sto (1. etasje: der, eller rett innenfor døra når plassen
er sperret av et møbel). I andre etasjer venter den på Etasjer3d (høyst INN_ETG.vent = 25 s), setter etasjen (`Etasjer3d.sett`) og høyden
(`Interior3d.høyde`). Prøvd ved Ulvik på telefon: karakteren på loftet i 2D → 3D → Gå → «Du er på loftet – der du sto i kartet.»,
Interior3d.inne = huset, Etasjer3d.n = 2 (loftet), ikke i en hindring.
TRESTAMMEN: stammene stoppet deg 0,55 m fra midten uansett størrelse, men bjørka er 0,055 × høyden tykk ved foten (1,1 m for et 20 m tre) –
du kunne gå inn i stammen (grå skjerm). `hindringerG` i **index.html** gir nå hvert tre `r = max(0,55, min(1,6, høyden × 0,058))` og legger
det i alle 20 m-rutene det når; `hindring3d` bruker `o.r || .55`. Gange.start/ledig, Bevegelse og åpenRetning bruker hindring3d, så de
tar det med.

## 5. «Bolig 8 m» / «Låve 9 m» – [LAV]
Klassene er like i 2D og 3D (samme `klasse()` i index.html/hus3d, plantegning.js, bygning.js og spill2d.js; Bolig = t 0, Låve = t 4 – det
kan ikke bli samme hus). «8 m»/«9 m» er avstanden til inngangen. Ved Ulvik står boliger og låver tett (f.eks. 2555962 bolig og 2557121 låve,
31 m mellom), og pila valgte den inngangen som var nærmest akkurat da – den hoppet mellom to bygg. Nå holder pila seg på bygget den viste
til et annet er minst PIL.bytt = 4 m nærmere (`pilHus` i gange.js). (Den eneste mulige forskjellen i klasse mellom 2D og 3D er store bygg
med type 5 i tett bebyggelse, der tettheten telles litt ulikt – ikke bolig/låve.)

## Fellesfiler jeg endret
- `site/dovre-fliser/index.html`: `hindringerG` (trærnes radius r og rutene), `hindring3d` (`o.r || .55`). To linjer.
- `site/dovre-fliser/spill/gange.js`: iHus2d/innHer/innTilMål, vedDøra(h, mål), startValg ('her'), gåHer, pila (pilHus, PIL.bytt), API.
- `site/dovre-fliser/spill/leting-visning.js`: én linje (`antall`).
- `site/dovre-fliser/spill/etasjer-visning.js`: husLett, åpneIgjen i huspanelets etasjeknapper.
- `site/dovre-fliser/spill/plantegning-visning.js`: det meste av pakka.

## Vakt
`pipeline/fliser/vakter/ut8-kr-hus.js` (prøvehus ved leiren): × lukker og holder vinduet lukket, trykk på huset åpner, telefon = én rad og
«Mer» viser resten, Leir-menyen skjuler vinduet (Plantegning2D.test), loftsgulvet er tegnet (fargen) med navn, kartet 600 m unna = intet
vindu og fokus sluppet, loft-leting teller i LeteSpill.antall(), Gange.iHus2d ser karakteren på loftet (og ikke ute), stammene sperrer etter
høyden. Feil med vilje (loftet ikke tegnet; × som ikke holder) ble funnet. Ca. 4–6 s.

## Ikke gjort
- Vinduet flytter seg ikke unna huset på telefon når «Mer» er åpen (det dekker da midten av kartet; det ruller og er høyst 46 %).
- Pila i 3D viser fortsatt bare nærmeste bygg (med treghet), ikke det du ser rett på.
- Ingen leting i 3D på loftet utover den som fantes (Etasjer3d-knappen).
