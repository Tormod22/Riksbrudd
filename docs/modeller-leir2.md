# Leirmodeller, runde 2 (22. nov 2026, økta på brukerens PC)

Lista: docs/modeller-liste.md del A–C (punkt 1–114), ★ først. Gren `claude/lokal-modeller`. Del D–G gjøres av skymaskinene.

## Slik henger det sammen
- Nye og bedre modeller ligger i `site/dovre-fliser/spill/modeller-leir2.js` (lastes etter `tegninger.js` i index.html, og på testsiden
  `spill/modeller-visning.html`). Den bruker hjelperne i `modeller.js` (`MODELLER.H`, eksportert 22. nov).
- `MODELLER.LEIR2[modellnavn](b)` gir geometrien for bygget `b` (nivå 1–3 synes der lista sier det). `leir-visning.js` `modell()` spør
  her først, før de gamle `EGNE`-modellene og `MODELLER[navn]`.
- Detaljnivå: modeller over 1000 trekanter får en enklere utgave i `geometry.userData.fjern`. En `KROKER.ramme3d`-krok nederst i fila
  bytter til den enkle utgaven lenger enn 165 m unna og tilbake innen 145 m (hvert 0,3 s). Når en av dem frigjøres, frigjøres begge.
- Samme fotavtrykk, dører og høyder som før, så interiøret (`interior3d.js` LEIRBYGG), hindringene og 2D-kartet stemmer.
- Selskapets farger (skilt, striper) leses fra flagget: `OppstartSpill.tilstand().fraksjon.flagg`.

## Målinger («Mål ytelse», Intel Iris Xe, Edge/Chrome på Windows, 823 × 596 punkter, høy grafikk)
Testleir i Dovre-piloten (196400 6898900) med 21 ferdige leirbygg, kamera 131 m over bakken, utsnitt 3,4 km. Før = de gamle
modellene (MODELLER.LEIR2 tømt), etter = de nye. Skjermens tak er 60 bilder/s; tallene er per tegning (bildet tegnet 16–32 ganger).

| Del | Hele bildet | Leiren: trekanter | Leiren: kall | Leiren sparer |
|---|---|---|---|---|
| Før | 3,1–4,2 ms | 12 328 | 31 | 0,5 ms |
| Etter del 1 (A1–A10) | 3,1–3,6 ms | 17 318 | 31 | 0,5 ms |
| Del 2, 28 bygg: før (gamle modeller, de 5 nye usynlige) | 2,7–3,1 ms | 12 780 | 30 | −0,1 ms |
| Del 2, 28 bygg: etter | 2,6–3,4 ms | 20 738 | 37 | 0,6 ms |

## Nye leirbygg
Registreres i `NYE` i modeller-leir2.js (Leir.BYGG med modell = id, Ikoner.BYGG, Leir2d.STIL og gruppe i byggelista via
`window.LEIR2_GRUPPER`, som leir-visning.js leser). Pris, tid, strøm og materialer er Claudes forslag. De fleste har ingen egen
virkning ennå (teksten sier det) – bare strømforbruk. Ting i leiren (del C) er billige pyntebygg i gruppen «Ting i leiren»; samme
ting får fast variant etter byggets id (stående/liggende/stablede fat, antall paller …). `MODELLER.kasser`/`fatpall` (leirens løse
ting ved flaggstanga, byggeplass3d.js) bruker de nye modellene.

## Gjort
- Del 1: A1–A11 (kontrollrom, brakke nivå 1–3, vakttårn, port, aggregat, dieseltank, solceller, batteribank, kameramast nivå 1–3).
- Del 2: A12–A16 (radiomast nivå 1–3, sykestue, verksted), B29–B33 (kommandosenter, dronehangar, oppskytingsrampe,
  satellittterminal, radartårn).
- Del 3: B34–B36 (ammunisjonsbunker, våpenlager, messe), A17–A18 (lagertelt, container), C75–C79 (paller, ammunisjonskasser,
  medisinkasser, matkasser, oljefat).
- Del 4: A19–A28 (drivhus, helikopterplass, sandsekkvoll, gjerde – MODELLER.gjerde byttet ut –, kjøkken, brønn, flaggsokkel ved
  leiren, vegsperring, skytebane og hinderløype; de tre siste som nye bygg).
- Del 5: B37–B46 (offisersbrakke – 4 senger –, dusj- og vaskebrakke, toalettcontainer, vaskeri, treningstelt, arrest, garasje,
  verkstedhall for tunge kjøretøy med portalkran, vaskeplass, fyllestasjon). Felles hjelpere `modul()` og `port()`.
- Del 6: B47–B56 (vannrenseanlegg, avfallsplass, stort feltsykehus, medevac-plass, observasjonspost, betongbunker, skyttergrav
  rett og hjørne/ende – vollene står oppå bakken, terrenget graves ikke –, jordfylte kurver, T-vegger).
- Del 7: B57–B66 (piggtrådrull, kryss mot kjøretøy, kjøretøysluse, mobil lysmast, sirenemast, generatorhus, transformator med gjerde,
  klimaenheter, kontorcontainer, møtetelt med kartbord).
- Del 8: B67–B74 (lagerhall med reoler – 250 m³ lager –, kjølecontainer, hundegård, parkeringsplass, skilt, flaggrekke, porttårn,
  bålplass), C80–C81 (gassflasker i stativ, jerrykanner).
- Del 9: C82–C91 (sandsekkstabel, kamuflasjenett, presenning over last, tømmerstabel, verktøytavle, arbeidsbenk, bærbar generator,
  lyskaster på stativ, feltbord og klappstoler, feltkokeapparat). Tingene står i tabellen `TING` (navn, pris, fot, ikon, 2D-farge).
