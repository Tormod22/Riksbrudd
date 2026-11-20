# Pakke «figurer» (runde 11: «modeller») – folk, soldater, kjøretøy og dyr i 3D

## Runde 11 (20. nov kveld)

Oppdrag: de siste kantete modellene i 3D. Brukerens fem bilder fra iPhone (bruker20/) sa «Dette ser ikke bra nok ut». ALLE TALL ER
CLAUDES FORSLAG (målene i modellene, `FOLK` i liv3d.js, hjulavstanden for kolonnene).

### Hva er laget
1. **Folk på fortauene** (spill/liv3d.js, `startLiv` og hver ramme): den felles, avrundede figuren (`Figur3d.flokk`, delene hår, langt
   hår, lue og sekk) i stedet for to klosser og en kule. Klær, hår og hud trekkes fra `FOLK` (10 jakker, 5 bukser, 5 hårfarger, 5 hudfarger;
   20 % lue, 30 % langt hår, 25 % sekk), størrelse 0,93–1,06. Gangen er i skyggeleggeren (fase følger farten), ingen hopping. Folk lenger
   unna kameraet enn `FOLK.synlig` = 320 m tegnes ikke (de er knapt et punkt, og bevegelsen koster per hjørne i skyggeleggeren).
   Uten Figur3d: klossene som før. Flokken kastes i `fjern()`.
2. **Bilene i trafikken** (liv3d.js, ny `bilNett`): avrundet karosseri som heller litt bakover foran, glasshus som smalner oppover med
   skrå frontrute/bakrute, avrundet tak i lakkfargen, støtfangere, grill, dekk med felgskive på yttersiden. To nett: lakken (instansfarge)
   og resten (hjørnefarger) – før tre. 804 trekanter per bil (før ca. 200). Lysene (front/bak/lyskjegle) er som før.
3. **Kolonnenes kjøretøy** (spill/kjoretoy3d.js):
   - stridsvogna: skroget avrundet med skrå front, beltet en lang, rund løkke rundt hjulene, løpehjulene som skiver, skjørtet ett avrundet
     panel med skjøter, tårnet en avrundet form som smalner oppover og heller bakover foran, rund kanonkappe, avrundede kasser.
   - lastebilene: kalesjen er én avrundet form (buet tak) med svake ribber, i stedet for flate plater og bøyler.
   - rakettartilleriet: rørpakken avrundet, rørmunningene som mørke skiver (før 30 sylindre med lokk = 1200 trekanter), avrundet
     dreieskive, støtter og førerhusbak.
   - radarbilen: hytta, taket, antenneflaten og aggregatet avrundet.
   - hjulene: felg og nav bare på yttersiden (`rundHjul` fikk et valgfritt 9. argument `ytre`; feltbilen i kjor.js kaller uten og er
     uendret), og doble hjul bak er ett bredt dekk med en rille. Det sparte nok trekanter til alt over.
   Trekanter per type (før → etter): lastebil 4940 → 3768, speiderbil 2936 → 2568, stridsvogn 2792 → 3724, rakettartilleri 5784 → 4504,
   radar 4980 → 4900 (sjekk.js krever 400–6000).
4. **Kolonnene heller til siden** (`kjøretøy3d()` i index.html): stillingen regnes med `Kjor.stilling` som feltbilen – fire hjul
   (halv akselavstand 0,35 × lengden, halv sporvidde 0,4 × bredden), stigning og sidehelling begrenset som feltbilen, z slik at ingen hjul
   står under bakken. Før: bare stigning fra to punkter, midt mellom dem i høyden. Uten Kjor: som før.
5. **Dyrene** (spill/dyr3d.js, bare formene): hoder, snuter, ører, haler og juret er avlange kuler (`egg`, fyller samme boks som før),
   beina runde og smalere nederst (`rundt`), hovene runde. Og den viktigste: `geometri()` regnet normalene på nytt ETTER `toNonIndexed`,
   så alle kulene ble flatskygget (kantete) – nå beholdes de myke normalene. Bevegelsen og reglene er uendret.

### Målt (SwiftShader, delt maskin – sju hjelpere på fire kjerner; regn med ±30 %)
Scenen: Dombås-utsnittet (S 1006 m PC / 800 m telefon), fem prøvekjøretøy (ett av hver type) i lia, trafikken i gatene (gangvegene
merket «by» i prøven – testsiden har ingen folk på fortauene ellers; 45 folk, 3 biler PC / 2 telefon), samme kamera før og etter.
«Alene» = kjøretøyene + trafikken (biler og folk) tegnet uten resten av scenen, minus tomt bilde (median av 9). Skript:
scratchpad natt11/modeller/bilde.js (`node bilde.js <før|etter> <pc|mobil>`; «før» = git archive av grenen før endringene).

