# ut5-rivaler – fase Ø8: rivalene gjør det samme

28. nov, gren `claude/ut5-rivaler`. Plan: `docs/plan-selskap-okonomi.md` kapittel 15 punkt 4 («Fienden som ekte motstander»), 3.3 («Rivalene frir
også»), 8 (pakter, felles anlegg), 9 («Rivalene investerer også») og Ø8 i kapittel 16. **Alle tall er Claudes forslag** (samlet i
`Rival.REGLER` / `Rival.PRIORITET` i `spill/rival.js` og `Byavtale.REGLER.rivalLøfte`), unntatt lønnen (15 000 kr per mann per døgn – brukerens
tall for spilleren, brukt likt for rivalene). Ravnsund og Mosevakt bruker de samme systemene som spilleren, i en enkel, regnet form uten egne figurer.

Åpne spørsmål i kapittel 18 som berører dette: nr. 6 (rivalene som allierte) er alt besvart med forslaget i ut4-firmaer; nr. 4 (oppkjøp av
selskapet ditt) er ikke laget her – børsen eier det. Nr. 21 (seier): forslaget (tre veier) brukes, rivalene velger blant dem.

## Filer

| Fil | Hva |
|---|---|
| `site/dovre-fliser/spill/rival.js` (ny) | Reglene uten DOM (`window.Rival`): lønn, råd til lag (`rådTak`), lønnssteg og lag som går, sagbruket, veien til seier (`velgVei`, `PRIORITET`), sabotasjen, og `simuler()` – en enkel rival som spiller 30 døgn selv (økonomitesten). |
| `site/dovre-fliser/spill/rival-visning.js` (ny) | `window.RivalSpill`: takten (hver spilltime / hver morgen), koblingene til eskalering, byavtale, selskap, firma og seier, AI-styreren (vokte avtalebyene), krigskartet, Partnere, sabotasjen, lagringen i `riksbrudd-rival` (per leir). |
| `pipeline/fliser/test_rival.js` (ny) | Regeltest, 59 sjekker, med økonomitesten for rivalen (60 frø × 30 døgn). `SELVTEST=1` legger inn en feil med vilje (flaks × 3, inntekt × 4) – den slår ut. |
| `pipeline/fliser/okosim-rival.js` (ny) | Kravet «rivalene» i den felles økonomitesten (`test_okonomitest.js` laster alle `okosim-*.js`). |
| `pipeline/fliser/vakter/ut5-rivaler.js` (ny) | Vakta. |
| `docs/natt/ut5-rivaler-hjelp.json` (ny) | Fem hjelpeemner. |

## Hva som er laget (per punkt i oppdraget)

1. **Rivalenes økonomi.** Kassa er eskaleringens (`EskaleringSpill.S().øk[side].kr`, med eskaleringens tak på 30 mill.). Hver spilltime:
   lønn (15 000 kr per levende mann; `Rival.lønnSteg` – kassa går ikke under 0, `Ø.ubetalt` teller minutter uten lønn), betaling fra rivalens
   byavtaler (prisen per døgn), det de tjente på kontrakter (selskap.js teller det i `sider[side].sum.tjent` – nå kommer pengene i kassa),
   sagbruket og halve anlegget i et firma. **Ett sagbruk** i det største tettstedet de holder, når kassa har 6 mill. + 4 mill. i reserve og
   veien sier det (penger fra døgn 3, gjenoppbygging 6, makt 12): 1,1 m³ planker i timen × 20 000 kr × 0,5 (salg) − lønn til tre folk ≈ 0,22 mill.
   i døgnet, slites og repareres for 300 000 kr; tar noen tettstedet, er saga tapt. **Råd til lag** (`Rival.rådTak`, `AI.rådTak(side, tak)`):
   + ett lag per 8 mill. i kassa (høyst + 3); kan kassa + døgnets inntekt ikke betale grunntaket i to døgn, bare så mange lag som kan betales
   (minst 1). Både forsterkningene (`fraksjoner-visning.js`) og eskaleringens kjøp (`eskalering-visning.js`) spør. Ett døgn uten lønn og flere
   lag enn de har råd til: det svakeste laget går («Etterretning: Ravnsund klarer ikke å betale lønn …»).
