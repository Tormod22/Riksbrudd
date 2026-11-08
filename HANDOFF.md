# Riksbrudd – overlevering fra chat til Claude Code

Dette er en rekonstruert logg av samtalen 7.–8. november 2026, med alle beslutninger, det som er bygget, og hva som gjenstår.
(Ordrett transkripsjon av chatten var ikke tilgjengelig; dette er innholdet, i rekkefølge.)

## 0. Oppdatert 8. nov 2026 (Claude Code) – les dette først

- **Spillet foregår nå i 2023**, ikke 1986 (brukerens valg). Lore og fraksjoner i resten av dokumentet og i
  designdokumentet er skrevet for 1986 og må tilpasses. Kartet bygges for 2023: Sentinel-2, ESA WorldCover, NVDB per 1.6.2023.
- **Hele Norge** bygges i blokker i GitHub Actions (`.github/workflows/norge.yml`) og hentes via GitHub Releases + `site/api/kart.js`.
  Se `docs/plan-hele-norge.md` og `CLAUDE.md`.
- **Adresser:** `/norge` = hele Norge 2023 (når bygget), `/kommuner-1986` = den første kommuneprototypen (var `/norge`),
  `/dovre-fliser` = flispiloten med lag, marsj, sikt, kamp, tåke og 3D.

## 1. Samtalen, kronologisk

1. **Idé.** Bruker vil lage et krigsstrategispill «litt likt Supremacy 1914». Valg: nettleser først, sanntid med raskt tempo, både flerspiller og enspiller mot AI.
2. **Anbefalt stack**: TypeScript + PixiJS (kart) + React (menyer), Node + Colyseus (server, tick-loop, server er sannheten, klienten sender kun ordrer), Postgres for kontoer. Enspiller først med samme simulering.
3. **Første regelsett** (40 provinser, gull, én enhetstype, kamprunder, nøytrale garnisoner, enkel AI, seier ved 60 %).
4. **Kartet skal være Norge** med fylker og kommuner + Svalbard. Kommune = provins, fylke = region med bonus.
5. **Stilvalg.** Fem konseptbilder laget i Figma (fil «Krigsstrategispill – stilretninger»): mørk realistisk, antikt atlas, hybrid, nordisk minimal, malt illustrasjon. **Valgt: stil 1, mørk realistisk** (Supremacy-aktig, papirtekstur, dempede jordfarger, vignett).
6. **Første kartprototype**: ekte kommunegrenser (2024), UTM33, pan/zoom, klikk på kommune. Feil fikset: zoomsenter på mobil (safe-area), Svalbard i riktig målestokk og posisjon nord for fastlandet.
7. **Spillogikk i nettleseren**: enheter, trening (10 gull), bevegelse mellom nabokommuner, kamp i runder, nøytrale garnisoner, AI, HUD, seier. Sverige lagt inn grått; senere hele verden grått (Natural Earth), nøkkelland (Sverige, Finland, Sovjet, Danmark, Storbritannia, Island, Vest-Tyskland, Polen, Baltikum, Benelux, Frankrike, Irland) finere og med navn. Projeksjon byttet til Lambert azimutal sentrert på Norge (lat 65, lon 15) for å kunne vise verden.
8. **Dypere zoom** med prosedyrale trær/topper/åkre per kommune (seedet RNG).
9. **Ideer bruker la til**: ideologi, produksjon og bygg (militærbase i et område), diplomati med Sverige (donere penger, konkurrere om velvilje, transittrett), speidere som ser ned en dal, erobring bit for bit (ikke hele kommunen på en gang), politikerrolle som leder en folkegruppe.
10. **Epoke**: først 1905–1918 foreslått, bruker valgte 1940–45, så ombestemt til **1980–2000 / kald krig**. Lore: radikaliserte partier, uro, Norge splittet i fraksjoner. **Spillet starter våren 1986.**
11. **Fraksjoner er politiske posisjoner, ikke steder** (bruker insisterte). Tre akser: sentralisme↔regionalt selvstyre, marked↔fellesskap, tradisjon↔modernitet. Fire oppdiktede bevegelser: Riksrådet, Kystalliansen, Folkefronten, Nyordningen. Spilleren velger startkommune blant sympatiske, eller tilfeldig.
12. **Folkemening per kommune fra ekte data** (SSB befolkning/areal/næring/utdanning + kommunevalg 2023 fra valgresultat.no) → tre akser, rangert 0–1. Sympati = avstand kommune↔fraksjon. Startposisjoner velges av sympati. Sympati påvirker forsvar (0,6–1,4). Lag «☰» viser dominerende bevegelse per kommune.
13. **Infrastruktur ønsket**: fabrikker, oljeplattformer, bruer, tunneler, kraftverk, bunkere, ressurser (skog, kull, jern, mineraler).
14. **Designdokument** skrevet (PDF, 8 sider, 7 illustrasjoner). Google Docs-opprettelse ble ikke godkjent i appen, derfor PDF.
15. **Tempo endret**: en spilldag = **24 minutter reell tid** (1 min = 1 spilltime). Trening 6 t, marsj 8 t × terreng, Svalbard sjøvei 36 t, kamprunde hver time, 60 dager = 24 t reell tid. Hastighet 1×/10×/60× i enspiller.
16. **Mer 3D, zoom til hus, hver enkelt soldat flyttbar**: lag på 12 mann med lagfører, kommandokjede, fri plassering i terrenget. Besluttet: sekskantnett/rutenett inni kommunene; simulering på lagnivå; kartfliser (PMTiles/MapLibre) for hele Norge senere.
17. Bruker leverte et eksternt notat om datakilder (SSB historiske kommunegrenser 1986–2019, historiske valg, NVE, Sokkeldirektoratet, NIBIO AR50, NGU, NVDB, Bane NOR, Kystverket, Frost/SeNorge, MapLibre+PMTiles+PostGIS). Vurdert som riktig; prioritert rekkefølge: 1986-grenser → Dovre-test → historiske valg/NVE/Sokkeldir.
18. **1986-kommunegrenser gjennomført**: SSB FilGeodatabase (lag Hist_kommune_flate_1986, 454 kommuner), klippet mot kystlinje (Kartverket 2024-polygoner) fordi SSB-datasettet inkluderer sjøareal. 19 fylker avledet. Befolkning 1.1.1986 fra SSB tabell 06913. Folkemening foreløpig arvet fra 2024-kommunen som inneholder 1986-kommunens punkt.
19. **Satellitt**: bruker spurte om Google Earth 1984. Svar: Google kan ikke brukes, men Landsat 5 (USGS, public domain) kan. Hentet via Microsoft Planetary Computer STAC. Dovre: to striper 13. aug 1987.
20. **Dovre-testområde bygget** (46×50 km rundt Dombås): Landsat-klassifisering + hillshade (stil 1), høydekurver, bygg fra Kartverkets matrikkel (hytter utelatt), veger fra NVDB, lag på 12 navngitte mann, A*-marsj over terrengkostnad, siktfelt (viewshed) fra høydemodell, 3D-visning (three.js r128), sikt for alle lag (gult egne, rødt fiende), siktrekkevidde avhengig av terreng/høyde/bevegelse, fiendtlig patrulje i rute.
21. **Vercel**: filene var for store for MCP-koblingen; ferdig statisk prosjekt ligger i site/. Anbefalt: GitHub-repo + `create_git_project`, eller `vercel deploy --prod`.

