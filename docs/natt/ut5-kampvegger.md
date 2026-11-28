# ut5-kampvegger – kamp med vegger (B6) og ta over hus (B7)

28. nov, utbyggingen av docs/plan-selskap-okonomi.md, kapittel 5.7 og 5.4 («Ta over et hus»), fasetabellen B6/B7 i kapittel 16.
Gren `claude/ut5-kampvegger`. Bygger på ut1-bygning (modellen), ut2-hus2d (plantegningen, endringsloggen), ut3-riving (husendring) og
ut3-etasjer (etasjene).

## Hva spilleren ser og gjør
- **Vern per vegg (B6):** et lag (eller karakterlaget) som står stille inne i et hus, får vern etter veggene MELLOM seg og skytteren, ikke en
  fast faktor. Lagpanelet viser «Bolig, 2. etasje – i huset: veggene tar 60 %» (prosenten de siste 30 spillminuttene med ild).
  Loggen: «1. lag har tatt stilling i huset (bolig).»
- **Etasjer:** står laget i et hus med flere etasjer, har lagpanelet knappene «1. etg.», «2. etg.», «Loft», «Kjeller» (kommandoen `husEtasje`).
  Fra 2. etasje og høyere ser laget lenger (KROKER.sikt ×1,2 per etasje over 1., høyst ×1,8, og øynene i siktfeltet løftes med etasjens høyde),
  og høyden teller i ildkampen som i terrenget (Strid.høydeRett av terrengforskjellen + etasjehøyden, bare det etasjene legger til).
  Kjelleren: veggene og jorda tar 90 %, men sikten er ×0,25.
- **Hull og skader:** vedvarende ild knuser vinduet i skuddlinja og skader den ytterste treveggen (hel → skadet → ødelagt; en ødelagt bærende
  vegg bærer ikke, så det over kan rase). Granatene i lagkampen (når de kastes mot et lag i et hus) og eksplosjonene i 3D (din egen granat)
  river en lett trevegg, slår hull i en bærende trevegg og skader mur/betong. Ingeniørlag (s.ingeniør) som står inntil et hus (12 m) får
  «Spreng hull i huset» i lagpanelet (kommandoen `husSpreng`): lett vegg rives, bærende vegg får et hull 1,6 × 1,8 m, og når knust/hull er
  over 45 % av veggens lengde, rives den (ras etter Bygning.ras). Loggen: «Bolig: et vindu er knust av skuddene.» / «… – deler av huset raste sammen.»
- **Inngang:** fiender innen 60 m fra et hus der et lag står, stormer det: «Ravnsunds patrulje stormer huset der 1. lag står – mot døra;
  barrikadene holder dem ute ca. 9 min.» Etter forsinkelsen: «Fienden er inne i huset der 1. lag står – veggene verner ikke lenger.» – da gir
  veggene ikke vern mot dem (×1,2 på deres treff, nærkamp). Fiendens lag som står stille, får en marsjordre til 3 m utenfor inngangen
  (`ordre(a, X, Y, true)`; AI-ens egne ordre avbrytes ikke mens laget går). Forsinkelse: åpen vei inn (dør, port, hull, knust vindu, revet vegg) 1 min; bare
  vinduer uten planker 3 min; alt barrikadert 6 min + 1 min per sperret åpning (høyst 30).
- **Plantegningen:** når et lag står i huset, huset er vårt, eller «Vis vern» er trykket: veggene farges etter vernet (grønn sterk ≥ 60 %:
  mur, betong; oransje middels: tre; rød svak: blikk, glass), skadde vegger stiplet, knuste åpninger og hull med rødt kryss. Raden sier
  «inngang: 1 åpen» / «alt sperret – holder fienden ute ca. 10 min».
