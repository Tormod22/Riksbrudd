# Pakke «tid» – G2 (tida) og G3 del 1 (oversikt med grafer)

Gren `claude/ut1-tid`. Plan: `docs/plan-selskap-okonomi.md` kapittel 13.5 og 13.6, fasetabellen G (kapittel 16).

## Det som er laget

### Tida (13.6)
- **`spill/tida.js`** (regler uten DOM, `test_tida.js`): alt regnes av et øyeblikksbilde
  `o = { tid, kontrakter: [{ id, tittel, frist, klar }], jobber: [{ id, navn, hva, igjen, reise }], lag, fart, angrep: { min, aktiv } | null, alarm, fast, byBer }`.
  - `valg(o)` – valgene i «Spol til …»: `morgen`, `kontrakt:<id>` (til den kan leveres, eller en time før fristen), `bygg` (neste
    byggejobb ferdig), `byggAlle` (alle ferdige), `angrep` (røverne drar ut). `bygg:<jobb-id>` (én bestemt jobb) brukes fra tidslinja.
  - `mål(id, o)` / `nådd(mål, o)` – målet og om det er nådd (tekst til «Stoppet: …»). Stopper uansett etter 3 døgn (`REGLER.maksSpol`).
  - `kjente(o)` – de kjente hendelsene som kommer (morgenmøtet, kontraktfrister og levering, byggejobbene med anslått ferdigtid,
    røverne drar ut / angrepet pågår), sortert, innen 4 døgn.
  - `byggeplan(o)` – når hver jobb i køen er ferdig: byggelagene tar jobbene etter tur (reise + arbeid / byggefart).
  - `pauser(før, nå, på)` – automatisk pause per type: `angrep` (alarm), `trenger` (kontrakt kan leveres, fristen under en time unna,
    eller en by ber om hjelp), `fast` (jobber venter, ingen bygger).
  - `når`, `kortNår`, `om`, `kl` – tidstekster som statuslinja (spilldagen skifter kl. 06: «dag 4 kl. 08:30»).
- **`spill/flyt.js`** (utvidet): `FlytSpill.spol(mål)` med `mål = { navn, sjekk() -> tekst | { tekst, x, y } | null, haster }`. Mens et
  mål gjelder, går spolingen i 600× (ikke «rolig natt» 3600×), og stopper når `sjekk()` svarer eller noe som haster skjer
  (`REGLER.spolTilHaster`: alarm, kontakt, tapt, kort, brann, tettsted, annet) – ikke for lag framme, bygg ferdig eller ny dag.
  Et annet fartsvalg avbryter. `FlytSpill.spolMål()` gir navnet på målet; `sistStopp().spolTil` sier hva som ble spolt til.
  Lesepausen (paneler.js) virker som før.
  Rettet en gammel feil i flyt.js: knappen «Senk farten selv …» i fanen Mål ga `onclick = true` (knapp-funksjonen tar `(tekst, fn)`),
  så den virket ikke – nå gjør den det, og den tegner menyen med `LeirSpill.visMeny`.
- **`spill/tida-visning.js`** (`window.TidaSpill`):
  - panelet `#spoltil`: valgene med tid («dag 2 kl. 06:00 · om 24 t»), «Det som kommer» (= tidslinja som liste), «Pause av seg selv»
    (tre brytere) og «Tidslinje øverst» (PC). Åpnes med **▾** rett etter ⏭ (bare PC – skjult på telefon, så toppraden ikke blir
    fullere), **langt trykk** (550 ms) eller **høyreklikk** på ⏭, et trykk i tidslinja og **Leir → Mål → «Tid: spol til og pause»**.
  - tidslinja `#tidslinje`: én rolig linje øverst midt på (PC), høyst 5 hendelser, trykk = spol dit. På telefon står lista i panelet.
  - pause av seg selv: hvert 0,5 s sammenlignes bildet med forrige; slår en påslått type til, trykkes ❚❚, kortet sier
    «Pause: …» og loggen får en linje. Av som standard (lagret spill oppfører seg som før).
  - Valgene lagres i `riksbrudd-tida` (`{ tidslinje, pause: { angrep, trenger, fast } }`) – gjelder alle leirer, som valgene i flyt.js.
  - I testene (navigator.webdriver) pauser ingenting av seg selv før `TidaSpill.test = true`.
  - En by som ber om hjelp (Ø3) kan sende `window.dispatchEvent(new CustomEvent('riksbrudd-by-ber', { detail: { tekst } }))`.

