# Pakke «figurer» – folk, soldater og karakteren i 3D

## Runde 7 (20. nov natt)

Bakgrunn: begge kritikerne 19. nov (docs/anmeldelse-2026-11-19.md): «menneskene og geværet er kantete klosser som hører hjemme i et
helt annet spill». ALLE TALL ER CLAUDES FORSLAG (samlet i `Figur3d.REGLER` og `NIVÅ` i spill/figur3d.js).

### Hva er laget
1. **Én felles, avrundet figur** – `site/dovre-fliser/spill/figur3d.js` (NY, `window.Figur3d`). Brukes av folkene i leiren
   (voksne, barn og gamle – spill/folk3d.js) og soldatene på alle sider (soldater3d i index.html). Formene er kapsler og dreide
   profiler (THREE.LatheGeometry) med myke normaler: smale lemmer (lår, legg, overarm, underarm), avrundet overkropp med smalt liv og
   skuldre som går over i armene, rundt hode med kjeve, nese, ører og øyne (øyne/ører/nese bare nær), hender som små ovale kuler,
   støvler. Delene som slås av og på per figur (`Figur3d.DEL`, bit i maska): hjelm (mørk oliven, kanten i sidens farge), kort hår,
   langt hår (i tillegg), strikkelue, sekk (med sovepose nær), gevær, kasse. Fargene: jakke, bukse, hår og hud per figur (fire pakkede
   farger, `Figur3d.farger`) – sidens farge på jakken som før, hudfarger varierer i leiren.
2. **Bevegelsen i skyggeleggeren** (vertex shader, `figur(p, w)` i `glsl()`), ingen geometri per bilde. Per hjørne `aLem` = (ledd,
   fargekanal, del); per figur `aGang` = (fase, sving, sikte, bære) og `aPose` = (krum, kne, maske, barn).
   - gå: lårene svinger (±0,5 rad), kneet bøyes i svingfasen, armene svinger motsatt; stå: sving 0.
   - sikte: geværet ved skulderen (sikte 1) eller lavt over kroppen (0); armene regnes med to ledd (`Figur3d.ik`) så høyre hånd er på
     grepet og venstre på forskjeftet i begge stillingene (vinklene settes inn som tall i skyggeleggeren). 0,45 = klar.
   - bære: armene fram og litt inn, kassen foran brystet (folk på «frakt» og «bygg» når de går).
   - knele (sårede): venstre fot fram, høyre kne i bakken, kroppen 0,43 m ned. Ligge (falne): matrisen legger figuren ned som før,
     uten gevær i hendene.
   - krum overkropp for de gamle (og litt for syke), hodet løftes litt igjen; barna har større hode (`barn` 1) og er skalert 0,62.
   - Normalene dreies med lemmene (Lambert-lyset følger stillingen).
3. **Våpenet i hånda** (narhud.js `vmGeo`, bare modellen): avrundet kasse og forskjefte, dreid løp med munningsbrems, kolbe som vider
   seg ut mot en gummiplate, skrått grep, bøyle og avtrekker, buet magasin, korn med vinger og hullsikte (rifla kikkert på ringer,
   hagla pumpe og rørmagasin, pistolen sleide med riller). Hanskene har avrundet håndflate, fingre og tommel; ermene går ned og ut av
   bildet mot albuen (før: rett bakover som en pølse). `vmGeo` er pakket i try/catch så en feil i modellen ikke stopper spilløkka.
4. **Karakteren din** (karakter.js `byggFigur`, liten og samlet endring): overkropp og hofte som dreide profiler, lår/legg/overarm/
   underarm/fingre som kapsler, hender og føtter som ovale kuler, sekken avrundet med lokk og lommer, våpenet på ryggen/i hendene
   med avrundet kasse, forskjefte og kolbe. Leddene (grupper) og tredjeperson er uendret.
