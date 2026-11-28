# ut9-mobler – flere møbler, flere hyller og tingene synlige på hyllene (28. nov)

Brukeren (28. nov): «legge til detaljer og liv i spillet … flere forskjellige hyller, flere forskjellige møbler … Vi må ha et skikkelig
lagringssystem med hyller som kan lagre for eksempel peanøttsmør, alt slags mulig småting og hverdagslige ting». Gren `claude/ut9-mobler`
(fra `claude/nattfiks` + `claude/ut8-hverdag`). Alle mål, liter, priser og farger er Claudes forslag.

## 1. 31 nye møbler i interiøret (spill/interior.js + interior3d.js)
`Interior.MØBLER` (mål: bredde, dybde, høyde, sperrer) og en 3D-modell per type i `deler(m)` i interior3d.js:
- stue: hjørnesofa (store stuer), peis (med glør, mantel og pipe; ikke i hytter/eldre hus – der står vedovnen), vitrineskap (med ting bak
  glasset), gyngestol, piano, skjenk (ved spisebordet i store stuer);
- kjøkken: overskap (over benken), kjøkkenøy (store kjøkken, i stedet for bord), vifte (over komfyren), oppvaskmaskin, krydderhylle (på veggen);
- soverom: barneseng (små soverom når huset har flere), kommode, garderobe (skyvedører, av og til speil), sminkebord med speil;
- bad: badekar (i stedet for dusj i større bad), vaskemaskin (når huset ikke har vaskerom), speilskap (over vasken);
- gang: skoskap; kontor: permreol, vannkjøler, safe (også i pauserom/arkiv/kontorlandskap);
- butikk: gondoler (halve butikkene – da står høye reoler langs den andre langveggen), frysedisk, drikkekjølere, vognrekke;
- lager/verksted/garasje/bod: stålreol, verktøyvegg, verkstedbenk med skrustikke, luftkompressor (heter ikke «kompressor» – den finnes i
  industri.js), dekkstativ.
Valgene i rommene er faste per rom via `hash(pl.i, …)` (ikke `tilf()`), så samme hus gir samme plan. Variasjon i farge/form per møbel via `m.f`.
`oppå(r, it, type)` legger et veggskap over et annet møbel (samme vegg, sperrer ikke). `Interior.VEGGHENGT` = møblene som henger på veggen
(overskap, vifte, krydderhylle, speilskap, verktøyvegg): sperrer aldri, ingen skygge på gulvet. Møblene har nå `rolle` (rommet de står i).
Skoskap sperrer ikke (gangen ble stengt i én leilighet i test_interior.js da det sperret); kommode i gangen er tatt ut av samme grunn.
`lut.js` BEHOLDERE har 13 nye møbler man kan åpne (garderobe, kommode, overskap, skoskap, stålreol, gondol, drikkekjøler, frysedisk,
speilskap, verkstedbenk, vitrineskap, skjenk, safe). Medisin i dem er holdt lav (ut9-mobler2): et vanlig hus skal gi 0,1–0,4 førstehjelp (test_balanse.js) – speilskapet har mest småting, ikke medisin.

## 2. Ti nye hylletyper i leiren (spill/tinglager.js LAGRING + spill/byggesett.js NYE)
| del | lagring | liter | tar / passer |
|---|---|---|---|
| bs_trehylle | trehylle | 250 | alt / tørt, mat, kjøkken, fritid |
| bs_stålreol (2×1, +3 m³ materialer) | stålreol | 600 | alt / tørt, verktøy, elektro |
| bs_vitrine | vitrine | 120 | kjøkken, fritid, drikke, kontor, hygiene |
| bs_kjøkkenhylle | kjøkkenhylle | 80 | mat, drikke, kjøkken |
| bs_kjølereol (2×1, 0,5 kW) | kjølereol | 800 (kjøl) | alt / kjøl |
| bs_verktøyskap (låst) | verktøyskap | 250 | verktøy, elektro |
| bs_arkivskap (låst) | arkivskap | 150 | kontor, medisin, elektro |
| bs_smalhylle | smalhylle | 120 | alt / hygiene, tørt |
| bs_hjørnehylle | hjørnehylle | 90 | alt / hygiene, fritid |
| bs_tønnestativ (2×1) | tønnestativ | 600 | vann og drikke |
Alle står i fanen Maskiner (`BS.MASKINFANE`). ENDRING I REGLENE: `passer` kan nå være en kategori (mat, kjøkken …), ikke bare et lag –
`rang()` i tinglager.js sjekker `g.lag || g.kat` (én linje). Ellers samme system: `Tinglager.legg` velger plassen.

