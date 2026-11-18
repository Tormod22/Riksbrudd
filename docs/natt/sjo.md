# Pakke «sjø» (nattarbeid 18. nov) – båter, havner, fiske, landgang, sperring, ferjer

ALLE TALL ER CLAUDES FORSLAG (samlet i `Sjo.REGLER` og `Sjo.TYPER` i `spill/sjo.js`).

## Filer
- `site/dovre-fliser/spill/sjo.js` – regler uten DOM (`window.Sjo` / `require`). Test: `node pipeline/fliser/test_sjo.js`.
- `site/dovre-fliser/spill/sjo-visning.js` – kart, panel, 3D-modeller, lagring (`window.SjoSpill`). Lastes rett før `kameravakt-visning.js`.
- `site/dovre-fliser/spill/kaier.js` – trykk-kroken spør `SjoSpill.trykk(X, Y)` først (båter, mål på sjøen) og `SjoSpill.kai(i)` ved trykk på en kai.
- `site/dovre-fliser/spill/kjoretoy-visning.js` – `kjørTil` avviser mål utenfor spillkartet (`OMRÅDE_OK`), én linje.
- `pipeline/fliser/vakter/sjo.js` – vakten «sjøen» (prøvekaier + prøvekart av sjøen; setter alt tilbake).
- `docs/natt/sjo-hjelp.json` – hjelpetekstene.

## Hva som finnes
- BÅTER (`Sjo.TYPER`): småbåt 400 000 kr (6 m/s, 1 lag, last 3), sjark 2 mill. (4,5 m/s, 1 lag, last 20, fisker best), lekter 6 mill.
  (3 m/s, 3 lag, last 150, trenger middels kai), ferje (kan bare tas: 6,5 m/s, 4 lag, last 250, bare store kaier).
  Kjøp ved en kai innen 3 km fra leiren eller i/innen 1,5 km fra et tettsted du holder (`SjoSpill.kjøp(type, kaiIndeks)`).
- RUTE OVER SJØEN: `Sjo.rute(vindu, x0, y0, x1, y1, { sperringer })` – A* over vannrutene (terrengklasse 3) i et vindu fra
  `lagVindu(b, false, ZV)`; ZV etter avstanden (`Sjo.nivå`: ≤ 15 km 32 m-ruter, ≤ 45 km 64 m, ellers 128 m; lengste seilas 160 km).
  Start og mål flyttes til nærmeste vann (kaiene ligger ofte på land), ruta rettes ut der det er fri sikt over vann, ruter inntil land
  koster mer. Finnes ingen lei: «det går ingen lei over sjøen dit» (båten kjører aldri over land). Gir det grove kartet ingen lei
  eller en lang omveg (> 1,8 × luftlinja) og turen er under 40 km, prøves det én gang til med finere kart.
- LAG OM BORD: `s.påBåt = båten` (eget felt, ikke `s.ombord`, som er kjøretøy). «Om bord i …» i lagpanelet når en båt ligger innen
  250 m, «Gå i land» når båten ligger ved en kai (laget settes på nærmeste land). Laget følger båten, tar ikke ordre, og lagres
  med båten (navnene i `b.lag`).
- HAVNER: holder du (blå) et tettsted med en STOR kai i tettstedet eller innen 1,5 km, samler varer seg på kaia jevnt gjennom uka
  (per uke: 20 tre, 10 betong, 6 stål, 800 l diesel, 60 rasjoner; × 1,5 fra 2000 innbyggere, × 2 fra 10 000; tak fire uker).
  En båt ved kaia kan «Last om bord»; ved en kai innen 3 km fra leiren «Loss til leiren» (Leir.leggInn, dieseltanken, Folk-maten;
  det som ikke får plass, blir om bord). Det ingen har hentet etter 7 døgn, kjøres landevegen: halvparten kommer fram.
  Gullring og «Havn: N på kaia» i kartet, liste i panelet.
- FISKE: «Fisk her» på en båt (småbåt 0,4, sjark 1,5 rasjoner per spilltime; × 1,2 vinter, × 0,8 sommer; ingenting i storm ≥ 14 m/s).
  Innen 3 km fra leiren går fangsten rett i leirens mat, ellers i lasterommet.
