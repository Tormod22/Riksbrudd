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
  `R3.tex.image === R3.ut.base` holder). Feiler noe (WebGL-feil, mangler punkter), lages teksturen som før. `tex.iBiter` = sendt i
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