## 3. Tingene synes på hyllene i 3D
- `spill/hyller.js` (regler uten DOM, test `pipeline/fliser/test_hyller.js`): `Hyller.varer(o)` gir klosser for tingene på en hylle
  (former: eske, glass, boks, flaske, pose, stabel, verktøy, perm, kanne, bok, rull, pakke; farger per kategori i `KAT`), like ting side om side
  er én kloss, høyst 10 per nivå og 46 i alt; nederste hylle fylles først. `paller(o)` = kartonger i lag på pallene. `innhold(T, pid, liter, TI)`
  = fylling og kategorier fra tinglageret; `trinn(fyll)` (tideler); `husFyll(f, butikk)` = fyllingen i forlatte hus (22 % tomme, butikker 30 %);
  `husKat(type, rolle)` = hva som står der (kjøkken mat, bad hygiene, garasje verktøy …). `OPPSETT` = nivåene per lagringstype.
- `spill/hyller-visning.js` (window.Hyller3d): `bygg(Bg, d, T2, z0, f)` – modellene for ALLE byggesettets lagringsdeler (de ni fra ut8 er
  byttet ut med ordentlige modeller: kjøleskap, kjølerom, frys, medisinskap med glassdør, verktøytavle med verktøy, garderobe med åpen dør og
  klær, kiste, tønne, pallreol med kartonger; og hyllerekka/pallplassen), tingene etter fyllingen. Lukkede skap er lukket. Alt i byggesettets
  nett «farge» (ingen nye lys/materialer). 3D lages på nytt (`Byggesett.lag3d`) når et fyllingstrinn endres (sjekkes hvert 2. s).
  Målt: 20 hyller/skap med ting ≈ 3 900 trekanter.
- tinglager-visning.js: `pakkInn` sender 3D for alle deler med `ting` til Hyller3d (også bs_hylle/bs_pall, som fabrikk-visning tegnet før);
  de gamle kassene står igjen som reserve.
- Hus: hylle (bod/garasje/lager/vaskerom), stålreol, permreol, krydderhylle, vitrineskap, gondol, drikkekjøler og frysedisk har ting fra
  rommet (fast per møbel, noen tomme). Butikkreolene er plyndret i ulik grad (fast per reol). Bokhylla har fortsatt bøker.
  Møbelet kan få `m.fyll`/`m.kat` utenfra (til senere: leirens egne bygg med innredning).

## 4. 2D
`Hyller3d.tegn2d` – egne symboler i plantegningen for de ti nye: trehylle (smal med hyller), stålreol (rutenett), vitrine (glass), kjøkkenhylle
(krukker), kjølereol (blå kant), verktøyskap (skiftenøkkel), arkivskap (skuffer), smal hylle, hjørnehylle (trekant), tønnestativ (tre tønner).
Fyllingsstreken under (fra ut8) står som før.

## Fellesfiler endret
- `index.html`: to skript-tagger – `hyller.js` rett etter `tinglager.js`, `hyller-visning.js` rett etter `tinglager-visning.js` (+ versjon.py).
- `spill/tinglager.js`: ti nye LAGRING-typer + én linje i `rang()` (passer kan være kategori).
- `spill/byggesett.js`: ti nye deler i NYE + MASKINFANE.
- `spill/tinglager-visning.js`: 2D-symbolene først i `tegnDel`, og `egen3d` i `pakkInn` (3D til Hyller3d).
- `spill/interior.js`: MØBLER, VEGGHENGT, MØBELSETT (vaskerom, pauserom, arkiv, kontorlandskap, dagligstue), plasseringen i møblerG
  (stue, kjøkken, soverom, bad, gang, kontor, lager, verksted, garasje, bod, butikk), `rolle` på møblene, hjelperne oppå/midtI/rh.
- `spill/interior3d.js`: 31 modeller i `deler`, ting på hyllene, plyndrede reoler, småting på skjenk/kommode/kjøkkenøy/skoskap/verkstedbenk,
  ingen gulvskygge for veggskap.
- `spill/lut.js`: 13 nye BEHOLDERE.

## Prøvd
- Node: test_hyller, test_moblertyper (31 typer i bruk i 300 bygg, veggskapene sperrer ikke, riktige rom), test_interior (alle rom nås),
  test_tinglager, test_ting, test_byggesett, test_lut, test_mobler, test_industri, test_kommando, test_fabrikk, test_varelager, test_leting,
  test_okonomitest – grønne.
- Vakt `pipeline/fliser/vakter/ut9-mobler.js`: ok på PC og mobil. Feil med vilje (Hyller.varer gir ingenting) → vakta feilet på
  «hylla i huset har ikke ting på seg» og «tingene synes ikke på hyllene i leiren». Også ok: inne, ut8-hverdag, ut4-byggesett3, ut3-etasjer
  (PC), inne og ut8-hverdag (mobil).
