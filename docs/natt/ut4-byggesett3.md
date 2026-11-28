# ut4-byggesett3 – byggesett versjon 3 (fase B4)

28. nov, utbyggingen av docs/plan-selskap-okonomi.md, kapittel 5.5 (og 5.2), figuren «fabrikk» og B4 i kapittel 16. Gren `claude/ut4-byggesett3`.
Åpne spørsmål brukt med planens forslag: **12** – rutenett 1,2 m; **13** – opptil fire etasjer.

## Hva spilleren ser
- **Rutenett 1,2 m** (halvparten av før). Knappen «Rutenett: 1,2 m / hall 4,8 m» (ett trykk) legger store deler (4,8 m vegger, 4,8 × 4,8 m gulv/tak).
  Rutenettet i 2D har sterkere linje hver 4,8 m.
- **Fanene**: Gulv · Vegg · Tak · **Bærende** (søyler, bjelker) · **Trapp** · Forsvar · Hus · **Plan** · Riv.
- **Stoff per del**: vegger i tre, mur, betong og **blikk** (stål); gulv: fundament, tregulv, **betongdekke**; tak: saltak, flatt tretak,
  **betongtak**, **blikktak**; søyler i tre/betong/stål, bjelker i tre/stål, trapp i tre/betong. Linja over knappene viser pris og tid per del og
  stoffets spenn: «Trevegg: 9 000 kr og 8 min per 1,2 m · Tre: spenn 6 m, brenner».
- **Opptil fire etasjer** («Etasje: auto/1/2/3/4»). **Trapp** (1,2 × 3,6 m, «Opp mot øst/nord/vest/sør» eller R): står på gulvet; over den må det være
  åpent (gulvet over får hull – «Her går trappa opp»). Rom i etasjene over er brukbare når en trapp går opp dit («Rom uten trapp» ellers).
- **Spenn**: et tak/dekke over et for bredt rom avvises med grunnen: «Spennet er 8,4 m – for langt for tre (høyst 6 m). Sett inn en søylerad eller en
  bjelke.» Søyler settes i hjørnene i rutenettet, to trykk = en søylerad (hver 4,8 m). Bjelker legges som en rad og må hvile på vegg/søyle i begge ender.
- **Maler** (Hus): Hytte 4,8 × 4,8, Brakke 6 × 9,6, Betongbu 7,2 × 7,2 (betongtak), **Hall 19,2 × 28,8** (blikk, port 4,8 m, søylerad i midten –
  uten den raser blikktaket). «Lagre et bygg som mal» + to trykk rundt et bygg = egen mal (localStorage `riksbrudd-bsmaler`, høyst 12, felles for leirene).
- **Riv**: river du noe som bærer (en søyle midt i et rom, en vegg), sier byggesettet fra («Uten denne delen raser dekket eller taket over
  (ca. 12 m²) – rives sammen med det.»), og det som raser, tas ned sammen med det du river (`BS.rasVedRiving`, Bygning.ras før og etter).
- **Plan**: plantegningen av egne bygg (Bygning.fraByggesett → Plantegning.figur), med etasjeknapper (1.–4. etasje, Loft). Kartet går til byggene.
- En hall med bare port er et **lager** fra start (rommet kan byttes som før i Leir-menyen); andre lukkede rom er soverom som før.

## Gamle byggesett-bygg (2,4 m) – valget
**Gamle deler står på sitt rutenett.** De gamle typene (`bs_vegg_tre`, `bs_tak_sal` …, uten «_s» bak) beholder pris, materialer, riving og jobber
uendret; plassen deres (`b.bs.i/j` i 2,4 m-ruter) ganges med 2 når den leses (`fraBygg`, og `norm()` for lister uten `u`). En gammel del har
størrelse 2 (= 2,4 m) i det nye rutenettet, så nye 1,2 m-deler kan stå inntil den. Ingen bygg deles opp – det er det tryggeste (pris, framdrift,
hp og jobber er urørt). Romnøkkelen (`L.romBruk`) er den samme som før for gamle rom (minste rute i 2,4 m-mål). En ny dør i en gammel 2,4 m-vegg
avvises: «Her står det en større vegg (2,4 m) – riv den først». Nye deler lagres med `b.bs.g = 1` og nye typenavn `<grunn>_<s>` (s = 1, 2 for porten, 4).

