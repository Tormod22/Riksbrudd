# Forlatte steder og stemning (R18-F, 23. nov)

Brukeren liker hvordan Silent Hill «har gjort det generelt bra med atmosfæren og en god stemning», og valgte «forlatte steder».
Bare stemningen er inspirasjon: ingen navn, steder, figurer, monstre, musikk, symboler eller utseende derfra, og ingenting
overnaturlig. Det er stemning og historie – ikke et nytt system spilleren må passe på.

## Filer
- `site/dovre-fliser/spill/spor.js` – regler uten DOM (test `pipeline/fliser/test_spor.js`):
  `historie(kl, i)` (gruppe, navn, spor), `lapp(kl, i)`, `LAPPER` (50 stk: [id, gruppe, tema, tittel, tekst, peker]), `fyll`, `ute`,
  `dato(i)` (kalenderen: ca. 80 % stoppet i februar–april), `pekerMål`, `gjemt(i)`, `gate(veger, opt)`, `skiltTekst`, `plater(P, i)`,
  `lydInne(kl, i)`, `REGLER` (alle tall er Claudes forslag).
- `site/dovre-fliser/spill/spor-visning.js` – `window.SporSpill`: `inne(c)` (generator, kalles fra interior3d.js), lappknappen
  `#leseknapp` (tast N) i `#inneknapper`, panelet `#lapppanel`, stemningslinja `#sporlapp`, «Lapper du har funnet» i sekken
  (`SEKK_TILLEGG`), «Gjemt lager?» i 2D-kartet (`KROKER.tegn`), `medGjemt(P, f)` (leting-visning.js), tettstedene i 3D
  (`KROKER.bygg3d` -> `u.spor`, `KROKER.sett3d`: InstancedMesh for biler/barrikader/plater/skiltstolper, ett lite nett per skilt med
  `CanvasTexture`). Lagres per leir i «riksbrudd-spor» (`lest`, `mål`).
- `pipeline/fliser/vakter/forlatt.js` – VAKT «forlatte steder». Selvtester: en spordel utenfor huset og en forlatt bil inne i et hus.

## Endringer i andres filer
- `spill/interior3d.js`: én linje etter FORLATT-blokka: `yield* SporSpill.inne({ pl, P, kasse, blob, tak, dørH })` (ikke i leiren).
- `spill/leting-visning.js`: `f = SporSpill.medGjemt(P, f)` etter `Leting.funn`, og `'leseknapp'` i lista over knapper i `#inneknapper`.
- `spill/lyd.js`: `Lyd.nivåer` har `t.tomt` (bylyden × 0,15) og `t.glipe` (vind i et knust vindu); nye lyder knirk, tikk, drypp
  (inne, per hus fra `Spor.lydInne`), hund langt unna og dør som slår (ute i tettsted, dør bare i vind over 4 m/s). Kanalen «glipe».
- `index.html`: to skript-tagger etter `lut-visning.js`.

## Hva sporene er
Bolig: karantene (lapp på døra med teip, madrass i stua, tomme skap, kalender), flukt (koffert, skap, kalender, brev), barrikade (planker for
bakdøra innenfra / stablede stoler ved døra, madrasser), venting (barnetegning, brev), syk, plyndret, stille. Skole: nødsenter/stengt
(madrasser, tegninger, oppslag). Sykehus: overfylt/evakuert (madrasser i korridoren, revet sperrebånd, papir). Butikk: handlekurver, oppslag.
Kirke: madrasser, nedbrente lys. Kontor: papirhauger, kalender. Gård og annet: bare lapper.

## Målt
Dombås (ekte data via dev.py): et hus med 4 spor fikk 24–38 spordeler; vakta krever ≤ 20 % flere trekanter enn uten sporene.
Gatene i Dombås: 14 biler, 4 barrikader, 7 skilt, 82 plater – ca. 7 400 trekanter, kroken 5 ms.

## Ikke gjort
- Sporene finnes ikke i leirens egne bygg eller byggesettets hus. Lappene peker bare til «gjemt lager» (ikke til steder i kartet utenfor utsnittet).
- Skiltene står ved vegen, ikke festet til husvegger. Platene er på ytterveggene, ikke nøyaktig over vinduene i hus3d-teksturen.
- Biltrafikken (liv3d.js) kjører fortsatt i tettstedene og kan kjøre gjennom en forlatt bil eller barrikade.
