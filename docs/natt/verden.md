# Pakke «verden» (natt til 18. nov) – verden gjør noe med spillet

Gren `claude/natt18-verden`. Alle tall er **Claudes forslag** og står samlet i `Verden.REGLER` (spill/verden.js).

## Filer
- `site/dovre-fliser/spill/verden.js` – regler uten DOM (`Verden`), test `pipeline/fliser/test_verden.js`.
- `site/dovre-fliser/spill/verden-visning.js` – kartet, lagpanelet, panelet «Verden rundt dere» (`window.VerdenSpill`).
- `pipeline/fliser/vakter/verden.js` – vakta (ca. 0,1 s, setter alt tilbake; virker på PC og mobil).
- `docs/natt/verden-hjelp.json` – hjelpetekstene.
- Skriptene står rett før `spill/kameravakt.js` i index.html.

## Endringer i filer jeg ikke eier (små)
- `site/dovre-fliser/terreng.js`, funksjonen `fart(klasse, veg)`: to nye linjer – `if (klasse === 3 && fart.is) return fart.is;`
  (islagt vann kan krysses når `Terreng.fart.is` er satt til km/t; ellers som før). `test_terreng.js` går som før.
- `site/dovre-fliser/spill/gange.js`, `vannVed(u)`: `if (!u.vann || window.VERDEN_IS) return () => false;` (du kan gå på isen i 3D).
- `site/dovre-fliser/index.html`: bare de to skript-taggene.
- Egne filer: `spill/dyr3d.js` har ny `Dyr3d.fell(X, Y, fx, fy, treffer)` (tar dyret ut av flokken og skjuler det).
  `vaer.js`, `vaer-visning.js`, `dyr.js`, `flom*.js`, `odeleggelse*.js` er IKKE endret.

## Hva som er laget
Alt som skjer **av seg selv**, skjer bare når `!navigator.webdriver || VerdenSpill.test === true`. Det spilleren gjør selv, virker alltid.

