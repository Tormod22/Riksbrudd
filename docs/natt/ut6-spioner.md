# ut6-spioner – spioner og sabotører (kapittel 14.3 og 12)

28. nov, gren `claude/ut6-spioner`. Plan: `docs/plan-selskap-okonomi.md` 14.3 «Spioner og sabotører» og 12 «Etterretning og sabotasje»,
pluss koblingen rivaler ↔ børs. **Alle tall er Claudes forslag** (samlet i `Spion.REGLER` i `spill/spion.js`).

Spørsmål 22 i kapittel 18 («er det gøy med slike overraskelser, eller blir det for mye uflaks?»): **forslaget er brukt** – overraskelsene er med,
men sjeldne, og dere har alltid en vei til å oppdage og svare: ingen spion kommer inn uten at dere ansetter en søker, kameravakta, vakta og
leirsjefen gir mistanke, søkerkortet kan advare, og uskyldige blir sjelden mistenkt (3 % per natt med kameraer, mindre med en god leirsjef).

## Filer

| Fil | Hva |
|---|---|
| `site/dovre-fliser/spill/spion.js` (ny) | Reglene uten DOM (`globalThis.Spion`): søkersjanse, innsyn, mistanke/natt, avhør, sparken, falske opplysninger, porten, egne spioner, kommandoene. |
| `site/dovre-fliser/spill/spion-visning.js` (ny) | `window.SpionSpill`: krokene, takten, Folk-panelets «Mistanke», søkermerket, Partnere-delen, KROKER.ild/ser/lagTekst, lagring `riksbrudd-spion`. |
| `pipeline/fliser/test_spion.js` (ny) | 68 sjekker, også krokene i rekruttering.js, spionens virkning i rival.js og `Bors.rivalKjøp`. `SELVTEST=1`: sparken fjerner ikke innsynet – slår ut. |
| `pipeline/fliser/vakter/ut6-spioner.js` (ny) | Vakta (ca. 0,1 s). |
| `docs/natt/ut6-spioner-hjelp.json` (ny) | Fire hjelpeemner («Leiren», «Lag og strid»). |

## Hva som er laget (per punkt i oppdraget)

1. **Spioner blant søkerne.** `Rekruttering.nySøker` (ny krok) gjør en søker til spion med sjansen `Spion.søkerSjanse(foran)` =
   3 % + 8 % × (din verdi / rivalens verdi − 1, høyst 1,5), høyst 15 %. Verdiene fra `SeierSpill.bilde().verdi`. Rivalen som ligger lengst bak,
   sender; høyst én spion (eller spionsøker) per rival. Søkeren lages som før (samme tilfeldighet – kroken bruker spionmodulens egen).
   `Rekruttering.ansattKrok` (ny krok): en ansatt spionsøker kommer inn i `S.inne` ({ pid, side, avslørt, vendt }).
   **Innsyn:** `AI.minne[side].leir = true` (og `.spion = true`) så lenge spionen er inne og ikke vendt – rivalen vet hvor leiren og lageret er.
   `RivalSpill.spion(side)` gir `{ kontrakt: 2, sabotasje: 2, stopp: 0,3, skade: 1,5 }`: rival-visning.js tar tilbudene deres dobbelt så ofte
   («(de visste hva dere bød på)»), saboterer dobbelt så ofte, vaktene stopper sabotøren bare 30 % så ofte, og sabotasjen tar den heleste
   maskinen og gjør 1,5 × skade (`Rival.sabotasjeMål(…, { spion })`; meldingen sier «har de noen inne i leiren?»).
   **Porten:** når et lag fra spionens side kommer innen 900 m fra leiren (nytt angrep), åpner spionen porten med 60 % sjanse (én gang per
   angrep): i 30 spillminutter tar egne lag innen 400 m fra leiren 1,3 × treff fra den siden og skyter 0,85 × så godt (KROKER.ild). Loggen:
   «Noen har åpnet porten for …», og spionen får mistanke («var ved porten da den ble åpnet»).
