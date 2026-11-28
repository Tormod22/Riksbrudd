# ut4-firmaer – fase Ø5: firmaer og samarbeid

28. nov, gren `claude/ut4-firmaer`. Plan: `docs/plan-selskap-okonomi.md` kapittel 8 (Samarbeid med andre selskaper), 14.5 (Teknologi
gjennom kontrakter) og Ø5 i kapittel 16. **Alle tall er Claudes forslag** (samlet i `Firma.REGLER` i `spill/firma.js`, `Fraksjoner.REGLER.pakt`,
`Produksjon.REGLER.høvleri` og `FM` i `pipeline/fliser/okosim-firma.js`).

Kapittel 18, spørsmål 6 (rivalene): **forslaget er brukt** – Ravnsund og Mosevakt kan bli allierte med dere (eller gi våpenhvile), men de kan
bryte det. Dere kan ikke ha pakt med begge samtidig når den ene er en allianse (dere kan ikke stå på begge sider).

## Filer

| Fil | Hva |
|---|---|
| `site/dovre-fliser/spill/firma.js` (ny) | Reglene uten DOM (`window.Firma`): registeret, holdning, økonomi/konkurs, nye firmaer, samarbeid, teknologi, pakter, lagring. |
| `site/dovre-fliser/spill/firma-visning.js` (ny) | `window.FirmaSpill`: takten, kommandoene, krokene (ild, ser, lagTekst, tegn), fanen Partnere, telefonen. Lagres i `riksbrudd-firma` per leir. |
| `pipeline/fliser/test_firma.js` (ny) | Regeltest, 69 sjekker (også fraksjoner.js med pakter, høvleriet i produksjon.js og krokene i selskap.js). |
| `pipeline/fliser/okosim-firma.js` (ny) | Økonomitesten: strategien «kontrakter + sag + varer + fast kunde» (`kontraktFirma`) og to krav. |
| `pipeline/fliser/vakter/ut4-firmaer.js` (ny) | Vakta. |
| `docs/natt/ut4-firmaer-hjelp.json` (ny) | Hjelpeemner. |

## Reglene (Firma)

- **Registeret:** de sju firmaene fra `Selskap.FIRMA` med bransje og behov (`Firma.KJENTE`). **Hjemsted** = det samme stedet varekontraktene
  leveres til (`Vare.hjemsted`: et av de fire nærmeste tettstedene 2,5–40 km fra leiren, fast per firma). Har kartet ingen tettsteder (Dovre-
  testsiden), får firmaet en **reserve**: «bygda nordøst for leiren», 6–14 km unna i fast retning per firma (`Firma.reserveHjem`). Får kartet
  tettsteder senere, flytter firmaet dit (`sikreHjem`).
- **Holdning** 0–100 (start 35; nye firmaer 45): levert kontrakt fra firmaet +6, brutt −10, avbrutt −6, fraktfirmaet mistet lasten −3, vern holdt
  +2/døgn, vern brutt −6, et fast tilbud som går ut −2, fast kunde avsluttet av dem −8, svik mot dem −25, svik mot andre −4. Ord: skeptisk/nøytral/liker dere …
- **Økonomi** (helse 0–100, start 68): frisk fra 55, presset fra 25, ellers konkurstruet, 0 = **konkurs**. Per døgn: mot 60 (+1,5 / −0,5),
  hjemstedet holdt av en rival −7, fiende innen 3 km −4 (innen 8 km −1,5), kamp nær −3 (et fiendelag innen 3 km beskutt siste døgn), vern holdt
  halverer krigens tap, handel med dere opp til +5 (per 300 000 kr levert i døgnet), byavtale med hjemstedet +1, levert kontrakt +2.
  Et firma der Ravnsund holder hjemstedet og det er kamp, går konkurs på ca. en uke.
- **Nye firmaer:** hvert døgn 12 % sjanse per by dere har beskyttelse/handel/medlem med (`ByavtaleSpill`), høyst to nye per by og 14 i alt.
  Ti oppdiktede navn (`Firma.NYE`: Haugtun Verksted, Furuli Bygg, Nordbø Bakeri …). De nye gir også vanlige kontrakter (`Selskap.firmaKilde`).
- **Fast kunde** (holdning 55 og 2 leverte for dem): hver morgen ett ekstra tilbud fra firmaet øverst i Selskapet, betaling × 1,15, ligger et døgn
  og tas aldri av rivalene (`k.fast`). Firmaer som kjøper varer (Storlia, Kvernhaug, Dalsnes) gir en levering (`Vare.lagEtt`), de andre en vanlig
  jobb med firmaet som oppdragsgiver (`Selskap.lagTilbud` med `o.giver`). Tre tilbud på rad som går ut uten svar: de slutter (−8).