5. **Ytelse**: to InstancedMesh per flokk (nær og fjern, samme materiale) = to tegnekall (før: fem for soldatene og fem for folkene).
   Figurer nærmere enn 40 m (PC) / 26 m (telefon) får nær-nettet, resten fjern-nettet. Hver flokk tar bare med delene den bruker
   (soldatene: hjelm, sekk, gevær; folkene: hår, langt hår, lue, sekk, kasse, gevær). Geometrien er indeksert (færre hjørner).

### Trekanter per figur (renderer-tall)
| | før | nær PC | fjern PC | nær telefon | fjern telefon |
|---|---|---|---|---|---|
| soldat | 1118 (fem nett) | 1648 | 518 | 1278 | 475 |
| folk i leiren | 588 (fem nett) | 1830 | 596 | 1412 | 536 |

(Folkenes nett har alle delene de kan bruke – hår, langt hår, lue, kasse, gevær – men bare én frisyre/lue vises; skjulte deler blir
trekanter uten flate.)

### Målt (SwiftShader, 1400 × 820, leiren med 14 voksne + 8 barn/gamle, 3 røverlag à 12 (36) + startlagene)
FYLLES INN – se under.

### Filer
- NY `site/dovre-fliser/spill/figur3d.js` (reglene øverst uten DOM, visningen under), test `pipeline/fliser/test_figur3d.js`.
- NY `pipeline/fliser/vakter/figurer.js` (ca. 0,3 s; se under).
- Endret (mine): `spill/folk3d.js` (tegningen – bevegelsen/målene er som før), `soldater3d()` i index.html, `spill/narhud.js`
  (bare `vmGeo` og try/catch rundt den).
- FELLESFILER endret: `index.html` (soldater3d() byttet ut, samlet; skripttaggen for figur3d.js rett etter folk3d.js),
  `spill/karakter.js` (byggFigur/våpenDeler: hjelperne kap/kx/drei og formene – ellers uendret), `pipeline/fliser/vakter/natur.js`
  (soldatene har nå to nett i stedet for fem: `R.solMesh.length >= 1` i stedet for `=== 5`).

### API
`Figur3d.flokk(R, { maks, kilde, deler })` -> `{ nær, fjern, start(), legg(matrise, { fase, sving, sikte, bære, krum, kne, maske,
barn, farger }), slutt(), synlig(b), antall(), kast() }`. `Figur3d.farger(jakke, bukse, hår, hud)`, `Figur3d.DEL`, `Figur3d.holdning(går,
skyter, såret)`, `Figur3d.form` (kapsel, dreid, kule, langs, samle – også brukt av narhud.js og karakter.js). `R3.solMesh = [nær, fjern]`,
`R3.solFlokk`. `Folk3d.nett()` gir nå `{ nær, fjern }`, `Folk3d.flokk()`.

### Vakt (`pipeline/fliser/vakter/figurer.js`)
Reglene (fargepakking, hendene på geværet) og trekanttaket (nær < 2200, fjern < 800) alltid. Med 3D: to prøvelag (blå, laget uten
nyttLag så tilfeldighetsrekka ikke røres) – ett 8 m foran kameraet som skyter (én såret, én fallen) og ett 300 m unna på marsj: antallet
i flokken øker med 10, laget foran havner i nær-nettet når kameraet er nede (ellers fjern), sikter/kneler/uten gevær/går stemmer,
folkene i leiren er figurer (antall = personer + barn/gamle), ett bilde uten GL-feil, programmet «figur3d» finnes, og alt tas bort igjen.

### Ikke gjort
- Folk på fortauene i byene (liv3d.js) og soldatene i stillingene (krig3d.js) er fortsatt de gamle formene – ikke mine filer. De kan
  bruke `Figur3d.flokk` direkte (samme API som soldater3d).
- Ingen egne ansikter/hender med fingre på figurene (bare på karakteren din), ingen ansiktsuttrykk.
- Skyggen: figurene kaster ikke skygge (som før – lys3d bestemmer), og ville kastet den i grunnstillingen (ingen egen dybdeskygge-
  legger for bevegelsen).
- Overgangen nær/fjern er et hopp (ingen toning).
