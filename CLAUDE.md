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
LORE OG KJERNE (9. nov, egen chat): Norge har kollapset etter korrupsjon og en oppdiktet pandemi («Grålungen»); hver spiller lager
sin egen fraksjon og karakter, starter med 100 mill. kr (Kronekrakket, marked som flytter seg, inflasjon), bygger leir med
KONTROLLROM (kart ovenfra, kamerafeeds, radio fra lagene), kameraer/vakttårn, første- og tredjeperson, 1–5 spillere, mild vinter.
Les docs/plan-kollaps.md (faser K1–K9, åpne spørsmål). Den erstatter lore-en fra 1986 og bygger videre på plan-gjeng.md.
NY RETNING (10. nov): spillet handler om din egen semi-lovlige militærgruppe («gjeng») med medlemmer, leir og oppdrag i
utlandet – de politiske fraksjonene erstattes av gjenger. Les docs/plan-gjeng.md (faser G1–G6, åpne spørsmål).
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
  KJØRETØY (S2, 9. nov): spill/kjoretoy.js (regler, ingen DOM) + spill/kjoretoy-visning.js (kart, panel, KROKER inkl. ny
  KROKER.tegn3d). Vegnettet lastes ved første ordre (VEGNETT_TAG i kjoretoy-visning.js; /api/kart slipper nå .bin og .bin.gz).
  Test: node pipeline/fliser/test_kjoretoy.js [vegnett.bin]; sjekk.js laster vegnettet ned én gang (VEGNETT_DIR).
  Dovre-piloten: bakgrunn og manglende data er mørke (ikke hav) – havblått bare på /norge (NORGE_BLOKKER).
  VEGER NÆR (9. nov, brukeren: «gul midtstripe og hvite kantlinjer»): fra z14 tegner vegerRealistisk() asfalt med skulder, hvite
  kantlinjer (E/R/F), gul stiplet midtlinje 3+9 m (K/F/R/E) og grus (P/S); bredde etter kategori (VEGBREDDE). Lenger ute: kartfargene (VEG).
  TID (9. nov, brukeren): 1× er SANNTID – 1 spillminutt = 1 minutt (tid i spillminutter, TIME = 60 per spilltime; løkken gir
  sim() små steg hver ramme, maks 0,1). 10× og 60× som før; sjekk.js bruker tempo 3600 for marsjtesten.
  LOGO (9. nov): brukerens logo uten riksvåpen og årstall -> site/logo/ (riksbrudd-logo*.webp/png, emblem.png, ikon-32/180/192/512,
  deling-1200x630.png) og site/favicon.ico; forsiden viser logoen på et lyst papirkort. Den eldre logoen med riksvåpenet brukes
  IKKE (riksvåpenet krever tillatelse – brukeren valgte å vente).
  YTELSE (9. nov, brukeren: «ikke hakkete å zoome/pane»): kartflisene lages i site/dovre-fliser/kartflis.js (uten DOM; KF-objektet
  får kartfilene/innstillingene fra siden) og kjøres i bakgrunnstråden kartflis-arbeider.js (lagFlis/forhent på siden; tråden
  svarer med ImageBitmap + høyder). Uten OffscreenCanvas (eldre Safari) lages de på siden som før («eldre iPhone» i sjekk.js).
  flisData() henter alle lagene til en flis samtidig, og data for alle synlige fliser bestilles straks (køen bare for regning).
  Målt: 0 rammer over 50 ms ved draing/zoom (før 13–23), første bilde nær 0,8–1,4 s (før 2,1 s). versjon.py merker kartflis*.js.
  sjekk.js sjekker syntaksen i alle skriptfilene (node --check).
  HUS (9. nov): husomriss() i kartflis.js – saltak (møne langs lengste side, lys/skyggeside) for bolig/uthus/landbruk og små
  bygg, flate tak med brystning og takhus for store; fargene per bygg fra TAKFARGER/VEGGFARGER (frø = byggets nummer).
  hus3d(): saltak med gavler og veggfarger når omrisset er rettvinklet, ellers flatt tak.
  OLJEØKONOMI (S3, 9. nov natt): spill/okonomi.js + okonomi-visning.js – se docs/plan-funksjoner.md (S3). Kolonner med
  k.oppdrag kjøres av økonomien (kjoretoy-visning hopper over dem); KJ_PANEL/KJ_TEKST lar moduler utvide kjøretøypanelet.
  Oljeterminalene (INFRA.olje type 3) beholdes også på Dovre-siden. sjekk.js flytter kolonnen og basen bort i bytesten.
  FORSYNING (S4, 9. nov natt): spill/forsyning.js + forsyning-visning.js – se docs/plan-funksjoner.md (S4). Nye kroker i
  index.html: KROKER.ild (faktor for treff per skytter) og KROKER.lagTekst (linjer i lagpanelet). Oppdrag med type
  ('forsyning') kjøres av sin modul; okonomi.js lar dem være.
  ØDELEGGELSE (S5, 9. nov natt): spill/odeleggelse.js + odeleggelse-visning.js – se docs/plan-funksjoner.md (S5). Tilstanden i
  INFRA_TILSTAND (Map 'lag:id'); nye kroker KROKER.lagKnapper (lagpanelet) og KROKER.info (infrastrukturpanelet). Ingeniørlag har
  s.ingeniør = true (nyttIngeniørlag). bruer3d lager gap i midten av sprengte bruer.
  FLERE ENHETER (S6, 9. nov natt): spill/enheter.js + enheter-visning.js – se docs/plan-funksjoner.md (S6). Stridsvogn,
  rakettartilleri og radarbil er kjøretøytyper (Enheter.KJORETOY legges inn i Kjoretoy.TYPER); droner i DRONER. Nye kroker
  KROKER.ser og KROKER.tåke i index.html, BASE_PANEL i okonomi-visning.js.
  TETTSTEDER (S7, 9. nov natt): spill/garnison.js + garnison-visning.js – se docs/plan-funksjoner.md (S7). Eierskap i
  TETTSTEDER (Map tettsted-id -> { eier, inntar }); kraftverk saboteres med S5-reglene (INFRA_TILSTAND 'kraft:id').
  FRAKSJONER OG AI (S8, 9. nov natt): spill/fraksjoner.js + fraksjoner-visning.js – se docs/plan-funksjoner.md (S8). Riksrådet
  (blå, spilleren), Kystalliansen (rød) og Folkefronten (grønn); AI-lag har s.ai. window.AI.på slår AI-en av (sjekk.js gjør det
  før de andre testene). sidefarge(side, 'farge'|'lys'|'sti') i index.html.
  FELTARBEID (S5 del 2, 9. nov natt): spill/feltarbeid.js + feltarbeid-visning.js – skyttergraver (s.nedgravd, vern via KROKER.ild)
  og minefelt (MINEFELT). Skade på kjøretøy (S6 del 2): Enheter.skad / window.skadKjoretoy.
  DAM OG FLOM (S5 del 3, 9. nov natt): spill/flom.js + flom-visning.js (FLOMMER, FLOM.slippUt/rammer); KROKER.ødelagt.
  HJELP (9. nov natt): spill/hjelp.js – «Slik spiller du» bak ?-knappen. Oppdater DELER der når nye funksjoner kommer.
  3D REALISTISK (10. nov, brukeren: «mer realistisk og finere i 3D»): himmelkuppel og dis i himmelfargen (luftperspektiv), sol og
  himmel etter klokka i spillet (lys3d, solHøyde: opp ca. 05:20, 40° kl. 13:30, ned ca. 21:40), halvkulelys + sol, terrengnett
  449×449 på PC (353 på mobil), ingen høydeoverdrivelse (EX 1), lys per punkt (Phong) med glans bare på vann (vannmaske),
  3D-kartet uten høydekurver og flate tretegn og i litt friskere farger (naturfarger), 3D-trær (trær3d: gran og løvtre som
  instanser i skogrutene, ikke på veg/hus/vann, glisnere mot tregrensen; maks 48 000 PC / 22 000 mobil, når utsnittet S ≤ 4200).
  sjekk.js sjekker nå også syntaksen i hovedskriptet i index.html.
  3D ENDA FLERE DETALJER (10. nov): steiner og busker (smått3d: snaufjell/hei/myr/snø, maks 34 000 PC / 14 000 mobil, S ≤ 2200),
  takutstikk og pipe på boliger, grå grunnmur, kjøretøyene som 3D-modeller (kjøretøy3d hver ramme: kasse/førerhus/hjul, stridsvogn
  med tårn), skyer (skyTekstur på en kule inne i himmelkuppelen, driver med tiden, farget av lys3d). VAKT: sjekk.js krever at 3D
  faktisk tegner (renderer.info: bilder > 2, trekanter > 1000) – en kommentar slukte render-kallet 10. nov uten syntaksfeil.
  Skriv aldri en kommentar midt i en lang linje med flere setninger: legg kommentaren på egen linje over.
  GÅ SELV (10. nov, brukeren: «gå der nede selv i førsteperson»): spill/gange.js – knappen «Gå» (bare i 3D) setter deg i øyehøyde
  (1,7 m) der kameraet så eller ved valgt lag; PC W/A/S/D/piler + dra for å se + Shift løper (1,6/7 m/s), mobil styrespak nede til
  venstre. Kroker: kamera3d() bruker Gange.kamera når R3.fot er satt; styringen i 3D sender pekerne til Gange.peker først.
  R3 er en let (ikke window.R3) – bruk typeof R3. Ingen kollisjon med hus/trær ennå, og du kan gå på vannet.
  ENDA FLERE DETALJER (10. nov): gatelys (gatelys3d: vegene E/R/F/K fra vektor z13, hver 38. m inne i tettstedene, arm inn
  over vegen; hodet lyser om kvelden via R3.lyktMat i lys3d), parkerte biler ved ca. halvparten av boligene (hus3d -> biler,
  BILFARGER), gress (gress3d: kryssede gresstuster rundt kameraet i bakkens farge fra bunnkart, bare når du går eller er under
  110 m; flyttes når du har gått 12 m), lysere sommernatt (halvkulelys minst 0,42).
  MER ENN RUNESCAPE (10. nov, brukeren: «litt mer detaljer enn runescape»): graner med fem lag taggete grener og bjørker med syv
  klumper på PC (enklere på mobil), husene i tre grupper (hus3d -> deler.mur/tre/tak): trekledning med vindu (treTekstur) på småhus,
  takstein (takTekstur, en rad per 0,4 m) på saltak, betong/vindu på store bygg; flaggstang med norsk flagg ved ca. 22 % av boligene
  (flaggTekstur), biler med hjul, ruter, tak, frontlys og baklys (småting 'bil', samle() slår sammen geometrier), soldatene som
  3D-figurer (soldater3d hver ramme: bein, jakke i sidens farge, hode, hjelm, gevær; formasjon som i kartet, sårede kneler, falne
  ligger; tåka gjelder). InstancedMesh med count 0 ved start: lag instanceColor selv (setColorAt lager den i størrelse count).
  LIV, GATE OG SKOG (10. nov, brukeren: «går gjennom bygninger», «mer liv», «tydelig forskjell på gate og skog»): hindring3d(x, y)
  (husomrissene + trestammene i et rutenett på 20 m, R3.hindre) stopper deg i Gange (glir langs vegger). Skogbunnen er mørk
  mose/lyng (skogmaske + skogbunn i bygg3d; bunnkart klasse 2 = skog: lav blåbærlyng i stedet for gress). spill/liv3d.js: ekte
  veger i 3D (vektor z13, bånd som følger terrenget, asfalt med kantlinjer og gul midtlinje på E/R/F, hjulspor på K, grus på P/S),
  fortau 2 m med kantstein langs R/F/K i tettstedene, biltrafikk (32 PC/12 mobil, høyre kjørefelt, snur i enden), folk på fortauene
  (45/16), tre fugleflokker, røyk fra pipene (Points), vind i trærne (onBeforeCompile, instanceMatrix gir takt per tre).
  Nye kroker: KROKER.bygg3d (async, med px/TW/skog), KROKER.sett3d (u, R3), KROKER.ramme3d (R3). THREE finnes først når 3D er
  åpnet – ikke bruk THREE når et skript lastes.
  VEGER 3D BEDRE (10. nov, brukeren: kantete svinger, dobbel/feil plass, for lite detaljer): Chaikin-utjevning ×2 og punkt hver
  2,5 m; kartvegene tegnes ikke i 3D-overflaten når S ≤ 2200 (valg.veg); grusskulder 0,8 m utenfor tettsted, rekkverk (stolpe hver
  4 m + skinne) langs E/R, brøytestikker med oransje topp hver 25 m på begge sider (vegutstyr i liv3d.js).
  BYGGTYPER (10. nov, brukeren: «se hvilken type bygg – industri, butikk, hus», «liker ikke at noen bygg bare er vinduer»): byggjobben
  (bygninger.py) gir nå t 0 bolig, 1 uthus, 2 næring/kontor/hotell, 3 offentlig, 4 landbruk, 5 annet, 6 industri/lager, 7 butikk,
  8 kirke, 9 skole/barnehage, 10 leilighetsbygg, 11 hytte (gamle data: bare 0–5, type 2 anslås fra størrelse/høyde). hus3d: klasse()
  og STIL gir egen fasade per type (grupper/teksturer mur, tre, leil, kontor, industri, planke, butikk, kirke, tak, dør i byggTekstur):
  trekledning, balkong i annethvert felt, kontorvinduer med etasjebånd, blikk med vindusbånd, planker uten vinduer, utstillingsvindu
  og skilt, buevinduer + kirketårn med spir; dører/porter (DØR); flate tak med brystning og ventilasjonshus. Trykk på et bygg (2D når
  kam.m < 4, og i 3D) viser typen, høyden og grunnflaten (finnBygg/visByggVed, BYGGTYPE). kartflis.js: farger og saltak for 6–11.
  FLERE BYGGTYPER (10. nov): t 12 lager, 13 sykehus, 14 flyplass (terminal/hangar); bygg med bare building=yes får typen fra
  amenity/shop/aeroway/office/craft/tourism (type_fra_merker i bygninger.py). 3D: lager (sandwichpaneler, flere porter), sykehus
  (rødt kors på veggen, helikopterplass på store tak), hangar (blikk, kjempeport), terminal (glassfasade); dørteksturen har 6 felt.
  2D: byggmerke() på taket fra z15 (kirke kors, sykehus rødt kors, flyplass fly, skole bok, butikk pose, industri/lager tannhjul).
  VEGKRYSS (10. nov, brukeren: «ordentlige vegkryss»): finnKryss i liv3d.js – vegender innen 3 m eller en ende midt på en annen
  veg (T-kryss), minst tre armer og minst to på skrå (parallelle kjørebaner er ikke kryss). Krysset får en flate uten oppmerking
  (asfalt, eller grus når bare P/S møtes) som følger terrenget; fortau, rekkverk og brøytestikker stopper ved krysset (kryss.nær),
  fotgjengerfelt (gangTekstur) på R/F/K-armene i tettstedene. u.kryss har kryssene.
  VÆR OG ÅRSTIDER (10. nov, brukeren valgte det): spill/vaer.js (regler, test_vaer.js) + vaer-visning.js. ☰ «Årstid» og «Vær»
  (automatisk/låst), status øverst (sVaer). window.VAER: sikt (faktor i oppdaterSikt), dis (fog i ramme3d), sky (lys3d), nedbør,
  snøgrense, høst. VAER_U (uniformer i detaljIBakken): snø over snøgrensen på flatt terreng, høstfarger; trærne via treVær.
  Regn (LineSegments) og snø (Points) rundt kameraet. sjekk.js låser klart vær. VAKT: GLSL tåler bare ASCII – aldri æ/ø/å i
  navn inne i shaderkode (uSno, ikke uSnø); sjekk.js fanger kompileringsfeilen («FEIL i nettleseren»).
  BUTIKKJEDER OG ANLEGG (11. nov, brukeren: «en Kiwi blir en grønn butikk som heter Pære», fotballbaner): byggjobben gir k = kjede
  (KJEDER i bygninger.py, fra brand/name/operator på bygget eller et butikkpunkt inne i bygget; punktene i en egen liten fil
  punkt.osm.pbf) og et nytt lag «anlegg» (z13: a 1 fotball, 2 tennis, 3 annen ballbane, 4 løpebane, 5 lekeplass, 6 parkering).
  Test: python3 pipeline/fliser/test_bygninger.py. BUTIKKER i kartflis.js (oppdiktede navn og farger, samme nummer som KJEDER).
  2D: anlegg() i kartflis.js (gress med klipperstriper og oppmerking skalert etter lengden), kjedeskilt på taket (byggmerke).
  3D: veggene i kjedens farge og skilt med navnet over døra (skilt3d/skiltTekstur), mål med nett, lysmaster og basketkurver
  (spill/anlegg3d.js). Trykk på bygget viser kjedens navn.
  RASKERE ARBEID (11. nov, brukeren: «oppdateringer tar lang tid»): sjekk.js kjører PC, mobil og eldre iPhone samtidig (~1,5 min);
  SJEKK_PROFIL=PC kjører én profil.
  TAK OG RUNDE BYGG (11. nov, brukeren: for mange flate tak, låver, kirker 90 % fall, «ikke alle hus er perfekte firkanter», runde bygg =
  tank nær industri / fyr nær havet, aldri to fyr nær hverandre): harFall(t, areal, h, i, tett) i kartflis.js (tett = naboer innen
  100 m; fast per bygg via hash), takDeler(P, f): vinkelrette omriss -> rektangler med hvert sitt saltak (kryssark), ellers valmtak mot
  mønet bare når omrisset er nesten konvekst (≥ 0,88 av skallet, ≤ 16 hjørner), ellers null = flatt. rund(P, f): 4πA/O² > 0,85.
  3D (hus3d): tank (lyst blikk, lav kjegle), fyr (hvitt med rødt bånd, lykt med rød hette; hav = terreng < 2 moh. innen 80 m; 1,5 km
  mellom fyr). 2D (husomriss) bruker de samme reglene.
  FLYPLASSER (11. nov, brukeren: «landingsstriper må se penere ut»): byggjobben gir anlegg a 7 rullebane (linje + bredde -> flate,
  r = banenummer «01/19»), 8 taksebane, 9 oppstillingsplass. rullebane() i kartflis.js: kantlinjer, midtlinje 30+20 m, terskelstriper,
  banenummer lest av den som lander, landingssone og siktepunkt. 3D får det gjennom kartet i bakken.
  YTELSE 3D (11. nov, brukeren: «kjappere, ikke hakkete»): målt 1,9 mill. trekanter (trærne 1,4). Nå detaljnivå på trærne
  (lodTrær: nær 260 m PC / 170 m mobil med alle greinene, ellers granEnkel/løvEnkel; halvparten fra 6×, en firedel fra 12× den avstanden), terrengnettet tett i midten og glissere mot kanten (sett3d: M = 289 PC / 225 mobil, g(t) = t·(A + (1 − A)·t²)), ca. 0,7 mill. nær / 0,43 mill. vidt; hus3d og trær3d gir
  nettleseren pusterom (pusterom()) under byggingen. Skjermbilder: scratchpad bilde3d.js (kartflisene på siden – forespørsler fra
  bakgrunnstråden henger i Playwright når siden har ruter; første 3D-utsnitt = ønsket utsnitt; byggdata hurtiglagres på disk).
  OPPSTART K1 (11. nov, brukeren, docs/plan-kollaps.md): spill/oppstart.js (regler: karakter, fraksjon med eget flagg, 100 mill. kr,
  gyldigLeir, lagring; test_oppstart.js) + oppstart-visning.js (startskjerm i tre steg, leir velges med KROKER.trykk, lagres i
  localStorage «riksbrudd-k1», fraksjonen tar over «blå»: navn/farge i Fraksjoner.FRAKSJONER.blå, basen OLJE.BASER[0] og lagene
  flyttes til leiren; sPenger øverst; 3D-flagg med MODELLER.flaggstang). Bonusene via KROKER.sikt (ny) og KROKER.ild (> 1 gir
  ekstra treff). Startskjermen vises ikke av seg selv når navigator.webdriver (testene) – sjekk.js kjører den selv (OppstartSpill).
  INFRA er en let i index.html (ikke window.INFRA) – bruk typeof INFRA. Portrettet: spill/portrett-motor.js (brukerens Karakterstudio v3,
  RiksbruddPortrait.normalize/renderSVG, uendret); O.portrett() renser valgene, startskjermen viser SVG-en som bilde (data:-adresse).
  BENSINSTASJONER (11. nov, brukeren: «legg til bensinstasjoner hvor de er i dag»): byggjobben gir lag «punkt» (z13, p 1 =
  amenity=fuel som punkt eller midten av området, k = kjede; 2177 stasjoner). 2D: bensin() i kartflis.js (pumpemerke i kjedens farge).
  3D: bensinstasjon() i spill/anlegg3d.js – tak, pumpeøyer, skiltstolpe med navn (skiltTekstur); langs nærmeste veg (u.veger), og
  flyttes langs vegen til taket ikke går inn i et bygg (u.hus.omriss).

