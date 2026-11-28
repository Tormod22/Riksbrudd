# ut3 – varer med plass (G4): hauger, paller, fat, reservering, soner, tyveri og brann (28. nov)

Plan: `docs/plan-selskap-okonomi.md` 13.2 «Varer som tar fysisk plass» og G4 i kapittel 16. Gren `claude/ut3-varer`.
Spørsmål 20 (synes det i 2D?): brukt forslaget – ja, haugene, pallene og fatene tegnes i 2D-kartet når du er zoomet inn på leiren.
Figuren «lager» som oppdraget nevner, fant jeg ikke i planen (ingen figur med det navnet i docs/) – bygget etter teksten i 13.2.

## Hva som er laget

**Regler uten DOM: `site/dovre-fliser/spill/varelager.js` (window.Varelager), test `pipeline/fliser/test_varelager.js`.**
- Hver vare ligger i ENHETER: pall planker (2 m³), pall sementsekker (1 m³), bunt stål (1 t), tømmerhaug (2 m³), storsekk flis (2 m³),
  pall ved (2 m³), fat diesel (200 l). Den siste enheten kan være delvis full. (Hylleplass/kasser for ammunisjon og deler finnes som
  form i REGLER.hylle, men leiren har ingen slike varer i L.lager ennå.)
- PLASSER: lagerbyggene (lagertelt, container – alt med `effekt(b).lager`), egne rom fra byggesettet (`Leir.lagerplass.ekstra`, «rom»),
  dieseltank/aggregat (fatene) og ute på lagerplassen (ingen grense). Kapasiteten følger leir.js akkurat som før: hvert lagerbygg tar
  `effekt(b).lager` av HVER vare. `Leir.lagerplass` og alle tallene i leir.js er uendret.
- **SUMMEN AV ENHETENE = TALLET I L.lager** (diesel: L.drivstoff). `avstem(Leir, L, V)` legger til eller tar bort enheter så det stemmer.
  Tallene er fortsatt fasiten for resten av spillet (mange moduler skriver L.lager direkte: produksjon.js, folk.js, morgen-visning.js,
  spillet-visning.js, verden-visning.js …) – derfor avstemmes det både ved hver endring gjennom leir.js og hvert sekund i spillet.
- Nye enheter legges: bygg merket for varen → andre lagerbygg → egne rom → tanken (diesel) → ute. Det som tas ut, tas UTE FØRST,
  reserverte og de som bæres sist.
- RYDDING: `rydd(Leir, L, V, n)` flytter enheter fra ute (eller fra et bygg med feil sone) inn der det er plass. I spillet 12 enheter i
  spilltimen (folkene bærer; som egne figurer er det F3).
- RESERVERING (API-et bærerne i F3 trenger): `reserver(V, id, hvem)`, `slipp`, `hent(V, id, hvem)` (enheten «bæres» – teller fortsatt i
  summen), `lever(Leir, L, V, id, plass)`, `bruk(L, V, id, mengde)`, `beskjeder(V, hvem)`, `finnNy(V, vare, hvem, pos, x, y)`.
  Bare én kan reservere; bare den som reserverte (eller ingen) kan hente. Forsvinner en reservert enhet (stjålet, brent, slitt, brukt),
  legges en beskjed { hvem, id, vare, grunn } i V.beskjeder.
- UTE OG INNE: `ute()` gir mengdene som ligger ute; `stjel()` tar bare fra dem; `slitasje(regn, dt)` sliter det som ligger ute;
  `brann(brenner, pos)` tar det som kan brenne (ikke stål og betong) der det brenner. V.tapt teller stjålet/brent/slitt per vare.
- SONER: `settSone(Leir, L, V, byggId, vare|null)` – et lagerbygg tar da bare den varen.
- `punkt()` gir plassen i kartet: ruter på 1,6 m inne i byggets fotavtrykk (lag over hverandre tegnes ikke), fatene i rader langs tanken,
  og ute en blokk per vare på lagerplassen (V.ute).
- Lagring: `tilJSON/fraJSON` (enhetene som små lister).

**Visning: `site/dovre-fliser/spill/varelager-visning.js` (window.VarelagerSpill).**
- Lagres per leir i `riksbrudd-varer` ({ leir: "x,y", v }), hvert 5. s når noe er endret og ved pagehide. Følger med i lagringsplassene
  (vanlig spillnøkkel). Som gjest i flerspiller (LeirSpill.erSpeil) lagres ingenting – enhetene regnes ut av vertens tall.
- GAMLE SPILL (punkt 6): finnes ingen lagrede enheter for leiren, fordeler første avstemming det som står i L.lager på plassene. Det er
  hele omgjøringen – derfor er det IKKE lagt inn en `Lagring.omgjør` (den ville bare gjort det samme, og LagringSide.VERSJON måtte økes i en
  fellesfil). Prøvd i nettleseren: et spill lagret uten `riksbrudd-varer` ble lastet på nytt og fikk 110 enheter, summen stemte.
- KARTET (KROKER.tegn, tegnet etter leirens bygg – f.over/f.bygg): fra 0,6 m per punkt tegnes det som ligger ute (paller, hauger, sekker,
  fat) på et svakt tråkket felt; fra 0,3 m per punkt også det som ligger inne i lagerbyggene, svakt (sett gjennom taket). Reserverte har en
  gul prikk. Trykk på en enhet (zoomet inn, ingen lag valgt, ikke under bygging) gir én linje i loggen: hva, hvor mye, ute/under tak.