## 2. Status – hva som finnes

### site/ (statisk, klar for Vercel)
- index.html – forside
- kommuner-1986/index.html (var norge/) – Norge 1986: 454 kommuner, verden grått, folkemening, spillogikk (trening/bevegelse/kamp/AI), 24-min døgn, trær ved dyp zoom. Alt innebygd (~1,3 MB).
- dovre/index.html – Dovre 1987 testområde (~1,9 MB), 2D + 3D.

### pipeline/norge/
- build1986.py (bruk denne; build.py er 2024-versjonen). Forventer filer i samme mappe som i chat-miljøet:
  kommuner.geojson/kommuner_s.geojson (Kartverket 2024 via github robhop/fylker-og-kommuner), ne50.geojson/ne110.geojson (Natural Earth),
  h1986/kommuner1986_s.geojson (ligger i data/norge), h1986/pop1986.json, ssb/opinion.json (ligger i data/norge).
  Output: map.json (= data/norge/map_1986.json). Deretter: sett inn i tpl2.html der `__MAPDATA__` står (escape `</` som `<\/`).
- tpl2.html – hele spillsiden uten data.
- stubtest.js – kjører spillskriptet i node med stubbet DOM; bruk før publisering.

### pipeline/dovre/
- 01_dem.py → 02_landsat.py → 03_classify.py → 04_buildings_roads.py → 05_package.py → dovre.html. Krever: numpy, pillow, rasterio, shapely, pyproj, matplotlib. Bak proxy: `GDAL_HTTP_UNSAFESSL=YES`.
- tpl.html – siden; stub.js/stub2.js – tester (stub2 tester A*, bevegelse og viewshed).

### data/
- norge/map_1986.json, kommuner1986_s.geojson (klippet, forenklet 4 %), kommuner2024_s.geojson, pop1986.json, opinion.json (2024-nøkler), stats.json, valg.json.
- dovre/dovre_data.json, texture.jpg (cls.npy regenereres av 03_classify.py), buildings.json (EPSG:32632, [E,N,bygningstype,status]), roads.json (EPSG:32632, vegkategori E/R/F/K/P), landsat_meta.json (transform for 30 m-nettet), meta.json (DEM-fliser).

