# Pakke «bygg»

## Runde 15 (21. nov kveld): bygg fra virkeligheten

Brukeren: «se om du finner noen bygg fra virkeligheten som det er bilder av, sammenlign dem med hvordan bygget ser ut i Riksbrudd, finn ut
hvorfor det er forskjell og hva som kan gjøres for å få det til å se likere ut» + tillegg om helsebygg (sykehjem, legevakt, sykehus) og
bensinstasjoner (automat / med tak / stor).

### Ekte bilder (Wikimedia Commons – bare lenker, bildene ligger ikke i repoet)
| Bygg | Bilde | Lisens |
|---|---|---|
| Stavanger domkirke | https://commons.wikimedia.org/wiki/File:Stavanger_Cathedral.jpg | CC BY-SA 4.0 |
| Gamle Stavanger, Øvre Strandgate (trehus) | https://commons.wikimedia.org/wiki/File:%C3%98vre_Strandgate,_Gamle_Stavanger.jpg | CC BY-SA 4.0 |
| Norsk hermetikkmuseum (gammel hermetikkfabrikk, industri) | https://commons.wikimedia.org/wiki/File:Norsk_hermetikkmuseum.jpg | CC BY-SA 2.0 |
| Hå gamle prestegard (gård med låve, Jæren) | https://commons.wikimedia.org/wiki/File:H%C3%A5_gamle_prestegard.jpg | CC BY-SA 4.0 |
| Fitjar aldershjem og sykehjem | https://commons.wikimedia.org/wiki/File:Fitjar_aldershjem_og_sykehjem.jpg | CC BY-SA 4.0 |
| Vestby sykehjem | https://commons.wikimedia.org/wiki/File:Vestby_nurshing_home_(Vestby_sykehjem)_in_Vestby,_Akershus,_08.12.2022,_IMG_3454.jpg | CC BY-SA 4.0 |
| Stavanger universitetssjukehus | https://commons.wikimedia.org/wiki/File:Stavanger_University_Hospital.jpg | CC BY-SA 3.0 |
| Bensinstasjon (Uno-X og 7-Eleven, Vestby) | https://commons.wikimedia.org/wiki/File:Uno-X_and_7-Eleven_in_Vestby,_Akershus,_16.04.2022.jpg | CC BY-SA 4.0 |
| Bensinstasjon (Esso Eik, eldre) | https://commons.wikimedia.org/wiki/File:Esso_Eik_bensinstasjon_-_SAS2009-10-2141.jpg | CC BY 4.0 |
| Høgda bensinstasjon, Vestby (historisk, liten stasjon) | https://commons.wikimedia.org/wiki/File:H%C3%B8gda_bensinstasjon,_Vestby_-_SAS2015-05-042.jpg | CC BY 4.0 |

Bilder fra spillet (før/etter) ligger i scratchpad `natt15/bygg/` (for-*.png = før, etter-*.png = etter), tatt med ekte data via dev.py og
/rogaland (skript `natt15/bygg/bilde.js`).

### Sammenligning
| Bygg | Likt | Forskjellig | Hvorfor | Hva som kan gjøres (✔ = gjort nå) |
|---|---|---|---|---|
| Stavanger domkirke | Plassen og grunnflaten (omrisset fra OSM, 41 hjørner) | Spillet: hvit trekirke-kloss, FLATT tak, 30 m høye vegger og et spir på taket. Virkeligheten: gråstein, bratt skifertak (ca. 50°), vegger ca. 10–12 m, ingen høy spir | OSM gir bare omriss og `building=cathedral` (høyden er anslaget 30 m i bygninger.py). Omrisset med støttepilarer er ikke rektangulært, og takDeler ga ikke tak – da ble det flatt. Alle kirker fikk trekirke-teksturen | ✔ Store kirker (≥ 700 m²) er steinkirker (tekstur «stein»: naturstein med spissbuevindu, gavlene i stein), ✔ veggene høyst 12 m og bratt tak (Byhus.KIRKE, TAKVINKEL), ✔ sammensatt omriss får valmtak langs hovedretningen, ✔ ikke spir på steinkirker. Senere: `roof:shape`, `building:material=stone`, ekte `height` fra OSM (pipeline klar) |
| Gamle Stavanger (trehus) | Små saltakshus tett i tett, gavler og vinduer per etasje, pipe | Spillet: blanding av hvite, grå, gule og røde hus med mørkebrune tak. Virkeligheten: nesten alle hvite, oransjerøde teglstein, hvite vindskier og takrenner | Ingen farger i dataene; VEGGFARGER[0] trakk tilfeldig (ca. 43 % hvite), og takfargene var mørke | ✔ Hvite trehus etter tetthet (78 % i sentrum, 66 % i by, ca. 40 % på landet, 62 % på landet på Vestlandet), ✔ teglrøde tak på ca. halvparten i tette strøk, ✔ takrenner, vindskier og hjørnekasser på småhus nær kameraet. Senere: `building:colour`, `roof:colour` (pipeline klar) |
| Enebolig (villastrøk Eiganes) | Saltak, pipe, garasje, bil i innkjørselen | Husene så ut som «klosser» uten detaljer langs takkanten; tilfeldige farger | Som over | ✔ Takrenner/vindskier/hjørnekasser, ✔ hvitere på Vestlandet. Ikke gjort: verandaer, karnapp, kjellerinngang |
| Gård med låve (Hå gamle prestegard) | Hvitt våningshus med saltak, låve, uthus | Låvene var røde med for slakt/lavt tak (møne høyst 5 m), på Jæren er både hus og låve ofte hvite med mørkt tak | Takhøyden hadde et tak på 5 m for alle; låvefargene er røde (VEGGFARGER[4]) | ✔ Låve: høyere møne (til 8 m, ca. 36°), hvite vindskier. Ikke gjort: hvite låver på Vestlandet, låvebru |
| Hermetikkfabrikk (industri) | Lang murbygning | I dataene er det mange småbygg (`building=yes`), som blir «uthus»/«hus» | OSM-typen mangler; fabrikkene i Gamle Stavanger er merket som vanlige bygg | Trenger `building=industrial`/`historic` i OSM. Ikke gjort |
| Skole (katedralskolen) / butikk / kontor | Bygårdsfasader i sentrum (murgård, tegl) | Kartpunktet traff et høyhus – skolen ble ikke funnet sikkert i dataene | Koordinatene/typene | Ingen endring (skolene har egne fasader fra runde 12) |
| Sykehjem (Fitjar, Vestby) | – (fantes ikke som type) | Spillet: sykehjem ble «bolig» eller «leilighetsbygg». Virkeligheten: lange fløyer i 2–3 etasjer, lys puss eller tegl, altan/balkong per rom, ofte saltak | bygninger.py kjente ikke `amenity=nursing_home`/`social_facility`; `clinic` ble sykehus | ✔ Nye typer 15 sykehjem og 16 legevakt/legesenter i bygninger.py (med test), ✔ fasade «pleie» (lys puss, vindu + altan per rom), ✔ saltak på ca. 70 %, ✔ 2D-merke (hjerte / grønt kors). Krever ny husrelease |
| Sykehus (SUH) | Høye, store bygg med rødt kors og helikopterplass | Spillet hadde kontorvinduer; SUH har lyse betongbånd med vindusbånd | Fasaden for sykehus var «kontor» | ✔ Sykehus får funkis (båndvinduer), plate eller tegl via Byhus.stil |
| Bensinstasjon | Tak over pumpene, skilt i kjedens farge | Alle stasjoner var like (ett tak, to øyer, ingen butikk). Virkeligheten: automat med 1–2 pumper uten tak på bygda, tak + butikk i tettsted, store stasjoner med kafé og vaskehall ved hovedveg | Én modell | ✔ Tre varianter etter vegtype, tettsted og hash (Byhus.bensinType, anlegg3d.js) |

