# ut4-eksport – fase Ø6: eksport

28. nov, gren `claude/ut4-eksport`. Plan: `docs/plan-selskap-okonomi.md` kapittel 11 (Eksport), Ø6 i kapittel 16. Spørsmål 5 i kapittel 18
(«eurokreditt – egen valuta, eller holder det med flere kroner?»): **forslaget er brukt – en egen utenlandsk valuta, eurokreditt.**
**Alle tall er Claudes forslag** (samlet i `Eksport.REGLER` i `spill/eksport.js` og `ME` i `pipeline/fliser/okosim-eksport.js`).

## Filer

| Fil | Hva |
|---|---|
| `site/dovre-fliser/spill/eksport.js` (ny) | Reglene uten DOM (`window.Eksport`): ordrene, havn og skip, pirater, grensa (Grensevakta/smugling), eurokreditt, butikken ute, lagring. |
| `site/dovre-fliser/spill/eksport-visning.js` (ny) | `window.EksportSpill`: havnene og grensestasjonene, «Send», takten, kommandoene, delen «Eksport» i Selskap → Oversikt, kartet, eurokreditten i statuslinja. Lagres i `riksbrudd-eksport` per leir. |
| `pipeline/fliser/test_eksport.js` (ny) | Regeltest (61 sjekker, også at alle grensestasjonene ligger på riksgrensa). |
| `pipeline/fliser/okosim-eksport.js` (ny) | Økonomitesten: strategien «kontrakter + sag + eksport» (`kontraktEksport`) og kravene «eksporten». |
| `pipeline/fliser/vakter/ut4-eksport.js` (ny) | Vakta. |
| `docs/natt/ut4-eksport-hjelp.json` (ny) | Fire hjelpeemner («Lag og strid»). |

## Reglene (Eksport)

- **Ordrene** («Elbe Holzhandel i Hamburg vil ha 120 m³ planker innen 9 døgn»): kjøper (oppdiktet firma i en ekte by: Hamburg, Rotterdam,
  Aberdeen, Gdańsk, Göteborg sjøveien; Karlstad, Östersund, Luleå, Kiruna, Oulu, Ivalo over grensa), vei (sjø/grense), vare, mengde,
  frist 6–12 døgn, pris i eurokreditt. Først planker og tømmer (det brukeren nevnte); når to ordre er levert, også ved, stål og diesel.
  Pris per enhet: planker 36, tømmer 12, ved 13, stål 85 per t, diesel 4 per liter (1 eurokreditt ≈ 1000 kr ved start). Svinger bare ±4 %
  per ordre (hjemme ±12 % per døgn), grensekjøperne betaler 5 % mindre, og ryktet ute (0–100, start 50) flytter prisen ±10 %.
- **Når de kommer:** hver morgen 70 % sjanse (ganget med ryktet) for én ny, høyst 3 tilbud og 3 aktive. Bare når selskapet har nådd **trinn 3**
  (`TrinnSpill`), eller har **en havn som tar skip** eller **en grensestasjon innen 80 km**. Tilbudet står i 2 døgn.
- **Sjøveien:** ordren tas med en havn. Skipene tar etter kaistørrelsen (`Kaier.størrelse`): liten 0 (ingen skip), middels 80, stor 400
  plassenheter (m³/t = 1, diesel 0,01 per liter, som i `sjo.js`) – «store havner tar store laster»; ordrene lages aldri større enn den største
  havna dere har. Når alt ligger på kaia, kommer et fraktskip om 6–18 t, laster i 4 t og går – da er ordren levert og betalt i eurokreditt.
  **Pirater/rivaler:** sjansen for at lasten tas når skipet går: 3 % fra en havn i en by dere holder eller har avtale med, 8 % uten (leirens
  egen kai). Tapt last = ingen betaling, ingen bot.
