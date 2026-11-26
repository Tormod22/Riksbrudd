# Kritikerløkka runde 2 – pakke «økonomi», 26. nov

Gren: `claude/lokke-r2-okonomi`. Anmeldelsene: docs/kritikk/2026-11-26-r2-*.md. Bilder: scratchpad lokke/r2/okonomi/.
Alle tall er Claudes forslag (brukerens faste valg er urørt: 40 mill. start, lønn 15 000 kr/person/døgn, inflasjon 1 %).

## 1. Varig press i økonomien
- **Eskorte etter risiko** (spill/selskap.js): grunnbetalingen for eskorte er 700 000 kr (før 1,6 mill.) for en ROLIG rute.
  `REGLER.RISIKO`: 45 % av nye eskorter har **meldt bakhold** (alltid når et annet selskap holder et av stedene) og betaler × 2,6;
  bakholdet kommer i 85 % av dem (rolig rute 8 %). Gamle lagrede eskorter uten `k.risiko` bruker `rival.angrep` som før.
  `k.risiko` står i kravteksten og på kortet («⚠ meldt bakhold» / «rolig rute»).
- **Bakholdet er ekte** (spill/selskap-visning.js, hendelsen `angrep`): seks bevæpnede mann (`Strid.bevæpn 'lett'`, `ingenAI`) legges
  FORAN bilen langs ruta (60 % av det som er igjen, høyst 900 m, 90 m til siden) og skyter på bilen (enheter-visning.js `motKjøretøy`).
  Før ble de satt 700 m til siden og løp etter bilen, så ingenting skjedde.
- **Angrepslagene ryddes** (koordinatorens funn): i `steg` fjernes lag med `angrepslag` når kontrakten ikke lenger er aktiv eller etter
  6 spilltimer (`e.født`).
- **Vedlikehold** (spill/leir.js `Leir.vedlikehold(L)`, `REGLER.vedlikehold = .01`, `vedlikeholdAv = .5`): 1 % av byggets pris (b.pris,
  med oppgraderinger) per døgn for ferdige bygg. Trekkes hver spilltime i spill/penger-visning.js (`driftSteg`; ikke i testene –
  `PengerSpill.driftTest = true`). Kan kassa ikke betale, meldes det (én gang per døgn) – ingen annen straff ennå.
- **Dieselen** (c): 167 døgn stemte med byggene – Ingrids leir brukte 1 kW, og strømnettet (5 kW de første døgnene) dekket det, så
  aggregatet gikk ikke. Dagboka sier nå: «Strømnettet dekker det meste nå; uten nettet bruker aggregatene ca. N l i døgnet (ca. X døgn).»
  (dagbok.js `utenNett`).
- **test_balanse.js**: lønn og vedlikehold er nå med i modellen. Nye rammer: rolig eskorte ≤ 50 % av eskorte med bakhold og av hold
  6 t; kassavekst ≤ 45 % av startpengene på ti døgn med én kontrakt per døgn (nå 39 %, før 56 %); lønn+vedlikehold ≥ 50 % av drifta
  (nå 70 %); vedlikeholdet vokser med leiren. Drift sommer 0,44 mill./døgn (før 0,13), én rolig eskorte = 1,9 døgn drift (før 14,5).

## 2. Én dagbok over inn og ut
spill/penger-visning.js: `OppstartSpill.gi/betal` pakkes inn (én gang, `gi.dagbok`) og hvert beløp føres i `S.B.d[døgn]` (døgn =
`floor(tid/1440)+1`, kl. 06–06 som morgenmøtet) med hva det gjaldt (`Penger.hvaFra(stakk)`: fila som kalte – kontrakter, lønn,
vedlikehold, bygg og innkjøp, skatt, marked og røvere …). Endringer utenom gi/betal (røverbytte) føres som «annet» ved avstemming.
Penger inn: «Kassa … Siste døgn (dag 2 kl. 06 – dag 3 kl. 06): X inn, Y ut. Så langt i dag: …», detaljlinja og «Faste utgifter».
Morgenmøtet/dagboka (dagbok.js `rapport` med `d.bok`): «Kassa 20,8 mill. kr (siste døgn: 6,3 mill. kr inn, 2,4 mill. kr ut). Faste
utgifter ca. 300 000 kr i døgnet». API: `PengerSpill.døgn(n)`, `døgnNå`, `føring`, `sumTekst`, `detaljTekst`, `faste`, `fasteTekst`.
Kontrollrommets pris: startrådet ble regnet før markedet hadde satt prisene (7,9 mot 8,8 mill.) – nå 0,4 s senere (oppstart-visning.js).

