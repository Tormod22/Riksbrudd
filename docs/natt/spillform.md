# Pakke «spillform» (natt 18. nov) – notat

Gren `claude/natt18-spillform`. Alle tall er Claudes forslag og står i REGLER-objektene.

## Nye filer
- `site/dovre-fliser/spill/flyt.js` – reglene øverst (`Flyt`: hendelser, stopper, anslag, tidTekst, leggIKø, nesteIKø, tømKø, køLengde,
  plasser, iRamme; `test_flyt.js`), visningen nederst (`window.FlytSpill`).
- `site/dovre-fliser/spill/scenario.js` – regler uten DOM (`Scenario`; `test_scenario.js`).
- `site/dovre-fliser/spill/scenario-visning.js` – `window.ScenarioSpill` og `window.SPILLREGLER`.
- `pipeline/fliser/vakter/spillform.js`, `pipeline/fliser/test_flyt.js`, `pipeline/fliser/test_scenario.js`, `docs/natt/spillform-hjelp.json`.
- Skript-taggene står rett før `spill/kompakt.js` (flyt.js, scenario.js, scenario-visning.js).

## SPILLREGLER (for andre moduler)
```js
window.SPILLREGLER = {
  vanskelighet: 'lett' | 'vanlig' | 'hard',
  utfordringer: ['ingenKjøp', 'evigVinter', 'ingenRadio', 'tåkeland', 'tomKasse'],   // de som er valgt
  scenario: null | 'hold' | 'tre' | 'overlev' | 'lyn',
  styrke: 0,                                   // antall ganger «sterkere motstander» er valgt etter en seier
  faktor: { penger, fiende, røvere },          // lett 1,5 / 0,75 / 0,6 – vanlig 1 / 1 / 1 – hard 0,6 / 1,3 / 1,5 (+0,25 per styrke på fiende og røvere)
  har(id)                                      // SPILLREGLER.har('evigVinter')
};
```
Finnes alltid (vanlig før et spill er startet), settes på nytt ved «riksbrudd-spill». Valgene lagres i spillet selv
(`OppstartSpill.tilstand().regler`, «riksbrudd-k1»). Regeltabellene: `Scenario.REGLER.vanskelighet / .utfordringer`.

Det denne pakka selv gjør med dem:
- `faktor.penger` ganger startkassa (Oppstart.fullfør(S, leir, faktor)).
- `faktor.fiende`: KROKER.ild – treff når en annen side skyter på «blå».
- `ingenRadio`: KROKER.kanOrdre – lag over 3 km fra leiren tar ikke ordre (køordre de alt har, går de ferdig).
- `tåkeland`: KROKER.sikt × 0,6. `evigVinter`: årstiden settes til vinter hvert 3. sekund (Vaer.settÅrstid).
- `ingenKjøp`: Leir.kjøpMateriale, Leir.kjøpDrivstoff og FolkRegler.kjøpMat pakkes inn og svarer `{ feil }` (bygg, våpen og rekruttering koster fortsatt penger).
- IKKE koblet: `faktor.røvere` (størrelsen på røverbølgene i spill/spillet-visning.js sin angrepsdel, som en annen pakke eier) – les
  `SPILLREGLER.faktor.røvere` der. Fiendens antall lag (AI) er heller ikke endret; «fiendens styrke» er treff-faktoren.

## A. Flyt
- ⏭ `#nesteh` i knapperaden (index.html): `FlytSpill.spol()` setter 600× og stopper på 1× ved første hendelse
  (`Flyt.HENDELSER`: framme, kontakt, alarm, bygg, dag, mål, tettsted, tapt). Kortet `#flytkort` sier hvorfor. `FlytSpill.sistStopp()`.
- Automatisk nedbremsing (alarm, kontakt, bygg, lag slått ut) når farten er over 1×: valg i Leir → Mål («riksbrudd-flyt»). Ikke i testene
  før `FlytSpill.test = true`.