| Nr | Hva | Hvordan |
|----|-----|---------|
| 31 | Vinter | Marsj ×0,7 på snødekt mark (høyden over snøgrensa), ×0,8 i snøvær, ×0,85 i storm: tiden per stykke i lagets sti deles på faktoren (alle sider), lagpanelet sier «tungt føre: marsj −30 %», og loggen sier hvor lang tid marsjen nå tar. Kolonner (egne, uten fast oppdrag) over 900 moh. blir stående i snøvær. Is: døgngrader med kulde samles (`V.frost`), fra 25 bærer isen – `Terreng.fart.is = 2,5` km/t og `window.VERDEN_IS` (lag kan gå over vann og brede elver, du kan gå på isen i 3D); tiner fire ganger så fort. Kulde: egne lag som står ute (over 500 m fra leiren, ikke i tettsted, ikke om bord) under −8 °C (temperaturen faller 0,6 °C per 100 m) får varsel etter 7 timer og én frostskadd mann (såret, aldri drept) etter 12 timer og så hver 8. time. Leiren bruker ekstra ved: 1 m³ per døgn per 10 grader under −8. |
| 32 | Flom og ras | Regnsum (timer med regn, tørker 0,2 per time). Over 5: 12 % sjanse per time for flom ved en bekk/elv (orden ≥ 3 fra BEKKER, innen 12 km fra leiren, radius 150–400 m, 12 timer). Over 8: ras i en bratt li (stigning ≥ 0,45 over 96 m; ved en veg når vegnettet er lastet; radius 90 m, 24 timer; lag som står der får ett treff; et ingeniørlag i raset kan rydde det på 3 timer). Sonene: marsj ×0,25 (flom) / ×0,5 (ras) gjennom dem, veglenkene ved sonen sperres i vegnettet (kjøretøy kjører om) og åpnes igjen. Dam-flommen i flom.js er urørt. |
| 33 | Jakt | Du selv: et skudd (SKUDD fra spillet-visning.js) som peker mot et dyr i 3D innen 250 m feller det (`Dyr3d.fell` + `Verden.sikt`), kjøttet går rett til leiren (elg 60, rein 25, moskus 70, ku 80, sau 10 rasjoner; ungdyr halvt). Jaktlag: «Jakt på rein/elg (6 t)» i lagpanelet når laget står i ro der det er vilt (rein ≥ 1100 moh. på fjell/hei/myr/snø, elg i skog under 1050 moh.). Rein 1–3 dyr, elg 0–1. Området (3 km-rute) hviler 72 timer. |
| 34 | Dyrking | «Rydd 20 mål åker» (1 mill. kr, høyst 200 mål) og «Så» om våren (20 000 kr per mål) i panelet. Gror vår og sommer (modent etter 3 døgn), høstes av seg selv i én klump når det blir høst (6 rasjoner per mål), fryser bort hvis det blir vinter først. Åkeren er ikke et bygg i kartet. Valgfritt: «Årstidene går av seg selv» (8 døgn per årstid) – standard er av, som før. |
| 35 | Brann | Rutenett 64 m. «Tenn på her» i lagpanelet (når det ikke er for vått), lyn i tordenvær og skuddveksling i knusktørr skog (bare av seg selv utenom testene). Sprer seg til naboruter etter brennbarhet (skog 1, hei 0,55, tettbebyggelse 0,45, dyrket 0,3 …), brannfare (tørke i døgn, ikke regn, ikke våt bakke, ikke vinter) og vind (medvind øker, motvind demper). Brenner 50–110 min per rute, slokner i regn/snø, brent mark brenner ikke igjen. Lag i brannen får ett treff per halvtime, bygg i leiren mister 20 % hp per halvtime. 2D: oransje ruter som blaffer og mørk brent mark. |
| 36 | Funn | Faste steder (hash av 2,5 km-ruter, 30 %): bilvrak, gjemt depot, forlatt leir, flyvrak. Vises i kartet (gul rute med «?») når et eget lag eller du selv har vært innen 300 m. «Undersøk …» i lagpanelet innen 80 m (du selv: innen 25 m når du går). Innholdet er fast per funn: materialer, mat, diesel, penger, tomt (12 %) eller felle i forlatte leirer. |
| 37 | Radio | Med radiomast eller kontrollrom som virker: en melding hver 3.–6. time i loggen og i panelet. 65 % er sanne (ras/flom/brann som finnes, brannfare, kulde, isen, funn som ikke er oppdaget, hvem som holder tettsteder), resten er oppdiktet. Panelet sier ikke hvilke. |
| 38 | Tog | To tettsteder med stasjon (`Verden.STASJONER`, Claudes liste etter hukommelsen – ikke lest fra jernbanedataene) som du holder: «Sett banen i stand» (150 000 kr per km, 2 stål per 10 km, 2 timer per 10 km, høyst 250 km). Så et tog hvert døgn med 60 tre, 40 betong, 30 stål, 3000 l diesel og 80 rasjoner til leiren – bare mens du holder begge endene. Streken og toget tegnes i 2D. |
| – | Forhold | Værflisa øverst har verktøytips med følgene («Snø: marsj −30 % her · Isen bærer …») og åpner panelet ved trykk. Panelet åpnes også fra «Verden» i kommandolinja (PC) og fra Leir-menyen, fanen Mål («Vær og verden»). |

## For andre moduler
- `window.BRANNER = [{ x, y, r, fra, til }]` – ruter som brenner (midten i kartmeter, r = 32 m, spillminutter).
- `window.BRENT = [{ x, y, r, t }]` – ruter som har brent ut. Samme lister hele tiden; hendelsen `riksbrudd-brann` på window når de endres.
- `window.VERDEN_SONER()` → `[{ type: 'flom' | 'ras', x, y, r, til }]`. `window.VERDEN_IS` = isen bærer.
- `VerdenSpill`: `tilstand()`, `vis(bool)`, `linjer()`, `tenn(x, y, hvem, tving)` (async), `flom(x, y, orden, navn)`, `ras(x, y)`, `undersøk(lag, funn)`,
  `startJakt(lag)`, `ryddÅker()`, `så()`, `radioNå()`, `togStart(idA, idB)`, `stasjoner()`, `settAuto(bool)`, `ryddKart()`, `test`.