- **Grensa:** varene kjøres til en grensestasjon. **Avtale med Grensevakta** (Gränsvakten Nord AB, oppdiktet): gratis å inngå, hver tur koster
  150 000 kr × inflasjonen, lasten kommer over. **Smugling** (uten avtale): gratis, men 25 % sjanse per tur for beslag (lasten tapt, ryktet −8).
  Ordren er betalt når alt er over grensa.
- **Fristen:** et skip som alt ligger ved kaia får gå; ellers går ordren ut (ryktet −10), og det som ligger på kaia kjøres tilbake til lageret.
  Avbryt = som utløpt (uten bot). Levert = ryktet +5.
- **Eurokreditt:** `S.ek` i eksportens tilstand. **Kurs** = 1000 kr × markedets inflasjon (`SpilletSpill.M().infl`, aldri under 1000), gebyr 3 %
  ved veksling – eurokreditten taper seg altså ikke, kronene gjør. **Bare ute:** helikopterdeler 60 (reparerer helikopteret i `KjorSpill`
  straks eller ligger på lager), utenlandske feltradioer 45 (alle egne lag uten feltradio får det via `KontrollromSpill.girRadio`),
  ammunisjon av høy kvalitet 25 (300 × 5,56 mm og 60 × 7,62 mm i sekken via `UtstyrSpill.leggTil`).

## GRENSESTASJONENE (valget)

Vegnettet i spillet slutter ved grensa, så «nærmeste veg som krysser riksgrensa» kan ikke regnes ut. **Valget: en enkel liste over 14 kjente
grenseoverganger for bil** (Svinesund E6, Ørje E18, Magnor rv. 2, Vauldalen fv. 31, Storlien E14, Gäddede fv. 74, Umbukta E12, Graddis rv. 77,
Bjørnfjell E10, Helligskogen E8, Kivilompolo E45, Karigasniemi rv. 92, Utsjoki E75, Polmak E75). Punktet er nærmeste punkt på riksgrensa
(`data/riksgrense.json`) fra overgangens omtrentlige lengde/bredde (regnet om til EPSG:25833 én gang; 0,4–6 km fra selve vegen).
`test_eksport.js` sjekker at alle ligger på grensa. Dere kan kjøre til stasjoner innen 200 km.

## Havnene (visningen)

`EksportSpill.havner()`: (1) tettsteder dere holder – sjøpakkas havn (`SjoSpill.havner()`), (2) havnebyer dere har en avtale med (beskyttelse,
handel eller medlem i `ByavtaleSpill.tilstand().byer`, kaia fra `SjoSpill.havnFor(by)`), (3) leirens egen kai innen 3 km (`Kaier.nær`, uten avtale).
Bare kaier som tar skip og ligger innen 60 km. `EksportSpill.ekstra` tar prøvehavner (vakta). Prøvd på /rogaland med ekte kaier: en by dere
holder (Sand, stor kai, 11 km) blir havn, og ordren kan tas «via Sand».

## Visningen

- **Selskap → Oversikt → Eksport** (valgt fordi Kontrakter-fanen låner kontraktpanelet `#selskap` fra selskap-visning.js): eurokreditten med verdi
  i kroner og kurs, «Veksle 10» / «Veksle alt», havnene og grensestasjonene, Grensevakta (Inngå avtale / Si opp), tilbudene («Ta – via Sand»,
  «Ta – over grensa ved Vauldalen», Avslå), de aktive (framdrift, status: «På kaia i Sand: 40 av 160 m³ … Skipet kommer når alt er der» /
  «MV Baltic Trader kommer om 9 t» / «laster – går om 3 t», frist, lageret, «Send lastebil», «La Gråfjell Frakt ta det», for grensa
  «Send lastebil (150 000 kr)» og «Smugle (25 % fare for beslag)», Vis i kartet, Avbryt), butikken ute, og de siste ferdige.
