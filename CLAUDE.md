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
sin egen fraksjon og karakter, starter med 40 mill. kr (fra 18. nov; før 100) (Kronekrakket, marked som flytter seg, inflasjon), bygger leir med
KONTROLLROM (kart ovenfra, kamerafeeds, radio fra lagene), kameraer/vakttårn, første- og tredjeperson, 1–5 spillere, mild vinter.
Les docs/plan-kollaps.md (faser K1–K9, åpne spørsmål). Den erstatter lore-en fra 1986 og bygger videre på plan-gjeng.md.
NY RETNING (10. nov): spillet handler om din egen semi-lovlige militærgruppe («gjeng») med medlemmer, leir og oppdrag i
utlandet – de politiske fraksjonene erstattes av gjenger. Les docs/plan-gjeng.md (faser G1–G6, åpne spørsmål).
FUNKSJONSPLAN og hvem som eier hvilke filer (to chatter parallelt, kroker KROKER.tegn/sim/trykk, spill/): docs/plan-funksjoner.md.
SPILLMEKANIKK (forsyning, olje, bruer, ingeniører, detaljnivå – inspirert av WarFront på Steam, ikke kopiert): docs/plan-spillmekanikk.md.
INSPIRASJON WARDOGS (21. nov, brukeren: «Wardogs er også en inspirasjon til spillet vi lager»): Wardogs (Bulkhead/Team17) er et taktisk
flerspiller-skytespill om private militære selskaper (PMC-er) som slåss om en oppdiktet region, med kombinerte våpen, bygging og ødeleggelse.
Passer med plan-gjeng.md (din egen semi-lovlige militærgruppe). Bare inspirasjon: ikke deres navn (selskapene, kart, logoer), våpen-/kartdesign
eller utseende. Spør brukeren hva ved Wardogs som skal inn før noe stort bygges.
PLANEN for hele Norge: docs/plan-hele-norge.md (budsjetter, faser, beslutninger). ÅRSTALL: spillet foregår på 2020-TALLET uten faste årstall (brukeren 21. nov; før «2023», 8. nov), ikke 1986 som i
HANDOFF/designdokumentet – kartet er Norge 2023. DESIGNRETNING (21. nov): moderne PMC-merker og teknologi med klassisk skrift – docs/designretning.md. Bygging: pipeline/fliser/blokk.py + sammen.py, .github/workflows/norge.yml
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
  MATERIALER FRA VERDEN (12. nov, brukeren valgte det i «et enda bedre byggesystem», del 3): spill/ressurser.js (regler uten DOM,
  test_ressurser.js) + ressurser-visning.js. Hogst (rundt felt 20/35/50 m med ujevn kant, Ressurser.kant/iFelt; tre etter andelen skog i
  32 m-rutene, 0,012 m³/m²) og riving av forlatte hus (husomrissene via finnBygg; tre/betong/stål etter type og størrelse, husUtbytte;
  over 3000 m² avvises) innen 3 km fra leiren. Arbeidet: folk på 'hogst'/'riving' (window.Folk, uten Folk 2 på hver), jobbene i kø per
  slag; materialene legges i en haug som fraktes av folk på 'frakt' til fots (0,15 m³ per tur) eller av en lastebil (k.oppdrag type
  'ressurs', turer til haugen er tom; KJ_TEKST). Innen 150 m rett i lageret. Leir.leggInn(L, type, mengde) (nederst i leir.js) har
  lagerplassen som tak; fullt lager = resten venter. Lagres i «riksbrudd-ressurser» (fjernes ved «Nytt spill»): R.hogd (felt, også
  avbrutte med andel) og R.revet (i, P). Kroker: LEIR_MENY (ny, i leir-visning.js visMeny), window.HUS_BORT (Set av revne hus-id-er –
  hus3d og finnBygg i index.html hopper over dem). 3D: trærne i feltet forsvinner etter framdriften (fast hash per tre; ryddHogst nuller
  matrisene som ryddTrær), stubber (InstancedMesh), hogstflate og grus malt i bakken, ruin (brutt grunnmur + steinhaug, ett nett) og
  tømmerstabel ved haugene; et ferdig revet hus bygger utsnittet på nytt (nytt3dUtsnitt). 2D: hogstfelt med stubber, ruiner over
  husene i kartflisene, haugene. VAKT i sjekk.js (2D: panel, hogst/riving gir materialer, huskes, lagring; 3D: ingen trær i hogd felt,
  stubber, revet hus borte fra hus3d, ruin). Grus/stein (steinbrudd) er ikke laget.
  FRITT BYGGESETT (12. nov, brukeren: «et enda bedre byggesystem» – del 2 av fire, se scratchpad BYGG-BRIEF.md): spill/byggesett.js (regler
  uten DOM, test_byggesett.js; lastes etter leir.js og legger delene inn i Leir.BYGG som type 'bs_…' med del: true) + byggesett-visning.js
  («Åpne byggesettet» i Leir-menyen via window.LEIR_MENY; verktøylinja #byggesett nederst). Rutenett på G = 2,4 m fra leirens midte
  (L.byggesett = { ox, oy }), etasje H = 3 m, høyst to etasjer. Delen ligger på bygget som b.bs = { i, j, a, n, r }: gulv/tak i ruta (n =
  dekket: 0 bakken, 1 mellom etasjene eller tak over 1. etasje, 2 tak over 2.), vegger/forsvar på en kant (a 'x'/'y', n = etasjen).
  Støtte: ingen svevende deler (vegg i 2. etasje på vegg eller gulv, dekke på en vegg eller et nabodekke). Dør/port bytter ut veggen i
  1. etasje, vindu den øverste hele veggen; ellers neste ledige etasje («Etasje: auto/1/2»). To trykk = rad (gulv/tak: rektangel; vegger:
  linje, eller rundt rektangelet ved to hjørner; med mus følger raden pekeren etter første trykk, i 3D treffer trykket også veggene); ferdige hus (hytte, brakke, betongbu) og «Riv». Delene bygges med Leir.bygg som jobber for
  byggelagene; kanBygge hopper over overlapp mellom deler (leir.js, del: true), men ikke mot vanlige bygg, hus og vann. rom(): lukkede rom
  (gulv, vegger rundt, tak over) med dør = «egenbygd brakke» med 1 seng per 8 m² (Leir.plasser er utvidet; window.Byggesett.rom() for Folk).
  3D: fem samlede nett (tre/betong/murstein/tak med teksturer laget i koden, og resten med hjørnefarger), rødmalt kledning med hvite hjørner,
  vindskier og karmer, saltak per sammenhengende takflate (møne langs lengste side, gavler i veggens stoff), palisade, mur, jordvoll, piggtråd
  som følger terrenget. Hele huset står på samme grunnhøyde (BS.høyder: høyeste terreng + 0,25 m) med sokkel ned i terrenget. Veggene legges i
  R3.hindre (stopper deg når du går; døra er åpen). leir-visning.js: delene tegnes/listes ikke der (jobbene samlet på én linje), LeirSpill.oppdater3d.
  VAKT i sjekk.js (2D: hytte 16 deler som jobber, rad, tak i lufta avvist, rom og senger, riving; 3D: brakke i scenen, 0 svever, vegg/dør i
  R3.hindre, ingen GL-feil). Bilder: scratchpad bs/bilde.js (PRE=bs/pre.js bygger en liten leir av deler).
  TEKNISK FEILRETTING (12. nov natt, feiljakten «teknisk»): MINNE I 3D – frigjørTerreng(R) (slå3d og sett3d) frigjør terrengnettet og
  teksturen; småtingene (biler, flagg, gatelys) frigjør geometrien sin (trærne deler TREGEO og beholder den); scene.remove er pakket inn i
  init3d så instansnett (InstancedMesh) alltid får dispose() når de tas ut; liv3d frigjør lyskjegle- og røykteksturen (userData.egetKart).
  En funksjon som legges på utsnittet u (u.iBekk, u.påBane …) må lages UTENFOR kroken eller bare bruke små ting: en funksjon laget inne i
  bygg3d-kroken holder på alt kroken bruker (bekkemasken holdt kartbildet px, 67 MB ved 4096²). Ikke husk gamle utsnitt (RessursSpill.sisteU
  husker bare det siste). u.vannData har ÉN form: { W, d } (to former gjorde at man kunne gå på vannet og at trær sto i vann når kyst3d kjørte
  først). VAKT i sjekk.js «minne i 3D»: 3D av og på to ganger ved Dombås, geometrier/teksturer skal ikke øke, alle instansnett frigjort.
  NETT: hentMedFrist(url, ms, 'json'|'arrayBuffer') i kartflis.js (tidsgrense; brukes for manifestene 8 s, flisbitene 25 s, infrastrukturen 60 s).
  Manifestene hentes samtidig; det som mangler meldes i loggen; hentInfra prøver igjen etter 1 og 2 min. /norge uten kartlager: melding,
  Dovre vises imens, kartlageret spørres igjen (10 s, 20 s … 60 s) og «Last inn Norgeskartet» tilbys (norgeMangler). Meldingsboksen #feil:
  visMelding(tekst, { type, knapp, vedTrykk }) / skjulMelding(type) – lukkeknapp, norsk tekst; type 'nett' tas bort av nettOk() når data kommer
  inn igjen, type '3d' når utsnittet er bygget. Fliser laget mens en henting feilet er merket ufull (KF.feil telles i hentFlis) og lages på nytt
  mens de er i bildet (4 s, 8 s … høyst hvert minutt, 8 forsøk; «online» nullstiller). rensLager(): pmtiles husker mislykkede oppslag for
  alltid – de tas ut etter en feil. 3D: byggefeil gir melding og nytt forsøk (R3.byggFeil, byggVent: 4 s, 8 s … 30 s; det forrige utsnittet
  står), et utsnitt som bes om mens et annet bygges, bygges rett etterpå (R3.neste). three.js hentes i bakgrunnen 2,5 s etter at kartet er
  klart. Test: node pipeline/fliser/test_nett.js (med selvtest av rensLager). Skript for måling: scratchpad feiljakt/teknisk/skript
  (dev.py = testserver som henter /api/kart fra den ekte siden og kan settes til å henge/feile, lekk.js, spor.js, heap.js, nettest.js).
  IKKE ENDRET med vilje: vercel.json (alt revalideres – gamle kopier ga feil før) og at infra.json for hele Norge lastes på Dovre-siden.
  FEILRETTING MEKANIKK (12. nov natt, feiljakten – funn i scratchpad feiljakt/mekanikk/funn.json): (1) tom gjeng låste spillet: folk.js –
  færre enn R.nød = 3 personer kan alltid rekruttere (FolkRegler.kanRekruttere/nød: ingen krav om seng eller moral, gratis hvis kassa er tom,
  den nye går på «bygg» når ingen bygger), steget for tom gjeng lar moralen hente seg inn (R.nødMoral 50), varsler i loggen (mat under ett
  døgn, tom for mat, påminnelse hvert halve døgn, farlig lav moral halvveis, «Bare N igjen», «Gjengen er tom»). (2) Sengene i egenbygde rom
  ble telt to ganger (Leir.plasser + ekstraSenger): folk-visning.js gir 0 ekstra når Leir.plasser.byggesett er satt. (3) Maler: prøv() i
  leir-visning.js sjekker hvert bygg mot kartet (kartFor, asynkront: «Sjekker kartet …», p.sjekket) og planMal får kartet per bygg; tilMal/
  fraMal tar ikke med byggesettdeler (del: true). (4) Gjerde: Leir.gjerdePunkter (punkt hver 8. m) brukes i kanBygge og i visningens
  kartsjekk; gjerdet kan ikke gå gjennom egne bygg (porter og deler unntatt) eller hus. (5) Leir.riv: drivstoff som ikke får plass i resten
  av tankene, selges tilbake til innkjøpspris (r.drivstoff, r.drivstoffPenger, r.bygg = byggets andel), og bekreftelsen sier det. (6) Radio:
  Kontrollrom.RUTINE («Posisjon meldt. Alt rolig.») står bare i radiolista i kontrollrommet, ikke i loggen. (7) Ressurser.ledigSkog: et
  stoppet hogstfelt sperrer bare den hogde andelen. (8) spill/lagring.js (regler øverst, test_lagring.js): «riksbrudd-verden» lagrer tid,
  været (VaerSpill.S), egne lag (plass, menn/hp, ammo, radio, nedgravd) og kjøretøy (plass, antall, drivstoff, last) hvert 5. sekund og ved
  pagehide; leses ved første «riksbrudd-spill» når et lagret spill fantes (bare for samme leir). Ordre i gang, fiendens lag, olje,
  tettsteder og sprengt infrastruktur lagres IKKE ennå. oppstart-visning.js: lagret spill tas i bruk ved DOMContentLoaded (setTimeout(0)
  kunne slå til mellom to skript, så leiren/kontrollrommet ikke hørte «riksbrudd-spill»). VAKT i sjekk.js («feilretting (mekanikk)»).
  GRENSESNITT ETTER FEILJAKTEN (12. nov natt, ui-telefon): paneler som tegnes på nytt hvert sekund (Leir-menyen, Folk, byggpanelet, kjøretøy-, base-
  og lagpanelet) venter mens en finger/museknapp er nede på dem (window.pekerNede(el) i index.html) – ellers forsvinner klikket; Leir-menyen og Folk
  bygges ved siden av og byttes bare inn når innholdet er endret (visMeny/vis sammenligner innerHTML), byggpanelet har en nøkkel. Nye panel som
  tegnes jevnlig skal gjøre det samme. window.lukkPanel() lukker panelet nede til venstre (Leir, Folk og byggesettet kaller den). spill/etikett.js
  (uten DOM, test_etikett.js): Etikett.nullstill() hver ramme, Etikett.tekst(g, t, x, y, retning) gir y-en et navn skal tegnes i, så navnene på lag,
  kjøretøy, base og leir ikke ligger oppå hverandre – bruk den for nye navn i kartet. Hjelpen vises første gang først når spillet er klart
  (Hjelp.første()), aldri oppå startskjermen. ☰ rulles (to kolonner på lav PC-skjerm). body.ikontrollrom når du er inne i kontrollrommet.
  VAKT grensesnitt i sjekk.js.
  VEGER I 3D, RUNDE 2 (12.–13. nov, feiljakten: parallelle veger oppå hverandre, asfaltflak i kryssene, veger i tunnel):
  NVDB gir gang- og sykkelveger samme kategori som vegen de ligger langs. Vegene i vektorflisene har nå vegtype (pipeline/fliser/
  vegtype.py: g = 1 gang- og sykkelveg, t = 1 kanalisert veg, 2 rampe, 3 rundkjøring, 4 ferje); 03_veg_bygg.py, `02_fliser.py vektor`
  (bare vektorlaget) og blokk.py skriver den. Dovre er bygget på nytt; HELE NORGE MÅ BYGGES PÅ NYTT («Bygg Norge») – til da gjetter
  visningen (Veg.gjett). spill/veg.js (regler uten DOM, test_veg.js): klipp til flisen, skjøt til hele veger, utenTunnel (INFRA.tunnel),
  høyder (flat vegbane på terrengnettet: nettHoyde i index.html), finnKryss/kryssFlate (stump per arm), striper/gangfelt, lykter.
  liv3d.js: u.veger = bilvegene (w = halv bredde, t, åpen), u.gangveger = gang- og sykkelvegene, u.lys settes her (gatelys3d er reserve),
  Liv3d.dekke(u, x, y) = vegbanen/brudekket (gange.js går oppå). infra3d: vegbru følger bilveg, gangbru gangveg; p[3] = 1 på bru.
  Kontrollert 13. nov på bilder ved Dombås (én E-veg med smale gangveger ved siden av, rene kryss) – det første etter-bildet var tatt
  før siste retting. VAKT i sjekk.js («veger i 3D»: vegtype i dataene, gangveger skilt ut, 0 bilveger oppå hverandre utenom kryssene,
  0 gatelys i vegbanen). 2D-kartet er uendret (gangvegene tegnes fortsatt som veger der).
  NØDBRUER (13. nov, feiljakten: «Jora bru står på land – vegen krysser elva rett på vannet»): Bruer.elvekryss(P, våt, w) finner strekk
  der en veg krysser en elv (u.iBekk fra bekkedataene, eller vannflaten i kartet) uten bru i dataene: 2–70 m i vann, ikke i enden av
  vegen, vann på begge sider av vegen. infra3d.js nødbruer(): strekket får en enkel bru (modellen har nød = true, navn «Bru», kan ikke
  sprenges); en vegbru fra NVDB som ikke fant bilvegen sin (feilLinje) og står innen 80 m, flyttes dit med navn, id og tilstand
  (o.midt3 på INFRA-objektet). infraPunkt3(o) i index.html: navn og trykkpunkt i 3D – brua der modellen står, tunnelen ved den
  nærmeste portalen (midt i tunnelen svevde navnet over byen). Gjerder og rundballer ryddes fra jernbanesporet i bane3d.js.
  SJØ, OMLAND OG 3D-START (12. nov dag, feilretting pakke «hav», brukeren: «Rett alle»): bakkeshaderen (detaljIBakken) leser vannmasken
  (specularMap) én gang: rød = vann, grønn = flathet (normalens z fra høydegitteret, glattet – vannmaske(px, TW, H, N, steg)); berg i bratte
  sider og snø bruker den (ikke nettets hjørnenormaler). De trekantete lyse flekkene i lia over Mannheller (nr. 7 i feiljakten) er IKKE
  borte med dette – de kommer trolig fra skogmaske/skogbunn i bygg3d (32 m-rutene) og gjenstår. Sjø (vann under 1–3 moh.) får aldri snø; islagte
  innsjøer har ikke bølger eller glans. VANN_GLANS (farge, skarphet, tak) er solglansen på vann – glansen flater ut mot et tak og brenner
  ikke ut; spill/fjern3d.js bruker de samme tallene, HAVFARGE og himmelspeilingen (Vind3d.BU()) på sjøen i ringen (aVann), så havet ikke
  har en firkantet kant. havnivå(): lyst strandberg de siste ca. 10 m mot sjøen (når høydegitteret har ruter ≤ 8 m). lagVindu(b, medVeg, ZV,
  omland): omland = true fyller manglende høyde fra omlandet (fyllOmland – bare 3D: bygg3d og fjern3d; reglene bruker fortsatt bare Norge),
  så Sverige/Finland har terreng i 3D (uten veger, hus og trær – gjenstår). start3d(): viser kartet over 60 km, åpner 3D ved valgt lag /
  leiren / nærmeste egne lag (1300 m unna). Oppstart.startplasser (test_oppstart.js): lag og kjøretøy settes på land som henger sammen med
  leiren (OppstartSpill.påLand, bare et nytt spill / når ringen ikke er rørt). Fraksjoner.startsteder + AI.flytt(leir) (fraksjoner-visning.js):
  ligger leiren utenfor Dovre-piloten, flytter motstanderne og patruljen til de nærmeste tettstedene rundt leiren (AI.hjem()). Det er
  fortsatt bare to fraksjoner med to lag hver – et opplegg for hele landet gjenstår. spill/kyst.js: småbåter ute på sjøen bare med land
  innen 800 m. spill/olje3d.js (test_olje3d.js): plattformer og produksjonsskip fra INFRA.olje i 3D (Olje3d.sjekk()).
  IKKE GJORT: ytelsen i byene (nr. 1 i feiljakten: 1,6–2,0 mill. trekanter i Bergen/Trondheim/Tromsø) – må måles per del (hus, gatetrær, gatelys) først.
  NATUR-RETTINGER (12. nov, feiljakten, brukeren: «Rett alle»): fjernterrenget (spill/fjern3d.js) farges per punkt etter årstid og snøgrense
  med samme regler som bakken (Fjern3d.farge, test_fjern3d.js; over tregrensen blir grønt til grått) og regnes på nytt når været endres.
  Planter: Vegetasjon.vekst(rel) (glisnere over tregrensen, ingenting fra 1,35 ×), stedIHøyden, vegRute(u.veger) -> u.vegNær (nøyaktig
  vegbredde med fortau; vegmasken u.påVeg er for grov i store utsnitt); fri(u, x, y) i vegetasjon3d.js = ikke vann, veg/fortau, spor
  (u.påBane), inntil hus eller på grått i kartet; gress3d bruker iVann3d, u.vegNær, u.påBane og vekst. Navn i 3D: bakHus(v) (husomriss +
  P.topp fra hus3d) i proj3 og brupunkt3. Buskene: treGeo('busk'/'buskEnkel') med detaljnivå i R3.treLOD (busk: true – ingen stubber ved
  hogst), snø/høst via treVær(m, slag) i vaer-visning.js (også steinene). Tåke: tåkedottene i vind3d.js har kant som tones helt ut,
  tåkebankene i natt3d.js er lavere, holdes over bakken (userData.bakke) og finnes bare under tregrensen; regnhimmelen går over i disens
  farge (gråHimmel: o = trinn(0, .45, tf)). Bakken: flekkene hentes to ganger (17 m og 45 m, dreid) så de ikke står som rutenett, snø har
  ingen glans, vannIBratt() tar vann bort fra bratt terreng før vannmasken, skogmaske() har myk, ujevn kant (skog.v) og ingen enslige
  skogruter. Minikartet får snø (Kompass.snø). Butikkskilt: skiltMål holder skiltet under takskjegget. Gjenstår: trær i 22 kV-linjene.
  KART OG GRENSESNITT PÅ /NORGE (12. nov, feiljakten runde 2, pakke «kart»): spill/kart2d.js (regler uten DOM, test_kart2d.js):
  skalaMål (målestokken opp til 1000 km), navnepunkt (tettstedsnavnet står inne i tettbebyggelsen – navnP(o) i index.html, brukes i 2D,
  3D og trykk), åpning (telefon i høydeformat: /norge åpner med Sør-Norge, «hele landet» viser fastlandet – passInnHele), erFyr (rundt
  bygg i et tettsted blir ikke fyr). RIKSGRENSA: pipeline/fliser/riksgrense.py henter Riksgrense + avtalt avgrensningslinje i sjøen fra
  Kartverkets WFS (wfs.geonorge.no svarer herfra) -> site/dovre-fliser/data/riksgrense.json (22 KB, én linje fra sør til nord, Norge til
  venstre); spill/riksgrense.js (les, avstand med fortegn, iNorge; test_riksgrense.js med 41 kjente steder). RIKSGRENSE er en let i
  index.html (bruk typeof). Leirvalget avviser steder utenfor grensa (Oppstart.gyldigLeir, v.iNorge) og gir Svalbard egen beskjed.
  kartflis.js: grensevekt() toner Norge-kartet over i omlandet 0,3–3,5 km utenfor grensa (før: rette sømmer i satellittmosaikken inne i
  Sverige); vektRutenett er 33 × 33; bakgrunnstråden laster spill/riksgrense.js (versjon.py merker den) og får grensa i init-meldingen.
  Bekker: Bekker.klipp – linjene klippes mot vannmasken i 3D (ingen bekk oppå Nidelva), brede elvemidtlinjer i kartets vannfarge i 2D.
  Kompass.avstandsplass: avstandstekstene ligger ikke oppå hverandre. Loggen har mørk bakgrunn og tones ut etter 30 s i 2D (hud.js).
  hus3d: kirker med flatt tak får tårn med spir (ikke takhus). GJENSTÅR i pakken: se scratchpad feiljakt/norge/funn.json (nr. 20, 21,
  22, 26, 29, 31, 32, 35) – bl.a. skriftene ligger fortsatt på Google Fonts, og striper i satellittmosaikken krever ny kartbygging.
  BRUKERENS VALG ETTER FEILJAKTEN (12. nov, brukeren svarte på de fire «trenger svar» i feiljakt/mekanikk/funn.json; detaljer i
  docs/plan-kollaps.md): (1) UTPOSTER ER LOV – du kan bygge hvor som helst, men byggelaget må reise dit: Leir.reise(L, x, y) regner fra
  leirens midte (L.midt, settes av leir-visning.js ved start – uten den, som i testene, ingen reisetid): de første REGLER.reise.fri = 300 m
  er fri, resten går i REGLER.reise.kmt = 10 km/t i luftlinje (Claudes tall). Jobben får `reise` (spillminutter; på bygget for ny bygging,
  på b.arbeid for oppgradering/reparasjon/flytting) som telles ned i steg() før arbeidet – med dt, ikke med byggernes tempo – og opptar
  byggelaget; steg() gir `framme`. Arbeider et lag alt innen 300 m (en jobb uten reise igjen), blir det ingen ny reise (påStedet), og når et
  lag kommer fram, nulles reisen for alle jobbene på stedet (delene i byggesettet). Byggelagene er ikke egne figurer, så et annet lag kan
  ta en jobb på stedet uten å ha reist selv. Visningen: Leir.reiseTekst i banneret før du bekrefter (også byggesettet og maler),
  «byggelaget er på vei» i byggpanelet, jobblista og kartet, loggen når laget er framme. Hogst/riving har fortsatt 3 km. (2) RADIOMASTEN:
  Leir.BYGG.radiomast.nivå.rekkevidde = 15/25/40 km = Kontrollrom.LEIR.nivå (test_kontrollrom.js sjekker at de er like). Feltradio når
  så langt som leirens radio (8 km uten mast eller uten strøm), håndradio 3 km uansett (Claudes valg). Kontrollrom.forklaring() og
  utenKontakt() gir tekstene i lagpanelet, radiolista, ordre-meldingen og byggpanelet (radioTekst i leir-visning.js). (3) BYGGEPLASSER
  KAN SKADES: Leir.skad(L, id, mengde) gir { hp, ødelagt, byggeplass, mat } – en ødelagt byggeplass legger andelen ubrukte materialer
  (igjen/totalt) tilbake i lageret, også over lagerplassen; oppgraderinger husker materialene sine (b.arbeid.mat). Leir.skade() svarer som
  før. Fiendene i leir-visning.js skader nå alle bygg innen 120 m, også uferdige; delene i byggesettet meldes samlet. (4) DIESEL OG OLJE
  er fortsatt to systemer: leiren sier «diesel» (Dieseltank – typen heter fortsatt 'drivstofftank', L.drivstoff og Leir.DRIVSTOFF som før),
  kjøretøyene bruker olje (tonn) fra basen. Forklaringen står i Leir-menyen (#dieseltekst), byggpanelet for tank/aggregat, basepanelet,
  kjøretøypanelet og hjelpen («Diesel og olje», «Utposter»). Skriv «diesel» om leirens drivstoff i nye tekster. VAKT i sjekk.js
  («brukerens valg (regler)»); test_leir.js og test_kontrollrom.js. Bilder: scratchpad regler/bilde.js.
  SMÅFEIL 13. NOV (feiljakten, brukeren: «Rett alle»): skriftene ligger i site/fonter/ (IM Fell English og Cormorant Garamond, OFL; ingen
  henting fra Google Fonts – fonter.css, lang hurtiglagring av .woff2 i vercel.json). Ryddebeltet under 22 kV er 7,5 m (kraft.js).
  Flyplasser og tettsteder er stengt for beitedyr, elg, rundballer og gårdsgjerder: u.flyplass (anlegg a 7–9 fra spill/anlegg3d.js,
  120 m rundt i dyremasken) og u.iBy (tettstedene, husket i ruter på 16 m) i Dyr3d.lovlig. Navnene på infrastrukturen meldes inn i
  Etikett (Etikett.merk i tegnEtiketter), så lagnavn og oljetekst flytter seg unna. JERNBANE I TUNNEL: utveg.py gir bane-linjene
  u = 1 i tunnel (release kart-utveg-abb9d613f42a, bygget 13. nov ved push av utveg.py til claude/hallo-ohbasy); kartflis.js tegner
  dem svakt stiplet fra z10, bane3d.js hopper over dem. Gjerder og rundballer ryddes fra sporet i bane3d.js (u.gard).
  INSPIRASJON (brukeren 13. nov): Ebbtide og Eurovoid i tillegg til WarFront – se docs/plan-spillmekanikk.md (inspirasjon, ikke kopi).
  Project Zomboid kom til 16. nov (behov hos figuren, ferdigheter, lyd som lokker fiender, strøm/vann som svikter, barrikader) –
  bare notert, ikke bygget; brukeren har ikke valgt hva som skal inn.
  GJENSTÅR ETTER FEILJAKTEN: for mange trekanter i byene (2 mill. i Bergen), trekantete lyse flekker i lia ved Mannheller (årsak ikke
  funnet), vann oppover fjellveggen på Snøhetta, jernbanesporet slutter brått i skrått terreng, vegen delvis begravd i skråninger
  (ikke kontrollert på bilde etter Veg.høyder), og småting i 2D-kartet langt ute (Finnmark, kaier, Sverige). HELE NORGE mangler vegtype
  i vektorflisene til «Bygg Norge» er kjørt (til da gjetter Veg.gjett).
  KARTDATA SOM IKKE KOMMER (14. nov, brukeren på /norge etter publiseringen: «Får ikke hentet kartdata – ingen kontakt med nettet eller
  kartlageret», flere ganger; ikke gjenskapt herfra – seks steder, tregt nett og eldre nettprotokoll ga 0 feil, og Vercel-loggen viste
  ingen feil mot GitHub). Tiltak i kartflis.js: Kilde.getBytes prøver kartlageret tre ganger (429, 5xx, nettfeil), reservefila prøves
  bare der den finnes (UTEN_RESERVE; hele Norge har ingen), høyst HENT_SAMTIDIG = 24 hentinger om gangen per tråd (hentTur/hentSlipp –
  fristen FRIST_FLIS = 40 s starter først når hentingen starter), og feilteksten har filnavn og forsøk. site/api/kart.js prøver GitHub
  tre ganger, lagrer aldri feil i hurtigbufferen og skriver «kart: …» i loggen (Vercel runtime logs, 1 time på gratisplanen).
  visFeil (index.html) viser meldingen først ved tre feil på et halvt minutt (eller når nettleseren er frakoblet), med den tekniske
  årsaken i klammer – be brukeren om et skjermbilde av den. VAKT: kartflis.js deler navnerom med index.html (vanlig skript): nye
  navn der må være unike («slipp» fantes fra før og stoppet hele siden; sjekk.js fanget det, node --check gjør det ikke).
  Tester: test_nett.js, test_kartlager.js. Hver publisering tømmer Vercels hurtigbuffer for /api/kart (alt hentes fra GitHub på nytt).
  RUNDKJØRINGER OG KRYSS (14. nov, brukeren: «se på rundkjøringer og veikryss – ser de pene ut?»): spill/veg.js – rundkjøringer(linjer)
  (merket t = 3 i dataene, ellers kjent igjen på formen: buer med radius 5–45 m rundt samme midtpunkt som dekker minst 300°; sirkel()
  er minste kvadraters sirkel), gjett() merker dem i hele Norge (før: fortau, lykter og gangfelt inne i ringen), kanal() gjør
  kanalisert veg uten et parallelt felt ved siden av til vanlig veg (lange stykker, og korte mellom to vanlige stykker – E6 gjennom
  krysset på Dovre var en smal svart stripe), tynn() tar bort punkter på rette strekk (vegnettene 142 000 -> 77 000 trekanter ved
  Dombås). liv3d.js: u.rundt (midt, radius, halv bredde), ringen og svingefeltene med hvite kantlinjer (teksturen «rampe»), brolagt
  kant med kantstein rundt midtøya, vikelinjer på innkjøringene, fyllingene i egen jordfarget gruppe («fylling») i stedet for lys grus.
  Kontrollert på bilder: Dombås, Dovre, Lillehammer, Åsane. VAKT: «veger i 3D» krever rundkjøringen i Dombås og 0 lykter i ringen.
  HØYERE FPS (14. nov, brukeren: «finn flere måter å optimalisere for høyere FPS»). Målt med scratchpad fps/prof-scene.js (trekanter og
  tegnekall per fil som la nettet i scenen, og tegnetid spart når kilden skjules) og fps/prof-piksel.js (pikseltetthet mot tid):
  terrenget er nesten bare pikselkostnad (tallene fra 14. nov – 700 ms med alle effektene, 20 ms med enkel lyssetting – var FEILMÅLT,
  se BILLIGERE TERRENG under), resten av scenen er trekanter (ca. 400 ms uansett oppløsning). Tiltak: «enkel bakke» på Lav grafikk
  (bakkeMateriale/enkelBakke/byttBakke i index.html, KVAL.p.bakke; KROKER.bakke = modulene som bygger på bakkens skyggelegging kobler
  seg på igjen når nivået byttes: natt3d, vind3d), grovere terrengnett på Middels/Lav (KVAL.p.nett, u.nettM bestemmes én gang per
  utsnitt), ruteNett/ruterSynlige i index.html (gjerder, rundballer, brøytestikker og rekkverkstolper i ruter på 160–200 m som bare
  tegnes i synsfeltet og innen 380–900 m), enklere gjerder/steingjerder/rundballer (gard3d.js kasse(…, uten)). Dombås fra lufta:
  640 000 -> 452 000 trekanter; Lav grafikk 1129 -> ca. 560 ms per bilde i testen. sjekk.js låser grafikken til Høy (automatikken
  kunne gå ned underveis). IKKE GJORT: terrenget i ruter med klipping, husene og trærne i ruter, færre trekanter i byene.
  BILLIGERE TERRENG (15. nov, brukeren etter «se på nettet hvordan pene spill kjører så smooth»: «begynn med punkt 1» = dyre effekter
  bare der de trengs). MÅLEFELLE: med tempo = 0 og kameraet i ro tegner spillet bare fire bilder i sekundet (trengerTegning3d), så
  alt under 250 ms per bilde ble feilmålt 14. nov – målingene setter nå tempo = 1 og måler variantene etter tur i flere runder
  (scratchpad fps/prof-ab.js; første runde er alltid treg og regnes ikke). FUNN (programvare-grafikk, trolig også ANGLE/Direct3D på
  Windows, som flater ut betingelser med teksturoppslag): en betingelse i skyggeleggeren hopper ikke over koden bak den – bølger,
  glans og nærdetaljer ble regnet ut for hvert punkt på skjermen. Derfor egne programmer der koden ikke er med (index.html):
  bakkeVariant(R, u, nær, glans, land) – nær = BAKKE_NAER (nærdetaljene, bare når kameraet er under 160 m over bakken, nærmere enn
  200 m eller du går), glans = lys per punkt (ellers hjørnelys(): lys per hjørne som Lambert, likt bilde), land = uten bølger
  (userData.land; vind3d.js medBølger hopper over). delBakken(geo, u) deler terrengnettet i ruter med vann (vannmasken, grov maske
  med en rutes margin) og ruter med bare land: to grupper i geometrien, og bakkeNå() gir materialet [land, vann] (eller ett når
  utsnittet bare har det ene). Land får glans bare når bakken er våt (VAER.våt). R.mesh.material kan altså være en LISTE – bruk
  bakkeErEnkel(R) og [].concat(R.mesh.material); krokene i KROKER.sett3d/KROKER.bakke får alltid ett materiale. Stråletreff mot
  R.mesh virker som før (face.materialIndex: 0 land, 1 vann). Målt (terrenget alene, 1400 × 900): Dombås fra lufta ca. 405 -> 275 ms
  (−32 %), fjellvann fra lufta ca. 440 -> 330 (−25 %), Dombås lavt ca. 410 -> 330 (−20 %); bare kartbildet er ca. 160–190 ms, og
  resten er utseendet (berg i bratte sider, flekker, snø). Hele scenen ved Dombås fra lufta: ca. −20 %. Bildene er like før og etter
  (tørt: snittforskjell 0,3 av 255; regn: likt i samme side og øyeblikk – to kjøringer har skyskyggene på ulikt sted). IKKE VERDT
  DET (målt): å tegne bakken sist (ingen forskjell), skyskygge/våt bakke som egne varianter (ingen forskjell).
  GRAFIKKORTET (15. nov): spill/kvalitet.js leser navnet ved første bilde i 3D (KVAL.kort, Kvalitet.programvare/kortNavn, i loggen og i
  tittelen på Grafikk-knappen). Programvare-grafikk (SwiftShader, llvmpipe, Microsoft Basic Render Driver): melding om å slå på
  maskinvareakselerasjon, og Auto starter på Lav – ikke i testene (navigator.webdriver). Brukeren har meldt 9 bilder i sekundet;
  be om navnet på grafikkortet. VAKT i sjekk.js («billigere terreng»). Verktøy: scratchpad fps/del-test.js, ab-bilde.js, finn-vann.js.
  MÅLING PÅ SPILLERENS MASKIN (15. nov): brukeren har Intel(R) Iris(R) Xe Graphics (innebygd grafikk i en bærbar, Edge på Windows) –
  altså ikke programvare-grafikk. Testmaskinens tall sier lite om hans maskin, så spill/ytelse.js (reglene øverst uten DOM,
  test_ytelse.js) gir «Mål ytelse» i ☰ (bare i 3D): hele bildet, halv oppløsning (R3.målPr) og uten én og én del – bakken, trærne,
  husene og de største av resten etter kilden (userData.kilde = fila i spill/ som la tingen i scenen; scene.add pakkes inn ved første
  bygg3d og leser stakken). Delene skjules med lag (layers), ikke visible. Mens det måles (R3.måler): alle bilder tegnes
  (trengerTegning3d), oppløsning og grafikknivå står stille, og index.html måler R3.løkkeTid (hele spilløkka) og R3.tegneTid (three.js).
  Én oppvarmingsrunde som ikke teller; «sparer ms» regnes mot snittet av hele bildet først og sist (Ytelse.grunnlag). Tabellen kan
  kopieres som tekst. BE BRUKEREN OM TABELLEN før mer optimalisering – den sier om det er prosessoren, punktene på skjermen eller
  tingene i bildet. Testserveren har ingen hus (husdataene ligger i kartlageret), så «Uten husene» mangler lokalt. VAKT i sjekk.js
  («måling av ytelse»). Prøvekjøring: scratchpad ytelse/prov.js.
  BRUKERENS MÅLING (15. nov, /norge ved 15607 6622779, Høy grafikk, 1920 × 838 punkter): 16,7 ms per bilde = 60 bilder i sekundet
  (skjermens tak), spillets regning 4 ms, 576 000 trekanter, 151 tegnekall. Jevn bildefart er altså ikke problemet der – det som
  merkes, er HAKK når et nytt område lastes. Brukeren ba så om arbeid med ytelse, småfeil og utseende fram til kl. 11.
  HAKK VED NYTT UTSNITT (15. nov). Målt med scratchpad hakk/hakk2.js og hakk/pust.js (ekte kartdata via dev.py, tegningen slått av –
  programvare-grafikken fyller ellers hovedtråden –, lange oppgaver fra PerformanceObserver og pausene mellom bilder): hovedtråden sto
  0,4–0,6 s i ett strekk på landet og 0,7 s i Bergen, to ganger per utsnitt. Nå: ca. 0,06 s på landet og 0,10–0,15 s i Bergen.
  (1) PUST: pust()/børPuste()/iStriper()/kjørAsynk() i index.html – byggingen gjøres i biter, én bit per bilde. pusterom() venter på
  neste bilde (requestAnimationFrame med tidsgrense). FORKASTET ETTER MÅLING: meldingskanal (Chrome tar flere meldinger i én oppgave i
  opptil 50 ms) og scheduler.yield() (fortsetter før bildet tegnes: ni bilder i sekundet under bygging). Bitens lengde: pustTid() =
  60 % av tiden mellom bildene, 8–16 ms. Aldri pust i skjult fane. Nye tunge løkker i bygg3d-kroker (alle er async) skal ha
  `if (børPuste()) await pust();` – ikke `await pusterom()` etter antall (det venter et helt bilde hver gang).
  (2) Pikselarbeidet i bygg3d går noen rader om gangen: getImageData/putImageData i striper, naturfarger/skogbunn/vannIBratt/havnivå
  med radområde (rad0, rad1, og tilstand i st der noe regnes én gang), vannmaske/skogmaske/ryddHus er async.
  (3) FORBEREDELSE: forbered3d(u) lager det tunge i byttet på forhånd – terrengnettet (terrengGeo) med delBakken, trærnes plass
  (treMatriser), husnettene (husGeometri), hindringene – i u.klar, og kaller KROKER.forbered3d (ny; liv3d.js lager vegnettene der:
  byggVeger er en generator, settVeger legger dem i scenen). sett3d(u) bytter inn det ferdige og lager alt selv når u.klar mangler
  (R3.forberedt sier hva som skjedde). I Bergen gikk sett3d fra 340–535 ms til 35–93 ms. Nye tunge ting i en sett3d-krok bør
  forberedes på samme måte (generator + kjørAsynk i forbered3d-kroken, kjørRett som reserve).
  (4) Raskere oppslag med samme svar: Veg.rute – gå() hopper over ruter utenfor søkeradien (klaring: radien + bredeste veg);
  kryss.nær med tallnøkler; Garnison.inni med kantene i vannrette bånd (by.bånd, test mot den enkle utgaven i test_garnison.js);
  Veg.gjettSteg (generator); iBy i liv3d husker svaret i ruter på 4 m.
  GJENSTÅR (enkeltsteg på 50–150 ms i byene): vegetasjon3d-kroken (vegRute, vannAvstand), liv3d (høyder/utenTunnel for én lang veg,
  lykter), kraft3d, kyst3d (plasser), infra3d (løftVeger). Teksturopplastingen (4096²) og nye skyggeprogrammer skjer på grafikkortet
  og kan ikke måles her. VAKT i sjekk.js («bygging i biter»: forberedt og uforberedt bytte gir like utsnitt, og det tas pust).
  TÅKEBILDET (15. nov): tåka og siktfeltene ligger i R3.tåkeC (1024 × 1024, R3.tåkeTex, forhåndsmultiplisert alfa) som bakkens
  skyggelegger legger oppå kartet (TAAKE_U/TAAKE_GLSL i detaljIBakken og enkelBakke). bak3d() tegner bare tåkebildet. Kartbildet i
  bakken er utsnittets eget bilde (R3.texC = u.base – ingen kopi) og sendes til grafikkortet én gang per utsnitt; før ble hele
  kartbildet (opptil 4096², 64 MB) tegnet og sendt på nytt hver gang et lag hadde flyttet seg. Minikartet (kompass.js) tegner
  tåkebildet oppå kartet. Likt bilde før og etter (snittforskjell 0,2 av 255). VAKT «tåkebildet».
  MÅLEKNAPPEN VED SKJERMENS TAK (15. nov): Ytelse.mål måler først skjermens takt uten å tegne (R3.målGanger = 0). Ligger bildet
  på takten (Ytelse.erTak), tegnes bildet 2, 4, 8 … ganger per bilde til det tar minst fire takter (Ytelse.nokTegninger), og
  tallene deles på antallet («ms/tegn.»). Prøvd med oppgitt takt (valg.takt): 202 ms per tegning mot 200 ms målt direkte.
  KJENTE FEIL SETT PÅ NYTT 15. nov: de lyse trekantflekkene ved Mannheller er borte (myke bergflater nå). Jernbanen ved Dombås
  stasjon mangler fortsatt i 3D (ikke rettet).
  UTSEENDE 15. nov (bilder fra /norge med ekte data, scratchpad norge/norge3d.js – nå med «info» som skriver tall):
  SKOG: kroneflekker i skogbunnen (kroneflis(), KRONEMØRKE, i skogbunn() med kart = { mpp, X0, Y1 }; bare når kartbildet er finere enn
  1,7 m per punkt) og en myk skygge under hvert tre og hver busk (treskygger(), tegnet etter bygg3d-krokene, u.skygger = antall).
  Ingen nye trekanter. VINTER: snøen ligger også i bratte lier (flathet 0,36–0,62 i detaljIBakken og enkelBakke, samme i fjern3d.js;
  før 0,55–0,8, så alt brattere enn ca. 45° var sommergrønt), og der den ikke ligger er gress og lyng vissent (snoH · gronn).
  NATT: tussmørke i lys3d – med sola 4–14° under horisonten gir himmelen fortsatt lys (dagL; sommernatta 0,67 mot 0,44 før), og
  natta ellers 0,5 (før 0,42). GRESS I BYEN: i tettstedene (u.iBy) settes gresstuster bare der bakken er tydelig grønn og ikke
  inntil hus (det vokste gress på brosteinen på Bryggen). GÅ: Gange.åpenRetning – «Gå» starter med blikket mot åpent lende (minst
  12 m fri sikt nærmest kursen du hadde), ikke med nesa i en vegg. VAKT «utseende 15. nov».
  Skråkanten bak fortauet er grå i tettstedene (gruppen «bykant» i liv3d.js; den var gressgrønn midt i Oslo).
  MÅL HAKK (15. nov): Ytelse.målHakk – knappen «Mål hakk» i ☰ måler i 20 s pausene mellom bildene mens spilleren flyr rundt, og
  deler dem etter om et nytt område ble satt inn (R3.settNr), bygget (R3.bygger) eller ellers (Ytelse.hakkTekst, test_ytelse.js).
  Brukes til å se hakk som kommer fra grafikkortet (teksturopplasting, nye skyggeprogrammer) – de kan ikke måles på testmaskinen.
  BE BRUKEREN OM DENNE RAPPORTEN hvis han fortsatt opplever hakk.
  KARTBILDET SENDES PÅ FORHÅND (15. nov): forbered3d lager teksturene for kartbildet og vannmasken (K.tex, K.vannTex) og sender dem
  til grafikkortet med renderer.initTexture, hver i sitt bilde, før byttet; sett3d bruker dem. Et forberedt utsnitt som ikke settes
  inn, frigjøres med kastForberedt(u). Virkningen kan ikke måles på testmaskinen (se «Mål hakk»). Stresstest: scratchpad
  hakk/stress.js (flytting tett på hverandre, 3D av/på midt i en bygging, zoom, grafikknivå, gange – 0 feil) og hakk/lekk.js
  (teksturer og geometrier øker ikke).
  FØRSTE 3D-ÅPNING (15. nov ettermiddag, brukeren på iPhone 5G: «Bare jeg først trykker 3D, bruker den alt for lang tid på å bygge 3D»;
  skjermbildet viste en svart skjerm med «Bygger 3D …» to ganger – andre trykk på 3D avbryter og starter på nytt). Målt (mobilstørrelse,
  ekte data): ca. 3,5 s til innsetting – også før nattens endringer (ingen forverring). (1) detaljTekstur(): steinmønsteret (Voronoi)
  prøvde alle 90 steiner × 9 kopier per punkt – 905 ms første gang; nå rutenett på 32 punkter med ringsøk, 71 ms, likt punkt for punkt
  (scratchpad hakk/detalj-lik.js). (2) forvarmBakke(R): første gang 3D slås på lages bakkens program for land (fra lufta og nær) på en
  prøveflate mens byggingen venter på kartdata; materialene holdes i R.bakkeHold, og programnøkkelen er den samme (sjekket – det ekte
  bakkematerialet får samme program). SwiftShader kompilerer først ved tegning, så gevinsten kan ikke måles her. (3) FREMDRIFTSKORTET:
  mens det første utsnittet bygges, står kartet (visLag3d(false)) med kortet #bygg3d «Bygger 3D … 45 %» og Avbryt; framdrift(tekst,
  andel) settes i bygg3d (høyder, kartbildet per flis, hus, trær, krokene, klargjøring); sett3d viser 3D-lerretet (visLag3d(true)).
  Loggen sier «3D klart på X s» – BE BRUKEREN OM DETTE TALLET. VAKT «fremdriftskortet» (fant at andre åpning viste svart 3D-lerret).
  RUNDE 2 (15. nov 16:30, brukeren med skjermbilde: kortet sto på «Henter høydene … 5 %», «Den bruker alt for lang tid»). Målt med tregt
  nett (CDP: 150 ms forsinkelse, 20 Mbit/s; scratchpad hakk/treg.js, LOKAL=<port> bruker dev.py): 6,9 s -> 5,3–5,6 s. (1) forhent3d():
  terreng/høyde z9, hus z13 og vektor z13 bes om med en gang (hentFlis husker dem); (2) høydene (lagVindu grov og fin) og kartbildet
  hentes og lages samtidig (Promise høyder, ventes på etter flisene); (3) pustTid() = 50 ms så lenge 3D ikke vises ennå. Kartdataene er
  nå hentet etter ca. 1,6 s. Resten er første tegning (programmer, teksturer) – kan ikke måles riktig med programvare-grafikk.
  NB: hver publisering tømmer Vercels lager for /api/kart, så første åpning rett etter en publisering henter alt fra GitHub.
  RUNDE 3 (15. nov 17:35, brukeren med skjermbilde: kortet sto på «Henter høydene og kartet … 50 %» – «Det stopper her», og ba om en
  tidteller i kortet). 50 % = kartbildet er ferdig (bakgrunnstråden), byggingen venter på høydene (lagVindu på siden). IKKE GJENSKAPT
  herfra (tregt nett, uten OffscreenCanvas: 3–4 s). Tiltak: kortet viser «· 12 s» og en diagnoselinje (.nett): «venter på: grove høyder,
  fine høyder» (R3.venterPå), «fliser: hoyde 5, hus 16» (FLIS_VENTER i kartflis.js = bestilt og ikke ferdig lest, per lag) og «nett: 6
  hentes, 0 i kø». Frister: (en frist på bildelesing ble prøvd og TATT UT: både 4 s og 15 s slo til under last i sjekk.js, og flisen ble ikke laget – ikke legg den inn igjen), fine høyder 6 s etter de grove
  (ellers brukes de grove), omlandet 6 s. BE BRUKEREN OM ET SKJERMBILDE AV KORTET hvis det stopper igjen – linja sier om det er nettet,
  lesingen eller noe annet.
  RUNDE 4 – ÅRSAKEN (15. nov 18:09, brukerens skjermbilde av kortet: «venter på: grove høyder · fliser: vektor 5521 · nett: 24 hentes,
  5431 i kø»): fiendens patrulje (ENHETER[3], uten AI) var flyttet til leiren i Ryfylke (AI.flytt), men PATRULJE-punktene ligger på
  Dovre – ordre() ba om kart (lagVindu med veger) for 350 km, og høydene til 3D sto bakerst i hentekøen. Nå: MARSJ_MAKS = 30 km i
  luftlinje per ordre (Claudes tall; lengre ordre avvises før noe hentes, spilleren får «gi ordren i etapper»), og patruljeMål(fi, nr)
  lar patruljen gå runden rundt stedet den står når den er langt fra Dovre (fi.patruljeBase). VAKT «lang marsj» i sjekk.js.
  Testene fanget det ikke fordi de ikke har en lagret leir utenfor Dovre.
  BRUKERENS MÅLINGER PÅ IPHONE (15. nov kveld, Apple GPU, Safari 26, 502 × 1015 punkter): «Mål ytelse» – 7,8 ms per bilde, skjermens
  tak 59 bilder/s, én tegning 1,6–4 ms (telefonen ble tregere underveis, så «sparer ms» var upålitelig). Bildefarten er altså ikke
  problemet. «Mål hakk» (utsnitt 9,7 km, flyr rundt): 25 pauser over 50 ms på 20 s, sum 6,4 s; 16 av dem «bygging» på 300–380 ms,
  6 «bytte» (lengste 201 ms). På testmaskinen er de lengste bitene 60–80 ms – noe er altså tregt i Safari (gjetning: lesing fra
  lerret/sending av kartbildet til grafikkortet; IKKE bekreftet). Derfor: «Mål hakk» har nå «Hvor i koden» – pusterom() husker
  stedet pusten ble tatt (Ytelse.stedFraStakk, bare mens R3.måler), og hver pause får «forrige pust → denne pusten» (fil:linje),
  eller «uten pust (trinn)» med R3.steg fra framdrift(). BE BRUKEREN OM NY RAPPORT før noe endres i byggingen.
  INTERIØR (15. nov kveld, brukeren: «Alle bygg skal ha interiør, og en skal kunne gå inn i dem»): spill/interior.js (regler uten
  DOM, test_interior.js: 504 prøvebygg av alle 14 klasser i tre former – alle rom nås, ingen møbler i vegger/døråpninger) +
  spill/interior3d.js. Interior.plan(P, { i, kl, h, dør }) – samme bygg gir samme plan: rommene deles langs byggets lengste side
  (KLASSE: største rom og minste side per klasse; butikk/industri/lager/låve/kirke/hangar/terminal er haller, noen med bakrom), hver
  skillevegg får én døråpning der det er rom på begge sider, veggene klippes mot omrisset, rollene (stue, kjøkken, soverom, bad, gang,
  kontor, klasserom, sykerom, butikk, lager, verksted, låve, garasje, bod, kirke …) gir møblene (MØBLER: mål og om de sperrer).
  Store møbler holder gangveiene fri (fra hver åpning til rommets midte), og i rom som omrisset skjærer av, sperrer ikke møblene.
  Interior.blokkert (yttervegger unntatt inngangen, skillevegger, store møbler), Interior.høyde (gulvet inne, trapp foran døra),
  påTrapp. hus3d legger døra og klassen på omrisset (P.dør = første dør, P.bygg = { i, t, h, kl }); interior3d.js (KROKER.ramme3d,
  bare når du går): nærmeste bygg innen 30 m uten interiør får ett (ett per kvarte sekund, høyst 10, bort over 50 m) – gulv over
  det høyeste terrenget under bygget, himling, innervegger, vinduer som lyse flater, åpent dørblad, trapp, møbler av kasser
  (deler(m)), ett nett med hjørnefarger (ca. 500–5000 trekanter per bygg). P.inne = planen: hindring3d bruker den (ikke med eget
  rutenett), gange.js bruker Interior3d.høyde/påTrapp (verden.trapp i bevegelse.js: trapper er aldri «for bratte»). gress3d setter
  ikke gress inne i hus. BEGRENSNINGER (sagt til brukeren): bare første etasje, vinduene er ikke gjennomsiktige, døra ser lukket ut
  utenfra (du går gjennom den), runde bygg (tank, fyr) har ikke interiør, bygg i bratt terreng får høy trapp, byggene i leiren
  (leir.js/byggesett) er ikke med. Rom, mål og møbler er Claudes forslag. VAKT «interiør» i sjekk.js (prøvehus lagt inn i utsnittet).
  Bilder: scratchpad inne/inne.js (KL=hus|låve|butikk …, ekte husdata via dev.py; tiden spoles for å gå inn).
  INTERIØR, UTSEENDE (15. nov sent, brukeren: «det må se mye bedre ut»): interior3d.js er skrevet om. Ett nett per bygg med åtte
  stoffer (STOFFER: glatt, parkett, flis, betong, malt, panel, tre, tøy – mønstrene tegnes i koden, METER = hvor mange meter
  mønsteret dekker) og fire små nett: vinduene (bilde av utsikt), skygge (gjennomsiktig), lampelys og dagslys (additive flekker på
  gulvet). romStil(pl, r, nr): gulv og vegg per rom (parkett i en tone per bygg, fliser på bad, teppe på kontor, betong i haller,
  panel i hytter/låver, veggfarge per rom). Veggene er mørkere nede og i hjørnene (hjørnefarger), har gulvlist, og deles der
  skilleveggene møter ytterveggen. Dørene mellom rommene har karm, overstykke og et åpent dørblad (Interior.plan gir nå retning og
  bredde per døråpning: [x, y, dx, dy, w]); inngangen har karm, dørmatte, en mørk åpning og åpent dørblad utenfra. Vinduer med
  karm, sprosser, vinduspost og gardiner; taklamper (lysrør i haller); skygge under møblene og langs veggene; teppe under
  salongbordet; bilder på skilleveggene. Møblene (deler(m)) har flere deler og egne stoffer, runde deler som åttekanter.
  Hvitmalt tre tegnes uten årer. Ca. 5000 trekanter for et lite hus. Lyset følger NATT.mørke (lampene sterkere om natta).
  NATTARBEID 16. NOV (brukeren: «fortsett og utbedre fram til 07:50 – flere funksjoner og forbedre det som er, f.eks. menyene»):
  (1) ☰-MENYEN: spill/meny.js (lastes etter alle moduler med knapper i menyen) flytter knappene i #lagmeny inn i grupper (GRUPPER:
  Kartet, Oversikt, Vær og årstid, Bilde og lyd, Måling; ukjente havner under «Annet», «Nytt spill» nederst), av/på-knappene
  (klassen «av» som før) får en bryter, valgene («Navn: verdi») vises med navnet til venstre og verdien til høyre – kolonet står
  igjen skjult, så textContent er uendret –, Esc og trykk utenfor lukker. En ny knapp i menyen: legg navnet inn i GRUPPER.
  (2) LEIR-MENYEN (leir-visning.js visMeny): status som fire fliser (.flis), fanene Bygg / Lager / Plan / Mål (variabelen fane,
  LeirSpill.fane(id)); alt ligger fortsatt i siden, og det som ikke hører til fanen, er skjult (data-fane, hidden). Fanen bestemmes
  av overskriften (h3) foran: «Materialer …» = lager, «Byggelag» og «Byggesett» = bygg, «Planlegg …» = plan, «Mål» = mål; det som
  har klassen «fast», står alltid over fanene. LEIR_MENY-tillegg uten kjent overskrift følger fanen foran seg.
  (3) MÅL: spill/maal.js (regler, test_maal.js) + maal-visning.js – 14 mål i fire kapitler (Få leiren i gang, Få oversikt, Lev av
  landet, Ut i verden), lest fra et øyeblikksbilde hvert annet sekund (MaalSpill.bilde), huskes per leir («riksbrudd-maal»),
  «Neste mål» over fanene, melding i loggen. Målene er Claudes forslag.
  (4) PANELET nede til venstre: spill/panelpynt.js gjør statuslinja (#psub, «a · b · c») om til brikker (skilletegnene står igjen
  skjult) og gir et valgt lag målere for styrke og ammunisjon (#pmaal).
  (5) LETING I HUS: spill/leting.js (regler, test_leting.js: Leting.funn(kl, areal, i) – mat, tre, betong, stål, diesel, penger
  eller tomt, fast per bygg) + leting-visning.js: inne i et bygg (Interior3d.inne) kommer #letknapp «Let gjennom huset» (E),
  4–15 s, funnet legges i leiren (FolkSpill mat, Leir.leggInn, L.drivstoff opp til tankene, OppstartSpill.gi), huskes per leir
  («riksbrudd-leting»). Mengdene er Claudes forslag. VAKTER i sjekk.js: «☰-menyen», «Leir-menyen og målene», «leting i hus».
  KONTROLL I KOPI: scratchpad snapsjekk.sh <navn> <port> [profil] kopierer site/ og pipeline/ og kjører sjekk.js der, så
  arbeidstreet kan endres imens. PC-profilen alene tar nå over ti minutter.
  (6) LYD INNE: Lyd.nivåer(t.inne) demper vind, hav, by og fugler inne i et hus, fottrinn «gulv». #innelapp viser byggtypen og
  om huset er gjennomsøkt. (7) LAGRING: «riksbrudd-verden» har nå også tettsteder (eier), infra (nøklene som ikke er hele) og olje.
  (8) HJELPEN: kort oppskrift, søkefelt, emnene i grupper som <details> (GRUPPER i hjelp.js; nye emner må inn der, ellers «Annet»).
  (9) Bygglista i Leir-menyen står i grupper (GR i visMeny); måltelleren #sMaal i statuslinja åpner fanen Mål.
  (10) EKTE VINDUER: innerveggen har hull der vinduene er, og mens du står inne i et bygg, settes husmaterialene (R.husMesh) til
  THREE.FrontSide (husSide i interior3d.js) – ytterveggen rundt deg tegnes da ikke innenfra, og du ser landskapet og nabohusene
  gjennom vinduene og døra. Ute er de DoubleSide som før. Glasset er en svak, gjennomsiktig hinne (materialet «vindu»).
  (11) OVERLEVENDE: Leting.funn(...).person (OVERLEVENDE per klasse) – leting-visning.js rekrutterer gratis med
  FolkRegler.rekrutter når det er en ledig seng. (12) HURTIGTASTER: spill/taster.js (TASTER: 3, G, L, M, H, K, P, komma, punktum –
  trykker på knappene som finnes; ikke i tekstfelt eller på startskjermen; mens du går bare 3/G/L/M/H). VAKT «hurtigtaster».
  Flere mål som nås samtidig, meldes i én linje i loggen (loggen har bare seks linjer).
  (13) DAGBOK: spill/dagbok.js (regler øverst, test_dagbok.js; visningen nederst i samme fil) – hver morgen (ny dag, Dagbok.dag(tid))
  en rapport i loggen (folk, moral, mat i døgn, diesel og hvor lenge den rekker etter siste døgns forbruk, kassa og endringen,
  mål), med varsler først. De sju siste står under «Dagbok» i fanen Mål; huskes per leir («riksbrudd-dagbok»).
  (14) NAVN I KARTET: navnSynlig(o)/leirTillegg() i index.html – zoomet ut (kam.m > NAVN_UTE = 14) skrives ikke navnet på egne
  lag og kjøretøy innen 2,5 km fra leiren (unntatt det valgte); leirens navn får «· 5 lag, 4 kjøretøy». (15) STATUSLINJA: folk,
  kassa og strøm kan trykkes (panelpynt.js) – åpner Folk / Leir-menyen. (16) Dørlyd når du går inn eller ut av et hus (lyd.js),
  og funnet fra en leting står midt på skjermen i fem sekunder (#innelapp.funn).
  (17) INTERIØR, SMÅRETTINGER: hus3d setter P.veggTopp (der ytterveggen slutter under saltak) – himlingen holdes under den, minst
  1,95 m. Den mørke døråpningen sett utenfra er et eget lite nett (o.ytre, materialet «åpning») som skjules når du står inne i
  bygget, så du ser ut gjennom døra. ANDRE ETASJE er vurdert og droppet: boliger med saltak har vegger på ca. 2,7 m (resten er tak).
  (18) SALG: Leir.selgMateriale(L, type, mengde, gi) – overskudd selges for REGLER.salg = 0,5 av innkjøpsprisen (Claudes tall);
  «Selg 10» står ETTER «+10» i hver materialrad (sjekk.js bruker den første knappen), og raden har en måler for lageret.
  MARKEDET (K5 i plan-kollaps.md: priser som flytter seg, inflasjon) er IKKE laget – det har åpne spørsmål til brukeren.
  (19) INNGANGSMERKE: interior3d.js tegner «Inngang» over dørene til de tre nærmeste byggene (innen 28 m) når du går ute
  (KROKER.tegn3d). Et nytt spill uten nådde mål får et tips i loggen om Leir-menyen (ikke i testene).
  (20) FOTOMODUS: spill/foto.js – «Fotomodus» i ☰ (tast U) setter body.foto, som skjuler alt utenom lerretene; #fotoav, Esc eller U
  henter menyene tilbake. Navnene i 3D (overlegget c3o) skjules også; lagsymbolene i 2D tegnes i kartet og står.
  (21) GJENNOMSØKTE HUS: LeteSpill.lett() er en Map (byggets nummer -> [x, y] i kartet); 2D viser en hake på dem når kam.m ≤ 4,
  og inngangsmerket i 3D sier «Inngang ✓». Meldingen etter en leting sier hva som ble igjen og hvorfor (ingen tank / fullt lager).
  HELE FLYTEN er prøvd på /norge med ekte data (scratchpad inne/flyt.js: nytt spill ved 15607 6622779, 3D, Gå, seks bygg –
  alle ble gått inn i og gjennomsøkt, funnet lå i leiren, 0 feil).
  (22) INTERIØR I LEIRENS BYGG (16. nov: «alle bygg» gjelder også leiren): LEIRBYGG i interior3d.js – brakke, kontrollrom,
  sykestue og kjøkken (kroppen av modellen, døra der modellen har sin, grunnmurens høyde). Hvert ferdige bygg får et omriss P med
  P.leir, P.gulvFast, P.veggTopp, P.dør og P.bygg (i = 9 000 000 + byggets id) og legges i R.hindre (leirbygg(R, u), synkes når
  byggene eller utsnittet endres) – byggene stopper deg altså nå når du går mot veggen. Nye klasser i Interior.KLASSE (leir: true):
  brakke (køyesenger, ovn), kontrollrom (kartbord, pulter, radio, tavle), storkjøkken (benk, komfyrer, langbord); sykestua bruker
  «sykehus». Modellene i modeller.js tegnes bare utenfra (FrontSide), så veggene er borte sett innenfra. Ingen leting i leirens
  bygg. Interior3d.iLeirbygg(x, y): gress3d og vegetasjon3d setter ikke planter der. Navn og merker fra kartet (proj3) vises
  ikke mens du står inne i et hus. Også verkstedet (døra på langsiden, side: 'y+') og
  lagerteltet (klassen «lagerhall»: paller og hyller langs veggene når rutenettet ikke gir noe). Gulvet ligger alltid over
  høyeste terreng under bygget (P.gulvFast er et minste), men aldri høyere enn 2 m under veggtoppen (i en bratt bakke stikker bakken da inn). Containeren og drivhuset (klassen «drivhus»: plantebed i rekker) er også med;
  modellene deres har skiver tvers gjennom (ribber, spanter), så modellen skjules mens du står inne (skjul: true, modellSynlig).
  Beskjeden når du ikke kan gå inn i kontrollrommet sier hva som mangler (hvorforIkke i kontrollrom-visning.js).
  IKKE MED: byggesettets egne hus.
  (23) DET SOM BLE IGJEN: materialer og diesel som ikke fikk plass etter en leting, ligger igjen i huset (tredje ledd i
  LeteSpill.lett(): [x, y, { tre, betong, stål, diesel }], lagres). Inne i huset kommer «Hent det som ligger igjen» bare når noe
  av det får plass (plassTil); hent(P) tar det uten ny leting. Merkelappen sier «noe ligger igjen». VAKT «det som ble igjen».
  BYGGEVISNING I 2D (16. nov, brukeren: «gjør 2D-kameravisningen enda bedre når du bygger»): spill/byggevisning.js (reglene øverst
  uten DOM: rutesteg, ramme, meter, lengde; test_byggevisning.js). BYGGEVISNING.på() = 2D og plassering/planmodus/byggesett åpent.
  index.html bytter da tegnerekkefølgen: alle tegnekroker uten f.bygg og lagene først, så BYGGEVISNING.under (mørkt slør, rutenett
  fra leirens midte 2,5/10/50 m, sirkelen «uten reisetid innen 300 m»), så krokene med f.bygg = true (leir-visning.js og
  byggesett-visning.js) og BYGGEVISNING.over (mål på to sider av skissen, pil på forsiden = +x i modellen, stiplet strek og avstand
  til nærmeste nabo, «x m fra leiren» utenfor 300 m, gjerdets lengde, rekkevidde RING for vakttårn/sykestue/sandsekkvoll/kameramast –
  også for dem som alt står). Kameraet: gåInn() når byggingen begynner og du er lenger ute enn 0,8 m per punkt eller leiren er
  utenfor bildet (0,45 s, et trykk avbryter); visSkisse() flytter kartet når skissen havner under banneret (#byggvalg) eller utenfor
  bildet (fri() = det frie feltet). I testene (navigator.webdriver) bare med BYGGEVISNING.test = true. body.bygger2d; på små skjermer
  skjules loggen mens du bygger. leir-visning.js tegn1: skygge under byggene, møne, lyst merke på forsiden, navn via Etikett.
  Med byggesettet åpent følger rutenettet byggesettets ruter (2,4 m fra L.byggesett), og kartet flytter seg også for forslaget der
  (skissepunkt: midten av Byggesett.forslag(), q.d).
  KJØRING, VEG, PAUSE OG DELEGERING (16. nov kveld, brukeren: «gjør det mulig å bygge veier, delegere arbeidere, pausen kan ikke
  startes igjen på telefonen, kjørbare helikopter og biler»):
  PAUSE: fartsknappene i index.html – sp0 i pause klikker farten du hadde (fartFør), viser ▶, og den farten får klassen «sist» så
  den står synlig på små skjermer (kompakt.js skjulte alle fartsknappene i pause). VAKT «pause».
  KJØRING: spill/kjor.js (reglene øverst: Kjor.bilSteg/heliSteg, test_kjor.js; visningen KjorSpill nederst). En feltbil og et
  helikopter per leir («riksbrudd-kjor», i kartets meter X/Y; helikopteret på helikopterplassen hvis den finnes, ellers flyttes begge
  til et fritt sted første gang de er i utsnittet). Gange.settFører(fn, [huk, hopp]) lar en fører ta over rammen i Gange.kamera
  (inn: fram, side, opp, ned, dt); F / #kjorknapp setter deg inn (innen 8 m) og ut (bilen må stå, helikopteret må ha landet).
  Kameraet ligger bak kjøretøyet og glir tilbake to sekunder etter at du har sett deg rundt. Helikopteret setter R3.bane.avst = 2400
  (større utsnitt); ved kanten av utsnittet bremses kjøretøyet («Venter på kartet lenger fram …»). Bilen går 27 m/s på veg
  (u.påVeg, Liv3d.dekke, LeirSpill.påEgenVeg) og 11 m/s i terrenget. Tallene er Claudes. gange.js: kroppen flyttes med når utsnittet
  byttes (kroppU), og dt er aldri negativ. VAKT «kjørbare biler og helikopter». Ingen motorlyd og ingen skade ennå.
  VEG: Leir.BYGG.veg (linje som gjerdet, veg: true, 5 m bred, 6000 kr/m – Claudes tall), Leir.vegAvstand/påVeg (bare ferdig veg),
  2D som bredt bånd, 3D veg3d i leir-visning.js (bånd hver 3. m, bare så langt den er bygget), trær ryddes langs vegen (innenfor).
  DELEGERING («deiligere arbeidere» lest som «delegere arbeidere» – Claudes tolkning, sagt til brukeren): Leir.prioriter(L, id)
  («Bygg dette først» i byggpanelet) og en nedtrekksliste per person i Folk («Vis folkene», FolkRegler.sett). VAKT «grusveg og delegering».
  «LAG ALLE 7» (16. nov sent, brukeren etter spørsmålet «hva mangler spillet?»): spill/spillet.js (regler uten DOM: Trussel, Marked,
  Oppdrag, Kamp, Hendelser, Deling; test_spillet.js) + spill/spillet-visning.js (window.SpilletSpill). Alt lagres per leir
  («riksbrudd-trussel», «-marked», «-oppdrag», «-hendelser»; venner i «riksbrudd-venner»). I TESTENE (navigator.webdriver) SKJER
  INGENTING AV SEG SELV: SpilletSpill.test = true slår det på. «Ekte tid» = sekunder med spilling (1× er sanntid, så ting utløses av
  spilltid ELLER ekte minutter, det som kommer først). Alle tall er Claudes forslag.
  (1) ANGREP: røverlag (side «rød», e.raid = bølge) settes ut 1,4–2,2 km unna og får ordre mot leiren; bølgene vokser (1–6 lag);
  slått tilbake = belønning og +5 moral. (2) MARKED: Marked.steg flytter prisene hvert døgn (eller hvert 10. ekte minutt) og skriver
  dem inn i Leir.MATERIALER, Leir.DRIVSTOFF.prisPerLiter og FolkRegler.R.matPris; salg gir 80 % (Leir.REGLER.salg). (3) OPPDRAG: tre
  ledige (hent, redd, post) i fanen Mål; «post» setter ut røverlag (e.post = id); framme = eget lag eller deg selv innen 60 m;
  redningsoppdrag gir 1/3/6 personer etter til fots/feltbil/helikopter. (4) KJØRETØY: skade (KjorSpill.skad), reparasjon mot penger,
  motorlyd (egen AudioContext). Egne kjøretøy i KJORETOY uten ordre kan kjøres (KjorSpill.innEgen: en stedfortreder med
  bilreglene skriver x/y/retning tilbake; ingen skade på dem). (5) KAMP TIL FOTS: SpilletSpill.skyt() (PC: klikk med
  låst mus, R lader; telefon #skytknapp), Kamp.sikter/sjanse, fiender innen 220 m gir skade (kampSteg hvert sekund), helse og
  ammunisjon i tegn3d, slått ut = tilbake til leiren. (6) HENDELSER: kort #hendelse med to valg (Hendelser.LISTE), og folkene som
  figurer i leiren i 3D (InstancedMesh, høyst 14). (7) VENNER: Deling.kode/les – leiren som lenke (#venn=…), vennens leir tegnes i
  2D-kartet. Dette er IKKE flerspiller i sanntid (krever en tjener; sagt til brukeren). leir-visning.js: overskrifter som begynner
  med «Mål» hører til fanen Mål. VAKT «angrep, marked, oppdrag, kamp, hendelser og venner».
  SKYTEVÅPEN OG SEKK (16. nov sent, brukeren: «legg også til skytevåpen og et inventory-system»): spill/utstyr.js (reglene øverst:
  Utstyr.VÅPEN – pistol, mp, gevær, hagle (6 hagl), rifle (700 m) –, Utstyr.TING – fire slags ammunisjon, førstehjelp, feltrasjon –,
  høyst 4 våpen og 35 kg, lad/sikter/sjanse/bruk/funn/fra; test_utstyr.js). UtstyrSpill: sekken per leir («riksbrudd-utstyr»),
  panelet #sekk (knappen «Sekk» / tast I når du går), tastene 1–4 og #byttvapen på telefon, kjøp i Leir-menyen («Materialer: våpen og
  utstyr» = fanen Lager), fantIHus(kl, i) kalles fra leting-visning.js. Kampen i spillet-visning.js bruker våpenet du har framme
  (A() = UtstyrSpill.aktivt(); K.mag/K.res er lese-/skrivefelt mot våpenet og sekken). Tallene er Claudes.
  OVERLEVELSE (16. nov sent, brukeren etter Project Zomboid: «utarbeid 3 og en versjon av 4 og 5»): spill/overlev.js (reglene øverst:
  Overlev.Ferdigheter/Tilflukt/Forfall; test_overlev.js; OverlevSpill nederst). (3) FERDIGHETER skyting/styrke/utholdenhet/leting,
  nivå 0–10 (kreves(n) = 40·n^1,5), lagret per leir («riksbrudd-ferdigheter»): skyting ×(1 + 4 % per nivå) på treffsjansen
  (spillet-visning.js), styrke +2 kg per nivå (Utstyr.ekstraVekt -> Utstyr.maks()), utholdenhet +8 % løpetid (Bevegelse.REGLER.løpTid),
  leting −6 % letetid (leting-visning.js). Vises nederst i sekken (OverlevSpill.fyllSekk). (4) TILFLUKT: «Sikre huset» inne i et hus
  (#sikreknapp, 3 m³ tre fra leirens lager, høyst 6, «riksbrudd-tilflukt»): dekning 'tilflukt' = 8 % skade (Kamp.skade), «Hvil her»
  +60 helse hvert 90. sekund, husmerke i kartet. Ingen planker i 3D ennå. (5) FORFALL («riksbrudd-forfall»): strømnettet gir 5 kW
  (Leir.nettKW-kroken i Leir.steg) i 3–5 døgn eller 30–42 ekte minutter, vannverket 6–9 døgn / 55–75 minutter; uten brønn
  (nytt bygg Leir.BYGG.brønn, lagt inn av overlev.js) gir det −15 på moralmålet (o.moralTillegg i FolkRegler.steg). I testene skjer
  forfallet ikke av seg selv (OverlevSpill.test). Tallene er Claudes. Zomboid-punktene 1 (behov hos figuren) og 2 (lyd som lokker
  fiender) er IKKE laget – brukeren valgte 3, 4 og 5.
  SKJERMBILDE, FIGURER, MODELLER OG STRØM (17. nov, brukeren: «mer detaljerte karakterer, bedre UI – se på nettet –, mer detaljerte
  3D-modeller typ helikopter, bedre system for strøm»):
  spill/narhud.js (window.NarHud): #nhud når du går (helse/utholdenhet nede til venstre, våpen/ammunisjon nede til høyre, våpenfelt
  1–4, tones ned i ro – rådet fra nettet: lite på skjermen, faste hjørner, vis det bare når det trengs), farten og tilstanden i
  kjøretøy, VÅPENET I HÅNDA (en gruppe på kameraet – R.cam legges i scenen –, rekyl og lading; ALDRI et eget lys der: flere lys gir
  nye skyggeprogrammer for hele scenen), og #varsler (brikker øverst til venstre i kartet: angrep, oppdrag, uten strøm, strøm/vann
  svikter, mat, moral; trykk = dit det gjelder; skjult når en meny er åpen). De gamle tallene i lerretet (spillet-visning.js, kjor.js)
  tegnes bare når NarHud mangler. spill/folk3d.js: folkene i leiren med hode, hår, belte og armer/bein som svinger (fire instansnett,
  høyst 14). kjor.js: nye modeller (bilModell, heliModell med nese i trinn, motorhus, eksos, meier på stag, halefinne, lanterner;
  rotorModell(r, b, n) med fire blader). STRØM: Leir.BYGG.batteri (40/80/160 kWt, L.batteri), Leir.steg lader av overskudd fra sol
  og nett og tapper før aggregatene; Leir.bryter(L, id) (b.av: bruker ikke strøm og står i «mangler»), Leir.dieselTimer;
  steg gir agg, aggMaks, batteri, batKap, batKW, avslått, nett. spill/strom-visning.js: «Byggelag: strøm» i fanen Bygg (kilder som
  stolpe, batteri, hvor lenge det rekker, bryter per bygg i PRIORITET-rekkefølge). Tallene er Claudes.
  GJENNOMGANG MED BILDER (17. nov, brukeren: «ta bilder fra spillet – er alt bra? gode ikoner? gir ting mening?»; scratchpad gj/gj.js
  tar 17 steg som ny spiller på /norge, MOBIL=1 for telefon). Funn som ble rettet: (1) kartet sto igjen på hele landsdelen etter at
  leiren var lagt – OppstartSpill.bekreft går nå inn på leiren (kam.m ≤ 3); (2) for mange kraftverk-merker langt ute (VISES.kraft og
  ferje strammet inn); (3) nesten ingen ikoner – spill/ikoner.js: ca. 40 egne strekikoner som CSS-maske via data-ikon (statuslinja,
  fanene og flisene i Leir-menyen, byggelista via data-type, varsler, oppdrag, helsa); nye bygg må inn i Ikoner.BYGG (vakten krever
  det); (4) strømflisa sa «5 av 0 kW» – nå «bruker 0 av 5 kW», og statuslinja viser forbruk/kapasitet; (5) lange loggmeldinger på
  telefon kuttes til tre linjer. IKKE RETTET: knappene øverst er fortsatt tekst (3D, Gå, Leir, Sekk), Folk-panelet er tett, og
  loggen dekker fortsatt litt av kartet på telefon. VAKT «ikoner».
  INTERIØR, RUNDE 3 (17. nov, brukeren: «forbedre innsiden av bygg enda mer»; bildene viste rene, men tomme rom): interior3d.js –
  SMÅTING på møblene (sist i deler(m), fast per møbel via m.f: tallerkener og kopper på spisebord, bøker/kopp på salongbord, ark, bøker
  og lampe på pulter, kjeler/krukker/skjærefjøl på kjøkkenbenken, lampe på nattbord, verktøy på arbeidsbenk, kasseapparat på skranken,
  speil over vasken, sko i skohylla), FORLATT (i bygg(), ikke i leiren: ark og esker på gulvet og mørke flekker, fast per bygg og rom
  via hash(pl.i, 700 + …), plassert med Interior.blokkert så de ikke står i møbler), sko og veske innenfor døra i boliger, radiator
  under vinduene, taklist langs ytterveggene, takbjelker i hytter/låver/uthus, og FORSYNINGSKASSA: et eget lite nett (o.funn) innenfor
  døra i hus som kan gjennomsøkes – skjules i oppdater() når LeteSpill.lett() har huset (Interior3d.funn(P)). Ingenting av dette
  sperrer deg. Vakten tåler nå 9000 trekanter per hus (prøvehuset 6264). IKKE GJORT: bilder på ytterveggene, veltede møbler,
  andre etasje. Bildeskriptet inne/inne.js kommer ikke inn i bygg som ligger i kanten av utsnittet (hytta 790 m unna ga utebilder).
  SAMLET UTSEENDE (17. nov, brukeren: «spillet har ennå ikke bra nok UI»; bilder fra telefon viste hvorfor): spill/tema.js (lastes
  sist): felles finpuss (myke hjørner og skygge på panelene, trykk-respons på alle knapper, like overskrifter, samme skrift på
  knappene i 3D), på små skjermer statuslinja uten ordene (ikonene sier hva tallene er) og LOGGEN SOM ÉN LINJE med siste melding som
  tones bort etter 7 s – trykk viser de siste (klassen «åpen», lukker seg selv). Overskrifter fra LEIR_MENY-tillegg velger fane med
  data-fane på h3 («bygg», «lager», «mål») – IKKE lenger forstavelser som «Byggelag: strøm» eller «Mål: oppdrag». Navn på leir, bygg
  og venner i kartet tegnes i Cormorant Garamond som resten. Folk-panelets status er brikker (.status.brikker). VAKT «samlet utseende».
  Fortsatt svakt: knappene øverst er tekst, og Leir-menyen er lang å bla i.
  INSPIRASJON FRA ANDRE SPILL (16. nov, brukeren: «se etter inspirasjon på nettet etter spill som har fått ros for gode
  byggesystemer» – Factorio: kopier/lim, pipette og bygg-i-rekke; Prison Architect: planlegg før du bruker penger; Manor Lords: tall for
  alt på et tastetrykk; råd om skisser: rødt alene forklarer ingenting): årsaken står ved skissen (p.feil), nøkkeltall under hvert
  bygg når m < 0,45 (kW, senger, lager, liter, «uten strøm»), piltastene dytter skissen 2,5 m (Shift 0,5 m), Shift+Enter bygger og
  fortsetter, Q på et valgt bygg = ny skisse av samme type og retning (tastene i byggevisning.js, lytter i fangstfasen).
  Med mus følger skissen pekeren (p.svever) til første trykk setter den fast (leir-visning.js trykk); et valgt bygg med
  rekkevidde viser sirkelen også utenom byggingen.
  LeirSpill.prøv() tar ingen koordinater – bruk LeirSpill.trykk(x, y). VAKT «byggevisning i 2D».
  VAKT «interiør i leirens bygg». Bilder: scratchpad inne/leir.js.
  MER DETALJERT (17. nov, brukeren: «forbedre mer, gjør alt mer detaljert»): spill/kjoretoy3d.js – kolonnenes kjøretøy er egne modeller i
  ekte mål (lastebil med kalesje på bøyler, speiderbil med veltebøyle og maskingevær, stridsvogn med belter/løpehjul/tårn/kanon,
  rakettartilleri med rørpakke, radarbil med mast og antenne); kjøretøy3d() i index.html tegner ett instansnett per type (R3.kjMesh er
  nå et objekt per type), følger bakkens helning, og andre sider får et skjær av sidefargen. soldater3d: figuren har lår/legger, støvler,
  armer, hender, hjelmkant, sekk, belte og lommer (fortsatt fem nett). narhud.js vmGeo: våpenet i hånda med rundt løp, munningsbrems,
  sikter, buet magasin, avtrekkerbøyle, kikkert på ringer, pumpe på hagla, hanske med fingre. interior3d.js «maskin»: dreiebenk,
  søyleboremaskin eller kompressor (m.f velger). VAKT i sjekk.js: «detaljerte kjøretøy og soldater» (hver type 400–6000 trekanter).
  KRIGSKARTET (17. nov, brukeren: «vi må få frem strategielementet mye bedre»): spill/strategi.js (regler uten DOM, test_strategi.js) +
  strategi-visning.js (window.StrategiSpill). Spillet hadde tettsteder, motstandere og forsyning, men viste aldri krigen som helhet og
  hadde ikke noe mål. OMRÅDET = tettstedene innen 45 km fra leiren, og alltid minst de 8 nærmeste (høyst 150 km; lista har .radius).
  STILLINGEN = andel av folket i området per side; SEIER ved 60 % (også for motstanderne; ikke med færre enn 3 tettsteder), varsel når
  en motstander passerer 45 %. Knappen «Krig» (tast T, #krigknapp) åpner panelet #krig (bunnark på telefon), går til 2D, zoomer ut så
  hele området synes ved siden av panelet (lukk = tilbake der du var), og tegner (KROKER.tegn): slør, området hver side rår over
  (Strategi.rekkevidde(folk)), tettstedene som merker etter folketall, fronter (stiplet, kryss på midten; nærmeste tettsted med annen
  eier innen 20 km), egne lag med ordre, kjente fiender, og tallene 1–3 på de beste målene. Panelet: stolper med seiersstrek, valgt
  tettsted (trykk i kartet: KROKER.trykk først i lista når krigskartet er åpent), NESTE TREKK (Strategi.trekk: folk, avstand, nøytralt
  foran forsvart; «Send» = StrategiSpill.send -> ordre() til nærmeste ledige lag som ikke er eneste garnison, høyst 30 km), TRUSLER
  (uten garnison / fiende innen 6 km) og lagene. Zoomet ut (kam.m ≥ 18) vises fargene og frontene også ellers. #sKrig i statuslinja
  = din andel. Kortene (seier / motstander har overtaket) og varslene kommer ikke av seg selv i testene (StrategiSpill.test);
  «riksbrudd-strategi» husker hva som er meldt per leir. Tallene er Claudes forslag. Dovre-siden har bare Dombås som tettsted –
  prøv på /norge (scratchpad gj/krig.js). VAKT «krigskartet» i sjekk.js (fire prøvetettsteder legges inn og tas bort).
  IKKE GJORT: AI-en er fortsatt to motstandere med få lag, marsjer tar timer i sanntid, og vinner du, skjer ikke noe mer.
  SIKTFELT HELE TIDEN OG KAMERAER (17. nov, brukeren med skjermbilder: «det vises bare hva de ser når jeg trykker på dem. Det skal vises
  hele veien så lenge de er innen radiorekkevidde. Det samme gjelder kameraene»): siktLyser(s) i index.html – det lyse siktfeltet tegnes
  for alle egne, levende lag du har kontakt med (KROKER.skjul = uten radiokontakt), ikke bare det valgte (det valgte er litt lysere);
  både i 2D (tegnEnheter) og i tåkebildet til 3D (bak3d). spill/kamera-visning.js (KameraSpill): ferdig kameramast med strøm åpner tåka
  (KROKER.tåke med f.fritt = true: kroken tar m = meter per punkt og brukes også i 3D), lyser (ny KROKER.siktlys(g, vx0, vy1, m)) og
  ser fiender innen 300/500/800 m (KROKER.ser). Feltet er en sirkel – ikke terrengsikt. VAKT «siktfelt hele tiden og kameraer».
  STRØM OG LAGER (17. nov, brukeren med skjermbilder: «det står 0 av 0 aggregat når jeg har 2» og «lettere å ha oversikt over om man har
  diesel, andre materialer og hvor mye en kan ha»): Leir.steg gir aggInst (det aggregatene kan gi, også uten diesel) og aggAntall;
  strom-visning.js viser «aggregat 0 av 40 (2 stk)» og linja #aggtom «2 aggregat står: tom for diesel» med «Kjøp 500 l». Tallet for bygg
  uten strøm i Leir-menyen teller ikke avslåtte bygg (som varselet). spill/lager-visning.js (LagerSpill.stilling(): diesel, tre, betong,
  stål, mat med har, plass, tilstand tomt/lite/fullt/null og merknad): statuslinja har #sDiesel, #sTre, #sBetong, #sStaal som «har/plass»
  (rødt = tom diesel med aggregat, gult = under 6 t diesel eller fullt lager; egne ikoner tommer/betong/staal; trykk = fanen Lager),
  «Oversikt» i fanen Lager (LEIR_MENY.unshift – står rett under materiallista), flisa «Diesel til leiren» rød når tom, og varslene
  «Tom for diesel» / «Lite diesel» i narhud.js. VAKT «lageroversikten».
  RADIOMASTENS REKKEVIDDE (17. nov, brukeren): byggevisning.js – RING.radiomast; et valgt radiomast-bygg tegner feltradioenes sirkel
  (BYGGEVISNING.radioRekkevidde(b): nivåets 15/25/40 km når masten virker og har strøm, ellers 8 km i oransje) og håndradioens 3 km
  stiplet. Sirkelen er større enn skjermen inne i leiren, så byggpanelet har «Vis rekkevidden (15 km)» (#visradio,
  BYGGEVISNING.visRekkevidde: zoomer ut rundt masten; samme knapp = «Tilbake til leiren»). VAKT «radiomastens rekkevidde».
  KARAKTEREN DIN (17. nov, brukeren: «gjøre spillerens egen karakter mer detaljert» – valgte «begge deler»: utseendet i 3D og karakterark):
  spill/karakter.js (reglene øverst: Karakter.BEHOV/steg/fyll/virkning/ord/utseende, test_karakter.js; KarakterSpill nederst).
  FIGUREN: Karakter.utseende(portrett) leser hud, hårfarge, hårfasong (snau/kort/langt/krøll, hale), skjegg, hodeplagg, briller og
  jakkefarge fra portrettet (spill/portrett-motor.js); byggFigur lager en egen gruppe (kropp + to bein + to armer som svinger, sekk med
  sovepose, våpen over ryggen, ca. 1500 trekanter, ett materiale – ingen egne lys). soldater3d hopper over s.karakter når figuren finnes.
  Sett ovenfra står figuren der karakterlaget står. TREDJEPERSON: knappen «Utenfra» (#tredjeknapp, tast V, bare når du går;
  «riksbrudd-tredje») – ramme3d-kroken flytter kameraet 4,2 m bak øynene (kortere ved vegger, aldri under bakken) og setter
  window.TREDJE (narhud.js skjuler da våpenet i hånda); inne i hus er det alltid førsteperson. BEHOV (Zomboid-punkt 1, nå laget):
  tørst tom etter 24 spilltimer, sult 48, søvn 36; under 25 treff ned til ×0,7 (KarakterSpill.treff() i spillet-visning.js) og
  løpetid ned til ×0,6 (Bevegelse.REGLER.løpTid ganges oppå det overlev.js setter), på 0 tærer det 4 helse per time (aldri under 5).
  Innen 150 m fra leiren: drikker (hvis vannverket virker eller dere har brønn), spiser én rasjon av leirens mat og hviler (når leiren
  har senger); ute: «Spis feltrasjon» (+50), drikk ved vann (Gange.vannVed 2,5 m unna), hvil i tilflukt. Synker ikke av seg selv i
  testene (KarakterSpill.test). KARAKTERARKET: knappen «Deg» (#karakterknapp, tast O) -> #karakterark (portrett, bakgrunn, helse og
  behov som målere, ferdigheter, våpen og vekt, dager/gått/hus). Varsler «Du er veldig tørst» i narhud.js. Lagres per leir
  («riksbrudd-karakter»). Tallene er Claudes forslag. VAKT «karakteren din».
  KARAKTEREN, ENDA MER DETALJERT (17. nov, brukeren: «enda mer detaljert»): byggFigur i karakter.js er bygget om – ledd som grupper
  (hofte -> kne, skulder -> albue, nakke), rundt hode med kjeve, ører, øyne i portrettets øyefarge, bryn, nese, munn, fregner/arr,
  briller (runde/firkantede), seks skjeggtyper, frisyrer (snau, kort, langt, krøll, afro, lugg, topp, hale; grått hår etter grayAmount),
  fire hodeplagg (barett, strikkelue, offiserslue, skyggelue), klær etter portrettets plagg (Karakter.utseende().klær: uniform med
  lommer/skulderklaffer/knapper, dress med skjorte og slips, genser/høyhals, skjorte med oppbrettede ermer, frakk, jakke), smalere
  skuldre for kvinner, belte med lommer, feltflaske og kniv, sekk med remmer, sovepose og liggeunderlag, knelapper, snøring, klokke,
  fingre, og en myk skygge under føttene. Våpenet du har framme (våpenDeler(id), settVåpen) ligger i hendene (langt våpen, armene
  holder det) eller i høyre hånd (pistol). Gangen: lår og kne bøyer, kroppen duver og lener seg når du løper, huk bøyer hofte og kne,
  hodet følger blikket. Ca. 2800 trekanter (én figur). Karakterarket viser alder og opphav fra portrettet og «tom om 5 t» per behov.
  Bilder: scratchpad sp/kar2.js (nærbilder; NB.vri snur figuren mot kameraet).
  STRIDSREGLER (17. nov, brukeren: «definere på forhånd hvordan troppene skal reagere i møte med fiender – skal de angripe når de vet at de
  kanskje taper? High ground skal gi en fordel, samt om du blir oppdaget eller oppdager dem først, og hvilket våpen troppene mine har, og
  fienden. Dette bør jeg kunne endre på»): spill/strid.js (regler uten DOM, test_strid.js) + strid-visning.js (window.StridSpill).
  s.strid = { ild: fri|besvar|nær, underlegen: kjemp|trekk|unngå, tap: 0|3|5, fram: nei|ja, bev } per lag (Strid.ren; fire HOLDNINGER:
  aggressiv, balansert = standard, forsiktig, bakhold; «riksbrudd-strid» = malen for nye lag; lagres med laget i lagring.js).
  BEVÆPNING (Strid.BEVÆPNING: standard, nærstrid 200 000 kr, avstand 400 000, tung 600 000, lett = røvere): Strid.bevæpn setter m.våpen
  per mann, og Terreng.ildrunde/kamprunde bruker m.våpen || m.rolle (nye våpen i Terreng.VÅPEN: maskinpistol, hagle, pistol,
  presisjonsrifle 1100 m; kamprundens grense er 1150 m). Fienden: røvere (raid/post) lett, rød standard, grønn avstand. KROKER.ild-kroken
  gir Strid.høydeRett(dh) (fra 10 m, opptil ×1,6 ved 80 m, ×0,7 oppover; Terrengs gamle ×1,2 deles ut) × Strid.oppdagelse (SETT = hvem
  så hvem når: bakhold ×1,6, først ×1,35 i 15 min, overrasket ×0,6) og 0 når reglene forbyr ild (Strid.ildLov). Hvert spillminutt:
  StridSpill.vurdering(s) (nærmeste fiende laget ser, Strid.kraft = forventede treff per runde for begge sider -> forhold) og
  Strid.reaksjon -> ordre() bort fra fienden (trekk/unngå) eller nærmere (fram), høyst hvert 15. min; ikke av seg selv i testene
  (StridSpill.test). Panelet #stridpanel fra «Stridsregler» i lagpanelet (KROKER.lagKnapper): holdninger, fire valg, bevæpning,
  «Slik står det nå» og «Bruk på alle lag». Lagpanelets statuslinje viser holdning, bevæpning og styrkeforhold; fiendelag viser sin
  bevæpning. Alle tallene er Claudes forslag. VAKT «stridsregler».
  KNAPPERADEN (17. nov, brukeren: «utfør nummer 5»): spill/knapper.js (lastes etter tema.js) – Gå, Leir, Krig og Deg har ikon
  (data-kn; på telefon bare ikonet, ordet står igjen i knappen med font-size 0), #sekkknapp og #tredjeknapp er skjult i raden og nås
  fra menyen #degmeny under Deg (bare når du går; ellers åpner Deg karakterarket direkte). Knapper.merk()/åpen(). VAKT «knapperaden».
  FORSVAR AV LEIREN (17. nov, brukeren: «vi trenger et bedre system for kriging og angrep – hvordan skal jeg forsvare leiren fra et angrep
  på en god måte»): spill/forsvar.js (regler uten DOM, test_forsvar.js) + forsvar-visning.js (window.ForsvarSpill). BEREDSKAP 0–100
  (Forsvar.beredskap: lag hjemme mot ventet bølge 35, bemannet vakttårn 15, sandsekkvoller 15, varsling 15, folk på vakt 10, ammunisjon 10)
  under «Forsvar» i Leir-menyen (fanen Bygg) med det viktigste rådet. ALARMEN #alarm når SpilletSpill.T().aktiv: antall, retning, og
  avstand/ankomst bare når noen ser røverne. «Forsvar leiren» (#forsvarknapp, ForsvarSpill.sett): lag innen 3 km får stillinger fra
  Forsvar.stillinger (bak voller innen ±72° av fiendens retning, ellers en bue 75 m ut med 34 m mellom) via Forsvar.fordel (vollene til de
  nærmeste lagene), s.forsvar = plassen, stridsreglene byttes til «kjemp, aldri retrett» (s.stridFør huskes), og de graver seg ned når de er
  framme. LEIRVAKTA: folk på «vakt» (2–12) blir et eget lag (s.leirvakt, lagres ikke; sårede får lav helse i Folk etterpå). Når angrepet
  er over (aktiv -> 0): ForsvarSpill.opphev(true) – reglene tilbake, Leirvakta bort, rapport i loggen (Forsvar.rapport). Kartet: rød pil
  fra røverne mot leiren, merker i stillingene. «Øv: sett lagene i stilling» virker uten angrep. Tallene er Claudes. VAKT «forsvar av leiren».
  SMÅTING 17. NOV KVELD (brukeren, mens forsvaret ble laget): (1) BRAKKA: interiøret har like mange køyesenger som bygget har plasser
  (to per køyeseng; P.bygg.senger -> Interior.plan info.senger); byggpanelet sier «hardt skadet: halvparten av 8 – reparer bygget»
  (det var derfor brukeren så «4»). (2) TASTEN Y gir 100 mill. kr (taster.js) – BARE FOR TESTING, TA UT FØR SPILLET ER FERDIG.
  (3) BILTRAFIKKEN (liv3d.js): antall biler følger vegene (tettsted × 4 per km, E × 0,5, R × 0,3, resten × 0,06; minst 1, tak 32/12),
  og bilene velger veg etter samme vekt. (4) «MÅL HAKK»: pusterom leser stakken utenfor Promise-funksjonen (rapporten sa bare
  «norge:1438 → norge:1438»). BRUKERENS RAPPORT 17. nov (Intel Iris Xe, Edge, 1728 × 972, utsnitt 7,3 km): 27 pauser over 50 ms på 20 s,
  lengste 407 ms; 911 ms i 5 pauser «uten pust (henter høydene og kartet)», 205 ms «uten pust (gjør klar)» – der bør det letes først.
  IKKE GJORT, BRUKEREN HAR BEDT OM (17. nov): pen og praktisk bygging i bratt terreng; alle steder med kaier i kartet (lest som «plasser»,
  ikke «klasser»); trær på samme sted i 2D og 3D; lage troppene selv av folk og kjøretøy; folk i kontrollrommet som ser gjennom
  kameraene (bevegelsesvarsling, dyr/vær/folk, historikk over hvor tropper har vært, gå inn i kameraet i 3D); mindre hakk.
  BYGG I SKRÅNING (17. nov, brukeren: «en lur måte å få det til å ikke være helt upraktisk og stygt å bygge hvor det er litt bratt»):
  Leir.BRATT = 8 m (før 3; store bygg 35 % av diagonalen) og Leir.grunn(b, høyde) = { topp, bunn, forskjell } under byggets hjørner og
  midte. leir-visning.js: grunn3d(b, u, R) (LeirSpill.grunn3d) – bygget står på toppen (før: midtens høyde, så oversiden ble gravd ned),
  og grunnmur() legger en steinmur med sokkelkant under hele fotavtrykket ned til bunnen − 0,6 m når forskjellen er over 0,35 m
  (userData.grunnmur, samme id som bygget). interior3d.js bruker samme topp for gulvet. VAKT «bygg i skråning». IKKE GJORT: ekstra
  pris/tid for grunnmuren, trapp ned fra høye dører utenom den interiøret alt har, og planering av bakken rundt.
  TRÆR LIKT I 2D OG 3D (17. nov, brukeren: «trær fra 3D og 2D er ikke likt plassert – problematisk for hogst og kamp»): kartflis.js har
  NÅ DEN ENE REGELEN treVed(i, j, klasse) på det faste 5 m-gitteret (TRE_RUTE, TRE_SANNS per terrengklasse, TRE_TETT = 0,3 = andelen
  «ekte» trær som også står i 3D, treIHøyden for tregrensen). traer() i kartet tegner de ekte trærne store fra z13 og resten som svakt
  kratt (langt ute som før: jevn skogtekstur). trær3d() i index.html går over samme gitter (hash/vri/treVed er globale fra kartflis.js)
  med klassene fra lagVindu(z9), og tynner bare trær lenger enn 600 m fra midten når taket (40 000 PC / 18 000 mobil) er nådd
  (u.treTall). Einer/vier (vegetasjon3d) og gatetrær (byhus) står fortsatt bare i 3D. VAKT «trærne står likt i 2D og 3D».
  EGNE TROPPER (17. nov, brukeren: «jeg skal selv måtte lage troppene med å velge folk og evt. kjøretøy»): spill/tropper.js (regler uten
  DOM, test_tropper.js) + tropper-visning.js (window.TropperSpill). «Tropper» i Leir-menyen (fanen Bygg): «Lag ny tropp» (#nytropp) ->
  #tropppanel: 2–12 arbeidsføre fra FolkSpill.tilstand().personer, navn, bevæpning (Strid.VALGBARE) og et ledig kjøretøy innen 300 m.
  Tropper.opprett: best på vakt = lagfører, best på stell = sanitet (fra fire), mennene bærer persondataene (m.person); personene tas ut
  av F.personer, laget får s.fraFolk. «Oppløs» innen 300 m fra leiren: Tropper.oppløs gir de levende tilbake som «fri» (sårede helse
  0,35; soldater uten persondata – startlagene – får en enkel personpost). OM BORD: s.ombord = kjøretøyet (speiderbil 4, lastebil 12 per
  bil; innen 60 m; ett lag per kjøretøy); KROKER.sim flytter laget med kjøretøyet, KROKER.kanOrdre nekter ordre til laget, «Gå av» i
  lagpanelet. lagring.js lagrer m.person, fraFolk og ombord (kjøretøyets navn -> s.ombordNavn). STARTLAGENE FINNES FORTSATT – brukeren
  ba om å «måtte» lage troppene selv; å starte uten ferdige lag krever at mat/senger tunes (ikke gjort, sagt til brukeren).
  VAKT «egne tropper».
  SPILLSKJERMEN (17. nov, brukeren med fire PC-bilder: «få til en bedre UI, dette ser ikke ut som et spill – se på nettet hvordan krigs-,
  strategi-, city builder- og survival-spill med god UI gjør ting, legg planer og utfør»): spill/spillhud.js (lastes etter knapper.js).
  body.spill = vindu minst 900 px bredt som ikke er «kort» (telefonen er uendret). (1) RESSURSLINJA: hver ting i .stats er en flis med
  ikon og tall (ordene skjult, står i verktøytipset; data-s = id-en, rekkefølgen i REKKE: klokke, vær, kassa – størst –, diesel, tre,
  betong, stål, strøm, olje, folk, mål, kontroll), fliser med bare «–» skjules (data-tom), og moh./MB lastet/FPS (data-teknisk) vises
  bare med «Tekniske tall» i ☰ (body.teknisk, «riksbrudd-teknisk»). (2) KOMMANDOLINJA #kommando nederst i midten: Leir (L), Folk,
  Tropper, Krig (T), Deg (O) – trykker på de vanlige knappene / FolkSpill.åpne / TropperSpill.åpne; #leirknapp, #krigknapp og
  #karakterknapp er skjult oppe (taster.js regner dem som synlige i spillskjermen). Linja skjules mens du bygger (#byggvalg,
  #byggesett), går (body.gaar – da står Deg oppe igjen med Sekk/Utenfra), på startskjermen og i fotomodus. (3) Farten som én gruppe,
  like rammer på panelene, kildene som lappen «Kilder» (pek for hele teksten). FELLE: en knapp lagt rett i #lagmeny etter at meny.js
  er lastet, får meny.js til å ordne seg i ring (siden henger) – legg den inn i en gruppe ved siden av en knapp som står der.
  VAKT «spillskjermen». Bilder: scratchpad sp/hud.js. IKKE GJORT: byggemenyen som ikonrutenett nederst, verktøytips med forklaring
  på flisene, minikart i 2D, og telefonen har ikke fått kommandolinja.
  KAMERAVAKTA (17. nov, brukeren: «folk som jobber i kontrollrommet med å se gjennom kameraene – historisk data på hvor tropper har vært,
  forskjellige level på kameraene, noen som bare filmer når de merker bevegelse; da sjekker en i kontrollrommet om det er været, et dyr
  eller folk; er det folk, varsler den, og da kan du gå inn i kameraet og se hva det ser i 3D»): spill/kameravakt.js (regler uten DOM,
  test_kameravakt.js) + kameravakt-visning.js (window.KameravaktSpill, lastes rett før meny.js). Mastens NIVÅ er typen
  (Kameravakt.TYPER): 1 bevegelseskamera (klipp av folk, dyr og vær; 6 min å se gjennom), 2 fast opptak (4 min; lagrer SPOR av dem som
  går forbi, punkt hvert 2. min, 48 timer), 3 smart (varsler selv straks, ingen falske klipp). Ny oppgave for folk: «overvåking»
  (Folk.OPPGAVER, mellom vakt og kjøkken) – krever et kontrollrom som virker. Kameraets KROKER.ser (kamera-visning.js) spør nå
  KameravaktSpill.ser(c): fienden vises bare når et klipp er sett og bekreftet (K.sett[kamera] 20 min, forlenges mens noen følger med),
  eller kameraet er smart. Tåka og det lyse feltet er som før. Varsel i loggen, rødt merke i kartet i ett minutt, påminnelse når tre
  klipp ligger usett. «Kameravakt» i Leir-menyen (fanen Bygg): tall, − / + folk på overvåking, «Se gjennom» per kamera
  (seGjennom: 3D, Gange med en fører som holder kameraet 9,2 m oppe i masta, blikket mot siste klipp, VHS-filter når ingen filter
  er valgt, #kamlapp/#kamut, Esc/F går ut; body.ikamera), siste seks klipp og «Vis sporene i kartet». Lagres per leir
  («riksbrudd-kameravakt»). I testene (navigator.webdriver) virker kameraene som før til KameravaktSpill.test = true.
  Tallene er Claudes forslag. VAKT «kameravakta». IKKE GJORT: operatørene vises ikke som figurer i kontrollrommet, kameraet ser
  fortsatt i en sirkel (ikke terrengsikt), og sporene gjelder bare det kameraene ser (ikke det lagene dine ser).
  KAIER I HELE NORGE (17. nov, brukeren: «kan vi få med alle plasser hvor det er kaier, da det senere kan være et strategisk område å
  plassere leiren»): pipeline/fliser/kaier.py (OpenStreetMap, ODbL; test_kaier.py) – man_made=pier/quay (t 1), leisure=marina (2),
  harbour/landuse=harbour|port/industrial=port (3), amenity=ferry_terminal (4); alt i samme rute på 120 m slås sammen (høyeste type,
  samlet kailengde, navn), steder med bare småbrygger under 15 m faller bort -> kaier.json (delta-kodet, sortert på x) via
  .github/workflows/kaier.yml (push av kaier.py/kaier.yml på claude/nattfiks eller claude/hallo-ohbasy, noen minutter) -> release
  kart-kaier-<hash>; bruk_kaier.py setter KAIER_TAG i spill/kaier.js (kjør versjon.py). site/api/kart.js slipper kart-kaier-.
  spill/kaier.js (reglene øverst uten DOM: les, iBoks, nær, vises(t, l, m), størrelse; test_kaier.js; lastes før meny.js): ankermerker
  i 2D etter målestokken (havner og ferjeterminaler fra 160 m per punkt, småbåthavner og lange kaier fra 70, småkaier fra 11), navn
  nær, trykk på et merke skriver navn, kailengde, størrelse (liten/middels/stor – Claudes inndeling) og avstand til leiren i loggen,
  «Kaier» i ☰ («riksbrudd-kaier»). window.KaierSpill (data, nær, settData). VAKT «kaier» (prøvedata). IKKE GJORT: kaiene gir ingen
  fordel ennå (ingen båter/forsyning sjøveien), ingen egne 3D-modeller utover det kyst3d og ferjekaiene alt lager, og de vises ikke
  i leirvalget ved oppstart.
  BEDRE AI OG TROPPEBYGGER (17. nov, brukeren: «enda flere måter å forbedre både fiendens AI og spillerens egen AI for tropper, og
  systemet spilleren bruker for å lage sine egne tropper, hvor han velger folk og utstyr»). Alle tallene er Claudes forslag.
  FIENDEN (spill/fraksjoner.js velg, test_fraksjoner.js): nye valg 'samle' (underlegen alene: gå mot en venn innen 5 km), 'støtt' (en
  venn under ild innen 5 km – v.hjelp), 'jakt' (der fienden sist ble sett – v.minne, 120 min, 6 km), 'leir' (spillerens leir når
  fraksjonen har funnet den – v.leir), samlet angrep (venner innen 1,5 km teller med), bakhold for de forsiktige i skog (v.iSkog),
  v.opptatt (ikke samme tettsted som en venn), b.tapt (tapte tettsteder ×2,5 nærmere), stil per side (R.stil: rød overtak 0,7,
  grønn 1,0), Fraksjoner.lagTak(byer) (3 + et halvt lag per tettsted, høyst 6) og Fraksjoner.angrepspunkt (høyeste punkt på en ring
  280 m rundt målet, 110 m for leiren; 4 m høyde veier opp 100 m ekstra marsj). fraksjoner-visning.js: AI.minne[side] = { sist, hatt,
  leir } (leiren er funnet når et lag har vært innen 2 km), s.ai.målBy. IKKE lagret mellom økter.
  EGNE LAG (spill/strid.js, test_strid.js): tre nye stridsvalg – dekning (ja fra start: flytt til terreng minst 8 m høyere innen
  150 m når fienden er 150–1200 m unna), støtte (kom et eget lag under ild til hjelp innen 1,5 km), forsyn (gå til leiren eller et
  tettsted dere holder når ammunisjonen er under 25 %); Strid.tiltak(r, t), Strid.INITIATIV. strid-visning.js initiativ(s, v) kjøres
  hvert spillminutt når reaksjonsreglene ikke slår til (høyst hvert 15. min; ikke nedgravd, om bord, i forsvarsstilling eller uten
  radiokontakt; ikke av seg selv i testene). Panelet lager valgene selv av Strid.VALG (nå sju).
  TROPPEBYGGEREN (spill/tropper.js, test_tropper.js): Tropper.VÅPEN (pris per våpen), UTSTYR (kikkert sikt ×1,2 via KROKER.sikt;
  ammo: halve forbruket; sanitet: Tropper.pleie – en såret kampklar hver 6. time når troppen har en frisk sanitet; feltradio via
  KontrollromSpill.girRadio), MALER (speider, storm, vakt, støtte), foreslå (best i strid, fri/vakt foran, syke sist), pris, mister,
  utrust (m.valgt per mann). Strid.BEVÆPNING.egen bruker m.valgt (bevæpn sender mannen som tredje ledd). tropper-visning.js:
  forslagene (#tropppanel [data-mal]), våpenvalg per valgt person ([data-vapen]), «Velg de best egnede», utstyr ([data-utstyr]),
  oppsummering #troppsum (pris, ildkraft i prosent av et vanlig lag på 100/400/800 m, hva leiren mister). TropperSpill.opprett(ider,
  navn, bev, kjøretøy, { våpen, utstyr }), brukMal, valg(). lagring.js lagrer m.valgt og s.utstyr. VAKT «bedre AI og troppebygger».
  IKKE GJORT: erfaring (veteraner som treffer bedre), bytte våpen/utstyr på en tropp som alt finnes, formasjoner, og at fienden
  bruker kjøretøy eller bygger egne stillinger.
  ERFARING, FORMASJONER, UTSTYRSBYTTE, FIENDENS KJØRETØY OG STILLINGER (17. nov, brukeren ba om alle fire). Tallene er Claudes forslag.
  spill/formasjon.js (regler, test_formasjon.js) + formasjon-visning.js: FORMASJON per lag (s.formasjon: kile, linje ild ×1,15/tar ×1,1,
  spredt ild ×0,9/tar ×0,75, kolonne ild ×0,8/tar ×1,15) – knappen «Formasjon: …» i lagpanelet (#formknapp) blar; FORMPLASS(s, n) i
  index.html plasserer mennene i 2D og 3D (på marsj alltid kolonne, men ildfaktoren følger den valgte formasjonen); fiendens lag går
  i linje ved angrep og spredt når de holder. ERFARING: m.erf = minutter i kamp (lag som skyter eller blir beskutt, hvert spillminutt;
  sårede halvparten), nivå erfaren 30 / veteran 120 / elite 360 med treff ×1,08 / 1,18 / 1,28 (lagets snitt, i KROKER.ild);
  følger personen (Tropper.opprett/oppløs: p.erf). lagring.js lagrer m.erf og s.formasjon.
  UTSTYRSBYTTE: «Våpen og utstyr» i lagpanelet (#utstyrknapp) når laget står innen 300 m fra leiren -> #tropppanel i endre-modus
  (TropperSpill.endre/settEndring/endrePris/brukEndring): våpen mann for mann ([data-mann]) og utstyr; betaler bare det nye.
  FIENDEN: hver fraksjon har en lastebil (AI.biler[side], KJORETOY med side rød/grønn). Fraksjoner.kjør/gåAv: laget går om bord
  (s.ombord, flyttes av kroken i tropper-visning.js) når målet er over 3 km unna og bilen står innen 200 m, og går av når bilen er
  framme eller en fiende ses innen 800 m. Bare når vegnettet er lastet (på PC hentes det for dette, ikke i testene). Fiendens
  kjøretøy vises bare der du ser dem (kjoretoySes i kjoretoy-visning.js, også 3D) og kan ikke gis ordre. STILLINGER (window.STILLINGER):
  en garnison som har holdt et tettsted i 120 min, bygger en stilling (høyst 4 per fraksjon, 300 m mellom) – eierens lag innen
  25 m tar treff ×0,6 (Fraksjoner.stillingVern i KROKER.ild); du ser den når et lag har sett stedet, og et eget lag som står i en
  forlatt stilling, river den. Stillingene og fiendens minne lagres IKKE mellom økter; stillingene har ingen 3D-modell.
  VAKT «formasjoner, erfaring og utstyr».
  ROGALAND (17. nov, brukeren: «lag et kart av bare Rogaland fylke, da det per nå er mer praktisk å spille på et litt mindre kart»):
  /rogaland (vercel.json rewrite til /dovre-fliser som /norge; PÅ_NORGE gjelder begge, PÅ_OMRÅDE = 'rogaland'). pipeline/fliser/
  fylke.py henter fylkesgrensa med sjøområdet fra Kartverkets WFS (app:Fylke, nummer 11) -> site/dovre-fliser/data/rogaland.json
  (491 punkter, 4 KB). spill/omraade.js (reglene øverst: les, inni, tilGrensa; test_omraade.js med kjente steder): window.SPILLOMRÅDE,
  OMRÅDE_OK(x, y); kartet åpner på fylket (passInnHele), alt utenfor er mørklagt med stiplet grense (KROKER.tegn), leiren må ligge
  innenfor (oppstart-visning.js prøvLeir), ordre() nekter mål utenfor, og motstandernes startsteder/mål (fraksjoner-visning.js) og
  krigskartets tettsteder (strategi-visning.js) bruker bare tettstedene innenfor. EGET LAGRET SPILL: på /rogaland får alle
  «riksbrudd-…»-nøklene endingen «@rogaland» (Storage.prototype pakkes inn øverst i index.html). Flere fylker: kjør fylke.py med
  nummeret, legg stien inn i regexene (PÅ_NORGE, PÅ_OMRÅDE) og vercel.json. IKKE GJORT: mørkleggingen finnes ikke i 3D, kjøretøy kan
  kjøre ut av fylket, og kartdataene er de samme som for hele landet (ingenting lastes raskere – men alt spillet gjør, er nærmere).
  Lokal prøve: scratchpad gj/rog.js (dev.py sender /rogaland til /dovre-fliser).
  NATTARBEIDET 18. NOV (brukeren: «utarbeid alle femti forbedringer uten om Y-tasten, lag en plan for alt dette og utfør» – 50 forbedringer,
  50 nye ideer og 20 utseendegrep fra docs/gjennomgang-2026-11-18.md). Bygget av ti hjelpere i hver sin worktree (/home/user/natt-*,
  grener claude/natt18-*), flettet inn i claude/nattfiks. DETALJENE STÅR I docs/natt/<pakke>.md (les den for pakka du skal røre):
  sjo.md (spill/sjo.js + sjo-visning.js: båter, havner, fiske, landgang, sperring, ferjer, kjøretøy om bord), okonomi.md (spill/region.js
  + region-visning.js: tettstedstyper, handelsruter, skatt/lojalitet, svartebørs, gjenoppbygging; nye spill starter med 40 mill. kr,
  markedets hyller, veksling olje/diesel), folk.md (spill/samfunn.js + samfunn-visning.js: flyktninger, spesialister, barn og gamle,
  Grålungen, lover, forrædere, opplæring, begravelser, personkort, window.Kortkø), krig.md (spill/krig.js + krig-visning.js + krig3d.js:
  flanke, fart etter formasjon via KROKER.fart, fanger, etterretning, natt/nattsikt, artilleri, røyk/lys/støy, bakhold på veg, beleiring,
  våpenhvile, bygdevern, helikopterfrakt, droner; åtte stridsvalg), verden.md (spill/verden.js + verden-visning.js: vinterføre, is, kulde,
  flom, ras, jakt, åker, brann – window.BRANNER/BRENT –, funn, radio, tog), karakter.md (spill/eventyr.js + eventyr-visning.js: behov
  ute, tilflukt med lager og søvn, ligg, skader, håndverk, hund, sniking, kartslør, historie i kapitler), spillform.md (spill/flyt.js,
  scenario.js, scenario-visning.js: spol til neste hendelse, køordre, flervalg, start uten lag, seier/tap, scenarier, utfordringer,
  vanskelighetsgrad – window.SPILLREGLER –, etterspill, ukas oppdrag; hendelsen «riksbrudd-hendelse»), ui.md (spill/opplaering.js,
  flistips.js, merker.js, tegninger.js, minikart2d.js, paneler.js: opplæring, fliser og kommandolinje også på telefon, «Mer»-knappen,
  byggekort, lysere 2D-kart, merkesett, panelplasser, sammenleggbare deler i Leir-menyen), natur.md (TreDeler i index.html,
  spill/effekter3d.js, fjernby3d.js: trær med bladtekstur, gress i vind, runde figurer, støv/spor, kampeffekter, kratere, fjern skog),
  lys.md (skygger, bakke, vann, himmel, nattlys, tåke, fargesetting – se fila for hva som ble ferdig), test2.md (telefon: spill/telefon.js).
  FELLES NYTT: vakter i egne filer pipeline/fliser/vakter/*.js (sjekk.js kjører dem etter «knapperaden»-vaktene; hver setter alt
  tilbake og må tåle det andre vakter etterlater), hjelpetekster i docs/natt/*-hjelp.json -> spill/hjelp-natt.js via
  `python3 pipeline/fliser/samle_hjelp.py`, kommandolinja tar window.KOMMANDO_TILLEGG, «kode i kommentar»-regelen gjelder bare
  kommentarer etter kode på samme linje. I TESTENE (navigator.webdriver) SOVER ALT DET NYE til <Navn>Spill.test = true
  (RegionSpill, SamfunnSpill, KrigSpill, VerdenSpill, EventyrSpill, FlytSpill, ScenarioSpill, SjoSpill, OpplaeringSpill …) – for å
  spille på ekte i Playwright: `context.addInitScript(() => Object.defineProperty(navigator, 'webdriver', { get: () => false }))`.
  FLETTING: scratchpad inn.sh <gren> (løser skript-tagg-konflikter i index.html med flett.py, kjører versjon.py og alle regeltestene).
  KJENT: graving-vakten («feltarbeid») feiler av og til (laget blir ikke ferdig nedgravd; årsaken ikke funnet – målingen `mål` skrives
  ut når den feiler – ÅRSAKEN: laget var drept av tidligere vakter; vakten gjør det friskt først). IKKE PUBLISERT før brukeren sier «Publiser».
  MORGENEN 18. NOV (08:30–10:30, på Opus fordi Fable-grensen var nådd): lys og skygger ferdigstilt og flettet inn (docs/natt/lys.md:
  spill/lys3d.js, «Lys og skygger» i ☰, KVAL.fx; AV i testene), teksturlekkasje fra 3D-flagget i oppstart-visning.js rettet, telefon
  liggende/små iPhoner (spill/telefon.js, docs/natt/test2.md runde 2–3), balansen (docs/natt/balanse.md: røverbytte, bølgestørrelse,
  fredstid, kontrollrom 9 mill., lett start uten stridsvogn, brann i leiren, mat – 15 grunnmål nå). Rapport: docs/natt/RAPPORT.md.
  Mobilkontrollen 115/115. Leiren overlever ennå ikke sju døgn i den automatiske gjennomspillingen (se balanse.md).
  RUNDE 4, 18. NOV DAG (10:45–13:40, brukeren: «fortsett på lista å utbedre enda mer»; sju hjelpere på Opus i de samme natt-mappene,
  regler i scratchpad RUNDE4-BRIEF.md; hver skrev videre i sitt notat under «Runde 4»). KRIG (docs/natt/krig.md): dekning bak leirens
  egne bygg (Krig.leirVern ×0,55, telt/drivhus ×0,8), fanger kan byttes (penger / én mot én – T.tatt), settes i arbeid (halv arbeider,
  kan rømme og røpe leiren) eller rekrutteres etter tre døgn (10 % spioner, p.spion), motstanderen foreslår bytte (KrigSpill.foreslå),
  røyk/lys/helikopter/kjøreordrer lagres i «riksbrudd-krig», fiendens stillinger som sandsekkring med figurer i 3D (krig3d.js).
  RETTET: sikten var skjev (terreng.js siktfelt prøvde bakken der målet sto – nå et mål 1,8 m over bakken, MÅL_HØYDE; test_terreng 5b),
  ammunisjon brukt uten skudd når en krok ga 0 (kamprunde: ammo0), radio «Fiende sett» under våpenhvile, lag svarte aldri et kjøretøy
  som skjøt på dem uten å se det (enheter-visning.js motKjøretøy: k.skyterPå røper kjøretøyet innen 600 m). Beleiring virker når
  bygdevernet sloss (sted uten eier). SJØ/ØKONOMI (sjo.md, okonomi.md): krigskartet viser hva et tettsted gir (window.KRIG_TILLEGG i
  strategi-visning.js), handelsruter langs vegnettet (luftlinje uten vegnett/på telefon) stenges av sprengte bruer og kratere,
  lojaliteten høyst 35 når du tar et sted igjen, båtene har helse og kan bordes/senkes, fiendens båter skyter, AI-lag tar sjark når
  sjøvegen er mye kortere, ruteferja skjules når du tar ferja, trykk på kaier/båter i 3D (SjoSpill.trykk3d), nærmeste kai i leirvalget
  (window.LEIRVALG_TILLEGG i oppstart-visning.js), middels kai gir 40 % havnevarer, sjøpanelet er et lavt bunnark på telefon, isen stenger
  innsjøer (Verden.islagtVann). FOLK (folk.md): varselbrikker for sykdom, ugravlagte, skader og ventende kort (window.VARSEL_TILLEGG i
  narhud.js), forrædere skader via Leir.skad, ÉN KORTKØ (window.Kortkø: ta/be/ferdig – #hendelse og samfunnskortene, viker for
  krigkort/formkort), barn og gamle syke og i 3D, operatører/kokk inne i byggene og vakta på tårnet, spesialister fra oppdrag (hendelsen
  «riksbrudd-oppdrag»), portretter i Folk, hunden går, spiser og kan skades, dekning bak bakketopp (bare i 3D-utsnittet).
  VERDEN (verden.md): snø stenger veglenker over 900 moh./snøgrensen mens det snør + 6 t (Kjoretoy.planlegg pakket inn, tunneler unntatt),
  fiendens lag fryser, kratere fra miner og salver og hjulspor lagres («riksbrudd-effekter»), felte dyr huskes («riksbrudd-natur»),
  åkeren er et bygg (Leir.BYGG.åker lagt inn fra verden-visning.js, kan brenne), funn som 3D-modeller og aldri i tettbebyggelse/vann,
  regnflom følger dalen (flom.js med valg), Verden.islagt(x, y), sotlag med møne på brente hus. UI (ui.md): paneler oppå hverandre rettet
  i paneler.js (plassene venstre/høyre, målestokk/minikart/zoom viker), kjøretøy og tettsteder i Merker, tegnforklaring
  (spill/tegnforklaring.js), «Påvirkes av» og langt trykk på flisene, byggelista som rutenett på PC og tegning i byggpanelet, ramme med
  Shift + dra i 3D (ROTERER IKKE LENGER med Shift – høyre museknapp/to fingre), marsjtid ved pekeren i 3D, etterspillet med bygg/
  kjøretøy/kamper. HAKK (lys.md «Runde 4», del 1–3): byttet til nytt utsnitt i biter – normalerG (likt computeVertexNormals), delBakkenG,
  naboerAsynk, lastOppIBiter (kartbildet i striper på 256 rader), u.vannData i stedet for getImageData, bruer/kaier, trafo, fjernby,
  portaler, bensinstasjoner, bekkebåndet, treslag og bil-/folkelinjer i forbered3d, generatorer i veg.js (lykterG, finnKryssG), kyst.js
  (plasserG), gate.js (plasserG), anlegg3d (omrissVed), kompass-minikartet fra en 1024²-kopi (WeakMap) og ResizeObserver, proj3 projiserer
  før siktlinjene, kildeNå i ytelse.js (kort stakk). Bergen 3,1 km: lange oppgaver 6,1 s -> 1,3 s, lengste 812 -> 157 ms. Skygger fra
  kjøretøy/soldater er målt og forkastet (836 -> 2355 ms per bilde). BE BRUKEREN OM NY «MÅL HAKK».
  KONTROLLEN: tresjekken prøvde 0 trær (utsnittet var for stort for trær) og sa «ok» – prøver nå Dombås-utsnittet (TRE_PRØVE).
  BALANSE RUNDE 4 (balanse.md): Trussel.HERJ – røvere innen 150 m av leiren (eller som skader et bygg) i 90 min tar bytte (5 % av kassa,
  høyst 0,5 mill., 20 % materialer, 10 % diesel, 15 % mat) og går ut igjen; Trussel.brutt – et røverlag som har mistet en tredel, flykter
  (bølgen er slått tilbake); forsvar-visning.js: lagene hjemme (innen 3 km, i ro/forsvar) går mot alle fiender i leiren, Leirvakta tar
  opp våpen, lag som har trukket seg går hjem etter 30 min uten fiender innen 900 m; ledige byggelag reparerer bygg under 95 % mellom
  bølgene (300 000 kr blir igjen, bryter i Leir → Bygg → Forsvar, «riksbrudd-reparer»), banneret «N bygg er skadet – Reparer alle».
  Opplæringen: fire nye steg (tropp nr. 2, mat til tre døgn, forsvar, reparer). FREDSTIDEN for motstanderne er 7 døgn på Vanlig
  (7 / fiendens faktor, 4–10; fraksjoner-visning.js fredTid) med varsel ett døgn før – gjennomspillingene 7–8 falt for Kystalliansen på
  dag 5–6 med 4 døgn. Ikke spilt gjennom på nytt. Rapport: docs/natt/RAPPORT.md («Runde 4»).
  3D-KARTET OVENFRA (18. nov kveld, brukeren: «ting så litt svakt ut i vanlig 3D-view … bare den vanlige 3D-kart»). Bilder fra Rogaland
  (scratchpad syn/syn.js: nytt spill, leir 37880 6617991, ekte data via dev.py; DEL=kart|flytt|gange|diag, FX=1 = lys og skygger på)
  viste: heia som én jevn olivenfarge, kritthvite snøfonner fra satellittbildene på heia (også om høsten) og lyse vannrette streker over
  innsjøer og daler. spill/kartbilde.js (regler uten DOM, test_kartbilde.js) bakes inn i kartbildet i bygg3d: striperG (skanne-striper i
  satellittmosaikken rettes rad for rad, bare der blokkene på tvers er enige), snøTilBergG (hvitt under Kartbilde.snøFast(Y) – 1150 m i
  sør, ca. 730 i Lyngen – males som bart fjell; fjern3d.js gjør klasse 4 om til snaufjell under samme grense) og relieffG (søkk mørkere,
  rygger lysere fra høydenettet, lyng/berg-flekker på 230 m og 55 m – fast etter kartets meter). Vann i naturfarger beholder bare 20 % av
  satellittbildets mønster (før 45 %). STREKENE var tåkebankene i natt3d.js (64 plakater som alltid vender mot kameraet): de tones nå bort
  når kameraet ser ned på kartet (14–33° ned). MÅLEFELLE: med tempo 0 tegner 3D sjelden nye bilder – et skjermbilde rett etter en endring
  viser det gamle bildet; tegn til et eget mål (WebGLRenderTarget + readRenderTargetPixels) for sammenligninger (syn/diag10.js).
  Ekstra byggetid: ca. 0,25 s (2048²) / 0,6 s (4096²) i biter med pust. Ikke gjort: hakkete strandkanter (vannflatene er 32 m-ruter),
  steinmønster nær bakken på heia (heia er snaufjell i arealklassene).
  LUT OG SEKK (18. nov kveld, brukeren: «finne lut inni hus … brunost, matgreier, saft, rifle, ammunisjon» og «inventarsystemet til
  Project Zomboid» – inspirasjon, ikke kopi). spill/lut.js (regler uten DOM, test_lut.js; alle tall Claudes forslag i REGLER, GJENSTANDER,
  BEHOLDERE, KLASSER) + spill/lut-visning.js (window.LutSpill). Beholdere lages av møblene i interiøret (kjøleskap, kjøkkenskap, garderobe,
  nattbord, reol, pall, verktøybenk …), innholdet fast per møbel (hash av bygg + møbel), lut etter byggklasse (våpen i ca. 27 % av hyttenes
  første garderobe, 16 % boliger, aldri sykehus; medisin ×3 på sykehus; ransakede bygg lite). Knappen «Åpne kjøleskapet (E)» over «Sikre
  huset»; lutpanelet: det du bærer til venstre, faner per beholder + «Gulvet» til høyre, stabling, trykk-velg/trykk-flytt (telefon), dra og
  slipp / dobbeltklikk / høyreklikk-valg (mus), «Ta alt»/«Legg alt»; det du legger igjen lagres per leir («riksbrudd-lut»). Vekt og plass:
  lommer 5 kg + sekk på ryggen (handlenett 7, skolesekk 12, tursekk 22, militærsekk 30 kg); over bæreevnen (22 kg + styrke) går du tregere
  (gange.js × LutSpill.fart()) og blir fortere sliten (karakter.js × LutSpill.løp()), ved 1,5× kan du ikke løpe. Hånd/rygg/belte 1–4 (beltet
  = de gamle våpenplassene; kampen urørt). Jaktrifle (ny, 7,62 mm, kan ikke kjøpes). Ferskhet: fersk mat blir gammel og råtten (−12 helse),
  kjøleskap hjelper bare med strøm (overlev.js). «Let gjennom huset» gir fortsatt det tunge (materialer, diesel, penger, matkartonger til
  leiren); våpen og ammo kommer fra skapene. 3D: ting på benker/bord/nattbord/hyller, våpen ved garderoben, hauger på gulvet, forsvinner når
  de tas. utstyr.js: Utstyr.krok (maks, vekt, plassTil, våpenOk), window.SEKK_TILLEGG. VAKT: vakter/lut.js. Notat docs/natt/lut.md.
  Ikke gjort: lommelykt/batterier/sovepose/feltflaske uten virkning, sekk i sekk, innholdet i kjøleskap/reoler synes ikke i 3D, fiender
  leter ikke i hus, husene fylles ikke på igjen.
  RUNDE 5, 18.–19. NOV KVELD (22:50–01:30, brukeren: «publiser så forbedre enda mer» + «flyttbare møbler og alt»; seks hjelpere i
  natt-mappene, notater under «Runde 5» i docs/natt/<pakke>.md, flettet inn i claude/nattfiks; maskinen ble startet på nytt 00:15 –
  hjelperne fortsatte fra sine commits). MØBLER (lut): spill/mobler.js (regler, test_mobler.js) + mobler-visning.js (MoblerSpill): alle
  møbeltyper kan plukkes opp (P), > 85 kg nei, > 18 kg eller > 1,3 m bæres i armene (×0,72 fart, ikke løpe/skyte, body.bærermøbel skjuler
  våpen-/huseknapper), spøkelse (grønt/rødt med grunn, R/Q roterer, E/Enter/«Sett her», «Sett tilbake»; 0,9 m foran på PC, 1,6 m på smal
  skjerm), innhold ≤ 20 kg følger med, kollisjon via interiørplanen / hindringene i 3D, lagres «riksbrudd-mobler»; interior3d.js har
  window.INTERIOR_PLAN, Interior3d.bygOm(i), Interior3d.møbelGeo(m). LYKT: spill/lykt.js (L, batterier 8 spilltimer, ser 45 % lenger om
  natta, fiender ser deg lenger unna; lyskjegle på bakken med samme blanding som lysflekkene, ingen nye lys). Sovepose («Sov her» ute),
  feltflaske (+4 slurker per flaske, fylles ved vann/bekk), LutSpill.tøm/ransaket (fiendelag innen 60 m tømmer bygg i 3D-utsnittet,
  butikker fylles hvert 3. døgn), boliger innen 1,5 km fra leiren har alltid noe, Karakter.stell (≥ 60× innen 600 m fra leiren: stell av
  leirens lager), «Gå» starter ved karakteren. BALANSE: røvertaket gjelder hele bølgen (Trussel.menn), forsvar-hjemme.js (ammo fra kassa,
  sårede hviler, «hjem for å hvile»), trussel-lagring.js («riksbrudd-angrep»: pågående bølge tilbake etter omlasting), forsvar-oppgjor.js
  (døgnoppgjør kl. 06); kjøring B på Vanlig: leiren holdt 9 døgn, tapte et lag. KRIG: stridsvogna skyter bare på det den eller et lag
  innen 150 m ser (Enheter.REGLER.egenSikt), fienden kjører på telefon (Vegnett.les med boks ±150 km, hentes første gang fienden kjører,
  VEG_TLF i kjoretoy-visning.js), krigskartet kan skjules til en stripe og passer liggende telefon, fiendens lastebiler og «sist sett»
  lagres. NATUR: Kartbilde.strandG (myk strand fra høyden, lys stein-/grussone; u.vann lages av det ferdige kartbildet), lyng (bunnkart
  klasse 3) i stedet for stein på heia, planter/gress sjekker R3.hindre og Vegetasjon3d.iLeir, tregrense(y, x) lavere mot vestkysten,
  spill/lave3d.js (høy, redskap, trillebår, gråtass i låver). LYS: spill/grense3d.js – alt utenfor fylket mørklegges i 3D på /rogaland via
  tåka (Lys3d koblGrense, bare når PÅ_OMRÅDE), stiplet grense på bakken; hindring3d sjekker boksen først, natt3d forberedes i forbered3d,
  mer pust i naboerAsynk/trær3d. Største hakk igjen: interior3d bygg (160–330 ms per bygg).
  KRITIKKEN OG RUNDE 6 (19. nov, brukeren: «lat som du er en spillkritiker og lag en rapport for så å fikse alt den sa som var dårlig»):
  to kritikere (PC/Rogaland og telefon/Dovre, webdriver av, på den ekte siden) – docs/anmeldelse-2026-11-19.md (terningkast 3 og 3,
  grensesnitt 2). Seks hjelpere rettet feillistene (notater «Runde 6» i docs/natt/kart.md, ui.md, krig.md, okonomi.md, start.md, ga.md).
  KART: spill/etikett.js samler navnene i en ramme og plasserer dem til slutt etter viktighet (fiender > valgt > tettsteder i krigskartet >
  egne lag > leiren > kjøretøy > bygg), skjuler det som ikke får plass («+3»), merkene er hindringer og ligger øverst; kartlapper.js (meldte
  fiender øverst), kartlys.js (2D mørkere/blåere om natta etter solhøyden, gråere i regn; av i testene til KartLys.test); ingen kai-ankre i
  krigskartet (bare leirens kai), krigskartet fyller telefonen, «0 t olje» og «Leiren til» ved basen vises ikke, sifre med vanlige tall.
  HUD: toppstripa med ord foran tallene, overflyt bak «Mer»; spill/skjermlag.js = én vindusrekkefølge (kort < varsel < pauselapp < angrep <
  egne paneler < bunnmeny < tips < opplæringsring), bunnmenyen står alltid (også liggende og under angrep), kort som venter på svar setter
  spillet på pause («Spillet står på pause til du svarer»; av i testene til Skjermlag.test), opplæringen viser «✓ Gjort» og kan legges
  sammen, Leir-menyen starter øverst, alt fra bunnmenyen åpnes til venstre (tillegg til høyre), hjelpen i 11 grupper med søk, forsiden
  «Spill nå» (Rogaland, hele Norge). KRIG: inntak etter størrelse (garnison.js: ≤ 4000 innb. som før, Stavanger/Sandnes 35–69 mann og 4–8 t),
  fredstid i regionkrigen (2,5 døgn på Vanlig), taket på lag vokser et halvt lag per døgn, ingen seier/«overtaket» før dag 4, motstanderen
  holder sitt startsted, «Neste trekk» sier hvor mange mann som trengs; røverne starter 3–4 km unna med anslag i varsel og banner, vakttårn
  ser dem på 1,5 km, «snart framme» 10 min før, «Forsvar leiren» lagres med angrepet. ØKONOMI: diesel 3 000 kr/l (500 l = 1,5 mill.),
  penger-visning.js («Penger inn» under Lager, lav kasse-brikke), oppdragstakt (to ved start, nytt etter 6–10 t), salgstak per døgn,
  hogstlaget finner selv skog innen 1,5 km, én dieselprognose (Leir.dieselRekker), totalpris i byggemenyen, «Kjøp 500 l» i tom-diesel-
  varselet, auto-nedbremsing til 10× for bygg/kort (1× for fiende/alarm/tap), lagring oftere ved høy fart; gjennomspilling: 6–10 mill. dag 3–7.
  START: kjønnsbytte gir passende hår/skjegg (Oppstart.KJØNN; portrett-motor.js urørt), portrettet fast på telefon, utkastet lagres
  («riksbrudd-k1-utkast»), ingen Dovre-pilot-lag før leiren er lagt (settes inn igjen ved leiren; testmodus som før), spill/leirvalg.js
  (advarsler: høyfjell, lite skog, langt til veg/tettsted; kai bare ved sjø), steg 3 sier riktig område, beskjed om andre lagrede spill.
  GÅ: spill/gaavalg.js – «Hvor vil du gå?» når kameraet ser > 60 m fra karakteren: «Reis hit (ca. N min)» (spoler mens karakteren går),
  «Gå her», døra trekker deg mot midten + «Gå inn»/«Gå ut», Esc lukker det som er åpent først, været i 3D følger reglene (overgang 25–45 min,
  «Klart → regn»), maskinvarevarselet én gang som liten lapp, snikemåleren forklart, kort venter mens du går, spill/fjellmark3d.js (stein,
  lav, lyng, snøflekker på fjellet). Etter flettingen: røvervarselet bare i loggen (banneret sier det samme), loggen skjult bak banneret på
  telefon. Kontroll: PC og mobil 119/119.
  NATT TIL 20. NOV, RUNDE 7–9 (brukeren: «fortsett utviklingen og forbedringer fram til imorgen klokken 10:30»; arbeidet stoppet ca. 04:10
  fordi kontoen nådde ukegrensen, og ble gjort ferdig etter kl. 16. To nye kritikere: docs/anmeldelse-2026-11-20.md – PC 4, telefon 3).
  Notater under «Runde 7/8/9» i docs/natt/<pakke>.md. FIGURER: spill/figur3d.js – avrundede figurer (kapsler, dreide profiler) for folk,
  soldater, fiendens stillinger og karakteren; gå/sikte/bære/knele/ligge i skyggeleggeren; nær-/fjernnett (Folk3d.nett() = {nær, fjern},
  R3.solMesh = [nær, fjern]); geværet i hånda (narhud.js) med detaljer. LEIR2D: spill/leir2d.js – byggene som tak ovenfra etter type,
  stadier (kø, grunnmur/reisverk/stillas, skadet, ødelagt), lys i vinduene om natta, soldater som figurer ovenfra og folk der de arbeider;
  kroker med f.over = true tegnes etter tåka. AI: spill/eskalering.js (+visning) – motstanderne har kasse og folk, kjøper lag/lastebiler/
  stridsvogn, samler 2–7 lag til angrep, storbyer fra dag 11 (Vanlig), angriper dine tettsteder fra dag 5 og leiren fra dag 8 – alltid med
  etterretning (Vanlig 6 t før) og ring/pil i kartet; motstanderne slåss seg imellom; gjennomspilt: Kystalliansen vinner dag 12 om du ikke
  gjør noe. LAGRING: spill/lagringsside.js (egen ending per side: Dovre ingen, /norge @norge, /rogaland @rogaland; gamle spill gjort om
  én gang, «riksbrudd-sider») og spill/lagringsmeny.js (LagringMeny: plass 1–3 + automatisk, last ned / hent fra fil, full/sperret lagring
  meldes). YTELSE: interiøret og gresset bygges i biter (interior3d byggG, interior.js planG), spill/tallrekke.js (gjenbrukte tabeller i
  hus3d, liv3d-veger, infra3d-bruer; kartbildets punkter fra lager) – Bergen gående 9,5 s → 1,1 s lange pauser. RUNDE 8 (ny kritikk):
  NYBEGYNNER – Tropper.behold: forslagene lar alltid to bli igjen, advarsel og «Opprett likevel», «Oppløs troppen»/«Send hjem og oppløs»,
  «Ring etter arbeidere», steg 6 «Mer forsvar før dag 4», opplæringen viker for paneler/angrep, «Senere», tastaturhint skjult på
  berøringsskjerm. TERRENG – spill/helling.js (+visning): leirvalget nekter umulige leirer og foreslår «Flytt hit» til flat grunn,
  vann/tettsted gir forslag; plassering farger bakken grønn/gul/rød med høydekurver, «Drei 90°»/«Flytt skissen»; Leir.bratt/brattGrense.
  GANG – «Reis hit» uten heng (3D tegnes ikke under reisen, kartet bygges før du går), «Gå inn i huset» fra 2D-panelet, pil mot inngangen,
  snu med én finger på telefon, spill/byggeplass3d.js (telt, bål, byggestadier i 3D), smalt angrepsbanner i gåmodus. FLYT – spill/loggdemp.js
  (like meldinger ×N, rutiner sjeldnere, vær bare ved store skifter, tips én gang), ⏭ stopper bare for det som krever spilleren, kortpausen
  holder under spoling, kort venter under angrep, «Nytt spill» øverst i ☰, hjelpen samlet. UTSEENDE – flisene tones inn og får myk kant
  (ingen harde skjøter), grov flis først, Vaer.dis3d (mindre grått ovenfra i regn), nærskog i vegetasjon3d, tomDybde i lys3d (halvmåne-
  stripa), spill/kartnavn.js («hovedløp» bort). ANGREP – ForsvarSpill.status() én kilde (sett/sist sett/glatt anslag), egne lag ved leiren
  vises der de er, kampen synes i 2D (glimt, ring, «I ildkamp»), ⏭ stopper når kampen begynner, rapport etter hver bølge, ekte angrep i samme
  banner, garnisoner holder stillingen, Krig.klynger (én lapp for fiender nær hverandre). RUNDE 9: MORGEN – spill/morgen.js (+visning):
  morgenmøtet kl. 06 fra dag 2 med 2–3 valg ut fra leiren (jakt, dobbel vakt, kjøp mat, speidertur, fridag …) og rapport neste morgen,
  større beslutninger hver tredje dag (nabogården, forlatt tankbil, beskyttelsespenger, karavane). Hjelpen: 213 emner (samle_hjelp.py).
  RUNDE 10 (20. nov kveld, brukerens iPhone-bilder liggende: «Dette ser ikke bra nok ut»; bildene i scratchpad/bruker20/). KJØRING:
  Kjor.stilling/hjulHøyder (helling fra fire hjul, høyst ca. 34°/26°, glattet), vegFylling (bakken skrår fra vegkanten for bilen), for bratt
  = stopp/kryp/skli; knappene Gå ut/Brems/Gass nede til høyre (Brems rygger når bilen står), penere avrundet feltbil (Kjoretoy3d.form),
  kameraet 9,6 m bak / 3 m opp. BAKKE: de svarte kilene var kryssflaten i veg.js (avskåret hjørne mot innkjørsel som svevde) –
  KRYSS_REGLER (avvik .35, ikke hjørne mot P/S), skyggene aldri helt svarte og tonet ut langs strålen (uSkF i lys3d), forsideLys for gress/
  planter (baksidene ble svarte), GRESS_FARGE, lysere asfalt med tekstur, LOD-bias på kartbildet på avstand. LIGGENDE: tropppanelet i to
  kolonner med «Opprett» alltid synlig, én ting om gangen nederst (opplæring/hogstlapp/bannere viker), bunnmenyen ugjennomsiktig, gåmodus på
  telefon med fem knapper + «⋯», knapper og ruter flyttet ut av midten. GL-feil 1282 på mobil: tomDybde er nå MeshDepthMaterial med
  colorWrite/depthWrite av. Kontroll: PC 128/128, mobil 128/128.
  RUNDE 11–12 (21. nov natt, brukeren: «se etter mer som kan trenges å forbedres»; to nye kritikere: docs/anmeldelse-2026-11-21.md –
  telefon liggende 3 (grafikk 2), PC 4). Notater under «Runde 11/12» i docs/natt/<pakke>.md. MODELLER: avrundede kolonnekjøretøy
  (stridsvogn, kalesje, rakettartilleri, radar), hjul med felg, kolonnene på fire hjul (Kjor.stilling), dyrene med runde hoder/bein, folk
  over 320 m tegnes ikke. BAKKE: vegen skåret inn i lia (Veg.skjær/skjærG: gitteret senkes under vegen, men ikke nær hus), kameraet bak bilen
  holder seg utenfor trekronene (KRONE per treslag). REGNSKAP: materialprisen er én regel (Leir.manglerPris), falne går ut av folket (én
  kilde), døgnoppgjøret sier hvem og hvorfor, leting sier hvor funnet havnet. LIGGENDE TELEFON: kort som venter øverst, varslene i én brikke,
  opplæringen som én linje, Leir-menyen i full høyde med ikonrad, forsiden/karakterskaperen i to kolonner, steg 3 overlever omlasting, ingen
  klypezoom (unntatt når du går). KRIG: radioadvarsel før Send, Send med kjøretøyet, garnison melder seg fra tettstedet (kontakt selv bak
  terreng), troppelista i venstre kolonne, forsvar av seg selv under spoling, «Hold byen» krever motangrep, oppsummering på seiersskjermen,
  reprisen på pause, lysere og med tegnforklaring, pausen holder straks når et kort venter. KART: én skrift i kartet (Etikett.skrift bytter
  sans-serif til Cormorant Garamond i 2D-rammen), hogst-/regiontekst gjennom Etikett, krigskartet løftes med «screen» (KART_LØFT) i stedet for
  å mørknes, leiren som klynge langt ute (leir2d klyngeM), hellingsfargene myke og bare rundt skissen, trekroner 13 m utenfor flisen (ingen
  kutt i skjøten), roligere jernbane på z8–10, siktfeltene samlet per side (siktC i tegnEnheter).
  INNE: letingen viser et resultatpanel (#funnpanel: til leiren og hvor, i sekken, igjen i huset, «Se i skapene» = LutSpill.åpneHele for hele
  bygget), knappene inne samlet i #inneknapper, hint om møbler første gang, karakteren drikker/spiser selv ute (tørst < 40, sult < 35),
  sveip som begynner på en knapp blir blikk (touch-action:none, akselerasjon), pila mot inngangen bare når huset er foran deg eller innen 12 m,
  «Reis til feltbilen». 3D: Auto-grafikken senker seg bare etter 10 s sammenhengende tregt (Kvalitet.vedvarende), aldri over Lav på
  programvare-grafikk, Lav har gress og blomster, enkelBakke har korn (ikke flat gul mark); låven med plankevegger, traktor/gråtass av
  Kjoretoy3d.form, høyballer og lysstråler (lave3d.js); våpenarmen med hanske og kamuflasje; stedsnavn i gåmodus bare over 600 m og aldri
  midt i bildet (NAVN_GÅ); ny flaggstang som blafrer i vinden (window.Flagg3d). Hjelpen: 237 emner. Kontroll: PC 130/130, mobil 130/130.
  RUNDE 13 (21. nov dag, brukeren: «se etter enda flere ting som kan forbedres, eller gjøre bedre, eller gjøre tydeligere»; to nye kritikere:
  docs/anmeldelse-2026-11-21-dag.md – telefon liggende 4, PC 4). Notater under «Runde 13» i docs/natt/<pakke>.md. KAMP: spill/forsvar-kamp.js
  (KampVarsel uten DOM, window.KampSpill): en kamp = første skudd/tap for et eget lag til 30 spillmin uten skudd; én stopp med «⚔ lag er i kamp med
  <fiende> i <sted>», «Vis» på stoppkortet (#flytvis), kampmerke for lag uten kontakt, årsak i loggen når noen faller; flyt.js teller ikke
  ildkamper når KampSpill finnes. Angrepsanslaget kan bare minke (Forsvar.monoton/harSnudd/når/nedtelling), «ikke sett – kommer trolig …»,
  neste bølge og forsvarsordren lagres (trussel-lagring, riksbrudd-angrep), «Røverne er sett» stopper ⏭, banneret viker for #inneknapper.
  KRIG: Strategi.kravFor – ett krav («minst 3 mann (5 for full fart)»), advarsel før Send (for få, bygdevern, fiender, leiren uten vakt) med
  «Send likevel»/«Gjør avtale»/«Speid og meld»; radioforslaget regner med terrenget (terrengSjekk); speidertropper stopper 400 m før et forsvart
  sted; troppetallene «friske av, såret, falt» og «sist meldt»; tankbilen med samme radiovarsel, «på vei», laget går hjem; scenarioets mål øverst
  i Krig; «sist sett» samlet; tegnforklaring. MORGEN: Morgen.nyDag – møtet bare når dagen er NYERE (også dagbok og oppgjør), tap i lagene
  navngitt, to kolonner og «Vis hele døgnet ›» på liggende telefon, tida står mens møtet venter, en sak hver dag fra dag 2, handelsmannen kl. 14
  (selg tre/diesel), svartebørsen kjøper tre. REGNSKAP: ordre og valg lagres straks, klokka går aldri tilbake (riksbrudd-klokke), spill/logglager.js
  (siste 100 linjer per leir, «Velkommen tilbake», «Hele loggen»), kortene følger matlageret og velger bare folk hjemme, ingen like navn
  (FolkRegler.opptatteNavn), opplæringen med krav i tall, «Flyttet: … fra Bygg til Vakt», prisen forklart (utstyr og deler, Leir.PRISDEL).
  UI: byggelinja med ord under ikonene, hjelpen øverst (Skjermlag hjelp 69), «+n tall» øverst og «Mer» bare nederst, kort trykk uten boble,
  tallboksene i Leir-menyen bryter, bare klokke og vær før leiren er lagt, varseltrekanten sier årsaken, kortene dekkende fra første bilde, ørn
  med hode og vinger, myke kinn. KART: «Leiren: 3 lag, 2 kjøretøy ›» (samlelapp ved leiren), små bygg forstørret på 100 m-målestokk, hogstfelt
  under byggene, valg av bygg zoomer til 0,5–0,9 m, grove fliser glattet (flisGlatt), diamantene alltid med navn, «skog: mye» aldri over
  tregrensen, olje skjult i leirvalget, høydekurvene tynnes i bratte lier, vegnettet beholder bare spillkartets veger. 3D: første 3D-bilde viser
  leiren nær (Kvalitet.startBlikk), «Sett deg inn i feltbilen (F) · 6 m bak deg» (Kjor.innTekst), folk går unna kameraet (folk3d), stedsnavn
  med avstand når du går. Hjelpen: 265 emner. Kontroll: PC 131/131, mobil 131/131.
  HUS I 3D OG FLAGG (21. nov kveld, brukeren: «når en flyr langt vekk fra der en starter i 3D laster ikke bygg inn», «flaggstenger havner i
  vegen»): grensen for hus i et utsnitt var S ≤ 3200, men vanlig flyhøyde (avst ca. 2,1 km) gir S ≈ 3260 – alle nye utsnitt ble uten hus, og
  zoomet du inn, ble utsnittet ikke bygget på nytt. Nå HUS_S() = 4200 PC / 3600 telefon (Claudes forslag), og tegn3d bygger på nytt når
  utsnittet mangler hus og kameraet er nær nok (manglerHus). Flaggstanga i hagen tas bort i liv3d.js når den står i vegbanen/fortauet eller
  under 1,2 m fra kanten (u.hus.flaggBort; ved Bryne 37 av 119), og flagg tegnes bare når u.påVeg finnes (S ≤ 2200). VAKT: vakter/3d.js.
  RUNDE 14 (21. nov kveld, brukeren: «fiks alt i rapporten» – docs/anmeldelse-2026-11-21-kveld.md, kritiker I telefon 4, J PC 4; brukeren ba om
  1,5 t i stedet for 2,5). Notater under «Runde 14» i docs/natt/<pakke>.md. KRIG: «Hold byen» navngir byen (SCENARIO_BY(), dobbel gyllen ring,
  «Scenariets by»), telleren lagres straks og nullstilles bare når en annen side eier byen, «Scenariet: X er tapt – telleren starter på nytt»;
  lag ved et sted det ikke tar får forklaring etter 20 min (StrategiSpill.hvorforIkkeTar: fredstid, forsvar, bygdevern) og ⏭ stopper; varselet
  viser kjent forsvar i mann (kjentForsvar, garnison som anslag) og «For svakt … tar ikke stedet» med røde knapper; radiovarselet rulles inn;
  krigsstripa viker for stoppkortet; bygdevernet holder dine lag ute, lag på marsj blir ikke garnison; speiderbiler innen 800 m kan velges.
  KAMP: Eskalering.tidligst/holdIgjen – motangrep aldri før minstetiden; banneret bruker egne observasjoner i 6 t («sist sett 3,5 km N kl.
  08:53»); «Røverne drar ut om …» (trussel-lagring holder tida nøyaktig); farten ned under 500 m, kampen om leiren varer (ild 0,4 de første 3 min,
  rapport tidligst 2 min etter); bølge 2+ på Vanlig/Hard minst 2 lag (BØLGE i forsvar-kamp.js); patrulje i fredstid stopper ⏭ høyst én gang per
  døgn; «X og Y sloss ved …» om andre siders kamper. REGNSKAP: «Velkommen tilbake» i kortkøen (Kortkø.vik/slipp; pause mens den står; aldri
  sammen med kort/møte), ingen oppstartslinjer i loggen ved omlasting (REGLER.OPPSTART), velkomsten bare for økta før og når tid har gått,
  viktige linjer først, eldste først; opplæringen godkjennes straks (0,4 s), «Mer forsvar» uten «før dag 4» etter fristen; fartsknappen blar
  bare ved ekte trykk (e.isTrusted); kassekortet sier verdien; «utstyr og deler» forklart per bygg (UTSTYR). MORGEN: raidet øverst i møtet med
  «Forsvar leiren nå»; etter tap: leiesoldater, vaktlag, rekrutter, krisehjelp fra bygdevernet; karavanen kjøper tre (knapp); speidertur nevner
  eieren; diesel med pris per liter. UI: «Snu ⟲/⟳», velkomsten til høyre for Leir-panelet, ⌂ = «Til leiren» (#dombas) og eget ikon for hele
  kartet (#hele), leirvalgboksen nede til venstre på telefon og kartutsnittet huskes ved F5, tips ved siden av panelet, våpenboksen over
  minikartet på PC. KART: «Leiren: 1 lag + deg, 2 kjøretøy · 1 lag ute ›» (KartLapper.telling, 450 m), Kaier.stedsnavn (båtnavn → stedet),
  felles underlag når lånte fliser kommer fra flere nivåer (GLATT.fra 1). 3D: spill/fjernkart3d.js – grovt terreng med kartbilde rundt utsnittet
  og «Laster landskapet …» når du flyr; folk flyttes unna de første 2 s av gåmodus; lysere lyng og planter; trær ryddet i leiren (LEIR_RYDD);
  startblikk på skrå; asfaltgrå veger i 3D-kartet (ASFALT3D); «Nærmeste tettsted: X · 8,6 km N» under kompasset; «sist sett» eldre enn 6 t
  skjules i 3D. Hjelpen: 277 emner. Kontroll: PC 130 ok + mobil 130 ok; eneste FEIL var kamp-vaktas rapportsjekk (vakta rettet, grønn alene på PC og mobil). Merk: en vakt lar 3D være av før skytesjekken – sjekk.js slår det på igjen og skriver «merk:».
  RUNDE 15 (21.–22. nov, brukerens ønsker om utseende og lasting; sammenlignet med ekte bilder fra Wikimedia Commons, lenker i
  docs/natt/*.md; bildene bare i scratchpad/natt15/; rapport-PDF «Virkeligheten mot spillet»). NATUR: spill/bakkefarge.js – gul-oliven
  vegetasjon dreies mot grønt (dyrket mark sterkere, u.dyrketMaske), lyng/berg/sand/snø uendret (BAKKEFARGE_AV = gammel); Jæren 49° -> 70°
  (ekte 73°); plen/baner klippet; spill/anleggfri.js – u.påAnlegg: ingen trær/steiner/busker på baner (anlegg 1–5, 7–9). KYST: Kyst.KAI –
  loddrett kaifront (betong/granitt/tre), kaidekke, gul kant, pullerter, fendere, stiger, lykter ved kaipunkter og i byhavner, terrenget
  hevet/senket. BYGG: steinkirker (>700 m², bratt tak), hvite hus og teglrøde tak etter tetthet (Byhus.husFarge/husTak), takvinkler per
  type, takrenner/vindskier, låver alltid skråtak, nye typer t 15 sykehjem og t 16 legevakt (bygninger.py – krever ny husrelease), OSM-utseende
  (r, l, tf, vf, m), tre bensinstasjoner (Byhus.bensinType). BY: spill/gagate.js/gagate3d.js (brostein vegg til vegg; vegtype g = 2 for
  NVDB Gågate/Gatetun i vegtype.py – krever ny bygging av vektorflisene; til da en streng gjetteregel), spill/parkering.js/parkering3d.js
  (plasser 2,5 × 5 m i rader, øyer, lykter, biler etter klokka, tak 450/150 biler), fortau med kantstein 12 cm og nedsenket ved gangfelt,
  fortau i 2D fra z15. LASTING: spill/forut3d.js – neste utsnitt bestilles i fartsretningen i god tid og legges foran deg, kartdata hentes
  på forhånd (forhent3d mer); fly 150 s: 30 s -> 0 s uten detaljer (PC). ELV: spill/elvestrom.js – strømlag oppå brede elver i kartets
  vann (retning fra NVE, aldri oppover, ingen strøm i innsjø/sjø); ikke sett på bilde (Dovre har ingen slik elv). ANLEGG: spill/anleggsarbeid.js
  (+visning) – tabell Anlegg.ANLEGG: skyttergrav (sikksakk, 1,5 m, vern ×0,4), bunker (×0,15, interiør), egen kai (båtene legger til), tunnel
  (lenke i ruta), felles terrenginngrep (hoydeVed + Veg.skjærG i 3D), «riksbrudd-anlegg». INNE: interior.js med tabellene TYPER, ROMSETT,
  TILGANG, ALDRI_VED_DØR, MØBELSETT, STILER – takhøyde per type, gang først, flere innganger (pl.innganger), stil eldre/nyere/moderne, butikk,
  fjøs, industri (sag/metall/olje), sykehjem/legevakt; P.bygg.tett/k fra hus3d. LOGOER v2 og pitch/plan (PDF) i scratchpad/pitch,
  docs/designretning.md. Hjelpen: 295 emner. Kontroll: mobil 138/138, PC 137/138 (ui «fanene i Leir-menyen» – grønn alene, ustabil under last).
  FLERSPILLER M2a (22. nov natt, brukeren: «gjør alt etter en plan du lager», frist 2 t; plan: docs/plan-flerspiller.md, kapittel 0):
  gratis, tjeneren på VERTENS EGEN PC (brukerens valg). tjener/riksbrudd-tjener.js (Node uten avhengigheter: HTTP + egen
  WebSocket, verdener med kode på 6 tegn, høyst 5 spillere, lagring i verdener/KODE.json + .bak, /status med PNA-svar,
  --tunnel starter cloudflared og leser trycloudflare-adressen), start-tjener.bat, LESMEG.md; test pipeline/fliser/test_tjener.js
  (laget av en egen skysesjon). site/tjener/riksbrudd-tjener.zip lages av pipeline/fliser/pakk_tjener.py (--sjekk = lik tjener/).
  Nettleseren: spill/flerspiller.js (regler uten DOM: lenke #spill=<ws>&kode=, bilde/brukBilde, sjekkKommando, nesteEier,
  framTid; test_flerspiller.js) + flerspiller-visning.js (window.NETT, panelet #nett fra ☰ «Spill sammen»). VERTENS NETTLESER
  REGNER VERDEN (simuleringen er ikke skilt ut ennå – M0): verten sender F.bilde (lag med nid, rute, eier; kjøretøy; tid, tempo,
  vær, leir; fiender bare når synlig()) hvert 0,5 s, gjesten bytter ut ENHETER/KJORETOY på stedet og regner ikke (sim() går bare
  klokka når NETT.gjest; lagring.js lagrer ikke). Ordre fra en gjest: ordre() spør NETT.fangOrdre -> kommando til verten, som
  sjekker eieren (s.eier = gjestens id, «Styres av» i lagpanelet) og kaller ordre(). Verten styrer farten. Verden som har stått
  (borteSek fra tjeneren) regnes fram med 600×. Verten åpner verden igjen av seg selv ved omlasting (vertNå i «riksbrudd-nett»).
  Ende til ende: node pipeline/fliser/test_flerspiller_e2e.js (to nettlesere + tjeneren; BILDE=<sti> gir skjermbilder).
  Gjestens lagpanel (index.html visPanel -> NETT.lagPanel når NETT.gjest): bare Marsjer og Stopp (kommandoene 'ordre'/'stopp')
  for egne lag, ellers «Styres av …». Kommandoen 'pos' (hvert 2. s fra gjesten) + bildet.sp: alle ser hvor de andre spillerne er
  (KROKER.tegn og KROKER.tegn3d, navn i blått; minPos = der du går i 3D, ellers kartets midte). Lagene glir hos gjesten (s.glatt).
  Gjestene ser vertens leir bare som et merke; leirbyggene, folk og økonomi deles ikke ennå.
  FELLES TILFELDIGHET (M0 punkt 4, 22. nov natt, egen skysesjon): spill/tilfeldig.js (mulberry32; Tilfeldig.lag(frø), Tilfeldig.verden =
  én felles strøm, nyVerden/lagre/les, heltall/velg/sjanse; test_tilfeldig.js). Regelmodulene morgen, verden, oppstart, vaer, overlev,
  kameravakt, forsvar-kamp, forsvar-hjemme og trussel-lagring bruker Tilfeldig.verden i stedet for Math.random (nye regler: gjør det
  samme). lagring.js lagrer strømmen (rng). I nettleseren får hvert nytt spill et eget frø (crypto); i Node er frøet 1.
  oppstart.js låner strømmen til portrett-motor.js (brukerens fil, uendret) ved å bytte Math.random mens portrettet lages.
  LAGRING AV ALT (22. nov, R16-E): spill/lagring.js lagrer nå også kjøreordre for egne kjøretøy (kjøretøy[].mål = siste punkt på
  ruta; ved lasting k.målLagret, og fortsettOrdre() kaller kjørTil på nytt – kolonner med oppdrag tas ikke med), køen på basene
  (baser: [{ navn, bygget, kø: [{ type, igjen, total }] }], Lagring.brukBaser), minefeltene (minefelt, MINEFELT) og dronene (droner,
  DRONER) – ett felt per slag, gamle lagringer uten feltene gir tomme lister. Røverne i et angrep som er i gang, lagres fortsatt av
  spill/trussel-lagring.js («riksbrudd-angrep»), ikke i lagring.js (ellers kom de tilbake to ganger). Ikke lagret: salvene i lufta
  (SALVER) og kolonner med oppdrag. Test: test_lagring.js; VAKT vakter/lagring-alt.js («lagring av alt»: lager kjøreordre, minefelt,
  drone, bestilling og angrep, lagrer, åpner samme side i en ny fane og ser at alt er der). FELLES TILFELDIGHET I VISNINGEN: de elleve
  *-visning.js-filene med spillregler (spillet, eventyr, morgen, samfunn, eskalering, tropper, garnison, forsvar, region, verden, sjø)
  bruker tilfV = Tilfeldig.verden; bare lyden i spillet-visning.js og id-en i flerspiller-visning.js har Math.random, merket «Math.random
  med vilje». test_tilfeldig.js feiler når Math.random dukker opp i en fil som ikke står i BARE_UTSEENDE (lyd, effekter3d, vind3d,
  folk3d, dyr3d, natt3d, liv3d, portrett-motor) – nye regler skal bruke Tilfeldig.verden.
  SIMULERINGEN (22. nov, R16-B – M0 punkt 2, første bit): marsjsteget, fiendens patrulje og kamprunden er flyttet fra index.html til
  spill/simulering.js (uten DOM; lastes rett etter terreng.js). Simulering.lag({ lag, Terreng, kroker, rng, TIME, hentTid, settTid, logg,
  ordre, ser, synlig, levende, patruljelag, patruljeMål, patruljeAntall, hvile, herjer, treffMelding, skudd, framme, flyttet, etterKamp })
  -> { steg(dt), kamprunde(), patrulje(tid), marsj(dt), tilstand: { patruljeNr } }; Simulering.patruljeMål(fi, nr, punkter, maks).
  index.html beholder sim(dt), kamprunde() og patruljeMål(fi, nr) som tynne innpakninger (samme navn – sjekk.js og modulene kaller dem),
  simulering() lager modulen første gang. «if (window.NETT && NETT.gjest) …» står fortsatt øverst i sim(), og panelet som oppdateres
  hvert sekund, er igjen i sim(). Det som viser noe (visPanel, skitten, SKUDD med performance.now) gjøres i tilbakekallene. Oppførselen er
  den samme som før: samme rekkefølge (KROKER.sim, klokka, kamprunde, patrulje, marsj) og samme bruk av KRNG. Test:
  node pipeline/fliser/test_simulering.js (to lag og kunstig sikt i Node, et spilldøgn, samme frø = samme verden, og en kopi av den gamle
  koden som fasit). GJENSTÅR: KROKER.sim-modulene (AI i fraksjoner-visning, økonomi, forsyning, garnison, leir …) kjører fortsatt i siden,
  ordre() (ruteplan med lagVindu) og sikt (s.sikt fra terrengfliser) trenger kartdata, og KRNG (Terreng.frø(1987)) lagres ikke med spillet.
  KOMMANDOLAGET (22. nov, R16-A – M0 punkt 1 i docs/plan-flerspiller.md): alt spilleren gjør med lag og leir går gjennom ÉN funksjon,
  window.KOMMANDO(k), så de samme handlingene kan sendes over nettet. spill/kommando.js (regler uten DOM, test_kommando.js):
  Kommando.registrer(type, { lag, leir, vertAlene, sjekk(k, ctx, s), utfør(k, ctx, s), beskriv(k, s) }), Kommando.utfør(k, ctx) -> { ok,
  feil?, svar? } (en handling som svarer { feil } regnes som avvist), Kommando.tillatt (bare de felles sjekkene), Kommando.nid(s, liste)
  (lagets nid, samme som flerspilleren sender), typer(), kanSendes(k). ctx = { lag: ENHETER, side, spiller, erVert }; en gjest (spiller satt,
  ikke vert) må eie laget (s.eier) og får ikke bruke leirkommandoer. spill/kommando-visning.js registrerer de ekte handlingene: ordre,
  stopp, speider, lagfører, grav, miner, formasjon, strid (bare Strid.VALG; «alle» bare for verten) og i leiren bygg, riv, prioriter,
  folk, folkFlytt. Knappene i index.html (marsjmål i 2D/3D, speider, Stopp, lagfører), feltarbeid-, formasjon-, strid-, leir- og
  folk-visning.js kaller KOMMANDO({ type, lag: KOMMANDO.nid(s), … }) – oppførselen i enspiller er som før. Hos en gjest (NETT.gjest)
  sendes kommandoen til verten ({ t: 'kommando', k }), og verten kjører NETT.utførFra(k, gjestens id) og logger «Kari setter Lag 1 i linje».
  Gjestens lagpanel har nå Marsjer, Stopp, Grav ned, Formasjon og Stridsregler; bildet sender s.strid. Nye knapper for lag og leir: lag
  en kommando her i stedet for å gjøre jobben i knappen. AI-en og reglene kaller fortsatt ordre() direkte.
  DEL 2 (22. nov, R17-4): leir, folk, tropper og kjøretøy. Reglene i spill/kommandoer.js (uten DOM; Kommandoer.registrer(Kommando, M) med
  et miljø M: leir(side), penger/betal/gi(side), folk(side), leirPunkt(side), tropp = TropperSpill.rett, kjør, kjørStopp …), miljøet for
  nettleseren i kommando-visning.js (MIN_SIDE = 'blå' er siden som har leiren og kassa i denne nettleseren – ALT slås opp via ctx.side).
  Typene: bygg (også bs for byggesettet), byggPlan, plan (legg/flytt/fjern/tøm), riv, flytt, oppgrader, reparer, prioriter, bryter,
  kjøpDiesel, kjøpMateriale, selgMateriale, folk, folkFlytt, rekrutter (bygg: true = på «bygg»), kjøpMat, troppOpprett, troppOppløs,
  troppUtstyr, omBord, gåAv, kjør, kjørStopp (kjøretøy = nid fra Kommando.nid(k, KJORETOY), eller navnet; gjester kan kjøre kjøretøy de eier).
  Hver sjekk() avviser med norsk tekst (finnes, er din, har råd) i samme rekkefølge og med samme tekst som regelfunksjonen, så enspiller
  er som før; svaret er det regelfunksjonen ga ({ feil, mangler } også). Visningene bruker kom(k) = svaret eller { feil } og skriver
  meldingene selv; lag- og meld-kommandoer skriver avvisningen i loggen. tropper-visning.js: TropperSpill.opprett/oppløs/gåOmBord/gåAv/
  brukEndring går via KOMMANDO, de «rette» funksjonene i TropperSpill.rett (hjemSteg kaller oppløsRett direkte). kjoretoy-visning.js:
  window.KjoretoySpill.stoppRett. FolkSpill.matFaktor er nytt. KONTROLL i test_kommando.js: tekstsøk (FORBUDT) i leir-, byggesett-,
  strøm-, folk-, tropper- og kjøretøyvisningen etter direkte kall som endrer tilstanden; UNNTAK har forklaringen (simulering, de rette
  funksjonene, maler og angre i planen, prøvetroppen) – et unntak som ikke treffer lenger, er også en feil. Nye knapper i de filene:
  lag en kommando. IKKE GJORT: maler (planMal) og angre i planen, «Kjør mot …» (enheter-visning.js), kjøp av våpen i Leir-menyen, sekk,
  morgenmøtet, selskap, sjø og de andre panelene; flerspiller-visning.js ctxFra bør få kjøretøy: KJORETOY (ellers brukes M.kjøretøy()).
  SELSKAPET W1 (22. nov, R16-D; docs/plan-wardogs.md): spill/selskap.js (regler uten DOM, test_selskap.js – hentet fra grenen claude/natt18-krig)
  + spill/selskap-visning.js (window.SelskapSpill, lastes rett før meny.js). Panelet #selskap fra kommandolinja (KOMMANDO_TILLEGG k 'selskap'),
  ☰ «Selskapet» (gruppen Oversikt) og fanen Mål i Leir-menyen: merket (SVG – skjold i flaggets farger med bokstavene; ravn for Ravnsund
  Sikkerhet, gran i sikte for Mosevakt Feltoperasjoner), ryktet (pålitelig/hardhendt/billig som målere), pris (lav/vanlig/høy), aktive og
  ledige kontrakter (Ta, Avslå, Lever, Avbryt, Vis i kartet) og de andre selskapene. Stedene er tettstedene og de navngitte bruene i INFRA
  (2,5–22 km fra leiren, OMRÅDE_OK). Eskorte lager en lastebil i KJORETOY (k.bil), rydd et rødt lag på seks (s.sperre, s.kontrakt), hent tas
  av et eget lag innen 80 m og leveres i leiren, hold teller tid med eget lag og uten fiender innen 350 m. Betaling via OppstartSpill.gi,
  bot via betal; sprengning (KROKER.ødelagt) gjør selskapet hardhendt; hendelsen «riksbrudd-kontrakt» ved levering. Lagres per leir i
  «riksbrudd-selskap» (ikke hos en gjest i flerspiller). I testene skjer ingenting av seg selv (SelskapSpill.test); å åpne panelet uten
  tilbud gir de første. Motstanderne heter fortsatt Kystalliansen/Folkefronten i resten av spillet (panelet viser «i kartet: …»). VAKT
  pipeline/fliser/vakter/selskap.js. Tallene er Claudes forslag.
  LEIRVALG OG TROPPER, R17-2a (22. nov, funn 9, 11, 12, 14 og 15 i docs/natt/funn-r16-spilltest.md): (9) Garnison.avstand(by, x, y)
  (0 inne, ellers meter til omrisset) og Garnison.nærmeste(byer, x, y); leirvalget måler til omrisset (før rektangelet bb – «Ålgård/Figgjo
  0 m») og Oppstart.gyldigLeir avviser leir inne i eller nærmere enn Oppstart.LEIR_FRA_BY = 400 m fra et tettsted (v.nærTettsted; Claudes
  tall) – «Flytt hit» finner et sted utenfor. (11) Helling.grunnen(høyde, tørt, x, y): andelen grønt/gult/rødt/vann for brakka innen
  REGLER.nær (80 m) med samme regel som fargene -> «grunnen: flat / litt skrå / blandet – 53 % byggbart, 47 % for bratt / mest for bratt».
  (12) Leir.kanBygge: v.veger (bilveger og gang- og sykkelveger fra vektorflisene z13, LeirSpill.kartveger) er hindringer – «Brakke står på
  vegen» (halv vegbredde + 0,5 m; Leir.påKartveg, Leir.VEGBREDDE). Gjerder, egne grusveger (linje) og porter kan krysse; byggesettet bruker
  det samme. (14) Tropper.advarsler: «Leiren står igjen med 2 personer – ett byggelag (nå 2) til 3 jobber: 2 står i kø …» når troppen gir
  færre byggelag enn det står jobber; advarselen står nå rett over «Opprett» (#troppadvar i .opprett). (15) En tropp om bord har «Kjør dit»
  i stedet for «Marsjer» (index.html; panelpynt.js regner den som ordreknapp): window.OMBORD_ORDRE(s, X, Y) i tropper-visning.js gir ordren
  til kjøretøyet (kjørTil) og setter s.avstigning, så troppen går av ved målet. Kjøretøyvalget i skjemaet settes med sb.value og linja
  #troppbiltekst sier om troppen går om bord. Tester: test_oppstart, test_helling, test_leir, test_tropper; VAKT vakter/leirvalg-r17.js.
  R17-2b GRENSESNITT OG TRYGG TEGNING (22. nov, funn 10, 16–22 i docs/natt/funn-r16-spilltest.md + brukerens Windows-feil): (22) spill/trygtegn.js
  (lastes først på siden og i kartflis-arbeider.js) pakker drawImage inn så en kilde med bredde/høyde 0 (vindu som krymper/minimeres) eller et
  bilde som ikke kunne leses, hoppes over (TrygTegn.tom); tegn() venter når VW/VH eller lerretet er 0; tegneløkka (loop) bestiller alltid neste
  bilde i finally – før stoppet hele løkka på én feil, og kartet ble svart. VAKT vakter/vindu.js (krymper til 0 og tilbake, krever 0 feil og at
  kartet tegnes). (21) oppdaterSikt: w/h under 1 eller sikt NaN -> prøv igjen om 2 s (feil: 4 s). (10) flyt.js: lappen #fartgrunn under
  fartsknappene sier hvorfor farten ble senket (bort ved trykk på en fartsknapp, på lappen, eller etter 90 s; FlytSpill.stopp/fartGrunn);
  lange brikker i lagpanelet bryter linja (panelpynt.js), og Kontrollrom.utenKontakt sier «en ås eller fjellside ligger mellom laget og leiren».
  (16) gange.js: «Gå» mens det første 3D-utsnittet bygges, huskes («Gå …», Gange.gåVenter) og går ned når 3D er klart. (17) leirens telt
  (leir-visning.js opptatt) holder seg unna feltbil/helikopter (rotor 7 m), og Kjor.plasser sjekker rotorplassen. (18) telefon i 3D:
  stedslappen (hvorLapp3d) står kort under minikartet; grafikkvarselet er kort og oppe til venstre (body.kort). (19) opplæringslinja viker
  mens tropppanelet er åpent på stående telefon. (20) ressurser-visning.js: et hogst-/rivefelt under loggen i 2D gir #logg.vik (nesten
  gjennomsiktig til du peker på den). VAKT vakter/r17-ui.js.
  KAMP PÅ BAKKEN W2 (22. nov, R17-3; docs/plan-wardogs.md W2, notat docs/natt/bakkekamp.md): spill/bakkekamp.js (regler uten DOM:
  Dekning, Kikkert, Granat, Følge, Indikator; test_bakkekamp.js) + spill/bakkekamp-visning.js (window.BakkekampSpill, lastes etter
  selskap-visning.js). DEKNING når du går: husvegg/bil/stein/tre innen 6 m mellom deg og skytteren (R3.hindre, u.hus.biler, u.smått.stein,
  KJORETOY) ganger skaden i kampSteg (dekF i spillet-visning.js) – vegg 0,25, bil 0,5/0,3 på huk, stein bare på huk/liggende, tre 0,7;
  eventyr-visning.js bruker da ikke sin egen «vegg». «I dekning (vegg)» og antall granater under helsa (#nhud .dekn). SIKTEKIKKERT: høyre
  museknapp / «Sikt»: rifle 4×, jaktrifle 3×, andre 1,45× (gange.js spør BakkekampSpill.fov/følsomhet), treff × opptil 1,4 på langt hold
  (skyt() ganger med BakkekampSpill.treff), svart ring #kikkertring (eget lag, z-index 1), våpenet i hånda skjult (narhud.js). GRANATER: G /
  «Granat», eget granatbelte (Utstyr.TING.granat med del: true, høyst 6, to gratis i nye leirer – «riksbrudd-bakkekamp», kjøp i Leir-menyen
  under «Håndgranater»); buen og lunta (3,2 s) i Granat.steg med egen klokke, scenens z = (moh. − u.h0) × EX, smellet med Effekter3d,
  skader alle lag innen 12 m (også egne) og deg. G går altså IKKE ut av gåmodus mens du går. LAGKAMERATER: J / «Lag» – egne lag innen
  400 m: «Følg meg» (ny ordre via KOMMANDO når laget er > 16 m fra plassen bak deg, høyst hvert 4. s), «Hold her», «Angrip dit» (dit du
  ser, høyst 600 m); slutter du å gå i 3 s, holder de stillingen. TREFFMARKØR (kryss, rødt når en mann faller) og SKADEINDIKATOR (rød bue
  mot skytterne, fra kandidatene kampSteg sendte inn) i KROKER.tegn3d. I testene ingen gratis granater (BakkekampSpill.test). VAKT
  vakter/bakkekamp.js («kamp på bakken»: prøvevegg, kampSteg, selvtest, kikkert, granat, kast, følg/hold). Tallene er Claudes forslag.
  IKKE GJORT: maskingevær, fiender som kaster granater, dekning for lagene dine.
  LEIRMODELLER RUNDE 2 (22. nov, økta på brukerens PC, gren claude/lokal-modeller; docs/modeller-liste.md del A–C, punkt 1–114, alle
  laget): spill/modeller-leir2.js – detaljer i docs/modeller-leir2.md. MODELLER.LEIR2[modell](b) går foran EGNE/MODELLER i leir-visning.js
  modell() (nivå 1–3 synes på brakke, kameramast, radiomast); modeller.js eksporterer hjelperne (MODELLER.H). Detaljnivå: over 1000
  trekanter har geometry.userData.fjern, byttet inn over 165 m av en ramme3d-krok. 66 nye bygg registreres fra fila (NYE og TING: Leir.BYGG,
  Ikoner.BYGG, Leir2d.STIL, gruppe via window.LEIR2_GRUPPER som byggelista leser); de fleste har ingen virkning ennå («virkningen kommer
  senere»), unntak: offisersbrakke 4 senger, lagerhall 250 m³ lager. MODELLER.gjerde, kasser, fatpall og flaggstang er byttet ut; sokkel ved
  flaggstanga i 3D. Selskapets farger fra OppstartSpill.tilstand().fraksjon.flagg. Testsiden spill/modeller-visning.html viser alle.
  WINDOWS: git har core.autocrlf=false i denne klonen; versjon.py må kjøres med LF (Python på Windows skriver ellers CRLF og feil hasher).
  INSPIRASJON SILENT HILL (23. nov, brukeren: «Silent Hill også en inspirasjon»): bare stemning og sjangergrep (tåke, mørke, forlatte
  steder, lyd/radiostøy som varsler fare, lommelykt, knappe ressurser) – ingen navn, steder, figurer, monstre, musikk, symboler eller
  utseende derfra. Se docs/plan-spillmekanikk.md. Brukeren valgte (23. nov) FORLATTE STEDER og KNAPPE RESSURSER, og god stemning
  generelt – ikke tettere tåke eller radiostøy som eget system (R18-F og R18-E).
  VIRKNING I LEIRBYGGENE (R18-B, 23. nov, brukeren: «vi må legge til funksjoner og virkning i alle leirbyggene»; gren claude/r18-leirvirkning,
  notat docs/natt/leirvirkning.md): spill/leirvirkning.js (regler uten DOM, test_leirvirkning.js) har ÉN tabell VIRKNING med hva hvert
  leirbygg gjør (moral, helse, matsvinn, arbeidstempo, vann, radio/satellitt, strømnett, vern, sikt, radar/poster, hindringer som sinker
  fiender, trening, ammunisjon, leging, reparasjon/fylling av kjøretøy, parkering, vaktdroner, fangevakter, røvernes bytte, lager, senger,
  strøm) – nye bygg: legg en linje der. spill/leirvirkning-visning.js (window.LeirvirkningSpill, lastes etter modeller-leir2.js) kobler det
  på SamfunnSpill.valg/varsling (Folk: moralTillegg, helseTillegg – nytt i folk.js –, matFaktor, tempoFaktor), Leir.nettFaktor, KROKER.ild/
  sikt/ser/fart/sim, Spillet.Trussel.bytte, Krig.rømmer og Enheter.skad; leir.js lar bygg med B.diesel/B.sol lage strøm (generatorhus 30 kW),
  kontrollrom-visning.js mast() tar radiotillegget og satellitten hopper over terrengsjekken. Byggpanelet viser «Virkning: …» (#byggvirkning,
  med «uten strøm»/«hardt skadet»), kortene i byggelista en kort linje (.virk, Leirvirkning.kort). Hvert slag teller én gang (moral høyst
  +15). Prisene på generatorhus (9 mill.), bærbar generator og solpanel ble satt opp fordi de nå gir strøm. Alle tall er Claudes forslag.
  VAKT vakter/leirvirkning.js («virkning i leirbyggene»: tekst for alle bygg, åtte målte virkninger).