## 3–8
- Folketallet øverst: «8 +4» (i leiren + i tropper), tittelen sier «8 i leiren, 4 i tropper (12 i alt)» (folk-visning.js).
- Karavanen: «Dere har ingen dieseltank …» / «Dieseltanken er full …» (morgen.js, `s.tank` fra morgen-visning.js).
- Døde: `Samfunn.død` tar samme navn bare én gang; lagrede lister ryddes i `fraJSON`.
- Sårede som er friske igjen: «Randi Haugen ble såret, men er frisk igjen» (morgen.js tapTekst, `t.frisk` fra morgen-visning.js).
- Røverskade meldes først under 90 % og med «(85 % igjen)» (leir-visning.js, én linje).
- Loggen: `LoggDemp.REGLER.STILLE` – «X: planlegger rute …» og «X er framme.» vises én gang så lenge de gjentar seg innen 180 min
  (uten ×n; et annet lag meldes); «Motstanderne samler styrker …» står ikke på nytt etter omlasting (OPPSTART).
- «Velkommen tilbake»: GJENSKAPT – meldinger som kom mens et lagret spill ble lest inn, fikk klokka 06:0x (spillets klokke var ikke satt
  tilbake), og ved neste omlasting var en slik linje «den siste viktige». Nå går klokka aldri bakover i loggen (logglager.js `sisteTid`),
  og kontrakter (levert/tatt/brutt, «betalte», nytt nivå) har vekt 3.
- Tekster: «bygg en brakke til, eller bygg ut den dere har» (folk.js), «Nødlageret venter i låven …» / «… bærer nødlageret»
  (selskap-visning.js), «Folk fra en nabogård vil bli med» (morgen.js).
- Leveringsøyeblikket: `SelskapSpill.levertØyeblikk(k, kr)` – kort øverst (#levertkort, 14 s, spillet går videre): hvem som betalte,
  hva det betyr, neste steg og en knapp dit (første kontrakt: Åpne Leir → Bygg). Venter mens morgenmøtet/et kort står oppe og går bort
  hvis et kommer. Ikke i testene (`SelskapSpill.test`).

## Vakt og tester
`pipeline/fliser/vakter/lokke-r2-okonomi.js` (PC og mobil ok, ca. 3 s; feil lagt inn med vilje – gi uten dagbok, vedlikehold 0,
dobbel død – ble funnet). Regeltester: balanse, selskap, leir, penger, dagbok, folk, samfunn, morgen, loggdemp, logglager, region.
Vaktene selskap, kontrakter og lokke-r1-okonomi er ok; regnskap feiler likt på grunnlaget c94cf13 (ikke fra denne pakka).

## Ikke gjort
- Vedlikehold som ikke betales, gir ingen slitasje på byggene (bare melding).
- Kategoriene i dagboka leses fra kallstakken; i en nettleser uten stakk blir alt «annet».
- hjelp-natt.js sier fortsatt «et nabogårdsfolk» i ett emne (ikke min fil).
- Bakholdet er prøvd i nettleseren: kontrakt tatt, bilen 40 % ute -> «Ravnsund Sikkerhet, bakhold» 900 m foran bilen mot målet, borte etter avbrudd. En hel kjøring (bilen skutt i stykker eller laget som rydder) er ikke prøvd.