- Lagring: `riksbrudd-natur` per leir (frost, regn, tørke, soner, brann, åker, jakt, funn, radio, tog, kulde, auto).

## Prøvd i nettleser
- Dovre-testsiden, PC og mobil: vakta, panelet, bildene av brann/flom/ras/funn i kartet, vinter med 30 timer simulert (marsj −30 %, frostskader,
  ved brukt opp), lagknappene (jakt, tenn på), Leir-menyen og kommandolinja, lagring, og at vinteren IKKE endrer marsjen i testmodus.
- 3D ved heia sør for Dombås: et skudd mot en sau felte den og ga rasjoner.
- /rogaland med ekte vegnett: et ras ved en vegnode sperret lenken, ingeniørlaget fikk «Rydd raset (3 t)», lenken ble åpnet igjen, og en
  lastebilkolonne på vei ble stående i snøvær (med fjellgrensa satt ned for prøven).
- /rogaland med ekte data: tog Stavanger/Sandnes–Bryne (betaling, første tog med last), flomsted fra ekte elvedata (Kvennåna), ras-søk.

## IKKE gjort / svakheter
- Brent bakke i 3D tegnes ikke her (pakka «natur» – listene over er til dem). 3D-visningen av brann, ras, flom og funn er enkel.
- Snø «stenger» ikke veger i vegnettet (ville krevd høyden for alle lenker): kolonner på fjellet stoppes i stedet.
- Felte dyr kommer tilbake når 3D-utsnittet bygges på nytt.
- Åkeren er ikke et bygg (ingen 3D-modell, kan ikke brenne).
- Funn kan ligge i tettbebyggelse; de er ikke 3D-modeller.
- «Stasjon» = spor gjennom eller innen 1 km fra tettstedet (ikke en ekte stasjonsliste). Toget trenger ikke at leiren ligger ved banen.
- Jaktlagene får alltid kjøttet hjem uten transport. Isen gjør ingenting med båter/ferjer.
- Flom fra regn bruker enkle sirkler, ikke flomfeltet fra flom.js (det følger en dal fra en dam).
- Fiendens lag fryser ikke (bare egne), men får samme føre.

## Runde 2 (samme natt)
- **Prøvd nå** (/rogaland, ekte vegnett): en kolonne på vei fikk et ras midt på ruta – lenken ble sperret, kolonnen la om («kjører om raset»,
  28 min ble til 69 min) og unngikk den sperrede lenken. Lyn og skuddveksling som brannstarter er prøvd med tvunget sjanse (begge tente).
  FEIL FUNNET OG RETTET: lynet kunne aldri tenne (brannfaren er 0 mens det regner). Nå avgjør tørken, og lynet slår ned når det er
  torden eller tunge skyer («tørrlyn»).
- **Stasjoner fra kartet:** `sjekkSpor(by)` leser jernbanen i utveg-flisene (laget «bane», z9): tettstedet er stasjonsby når sporet går gjennom
  omrisset eller innen 1 km (`REGLER.tog.nærSpor`) fra navnepunktet. Tettsteder innen 150 km fra leiren (høyst 80) spørres når panelet
  åpnes. Navnelista `Verden.STASJONER` brukes bare når kartet ikke har svart (ingen fliser der / jernbanedata mangler, som på testserveren).
  På /rogaland ga det: Stavanger/Sandnes, Kvernaland, Bryne, Nærbø, Varhaug, Hæen, Vigrestad, Brusand, Ogna, Moi, Sirevåg, Hellvik, Egersund.
  `Verden.togPlan` tar `stasjon: true/false/null` per ende.
