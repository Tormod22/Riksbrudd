# ut1-okotest – økonomitesten som spiller selv (G1)

28. nov 2026. Fase G1 i `docs/plan-selskap-okonomi.md` (13.4 og fasetabellen i kapittel 16). Ingen endring i siden, ingen skript-tagg,
ingen vakt (Node-test). Alle tall i modellen er **Claudes forslag**; tallene fra spillet hentes fra regelmodulene.

## Hva som er laget

| Fil | Hva |
|---|---|
| `pipeline/fliser/okosim.js` | Selve simuleringen: ett spill i 30 spilldøgn, time for time, med de ekte reglene. `REGLER` øverst = det modellen selv trenger. |
| `pipeline/fliser/test_okonomitest.js` | Kjører alle strategiene med 60 frø hver (420 kjøringer, ca. 5–10 s), skriver båndet og sjekker kravene (`REGLER` og `KJENT` øverst). |
| `pipeline/fliser/okonomitest-band.json` | Det lagrede båndet (median og 10–90 % per strategi og dag, medianen av hver inntekt). |
| `pipeline/fliser/okosim-hogst.js` | Eksempel på en økonomidel i egen fil: «hogst og salg» (Ressurser + Marked). |
| `site/dovre-fliser/spill/selskap.js` | **Én feil rettet** (se «Feil som er rettet»). |

Kjøring: `node pipeline/fliser/test_okonomitest.js`. Valg: `OKO_FRO=100` (flere frø), `OKO_VIS=kontrakter OKO_FRO_EN=3` (hendelsene i
én kjøring), `OKO_NYTT_BAND=1` (lagre båndet på nytt etter en ønsket endring), `OKO_STRENG=1` (de kjente bruddene feiler også).
(Miljøvariablene heter `FRO`, ikke `FRØ`: skallet godtar ikke ø i navn.)

## Modellen (hva som regnes – og hvor tallene kommer fra)

Hver time: `Leir.steg` (byggelag, strøm, diesel), `FolkRegler.steg` (mat, moral, sult, folk som drar), `FolkRegler.lønnSteg` (15 000 kr per
person i døgnet med inflasjonen, også mennene i troppene), `Leir.vedlikehold`, diesel og mat kjøpt i markedet (`Marked`: pris, hyller,
inflasjon 1 % per døgn). Startkassa er spillets ekte 40 mill. (`oppstart.js` leses i en sandkasse uten `module`/`navigator`, ellers gir den
testverdien 100 mill.). Startleiren er kontrollrom, brakke, aggregat og dieseltank (som `test_balanse.js`), bygget med `Leir.bygg` og
materialer kjøpt med påslaget (`Marked.kjøpspris`), + 500 l diesel. Ti personer (`FolkRegler.ny`) og vaktlaget på fire (`Scenario.REGLER`).

- **Kontrakter**: `Selskap` fullt ut – `førsteKontrakt`, `lagTilbud` hver morgen med inflasjonen, `dagSteg` (andre selskaper tar tilbud),
  `godta` med kravene (`kanTa`: nivå, lagstørrelse, kjøretøy, forsvar), `marsjVurdering` (fristen), `steg` (frister, konkurrenter, angrep på
  eskorten, hold-timer), `lever`/`bryt` (betaling, bøter, rykte, nivåer, rekrutt, motangrep, +25 % i eget tettsted). Troppen marsjerer
  (`Terreng.fart`: 5 km/t på veg, 2–3 i terrenget; 60 % veg, ruta 1,3 × luftlinja, `Selskap.REGLER.marsj.slakk`), eskorten kjører
  (halve `Kjoretoy.TYPER.lastebil.maks` = 40 km/t), kampene regnes med `Terreng.ildrunde`/`fordelTreff` (sperra og angrepslaget: seks mann som
  i `selskap-visning.js`).
- **Tettsteder**: `Krig.vernMenn`/`vernRunde` (bygdevernet), `Garnison.tidMed`/`minstFor` (inntaket), `Strategi.anbefalt` (troppens størrelse),
  `Region.gir`/`lojSteg`/`opprør`/`by`/`mistet` (skatt med forvaltning og innkjøring, mat, materialer, diesel, rekrutter, lojalitet).