- **Felles anlegg** (holdning 60, 2 leverte, ikke konkurstruet; bare bransjer med anlegg: tømmer → sagbruk 6 mill., mat → mølle 4, gruve →
  knuseverk 5, sjømat → fiskemottak 4): dere betaler halve prisen og får halve overskuddet hvert døgn (sagbruk 120 000 kr) × økonomien (frisk 1,
  presset 0,6, konkurstruet 0,3). Et konkurstruet firma selger sin del til en rival med 20 % sjanse per døgn (presset 10 %) – da × 0,6. Konkurs:
  bobestyreren betaler 30 % av det dere betalte. **Regnestykke i firmaet** – ikke et bygg i leiren (planen tillot det).
- **Vern** (holdning 40): 110 000 kr per døgn i 14 døgn når minst 3 egne friske mann står innen 3 km av hjemstedet i 70 % av døgnets timer (samme
  telling som byavtalens løfte, time for time). Ellers et brudd og ingen betaling; tre brudd = de sier opp. Fem døgn vern holdt teller for
  Dalsnes sin teknologi. Angrep der blir deres problem: krigen tærer på firmaet, og uten folk der er døgnet brutt.
- Firmaet **ringer** (én gang per samarbeid) når kravene er nådd: logg + `riksbrudd-telefon`.
- **Svik:** selge andelen i et felles anlegg til en rival gir 70 % av det dere betalte straks, men −8 «pålitelig» (Selskap.endreRykte), −25 hos
  firmaet og −4 hos alle andre. Å bryte en pakt: se under.

### Teknologi gjennom handel (14.5)
| Teknologi | Fra | Krav | Pris | Virkning |
|---|---|---|---|---|
| Høvleri på sagbruket | Storlia Tømmer | holdning 65 og 4 leverte | 1,5 mill. | `b.høvleri` på alle sagbruk: planker × 1,4, flis × 0,5 (`Produksjon.utFor`) |
| Bedre aggregat | Dalsnes Kraftlag | holdning 60 og 2 leverte (eller 5 døgn vern) | 0,8 mill. | `Leir.DRIVSTOFF.literPerKWt` × 0,8 |
| Fryselager | Ytterø Sjømat | holdning 60 og 2 leverte | – | bare en lås og en tekst – fisket finnes ikke i leiren |

### Pakter med rivalene
- **Våpenhvile** innen 5/10/20 km av leiren i 3/7/14 døgn. Pris = døgn × (150 000 + 15 000 per km) × stil (Ravnsund 1,3) × 2^brudd. Eks. 7 døgn,
  10 km: Mosevakt 2,1 mill., Ravnsund 2,7 mill.
- **Allianse** mot den andre rivalen i 7/14 døgn: krever «pålitelig» 50, bidrag 500 000 kr per 7 døgn. Fred overalt (som den gamle våpenhvilen),
  **delt etterretning** (KROKER.ser: dere ser lagene deres og fiendene de ser), og **felles mål** (AI-en går helst mot tettstedene til den felles
  fienden – `v.felles`, regnes som halvparten så langt unna).
- **De bryter:** sjanse per døgn Ravnsund 5 %, Mosevakt 2,5 %; × 2 når de er over 1,5 × sterkere enn dere (friske mann), og en allianse × 2 når den
  felles fienden er blitt svak («den sterkeste tar mest til slutt»). Logg + telefon.
- **Dere bryter (svik):** overraskelse – treff × 1,3 mot dem i 3 timer (KROKER.ild), etter en allianse ser dere lagene deres ett døgn til; men −8
  «pålitelig», −4 hos alle firmaene, prisen dobles, og de vil ikke snakke med dere på 3 døgn.
- Den gamle våpenhvilen fra krig-visning.js (kjøpt for ett døgn, overalt) er urørt og virker som før ved siden av.

## Fellesfiler endret (nøyaktig)
- `site/dovre-fliser/index.html`: to skript-tagger rett etter `vare-visning.js` (`firma.js`, `firma-visning.js`) + `versjon.py` (versjonsmerker).
- `spill/selskap.js` (små kroker, merket «ut4-firmaer»): `api.FIRMA` og `api.firmaKilde` (lista over firmaer som finnes – brukes bare når den er satt);
  `lagTilbud(… o)`: `o.antall`, `o.giver` (fast oppdragsgiver) og `o.faktor` (på betalingen). Uten disse er tilbudene like som før (testet: samme
  tilfeldighet).
- `spill/fraksjoner.js` (samlet, merket «ut4-firmaer»): `REGLER.pakt`, `velg` leser `v.vern(x, y)` (dine tettsteder og leiren der er ikke mål) og
  `v.felles`; ny `Fraksjoner.respekterPakt(valg, s, vern, blåVed)`.
- `spill/fraksjoner-visning.js` (samlet): `AI.pakter` (peker på lista i FirmaSpill), `AI.hvile` gjelder også en allianse, ny `AI.hvileVed(a, b, x, y)`,
  fiendelista og kjøretøyene filtreres med `hvileHer(s, e)`, `velg` får `vern`/`felles`, og etter `AI.styr` (eskaleringen) kjøres `respekterPakt`.
- `spill/produksjon.js`: `REGLER.høvleri` og `utFor(b)` (sagbruk med `b.høvleri`). test_produksjon.js er grønn.
- `spill/selskapspanel.js` (bare fanen Partnere): fanen er ikke lenger «kommer» når FirmaSpill finnes, `tegn` spør `FirmaSpill.fane()`, klikk på
  `[data-sp^="fi-"]` går til `FirmaSpill.trykk`.
