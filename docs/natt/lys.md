# Pakke «lys» (18. nov natt) – lys, skygger og bilde i 3D

Mål fra brukeren: «få 3D til å se klart bedre ut uten å gjøre det tregere på vanlige maskiner». Alt nytt følger grafikknivået
(`KVAL.fx` i `spill/kvalitet.js`) og kan slås av med knappen «Lys og skygger» i ☰ (`#vis-effekter`, localStorage
`riksbrudd-effekter`). Lav grafikk har ingenting av det. I testene (`navigator.webdriver`) er effektene AV til testen selv kaller
`KVAL.effekter(true, false)` – kontrollskriptet ser samme bilde som før. Alle tall er Claudes forslag.

## Filer
- `spill/kvalitet.js` – `Kvalitet.FX` (høy / middels / ingen), `KVAL.fx`, `KVAL.effekterPå`, `KVAL.effekter(på, lagre)`, knappen.
- `spill/lys3d.js` (NY, lastes rett før tema.js) – `window.Lys3d`: `init(R3)` (kalles fra init3d), `atlas()`, `U`, `REGLER`, `sjekk()`.
- `spill/filtre.js` – standardleddet (`STANDARD`, `gradering()`), `Filtre.sjekk()`.
- `spill/natt3d.js` – skylaget (`skylag`, `SKY_H`), lys på bakken (`R.nattLys2`), `NATT.skylag`, `NATT.lysflekker`.
- `index.html` – `Lys3d.init` i init3d, skygge i `hjørnelys`, `bakkeFx()`, `BAKKE_FX` i `detaljIBakken`, `byttBakke` med merke
  (`R.bakkeMerke`), avstand til land i `vannmaske` (`STRAND_M`), `husskygger`/`husFot` (`HUS_SKYGGE`).
- `pipeline/fliser/vakter/lys.js`, `docs/natt/lys-hjelp.json`.

## Hva som er laget
1. **Skygger fra sola/månen** (`Lys3d`, Høy 2048 PC / 1024 mobil, Middels 1024 PC / av på mobil). Ett skyggekart som følger
   kameraet: halve siden 110 m når du går, ellers 55 % av kameraavstanden (120–700 m). Skyggekartet tegnes IKKE hvert bilde
   (`renderer.shadowMap.autoUpdate = false`): bare når midten har flyttet seg 22 % av halve siden, sola har flyttet seg, trærne er
   fordelt på nytt (`R.lodVed`) eller et nytt utsnitt er satt inn. Kaster: terrenget, trærne, husene, småtingene, bruene og det som
   står stille fra infra3d, kraft3d, leir-visning, anlegg3d, portal3d, gard3d, byhus, bane3d, kyst3d, vegetasjon3d
   (`userData.kilde`). Ting som beveger seg (kjøretøy, soldater, dyr, trafikk) kaster ikke skygge (skyggekartet er gammelt).
   Alt lyssatt (Lambert/Phong/Standard) tar imot. Skyggen tones ut mot kanten av kartet (endring i three.js sin
   `shadowmap_pars_fragment`). Terrengets lys per hjørne (`hjørnelys`) ganger skyggen inn med `getShadowMask()`.
   Under `REGLER.minLys` (natt uten måne) er skyggene av.
2. **Omgivelsesskygge**: mørkere bakke de siste 2,4 m inn mot husvegger (`husskygger`, malt i kartbildet som treskyggene) og
   mørkere vegger nederst (`husFot`: hjørnefargene ved bakken × 0,72). Treskyggene fantes fra før. Ingen skjermbasert SSAO.
4. **Skarp bakke nært** (`BAKKE_FX` + `Lys3d.atlas()`): ett bilde 512² med fire mønstre (r gress, g lyng, b grus, a berg), blandet
   etter kartfargen, to målestokker (3,6 m og 14 m per rute). To oppslag i stedet for de fem gamle. Bare i varianten nær kameraet.
6. **Vann med dybde**: vannmaskens blå kanal = avstand til land (0 ved stranda, 255 fra 40 m). Grunt vann lysere og grønnere,
   dypt mørkere, smalt skumbånd som pulserer mot land.
7. **Skyer i lag** (`natt3d.js skylag`): skyene på himmelen leses fra samme støy, terskel og drift som skyskyggene, i et lag
   1500 m over bakken, forskjøvet etter sola. Erstatter skybildet når `KVAL.fx.skyer`. Skyggene er med også i lettskyet vær.
8. **Lys om natta**: flater under gatelysene og rundt ca. 60 % av husene som GANGER lyset inn i bakken (CustomBlending
   DstColor/One), følger bakkens helning. Ingen nye lys i scenen.
9. **Tåke i dalene**: three.js sin tåke (`fog_fragment`) har fått et tillegg etter høyden (uniformene `uDalT`/`uDalF` ligger i
   `THREE.ShaderLib` og deles av alle innebygde materialer): svak dis i lavlandet om dagen, tett morgentåke (`VAER.dalTåke`).
15. **Fargesetting** (`filtre.js STANDARD`): når ingen filter er valgt – litt kontrast og metning, varm lav sol, kald vinter, vignett.
16. **Kantutjevning og dybdeuskarphet** (bare Høy, bare når du går): flerprøve-mål med dybdetekstur (`dybdeMS`; faller tilbake
   til vanlig mål + FXAA hvis det gir GL-feil), uskarpt fra ca. 140 m og helt nært (< 1,5 m). Ellers flerprøve-mål uten dybde.

## Ikke gjort / kjente svakheter
- Skjermbasert SSAO er ikke laget. Kjøretøy, soldater og dyr kaster ikke skygge.
- Trær utenfor synsfeltet finnes ikke i nettene (lodTrær), så skyggen av et tre rett bak kameraet mangler til du snur deg.
- Billys (liv3d.js) er ikke endret – den modulen eies av en annen pakke.
- Egne ShaderMaterial i andre moduler (bekker, kjølvann …) tar ikke imot skygge og får ikke daltåke.
- Kostnaden er bare målt med programvare-grafikk (se rapporten). BE BRUKEREN kjøre «Mål ytelse» med «Lys og skygger» på og av.
- HAKK ved nytt utsnitt: ikke arbeidet med (bare nye steg er lagt inn med pust).

