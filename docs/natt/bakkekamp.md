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

## R18-C (23. nov): fiendens granater, granater i lagkampen og maskingevær
Grenen claude/r18-granater. Alle tall er Claudes forslag (REGLER.lagGranat, undertrykk, fiende3d i spill/bakkekamp.js).
- **Regler (bakkekamp.js):** `Lagkamp` (antall granater etter bevæpningen – standard 4, nærstrid 8, tung 6, avstand 2, egen 4, røvere/lett 1;
  `runde(a, b, d, f, rng)` under 60 m: høyst 2 kast per runde, én kaster per fire friske, treff 0,5 × 1,6 mot nedgravde × 1,3 i skog, 1–2 treff
  per granat; bruker rng bare når laget kaster), `Undertrykk` (hvert friskt maskingevær innen 900 m gir 0,35 styrke i 6 spillmin; full styrke =
  treff ×0,55 og fart ×0,5; spillerens lette maskingevær 0,05 per skudd i 2 min), `Fiende3d` (`ildkraft` = hver mann som én rifle ganget med
  Terreng.treffsjanse for våpenet hans – samme tabell som 2D; `kaster`, `kast`, `mål`, `igjen`). `Granat.steg` tar sprett/friksjon per granat.
- **simulering.js:** ny valgfri krok `KROKER.salve(a, b, d, f, rng, tid)` etter hver salve i kamprunden – gir ekstra treff. Uten kroken er
  kampen nøyaktig som før (test_simulering.js sammenligner fortsatt med den gamle koden; ny del tester kroken).
- **Visning (bakkekamp-visning.js):** kroken over (granater + undertrykking, logg, blink i kartet via KROKER.tegn), KROKER.ild og KROKER.fart
  for undertrykte lag, KROKER.sim fyller granatene når s.ammo øker (forsyning), KROKER.lagTekst («4 granater», «holdes nede av maskingevær»).
  Fiendens granater i 3D: `fiendeSteg` hvert sekund (lag innen 15–35 m som har oppdaget deg – EventyrSpill.fiendeFaktor –, ikke under
  våpenhvile, sjanse 6 %/s, høyst hvert 8. s per lag), granaten lobbes mot et punkt innen 7 m fra deg og går av 2,6–3,5 s etter kastet,
  «GRANAT!» med pil, avstand og sekunder (KROKER.tegn3d), rød bue mot kasteren, eget drønn (Web Audio). Smellet bruker `granatDekning`:
  bare dekning som står MELLOM deg og granaten (hele veien), inne i hus ×0,25. Kasterens eget lag rammes ikke. Helsa går aldri under 5.
  `api.ildkraft(e, avst)` brukes av kampSteg i spillet-visning.js; `api.skudd(W, e)` av skyt() for maskingeværet.
- **Andre filer:** utstyr.js (`Utstyr.VÅPEN.lmg`: 100 skudd 5,56, takt 0,075 s, lading 5,5 s, 450 m, 9 kg, 1,5 mill. kr, undertrykk: true),
  narhud.js (modell i hånda: patronkasse, belte, tofot), spillet-visning.js (kampSteg og skyt, se over).
- **I testene sover alt** (BakkekampSpill.test = true slår det på). Vakt: pipeline/fliser/vakter/granater.js («fiendens granater»), med
  selvtester (granatenes rekkevidde 0 og veggens faktor 1 lagt inn med vilje – vakta fanger begge).
- **Ikke gjort:** granatantallet lagres ikke (fylles helt ved omlasting), fiendens maskingevær undertrykker ikke deg i 3D, figuren på ryggen
  (karakter.js) tegner det lette maskingeværet som en pistol, standardlag er ca. 19 % farligere i 3D enn før (maskingevær og skarpskytter
  teller mer enn én rifle i 2D-tabellen), og dine egne lag kaster ikke granater i 3D (bare i kamprunden).