- Bilder (scratchpad `natt/ut9-mobler/`): leiren med alle 20 hyller/skap fylt 25–100 % i 2D og 3D (PC og mobil: 2d.png, 3d-*.png, mob-*.png),
  prøvehus og butikk i 3D (inne-*.png). Prøvehuset fra vakta «interiør» (10 × 8 m) har nå 8 138 trekanter (grensen er 9 000), butikken 30 × 18 m 16 800.

## Ikke gjort / å vite
- Lukkede skap (kjøleskap, frys, kiste, tønne, arkivskap) viser ikke innholdet (arkivskapet har permer oppå når det har noe i seg).
- Hjørnehylla står i hjørnet av ruta, ikke nødvendigvis i et romhjørne.
- Lut-nøklene i husene («bygg:type:nr») kan ha flyttet seg for noen hus fordi nye møbler gjør at f.eks. «skap» telles annerledes – et lagret
  spill kan derfor finne et skap som var tømt, fullt igjen (og omvendt) i noen hus.
- Leirens egne bygg (brakke, kjøkken …) har ikke fått de nye møblene i interiøret (bare husene i kartet og byggesettets deler).
- Prøvehuset ligger nær vaktens grense (8 138 av 9 000 trekanter) – nye møbler i boliger bør måles.

## Runde 3 (ut9-mobler3, 28. nov) – leirens bygg, hverdagsting og åpne skap
1. **Leirens egne bygg** (LEIRBYGG i interior3d.js) har fått de nye møblene: kjøkkenet overskap over benken, vifte over komfyren, stålreol,
   krydderhylle og oppvaskmaskin; brakka garderobe, hylle, kommode og skoskap; kontrollrommet permreol og vannkjøler; sykestua (vaktrommet,
   også i hus) en hylle. Hyllene viser TINGENE SOM LIGGER I LEIRENS TINGLAGER: `Interior3d.leirVarer(P)` – kjøkkenet det leiren har av mat,
   drikke og kjøkkenting (alle plassene), brakka klær/hygiene/fritid, sykestua medisin/hygiene, kontrollrommet kontor/elektro, verkstedet
   verktøy/elektro; lagerteltet og containeren det som ligger på deres egen plass (ellers alt). 120 l = full hylle (Claudes forslag). Møblene
   får `m.fyll`/`m.kat`, og hyller-visning.js bygger interiøret på nytt (`Interior3d.bygOm`) når fyllingen endres et trinn (sjekkes hvert 0,6 s).
2. **Hverdagsting i rommene** (småting i `deler`, faste via hash, ingen runde deler): kaffetrakter og brødboks på kjøkkenbenken, potteplante
   på TV-benken, avis på salongbordet, tannkrus med to tannbørster og håndkle ved vasken på badet, bilderamme på kommode/skjenk, bamse og
   leker ved barnesenga, vaskemiddel på vaskemaskinen. (Knaggrekka hadde alt jakker.) For at badet skal vite at det er et bad, følger
   rommets rolle nå møblene gjennom bygningsmodellen: `rolle` i bygning.js (møblene i etasjen) og etasjer3d.js (møblene i 1. etasje).
   PRØVEHUSET I VAKTA «interiør» (10 × 8 m, i 4242), målt i samme skript på grenen før (f4a02d5) og etter: 8 138 → 8 114 trekanter (grensen 9 000).
   (Det huset har ingen vask – bygningsmodellen tar bort det siste store møbelet som stenger veien, så speilskapet henger alene.)
3. **Åpne skap**: åpner du kjøleskapet, skapet, garderoben, tønna eller fryseboksen i et hus (lutpanelet), står døra/lokket åpent i 3D med
   tingene synlige (`window.MØBEL_ÅPEN = { i, type, k, fyll }` fra `Hyller3d.åpentNå()`, interiøret bygges på nytt; lukkes panelet, lukkes døra).
   Innholdet står som før i panelet. I leiren: kjøleskap, frysboks, kiste og tønne fra byggesettet står åpne mens lagerpanelet viser bare
   den plassen («Viser: …», `TinglagerSpill.plass()`).
Fellesfiler i runde 3: interior.js (brakke, kontrollrom, storkjøkken, vaktrom), interior3d.js (leirVarer, åpne modeller, småting), hyller-visning.js,
tinglager-visning.js (`plass()`), bygning.js og etasjer3d.js (én `rolle` hver).
Vakta ut9-mobler sjekker nå også leirens kjøkken/brakke, tingene fra lageret på hyllene, tannbørstene på badet, det åpne kjøleskapet og den åpne
kista (feil med vilje: kjøkkenet uten mat og kjøleskapet uten åpen modell → vakta feilet på alle tre). Bilder: leir-kjøkken.png,
leir-lagertelt.png, åpent-kjøleskap.png (+ mob-). IKKE GJORT: innholdet i lukkede skap i leirens egne bygg (kjøleskapet i kjøkkenet) – de står
lukket; vegetasjonen i 3D ryddes ikke for bygg som settes inn med skript (bare i bildene).
