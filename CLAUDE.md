# Riksbrudd – kontekst for Claude Code

Les HANDOFF.md først. Den oppsummerer hele samtalen som førte hit (7.–8. nov 2026),
alle designvalg og hvor ting ligger. docs/Riksbrudd-designdokument.pdf er designdokumentet.

Språk: svar og kommentarer på norsk. Stil: stil 1 (mørk, realistisk, 80-talls operasjonsrom, papirtekstur).
Alle kartdata skal være ekte og åpne (kilder listet i HANDOFF.md). Fraksjonene er oppdiktede.

Kjapp start:
- site/            statisk side: forside, /norge (hele Norge 2023), /kommuner-1986 (første prototype), /dovre-fliser, /dovre. Live: https://riksbrudd.vercel.app
                   (Vercel-prosjekt «riksbrudd», team tormod-h, rotmappe site/, bygges automatisk ved push til main).
- pipeline/norge/  build1986.py lager data/norge/map_1986.json fra 1986-kommunegrenser + SSB + valg.
- pipeline/dovre/  01–05 bygger testområdet (Landsat 5 1987, høyde, bygg, veg) -> dovre.html.
- Kjør alltid testene før publisering (de fanger runtime-feil), fra repo-roten:
  `node pipeline/norge/stubtest.js && node pipeline/dovre/stub.js && node pipeline/dovre/stub2.js`
  (leser site/kommuner-1986 og site/dovre; en annen HTML-fil kan gis som argument).