2. **Oppdage.** Hver morgen (dagskiftet kl. 06) `Spion.natt`: spionen sniker seg ut 50 % av nettene; med kameraer + folk på overvåking i et
   kontrollrom som virker (eller et smart kamera) ser kameravakta det med 40 % (smart 55 %), ellers vakta 5 % per vakt (høyst 20 %).
   Sett = +35 mistanke («kameravakta så hen ved lageret i natt»). Leirsjefen (`LedereSpill`, rollen leirsjef) fatter mistanke med
   25 % × (ledelse − 0,7)/0,75 per døgn (+25). Falske syn: 3 % per natt med kameraer, og leirsjefen tar feil sjelden (2 % × (1,2 − evne)).
   Mistanken svinner 3 per døgn uten ny næring. Fra 50 står personen under **«Mistanke»** øverst i søkerdelen av Folk-panelet (grunnene, %),
   og loggen sier det én gang. **Søkerkortet:** med god vakt (kontrollrom som virker og folk på overvåking eller smart kamera) får en spionsøker
   «⚠ Noe stemmer ikke med historien» med 60 % sjanse, en ærlig søker med 4 %. Ansetter dere en med merket, starter mistanken på 30.
   **Valgene:** «Avhør (3 t)» (personen settes på «fri» og tilbake etterpå; avslører med 55 % + 25 % × leirsjefens dyktighet; mislykket = −20
   mistanke; uskyldig = moral −4, lojalitet −0,15, mistanken borte), «Spark» (uskyldig: moral −6; spion: +2, innsynet borte),
   og for en avslørt spion «Falskt sted» / «Falsk kontrakt»: rivalen tror leiren ligger 2,5–4,5 km unna i 24 spilltimer (`AI.leirPunkt`, ny krok
   i fraksjoner-visning.js – AI-en går mot det punktet når den går løs på «leiren din»; når et lag er innen 350 m, er løgnen avslørt og loggen
   sier det) eller taper 1,5 mill. kr fra kassa (eskaleringens `øk[side].kr`). Høyst annethvert døgn, og 35 % sjanse for at rivalen skjønner det
   og trekker spionen ut. En vendt spion gir ikke innsyn.
3. **Egne spioner.** Selskapet → Partnere (FirmaSpill.fane/trykk pakkes inn; knappene har `data-sp="fi-spion"`): «Hos Ravnsund» / «Hos Mosevakt»
   med «Send X (egnet 65 %)» og «Velg en annen». Egnethet 0,5 + modig 0,15, nattmenneske 0,1, lærenem 0,05, pratsom −0,2, redd −0,15, lat −0,05.
   Personen tas ut av folket og ligger i `S.ute[side]`. **Innsyn:** KROKER.ser – dere ser alle lagene til den rivalen; lagpanelet sier «spionen:
   skal ta X»; Partnere viser «Nå: kassa ca. 12 mill. kr · 3 lag (28 mann) · satser på penger · sagbruk i X (80 %) · planlegger å ta Dombås ·
   vet hvor leiren deres er» og de siste rapportene (én per morgen). **Sabotasje:** «Saboter sagbruket» (helsa −0,45; rivalen må reparere for
   300 000 kr når den er under 0,5) eller «Sett fyr på et lager» (−0,8 mill. kr), høyst én gang per døgn. **Avslørt:** 2,5 % / egnethet per døgn
   (høyst 12 %), og ved sabotasje 20 % / egnethet: personen er tapt, en pakt med rivalen er brutt av dere (`Firma.brytPakt(…, 'blå')`), ryktet
   «pålitelig» −6. «Hent hjem» gir personen tilbake (oppgave «fri»).
4. **Rivaler ↔ børs.** `Bors.rivalKjøp(B, side, kr, kurs, o)` (ny regel) og `BorsSpill.rivalKjøp(side, kr)` (ny i visningen): rival-visning.js
   kalte den alt (veien «penger», 25 % per døgn, 2 mill. kr) og trekker det som ble brukt fra kassa si. Rivalen kjøper i dere når dere er notert,
   har frie andeler og (kursen er lav, dere eier under halvparten, eller halvparten av gangene) – høyst 3 % – ellers i et firma (Storlia teller tre
   ganger), høyst 5 %, alltid for det pengene rekker til kursen. Hendelsene er de samme som før (loggen, eierskifte, oppkjøp).
   `Bors.døgn(B, { …, ekteRivaler: true })` – børsens egne tilfeldige rivalkjøp (i firmaene og i dere) er av når `window.RivalSpill` finnes.
   (Misfornøyde investorer selger fortsatt til en rival – det er ikke et kjøp med rivalens penger.)
   Økonomitesten (`test_okonomitest.js`) er grønn – den bruker `Bors.døgn` uten flagget, som før. test_bors (62) og test_rival (59) grønne.
5. **Visning:** se over. Alt går gjennom KOMMANDO: `spionAvhør { person }`, `spionSpark { person }`, `spionFalsk { person, hva: 'sted'|'kontrakt' }`,
   `spionSend { person, rival }`, `spionHjem { rival }`, `spionSabotér { rival }`.

