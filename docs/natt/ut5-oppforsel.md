# ut5-oppforsel – hva folk gjør av seg selv (fase F4)

28. nov, utbyggingen av `docs/plan-selskap-okonomi.md`: kapittel 6.7 «Oppførsel», 14.4 «Ulykker og arbeidsmiljø», F4 i kapittel 16.
Spørsmål 17 (egenskaper, venner, trøbbel): brukt forslaget – folk har egne personligheter som kan skape litt trøbbel.
Gren `claude/ut5-oppforsel`. Bygger på F0 (jobbtavla, `jobber.js`), F2 (gangen, `folkgang.js`), F3 (bærerne, `baering.js`) og
rekrutteringen (`rekruttering.js`). Alle tall er Claudes forslag (samlet i `Oppforsel.REGLER`).

## Filer
- `site/dovre-fliser/spill/oppforsel.js` – NY, regler uten DOM (`globalThis.Oppforsel`, Node: `require`). Test: `pipeline/fliser/test_oppforsel.js` (44 sjekker).
- `site/dovre-fliser/spill/oppforsel-visning.js` – NY, `window.OppforselSpill` (lastes rett etter `baering-visning.js`).
- `pipeline/fliser/vakter/ut5-oppforsel.js` – NY vakt. `docs/natt/ut5-oppforsel-hjelp.json` – fem hjelpeemner.

## Hva som er laget (per punkt i oppdraget)
1. **Egenskaper**: `lat` (−10 % tempo), `redd` (−10 % på vakt, går i tilflukt allerede når angrepet er meldt), `ryddig` (rydder 2 enheter per tur
   i stedet for 1), `pratsom` (venner og uvenner 1,8 × fortere, +0,5 moral i fritida per pratsom, høyst +2) – lagt inn i `Rekruttering.EGENSKAPER`
   (flagget `trøbbel` for lat/redd/pratsom: de hever ikke lønnskravet). Motsatte par (flittig/lat, modig/redd) gis ikke til samme person.
   Personer UTEN liste (`p.egen` mangler – de som var med fra før) får 1–2 faste egenskaper etter id og navn (`Oppforsel.egenFor`; 30 % får to).
   De vises ved personen i Folk (som før, via `RekrutteringSpill.personDel`). Søkerne trekker nå fra alle åtte.
2. **Venner og uvenner**: relasjon −1…1 per par (`S.rel`). Hvert 10. spillminutt: de som er sammen (samme jobb og framme i arbeidstida,
   spisetida, samlingsstedet i fritida) får +0,015 per time; ca. 12 % av parene har dårlig kjemi (fast hash per par) og får −0,02 per time.
   Venn ved ≥ 0,6, uvenn ved ≤ −0,5 (meldes i loggen). Virkning: moral +6 × andelen som har en venn på samme jobb, −8 × andelen med en uvenn
   på samme jobb (`FolkRegler.moralF`); tempo × 0,95 med en uvenn på samme jobb (`FolkRegler.personF` pakket inn); lokking: sjansen × 0,5 med
   én venn, × 0,3 med to eller flere (`Rekruttering.lokkF`). Vises ved personen: «venn med Kari og Per · uvenn med Odd».
3. **Fritid**: bålplass, messe, kantine, feltkjøkken eller kjøkken = samlingssted. I fritida (`hva === 'fri'`) går folk dit (ring rundt
   bålplassen, vennene ved siden av hverandre; inn i kjøkkenet). Moral +2 (+ pratsomme) når stedet finnes – oppå leirvirkning.js sine +3/+4.
4. **Alarm**: nivå fra `ForsvarSpill.angrep()`: «nær» = angriperne innen 1500 m eller «Forsvar leiren» trykket, «fjern» = angrep meldt
   innen 8 km (da går bare de redde). Ved «nær»: vaktene går til vakttårnet (eller en post 14 m ut), alle andre til tilflukt etter
   `Oppforsel.tilflukt`: betongbunker (rang 3, 20 plasser), ammobunker/kommandosenter/kontrollrom/sykestue/feltsykehus/verksted (rang 2),
   brakke (sengeplassene), offisersbrakke/messe/kjøkken/garasje og egenbygde rom (`Byggesett.rom`, én plass per 2 m²) (rang 1).
   Barn og gamle fra `SamfunnSpill.tilstand().avhengige` får plass først i det tryggeste stedet (de går ikke i gangen – de regnes),
   så de gamle voksne (60+), så de redde, så resten. Fullt: nærmeste solide bygg likevel («uten plass» i tavla); ingen: ved leirens midte.
   Etter angrepet går alle tilbake (planen tas bort). Loggen: «Alarm! …», «Faren er over …».