### Oversikt med grafer (13.5, første del)
- **`spill/statistikk.js`** (regler uten DOM, `test_statistikk.js`): tilstanden `{ v, dager: { [døgn]: rad }, åpen }`, døgn = `floor(tid/1440)+1`
  (06–06, som dagboka over inn og ut). `prøve` (snitt gjennom døgnet), `tell` (bygg ferdig), `lukk` (sluttverdier), `rader`, `serie`,
  `poster` (inn/ut per post summert), `skala` (aksen), `kort` (tall), `ferdigeJobber`. 30 døgn huskes (`REGLER.døgn`).
  `SERIER` og `GRAFER` er tabeller: **ny serie = `leggTilSerie({ id, navn, enhet, fra: rad => tall })`**, ny graf = `leggTilGraf(id, { navn, serier, type })`.
- **`spill/statistikk-visning.js`** (`window.StatistikkSpill`):
  - innsamling (KROKER.sim, bare lesing – går også i testene): prøve hvert 10. spillminutt av moral, helse (%), folk, arbeider
    (arbeidsføre som ikke har fri), syke, om byggejobbene står stille (andel av døgnet); byggejobber ferdige; ved døgnskiftet penger
    inn/ut per post (`PengerSpill.døgn(n)` – dagboka), kassa og tettsteder per side (`window.TETTSTEDER`). Ny statistikk tar med
    pengene fra dagboka for døgnene den husker (8). Lagres per leir i `riksbrudd-statistikk` (`leir: "x,y"`).
  - panelet `#statistikk` (Leir → Mål → «Vis statistikken»): knapper for hver graf, ett diagram om gangen (bunnark på telefon),
    lesepausen gjelder (lagt inn i `Paneler.LESEPAUSE.paneler` ved «riksbrudd-spill»). Grafer: Penger inn og ut (søyler), Per post
    (inn/ut per post), Kassa, Moral og helse, Folk i arbeid, Står stille, Tettsteder (Dine/Ravnsund/Mosevakt), Bygg ferdig.
  - **`StatistikkSpill.graf(el, hva, { bredde, høyde, rader })`** tegner én graf (lerret + forklaring) i et hvilket som helst element
    og gir `{ ok, tom }`. **Til pakka «selskap»: bruk den i fanen Oversikt i panelet «Selskapet»** (f.eks. `graf(el, 'penger')`,
    `'kassa'`, `'tettsteder'`). `StatistikkSpill.rader()` gir radene, `idag()` raden for døgnet så langt.
  - **`StatistikkSpill.leggTilKilde(id, () => tall, { navn, enhet, graf, grafNavn, type })`** – en ny serie som samles inn av seg selv
    (snitt over døgnet) og eventuelt en ny graf. Slik kommer maskinene og «hvorfor saga sto» (Ø1/F3) inn uten å endre disse filene.
    Trenger noe en telling i stedet for snitt, kan `Statistikk.tell(StatistikkSpill.tilstand(), døgn, 'navn')` brukes.

## Tall (alle er Claudes forslag)
`Tida.REGLER`: morgenKl 6, fristFør 60 min, tidslinjeMaks 5, horisont 4 døgn, maksSpol 3 døgn. `Flyt.REGLER.spolTilHaster`.
Langt trykk 550 ms. `Statistikk.REGLER`: døgn 30, prøveHver 10 spillminutter.

