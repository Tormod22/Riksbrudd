# ut10-skap – skapene i leirens egne bygg viser innholdet (28. nov)

Brukeren: «Lag det som ikke er bygget». Gren `claude/ut10-skap` fra `claude/nattfiks`. Alle tall er Claudes forslag.

## Valget: skapene er EGNE plasser i tinglageret
Hvert skap i et ferdig leirbygg er en egen plass i tinglageret (spill/tinglager.js), I TILLEGG til byggets standardplass, som står som før –
ingenting flyttes (avstem flytter bare fra plasser som er borte eller overfylte; det som alt ligger på standardplassen, blir der). Nye ting
legges som før på den plassen som passer best, så klær går nå i brakkas garderobe og ferskvarer i kjøkkenets kjøleskap (når kjøkkenet har strøm).
Plassen heter `b<byggets id>.<møbel><nr>` (f.eks. `b12.kjøleskap1`), nr = nummeret blant like møbler i interiørets plan (som lutens nøkler).
Skapene finnes som plasser også om planen ikke fikk plass til møbelet (da når du dem fra Lageret-panelet).

`spill/leirskap.js` (regler uten DOM, test `pipeline/fliser/test_leirskap.js`) – `Leirskap.SKAP` (byggtype -> møbel -> [lagringstype, antall]):
| bygg | skap |
|---|---|
| kjøkken | kjøleskap × 2 (300 l, kjøl med strøm), overskap (60 l, tørrmat og kjøkkenting) |
| brakke | garderobe (400 l), klesskap (200 l), kommode (100 l), skoskap (50 l) |
| sykestue | medisinskap × 2 (60 l, låst), arkivskap (150 l) |
| kontrollrom | arkivskap (150 l) |
| verksted | verktøyvogna = verktøyskap (250 l) |
| drivhus | tønne (200 l vann) |
Nye lagringstyper i `Tinglager.LAGRING`: klesskap, kommode, skoskap, overskap. Navnet i panelet: «Kjøleskap 2 (kjøkken)».
`Leirskap.plasser(b)`, `finn(b, møbel, nr)`, `les(pid)`, `erSkap(byggtype, møbel)`.

## Visning – `spill/leirskap-visning.js` (window.LeirskapSpill)
- 3D (Gå): ved et skap i et leirbygg (innen 1,25 m) kommer knappen «Åpne kjøleskapet (E)». E/knappen åpner Lageret-panelet på skapets plass
  (`TinglagerSpill.åpne(true, pid)`; ta med i sekken, flytt, bruk, kast …). Mens panelet viser plassen, står døra/lokket/skuffen åpent i 3D med
  tingene som faktisk ligger der: `Hyller3d.skapÅpent()` (hyller-visning.js) setter `window.MØBEL_ÅPEN = { i, type, k, fyll, kat }`, og
  interior3d.js tegner den åpne modellen (kjøleskap, skap, garderobe, tønne og fryseboks fra før; nye åpne modeller for medisinskap,
  overskap, skoskap, og skuff som er trukket ut for kommode, arkivskap og verktøyvogn). Tingene i et åpent skap synes alltid litt (minst 30 %).
  Lukk panelet eller trykk E igjen = døra lukkes. Lutens knapp for en hylle ved siden av skjules imens (body.skapnær), så E bare står på én knapp.
- 2D: zoomet inn (under 0,2 m per punkt) tegnes skapene i leirbyggene som små merker med bokstav (K kjøleskap, O overskap, G garderobe …);
  trykk på et skap (under 0,5 m per punkt) åpner Lageret på plassen. Planen regnes i kartets meter med samme regler som 3D (`LeirskapSpill.plan(b)`).
- Luten (lut-visning.js): i leirens bygg viser luten ikke lenger skapene som har en tinglagerplass – unntatt når det ligger noe i lutens
  utgave av skapet fra før (så ingenting blir borte).

## Fellesfiler endret
- `index.html`: `leirskap.js` rett før `tinglager.js`, `leirskap-visning.js` rett etter `interior3d.js` (+ versjon.py).
- `spill/tinglager.js`: fire nye LAGRING-typer; `plasser()` legger skapene til etter byggets standardplass (bygg uten standardplass, som
  kontrollrommet, får også skapene).
- `spill/interior3d.js`: `åpentSkap` har bunn og høyde, `åpenSkuff`, nye åpne modeller, tingene i åpne skap etter `m.innKat`.
- `spill/hyller-visning.js`: `skapÅpent()` i samme takt som de åpne skapene i husene.
- `spill/lut-visning.js`: én betingelse i `beholdereHer()`.

## Prøvd
- Node: test_leirskap (plassene, kjøl bare med strøm, ingenting flyttes, nye klær havner i brakka, overskapet tar mat og ikke verktøy),
  test_tinglager, test_hyller, test_interior, test_moblertyper, test_balanse, test_lut, test_ting, test_kommando, test_byggesett, test_leting,
  test_folk, test_okonomitest – grønne.
- Vakt `pipeline/fliser/vakter/ut10-skap.js`: ok på PC og mobil; feil med vilje (`Leirskap.finn` gir aldri noe) → vakta feilet. Også ok:
  ut9-mobler, ut8-hverdag, inne (PC og mobil); en kopi av vakta «interiør i leirens bygg» fra sjekk.js med 3D: ok (fire køyesenger, vegg, gulv).
  Prøvehuset i vakta «interiør»: 8 114 trekanter (som før; grensen er 9 000).
- Bilder (scratchpad `natt/ut10-skap/`, PC og mob-): skap-knapp (knappen ved kjøleskapet), skap-panel (Lageret på «Kjøleskap 1 (kjøkken)»
  med melk, brunost, egg og peanøttsmør), skap-åpent (døra åpen med tingene), skap-2d (merkene K og O i kjøkkenet), skap-2d-panel.

## Ikke gjort / å vite
- Lagerteltet og containeren har ingen lukkede skap (bare hyller og paller) – de har bare standardplassen som før.
- Den åpne modellen viser fargen per kategori (ikke hver enkelt ting).
- Byggets standardplass («Kjølerommet på kjøkkenet», «Skapene i brakka») er ikke knyttet til et bestemt møbel; den nås fra Lageret-panelet.