- **Røverne**: `Trussel.lagFor`/`menn`/`vent`/`belønning`/`bytte`/`brutt`; vaktlaget, troppene hjemme og folk på «vakt» (Leirvakta) forsvarer.
- **Regionen** (Claudes forslag, `REGLER.region`): 6–10 tettsteder 3–30 km unna, 60 % med 200–1500, 30 % med 1500–6000 og 10 % med
  6000–25 000 innbyggere, typen fra `Region.type`, 85 % med strøm, 20 % holdt av Ravnsund/Mosevakt fra start, tre bruer.
- **Motstanderne** (Claudes forslag): 4 % sjanse per døgn for at de prøver å ta hvert av dine tettsteder igjen (8 mann mot garnisonen),
  3 % for at de tar et nøytralt.

Det modellen **ikke** har: ekte veger og ruter (luftlinje × 1,3), stridsreglene/bevæpning/høyde/granater (alle har rifle), skade på bygg
fra røverne, tap av leiren, røverbølger etter ekte minutter (bare spilltid – en spiller på 1× får dem oftere), hendelseskort, oppdrag (hent,
redd, post), svartebørsen, leting i hus, salg av materialer (unntatt i «hogst og salg»), søvn/hvile for troppene (bare én time
«reaksjonstid» mellom jobbene) og en motstander som tar kontrakter. Strategiene er flinke og våkne hele døgnet.

## Strategiene

| id | navn | fornuftig | hva |
|---|---|---|---|
| ingenting | gjør ingenting | nei | startleiren, kjøper bare mat og diesel |
| kontrakter | bare kontrakter | ja | én tropp på seks (vokser med nivået) tar den kontrakten som gir mest per time og rekker fristen |
| byer | byer med makt | ja | en tropp tar de nøytrale tettstedene med mest folk per km, lar en garnison på tre stå igjen |
| bygger | bygger og venter | nei | drivhus, solceller, vakttårn, brakke … når kassa har råd; ingen inntekt |
| forsvar | forsvarer leiren | nei | åtte mann hjemme; belønningen for røverbølger er eneste inntekt |
| blandet | kontrakter, bygg og byer | ja | kontrakter, bygger med reserve, fra dag 5 tar tropp nummer to tettsteder |
| hogst | hogst og salg | ja | fire på hogst, to på frakt, selger det markedet tar imot (i `okosim-hogst.js`) |

## Kravene (Claudes forslag, `REGLER` i testen)

1. Ingen strategi over **200 mill.** på 30 døgn – feiler med ««bare kontrakter» går over grensen på dag 16 (median i 57 av 60 kjøringer …)».
2. «Gjør ingenting» er ikke blakk før dag 5 (blakk = kassa under ett døgns lønn og vedlikehold) og går nedover (dag 1 → 10 → 20 → 30).
3. En fornuftig strategi er blakk de tre siste døgnene i høyst 10 % av kjøringene, og ender over «gjør ingenting».
4. **Båndet**: medianen dag 10 og 30 og medianen av hver inntekt skal ligge nær det lagrede (`okonomitest-band.json`) – ellers «FLYTTET».
5. **Selvtest**: den gamle døgnlengdefeilen (tettstedene ga 2,4 × skatt) legges inn med vilje for «byer med makt» – båndkontrollen skal si fra.
   (Gjør den: «inntekten «skatt» … median 26,0 mill. FLYTTET (lagret 10,8 mill. ± 3,8 mill.)».)
6. Den første kontrakten blir liggende til spilleren tar den (se under; prøvd med feilen lagt tilbake: testen feiler med 273 av 1500).
7. Hele testen under 100 s (i dag 5–10 s).

**KJENT** i testen = krav som brytes i dag og står her som funn. De skrives ut, men feiler ikke testen (balansen skal ikke endres i
denne pakka); `OKO_STRENG=1` gjør dem til feil. Fjern linja i `KJENT` når balansen er rettet, og kjør `OKO_NYTT_BAND=1`.

## Resultatet (60 frø, sommer; kassa i mill. kr, median [10–90 %])

