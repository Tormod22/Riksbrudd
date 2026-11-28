# ut4-maskinfolk – maskinene trenger folk på riktig plass (fase F3)

28. nov, utbyggingen av `docs/plan-selskap-okonomi.md`, kapittel 6.4 (bærejobber), 6.6 og F3 i kapittel 16. Gren `claude/ut4-maskinfolk`.
Bygger på F2 (folk som går, `spill/folkgang.js`), G4 (varer med plass, `spill/varelager.js`), Ø1 (sagbruket, `spill/produksjon.js`) og F0 (jobbtavla).
Figurene «maskinfolk» og «vei» som oppdraget nevner, fant jeg ikke i docs/ – bygget etter teksten i 6.4 og 6.6.

## Hva som er laget
- **Plassene** (`Baering.plasser(b)`): hver maskin får INNMATING (foran bygget, i den ene enden), BRUKSPLASSER (rett foran fronten; sagbruket 3,
  vedkløyver og fyrkjele 1) og UTMATING (i den andre enden; fyrkjelen har ingen). Punktene ligger utenfor byggets fotavtrykk, så veien (Vei/Folkgang)
  når dem. Test: alle plassene kan nås.
- **Matingen**: innmatingen tar høyst 4 m³ av hver råvare, utmatingen høyst 4 m³ til sammen (`Produksjon.REGLER.buffer`). Det som ligger i matingen,
  er IKKE i lageret (`L.lager`) – det ligger ved maskinen. `Produksjon.steg(P, L, dt, { mating, kraftPer })` tar råvaren fra innmatingen og legger det
  den lager i utmatingen. Uten `mating` er alt nøyaktig som før.
- **Maskinen går bare når operatørene STÅR på bruksplassene** (Folkgang: `s.ved` mot nettopp bruksplassens mål), det er råvare i innmatingen og plass i
  utmatingen. Arbeidskraften per maskin (`kraftPer`) = summen for operatørene som står der av personTempo × døgnplanens tetthet (24 / arbeidstimer ×
  dagsverk, samme som `Jobber.faktor`). Grunnene med matingen: «venter på folk», «venter på tømmer» (flis/brensel), «utmatingen full», «uten strøm»,
  «i stykker», «slått av», «slitt – må repareres». Timene telles per grunn som før (`P.sto`: folk, tom, fullt, strøm, ødelagt, slitt – grafen
  «Hvorfor saga sto» virker som før).
- **Operatørene** velges blant dem på «maskin» som er i arbeidstida: maskinene i rekkefølgen fyrkjele, sagbruk, vedkløyver får så mange som trengs til
  arbeidskraften er nok (høyst én per bruksplass); den som kjørte maskinen sist, får den igjen. Med døgnplanen gir én person i arbeid ca. 3,15 i
  arbeidskraft (to skift), så én operatør kan holde saga i full fart – tallene for et helt døgn er de samme som før (se «Valg» under).
- **Bærejobber** (`Baering.jobber`): innmatingen fylles så lenge en last til får plass, utmatingen bæres bort når det ligger minst én last der.
  «Bær tømmer til sagbruk», «Bær planker fra sagbruk til lageret» – med grunn når de ikke kan tas («ingen tømmer på lageret», «lageret er fullt»).
  Bærerne er folk på «maskin» som ikke er operatører, og folk på «frakt» som ikke har noe å bære fra hogstfeltene. De tar det som haster (maskinen står
  for det) først, så den tommeste innmatingen / fulleste utmatingen, så det nærmeste.
  - INN: reserverer den nærmeste tømmerhaugen i varelageret (`Varelager.reserver`, nærmest innmatingen; ute foran inne), går dit (Folkgang/Vei – til
    døra på lagerbygget, eller rett til haugen på lagerplassen), tar 0,5 m³ (`Varelager.bruk`, trekker også `L.lager`), slipper reservasjonen, bærer til
    innmatingen og legger det der.
  - UT: går til utmatingen, tar 0,5 m³, bærer til en lagerplass (et lagerbygg merket for varen først, så et annet lagerbygg med plass, egne rom, så
    lagerplassen ute) og legger det i lageret (`L.lager` + `Varelager.avstem`, så enheten havner på beste plass).
  - Forsvinner haugen hen skulle hente (stjålet, brent, brukt – beskjed fra `Varelager.beskjeder`), finner hen en ny (`finn` på nytt) og sier det i
    loggen («Ola fant ikke tømmer der hen skulle hente – går til en annen haug.»).
  - Står maskinen for råvare eller full utmating og ingen bærer har tatt jobben, bærer en av operatørene selv (maskinen står uansett).
  - Uten last avbrytes et oppdrag når arbeidstida er over; med last bærer hen den ferdig. Forsvinner personen eller maskinen, går lasten tilbake.
  - Ta opp og legge ned: 20 s hver gang.