- **Send:** «Send lastebil» bruker `VareSpill.ledigBil()` (den største ledige lastebilen/tømmerbilen innen 400 m av leiren) og `kjørTil` – som
  varekontraktene. Framme innen 300 m av havna/stasjonen. Finner bilen ikke vegen dit (vegkartet mangler, for langt på telefon, utenfor spillkartet),
  settes lasten tilbake på lageret, og loggen foreslår Gråfjell Frakt (prøvd på testsiden uten vegnett: 30 m³ tilbake etter ca. 1 s). **Gråfjell Frakt** til havna/grensa: 8 % av eksportverdien i kroner (+ turen med
  Grensevakta), 35 km/t × 1,35 omveg + 3 t, 4 % tap (erstatter 80 %); smugler ikke.
- **Statuslinja:** en egen flis «412 EK» rett etter kassa når dere har eurokreditt (trykk = delen Eksport).
- **Kartet (KROKER.tegn):** stiplet gul linje leiren → havna/grensestasjonen mens varer skal fram, en pil fra havna ut mot kjøperens by
  (blå stiplet sjøveien, gul over grensa, høyst 25 km lang, med bynavnet), skipet ved kaia, og lasten over bilene (rød = smugling).
- **Kommandoer** (KOMMANDO): `eksportTa { id, ut }`, `eksportSend { id, hvordan: bil|frakt, smugling }`, `eksportAvslå { id }`, `eksportAvbryt { id }`,
  `eksportVeksle { ek: tall|'alt' }`, `eksportKjøp { id: helideler|radio|ammo|brukHeli }`, `eksportGrensevakt { på }`.
- I testene (navigator.webdriver) kommer ingen ordre av seg selv: `EksportSpill.test = true` slår morgenen på. Turene og skipene går som vanlig
  (de er svar på det spilleren gjør). `EksportSpill.morgen(true)` lager en ordre med en gang.

API (`window.EksportSpill`): `test, ekstra, tilstand, start, lagre, havner, grenser, utganger, åpenNå, valgFor, morgen, steg, turSteg, ta, send,
avslå, avbryt, veksle, kjøp, brukHelideler, grensevakt, oversiktHtml, trykk, åpne, visEuro, kommando, infl, nullstill`.

## Økonomitesten

Ny strategi **«kontrakter + sag + eksport»** (`kontraktEksport`): som «kontrakter + sag + varer», og fra trinn 2 eksportordre på planker sjøveien.
Modellens valg (`ME`): en stor havn i en havneby med avtale 25 km unna; høyst én ordre om gangen; ordren tas når lageret + 70 % av det saga ga
siste døgn rekker innen fristen minus to døgn; plankene ordren trenger går foran varekontraktene; tømmerbilen (delt med varekontraktene) kjører
20 m³ om gangen; eurokreditten veksles straks. Krav: (1) eksporten gir minst 2 mill. på 30 døgn (median), (2) minst 1,2 × det en levering hjemme
betaler per m³, (3) kassa dag 30 ikke under «kontrakter + sag + varer» med mer enn 5 mill. (medianene svinger noen millioner fordi
kontraktene trekkes ulikt), (4) aldri mer eksportert enn saga laget og aldri betalt mer enn de leverte m³ til høyeste pris – med **selvtest**
(betaling × 3 slår ut).

Resultat (60 frø, kassa i mill. kr, median [10–90 %]):

| strategi | dag 10 | dag 20 | dag 30 |
|---|---|---|---|
| kontrakter + sag + varer | 20 [1–38] | 56 [0–90] | 100 [0–144] |
| **kontrakter + sag + eksport** | 20 [1–32] | 55 [0–77] | 101 [0–125] |

Eksporten ga 4,8 mill. (median; 2,5 tatt, 1,6 levert, 130 m³, 0 pirater, 0,5 gikk ut per kjøring), **41 452 kr per m³ mot 33 363 kr for en
levering hjemme**. Høyst 178 mill. (under 200). Den ene bruddet er det kjente «blakk uten sjanse» (12 %, de samme frøene 7, 18, 19 som
«kontrakter + sag + varer») – lagt inn i `KJENT` i `test_okonomitest.js`. **Ærlig:** gevinsten per m³ er klar, men for leiren som helhet er den
liten, fordi sagbruket er flaskehalsen – eksporten tar planker som ellers ville gått til varekontraktene. Med 32 eurokreditt per m³ (første
forslag) lønte det seg knapt; derfor 36. Eurokredittens styrke (holder verdien) viser seg ikke i modellen, som veksler straks.