2. **Byavtaler.** `byavtale.js` (bare rivalenes trinn): `rivalKunde` – en rival som har levert en kontrakt for byen er **kunde** (eget felt
   `b.rivalKunde`, så byavtale-visning.js viser `b.rival` som før) og frir helst dit (× 1,5); **beskyttelse** som før (forhandling ett døgn);
   **løftet**: 4 friske mann innen 3 km i 70 % av timene (`rivalTime` hver spilltime, `rivalDøgn` hver morgen); rivalens tillit hos byen starter
   på 45, + 3 / − 10 per døgn; **handel** etter fem holdte døgn (gamle lagringer uten tellingen: sju døgn som før); **byen sier opp** under tillit
   25 eller etter tre brudd, sier fra til deg («… har sagt opp avtalen med Ravnsund (3 brutte løfter). Byrådet sier fra til dere – nå kan dere
   forhandle selv»), og vil ikke snakke med den rivalen på tre døgn (`b.rivalStengt`, lagres). `Byavtale.rivalMål` får tida fra rival-visning.js.
   **AI-en holder løftet:** `AI.styrere` (ny liste i fraksjoner-visning.js, spørres når eskaleringen ikke styrer laget) – det nærmeste ledige
   laget (innen 25 km) går til en vaktpost 700 m utenfor tettstedets kant (innenfor 3 km, men utenfor byen – ellers ville laget ta den), i
   seks timer om gangen. En by siden har beskyttelse/handel med, tas ikke med makt (filtrert ut av byene AI-en velger blant, og av eskaleringens mål;
   `AI.avtaleMed(side, id)`). Prøvd i nettleseren: lagene gikk dit («går til Midtby for å holde løftet til byen» → «vokter Midtby (avtale)»).
3. **Firmaer.** `firma.js` (én samlet blokk «ut5-rivaler»): `f.rival = { levert, kunde, anlegg }`. **Fast kunde** etter to kontrakter rivalen
   har levert for firmaet (når dere ikke er fast kunde der), i ti døgn; da tar rivalen firmaets åpne tilbud (50 % per døgn per tilbud), og dere kan
   ikke bli fast kunde der så lenge (`kanSamarbeid`: «Ravnsund er fast kunde der nå»). **Felles anlegg:** på veien penger 20 % sjanse per døgn
   (gjenoppbygging 10 %, makt aldri) for å kjøpe halve anlegget – Storlia Tømmer først («kappløpet om Storlia») – når kassa har prisen + 4 mill.;
   de får halve overskuddet hvert døgn, og dere kan ikke eie det sammen med firmaet («Ravnsund eier halve sagbruket»). **Andeler:** når
   `BorsSpill.rivalKjøp(side, kr)` finnes, kalles den (penger-veien, 25 % per døgn, 2 mill.; den skal gi tilbake hvor mye som ble brukt);
   ellers `window.RIVAL_KROKER` (liste av `(side, { kasse, vei, betal(kr) }, RivalSpill) => …`, kalt hver morgen). `Firma.rivalTekst` viser
   også `f.rival.andel = { rød: prosent }` hvis børsen skriver det. **Fanen Partnere:** én linje under hvert firma («Rivalene: Ravnsund er fast
   kunde (tar tilbudene deres) · Mosevakt eier halve mølla») og én under hver rival («Ravnsund satser på penger · fast kunde hos Storlia Tømmer»).
4. **Mål.** `Rival.velgVei` hver morgen etter fremdriften i seier.js (`SeierSpill.bilde().A[side]`) × stil (Ravnsund liker penger × 1,2, makt
   × 1,05; Mosevakt gjenoppbygging × 1,25), bytter bare når en annen vei er 1,25 × bedre. **Prioritet:** makt – som før (tar tettsteder, sag sent);
   penger – flere mann ved avtalebyene (× 1,25), sag fra døgn 3, ekstra kontrakter (30 % per døgn), kjøper anlegg og andeler; gjenoppbygging – går
   ikke løs på leiren din (holder det de har), reparerer én sprengt ting nær tettstedene sine per døgn (1,5 mill.; `INFRA_TILSTAND.delete` = hel,
   som odeleggelse.js). **Krigskartet** (`KRIG_TILLEGG.side`): «Ravnsund satser på penger · sagbruk i X · 1 byavtale»; per tettsted
   (`KRIG_TILLEGG.by`): «Ravnsund er kunde her», «Byen har sagt opp Ravnsund», «Ravnsund har et sagbruk her». Bytter de vei: etterretning i loggen.
   Strategi-visning.js er **ikke** endret – krokene fantes.
5. **Sabotasje.** Sjanse per morgen per rival 4 % (× 2,5 når de ligger bak deg i verdi, × 0,5 med pakt, × 0,5 med minst to på vakt), ikke de
   første tre døgnene og høyst hvert andre døgn per rival. En ferdig maskin i leiren mister 35 % hp (`Leir.skad`), eller 20 % av én vare
   forsvinner fra lageret. Med minst to på vakt jager vaktene sabotøren bort halvparten av gangene. **Svar:** har dere en pakt med rivalen, er
   den brutt – av dem (`Firma.brytPakt(…, side)`, ingen rykte-straff for dere) – og meldingen sier hvor de holder til («send lag mot Ravnsund i X»).
   Skjer bare når `!navigator.webdriver || RivalSpill.test`.
