# ut6-kjeder – fase Ø9: flere kjeder, lån, avis og sesonger

28. nov, gren `claude/ut6-kjeder`. Plan: `docs/plan-selskap-okonomi.md` kapittel 4.1–4.2 (varer og maskiner), 12 (andre mekanikker) og Ø9 i
kapittel 16. Spørsmål 7 i kapittel 18 («hvilken kjede etter sagbruket?»): planens rekkefølge er brukt, og ALLE fire kjedene + smia er laget
(stein først, fordi den henger best sammen med det som finnes: betong og veger). **Alle tall som ikke står i planens tabell, er Claudes
forslag** – samlet i `Produksjon.REGLER.maskiner`, `Kjeder.REGLER`, `Laan.REGLER`, `Avis.REGLER`, `Leir.MATERIALER`/`Leir.BYGG` og `KS` i
`pipeline/fliser/okosim-kjeder.js`.

## Hva som er laget

### 1. Nye kjeder (produksjon.js-formatet – samme regler som saga: folk, strøm, råvare, utmating, grunner, varsel før kjøp, bærere)

| Maskin | Inn per time | Ut per time | Folk | Strøm | Pris | Plassregel |
|---|---|---|---|---|---|---|
| Steinbrudd | – (bryter selv) | 1,5 m³ stein | 2 | 5 kW | 2,5 mill. | ved fjell: minst 6 m høydeforskjell innen 45 m |
| Steinknuser | 2 m³ stein | 1,8 m³ pukk | 2 | 20 kW | 5 mill. (planen) | – |
| Betongblander | 0,4 m³ pukk + 0,2 t sement | 0,5 m³ betong | 1 | 5 kW | 1,2 mill. | – |
| Fiskemottak | 0,8 t fisk | 0,7 t frossen fisk | 3 | 25 kW | 7 mill. (planen) | kai innen 400 m + fryselager fra Ytterø |
| Mølle | 0,6 t korn | 0,5 t mel | 2 | 10 kW | 3 mill. (planen) | – |
| Lite raffineri | 0,25 t olje | 20 l diesel (rett i tanken) | 4 | 40 kW | 18 mill. (planen) | – |
| Smie (verkstedet utvidet) | 0,5 t skrap | 0,15 t stål + 0,03 t deler | 2 | 10 kW | 2,5 mill. (planen) | trenger et ferdig verksted |

- Reglene: `REGLER.maskiner` i `spill/produksjon.js` (bare nye oppføringer, `rekkefølge`, `enhet` per vare og et felt `tom` som gir
  «tom for stein» / «venter på korn»; `oppskrift()` og `merke()` bruker enheten: «20 l/t», «0,5 t/t»). `inn: [{}]` = ingen råvare
  (steinbruddet). Ingen endring i `steg()`.
- Byggene i `Leir.BYGG` (leir.js, `maskin: true`), med 2D-stil (leir2d.js), tegning (tegninger.js), virkningstekst og korttekst
  (leirvirkning.js), ikoner (`Ikoner.legg` fra kjeder-visning.js) og plass i byggelista (gruppen Produksjon).
- **Raffineriet** binder de to systemene: maskinen lager `diesel` (liter) i `L.lager.diesel`, og kjeder-visning.js flytter den hvert steg til
  `L.drivstoff` så langt tankene rekker (`Kjeder.dieselTilTank`; med bærerne også fra utmatingen). Oljen hentes fra basen
  (`OLJE.BASER[0].beholdning`, tonn) når leiren har under 3 t råolje (`Kjeder.oljeTilLeir`) – og kan kjøpes i Leir → Lager.
- **Korn**: byene dere har handel eller medlemskap med (`ByavtaleSpill`), selger 3 t korn per by og døgn (× årstid: vinter 0,4, vår 0,6,
  sommer 1, høst 1,6) til 4 000 kr/t, opp til 12 t på lager – bare når leiren har en mølle. **Mel → mat**: et kjøkken med kokk lager
  6 rasjoner av 1 t mel (høyst 0,25 t i timen) når maten rekker under 3 døgn (`Kjeder.melTilMat`).
- **Fisk**: `Sjo.fangst` pakkes inn – med et fiskemottak som virker, går fangsten fra båtene til mottaket som fisk (0,2 t per «rasjon»,
  × årstid: høst 1,3) i stedet for rasjoner. Dovre har ingen kyst, så fiskemottaket kan ikke bygges der (ingen kai).