- Marsjtid ved pekeren i 2D mens du velger mål (ekte rute opp til 8 km, ellers anslag 4 km/t × 1,3). Ikke i 3D, og ikke på telefon (ingen peker).
- Køordre: `s.kø = [[x, y] …]`, `s.køSlutt = 'grav'`, `s.køSiste`. Knapper i lagpanelet, Shift + trykk på PC. ordre() i index.html tømmer køen
  når ordren ikke kommer fra køen (`s.køGår`). Køen lagres ikke mellom økter.
- Flere lag: `FlytSpill.velg(lag)`, `velgIBildet()`, `gruppe()`; Shift + dra ramme (PC, 2D), «Velg alle i bildet» i lagpanelet, «Velg lag» i
  kommandolinja. Panelet `#flytgruppe`. `valgt` er fortsatt ett lag – gruppa er en egen liste, og velger du ett lag, oppheves den.

## B. Start, seier og tap
- Nye spill (ikke i testene; `OppstartSpill.test = true` slår det på): `S.utenLag = true`. oppstart-visning.js `fjernStartlag`: bare
  «Vaktlaget» (4 mann av 1. lag) står igjen, + 20 rasjoner (scenario-visning.js). Kjøretøyene er som før. Lagrede spill uten flagget er som før.
  index.html: patruljen er nå `PATRULJELAG` (ikke ENHETER[3]).
- Seier (strategi-visning.js `seierKort`): Større region (`StrategiSpill.størreRegion()`: radius × 1,6 og 6 tettsteder til per trinn, lagres i
  «riksbrudd-strategi».nivå), Sterkere motstander (`ScenarioSpill.sterkere()`), Fortsett, Se krigen på nytt.
- Tap: `Scenario.truet/tapSteg/utpost/etterTap`, `ScenarioSpill.tapLeiren()` – flytter leiren (k1), tømmer byggene (k2), halverer kassa og
  lageret, beholder 70 % av folkene, og laster siden på nytt. «riksbrudd-flytt» = { fra, til, tekst } leses når scenario-visning.js lastes:
  alle `riksbrudd-*` med `leir` lik den gamle får den nye (mål, dagbok, strategi …). `tapLeiren({ prøve: true })` gir bare planen.
- Mål: kapittel 5 «Krigen om regionen» (krig1, krig3, krig30, krigseier) åpner når de 14 første er nådd (til da telles og vises 14 –
  vakten «Leir-menyen og målene» i sjekk.js er uendret). `DagbokSpill.noter(tekst)`.

## C. Spillformer
- Scenarier: `Scenario.SCENARIER` (hold, tre, overlev, lyn), `Scenario.vurder(id, T, st)`, `ScenarioSpill.scenario()`. Velges på steg 3 i
  «Nytt spill». Ingen egen meny for å bytte scenario i et spill som går.
- Etterspill: `Scenario.bilde/leggTil`, «riksbrudd-etterspill» (hver 3. spilltime, høyst 240 bilder), `ScenarioSpill.etterspill()`.
- Venner: `Deling.kode(navn, farge, leir, bygg, stilling)` / `les(...).stilling`, `SpilletSpill.venner()`, `minStilling()`.
- Ukas oppdrag: `Scenario.uke/ukasOppdrag/ukeStatus/ukeKode/lesUkeKode/ukeBedre`, `ScenarioSpill.ukeStart/ukeStatus/ukeDel/ukeSammenlign`.

## Ikke gjort / kjente svakheter
- Marsjtid før ordre på telefon og i 3D. Ramme med mus i 3D.
- Røverbølgene følger ikke vanskelighetsgraden ennå (se over). Første røverbølge mot et spill uten lag er ikke tunet.
- Scenariet «Hold byen» trenger tettsteder i kartet (INFRA); på testsiden uten infrastruktur står det «ikke noe tettsted i nærheten».
- Tap av leiren er prøvd med prøvetettsteder på Dovre-siden, ikke på /norge eller /rogaland.
- «Større region» er prøvd med fire prøvetettsteder (radien økte 45 → 72 km), ikke med ekte data.
- Etterspillet viser bare tettsteder og lag (ikke bygg, kjøretøy eller kamper), og kartet under er bare mørklagt.
- Ukas oppdrag har ingen felles liste (ingen tjener) og kan jukses med – koden har bare en enkel kontrollsum.
- Id-er som begynner på «sp» får klassen «på» slått av/på av fartsknappene i index.html ([id^=sp]) – unngå slike id-er.

