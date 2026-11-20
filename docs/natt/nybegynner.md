# Pakke «nybegynner» – folk, tropper og opplæringen for en ny spiller

Gren `claude/natt18-test1` (mappe /home/user/natt-test1, port 8921). Vakt: `pipeline/fliser/vakter/nybegynner.js`.
Hjelpetekst: `docs/natt/nybegynner-hjelp.json`. Skript og bilder: scratchpad `natt8/nybegynner/`.

## Runde 8 (20. nov natt, ny kritikk)

Kritiker D (telefon, /norge, Lærdal) fulgte opplæringen ordrett og låste seg: steg 6 «Lag en tropp til … Ha to tropper før dag 4» +
forslaget «Vaktlag (6)» tok alle seks som var igjen, også byggerne; brakka sto «venter i kø» med 0 byggelag i to døgn, Folk 0, og han
fant ingen måte å oppløse en tropp. Kritiker C (PC, /rogaland) så steg 6 dekke kartet i tre spilldøgn, og fire bokser oppå hverandre
over leiren da røverne kom.

### 1. Opplæringsfella – RETTET
- **Forslagene tar aldri de to siste byggerne.** `Tropper.behold(personer)` (tropper.js) gir de to som blir igjen: helst dem på «bygg»,
  ellers de beste byggerne (Claudes forslag: `R.behold = 2` = ett byggelag). `Tropper.foreslå(P, n, hold)` hopper over dem; brukes av
  forslagene og «Velg de best egnede». Med seks igjen gir Vaktlag nå **(4)**. Under forslagene står hvem som blir igjen
  («Forslagene lar Sindre Røste og Astrid Vik bli igjen og bygge i leiren. Vil du ha dem med, kryss dem av selv.»). For få folk: forslagene
  er grå og teksten sier «rekrutter i Folk, eller oppløs en tropp ved leiren».
- **«Opprett» advarer.** `Tropper.advarsler(personer, valgte, { jobber, kjøkken })`: «Leiren blir tom …», «Ingen igjen på «bygg»: de N
  jobbene i leiren stopper. La minst to stå på «bygg».», «Bare én igjen på «bygg» …», «Ingen kokk igjen …» (bare når leiren har kjøkken).
  Advarselen står i rødt rett over knappen, og knappen heter da «Opprett likevel (N)». Ingen ekstra trykk (kontrollskriptet trykker
  «Opprett» og skal virke som før) – men du ser det før du trykker.
- **Steg 6 er rimelig og sier hva det koster.** Nå «Mer forsvar før dag 4»: «Røverbølgene vokser. Lag en liten tropp til (2–4 holder),
  eller sett to på Vakt i Folk. La minst to stå på Bygg. Flere folk: Rekrutter i Folk (krever ledig seng).» (kortere tekst på telefon,
  `kort` på steget). Ferdig når du har to tropper, **eller** én tropp og minst to på «vakt» (Leirvakta forsvarer leiren når røverne kommer).
- **«Ingen bygger» i Leir-menyen** (folk-visning.js, LEIR_MENY, klassen «fast» – står over fanene i alle faner): når jobber venter og ingen
  står på «bygg»: «⚠ Ingen på «bygg» – jobben står stille.» med knappen **«Sett to på Bygg»** (FolkRegler.pluss), eller når gjengen er
  tom/nesten tom **«Ring etter arbeidere (500 000 kr per person)»** (gratis når kassa er tom). `FolkSpill.hjelpBygg()`.
- **VALGET om nødbyggelag:** ingen gratis byggelag som dukker opp av seg selv – da kunne alle gjøres til soldater og nye arbeidere hentes
  gratis igjen og igjen. I stedet er den nødrekrutteringen som fantes (færre enn tre: ingen krav om seng) gjort synlig der problemet vises,
  og i nød går nye nå på «bygg» til **to** bygger (`FolkRegler.R.nødBygg = 2`, før bare den første) – ett helt byggelag.
- Prøvd som ny spiller på telefon: Speidertropp (4) → steg 5 → Vaktlag (4); to står igjen på «bygg», og brakka ble ferdig (100 % etter
  ca. 8 spilltimer). Med alle ti i én tropp: advarselen, «Opprett likevel (10)», så «Ring etter arbeidere» → to på bygg, byggelag 1.

### 2. Oppløse en tropp – RETTET
- Lagpanelet (KROKER.lagKnapper i tropper-visning.js) har **«Oppløs troppen»** for egne lag (ikke karakteren, Leirvakta eller AI) når
  laget står innen 300 m fra leiren. Første trykk gjør knappen om til «Bekreft: oppløs (N til leiren)» (oransje, 6 s) og sier i loggen at
  de går tilbake som «fri» i Folk (og at kjøpte våpen/utstyr ikke følger med); andre trykk oppløser.
- Ute: **«Send hjem og oppløs»** – troppen marsjerer hjem (`ordre`), `s.hjemOppløs`, og oppløses når den er innen 300 m (`hjemSteg` i
  KROKER.sim). En ny ordre fra deg avbryter det (KROKER.kanOrdre). Lagpanelet sier «på vei hjem for å oppløses». Sitter troppen i et
  kjøretøy, går den av først. `s.hjemOppløs` lagres ikke (ordre lagres heller ikke).
- **Fellesfil:** `spill/panelpynt.js` – ORDRE-regelen har fått `Oppløs|Bekreft: oppløs|Send hjem og oppløs`, så knappen står framme og
  ikke bak «Mer (n)» på telefon.