## Fellesfiler endret (nøyaktig)

- `site/dovre-fliser/index.html`: to skript-tagger rett etter `sjo-visning.js`: `eksport.js`, `eksport-visning.js` + `versjon.py`.
- `site/dovre-fliser/spill/selskapspanel.js`: to linjer – `EksportSpill.oversiktHtml()` i `oversikt()` (før seiersdelen), og knappene
  `data-sp="ek-…"` sendes til `EksportSpill.trykk` i klikklytteren (som byavtalens `ba-`).
- `site/dovre-fliser/spill/vare-visning.js`: én linje – `ta, legg, fri` lagt til i `window.VareSpill` (eksporten tar varene fra og legger dem
  tilbake i lageret som varekontraktene).
- `pipeline/fliser/test_okonomitest.js`: én KJENT-linje (`utenSjanse:kontraktEksport`).
- `pipeline/fliser/okonomitest-band.json`: nytt bånd for `kontraktEksport` (de andre båndene er ikke rørt – lagt inn med et lite skript, ikke
  `OKO_NYTT_BAND=1`, som ville skrevet alle på nytt).
- `sjo.js`, `sjo-visning.js`, `kaier.js`, `riksgrense.js`, `byavtale*.js` er **ikke** endret – eksporten bruker API-ene deres
  (`SjoSpill.havner/havnFor/kaiInfo`, `Kaier.nær/størrelse/navn`, `ByavtaleSpill.tilstand`).

## Prøvd

- Regeltester: `test_eksport` (61), og alle `pipeline/fliser/test_*.js` er grønne (også test_tilfeldig, test_kommando, test_vare, test_trinn,
  test_selskapsbilde, test_okonomitest).
- Nettleser, Dovre-testsiden (1400 × 860 og 390 × 844 mobil): vakta ok på begge (0,5–0,8 s); bilder av delen Eksport (tilbud, aktiv ordre,
  butikken), kartet (linja til havna, pila mot Hamburg, skipet ved kaia, «412 EK» i statuslinja), knappen «Veksle 10» (412 → 402 EK, +9 700 kr).
- /rogaland med ekte kartdata (leir i Ryfylke): leiren har ingen kai innen 3 km; når Sand holdes, er Sand (stor kai, 11 km) havna, og ordren
  kan tas «via Sand». Ingen grensestasjon innen 200 km der.
- Vaktene ut3-varekontrakt, ut2-byer og sjo er fortsatt ok i samme side (vare-visning.js og selskapspanel.js er endret).
- Vakta med feil lagt inn med vilje (smugling gir aldri beslag): vakta feilet («smuglingen ga ikke beslag»).

## IKKE gjort

- **Lastebilen er ikke kjørt en hel tur langs vegen** – testsiden har ikke vegnettet (vakta flytter bilen). En tur til en grensestasjon
  160 km unna (Dovre → Vauldalen) er lang; om `kjørTil` har en grense for kjøretøy, er ikke prøvd.
- Fraktskipet er bare et merke i 2D-kartet (ingen 3D-modell, ikke en båt i `SjoSpill`), og piratene er en sjanse, ikke ekte båter.
- Investorene som liker eksport (kursen stiger, planen kapittel 11) – hører til Ø7 (investorer og børsen).
- Frossen fisk og pukk (planen nevner dem «etter hvert») – ikke varer i leiren ennå.
- Grensevakta-avtalen har ingen fast pris eller varighet, og tollen ved avtale er bare turprisen.
- Rivalenes eksport (Ravnsund, Mosevakt) – Ø8.
- Hjelpeteksten er i `docs/natt/ut4-eksport-hjelp.json` (ikke flettet inn i hjelp-natt.js).
