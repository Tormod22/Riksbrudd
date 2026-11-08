# Plan: hele Norge i Riksbrudd

Skrevet 8. nov 2026, etter Dovre-piloten (`/dovre-fliser`). Grunnlaget er det vi har **målt** på Dovre. Tall merket «anslag» er
regnet opp fra Dovre og må bekreftes i fase 1.

## Mål og budsjett

«Meget optimalisert» betyr tall vi kan måle og teste mot, ikke en følelse:

| Hva | Budsjett | Dovre i dag |
|---|---|---|
| Første kart på skjermen (PC, 4G) | under 1,5 s | ca. 1 s |
| Nedlasting per økt, vanlig spill | under 3 MB | 1,7–2,1 MB |
| Nedlasting per økt, mye 3D og zoom | under 10 MB | 3,4 MB |
| Hovedtråden per bilde under panorering | under 8 ms (60 bilder/s) | **15–40 ms per ny flis – for mye** |
| Minne på mobil | under 300 MB | ikke målt |
| All kartdata på serveren, hele landet | under 5 GB | 26 MB for Dovre |
| Bygge hele landet på nytt | under ett døgn, og hver bit for seg | 1 min for Dovre |
| Driftskostnad | 0 kr i måneden så lenge det er få spillere | 0 kr |

Sjekken (`pipeline/fliser/sjekk.js`) får disse som krav, så de ikke glir.

## Hvor stort blir det? (målt på Dovre, regnet opp)

Fastlandet er ca. 324 000 km² (141 × Dovre), Svalbard ca. 61 000 km².

| Lag | Format (valgt etter måling) | Hele fastlandet |
|---|---|---|
| Høyde 8 m, alle nivåer | tapsfri WebP, **0,5 m presisjon** (se under) | ca. 1,9 GB |
| Høyde 2 m | tapsfri WebP, 0,1 m | ca. 29 GB hvis overalt → **bare der det trengs** (byer, valgte slagmarker) |
| Kartbilde 32 m (Landsat) | WebP (AVIF virker ikke på eldre iPhone) | ca. 45 MB |
| Terrengklasse 32 m | tapsfri WebP | ca. 23 MB |
| Veger og bygg | MVT, gzip | ca. 0,2–0,5 GB (tettere i byene enn på Dovre) |
| Svalbard (høyde 8 m + kart) | som over | ca. 0,4 GB |
| **Sum** | | **ca. 2,5–3 GB**, godt under budsjettet |

### Hvorfor 0,5 m presisjon på høyden
Målt på 16 Dovre-fliser (8 m, 256 × 256):

| Koding | Per flis |
|---|---|
| Tapsfri WebP, 1 m | 12,1 KB – men gir synlig «grus» i skyggen på flatt terreng |
| **Tapsfri WebP, 0,5 m** | **15,6 KB** – kan ikke skilles fra 0,1 m med øyet |
| Tapsfri WebP, 0,25 m (i dag) | 20,5 KB |
| Prediksjon + brotli/zstd | 15–26 KB, og nettleseren må ha egen dekoder |
| LERC (tapsbasert, feilgrense) | 30–44 KB – dårligere her |
| Rest fra foreldreflis | 29 KB – dårligere |

WebP er best, og nettleseren dekoder det selv. Høydeflisene blir 24 % mindre uten synlig forskjell. Spillreglene bruker 32 m-ruter,
så 0,5 m er langt finere enn de trenger.

## Arkitektur

### 1. Ett flisnett for hele landet (finnes, må justeres først)
`pipeline/fliser/felles.py`: EPSG:25833 (UTM 33, som Kartverket), fliser på 256 px, z11 = 8 m, z13 = 2 m.
**Feil funnet under planleggingen:** nettet starter ved 9 000 km nord, mens nordlige Svalbard ligger på ca. 9 023 km.
Origo flyttes til 9 200 km nord **før** noe annet bygges. Bare Dovre-flisene må lages på nytt, og det tar 1 minutt.

