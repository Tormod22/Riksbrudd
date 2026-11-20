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
   Figurer nærmere enn 25 m (PC) / 18 m (telefon) får nær-nettet, men høyst de 12 (PC) / 6 (telefon) nærmeste – resten fjern-nettet
   (`REGLER.nærPC/nærMobil/maksNærPC/maksNærMobil`). Hver flokk tar bare med delene den bruker (soldatene: hjelm, sekk, gevær; folkene:
   hår, langt hår, lue, sekk, kasse, gevær). Geometrien er indeksert. Skyggeleggeren regner sinus/cosinus én gang per vinkel for både
   punktet og normalen, og hopper over overkroppens bøy når den er 0.
6. **Soldatene i fiendens stillinger** (krig3d.js, liten og samlet endring): de tre soldatene bak vollen er den samme figuren – på kne og
   siktende, hjelm, sekk og gevær, jakken i oliven med et skjær av sidens farge (`figurerRunde`). Uten Figur3d: kassene som før.

### Trekanter per figur (renderer-tall)
| | før | nær PC | fjern PC | nær telefon | fjern telefon |
|---|---|---|---|---|---|
| soldat | 1118 (fem nett) | 1648 | 518 | 1278 | 475 |
| folk i leiren | 588 (fem nett) | 1830 | 596 | 1412 | 536 |

(Folkenes nett har alle delene de kan bruke – hår, langt hår, lue, kasse, gevær – men bare én frisyre/lue vises; skjulte deler blir
trekanter uten flate.)

### Målt (SwiftShader – programvare-grafikk, delt maskin, medianer)
Scenen: leiren med 14 voksne + 8 barn/gamle, 3 røverlag à 12 (36) ved leiren (ett står, ett går, ett skyter; én fallen og én såret)
+ startlagene. «Figurene alene» = bare figurnettene tegnes (resten av scenen skjult), minus et tomt bilde; 10 vekselvise målinger.
Hele bildet med/uten figurene varierte mer enn forskjellen (maskinen deles av sju), så tallene under er figurene alene.
Skript: scratchpad natt7/figurer/maal2.js (`R=<mappe>` for gammel kode, `DPR=1` på telefon).

| | trekanter i figurene | tid for figurene alene |
|---|---|---|
| PC 1400 × 820, fra lufta (34 m), før | 106 848 | 108 ms |
| PC, fra lufta, etter | 56 624 (alle i fjernnettet) | 95 ms |
| PC, til fots midt i leiren og røverne, før | 106 848 | 167 ms |
| PC, til fots, etter (25 m, uten tak på antallet nær) | 117 672 (52 nær) | 255 ms |
| PC, til fots, etter (med tak: de 12 nærmeste i full detalj) | 84 992 (24 nær) | 160 ms |
| Telefon 390 × 844 (DPR 1), fra lufta, før | 106 848 | 109 ms |
| Telefon, fra lufta, etter | 51 692 | 77 ms |
| Telefon, til fots, før | 106 848 | 109 ms |
| Telefon, til fots, etter (18 m, uten tak) | 81 622 (36 nær) | 126 ms |
| Telefon, til fots, etter (med tak: de 6 nærmeste i full detalj) | 61 766 (12 nær) | 104 ms |

Usikkerhet: to kjøringer av samme kode fra lufta på telefon ga 77 og 96 ms – regn med ±20 %. Hovedbildet: like raskt eller raskere
enn før med færre trekanter (fra lufta −45 %), og en folkemengde rett ved deg koster ikke mer enn før takket være taket på antallet nær.

Tegnekall for figurene: før 10 (fem nett for soldatene, fem for folkene), nå 4 (to + to), og 2 til for stillingene når de vises.
JavaScript per bilde for alle figurene (soldater3d + folk3d-kroken): ca. 0,1 ms både før og etter.
Hvorfor ikke raskere per trekant: bevegelsen regnes nå i skyggeleggeren for hvert hjørne (før: armene/beina til folkene som matriser i
JavaScript), og programvare-grafikken regner hjørnene på prosessoren. På et grafikkort er dette lite – der teller trekantene og punktene.

### Filer
- NY `site/dovre-fliser/spill/figur3d.js` (reglene øverst uten DOM, visningen under), test `pipeline/fliser/test_figur3d.js`.
- NY `pipeline/fliser/vakter/figurer.js` (ca. 0,3 s; se under).
- Endret (mine): `spill/folk3d.js` (tegningen – bevegelsen/målene er som før), `soldater3d()` i index.html, `spill/narhud.js`
  (bare `vmGeo` og try/catch rundt den).
- FELLESFILER endret: `index.html` (soldater3d() byttet ut, samlet; skripttaggen for figur3d.js rett etter folk3d.js),
  `spill/karakter.js` (byggFigur/våpenDeler: hjelperne kap/kx/drei og formene – ellers uendret), `spill/krig3d.js` (figurer():
  kameraets plass i nøkkelen og `figurerRunde`; frigjør/antall kjenner `G.figFlokk`), `pipeline/fliser/vakter/natur.js`
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

### Prøvd i nettleser (Chromium, SwiftShader)
Skript i scratchpad natt7/figurer/: naer.js (leiren full av folk + tre røverlag; til fots, nærbilde, våpenet i hånda, utenfra, vakten),
maal.js/maal2.js (målingene over), tell.js (trekanter per figur i Node). Bilder (samme mappe): før: for-pc-leir.png og kritikernes
38-ga-start.png; etter: v4-pc-ga.png, v3/v4-pc-naer.png, v4-pc-vapen0.png (gevær), v4-pc-vapen1.png (pistol), v4-pc-utenfra.png (karakteren
bakfra, en såret soldat på kne som sikter), v5-mobil-naer.png, v5-mobil-utenfra.png, v5-mobil-vapen0/1.png. Før og etter med samme kamera:
sammenligning-naer.png (øverst før, nederst etter) og sammenligning-vapen.png (venstre før, høyre etter); de gamle bildene for-pc-*.png. Ingen sidefeil, GL-feil 0, vakten
grønn på PC (0,3–4 s) og telefon (1,1 s), stillingen i krig3d gir 3 soldater. Hele kontrollen `SJEKK_PROFIL=mobil` på siste versjon:
120 ok, 0 FEIL (karakteren 6094 trekanter, soldaten 1753 = nær + fjern på telefon).

### Ikke gjort
- Folk på fortauene i byene (liv3d.js) er fortsatt de gamle formene – ikke min fil. Den kan bruke `Figur3d.flokk` direkte (samme API
  som soldater3d).
- Ingen egne ansikter/hender med fingre på figurene (bare på karakteren din), ingen ansiktsuttrykk.
- Skyggen: figurene kaster ikke skygge (som før – lys3d bestemmer), og ville kastet den i grunnstillingen (ingen egen dybdeskygge-
  legger for bevegelsen).
- Overgangen nær/fjern er et hopp (ingen toning).