- **Pukk til grusvegen**: `Leir.bygg` pakkes inn – en grusveg (`Leir.BYGG.veg`) bruker egen pukk når leiren har det: 0,15 m³ per meter, og
  vegen koster da 3 000 av 6 000 kr mindre per meter (`Kjeder.vegPukk`; pengene gis tilbake, `b.pris` settes ned så rivingen regner riktig).
  Prøvd i nettleseren: 100 m veg med 50 m³ pukk kostet 300 000 kr i stedet for 600 000 og brukte 15 m³.
- **Skrap**: `Ressurser.steg` pakkes inn – riving gir 0,4 t skrap per tonn stål som leveres. Skrap kan også kjøpes.

### 2. Nye varer
`Leir.MATERIALER`: stein 2 500 kr/m³, pukk 12 000 kr/m³, sement 40 000 kr/t, skrap 8 000, deler 90 000, fisk 15 000, frossen fisk 30 000,
korn 5 000, mel 14 000, råolje 20 000 kr/t – alle med `kjede: true`: de vises i Leir → Lager og lageroversikten bare når dere har noe av
varen eller en maskin som bruker/lager den (`Leir.visMateriale`, satt fra kjeder-visning.js).
- **Markedet** (`spillet.js`): egen liste `Marked.KVARER` (hyller, kjøpere per døgn, enheter, `erMateriale`). Prisene flytter seg med et
  fast tall av dag og vare – **de nye varene trekker ikke fra terningen**, så alle gamle markeder og økonomitesten er nøyaktig som før
  (test_kjeder.js sjekker det). Ny krok `Marked.sesong(vare)` (null = som før).
- **Varelageret** (`varelager.js`): enheter (steinhaug 2 m³, pukkhaug, pall sement, haug skrap, kasse deler/fisk/frossen fisk, storsekk
  korn, pall mel, tank råolje) og blokker ute; korn, mel og olje kan brenne. De nye står etter diesel i `VARER`.
- **Eksporten** (`eksport.js`): frossen fisk (55 ek/t), mel, pukk og deler i `REGLER.VARER`; krok `Eksport.ekstraVarer()` – ordrene kan be
  om varene leiren lager (bare når den har maskinen). Tom liste = samme terning som før.

### 3. Andre mekanikker (kapittel 12)
- **LÅN** (`spill/laan.js`, test `test_laan.js`): banken i en by med handelsavtale/medlemskap (0,4 % i døgnet, 30 døgn, høyst 8 mill. per by
  og 20 mill. i alt, og ikke mer enn 1,5 × kassa + 2 mill.; sier nei med et forfalt banklån) og lånehaien (3 % i døgnet, 14 døgn, høyst
  25 mill., alltid ja). Renten legges til hver morgen (rentes rente); etter fristen dobles den, og lånehaien koster −3 «pålitelig».
  «Bank og lån» i Leir → Lager med knapper (Lån 2/5/10 mill., Betal 1 mill., Betal alt) gjennom kommandoene `laanTa` og `laanBetal`.
  Lagres i `riksbrudd-laan` per leir.
- **AVISA** (`spill/avis.js`, test `test_avis.js`): «Fjellposten» hver morgen – saker fra markedet, byene, Gråbørsen, ryktet, loggen (angrep og
  ulykker – ikke tekniske meldinger), raffineriet/kornet/fisken, renten og årstiden; den største er tittelen, så tre notiser. Samme dag gir
  samme avis. Tittelen står i morgenmøtet (`MORGEN_LINJER`) og dagboka (`DagbokSpill.noter`), hele avisa under «Avisa» i Leir → Mål.
  Lagres i `riksbrudd-avis` per leir.
- **SESONGER**: hogst × 1,25 om vinteren og × 0,85 om våren (arbeidsfarten i `Ressurser.steg`), fisk × 1,3 om høsten, ved i markedet × 0,8 om sommeren,
  × 1,4 om vinteren og × 1,15 om høsten (`Marked.sesong`).
- **FORSIKRING**: IKKE laget som egen mekanikk – Gråfjell Frakt har alt erstatning (80 %) for tapte laster (`Eksport.REGLER.frakt`,
  `Vare.REGLER.frakt`). Å kjøpe 100 % dekning er en liten utvidelse der.
- Depoter, streik, korrupsjon, etterretning: ikke laget.

### 4. Visning (`spill/kjeder-visning.js`, window.KjedeSpill)
- Fanen Produksjon: de nye maskinene står som rader (som saga – generelt), og nederst «Kjedene» (lageret for de nye varene, korn fra byene,
  olje på basen og tanken, fisken).
