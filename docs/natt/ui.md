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
- Alle vaktene etter hverandre på telefon: «ui» feilet med «knappene i telefonlinja er for små» fordi tidligere vakter lot alarmen
  (krig) og `body.tlfdekk` (sjo) stå igjen, så raden nederst var skjult. Vakta prøver nå ikke knappestørrelsen når raden er skjult
  (som når et panel er åpent). Kjørt på nytt: alle vaktene ok på telefon og PC. Til den som samler: krig- og sjø-vaktene etterlater
  alarm/tlfdekk på telefon.

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

# Runde 6 (19. nov, kritikken)

Gren `claude/natt18-ui`, port 8902. Alle tall er Claudes forslag. Prøveskript og bilder: scratchpad `natt6/ui/` (start.js = felles oppstart,
`ekte: true` = som spiller med webdriver = false; for.js/etter.js = angrep + kort + paneler, opp.js = opplæringen, leir.js = Leir-menyen,
panelplassene og banneret, hjelp.js, ga.js = gåmodus i 3D med måling av alle ruter mot hverandre, stats.js = toppstripa).

| # | Punkt | Status |
|---|---|---|
| 1 | Toppstripa: tall uten forklaring, kuttet på telefon | rettet |
| 2 | Bunnmenyen borte liggende og under angrep (telefon) | rettet |
| 3 | Vinduer i feil rekkefølge | rettet (se under hva som er med) |
| 4 | Kort som venter på svar stopper ikke spillet / sier ikke at det er pause | rettet |
| 5 | Opplæringen: for høy på telefon, hopper videre, «Hopp over» 6 → 8 | rettet |
| 6 | Leir-panelet husker rulleposisjonen | rettet |
| 7 | Paneler til venstre/høyre uten system | rettet (regel under) |
| 8 | Tom grå boks under angrepsbanneret | rettet (årsak under) |
| 9 | Hjelpen er en flat liste | rettet |
| 10 | Knapper oppå hverandre i gåmodus | rettet (målt på telefon og PC) |
| 11 | Forsiden: prototypen først, ingen «Spill nå» | rettet |

1. **Toppstripa** (`spillhud.js`): hver flis har et kort ord foran tallet (`ETIKETT`: Dag, Diesel, Tre, Betong, Stål, Strøm, Olje, Folk, Mål,
   Kontroll, Du er; vises med `data-ord`) og enheten bak et rent tall (`ENHET` → `b[data-enhet]`: Tre/Betong m³, Stål/Olje t, Høyde moh.).
   Klokka, kassa og været forklarer seg selv (ikon + enhet). «+3» heter nå «MER +3». Telefon: raden rulles/kuttes ikke lenger – `passInn()`
   virker også der (måler `scrollWidth`) og legger det minst viktige bak «Mer» (`UT_TLF`; rekkefølgen `REKKE_TLF`: klokke, kasse, folk, diesel,
   mål, kontroll …). Tekniske tall (FPS, moh., MB) er skjult på telefon som på PC. Målt: 390 px viser klokke, kasse, Folk og «Mer +8» uten kutt;
   844 px liggende klokke, kasse, Folk, Diesel, Mål og «Mer +6»; PC 1400 klokke, vær, kasse, Diesel, Tre, Folk og «Mer +5».
2. **Bunnmenyen på telefon** (`spillhud.js` + ny `spill/skjermlag.js`): for spilleren står raden alltid på kartet – under angrep, med et kort
   oppe og liggende. Den viker bare for det som tar hele skjermen (`HELSKJERM`: hjelpen, kontrollrommet, byggesettet, etterspillet, krigskortet,
   spillformkortet, startskjermen) og som før når du går, bygger eller velger leir. Panelene som når ned dit, får makshøyde/bunn satt inline så
   de slutter 6 px over raden (`Skjermlag.løft`, tas bort igjen når panelet lukkes), og zoomknappene skjules bak et løftet panel (`body.mkomloft`).
   Årsaken før: `#alarm` og `#hendelse` sto i `DEKKER`-lista. I testene (webdriver) som før til `Skjermlag.test = true` (`body.mkomalltid`).
