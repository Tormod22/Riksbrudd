# Nattarbeid 18. nov – pakke «ui» (grenen claude/natt18-ui)

Mål: skjermbildet skal se ut og kjennes som et spill, på PC og telefon. Alle tall er Claudes forslag.

## Laget
- **Én rad med fliser + «mer»-flis** (`spill/spillhud.js`): `passInn()` måler raden; får ikke flisene plass, skjules først årstid og vind
  (`.stats[data-trang]`), så går de minst viktige (UT: du er, kontroll, olje, mål, stål, betong, tre, folk, strøm, diesel) inn bak flisa
  `#flismer` («+3»), som åpner `#flismerliste`. `SpillHud.mer()`, `SpillHud.åpneMer(bool)`, `SpillHud.passInn()`.
- **Ord på «0 %» og «ute»**: `data-ord` («Kontroll», «Du er») vises foran tallet (PC og telefon); kontroll-flisa har skjold-ikon.
- **Forklaring på flisene** (`spill/flistips.js`, `window.FlisTips`): pek (PC) eller trykk (telefon) på en flis – hva tallet er, hva
  fargene betyr, og hvordan det står nå (den gamle `title` flyttes til `data-tittel`). Alt med `data-tips="Tittel|Tekst"` får samme rute
  (kommandolinja, kortene i byggemenyen, «mer»). Lapp som flyter fra kassa når pengene endres, og et blink i tallet.
- **Telefon** (`spill/spillhud.js`): flisene er brikker på den ene sveipbare raden (under 34 px), og kommandolinja `#mkom` står nederst
  (Leir, Folk, Tropper, Krig, Deg; 52 px høye, til venstre for zoomknappene). `body.mtlf` skjuler Leir/Krig/Deg i den trange raden
  øverst; `body.mkom` løfter målestokk, nordpil og kildetekst. Raden viker når du går, bygger eller har et panel åpent.
  PC-linja `#kommando` er urørt (vakten «spillskjermen» krever den skjult på telefon). `SpillHud.telefon()`.
- **Opplæring** (`spill/opplaering.js`, regler + `window.OpplaeringSpill`, `test_opplaering.js`): fem steg (Åpne Leir, Bygg en brakke,
  Sett to på bygg, Lag en tropp, Gå i 3D) i en rute nederst, med en ring rundt knappen/stedet. «Hopp over» og «Slå av»; kan slås på
  igjen i Leir-menyen → Mål → «Opplæring». Lagres per leir («riksbrudd-opplaering»), av/på i «riksbrudd-opplaering-av».
  Vises ikke i testene før `OpplaeringSpill.test = true`. På telefon blir ruta én linje nederst mens en meny er åpen.
- **Kort logg** (`spill/hud.js`, `window.Hud`): ikon etter innholdet (varsel, mål, bygg, folk, penger, radio, ellers snakkeboble),
  høyst to linjer, rød kant på varsler; lappen «les alt» under loggen viser hele teksten (lukker seg etter 10 s). Meldingene selv
  slipper trykk gjennom til kartet som før (kontrollskriptet klikker i kartet der). Telefonen har én linje som før.
- **Byggemenyen som kort** (`visMeny` i `spill/leir-visning.js`): rutenett med tegning, navn, pris og én linje (tid · strøm);
  materialer og beskrivelse står i forklaringen (`data-tips`). Knappen i hvert kort er den samme som før.
- **Tegninger** (`spill/tegninger.js`, `window.Tegninger`, uten DOM): `bygg(type)` (21 bygg + reservehus), `våpen(id)` (5),
  `person(frø)` (samme navn = samme ansikt), `bilde(svg)` = data-adresse. Brukes i byggemenyen, i lagpanelet (portrett per mann,
  `spill/panelpynt.js`) og i våpenruta når du går (`spill/narhud.js`). Nye bygg i `Leir.BYGG` bør få en tegning (vakta krever det).
- **Ett merkesett** (`spill/merker.js`, `window.Merker`, `test_merker.js`): eget = rektangel, fiende = rute på spissen, nøytralt =
  avrundet kvadrat; tegn inni for lag, kjøretøy, bygg, kai, tettsted. `tegnLag` i index.html bruker det for lagene og «sist sett»,
  `symKai` for ferjekaiene, og oversikten i 2D.