## Filer
- `site/dovre-fliser/spill/byggesett.js` – reglene, skrevet om (versjon 3). API (ByggesettRegler): `U`/`G` (1,2), `ETASJER` (4), `GROV` (4), `DELER` (alle typer),
  `GAMLE`, `NYE`, `STOFF`, `typeFor(grunn, s)`, `størrelse`, `ruter`, `kanter`, `biter`, `punkter`, `norm`, `midt`, `kantEnder`, `kantVed(o,x,y,akse,s)`,
  `hjørneVed`, `rad(o, type, A, B, { r, avstand })`, `indeks`, `støttet`, `plassering`, `forslag`, `spenn(alle, nyeIder)`, `HUS` (malene), `lagHus`,
  `husDeler`/`husForslag(deler, mal|navn, i, j, rot)`, `dreiDel`, `tilMal`, `malGyldig`, `rom`, `ROMBRUK`, **`ROMTYPER`/`romType(rom, ting)`**,
  `romSum`, `høyder`, `fraBygg`, `fraLeir`, `plassFor`, `rasVedRiving`, `kat`, `KANT`, `RUTE`.
  Spennsjekken tar bare med delene nær de nye (halve stålspennet + 2 ruter): 928 deler (fire haller + seks brakker) – 335 ms → 7–9 ms per forslag.
- `site/dovre-fliser/spill/byggesett-visning.js` – visningen (verktøylinja, 2D, plantegning, 3D, egne maler). `window.Byggesett` har i tillegg
  `planModell`, `egneMaler`, `lagreMal`, `typeNå`.
- `pipeline/fliser/test_byggesett.js` – skrevet om (50 sjekker).
- `pipeline/fliser/vakter/ut4-byggesett3.js` – vakta (ca. 0,7 s).
- `docs/natt/ut4-byggesett3-hjelp.json` – hjelpetekst (seks emner, gruppe «Leiren»).

## Endret i andres filer (små, samlet)
- `spill/bygning.js`: `fraByggesett` er skrevet om for delene i versjon 3 (størrelser, søyler, bjelker slått sammen langs en linje, trapper fra
  delene – «antatt» trapp bare for gamle bygg uten trapp –, loft under saltak når mønet er ≥ 2,2 m, hvert dekke-/takfelt én rute med `P`, `spenn`
  (halve, etter stoffet) og `bredde`); ny `feltPunkter(P)`. `ras()`: to små endringer – felt med eget omriss (`f.P`) prøves i sine fem punkter mot
  sitt eget spenn, og takfelt med `f.n` mot støttene i sin egen etasje. Kartets hus har ikke `f.P`, så de regnes som før (test_bygning ok).
- `spill/vei.js`: **én linje** i `golvSett` – gulvdelene gir alle sine ruter (`BS.ruter(q)`), ikke bare hjørneruta.
- `pipeline/fliser/test_bygning.js`: to forventninger for byggesettets brakke (26 vegger, 40 takfelt, > 50 m²) – malen er ny.
- `pipeline/fliser/test_vei.js`: én linje (typenavnene `bs_vegg_tre_1`/`bs_vegg_tre_dør_1`).
- `pipeline/fliser/vakter/ut2-vei.js`: én regex (`/_dør(_[124])?$/`) – selvtesten fant ikke døra i den nye brakka.
- `site/dovre-fliser/index.html`: bare versjonsmerkene (versjon.py).

## MÅ RETTES I sjekk.js (jeg har ikke lov å endre den)
Byggesett-vaktene i sjekk.js har tallene for de gamle malene. Jeg kjørte begge blokkene ordrett i testsiden (PC og telefon / 3D på PC):
- linje 628 («byggesett»): alt er som før unntatt tallene – `bs.hytte === 16 && bs.bygget === 16 && bs.jobber === 16` må bli **48** (hytta er
  4 × 4 ruter: 16 gulv, 16 vegger, 16 tak), og `bs.rad === 3` må bli **6** (7,4 m rad = seks vegger på 1,2 m). Målt: `{"åpen":true,"hytte":48,
  "bygget":48,"jobber":48,"lufttak":"Taket må ligge på vegger, …","rad":6,"rom":1,"senger":2,"dør":1,"revet":1,"tilbake":4800,"passer":true,"lukket":true}`.
