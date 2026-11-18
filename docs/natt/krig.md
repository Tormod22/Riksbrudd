# Pakke «krig» (nattarbeidet 18. nov)

Alle tall er **Claudes forslag** og ligger i `Krig.REGLER` (spill/krig.js), `Formasjon.TYPER` (fart) og `Enheter.REGLER.roller`.

## Filer
- **Nye:** `spill/krig.js` (regler uten DOM, `pipeline/fliser/test_krig.js`, 50 sjekker), `spill/krig-visning.js` (`window.KrigSpill`),
  `pipeline/fliser/vakter/krig.js`, `docs/natt/krig-hjelp.json`.
- **Endret (eies av pakka):** formasjon.js / formasjon-visning.js (marsjfart, erfaring per ildrunde), strid-visning.js (`s.egetValg`),
  enheter.js / enheter-visning.js (roller), fraksjoner-visning.js (`AI.nytt`, `AI.fred`, `AI.hvile`), tropper.js (utstyret «nattsikt»),
  lagring.js (fiendens lag, minne, stillinger, marsjmål, fanger, bakhold).
- **Fellesfil:** `index.html` – (1) i `sim()`: marsjfarten ganges med `KROKER.fart` (ny krok, lista lages av formasjon-visning.js);
  (2) to skript-tagger rett før `spill/kaier.js`.

## I testene
`KrigSpill.auto()` = `!navigator.webdriver || KrigSpill.test === true`. Når den er usann (kontrollskriptet), er de nye
stridsfaktorene (flanke, hus, væremåte, natt, sårede-fart, formasjonsfart, stridsvognas ekstra treff mot stillinger) lik 1, og
ingenting skjer av seg selv (overgivelse, stell, radiosamband, beleiring, bygdevern, røvervarianter, dronevarsel i loggen).
Det spilleren selv setter i gang (røyk, lys, støy, bakhold, artilleri, våpenhvile, helikopter, avhør) virker alltid.

## A. Forbedringer
| Punkt | Hva | Hvor |
|---|---|---|
| Retning teller | Skudd i flanken ×1,25, i ryggen ×1,5 (nedgravd: halve overtaket). Et lag som står stille, snur seg 12°/min mot den det skyter på / blir skutt av. Panelet: «beskutt i flanken/ryggen». | `Krig.flanke/snu`, KROKER.ild + sim |
| Formasjon gir fart | Kolonne ×1,1 (×1,2 ved veg), linje ×0,85, spredt ×0,9, kile ×1. | `Formasjon.fart`, KROKER.fart |
| Erfaring | Telles per ildrunde (hvert nye skudd i SKUDD én gang, 5 min erfaring per runde), ikke per minutt på klokka. | `Formasjon.runde` |
| Eget initiativ | `s.egetValg = { hva, grunn, t }` vises i lagpanelet i tre timer: «kl. 14:20 av seg selv: trakk seg tilbake – …». | strid-visning.js, krig-visning.js |
| Dekning bak hus | Lag som står stille i tettbebyggelse (terrengklasse 7) tar treff ×0,7. Panelet: «i dekning bak hus». (Ikke husomriss – en billig regel.) | `Krig.husVern` |
| Stridsvogn/artilleri | Stridsvogna: treff ×1,8 mot lag i skyttergrav/stilling, river stillingen (50 % per treff), og skyter på fiendens kjøretøy når ingen lag er i sikte. Salver river stillinger innen 100 m. Rollen står i kjøretøypanelet. | enheter.js / enheter-visning.js |
| Sårede | −6 % marsjfart per såret (minst ×0,6). Ved leiren (300 m, stille): én frisk per 180 min, med sykestue som virker per 30 min. Helikopteret kan hente laget. | `Krig.sårFart/stell` |
| Fanger | Fiendelag som er knust (6 ute, seige førere 8) med et eget lag innen 300 m, eller omringet (egne på to kanter innen 600 m) og under halv styrke, gir seg. Fangene følger laget (marsj ×0,9) og leveres ved leiren. | `Krig.girSeg`, `KrigSpill.overgi` |
| Førere | Fiendens lag viser «fører: Navn (pågående/forsiktig/slu/seig)» – væremåten følger navnet og gir små faktorer. | `Krig.væremåte` |
| Røverne | Bølge 1 rett på; siden på rundgang: fra to kanter (halvparten speiles gjennom leiren; krever to lag), sabotasje (ett lag går mot aggregat/tank/radiomast/lager, skader bygget 60 % og stikker av), venter på mørket (står til natta, har nattsikt, høyst 8 t), rett på. | `Krig.røverVariant`, røvere() |
| Lagring | «riksbrudd-verden» har nå fiendens lag (AI-lag og patruljen; ikke røvere/poster), AI.minne, STILLINGER og målet for egne marsjer (planlegges på nytt etter lasting). | lagring.js |