## Ferdigstilling (18. nov morgen, ny hjelper)
Den første hjelperen stoppet midt i arbeidet. Det som er gjort etterpå:
- **Commit 0e00f0d (uferdig) er BEHOLDT** etter gjennomlesing og prøving: skyggekartet tegnes høyst `REGLER.perSekund` = 4 ganger
  i sekundet (et nytt utsnitt får det straks), interiøret (`userData.kilde === 'interior3d'`) tar ikke imot sol-skygge (taket ville
  lagt alt inne i skygge), og litt mindre `bias` (ingen skyggeflekker – «acne» – å se på bildene).
- **Flettet med `claude/nattfiks`** (ni andre pakker, også «natur»). Eneste konflikt var skript-taggene i index.html: `lys3d.js` rett
  før `tema.js`, så natur sine `effekter3d.js` og `fjernby3d.js` etter. Versjonsmerkene satt på nytt med versjon.py.
- **Naturs trær og skyggene:** bladkortene har eget dybdemateriale (`TreDeler.dybde()`, alphaTest) – skyggene får kronens form, ikke
  firkantene (sett på bildene). NYTT: `vinterløv()` i lys3d.js gir dybdematerialet samme vinterregel som fargeleggeren (bladfeltet
  faller bort om vinteren, `U.uNakenS` fra `VAER.årstid`), så nakne løvtrær ikke kaster skygge av en full krone. Soldater og
  kjøretøy som natur satte `castShadow = true` på, settes tilbake til av av `merk()` (skyggekartet tegnes bare av og til – ting som
  flytter seg ville fått skygger som henger igjen).
- **Tåke i dalene på Lav:** regningen i `fog_fragment` står nå bak `if (uDalT.x > 0.0)` – uten effektene (Lav, eller «Lys og skygger»
  av) hopper skyggeleggeren over den.
- **Fjern skog om vinteren (fjernby3d.js, pakka «natur»):** holtene over snøgrensen ble knallgrønne (samme faktor 5,2 i alle tre
  kanaler ganget den grønne grunnfargen opp). Nå et mål per kanal (`SNØ = [9.5, 5.2, 10.5]`, Claudes forslag) – hvitt/grått.
  test_fjernby3d.js er grønn.
- Hjelpeteksten sier ikke lenger at terrenget kaster skygge (det gjør det ikke).

### Prøvd i nettleser (Dovre-testsiden, programvare-grafikk)
Skript: scratchpad `natt/lys/f.js` (én nettleser, flere oppsett etter hverandre, så alle vaktene) og `natt/lys/f-sjekk.js` (3D-vaktene
klippet ut av sjekk.js, med effektene PÅ). Bilder: scratchpad `natt/lys/f-pc-*.png` og `f-mob-*.png`.
- PC 1400 × 820: Høy (lufta, lavt, Gå), Middels, Lav, Lav uten effekter, natt kl. 23 (lavt og Gå), vinter, morgentåke – 0 GL-feil
  (`getError() === 0` i hvert bilde), ingen sidefeil (bare driverens «GPU stall due to ReadPixels» fra målingen selv).
  Tid per bilde (programvare-grafikk, samme sted, lavt): Høy 3,4 s, Middels 4,1 s (første bilde etter byttet), Lav 1,48 s,
  Lav med «Lys og skygger» av 1,46 s – Lav er altså ikke tyngre med pakka.