| PC 1400 × 820 | trekanter alene før → etter | tid alene (ms) før → etter | hele bildet (ms) før → etter |
|---|---|---|---|
| fra lufta over kjøretøyene | 34 926 → 26 036 | 69 → 54 | 730 → 591 |
| til fots ved stridsvogna | 34 926 → 26 036 | 71 → 47 | 1408 → 1163 |
| ved lastebilene | 34 926 → 26 036 | 105 → 48 | 1262 → 1253 |
| i gata, åtte folk rett foran | 34 926 → 36 300 | 58 → 72 | 1359 → 1184 |
| ved en bil i trafikken | 34 926 → 27 596 | 46 → 39 | 861 → 891 |
| ved en elg på heia | 34 926 → 24 476 | 47 → 32 | 1084 → 1206 |

| Telefon 844 × 390 (før folk-taket på 320 m) | trekanter alene | tid alene (ms) | hele bildet (ms) |
|---|---|---|---|
| fra lufta | 34 718 → 27 312 | 54 → 52 | 489 → 406 |
| ved stridsvogna | 34 718 → 27 832 | 54 → 38 | 673 → 672 |
| ved lastebilene | 34 718 → 27 312 | 59 → 62 | 660 → 682 |
| i gata | 34 718 → 39 136 | 43 → 68 | 675 → 823 |
| ved bilen | 34 718 → 22 632 | 55 → 42 | 768 → 824 |
| ved dyret | 34 718 → 28 352 | 42 → 35 | 561 → 630 |

Kjøretøyene alene: 21 432 → 19 464 trekanter (de fem typene). Bilene: 3 × 202 → 3 × 804. Folkene: 45 × 4 klosser (ca. 260) →
figurene innen 320 m (518 fjern, 1648 nær; høyst 12 nær på PC / 6 på telefon). Første PC-måling uten taket på 320 m ga 45 276
trekanter og 89 ms alene fra lufta – derfor taket. Telefonmålingen ble gjort før taket, så tallene der er de verste.
Hele bildet varierer mer enn forskjellen (delt maskin); hovedbildet: like raskt eller raskere, færre trekanter unntatt når mange folk
står rett ved kameraet.

Telefonen er 844 × 390 (liggende, DPR 2) – den er bredere enn 700 punkter, så den regnes som PC i liv3d.js (45 folk), som før.

### Bilder (scratchpad natt11/modeller/)
før-/etter-<pc|mobil>-<lufta|stridsvogn|lastebiler|gata|bil|dyr>.png, og sammenligning-*.png (før øverst/venstre, etter under/høyre).

### Vakt (pipeline/fliser/vakter/figurer.js, utvidet)
I tillegg til runde 7: trekanter per kjøretøytype 400–6000; en prøvelastebil i 3D står på fire hjul i bakken (hjulene 0–0,25 m over
terrenget, ingen under); når utsnittet har trafikk: folkene er figurer i flokken (alle innen 250 m tegnes), bilen har 300–1500 trekanter.
Prøvd på PC: ok på ca. 2 s.

### Kontrollen (SJEKK_PROFIL=mobil, hele)
Første kjøring: 127 ok, 1 FEIL – «minne i 3D»: + 2 geometrier hver gang 3D ble slått av og på (samme kontroll på grenen før mine endringer:
128 ok, 0 FEIL). Årsaken: `Figur3d.flokk().kast()` frigjorde aldri geometrien – før ble flokkene nesten aldri kastet, nå lager trafikken
en ny flokk for hvert utsnitt. Rettet i figur3d.js (`kast` kaller `geometry.dispose()`). Andre kjøring: «minne i 3D» ok (99 -> 99),
eneste FEIL var versjonsmerkene (figur3d.js endret etter versjon.py – kjørt etterpå).

### Filer
- `site/dovre-fliser/spill/figur3d.js` (`kast` frigjør geometrien), `site/dovre-fliser/spill/kjoretoy3d.js` (modellene, `rundHjul` med `ytre`), `spill/liv3d.js` (bare trafikken og folkene: `bilNett`,
  `FOLK`, `startLiv`-delen for biler og folk, `flytt` med `fig`, `fjern` kaster flokken, ny `Liv3d.trafikk()`), `spill/dyr3d.js` (formene
  og normalene), `index.html` (`kjøretøy3d()`, samlet), `pipeline/fliser/vakter/figurer.js`, `docs/natt/figurer-hjelp.json`.

### Ikke gjort
- Bilene i trafikken heller ikke med bakken (de følger vegbanen, som er flat på tvers) og har ingen detaljnivå (alle 800 trekanter).
- Kolonnenes kjøretøy har ingen detaljnivå og ingen glatting av vinklene over tid (de kjører sakte; en hump kan gi et lite rykk).
- Feltbilen i brukerens bilder 3–5 (kjor.js) er ikke min fil i denne runden – den ble avrundet i runde 10.
- Speiderbilen og lastebilenes førerhus var allerede avrundet (runde 10) og er uendret utenom hjulene.


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
