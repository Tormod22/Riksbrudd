# ut6-fiksd – feil som bare kom i lange kjøringer av sjekk.js

Gren `claude/ut6-fiksd` (fra `claude/nattfiks`). Gjenskapt med vaktene hver for seg (scratchpad `natt/ut6-fiksd/kn.js`, som `vakt1/kn.js`
men tar også egne «forspill»-filer og viser RangeError fra konsollen) og med små forspill som setter opp tilstanden en vakt før la igjen.

## 1. «maskinfolk og bærere (F3)» – SPILLET og vakta
**Årsak:** sjekk.js (K2, «bedre byggesystem») bygger et LUKKET gjerde rundt leiren (−60…80, −60…60 m) og avbryter porten. Planleggingen
like etter bygger et lagertelt på (−40, +70) – utenfor gjerdet. Når maskinfolk-vakta kjører, legger varelageret tømmeret der, bærerne
inne i gjerdet får «ingen vei dit» (Folkgang: `s.fast`), men bæringen sjekket bare `fram()`: reservasjonen ble aldri sluppet, og de sto
i fasen «hent» for alltid (0 turer). Gjenskapt med forspillet `natt/ut6-fiksd/gjerde.js` + vakta: feil før, ok etter.

**Rettet i spillet** (`spill/baering.js`):
- En bærer som står fast mot målet (Folkgang `fast` for samme mål-nøkkel), eller har gått over `REGLER.ikkeFram.sek` = 900 s spilltid
  mot samme mål, gir opp: målet (lagerteltet, `id:<bygg>`, eller lagerplassen) settes i `B.unna` i `REGLER.ikkeFram.husk` = 1800 s.
  Henter hen fra lageret, slippes enheten og en annen haug som ikke er «unna» prøves; finnes ingen, avbrytes turen. Med last eller fra
  utmatingen går lasten tilbake (som `tilbake()`), og turen avbrytes. Meldingen («Kari kommer ikke fram til lagerteltet (ingen vei dit) –
  går til en annen haug.») kommer bare første gang for samme mål. (Tallene er Claudes forslag.)
- `lager().finn(v, x, y, hvem, unna)` og `levTil(v, m, unna)` hopper over steder i `unna`; nye bærejobber bruker det også.
- Jobbtavla sier «kommer ikke fram til tømmer på lageret» / «kommer ikke fram til lageret» i stedet for «ingen tømmer på lageret» /
  «lageret er fullt» når varene finnes, men ingen når dem.
- `B.unna` og `B.stat.ikkeFram` er nye (lagres ikke; `unna` glemmes etter en stund).
- Test: `pipeline/fliser/test_baering.js` (to nye deler: telt bak lukket gjerde + et annet telt → bærerne bruker det andre, ingen
  reservasjon står igjen; bare telt bak gjerdet → ingen henter, tavla sier hvorfor). Selvtest: uten rettingen feiler 6 sjekker.

**Rettet i vakta** (`vakter/ut4-maskinfolk.js`): gjerder og porter fra vaktene før tas bort mens vakta går (L.bygg settes tilbake i
`finally` som før). Ellers kan ingen nå vaktas eget lagertelt heller (88, 60 ligger også utenfor gjerdet).

## 2. «ut3-varekontrakt» – VAKTA
**Årsak:** `Selskap.ta` setter `godtatt = Math.round(tid)`. Står `tid` på en brøkdel ≥ 0,5 (f.eks. 207,6 etter vaktene før), blir
`godtatt` 208, og vaktas `ka.godtatt -= 1440` ga 1439,6 minutter – døgnet var ikke gått, verken levert eller mistet. Gjenskapt med et
forspill som setter `tid = ⌊tid⌋ + 0,6`: gammel vakt feiler, ny ok. Spillet har ikke feil her (første døgn kommer 0,4 min senere).
**Rettet:** vakta setter `ka.godtatt = ⌊tid⌋ − 1440` (og − 2880 for neste døgn).

## 3. «FEIL i nettleseren: RangeError … nyttVindu» – SPILLET
**Årsak:** `lagVindu` klemte bare den ene siden av boksen inn i området (`max` på venstre/nede, `min` på høyre/oppe). Et lag mer enn
ca. 8 km utenfor kartet ga en snudd boks, og `nx·ny` ble negativ (−1 · 256²). Hvem: flere vakter setter lag langt utenfor
Dovre-området – `ut2-byer.js` (L.x − 20 000 / − 30 000), `ut4-firmaer.js` (+ 30 000 / + 40 000), `kart.js` (+ 40 000, + 30 000).
Et lag utenfor kartet er lov i spillet, så spillet rettes (vaktene er ikke endret).
**Rettet:** `index.html` `lagVindu`: hver kant klemmes inn i området. `terreng.js` `nyttVindu`: aldri negativ eller ugyldig størrelse
(da et tomt vindu; siktfelt/siktvidde tåler det). Test i `test_terreng.js`. Prøvd i nettleser: lag på −20/−30/−45 km, +40 km, NaN:
før 3 RangeError i konsollen, etter ingen, og sikten kommer tilbake når laget settes tilbake.

## 4. «ui: Leir-menyen husker rullingen, tallflisene dekket» – SPILLET (tidsavhengig)
**Årsak:** bare `paneler.js` nullstilte rullingen, og bare når den så at menyen var ny (sjekk hvert 120. ms). Vakta lukker og åpner
menyen med 200 ms mellom; under last gikk sjekken glipp av at menyen var lukket, og rullingen (799) sto igjen. Tallflis-feilen i runde 14
er samme feil (flisene øverst var rullet ut av syne). Gjenskapt med `natt/ut6-fiksd/rull.js` (lukk og åpne i samme ramme): 800 før, 0 etter.
**Rettet:** `spill/leir-visning.js` – Leir-knappen setter `scrollTop = 0` når menyen åpnes. ui-vakta ok på PC og mobil.

## Fellesfiler endret
- `site/dovre-fliser/index.html`: `lagVindu` (første linje i funksjonen, klemmingen av boksen) + versjonsmerker (versjon.py).
- `site/dovre-fliser/terreng.js`: `nyttVindu` (to linjer).
- `site/dovre-fliser/spill/leir-visning.js`: `leirKnapp.onclick` (`menyEl.scrollTop = 0` når den åpnes).
- `site/dovre-fliser/spill/baering.js`: se punkt 1.
- Vakter: `ut4-maskinfolk.js`, `ut3-varekontrakt.js`. Tester: `test_baering.js`, `test_terreng.js`.
