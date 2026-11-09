# Plan: funksjoner i spillet, og hvordan to chatter jobber samtidig

Skrevet 8. nov 2026 etter ønske fra brukeren. To Claude-chatter skal jobbe parallelt:
- **Kart-chatten** (den som laget kartet): kartet, flisene, omlandet, infrastrukturlaget, 3D.
- **Spill-chatten** (ny): spillreglene og funksjonene under (S1–S10).

Les først `CLAUDE.md`, `HANDOFF.md` (avsnitt 0), `docs/plan-spillmekanikk.md` (hva spillet skal bli, inspirert av WarFront)
og denne fila. Snakk norsk med brukeren, enkelt – brukeren er ikke utvikler.

## 1. Hvem eier hva (så vi ikke skriver over hverandre)

| Område | Eier | Filer |
|---|---|---|
| Kartfliser, farger, hav, omland, sammensetting av flisene | kart | `komponer`, `tegn`, `vekt`, `fyllHoyde`, `husomriss`, `traer`, `koter` i `site/dovre-fliser/index.html`; `pipeline/fliser/*` unntatt nye spillfiler |
| Infrastrukturlaget (tegning, trykk, data) | kart | `tegnInfra`, `finnInfra`, `visInfo`, `pipeline/fliser/infra.py` |
| 3D | kart | `bygg3d`, `tegn3d`, `hus3d` … |
| Spillmoduler | **spill** | nye filer i `site/dovre-fliser/spill/` (registreres i `spill/spill.js`), nye regelfiler uten DOM, nye tester |
| Terrengreglene (fart, marsj, sikt, ildkamp) | **spill** | `site/dovre-fliser/terreng.js` + `pipeline/fliser/test_terreng.js` (kjør `python3 pipeline/fliser/versjon.py` etter endring) |
| Lagene, panelet, loggen, tid | **spill** | `ENHETER`, `sim`, `kamprunde`, `ordre`, `visPanel`, `tegnLag` i index.html – endre minst mulig, bygg heller ut i spill/ |
| Nye data for spillet (vegnett-graf osv.) | **spill** | nye skript `pipeline/fliser/vegnett.py` osv. + egne workflows/releaser (`kart-vegnett-<hash>`) |

**Krokene** (lagt inn 8. nov) gjør at spillkoden kan ligge i egne filer:
```js
KROKER.tegn.push((ctx, vx0, vy1) => { ... })     // 2D-tegning over kart og infrastruktur, under lagene
KROKER.sim.push(dt => { ... })                   // hvert simuleringssteg (dt i spillminutter; 1× = sanntid)
KROKER.trykk.push((X, Y, cx, cy) => true/false)  // trykk på kartet; true = håndtert
```
Nye skript lastes etter hovedskriptet: legg en linje `<script src="/dovre-fliser/spill/NAVN.js?v=0"></script>` nederst i
index.html og kjør `python3 pipeline/fliser/versjon.py` (setter versjonsmerket). Trenger dere en ny krok, legg den til med én linje.
Data spillet trenger fra kartet: `INFRA` (bruer, tunneler, ferjer, kraft, olje, tettsteder med kildens id), `lagVindu(...)`
(høyde, arealtype og veger i 32 m-ruter), `hentFlis('vektor', z, x, y)` (veger), `Terreng.*`.

**Git:** hver chat på sin egen gren. Før sammenslåing: `git fetch origin main && git rebase origin/main`, kjør alle
testene (under), og fast-forward `main` (`git merge-base --is-ancestor origin/main HEAD`). `main` går rett ut på
https://riksbrudd.vercel.app. Små, hyppige sammenslåinger gir færre konflikter enn store.

**Tester før publisering (alle, fra repo-roten):**
`node pipeline/norge/stubtest.js && node pipeline/dovre/stub.js && node pipeline/dovre/stub2.js && node pipeline/fliser/test_terreng.js && node pipeline/fliser/sjekk.js`
Nye regler testes i Node (som `test_terreng.js`); nye ting på skjermen får en sjekk i `sjekk.js` (PC, mobil, eldre iPhone).

**Faste regler:** ekte og åpne data (krediteres i `#kilde`); fraksjonene er oppdiktede; stil 1 (mørkt, papirkart, 80-talls
operasjonsrom, skriftene IM Fell English og Cormorant Garamond); ingen skript fra CDN (bibliotekene ligger i `lib/`); må virke på
iPhone (Safari) og eldre iPhone; inspirert av WarFront, aldri kopi (ikke navn, grafikk, lyd eller tekst). Kampreglene er Claudes
forslag – spør brukeren før de endres mye. Brukeren vil ikke gi API-nøkler.

