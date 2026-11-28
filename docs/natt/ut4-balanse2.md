# ut4-balanse2 – andre runde balanse etter økonomitesten

28. nov 2026, gren `claude/ut4-balanse2`. Plan: `docs/plan-selskap-okonomi.md` kapittel 1 (trinnene: saga er trinn 2) og 13.4
(økonomitesten). Alle tall er **Claudes forslag**.

## Resultat
`node pipeline/fliser/test_okonomitest.js` og `OKO_STRENG=1 …`: **«økonomitesten ok»**, ingen kjente brudd igjen (KJENT = {}).
Båndet er lagret på nytt (`OKO_NYTT_BAND=1`).

| strategi (60 frø) | blakk de 3 siste døgnene før | etter | median dag 30 [10–90 %] før → etter |
|---|---|---|---|
| hogst og salg | 45 % (KJENT) | 0 % | 0,1 [0–5] → 3 [1–12] mill. |
| bare sagbruk | 100 % (KJENT) | 100 % – nå «ikke fornuftig»: fella som varselet stopper | 0 → 0 |
| kontrakter + sagbruk | 12 % (KJENT) | 3–7 % | 99 [0–129] → 92 [30–130] |
| kontrakter + sag + varer | 12 % (KJENT) | 5 % | 100 [0–144] → 100 [26–132] |
| (bare kontrakter, til sammenligning) | 0–2 % | 0 % | 103 [59–137] uendret |

NB: «byer med makt» og «kontrakter, bygg og byer» ligger på grensa (10 %, 6 av 60) – slik var det også før denne pakka (ikke rørt).

## Årsakene og hva som er rettet

### 1. «Kontrakter + sagbruk» (+ varer): 12 % blakk
- **Årsak (modellen):** strategien kjøpte saga, fyrkjelen, tømmerbilen og fire rekrutter (+ en brakke til dem) første døgnet – ca. 24 mill. –
  og sto med 1–3 mill. på dag 2–3 (median dag 3: 3 mill., mot 23 for «bare kontrakter»). Mislyktes de første rydd-kontraktene (bøter, sårede),
  var det ikke penger til å fylle troppen igjen, og leiren gikk i spiral. En fornuftig spiller gjør ikke det – og spillet sa ingenting.
- **Rettet i spillet:** et **varsel før kjøpet** (se 3) – og **maskinene betaler ikke vedlikeholdet to ganger** (se 4).
- **Rettet i modellen (`okosim-sagbruk.js`):** «kontrakter + sagbruk» følger varselet: saga kjøpes først når byggelista ikke lenger varsler
  (kassa tåler saga + kjele og 15 døgn drift), tømmerbilen og rekruttene når kassa tåler dem (samme regel, `råd()`). Saga kjøpes fortsatt
  dag 1 i medianen (58 av 60 kjøringer kjøper den) – men bare i kjøringene som har råd.

### 2. «Bare sagbruk»: 100 % blakk
- **Årsak:** saga + kjele + tømmerbil koster ca. 15 mill. oppå startleiren (21 mill.). Saga i drift gir ca. 0,2–0,3 mill. i døgnet netto og
  betaler seg først etter 40–60 døgn; leiren uten tropp blir herjet av røverne (35 av 41 bølger), folk drar. «Gjør ingenting» er blakk rundt
  dag 21 – saga bremser fallet, men bærer ikke leiren (som planen sier: saga er trinn 2, etter kontraktene).
- **Valgt: tydelig varsel, ikke et billigere første sagbruk.** Begrunnelse: (a) et billigere «sirkelsag-nivå» ville ikke gjort «bare sagbruk»
  levedyktig – det er røverne, dieselen og vedlikeholdet uten inntekt som tar leiren, ikke bare kjøpet; (b) et nytt bygg krever linjer i 6–7
  fellesfiler (ikon, 2D-stil, tegning, virkning, grupper, produksjon) som andre endrer i natt; (c) planen gjør saga til trinn 2.