## B. Nye ideer
- **21 Etterretning:** `T.etter` = meldinger per fiendelag (sett av egne, drone, radio, avhør), tegnes som stiplet rute med «?» i kartet
  når du ikke ser laget, og listes i Leir → Mål («Etterretning og avtaler», «Vis»). Radiomast som virker: hvert 30. min 35 % sjanse
  per AI-lag innen 15 km (sted ±500 m). Avhør av fanger: 60 min, gir alle lagene til fraksjonen i fire timer.
- **22 Natt:** kl. 22–04:30 (glir over 1,5 t) ser alle ×0,45. Utstyret «Nattsikt» (400 000 kr, troppebyggeren) eller en lysrakett opphever det.
- **23 Artilleri fra lag:** «Tiltak → Kall inn artilleri …» – laget må ha radiomann/radio og se målet; salven er observert.
- **24 Røyk, lys, støy:** to av hver per lag, fylles ved leiren. Røyk 120 m i 15 min (treff ×0,4 på den som står i den, ×0,5 ut av den),
  lysrakett 800 m i 10 min, støy (høyst 1,5 km fra laget) setter AI.minne[side].sist for fraksjoner med lag innen 3 km.
- **25 Bakhold:** «Legg bakhold ved vegen» – fiendens kjøretøy innen 200 m stoppes, de om bord tar en dobbel ildrunde, og er ingen
  igjen til å forsvare det, blir kjøretøyet ditt («Erobret lastebil»).
- **26 Beleiring:** egne lag på to kanter (≥ 100°) innen 1,5 km av et tettsted fienden eier: garnisonen får ikke ammunisjon,
  etter 6 t skyter den ×0,7, etter 12 t gir den seg. Sprengt kraftverk (hvor som helst – forenkling) = ×1,5 fortere.
- **27 Våpenhvile:** Leir → Mål: 5 mill. kr for 24 t (×1,5 per avtale, ×2 etter brudd). `AI.fred[side]`: ingen ild begge veger,
  AI-en ser ikke lagene dine som fiender og går ikke mot leiren. «Bryt» finnes. AI-en bryter aldri selv.
- **28 Bygdevern:** nøytralt tettsted + eget lag inne: vern på 3–14 mann (1 per 150 innbyggere). Så lenge vernet står, tas ikke stedet,
  og hver kamprunde skyter de (6 % per mann) og laget tilbake. Avtale (2000 kr per innbygger, 0,5–8 mill.) eller knus dem (moral −5).
  Abstrakt – ikke egne lag i kartet. Gjelder bare spilleren, ikke AI-fraksjonene.
- **29 Helikopter:** «Hent med helikopter» / «Fly ut med helikopter …» i Tiltak (50 000 kr, 200 km/t, 60 km, 12 mann). Krever at
  helikopteret i spill/kjor.js finnes og at du ikke sitter i det. Vises som «H» i kartet; 3D-modellen i leiren flyttes ikke.