5. **Skade og brann**: et fall i helse ≥ 0,12 på én gang (kamp, brann) eller en ulykke = skadet (`S.skadet`). Skadde går til sykestua
   (sykestue/feltsykehus) til helsa er 0,9; under 0,25 bæres de: nærmeste ledige (ikke vakt) henter og bærer (den skadde følger bæreren).
   Brann (`window.BRANNER`) innen 150 m fra leiren: én slukkejobb per brennende rute (navnet på bygget i ruta), 3 per rute, høyst 8, de
   nærmeste som kan arbeide (ikke vakt, ikke skadet) – de beholder jobben mens de går. Hver slukker som er framme, slokker ruta med 0,2 per
   10 spillminutter (høyst 0,85). Dette kommer i TILLEGG til verdens egen slukking (`LEIRBRANN` i verden-visning.js: folk på vakt/bygg).
6. **Rydding**: ny `Varelager.ryddbare(Leir, L, V, n)` (det `rydd()` ville flyttet, uten å flytte). Inntil 2 ledige (oppgave «Fri», 07–18,
   ryddige først) går til varen ute, så til lagerbygget, og `VarelagerSpill.rydd(1 | 2)` flytter enheten når turen er gått.
   DEN USYNLIGE RYDDINGEN (12 enheter i timen i varelager-visning.js) ER BEHOLDT – de synlige rydderne kommer i tillegg (å ta den bort
   ville gjort at varer bare ryddes når noen har «Fri»).
7. **Ulykker (14.4)**: farlige jobber = maskin, bygg, hogst, riving, verksted, bare når personen er framme på arbeidsplassen (ikke «venter»
   ved bålet). Tretthet 0–1 = 0,45 nattskift/natt + 0,25 uten seng + 0,3 mørke uten lys + 0,4 × (1 − helse). Sjansen per skift (8 t) =
   0,05 % + (1 % − 0,05 %) × tretthet²; × 0,4 med verneutstyr. Lys = leiren har strøm (`LeirSpill.siste().prod ≥ behov`); mørke fra `NATT.mørke`
   (ellers klokka). Ulykke: helse −0,3, skadet, loggen sier hvor og om det var tretthet/mørke. Ulykker de siste 3 døgn: −3 moral hver
   (høyst −12); de siste 7 døgn: −0,3 forventede søkere hver (høyst −1,5; `Rekruttering.ulykkeMinus`).
   **Verneutstyr**: Leir-menyen → fanen Lager → «Verneutstyr og ulykker» (ulykker siste 7 døgn, sett, hvor mange som er dekket, lys om natta)
   og «Kjøp 5 sett verneutstyr (125 000 kr)» – kommandoen `kjøpVern { antall pakker 1–20 }` (`leir: true`), 25 000 kr per sett.
   Settene fordeles på dem på farlige jobber (etter id). Ingen slitasje ennå.
8. **I testene** (navigator.webdriver) skjer INGENTING før `OppforselSpill.test = true`: målKroken gir baering/folkgang som før, `moralF` 0,
   `personF` × 1, `lokkF` 1, `ulykkeMinus` 0, ingen egenskaper deles ut.

Jobbtavla (Folk → Jobbtavla) får linjene først: «Slukk brannen ved brakke (høy prioritet): Ola, Lars og Tor – 3 framme.», «Alarm: 9 i tilflukt
(betongbunker), 2 barn og gamle først, 1 vakter i stillingene.», «Bær Trond til sykestua: Bjørn bærer.», «Rydd lageret: Silje bærer inn …».
Ved personen: «slukker brannen (høy prioritet)», «i tilflukt – alarm», «henter Trond – skal bæres til sykestua», «har fri ved bålplass med Kari».

## API
- `Oppforsel`: `REGLER, ny, fraJSON, rng, hash, egenFor, giEgenskaper, har, nøkkel, rel, dårligKjemi, vennSteg, venner, uvenner, moral, lokkF,
  uvennTempo, tilfluktssteder, tilflukt, trengerBærer, velgBærer, slukkJobber, velgSlukkere, slukkPunkt, slukkSjanse, tretthet, ulykkeSjanse,
  ulykkeIDt, farlig, medVern, ulykkeSteg, ulykkerSiden, søkerMinus, registrerKommandoer`.
- `OppforselSpill`: `test, på, alarm ('nær' | 'fjern' tvinger alarmen – vakta), aktiv(), tilstand(), plan(), sett(o), lagre(), les(), linjer(),
  personTekst(p), kjøpVern(pakker), lys(), trøtt(p), nullstill(), tøm() (hurtiglagrene), mål(p, hva), etter(dt), skadet(p, grunn), feil`.