## Runde 2 (18. nov, etter fletting med claude/nattfiks)
- **Køen:** en vanlig ny ordre tømmer køen (ordre() i index.html), og «Stopp» gjør det samme. Vakten målte forrige gang køen FØR ordren
  (derfor `køFør: 1`). Nå er `køTømt` og `stoppTømmer` krav i vakten.
- **Marsj med bekreftelse (telefon og 3D):** `#marsjvalg` – første trykk i marsjmodus setter målet og viser avstand og tid, «Gå»
  (`#marsjgaa`) gir ordren, nytt trykk flytter målet. Gjelder berøring (siste pekertype ≠ mus) og alltid i 3D (KROKER.trykk3d). Med mus i
  2D er det som før. I testene bare med `FlytSpill.test = true` (sjekk.js sine marsjtester er uendret). `FlytSpill.utkast()`, `utfør()`.
- **Hendelser fra andre moduler:** `window.dispatchEvent(new CustomEvent('riksbrudd-hendelse', { detail: { type, tekst } }))` – type er en
  nøkkel i `Flyt.HENDELSER` (natur, brann, fanger, båt, tog, kort, annet). Spolingen stopper og viser teksten. Lagt inn (én linje hver):
  verden-visning.js (flom, ras, tog framme), sjo-visning.js (båt framme), krig-visning.js (et lag gir seg). Brann: flyt.js lytter på
  `riksbrudd-brann` (ny brann innen 3 km fra leiren). Kort som venter på svar (#hendelse, #samfunnkort, #krigkort, #formkort) oppdages
  av øyeblikksbildet uten endring hos de andre – de senker også farten ved auto-stopp.
- **Koblinger:** `faktor.røvere` ganger antall røverlag i `angrep()` (spillet-visning.js, én linje; minst ett lag; hard bølge 1 = 2 lag).
  `faktor.penger` virker mot den nye STARTPENGER (40 mill. utenom testene: lett 60, vanlig 40, hard 24, «Tom kasse» en tidel) – steg 3 viser
  beløpet. «Ingen kjøp»: innpakkingen legges på igjen etter at markedet har byttet ut kjøpsfunksjonene (hyllene), og
  `RegionSpill`s svartebørs-kjøp avviser (region-visning.js kjøp(), én linje). «Evig vinter»: VerdenSpill leser årstiden fra VaerSpill, så
  kulde/føre følger med uten endring der. «Ingen radio»: `harRadio()` i verden-visning.js og radiosambandet i krig-visning.js svarer nei.
- **Tap:** `REGLER.tap.fred = 2880` – de to første døgnene kan ikke leiren tapes.
- **Prøvd på /rogaland med ekte data:** to spilldøgn av et nytt spill med alt på (navigator.webdriver slått av): første røverbølge kom etter
  12 timer (12 røvere), startkjøretøyene (stridsvogna) slo dem tilbake, Vaktlaget var uskadd, 10 personer og mat til 3,3 døgn på dag 3,
  leiren ikke tapt. NB: byggingen i prøveskriptet slo feil (ingen bygg ble satt opp), så dette er en spiller som IKKE bygger – moralen falt
  til 33–39. «Hold byen» (Sand) og «Større region» (8 → 34 tettsteder, 45 → 76 km) virket; «Ingen kjøp» stoppet tre, mat og svartebørs
  med hyllene på; hard ga 2 røverlag; marsj med bekreftelse virket i 3D.
- **Ikke gjort i runde 2:** de seks overlevende røverne trakk seg 3,9 km unna og ble stående, så bølge 1 var «aktiv» resten av tiden (ingen
  nye bølger) – det ligger i angrepsdelen og er ikke rørt. Flyktninger/samfunnskort har ikke eget kall (de fanges som «kort som venter»).