- **Ta over huset (B7):** huspanelet (trykk på et hus i 2D) har «Ta over huset» for hus innen 3 km fra leiren – det åpner plantegningen, der
  raden «Ta over huset som: Utpost · Lager · Verksted · Kaserne» står (kommandoen `husOvertak`). Etterpå: «Vårt: Kaserne · 22 senger · 57,6 m³ lager»,
  bytt bruk eller «Gi opp huset». Kartet: huset fylt i leirens farge (sidefarge blå) med omriss, og «Vårt · Kaserne» når du er nær (kam.m < 3).
  - Senger: møblene i modellen (seng 1, sykeseng 1, dobbeltseng 2, køyeseng 2) i etasjer som står; som kaserne også madrasser, 1 per 8 m² i
    rom uten senger (ikke bad, kjøkken, gang, trapperom). Høyst 40 per hus.
  - Lager: rom med rolle lager/bod/garasje/kjeller/tilflukt/fyrrom/loft/låve/uthus (og kjelleren, unntatt kaserne) × 0,6 m³ per m² (som
  byggesettets lagerrom); brukt som lager teller alle rom. Høyst 300 m³ per hus.
  - Sengene og lageret går inn i `Leir.plasser` (byggesettets flagg `.byggesett` beholdes, så Folk ikke teller to ganger) og
  `Leir.lagerplass.ekstra` (lenket etter byggesettets). De regnes på nytt når husets endringer endres (riving, ras). Et revet hus (HUS_BORT) faller bort.
  - Bygge om innvendig: endringene i husendring (riv vegger, nye dører, barrikader) virker som før på huset; ingenting eget for overtatte hus.
  - Utpost og verksted er foreløpig bare navn (sengene og lagerrommene teller som for de andre) – se «Ikke gjort».

## Filer
- NY `site/dovre-fliser/spill/husvern.js` – regler uten DOM (`window.HusVern`, Node: `require`): vern, vernSnitt, punkterRundt, gjennom, kryss,
  åpningStopp, veggStopp, slit, smell, nærVegg, inngang, veiInn, etasje, etasjeHøyde, sikt, etasjer, vernTekst.
- NY `site/dovre-fliser/spill/overtak.js` – regler uten DOM (`window.Overtak`): BRUK, senger, lager, kanTaOver, sum, nyLogg, lesLogg.
- NY `site/dovre-fliser/spill/husvern-visning.js` – `window.HusvernSpill` (test, S, aktiv, husVed, slåOpp, settHus, vernFor, smellVed, plasser,
  inntakSteg, taOver, kjør, registrer, sum, overtatt, lesInn, lagre, NØKKEL, modellAv, egne, rad, klikk, føre, tegn).
- NY `pipeline/fliser/test_husvern.js` (33 sjekker, < 1 s), NY `pipeline/fliser/vakter/ut5-kampvegger.js`, NY `docs/natt/ut5-kampvegger-hjelp.json`.

## Slik virker det (teknisk)
- **Hvilket hus:** hvert sekund (setInterval) for hvert levende lag som står stille (ingen `s.sti`, ikke om bord): husene plantegningen har i
  minnet (`Plantegning2D.HUS`), husene i endringsloggen (`logg().kart`), leirens egne bygg (`Bygning.fraByggesett(Byggesett.deler(), opphav())`,
  i kartets meter, regnes på nytt når delene endres). Ellers slås punktet opp én gang med `finnBygg` (hus-flisene z13), og huset lages med
  `Plantegning2D.nyttHus` med samme tetthet som plantegningen regner (bygg innen 100 m), så id-ene i endringsloggen er de samme. Runde bygg
  (tank, fyr) hoppes over. Oppslaget gjøres bare for egne lag og fiender innen 5 km fra leiren. Laget får `s.hus = { k, i, n, navn }`,
  `s.husEtasje` (valgt etasje), `s.øyneEkstra` (meter over 1. etasje – index.html løfter øynene i siktfeltet med det) og `s.husVern` (siste vern).
- **Vernet** (KROKER.ild, bare når huset har en modell): skuddlinja fra fem punkter i huset (midten og ±2,5 m) til skytteren krysser veggene i
  laget sin etasje; hver vegg tar `stopp` (åpningen der linja krysser – vindu, dør, port, hull – tar sitt eget, planker og tetting legges til),
  sammen 1 − Π(1 − stopp), høyst 85 %. Laget tar dekning: 60 % fra den beste plassen + 40 % snittet. Står skytteren i samme hus: ingen vern.