### 2. Bygging i blokker
- **Blokk** = én z6-flis (65 × 65 km). Fastlandet er ca. 110 blokker, Svalbard ca. 25.
- Hver blokk bygges for seg (henting → klassifisering → fliser z6–z11), så en feil eller et nytt datasett bare krever
  at én blokk bygges på nytt.
- Nivå z0–z5 (oversikt) lages til slutt av z6-flisene.
- Blokkene settes sammen til én PMTiles-fil per lag. Det skjer med vårt eget skript, siden lagene er raster vi lager selv.
- Kjøres i GitHub Actions som en matrise. Ca. 15 min per blokk og 20 samtidig gir ca. 2 timer for hele landet.
  **Merk:** er repoet privat, har Actions 2 000 gratis minutter i måneden. Ett fullt bygg bruker ca. 2 000. Offentlig repo
  eller egen maskin løser det.

### 3. Lagring
**Valgt 8. nov: GitHub Releases + mellomstasjon på Vercel**, fordi det ikke krever nøkler fra brukeren (Actions laster opp
med GITHUB_TOKEN). Repoet ble gjort offentlig 8. nov. Virker på den ekte siden, med hurtigbuffer i Vercel. Filene kan være opptil 2 GB, og hver bit lagres i Vercels hurtigbuffer
(`site/api/kart.js`). Grenser å følge med på: Vercel Hobby har 100 GB overføring og 1 million kall i måneden. R2 under er
reserven hvis det ikke holder, eller når spillet åpnes for mange.

- Filene blir for store for git og Vercel (GitHub tillater maks 100 MB per fil).
- **Anbefalt: Cloudflare R2.** Den tar ikke betalt for nedlasting, støtter Range, og har gratis lagring opp til 10 GB
  (vilkår fra min kunnskap, må sjekkes ved oppstart).
- Spillet (HTML/JS) blir liggende på Vercel som nå. Kartdataene hentes fra R2 med CORS og Range.
- Alternativ: Vercel Blob. Det er enklere å sette opp, men nedlasting koster.
- **Status 8. nov:** brukeren har R2-konto, og bøtta heter `riksbrudd-kart`. Den settes opp for hånd i Cloudflare, fordi brukeren ikke
  vil gi API-nøkkel her og Cloudflare-utvidelsen ikke virker i sky-økter.
- **r2.dev er bare for utvikling** (begrenset kapasitet, ingen hurtigbuffer i Cloudflares nett). Før spillet åpnes for flere:
  eget domene i Cloudflare (f.eks. `kart.riksbrudd.no`), eller en Cloudflare Worker foran bøtta (gratis opp til 100 000
  forespørsler per dag). Begge gir hurtigbuffer. Dette gjøres i fase 4, før hele landet legges ut.

### 4. Datakilder for hele landet
| Lag | Kilde | Hvordan |
|---|---|---|
| Høyde | Kartverket DTM (WCS som nå, eller nedlasting av DTM10 fra Geonorge) | WCS: Dovre tok ca. 1 min → hele landet ca. 2,5 t |
| Kartbilde og terrengklasse | Landsat 5, somrene **1985–1988** | ca. 70 scener per dato. Skyer krever **sammensetning**: per punkt brukes medianen av skyfrie opptak (QA-båndet). Det er det mest krevende steget, ca. 100 GB lesing, men bare de bitene vi trenger (COG). |
| Veger | NVDB API (som nå, per blokk) eller Geonorge-nedlasting | ca. 1,2 mill. veglenker |
| Bygg | Matrikkelen WFS per blokk | ca. 4 mill. bygg |
| Kommuner 1986 | finnes (`data/norge`) | samme flisnett, som vektorlag |
| Senere | NVE (kraftverk), Sokkeldirektoratet (olje), Bane NOR, NIBIO AR50 (bedre arealklasser) | egne lag |

**Tidsriktighet:** veger og bygg er dagens data. Spillet foregår i 1986, så nyere veger, tunneler og bygg bør filtreres bort.
Det må undersøkes hvilke dato- og årsfelt NVDB og matrikkelen faktisk har (se fase 6).

