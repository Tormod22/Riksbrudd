# ut8-kr-penger – kontraktene en ny spiller kan ta, og hvor pengene går (28. nov)

Kritikken (Jonas Bakke og Ingrid Sæther, docs/kritikk/2026-11-28-ut-*.md): etter den første kontrakten var alle tilbudene i Selskapet
«For svakt: 4 mann mot et forsvar på ca. 10 / 25 / 50», Neste-lappen sto på «Ta en ny kontrakt i Selskapet» fra dag 1 til dag 4, og kassa
gikk fra 40–45 til 16–20 mill. på 1,5–3 døgn. Alle tallene under er Claudes forslag.

## 1. Minst ett tilbud én tropp klarer (HØY)
- `Selskap.sikreLett(S, id, nå, steder, rand, o)` (spill/selskap.js, kalles sist i `lagTilbud` når `o.styrke` er gitt og det ikke er en
  fast kunde): finnes ingen åpent tilbud spilleren klarer (`Selskap.klarbar`), lages ett – en hentejobb eller et hold for
  **bygdelaget/kommunen i stedet selv** (bygdevernet slipper dere inn: krig-visning.js `oppdragFor`), i et tettsted ingen andre holder
  og uten kjente fiender, eller ved en bru. Nærmest først (fra 800 m – Ulvik lå 1,3 km fra Jonas' leir, og vanlige tilbud starter på
  2,5 km), helst innen 9 km, ellers lenger ut. Fristen får en time ekstra per km. Merket `k.lett`.
- `REGLER.lett = { styrke: 4, min: 800, maksMeter: 9000, nærmeste: 3, holdSjanse: .5, ekstraPerKm: 1, garnison: 8, betaling: .85, maksNivå: 2, rykte: .5 }`:
  betaler 85 % av et vanlig tilbud, gir halvt rykte («pålitelig») ved levering, finnes bare på nivå 1–2 og bare når ingen vanlig
  kontrakt er i gang (se økonomitesten under – ellers ble det en snarvei til nivå 4 og over 200 mill.).
- `Selskap.forsvarFor(k, sted, id)`: det kjente forsvaret for en jobb – samme regel som `forsvarVed` i visningen (bygdevernet teller
  ikke for stedets egen bygd/kommune; garnison når et annet selskap holder stedet). `Selskap.klarbar(k, styrke, sd, sted, kjøretøy)`.
- Visningen (selskap-visning.js): `nyeTilbud` gir stedene vern/fiender/garnison (`medForsvar`, fra `StrategiSpill.kjentForsvar`) og
  styrken (største lag, minst 4) og antall kjøretøy. `SelskapSpill.klarbare()` = tilbud med ✓ og uten advarsel (heller ikke frist/rute),
  de lette først. Tilbudslista viser de klarbare først.
- NESTE-LAPPEN: steget «Neste kontrakt» i opplæringen og lappen uten kontrakt i gang peker på det klarbare tilbudet («Ta kontrakten «…»
  (1,2 mill. kr) – én tropp klarer den») – ellers på et lite oppdrag (`veienVidere()`).

## 2. Pengene (HØY)
Hva som spiser (Jonas: faste 254 000 → 411 000 kr/døgn): **lønn** 15 000 kr per person (10 → 16 personer = 150 000 → 240 000),
**vedlikehold** 1 % av byggeprisen per døgn (brakke 5 mill. = 50 000/døgn, sag 7,6 mill. = 76 000) og **diesel** 3 000 kr/l, som ikke sto
i «faste utgifter» i det hele tatt (aggregatene: 0,3 l per kWt – 10 kW døgnet rundt = 72 l = 216 000 kr). «Ukas resultat −23,7 mill.»
inneholdt også byggene (brakke, sag, aggregat … ca. 15–20 mill.) – investeringer, ikke drift. Uten en kontrakt dere klarer, var det ingen
inntekt; det var hovedfeilen, ikke prisene.

Hvorfor modellen og spillet var uenige («bare kontrakter» ca. 100 mill. i modellen): **modellen regnet ikke bygdevernet som forsvar** –
den så bare `k.fare` (et sted et annet selskap holder) – så den tok jobber for et firma i tettsteder med bygdevern på 4–14 mann, som
spillet kaller «For svakt». I tillegg har modellens tropp 6–9 mann og fylles opp med rekrutter. Rettet i modellen
(pipeline/fliser/okosim.js: stedene har `vern`/`garnison`, `har()` og `besteKontrakt` bruker `Selskap.forsvarFor`, og `lagTilbud` får
`styrke`). Med bare bygdevernet (uten det lette tilbudet) falt «kontrakter + andeler» dag 30 fra 98 til 76 mill. og «børs tidlig» fra
135 til 114 – det er kritikken i tall. Med det lette tilbudet er båndene tilbake (bare kontrakter 104 [69–136], og de nederste 10 % er
høyere enn før: dag 10 23 → 23–24, dag 15 21 → 31–35).

NY STRATEGI «ny spiller: én tropp på fire» (pipeline/fliser/okosim-penger.js – det spillet ber om: én tropp på fire som fylles opp, de
kontraktene den klarer, tre bygg): kassa dag 2 14,3 → dag 10 15,7 mill. (median), 2 % under 5 mill.; uten det lette tilbudet 13,6 → 12,8
(selvtesten slår til). Over 30 døgn er den ikke «fornuftig» (fornuftig: false): røverbølgene tar ca. 10 mill. mens troppen er ute, og
10–15 % er blakke på slutten – en spiller må vokse ut av fire mann.