- LANDGANG: går laget i land innen 1,5 km fra et tettsted andre holder, er fienden overrasket i 30 spillminutter (laget treffer
  × 1,25, fienden × 0,6 mot det). Om bord: laget er vanskelig å treffe (× 0,3) og skyter dårlig (× 0,4). Alt via `KROKER.ild`.
- SPERRING: «Legg miner her» (1,5 mill. kr, 300 m radius; kan ryddes for 500 000) og «Senk båten her» (vrak, 160 m, for godt).
  Rutene går utenom; er leia helt stengt: «leia er sperret». En båt underveis som møter et nytt minefelt, stopper.
- FIENDENS FORSYNING: havnebyer andre holder innen 60 km fra leiren (høyst 4) får en forsyningsbåt annethvert døgn fra en kai
  6–25 km unna. Kommer den ikke forbi sperringene (eller går den på en mine), er garnisonen AVSKÅRET: fiendens lag i tettstedet
  treffer × 0,75 til en båt kommer igjennom. Båtene vises bare der du ser dem. Skjer ikke av seg selv i testene.
- FERJER: ved en ferjeterminal (kaitype 4, eller stor kai med en ferjekai fra INFRA innen 500 m) kan et lag innen 400 m «Ta ferja»
  – én ferje per kai (`S.ferjerTatt`).
- STYRING: knappen «Sjø» i kommandolinja (PC), «Sjøen» i Leir-menyen (fanen Lager), trykk på en kai (ankermerket) eller en båt.
  Panelet `#sjopanel`: oversikt (båter, havner, fiendens havner, sperringer), kai (kjøp, havn, ferje) og båt (seil til kai / sted på
  sjøen, stopp, lag, last, fiske, miner, senk).
- 3D: enkle modeller per båttype (ett nett per båt, felles materiale, ingen lys) som følger båten.
- LAGRING: `riksbrudd-sjo` per leir (båter med rute og last, lag om bord, sperringer, haugene i havnene, tatte ferjer, fiendens havner).
- /rogaland: kjøretøy tar ikke lenger ordre ut av fylket; båter heller ikke.

## API (window.SjoSpill)
`tilstand()`, `klar()`, `start()`, `lagre()`, `vis(på)`, `velg(båt)`, `kjøp(type, kai)`, `taFerje(kai)`, `seil(båt, x, y, kai, { vindu })`,
`seilTilKai(båt, kai, { vindu })`, `gåOmBord(lag, båt)`, `gåILand(lag)`, `omBord(båt)`, `lastOm(båt)`, `loss(båt)`, `fisk(båt, på)`,
`miner(båt)`, `senk(båt)`, `rydd(id)`, `havner()`, `fiendeHavner()`, `sendFrakt(havn)`, `avskåret()`, `test` (true = ting skjer av seg selv
også i testene, og panelet åpnes ved trykk på en kai).

## IKKE gjort / svakheter
- Kjøretøy kan ikke fraktes på lekter/ferje (bare lag og varer).
- Fiske med folk fra kaia (en egen oppgave i Folk) er ikke laget – bare båter fisker.
- Fiendens AI vet ikke om båtene: den bruker ikke båter selv, og «ser» et lag om bord som et hvilket som helst lag (men treffer det dårlig).
- Forsyningsbåtene kan ikke bordes eller senkes med ild – bare stoppes med miner/vrak.
- Ferjene i rute i 3D (ferje3d.js) er pynt og forsvinner ikke når du «tar ferja».
- I 3D kan du ikke trykke på kaier/båter (panelet virker, men «Seil til en kai» krever 2D-kartet). Lagene om bord tegnes som
  figurer ved båten i 3D. Ingen kjølvann.
- Mørkleggingen utenfor fylkesgrensa finnes fortsatt ikke i 3D (tåkebildet tegnes i index.html; ikke billig å få til utenfra).
- KjorSpill (kjør selv) stoppes ikke ved fylkesgrensa.
- Kaier i innsjøer gir båter som bare kan seile på innsjøen. Det grove sjøkartet (128 m) kan lukke trange sund på lange turer.
- Havneinntekten krever en «stor» kai (Claudes inndeling i kaier.js); tettsteder med bare småkaier gir ingenting.
- Prøvd på /rogaland (Sand/Sauda) med ekte data i 2D; 3D-modellene er bare sett på Dovre-testsiden (på land).
