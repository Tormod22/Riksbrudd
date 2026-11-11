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
  LEIREN K2 (11. nov, brukeren, docs/plan-kollaps.md K2): spill/leir.js (BYGG med pris, tid i spilltimer, kW, fot; kanBygge med
  overlapp/vann/hus, steg() for byggetid, strøm og drivstoff; test_leir.js) + leir-visning.js (knapp «Leir», byggemeny, plassering med
  KROKER.trykk og ny KROKER.trykk3d, kart og 3D, sStrom øverst, lagres «riksbrudd-k2»). Pengene via OppstartSpill.betal; K1 sender
  hendelsen «riksbrudd-spill» når spillet er klart. 3D: modellene fra spill/modeller.js + egne (aggregat, solcelle, kameramast,
  radiomast, drivhus) i leir-visning.js; trær/steiner ryddes i byggene (bygg3d-krok og ryddTrær for nye bygg).
  KONTROLLROMMET K3 (11. nov, brukeren, docs/plan-kollaps.md K3): spill/kontrollrom.js (regler, test_kontrollrom.js) +
  kontrollrom-visning.js. Karakteren er et ENHETER-lag med én mann og s.karakter = true. Modus kontrollrom/nettbrett/ute styrer
  KROKER.innsyn (synlig() for fiender), KROKER.skjul (egne lag tegnes «sist meldt» i 2D) og KROKER.kanOrdre (ingen ordre uten
  radiokontakt). Radiokontakt med høydeprofil i 128 m-ruter (lagVindu ZV 7) og jordkrumning. Skjermen #kontrollrom (radio, feeds;
  feed = Gange ved laget). KontrollromSpill.av() slår reglene av (sjekk.js gjør det etter K3-testen). 3D viser fortsatt alt.
  BEDRE BYGGESYSTEM (11. nov, brukeren, docs/plan-kollaps.md): leir.js versjon 2 (nivå, hp, materialer/lager, jobber/byggelag/kø,
  riv/flytt/oppgrader/skade/reparer, festTilGjerde/gjerdeLedd, effekt(b), virker(b) ≠ ferdig(b); fraJSON gjør om versjon 1) og
  leir-visning.js (byggpanel, skisse3d, rutenett, gjerde3d per 10 m med helning). OppstartSpill.gi (penger tilbake). Kontrollrommet
  bruker Leir.virker og radiomastens nivå. spill/fps.js: FPS-teller (sFps, av/på i ☰, window.FPS).
  BEDRE GANGE (11. nov, brukeren: «bedre movement-system for første person»): spill/bevegelse.js (regler uten DOM, test_bevegelse.js):
  myk akselerasjon/bremsing, gå 1,7 / løp 5,5 / huk 0,9 m/s, utholdenhet (12 s løp, 6 s hvile), hopp med tyngdekraft, motbakke tregere og
  stopp over ca. 40°, ikke i vann (vannmasken u.vann lest én gang per utsnitt), kropp med radius 0,3 m som glir langs hindringer, gynging.
  gange.js bruker den: mus låses med klikk (pointer lock), Shift/mellomrom/C, mobil styrespak + knappene Hopp/Huk, sikte, utholdenhetsmåler,
  litt større synsfelt når du løper (kameraets fov settes tilbake til 50 når du flyr opp). Hoppet huskes til neste ramme (hoppVent).
  FILTRE I 3D (10. nov, brukeren: «10 forskjellige filter/kamera-linse-forslag … pikselert, grain osv.»): spill/filtre.js henger seg på
  KROKER.bilde3d: scenen tegnes til en WebGLRenderTarget (multisample i WebGL2; med DepthTexture for Varmesøker og Tegneserie; Piksel
  rett i lav oppløsning 200/170 px høy) og så en fullskjerm-firkant med filterets shader. Ti stiler + «Ingen» (kroken svarer false, ingen
  kostnad): Piksel (16 farger, Bayer-raster), Filmkorn, VHS-kamera, Nattsikt, Varmesøker, Tegneserie (konturer fra laplace av 1/z),
  Akvarell, Sepia 1940, Kald nordisk (bleach bypass), Miniatyr (tilt-shift). Akvarell og Miniatyr tegnes i 0,75 oppløsning på mobil.
  Tekst i overlegget (KROKER.tegn3d): tidsstempel på VHS, sikte på varmesøkeren. Knapp «Filter: …» i ☰ blar, valget i localStorage
  «riksbrudd-filter»; window.Filtre.velg(id). info.autoReset slås av under filteret så trekanttelleren gjelder scenen. VAKT i sjekk.js:
  hvert filter tegnes, gl.getError() = 0, punkter lest med readPixels er ikke svarte/ensfarget.
  KOMPASS OG MINIKART (10. nov, brukeren: «bygg bedre UI med kompass og evt. minikart»): spill/kompass.js (reglene øverst uten DOM,
  test_kompass.js). Kursen = −yaw (kameraet ser mot (−sin yaw, cos yaw), nord = +y; R3.fot.a når du går). I 3D: kompassbånd øverst midt
  på (canvas #kompass: hvert 5°, N/NØ … og 015/030, kursen i en tavle, merker for leiren, valgt lag og nærmeste synlige fiende, ved kanten
  med pil når de er utenfor), minikart (#minikart: PC nede til høyre ved +/−, mobil over knappene til høyre) fra R3.texC (samme kart, tåke
  og siktfelt som 3D-overflaten), roterer med kameraet eller nord opp (knappen på kanten, huskes), lag/kjøretøy/leir/synsfelt, trykk = 2D-kartet
  der. 2D: nordpil (#nordpil) over målestokken. «Kompass»/«Minikart» i ☰ (localStorage). Kompass.midt() gir det båndet viser (VAKT i sjekk.js:
  N/Ø/S i lufta og når du går, minikartet tegnet, ☰ av/på). Også: --topp følger statuslinja (ResizeObserver), mobil: loggen under båndet,
  mindre kildetekst, målestokken over kildeteksten.

  DAG, NATT OG VÆR (10. nov, brukeren: «lag dynamisk dag/natt-system, samme med vær»): spill/vaer.js blander været mykt (blandet():
  overgang 45–90 spillminutter, S.fra/start/varighet; låst vær fra menyen kommer straks i reglene), regn/snø som mengde 0–1, vind (fart,
  retning) som skifter sakte, våt bakke (S.våt, tørker på ca. 2,5 t), dalTåke om morgenen (årstidens fukt), torden ved kraftig regn,
  månen (måneFase/måne: år 2023, fase etter dato = årstidens dag + dagNr), mørke(e), vinduAndel(time), nordlys (noen klare netter i den
  mørke årstiden). vaer-visning.js: window.VAER.regel = reglene, mens sky/dis/regn/snø/våt/dalTåke er en glattet kopi (ca. 1,5 s)
  for 3D; VaerSpill.straks() hopper over glattingen (tester/skjermbilder). spill/natt3d.js (KROKER.lys3d – ny, kalles sist i lys3d –,
  sett3d, ramme3d; window.NATT): stjerner (Points, dreier om himmelpolen), måne med fase og blått månelys (sol-lyset flyttes til månen
  om natta), sol-skive med glød, varm himmel nær sola og rosa belte motsatt, nordlys-bånd mot nord, lyn, skyskygger og våt bakke/pytter
  (bakkeshaderen utvides i sett3d), lyse vinduer (glasspikslene i husteksturene, uniform uVindu/uAndel), lysflekker under gatelysene,
  tåkebanker (sprites) i dalbunnen. liv3d.js: bilene har front-/baklys og lyskjegle om kvelden. lys3d går nå hvert spillminutt med
  mykere overgang (dag fra −8° til 8°); skyene dreier med vinden (R3.skyVri). Himmelobjektene ligger på kuppelen innenfor skyene (0,97).
  DYR I 3D (10. nov, brukeren: «Norge i 3D mer realistisk og levende»): spill/dyr.js (regler uten DOM, test_dyr.js) + spill/dyr3d.js
  (KROKER.bygg3d/sett3d/ramme3d, bare når S ≤ 2200). Sau (5–30, hei/snaufjell/myr under 1400 moh. + innmark nær gårder, sommer og høst),
  kyr (innmark nær gårder, sommer), villrein (flokker 18–60 over 1100 moh., hele året), moskus (3–8, 950–1700 moh. i boksen
  x 198000–216000, y 6912000–6930000 rundt Snøhetta/Kongsvoll – boksen er Claudes anslag) og sjelden elg i skogkanten. Flokkene står fast
  per blokk i kartet (Dyr.flokkIBlokk: hash av art og blokk), nærmest midten først til taket PC 400 / mobil 150; årstiden (VAER.årstid)
  velger hvilke som vises (velg() på nytt når den skifter). Dyr.steg: beite (står, hodet ned), gå mot flokken/målet, løp unna når du går
  nær (Gange.kropp(); flukt sau 28 m, rein 170 m, halvparten på huk) eller ved skudd (SKUDD, minst 300 m). Ikke i vann, på veg/asfalt
  (u.dyrMaske 1024², fra kartet + u.påVeg), i tunet (husomriss + 6 m), i trær (hindringer(u)), i bekker (u.iBekk) eller i bratt ur. Én InstancedMesh per art
  med hjørnefarger; beina svinger og hodet senkes i vertex-shaderen (aGang = fase, gange, hode; aPels = hvor mye dyrets farge virker).
  Ca. 150–480 trekanter per dyr. window.Dyr3d (punkter, antall, prøvShadere); Vakt3d.sjekk(u, årstid) teller dyrene (i hus, svever, i vann).
  VAKT i sjekk.js: sauer på heia ved Dombås om sommeren, ingen om vinteren, rein ved Snøhetta om vinteren, ingen dyr i hus/vann/svevende.
  TRESLAG OG BLOMSTER (10. nov, brukeren: «legg til blomster og flere forskjellige tresorter»): spill/vegetasjon.js (regler uten DOM,
  test_vegetasjon.js) + spill/vegetasjon3d.js. Kartdataene sier bare «skog» (ingen AR5/SR16), så treslaget velges etter regler: høyden mot
  tregrensen (Vegetasjon.tregrense(y): 1100 m på Dovre, lavere nordover), helning, avstand til vann (vannmasken), myr og hei rundt (32 m-klassene).
  bygg3d-kroken fordeler trærne fra trær3d på u.trær.{gran, furu, løv (bjørk), osp, rogn, fjellbjørk, selje, einer} (samme antall; aldri i
  vannmasken) og setter einer/vier/fjellbjørk på åpen mark (maks 4000 PC / 1500 mobil, S ≤ 2200). Alle som leser u.trær skal gå over alle
  nøklene (hindringer, liv3d og leir-visning gjør det). sett3d-kroken lager de seks nye slagene med detaljnivå i R3.treLOD (lodTrær) og eget
  materiale (vind, høstfarge per treslag, nakne løvtrær om vinteren, snø; bladene = grønnere enn rødt, så stammer og rognebær ikke farges).
  Rundt kameraet (som gresset, avst < 110 eller Gå): blomster (smørblomst, løvetann, hvitkløver, prestekrage, blåklokke, røsslyng, geitrams,
  skogstjerne etter sted eng/hei/skog/veikant og årstid, ingen om vinteren), bregner i skogen og siv i vannkanten; u.vegKart (512²) sier hvor.
  window.Vegetasjon3d (treslag, antall, utvalg, iVann) brukes av VAKTEN i sjekk.js: minst tre treslag ved Jora bru, ingen trær/planter i vann
  eller på veg.
  BEKKER (10. nov, brukeren: «legg til bekker hvor det skal være det»): pipeline/fliser/bekker.py henter NVE Elvenett (ELVIS, NLOD,
  kart.nve.no svarer herfra; Overpass og nve.geodataonline.no gjør ikke) for Dovre-området -> site/dovre-fliser/data/bekker.json
  (0,7 MB, heltall i meter, delta-kodet; ElvBekk = bekk, ElvBekkMidtlinje = bred elv, Strahler-orden; innsjømidtlinjer hoppes over).
  Kulvert: bekker med orden ≤ 3 kuttes der de krysser en veg (data/fliser/veger.json, vegbredde/2 + 1,5 m); større elver går under bru.
  Regler uten DOM i spill/bekker.js (les, i, bredde, fall/skum; test_bekker.js sjekker også datafila og kulvertene), visningen i
  spill/bekker-visning.js: 2D (KROKER.tegn) blå streker, små bekker først nær (minOrden etter kam.m); 3D (KROKER.bygg3d) maler
  vann og våt kant i bakken (ikke i u.vann: den stopper gange), fjerner trær/busker/gress i bekken (u.iBekk, før hindringer() bygges), og ved
  S ≤ 2200 et vannbånd (5 punkt på tvers: steinkant, vann, steinkant; bredden varierer) som følger terrenget, rennende krusning,
  himmelspeiling og skum der det er bratt (KROKER.sett3d/ramme3d, R3.bekkMesh). DATA_V i bekker-visning.js = sha256 av bekker.json
  (8 tegn) – sett ny etter bekker.py. Hele Norge: se BEKKER OG KRAFT I HELE NORGE (data/bekker.json er nå reserven). VAKT i sjekk.js:
  bekkene lastes, tegnes i 2D, og båndet ligger 0–1 m over terrengnettet (raycast) ved Dombås.
  BRUER OG FERJEKAIER I 3D (10. nov, brukeren: «bruer skal se pent ut i 3D, ferjekaier skal se realistiske ut»): spill/bruer.js (regler uten DOM,
  test_bruer.js: finnLinje – brua følger vegen i vektorflisene z13 og forlenges til NVDB-lengden når geometrien er kortere, profil – dekket
  minst 1,1 m over terrenget, velgType plate/bjelke/bue/henge/fagverk, søyler, bue, kaiRetning/vannkant) + spill/infra3d.js (KROKER.bygg3d og
  sett3d; bruer3d i index.html gir bare { antall } når Infra3d finnes). Bru: asfalt med oppmerking, kantbjelke, rekkverk, kassebjelker,
  landkar med vingemurer, søyler (to runde + tverrbjelke) ned til laveste terreng under foten − 0,4 m, buebru med søyler på buen, hengebru med
  tårn der fjorden begynner, kabler og hengestenger, jernbanebru i stål-fagverk; sprengt bru (INFRA_TILSTAND) får gap, hengende dekkender og
  betongbiter. Vegene i liv3d.js som går over brua løftes opp på dekket (bilene bruker vegens z), i gapet tas de bort, og vegbiter som går
  > 30 m over vann (ferjesambandene ligger i vegnettet) fjernes. Ferjekai: retning fra ferjelinja som ender nær kaien (ellers mot mest vann),
  vannkanten fra vannmasken; kai i betong med fendere, klaff med løftetårn, ledevegger, ferje (skrog, bildekk, sidebygg, styrehus, biler),
  oppstillingsplass med felt, venterom, lyktestolper. Dovre har ingen ferjekai: testet på /norge (Mannheller) med scratchpad bruer/norge3d.js
  (/api/kart videresendt til riksbrudd.vercel.app). VAKT i sjekk.js: modellene i scenen, søyler/landkar ikke over terrenget, dekket over
  terrenget, vegene løftet, sprengt bru har gap uten veg i gapet.
  KRAFTLEDNINGER (10. nov, brukeren: «Norge i 3D mer realistisk»): pipeline/fliser/kraft.py henter NVEs kraftnett (kart.nve.no/enterprise,
  Nettanlegg5: transmisjon/regional luftledning, master, trafostasjoner; Nettanlegg4 lag 2: distribusjonsnett 22 kV; NLOD) for DOVRE til
  site/dovre-fliser/data/kraft.json (55 KB, i git): linjer {kv, n nettnivå, m = mastene i rekkefølge, e = 1 mast fra NVE / 0 lagt inn},
  trafo [[x, y, kv]]. NVE har ofte ett punkt per mastebein (slås sammen innen 15 m); mangler master, legges de i knekkpunkt og hver
  ~380/300/90 m. Test: python3 pipeline/fliser/test_kraft.py. Hele Norge: se BEKKER OG KRAFT I HELE NORGE (data/kraft.json er nå reserven).
  (nve.geodataonline.no svarer ikke fra økt-maskinen; Overpass heller ikke.) Regler uten DOM: spill/kraft.js (TYPER: portal 300/420 kV,
  stål 132, h66 H-mast i tre, h22 trestolper i H-form; nedheng L²/8C, retning, ryddebelte, utsnitt; test_kraft.js). spill/kraft3d.js:
  2D via KROKER.tegn (strek fra m < 60/30/7, mastemerker nærmere, trafostasjon), «Kraftledninger» i ☰ (VIS.kraft); 3D: KROKER.bygg3d
  rydder trær/busker i beltet (±20/15/12/5 m) og maler ryddegata (lyng) og grusen på trafostasjonen i bakken (i kroken, ikke i
  index.html: den kjører etter ryddHus og før hindringer/sett3d), KROKER.sett3d lager mastene som InstancedMesh per type (fagverk av
  stavene i mastGeo), linene som LineSegments (parabel, delliner på 300 kV, toppliner), rød/hvite varselkuler der topplina går > 60 m
  over bakken, trafostasjonen (gjerde, transformatorer, portaler, kontrollbygg); KROKER.ramme3d: røde flyvarsellys (Points) på
  portal-/stålmaster når NATT.mørke > 0,15. VAKT i sjekk.js (Kraft3d.sjekk på Dombås-utsnittet: lastet, foten innen 0,5 m, 0 trær i beltet).
  RARE TING I 3D (10. nov, brukeren: «se om det er noen plasser ting ser rart ut i 3D og fiks slik at slikt ikke skjer igjen»): ryddHus(u)
  i bygg3d fjerner trær (alle treslag), steiner, busker, biler, flagg og gatelys som havnet inne i/inntil et hus (nærHus: husomrissene +
  2 m, hindring3d med eget rutenett); smått3d setter ikke steiner/busker på grått i kartet (asfalt, parkering) utenom lys stein på
  snaufjell; steinene er rundere med lavflekker, buskene ujevne; trekronene (klump i vegetasjon3d.js) har forskjøvne hjørner. Gange.start
  leter i spiral etter et sted med 1,6 m klaring (ikke i hus/tre/vann). bakÅs(v): navn/merker i 3D bak en ås skjules (proj3). Loggen tones
  ut i 3D 10 s etter siste melding (spill/hud.js). VAKT: spill/vakt3d.js – Vakt3d.sjekk(u) teller ting i hus og svevende/begravde ting
  (sjekk.js bygger et utsnitt i Dombås og krever 0); sjekk.js sjekker også bakÅs og at «Gå» ikke starter i et hus.
  NATTARBEIDET 10. nov (parallelle hjelpere i worktrees, hver med egen PORT – server.py/sjekk.js/bilde3d.js leser PORT) ble samlet på
  grenen claude/natt-3d: filtre, kompass, natt/vær, vegetasjon, bekker, bruer, kraft, dyr og revisjonen over. Ikke publisert før brukeren
  sier «Publiser».
  PLASSERING OG PLANLEGGING (12. nov, brukeren: «bedre å plassere bygg og planlegge leiren»): leir.js – snapp(L, b, {gap 2, rad 3}) legger
  bygget inntil nærmeste bygg/skisse (side mot side med 2 m, eller kant/midte på linje) i naboens retning og gir hjelpelinjer og avstand;
  kanBygge avviser > BRATT (3 m) høydeforskjell (v.høyde = hoydeVed) og overlapp med skissene i L.plan (o.planUnntatt); planLegg/planFlytt/
  planFjern/planKostnad/byggPlan; tilMal/fraMal/planMal. leir-visning.js: «Planlegging» i Leir-menyen (blå skisser i 2D og 3D, skissepanel:
  Bygg nå/Flytt/Kopier/Fjern, «Bygg hele planen» kjøper materialene per bygg), angre/gjør om (øyeblikk av planen, Ctrl+Z/Y), maler
  («riksbrudd-maler», startMal), «Inntil naboen», «Fortsett», Kopier i byggpanelet, tastene R/Q/Enter/Esc. Se docs/plan-kollaps.md.
  BEKKER OG KRAFT I HELE NORGE (12. nov, brukeren: «få ting til å se penere ut også i hele Norge»): pipeline/fliser/nve.py henter hele
  NVE Elvenett (ElvBekk/ElvBekkMidtlinje, 1,28 mill. linjebiter, 527 000 km) og Nettanlegg (147 000 linjer, 914 000 master, 1194 trafo)
  fra kart.nve.no (svarer både herfra og fra Actions; i biter etter objectid, 8 tråder) og deler dem på blokker z7 (32 768 m, felles.py):
  bekker.json (150 MB, nivå 0 grov = brede elver og orden ≥ 5, 1 = orden 3–4, 2 = orden 1–2; median 176 KB per fin bit) og kraft.json
  (14 MB, nivå 0 transmisjon/regional + trafo, 1 = 22 kV), delta-kodet fra blokkens hjørne; manifest.json har [fra, lengde] per blokk og nivå.
  .github/workflows/nve.yml (push av nve.py/kraft.py/nve.yml på claude/norge-data, ca. 6 min) -> release kart-nve-<hash>; bruk_nve.py setter
  NVE_TAG i spill/nvebiter.js (kjør versjon.py etterpå). site/api/kart.js slipper kart-nve-. spill/nvebiter.js (NveBiter.lag: hent(bb, nivåer)
  for 3D, har() for 2D, maks 160 biter i minnet, Vercel komprimerer svarene med br) brukes av bekker-visning.js og kraft3d.js; svarer ikke
  releasen, brukes Dovre-filene i data/ som reserve. Kulvert for hele Norge kuttes i 3D mot vegene i utsnittet (u.påVeg, orden ≤ 3).
  Kraft.utsnitt slår sammen like master (en mastrekke over blokkanten tar med første mast i neste blokk). Tester: test_nve.py
  (NVE_UT=<mappe> sjekker også filene), test_nvebiter.js (falsk fetch; NVE_UT leser ekte biter for Dombås, Voss, Sogndal, Trondheim, Oslo),
  test_kraft.js. sjekk.js henter releasen én gang (NVE_DIR) og VAKTEN krever kilde «release» for begge lagene.
  BYENE I 3D (12. nov, brukeren: «få ting til å se penere ut også i hele Norge»): spill/byhus.js (regler uten DOM, test_byhus.js; teksturene
  males bare i 3D). Byhus.stil(kl, t, i, h, A, tett, enkel) gir større bygg (leil, kontor, butikk > 7,5 m, skole) en fasade: murgård (puss,
  omramming, gesims), tegl, funkis (båndvinduer), plate (nyere glass/plate), eller som før leil/kontor – etter tetthet (tett = bygg innen 100 m;
  by ≥ 25, sentrum ≥ 40) og høyde (> 30 m: plate). Hele etasjer etter høyden (MÅL: felt langs og etasjehøyde per fasade), butikkfront (gate)
  i 1. etasje på vegger som vender mot en gate (vektor z13 E/R/F/K 3–15 m rett ut) i sentrum, dempede farger (FARGER; ingen blåaktige vegger –
  natt3d.js tenner blåere-enn-rødt som vinduer; Byhus.TEX er lagt til i natt3d sin liste). Eldre bygårder i byen (murgård/tegl, 8–26 m, enkelt
  omriss) får valmtak (ca. 30°) eller mansard (bratt nedre del med takarker i teksturen «mansard», takpapp øverst); flate tak får takpapp, ca.
  14 % grønne tak på plate/funkis og 1–4 takhus med fast plass (Byhus.takhus). Kjedefarger bare i butikkfronten på bygårder (før ble hele
  bygget knallrødt/-grønt). Store bygg uten type (t 5) i tett bebyggelse regnes som bygård/kontor, ikke småhus. lokk() i hus3d gir alltid et
  tak (vifte fra midten når trianguleringen feiler). Gatetrær: kroken i byhus.js setter løvtrær hver 12. m bak fortauet langs R/F/K i
  tettstedene der det er plass (ikke i/inntil hus, på veg eller i vann; maks 1500 PC / 500 mobil). hus3d gir u.hus.stat (fasader, tak, utenTak,
  gate). VAKT i sjekk.js: Dombås har minst fem fasader (minst én fra Byhus), 0 bygg uten tak, og alle Byhus-teksturene har vindusglass.
  Målt i Oslo/Bergen/Trondheim: + ca. 7 % trekanter totalt (husene + ca. 14 %).
  TUNNELPORTALER (12. nov, brukeren: «legg til flere detaljer i hele Norge»): spill/portal3d.js (KROKER.sett3d) – i begge ender av hver
  tunnel i INFRA.tunnel (o.deler) en portal i betong: vegg på tvers med gesims, mørk buet åpning og en 5 m kappe (halvt rør, mørk inni);
  retningen ut av tunnelen er bort fra neste punkt; gang- og sykkeltunneler smalere. Ett samlet nett (MODELLER.samle). window.Portal3d.sjekk().
  (Vegskilt ved tettstedene ble prøvd og tatt ut: noen E-veglinjer i u.veger tegnes ikke som asfalt, så skiltet sto på jordet –
  utkastet ligger ikke i repoet.)
  KYSTEN I 3D (12. nov, brukeren: «legg til flere detaljer i hele Norge»): spill/kyst.js (regler uten DOM, test_kyst.js) + spill/kyst3d.js
  (KROKER.bygg3d/sett3d/ramme3d, bare S ≤ 2200). Sjø = vannmasken u.vann OG terreng under 1 moh. (innsjøer får ingenting). Kystpunkter i et
  rutenett på 12 m i kartets meter med fast hash (samme sted gir samme ting): i tettsteder (INFRA.tettsted, Garnison.inni) flytebrygger 14–30 m
  rett ut med båter langs begge sider og båter fortøyd langs kaia; utenfor tettstedene av og til naust (saltak, gavl med port mot sjøen, rødt/
  hvitt/tjærebrunt, ikke i hus/på veg, trær ryddes) med en snekke utenfor; båter ute på sjøen (ingen land innen 40 m) og bøyer (land innen
  45–90 m). Ingenting innen 90 m av ferjekaiene (u.kaier3d). Båtene (snekke, sjark med styrehus, motorbåt med kabin) er InstancedMesh med
  fargen per båt, z = terrenget under båten (høyst 0,3 moh.), og gynger i ramme3d. Tak PC 260 båter/40 brygger/60 naust/40 bøyer, mobil 90/15/25/15.
  window.Kyst3d.antall() teller. Ingen VAKT i sjekk.js (Dovre har ingen kyst) – testet med norge3d.js i Bergen og Reine.
  JERNBANE I 3D (12. nov, brukeren: «legg til flere detaljer i hele Norge»): spill/bane3d.js (reglene øverst uten DOM, test_bane3d.js)
  henter sporene fra utveg-flisene (lag bane, z11, OpenStreetMap) i KROKER.bygg3d når S ≤ 2200 og VIS.bane (u.baner, u.påBane), og lager i
  KROKER.sett3d pukkbane med sviller (ett nett, tekstur), to skinner (ett nett) og på elektriske baner kontaktledningsmaster hver 60 m
  (InstancedMesh med utligger) og kontakttråd (LineSegments). Høyden: glidende median over ±80 m + snitt; der terrenget avviker > 4 m fra
  profilen (tunnel, bru, dyp skjæring) eller i vannmasken tegnes ikke sporet. Trær, steiner, busker og gress ryddes 4 m fra midten.
  Elektrisk = normalspor unntatt Nordlandsbanen og Rørosbanen (Claudes anslag, OSM-flisene har ikke «electrified»). VAKT i sjekk.js
  (jernbane i Dombås-utsnittet, elektrisk, 0 trær på sporet – bare når utveg-flisene er lastet; testserveren har dem ikke uten videre).
  Skjermbilder: scratchpad bilde3d-bane.js (som bilde3d.js, men henter også kart-utveg- fra den ekte siden). Ikke koblet til INFRA-bruene ennå.
  KULTURLANDSKAPET (12. nov, brukeren: «legg til flere detaljer i hele Norge»): spill/gard3d.js (KROKER.bygg3d/sett3d/ramme3d, S ≤ 2200,
  lastes etter dyr3d.js og bruker Dyr3d.lovlig: ikke i vann, på veg/asfalt, i tunet, i trær, i bekker eller i bratt ur). Dyrket mark =
  terrengklasse 5 i lagVindu (32 m-ruter). Rundballer (hvit/grønn/svart plast, klynger på 3–9 i ca. 7 % av rutene) bare sommer og høst
  (VAER.årstid); gjerder langs sidene der naboruta ikke er dyrket (grovt langs rutenettet, 30 % av kantene åpne): gjerdetypen per
  400 m-rute (gård) – stolper med netting (alphaTest-tekstur), skigard (ca. 30 %) eller steingjerde (ca. 15 %). Alt fast via hash av
  kartkoordinatene. InstancedMesh, tak PC 360 baller / 1600 gjerdebiter, mobil 120 / 700. Ingen kollisjon når du går. window.Gard3d
  (punkter, antall); Vakt3d teller rundball/gjerde/skigard/steingjerde (i hus, svever). VAKT i sjekk.js: Dombås har rundballer og gjerder.
  BØLGER, VIND OG TÅKE (12. nov, brukeren: «legg til bølger, vind og tåke»): nytt vær «Storm» i spill/vaer.js (kuling med regn, snøstorm om
  vinteren, høst 7 % / vinter 5 %; test_vaer.js). spill/vind3d.js (lastes etter natt3d.js): vindkast oppå VAER.vind; bølger i bakkeshaderen
  (sett3d kjeder onBeforeCompile etter natt3d, customProgramCacheKey + '-bolger'): fem bølgetog med lengde 13–1,25 m som går med vinden
  (ω = √(g·k)), styrken per tog fra flekkene i detaljteksturen (ellers blir det rutemønster), krusning fra støy, høyde uBAmp 0,2–1,8 etter
  vinden (innsjøer under halvparten), himmelspeiling ved flat vinkel, skumtopper fra frisk bris (uBSkum) og brenninger langs land på havet
  (vannmasken < 1 og < 1 moh.). Trærne i liv3d.js og vegetasjon3d.js bruker Vind3d.U/DEKL/prosjekt: svaiing ×(0,35 + 0,22·fart), takt etter
  vinden og toppen heller med vinden etter instansmatrisen. Rundt kameraet nær bakken: løv om høsten (eller storm), snøfokk på snø ved
  > 6 m/s (Points). Tåke: himmelkuppel og skyer tones ut mot grått (gråHimmel, tåkefargen tas fra lys3d uten å dra seg), nede i tåka ser
  du ca. 120 m, tåkedotter (sprites) som driver med vinden, havtåke over sjøen (sjøpunkter fra vannmasken under 1 moh.) i tåke og
  morgentåke. Vinden i statuslinja (#sVind, «6 m/s SV», tittel med beaufortnavn). window.Vind3d.sjekk(); VAKT i sjekk.js (storm gir bølger,
  skum, sterkere trevind og vind i statuslinja uten GL-feil; tåke gir grå himmel). Testet med bilder i Bergen (storm/klart) og på Dombås.
  LYD I 3D (12. nov, brukeren: «fortsett å forbedre»): spill/lyd.js (reglene øverst uten DOM: Lyd.nivåer/skritt, test_lyd.js) – alt laget med
  Web Audio, ingen lydfiler: vedvarende kanaler (støy -> filter -> forsterker) for vind (båndpass, kast fra Vind3d), plystring i storm, hav
  (brun støy + bølgedrag med 6–9 s puls), skvulp ved innsjø, regn, bylyd; korte lyder for fugler (tre slags sang), måker, torden 1–5 s etter
  NATT.lyn og fottrinn når du går (underlag fra u.vegType: grus knaser, asfalt, gress, snø). Omgivelsene leses hvert 0,5 s i en ring rundt
  kameraet (vannmasken 128², < 1,2 moh. = hav, bunnkartet = skog, nærHus = by). Bare i 3D, tones ned i 2D/skjult fane; starter ved første
  trykk/tast (nettleserens regel); ☰ «Lyd» (localStorage «riksbrudd-lyd»). liv3d.js: vegmasken har nå 1 = grus, 2 = asfalt (u.vegType).
  Målt i Bergen: storm ved sjøen rms 0,07 / topp 0,23, klart 0,016. VAKT i sjekk.js (8 kanaler, nivåer, knappen). Lydmåling: scratchpad
  norge/norge3d-lyd.js (Chromium med --autoplay-policy=no-user-gesture-required) og Lyd.sjekk().rms.
  GRUSVEGER (12. nov): småsteinene i vegTekstur er nå 1–4 cm (før 8–28 cm, så ut som brostein).
  FERJER I RUTE OG KJØLVANN (12. nov, brukeren: «fortsett å forbedre» – mer liv på sjøen): spill/ferje.js (regler uten DOM, test_ferje.js:
  lagRute – liggeplassen ved kaien, rett ut 40 m forbi baugen, så ferjelinja, Chaikin; reise/langs – akselerasjon 0,12, marsj 6,5 m/s, bremsing
  0,1 m/s²; tilstand/stilling – vent 60–120 s ved hver kai (sanntid), A→B, vent, B→A, styrbord 22 m midt i sambandet, skroget snur aldri; kjør –
  småbåter mot tilfeldige mål på sjøen minst 30 m fra land; gynging/antallKjører) + spill/ferje3d.js (KROKER.bygg3d/sett3d/ramme3d, S ≤ 2200):
  ferjelinjer (INFRA.ferje) med begge ender inne i utsnittet og en ferjekai (u.kaier3d) i hver ende med plass til ferja; ferjemodellen er
  Infra3d.ferjeGeo (trukket ut av byggKai i infra3d.js som ferjeModell/ferjeLengde) og kaiene i en rute får k.iRute (ingen dobbel ferje ved kai).
  Samband over 2,5 km får to ferjer (en halv runde forskjøvet), tak 4 PC / 2 mobil. window.Kjølvann (nyttSpor/flytt): akterendens spor, to
  firkanter per stykke – svake Kelvin-armer som brer seg ca. 0,33 × farten og hvit uro rett bak – additivt (lysner bare sjøen), tones ut og
  dempes om natta (NATT.mørke). kyst3d.js: båtene gynger etter Vind3d.VIND.fart (Ferje.gynging; fasen samles opp), 2–6 av båtene ute på sjøen
  kjører rundt med kjølvann (mobil høyst 3, stopper i storm ≥ 14 m/s). Ferje3d.T.ekstra hopper i ruteplanen, Ferje3d.forspol(sek) bygger opp
  kjølvannet (skjermbilder). VAKT i sjekk.js (ingen ferjer på Dovre, kunstig kjølvann tegnes uten GL-feil); bilder: /norge, Mannheller–Fodnes.
  GATEMØBLER (12. nov, brukeren: «fortsett å forbedre»): spill/gate.js (regler uten DOM, test_gate.js) + spill/gate3d.js (KROKER.bygg3d/sett3d,
  S ≤ 2200, lastes etter byhus.js og bane3d.js). Busskur med benk, glass og reklametavle langs E/R/F i tettstedene (kandidater hver 20. m,
  valgt etter hash, minst 420 m mellom holdeplassene, ikke innen 18 m av et kryss eller i en midtdeler; på fortauet, på E-veg bak skulderen) med holdeplasskilt på
  begge sider av vegen; sykkelstativ (med 0–4 sykler) inntil veggen mot vegen ved ca. 65 % av butikkene/kjedene (t 7 eller k) og to ved skoler (t 9), med
  søppelkasse og benk ved siden av; søppelkasse/benk ved fotgjengerfeltene i kryssene (Liv3d.finnKryss, eksportert fra liv3d.js) og her og der
  langs fortauene (samme slag ikke nærmere enn 50/60 m); postkassestativ (1–3 kasser) ved vegkanten for ca. 45 % av eneboligene (t 0) langs
  K/P. Byggene leses fra hus-flisene (z13) i kroken. Aldri på kjørebanen (rutenett med vegbitene), i/inntil hus (nærHus), vann, bekk, på
  sporet, inntil trær (1,6 m), lykter, flagg eller biler; høyden = fortauet (vegbanen + 15 cm) og bare der det stemmer med bakken (± 0,45 m).
  Fast via hash av kartkoordinatene; småting bare innen 650 m fra midten (Gate.RADIUS), tak PC 900 / mobil 300 (busskur og skilt beholdes,
  resten nærmest midten). Ett nett per slag med hjørnefarger (InstancedMesh). Målt: Dombås ca. 25 000 trekanter, Trondheim/Oslo sentrum ca.
  41 000 / 44 000, kroken 0,1–0,25 s. Vakt3d teller slagene (i hus/svever); VAKT i sjekk.js (benker, søppelkasser og
  minst ett busskur i Dombås, 0 i hus/svevende, < 60 000 trekanter). window.Gate3d (punkter, antall).
  JEVNERE 3D (12. nov, brukeren: «spillet går alt for hakkete»): målt med scratchpad prof-jevn.js (tid per funksjon/krok per ramme) og
  prof-gpu.js (rammetid med og uten hver del): JS per ramme bare ca. 6 ms – det tunge er tegningen, og bakken (terrengnettet med den store
  shaderen) var 40–60 % av den. Nå: nærdetaljen i detaljIBakken (fem teksturoppslag) bare innen 90 m (if), skyskygger og pytter i natt3d bare
  når de trengs; rammesnittet (R3.rammeSnitt) teller ikke pausene (tegning 4 ganger i sekundet ga «trege» bilder og senket oppløsningen).
  spill/kvalitet.js (Kvalitet.neste uten DOM, test_kvalitet.js): ☰ «Grafikk: auto/Høy/Middels/Lav» (localStorage «riksbrudd-grafikk»);
  window.KVAL.p gir pikseltetthet [PC, mobil] (størrelse3d), trærnes detaljavstand (lodTrær), andel gress (gress3d), blomster (vegetasjon3d),
  stor bakketekstur 4096 (bygg3d). Auto: ned et nivå når snittet er over 24 ms og oppløsningen alt er senket (eller over 40 ms), opp når
  det er under 18 ms med full oppløsning i 20 s, ikke tilbake til et nivå som var for tungt det siste minuttet. Målt (swiftshader, fast
  oppløsning): ovenfra 1946 -> 1509 ms per bilde; går du: høy 1786, middels 1439 (0,66 mill. trekanter mot 1,25), lav 999 ms.
  Hakk som gjenstår: nytt utsnitt (sett3d + første tegning med ny tekstur) når du flytter deg langt. VAKT i sjekk.js (Lav gir lav pr/trær).
  KOMPAKT SKJERM (12. nov, brukeren med skjermbilde fra iPhone liggende: «Dette er ikke god nok UI»): spill/kompakt.js (lastes sist) gir
  body.kort når vinduet er under 560 px høyt eller under 700 px bredt (body.smal): status og knapper på én rad (status sveipbar, uten
  «lastet» og årstid), mindre knapper, fartsknappene som én knapp som blar 1× → 10× → 60×, minikartet 104 px oppe til høyre under
  knappene (stående: under kompasset), loggen oppe til venstre under kompasset med bare tre linjer, zoomknapper 36 px og Huk/Hopp nede
  til høyre, kildeteksten på én linje (trykk = alle kildene), avstand til skjermkanten (env(safe-area-inset-*)), rullbar ☰-meny.
  For alle skjermer: navn/merker i 3D tegnes ikke under knappene og kompasset (window.UI_TOPP3D, klipp i tegn3d). Bilder: scratchpad
  mobilbilde.js (Playwright med isMobile/hasTouch, W/H/DPR, starter spillet). VAKT i sjekk.js (mobil: kompakt, statuslinja < 34 px,
  kildeteksten én linje, én fartsknapp; PC: som før). OBS: #panel beholder max-height 46vh (høyere panel dekket kartet i S5-testen).
  FOLK (12. nov, brukeren: «et enda bedre byggesystem» – «dele inn folk til å bygge» og «bygg som betyr noe»; del 1 av tre): spill/folk.js
  (regler uten DOM, test_folk.js) + folk-visning.js. Gjengen starter med ti personer (norske navn, alder, yrke før kollapsen, ferdighet
  0,7–1,45 per oppgave, lojalitet, helse), lagret i leiren (L.folk i «riksbrudd-k2»; gamle leirer får folk ved start). Oppgavene (i denne
  rekkefølgen): bygg, hogst, riving, frakt, vakt, kjøkken, stell, verksted, fri. Byggelagene i leir.js kommer fra folk på «bygg» (to = ett lag,
  ett med én person går halvt så fort; Leir.folkLag/folkTempo, uten folk som før). Behov: senger (brakker; Byggesett.rom() teller med hvis den
  finnes), mat (1 rasjon per person per døgn, 1,2 om vinteren; drivhus 3/døgn, kjøp 3000 kr/rasjon, bemannet kjøkken = 15 % mindre svinn og
  varm mat), varme (vinter: 0,5 m³ ved eller 50 l drivstoff per åtte personer per døgn, halvt vår/høst), helse (sult og kulde tærer, stell
  og sykestue leger), moral (glir 4 poeng per spilltime mot et mål fra behovene; under 25 et døgn: den minst lojale går). Syke (< 40 % helse)
  arbeider ikke. Tempo = ferdighet × moral × søvn × helse (0–1,5). Bygg som betyr noe: nytt bygg kjøkken (MODELLER.kjøkken i folk-visning.js),
  vakttårn med vakt gir egne lag innen 150 m sikt ×1,25 (KROKER.sikt) og treff ×1,2 innen 100 m (KROKER.ild), vaktene ser fiender nær leiren
  (KROKER.ser, 400–800 m) og melder dem; sandsekkvoll: lag innen 15 m tar treff ×0,6; verksted med folk reparerer byggene og lager stål;
  sykestue med folk på «stell» leger sårede soldater i lag innen 150 m. Panelet «Folk» fra Leir-menyen (#folkknapp; #folkmeny, − / + per
  oppgave, hva som mangler, kjøp mat, rekrutter 500 000 kr når det er ledig seng; kortere status på telefon). window.Folk (arbeidere, tempo,
  liste, moral, byggelag) er avtalen med byggesett og materialer. Tallene er Claudes forslag. VAKT i sjekk.js («folk»). Bilder: scratchpad folk/folkbilde.js.