- **Granatene i lagkampen:** KROKER.ild husker skytterens `granater` før salven; en egen KROKER.salve-krok (lagt inn ved DOMContentLoaded, så den
  kommer ETTER bakkekamp-visning.js sin) ser om noen ble kastet mot et lag i et hus, og smeller ved punktet der skuddlinja går inn i huset.
  **3D-eksplosjoner:** `Effekter3d.eksplosjon` pakkes inn (ved DOMContentLoaded): r ≥ 6 = sprengstoff, ellers granat; huset innen radiusen rammes.
- **Endringene** går gjennom `Bygning.vurder` (bare de modellen godtar) og `HusEndring.føre` (endringsloggen «riksbrudd-bygninger», 3D-hullene).
  Kartet vet om huset (`PT.husKart`) også for overtatte hus, så de finnes etter ny lasting uten kartflisene.
- **Kommandoer** (kommandolaget, registreres første gang de brukes): `husEtasje { lag, n }` (lag), `husSpreng { lag, hus }` (lag, bare ingeniørlag
  innen 12 m), `husOvertak { hus, bruk | slipp }` (leir).
- **I testene** (navigator.webdriver) skjer ingenting av seg selv: lagene plasseres ikke i hus, kroken gir 1 – `HusvernSpill.test = true` slår det
  på (vakta gjør det og setter det tilbake). Utenfor testene og uten husdata (Dovre-testsiden) er alt som før, fordi ingen lag står i et kjent hus.

## Lagring
- `riksbrudd-overtak` = `{ v: 1, leir: 'x,y', hus: { [husnr]: { bruk, tid, navn, c, senger, lager, n } } }` per leir (leses bare når leiren stemmer;
  lest ved lasting og ved «riksbrudd-spill»). n = antall endringer i modellen da sengene ble regnet.
- Skader, hull og sprengning: i endringsloggen `riksbrudd-bygninger` som før (ut2/ut3). Slitasjen (hvor nær en vegg er å bli skadet), inntakene
  og hvilket hus et lag står i lagres ikke (regnes på nytt).

## Fellesfiler endret (små, samlet)
- `site/dovre-fliser/index.html`: (1) tre skript-tagger rett etter `husendring-visning.js`: `husvern.js`, `overtak.js`, `husvern-visning.js`
  (+ versjon.py); (2) i `oppdaterSikt` ett ledd: `Terreng.siktfelt(v, X, Y, r)` → `Terreng.siktfelt(v, X, Y, r, 2 + (s.øyneEkstra || 0))`
  (uten hus er `øyneEkstra` udefinert = 2 som før).
- `site/dovre-fliser/spill/bygning.js` (ut1 sin): i `endre()` – vegg `gjør: 'skad'` (hel → skadet → ødelagt, deretter ras som før); åpning `ny` med
  `type: 'hull'` (ingen bjelke, ingen materialer, tilstand ødelagt, `ny: true` så hull3d tegner den; t flyttes innenfor veggen, avvises der en
  åpning står); `GJORT.skad = 'skadet'`. Ingenting annet endret; test_bygning (RASK=1), test_husendring og test_plantegning er ok.
- `site/dovre-fliser/spill/husendring-visning.js`: `føre` lagt til i `window.HusEndring`.
- terreng.js og strid.js er IKKE endret (alt går gjennom KROKER.ild / KROKER.sikt / KROKER.salve). overlev.js er ikke endret.
- `Leir.plasser` og `Leir.lagerplass.ekstra` pakkes inn fra husvern-visning.js (samme mønster som byggesett.js).

## «Sikre huset» (overlev.js) – ikke erstattet
«Sikre huset» er karakterens tilflukt (3 m³ tre, «Hvil her», dekning 8 % når du går selv i 3D) og brukes av etasjer-visning (kjeller som
tilflukt), lagring og hjelpen. Å bytte det ut nå ville endre hvile/helse for karakteren og flere andres vakter. Barrikadene virker nå i kampen
for lagene (inngang og vern), og planen (5.4) kan fullføres senere ved at «sikret» = alle ytterdører og vinduer i 1. etasje barrikadert
(`HusVern.inngang(m).åpne === 0 && .svake === 0`) – da kan knappen tas bort.

