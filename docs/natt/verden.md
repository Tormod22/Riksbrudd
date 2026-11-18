# Pakke «verden» (natt til 18. nov) – verden gjør noe med spillet

Gren `claude/natt18-verden`. Alle tall er **Claudes forslag** og står samlet i `Verden.REGLER` (spill/verden.js).

## Filer
- `site/dovre-fliser/spill/verden.js` – regler uten DOM (`Verden`), test `pipeline/fliser/test_verden.js`.
- `site/dovre-fliser/spill/verden-visning.js` – kartet, lagpanelet, panelet «Verden rundt dere» (`window.VerdenSpill`).
- `pipeline/fliser/vakter/verden.js` – vakta (ca. 0,1 s, setter alt tilbake; virker på PC og mobil).
- `docs/natt/verden-hjelp.json` – hjelpetekstene.
- Skriptene står rett før `spill/kameravakt.js` i index.html.

## Endringer i filer jeg ikke eier (små)
- `site/dovre-fliser/terreng.js`, funksjonen `fart(klasse, veg)`: to nye linjer – `if (klasse === 3 && fart.is) return fart.is;`
  (islagt vann kan krysses når `Terreng.fart.is` er satt til km/t; ellers som før). `test_terreng.js` går som før.
- `site/dovre-fliser/spill/gange.js`, `vannVed(u)`: `if (!u.vann || window.VERDEN_IS) return () => false;` (du kan gå på isen i 3D).
- `site/dovre-fliser/index.html`: bare de to skript-taggene.
- Egne filer: `spill/dyr3d.js` har ny `Dyr3d.fell(X, Y, fx, fy, treffer)` (tar dyret ut av flokken og skjuler det).
  `vaer.js`, `vaer-visning.js`, `dyr.js`, `flom*.js`, `odeleggelse*.js` er IKKE endret.

## Hva som er laget
Alt som skjer **av seg selv**, skjer bare når `!navigator.webdriver || VerdenSpill.test === true`. Det spilleren gjør selv, virker alltid.

| Nr | Hva | Hvordan |
|----|-----|---------|
| 31 | Vinter | Marsj ×0,7 på snødekt mark (høyden over snøgrensa), ×0,8 i snøvær, ×0,85 i storm: tiden per stykke i lagets sti deles på faktoren (alle sider), lagpanelet sier «tungt føre: marsj −30 %». Kolonner (egne, uten fast oppdrag) over 900 moh. blir stående i snøvær. Is: døgngrader med kulde samles (`V.frost`), fra 25 bærer isen – `Terreng.fart.is = 2,5` km/t og `window.VERDEN_IS` (lag kan gå over vann og brede elver, du kan gå på isen i 3D); tiner fire ganger så fort. Kulde: egne lag som står ute (over 500 m fra leiren, ikke i tettsted, ikke om bord) under −8 °C (temperaturen faller 0,6 °C per 100 m) får varsel etter 7 timer og én frostskadd mann (såret, aldri drept) etter 12 timer og så hver 8. time. Leiren bruker ekstra ved: 1 m³ per døgn per 10 grader under −8. |
| 32 | Flom og ras | Regnsum (timer med regn, tørker 0,2 per time). Over 5: 12 % sjanse per time for flom ved en bekk/elv (orden ≥ 3 fra BEKKER, innen 12 km fra leiren, radius 150–400 m, 12 timer). Over 8: ras i en bratt li (stigning ≥ 0,45 over 96 m; ved en veg når vegnettet er lastet; radius 90 m, 24 timer; lag som står der får ett treff). Sonene: marsj ×0,25 (flom) / ×0,5 (ras) gjennom dem, veglenkene ved sonen sperres i vegnettet (kjøretøy kjører om) og åpnes igjen. Dam-flommen i flom.js er urørt. |
| 33 | Jakt | Du selv: et skudd (SKUDD fra spillet-visning.js) som peker mot et dyr i 3D innen 250 m feller det (`Dyr3d.fell` + `Verden.sikt`), kjøttet går rett til leiren (elg 60, rein 25, moskus 70, ku 80, sau 10 rasjoner; ungdyr halvt). Jaktlag: «Jakt på rein/elg (6 t)» i lagpanelet når laget står i ro der det er vilt (rein ≥ 1100 moh. på fjell/hei/myr/snø, elg i skog under 1050 moh.). Rein 1–3 dyr, elg 0–1. Området (3 km-rute) hviler 72 timer. |
| 34 | Dyrking | «Rydd 20 mål åker» (1 mill. kr, høyst 200 mål) og «Så» om våren (20 000 kr per mål) i panelet. Gror vår og sommer (modent etter 3 døgn), høstes av seg selv i én klump når det blir høst (6 rasjoner per mål), fryser bort hvis det blir vinter først. Åkeren er ikke et bygg i kartet. Valgfritt: «Årstidene går av seg selv» (8 døgn per årstid) – standard er av, som før. |
| 35 | Brann | Rutenett 64 m. «Tenn på her» i lagpanelet (når det ikke er for vått), lyn i tordenvær og skuddveksling i knusktørr skog (bare av seg selv utenom testene). Sprer seg til naboruter etter brennbarhet (skog 1, hei 0,55, tettbebyggelse 0,45, dyrket 0,3 …), brannfare (tørke i døgn, ikke regn, ikke våt bakke, ikke vinter) og vind (medvind øker, motvind demper). Brenner 50–110 min per rute, slokner i regn/snø, brent mark brenner ikke igjen. Lag i brannen får ett treff per halvtime, bygg i leiren mister 20 % hp per halvtime. 2D: oransje ruter som blaffer og mørk brent mark. |
| 36 | Funn | Faste steder (hash av 2,5 km-ruter, 30 %): bilvrak, gjemt depot, forlatt leir, flyvrak. Vises i kartet (gul rute med «?») når et eget lag eller du selv har vært innen 300 m. «Undersøk …» i lagpanelet innen 80 m (du selv: innen 25 m når du går). Innholdet er fast per funn: materialer, mat, diesel, penger, tomt (12 %) eller felle i forlatte leirer. |
| 37 | Radio | Med radiomast eller kontrollrom som virker: en melding hver 3.–6. time i loggen og i panelet. 65 % er sanne (ras/flom/brann som finnes, brannfare, kulde, isen, funn som ikke er oppdaget, hvem som holder tettsteder), resten er oppdiktet. Panelet sier ikke hvilke. |
| 38 | Tog | To tettsteder med stasjon (`Verden.STASJONER`, Claudes liste etter hukommelsen – ikke lest fra jernbanedataene) som du holder: «Sett banen i stand» (150 000 kr per km, 2 stål per 10 km, 2 timer per 10 km, høyst 250 km). Så et tog hvert døgn med 60 tre, 40 betong, 30 stål, 3000 l diesel og 80 rasjoner til leiren – bare mens du holder begge endene. Streken og toget tegnes i 2D. |
| – | Forhold | Værflisa øverst har verktøytips med følgene («Snø: marsj −30 % her · Isen bærer …») og åpner panelet ved trykk. Panelet åpnes også fra «Verden» i kommandolinja (PC) og fra Leir-menyen, fanen Mål («Vær og verden»). |