### Hva som er laget
- **pipeline/fliser/bygninger.py** (+ test_bygninger.py): `bygg_type` – 15 sykehjem (`amenity=nursing_home`, `social_facility=nursing_home/
  assisted_living/group_home`, `building=nursing_home`), 16 legevakt/legesenter (`amenity=clinic/doctors/dentist`, `healthcare=*`);
  helse-amenity vinner over vanlige bygningstyper (residential, apartments, commercial …). `utseende(tags)` gir egenskapene `r` (takform:
  1 flatt, 2 saltak, 3 valm, 4 halvvalm, 5 pyramide, 6 mansard, 7 gambrel, 8 pulttak, 9 kuppel, 10 rundt), `l` (etasjer), `tf`/`vf`
  (takfarge/veggfarge som 0xRRGGBB + 1) og `m` (materiale: 1 tre, 2 tegl, 3 stein, 4 puss, 5 betong, 6 glass, 7 metall). **MÅ BYGGES:**
  ny husrelease (hus.yml) og bruk_hus.py – til da finnes ingen 15/16 eller r/l/tf/vf/m i dataene, og spillet gjetter som før.
- **spill/byhus.js** (+ test_byhus.js): `husFarge(kl, i, tett, X)` (HVIT), `husTak(kl, i, tett)` (TEGLTAK), `steinKirke(A, i)` og `KIRKE`,
  `TAKVINKEL` (kirke 51°, hus 40°, låve 36°, hytte 31°, sykehjem 31°, uthus 35°), `bensinType(k, by, x, y)` (BENSIN_ANDEL), fasadene
  `stein` og `pleie` (teksturer, MÅL, FARGER), `stil` for sykehjem, legevakt og sykehus. Alle tall er Claudes forslag.
- **index.html, hus3d**: klassene sykehjem/legevakt (klasse, STIL, DØR, BYGGTYPE[15/16]), farger fra OSM (tf/vf), takform fra OSM (r),
  hvite hus/teglrøde tak, steinkirker (gruppe «stein», lavere vegger, bratt tak, valmtak på sammensatt omriss, tårn bare på trekirker),
  mønehøyde via `mønFor` (TAKVINKEL), takrenner + vindskier + hjørnekasser (hjørnekasser bare på hus som ikke er hvite) på småhus innen
  700 m fra midten av utsnittet (`stat.lister`).
- **kartflis.js**: TAKFARGER/VEGGFARGER for 15/16, harFall for 15/16, byggmerke (hjerte for sykehjem, grønt kors for legevakt).
- **spill/anlegg3d.js**: `bensinstasjon()` lager automat / vanlig / stor; plassen sjekkes mot husene for hele stasjonen (butikk og vaskehall).
- Til inne-pakka: `P.bygg.t` = 15 og `P.bygg.kl` = 'sykehjem'; `P.bygg.t` = 16 og `P.bygg.kl` = 'legevakt' (Interior.plan faller tilbake til
  «hus» for ukjente klasser). Typenavn: BYGGTYPE[15] «Sykehjem», BYGGTYPE[16] «Legevakt eller legesenter».

### Ikke gjort / gjenstår
- 2D-kartet vet ikke om hvite hus/teglrøde tak (bakgrunnstråden laster ikke byhus.js) – takene i 2D har de gamle fargene.
- Ingen nye trekanter for verandaer, karnapper, takarker på småhus, låvebru.
- Hermetikkfabrikken og andre gamle industribygg er «uthus»/«hus» fordi OSM-typen mangler.
- Typene 15/16 og OSM-utseendet krever ny husrelease.