## 2. Funksjonene, i rekkefølge (spill-chatten)

Hver funksjon skal være spillbar og testet før neste starter. «Ferdig når» er kravet.

### S1 Vegnettet som graf (fase B) – grunnlaget for alt med kjøretøy
- `pipeline/fliser/vegnett.py`: NVDB vegnett 1. juni 2023 for hele Norge -> noder og lenker (lengde, vegkategori, fartsgrense
  hvis tilgjengelig), ferjesamband som lenker med ventetid, og hvilke lenker som går over en bru/gjennom en tunnel (id fra INFRA).
  Kompakt binærfil (typet tabell), release `kart-vegnett-<hash>` via egen workflow. Mål: under ca. 30 MB, helst delt i
  fylkesbiter som hentes ved behov.
- `spill/vegnett.js` (uten DOM): last inn, A* mellom to punkter, `sperr(lenke)`/`åpne(lenke)`.
- Ferdig når: test i Node finner ruten Oslo–Trondheim langs E6 på under 1 s, og når en bru sperres, finnes omkjøringen (eller «ingen vei»).
- **FERDIG 8. nov** (spill-chatten skrev koden, kart-chatten la den inn og gjorde den nasjonale byggingen):
  release `kart-vegnett-5b8cd00e2e8e`, format RBVEG002 (kolonner; RBVEG001 ble 66,5 MB og var over budsjettet),
  2 030 080 lenker, 1 915 412 noder, 25,1 MB gzip / 43,4 MB rå. Oslo–Trondheim 514 km (< 50 ms), Kristiansand–Kirkenes
  2 687 km (~0,5 s), innlesing ~0,5 s i Node. 99,2 % av nodene i én sammenhengende del. Anleggsveger (E6 Sørkjosen,
  E39 Heim) tas med bare der NVDBs historikk ellers bryter vegnettet. Se `site/dovre-fliser/spill/VEGNETT.md`.
  Til S2: `/api/kart` slipper i dag bare `.pmtiles`/`.json` og maks 4 MB per bit – `vegnett.bin` må enten tillates der
  og hentes i biter, eller deles opp.

### S2 Kjøretøy på vegene
- Typer: lastebil, speiderbil (senere stridsvogn). Fart etter vegkategori og terreng, kolonner, synlige på kartet med retning
  (symbol når man zoomer ut), trykk gir panel. Tegnes med `KROKER.tegn`, beveges med `KROKER.sim`.
- Ferdig når: en lastebil kan sendes fra Dombås til Otta og kjører langs E6 i riktig tempo, også med ferje (prøv Molde–Vestnes).
- **FERDIG 9. nov:** `spill/kjoretoy.js` (regler uten DOM: typer, fart = min(toppfart, fartsgrense), ferje 25 km/t + 15 min
  venting fra land, kolonne med avstand, stopp, status) og `spill/kjoretoy-visning.js` (KROKER: tegn, sim, trykk, tegn3d; panel
  med «Kjør til …»/«Stopp»). Lastebiler foretrekker hovedveg (`kategoriFaktor` i rutesøket). Vegnettet lastes først ved første
  ordre (25 MB gzip i biter à 4 MB via /api/kart, pakkes ut med DecompressionStream; ellers rå 43 MB).
  Dombås–Otta 46,6 km, 99 % på E6, 37 min; Molde–Vestnes 16,3 km med ferje, 47 min. Test: `node pipeline/fliser/test_kjoretoy.js
  [vegnett.bin]` og sjekk.js («kjøretøy»). Ikke gjort: terrengets innvirkning på fart (stigning), kjøring utenfor veg,
  fiendtlige kjøretøy, flere kolonner kan lages i spillet, kjøretøy kan ikke trykkes på i 3D (bare vises).

### S3 Olje-økonomi (fase C)
- Olje er eneste penger. Kilder: terminalene og raffineriene i `INFRA.olje` (type 3: Mongstad, Kårstø, Sture, Kollsnes …),
  felt via rør. Lagre/baser; lastebiler henter og leverer (S2); oljen brukes til å bygge enheter.
