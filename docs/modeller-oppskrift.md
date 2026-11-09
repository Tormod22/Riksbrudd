# Oppskrift: lage 3D-modeller til Riksbrudd (for en annen chat)

Lista over modellene står i docs/3d-modeller.md. Denne fila sier HVORDAN de skal lages, så de passer inn i spillet.

## Repo og gren
- Repo: Tormod22/Riksbrudd. Jobb på en egen gren, for eksempel `claude/modeller`. Ikke rør `main`.
- Les CLAUDE.md først (språk: norsk i kommentarer og tekster).

## Hvor koden skal ligge
- Ny fil: `site/dovre-fliser/spill/modeller.js`. Rør ikke andre filer, unntatt én linje i `site/dovre-fliser/index.html`
  (et `<script src="/dovre-fliser/spill/modeller.js?v=0"></script>` rett etter `spill/anlegg3d.js`).
- Ingen modellfiler (glTF/OBJ) og ingen nedlastinger fra nettet: alt bygges i koden av enkle former.

## Teknikk (three.js r128, ligger i site/dovre-fliser/lib/)
- `THREE` finnes først når 3D er slått på. Lag derfor ingenting når fila lastes; lag geometrien inne i funksjonene.
- Hver modell er en funksjon i objektet `window.MODELLER`, som returnerer én `THREE.BufferGeometry`:
  `MODELLER.brakke = () => geometri`.
- Mål i meter. z peker opp, x er «framover» (inngangen eller fronten vender mot +x), origo midt på bunnen (z = 0 = bakken).
- Farger som vertex-farger (attributtet `color`, verdier 0–1), ikke teksturer. Da kan mange modeller tegnes med samme materiale:
  `new THREE.MeshLambertMaterial({ vertexColors: true })`.
- Slå sammen delene til én geometri med funksjonen `samle(liste)` som finnes i index.html (den tar en liste med BufferGeometry).
  Lag hjelpere som `boks(x, y, z, sx, sy, sz, farge)` som flytter boksen så den står på z og fargelegger alle punktene.
- Hold det enkelt: en bygning høyst ca. 500 trekanter, et kjøretøy høyst ca. 300, en figur høyst ca. 150 (mobilen skal klare tusenvis).
- Stil: realistisk og dempet (spillet er mørkt og realistisk, ikke tegneserie). Norske farger: rødmalt tre, hvit kledning, svart tak,
  grå betong, militærgrønt.

## Regler som har gitt feil før
- Skriv aldri en `//`-kommentar midt på en linje med kode etter: legg kommentaren på egen linje over.
- Lager du shaderkode: bare ASCII i navn (ingen æ, ø eller å).
- Ingen skript fra CDN-er.

## Vise modellene (testside)
- Lag `site/dovre-fliser/spill/modeller-visning.html`: en enkel side som laster `../lib/three-r128.min.js`, en kopi av `samle()` og
  `modeller.js`, og viser alle modellene på rad på et grått gulv med lys fra himmelen og sola, og navnet over hver.
  Den kan åpnes lokalt med `python3 pipeline/fliser/server.py site` og http://localhost:8765/dovre-fliser/spill/modeller-visning.html.
- Ta skjermbilde med Playwright (Chromium med `--use-gl=swiftshader`), og se selv at modellene ser riktige ut fra flere kanter.

## Før du er ferdig
1. `node --check site/dovre-fliser/spill/modeller.js`
2. `python3 pipeline/fliser/versjon.py` (versjonsmerket i adressen)
3. `VEGNETT_DIR=<mappe> node pipeline/fliser/sjekk.js` skal gi «Alt i orden» (laster vegnettet selv uten VEGNETT_DIR).
4. Commit og push til din egen gren, og skriv i svaret hvilke modeller som er laget og hvilke som gjenstår.
Plasseringen i spillet (hvor modellene står på kartet) gjør hovedchatten etterpå.