- Lagring: `riksbrudd-oppforsel` = `{ leir: 'x,y', S: { versjon, frø, rel, ulykker, vern, skadet, meldt } }`. Egenskapene står på personen (`L.folk`).

## Fellesfiler endret (nøyaktig)
- `spill/rekruttering.js`: (1) fire nye egenskaper i `EGENSKAPER` (+ `MOTSATT`, brukt i `egenskaper()`); (2) `krav()` teller bare egenskaper
  uten `trøbbel`; (3) `personF`: lat × 0,9, redd på vakt × 0,9; (4) `lokkSjekk`: kroken `api.lokkF(p)` (null = som før – én ekstra trekning
  bare når kroken gir < 1); (5) `forventet`: `ctx.ulykker` eller kroken `api.ulykkeMinus()` trekkes fra (null = som før); (6) `api.lokkF/ulykkeMinus: null`.
- `spill/folk.js`: kroken `api.moralF(F, L)` (null som standard) legges til moralmålet i `steg` (rett ved `moralTillegg`).
- `spill/varelager.js`: ny `ryddbare(Leir, L, V, n)` (eksportert). `rydd()` er uendret.
- `index.html`: to skript-tagger rett etter `baering-visning.js` + `versjon.py`.
- IKKE endret: folkgang.js, folkgang-visning.js, jobber.js, jobber-visning.js, rekruttering-visning.js, folk-visning.js, verden-visning.js,
  forsvar-visning.js. Visningen pakker inn `FolkgangSpill.målKrok`, `.fastLinjer`, `.gjør`, `FolkRegler.personF` og `RekrutteringSpill.personDel`
  ved lasting (og legger en funksjon i `FolkgangSpill.etter`). Brannen slokkes ved å ta ruta ut av `VerdenSpill.tilstand().brann`, bygge
  `BRANNER`/`BRENT` på nytt med `Verden.brannListe` og sende `riksbrudd-brann` (som verden-visning.js gjør selv).

## Prøvd
- `node pipeline/fliser/test_oppforsel.js` – alle ok; test_rekruttering, test_folk, test_varelager, test_jobber, test_folkgang, test_baering,
  test_kommando, test_morgen – grønne.
- Nettleser (Dovre-testsiden, 1400 × 860 og 390 × 844 mobil, bilder sett): Folk-panelet med «Slukk brannen ved brakke (høy prioritet): … – 3 framme»,
  folkene med «slukker brannen», den bårne «ligger på sykestua», egenskapene ved personene; Leir → Lager med «Verneutstyr og ulykker» og kjøpeknappen;
  loggen med «Brann ved brakke! Ola, Lars og Odd slukker», «Bjørn henter Trond og bærer hen til sykestua», «Bjørn har båret Trond til sykestua». Ingen sidefeil.
- Vakta `ut5-oppforsel` grønn på PC og mobil (0,15–0,4 s): alarm (9 av 9 i tilflukt, bunkeren først, vakta i tårnet, tilbake etterpå), brann
  (slukkejobb, 3 slukkere framme, brannen slokner), skade (sykestua, bærer, båret), venner (+1,2 moral), rydding (1 vare båret inn), ulykker
  (sjansen 0,05 % → 0,5 % sliten, 0,2 % med vern; en ulykke i spillet med kunstig høy sjanse), kjøp av verneutstyr.
  Feil lagt inn med vilje (alarmen sender ingen i tilflukt) → vakta feilet på «alarm: ikke alle andre går i tilflukt».
  Kjørt i rekke etter den: ut3-folkgar, ut1-jobber, ut3-rekruttering, folk, lonn, morgen, ut4-maskinfolk – alle ok.

## IKKE gjort (senere / åpent)
- **Streik** (står i F4-raden i planen, men ikke i oppdraget): ikke laget. Lønn/nattskift over tid kan bygges på `OppforselSpill` (relasjonene og
  egenskapene er der).
- Barn og gamle går ikke som figurer i gangen (de regnes bare inn i tilfluktsplassene og står i tavla); folk3d viser dem som før.
- Bærer og skadet tegnes ikke som «bæring» (den skadde følger bæreren på samme plass). Ingen egen 2D-tegning av alarm/slukking – prikkene viser hvor de går.
- Verneutstyret slites ikke; «lys» er bare «leiren har strøm nok» (ikke lamper per bygg).
- Venner/uvenner glemmes ikke over tid, og relasjoner mellom folk på ulike jobber som møtes i fritida teller i vennSteg, men ikke i moralen
  (moralen ser bare på samme jobb).
- Lokking: venner holder på folk, men «venner går sammen» (14.1) er ikke laget.
- I testene skjer ingenting av seg selv – også egenskapene til de gamle personene deles først ut i et ekte spill (eller med `OppforselSpill.test`).