- Panel med beholdning og flyt. Ferdig når: en runde der oljen må kjøres fra en terminal til en base før en enhet kan bygges.
- **FERDIG 9. nov (natt):** `spill/okonomi.js` (regler uten DOM) + `spill/okonomi-visning.js`. Åtte norske terminaler
  (Kårstø, Sture, Mongstad, Kollsnes, Tjeldbergodden, Slagentangen, Melkøya, Nyhamna) produserer 150 t/t (lager 3000 t).
  Lastebil 25 t; lasting og lossing 30 min; «Hent olje …» gir skytteltrafikk terminal–base. Hovedbase Dombås starter tom;
  pris/byggetid: lastebil 40 t/2 t, speiderbil 30 t/1,5 t, infanterilag 20 t/1 t. Teller «t olje» øverst. Dombås–Nyhamna:
  første last etter ca. 8 spilltimer. Tester: `node pipeline/fliser/test_okonomi.js [vegnett.bin]` og sjekk.js («oljeøkonomi»).
  Tallene er Claudes forslag – spør brukeren før de endres mye. Ikke gjort: flere baser, rørledninger/felt som påvirker
  produksjonen, fiendens tilgang til terminalene.

### S4 Forsyning
- Lag og kjøretøy har drivstoff og ammunisjon. Uten forsyning: saktere, skyter mindre, kan ikke forsterkes. Forsyning kjøres
  med lastebil. Endringer i ildkamp/fart i `terreng.js` (med tester).
- **FERDIG 9. nov (natt):** `spill/forsyning.js` (regler uten DOM) + `spill/forsyning-visning.js`. Ammunisjon per lag: 2 % per
  ildrunde (full last ca. 4 t sammenhengende kamp, 0,5 t olje), under 25 % færre treff, tom = skyter ikke (krok `KROKER.ild` i
  kamprunde; terreng.js er uendret). Drivstoff per kjøretøy: lastebil 900 km/0,35 t, speiderbil 600 km/0,12 t; tom tank = står.
  Påfyll automatisk for enheter i ro innen 400 m fra basen (betales med basens olje); «Forsyn …» for lastebiler: henter inntil
  10 t forsyninger på basen og leverer til egne enheter innen 500 m fra målet. Panelene viser ammunisjon/drivstoff.
  Kamptesten i sjekk.js: patruljen slås fortsatt ut (7 av 12), lagene mister færre (fienden har også begrenset ammunisjon).
  Ikke gjort: forsterkning av lag (menn erstattes), mat/rasjoner, fiendens forsyning. Tallene er forslag – spør brukeren.

### S5 Ødeleggelse og ingeniører (fase D)
- Tilstand per infrastruktur-id (hel / skadet / sprengt / under reparasjon). Ingeniørlag sprenger og reparerer bruer, sperrer
  tunnelportaler og ferjekaier, graver skyttergraver, legger miner. Sprengt bru = lenken sperres i S1.
- Visning: tilstanden skal synes på kartet (røyk, brutt bru). Avtal tegningen med kart-chatten: den tegner infrastrukturen,
  og spillet gir den tilstanden via en tabell `INFRA_TILSTAND[id]`.
- Dam og flom (vann nedover dalen fra høydemodellen) kommer til slutt.
- **FERDIG 9. nov (natt), første del:** `spill/odeleggelse.js` (regler uten DOM) + `spill/odeleggelse-visning.js`. Tilstand i
  `INFRA_TILSTAND` (Map, nøkkel `lag:id` med kildens id, mangler = hel; `sprengt`/`reparasjon`). Ingeniørlag (startlag
  «Ingeniørlag 1» ved Dombås, kan bygges på basen for 30 t olje / 1,5 t) sprenger bruer (0,5 t) og sperrer tunneler og ferjekaier
  (1 t), og reparerer (bru 6 t, tunnel 4 t, kai 3 t). Laget må stå innen 150 m fra objektet (marsjerer dit selv); flytter det
  seg, stopper arbeidet (avbrutt reparasjon = sprengt igjen). Valg: «Spreng / sperr …»/«Reparer …» i lagpanelet + trykk på
  objektet, eller «Spreng/Sperr/Reparer med …» i infrastrukturpanelet (virker også i 3D). Vegnettet: lenkene sperres
  (bru 60/tunnel 67 via infraLenker; kai: ferjesambandene med endepunkt innen 1 km), kjøretøy med sperret veg foran seg kjører om
  eller stopper. Kartet: sprengt bru med mørkt gap og røyk (de første 6 spilltimene, så rødt kryss), gule stillas under reparasjon,
  rødt kryss på sperret tunnelportal/kai, ring som fylles under arbeidet; i 3D har brua et gap i midten. Nye kroker i index.html:
  `KROKER.lagKnapper` og `KROKER.info`. Tester: `node pipeline/fliser/test_odeleggelse.js [vegnett.bin]` (ekte E6-bru: 1,2 km
  omkjøring) og sjekk.js («ødeleggelse»). Ikke gjort: skyttergraver, miner, «skadet», fiendens ingeniører, dam og flom. Tidene er forslag.

