# Detaljer for hele Norge – hvordan dataene får plass

Målt 8. nov 2026 på Dovre-testområdet (46 × 50 km, 2 326 km²). Norges fastland er ca. 324 000 km², altså ca. **139 × Dovre**.

## Kort svar

Komprimering alene gir 2–4 ganger mindre data. Det holder ikke for «ufattelig mye detaljer». Det som virker, er fire ting sammen:

1. **Fliser i nivåer.** Kartet deles i ruter (fliser) i mange zoomnivåer. Spilleren laster bare flisene som er på skjermen, i detaljnivået som passer zoomen. Hele Norge kan være mange GB på serveren, men spilleren laster bare noen hundre KB om gangen.
2. **Riktig format per lag.** Høyde, terreng, satellitt, veger og bygg har hvert sitt beste format (tabellen under).
3. **Detaljer lages i stedet for å lagres.** Trær, steiner, åkerlapper, husdetaljer og soldatenes utstyr lagres ikke ett og ett. Det som lagres, er en regel og et frø, for eksempel «barskog, tetthet 0,7» for en flis. Klient og server lager de samme trærne fra det samme frøet. Slik har spillet allerede trærne ved dyp zoom, og det er dette som gir nesten ubegrenset detalj.
4. **Én modell per type.** 4 millioner hus er ca. 20 hustyper × posisjon og retning, ikke 4 millioner modeller.

## Målinger (Dovre)

| Lag | I dag (i HTML) | Beste målte | Format |
|---|---|---|---|
| Høyde, 120 m-rute | 419 KB (base64) | **102 KB** (84 KB med 2 m-trinn) | prediksjon (naboruter) + brotli; terrarium-WebP tapsfri 98 KB |
| Terrengklasse | 210 KB (base64) | **12 KB** | brotli (PNG 18 KB) |
| Satellitt 30 m | 454 KB (JPEG) | **119 KB** | AVIF q40 (WebP q60: 196 KB) |
| Veger, 14 085 punkter | 287 KB (JSON) | **39 KB** | heltall i meter, delta, varint + brotli (= slik vektorfliser/MVT lagrer) |
| Bygg, 6 069 stk. | 100 KB (JSON) | **23 KB** (ca. 4 byte/bygg) | brotli; i vektorfliser enda mindre |

Vercel komprimerer HTML automatisk allerede (Norge-siden: 1,3 MB → 405 KB over nettet).

## Pilot: Dovre i fliser (bygget 8. nov 2026) – målt

Side: https://riksbrudd.vercel.app/dovre-fliser · kode: `pipeline/fliser/` (01_hent.py, 02_fliser.py) og `site/dovre-fliser/`.
Område 46 × 50 km (2 300 km²), kjerne 8 × 8 km rundt Dombås.

| Lag | Innhold | Fil |
|---|---|---|
| hoyde | Kartverket DTM, 8 m for hele området, 2 m rundt Dombås, tapsfri WebP (0,25 m / 0,1 m presisjon) | 25,2 MB (1 103 fliser) |
| kart | stil 1-farget bakke fra Landsat 1987, 32 m, AVIF | 0,18 MB |
| terreng | arealklasse fra Landsat + høyde, 32 m | 0,16 MB |
| vektor | veger (NVDB) og 7 108 bygg (matrikkelen), MVT | 0,87 MB |

**Det spilleren faktisk laster** (målt med `node pipeline/fliser/sjekk.js`, fire visninger fra Dombås til Snøhetta):
PC 1,7 MB, mobil 0,7 MB, av 26,4 MB totalt. Én skjermflis tegnes på 15–40 ms. Trær, skygge og koter lages i nettleseren.

### Hele Norge, regnet fra piloten (×141)

| Lag | Størrelse |
|---|---|
| Høyde 8 m (hele landet) | ca. 2,6 GB |
| Høyde 2 m (hele landet) | ca. 29 GB – bare der det trengs (byer, slagmarker) |
| Kart + terreng 32 m | ca. 50 MB |
| Veger og bygg | ca. 100–300 MB (tettere i byene) |

Høyden er den tunge delen. Den kan gjøres 2–3 ganger mindre med 0,5 m presisjon eller tapsbasert koding om det trengs.
Filer over 100 MB legges i Cloudflare R2 eller Vercel Blob (ikke git). Spilleren laster fortsatt bare 1–2 MB per økt.

## Teknisk valg

- **PMTiles**: alle fliser i én fil per lag. Nettleseren henter bare de bitene den trenger. Vercel støtter dette (testet: `206 Partial Content`). Filer over 100 MB (GitHubs grense) legges i Cloudflare R2 eller Vercel Blob.
- **Vektor** (veger, bygg, kommunegrenser, vann, jernbane, kraftlinjer): Mapbox Vector Tiles laget med `tippecanoe`.
- **Raster** (satellitt, terrengklasse): AVIF eller WebP.
- **Høyde**: 16-bit høyde i R+G i tapsfri WebP, 258 px med 1 px kant så skyggen blir sømløs.
- **Flisnett**: eget meternett i EPSG:25833 (UTM 33, som Kartverket) for hele Norge, ikke Web Mercator. Spillet regner i meter (marsj, sikt), og 1 punkt er like stort over hele landet. Definert i `pipeline/fliser/felles.py`.
- **Visning**: egen canvas-tegner (stil 1) som henter fliser med pmtiles.js. three.js kan lese de samme høydeflisene til 3D.
- **Spilltilstand**: sendes separat fra kartet. Serveren sender bare endringer (hvem eier hvilken rute, hvor lagene står), ikke kartet.
- **Bygging** av flisene skjer en gang i GitHub Actions eller på egen maskin, ikke i nettleseren.

## Neste steg

1. ✅ Pilot på Dovre (over).
2. ✅ Lagene, marsjen og sikten er flyttet over på flisene (8. nov). Reglene ligger i `site/dovre-fliser/terreng.js` og regner
   på et vindu i 32 m-ruter som bygges av flisene rundt laget. Med spillet lastet en hel økt 2,1 MB på PC og 1,1 MB på mobil.
3. Hele Norge i bolker: Landsat-scenene (ca. 60), DTM i 8 m, NVDB og matrikkelen, med GitHub Actions; lagring i R2.
4. Rutenett for spillet (2 km-sekskanter) som eget vektorlag, med ID-er serveren bruker.
