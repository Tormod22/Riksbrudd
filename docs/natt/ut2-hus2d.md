# ut2-hus2d – husene fra modellen, plantegning i 2D (fase B1)

28. nov, utbyggingen av docs/plan-selskap-okonomi.md, kapittel 5.2, 5.3, 5.8 og fasetabellen B1 i kapittel 16.
Bygger på ut1-bygning (spill/bygning.js, se docs/natt/ut1-bygning.md).

## Hva spilleren ser
- **Plantegningen i 2D:** zoomer du helt inn (kam.m ≤ 0,5 m per punkt) på hus, tegnes høyst fire hus nær midten av skjermen
  (de som er minst 36 punkter store) fra byggemodellen oppå kartet: gulv, bærende vegger tykke og lyse, skillevegger tynnere,
  dører med blad og stiplet bue, vinduer (tre streker i veggen), porter, trapper (trinn og pil, «opp»/«ned» ved foten), søyler,
  bjelker, og – når huset er minst 110 punkter på skjermen – møbler som enkle former, romnavn og m². Navn som ikke får plass i
  rommet, blir mindre eller tas bort. Mørk stil med kartets farger (--ink, gull fra knappene).
- **«Se inn (plantegning)»** i huspanelet (trykk på et hus i 2D, som før): kartet går inn på huset (huset fyller ca. 60 % av
  skjermen), 3D slås av hvis den var på. Kartet kan da zoomes nærmere enn før: 0,03 m per punkt (ellers 0,1 som før).
- **Etasjevelgeren** #plan2d (øverst midt på PC, nede over kommandolinja på telefon): «Leilighetsbygg · Kjeller 1 2 Loft · Lukk».
  Alle etasjene modellen har, tegnes (bare tegning – gange, leting og interiør i 3D er fortsatt bare 1. etasje). Stengte etasjer
  i høyhus er grå. «Lukk» avslutter «Se inn».
- **Barrikader:** trykk på et vindu eller en dør i plantegningen (når huset er stort nok på skjermen; ellers går trykket til
  huspanelet som før) -> «Vindu i 1. etasje · 1,2 m · Barrikader (0,06 m³ tre)». Karakteren går til huset (Spill2D.gåTil, som
  «Sikre huset»), og plankene tas fra leirens lager. Barrikaderte åpninger tegnes med planker i plantegningen, og «Fjern plankene»
  gir halvparten av treet tilbake. **I 3D** står plankene utenpå vinduet/døra (tre planker på skrå, ett instansnett, bare for hus
  med endringer – 3D blir ikke tregere ellers).
- Huspanelet sier «Barrikadert: 2 av 11 vinduer og ytterdører i 1. etasje» når modellen er lastet og noe er barrikadert.
- «Sikre huset» (OverlevSpill.sikre2d) står **igjen** i huspanelet: det er et annet system (tilflukt, hvile, dekning 8 %) som
  B3 kan koble til barrikadene (f.eks. «sikret» når alle vinduer og dører i 1. etasje er barrikadert).

## Filer
- `site/dovre-fliser/spill/plantegning.js` – regler uten DOM (Node: `require`, nettleser: `window.Plantegning`).
- `site/dovre-fliser/spill/plantegning-visning.js` – visningen (`window.Plantegning2D`).
- `pipeline/fliser/test_plantegning.js` – 168 prøvehus (14 typer × 4 former × 3 tettheter), ca. 8 900 sjekker, ca. 20 s.
- `pipeline/fliser/vakter/ut2-hus2d.js` – vakta.
- `docs/natt/ut2-hus2d-hjelp.json` – hjelpeteksten.

## Fellesfiler endret
- `site/dovre-fliser/index.html`, **tre linjer** (etasjevelgeren skjules i 3D av et eget sekundur, ikke i index.html):
  1. to skript-tagger rett etter bygning.js: `spill/plantegning.js` og `spill/plantegning-visning.js` (+ versjon.py),
  2. `zoom()` (ca. linje 3553): `kam.m = Math.max(0.1, …)` -> `kam.m = Math.max(window.MIN_ZOOM_M || 0.1, …)`.
     plantegning-visning.js definerer `window.MIN_ZOOM_M` (en getter): 0,03 når en plantegning vises, ellers 0,1 – som før.