- **Færre infrastrukturmerker** (index.html, `INFRA_FOKUS` + `infraViktig`): bruer, tunneler, kraftverk, dammer og ferjekaier vises
  bare helt nær, når de er store, skadet, nær valgt lag/kjøretøy (2,5 km) eller målet deres, nær leiren, eller når krigskartet er åpent.
  Kaiene (ankermerkene) følger samme tanke via `KAI_VIKTIG(x, y, t, l, m)` i index.html: helt nær, store havner et stykke ut, nær valgt
  lag eller leiren (5 km), alle mens du velger leir. Grensene (meter per punkt): bru 3, tunnel 4, kraft 12, ferjekai 8, dam 8.
  «Kartmerker: de viktige / alle» i ☰ (gruppen Kartet, `#allemerker`, «riksbrudd-allemerker»). I testene som før (`INFRA_FOKUS.test`).
- **Lysere 2D-kart** (`kartflis.js`): `KARTLYS_GAMMA` 0,74, `KARTLYS_SKYGGE` 0,46 (før 0,3), `KARTLYS_METNING` 1,12 – bare der skyggen
  tegnes (2D); 3D-bakken er urørt. Lysere og litt bredere veger (VEG). Luft mellom navnene i `tegnEtiketter` (færre navn i tette strøk).
- **Oversikt i 2D** (`spill/minikart2d.js`, `window.Minikart2d`): zoomet inn (≤ 2,5 m per punkt) på PC kommer en rund oversikt nede
  til høyre: leir, lag, kjøretøy, sette fiender, tettsteder og skjermens ramme; trykk flytter kartet. Følger «Minikart» i ☰.
- **Overganger** (`spill/tema.js`): panelene glir inn, kort og knapper svarer; alt slås av med «redusert bevegelse».
- **Våpenruta** flyttet fra minikartet (`#nhud .vapen` right 282 px), `#panel` smalere/høyere så det ikke ligger under kommandolinja.

## Fellesfiler som er endret
- `site/dovre-fliser/index.html`: (1) fem skript-tagger rett før spillhud.js (merker, tegninger, flistips, opplaering, minikart2d);
  (2) `INFRA_FOKUS`/`infraViktig` rett etter `INFRA_REKKE`; (3) luft i `tegnEtiketter`; (4) `tegnLag`: lagsymbol og «sist sett» via
  Merker; (5) `symKai` via Merker.
- `site/dovre-fliser/kartflis.js`: VEG-fargene, KARTLYS_* og skyggeløkka i `komponer`.
- `spill/leir-visning.js`: bare kortene i bygglista (visMeny) og CSS for dem.
- `spill/kaier.js` (ikke min fil – liten endring): `viktig(i, m)` spør `KAI_VIKTIG` i tegningen og i trykket (to steder + én hjelpelinje).
- Prøvd på /rogaland med ekte data (Stavanger på 18 og 5 m per punkt, leiren i Ryfylke): bilder i scratchpad natt/ui/rog-*.png.

## Ikke gjort
- Kjøretøy, tettsteder og kaiene fra `spill/kaier.js` bruker ikke Merker ennå (andre filer) – API-et er klart (`Merker.tegn`).
- Portretter i Folk-panelet og tegning i byggpanelet (panelene bygges på nytt ved sammenligning av innerHTML – må gjøres i filene selv).
- Tegnforklaring i kartet, og opplæring ut over de fem stegene.

## Til den som samler
- Vaktene «spillskjermen», «samlet utseende», «kompakt skjerm», «ikoner» og «knapperaden» fra sjekk.js er kjørt hver for seg (kopiert
  ut av fila) på PC og telefon etter endringene: alle ok. Ingen av dem trenger endring.
- Nytt på telefon: raden `#mkom` nederst (52 px). Klikker kontrollskriptet i kartet helt nederst på en telefonprofil mens ingen
  panel er åpne, treffer det raden i stedet for kartet.
- Nye testfiler: `pipeline/fliser/test_opplaering.js`, `pipeline/fliser/test_merker.js` (merker + tegninger). Vakt: `pipeline/fliser/vakter/ui.js`.
- ☰: knappen «Kartmerker» (`#allemerker`) legges i gruppen ved siden av «Infrastruktur» – navnet bør inn i GRUPPER i meny.js («Kartet»).

# Runde 2 (etter sammenflettingen med de sju andre pakkene) – helheten