- Strategien er nå `fornuftig: false` («sagbruk og fyrkjele første dag (tross varselet)»), og nye krav i `okosim-sagbruk.js`:
  «bare sagbruk: spillet varslet før saga ble kjøpt i 60 av 60 kjøringer», med **selvtest** (varselet slått av – døgn = 0 – gir 0 av 5:
  kravet slår til), og «kontrakter + sagbruk kjøper saga uten varsel (0 med varsel)».

### 3. Varselet i byggelista (nytt)
- `Produksjon.driftVarsel(type, { kasse, kost, kjeleKost, perDøgn, inntekt, infl })` (regel uten DOM, `produksjon.js`) – varsel når
  kassa etter kjøpet (saga + kjele hvis strømmen ikke rekker) er mindre enn `REGLER.varsel.døgn` = **15** døgn med leirens faste
  utgifter + maskinens drift. Teksten: «Sagbruk koster 7,1 mill. kr – og 4,6 mill. kr for en fyrkjele, for strømmen rekker ikke. I drift:
  ca. 90 000 kr i døgnet (folk og vedlikehold). Etter kjøpet har dere 5,4 mill. kr, og leiren bruker ca. 580 000 kr i døgnet – det rekker
  ca. 9 døgn (vent til dere har 20,4 mill. kr). Saga alene bærer ikke leiren: den dekker lønna til ca. ti, men ikke diesel, røvere og bygg.
  Ta kontrakter først.» (siste setning bare uten inntekt i går/i dag). Kort: «Rekker bare 9 døgn».
- `Produksjon.leirDøgn(L, { lønn | personer, infl, dieselpris })`: lønn + vedlikehold av ALLE byggene (også de under bygging) + dieselen
  byggene som bruker strøm trekker (minus halve solcellene). Samme regning i spillet og i økonomitesten.
- Prøvd: 10 døgn ga 13 % i «kontrakter + sagbruk» (varselet slapp kjøpet for tidlig), 15 døgn 3 %, 20 døgn 0 % (for strengt).
- Visning: `window.BYGG_VARSEL` (ny krok, se fellesfiler) registreres nederst i `produksjon.js` (bare i nettleseren): kassa fra
  OppstartSpill, lønna fra FolkSpill.lønnNå, dieselprisen fra markedet, inntekten fra PengerSpill (i går + i dag), kjele trengs når
  leiren ikke har en og aggregatene ikke har 15 kW ledig. Kortet viser «Rekker bare N døgn» (oransje), forklaringen (data-tips) hele
  teksten, og «Bygg» skriver teksten i loggen før plasseringen. Det er et varsel, ikke en sperre.

### 4. Maskinene betalte vedlikehold to ganger
- Saga slites (0,0015 hp per driftstime) og repareres for 25 % av prisen × skaden (ca. 54 000 kr i døgnet i full drift) – planens
  vedlikehold for maskiner (4.3). I tillegg betalte den 1 % av prisen i døgnet som alle bygg (60 000 kr). Nå:
  `Leir.REGLER.vedlikeholdMaskin` = **0,003** (0,3 %, selve bygget) for bygg med `maskin: true` (sagbruk 60 000 → 18 000, fyrkjele
  40 000 → 12 000, vedkløyver 8 000 → 2 400 kr i døgnet). `Leir.vedlikehold` bruker den.

### 5. «Hogst og salg»: 45 % blakk
- **Årsak (modellen):** fire på hogst feller ca. 12 m³ i timen, men to bærere får ca. 1,5 m³ hjem, og markedet tar 40 m³ i døgnet
  (1,7 i timen). To hoggere sto i skogen mens leiren sto åpen for røverne (33 av 41 bølger herjet; de tar 20 % av lageret og 5 % av kassa).