### S6 Flere enheter (fase E)
- Speiderbil, stridsvogn, rakettartilleri, radar (fast, lang sikt over åpen mark), drone (kort levetid, ser over fjell),
  luftlandsatte, fartøy på sjø og fjord. Hver type: fart, sikt, våpen og pris i olje. Tåke og «sist sett» for alle.
- **FERDIG 9. nov (natt), første del:** `spill/enheter.js` (regler uten DOM) + `spill/enheter-visning.js`. Nye kjøretøytyper i
  Kjoretoy.TYPER (kjører på vegnettet): stridsvogn (60 km/t, kanon 2 km + mg 1 km, ca. 1 treff per kamprunde på 300 m – et lag
  ca. 0,4; ser 1,2 km på åpen mark), rakettartilleri («Ild …» + trykk: 2–30 km, må stå i ro, salve etter 60 s, radius 150 m,
  spredning 80 m når noen av våre ser målet ellers 300 m, rammer også egne, lader om 1 t), radarbil (ser fiender som beveger seg
  på åpen mark innen 15 km når den har stått i ro i 10 min). Drone: «Send drone …» på basen (10 t olje), 120 km/t, ser 2,5 km
  rundt seg også over fjellet, 2 t batteri; lager hull i tåka. Stridsvogn 80 t/4 t, rakettartilleri 90 t/4 t, radarbil 50 t/2 t
  bygges på basen; «Stridsvogn 1» og «Rakettartilleri 1» står ved Dombås fra start. Drivstoff: stridsvogn 1,2 t/450 km,
  rakettartilleri 0,4 t/600 km, radarbil 0,3 t/700 km. Nye kroker: `KROKER.ser` (noe annet enn lagene ser fienden) og
  `KROKER.tåke` (hull i tåka), `BASE_PANEL` (knapper på basen). Tester: `node pipeline/fliser/test_enheter.js [vegnett.bin]`
  og sjekk.js («flere enheter»). Ikke gjort: fienden kan ikke skade kjøretøy, stridsvogn i terrenget (bare på veg), radaren
  regner ikke skygge fra fjell, dronen åpner ikke tåka i 3D, luftlandsatte og fartøy. Tallene er forslag – spør brukeren.

### S7 Garnisoner og tettsteder (fase F)
- `INFRA.tettsted` (990 med folketall): et lag i et tettsted gjør det ditt; tettsteder rekrutterer, reparerer og produserer
  etter størrelse. Kraftverk gir strøm til byene rundt (uten strøm: lavere produksjon).

### S8 Fraksjoner og motstandere
- De oppdiktede fraksjonene fra designdokumentet på hele kartet, enkel AI som tar tettsteder, forsyner seg og angriper.

### S9 Server og flerspiller (fase G)
- Colyseus-server med én autoritativ simulering (bruker `terreng.js` og de samme flisene). Krever en vert (Vercel kan ikke kjøre
  den): spør brukeren før noe settes opp. Ingen nøkler i repoet.

### S10 Kampanje og lyd (fase H)
- Oppdrag på ekte steder (Mongstad, E6 over Dovre, Tromsøbrua, Narvik, Nordsjøen). Lyd fra åpne lydbanker (CC0), kreditert.

**Åpne spørsmål til brukeren** (spør før S6/S10): beholde stil 1 eller pikselstil? Atomvåpen/massevåpen med eller ikke
(forslag: ikke)? Kampanje først eller fritt spill på hele kartet først?

## 3. Kart-chatten jobber videre med (samtidig)
- Omlandet (Sverige, Finland, havet) og blått hav – pågår 8. nov.
- Infrastrukturen i 3D; tilstand (sprengt bru) i tegningen: gjort i S5 (odeleggelse-visning.js + gap i bruer3d).
- Jernbane (Bane NOR) som eget infrastrukturlag; veger i nabolandene (OpenStreetMap).
- Svalbard (høyde fra Norsk Polarinstitutt); 2 m høyde for hele Norge (utsatt av brukeren).