## For andre moduler
- `window.BRANNER = [{ x, y, r, fra, til }]` – ruter som brenner (midten i kartmeter, r = 32 m, spillminutter).
- `window.BRENT = [{ x, y, r, t }]` – ruter som har brent ut. Samme lister hele tiden; hendelsen `riksbrudd-brann` på window når de endres.
- `window.VERDEN_SONER()` → `[{ type: 'flom' | 'ras', x, y, r, til }]`. `window.VERDEN_IS` = isen bærer.
- `VerdenSpill`: `tilstand()`, `vis(bool)`, `linjer()`, `tenn(x, y, hvem, tving)` (async), `flom(x, y, orden, navn)`, `ras(x, y)`, `undersøk(lag, funn)`,
  `startJakt(lag)`, `ryddÅker()`, `så()`, `radioNå()`, `togStart(idA, idB)`, `stasjoner()`, `settAuto(bool)`, `ryddKart()`, `test`.
- Lagring: `riksbrudd-natur` per leir (frost, regn, tørke, soner, brann, åker, jakt, funn, radio, tog, kulde, auto).

## Prøvd i nettleser
- Dovre-testsiden, PC og mobil: vakta, panelet, bildene av brann/flom/ras/funn i kartet, vinter med 30 timer simulert (marsj −30 %, frostskader,
  ved brukt opp), lagknappene (jakt, tenn på), Leir-menyen og kommandolinja, lagring, og at vinteren IKKE endrer marsjen i testmodus.
- 3D ved heia sør for Dombås: et skudd mot en sau felte den og ga rasjoner.
- /rogaland med ekte data: tog Stavanger/Sandnes–Bryne (betaling, første tog med last), flomsted fra ekte elvedata (Kvennåna), ras-søk.

## IKKE gjort / svakheter
- Brannen har ikke noe 3D-utseende (pakka «natur» – listene over er til dem). Flom/ras/funn er bare tekst i 3D.
- Snø «stenger» ikke veger i vegnettet (ville krevd høyden for alle lenker): kolonner på fjellet stoppes i stedet. IKKE prøvd i nettleser
  (testsiden har ikke vegnettet). Det samme gjelder sperringen av veglenker ved flom/ras og omkjøringen.
- Felte dyr kommer tilbake når 3D-utsnittet bygges på nytt.
- Åkeren vises ikke i kartet, og krever ikke folk.
- Funn kan ligge i tettbebyggelse; de er ikke 3D-modeller.
- Stasjonslista er etter hukommelsen og kan ha hull. Toget trenger ikke at leiren ligger ved banen.
- Jaktlagene får alltid kjøttet hjem uten transport. Isen gjør ingenting med båter/ferjer.
- Flom fra regn bruker enkle sirkler, ikke flomfeltet fra flom.js (det følger en dal fra en dam).
- Fiendens lag fryser ikke (bare egne), men får samme føre.
