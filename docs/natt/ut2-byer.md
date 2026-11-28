# ut2-byer – byene på laget (fase Ø3)

28. nov 2026. Planen `docs/plan-selskap-okonomi.md` kapittel 3 og fasetabellen Ø3 i kapittel 16. Grenen: `claude/ut2-byer`.
**Alle tall er Claudes forslag** (samlet i `Byavtale.REGLER`). Kapittel 18 spørsmål 2: forslaget er brukt – en by kan fortsatt tas med
makt, men starter da med frykt 80 og tillit 10.

## Filer

| Fil | Hva |
|---|---|
| `site/dovre-fliser/spill/byavtale.js` (ny) | Reglene uten DOM: leder og holdning, behov, trinn, pris/verdi, forhandling, avtalen time for time og døgn for døgn, oppsigelse, bønn om hjelp, rivalene, vekt i krigsstillingen, lagring. |
| `site/dovre-fliser/spill/byavtale-visning.js` (ny) | `window.ByavtaleSpill`: takten, kommandoene, fanen Byer (liste, byens kort, forhandlingskortet), ringene i kartet, varselbrikken, linjene i Krig, kobling til Region og Strategi. Lagres i `riksbrudd-byavtale` per leir. |
| `pipeline/fliser/test_byavtale.js` (ny) | Regeltest (også `Strategi.stilling` med partnere). |
| `pipeline/fliser/okosim-byer.js` (ny) | Økonomitesten: del «byavtaler» og strategien «byer med avtaler» (id `avtaler`) + fire krav. |
| `pipeline/fliser/vakter/ut2-byer.js` (ny) | Vakta. |
| `docs/natt/ut2-byer-hjelp.json` (ny) | Tre hjelpeemner («Lag og strid»). |

## Reglene (Byavtale)

- **Tre tall per tettsted (0–100):** tillit (start 30), frykt (start 5) og behov (regnet hver gang: trygghet etter nærmeste fiende og om egne
  lag står der, strøm fra `GarnisonSpill.strømFor`, mat for byer/industri/oljebyer, ved om vinteren). `behov.hoved` = det byen trenger mest.
- **Byrådet:** `Byavtale.leder(id, folk)` – navn, «ordfører» (under 5000) / «leder for krisestyret», og holdning forsiktig/grådig/patriot/redd,
  fast per tettsted (hash av id). Holdningen virker på pris, løfte, varighet, frykt og hvor fort tilliten stiger.
- **Trinnene:** nøytral → kunde (minst én levert kontrakt for byen, `giver.by`) → beskyttelse (tillit 40) → handel (tillit 55, en beskyttelses-
  avtale holdt i 5 døgn) → medlem (tillit 70, frykt under 50, handel holdt i 7 døgn). En by du har tatt med makt kan bli medlem direkte.
- **Pris (per døgn):** grunnpris beskyttelse 25 kr per innbygger (minst 45 000, høyst 900 000), handel 15 kr (minst 30 000, høyst 550 000).
  Planen foreslo ca. 15 kr; økonomitesten viste at med løftet om fire mann (60 000 kr i lønn) tapte du penger på alle byer under ca. 4000
  innbyggere – derfor 25 kr og et gulv. `verdi()` ganger med behov (0,7–1,3), holdning, løfte (2/4/6 mann og svartid 4/2/1 t), varighet og tillit.
- **Forhandlingen:** pris ≤ verdi = ja; opptil 1,35 × verdi = motbud (verdien); ellers nei. Forhandler en rival, må du by under 0,85 × rivalens
  pris. Medlem har ingen pris (byen betaler skatt via region.js).
- **Avtalen:** hver spilltime telles egne friske mann innen 3 km (`Byavtale.time`); døgnet er holdt når løftet holdt i 70 % av timene (+2 tillit,
  patriot ×0,7), ellers −8 og et brudd. Byen sier opp under tillit 25 eller etter tre brudd: avtalen gjelder ett døgn til, tillit −15, nabobyene
  innen 15 km −5, og byen vil ikke forhandle på 3 døgn. Når varigheten er ute, er avtalen over (+3 tillit uten brudd) og må forhandles på nytt.
- **Vokte uten avtale:** minst 2 mann i byen i minst 12 av døgnets timer gir +2 tillit, opp til 50 (ellers kom man aldri fra 30 til 40 uten
  kontrakter for akkurat den byen). Kontrakt levert for byen: +4.
- **Byen ber om hjelp:** fiende innen 4 km fra en by med avtale → `riksbrudd-by-ber` (detail: tekst, by, navn), melding og varselbrikke. Frist =
  løftets svartid. To egne mann innen 1,5 km før fristen: +5; for sent: −10 og et brudd. Høyst én bønn per 4 spilltimer.