OVERSIKT: én ny linje (selskapspanel.js `driftHtml`, reglene i selskapsbilde.js `drift/driftTekst/driftRåd`): «Leiren bruker ca. X kr i
døgnet – største poster: lønn Y, diesel Z og vedlikehold W», og et råd: «Ta en kontrakt: «…» gir 1,2 mill. kr – ca. 2 døgn med drift. Én
tropp klarer den.» (knapp «Se kontrakten»), ellers lever de som er i gang / ta et lite oppdrag, «Diesel er største post: …» og «Kassa
rekker ca. N døgn» når den er lav. Diesel = `LeirSpill.diesel().perDøgn` × dagens pris; vedlikehold = `PengerSpill.vedlikehold()`.

Ikke endret (med vilje): lønna (brukerens 15 000), dieselprisen og vedlikeholdet (1 %) – de deles av mange systemer og bånd.

## 3. Små oppdrag i Kontrakter (MIDDELS)
Kontrakter har gruppen «Små oppdrag» (samme `SpilletSpill.O().liste` som Leir → Mål, som står som før) med navn, belønning, frist,
«Ta oppdraget» (ny kommando `oppdragTa`, registreres av selskap-visning.js i `window.Kommando`) og «Vis i kartet». Neste-lappen peker på
et tatt oppdrag («Send en tropp til oppdraget …», trykk = kartet og troppen valgt) eller et ledig («Ta et lite oppdrag: …») når ingen
kontrakt passer.

## 4. Ta over hus koster (MIDDELS)
spill/overtak.js: `REGLER.istand = { fast: 200 000, perSeng: 150 000, perM3: 6 000, timerFast: 2, timerPerSeng: .3, timerPerM3: .02 }`,
`Overtak.istandsetting(K, betalt)` (bytte av bruk betaler bare det nye), `Overtak.sum(hus, nå)` teller ikke hus som settes i stand
(`h.klar`). Kasernen: madrass per 12 m² (før 8), høyst 24 senger (før 40). En kaserne med 16 senger og 100 m³ = 3,2 mill. og 9 t
(brakke: 5 mill. for 8 senger). Husvinduet viser prisen på knappene. Tiden går bare i spillet (`HusvernSpill.istandTest = true` i testene).
Materialer er IKKE med (bare penger og tid).

## 5. Samme ukeresultat (LAV)
`Selskapsbilde.ukeNå()` er kilden. Eiere viste −12,9 mill. fordi børsen viste tallet den regner med i kursen (høyst 30 % av eiendelene,
uten børsens egne penger) – nå står det samme tall som i Oversikt, og «(i kursen −12,9 mill.: …)» når de er ulike.

## 6. Sagas «verdt 15 214 kr mer enn tømmeret» (LAV) – bare vurdert
Regnestykket (produksjon.js `verdi`) er riktig: innkjøpsverdien av plankene/flisa/veden minus innkjøpsverdien av tømmeret. Men det er
innkjøpspriser (salg gir 50 %), og diesel og lønn er ikke trukket fra, så tallet sier lite om saga lønner seg. Forslag til kr-saga:
«Laget hittil: 1,5 m³ planker – selges for ca. X kr; tømmeret kostet Y og dieselen Z.» Ikke endret her (produksjon-visning.js eies av
kr-saga).

## Fellesfiler endret
- spill/selskap.js: `sikreLett`, `forsvarFor`, `klarbar`, `REGLER.lett`, kallet sist i `lagTilbud`, halvt rykte for `k.lett` i `lever`.
- spill/selskap-visning.js: `medForsvar`, `styrkeNå`, `nyeTilbud` (styrke), `klarbare`, `veienVidere`, lappen, «Små oppdrag», `oppdragTa`.
- spill/selskapspanel.js: `driftHtml` (én linje i Oversikt + CSS `.drift` + knappen `drift`), `uke()` bruker `Selskapsbilde.ukeNå`.
- spill/selskapsbilde.js: `ukeNå`, `drift`, `driftTekst`, `driftRåd`.
- spill/bors-visning.js: `ukeTekst` (Eiere viser samme ukeresultat).
- spill/overtak.js og spill/husvern-visning.js (istandsetting) – husvern-visning: sjekk/taOver/sum/raden i husvinduet.
- pipeline/fliser/okosim.js: bygdevernet i stedene, `forsvarK`, `styrke`, eksport av `kontraktTime, steder, BYGGELISTE, fyllTropp, døgnUt`.
- pipeline/fliser/okosim-penger.js (ny), test_selskap.js, test_selskapsbilde.js, test_husvern.js (nye sjekker).
- pipeline/fliser/vakter/ut5-kampvegger.js: kassa settes tilbake etter overtaket (det koster nå).
- Vakt: pipeline/fliser/vakter/ut8-kr-penger.js. Hjelp: docs/natt/ut8-kr-penger-hjelp.json.

## Kjent / ikke gjort
- Økonomitesten (60 frø) og OKO_STRENG=1 er grønne. Med 120 frø: de samme to bruddene som før endringen («børs tidlig» over 200 i 1 av
  120, «byer med makt» 11 % blakk) og eksportkravet −7 mill. mot slakken 5 (før −0,3): «kontrakter + sag + varer» tjener mer på de lette
  tilbudene enn eksportstrategien. Sammenligningene mellom to strategier med 60 frø svinger ±5 mill.
- Båndet (okonomitest-band.json) er ikke lagret på nytt (unngår konflikt) – den nye strategien står som «ny».
- Neste-lappen i opplæringens trinn «Bygg noe» står som før til det er bygget.
