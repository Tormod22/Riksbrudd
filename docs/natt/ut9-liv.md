# ut9-liv – feil i den store kontrollen, og liv i leiren (28. nov)

Grenen `claude/ut9-liv` (fra `claude/nattfiks`). Brukeren: «jobb med å fikse mindre ting, legge til detaljer og liv i spillet, legge
til flere ting». Alle tall er **Claudes forslag**.

## A1. Karakteren forsvinner i lange kjøringer («ingen karakter» i spill2d og ut3-etasjer)

**Funnet:** karakterlaget (`s.karakter`, lagt inn av `spill/kontrollrom-visning.js`) står **sist** i `ENHETER` (målt: indeks 9 av 10).
Mange prøver fjerner et prøvelag med `ENHETER.splice(ENHETER.indexOf(lag), 1)`. Er prøvelaget alt borte (spillet har fjernet det selv –
røvere som har gitt seg/trukket seg, lag som har gått over, kontraktslag), gir `indexOf` −1, og `splice(-1, 1)` tar ut **det siste laget –
karakteren**. Det skjer bare når spillet rekker å fjerne prøvelaget først, derfor bare av og til og bare i lange kjøringer.

Ikke gjenskapt i to kjøringer herfra (alle vaktene fra `3d` til `spill2d` i 3D med en vakt på `ENHETER.splice` og på karakterens `hp`,
og en full `sjekk.js` PC med samme vakt): karakteren ble aldri fjernet eller drept, og spill2d/ut3-etasjer var grønne. Rettingen dekker
derfor skrivemåten, ikke ett bestemt sted:

- **Spillet:** `spill/karaktervern.js` (ny; regler øverst, `test_karaktervern.js` med selvtest av selve feilen): to ganger i sekundet (også i
  pause) – er laget vi kjenner som karakteren ikke lenger i `ENHETER`, og ingen annen karakter står der, settes **samme lag** inn igjen
  (`console.warn` sier fra). `window.KaraktervernSpill.ganger()` teller.
- **Vaktene:** alle `ENHETER.splice(ENHETER.indexOf(x), 1)` i `pipeline/fliser/vakter/*.js` (10 filer, 19 steder) er nå
  `(ENHETER.indexOf(x) >= 0 && ENHETER.splice(ENHETER.indexOf(x), 1))`.
- **IKKE RETTET (fellesfil):** `pipeline/fliser/sjekk.js` har samme skrivemåte på linje **592, 1166 (to), 1222, 1261, 1314, 1370, 1416**
  (1166–1314 kjører før vaktene: kameraer, stridsregler, kameravakta, formasjoner). Forslag: samme vern som i vaktene.
- Merk: en karakter som DØR (hp 0) i en vakt, blir stående død i testene – `faltSteg` i spillet-visning.js vekker den bare utenom testene
  (`auto()`). Det ble ikke sett i kjøringene her.

## A2. ut5-oppforsel: «rydding: varen ble ikke båret inn» av og til

To årsaker:
1. **Feil i spillet:** rydderen hentet én bestemt vare (`P.rydd … enhet`), men da turen var gått, flyttet `VarelagerSpill.rydd(n)` den
   FØRSTE varen som lå ute – ikke den rydderen bar. Lå andre varer ute (vaktene før lot f.eks. 18 m³ tømmer ligge), ble vaktas vare liggende.
   Nå: `Varelager.rydd(Leir, L, V, n, først)` flytter `først` (id-en) først; `VarelagerSpill.rydd(n, først)`; oppforsel-visning.js sender
   `r.enhet`. Test i `test_varelager.js` (feiler uten rettingen).
2. **Vakta:** rydderen tar den første varen som kan bæres inn. Vaktas prøvevare ble lagt SIST (`push`) – med mange varer ute fra vaktene
   før rakk ikke én rydder fram til den på 300 s. Nå legges den først (`unshift`); det vakta sjekker, er det samme.

## B. Liv og detaljer i leiren

Regler uten DOM: `spill/leirliv.js` (`test_leirliv.js`, 38 sjekker). Visning: `spill/leirliv3d.js` (3D og 2D). Stillingene: `spill/folk3d.js`,
sittestillingen: `spill/figur3d.js`. Vakt: `pipeline/fliser/vakter/ut9-liv.js`.

