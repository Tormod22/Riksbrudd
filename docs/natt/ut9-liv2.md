# ut9-liv2 – mer lys, liv og lyd i leiren og byene (28. nov)

Grenen `claude/ut9-liv2` (fra `claude/nattfiks` etter flettingen av ut9-liv). Alle tall er **Claudes forslag**. Ingen Math.random i
nye filer (test_tilfeldig er grønn): alt er fast via hash av plassen og tida, eller en egen frø-basert rekke.

## 1. Lys i flere bygg og lyskaster i vakttårnet

- `spill/leirliv.js` `VINDU` har nå også `kontrollrom` (modellen «hovedhus»: 18 vinduer i to etasjer), `kjøkken` (utleveringsluka) og
  `vakttårn` (lykta på lyskasteren) – lest rett av `spill/modeller-leir2.js` (`liste: [x, y, z, side, bredde, høyde]`).
  Kontrollrommet og vakttårnet lyser hele natta, kjøkkenluka til leggetid.
- `Leirliv.lyskaster(mørke, t, nr)`: om natta feier strålen ±1,1 rad på 26 s, 0,2 rad ned, 34 m lang. `spill/leirliv3d.js` tegner den som
  en åpen kjegle (MeshBasicMaterial, additiv, svak) fra lykta – ikke et lys.

## 2. Mer liv i byene i 3D – `spill/byliv3d.js` (regler øverst, `test_byliv.js`)

- Folk som **sitter på benkene** fra `spill/gate3d.js` (45 % av benkene, 35 % av dem med to; høyst 24 PC / 8 mobil; 08–21, ikke i regn/snø),
  med sittestillingen fra ut9-liv (`kne < 0`).
- Hver femte fotgjenger i `spill/liv3d.js` **går med hund** (1,4 m bak, på fortauet), fire pelsfarger.
- **Syklister** (8 PC / 3 mobil, 3,5–5,5 m/s) på gang- og sykkelvegene, ellers på fortauet – samme linjer og høyde som fotgjengerne, så de
  er aldri i vegbanen eller i hus. Figuren står på pedalene over sykkelen.
- `window.Byliv3d`: `antall()`, `sitter()`, `sykler()`, `hundPunkter()`.

## 3. Fugler og katt i leiren

- `Leirliv.kråker`: kråker på mønet av brakkene (60 % av brakkene, 1–2 per tak, hopper hvert 9. s) og tre på bakken ved bålet, om dagen.
- `Leirliv.katt`: én katt når leiren har en ferdig brakke – bytter sted hvert 50. s mellom brakkedøra, bålet, bak brakka og kjøkkenet,
  går ikke gjennom bygg (står i ro når veien er sperret), sover ved brakkedøra om natta.
- `Leirliv.måker`: fire måker som sirkler 16–34 m over vann innen 250 m fra leiren (vannet finnes med `iVann3d`). Dovre-leiren har ikke vann
  nær – ikke sett på bilde.

## 4. Hverdagslyd i leiren – `spill/leirlyd.js` (regler øverst, `test_leirlyd.js`)

- Web Audio koblet inn i lydmotoren fra `spill/lyd.js` (`Lyd.motor()`): ☰ «Lyd» slår det av, bare i 3D, dempet etter avstanden.
- Bjeffing (1–3 bjeff hvert 25.–70. s, 06–23, når leiren har hund), hammerslag ved en byggeplass når noen er på «bygg» (3–6 slag hvert
  5.–12. s, 07–17:30), prat ved kjøkkenet (eller bålet) om kvelden (17–21:30). Styrke høyst 0,07.
- `window.LeirlydSpill`: `antall()`, `sist()`, `steder()`. Ikke målt med lydmåleren (nettleseren slipper lyden fram først etter et trykk).

## Prøvd

- test_leirliv, test_leirlyd, test_byliv, test_tilfeldig, test_karaktervern, test_folk3d, test_figur3d – grønne.
- Vakta ut9-liv (nå også lys i kontrollrom/tårn/kjøkken, lyskaster, kråker, katt, benkefolk, leirlyd-reglene): PC og mobil i 3D grønn.
- Bilder i scratchpad natt/ut9-liv2.

## Ikke gjort / svakt

- Lyskasteren på modellen dreier ikke – bare strålen feier.
- Måkene er ikke sett (ingen vann nær leiren på Dovre-testsiden).
- Syklistene har ingen tråkkebevegelse utover gangen i beina; hundene i byen har ikke bein som går.