- Byggelista: gruppen Produksjon har de nye maskinene med ikoner; plassreglene gir en forklaring i banneret (`Leir.kanByggeEkstra`).
- 2D: tallet over maskinen («1,8 m³/t», «20 l/t») og grunnen kommer fra produksjon-visning.js; formen fra leir2d.js.
- 3D: gjenbrukte modeller (steinbrudd = sandsekkvoll, knuser/blander/smie = container, fiskemottak = verksted, mølle = brakke,
  raffineri = dieseltank). Ingen egne 3D-modeller.
- Alt som skjer av seg selv (korn, olje fra basen, mel til mat, fisk, skrap, sesonger, renter, avis i dagboka) skjer bare når
  `!navigator.webdriver || KjedeSpill.test`. Dieselen fra raffineriet går alltid i tanken (det er maskinens utmating).

### 5. Økonomitesten (`pipeline/fliser/okosim-kjeder.js`)
Ny strategi **«kontrakter + stein og pukk»** (`kontraktStein`, fornuftig): som «bare kontrakter»; når kassa er over 60 mill. og spillet ikke
varsler, bygges fyrkjele + steinbrudd + steinknuser, fem rekrutter går på maskinene, kjelen fyres med kjøpt flis, og pukken (og stein over
20 m³) selges hver morgen. Krav: steinkjeden gir 0,7–1,6 × lønna til ti per tre arbeidere (1,56; saga 1,31), mølle/fiskemottak/smie høyst
1,6 (0,77 / 1,15 / 1,48), kjeden kommer i gang i minst halvparten (54 av 60, dag 18 i medianen), knuseren lager over 10 m³ per døgn (32),
og strategien ender 0,6–1,2 × «bare kontrakter» (83 mot 103 mill.). Grønn, båndet lagt til (bare `kontraktStein`; de andre urørt).
**Funn:** steinkjeden alene tjener lite: pukken gir ca. 0,3 mill. i døgnet, men kjelen brenner kjøpt flis (ca. 0,13 mill.), fem nye
arbeidere koster lønn og tar sengene troppen ellers ville fylt. Bygget tidlig (dag 1–7) trekker den «kontrakter» ned til ca. halvparten.
Strøm er den egentlige flaskehalsen: alle maskinene taper penger på diesel (1 kW i døgnet ≈ 21 600 kr). Smia ble satt ned (0,3 -> 0,15 t
stål) – med 0,3 ga den 3,5 × lønna.

## Fellesfiler endret (nøyaktig)
- `spill/produksjon.js`: bare `REGLER.maskiner` (sju nye), `rekkefølge`, ny `REGLER.enhet`, `VARENAVN`, `enh()`, `tomTekst`/`venterTekst`
  (feltet `tom`), og `oppskrift`/`merke` bruker enheten. `steg()` er uendret.
- `spill/leir.js`: sju nye `BYGG`, ti nye `MATERIALER` (kjede: true), kroken `api.kanByggeEkstra` i `kanBygge` (siste linje) og i api.
- `spill/spillet.js` (Marked): `KVARER`/`ALLE`, `steg` (fast bevegelse for de nye), `pris` × `Marked.sesong`, `LAGER`, `ENHET`, `KJØPER`,
  `erMateriale`, `hyller`/`fyll` over alle.
- `spill/varelager.js`: `REGLER.enhet`, `brenner`, `ute.blokk`, `VARER`.
- `spill/eksport.js`: fire varer i `REGLER.VARER`, `api.ekstraVarer` i `lagOrdre`.
- `spill/leir-visning.js` og `spill/lager-visning.js`: én linje hver – hopper over `kjede`-varer når `Leir.visMateriale` sier nei.
- `spill/leir2d.js` (STIL), `spill/tegninger.js` (BYGG), `spill/leirvirkning.js` (VIRKNING + KORT_ELDRE): sju linjer hver (testene krever det).
- `index.html`: fire skript-tagger rett etter `produksjon-visning.js` (`kjeder.js`, `laan.js`, `avis.js`, `kjeder-visning.js`) + `versjon.py`.
- `pipeline/fliser/okonomitest-band.json`: bare båndet for `kontraktStein` lagt til.
- Nye filer: `spill/kjeder.js`, `spill/kjeder-visning.js`, `spill/laan.js`, `spill/avis.js`, `pipeline/fliser/test_kjeder.js`, `test_laan.js`,
  `test_avis.js`, `okosim-kjeder.js`, `vakter/ut6-kjeder.js`, `docs/natt/ut6-kjeder-hjelp.json`.