- **Åkeren synes og krever folk:** første rydding finner et sted 220–460 m fra leiren (helst dyrket mark, ikke vann/tettbebyggelse/bratt) og
  lagrer det (`V.åker.x/y`). 2D: en firkant på 1000 m² per mål – brun (pløyd), grønn (gror), gul (modent) – med navn. Folk: én person på «fri»
  per 40 mål (`REGLER.åker.målPerPerson`, lest med `Folk.arbeidere('fri')`; spill/folk.js er ikke endret). Færre folk = kornet gror
  tilsvarende saktere; panelet sier hvor mange som trengs. Åkeren er fortsatt ikke et bygg (kan ikke rives eller brenne) og har ingen 3D-modell.
- **3D** (i verden-visning.js, KROKER.ramme3d/sett3d, ingen nye lys): flammer (Points, additive, stiger og blaffer), glød på bakken og røyk
  som driver med vinden i rutene som brenner; steinur (instansnett, 46 steiner) der raset gikk; en blå vannflate ved flom; vrak, kasser,
  telt og fly av enkle kasser (ett instansnett) for funn som er sett. Bygges på nytt når noe endres (sjekkes to ganger i sekundet).
  Sett på bilde ved Dombås: brann, røyk og steinur. Vannflaten er flat og skjærer terrenget i skrå lier. Brent bakke: `window.BRENT` til «natur».
- **Balanse** (/rogaland, auto på, hvert spillminutt simulert): 4 døgn sommer + 3 døgn høst + 4 døgn vinter, og 9 døgn sommer.
  Første kjøring: flom/ras hver 2.–8. time hele høsten (loggen full), og flom midt på vinteren. Rettet: sjanse 12 % → 4 % per time, høyst én
  flom og ett ras om gangen, regnsummen synker etter en hendelse, og snø teller ikke som regn. Etterpå: 2 flommer og 1 ras på 9 sommerdøgn,
  1 flom på de 11 blandede. Tørken kom aldri høyt nok til brannfare (regn nullet den seks ganger så fort som den bygget seg opp): nå to
  ganger så fort, og full brannfare etter 2 tørre døgn – i sommerkjøringen lå tørken da på 0,5–2,1 (brannfare av og på). Ingen brann av seg
  selv på 9 døgn (lyn 1,5 % per time når det er tørt og overskyet) – brann er altså mest noe spilleren og kampene starter.
  Vinter: isen bar etter ca. 2 døgn; lagene ved leiren (360–410 m unna) fryser ikke (læ 500 m). Lag som sendes ut, får varsel etter ca. 7 timer
  og første frostskade etter 12 (prøvd på Dovre-siden).

## Runde 4 (18. nov dag)
Pakka «verden» tok også det som sto igjen fra pakka «natur» (effekter3d.js, dyr3d.js). Alle nye tall er **Claudes forslag** og står i
`Verden.REGLER` (snø.brøyt/sjekk, is.båt/sjø, regnflom, åkerBygg, funn.flytt, jakt.huskFelt) og `Effekter.REGLER` (sporTid, lagreSpor,
lagreKratere, mineKrater, salve, lyng).

### 1. Vinter
- **Snø stenger høye veglenker** (`Verden.snøVegGrense(vær, timerSiden)`, `lenkeStengt`): mens det snør, og `snø.brøyt` = 6 timer etter, er
  veglenker over `max(snø.vegFjell = 900, snøgrensen)` moh. stengt. Høyden regnes bare når den trengs: `Kjoretoy.planlegg` er pakket inn i
  verden-visning.js (kjoretoy.js er ikke endret) med `tillat`, som avviser lenker vi alt kjenner høyden på (start, midt, slutt – bare kart som
  er hentet; ingenting hentes under rutesøket). Hvert 10. spillminutt (`snø.sjekk`) sjekkes lenkene foran kolonnene som kjører (alle sider;
  her hentes høydene), høye lenker sperres i vegnettet (`Vegnett.sperr`), og kolonnen kjører om («… kjører om: vegen over 900 moh. er stengt
  av snø») eller blir stående («… det finnes ingen omkjøring. Kolonnen venter til vegen er brøytet.»). Når snøværet er over og vegen brøytet,
  åpnes lenkene (ikke de som er sperret av flom, ras eller sprengt infrastruktur). Bare når ting får skje av seg selv (`!navigator.webdriver ||
  VerdenSpill.test`). API: `VerdenSpill.snøVegSteg(v)`, `snøRuter()`, `snøLenker()`, `snøGrense()`, `snøTilbake()`, `lenkeHøyder(g, e, hent)`.