3. **Rekkefølgen** (`skjermlag.js`, inline z-index i bånd): kort som venter på svar 20 < stoppkort/varsel 21 < pausemerket 23 < angrepsbanneret 24
   < panelene du åpner selv 30–66 (det sist åpnede øverst; trykk i et panel løfter det) < bunnmenyen på telefon 70 < verktøytipset 80 < ringen
   fra opplæringen 85. Står et kort under angrepsbanneret, flyttes det ned under banneret (begge kan leses). Verktøytipset legger seg over/ved
   siden av opplæringsruta (`flistips.js`), og opplæringsruta flytter seg over «Mer»-raden når den er åpen. Målt: hjelpen over Deg (z 31 mot 30),
   ☰ over tegnforklaringen (sist åpnet). Bare for spilleren (eller `Skjermlag.test`).
4. **Pause ved kort** (`skjermlag.js`): står `#hendelse`, `#samfunnkort`, `#formkort` eller `#krigkort` oppe, trykkes ❚❚ og lappen
   `#kortpause` «❚❚ Spillet står på pause til du svarer» står under kortet. Når kortet er borte, trykkes ▶ (farten du hadde). Hadde du selv satt
   på pause, blir det stående; krigskortet som pauset selv, gjenkjennes (farten var > 0 i forrige runde) og får lappen og ▶ etterpå.
   Farten etterpå er nøyaktig den før kortet (også når den var satt utenom knappene, f.eks. av spolingen – fant mobilkontrollen: ▶ ga 10× i stedet).
5. **Opplæringen** (`opplaering.js`): et steg som blir gjort, står «✓ Gjort» i `VIS_GJORT` = 3,5 s («Neste ›» går videre straks) – også steg som
   alt var gjort når de kom for tur. «Hopp over» på steg 6 gikk «rett til 8» fordi steg 7 (mat til tre døgn) var oppfylt fra start og ble merket
   gjort i samme runde uten å vises; nå står det med ✓. Telefon: 124 px høy (før ca. 200) – tre linjer tekst, små knapper på én rad («Slå av»,
   «Hjelp»), uten prikkene; – / + oppe til høyre legger ruta sammen til én linje (55 px telefon, 32 px PC; «riksbrudd-opplaering-sammen»).
   «Opplæringen er ferdig» lukker seg selv etter 12 s. Med en meny åpen på telefon står bare overskriften (også «✓ …») som én linje rett over
   bunnmenyen (`--oppbunn` 64 px når bunnmenyen står). `OpplaeringSpill.gjort()`, `.sammen()`, `.VIS_GJORT`.
6. **Leir-menyen** (`paneler.js`): starter alltid øverst når den åpnes (fanen er den du sist brukte – å tvinge Bygg ville ødelagt «trykk på
   diesel = fanen Lager»). Når de ekte fanene er rullet ut av syne, står en kopi `#leirfaner2` fast øverst i panelet (første barn i #leirmeny,
   sticky, `margin-bottom:-40px` så innholdet ikke hopper; settes inn igjen når Leir-menyen tegner seg på nytt; knappene kaller `LeirSpill.fane`).
   Først prøvd: hele toppen sticky – det gikk ikke i Lager og Mål, der toppen er 700–1700 px høy. Målt i alle fire fanene: rullet → kopien 1 px
   fra toppen; åpnet igjen → scrollTop 0.
7. **Panelplassene** (`paneler.js`, `telefon.js`): REGELEN – alt fra bunnmenyen (Leir, Folk, Tropper, Krig, Deg, og Region, Verden, Sjø under
   «Mer») åpnes til VENSTRE, ett om gangen; det som hører til et panel eller lag (Stridsregler, Tiltak, Sekken, krigskortpanelet) og
   tegnforklaringen åpnes til HØYRE ved siden av; kort i midten. Valgt fordi bunnmenyen er én ting man bytter mellom (som faner), og fordi
   panelet man åpner fra (Deg → Sekk, lag → Stridsregler) da står ved siden av det nye. Liggende telefon følger samme regel (`Telefon.SIDE`).
