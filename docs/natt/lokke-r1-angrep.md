# Kritikerløkka r1 – pakke «angrep» (26. nov)

Rettet etter Ingrid Sæther og Jonas Bakke (docs/kritikk/2026-11-26-r1-*.md). Alle nye tall er Claudes forslag.

## Hva er laget (per punkt)
1. **Første bølge og prognosen.** `SpilletSpill.FØRSTE = { menn: 4, lett: true }` (spillet-visning.js): første røverbølge har høyst 4 mann
   med lette våpen (Strid.BEVÆPNING.lett) – bare for spilleren (`auto()`); i testene beholder laget 12 mann som før, men får lette våpen
   når SpilletSpill.test er på. Forsvarets fordel: `AR.vern = 0,75` – angriperne treffer et lag som står i forsvarsstillingen sin
   (innen 40 m) sjeldnere (KROKER.ild i forsvar-visning.js, gjelder alle bølger). Prognosen: `Forsvar.sjanse` (forsvar.js, Lanchesters
   kvadratlov med Terreng.treffsjanse på 200 m, vern for stilling/nedgravd/voll, tårn ×1,15; terskler god ≥ 1,6, usikker ≥ 0,85 –
   `Forsvar.SJANSE`) og `ForsvarSpill.prognose()` / `ventetBølge()` (regner bølgen som kommer uten å røre forsvar-kamp.js sin
   innpakning). Står i banneret, i «Forsvar» i Leir-menyen (#forsvarsjanse) og i morgenmøtets «Forsvar leiren nå».
   Prøvd: 4 lett bevæpnede røvere mot 4 leiesoldater (nedgravd) – røverne ga opp etter 2 falne, ingen tap hos oss.
2. **Én ankomsttid.** Banneret regner det rå anslaget av ruta røverne går (`timerIgjen`, som varselet i loggen) – før brukte det luftlinje
   da de ble sett (86 vs 190 min). `Forsvar.umulig(pred, meter)` (ETA.maksFart = 2 m/s): står de lenger unna enn de kan rekke på den
   tida nedtellingen sier, byttes nedtellingen (det ga «framme om ca. 1 min» på 1,8 km). Varselet i loggen sier det samme som banneret
   («De er trolig framme i dag tidlig (ca. kl. 06–09)»), morgenmøtet bruker ForsvarSpill.status() under angrepet og «drar ut om» før.
3. **Karakteren ute.** `ForsvarSpill.uteNå()`: over 500 m fra leiren under et angrep → linje i banneret «Du står 1,2 km nordvest for
   leiren – røverne kommer fra øst» med «Gå hjem» (#gahjem, ordre til leiren), logglinje + hendelsen «alarm» (stopper ⏭), og én til når
   angriperne er under 900 m fra deg. Ikke når du går selv (3D): da står bare loggen.
4. **«Øvelse».** Forsvar satt uten angrep fra morgenmøtet/varselet = «Forsvaret er satt · røverne drar ut … · god sjanse» med «Opphev».
   Bare «Øv: sett lagene i stilling» er en øvelse (`ForsvarSpill.øvelse()`). Når bølgen så drar ut, flyttes lagene mot riktig kant.
5. **Ett banner.** flyt.js: står angrepsbanneret, blir «⏭ Stoppet …» en linje i banneret (`ForsvarSpill.stoppLinje`) med Vis/Spol videre.
   narhud.js (fellesfil, se under) viser ikke angrepsbrikka mens banneret står.
6. **Spoling under angrep.** ⏭ mens kampen om leiren pågår (`ForsvarSpill.kampPågår()`: kampen har begynt eller angriperne er innen
   500 m) går i 10× (`Flyt.REGLER.kampFart`), ikke 600×. Rapporten har nå «Det kom ett røverlag på 4 mann fra nordøst» og «Hos dem:
   2 falt og 1 såret» (Forsvar.sluttRapport: u.kom, u.deresFalne, u.deresSåret), og kom angrepet mens du spolte, står den til du lukker.
7. **«Vis» i fartsvarselet.** IKKE gjenskapt: i mitt forsøk flyttet «Vis» kartet til kampen (kam 196400 → 202400). Kanskje traff
   kritikerens klikk en annen «Vis»-knapp. `FlytSpill.visSted` er eksportert; ingen endring i selve Vis.
8. **⏭ om natta.** Rolig natt (`Flyt.REGLER.rolig`: kl. 21–05:30, ingen angrep, ingen egne lag på marsj, ingen fiender nær, neste bølge
   over 120 min unna): ⏭ går i 3600× med kortet «Rolig natt – spoler raskere …», og stopper ikke ved midnatt («ny dag») når
   morgenmøtet finnes. Prøvd: 20:30 → 06:01 med ett trykk (ett stopp ved midnatt før rettingen). ⏭ mens morgenmøtet venter gir kortet
   «Morgenmøtet venter på svaret ditt – ⏭ spoler videre når du har valgt» (morgen-visning.js + spol()). Mistanke: kritikerens 7–45 min
   kan komme av at ⏭ trykket igjen under spolingen stopper den (av/på-knapp) – det er ikke endret.
9. **Tyveri-kortet.** `Hendelser.når(kl)`: «i natt» (22–11), «i løpet av dagen» (11–18), «i kveld» (18–22); kortet husker klokka (H.åpen.kl).
10. **Loggspam.** forsvar-kamp.js pakker inn LoggDemp.vurder: «📻 Lag: Under ild!» høyst én gang per lag per 60 spillminutter, og den samme
   radioavlyttingen (samme lag og sted) høyst én gang per 180 (`KampVarsel.DEMP`, `holdTilbake`).

## Fellesfiler endret
- `spill/narhud.js` (eies av telefon-hjelperen): én linje før `if (FS) {` i brikker(): `if (FS && ForsvarSpill.bannerOppe && ForsvarSpill.bannerOppe() && forSpiller()) { }`
  `else if (FS) { …` – angrepsbrikka står ikke mens banneret står.
- `index.html`: bare versjonsmerkene (versjon.py).

## API-er
ForsvarSpill: AR, prognose, ventetBølge, uteNå, gåHjem, stoppLinje, kampPågår, bannerOppe, øvelse. Forsvar: ETA, umulig, SJANSE, sjanse.
FlytSpill: visSted, visKort, rolig. SpilletSpill.FØRSTE. KampVarsel: DEMP, demp, holdTilbake. Spillet.Hendelser.når.

## Tester og vakt
test_forsvar.js, test_spillet.js, test_forsvar_kamp.js (nye blokker), test_flyt.js, test_morgen.js, test_skjermlag.js, test_loggdemp.js – grønne.
Vakt `pipeline/fliser/vakter/angrep.js` (PC 3,2 s, mobil 2,0 s, ok; fant feilen da «Øvelse» ble lagt inn igjen med vilje).
Vaktene kamp og morgen er kjørt på nytt: ok.

## Ikke gjort / usikkert
- Punkt 7 er ikke gjenskapt (se over).
- Balansen for bølge 2 og senere er uendret utenom AR.vern (gjelder alle bølger) – ikke spilt gjennom.
- 3600× om natta er bare prøvd i en ny leir uten mye i gang; på en treg maskin kan det bli tungt (sim per ramme ×6).
- Banneret blir høyt med alle tre linjene (prognose, ute, ⏭) på telefon; den lange delen av rådet skjules der.
