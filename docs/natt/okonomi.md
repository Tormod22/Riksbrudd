# Pakke «økonomi» – natt til 18. nov

Gjennomgangen sa: spilleren kan kjøpe seg ut av alt, 100 mill. kr er for mye, og tettstedene gir lite.
Alle tall er **Claudes forslag** og står samlet i `Region.REGLER`, `Region.TYPER`, `Region.SKATT`, `Region.Bors.VARER` og `Marked.LAGER`.

## Filer
- `site/dovre-fliser/spill/region.js` – NY, regler uten DOM (`Region`). Test: `node pipeline/fliser/test_region.js` (28 prøver).
- `site/dovre-fliser/spill/region-visning.js` – NY, `window.RegionSpill` (panelet #region, takten, kartet, svartebørs, veksling).
- `spill/spillet.js` – `Marked.LAGER/hyller/fyll/kan/ta/tomt/kjøpspris/PÅSLAG` (markedets hyller). `test_spillet.js` har seks nye prøver.
- `spill/spillet-visning.js` – kjøpene går gjennom hyllene, høyere kjøpspris, `SpilletSpill.knapt()/hyller()/varsel`.
- `spill/garnison-visning.js` – `window.GarnisonSpill = { strømFor, kraft, byFor, byer }`.
- `spill/oppstart.js` – STARTPENGER (se «Fellesfiler»).
- `pipeline/fliser/vakter/okonomi.js` – vakten «økonomi og region». `docs/natt/okonomi-hjelp.json` – ni hjelpetekster.

## Hva som er laget
**«Døgn» = handelsdøgn:** et spilldøgn eller ti minutter ekte spilling (som markedet), det som kommer først. Varene leveres en gang i «timen»
(1/24 døgn), og loggen sier hver morgen hva regionen ga.

7. **Hvert tettsted gir noe eget.** Typen bestemmes av første regel som slår til (`Region.type`):
   oljeanlegg på land innen 8 km = *oljeby* (diesel) · kraftverk innen 6 km og 1000–4999 innbyggere = *industristed* (stål, betong) ·
   minst 5000 innbyggere = *by* (rekrutter, stål) · ferjekai eller havn/ferjeterminal (kaier.js type ≥ 3) innen 1,5 km = *havn* (mat, diesel) ·
   ellers *bygd* (mat, tre). (Runde 2: de første grensene ga 434 havner og 119 oljebyer av 990 tettsteder på /rogaland – strammet inn.) Mengden følger folketallet (per 1000 innbyggere, med minst og høyst). Alle betaler skatt: 300 kr per innbygger per døgn
   (høyst 4 mill.). Vises i Region-panelet, i tettstedspanelet (trykk på tettstedet) og som tekst under tettstedene i kartet når Region eller
   krigskartet er åpent. Den gamle oljen til basen (garnison.js) er som før.
8. **Handelsruter.** `Region.rute`: rett linje fra tettstedet til leiren, via nærmeste tettsted du holder som ligger nærmere leiren (høyst 30 km
   per hopp). Fiende innen 4 km av et ledd = truet (halvparten kommer fram), innen 1,5 km = stengt (ingenting). Et eget lag innen 1,5 km av
   leddet vokter det (ett hakk tryggere). Ingen egne kjøretøy. Tegnes i 2D (grønn/gul/rød stiplet) når Region/krigskartet er åpent eller
   kartet er zoomet ut (kam.m ≥ 18). Loggen melder når en rute skifter.
9. **Skatt og lojalitet** per tettsted (og «Alle: …»): Støtte (ingen varer, koster 50 kr per innbygger per døgn, mål 100), Lett (×0,6, mål 80),
   Vanlig (×1, mål 55), Hard (×1,7, mål 0 – med garnison 10 = uro). Lojaliteten (0–100, start 50) går mot målet; garnison +10, uten strøm −15. Varene ganges med
   0,6–1,4 etter lojaliteten. Lojalitet ≤ 10: uten garnison OPPRØR (tettstedet blir nøytralt), med garnison «uro» (gir halvparten).
10. **Strøm.** Samme regel som før (helt kraftverk innen 40 km): uten strøm gir tettstedet 40 % og lojaliteten synker. Kraftverkpanelet sier
    hvilke av DINE tettsteder som får strøm derfra, og loggen melder når et tettsted mister eller får strøm.
11. **Svartebørs.** Hvert døgn 40 % sjanse for en selger med to ting (borte neste døgn): medisiner 2,5 mill. (seks sårede soldater kampklare,
    syke i leiren friske; lagres hvis ingen trenger dem), nattsikt 6 mill. (lagene ser ×1,4 kl. 22–05, KROKER.sikt), tunge våpen 5 mill.
    (treff +15 %, to ganger, KROKER.ild), smuglerdiesel 5 mill. (800 l).
12. **Gjenoppbygging.** Når et eget lag har reparert en bru eller et kraftverk (KROKER.ødelagt, hva = 'reparer', eget lag innen 1,2 km):
    +20 lojalitet i dine tettsteder innen 15 km, og nærmeste nøytrale tettsted innen 10 km uten fiender i blir ditt (lojalitet 60).

**Forbedringer**
- **Penger knappe:** nye spill starter med **40 mill. kr** (ikke 15: kontrollrom 15 + aggregat 8 + brakke 4 + dieseltank 3 = 30 mill. må gå).
  Lagrede spill beholder pengene sine. I testene (Node og navigator.webdriver) er beløpet 100 mill. som før.
- **Tomme hyller:** `Marked.LAGER` – tre 60 m³ (+15 per døgn), betong 40 (+10), stål 20 t (+5), diesel 2500 l (+600), mat 300 rasjoner (+80).
  `Leir.kjøpMateriale`, `Leir.kjøpDrivstoff` og `FolkRegler.kjøpMat` er pakket inn i spillet-visning.js (alle som kjøper, bruker dem). Lagres i
  «riksbrudd-marked» (gamle markeder får fulle hyller). «Markedet i dag» viser hva som står på hylla.
- **Hogst og riving billigere enn kjøp:** de koster fortsatt bare arbeid. Kjøpsprisen på tre, betong og stål er nå 1,5 × markedsprisen
  (`Marked.PÅSLAG`), og salg gir 0,53 av kjøpsprisen (samme kroner som før: 80 % av markedsprisen).
- **Diesel og olje:** IKKE slått sammen (for risikabelt i natt – oljen brukes av baser, kjøretøy, forsyning og tester). De kan VEKSLES i
  Region-panelet: 10 t olje → 100 l diesel, og 150 l diesel → 10 t olje (`Region.Veksle`), med forklaringen samme sted.
- **Region-panelet** (#region): kommandolinja nederst på PC («Region», via KOMMANDO_TILLEGG) og «Åpne Region» i Leir-menyen, fanen Lager
  (telefon). Tettstedene dine med type, hva de gir nå, lojalitet, rute/strøm/garnison, skatteknapper og «Vis i kartet»; «Verdt å ta» (de fire
  nærmeste du ikke holder og hva de ville gitt); svartebørsen; olje og diesel; markedets hyller.

## I testene
Med `navigator.webdriver` skjer ingenting av seg selv: ingen leveranser, lojalitet, opprør, svartebørs, gjenoppbygging, tomme hyller eller
påslag. `RegionSpill.test = true` slår på regionen, `SpilletSpill.knapphet = true` (+ `settPriser()`) slår på hyllene og påslaget.
Panelet, skatteknappene, vekslingen og kjøp på svartebørsen virker alltid.

## API
`RegionSpill`: `åpne/lukk/erÅpen/vis`, `tilstand()` (byer: id → { loj, skatt, uro }, pott, har, børs, medisin), `status()` (Map id → { by, b, type,
strøm, garnison, rute }), `sum()`, `steg(døgn)`, `lever()`, `nyttDøgn()`, `settSkatt(id, skatt)`, `settAlle`, `kjøp(id)`, `børsNå([id])`,
`brukMedisin()`, `veksle('diesel'|'olje', tonn)`, `gjenoppbygg(x, y)`, `typeAv(by)`, `omgivelser(by)`, `sett(json)`, `test`.
Lagring: «riksbrudd-region» per leir.

## Ikke gjort / kjente svakheter
- Krigskartets eget panel (strategi-visning.js, ikke min fil) viser ikke hva det valgte tettstedet gir – bare teksten i kartet gjør det.
- `spill/hjelp.js` og startskjermen/CLAUDE.md sier fortsatt «100 millioner» noen steder (hjelp.js er en fellesfil; startskjermen leser O.STARTPENGER
  og viser riktig). Tasten Y (100 mill. for testing) finnes fortsatt.
- Motstanderne (AI) får ingenting av tettstedene sine og bryr seg ikke om rutene dine med vilje.
- Typen bruker bare det infrastrukturdataene har (kraftverk, oljeanlegg, kaier, folketall) – ikke landbruk/industri fra byggdataene.
- Rutene er rette linjer (ikke vegnettet), og sprengte bruer stenger dem ikke.
- Lojaliteten i et tettsted du mister og tar igjen, huskes fra sist.
- Balansen er ikke spilt gjennom over tid (bare regnet på): Dombås (1145 innb., industristed) gir ca. 344 000 kr, 2,3 m³ betong og 1,7 t stål
  per døgn ved vanlig skatt.
- Bare prøvd på Dovre-testsiden (ett tettsted). Ruter via flere tettsteder er bare prøvd i regeltesten.

## Runde 2 (samme natt)
- **Motstanderne har nytte av tettstedene sine** (`Region.fordel(typer)`, tallene i `Region.FORDEL`): hvert industristed, hver by og oljeby
  gir treff +5 % (høyst +20 %), hver bygd og havn gjør at garnisonene forsterkes 25 % raskere (høyst dobbelt så fort). Ikke i testene.
  **KROKEN for pakka «krig»:** `RegionSpill.fordel(side)` → `{ treff, forsterk, antall, typer }` (1 = ingen fordel; 'blå' og testene gir alltid 1;
  regnes høyst hvert tredje sekund). Den brukes i dag to steder: `KROKER.ild` i region-visning.js (treff) og forsterkningen av garnisoner i
  garnison-visning.js. AI-en kan f.eks. dele ventetiden på nye lag (`R.forsterkning.hver`) på `fordel(side).forsterk`. fraksjoner*.js er ikke endret.
  Region-panelet har en del «Motstanderne» som sier hva de får.
- **Krigskartets panel** får en linje om type og ytelse på det valgte tettstedet og i «Neste trekk» (`RegionSpill.pyntKrig`, en
  MutationObserver på #krig som bare ser på panelets egne barn). strategi-visning.js er ikke endret.
- Rettet: kjøp av nattsikt ga en sidefeil (oppdaterSikt uten lag) – nå merkes lagene for ny sikt. Hard skatt med garnison endte aldri i uro
  (målet 15 lå over grensa 10) – målet er nå 0. Tekstene i kartet vises bare for større tettsteder når kartet er zoomet langt ut.
- Prøvd på /rogaland med ekte data (sju tettsteder): ruter via andre tettsteder (Etne → Sandeid → Vikedal → Sand → leiren), «Alle: hard»,
  leveranse av mat, diesel, betong, stål, penger og en rekrutt, medisiner, smuglerdiesel, nattsikt (×1,4 kl. 00, ×1 kl. 12), veksling begge
  veger med tank, uro med garnison, og en ekte reparasjon av et kraftverk (Lundsæter) som fikk Leirvik over på spillerens side.
- Sju tettsteder i Ryfylke ga ca. 2,6 mill. kr per døgn (ti minutter). Det er trolig for rundhåndet over tid – skatten (300 kr per innbygger)
  er det første tallet å skru ned hvis pengene blir for lette.

## Runde 3
- **Skatten er satt ned:** `Region.REGLER.skattKr` 300 → **100 kr per innbygger per døgn** (tak 1,5 mill. per tettsted; støtte koster 50 kr).
  Begrunnelse: med 300 kr ga sju tettsteder i Ryfylke 2,6 mill. kr per ti minutter mot 40 mill. i startkasse – pengene ble uviktige igjen.
  Med 100 kr gir de samme sju ca. 0,9 mill. per ti minutter (et kontrollrom til 15 mill. = rundt tre timer), og ett tettsted som Dombås
  ca. 115 000 kr. Skatten ganges med vanskelighetsgraden (`window.SPILLREGLER.faktor.penger`: lett 1,5, vanlig 1, hard 0,6; holdt innen 0,4–1,5)
  i region-visning.js (`pf()`); varene er like på alle nivåer. Tallene over ellers i notatet (344 000 kr for Dombås osv.) er fra før endringen.
- **Vakten er robust:** eget prøvetettsted («Prøveby», id «øk1», 3 km øst for leiren) som legges inn og tas bort, alle fiendelag flyttes
  600 km bort mens den prøver og settes tilbake, og mangler infrastrukturen (INFRA = null), lages en tom mens vakten går.
  Prøvd etter alle de andre vaktene i samme side (alfabetisk) på PC og mobil, og uten infrastruktur.

## Runde 4
- Vakten målte «hard skatt gir mer» på summen av ALLE tettstedene spilleren holdt. Når en tidligere vakt hadde latt Dombås være blått,
  druknet prøvebyens forskjell (120 000 → 204 000 kr) i summen (235 000 → 319 000, under kravet ×1,5). Regelen var riktig; vakten måler nå
  prøvebyen alene (`RegionSpill.girFor(id)`, ny). «Gir»-teksten i vakten gjelder også bare prøvebyen.

## Runde 4 (18. nov dag) – tatt over av pakka «sjø»
Detaljer, filer og prøving står i `docs/natt/sjo.md` (Runde 4, punkt 1–3). Kort:
- **Krigskartets panel** viser nå hva det valgte tettstedet gir per døgn (skatt, varer, olje til basen, strøm, lojalitet, rute) og hva det gir
  hvis du tar det – via den nye kroken `window.KRIG_TILLEGG` i `strategi-visning.js` (by/trekk/side). MutationObserveren `pyntKrig` er borte.
- **Handelsrutene følger vegnettet** (`Region.rute(…, veger)`, `Region.tilSti`) når `window.VEGNETT` er lastet; ellers luftlinje som før.
  Vegnettet hentes på PC når Region eller krigskartet er åpent (ikke i testene). En sprengt bru/tunnel på vegen (`graf._sperretAv`) stenger
  ruta til den er reparert – den tar ikke omveg, og vakter hjelper ikke.
- **Lojaliteten** i et tettsted du mister og tar igjen, blir høyst `Region.REGLER.lojGjentatt` = 35 (Claudes forslag), skatten vanlig.
- **Motstanderne** får faktisk noe av tettstedene sine (sjekket: treff, forsterkning av garnisoner, AI-forsterkninger oftere, flere lag via
  `Fraksjoner.lagTak`), og det vises i krigskartet. De har ingen kasse, så penger får de ikke.
- Fortsatt ikke gjort: rutene bruker vegene, men ikke ferjene som eget ledd (vegnettets ferjelenker brukes slik vegnettet gir dem), og
  vegkrater fra «Spreng vegen her» ER med (se sjo.md, del 2).