6. **Økonomitesten.** `Rival.simuler` (12 tettsteder: én storby på 60 000 og elleve mindre; rivalen starter med ett lite tettsted og to lag;
   frie lag tar nøytrale tettsteder 20 % per lag per døgn etter fredstiden, storbyen fra eskaleringens storbyFra med fire lag; spilleren og den
   andre rivalen tar også tettsteder; byavtaler, kontrakter, saga og lønn som i spillet; seier med seier.js). Resultat (60 frø):
   Ravnsund vinner median dag 20 (10 %: dag 13), 44 av 60 innen 30 døgn, alle på makt; Mosevakt median dag 21 (10 %: dag 12). Ingen ble blakk
   (median «aldri»). En rival uten inntekt blir blakk før dag 10 (lønna virker). Selvtesten (flaks × 3, inntekt × 4) gir median dag 13 og slår ut.

## Fellesfiler endret (nøyaktig)
- `site/dovre-fliser/index.html`: to skript-tagger rett etter `fraksjoner-visning.js` (`rival.js`, `rival-visning.js`) + `versjon.py`.
- `spill/fraksjoner-visning.js` (samlet, merket «ut5-rivaler»): `AI.styrere = []` og `AI.rådTak = null` ved `AI.pakter`; etter `AI.styr` spørres
  styrerne når eskaleringen ikke styrte laget; forsterkningen bruker `AI.rådTak(side, tak)`; byene AI-en velger blant, filtreres med `AI.avtaleMed`.
- `spill/eskalering-visning.js` (to steder): taket i `økonomi()` går gjennom `AI.rådTak`, og `byer()` tar ikke med byer siden har avtale med.
- `spill/byavtale.js` (rivalenes trinn): `REGLER.rivalLøfte`, `rivalMål(S, byer, side, nå)` (kunde-vekt, stenging), `rivalVokser` (holdte døgn),
  nye `rivalKunde`, `rivalTime`, `rivalDøgn`; `fraJSON` tar med `rivalStengt` og `rivalKunde`. test_byavtale.js er grønn.
- `spill/firma.js` (én blokk før «tekster» + `kanSamarbeid` + `fraJSON` + api): `rivalLevert`, `rivalKunde`, `rivalKanAnlegg`, `rivalAnlegg`,
  `rivalAnleggDøgn`, `rivalTekst`, `anleggBestemt`; `f.rival` lagres. test_firma.js er grønn (71).
- `spill/firma-visning.js` (to linjer, merket «ut5-rivaler»): linja «Rivalene: …» i firmaets boks og `RivalSpill.partnerTekst(side)` i rivalens boks.

## API (window.RivalSpill)
`test`, `S()`, `sett(d)`, `nullstill()`, `tak(side, grunn)`, `inntekt(side)`, `time(min)`, `døgn()`, `velgVei(side)`, `vei(side)`, `settVei(side, v)`,
`sabotér(side, { tving, stopp })`, `reparer(side)`, `tarTilbud(side, k, grunn)`, `kontrakter()`, `byDøgn(side)`, `styr(s, v)`, `partnerTekst(side)`,
`veiLinje(side)`, `meldinger` (de siste ti meldingene), `lagre()`, `les()`, `NØKKEL`. Også `AI.rådTak`, `AI.avtaleMed`, `AI.styrere`, `window.RIVAL_KROKER`.

## Prøvd i nettleseren
- Vakta på PC (1400 × 860) og mobil (390 × 844): ok, under 0,2 s, 0 sidefeil, og alt er likt før og etter (eskaleringens kasse, lag, byavtaler,
  lager, tilbud, Storlia, lagringen, flagget). Feil med vilje (taket alltid grunntaket + ingen melding om oppsigelsen): vakta fant begge.
- Hele flyten med testflaggene (scratchpad `natt/rivaler/prov2.js`, 60×/3600× i to prøvetettsteder): lønna trekkes, byavtalen betaler,
  løftet telles time for time, et rødt lag går til vaktposten og vokter, et annet tar ikke byen de har avtale med. Bilder av Partnere
  (PC og mobil) og krigskartet («Ravnsund satser på penger · 1 byavtale»).

## Ikke gjort / delvis
- **Børsen (Ø7)** fantes ikke i denne kopien: rivalene kaller `BorsSpill.rivalKjøp` når den kommer; ellers `RIVAL_KROKER`. Rivalene er ikke
  «notert» (kursen/oppkjøp er børsens).
- Rivalenes **produksjon** er bare saga (ingen vedkløyver/varer, ingen leveranseavtaler eller eksport).
- Rivalene **forhandler ikke om pris** mot deg utover det byavtale.js alt gjorde (de byr 0,9 × verdien); de tar ikke medlemskap.
- Sabotasjen har ingen figur (ingen sabotør å fange i kartet) og ingen spion i gjengen (planen 14.3).
- «Gjenoppbygging» reparerer bare sprengte ting; den bygger ikke strøm.
- Rivalens **vei** endrer ikke eskaleringens angrepsmål (makt = som før).