- **«Mer» i kommandolinja** (`spill/spillhud.js`): de fem faste (Leir, Folk, Tropper, Krig, Deg) står i linja; alt fra `KOMMANDO_TILLEGG`
  (Region, Verden, Sjø, Velg lag …) samles i en rad som åpnes av «Mer» (`#kommer` på PC, `#mkommer` på telefon) når det er flere enn
  ett tillegg. Tillegg uten eget ikon får et (sjø: anker, velg lag: ramme). Skjulte knapper (`hidden`) vises ikke lenger.
  `SpillHud.bakMer()`, `SpillHud.åpneKomMer(bool)`.
- **Panelene som én familie** (ny `spill/paneler.js`, `window.Paneler`, `test_paneler.js`): samme ramme, tittelskrift, knapper og
  lukkeknapp for #region, #samfunnmeny, #personkort, #samfunnkort, #krigpanel, #verdenpanel, #sjopanel, #evpanel, #flytkort,
  #flytgruppe, #marsjvalg og #hendelse (bare CSS med id-ene – de andres filer er ikke endret). FASTE PLASSER: venstre (Leir, Folk,
  Samfunn, Region, Krigskartet), høyre (Deg, Verden, Sjø, Tiltak, Sekk, Tropper, Stridsregler), midt (personkort, «Lag noe»/tilflukt).
  Åpner spilleren et panel, lukkes det som sto på samme plass (med panelets egen lukkeknapp); på telefon deler venstre og høyre plass.
  Skjer bare etter et ekte trykk/tastetrykk siste 1,5 s (eller `Paneler.test = true`), så kontrollskriptet kan ha flere åpne som før.
  Telefonraden `#mkom` viker også for de nye panelene.
- **Leir-menyen** (`visMeny` i leir-visning.js): hver overskrift (h3) åpner/lukker delen sin (`h3.del`, valget huskes i
  «riksbrudd-leirdeler»), delene står i fast rekkefølge per fane (DELREKKE), og i fanen Bygg står byggekortene rett under jobbene med
  resten av delene under kortene (`.hale`). Som standard er de lange delene lagt sammen (DEL_LUKKET: Forsvar, Tropper, Strømnett,
  Byggesett, Kameravakt, Sjøen, Våpen og utstyr, Markedet, Venner, Etterretning, Vær og verden, «Mål · …», Opplæring, Region, Samfunn)
  – i testene (navigator.webdriver) er alt åpent til noe lukkes (`window.LEIRDELER_TEST = true` gir spillerens standard).
- **Når du går**: målt på PC og telefon (alle synlige ruter mot hverandre): ingen ligger oppå hverandre med «Lag noe»/«Legg deg»-raden
  framme. Kameravarselet (`#kamvarsel`) flyttes på telefon bort fra minikart/helse/våpen (CSS i paneler.js).
- **Merkesettet** brukes nå også for kjøretøy-symbolet (kjoretoy-visning.js `symbol`: formen), tettstedene i krigskartet
  (strategi-visning.js) og kaiene (kaier.js `merke`) – tre små endringer med reserve når Merker mangler.
- **Folk-panelet**: ansiktet fra portrettmotoren (samme som personkortet, `Samfunn.portrettSVG`) foran hvert navn i «Vis folkene»
  (`spill/panelpynt.js`; trykk åpner personkortet). Nytt bygg «minnesmerke» har fått tegning.

Fellesfiler endret i runde 2: `spill/kjoretoy-visning.js` (symbol), `spill/strategi-visning.js` (tettstedsmerket), `spill/kaier.js`
(merke), `index.html` (én skript-tagg: paneler.js). Ellers egne filer.

Fortsatt svakt: båtene bruker ikke merkesettet (de tegnes som skrog); krigskartets panel står lavere enn de andre venstrepanelene;
lagpanelet nede til venstre har fått svært mange knapper fra flere pakker; byggekortene gjør fanen Bygg lang (ca. 3000 punkter);
kortene i midten (hendelse, samfunnskort, «Lag noe») kan ligge oppå hverandre; drikk/spis-, hund-, snike- og skaderadene er ikke sett
med alle framme samtidig (bare «Lag noe» og «Legg deg» lot seg vise i prøven).

# Runde 3 – feil fra det samlede kontrollskriptet og det som så dårlig ut

- **«Leir-menyen og målene» (matIBygg)**: romraden i byggesettet (`byggesett-visning.js`, «Rom 12 m²: …») brukte `.mat` + `span` i fanen
  Bygg. Teksten er nå et `em` (samme utseende), så bare materialradene i Lager treffer `.mat span`.
- **«folk» (innenfor skjermen på telefon)**: innglidningen i tema.js flyttet panelet 14 punkter til venstre i første bilde, og
  kontrollen måler straks. Panelene tones nå bare inn (ingen forskyvning) – også i paneler.js.
