# Pakka «by» – gågater, parkeringsplasser og fortau

## Runde 15 (21. nov kveld)

Brukerens ord: «gågater ser bare ut som vanlige gater per i dag», «smarte systemer for parkeringsplasser – hvordan ser de ut i
virkeligheten kontra spillene, kan de legges inn?» og (tillegg) «Ser fortau bra ut? I 3D og 2D.»

### Ekte bilder (Wikimedia Commons – bare lenker, bildene ligger ikke i repoet)
- Torgallmenningen, Bergen: <https://commons.wikimedia.org/wiki/File:Torgallmenningen-2021.jpg> (CC BY-SA 4.0, Bjørn Christian Tørrissen)
  og <https://commons.wikimedia.org/wiki/File:Torgallmenningen,_Bergen_(2).jpg> (CC BY-SA 4.0, Ssu)
- Karl Johans gate, Oslo: <https://commons.wikimedia.org/wiki/File:OSLO_Norway_2026-09-06_KARL_JOHANS_GATE_Kirkegata_HM_Home_Vero_Moda_Trafikklys_g%C3%A5gate_Lav_morgensol,_s%C3%B8ndag,_tomme_gater_(dawn,_empty_streets)_(wide-angle_distortion)_IMG_1716.jpg> (CC BY-SA 4.0, Wolfmann)
- Strandgaten, Bergen: <https://commons.wikimedia.org/wiki/File:Strandgaten_Bergen_tunliweb.jpg> (CC BY-SA 4.0, Svein-Magne Tunli) og
  <https://commons.wikimedia.org/wiki/File:Strandgaten_80_5004_Bergen_Norway.jpg> (CC0)