- **Fiendens lag fryser også**: samme kulderegler, «ute» = ikke i et tettsted og ikke om bord (de har ingen leir). Nøkkel `side:navn` i
  `V.kulde`. Meldingen kommer bare når du ser laget.
- Prøvd (/rogaland, ekte vegnett, `vegFjell` satt ned til 250 m for prøven): 3 høye lenker funnet på ruta til lastebilkolonnen, den ble stående
  med melding (ingen omkjøring under 250 m), ny rute med snøen på brukte ingen kjente høye lenker, alt åpnet igjen etter brøytingen.
  Et rødt lag 4 km ute fikk frostskade etter 24 timer i −25 °C.

### 2. Kratere (effekter3d.js)
- **Miner mot fotfolk og rakettsalver** lager kratere: modulene sier ikke fra selv, så `window.SALVER` og `window.MINEFELT` følges i
  KROKER.sim – en salve som er borte fra lista, har slått ned (6 kratere spredt innen 45 % av salvens radius, `Effekter.salveKratere`, fast per
  salve); et minefelt som har mistet ladninger med et lag til fots innen radien, gir et krater ved laget (kjøretøy får sitt fra skadKjoretoy
  som før). feltarbeid-visning.js og enheter-visning.js er IKKE endret.
- **Lagring per leir** i `riksbrudd-effekter` ({ leir, kratere, spor }, høyst 80 kratere og 900 hjulspor; `Effekter.tilLagring/fraLagring`).
  Hjulsporene ligger nå 10 minutter (ekte tid) og tones bort de siste 2 (før 100 s) – ellers var det ingenting å lagre. Lagres hvert 5. s når
  noe er endret og ved pagehide; leses ved «riksbrudd-spill».
- Prøvd (Dovre): salve → 6 kratere, mine mot et lag → 1 krater, ny innlasting → 7 kratere tilbake. Kraterne sett i 3D ved leiren.

### 3. Felte dyr (dyr3d.js, liten endring)
- `plasser()` gir hvert dyr en nøkkel (art + første plass i kartet, rundet til meter – fast for flokken) og hopper over felte dyr
  (`FELTE`); `fell()` legger nøkkelen inn og gir den tilbake. `Dyr3d.settFelte(liste)`, `Dyr3d.felte()`.
- verden-visning.js lagrer nøklene i `V.jakt.felt` (riksbrudd-natur, per leir, høyst `jakt.huskFelt` = 600) og gir dem til Dyr3d ved start.
- Test: test_dyr.js («samme flokk gir samme dyr»). IKKE prøvd i nettleser (bygg3d ved heia hang to ganger under høy last på maskinen).

### 4. Åkeren som bygg
- `Leir.BYGG.åker` legges inn fra verden-visning.js (som overlev.js gjør med brønnen): 5 mål, 50 × 100 m, 250 000 kr (samme pris per mål som
  ryddingen før), 4 spilltimer for et byggelag, ingen materialer, ikon «blad» (Ikoner.BYGG.åker). Står under «Annet» i byggelista;
  «Anlegg en åker» i panelet starter plasseringen. leir.js, leir-visning.js og ikoner.js er IKKE endret.
- Målene: `V.åker.mål = ryddet (det gamle, uten bygg) + Σ 5 mål × hp` for ferdige stykker (`Verden.åkerMål`). Det som sås, er stykkene som
  var ferdige da (`V.åker.sådde`), så et stykke som blir ferdig etter såinga, sås neste vår.