| strategi | dag 1 | dag 5 | dag 10 | dag 20 | dag 30 |
|---|---|---|---|---|---|
| gjør ingenting | 17 [17–17] | 19 [16–19] | 14 [9–23] | 1 [0–8] | 0 [0–0] |
| bare kontrakter | 22 [18–26] | 51 [22–81] | 117 [55–167] | 256 [182–340] | **448 [352–533]** |
| byer med makt | 14 [12–15] | 9 [6–12] | 8 [3–18] | 8 [2–23] | 3 [0–19] |
| bygger og venter | 14 [14–14] | 5 [3–5] | 2 [0–8] | 0 | 0 |
| forsvarer leiren | 18 [18–19] | 19 [18–21] | 23 [20–27] | 32 [24–41] | 38 [30–52] |
| kontrakter, bygg og byer | 19 [15–23] | 12 [4–38] | 88 [31–124] | 278 [173–343] | **490 [371–558]** |
| hogst og salg | 18 [18–18] | 21 [14–21] | 16 [10–26] | 6 [2–18] | 1 [0–11] |

Om vinteren (30 frø): «gjør ingenting» blakk rundt dag 18 (sommer 23), kontrakter 433 mill., byer 3 mill.

## Funnene

**Funn 1 – kontraktene er altfor sterke** (KJENT i testen). «Bare kontrakter» går over 200 mill. rundt dag 15–16 i 57 av 60 kjøringer og
ender på ca. 450 mill. (inn: 472 mill. fra kontrakter på 30 døgn). Hvorfor, i tall (40 kjøringer):
- **Én tropp leverer ca. 69 kontrakter på 30 døgn (2,3 per døgn)**; `test_balanse.js` og R-løkkene regnet med én per døgn.
- **Eskortene**: ca. 40 per kjøring, snitt 6,9 mill., ca. 1,3 timer hver = **5,3 mill. per time** (hold 0,8, hent 0,7, rydd 1,0 mill. per time).
  Betalingen vokser med kjørte meter (`1 + meter / 40 000`) og × 2,6 ved meldt bakhold, men en bil kjører 40 km på om lag en time
  (i spillet `min(80 km/t, fartsgrensen)` – modellen er heller treg). Angrepslaget (seks mann) slår sjelden ut en tropp på 6–9.
- **Nivå 4 (× 2,4) nås rundt dag 6**: 10 leverte og «pålitelig» 78 (+6 per levering fra 50).
- Inflasjonen (× 1,35 på dag 30) ganges inn i nye tilbud. Bøtene (35 %) betyr lite: 4–5 brudd på 30 døgn.
- Prøvd uten å endre spillet (`faktor.kontrakt`): alle kontraktinntekter × 0,4 gir median 136 mill. (90 %: 181) – under grensen; × 0,6 gir 242.

Forslag (IKKE gjort – brukeren bestemmer): (a) eskorte betaler etter tid og risiko, ikke kjørte meter – f.eks. tak på meterfaktoren for
eskorte (1,25), eller bakhold × 2,6 -> × 1,6; (b) nivåene langsommere eller flatere: levert 2/5/10 -> 3/10/25, eller faktor 1,35/1,8/2,4 ->
1,2/1,45/1,7; (c) høyst ett eskortetilbud per døgn. Hver for seg trolig ikke nok – samlet bør kontraktene gi omtrent 40 % av i dag.
Merk: på 1× (sanntid) klarer ingen spiller 2,3 kontrakter i døgnet, men på 60× gjør han det.

**Funn 2 – «byer med makt» er for svak** (KJENT). Ca. 5 tettsteder tas, men bare 2,2 holdes på dag 30, og skatten gir 13,5 mill. på 30 døgn
mot 14,8 mill. i rekruttering og 8,9 i lønn; 18 % av kjøringene er blakk de siste døgnene. Hvorfor: de fleste tettsteder er små – en bygd på
800 gir ca. 67 000 kr i døgnet (`Region.gir`, full skatt) mot 45 000 kr i lønn til en garnison på tre; de større trenger en tropp på 12
(bygdevern 14, `Krig.vernMenn`) som må rekrutteres for 500 000 kr per mann; innkjøringen (30 % de første døgnene) og forvaltningen (25 %).
Varene (mat og tre) hjelper leiren, men er ikke penger. **Usikkert**: motstanderens 4 % per døgn og tettstedenes størrelser er modellens
egne anslag – med færre angrep holder strategien flere byer. Forslag: la byavtalene (Ø3) gjøre byene verdt noe; vurder å telle varene.

**Funn 3 – røverbelønningen er en inntekt.** «Forsvarer leiren» (åtte mann hjemme, ingenting annet) går fra 18 til 38 mill.: ca. 40 bølger på
30 døgn (`Trussel.vent`: 16–26 spilltimer), 55 mill. i belønning (opptil 1,5 mill. per bølge). Det er mer enn byene gir. Modellen skader ikke
bygg og bruker ikke ammunisjon, så noe går til reparasjon i spillet. Forslag: lavere tak (1,5 -> 0,6 mill.), eller belønning etter fiender
som falt.