8. **Banneret** (`skjermlag.js`, bare CSS): etter «Forsvar leiren» får banneret «lagene holder stillingen», «Opphev» og «Vis» – på PC brøt de ned
   på en ny linje under teksten, og hendelseskortet dekket «Vis», så det så ut som en tom grå boks. Nå én rad på PC (opptil 980 px), og på telefon
   full bredde (før en smal stripe på 195 px: `left:50%` ga bare halve bredden å krympe i). Tomme barn skjules.
9. **Hjelpen** (`hjelp.js`): 11 grupper som foldes ut (Kom i gang 16, Skjermen og knappene 24, Leiren og bygging 21, Angrep og forsvar 9, Folk og
   samfunn 18, Mat, penger og handel 8, Lag og strid 34, Krigen og regionen 14, Sjøen 9, I 3D 28, Vær, lyd og bilde 14), bare «Kom i gang» åpen,
   antallet emner ved hver gruppe, søkefeltet står fast øverst og åpner gruppene med treff. Emner fra pakkene som står i en liste i GRUPPER,
   havner der; ellers i gruppa pakken oppga. Nye emner bør legges inn i GRUPPER.
10. **Gåmodus** (`narhud.js`): PC – venstreraden fra eventyr-visning.js («Flaske …», «Legg deg ned», «Lag noe») står nede til venstre over helsa
    (før midt i himmelen der navnelappene er), våpenruta 296 px fra kanten. Telefon – «Sett deg inn i feltbilen» 272 px fra bunnen (lå under
    «Automatgevær»), Krig er borte fra knapperaden mens du går og knappene er 33 px (3D-knappen var kuttet i venstre kant), venstreraden står
    under loggen. Navnelappene i 3D tegnes ikke under rutene (`window.UI_HULL3D`, hull i klippingen i tegn3d). Målt med ga.js på telefon:
    0 ruter utenfor skjermen og 0 overlapp mellom 21 ruter (knapperaden 60–384 px).
11. **Forsiden** (`site/index.html`): «Spill nå» øverst med «Spill i Rogaland» (start her) og «Spill i hele Norge» som store kort med knapp,
    «Spill på Dovre» under, en linje om at hvert kart har sin egen lagring, og «Tidlige prototyper» (kommunekartet 1986, Dovre 1987) nederst.

Regeltest: `node pipeline/fliser/test_skjermlag.js` (båndene, rekkefølgen, «fram», ingen panel over bunnmenyen). Endret test: test_paneler.js.

## Fellesfiler endret i runde 6
- `site/dovre-fliser/index.html`: (1) én skript-tagg `spill/skjermlag.js` rett etter telefon.js; (2) tegn3d: klippingen tar også hull for
  `window.UI_HULL3D` (to linjer: `const klipp …` og `if (klipp || hull.length) g.restore();`). versjon.py er kjørt.
- `pipeline/fliser/test_paneler.js`: plassene til karakterark/tropppanel/verdenpanel/sjopanel er nå venstre (tre tester byttet til stridpanel/sekk, to nye).
- Ellers egne filer: spillhud.js, telefon.js, paneler.js, narhud.js, opplaering.js, flistips.js, hjelp.js (eid i dag), skjermlag.js (ny), site/index.html.

## Ikke gjort / til den som samler
- Kortpausen, rekkefølgen og «bunnmenyen alltid» gjelder bare spilleren (`!navigator.webdriver`) – sjekk.js ser det gamle til en vakt slår
  `Skjermlag.test` på (vakta «ui» gjør det i del «runde6» og setter det tilbake).
- Navnelappene som klumper seg rundt leiren i 2D, og at røvernes markør ligger under egne lapper, er pakka «kart» sin.
- Hendelseskortet midt i førsteperson (stopper styringen) er ikke endret – det står nå på pause med lapp, som andre kort.