### 5. Klienten må bli raskere (det svake punktet i dag)
Visningen lager i dag hver flis (skygge, høydekurver, trær) på **hovedtråden**, og det tar 15–40 ms per flis. På Dovre går det.
For hele Norge, med raskere panorering, gir det hakking.
1. **Web Workers:** flisene lages i bakgrunnstråder, 2–4 stykker, så hovedtråden bare tegner ferdige bilder.
2. **Samlet henting:** naboflisene ligger ved siden av hverandre i fila (Hilbert-rekkefølge). Når flere hentes i én
   forespørsel, går antall hentinger ned med ca. 3–5 ganger.
3. **Lokalt hurtigminne** (Cache API): fliser du har sett, lastes ikke ned igjen ved neste besøk.
4. **Forhåndshenting** langs marsjruter og rundt egne lag.
5. **Avbryt** henting av fliser som har gått ut av skjermen.
6. Senere, hvis det trengs: tegne 2D-kartet med WebGL (skygge i skjermkortet), slik 3D gjør.

### 6. Spillet på hele landet
- **Lange marsjer:** A* på 32 m-ruter fungerer innenfor et vindu (Dovre: 20 km på under et sekund), men ikke fra Oslo
  til Tromsø (300 mill. ruter). Løsningen er **ruter i to nivåer**: for hver 8 km-flis regnes inngangene i kanten og tiden
  mellom dem på forhånd (eget lag «nav»). Lange ruter finnes på det grove nettet og detaljene i vinduet rundt laget.
- **Serveren** (Colyseus, som i HANDOFF) bruker samme `terreng.js` og leser de samme flisene. Den regner bare i «aktive
  vinduer» der det står lag, så tomme fjellvidder koster ingenting.
- **Ett kart fra land til soldat:** `/norge` (kommuner 1986, folkemening) og fliskartet slås sammen. Kommunene blir et
  vektorlag i samme flisnett, så du kan zoome fra hele landet ned til en enkelt soldat.
- **Rutenett for erobring:** 2 km-sekskanter (ca. 80 000–95 000 på fastlandet, avhengig av hvordan 2 km måles) som eget lag med ID-er serveren bruker.

## Faser

| Fase | Innhold | Ferdig når |
|---|---|---|
| **0. Beslutninger** | Dine valg (under) | du har svart |
| **1. Grunnmur** | Flytte origo for Svalbard; 0,5 m høyde; budsjettene inn i `sjekk.js`; blokkbygging; **prøve på ett fylke** (Oppland 1986, ca. 25 000 km², der Dovre ligger) | Oppland ligger ute og alle budsjettene er målt |
| **2. Rask klient** | Workers, samlet henting, hurtigminne, forhåndshenting, avbryting | hovedtråden er under 8 ms per bilde og hentingene er minst halvert |
| **3. Landsat 1985–88** | Skyfri sammensetning per blokk | Oppland uten skyhull |
| **4. Hele fastlandet** | Alle blokkene i Actions og opp til R2 | hele landet kan zoomes, og budsjettene holder |
| **5. Svalbard** | Samme løype | Svalbard med |
| **6. Spillet på hele landet** | Ruter i to nivåer, kommuner og sekskanter i fliskartet, server | et lag kan marsjere fra én landsdel til en annen |
| **7. Tidsriktig 1986** | Fjerne nyere veger og bygg; jernbane, kraftverk og olje | du godkjenner |

Hver fase avsluttes med `sjekk.js`, skjermbilder på PC og mobil, og at den ekte siden testes slik den ligger ute.
Etter feilene 8. nov testes også blokkerte nettsider og gamle filer i hurtigminnet.

## Dette må du bestemme (fase 0)

1. ✅ **Lagring:** GitHub Releases + mellomstasjon på Vercel (8. nov). R2-kontoen finnes som reserve.
2. **2 m-høyde:** bare noen få steder (byer, slagmarker du velger), eller ingen steder i første omgang?
3. **Svalbard:** med fra start, eller etter fastlandet?
4. ✅ **Repoet** er offentlig (8. nov), så Actions-minuttene er ubegrensede.
5. **Tidsriktighet:** er det nok med dagens veger og bygg i første omgang, med 1986-filteret senere?
6. **Fylket å prøve på:** Oppland (Dovre ligger der), eller et annet?