- `pipeline/fliser/test_okonomitest.js`: én linje i KJENT (`utenSjanse:kontraktFirma` – de samme kjøringene som kontraktVare, 12 % blakk).
- `pipeline/fliser/okonomitest-band.json`: bare båndet for `kontraktFirma` lagt til (de andre urørt; NB: båndet for `kontraktVare` var alt litt
  gammelt – en ny kjøring gir 100,3 mot lagret 102,5 mill., innenfor slingringsmonnet – det er ikke endret).

## Kommandoer (KOMMANDO)
`firmaSamarbeid { firma, slag: fast|felles|vern }`, `firmaAvslutt { firma, slag, svik }`, `firmaTekno { id: høvleri|aggregat|fryselager }`,
`paktInngå { pakt: hvile|allianse, side: rød|grønn, r, døgn }`, `paktBryt { id }`. Alle knappene i Partnere går gjennom dem.

## API (window.FirmaSpill)
`test` (true = morgen, døgn, timer og telefon også under webdriver), `tilstand()`, `sett(d)`, `nullstill()`, `start()`, `lagre()`, `fane()`,
`trykk(knapp)`, `morgen(tving)`, `døgn(tving)`, `telKontrakter()`, `fastTilbud(f)`, `tekno()`, `krig()`, `mannNær(p, r)`, `klar()`, `valg`, `rett`, `NØKKEL`.

## Økonomitesten
Ny strategi **«kontrakter + sag + varer + fast kunde»** (`kontraktFirma`): som «kontrakter + sag + varer», og leiren fører holdningen fra de ferdige
kontraktene (`Firma.registrerKontrakt`). Når Storlia vil, blir den fast kunde: ett ekstra leveringstilbud (planker eller flis, × 1,15) hver morgen,
tatt på samme vilkår som de andre leveringene. Høvleriet kjøpes når Storlia låser det opp. Ingen felles anlegg, vern eller pakter i modellen.
Resultat (60 frø, median [10–90 %], mill. kr dag 30): **102,8 [0–141]** mot «kontrakter + sag + varer» 100,3. Storlia blir fast kunde i 88 % av
kjøringene (snitt dag 14), høvleriet i 82 % (snitt dag 17); bare 167 av 530 faste tilbud ble tatt (modellen tar en levering bare når lageret
og saga rekker den), så Storlia slutter og kommer tilbake flere ganger. Varekontraktene gir 16,7 mill. (mot 12,5). Krav: fast kunde i minst
50 %, og med samarbeid 0,9–1,15 × uten. **Kjent brudd:** 7 av 60 blakk de tre siste døgnene (12 %) – de samme frøene (7, 18, 19 …) som
kontraktVare; samarbeidet løfter ikke de dårligste kjøringene.

## Prøvd
- `node pipeline/fliser/test_firma.js` (69), test_selskap, test_vare, test_produksjon, test_fraksjoner, test_okonomitest (grønn, 7 kjente) og alle
  `pipeline/fliser/test_*.js` (se rapporten).
- Nettleser, Dovre-testsiden, PC 1400 × 860 og mobil 390 × 844: fanen Partnere (rivalene med valg for våpenhvile/allianse, teknologien, firmaene med
  økonomi, holdningsmåler, behov, «har sammen», knapper og hva som mangler), våpenhvile via knappen (betalt, ring i kartet «Våpenhvile med Ravnsund
  · 7 døgn»), fast kunde via knappen. Ingen sidefeil (bare de kjente 404 for kartlageret på testsiden). Bilder sett.
- Vakta `pipeline/fliser/vakter/ut4-firmaer.js` (ca. 0,1 s): ok på PC og mobil; satt alt tilbake (pakter 0, holdning 35, 0 tilbud, samme lag og
  kasse). Med feil lagt inn med vilje (en levering ga +0 holdning) sa den «holdningen steg ikke ved levering (35 -> 35)».

## IKKE gjort
- AI-ene (Ravnsund, Mosevakt) har ingen egne firmaer, faste kunder eller anlegg (Ø8). De kan bare kjøpe en andel når firmaet selger.
- Felles anlegg er et regnestykke, ikke et bygg (ingen 3D/2D-modell, ingen kobling til lageret). Rivalens kjøp gir bare lavere overskudd.
- Vern: firmaet ber ikke om hjelp når det angripes (byavtalens «bønn om hjelp» er ikke gjenbrukt); bare timer med nok mann teller.
- Våpenhvilens område er alltid rundt leiren (ikke rundt et valgt tettsted). Alliansen deler ikke tettsteder eller bytte til slutt (bare teksten).
- Investere i firmaene (Ø7), eksport (Ø6), lyd utover hendelsen `riksbrudd-telefon`.
- Hjelpeteksten ligger i `docs/natt/ut4-firmaer-hjelp.json` – `spill/hjelp-natt.js` er ikke laget på nytt.
