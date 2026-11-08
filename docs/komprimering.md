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

## Hele Norge (anslag, ×139)

| Lag | Størrelse |
|---|---|
| Satellitt 30 m (Landsat 1986–87) | ca. 17 MB |
| Høyde 120 m | ca. 14 MB |
| Høyde 30 m / 10 m (Kartverket DTM10) | ca. 150–250 MB / ca. 1 GB *(anslag, ikke målt)* |
| Bygg (ca. 4 mill.) | ca. 16 MB |
| Veger (NVDB) | ca. 10–20 MB (tettere enn Dovre) |

**Hele Norge på Dovre-nivå blir ca. 60 MB totalt, og med 10 m-høyde ca. 1 GB.** Spilleren laster bare en liten del av det.

## Teknisk valg

- **PMTiles**: alle fliser i én fil per lag. Nettleseren henter bare de bitene den trenger. Vercel støtter dette (testet: `206 Partial Content`). Filer over 100 MB (GitHubs grense) legges i Cloudflare R2 eller Vercel Blob.
- **Vektor** (veger, bygg, kommunegrenser, vann, jernbane, kraftlinjer): Mapbox Vector Tiles laget med `tippecanoe`.
- **Raster** (satellitt, terrengklasse): AVIF eller WebP.
- **Høyde**: terrarium-WebP, som MapLibre og three.js leser direkte.
- **Visning**: MapLibre GL viser fliser og 3D-terreng. Enheter tegnes i et eget lag oppå (three.js eller PixiJS).
- **Spilltilstand**: sendes separat fra kartet. Serveren sender bare endringer (hvem eier hvilken rute, hvor lagene står), ikke kartet.
- **Bygging** av flisene skjer en gang i GitHub Actions eller på egen maskin, ikke i nettleseren.

## Neste steg

1. **Pilot på Dovre:** gjør om `data/dovre` til PMTiles (satellitt, høyde, terreng, veger, bygg) og lag en visning som laster fliser og lager trær fra frø. Mål hva spilleren faktisk laster.
2. **Hele Norge i bolker:** kjør det samme for alle Landsat-scenene (ca. 60) og hele NVDB/matrikkelen med GitHub Actions.
3. **Rutenett for spillet** (2 km-sekskanter) som eget vektorlag, med ID-er serveren bruker.