- **Lagpanelet** (`spill/panelpynt.js`): for et eget lag står ordre- og stridsknappene framme (Marsjer, Stopp, Lag, Grav ned, Gå av …,
  Stridsregler, Formasjon, Tiltak), resten bak «Mer (n) ▾» (huskes i «riksbrudd-lagmer»). En knapp som er slått på, står framme.
  I testene skjules ingenting (kontrollen trykker etter tekst) før `window.LAGKNAPPER_TEST = true`.
- **Kort i midten**: mens et kort med valg står oppe (hendelse, samfunnskort, spillformkort, flytkort, krigskort – `window.Kortkø`
  sørger for ett om gangen), viker personkortet og «Lag noe»/tilflukt (`body.kortoppe`) og kommer tilbake når kortet er besvart.
- **Krigskartet** viser bare havner og ferjeterminaler av kaimerkene (`KAI_VIKTIG` i index.html).

# Runde 4 (18. nov dag) – pakke «ui» med det som sto igjen fra «spillform»

Gren `claude/natt18-ui`. Alle tall er Claudes forslag. Prøveskript og bilder: scratchpad `natt/ui4/` (start.js = felles oppstart,
paneler.js = måling, bilder.js/bygg.js/tips.js/etter.js/tre.js = bilder, vakt.js = vaktene ui + spillform i en testside).

