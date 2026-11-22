# Kamp på bakken (W2) – 22. nov, R17-3

Filer: `site/dovre-fliser/spill/bakkekamp.js` (regler uten DOM: Dekning, Kikkert, Granat, Følge, Indikator; REGLER = Claudes forslag),
`site/dovre-fliser/spill/bakkekamp-visning.js` (window.BakkekampSpill), test `pipeline/fliser/test_bakkekamp.js`,
vakt `pipeline/fliser/vakter/bakkekamp.js`, hjelp `docs/natt/bakkekamp-hjelp.json`.

## Små endringer i felles filer
- `index.html`: to skriptlinjer rett etter selskap-visning.js (før meny.js).
- `spill/spillet-visning.js`: `dekF(d, e, f)` i kampSteg ganger skaden fra hver fiende med `BakkekampSpill.dekning(d, e, f)`;
  skyt() ganger treffsjansen med `BakkekampSpill.treff(avst)` (kikkerten).
- `spill/gange.js`: synsfeltet går mot `BakkekampSpill.fov(mål)` (fortere når du sikter), musa ganges med `BakkekampSpill.følsomhet()`.
- `spill/narhud.js`: våpenet i hånda skjules når kikkerten er på (`BakkekampSpill.kikkertPå()`).
- `spill/eventyr-visning.js`: fiendeFaktor bruker ikke sin egen «vegg» når BakkekampSpill finnes (ville telt dobbelt).

## API (BakkekampSpill)
dekning(d, e, f), sikt(bool), sikter(), kikkertPå(), fov(basis), følsomhet(), treff(avst), kast(), smell(X, Y), leggBelte(n),
antallGranater(), gi('følg'|'hold'|'angrip', [lag]), meny(bool), følger(), buer(), flyr(), lesHindre(), hindre(), treffAlfa(), test.

## Valg
- Granatene henger i et eget belte (høyst 6) og er `del: true` i Utstyr.TING: lommene (lut-systemet, 5 kg uten sekk) var fulle i et nytt
  spill, så sekkens vanlige kjøp ga «for tung». Eget kjøp i Leir-menyen (fanen Lager, «Håndgranater»).
- G kaster granat mens du går (G går ellers ut av gåmodus; «Gå» og Esc gjør fortsatt det). J = lagkameratene (ledig tast).
- Granatene har egen klokke (setInterval) – 3D tegner bare fire bilder i sekundet når ingenting rører seg.
- Scenens z = (moh. − u.h0) × R3.EX (ikke moh.) – granaten landet ved føttene før det ble rettet.
- Hindringene: husomriss og trær fra R3.hindre, parkerte biler u.hus.biler, steiner u.smått.stein, kjøretøy i KJORETOY (innen 12 m,
  lest hvert 0,3 s). Inne i et hus og i et kjøretøy brukes de gamle reglene (hus ×0,3, kjøretøy ×0,45).

## Ikke gjort
Maskingevær som eget våpen, fiender som kaster granater, dekning for lagene dine, granatbuen vises ikke før kastet, lagkameratene vises
ikke med eget merke i 3D (de står i lagmenyen med «følger»).