**Funn 4 – «gjør ingenting» taper sakte, som den skal:** 17 mill. etter startleiren (53 % av kassa), blakk rundt dag 23 (vinter 18).
Dieselen er den største løpende utgiften (7,9 mill.), større enn lønna (3,6) når gjengen krymper (moralen faller av røvere som herjer, og folk
drar). Uten tropper herjer røverne i 35 av 41 bølger og tar 8,3 mill.

**Funn 5 – «bygger og venter»** er blakk rundt dag 10: byggene koster vedlikehold (1 % per døgn) og strøm uten å gi inntekt. «Hogst og
salg» gir 13 mill. på 30 døgn (markedet tar bare 25 m³ i døgnet) – nok til å overleve i 90 % av kjøringene, ikke mer.

## Feil som er rettet (fellesfil)

`site/dovre-fliser/spill/selskap.js`, `dagSteg` (én linje + kommentar): **et annet selskap kunne ta den første kontrakten** («Hent
nødlageret») – 35 % av morgenene den lå åpen (359 av 1000 i første `dagSteg`), og den røde tråden mistet sitt første steg. Nå hoppes den
over; `r()` trekkes som før, så de andre tilbudene får samme tilfeldighet. `test_selskap.js` og `test_balanse.js` er grønne. Jeg er sikker
på at det er en feil: `lagTilbud` beskytter den samme kontrakten («aldri den første kontrakten»), og den har en egen frist på 14 døgn.

## Slik utvider du testen (sagbruk, byavtaler, børs …)

Lag `pipeline/fliser/okosim-<del>.js` (lastes av testen av seg selv, se `okosim-hogst.js`):

```js
const O = require('./okosim.js');
O.leggTilDel({ id: 'sagbruk', start(sim) { … }, time(sim) { … }, døgn(sim) { … } });     // ny økonomi: penger via sim.gi(kr, 'post') / sim.betal(kr, 'post')
O.leggTilStrategi({ id: 'sagbruk', navn: 'bare sagbruk', fornuftig: true, start(sim) { … }, time(sim) { … } });
O.leggTilKrav({ navn: 'sagbruket', sjekk(RES, REGLER) { return [{ ok, tekst, kjent }]; } });        // RES = { strategi-id: [resultater] }
```

Det en del har tilgang til: `sim.kasse`, `sim.t` (spillminutter), `sim.F` (folket), `sim.L` (leiren), `sim.M` (markedet), `sim.SK`
(selskapet), `sim.RG` og `sim.region.byer` (tettstedene), `sim.tropper`, `sim.rng`/`sim.rngKamp`, `sim.faktor` (testens «hva om»),
`sim.logg(tekst)`, og `O.API` (`bygg`, `kjøpDiesel`, `kjøpMat`, `lagTropp`, `rekrutterTil`), `O.taKontrakt`, `O.besteKontrakt`, `O.sendTilBy`,
`O.kamp`, `O.marsjTimer`, `O.bilTimer`. Pengene skal ALLTID gå gjennom `sim.gi`/`sim.betal` med en post, så de kommer i dagboka og båndet.
Hent tallene fra spillets regelmodul (som `Ressurser.REGLER.hogst`), og skriv det modellen selv må anta i et lite objekt med «Claudes forslag».
Kjør så `OKO_NYTT_BAND=1 node pipeline/fliser/test_okonomitest.js` (nye strategier står som «ny» til båndet er lagret). Endrer en del noe
for de gamle strategiene (f.eks. byavtaler for «byer med makt»), sier båndet «FLYTTET» – da skal endringen vurderes, så lagres båndet på nytt.
Fra planen gjenstår «bare sagbruk» (Ø1), «byer med avtaler» (Ø3) og «børs tidlig» (Ø7).

## Ikke gjort

- Balansen i spillet er ikke endret (bare feilen over). Forslagene står under funnene.
- Ingen vakt og ingen hjelpetekst (testen er bare for utviklingen).
- Testen er ikke lagt inn i `sjekk.js` eller noen `npm`-kommando; den ligger som `test_*.js`, så `inn2.sh` kjører den.