## Fellesfiler endret
- `site/dovre-fliser/index.html`: fire skript-tagger rett etter `flyt.js` (`tida.js`, `tida-visning.js`, `statistikk.js`,
  `statistikk-visning.js`) + `versjon.py` (bare merkene). Fartsknappene i index.html er ikke endret: ▾-knappen settes inn fra
  `tida-visning.js` rett etter `#nesteh`.
- `spill/flyt.js` (eies av pakka): se over.
- Ingen endring i paneler.js: statistikkpanelet legges i `Paneler.LESEPAUSE.paneler` fra statistikk-visning.js.

## Prøvd
- Regeltester: `test_tida.js`, `test_statistikk.js`, `test_flyt.js`, `test_kommando.js` – alle ok.
- Nettleser (Dovre-testsiden, 1400×860 og 390×844 mobil): panelet, tidslinja, langt trykk på ⏭ (mobil: åpner panelet uten å spole),
  «Spol til byggingen er ferdig» (stoppet ved «Solcellepaneler ferdig» etter 33 spillminutter), «Spol til morgenen» fra kl. 05
  (stoppet kl. 06 med morgenmøtet oppe og spillet på pause), kontrakten «Hent nødlageret …» i valgene og fristen i tidslinja,
  «Pause ved folk står fast» (alle satt på fri → ❚❚), grafene med kunstige døgn (bilder) og ekte innsamling.
- Vakt `pipeline/fliser/vakter/ut1-tid.js`: ok på PC (7 s) og mobil (7 s), setter alt tilbake. Med vilje-feil (`Tida.nådd = () => null`)
  sa vakta «Spol til byggingen stoppet ikke av seg selv».

## Ikke gjort (senere faser / åpent)
- «Skiftet er ferdig», «saga er tom», «avtalen går ut», «en investor ringer», «en maskin står», «en leder trenger deg» – finnes ikke i
  spillet ennå (Ø1–Ø7, F0, G5). Legg dem til som nye id-er i `Tida.valg/mål/nådd` og en ny type i `Tida.pauser`/`PAUSETYPER`.
- «En by ber om hjelp» er bare en krok (`riksbrudd-by-ber`); ingen modul sender den ennå (Ø3).
- Grafer for produksjon og «hvorfor maskinen sto», byenes tillit/frykt og børskursen (G3 del 2) – via `leggTilKilde`/`leggTilSerie`.
- «Folk står fast» betyr nå: byggejobber venter og ingen bygger (jobbtavla i F0 gir senere ekte «står fast fordi …»).
- Tidslinja er ikke i 3D når du går (skjules med body.gaar) og ikke på telefon øverst (der er den lista i panelet).
- Kontrakter med frist lenger fram enn 4 døgn står ikke i tidslinja (men står i «Spol til»).

## Retting ut2 (28. nov, etter flettingen med jobbtavla F0, Selskapet Ø0 og seier)
- `TidaSpill.øyeblikk()`: døgnplanen (spill/jobber.js) setter byggefarten til 0 utenfor arbeidstida. Anslagene i «Spol til» og tidslinja
  bruker nå farten over hele døgnet (FolkRegler.døgnF slås av mens farten regnes), og «folk står fast» betyr at ingen kan bygge (ingen
  byggelag eller ingen arbeidsfør på «bygg») – ikke at skiftet er over. Ellers ville «Pause ved folk står fast» slått til hver kveld.
  `o.venter` = jobbene venter på arbeidstida.
- Vakta `ut1-tid`: pauseprøven setter to arbeidsføre på «bygg» og venter til bildet sier «ikke fast» før alle får fri, og jobbtavla
  fordeler ikke under prøven (settes tilbake etterpå). I full kjøring kunne tidligere vakter ha latt byggejobber stå uten byggere, så
  «står fast» var sant fra før og ingenting endret seg (`{"tempo":10,"sist":null}`).