- Nordre gate, Trondheim (søket fant <https://commons.wikimedia.org/wiki/File:Nordre_gate_Trondheim_2022-08-18_01.jpg>, ikke lastet ned – Commons svarte 429)
- Kirkegata i Stavanger (Norges første gågate, 1960): <https://lokalhistoriewiki.no/wiki/Kirkegata_(Stavanger)>
- Parkeringsplasser: Commons svarte «429 Too Many Requests» på søkene etter norske parkeringsplasser og fortau, så sammenligningen under
  bygger på OSM-wikien (<https://wiki.openstreetmap.org/wiki/No:Tag:amenity%3Dparking>), flyfoto fra kjent kunnskap og vanlige norske mål.

### Hva som er forskjellig, og hvorfor
| | Virkeligheten | Spillet før | Spillet nå |
|---|---|---|---|
| Gågate | Heller (Torgallmenningen: store grå granittheller i mønster) eller brostein fra vegg til vegg, ingen kantstein, ingen kjørebane; benker, blomsterkasser, lykter, uteservering | Vanlig kommunal veg: asfalt 5,5 m, hjulspor/midtlinje, fortau med kantstein, biltrafikk | Brostein (egen tekstur) fra husvegg til husvegg, ingen kantstein/oppmerking, ingen biler, folk går der, benker, blomsterkasser, lave lykter, bord med parasoll om sommeren, trær i brede gater; 2D: lys steinfarge med fugemønster fra z16 |
| Parkering | Asfalt, hvite striper (plass 2,5 × 5 m), dobbeltrader rundt 6–7 m kjørefelt, øyer med kantstein og trær på store plasser, lyktestolper, kantstein rundt, innkjøring fra vegen, handlevognskur ved butikken, mange biler midt på dagen | Bare en grå flate i kartet (og i 3D-bakken), ingen striper, ingen biler | Plassene etter regler (spill/parkering.js): rader langs lengste side, 6 m felt, endefelt på lange plasser, øyer med gress og trær, lykter (tennes som gatelysene), kantstein, innkjøring mot nærmeste veg, handlevognskur ved butikk, biler etter klokka (flere ved butikker på dagtid, få om natta); 2D: stripene, øyene og lyktene fra z15 |
| Fortau | 2–3 m, kantstein i granitt/betong ca. 10–13 cm, nedsenket (ca. 2 cm) ved overganger og innkjørsler; utenfor sentrum ofte grus/gress mellom fortau og veg | 3D: 2 m, 15 cm, sluttet brått ved kryss (åpen kant); 2D: ingen fortau, bare asfalt med mørk skulder | 3D: 12 cm kantstein, senket til 2 cm de siste 1,5 m før kryss og gangfelt (ingen glippe i enden); 2D fra z15: lys stripe på 2 m med lys kantstein langs K/F/R i tettbebyggelse |

Hvorfor gågatene så ut som vanlige gater: dataene sier ikke at gata er en gågate. NVDB har typene «Gågate» og «Gatetun», men
`pipeline/fliser/vegtype.py` la dem i samme gruppe som gang- og sykkelveger (g = 1), og de publiserte vektorflisene for Norge har ingen
vegtype i det hele tatt ennå (jeg sjekket Stavanger: 10 467 veglenker, ingen med g).

### Regelen for gågater (spill/gagate.js)
1. **Nye data:** g = 2 (NVDB «Gågate» og «Gatetun», endret i vegtype.py med test). **Vektorflisene må bygges på nytt** («Bygg Norge»)
   før dette virker; 2D og 3D leser g = 2 alt nå.
2. **Til da:** en kommunal veg (K) i et tettsted er en gågate når det er sentrum (minst 40 bygg innen 100 m – samme grense som Byhus
   bruker), husveggene står innen 9 m fra midtlinja på begge sider på minst 60 % av lengden, snittet vegg til vegg er høyst 15 m og
   gata er 25–700 m lang. 2D-flisene kjenner ikke tettstedene og bruker «minst 15 bygg innen 100 m» som tettsted.
   Svakhet: smale bilgater i sentrum blir også gågater (Stavanger sentrum fikk 108 gatebiter), og brede gågater som Torgallmenningen og
   Karl Johan kommer først med g = 2.
Alle tall er Claudes forslag (REGLER øverst i gagate.js og parkering.js).

### Filer og API
- `site/dovre-fliser/spill/gagate.js` (regler, `Gagate.husRute/stråle/tetthet/mål/erGågate/bredder/møbler`), test `pipeline/fliser/test_gagate.js`.
- `site/dovre-fliser/spill/gagate3d.js` (`Gagate3d.skill(u, veger, gang)` kalles fra liv3d.js; KROKER.bygg3d møbler/trær, KROKER.sett3d flate
  og møbler som instanser; `Gagate3d.antall()`, `Gagate3d.siste`, `Gagate3d.nett()`).
- `site/dovre-fliser/spill/parkering.js` (regler, `Parkering.plan/rader/fyll/ledig`), test `pipeline/fliser/test_parkering.js`.
- `site/dovre-fliser/spill/parkering3d.js` (KROKER.bygg3d plan, biler i `u.hus.biler`, lykter i `u.lys`, trær i `u.trær.løv`; KROKER.sett3d
  striper, kantstein, øyer, skur, innkjøring; `Parkering3d.antall()`, `Parkering3d.ledig(X, Y)` = nærmeste ledige plass i kartets meter –
  for kjøretøy som skal parkere, IKKE koblet til ordrene ennå). Bare plasser innen 900 m fra midten, tak 3000 plasser PC / 1000 mobil.
- `kartflis.js`: `parkeringNær` (anlegg a 6 fra z15), `gagaterNær` + `tegnGågater` (z14+), fortau i `vegerRealistisk` (r ≤ 0,5 m per punkt).
  Bakgrunnstråden laster `spill/parkering.js` og `spill/gagate.js` (kartflis-arbeider.js).
- Vakt: `pipeline/fliser/vakter/by.js` (reglene med oppdiktet område, 2D-tegningen på eget lerret, 3D-modulene finnes). Prøvd med feil med
  vilje (plassbredde 1,5 m): vakta meldte «200 plasser oppå hverandre».

### Endringer i felles filer
- `spill/liv3d.js`: `rå.push` tar med `gå` (g = 2); etter `u.veger = veger; u.gangveger = gang;` kalles `Gagate3d.skill` og `alle` tar med
  `u.gågater` (vegmasken); folkene går også på `u.gågater` (to steder `velgLinjer(G)(u, KRAV_GS, …)`); fortauet: `bånd(…, ramp)` med
  `KANTSTEIN = .12, NEDSENKET = .02, RAMPE = 1.5`.
- `spill/gate.js`: `KANT = .12` (var .15) så benker/søppelkasser står på det lavere fortauet; `test_gate.js` bruker `G.KANT`.
- `index.html`: fire skript-tagger rett etter anlegg3d.js. `kartflis-arbeider.js`: to nye filer i importScripts.
- `pipeline/fliser/vegtype.py`: `GAAGATE`, g = 2.

### Ikke gjort / gjenstår
- Vektorflisene med g = 2 er ikke bygget (krever «Bygg Norge»).
- Gågatene: ikke heller i mønster som Torgallmenningen (bare brostein), ingen lykter på husveggene, trærne bare i gater over 12 m.
- Parkering: kjøretøyene i spillet parkerer ikke av seg selv (bare `Parkering3d.ledig`); bilene står bare i 3D (2D-flisene tegnes ikke på
  nytt når klokka går); plasser for funksjonshemmede/el-lading ikke merket; parkeringshus (parking=multi-storey) er ikke med.
- Fortau: grus/gress mellom fortau og veg utenfor sentrum er ikke laget; innkjørsler til hus har ikke nedsenket kantstein (bare ved kryss).