- LEIR-MENYEN, fanen Lager: «Lagerplasser: hvor varene ligger» (rett etter oversikten): hvert lagerbygg med innhold og soneknapper
  (Alle varer, Planker, Betong, Stål, Tømmer, Flis, Ved), fatene ved tanken, «Ute på lagerplassen» (gult når noe ligger ute), og hva som er
  tapt (stjålet/brent/slitt). Sonen går gjennom kommandolaget: ny kommando `lagersone { bygg, vare }` (registrert fra visningen med
  Kommando.registrer, som jobber-visning.js gjør).
- STATUSLINJA er uendret (summen). Lageroversikten (lager-visning.js) sier i merknaden hvor mye som ligger ute.
- SIMULERINGEN (KROKER.sim): avstemming hvert sekund, rydding, brann (window.BRANNER) hvert halve sekund, slitasje i regn hvert sekund
  (bare når `!navigator.webdriver || VarelagerSpill.test`). Loggen: «Regnet har ødelagt 1 m³ ved som lå ute …», «Brannen tok … i lagerteltet».
- RØVERNE: `Spillet.Trussel.bytte` pakkes inn: når spillet-visning.js (trekkUt) spør med leirens lager, får bytte bare det som ligger ute
  (og fatene ved tanken), og enhetene som tas, fjernes som «stjålet». trekkUt trekker tallene som før, og oppsummeringen (varselet og
  forsvarsrapporten) viser byttet som før – nå bare det som lå ute. Lå noe inne, sier loggen «Røverne fant ikke det som lå inne …».
  Uten lagerbygg ligger alt ute, så tyveriet er som før.

## Tall (alle Claudes forslag, i REGLER i varelager.js)
- Enhetene: planker 2 m³, betong 1 m³, stål 1 t, tømmer 2 m³, flis 2 m³, ved 2 m³, diesel 200 l.
- Slitasje ute per spilltime i fullt regn: planker 0,4 %, tømmer 0,1 %, flis 0,6 %, ved 0,5 %, betong 0,3 %, stål 0,05 %; ingenting under regn 0,15.
- Brenner: planker, tømmer, flis, ved, diesel. Rydding 12 enheter i spilltimen. Lagerplassen ute 24 m fra leirens midte (første frie sted
  i en spiral; flyttes når et bygg havner der), blokkene 18 m brede.

## Fellesfiler endret
- `site/dovre-fliser/spill/leir.js` (samlet ved leggInn nederst + én-ord-endringer):
  - ny `function varer(L, type, grunn)` (kaller `api.varer` når den er satt) og ny `function uttak(L, type, mengde, grunn)` rett etter leggInn;
  - `varer(...)` kalles i `trekk` (brukt), `kjøpMateriale` (kjøpt), `skad` → `gi` (tilbake), `selgMateriale` (solgt), `kjøpDrivstoff` (diesel)
    og `leggInn` (lagt inn);
  - api: `varer: null, uttak`. Uten varelageret (Node-testene for leir.js) er alt som før. test_leir.js er grønn.
- `site/dovre-fliser/spill/lager-visning.js`: merknaden per materiale får «x m³ ligger ute (regn, røvere).» (to linjer).
- `site/dovre-fliser/index.html`: to linjer rett etter leir-visning.js (`varelager.js`, `varelager-visning.js`) + versjonsmerkene fra versjon.py.

## Prøvd
- Regeltester: test_varelager (inkl. 400 tilfeldige endringer og selvtest), test_leir, test_kommando, test_ressurser, test_produksjon,
  test_folk, test_spillet, test_lagring, test_lagringsside – grønne.
- Nettleser (Chromium, PC 1400 × 860 og mobil 390 × 844): kjøp/innlegg → planker i lagerteltet, resten på lagerplassen ute; bilder av kartet
  (scratchpad natt/ut3-varer/kart*.png, tank.png) og fanen Lager (meny*.png); soneknappene; trykk på en tømmerhaug; gammelt spill uten
  enheter lastet på nytt (fordelt, summen stemmer); lagret og lastet på nytt (likt); slitasje i regn; brann i lagerteltet (planker, tømmer,
  flis og ved borte, stål/betong igjen, summen stemmer, logglinja); det ekte tyveriet (SpilletSpill.trekkUt med et tyvelag).
- Vakt `pipeline/fliser/vakter/ut3-varer.js`: OK på PC og mobil, både på en fersk leir og etter prøveskriptet. Selvtest: med bytte som tok
  hele lageret (feil med vilje) feilet vakta på «tyveri».

## Ikke gjort / å vite
- Bærerne som går og henter (F3): bare API-et (reserver/hent/lever/bruk/beskjeder/finnNy). Rydding skjer «usynlig» i takt.
- «Hvilken vare nærmest saga» (13.2): ikke laget – sonene er per bygg. Maskinene i produksjon.js leser fortsatt tallene, ikke enhetene.
- Hylleplass/kasser (ammunisjon, deler): ingen slike varer i leirens lager ennå; formen finnes i REGLER.hylle.
- 3D: ingen tømmerstabler/paller i 3D (planen sier 3D bare er utseende).
- Lagerplassen ute kan ikke flyttes av spilleren; den velges selv (fritt sted nær leiren).
- Varene i egne rom fra byggesettet tegnes ikke (plassen i rommet er ukjent).
- Andre moduler som skriver L.lager direkte, avstemmes innen ett sekund; tar de varer ut, tas de fra det som ligger ute først.
- Rydding (inn under tak) skjer også i testene – den endrer ikke tallene.