## Prøvd (runde 6)
- Regeltester: test_skjermlag.js (ny), test_paneler.js, test_opplaering.js, test_merker.js – alle ok.
- Vakta «ui» alene: PC og telefon ok (runde6-delen ca. 5 s).
- Hele mobilkontrollen (`SJEKK_PROFIL=mobil`): første gang 115 ok / 1 FEIL – min egen vakt («spillet går ikke videre i samme fart når kortet er
  besvart»: farten var satt av en tidligere vakt utenom knappene, og ▶ ga knappens fart). Rettet i skjermlag.js (nøyaktig samme fart) og vakta.
  Andre gang 115 ok / 1 FEIL: bare «versjonsmerker» (versjon.py var ikke kjørt etter siste endring – kjørt og committet straks etter).
  `SJEKK_DEL=rask` på PC etterpå: versjonsmerker og ui ok; «krig» feilet der (knust lag/fanger/etterretning false) mens en annen kontroll gikk
  samtidig – krig-vakta alene på denne grenen er ok.
- Nettleser som spiller (webdriver = false), bilder i scratchpad `natt6/ui/`: for-*.png (før), etter*-*.png, opp-*.png, leir-*.png, fane-*.png,
  hjelp-*.png, ligg-*.png, stats-*.png/crop-stats-*.png, forside-*.png, ga-tlf.png (gåmodus telefon). 0 sidefeil i alle.


# Runde 8 (20. nov natt, ny kritikk)

Pakke «flyt» (loggen, spolingen, kortene og hjelpen). Gren `claude/natt18-ui`, port 8924. Alle tall er Claudes forslag. Prøveskript og bilder:
scratchpad `natt8/ui/` (start.js = felles oppstart, `ekte: true` = som spiller; spol.js = spoler et døgn med ⏭ og skriver hvorfor den stopper,
p8.js = logg + kort + ⏭ + angrep, bilder.js = ☰/sekken/varsel/hjelpen/forsiden, norgekilde.js, tre.js = 3D-navn, vakt.js = kjører vaktene,
simlogg.js = mater PC-kritikerens logg-spill.txt gjennom dempingen).

| # | Punkt | Status |
|---|---|---|
| 1 | Loggen gjentar seg og drukner det viktige | rettet (ny `spill/loggdemp.js`) |
| 2 | ⏭ stopper på småting | rettet (flyt.js: bare det som krever spilleren) |
| 3 | Kort pauser ulikt (ikke under spoling) | rettet (skjermlag.js + flyt.js) |
| 4 | Fire bokser oppå hverandre når røverne kommer | rettet for kortet og stoppkortet (opplæringen er en annen hjelper) |
| 5 | Hjelpen mangler pakkenes emner (møbler, lykt, lagring …) | rettet (hjelp.js + hjelp-natt.js samlet på nytt) |
| 6 | Småting: Nytt spill, forsiden, kildeteksten, skriften i 3D, varselboksen, sekken | rettet alle seks |

1. **Loggdemping** (`spill/loggdemp.js`, regler uten DOM + `test_loggdemp.js`; `logg()` i index.html spør `LoggDemp.vurder(tekst, loggLinjer, tid)`):
   - samme melding (tall og «×n» regnes ikke med) innen `vindu` = 120 spillminutter blir én linje «… (×4)» øverst, med den nyeste teksten;
   - rutine (`RUTINE`): «Du drikker deg utørst / Du spiser i leiren» høyst én gang per døgn, hogst («Hogstlaget fant skog», «Hogstfeltet er
     hogd») én gang per 8 t, «fyller ammunisjon i leiren» én gang per 6 t;
   - været: bare store skifter (tåke, snø, storm) – det samme høyst hver 6. t – og «Det klarner opp» etter et stort skifte; «Det begynner å
     regne. Sikten er 95 %» og «Det skyer over» holdes tilbake (statuslinja viser været uansett). Valg fra ☰ («Været: regn.») vises som før;
   - tips («Vil du …», «Tips: …») bare første gang (huskes i `riksbrudd-loggtips`), og en forklarende setning uten tall som alt er vist siste
     døgn, tas bort fra en ny melding («Folk på «Frakt» bærer treet til leiren.»). Den første setningen tas aldri bort.
   - Simulert på PC-kritikerens logg: 68 meldinger inn, 53 vist; alle regn/klarner-meldingene og 9 av 12 hogstmeldinger borte.
   - `flyt.js stopp()`: står grunnen alt i de tre øverste linjene («Røverne er snart framme (ca. 9 min).»), skrives ikke «Spolingen stoppet: …» i tillegg.