### 3. Steg 9 «Reparer byggene» uten skadde bygg – RETTET
- Steget har `vises: b => b.skadet > 0`: det venter usynlig til noe er skadet. Et angrep som er over uten skade, gjør det ferdig som før.

### 4. Paneler over opplæringen på telefon – RETTET
- Feilen: på telefon vant `body.kort #opplaering .t` over `.liten`/`.sammen`, så hele teksten sto selv når ruta skulle være én linje.
  Nå skjules teksten (`html body #opplaering.liten .t` …).
- Med Leir/Folk/Tropper/Krig/Deg/Sekk åpent: én linje nederst (som før, men nå virkelig én linje), og menyen får 46 px luft nederst
  (`body.oppliten` → padding-bottom), så lista og «Opprett» kan rulles opp over linja.
- Med lagpanelet, stridspanelet eller byggebanneret åpent viker ruta helt – nå også mens «✓ Gjort» vises (det var den som lå over
  «Velg alle i bildet» på kritikerens bilde).

### 5. Småting – RETTET
- Forslagstekstene følger antallet: `{N}` i MALER-tekstene, `Tropper.malTekst(id, n)` («Stormtropp (4) – Fire for kamp på kort hold …»).
- «Trykk på en soldat for å gjøre ham til lagfører» → «… for å velge ny lagfører» (**fellesfil** `index.html`, én tekst i visPanel).
  Samme setning står i `spill/hjelp.js` (emnet «Lagene») – den fila endrer jeg ikke; ny tekst er i hjelpefila.
- Tastaturhint på berøringsskjerm (`(pointer: coarse)`): **fellesfiler** `spill/knapper.js` (én CSS-regel: tastene O/I/V i Deg-menyen
  skjules), `spill/lut-visning.js` («Inventar og beholdere (Tab)» uten «(Tab)»), `spill/utstyr.js` («Tastene 1–4 bytter våpen, R lader»
  står ikke i sekken). De andre hintene (Gå ut (F), Plukk opp (P), Sett her (E), Lykt (L), Lag noe (B)) var alt skjult på telefon.
  Verktøytips (title) er ikke endret – de vises ikke på berøring.

### Kritiker C (PC) – RETTET
- (a) Et steg som står ugjort i **2 minutter ekte tid eller 3 spilltimer** (det som kommer først – `Opplaering.LENGE`, Claudes forslag),
  legges sammen til én linje av seg selv; + henter det fram for en ny periode. Ny knapp **«Senere»** legger steget sammen med en gang.
  Valget ditt med –/+ huskes som før (riksbrudd-opplaering-sammen); «Senere», «lenge» og angrep huskes ikke.
- (b) Steg 6 krever ikke to tropper lenger (se punkt 1).
- (c) **Mens leiren angripes** (SpilletSpill.T().aktiv eller #alarm synlig) står opplæringen som én linje. + under angrepet holder den oppe
  til angrepet er over.

### Funnet under gjennomspillingen – RETTET
- Steg 8 «Sett lagene i forsvar» sier «Leir → Bygg → Forsvar → «Øv»», men delen Forsvar står nederst i fanen Bygg og er ofte lagt
  sammen – skriptet (og en ny spiller) fant ikke «Øv». Nå: teksten sier «rull ned til Forsvar», ringen står rundt overskriften Forsvar
  (eller fanen Bygg), menyen rulles dit én gang per åpning (etter 0,9 s – paneler.js setter menyen øverst når den åpnes), og når delen
  er åpnet, flytter ringen seg til «Øv: sett lagene i stilling». Ringen tegnes ikke rundt noe som er rullet ut av menyen (den sto over
  bunnmenyen).

### Hjelpen (til den som samler hjelp-natt.js)
- Emnet «To tropper før dag 4» (balanse-hjelp.json) og «Opplæringen» (ui-hjelp.json) bør byttes ut med «Mer forsvar før dag 4» og
  «Opplæringen» i nybegynner-hjelp.json. «Lagene» i hjelp.js: «gjøre ham til lagfører» → «velge ny lagfører» (ny tekst i json-fila).

### Ikke gjort
- Ekstra trykk/bekreftelse på «Opprett likevel» (bare advarsel og ny tekst på knappen – se over).
- `spill/hjelp.js` (emnet «Lagene» sier fortsatt «gjøre ham til lagfører») – ny tekst i hjelpefila.
- Ingen egen 3D-endring. Hendelseskortet og stoppkortet under angrep tar en annen hjelper.

### API (nytt)
- `Tropper.behold`, `Tropper.leirEtter`, `Tropper.advarsler`, `Tropper.malTekst`, `Tropper.tallOrd`, `Tropper.R.behold`; `foreslå(P, n, hold)`.
- `TropperSpill.sendHjem(s)`, `TropperSpill.hjemSteg()`.
- `FolkSpill.hjelpBygg()`; `FolkRegler.R.nødBygg`.
- `Opplaering.vises(steg, bilde)`, `Opplaering.lenge(fra, nå)`, `Opplaering.LENGE`; steget kan ha `kort` og `vises`.
- `OpplaeringSpill.tilSteg(id)` (for vakter), `OpplaeringSpill.foldet()`, `OpplaeringSpill.angrepTest` (undefined = som i spillet).

### Tester
- `node pipeline/fliser/test_tropper.js`, `test_opplaering.js`, `test_folk.js` (nye prøver for runde 8).
- Vakten `nybegynner` prøvd på PC og telefon i nettleser (4–8 s, to ganger på rad, alt satt tilbake).