- **Rettet i modellen (`okosim-hogst.js`, `HOGST`):** to på hogst, to på frakt, resten på vakt. Tømmerprisen er uendret (8 000 kr/m³, planen:
  «selges billig»). Prøvd først i spillet: tømmer 10 000 ga 30 %, 12 000 ga 20 % – unødvendig når modellen er riktig.
- Strategien er fortsatt **svak med vilje**: median 3 mill. på dag 30 (gjør ingenting: 0), og belønningen for røverbølgene (7,2 mill.) er nå
  like stor som salget (6,5 mill.) – vakta er det som bærer den. Bør ses på hvis røverbelønningen endres.

### 6. Strømmen fra fyrkjelen
- Før: 0,5 m³ flis à 3 000 kr = 1 500 kr i timen for 30 kW (ca. 1 200 kr til salgsverdi) mot 27 000 kr diesel – 22 × billigere i timen.
- Nå (Claudes forslag): **flis 3 000 → 6 000 kr/m³, ved 9 000 → 12 000 kr/m³** (`Leir.MATERIALER`), **kjelen brenner 0,5 → 0,6 m³ flis
  eller 0,35 → 0,45 m³ ved i timen** (`Produksjon.REGLER.maskiner.fyrkjele`). Saga gir 0,7 m³ flis i timen, så én sag holder fortsatt én kjele.
  Brenselet koster nå 3 600 kr i timen – **7,5 × billigere enn diesel** (før 22 ×).
- Over tid (kr per kWt: kjøp + vedlikehold + folk + brensel, full last; solcelle 14 t sol):

  | | 30 døgn | 90 døgn | i det lange løp |
  |---|---|---|---|
  | aggregat | 1 241 | 1 062 | 974 |
  | solceller | 1 324 | 632 | 289 |
  | fyrkjele før | 350 | 201 | 127 |
  | fyrkjele nå | 382 | 232 | 158 |

  **Målet «omtrent like mye som solceller/aggregat over tid» er IKKE nådd** – kjelen er fortsatt ca. halvparten av solcellene i det lange løp
  og 3 × billigere over 30 døgn. Grunnen til at jeg stoppet her: (a) dieselen er dyr med vilje (3 000 kr/l), og planen sier at kjelen
  «bytter ut diesel» – det er hele poenget med kjeden; (b) solcellenes pris domineres av 1 % vedlikehold i døgnet på 2 mill. (20 000 kr for
  70 kWt) – det er heller solcellene som er dyre; (c) skal kjelen koste som solceller, må brenselet ca. dobles igjen, og da koster saga
  (15 kW fra kjelen) mer i strøm enn den gir over tømmeret, og kravet «saga i full drift = 0,7–1,4 × lønna til ti» ryker (nå 1,31 ×). Vil
  brukeren ha kjelen dyrere, er stedene `Leir.MATERIALER.flis` og `fyrkjele.inn` – og kravet i okosim-sagbruk.js sier fra.

## Endringer (før → etter)
| hvor | tall | før | etter |
|---|---|---|---|
| `leir.js` REGLER | vedlikeholdMaskin (nytt) | (1 %) | 0,3 % per døgn |
| `leir.js` MATERIALER | flis | 3 000 kr/m³ | 6 000 |
| `leir.js` MATERIALER | ved | 9 000 kr/m³ | 12 000 |
| `produksjon.js` REGLER | fyrkjele inn | 0,5 flis / 0,35 ved per time | 0,6 / 0,45 |
| `produksjon.js` REGLER | varsel (nytt) | – | { døgn: 15, lønn: 15 000 } |
| `okosim-hogst.js` | HOGST (modell) | 4 hogst, 2 frakt | 2 hogst, 2 frakt, resten vakt |
| `okosim-sagbruk.js` | kontraktSag (modell) | alt kjøpt dag 1 | kjøper når varselet er borte |
| `okosim-sagbruk.js` | sagbruk (modell) | fornuftig | ikke fornuftig (varselet er kravet) |
Uendret: tømmer 8 000, saga 6 mill./15 kW, kjele 4 mill./30 kW, markedets KJØPER, lønna, røverne.