- **Rivalene (enkel AI):** hvert døgn 35 % sjanse per rival for å fri til den beste nøytrale byen innen 20 km fra et tettsted de holder
  (`rivalMål`). Etter et døgn får de beskyttelsesavtalen hvis du ikke har kommet først (−4 tillit hos deg), etter 7 døgn handel (teller halvt for
  dem). Byr du under, går rivalen tomhendt. Rivalene tar ikke medlemmer og bruker ikke lag – det er Ø8.
- **Makt:** et tettsted som blir ditt uten avtale får tillit 10 og frykt 80 (`RegionSpill.startLoj`, bare utenfor testene). Frykten faller 3 per
  døgn. Med garnison og frykt fra 50 er byen **lydig**: ingen uro og betaler som om lojaliteten var 50 (`RegionSpill.lydig`, i `stFor`). Uten
  garnison: lojalitet 10 = opprør, byen er nøytral igjen.

## TILLIT OG LOJALITET (valget)

For et tettsted du **holder** (eier blå – tatt med makt eller medlem) er tilliten det samme tallet som lojaliteten i region.js. Visningen
leser `RegionSpill.lojFor(id)` og skriver med `RegionSpill.settLoj(id, v)` (kontrakter, hjelp, holdt/brutt løfte). For alle andre tettsteder
står tilliten i byavtalen. Når en by blir medlem, får region-lojaliteten tilliten (`RegionSpill.nyttMedlem`: eier blå, `b.medlem = true`,
full skatt med en gang – ingen innkjøring, de valgte deg). Et medlem gjør ikke opprør (region-visning.js hopper over opprør for `b.medlem`); det
sier heller opp, og da blir byen nøytral (`RegionSpill.ikkeMedlem`, merket som mistet).

## Visningen

- **Selskap → Byer** (selskapspanel.js spør `ByavtaleSpill.fane(liste)`): hver by med trinn, rival, «ber om hjelp», tillit/frykt/behov og «Åpne».
- **Byens kort:** leder, holdning, tre målere, behovet i ord, avtalen (pris, løfte, døgn igjen, løftet holdt i dag x av y t, egne mann nær, brudd),
  rivalens bud, bønnen om hjelp, knappene Forhandle / Send lag / Vis i kartet / Si opp, og hva som mangler for neste trinn.
- **Forhandlingskortet:** avtale (beskyttelse/handel/medlem), pris med − / +, løftet (tre valg), varighet (tre valg), «Send tilbudet»; svaret
  ja/nei/motbud, og «Godta motbudet».
- **Kartet (KROKER.tegn):** ring i avtalefargen (kunde grå stiplet, beskyttelse gul, handel grønn, medlem blå), rivalens ring stiplet i deres farge,
  rød puls når byen ber om hjelp.
- **Krig:** `KRIG_TILLEGG.by` (avtale, «Ravnsund forhandler med Lesja», rivalens avtale) og `.side` («Ravnsund forhandler med Lesja.»,
  «Byavtaler: …» for deg). **Stillingen:** medlemmer teller fullt (eid), handelspartnere halvt (`Strategi.avtaler`).
- **Varselbrikke** (`VARSEL_TILLEGG`): «Lesja ber om hjelp · frist 2 t»; trykk = byens kort.

## Kommandoer (KOMMANDO)

- `byForhandle { by, trinn: 'beskyttelse'|'handel'|'medlem', pris, løfte: 'lite'|'vanlig'|'stort', varighet: 7|14|30 }` → `{ svar, grunn, motbud }`.
- `bySiOpp { by }`. «Send lag» bruker den vanlige `ordre`-kommandoen (nærmeste ledige egne lag).

## API (window.ByavtaleSpill)

`test` (true = takten og maktregelen også under webdriver), `fane(liste)`, `trykk(knapp)`, `timeSteg()`, `døgnSteg()`, `info(id)`, `område()`,
`tillit(id)`, `endreTillit(id, d)`, `forhandle({…})`, `siOpp(id)`, `tilstand()`, `sett(d)`, `nullstill()`, `ringer(g, vx0, vy1)`, `velg(id, modus)`,
`mannNær(by, r)`, `NØKKEL`. Takten kjører bare når `!navigator.webdriver || ByavtaleSpill.test` (time for time etter `tid`, høyst 48 timer
per sekund).

## Endringer i filer jeg ikke eier helt

- `spill/strategi.js` (bare stillingen): `stilling(byer, eierAv, sider, avtaleAv)` – nytt fjerde ledd og `Strategi.avtaler` (settes av
  byavtale-visning.js); `sider[s].partnere`. Uten avtaler som før.