- 2D (verden-visning.js, oppå leirens rektangel): jord/grønt/gult etter veksten, furer langs den lange siden, svidd farge når hp < 1, hvitt om
  vinteren, navn. 3D: ett nett per stykke (jord i ruter på 5 m som følger terrenget, og kornrader hver 1,25 m som to skrå flater – lave furer
  når det er bart, opptil 0,9 m korn når det er modent, `Verden.korn`). Ingen modell i leir-visning.js (den setter bygg flatt på det
  høyeste punktet med grunnmur).
- Brann: brennbarheten i åkeren er 0,9 (modent korn), 0,35 (grønt) og 0,15 (bart) (`Verden.åkerBrennbar`); en rute som brenner i stykket
  (midten eller et hjørne) tar 25 % av stykkets hp per 30 min; et nedbrent stykke forsvinner (Leir.skad), og avlinga der er tapt.
- Prøvd (Dovre): plassert 260 m vest for leiren, 5 mål, brennbar 0,9, tent på i åkeren → 75 % og 50 % igjen etter to halvtimer, 2D og 3D
  sett på bilde.
- Svakhet: Leir.kanBygge vet ikke om veger og bekker, så en åker kan legges over en veg.

### 5. Funn
- Et funn i tettbebyggelse (klasse 7), vann eller utenfor kartet flyttes til nærmeste åpne sted (`Verden.funnKandidater`: ringer hver
  40 m ut til 800 m, `åpentFunnSted`). Stedet finnes én gang per funn (ikke lagret: terrenget er fast) før funnet kan oppdages
  (`VerdenSpill.plasserFunn`, `funnI`, `funnNær`). Før ble funn i vann tatt bort; nå flyttes de til land.
- 3D: kasser, tønner, sekker og telt (fire instansnett, hjørnefarger per del, hver del på bakken der den står): vrak (bil med hjul og en
  tønne), depot (kasser, tønner, sekker under en presenning), forlatt leir (to telt, bålplass, sekker), fly (skrog, vinger, hale, kasser).
- Prøvd: 3D-bildet av funnet ble ikke tatt (utsnittet ble bygget på nytt da kameraet ble flyttet 5 km), men nettene ble laget (vrak).

### 6. Regnflom og is
- **Regnflom i flomfeltet**: flom.js tar nå valg (`o`: lengde, dybde, bredde, start) i `flomvei`/`flomfelt` og gir også `flate` (vannflaten
  per celle) – uten valg som før (test_flom.js). En flom etter regn får `s.kilde` = punktet på elva, og feltet regnes med
  `Verden.REGLER.regnflom` (3 km nedover dalen, 2,5–1 m over dalbunnen, 250 m til siden). Feltet holdes i minnet (ikke lagret) og regnes på
  nytt etter innlasting. Marsjfarten, rammede lag og vegene som stenges, følger feltet (`VerdenSpill.iSoneV`, `window.VERDEN_I_SONE(x, y, type)`);
  vegene stenges langs feltet (nærmeste node for annenhver celle). 2D: mykt blått bilde som dam-flommen; 3D: et rutenett med kanten under
  bakken (vannkanten skjærer terrenget), 0,3–1,2 m over bakken. Gamle lagrede flommer uten kilde er sirkler som før.
  Prøvd (Dovre, Jora): 564 celler (0,58 km²) som følger dalen ca. 2,5 km, 2D og 3D på bilde.
- **Isen**: `Verden.islagt(x, y)` (window.Verden) – true når punktet er en innsjø (vann over 1 moh., ikke sjøen) og kulda har gitt
  `is.båt` = 10 døgngrader (før isen bærer, 25). Svarer false til kartet der er hentet. **Pakka «sjo» kan bruke den** for båter (sjo-filene er
  IKKE endret). Panelet sier «Innsjøene er islagt: båtene kommer ikke fram der». Regelen: `Verden.islagtVann(V, moh, klasse)`.

### 7. Brente hus og lyng
- Lyngen ovenfra: materialet til gresset (index.html gressMateriale) pakkes inn fra effekter3d.js (`lyngLys`, ingen endring i index.html):
  lyngtustene (aFelt = 1) lysnes opptil 1,6 × jo mer rett ovenfra du ser (`Effekter.REGLER.lyng`).