2. **⏭** (`flyt.js`): `HENDELSER` – `mål`, `natur` (flom/ras) og `tog` stopper ikke lenger (står i loggen). «Framme» gjelder bare lag DU
   sendte: flyt.js pakker inn `ordre()` og merker `s.flytSelv` når ordren er `stille` OG kommer fra forsvar-visning.js, forsvar-hjemme.js eller
   strid-visning.js (kallstakken, `AUTO_FILER`) – lag som går hjem for å hvile, til forsvarsplassen, mot herjere eller rykker fram/trekker seg
   av eget initiativ. Køordrene dine, en marsj som fortsetter etter lasting (lagring.js) og ingeniøren som går til en bru (odeleggelse-visning.js)
   er også `stille`, men teller som dine (prøvd: forsvarsplassene merkes, en vanlig ordre ikke). Flom/ras nærmere leiren enn `naturNær` = 3 km
   stopper likevel når hendelsen har `x`/`y` med (verden-visning.js sender det ikke ennå). «Fienden i sikte» bare når fienden er nærmere enn `fiendeNær` = 2 km fra
   leiren eller et eget lag, og den samme fienden stopper ikke igjen før etter `huskSett` = 180 spillminutter (før 90). Kort, alarm, brann,
   båt, fanger, krigshendelser («annet»), tap, ny dag og ferdig bygg stopper som før. Spolt et døgn som spiller på Dovre: 2 stopp (ny dag, alarm).
   Teksten i Leir → Mål og hjelpen («Spol til neste hendelse», i `docs/natt/spillform-hjelp.json`) er oppdatert.
3. **Kortpausen holder** (`skjermlag.js` pause()): starter noen tiden mens et kort står (⏭ «Spol videre», en fartsknapp), settes pausen
   igjen og lappen blinker; farten du valgte, gjelder når kortet er besvart. `FlytSpill.spol()` med et kort oppe spoler ikke, men sier «Svar på
   kortet først – spillet står på pause til du svarer.» (Årsaken hos kritikeren: pausen ble bare satt én gang per kort; etter «Spol videre» gikk
   tiden med kortet åpent.)
4. **Under angrep** (`skjermlag.js` vent(), `Skjermlag.VENTER`/`venter()`): mens et angrep pågår (`SpilletSpill.T().aktiv`, røverlag i live,
   eller banneret varsler røvere på vei) får body klassen `angrepvent`, og `#hendelse`/`#samfunnkort` er skjult – de kommer fram (og setter
   spillet på pause) når angrepet er over. Spillformkortet (seier/tap) og krigskortet kommer som før. flyt.js teller bare kort som SYNES
   (`kortOppe()`), så et skjult kort stopper ikke spolingen. Stoppkortet (`#flytkort.liten`) er en liten linje under/ved banneret mens alarmen står.
5. **Hjelpen** (`hjelp.js`): alle emnene i `docs/natt/*-hjelp.json` har fast plass i `GRUPPER` (lut/møbler/lykt/sovepose/feltflasker/ransakede
   hus/figurer/natur under «I 3D», lagring og start under «Kom i gang», leir2d og hogst under «Leiren og bygging», krig under «Lag og strid» /
   «Angrep og forsvar» / «Krigen og regionen», økonomi under «Mat, penger og handel» …). Pakkenes gruppenavn går gjennom `GRUPPENAVN`
   («Leiren» → «Leiren og bygging»); ukjente havner under «Annet» (før havnet alt med gruppa «Leiren» under «Vær, lyd og bilde»).
   `hjelp-natt.js` er samlet på nytt (180 emner). `figurer-hjelp.json` ligger på grenen natt18-folk – emnene står alt i GRUPPER og havner
   riktig når hjelpen samles etter flettingen. «Meldingene» og «Spillet står på pause til du svarer» i `ui-hjelp.json` forklarer det nye.