## Filer
- `site/dovre-fliser/spill/leir.js` (eier: tall) – MATERIALER flis/ved, `REGLER.vedlikeholdMaskin`, én linje i `vedlikehold()`.
- `site/dovre-fliser/spill/produksjon.js` (eier: tall) – fyrkjele inn, `REGLER.varsel` øverst i REGLER; `driftVarsel` og `leirDøgn` rett før
  `api` (i api-lista: `driftVarsel, leirDøgn` først); nederst (etter `module.exports`/`rot.Produksjon`) en egen blokk for nettleseren
  (CSS for `.varsel` og `window.BYGG_VARSEL`). Ingen endring i `steg()` – lett å flette med F3.
- `pipeline/fliser/okosim-sagbruk.js`, `okosim-hogst.js`, `test_okonomitest.js` (KJENT tom), `okonomitest-band.json` (nytt bånd).
- `pipeline/fliser/test_produksjon.js`: forventningene for kjelen og «verdien av det som er laget» leser nå tallene fra REGLER/MATERIALER
  (før faste tall), + fem nye tester for varselet.
- Vakt: `pipeline/fliser/vakter/ut4-balanse2.js`. Hjelp: `docs/natt/ut4-balanse2-hjelp.json` (gruppe «Leiren»).

## Fellesfiler endret (nøyaktig)
- `spill/leir-visning.js` (visMeny, byggelista, ca. linje 300–306): før `const b = knapp(…)` beregnes `varsel` fra `window.BYGG_VARSEL`
  (ny krok: `[(type, { kost, prisFor }) => { kort, tekst } | null]`); «Bygg»-knappen skriver `varsel.tekst` i loggen før `startPlassering`;
  `data-tips` begynner med teksten; kortet får `<small class="varsel">` etter `.virk`.
- `spill/leirvirkning.js`: fyrkjelens tekst «0,5 m³» → «0,6 m³»; `KORT_ELDRE` fikk sagbruk/vedkløyver/fyrkjele (kortene sto som
  «bare utseende» i byggelista – funnet på bildet).
- `index.html`: bare versjonsmerkene (`versjon.py`).

## Prøvd
- Regeltester: test_okonomitest (vanlig og OKO_STRENG=1: ok), test_produksjon, test_leir, test_folk, test_ressurser, test_vare, test_byavtale,
  test_balanse, test_kommando, test_leir2d, test_merker, test_leirvirkning, test_spillet, test_jobber, test_okonomi, test_trinn, test_selskap –
  og alle `pipeline/fliser/test_*.js` (før endringen i visningen): grønne. Eneste forventning endret: test_produksjon (over).
- Nettleser (Dovre-testsiden, 1400 × 860 og 390 × 844 mobil): startleiren lagt inn, 17 mill. i kassa → kortet «Sagbruk» viser «Rekker bare
  9 døgn», forklaringen har hele teksten; med 80 mill. ingen varsel. Bildene sett. Ingen sidefeil.
- Vakter (PC): ut4-balanse2, ut2-sagbruk, ut3-varekontrakt, ut2-balanse, balanse – ok; ut4-balanse2 også på mobil. Med feil lagt inn med vilje
  (`BYGG_VARSEL` tømt) feiler ut4-balanse2 på «ingen varsel», «kortet viser ikke varselet» og «forklaringen».

## IKKE gjort / å se på
- Kjelen koster fortsatt mindre enn solceller over tid (se 6) – brukerens valg.
- «Bare sagbruk» er fortsatt blakk hvis spilleren overser varselet (med vilje). Et billigere første sagbruk (sirkelsag) er ikke laget.
- Varselet gjelder bare maskinene (sagbruk, vedkløyver, fyrkjele); andre dyre bygg kan bruke samme krok.
- Røverbelønningen er nå like stor som salget i «hogst og salg» – vakta tjener like mye som hogsten.