| Hva | Hvor | Tall (Claudes forslag) |
|---|---|---|
| Folk **ligger i køya** når de sover i brakka (to per køyeseng, nede 0,55 m / oppe 1,35 m, hodet på puta) | folk3d.js `møbelPlass` | |
| Folk **sitter ved bordet** når de spiser: de tre første på benken under markisen ved kjøkkenet (modellen har bord og benk der; kjøkkenet er for lite til langbord inne), langbord inne der planen har det | folk3d.js `uteBord`/`møbelPlass`, figur3d.js `kne < 0` = sitte | 3 plasser ute |
| Vakta i tårnet står med **kikkert** (en del av tida, ellers gevær) | leirliv3d.js | |
| Byggelaget bærer **planker** på skulderen når de går, frakt bærer kasse som før | leirliv3d.js, folk3d.js | |
| **Røyk**: kjøkkenpipa ved måltidene (6:30–8:30, 11–13, 16:30–19:30) og svakere om kvelden, fyrkjelen kveld/natt og når den går, brakkeovnen kalde kvelder (ikke sommer) | leirliv.js `røyk`, `PIPE` | 18 dotter per pipe, 10 s, 0,6 m/s opp, driver med vinden |
| **Lys i vinduene** om kvelden/natta (brakke, sykestue, verksted – vinduene lest av modellene), brakka slukker 23:30–5:30, sykestua lyser hele natta, 30 % av vinduene er mørke rom | leirliv.js `VINDU`, `lys` | fra NATT.mørke 0,18 |
| **Hunder**: én fra 6 personer, to fra 16; rusler mellom bålet, folkene og byggene (går rundt bygg), aldri over 22 m fra leiren, ligger ved bålet 22:30–6 | leirliv.js `hundSteg`, leirliv3d.js | 1,1 m/s (løp 2,6) |
| **Vasketøy på snor** ved hver ferdige brakke | leirliv.js `småting` | snora 4,2 m, fem plagg |
| **Kasser, verktøykasse og sagbukk** ved byggeplassene | leirliv.js `småting` | 4 ting per bygg under arbeid |

- Ingen nye lys: vinduene er selvlysende flater (MeshBasicMaterial), røyken er punkter (egen liten skyggelegger, ASCII). Alt annet er
  InstancedMesh med `MODELLER.materiale()` (hundene eget Lambert-materiale med instanceColor). Frigjøres når scenen byttes.
- Småtingene settes aldri inni eller inntil et bygg (fotavtrykk + luft), ikke på hindringer (`hindring3d`), ikke i vann, ikke oppå hverandre,
  og de legges ikke i `R3.hindre` (stopper ikke gange). Samme plasser i 2D og 3D.
- 2D (zoomet helt inn, `kam.m ≤ 0,45`): hundene, vasketøyet og kassene.
- Hundene og alt det andre lagres ikke (pynt). I testene rusler hundene også (ingen hendelser eller tilstand).
- `window.Leirliv3d`: `antall()`, `ting()`, `hunder()`, `sjekk()` (ting i bygg / svevende), `kilder()`, `vinduer()`, `oppdater()`, `steg(dt)`.
- `Folk3d.plassVed(b, i, hva)` tar nå `hva` ('seng' | 'bord').

## Prøvd

- Regeltester: test_leirliv, test_karaktervern, test_varelager, test_folk3d, test_figur3d, test_oppforsel – grønne.
- Vakta ut9-liv: PC og mobil i 2D og 3D grønn; med feil med vilje (småting satt inni byggene / karaktervernet av) feiler den.
- Full `sjekk.js` PC (med vakt på karakteren): 196 ok; FEIL bare i lokke-r3-angrep, morgen, ut8-industri og ut8-kr-krig – alle fire grønne
  når de kjøres alene på denne grenen (rekkefølge/last; jeg kjørte bilder samtidig). Versjonsmerkene feilet fordi vakten var lagt inn i kopien.
- Bilder (scratchpad natt/ut9-liv): leiren om kvelden/natta (lys i brakka og sykestua, vasketøy, hund ved bålet), folk i køyene, tre ved
  benken ved kjøkkenet, byggelaget med planker, mobil 2D og 3D.

## Ikke gjort / svakt

- Kikkerten er ikke sett på bilde (taket på tårnet skjuler vakta ovenfra) – telles i vakta.
- Kjøkkenet, kontrollrommet og vakttårnet har ikke vinduer i tabellen (kjøkkenet har luke, ikke vinduer).
- Hundene har ikke lyd, og går ikke inn i bygg; de kan gå gjennom smått som ikke er hindringer (busker).
- sjekk.js-linjene over må rettes av den som eier fila.