6. **Småting:**
   - ☰ (`meny.js`): «Nytt spill» står øverst rett under «Innstillinger / Lagre og last» (`.spillrad`), ikke nederst under fold.
   - Forsiden (`site/index.html`): «Spill på Dovre» har «Spill nå ›» (mindre knapp enn hovedkortene).
   - Kildeteksten (`index.html` rett etter `#kilde`): på /norge og /rogaland står «Høyde: Kartverket DTM · Kartdata: Sentinel-2, NVDB og
     OpenStreetMap – lastes …» til manifestet setter de ekte kildene (før: Dovre-teksten «Landsat 5, 13. aug. 1987»). Prøvd med /norge rutet til siden.
   - Navnelappene i 3D (`narhud.js` byttSkrift): overleggets tegneflate (#c3o) bytter «… px sans-serif» til spillets Cormorant Garamond
     (×1,12, minst 600 i vekt) – leirnavnet, oppdrag, tilfluktssted osv. Andre skrifter står.
   - Varselbrikkene på telefon (`narhud.js` løftVarsler): står over nordpila, målestokken og kildeteksten. Angrepsbrikken viser avstand
     bare når noen ser røverne (ellers «ikke sett ennå», som banneret) – før sto «10,0 km fra leiren» mens røverne var 720 m unna.
   - Sekken: øverst «Vekt 10,3 kg · du bærer lett opptil 22 kg» (`utstyr.js`), nederst «Plass i lommer og sekk: 4,1 av 27 kg brukt» med en
     linje som sier forskjellen (`lut-visning.js`, to tekstlinjer – filene er ikke mine, endringen er bare tekst).

**Fellesfiler endret:** `index.html` (logg() + skripttaggen `loggdemp.js` rett etter skjermlag.js + én linje etter `#kilde`), `spill/utstyr.js`
og `spill/lut-visning.js` (bare teksten i sekken), `docs/natt/spillform-hjelp.json` («Spol til neste hendelse»), `pipeline/fliser/vakter/spillform.js`
(hendelsen i spoleprøven er en båt i stedet for toget, siden toget ikke stopper ⏭ lenger), `spill/hjelp-natt.js` (samlet på nytt).

**Vakt** (`vakter/ui.js`, «runde 8»): 3 like meldinger = én linje med ×3 (loggen settes tilbake), reglene i en egen LoggDemp-utgave (rutine,
vær, tips), Flyt.HENDELSER, `ordre.flyt`, kort + ⏭ + fartsknapp gir fortsatt pause og farten du valgte etter svaret, `angrepvent` skjuler
kortet, hjelpeemnene i riktig gruppe, «Nytt spill» øverst, byttSkrift. Grønn på PC og telefon (ca. 1,5–2 s for runde 8). Prøvd med feil
lagt inn med vilje (vaktfeil.js: natur stopper ⏭, rutineregelen av, «Nytt spill» nederst) – vakta fant alle tre. Vaktene balanse, lagring,
krig, folk, lut og spillform er også grønne på grenen. Hele mobilkontrollen (`SJEKK_PROFIL=mobil PORT=8924`): 121 ok, 0 feil, «Alt i orden» (641 s).

Bilder (scratchpad `natt8/ui/`): r8-etter-pc-logg/kort/angrep.png og r8-etter-tlf-*.png (logg ×4, kort + ⏭ «Svar på kortet først», angrep med
skjult kort og stoppkortet som linje), r8-pc-etter-angrep-kort.png (kortet kommer med pause når angrepet er over), r8-tlf-meny.png (Nytt spill
øverst), r8-tlf-sekk.png, r8-tlf-angrep-varsel.png (brikken over kompasset, «ikke sett ennå»), r8-tlf-hjelp-3d.png, r8-tlf-forside.png,
r8-pc-forside.png, r8-tlf-norge-kilde.png, r8-pc-3d-navn.png (leirnavnet i Cormorant). Før-bildene er kritikernes (kritikk2/pc og kritikk2/tlf).

**Ikke gjort / gjenstår:** opplæringsboksen under angrep (annen hjelper), angrepsbannerets tekst/anslag (krig). Flom/ras NÆR leiren stopper
ikke ⏭ før `verden-visning.js` sender x/y med «riksbrudd-hendelse» (flyt.js tar imot det). Bølge 2 uten utfallsmelding (PC-kritikeren) er ikke
min del. Loggdempingen gjelder det som vises – «les alt» viser fortsatt bare de seks siste linjene, ingen full historikk.

# Runde 10 (20. nov kveld, brukerens bilder)

Pakke «liggende» (skjermbildet på liggende telefon, 2D og gåmodus). Gren `claude/natt18-ui`, port 8933. Fasit: brukerens iPhone liggende
(ca. 844 × 390), `bruker20/1-tropp-liggende.png` og `2-ga-ved-bil.png`. Alle tall er Claudes forslag. Prøveskript og bilder: scratchpad
`natt10/ui/` (start.js = oppstart som spiller, foer.js = kart/Leir/Folk/Deg/Mer/Krig/Tropp/hogst, sveip.js = sekk/lut/morgenmøtet/angrep/☰/hjelp,
gaa.js = gåmodus ved feltbilen (W/H i miljøet), gaa-rog.js = gåmodus på /rogaland med ekte hus, andre.js = tropp/hogst på PC/stående/liggende,
vakt.js = kjører vakta). Før-bilder: `foer-*.png`, `sv1-*.png`, `gaa-foer-bil.png`; etter: `etter2-*.png`, `sv2-*.png`, `gaa-etter-*.png`, `rog-gaa.png`, `li-/st-/pc-*.png`.

| # | Punkt | Status |
|---|---|---|
| 1 | «Lag ny tropp» trangt og kuttet | rettet |
| 2 | Opplæringen, hogstlappen og bunnmenyen oppå hverandre, tekst bak bunnmenyen | rettet |
| 3 | Gåmodus: «Sett deg inn» midt i bildet, «Inngang» over vegen, våpenruta over armen, ti knapper øverst, «Flaske/Lag noe» over styrespaken | rettet |
| 4 | Gjennomgang av de vanlige skjermene på 844 × 390 | rettet det som overlappet (se under) |

1. **«Lag ny tropp»** (`tropper-visning.js` oppsettet, CSS i `telefon.js`): innholdet ligger i `.kolonner` > `.kol1` (navn, forslag, bevæpning,
   kjøretøy) og `.kol2` (folk, utstyr, pris, advarsel). På PC og stående telefon er de `display:contents` (ser ut som før). På liggende telefon
   (`body.kort.tlfligg`) er panelet min(760 px, hele bredden), fra knapperaden ned til bunnmenyen (skjermlag løfter det), to kolonner som rulles
   hver for seg (rullingen huskes når panelet tegnes på nytt), forslagene som små kort (navn + én linje; hele teksten står i stående og på PC), og «Opprett» (`.opprett`) står
   alltid nederst. På PC og stående er `.opprett` klebrig nederst i panelet (sticky). Gjelder også «Bruk endringene» i Våpen og utstyr.
2. **Én ting nederst** (`opplaering.js`, `telefon.js`, `skjermlag.js`, `spillhud.js`):
   - Liggende telefon med en meny åpen (Leir, Folk, Tropper, Deg, sekk, krig): opplæringslinja står øverst ved siden av menyen (`ved()`,
     `body.oppved`), ikke nederst; menyen går da helt ned til bunnmenyen. Er det under `VED_MIN` = 200 px ved siden av (tropppanelet), viker linja.
   - `ressursvalg` (hogst-/rivelappen) er med i `DEKKER`: opplæringen viker mens lappen står. Lappen står over bunnmenyen (`body.kort.mkom
     #ressursvalg{ bottom:64px }`), kan rulles, og står ved siden av en åpen meny på liggende telefon (`vedMeny()` i telefon.js – også
     byggebanneret og angrepsbanneret `#alarm`).
   - Bunnmenyens knapper er ugjennomsiktige; opplæringsruta er ugjennomsiktig på telefon (kildeteksten, målestokken og kompassrosa skinte gjennom).
   - `skjermlag.js løft()`: opplæringslinja regnes bare som «gulv» når den står nederst; `morgenkort` løftes over bunnmenyen; pauselappen vises
     ikke når den ellers ville lagt seg over knapperaden (liggende, kortet fyller høyden).
   - Opplæringen viker for morgenmøtet, samfunnskortet og personkortet på telefon (den lå under morgenkortet).
   - `spillhud.js`: `lutpanel` er med i `HELSKJERM` – bunnmenyen viker for inventaret (den lå oppå den nederste delen).
   - `narhud.js løftVarsler()`: varselbrikkene står også over opplæringsruta.
3. **Gåmodus på telefon** (`narhud.js`, CSS + én takt): knapperaden har bare Gå, Deg, ☰, pause, farten og ny knapp «⋯» (`#gaamer`); 3D, Leir,
   Krig, ⏭, ? og alt annet kommer fram bak «⋯» (raden blir lengre; lukkes ved neste trykk). `NarHud.BEHOLD` er lista. Bare utenfor testene
   (`body.gaarydd`; `NarHud.test = true` slår det på med webdriver). Liggende (`tlfligg`, ikke når du kjører): «Flaske …»/«Lag noe» (#evrad) i
   en rad øverst til venstre (venstre for kompasset), loggen rett under den (2 linjer), «Sett deg inn …» (#kjorknapp) nede til høyre over Huk/Hopp,
   helse- og våpenruta små til høyre for styrespaken (x 152 px), kildeteksten kort (136 px). Inngangspila (`gange.js`, to tall): på telefon 30 px
   under siktet (før 54), 12 px skrift, lavere boks. Prøvd på /rogaland med ekte hus («Inngang 30 m · rundt huset»).
4. **Gjennomgått på 844 × 390 som spiller**: kart, Leir, Folk, Deg, Mer, Krig, Tropper, sekken, lutpanelet, morgenmøtet, angrep (banner + Leir),
   ☰, hjelpen, gåmodus (Dovre og Rogaland), og PC 1400 × 820 / stående 390 × 844 for tropppanelet, hogstlappen og gåmodus (uendret på PC).

**Fellesfiler endret:** `spill/gange.js` (inngangspila: plass og størrelse på telefon, 4 linjer). Ellers bare mine filer (tropper-visning.js
bare oppsettet: kolonner, `.opprett`, rullingen i `vis()`).

**Vakt** (`vakter/ui.js`, «runde 10»): setter vinduet til 844 × 390 en kort stund og sjekker tropppanelet (høyde, to kolonner, folk og Opprett
synlige, ikke bak bunnmenyen), opplæringen ved siden av Leir-menyen, hogstlappen over bunnmenyen med opplæringen borte, og gåmodus (knapperaden
⊆ BEHOLD med «⋯», «Sett deg inn» nede til høyre, helse/våpen ved styrespaken). Setter vinduet, Skjermlag.test, OpplaeringSpill.test og
opplæringens lagring tilbake. Grønn på PC og telefon (ca. 15–18 s for hele ui-vakta). Prøvd med tre feil lagt inn (kolonnene av, ressursvalg ute
av DEKKER, kjøreknappens plass borte) – vakta fant alle.

**Ikke gjort / gjenstår:** «3D går tregt»-ruta (bare uten grafikkort) ligger over styrespaken; kjøreknappene (gass/brems/ratt, bildene 3–5) er
kjøring-hjelperens; Krig-knappen manglet i bunnmenyen på Dovre-testsiden (finnes ikke der – ingen tettsteder lastet). `versjon.py` er ikke kjørt.