## 1. Paneler oppå hverandre (målt, så rettet)
- **Målingen** (`natt/ui4/paneler.js`): åpner lagpanelet, Leir, Folk, Samfunn, Region, krigskartet, Sjø, Verden, Tropper, Deg, kortet
  (#hendelse), tegnforklaringen og gruppa to og to slik spilleren ville gjort (`Paneler.test = true`), og måler rektanglene mot hverandre og
  mot kommandolinja, oversikten (#mini2d), minikartet i 3D, telefonraden, målestokken og nordpila. 1400 × 820, 1920 × 1080 og 390 × 844.
- **Funnet**: Leir/Folk/Samfunn + lagpanelet lå oppå hverandre (PC og telefon), på telefon også alle arkene + lagpanelet; Deg/Tropper/Verden
  dekket oversikten nede til høyre; panelene til venstre dekket målestokken og nordpila. (Region/Krig over kommandolinja og Sjø over
  minikartet fra test1 finnes ikke lenger.)
- **Rettet i `spill/paneler.js`**: `#panel` (lagpanelet) og `#flytgruppe` (gruppa av lag) står nå på plassen «venstre» – velger du et lag
  mens Folk er åpen, lukkes Folk, og åpner du Leir, lukkes lagpanelet (som før). `Paneler.vik()`: målestokk og nordpil flyttes til høyre for
  et panel som når ned i hjørnet (`--venstrekant`) når det er plass før kommandolinja, ellers viker de (`body.skalavik`); oversikten og
  minikartet i 3D viker (`body.minivik`) mens et panel til høyre står over dem (bare utenfor testene eller med `Paneler.test`).
  `#flytgruppe` står nede til venstre på PC (flyt.js, én CSS-regel) – før lå den under Leir-menyen og krigskartet.
  Panelene til høyre (Deg, Tropper, Verden, Sjø, Tiltak, Sekk, Stridsregler) står på PC nå 64 px fra kanten – til venstre for zoomknappene,
  som de dekket – og slutter over kommandolinja (max-height − 130 px; Stridsregler − 200 px fordi det starter lavere). Målt også på 1280 × 800.
- Kortene i midten (#hendelse, #samfunnkort, #flytkort) flyttes på PC til midten av det frie feltet mellom panelene til venstre og høyre
  som de ellers ville ligget inn over (`body.kortflytt`, `--kortmidt`), når de får plass der; ellers midt på som før. Bare utenfor testene
  (eller med `Paneler.test`). Målt etterpå: 0 overlapp på 1280 × 800 og 1400 × 820.
- **Igjen (med vilje)**: kortene i midten ligger oppå arkene på telefon – de krever svar og står øverst.

## 2. Merker
- `spill/merker.js`: `Merker.tegn(g, x, y, { slag: 'kjøretøy', type, antall })` tegner tegnet for hver type (lastebil tverrstrek, stridsvogn
  belter, rakettartilleri spiss, radar sagtann, speiderbil skråstrek, hjul) og antallet ved siden av; `Merker.KJØRETØY`.
- `kjoretoy-visning.js` `symbol()`: én linje – hele merket fra Merker (den gamle tegningen står som reserve når Merker mangler).
- `garnison-visning.js`: vimpelen ved tettstedsnavnet er byttet mot `slag: 'tettsted'` i eierens farge (fiendens = rute, ingens = kvadrat);
  vimpelen er reserve. Inntaksringen er som før.

## 3. Tegnforklaring (ny fil `spill/tegnforklaring.js`, `window.Tegnforklaring`)
- Knapp `#forklarknapp` (tre små rader) nederst i `.ctl` (zoomknappene), skjult i 3D (`body.på3d`) og i fotomodus. Ruta `#forklaring`
  (høyre plass i Paneler; bunnark på telefon) med 20 eksempler tegnet med `Merker.tegn` og samme farger/streker som kartet: hvem (eget,
  fiende rød/grønn, nøytralt), hva (lag, fem kjøretøy, tettsted, kai, ukjent), streker og felt (marsjrute, kjørerute, sist sett, front,
  tettsted som holdes, inntak, siktfelt, valgt). `Tegnforklaring.RADER` og `tegnEksempel` er uten DOM (test i test_merker.js). Esc lukker.

## 4. Verktøytips på flisene (`spill/flistips.js`)
- Ny linje «Påvirkes av: …» (`FlisTips.PÅVIRKES`) for alle flisene: hva som gjør tallet større/mindre (kjøp, hogst, riving, frakt, bygging,
  aggregatene, rekruttering, sult/kulde/moral, tettsteder …).
- Telefon: LANGT TRYKK (0,45 s uten å flytte fingeren mer enn 10 px, `FlisTips.LANGT`) viser ruta uten at flisa gjør det den ellers gjør
  (klikket etterpå stoppes); ruta står mens fingeren er nede og 6 s etter. Kort trykk virker som før (ruta + flisas handling). Ingen
  tekstmarkering/meny ved langt trykk på flisene.

## 5. Byggelista og byggpanelet
- PC (`body.spill`, CSS i `spillhud.js`): byggekortene er et rutenett i tre kolonner med ikon (`Ikoner.BYGG` via data-ikon), navn og pris;
  tegningen og «tid · strøm»-linja er skjult, hele flisa er Bygg-knappen (knappen ligger usynlig over, som på telefon), et kort du ikke har
  råd til er dempet med rød pris. Materialer og tekst står i forklaringen (data-tips) som før. Fanen Bygg: lista 1038 px (22 bygg) –
  før ca. 150 px per kort i to kolonner.
- Telefonen er uendret (telefon.js sine tre kolonner med liten tegning).
- **leir-visning.js, ÉN endring** (i `visByggPanel`, rett etter `banner.firstChild.byggNøkkel = nøkkel;`):
  `if (window.Tegninger) { const t = el('img', { klasse: 'byggtegn', … }); t.src = Tegninger.bilde(Tegninger.bygg(b.type)); banner.firstChild.prepend(t); }`
  – tegningen legges først i panelets første div (nøkkelen ligger fortsatt på den div-en). Utseendet (`#byggvalg:has(> div > .byggtegn)`,
  tegningen til venstre, 72 × 54 px PC / 50 × 38 telefon) står i spillhud.js.

## 6. Spillform (det som sto igjen)
- **Ramme med mus i 3D** (`flyt.js`): Shift + dra med venstre knapp i 3D tegner en ramme og velger egne lag etter hvor de står på skjermen
  (også bak en ås), Shift + trykk på et lag tar det med/ut av gruppa. NB: Shift + dra dreide kameraet i 3D før – høyre knapp (og to fingre)
  dreier fortsatt. «Velg lag» i kommandolinja og «Velg alle i bildet» virker nå også i 3D (lagene på skjermen). Gruppa får stiplede ringer
  i 3D. `FlytSpill.iRamme3d(x0, y0, x1, y1)`, `velgIBildet3d()`, `skjerm3d(X, Y)`.
- **Marsjtid før ordren i 3D**: med mus i marsjmodus står «ca. 1,9 km · ca. 30 min (4 lag)» ved pekeren og en stiplet linje fra laget
  (stråletreff mot terrenget høyst hver 0,12 s; `FlytSpill.peker3()`). Bekreftelsen `#marsjvalg` etter trykket er som før.
- **Etterspillet** (`scenario.js` + `scenario-visning.js`): `Scenario.bilde(tid, byer, lag, R, ekstra)` tar også leirens ferdige bygg
  (`b`, lagres bare når de har endret seg – `Scenario.byggI(liste, i)` leser det siste bildet med bygg, `sammeBygg`, `leggTil` flytter
  byggene når eldre bilder tynnes ut), kjøretøy (`k`: egne + fiendens dere så), kampsteder (`s`: KROKER.ild – hver ildveksling med et eget
  lag legges i en rute på 250 m, `Scenario.kampsted`) og tallene (`n`: lag, mann, kjøretøy, bygg, folk, penger). Avspillingen tegner bygg
  (lyse ruter), flammer der det ble kjempet, lag og kjøretøy med merkesettet, og en linje «Dere: 4 lag (48 mann) · 4 kjøretøy · 3 bygg ·
  10 folk i leiren · 100 mill. kr · kamper siden forrige bilde: 1 sted». Gamle bilder uten det nye virker som før. Sløret er litt lysere (0,72).
  REGLER.etterspill: byggMaks 60, kjMaks 24, kampMaks 24, kampRute 250.

## Etter siste fletting
- Vakta «ui» fant «bygg uten tegning: åker» (nytt bygg fra pakka «verden»): `tegninger.js` har fått en tegning av åkeren (pløyd jord
  med furer og planter). Ikonet (`blad`) legger verden-visning.js inn selv.

## Fellesfiler endret i runde 4
- `site/dovre-fliser/index.html`: én skript-tagg (`spill/tegnforklaring.js`) rett etter minikart2d.js. versjon.py er kjørt.
- `spill/leir-visning.js`: én linje i `visByggPanel` (se 5) og samme linje i `visPlanPanel` (tegningen i panelet for en planlagt skisse,
  rett etter `banner.append(...)`, `a.type` i stedet for `b.type`).
- `spill/kjoretoy-visning.js`: `symbol()` bruker Merker for hele merket (3 linjer, reserve beholdt).
- `spill/garnison-visning.js`: tettstedsmerket fra Merker (vimpelen som reserve).
- Ellers egne filer: merker.js, tegnforklaring.js (ny), flistips.js, paneler.js, spillhud.js, flyt.js, scenario.js, scenario-visning.js.

## Prøvd
- Regeltester: test_merker.js (kjøretøymerker, tettsted, tegnforklaringen), test_paneler.js (lagpanelet til venstre), test_scenario.js
  (etterspill med bygg/kjøretøy/kamper, utynning), test_flyt.js – alle ok.
- Nettleser (Dovre-testsiden): målingen over (før/etter), bilder PC 1400 × 820 og 1920 × 1080, telefon 390 × 844 og liggende 844 × 390:
  Folk + lag (Folk lukkes), målestokken flyttet ved Folk på 1920, tegnforklaringen (PC og telefon), forklaringen på Tre (PC) og langt trykk
  på Folk (telefon: ruta kom, Folk-panelet åpnet seg ikke; kort trykk åpnet Folk som før), byggelista som rutenett (PC), byggpanelet med
  tegning (PC og telefon), etterspillet med bygg/flamme/kjøretøy og tallene, 3D: ramme rundt fire lag (kameraet sto stille), marsjtida ved
  pekeren for gruppa. 0 sidefeil.
- Vaktene «ui» og «spillform» i samme side: PC 2D (10 s + 4 s), telefon (6 s + 2 s), PC i 3D (ui 54 s, runde 4-delen 3 ms – resten er
  den gamle vakta i programvare-3D; spillform 50 s). Alle ok.
- Etter siste fletting med claude/nattfiks (12:15): alle vaktene i `pipeline/fliser/vakter/` etter hverandre i samme side (balanse, folk,
  karakter, krig, natur, okonomi, sjo, verden, ui, spillform) – PC 1400 × 820 og telefon 390 × 844: alle ok, 0 sidefeil. ui alene også
  på 1920 × 1080. Målingen av panelene på 1280 × 800, 1400 × 820 og 1920 × 1080: bare kortet i midten over panelene til siden (se 1).
- Tegnforklaringsknappen skjules i kontrollrommet, så zoomknappene der står som før (sjekk.js prøver at de er frie).

## Ikke gjort
- Båtene (pakka «sjo») og kaiene i kaier.js er urørt her.
- Plasseringsbanneret («Brakke: trykk der bygget skal stå») har ingen tegning (panelet for bygg og for planlagte skisser har).
- Rammen i 3D virker bare med mus (telefon: «Velg lag» velger alle på skjermen).
- Kortene i midten på telefon ligger fortsatt oppå arkene (med vilje, se 1).