Kartdata for hele Norge: les docs/komprimering.md (fliser i nivåer + PMTiles, format per lag, detaljer fra frø).
FUNKSJONSPLAN og hvem som eier hvilke filer (to chatter parallelt, kroker KROKER.tegn/sim/trykk, spill/): docs/plan-funksjoner.md.
SPILLMEKANIKK (forsyning, olje, bruer, ingeniører, detaljnivå – inspirert av WarFront på Steam, ikke kopiert): docs/plan-spillmekanikk.md.
PLANEN for hele Norge: docs/plan-hele-norge.md (budsjetter, faser, beslutninger). ÅRSTALL: spillet foregår i 2023 (brukeren,
8. nov), ikke 1986 som i HANDOFF/designdokumentet. Bygging: pipeline/fliser/blokk.py + sammen.py, .github/workflows/norge.yml
(Actions -> «Bygg Norge», input blokker og aar), release kart-norge-<år>-<hash>, tas i bruk på /norge med bruk_norge.py (til da sender /norge til /kommuner-1986).
- pipeline/fliser/ bygger Dovre-piloten (site/dovre-fliser): 01_hent.py (Kartverket DTM via WCS, Landsat) -> arbeid/ (ikke i git),
  02_fliser.py -> site/dovre-fliser/data/*.pmtiles. Flisnettet (EPSG:25833, hele Norge) står i felles.py og må være likt i visningen.
  03_veg_bygg.py henter veger (NVDB, srid 5973) og bygg (matrikkelen) for hele området til data/fliser/ (i git).
  Spillreglene (fart, marsjrute A*, siktvidde, siktfelt, ildkamp) ligger i site/dovre-fliser/terreng.js uten DOM og regner på et vindu
  i 32 m-ruter (z9) som visningen bygger av flisene rundt laget (lagVindu). Test: `node pipeline/fliser/test_terreng.js`.
  Kampreglene (VÅPEN, treffsjanse, 6 ute = slått ut) er Claudes forslag, ikke brukerens fasit – spør før de endres mye.
  Tåke: fiender vises bare der egne lag ser (synlig()); ellers «sist sett». 3D (knappen «3D»): three.js r128, utsnitt av
  høydeflisene rundt kameraet (bygg3d), kartet uten skygge som overflate, tåke/sikt bakt inn (bak3d).
  Brukeren har iPhone (Safari/WebKit): ikke AVIF, og bildelesing går via bilde() med reserve (<img>) når createImageBitmap
  feiler. Brukeren meldte «bare svart» 8. nov (Edge på Windows): årsaken var at pmtiles.js fra unpkg.com ble blokkert
  (klokka sto på 06:00, «0 lastet»). Bibliotekene ligger nå i site/dovre-fliser/lib/ – ikke hent skript fra CDN-er.
  Feil vises på skjermen (#feil). Etter endring i terreng.js: `python3 pipeline/fliser/versjon.py` (versjonsmerke i adressen;
  brukeren fikk «Terreng.frø is not a function» fra en gammel kopi). vercel.json: alt revalideres, bare lib/ lagres lenge.
  Lagring: kartfilene lastes opp til GitHub-release kart-<hash> av .github/workflows/kartdata.yml (ingen nøkler) og hentes via
  mellomstasjonen site/api/kart.js (/api/kart/<tag>/<lag>/<fra>/<lengde>, hurtigbuffer i Vercel). Repoet ble gjort OFFENTLIG
  8. nov for at dette skal virke (sjekk synlighet på github.com uten innlogging – api.github.com ser private repo i økten).
  Testet på den ekte siden: kilde «GitHub», andre henting av samme bit kommer fra Vercels hurtigbuffer (HIT).
  Svarer den ikke, brukes filene i site/dovre-fliser/data. KART_TAG settes av versjon.py. (R2: brukeren vil ikke gi nøkler.)
  Byggomriss: pipeline/fliser/bygninger.py (OpenStreetMap, ODbL – krediteres i kildeteksten) -> release kart-hus-<hash> via
  .github/workflows/hus.yml; tas i bruk med bruk_hus.py (HUS_TAG). Visningen: husomriss() i 2D (tak etter type, skygge etter
  høyde), hus3d() reiser byggene i 3D (z13, maks 30 000, hvert bygg én gang via egenskapen i). Uten omriss: byggpunktene.
  2 m-høyde for hele Norge er UTSATT av brukeren (målt: avvik fra 8 m, tapsbasert WebP q80 ~1,6 KB/flis, ~3 GB, men ~320 GB
  må hentes fra Kartverket) – se docs/plan-hele-norge.md.
  Sjekk før publisering: `node pipeline/fliser/sjekk.js` (testserver med Range; høyder, sikt, marsj, tåke, kamp, 3D, feil;
  også «eldre iPhone» uten OffscreenCanvas/createImageBitmap).
  INFRASTRUKTUR (fase A, 8. nov): pipeline/fliser/infra.py henter bruer/tunneler/ferjer/ferjekaier (NVDB, 1. juni ÅR), vannkraftverk/
  dammer/magasin (NVE), innretninger/rør/felt (Sokkeldirektoratet) og tettsteder (SSB WFS tettsted_ÅR) -> én infra.json (~4 MB,
  delta-kodede meter, kildens id per objekt for senere tilstand) -> release kart-infra-<år>-<hash> via .github/workflows/infra.yml;
  tas i bruk med bruk_infra.py (INFRA_TAG). Visningen tegner den OPPÅ flisene (tegnInfra, VISES styrer hva som synes per målestokk,
  INFRA_REKKE), trykk gir panel (finnInfra/visInfo), knapp «Infrastruktur» i ☰. Olje i Nordsjøen ligger vest for flisnettets X0 –
  derfor ikke fliser. Under 4 MB = én henting gjennom mellomstasjonen; blir den større, hentes den i biter. I 3D (8. nov): linjene
  (tunneler, ferjer, dammer, magasin, tettsteder) bakes inn i overflaten (tegnInfraPå med valg), bruene er egne 3D-objekter
  (bruer3d: dekket rett mellom brukarene, søyler hver 45 m, skygge i overflaten), symboler og navn i overlegget (tegnInfra3d),
  trykk via finnInfra3d. Symbolene (symKai/symKraft/symOlje) og navnesettingen (tegnEtiketter) er felles for 2D og 3D.
  sjekk.js tester infrastrukturen med en lokal kopi av releasen (INFRA_DIR, ellers lastes den ned).
  HAV OG OMLAND (8. nov, brukeren: «havet må være blått», «smooth blend til Sverige»): vann/hav farges blått i visningen (HAV;
  kartflisenes vannfarge PAL[3] byttes ut per punkt i komponer, bakgrunnen er HAV_CSS). pipeline/fliser/omland.py lager omlandet
  (Copernicus DEM GLO-90 + ESA WorldCover via Planetary Computer, ingen nøkler): nær z6–z8 (64 m) for z6-blokkene i NÆR
  (Skandinavia, Finland, Kola, Danmark, Svalbard), fjern z0–z5 (512 m) for hele z0-flisen -> ohoyde/okart.pmtiles, release
  kart-omland-<hash> via .github/workflows/omland.yml (4 deler + samle), tas i bruk med bruk_omland.py (OMLAND_TAG, bare /norge).
  Omlandets farger ganges med OMLAND_LYS = 0,8 (målt mot Norge-kartet), vann får ikke skygge. Visningen: vekt() = 1 inne i Norge-blokkene (manifestets norge_blokker), tones ned de siste TONING = 12 km mot blokker uten
  Norge-data; farge = Norge·w + omland·(1−w), høyden fylles fra omlandet der Kartverkets mangler (Sverige), trær tones ut.
  Spillreglene (lagVindu) bruker fortsatt bare Norge-høyden. Vest for X0 (Shetland, Storbritannia) finnes ikke fliser: vises som hav.
  Lokal test av /norge med ekte data: se /tmp-skriptet i økten (Playwright med proxy, /api/kart videresendt til riksbrudd.vercel.app).
  JERNBANE OG VEGER I NABOLANDENE (8. nov): pipeline/fliser/utveg.py (OpenStreetMap, ODbL) -> utveg.pmtiles (MVT z5–z11, lag veg
  {k: E/R/F/K, n: 1 = Norge} og bane {t}) via .github/workflows/utveg.yml (kjøres ved push av utveg.py/utveg.yml på grenen, eller
  manuelt) -> release kart-utveg-<hash>, bruk_utveg.py (UTVEG_TAG). Visningen: Norges hovedveger fra OSM bare på z5–z7, fra z8
  NVDB (n = 1 hoppes over); jernbane (VIS.bane, «Jernbane» i ☰) som mørk strek med lys stiplet kjerne.
  VEST (Storbritannia, Shetland, Irland, Færøyene, Island): ligger vest for flisnettet, derfor ett bilde
  site/dovre-fliser/data/vest.webp (500 m, skygge og farger bakt inn) fra pipeline/fliser/vest.py; tegnVest() under flisene.
  Geofabrik er stengt fra økt-maskinen (proxy) – OSM-uttrekk lastes bare ned i GitHub Actions.
  VEGNETT (S1, 8. nov): pipeline/fliser/vegnett.py (NVDB 1. juni 2023) -> vegnett.bin RBVEG002 (kolonner, 25 MB gzip) via
  .github/workflows/vegnett.yml (tester + nasjonal bygging ~70 min + budsjett 30 MB) -> release kart-vegnett-<hash>.
  site/dovre-fliser/spill/vegnett.js (uten DOM): les/last, rute (A*), sperr/åpne, infraLenker/infraPåLenke. Tester:
  python3 pipeline/fliser/test_vegnett.py og node pipeline/fliser/test_vegnett.js [vegnett.bin]. Detaljer: spill/VEGNETT.md.