- **30 Droner:** en drone i lufta melder lag den ser (etterretning + varsel i loggen hvert 20. min per lag), og «Se gjennom» i
  Leir → Mål flytter kartet til dronen og åpner 3D ovenfra.

## KrigSpill (API)
`test`, `auto()`, `T()` (fanger, etter, fred, vern, beleiring, raid), `overgi(lag, til, grunn)`, `avhør(i)`, `settFri(i)`, `røyk(lag)`,
`lys(lag)`, `støy(lag, X, Y)`, `kallInn(lag, X, Y)`, `fred(side)`, `brytFred(side)`, `fredPris(side)`, `vernAvtale(id)`,
`heliHent(lag)`, `heliFly(lag, X, Y)`, `heliFins()`, `seDrone(i)`, `visTiltak(lag)`, `nullstill()`, `steg.*`. Lagres i «riksbrudd-krig» per leir.

## Runde 2 (samme natt)
- **Sabotørene:** slipper de unna, tas belønningen fra spillet-visning.js tilbake (og moral −5): «Sabotørene slapp unna – da ble det ingen
  belønning for dette angrepet.» (`V.slapp`/`V.trukket` i `T.raid`).
- **Dekning bak ekte hus:** `husSjekk()` spør `finnBygg` i midten og åtte punkter 14 m rundt et lag som står stille (én gang per sted) ->
  `s.vedHus`. Dekning = terrengklassen tettbebyggelse ELLER `vedHus` (`Krig.husVern(klasse, marsj, vedHus)`, `Krig.husPunkter`).
- **Væremåten i AI-ens valg:** `Fraksjoner.velg` tar `overtakF` (pågående 0,85, forsiktig 1,25) – terskelen for å angripe.
- **Egne lag kan gi seg:** Tiltak → «Knust og omringet: aldri gi seg / gi seg» (`s.krig.overgi`, lagres). Seks ute og fiender på to kanter
  innen 600 m -> laget er tapt. Valget ligger IKKE i Stridsregler-panelet fordi kontrollskriptet krever nøyaktig sju valg der
  (`str.valg === 7`) – flytt det dit (Strid.VALG) når sjekk.js kan endres.
- **Bygdevernet gjelder alle:** også motstandernes lag må slå vernet (de kan ikke gjøre avtaler). Vernets treff er 4 % per mann og runde.
- **3D:** `spill/krig3d.js` (KROKER.ramme3d) – røyken som seks myke flak per sky (høyst 8 skyer), lysraketten som ett lysende punkt
  som synker (høyst 4). Sprites, ingen lys. `Krig3d.antall()`.
- **Prøvd på /rogaland med ekte data** (leir 15607, 6622779, 990 tettsteder): AI-en i 8 spilltimer med alt slått på – begge fraksjonene
  holdt startstedet, de andre lagene marsjerte mot nye tettsteder hele tiden, forsterkninger kom etter seks timer, ingen overgivelser,
  ingen sidefeil. Bygdevern med makt (Hjelmelandsvågen) og med avtale (Vikedal, 1 mill. kr), dekning ved et ekte hus, og beleiring
  (svekket etter 6 t, ga seg etter 12 t) virket.

## IKKE gjort / svakheter
- Ingen dekning bak leirens egne bygg (bare kartets hus og tettbebyggelse).
- Fangene kan bare avhøres eller settes fri (ingen bytte, arbeid eller rekruttering).
- Kjøreordre for kjøretøy, røvere i et pågående angrep, røyk/lys og helikopter i lufta lagres ikke.
- Ingen 3D for helikopterfrakt eller etterretningsmerker (bare 2D-kartet).
- Våpenhvile på /rogaland: lagene i prøven så ikke hverandre (skog, dårlig vær), så «ingen kamp under hvilen, kamp etter brudd» er bare sett på kroknivå (ild = 0) og i AI-ens valg.
- En første prøve av beleiring midt i et tettsted der fienden og bygdevernet også sloss, startet ikke ringen – ikke gjenskapt i ren prøve.