- **hus3d og interior3d.js er IKKE endret** (se under).

## Samme hus i 2D og 3D
`Plantegning.husTak(P, e, tett, H)` gjør de samme valgene som hus3d (index.html, «hvert bygg én gang») i samme rekkefølge:
rund/enkel (f.rekt > 0,82, ≤ 10 hjørner), fall0 = harFall(t, areal, h, i, tett) med o.e.r fra OSM, takDeler, klasse med t 5-regelen,
Byhus.stil (bygård med valm/mansard: raft = topp − 1,2/0,8), steinkirke/kirke (KIRKE.maksVegg), låve/kirke-valm, mønFor
(Byhus.TAKVINKEL), og den første døra slik dør() legger den (lengste kant midt på; enkelt saltakshus: rektangelets langside ved
0,38, låve 0,5; bredden min(DØR[kl], 0,6 × kanten)). Hjelperne (form, rund, harFall, takDeler) er de globale fra kartflis.js.
Tettheten = bygg innen 100 m (samme senter og regel som naboer/naboerAsynk) fra hus-flisene z13 rundt huset. Svaret går inn i
Bygning.fraKart som `tak` ('saltak' | 'valm' | 'flatt'; mansard regnes som valm), `vegg` (= P.veggTopp − døras z0 i hus3d) og `dør`.
- **Målt på ekte data** (/rogaland via dev.py, Ryfylke 15607 6622779): 40 hus i 2D mot de samme husene i 3D-utsnittet
  (u.hus.omriss: P.veggTopp, P.dør, P.bygg.kl): **40 av 40 like** (tak med fall eller ikke, veggens høyde < 5 cm, døra < 10 cm, klassen).
- test_plantegning.js sjekker at hus3d-linjene som regelen bygger på, fortsatt står i index.html (endres hus3d, feiler testen).
- Modellen lages i husets egen ramme: nullpunkt = avrundet midte av omrisset (`Plantegning.ramme`), så den er lik uansett kart
  eller 3D-utsnitt (Interior.plan er flytt-uavhengig). Id-ene i endringsloggen peker altså på de samme delene hver gang.

### Hvorfor interior3d.js ikke bygger fra Bygning-modellen ennå
1. Interiøret i 3D er allerede Interior.plan med samme info (i, kl, h, dør = P.dør flyttet til nærmeste kant, tett, k, moh), og
   1. etasje i Bygning-modellen er den samme Interior.plan (ut1-notatet) – så rom, dører og vinduer er de samme i 2D og 3D.
2. Bygning.fraKart lager alle etasjene (35–60 ms snitt, opptil 0,4–1,5 s for høyhus) – 3–10 ganger mer enn planen alene, for hus du
   går forbi. Det ville gjort 3D tregere (oppdraget: «Ikke gjør 3D tregere»). B2 bør lage en `fraKartG(P, info, { bare: 1 })` eller
   la interior3d bruke modellen når den alt finnes i hurtiglageret (Plantegning2D.hus(i)).
3. Unntak der 1. etasje IKKE er lik: bygårder med trapperom (kjerne) i Bygning, trapper som tar bort møbler i Bygning, og
   sykehjem/legevakt (Bygning gjør dem til «sykehus», interior3d bruker klassen fra hus3d). Barrikadene vises i 3D med egne
   planker (plantegning-visning.js, KROKER.sett3d), ikke i interiøret.

## Endringsloggen (lagring)
localStorage **«riksbrudd-bygninger»** = `{ v: 1, leir: 'x,y', hus: { [husnr]: [{ e, del, id, gjør, … }] }, kart: { [husnr]: { e: { i, t, h, r, k }, tett, P } } }`.
- Per leir (mønsteret fra karakter.js): leses bare når `leir` stemmer med OppstartSpill sin leir, ellers tom. Lest ved lasting og
  ved hendelsen «riksbrudd-spill». Når pakka «lagring» (LagringStor) kommer, kan nøkkelen flyttes dit uendret.
