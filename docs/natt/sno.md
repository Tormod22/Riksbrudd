# R19-1 Første snø (24. nov, brukerens bilder fra en fjelltur sent på høsten)

Tynn førstesnø som ligger flekkvis i stedet for et jevnt hvitt teppe. Alle tallene er Claudes forslag.

## Filer
- `spill/snodekke.js` (ny, regler uten DOM, test `pipeline/fliser/test_snodekke.js`): `dekke(V, moh, støy)` = hvor tykt laget er (full snø over
  snøgrensen, eller førstesnøen over `pudderGrense`), `flekk(d, { nord, flat, skog, stein, støy, fin })` = hvor mye av bakken som dekkes,
  `glsl()` = den samme regelen som GLSL (`snoDekke`, `snoFlekk`; testen sjekker at GLSL og JS gir samme svar), `støy(X, Y, skala)` for 2D og
  fjernterrenget. REGLER samler tallene. Med fullt lag (d = 1) dekker snøen alt som før.
- `spill/vaer.js`: ny værtype `snøpudder` («Lett snø», mengde 0,35; høst 8 %, vår 4 %, vinter 6 %; om sommeren regn). `S.pudder` (0–1) og
  `S.pg` (grensen, moh.) – laget legger seg på 90 spillminutter (`PUDDER.legg`) mens det snør og smelter på årstidens `smelt`-timer
  (høst 20 t, vår 6 t, sommer 2 t; regn ×3). Grensen per årstid (høst 200, vår 450, sommer 1500 moh.) + (1 − styrke) · 250 m. Lett snø
  flytter ikke den faste snøgrensen. `tilstand()` gir `pudder` og `pudderGrense`. Lagres med været (VaerSpill.S).
- `index.html`: `VAER_U.uPudder/uPudderGrense`, `SNO_GLSL()`. `detaljIBakken`: snøen etter `snoDekke`/`snoFlekk` med `vNord` (normalens y),
  flathet, skog fra vannmaskens blå kanal (på land – `skogIVannmaske(u, skog)` i bygg3d etter skogmasken; ute i vannet er kanalen fortsatt
  avstanden til land) og stein fra kartfargen (grått) og brattheten. Ingen nye teksturoppslag. `enkelBakke` (Lav): samme regel, skog = mørk
  kartfarge. 3D-kartbildet (komponer i bygg3d) får `snø: null` (snøen kommer i skyggekoden).
- `kartflis.js` `snøIFlis`: 2D-kartflisene får snøen malt inn fra høyden og helningen i flisen (vann får ikke snø), via `VIS.snø`
  (`spill/vaer-visning.js` snø2d: flisene lages på nytt ved store endringer straks, små høyst hvert 20. s). Bakgrunnstråden laster snodekke.js.
- `spill/fjern3d.js` (farge får nord og støy), `spill/kompass.js` (minikartet), `spill/vaer-visning.js` treVær (lite snø på grantrærne,
  litt mer på busker og steiner; `PUDDER_TRE` 0,55).
- Vakt `pipeline/fliser/vakter/forste-sno.js` («første snø»): reglene, uniformene, en 2D-flis ved Dombås med og uten snø (andelen punkter
  som får snø skal være mellom 4 % og 90 % = flekkvis), og i 3D at skyggekoden kompilerer og bakken blir lysere.

## Ikke gjort
- Vinteren: snøen ligger nå også i 2D-kartet (før var 2D sommerkart hele året) – det er ny oppførsel.
- Snø på hustak og veger følger ikke førstesnøen (bakkens regel gjelder kartbildet, vegene i liv3d er egne nett).