**I testene** (navigator.webdriver) kommer ingen spioner blant søkerne, ingen netter/oppdagelser, ingen porter og ingen avsløring av egne spioner før
`SpionSpill.test = true`. Faktorene til rivalen og innsynet virker når en spion er lagt inn (vakta gjør det selv).

## Fellesfiler endret (nøyaktig)
- `index.html`: to skript-tagger rett etter `rival-visning.js` (`spion.js`, `spion-visning.js`) + `versjon.py`.
- `spill/rekruttering.js`: krokene `api.nySøker(s, tid)` (sist i `lagSøker`) og `api.ansattKrok(s, p, tid)` (i `ansett`, etter at personen er lagt
  inn); begge `null` som standard. test_rekruttering grønn.
- `spill/rival.js`: `sabotasjeSjanse` ganger med `o.spion.sabotasje`; `sabotasjeMål(maskiner, lager, r, o)` – med `o.spion` den heleste maskinen og
  `skade × o.spion.skade` (høyst 0,8). Uten spion som før (test_rival grønn).
- `spill/rival-visning.js`: `spionF(side)` fra `RivalSpill.spion` (settes av spion-visning.js); brukt i `tarTime` (sjansen × kontrakt), `sabotér`
  (sjansen, målet, vaktenes stopp × stopp, en setning i meldingen). Uten spion: alle faktorene 1 og samme rekkefølge på tilfeldighetene.
- `spill/bors.js`: `rivalKjøp` (ny, i api) og `om.ekteRivaler` i `døgn` (hopper over de to tilfeldige rivalkjøpene).
- `spill/bors-visning.js`: `BorsSpill.rivalKjøp(side, kr)`; `døgn` sender `ekteRivaler: !!window.RivalSpill`.
- `spill/fraksjoner-visning.js`: `AI.leirPunkt = null` (ny krok ved `AI.minne`) og leir-målet i `F.velg`-kallet spør den først.
- folk-visning.js, rekruttering-visning.js og firma-visning.js er **ikke** endret: spion-visning.js pakker inn `RekrutteringSpill.del` og
  `FirmaSpill.fane/trykk` når de finnes.

## Prøvd
- `node pipeline/fliser/test_spion.js` (68 ok; `SELVTEST=1` slår ut), test_rekruttering, test_rival, test_bors, test_okonomitest, test_kommando,
  test_fraksjoner, test_firma, test_folk – grønne.
- Nettleser (Dovre-testsiden, 1400 × 860 og 390 × 844 mobil, bilder sett): med testflaggene kom en spionsøker («grønn») om morgenen, ble ansatt,
  Mosevakt fikk `AI.minne.grønn.leir`, et grønt lag ved leiren fikk porten åpnet, «Falskt sted» ga `AI.leirPunkt` 2,5–4,5 km unna. Folk-panelet
  med «Mistanke» (mistenkt og avslørt kort, Avhør/Spark/Falskt sted/Falsk kontrakt) og søkerkortet med «⚠ Noe stemmer ikke med historien»;
  Partnere med «Hos Ravnsund»/«Hos Mosevakt»; klikk på «Velg en annen», «Hent hjem» og «Send» virker gjennom panelet, og de røde lagene ble synlige.
  0 sidefeil.
- Vakta `ut6-spioner` på PC og mobil: ok (ca. 0,1 s), alt likt etter (folket, moralen, AI.minne, børsen, spiontilstanden, kassa, lagringen; bare
  klokka har gått). Med en feil lagt inn med vilje (minne() glemmer ikke leiren når spionen går) sa den «sparken skal fjerne innsynet».
  I samme side etter den: ut5-rivaler, ut5-bors, ut3-rekruttering ok.

## IKKE gjort / forenklet
- Spionen har ingen figur – ingenting å se i kartet om natta; «kameravakta så hen» er regnet, ikke et klipp i kameravakta-lista.
- Porten er en kampfaktor (flere treff nær leiren), ikke en ekte åpning i gjerdet – gjerdene stopper ikke angriperne i dag uansett.
- En spion som går inn i en tropp (tas ut av folket), er ute av leiren og slutter å være spion.
- Avhøret bruker leirsjefens dyktighet (ingen egen «avhører»-rolle). Ingen fengsel/fange – bare sparken.
- Egne spioner er én person i en liste (ingen figur hos rivalen); innsynet er alle lagene + rapporten, ikke rivalens eget syn.
- Rivalene sender ikke flere spioner når de er langt bak enn sjansen sier, og de prøver ikke å rekruttere dine folk som spioner (lokking finnes alt).
