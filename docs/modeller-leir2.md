# Leirmodeller, runde 2 (22. nov 2026, Ã¸kta pÃ¥ brukerens PC)

Lista: docs/modeller-liste.md del Aâ€“C (punkt 1â€“114), â˜… fÃ¸rst. Gren `claude/lokal-modeller`. Del Dâ€“G gjÃ¸res av skymaskinene.

## Slik henger det sammen
- Nye og bedre modeller ligger i `site/dovre-fliser/spill/modeller-leir2.js` (lastes etter `tegninger.js` i index.html, og pÃ¥ testsiden
  `spill/modeller-visning.html`). Den bruker hjelperne i `modeller.js` (`MODELLER.H`, eksportert 22. nov).
- `MODELLER.LEIR2[modellnavn](b)` gir geometrien for bygget `b` (nivÃ¥ 1â€“3 synes der lista sier det). `leir-visning.js` `modell()` spÃ¸r
  her fÃ¸rst, fÃ¸r de gamle `EGNE`-modellene og `MODELLER[navn]`.
- DetaljnivÃ¥: modeller over 1000 trekanter fÃ¥r en enklere utgave i `geometry.userData.fjern`. En `KROKER.ramme3d`-krok nederst i fila
  bytter til den enkle utgaven lenger enn 165 m unna og tilbake innen 145 m (hvert 0,3 s). NÃ¥r en av dem frigjÃ¸res, frigjÃ¸res begge.
- Samme fotavtrykk, dÃ¸rer og hÃ¸yder som fÃ¸r, sÃ¥ interiÃ¸ret (`interior3d.js` LEIRBYGG), hindringene og 2D-kartet stemmer.
- Selskapets farger (skilt, striper) leses fra flagget: `OppstartSpill.tilstand().fraksjon.flagg`.

## MÃ¥linger (Â«MÃ¥l ytelseÂ», Intel Iris Xe, Edge/Chrome pÃ¥ Windows, 823 Ã— 596 punkter, hÃ¸y grafikk)
Testleir i Dovre-piloten (196400 6898900) med 21 ferdige leirbygg, kamera 131 m over bakken, utsnitt 3,4 km. FÃ¸r = de gamle
modellene (MODELLER.LEIR2 tÃ¸mt), etter = de nye. Skjermens tak er 60 bilder/s; tallene er per tegning (bildet tegnet 16â€“32 ganger).

| Del | Hele bildet | Leiren: trekanter | Leiren: kall | Leiren sparer |
|---|---|---|---|---|
| FÃ¸r | 3,1â€“4,2 ms | 12 328 | 31 | 0,5 ms |
| Etter del 1 (A1â€“A10) | 3,1â€“3,6 ms | 17 318 | 31 | 0,5 ms |
| Del 2, 28 bygg: fÃ¸r (gamle modeller, de 5 nye usynlige) | 2,7â€“3,1 ms | 12 780 | 30 | âˆ’0,1 ms |
| Del 2, 28 bygg: etter | 2,6â€“3,4 ms | 20 738 | 37 | 0,6 ms |

## Nye leirbygg
Registreres i `NYE` i modeller-leir2.js (Leir.BYGG med modell = id, Ikoner.BYGG, Leir2d.STIL og gruppe i byggelista via
`window.LEIR2_GRUPPER`, som leir-visning.js leser). Pris, tid, strÃ¸m og materialer er Claudes forslag. De fleste har ingen egen
virkning ennÃ¥ (teksten sier det) â€“ bare strÃ¸mforbruk. Ting i leiren (del C) er billige pyntebygg i gruppen Â«Ting i leirenÂ»; samme
ting fÃ¥r fast variant etter byggets id (stÃ¥ende/liggende/stablede fat, antall paller â€¦). `MODELLER.kasser`/`fatpall` (leirens lÃ¸se
ting ved flaggstanga, byggeplass3d.js) bruker de nye modellene.

## Gjort
- Del 1: A1â€“A11 (kontrollrom, brakke nivÃ¥ 1â€“3, vakttÃ¥rn, port, aggregat, dieseltank, solceller, batteribank, kameramast nivÃ¥ 1â€“3).
- Del 2: A12â€“A16 (radiomast nivÃ¥ 1â€“3, sykestue, verksted), B29â€“B33 (kommandosenter, dronehangar, oppskytingsrampe,
  satellittterminal, radartÃ¥rn).
- Del 3: B34â€“B36 (ammunisjonsbunker, vÃ¥penlager, messe), A17â€“A18 (lagertelt, container), C75â€“C79 (paller, ammunisjonskasser,
  medisinkasser, matkasser, oljefat).
- Del 4: A19–A28 (drivhus, helikopterplass, sandsekkvoll, gjerde – MODELLER.gjerde byttet ut –, kjøkken, brønn, flaggsokkel ved
  leiren, vegsperring, skytebane og hinderløype; de tre siste som nye bygg).