## Tall (Claudes forslag – REGLER i husvern.js og overtak.js)
Vern per vegg: tre 0,3, mur 0,7, betong 0,8, blikk 0,15, stål 0,5, glass 0,05; vindu 0,05, dør 0,2, port 0,25, hull 0, planker +0,3, tettet +0,5;
skadet vegg ×0,5; høyst 0,85; dekning 60 % fra den beste plassen; kjeller 0,9. Slitasje 0,012 per skytter per kamprunde (12 mann: skadet etter ca. 7
runder = 35 spillminutter, ødelagt etter ca. 70 min), vindu knust ved 0,25, bare tre og blikk, høyst 700 m. Granat 3,5 m (hull 0,9 m), sprengstoff
6 m (hull 1,6 × 1,8 m, rives ved 45 % av lengden). Inntak: 60 m; 1 / 3 / 6 + 1 per sperret (høyst 30) min; inne ×1,2. Sikt ×1,2 per etasje (høyst ×1,8),
kjeller ×0,25. Overtak: 3 km; senger se over; kaserne 1 per 8 m²; lager 0,6 m³/m²; høyst 40 senger og 300 m³ per hus. Sprengning: 12 m fra huset.

## Prøvd
- Node: `node pipeline/fliser/test_husvern.js` (0 feil), test_husendring, test_plantegning, test_bygning (RASK=1), test_kommando.
- Nettleser, Dovre-testsiden (prøvehus, ingen husdata der), PC 1400 × 860 og telefon 390 × 844: vakta ok (ca. 1 s). Målt i vakta: faktoren fra
  alle ild-krokene ute 1,33, bak trevegg 0,70 (47 % vern), bak murvegg 0,57 (57 %); sikt 2. etasje ×1,2 og øyne +2,82 m; inntak 1 → 9 min etter
  planker på tre åpninger; kaserne + lager ga 36 senger og 415 m³. Bilder sett (scratchpad natt/ut5-kampvegger/plan-pc.png, plan-mobil.png,
  kart-pc.png): oransje trevegger, rødt kryss der sprengstoffet knuste et vindu, raden med «Vårt: Kaserne», lagpanelets etasjeknapper.
- Vaktene ut2-hus2d, ut3-riving, ut3-etasjer og ut4-byggesett3 er fortsatt ok på PC. 0 sidefeil.
- Selvtest: med mur 0,1 og uten forsinkelse for planker feilet vakta på begge («treffene: mur skal gi færre …», «barrikadene forsinker ikke …»).
- IKKE prøvd med ekte husdata (/rogaland) – oppslaget med finnBygg og tettheten er skrevet som i plantegning-visning.js, men ikke kjørt mot
  ekte hus-fliser. Granaten din i 3D og ingeniørenes sprengning er bare prøvd gjennom `smellVed` (samme vei), ikke ved å kaste en granat.

## Ikke gjort
- Fiendens AI søker ikke selv inn i hus eller velger etasje; den stormer bare når den er innen 60 m av et hus der et lag står (og går da mot
  inngangen). Etasjevalget (`s.husEtasje`) lagres ikke med laget (lagring.js) – laget står i 1. etasje etter ny lasting.
- Kjøretøy som skyter på et lag i et hus (enheter-visning) gir ingen vern: kroken gjelder bare lag med mannskap på begge sider.
- Utpost og verksted har ingen egen virkning ennå (bare navnet, sengene og lagerrommene). Byggesettet kan ikke legge deler INNE i et kartets hus
  (ombygging = husendring sine endringer). Overtatte hus vises ikke annerledes i 3D.
- Vernet i 3D når du går selv (bakkekamp sin Dekning) er uendret – denne pakka gjelder lagene i kartet.
- Slitasjen glemmes ved ny lasting (bare terskelendringene lagres). Skudd mot leirens egne bygg (byggesettet) gir vern, men ingen skader.