- `kart` = det kartet vet om huset (omrisset i verdensmeter, egenskapene, tettheten), så modellen kan lages på nytt uten kartflisene
  (3D, senere flerspiller: tjeneren sender bare loggen).
- Modellen som vises = `Bygning.medEndringer(kartmodellen, loggen)` hver gang loggen endres. **B3 trenger bare** å slippe flere
  endringer gjennom `sjekk()` i plantegning-visning.js (i dag bare åpning barrikader/åpne) og legge knappene i velgeren – tegningen
  viser alt modellen har: revne vegger stiplet, ødelagte åpninger stiplet rødt, sperrede åpninger med planker, bjelker stiplet gull,
  søyler som firkanter, ødelagte møbler med rød kant.
- Handlingen går gjennom kommandolaget: `Kommando.registrer('husEndre', { leir: true, meld: true, sjekk, utfør })` (registreres
  første gang den brukes, siden kommando.js lastes etter). `{ type: 'husEndre', hus, e, del: 'åpning', id, gjør: 'barrikader' | 'åpne' }`.

## API (window.Plantegning2D)
`seInn({ Pv, e })`, `prøvehus(Pv, e)` / `fjernPrøve(i)` (husdata uten kartflis – testsiden), `hus(i)`, `modell(i)` (bygges i ett strekk
når den mangler), `nyttHus(Pv, e, tett)`, `endre(k)` (straks, gjennom KOMMANDO), `handling(k)` (karakteren går dit først), `sjekk(k)`,
`logg()`, `lagre()`, `lesInn()`, `planker3d()`, `planker()`, `aktiv()`, `S` (fokus, etasje, valgt, nær, tegnet), `skannNå()`.
Modellene lages én om gangen med Bygning.fraKartG og en pause hver 10. ms, og høyst 24 huskes (de eldste som ikke vises, går ut).

## Tall (Claudes forslag – REGLER i plantegning.js)
zoom 0,5 m/punkt, minst 36 punkter, høyst 4 hus, 24 modeller i minnet, detaljer (møbler/navn) fra 110 punkter, «Se inn» 60 % av
skjermen, nærmeste zoom 0,03 m/punkt, planker 0,04 m³ tre per m² åpning (minst 0,05), «Fjern plankene» gir halvparten tilbake,
trykk på en åpning innen 16 punkter (0,5–1,2 m).

## Prøvd
- Node: `node pipeline/fliser/test_plantegning.js` (0 feil), test_kommando.js og test_spill2d.js er ok.
- Nettleser, Dovre-testsiden (prøvehus, ingen husdata der): PC 1400 × 860 og telefon 390 × 844 – plantegning, etasjene
  Kjeller/1/2/Loft i et leilighetsbygg, trykk på vindu, «Barrikader» (karakteren gikk til huset), barrikaden lagret og vist igjen
  etter ny lasting av siden, 0 sidefeil. Vakta: ok på PC, telefon og med 3D på; selvtest (lesInn som glemmer loggen) ble fanget.
- /rogaland med ekte husdata: plantegningene for fire hus ved siden av hverandre, «Se inn» fra huspanelet, 40 av 40 hus like i 3D;
  tre barrikader -> ny lasting -> 3D: 9 planker 0,15 m utenfor veggen, 1,1–1,8 m over gulvet (målt), og sett på bilde når du
  går (Gå) foran veggen: tre brune planker på skrå over vinduets plass.

## Ikke gjort (senere faser)
- Riving, nye åpninger, bjelker og søyler fra plantegningen (B3 – modellen og tegningen tåler dem alt).
- Gange og leting i andre etasjer, trapper i 3D (B2). Interiøret i 3D fra modellen (se over).
- Planker i interiøret (de står utenpå), hus3d-fasadens vinduer følger ikke modellens vinduer (tekstur hver 3,2 m), så plankene i 3D
  kan sitte der fasaden ikke har vindu.
- «Sikre huset» er ikke erstattet (se over). Barrikadene gir ennå ingen virkning i kamp (kapittel 5.7).
- Byggesettets egne hus og leirens bygg vises ikke som plantegning.
