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
