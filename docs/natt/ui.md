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