- **Tempo**: produksjonen avhenger nå av tida som går med til å gå og bære. Målt i `test_baering.js` (3 timer, sagbruk, 80 m³ tømmer):
  | | planker |
  |---|---|
  | før (rett fra lageret) | 3,30 m³ |
  | 5 folk (3 operatører, 2 bærere), lageret 22 m unna | 3,27 m³ (99 %) |
  | 4 folk (1 bærer): 30 m / 420 m | 3,27 / 3,09 m³ |
  | 1 operatør (arbeidskraft 3) som bærer selv: 22 m / 160 m | 2,91 / 2,37 m³ |
  Én bærer rekker saga helt ut til ca. 280 m (0,5 m³ per tur, 1,3 m/s, 7,6 turer i timen). Kort vei betyr mest når det er få bærere.
- **Døgnplanen AV** (gamle spill som har slått den av, og testene med `navigator.webdriver`): bærerne er USYNLIGE. `BaeringSpill.aktiv()` er usann,
  matingen og lastene legges tilbake i lageret (`Baering.tøm`), og maskinene går rett fra lageret nøyaktig som før. Det samme skjer om døgnplanen slås av
  midt i et spill. Som gjest i flerspiller (LeirSpill.erSpeil()) er det også av.
- **Opplæring**: en operatør som står på plass ved en maskin som går, får `ferd.maskin` + 0,004 per driftstime (full fart etter 8 timer på samme
  maskintype, ellers mindre), høyst 1,6. Bytter hen maskintype, starter rampen på nytt. (Ca. +0,1 på 25 timer – sakte.)
- **Visning 2D** (KROKER.tegn, fra 1,6 m per punkt): innmating og utmating som stiplede felt med hvor fullt det er og «inn 3,7 m³» / «ut 0,3 m³»
  (fra 0,9 m per punkt), bruksplassene som oransje ringer (fylt når operatøren står der), og bærerne med last: tre stokker (tømmer) eller en kasse
  (planker, flis, ved) bak prikken/figuren. Over maskinen: et status-ikon ved tallet (grønn ✓ går, gul F/T/! venter på folk/råvare/full, rød S/X uten
  strøm / i stykker), og grunnen under når du er zoomet inn (som før).
- **Selskapet → Produksjon**: per maskin «Innmating 3,6 m³ tømmer (høyst 4) · utmating 0,3 av 4 m³ · på plass 2 av 3 · 1 bærer»; ny del «Bæring»:
  timer i dag (turer, m³, hvor mye av det er gange), snitt per tur og andel gange («kort vei mellom lager og maskin gir mer produksjon»), og bærejobbene nå.
  «Folk på Maskiner» teller også bærerplassene.
- **Jobbtavla**: jobben «Maskiner» får 2 ekstra plasser per sagbruk og 1 per vedkløyver (bærere, med to skift én i hvert) når bæringen er på, og
  bærejobbene står først i lista («Bær tømmer til sagbruk (1 bærer)», «Driv sagbruk»).
- **3D**: ingen egen kode – folk3d.js følger plassene fra gangen, så operatørene står foran maskinen og bærerne går. Ikke sett på bilde i 3D.
- **Lagring**: `riksbrudd-baering` per leir ({ leir: 'x,y', B }): matingen, oppdragene (med last), opplæringen og tellingene; hvert 5. s og ved pagehide.

## Valg (Claudes, åpne spørsmål)
- Bærerne er usynlige med døgnplanen av (heller enn pynt): da er tallene garantert som før.
- Operatørene bruker døgnplanens tetthet (som resten av F0/F2), så saga trenger ikke tre personer på plass samtidig – det ville doblet bemanningen og
  endret økonomien. Bruksplassene fylles av dem som er i arbeid; en alene holder saga i gang.
- Matingen er utenfor lageret (røvere og regn tar den ikke, den teller ikke i statuslinja).
- Alt går via lageret (saga -> lager -> kjele), ingen direkte bæring maskin til maskin.

## Tall (Claudes forslag – `Baering.REGLER` og `Produksjon.REGLER.buffer`)
Last 0,5 m³ per tur til fots; 20 s å ta opp/legge ned; innmating 4 m³ per råvare, utmating 4 m³ til sammen; bærerplasser på tavla sagbruk 2,
vedkløyver 1, fyrkjele 0; opplæring 0,004 per driftstime, rampe 8 t, høyst 1,6; plassene 1,1 m (bruksplass) og 2,6 m (mating) foran fronten,
1,4 m inn fra endene (minst 1,8 m fra midten), bruksplassene spredt høyst 2,6 m til hver side.

## Filer
- `site/dovre-fliser/spill/baering.js` – NY, regler (`Baering`: `REGLER, plasser, inngang, lager, jobber, steg, tøm, tømMating, mål, opMål, linjer,
  maskin, oversikt, tilJSON, fraJSON`).
- `site/dovre-fliser/spill/baering-visning.js` – NY (`window.BaeringSpill`: `på, aktiv(), tilstand(), mating(), kraftPer(), linjer(), plasser(b),
  maskinTekst(b), bæreTekst(), status(s), ekstraPlasser(L), tøm(), lagre(), les(), nullstill()`).