- linje 724–729 («byggesett i 3D»): `q.celler.length === 12` må bli **40**, og `bs3.n === 4 * 3 * 2 + 14` må bli **106** (brakke 8 × 5 ruter:
  40 + 26 + 40). Målt med de to endringene: `{"n":106,"deler":106,"iScene":4,"trekanter":1860,"svever":0,"ustøttet":0,"rom":1,"glFeil":0,
  "vegg":true,"dør":true,"etter":0}` – godkjent. (Forslag: bruk `ByggesettRegler.HUS.brakke.deler.length` og `HUS.hytte.deler.length`.)
- Den gamle brakka (7,2 m bred med tretak) ville raset etter den nye spennregelen – derfor er malene nye.
- `spill/hjelp.js`: emnet «Byggesett» beskriver versjon 2 – se `ut4-byggesett3-hjelp.json`.

## 3D
Delene er fortsatt fem samlede nett. Nytt: gulv og tak lages rute for rute (også 4,8 m-delene), vegger i hele lengden, hjørnestolper bare i ekte
hjørner og ender (ikke mellom to 1,2 m-vegger på rad – da ble det sprekker), betongdekke/betongtak, blikk (stål) med kledningsteksturen i grått,
søyler (boks 0,2–0,26 m), bjelker (under dekket), trapper (14 trinn med rekkverk), porter på 4,8 m (2,85 m høye). Sett ved Dombås: hall,
betonghus i to etasjer med saltak, trerom med søylerad – `Byggesett.sjekk()`: 0 svever, 0 uten støtte.

## Tall (Claudes forslag – i byggesett.js, NYE/VEGG/STOFF)
Per 1,2 m vegg: tre 9 000 kr / 0,12 t, mur 20 000 / 0,4 t, betong 16 000 / 0,25 t, blikk 10 000 / 0,08 t (dør/vindu +3 000, port +2 000).
Per rute 1,44 m²: fundament 9 000, tregulv 6 000, betongdekke 12 000; tak: saltak 8 500, flatt tre 7 000, betong 12 000, blikk 6 000.
Søyle tre 3 000 / betong 6 000 / stål 5 000; bjelke tre 4 000 / stål 6 000 per 1,2 m; trapp tre 15 000 / betong 30 000. 4,8 m-delene: × 4 (kanter) /
× 16 (ruter). Spenn: tre 6 m, mur og betong 9, stål/blikk 12 (som Bygning.REGLER.spenn). Hallen koster ca. 6,7 mill. kr og 68 t arbeid
(115 m³ betong – lageret må være stort nok, ellers sier kjøpet «Lageret er fullt»).

## Prøvd
- Node: test_byggesett (50 ok), test_bygning (RASK), test_vei (RASK), test_folkgang, test_plantegning, test_leir, test_kommando, test_folk,
  test_byggevisning, test_husendring – 0 feil.
- Egen mal i nettleseren (telefon): hytte bygget → «Lagre et bygg som mal» + to trykk → «Eget bygg 1» (48 deler) valgt → lagt ut et annet sted uten feil.
- Nettleser (Dovre-testsiden, PC 1400 × 860 og mobil 390 × 844): vakta ut4 ok på begge (0,7–0,8 s); med vilje lagt inn feil (tre-spenn 20 m) → vakta
  feiler («for bredt tretak ble ikke avvist»). Vaktene ut2-vei (etter regex-rettingen), ut3-folkgar, ut2-hus2d, ut3-riving ok i samme økt.
  Bilder: hall + brakke i 2D, plantegningen, verktøylinja på telefon (fanene på to linjer), 3D av hall, betonghus i to etasjer, trerom med søylerad.

## Ikke gjort
- Søyler/bjelker vises bare som enkle bokser; trappa i 3D har ikke hull i dekket over (dekket mangler bare der – det ser ut som et hull).
- Loftet er bare i modellen (plantegningen viser «Loft» når bygget er minst 7,6 m bredt med saltak); det er ingen trapp/stige opp til loftet.
- Ingen maskiner (B5): `ROMTYPER` er kroken – `ByggesettRegler.ROMTYPER.unshift({ id: 'fabrikk', navn: 'Fabrikk', passer: (r, t) => t.maskin > 0 })`
  og `romType(rom, { seng, maskin })`.
- `leir.js` tilMal/fraMal er ikke endret: de tar fortsatt ikke med byggesettdeler; egne byggesett-maler ligger i `riksbrudd-bsmaler`.
- Interiøret i 3D (interior3d.js) og «Gå» inn i egne bygg i etasjene over er ikke koblet til (bare veggene i 1. etasje stopper deg, som før).