## API
- `Kjeder`: `REGLER, vegPukk, steinPlass, plassFeil, sesong, korn, oljeTilLeir, dieselTilTank, melTilMat, fiskFraFangst, skrapFraRiving`.
- `Laan`: `REGLER, ny, fraJSON, tilbud, ta, døgn, betal, gjeld, rente, forfalt, perDøgn`.
- `Avis`: `REGLER, lag(saker, dag, leir), linje, fraLogg, frø`.
- `KjedeSpill`: `test, morgen(tving), lagAvis(), avis(), lån(), sett(S), handelsByer(), plassCtx(), html(), nullstill(), les(), sist()`.
- Innpakninger (en gang, merket `.kjede`): `Sjo.fangst`, `Ressurser.steg`, `Leir.bygg`, `window.logg`, `ProduksjonSpill.html`.
- Kroker: `Leir.kanByggeEkstra(L, b, v)`, `Leir.visMateriale(L, k)`, `Marked.sesong(vare)`, `Eksport.ekstraVarer()`.

## IKKE gjort / å vite
- Ammunisjon fra smia: lagene har ammunisjon per lag (forsyning.js), ikke en vare i lageret – smia lager bare stål og deler.
- Fiskemottaket er ikke prøvd i et spill med kyst (Dovre har ingen kai; reglene og fangst-innpakningen er prøvd i Node/Dovre uten båter).
- Kornet fra byene er ikke prøvd i nettleseren med en ekte handelsavtale (bare i Node).
- Rivalene har ingen egne kjeder (Ø8). Ingen egne 3D-modeller eller grafer for de nye varene. Forsikring, depoter, streik: se over.
- `spillet-visning.js` (`settPriser`) setter ikke markedspris på de nye varene i `Leir.MATERIALER` – de kjøpes til grunnprisen (hyllene gjelder).

## Prøvd
- Regeltester: `test_kjeder.js` (med selvtest: en mølle uten mel oppdages), `test_laan.js` (selvtest: uten rente), `test_avis.js` (selvtest:
  vektene bestemmer tittelen), og ALLE `pipeline/fliser/test_*.js` – grønne. `test_okonomitest.js` grønn (60 frø, ca. 35 s).
- Nettleser (Dovre-testsiden, PC 1400 × 860 og mobil 390 × 844, bilder i scratchpad `natt/ut6-kjeder/`): steinknuser og mølle i leiren med
  strøm og folk – knuseren laget pukk, mølla mel; fanen Produksjon med radene og «Kjedene»; byggelista (gruppen Produksjon med tegningene);
  2D-tallene over maskinene («1,8 m³/t», «3 l/t», «ingen folk»); Leir → Lager «Bank og lån» (lån hos lånehaien via knappen: +2 mill.);
  Leir → Mål «Avisa». Med `KjedeSpill.test = true`: korn fra en by med handelsavtale (0,125 t i timen, 500 kr), fangst fra en sjark til
  fiskemottaket (0,39 t fisk, 0 rasjoner), mel til mat på kjøkkenet, ved 9 600 kr om sommeren og 16 800 om vinteren, steinbrudd på flat mark
  avvist med forklaring, 100 m grusveg med pukk til halv pris. Ingen sidefeil. Oljebasen har 0 t på testsiden (raffineriet fikk olje fra lageret).
- Vakt `pipeline/fliser/vakter/ut6-kjeder.js`: ok på PC og mobil (under 0,2 s); kassa, byggene, lageret, dieselen og lånene er som før
  etterpå. Med en feil lagt inn med vilje (mølla uten mel) sa den «feilet: mel».
- Andre vakter i samme side etter min: ut2-sagbruk, ut3-varer, ut4-eksport, ut4-firmaer, ut4-balanse2, ut4-maskinfolk, leir2d, leirvirkning,
  lonn, morgen, ut1-selskap, start, ui, spill2d, kontrakter, lagring, selskap, ut3-riving, ut2-vei, ut3-rekruttering, ut2-byer – ok.
  `okonomi` feiler («prognose … lik false») – kjent fra før (ut2-sagbruk.md). `ut2-lagring` feilet én gang etter elleve andre vakter i samme
  side («lagringen ble ikke satt tilbake»), men er ok alene, etter `ut6-kjeder` og etter `lagring` – trolig rekkefølge, ikke denne pakka.
