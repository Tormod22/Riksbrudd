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
