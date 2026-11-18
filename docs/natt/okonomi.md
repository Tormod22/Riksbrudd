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
   oljeanlegg på land innen 25 km = *oljeby* (diesel) · kai innen 2,5 km (ferjekai, eller havn/kai ≥ 60 m fra kaier.js) = *havn* (mat, diesel) ·
   kraftverk innen 10 km og minst 800 innbyggere = *industristed* (stål, betong) · minst 5000 innbyggere = *by* (rekrutter, stål) ·
   ellers *bygd* (mat, tre). Mengden følger folketallet (per 1000 innbyggere, med minst og høyst). Alle betaler skatt: 300 kr per innbygger per døgn
   (høyst 4 mill.). Vises i Region-panelet, i tettstedspanelet (trykk på tettstedet) og som tekst under tettstedene i kartet når Region eller
   krigskartet er åpent. Den gamle oljen til basen (garnison.js) er som før.
8. **Handelsruter.** `Region.rute`: rett linje fra tettstedet til leiren, via nærmeste tettsted du holder som ligger nærmere leiren (høyst 30 km
   per hopp). Fiende innen 4 km av et ledd = truet (halvparten kommer fram), innen 1,5 km = stengt (ingenting). Et eget lag innen 1,5 km av
   leddet vokter det (ett hakk tryggere). Ingen egne kjøretøy. Tegnes i 2D (grønn/gul/rød stiplet) når Region/krigskartet er åpent eller
   kartet er zoomet ut (kam.m ≥ 18). Loggen melder når en rute skifter.
9. **Skatt og lojalitet** per tettsted (og «Alle: …»): Støtte (ingen varer, koster 150 kr per innbygger per døgn, mål 100), Lett (×0,6, mål 80),
   Vanlig (×1, mål 55), Hard (×1,7, mål 5). Lojaliteten (0–100, start 50) går mot målet; garnison +10, uten strøm −15. Varene ganges med
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
