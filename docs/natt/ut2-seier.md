# ut2-seier – tre veier til seier og avslutningen (plan 14.6)

28. nov, gren `claude/ut2-seier`. Plan: `docs/plan-selskap-okonomi.md` kapittel 14.6, kapittel 1 og spørsmål 21 i kapittel 18.
Spørsmål 21 er ikke besvart – forslaget i planen er brukt: **tre veier (makt, penger, gjenoppbygging), og spillet kan fortsette.**

## Hva som er laget

### Reglene: `spill/seier.js` (uten DOM, `globalThis.Seier`), test `pipeline/fliser/test_seier.js`
Fremdrift 0–1 for hver side (`blå` = deg, `rød` = Ravnsund, `grønn` = Mosevakt) på hver vei. Rivalene kan vinne på alle tre.
`nådd` er streng; fremdriften er høyst 99 % til alle krav er oppfylt.

- **MAKT** – `Seier.makt(st, side, tid, Strategi.REGLER)`: leser `Strategi.stilling` (ikke regnet på nytt). Nådd = andel ≥ `seier` (0,6),
  minst `minSeier` (3) tettsteder i området og ikke før `tidligst` (3 døgn) – samme tall som krigskartet. Fremdrift = andel / 0,6.
- **PENGER** – `Seier.penger({ blå, rød, grønn }, side, tid)`: nådd = verdi ≥ **250 mill. kr**, større enn hver av de andre, og tidligst dag 4.
  - Din verdi (`Seier.verdi`): kassa + bygg (`b.pris` eller grunnprisen × hp, bare ferdige) + lager (materialer × `Leir.MATERIALER`-pris,
    diesel × `Leir.DRIVSTOFF.prisPerLiter`) + kjøretøy (lastebil 1,5 mill., speiderbil 0,8, stridsvogn 7, rakettartilleri 8, radar 4, annet 2).
  - Rivalenes verdi (`Seier.rivalVerdi`) er et ANSLAG: kassa (`EskaleringSpill.S().øk[side].kr`) + 15 mill. grunn + 800 kr per innbygger
    i tettstedene de holder + 2,5 mill. per lag + kjøretøyene. **Byttes ut med børsverdien når Gråbørsen kommer (Ø7)** – da blir også
    «ingen rival kan kjøpe deg opp» et krav.
- **GJENOPPBYGGING** – `Seier.gjenoppbygging(byer, side, { tid, sult })`: i hvert tettsted siden holder i området (minst 3):
  strøm (`GarnisonSpill.strømFor`), ingen sprengt bru/dam eller sabotert kraftverk innen 15 km som ikke er reparert (`INFRA_TILSTAND`),
  lojalitet ≥ 55 (`RegionSpill`; mangler tallet, regnes `Region.REGLER.lojStart`), holdt i minst 2 døgn; tettstedene som er bygd opp,
  har til sammen ≥ 30 % av folket i området; leiren har mat (FolkSpill `mat > 0`); tidligst dag 6. Rivalene har ingen lojalitet eller
  mat i spillet – for dem gjelder strøm, bruer, to døgn og 30 %. Fremdrift = min(del av tettstedene, del av folket), der hvert tettsted
  teller delvis (strøm/bruer/lojalitet, og halvt til det er holdt i to døgn).
- `Seier.holdt(H, eiere, tid)` husker hvem som har holdt hvert tettsted siden når. `Seier.nye(S, A)` gir veiene som er nådd og ikke vist
  (din først), og glemmer en vist seier når fremdriften faller under 85 % (da kan den komme igjen). `Seier.husk`, `Seier.avis` (tekstene).
- ALLE TALL ER CLAUDES FORSLAG (samlet i `Seier.REGLER`).

### Visningen: `spill/seier-visning.js` (`window.SeierSpill`)
- Hvert annet sekund: `SeierSpill.bilde()` – område fra `StrategiSpill.område()`, stilling fra `Strategi.stilling`.
- **Selskapet → Oversikt**: «Tre veier til seier» under trinnene – tre målere (din fremdrift som stolpe, rivalene som små merker i sin
  farge), det første som mangler, og rivalenes prosent. «✓ vunnet dag N» / «Ravnsund vant» når det har skjedd.