### docs/ og illustrasjoner/
- Designdokument (PDF + HTML-kilde). Illustrasjoner fra Figma (stilprøver, olje, sekskant/base, diplomati, vinter, folkemening) + Landsat-bilde.

## 3. Regler slik de står i koden (norge/index.html)
R = {tick 0.1 s, day 1440 s, moveBase 480 s (8 t), seaMove 2160 s (36 t), unitCost 10, trainTime 360 s (6 t), upkeep 0.5/tropp/dag, combatRound 60 s (1 t), lossRate 0.1, capDef 1.5, winShare 0.6, maxDays 60, startGold 100}.
Terreng avledet av areal (>1500 km² fjell 1,6/1,5; >400 skog 1,3/1,2; ellers slette). Inntekt 1–4 etter sqrt(areal). Nøytral garnison 2+1,5·log10(folketall)+rand. Hovedstad: nærmeste by >15 000 innb. i sympati, med avstand til andre.
Fraksjoner (pos på [sentral, marked, tradisjon]): Riksrådet [0.9,0.35,0.2], Kystalliansen [0.3,0.9,0.35], Folkefronten [0.15,0.25,0.8], Nyordningen [0.8,0.75,0.85]. Spiller = Riksrådet (blå); rød = Kystalliansen (AI); grønn = Folkefronten (AI). Nyordningen har ennå ingen spiller.

Dovre: lagfart km/t: E/R/F-veg 5, annen veg 4, hei 3, snaufjell 2,2, skog 2, myr 1,8, snø 1,5, vann sperret (unntatt veg). Stigning: fart/(1+8·grad). Sikt: lag 4 km, speider 8 km; skog ×0,35, myr ×0,8, snø ×0,9; i bevegelse ×0,55; høyde over omgivelsene +inntil 60 %; siktlinjer over DEM (observatør 2 m, skog +8 m).

## 4. Datakilder (alle åpne; oppgi kilde)
Kartverket/Geonorge: administrative grenser (CC BY 4.0), matrikkelen bygningspunkt (WFS), N50 (nedlasting), høydedata (hoydedata.no). SSB: 11342, 07984, 09429, 06913, historiske kommunegrenser 1986–2019 (FilGeodatabase). Valgdirektoratet: valgresultat.no/api/2023/ko/{fylke}/{kommune}. NVDB API v4 (X-Client-header). USGS Landsat 5 via planetarycomputer.microsoft.com (STAC + SAS-signering). Natural Earth 50m/110m. Terrarium DEM (AWS elevation-tiles-prod) – bør byttes til Kartverket DTM10.
Ikke brukt ennå: Sokkeldirektoratet (felt/rør med startår), NVE vannkraft-API (IDriftDato), NIBIO AR50, NGU, Bane NOR WFS, historiske valg 1983/1985 (SSB), Frost/SeNorge.

## 5. Åpne beslutninger og neste steg (prioritert)
1. ✅ GitHub-repo + Vercel (8. nov): https://riksbrudd.vercel.app, bygges fra main. Plan for kartdata: docs/komprimering.md.
2. Server (Colyseus) må komme tidlig pga. 24-min døgn: ordrekøer, tikking når ingen er pålogget.
3. (8. nov: kartpilot ferdig, se docs/komprimering.md og /dovre-fliser.) Sekskant-/rutenett inni kommunene for hele Norge (2 km foreslått), terreng fra Landsat 1986–87 + Kartverket høyde; MapLibre + PMTiles for fliser; PixiJS-lag oppå for enheter.
4. Bit-for-bit-erobring: kommunen eies av den som holder flertallet av bebodde ruter; tipper når hovedbygda tas.
5. (8. nov: /dovre-fliser har lag, marsj, sikt, ildkamp, tåke og 3D på flisene, med Kartverket-høyde; veger og bygg for hele området.) Gjenstår: jernbane (Bane NOR), kampregler fra brukeren, flere fiender/AI.
6. Historiske valg 1983/85 og 1986-næringstall → erstatte arvet folkemening.
7. Oljefelt/rør (Sokkeldir), kraftverk (NVE), bruer/tunneler (NVDB) → naboforhold og økonomi.
8. Diplomati (Sverige med län), ideologiakser som mekanikk, politikerrollen (lojalitet, desertering, flere spillere per bevegelse).
9. Hele Norge med satellitt: ~60 Landsat-scener, batch på egen maskin; scripts i pipeline/dovre er malen.

## 6. Lenker fra chatten
- Claude-artefakt Norge: https://claude.ai/artifact/Dk8dE6bpNqsTC76zYzMcij
- Claude-artefakt Dovre: https://claude.ai/artifact/R7bBH6PXKLoaKhUvRd6MNK
- Figma stilbilder: https://www.figma.com/design/WXUWGA6ZzF2tKHcmGGfUcM
