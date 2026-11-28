# Fiks c (28. nov) – tre feil fra den raske kontrollen

Gren: `claude/ut5-fiksc`. Funnet med `SJEKK_PROFIL=PC SJEKK_DEL=rask` og en kopi av sjekk.js med minnemåling og
`Debugger.pause` fra CDP når siden ikke svarte (stakken viser hvor hovedtråden står fast).

## 1. «Target crashed» (rekruttering, og noen ganger alt i K1-oppstarten)
Årsak: **`veikart()` i `spill/vei.js`** (Dijkstra over leirens rutenett, kalles fra folkgang/planlegg hvert steg).
Avstandene lå i en `Float32Array`. En avstand over ca. 20 m ble rundet OPP når den ble lagret, så den samme veien så
«kortere» ut neste gang (`v < dist[q] - 1e-6`), og ruta ble lagt i haugen igjen – hver gang forgjengeren ble tatt ut.
Med et bygg 400 m fra leirens midte (rekruttering-vakta legger brakke og øvingsfelt der; andre vakter gjør det samme)
ble det titalls millioner ruter i haugen: 30 s og over 3 GB, så krasjet siden. I Node: 30 s og tom for minne med den
gamle, 14–40 ms med den nye.
Rettet: `Float64Array` og hver rute behandles én gang (`ferdig`). Samme svar som før. Ny sjekk nederst i
`pipeline/fliser/test_vei.js` (veikart til et mål 424 m unna < 2 s).

## 2. «lys og byger: disen er ikke koblet inn i three.js sin tåke»
Ingen feil i spillet: three.js hentes i bakgrunnen 2,5 s etter at kartet er klart, også når 3D aldri åpnes
(SJEKK_DEL=rask), mens disen kobles inn først i `init3d` (Luft3d.init). Vakta (`vakter/luft.js`) sjekker nå
`fog_fragment` bare når 3D-scenen er laget (R3), og ellers at `init3d` kaller `Luft3d.init`. Den feilet i alle raske
kjøringer siden den ble skrevet (de fulle kjøringene åpner 3D før vakta).

## 3. «kamp: 0 kamphendelser …»
Gikk igjennom alene og i de fleste fulle kjøringer – avhenger av tid. Vakta ga ildkampen 450 ms; under last (og mens
veikartet over sto og regnet i hvert steg) rakk ikke KampSpill å se skuddene, og spillets egen ildkamp kan sette
`skyterPå` tilbake. Vakta holder nå skuddene i gang og venter høyst 3 s til på meldingen, og skriver `kampDiag` i
dataene hvis den fortsatt ikke kommer. Ikke funnet noe i lyd2d.js (innpakningen av ordre) eller paktene i
fraksjoner.js som stopper meldingen (AI er av i testene).

## Også rettet
- `lagVindu` (index.html, 4 linjer): et lag helt utenfor området ga en tom boks og «RangeError: Invalid typed array
  length: -65536» i oppdaterSikt hver gang (sto under «FEIL i nettleseren»). Vinduet blir nå kanten nærmest laget,
  og oppdaterSikt prøver igjen om 2 s som før.
- `vakter/ut4-eksport.js`: vaktbilen kjøres hjem fra havna før smuglerturen (ellers tok turen «Lastebil 1», som en
  tidligere vakt hadde flyttet 778 m bort). Feilen var skjult bak krasjet.
- `vakter/ut4-maskinfolk.js`: gjerdet tas bort mens vakta går (settes tilbake med resten av byggene). K2-testen i sjekk.js
  lar et lukket gjerde uten port stå rundt leiren (porten avbrytes), så bærerne fikk «ingen vei dit» til lagerteltet utenfor
  og saga fikk aldri tømmer. Veisøket gjør det riktige – det er testtilstanden. Også skjult bak krasjet.

## Står igjen (rask PC-kjøring etter rettingene, ingen krasj, ingen «FEIL i nettleseren»)
balanse (runde 4: byttet ble ikke tatt fra kassa og lageret), ut1-selskap, ut2-byer og «varer med plass (G4)» (tilbake:
false) – alle hører til fiks a. Av og til (ikke hver kjøring): selskapet, ut3-varekontrakt, «spill i 2D»/«etasjer» (ingen
karakter i kartet) – avhenger av hva vaktene før lar ligge igjen.

## Verktøy (scratchpad natt/fiksc)
`sjekkm-minne.js` = sjekk.js med minnemåling hvert sekund og `Debugger.pause` når siden ikke har svart på 4 s (skriver
stakken som «PAUSE …»). Kopier den til pipeline/fliser/ for å bruke den (den leser vaktene fra __dirname).

## Fellesfiler endret
- `site/dovre-fliser/index.html`: `lagVindu` (to linjer + kommentar rett etter klippingen mot OMRÅDE) og versjonsmerket
  for vei.js (versjon.py).
- Vakter: `kamp.js`, `luft.js`, `ut4-eksport.js`, `ut4-maskinfolk.js`. Test: `test_vei.js`. Regel: `spill/vei.js` (veikart).