- **Krigskartet**: en linje under hver side i stillingen (via `KRIG_TILLEGG.side`, ingen endring i strategi-visning.js for dette):
  «Andre veier til seier: penger 49 %, gjenoppbygging 12 %».
- **Avslutningen** (i `#krigkort` med klassen `avslutning`, så pausen og kortkøene virker som før): et avisutklipp «Regionsavisa» med
  dag og klokke, «Seier · Makt – du styrer regionen» / «Tap · Penger – Ravnsund vant», overskrift og tekst i avisstil, siste linje fra
  dagboka, og tall for hele spillet: dager, kontrakter levert, tettsteder nå og flest på en gang, kassa, selskapets verdi, penger inn
  (summen i StatistikkSpill – høyst 30 døgn), folk, falne og lag slått ut. Knapper: **Spill videre** (lukker, lagrer, starter tida igjen
  hvis kortet stoppet den), **Nytt spill** (trykker «Nytt spill» i ☰ – samme spørsmål som før), og for makt som før **Større region**,
  **Sterkere motstander** og **Se krigen på nytt**. Taper du, samme kort med «Spill videre (prøv å ta det tilbake)».
  Linje i loggen og i dagboka når noen vinner.
- Lagres per leir i `localStorage` «riksbrudd-seier»: `{ leir, holdt, seire: [{ side, vei, tid, valg }], aktiv, falne, lagUt, maksBy }`.
  Falne/lag slått ut telles fra pakken kom inn (ikke bakover). Et lagret spill som alt hadde fått krigskartets seierkort, får ikke
  avslutningen for makt én gang til (`sjekketGml`). «Holdt siden» starter når pakken først ser tettstedet – i et gammelt spill må
  tettstedene holdes to døgn til før de teller for gjenoppbygging.
- Ikke av seg selv i testene: `SeierSpill.test = true`. API: `bilde, oversiktHtml, vis(vei, side), lukk(valg), erÅpen, takt, tilstand,
  lesPåNytt, tall, minVerdi, rivalVerdi, NØKKEL`.

## Fellesfiler endret
- `site/dovre-fliser/index.html`: to skript-tagger rett etter `strategi-visning.js` (`seier.js`, `seier-visning.js`), versjonsmerker satt
  med `versjon.py` (også for strategi-visning.js og selskapspanel.js).
- `spill/strategi-visning.js` (små endringer): `takt()` viser ikke lenger det gamle seierkortet / «har overtaket»-kortet når
  `SeierSpill` finnes (meldt.vunnet/seire telles som før); `seierKort(a)` viser det nye kortet (`SeierSpill.vis('makt', 'blå')`);
  `visKort` tar bort klassen `avslutning` fra `#krigkort`.
- `spill/selskapspanel.js`: én linje i `oversikt()` – `SeierSpill.oversiktHtml()` før «Det viktigste nå».

## Prøvd
- `node pipeline/fliser/test_seier.js` (og test_strategi, test_trinn, test_selskapsbilde, test_skjermlag, test_kommando) – ok.
- Nettleser (Dovre-testsiden med infrastrukturen fra /tmp/kart-infra-…, 1400 × 860 og 390 × 844 mobil): Oversikt med tre målere,
  Krig med linjene, avslutningen for seier (makt) og tap (penger, Ravnsund) – bilder sett, 0 sidefeil.
- Vakt `pipeline/fliser/vakter/ut2-seier.js` – ok på PC og mobil (ca. 1 s). Med en feil lagt inn med vilje (lagre() fjernet i lukk)
  svarte den «seieren ble ikke lagret». Vaktene `spillform` (bruker `StrategiSpill.seierKort`), `ut1-selskap` og `krig` er fortsatt ok.

## Ikke gjort / senere
- Gråbørsen (Ø7): penger-veien bruker et anslag for rivalene. «Ingen rival kan kjøpe deg opp» er ikke et krav ennå.
- Gjenoppbygging ser ikke på vann og veger (finnes ikke som tilstand i spillet), og «byene du har avtale med» er i dag «tettstedene du holder».
- «Start i en ny region med et lite forsprang (rykte)» er ikke laget – «Nytt spill» er det vanlige nye spillet.
- Tilstandsendringen «Spill videre» er bare husking per leir (som krigskartets `meldt`), ikke gjennom kommandolaget.
- Rivalenes verdi og fremdrift vises ikke i et eget panel ut over merkene og prosentene.