- `spill/region.js`: `fraJSON` beholder `medlem`.
- `spill/region-visning.js` (samlet): `status()` bruker `api.startLoj` for nye tettsteder; `steg()` hopper over opprør for medlemmer og for
  lydige byer med garnison; `stFor()` gir lydige byer med garnison lojalitet minst 50 i faktoren; nye API-er `leggIPott`, `typeFor`, `lojFor`,
  `settLoj`, `nyttMedlem`, `ikkeMedlem`, `startLoj`, `lydig`.
- `spill/selskapspanel.js` (bare fanen Byer): `byer()` spør `ByavtaleSpill.fane`; klikk på `[data-sp^="ba-"]` går til `ByavtaleSpill.trykk`.
- `index.html`: to skript-tagger rett etter `region-visning.js` (`byavtale.js`, `byavtale-visning.js`), versjonsmerker fra `versjon.py`.
- Avtalebetalingen går i Region-potten (`leggIPott` + `lever`), så den står som «skatt» i dagboka (penger-visning.js klassifiserer etter fil;
  jeg har ikke endret den). Bør få egen post «byavtaler» der.

## Økonomitesten

`okosim-byer.js`: del «byavtaler» (tillit fra leverte kontrakter, timer og døgn med `Byavtale`, betaling `sim.gi(…, 'byavtaler')`,
handelsvarer i `sim.pott`, oppsigelse, medlemmer blir eid og betaler skatt via delen «byer» i okosim.js) og strategien «byer med avtaler»:
troppen tar kontrakter som «bare kontrakter», men **bare fra tettstedene** (ikke firmaene); vaktlag på fire til de fire beste nøytrale byene
(mest folk per km, minst 600 innb., innen 25 km); beskyttelse → handel → medlem til prisen byrådet godtar.

Resultat (60 frø, `OKO_STRENG=1` grønn, båndet lagret med `OKO_NYTT_BAND=1`): median dag 30 **ca. 88 mill.** [10–90 %: 44–122] mot
«byer med makt» 5 og «bare kontrakter» 104 – kravet «på nivå» er minst 80 % av kontraktene (88,6 mot 103,8 = 85 %).
Inn: kontrakter 112, skatt 9, salg 5, avtaler 2,8 mill. Medlem i 56 av 60 kjøringer. 100 frø: også grønn (høyst 142 mill.).

**Ærlig om balansen:** (1) Byavtalene selv gir lite (2–3 mill. på 30 døgn); veksten kommer fra skatten fra medlemmene, +25 % på kontrakter i
egne tettsteder (selskap.js) og varene. (2) Da strategien tok alle kontrakter i tillegg til byene, gikk den over 200 mill. i 1–2 av 60 kjøringer
(kontraktenes øvre hale er allerede ca. 190) – derfor bare bykontrakter. Høyeste kjøring er nå 198,6 mill. i 60 frø: **tett på grensen**.
(3) Modellen kjører de samme strategiene litt forskjellig avhengig av hvor mange frø som kjøres (tilstand som lekker mellom kjøringene i
okosim.js – fra før). (4) Maktregelen (tillit 10/frykt 80) er IKKE lagt inn i okosim.js: med «lydig» betaler en redd by med garnison som
lojalitet 50, nesten som før. Prøvd: tillit 10 uten lydighet ga «byer med makt» 15 % blakk (kravet er 10 %).

Ikke i modellen: bønner om hjelp, rivalene som frir, frykt, at byer sier opp fordi lagene er borte.

## Prøvd i nettleser (Dovre-testsiden, prøvebyer lagt inn – siden har ikke tettsteder uten kartlageret)

PC 1400 × 860 og mobil 390 × 844: fanen Byer, byens kort, forhandlingskortet (motbud → godta → avtale), ringen rundt byen, rival i Krig
(«Ravnsund forhandler med Lesja.»), bønn om hjelp (rød puls, melding, varselbrikke). Ingen sidefeil. Vakta grønn på PC og mobil (0,4–0,6 s);
med feil lagt inn med vilje (`betaling` = 0) sa den «betalingen kom ikke (0 kr)».

## Ikke gjort (senere faser)

- Medlemmenes rekrutter og bygdevern, «byen kan kreve ting», base i byen (kapittel 3.3, «Byens folk»).
- Hard skatt og ryktet «hardhendt» øker ikke frykten ennå (bare makt).
- Rivalene sender ikke lag, saboterer ikke og tar ikke medlemmer (Ø8). Du kan ikke sabotere rivalens forhandling.
- Portretter av byrådslederne (spørsmål 10) – bare navn og holdning.
- Egen dagbokpost for byavtaler (penger-visning.js).
- Byens kort ved trykk på byen i kartet (kortet åpnes fra Selskap → Byer og varselbrikken).