- `pipeline/fliser/test_baering.js` – NY (10 deler + selvtest: plassene, venter på tømmer/folk, utmatingen full, ny haug, tempo kort/lang vei,
  opplæring, tøm, uten varelager og lagring, produksjon uten mating som før, frakt-folk).
- `pipeline/fliser/vakter/ut4-maskinfolk.js` – NY vakt (0,5–1,2 s).
- `docs/natt/ut4-maskinfolk-hjelp.json` – ett hjelpeemne («Maskinene trenger folk og bærere», Leiren).

## Fellesfiler endret (nøyaktig)
- `spill/produksjon.js` (eies av pakka): `REGLER.buffer`; `MATETEKST`; hjelpere `hentFra`, `utSum`, `plassFor`; `råvare(L, M, andel, Bf)`,
  `vil(L, b, folkIgjen, Bf)`, `hviler(L, b, kraft, Bf)` tar matingen; `grunnTekst(g, t, mating)`; `steg` bruker `ctx.mating` og `ctx.kraftPer`
  (utmatingens plass deles på summen av det maskinen lager); api + `MATETEKST, utSum`. Uten matingen uendret (test_produksjon grønn).
- `spill/produksjon-visning.js`: `mating()`; `LB.hviler` med matingen; `Jobber.maskiner` (blokk ser på matingen, bærejobbene først i `hva`, ekstra
  plasser); simuleringen er flyttet til `simSteg(dt)` (= `ProduksjonSpill.steg`) og gir `mating/kraftPer` når bæringen er på; fanen: matingslinje per
  maskin, delen «Bæring», «Folk på Maskiner» teller bærerne; 2D: status-ikonet ved tallet.
- `spill/folkgang.js`: i `målFor`, rett etter `hva === 'borte'`: `if (ctx.mål) { const q = ctx.mål(p, hva); if (q) return q; }` (+ kommentar om
  `ctx.mål`). Uten `ctx.mål` uendret (test_folkgang grønn).
- `spill/folkgang-visning.js`: i `steg()` – `ctx.mål = FolkgangSpill.målKrok` når den er satt, og etter `FG.steg` kalles hver funksjon i
  `FolkgangSpill.etter` (G, dtSek, ctx); `window.FolkgangSpill` har `målKrok: null, etter: []`.
- `spill/jobber.js` og `spill/varelager.js`: IKKE endret (API-ene holdt: `Jobber.maskiner`, `Varelager.reserver/slipp/bruk/beskjeder/finn/plasser/
  sum/avstem/punkt`).
- `index.html`: to skript-tagger rett etter `folkgang-visning.js` (`baering.js`, `baering-visning.js`) + `versjon.py`.

## Prøvd
- `node pipeline/fliser/test_baering.js` – alle ok (tallene over). test_produksjon, test_folkgang, test_folk, test_jobber, test_varelager,
  test_kommando, test_leir, test_ressurser, test_vei – grønne. `test_okonomitest.js`: «ok – men 6 kjente brudd» (uendret; økonomitesten kjører maskinene
  uten døgnplan/gange, så den bruker ikke matingen – sammenligningen med kort vei står i test_baering.js del 5: 99 %).
- Nettleser (Dovre-testsiden, 1400 × 860 og 390 × 844 mobil, bilder sett i scratchpad `natt/ut4-maskinfolk/`): sagbruk, fyrkjele og lagertelt med seks
  på Maskiner kl. 09 – feltene inn/ut med mengdene, bruksplassene med operatørene, bærere med last, status-ikonet, fanen Produksjon med matingen og
  «Bæring», loggen «… fant ikke tømmer der hen skulle hente – går til en annen haug.». Ingen sidefeil.
- Vakta `ut4-maskinfolk` ok på PC og mobil. Feil lagt inn med vilje (operatørene teller uten å stå på plass) → vakta feilet på «opPlass».
  Andre vakter etter endringen (PC): ut2-sagbruk, ut3-folkgar, ut3-varer, ut1-jobber, folk, leir2d, ut3-varekontrakt – ok. `ut1-selskap` feiler
  («Byer viser ingenting») også på utgangspunktet 7a5f92c uten mine endringer.

## IKKE gjort / å vite
- Tømmerbil/lastebil til bæring mellom lager og maskin: ikke koblet til (tømmerbilen frakter fortsatt hogst -> lager som før). Det naturlige er en
  bærejobb med last 20 m³ for et kjøretøy når vegen er lang – ikke laget.
- Maskiner i byggesettets haller (B5) og bruksplasser inne i bygg: plassene er punkter utenfor leirens maskinbygg.
- 3D ikke sett på bilde (ingen egen 3D-kode; figurene følger gangen). Ingen tømmerstabler ved innmatingen i 3D.
- Ved 60× tar hver fase (gå, ta opp, gå, legge ned) minst ett steg i gangen (4 i sekundet), så bæringen blir litt tregere i spilltid ved høy fart.
- Ingen kø ved innmatingen; flere bærere kan stå på samme punkt.
- Lasten som bæres teller ikke i lageret eller i statuslinja (den er «underveis»).