- Mobil 390 × 844: Høy (skyggekart 1024), Gå, Middels (ingen skygger på mobil, som tenkt), Lav 0,58 s per bilde, vinter, natt – 0 GL-feil.
- I testene (navigator.webdriver) er effektene AV ved start (`KVAL.effekterPå = false`, skyggekart 0) – sjekket i begge kjøringene.
- Vaktene i pipeline/fliser/vakter/*.js (alfabetisk, samme side, 3D på): PC 10 av 10 grønne. Mobil 9 av 10: ui.js kastet
  «Cannot read properties of undefined (reading 'getBoundingClientRect')» – telefonlinja (#mkom) hadde ingen synlige knapper mens 3D
  var på i min kjøring (vakta leser `kn[kn.length - 1]` uten å sjekke). Trolig ikke lys (vakta rører ikke 3D-bildet); IKKE undersøkt
  til bunns – prøv ui-vakta på mobil med 3D av.
- 3D-vaktene fra sjekk.js med effektene PÅ (Høy, PC): «billigere terreng», «tåkebildet», «utseende 15. nov» og «filtre i 3D» grønne.
  «bygging i biter» grønn (94 pust, like utsnitt). «minne i 3D» FEIL: teksturer 21 -> 22 etter andre gang 3D av/på (geometrier
  69 -> 69, 0 instansnett glemt). OBS: testserveren ble stoppet ved en feil mens denne vakta gikk (08:07), så resultatet kan være
  forstyrret – men et skyggekart/etterbehandlingsmål som lages på nytt uten å frigjøres er en mulig årsak. KJØR «minne i 3D» PÅ NYTT
  med effektene på før publisering, og se på kastKart()/Filtre-målene hvis den fortsatt feiler.

### Kjent etter ferdigstillingen
- Nakne løvtrær kaster nå tynn skygge, men de fjerne, enkle løvtrærne (lodTrær) er klumper og kaster klumpskygge om vinteren.
- Dybdematerialet til trærne svaier ikke med vinden (skyggekartet tegnes bare 4 ganger i sekundet uansett).
- Etter et bytte fra Høy til Lav står natur sine fjerne skogholt (fjernby3d.js) igjen til neste utsnitt (2435 holt / 29 000 trekanter
  i målingen); et utsnitt bygget på Lav har ingen.
- `renderer.shadowMap.enabled` står på etter at effektene er slått av (ingen lys kaster skygge, så skyggeleggerne har ingen
  skyggekode og det tegnes ikke noe skyggekart – målt likt).

### «minne i 3D» – årsaken funnet (18. nov, etter fristen)
Feilen (teksturer 21 -> 22) var IKKE lys-koden. Sporet med scratchpad `natt/lys/f-minne.js` (gl.createTexture/deleteTexture med
stakk + renderer.properties for å finne THREE-teksturen): for hvert nytt utsnitt ble ett 240 × 160 lerretsbilde liggende –
flaggets bilde fra `spill/oppstart-visning.js` (KROKER.sett3d, flaggstangen ved leiren): materialet ble frigjort, men ikke
`material.map`. Rettet der (én linje). Feilen fantes uten effektene også, men synes bare når leiren ligger i utsnittet.
Skyggekartet (kastKart() frigjør `shadow.map`/`mapPass` når utsnittet bygges på nytt), filtrenes mål og atlaset lekker ikke.
Målt med effektene på (Høy, PC): teksturer 14 – 14 – 14 – 14 over fire runder 3D av/på (før: 16 – 17 – 18 – 19), geometrier 69
hele veien. Vaktene lys og natur grønne etterpå. Selve vakta «minne i 3D» klippet ut av sjekk.js (scratchpad
`natt/lys/f-minnevakt.js`) kjørt to ganger på rad med effektene på: ok begge ganger (teksturer 14 -> 14, geometrier 69 -> 69).

## Runde 4 – hakk (18. nov dag)
Oppgave: hakk når et nytt 3D-utsnitt lastes. Brukerens rapport 17. nov (Iris Xe, Edge, utsnitt 7,3 km): 27 pauser over 50 ms på
20 s, lengste 407 ms; 911 ms i 5 pauser «uten pust (henter høydene og kartet)», 205 ms «uten pust (gjør klar)».

### Slik er det målt
Scratchpad `natt/lys/hakk/m.js` (som `hakk/hakk2.js`: ekte kartdata via `feiljakt/teknisk/skript/dev.py`, /norge, PC 1400 × 800,
grafikk Høy, tegningen slått av – `R3.renderer.render` tom –, lange oppgaver fra PerformanceObserver, pausene mellom bildene delt på
trinn (`R3.steg`) og med/uten pust, og en CPU-profil per lang oppgave; profilen rettes inn etter en merket funksjon `__merke`).
Kameraet flyttes 0,6 utsnitt, og det måles til byggingen er ferdig. Maskinen var svært belastet (sju hjelpere, last 20–30 på fire
kjerner), så tallene varierer mye; se på de største og på hva som står i profilen.
Prøve av at resultatet er det samme: scratchpad `natt/lys/hakk/t-dovre.js` (Dovre ved Jora bru: fingeravtrykk av nettene – summer av
terrengets normaler og indeks, bruenes posisjoner og normaler, husenes normaler, vegene, trærne, kraftlinjene –, brukontrollen fra
sjekk.js, kartbildet på grafikkortet lest tilbake rad for rad, og «bygging i biter» fra sjekk.js med flere tall).

### Før (commit b01c410, Bergen −32117 6734202, /norge, PC, Høy, tegningen av)
- **Utsnitt 7,3 km** (som brukerens, kameraavstand 2400 m, S = 3660), to flyttinger: bygget på 7,7 og 8,6 s; lange oppgaver 8 + 8,
  sum 1507 / 1277 ms, lengste **610 / 516 ms**; pauser over 50 ms 9 + 6, lengste 698 / 567 ms – den lengste er alltid
  «gjør klar uten pust» = slutten av forbered3d + byttet. Profilen i den lengste: bruene i sett3d (infra3d byggBru 98–289 ms),
  opplastingen av kartbildet (texImage2D 46–52 ms), delBakken 34 ms, three-intern 40 ms. Ellers: finnLinje 61–95 ms (bruene
  prøvde alle vegene rundt alle bruene), vegetasjon3d (treslagene) 83 ms, kraft3d 40 ms, vegLinjer 53 ms. «Henter høydene og
  kartet» hadde bare 1 pause på 52–56 ms her.
- **Utsnitt 3,1 km** (kameraavstand 900 m, S = 1560, alt med: hus, veger, trær, kyst, kraft …), én flytting: bygget på 25,8 s,
  48 lange oppgaver, sum 7,0 s, lengste **1534 ms**, 60 pauser over 50 ms. De største: sett3d 1534 ms (bruene 511, søppeltømming
  418, anlegg3d 220, liv3d velgLinjer 78), texImage2D for kartbildet 4096² **269 ms** og vannmasken 66 ms (egne oppgaver),
  gate3d 436 ms, byhus 304 ms, hus3d/naboer 267 ms, finnLinje 263 ms, løftVeger 234 ms, forbered3d husGeometri (normalene)
  172 ms, liv3d lykter 166 ms, kyst plasser 157 ms, terrengGeo (normalene) 128 ms, kraft3d 127 ms, vegetasjon3d vegRute 115 ms,
  delBakken 76 ms, havnivå/søppel 91 ms.

### Hva som er endret (alt gir det samme utsnittet som før – se «Prøvd» under)
- **Bruene i byttet** (infra3d.js): geometrien for bruer og ferjekaier lages nå i `KROKER.forbered3d` som generator (`lagGeo`,
  én bru/kai per bit, normalene i biter), og sett3d legger bare nettene i scenen (`u.infraKlar`; uten forberedelse kjører sett3d den
  samme generatoren i ett). `finnLinje` får bare vegene der bruas første ende ligger høyst 10,5 m fra boksen rundt vegen (`nærEnde`,
  `l.bb` fra `vegLinjer`) – finnLinje forkaster uansett veger lenger unna enn 10 m, så svaret er det samme. `løftVeger`/`ryddTrær`
  er generatorer (kroken: `kjørAsynk`, testene: `løftVeger` = `kjørRett`), og hver veg prøver bare bruene der boksene overlapper
  (de andre ble hoppet over punkt for punkt). Pust mellom flisene i `vegLinjer` og mellom bruene i `modeller`.
- **Normalene i biter** (index.html `normalerG`): samme regning som three.js r128 `computeVertexNormals` – samme rekkefølge, samme
  32-bits mellomlagring, normalisering med `x * (1 / lengde)` –, så normalene er like til siste bit (vakta lys sjekker det), men med
  yield for hver ca. 10 000 trekanter. Brukes i `terrengGeo`, `husGeometri` (nå generator: `kjørAsynk` i forbered3d, `kjørRett` i
  sett3d) og infra3d sin `lagGeo`.
- **delBakken** er generator (`delBakkenG`, yield mellom radene); `delBakken()` gjør alt i ett som før (byttBakke bruker den).
- **hus3d**: `naboerAsynk` (samme rutenett og `Math.hypot` som `naboer()` i kartflis.js, men tallnøkler og pust) – samme tall.
- **Vannmasken**: `vannmaske()` gir punktene sine med (`c.piksler`, alfa er alltid 255 så getImageData ville gitt det samme), og
  bygg3d setter `u.vannData` straks. Før leste den første modulen som trengte den, hele bildet tilbake med getImageData (25–55 ms her;
  på et ekte grafikkort må nettleseren også vente på grafikkortet). NB: `byhus.js` og `gate3d.js` leser fortsatt vannbildet selv med
  getImageData – de kan bruke `u.vannData` (ikke mine filer).
- **Kartbildet og vannmasken til grafikkortet i striper** (index.html `lastOppIBiter`): før `new CanvasTexture(u.base)` +
  `initTexture` = hele lerretet (opptil 4096², 64 MB) lest og sendt i én oppgave (269 ms her for 4096², 46–52 ms for 2048², vannmasken
  66 ms). Nå: DataTexture med samme innstillinger (lineær, mipmap, anisotropi) og tom plass, punktene vi alt har (`u.px` fra bygg3d,
  `u.vann.piksler`) sendes med `texSubImage2D` 256 rader om gangen med pust mellom (UNPACK_FLIP_Y + y = W − rad1 gir samme plass
  som CanvasTexture med flipY), mipmapene lages til slutt. Etterpå er teksturen som en CanvasTexture av lerretet (`image` = lerretet,
  `flipY`, `isDataTexture = false`, så en eventuell ny opplasting sender lerretet som før – og vakta «tåkebildet» sitt
  `R3.tex.image === R3.ut.base` holder). Kaster noe en feil eller mangler punktene, lages teksturen som før. Ingen `gl.getError()`
  i opplastingen: det venter på grafikkortets prosess, og det ville tatt feil som andre har laget (vaktene ser etter dem). `tex.iBiter` = sendt i
  striper. `u.px` slippes etter opplastingen, i sett3d og i kastForberedt.
- **bygg3d**: pust før `tegnInfraPå` og rundt `infraI`/`bruer3d` (de gikk i samme bit som slutten av høydene, trinnet «henter
  høydene og kartet»).
- **kraft3d.js**: pust mellom trafostasjonene, treslagene og radene i ryddebeltet.
- **vegetasjon3d.js**: `vegRuteAsynk` – samme som `Vegetasjon.vegRute` (samme rutenett, bredder og oppslag) med pust mellom vegene;
  `Vegetasjon3d.vegRuteAsynk` for vakta, som sammenligner svarene i 4000 tilfeldige punkter + punkter ved vegene.
- **liv3d.js**: lyktene med `Veg.lykterG` (pust mellom vegene); avstandene langs vegene (`velgLinjer`, 80 ms i byttet i Bergen) regnes
  i forbered3d-kroken (`u.vegD`, generator `vegAvstander`) og brukes i startLiv.
- **kyst3d.js**: plasseringen med `Kyst.plasserG` (pust for hver rad i rutenettene og hvert 64. kystpunkt).
- Fellesfiler endret (små, samlede endringer): **spill/veg.js** – `lykterG` (generator) og `lykter()` = den kjørt i ett, eksportert;
  **spill/kyst.js** – `plasserG` (generator) og `plasser()` = den kjørt i ett, eksportert. Reglene er urørt (test_veg.js og
  test_kyst.js grønne).

### Funn i andre moduler (ikke endret – ikke mine filer)
Fra profilen i Bergen, utsnitt 3,1 km (programvare-grafikk, belastet maskin):
- **gate3d.js** (bygg3d-kroken) 436 ms i ett strekk: `Gate.plasser` 215 ms (`prøv` 111), `finnKryss` 54, `nærHus`/`hindring3d` 53,
  `mal` 51, egen getImageData av vannbildet. Forslag: plasser som generator (som Kyst.plasserG) og `u.vannData` for vannet.
- **byhus.js:145** (gatetrærne, bygg3d) 304 ms: `nærHus`/`hindring3d` 84, getImageData av vannbildet 55, søppeltømming. Forslag:
  `u.vannData`, og `if (børPuste()) await pust();` i løkka.
- **anlegg3d.js** (sett3d!) 220 ms: `bensinstasjon` – `inni` prøver alle husomrissene i utsnittet for hvert forsøk (anlegg3d.js:86,
  114 ms selv). Forslag: `nærHus(u, x, y)`/`hindring3d` (rutenettet), eller flytt plasseringen til bygg3d/forbered3d.
- **portal3d.js** (sett3d) 26 ms, **dyr3d.js** (bygg3d) 61 + 92 ms (`nærGård`, hindringer), **bekker-visning.js** 55 ms.
- Oppgave 3 (natt-modulene): **lys3d.js**, **krig3d.js**, **folk3d.js**, **sjo-visning.js** har ingen bygg3d/sett3d-kroker (bare
  ramme3d) – ingenting å dele opp ved et nytt utsnitt. **effekter3d.js** sin sett3d-krok nullstiller bare tre felt. **fjernby3d.js**
  bygger skogholtene i sett3d og en gang til i ramme3d når fjernringen kommer (`bygg`, ca. 30–35 ms her, ca. 50 000 rutepunkter med
  hash) – under 50 ms, ikke endret.
- **Skyggekartet** (lys3d.js) tegnes i samme bilde som byttet («et nytt utsnitt får det straks»): to tegninger av hele scenen i
  bildet der alle de nye nettene sendes til grafikkortet. Kan ikke måles her. Mulig tiltak: vent ett–to bilder med skyggekartet etter
  byttet (skyggene står da ett bilde på feil sted) – ikke gjort.

### Prøvd – samme utsnitt som før (Dovre-testsiden, Jora bru, PC 1400 × 820)
- **Fingeravtrykket** av nettene er likt før (commit b01c410, kopi i scratchpad `natt/lys/hakk/head`) og etter: terrengets normaler
  (250 563 verdier, sum 77 339,88) og indeks, alle fire infra3d-nettene (posisjoner og normaler), alle 14 husnettenes normaler,
  302 veger (16 271 punkter, samme høyder), trærne per treslag (gran 88 870 … einer 7345), kraftlinjene (102 master, 98 belter).
- **Brukontrollen** fra sjekk.js: 14 bruer, 1 søyle + 28 landkar, 0 svever, 0 for dype, 105 vegpunkter løftet, 8 nødbruer, sprengt
  bru gir 2 stykker og 0 vegpunkter i gapet, hel igjen etterpå – likt før og etter.
- **Kartbildet på grafikkortet** lest tilbake (rammebuffer + readPixels, 9 rader): 4096² kart og 2048² vannmaske er like lerretet i
  alle 147 456 / 73 728 verdier, sendt i striper (`iBiter`), GL-feil 0.
- **Bygging i biter** (som vakta i sjekk.js) med grafikk Høy låst: fire bytter etter hverandre – uforberedt, forberedt, uforberedt,
  forberedt – gir likt terreng (497 664), trær i nettene (38 895), trær per treslag og steiner/busker; 156 pust under én bygging.
  (Første forsøk uten låst grafikknivå ga ulikt terreng: automatisk grafikk gikk ned mens programvare-grafikken tegnet – ikke endringene.)
- Regeltestene test_kyst, test_veg, test_vegetasjon, test_bruer, test_kraft, test_ytelse, test_fjernby3d: grønne.
- **Bergen** (/norge med ekte data, utsnitt 3,1 km, scratchpad `natt/lys/hakk/t-bergen.js`): uforberedt og forberedt bytte gir likt
  terreng (normaler og land/vann-grupper), husnettenes normaler, 17 355 trær, 3042 veger, 6988 gatelys, kysten (260 båter, 7 naust,
  40 brygger), 3 trafostasjoner, 59 bruer, 1237 skogholt, like mange nett per modul, og like summer av posisjoner og normaler for
  bruene, kysten og kraftlinjene. Bare liv3d sin sum skilte i 7. siffer – fuglene og røyken (Points) flytter seg mellom målingene.
  Kartbildet sendt i striper i det forberedte byttet.
- **Vakta lys** (`pipeline/fliser/vakter/lys.js`), prøvd på Dovre-testsiden med 3D på: PC 1400 × 820 grønn (43 s – det meste er de
  gamle bildene med effektene; runde 4-delen tar et par sekunder), mobil 390 × 844 grønn (21 s), og med 3D av grønn. (I Bergen med
  tegningen slått av feiler den på «skyggekartet er ikke på» – det kommer av at prøveskriptet slo av tegningen, ikke av koden.)
- Senere samme dag (commit 596f9d6): **veg.js** `finnKryssG` (generator, `finnKryss()` som før) – liv3d bruker den i bygg3d-kroken
  (lyktene) og i forbered3d (`byggVeger`); vegnettenes normaler med `normalerG` (`nettG` i liv3d.js); kartbildets bunnfarge
  (`fillRect` på hele 4096², 60 ms) fylles i striper på 512 rader med pust – flisene tegnes først når den er ferdig (`await bunn`);
  `naboerAsynk` og `løftVeger` (lange veger: yield hvert 256. punkt) i mindre biter.

- Til slutt (etter målingene i Bergen med 7,3 km-utsnitt, der dette sto igjen i byttet): **kraft3d.js** – trafostasjonene
  (`trafoGeo`, opptil 200 ms i byttet under last) lages i forbered3d-kroken (`u.trafoKlar`, pust mellom stasjonene; hindringene fra
  `u.klar.hindre`, de samme som `R3.hindre` blir i byttet). **fjernby3d.js** – punktene for skogholtene (`punkterG`, generator med
  yield per rad) lages i forbered3d-kroken (`u.fjernbyKlar`, brukt når utsnitt og grafikknivå stemmer), ikke i byttet (50–70 ms
  under last). Ingen `gl.getError()` i `lastOppIBiter` (synkroniserer med grafikkortets prosess).

### Etter – målt (Bergen, utsnitt 3,1 km, to flyttinger hver)
Maskinen ble svært belastet mens jeg målte (last 20–25 på fire kjerner, mot ca. 3 under før-målingen kl. 10:52), så alt tar 2–5 ganger
så lang tid som før-målingen. Derfor målte jeg den gamle koden (kopien i scratchpad `natt/lys/hakk/head`) og den nye rett etter
hverandre under samme last (`før2-b900.log`, `etter-b900.log`, `etter2-b900.log`):

| (Bergen 3,1 km, belastet maskin) | gammel kode | ny kode (2 målinger) |
|---|---|---|
| byttet («gjør klar uten pust», bildet står) | 1455 / 1438 ms | 504 / 431 · 583 / 499 ms |
| sett3d alene (største) | 1258 / 1261 ms | 291 / 248 · 384 ms |
| lengste lange oppgave | 1384 / 1434 ms | 493 / 1016 · 664 / 770 ms |
| lange oppgaver ≥ 50 ms, sum | 155 / 187, 27,0 / 34,2 s | 93 / 107, 10,6 / 12,8 s · 153 / 86, 19,0 / 10,5 s |
| tid til utsnittet er bygget | 55,6 / 70,7 s | 36,8 / 39,1 s · 53,0 / 34,4 s |

Største bidrag i én lang oppgave per funksjon (gammel → ny, samme last; `sammenlign.js`): bruene i byttet 167 → (i forberedelsen,
34–139 i biter), finnLinje 390 → 0, løftVeger 956 → 17–148, naboer (hus3d) 980 → 18–90, vegRute 211 → 7–56, lykter 193 → 19–52,
kyst plasser 592 → 55–138, delBakken 64 → 0–11, fillRect 222 → 42–77, velgLinjer → 0.
Det som står igjen i byttet (ikke mine filer): anlegg3d bensinstasjon 60–130 ms, fjern3d.js `bygg` 82–106 ms, portal3d 65 ms, og
merkingen av kilden i `R.scene.add` (ytelse.js, en stakk per nett) ca. 25 ms under last. Mine: kraft3d sin sett3d (mastene) ca. 60 ms
under last.

**Kartbildet i striper – kan ikke avgjøres her.** Med programvare-grafikk (SwiftShader) koster det like mye i sum, og den første stripen
bærer nesten hele kostnaden (scratchpad `natt/lys/hakk/tex-bench.js`, tvunget ferdig med readPixels: hele lerretet 1158–1367 ms;
striper à 256 rader: første 696–950 ms, resten ca. 50 ms, mipmap 160–270 ms). SwiftShader lager altså hele teksturen ved første
skriving. På et ekte grafikkort er det ikke slik (plassen lages på grafikkortet), og den gamle veien måtte lese hele lerretet
(64 MB) og snu det i nettleseren i ett strekk. BE BRUKEREN om en ny «Mål hakk»-rapport: står `lastOppIBiter` som sted i en lang pause,
kan stripene gjøres mindre, eller den gamle veien tas tilbake (bare `lastOppIBiter` som gir null).

### Etter – målt (Bergen, utsnitt 7,3 km som brukerens, to flyttinger hver, samme last, gammel kode rett før ny)
| (Bergen 7,3 km, belastet maskin) | gammel kode | ny kode |
|---|---|---|
| byttet («gjør klar uten pust») | 1271 / 884 ms | 618 / 361 ms |
| sett3d alene | 857 / 762 ms | 384 / 219 ms |
| lengste lange oppgave | 909 / 836 ms | 496 / 428 ms |
| lange oppgaver ≥ 50 ms, sum | 27 / 41, 4,2 / 5,1 s | 31 / 37, 3,4 / 4,1 s |
| «henter høydene og kartet» uten pust | 19 / 30 pauser, sum 2,5 / 3,1 s, lengste 472 / 277 ms | 18 / 17, sum 2,2 / 1,8 s, lengste 434 / 245 ms |
finnLinje 515 → 0, bruene i byttet 372 → 85 (nå i forberedelsen), delBakken 137 → 0, kartbildet 92 (én opplasting) → høyst 47 per stripe.
I det som sto igjen i byttet var trafostasjonene (kraft3d `trafoGeo` 207 ms) og fjernby3d (51–68 ms) mine – de er flyttet til
forberedelsen etterpå (ikke målt i Bergen etter det, se «Prøvd» for at utsnittet er det samme).

### Sluttmåling med alt (commit 5da88f5, Bergen 7,3 km, lasten hadde falt til ca. 9–12)
Sammenlign med før-målingen øverst (gammel kode, last ca. 3 – altså lettere forhold for den gamle koden):
| (Bergen 7,3 km) | før (b01c410, last ≈ 3) | etter (5da88f5, last ≈ 9–12) |
|---|---|---|
| byttet («gjør klar uten pust») | 698 / 567 ms | **285 / 219 ms** |
| lengste lange oppgave | 610 / 516 ms | **205 / 196 ms** |
| lange oppgaver ≥ 50 ms, sum | 8 / 8, 1,5 / 1,3 s | 14 / 10, 1,1 / 0,9 s |
| sett3d alene | – | 170 / 94 ms |
| tid til utsnittet er bygget | 7,7 / 8,6 s | 7,2 / 8,7 s |
| «henter høydene og kartet» uten pust | 0–1 pause, 52 ms | 7 / 5 pauser, sum 586 / 496 ms, lengste 165 ms (last) |

Bergen 3,1 km (alt med), samme sluttmåling:
| (Bergen 3,1 km) | før (b01c410, last ≈ 3) | etter (5da88f5, last ≈ 10) |
|---|---|---|
| byttet («gjør klar uten pust») | 1670 / 350 ms | **380 / 283 ms** |
| lengste lange oppgave | 1534 / 430 ms | **433 / 395 ms** |
| sett3d alene | 1025 ms (største) | 226 / 151 ms |
| tid til utsnittet er bygget | 25,8 / 27,0 s | 25,7 / 27,0 s |
De lengste som står igjen er ikke mine: gate3d 433 ms (Gate.plasser 162, finnKryss 73), bekker-visning 273 ms, byhus 254 ms,
søppeltømming 206 ms, dyr3d 101 ms; i byttet anlegg3d (bensinstasjonene) 22–54 ms og fjern3d 24 ms, og i samme bilde som byttet
tegnInfra3d (navn og merker, hoyde3d i bakÅs/brupunkt3) 95 ms. ytelse.js sin merking i `R.scene.add` ca. 12 ms.

### «Henter høydene og kartet» – det brukeren så mest av (911 ms i 5 pauser)
Her er nesten ikke byggekode igjen: høydene hentes og kartbildet lages i bakgrunnstråden. De lange pausene i dette trinnet var her
søppeltømming (opptil 244 ms i én oppgave under last), bildeløkka selv (kompass.js `tegnMini` – minikartet tegnet fra utsnittets
4096²-lerret: 28–143 ms per gang; `tegnInfra3d`/`infraViktig` – navn og merker for infrastrukturen i 3D: opptil 49 ms uten last i
Bergen), og arbeid uten JavaScript-stakk («(program)», 60–120 ms, rett etter at byggingen starter – nettleserens eget arbeid: trolig
minnet til det nye lerretet, bildene fra bakgrunnstråden eller Blinks søppeltømming; kan ikke deles opp fra JavaScript).
Under samme last var den nye koden ikke verre her enn den gamle (19 / 30 mot 18 / 17 pauser); at sluttmålingen har flere pauser i
dette trinnet enn før-målingen, kommer av lasten (9–12 mot 3). Rettet her:
bunnfargen på kartbildet i striper (fillRect 60 ms), pust rundt `tegnInfraPå`/`infraI`/`bruer3d`. IKKE rettet (ikke mine filer):
minikartet bør tegnes fra en liten kopi av kartbildet (lages én gang per utsnitt) i stedet for fra hele lerretet hver gang;
`tegnInfra3d` bør ikke regne alle objektene hver ramme. Søppeltømmingen kommer av de store tabellene per utsnitt (kartbildet 64 MB,
høydene, nettene) – kan bare bli mindre med gjenbruk av tabeller, ikke gjort.

### Ikke gjort
- Oppgave 4 (skygger fra kjøretøy, soldater og dyr på Høy): **droppet etter måling**. Skyggekartet tegnes bevisst bare når kameraet
  har flyttet seg (høyst 4 ganger i sekundet). Ting som beveger seg må ha et nytt skyggekart i hvert bilde for ikke å få skygger som
  henger igjen, og det betyr at alle som kaster skygge (terreng, trær, hus …) tegnes én gang til per bilde – et eget lys bare for dem
  er ikke lov (nye skyggeprogrammer). Målt (scratchpad `natt/lys/hakk/t-skygge.js`, Dovre ved laget, lavt kamera, Høy, effektene på,
  139 kastere, skyggekart 2048): 836 ms per bilde uten og 2355 ms med skyggekartet tegnet hvert bilde (median av 4, programvare-
  grafikk) – langt over 5 %. Billigere vei om det ønskes: en myk mørk flekk under hver enhet (som treskyggene), uten skyggekartet.
- Skyggekartet i samme bilde som byttet (se over) og teksturopplastingens virkning på et ekte grafikkort: kan ikke måles her.
- Andres moduler med lange steg (gate3d, byhus, anlegg3d, portal3d, fjern3d, kompass-minikartet): bare funn og forslag over.

## Runde 4, del 2 (18. nov dag) – de tunge stegene i andres filer
Koordinatoren ga meg filene der jeg fant tunge steg (gate3d/gate, byhus, bekker-visning, anlegg3d, fjern3d, portal3d, kompass og
tegnInfra3d i index.html). Rekkefølge etter størrelse. Alt skal gi det samme som før.

### Endringer
- **gate.js / gate3d.js** (433 ms i ett strekk): `Gate.plasserG` (generator – yield mellom vegene, byggene og kryssene; `plasser()`
  kjører den i ett og gir det samme, test_gate grønn) og `vegRuteG`; gate3d-kroken bruker `kjørAsynk`, kryssene med
  `Veg.finnKryssG`, hindringene med tallnøkler og pust (`hindre` er async), pust mellom husflisene, og vannmaskens punkter
  (`u.vannData`) i stedet for getImageData.
- **byhus.js** (gatetrærne, 254–304 ms): `u.vannData` i stedet for getImageData, pust mellom vegene, og de billige prøvene (vann,
  avstand til andre gatetrær, tetthet) før `nærHus` – samme trær (prøvene er uten bivirkninger, rekkefølgen endrer ikke svaret).
- **bekker-visning.js** (273 ms): pust i alle løkkene i bygg3d-kroken (linjene, masken, silingen av trær per treslag, gresskartet
  per 32 rader, vannbåndet) – samme resultat.
- **anlegg3d.js** (bensinstasjonene i byttet, 30–220 ms): `inni` prøvde alle husomrissene i utsnittet for hvert punkt. Nå et rutenett
  på 32 m etter boksen rundt hvert omriss (`omrissVed`, WeakMap per omrissliste) – et punkt utenfor boksen er aldri inni, så svaret er
  det samme.
- **kompass.js** (minikartet, 28–140 ms 4 ganger i sekundet): en kopi av kartbildet på 1024² lages én gang per utsnitt (WeakMap per
  kartbilde, slippes med utsnittet) og brukes når minikartet viser mer enn to kildepunkter per skjermpunkt; helt nært brukes det fulle
  bildet som før. Kopien skaleres med høy kvalitet – minikartet blir likt eller jevnere (ikke likt bit for bit: før hoppet
  nedskaleringen over punkter). Kopien lages i åtte striper, én per bilde (i ett strekk tok den 94 ms i bildet rett etter byttet);
  til den er ferdig, tegnes minikartet fra det fulle bildet som før.
- **index.html tegnInfra3d** (navn og merker i 3D hver ramme): `proj3` og `brupunkt3` projiserer punktet først (`projFørst`) og gir null
  for punkter bak kameraet før de dyre siktlinjene (`bakÅs`: 15 høydeoppslag, `bakHus`) – samme svar, men omtrent halvparten av
  objektene slipper siktlinjene.
- **fjern3d.js** (fjernringen, 50–250 ms i ett strekk når høydene kom): pust mellom radene, normalene med `normalerG` (likt bit for
  bit), fargene i biter (`fargeleggG`; `fargelegg()` i ett som før når været endres), og byggingen gir opp hvis et nytt utsnitt er bedt
  om imens.
- **portal3d.js** (25–65 ms i byttet): én mal per tunnelbredde (laget én gang), en kopi per portal som dreies og flyttes (samme tall),
  og alt lages i forbered3d-kroken (`lagG`, generator); sett3d legger bare nettet i scenen.
- Etter første måling av del 2 (det som sto igjen i byttet): **anlegg3d.js** – bensinstasjonene (nærmeste veg, plassen og nettene)
  lages i forbered3d-kroken (`u.bensinKlar`); **bekker-visning.js** – vannbåndet som nett lages i forbered3d-kroken (`båndGeo`,
  generator, med terrengnettet som byttet setter inn: `u.klar.geo`), normalene med `normalerG`; **index.html `småting`** (biler,
  flagg, lykter ved husene) – matrisene regnes én gang per slag og kopieres inn i hver del (før sju ganger for bilene), samme tall;
  **kompass.js** – bredden på minikartet fra en ResizeObserver i stedet for `clientWidth` hvert bilde (det tvang nettleseren til å
  regne ut siden på nytt: opptil 140 ms i ett bilde under bygging).

### Prøvd – likt før og etter (Bergen, /norge, utsnitt 3,1 km; scratchpad `natt/lys/hakk/t-del2.js`)
Gammel kode (rett før del 2, kopi i scratchpad `natt/lys/hakk/head2`) og ny kode, både første utsnitt, uforberedt og forberedt bytte:
like gatemøbler (benk 236, søppel 484, sykkel 184, skur 72, skilt 52, postkasse 6 verdier – med summer), løvtrær med gatetrærne
(27 480 verdier, 1500 gatetrær), bekkene (6 bånd) og vannbåndets nett (4345 punkter, 6904 trekanter – posisjoner, normaler og farger),
`iBekk` i 20 000 punkter, småtingene ved husene (matriser og farger i alle 13 nettene), bensinstasjonene (to, alle nett), fjernringen
(16 641 punkter – posisjoner, normaler og farger), tunnelportalene (8580 punkter) og navnene i 3D (`proj3`/`brupunkt3` for 141 objekter
fra tre kameraer, samme skjermpunkter). Ingen sidefeil. Regeltestene test_gate, test_byhus, test_bekker, test_kompass, test_fjern3d grønne.
Minikartet (scratchpad `t-mini.js`, Dovre, 4096²): snittforskjell 1,1–2,1 av 255 per farge mellom fullt bilde og kopien (kopien er
jevnere); her var tegningen fra det fulle bildet bare 1–2 ms (programvare), så gevinsten der kan ikke vises på denne maskinen.

### Målt – før og etter del 2 (Bergen 3,1 km, samme last ca. 7–9, rett etter hverandre; `d3før-b900.log`, `d3etter-b900.log`)
| (Bergen 3,1 km) | før del 2 | etter del 2 |
|---|---|---|
| lange oppgaver ≥ 50 ms, sum | 57 / 19, 6,1 / 1,7 s | **18 / 17, 1,3 / 1,3 s** |
| lengste lange oppgave | 812 / 234 ms | **157 / 187 ms** |
| byttet («gjør klar uten pust») | 988 / 254 ms | under 50 ms (ingen slik pause; lengste pause i trinnet 179 / 219 ms med pust) |
| sett3d alene | 401 ms | 135 ms |
| pauser over 50 ms | 72 / 27 | 20 / 21 |
| «henter høydene og kartet» uten pust | 22 / 9 pauser, 2,2 / 0,7 s | 0 / 3 pauser, 0 / 0,18 s |
| tid til utsnittet er bygget | 25,6 / 16,6 s | 17,0 / 16,5 s |
Første flytting før del 2 var tyngre enn den andre (søppeltømming 307 ms, gate3d, byhus); i del 2-målingen var det ingen slike.
Det som står igjen over 100 ms: hus3d (78 ms selv), sett3d 130–135 ms (liv3d `startLiv`/`velgLinjer` ca. 25, vegetasjon3d sin
sett3d ca. 23, merkingen i `R.scene.add` (ytelse.js) ca. 20), og kartbildet i striper (én stripe 83 ms med programvare-grafikk).
Dovre-testsiden etter del 2 (`t-dovre.js`): fingeravtrykket fortsatt likt koden fra før runde 4, «bygging i biter» lik (133 pust),
kartbildet likt lerretet, brukontrollen som før, ingen sidefeil.

## Runde 4, del 3 (18. nov dag)
### 1. Merkingen i `R.scene.add` (ytelse.js)
`userData.kilde` trengs ikke bare til «Mål ytelse»: lys3d.js bruker den til å velge hva som kaster skygge (`STILLE`), og vaktene i
sjekk.js teller nettene per fil («bygging i biter» krever liv3d-nett, «kilder»-vakta). Den må derfor settes hele tiden, også i
testene – å sette den bare mens det måles ville endret skyggene og vaktene. I stedet er hver merking billigere (`kildeNå`): først en
kort stakk (`Error.stackTraceLimit = 5`: de tre nærmeste rammene utenfor ytelse.js), og hele stakken bare når den korte ikke har noen
spill/-fil (dvs. når kilden blir «index» eller ligger dypere). Første treff i den korte stakken er første treff i hele, så svaret er
det samme; den hele stakken får én ramme ekstra for `kildeNå` selv, så vinduet er det samme som før. Nettlesere uten
`Error.stackTraceLimit` (Safari, Firefox) får hele stakken som før. «Mål ytelse» grupperer etter fil som før; utsnittet trenger ikke
bygges på nytt. Målt i Node (V8, dybde 12): 17–23 µs per merking med hel stakk, 6–11 µs med kort. I et bytte i Bergen: 280
merkinger, 223 avgjøres av den korte stakken (57 blir «index»).
Prøvd: alle 308 objektene i scenen etter et bytte i Bergen har samme kilde før og etter (samme fordeling: index 57, liv3d 95,
natt3d 42, vind3d 32, vegetasjon3d 12, anlegg3d 10, gate3d 10, kraft3d 6, kyst3d 5, infra3d 4, bane3d 4, bekker-visning 1,
portal3d 1, dyr3d 1; samme sjekksum over hele lista).

### 2. hus3d
Den lange biten var ikke husene selv (de har pust for hvert 16. bygg), men rutenettet over gatene (`GATE`, et punkt hver 3. m langs
alle vegene i vektorflisene) og midtpunktene, regnet for alle flisene i ett strekk med tekstnøkler. Nå tallnøkler (`gnk`, samme ruter)
og pust mellom flisene i begge løkkene.

### 3. liv3d og vegetasjon3d i byttet → forbered3d
- **liv3d.js:** linjene bilene og folkene bruker (`velgLinjer`, nå generator `velgLinjerG`, samme rekkefølge) lages i forbered3d-kroken
  (`u.livLinjer`); startLiv bruker dem. Bildet av billysenes lyskjegle (2048 småruter med fargetekst) tegnes én gang og brukes av alle
  utsnitt. `Liv3d.start()` gir hvor bilene og folkene startet (for prøvene).
- **vegetasjon3d.js:** matrisene og fargene for de seks nye treslagene (`treslagMatriser`, generator, yield for hvert 1024. tre) lages i
  forbered3d-kroken (`u.treslagKlar`); sett3d bruker dem bare når treslagslistene er de samme (ellers lages de på nytt).
