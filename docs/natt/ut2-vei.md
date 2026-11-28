# ut2-vei – veien i byggene (fase F1)

28. nov, utbyggingen av docs/plan-selskap-okonomi.md, kapittel 6.5 og 6.9 og fasetabellen F1 i kapittel 16. Gren `claude/ut2-vei`.
F1 = veien som ren regelmodul. **Figurene går ikke etter den ennå** (det er F2). Det eneste spilleren ser, er en ny advarsel i byggesettet.

## Filer
- `site/dovre-fliser/spill/vei.js` – NY. Regler uten DOM (Node: `require('./vei')`, henter bygning.js, leir.js og byggesett.js selv;
  nettleser: `window.Vei`). Nederst (bare i nettleseren): feilsøkingsvisningen `window.VeiSpill` (KROKER.tegn, av som standard).
- `pipeline/fliser/test_vei.js` – NY (36 sjekker, ca. 6 s; `RASK=1` færre prøvehus).
- `pipeline/fliser/vakter/ut2-vei.js` – NY vakt.
- Endret, små og samlede endringer:
  - `site/dovre-fliser/spill/byggesett-visning.js`:
    (1) ny variabel `advarsel` ved siden av `tekst`/`ekstra` (nullstilles i `oppdater()`), vist i `visLinje()` som egen linje
        `<small class="advarsel">` før `ekstra`; CSS-regelen `#byggesett small.advarsel{ color:#e8a35a; }` lagt til etter `#byggesett small{…}`;
    (2) i `oppdater()`, rett før den siste `visLinje(); skisse3d(); skitten = true;`: `if (V.fane !== 'riv' && ok.length && window.Vei) advarsel = veiTekst(alle, ok, o, l) || '';`
    (3) nye funksjoner `veiRom` og `veiTekst` (og `let veiFør`) rett før «Delene som rives», og `window.ByggesettVei = { tekst, sjekk }` (for vakta).
    Ingenting annet; uten `window.Vei` er byggesettet som før. Byggesett.js (reglene) er ikke endret.
  - `site/dovre-fliser/index.html`: **én linje** – `<script src="/dovre-fliser/spill/vei.js?v=…">` rett etter bygning.js (pakka «hus2d» legger
    sin der samtidig – vei.js skal stå ETTER hus2d sin; den trenger bare Bygning, Leir og ByggesettRegler). Versjonsmerkene satt med versjon.py.

## Slik virker det
- **Rutenett (lag):** ett per etasje. Leirens bakke er ett lag på **1,2 m** (ute + byggesettets 1. etasje), rettet inn etter byggesettets ruter
  (2,4 m = to ruter), så veggene ligger på kanten mellom to ruter. Etasjene over i byggesettet får egne lag. Husene i kartet (Bygning.fraKart,
  til B7) får egne lag per etasje, og ytterdørene deres er lenker ned til bakken.
- **Vegger sperrer kanten** mellom to ruter (ikke rutene): en kant (8 retninger) som krysser en vegg, er stengt, unntatt i en åpning (dør/port
  uten sperre, eller revet). Åpningen regnes med en halv rute ekstra på hver side, så også en 0,9 m dør gir en kant med 1,2 m ruter. På skrå
  bare når begge rette naboene er frie (ingen vei gjennom et hjørne); veggene forlenges 3 cm i hver ende.
- **Dører kan låses:** `Vei.lås(åpning, 'egne' | 'ingen' | null)` setter `åpning.lås` i Bygning-modellen. `hvem: 'egne'` (standard) slipper
  gjennom «egne»; `hvem: 'fremmed'` gjør det ikke; «ingen» stenger for alle. Signaturen ser låsen.
- **Møbler og maskiner** (Bygning: `sperrer`) sperrer rutene de dekker, unntatt ruta der **bruksplassen** er (`Vei.bruksplass(møbel)`: 0,5 m
  foran – lokal +v –, ellers bak/sidene, første som er på gulvet og ikke i et annet møbel). Søyler og trappeløpet sperrer også.
- **Trapper** er lenker mellom `nede` og `oppe` (kost = løpet × 2). Byggesettets «antatte» trapp (fraByggesett) brukes som den er.
- **Leirens bygg** (Leir.BYGG, ikke deler/linjer/port) er hindringer på bakken (omrisset + 0,35 m); **gjerdet** (Leir.gjerdeLedd – porten er
  åpningen) og **forsvaret** i byggesettet (palisade, mur, voll, piggtråd) er vegger uten dør.
- **Husene i kartet:** ruta er 1,2 m når alle rommene nås da; ellers 0,6 eller 0,3 m (`husRute`, prøves på huset alene, huskes på modellen
  utenom JSON). 120 prøvehus: 111 med 1,2 m, 8 med 0,6, 1 med 0,3; ca. 2 ms per hus. Alle 1327 rom som Bygning.nås når, nås også av veien.
- **Rom-kartet:** rutene som henger sammen uten å gå gjennom en dør/trapp er ett rom (ute er også et rom, `r.ute`). Portalene (dørene og
  trappene mellom to rom, med lås) gjør det til en liten graf. `finn()`: først rommene (Dijkstra over portalene, rett linje inne i rommet),
  så A* rute for rute bare i de rommene. Hvilke rom som nås fra leirens midte, huskes per `hvem`.
- **Veikart (flytfelt):** `veikart(mål)` = Dijkstra fra målet over hele leiren (alle lag og lenker) én gang: avstand og neste rute for hver rute.
  Navngitte mål: `lager` (lagertelt, container; rom brukt som lager/bod), `kjøkken` (rom brukt som kjøkken – leiren har ikke et eget kjøkkenbygg
  i leir.js), `verksted`, `sykestue`, `seng` (brakke; soverom), `kontrollrom`, samt `bygg:<type>`, `id:<bygg-id>`, `rom:<nøkkel>`. Leirens bygg:
  målet er inngangen midt foran (fronten mot +x, 0,9 m ut). Høyst 24 kart huskes (eldst ut).
- **Når leiren endres:** `Vei.oppdater(o)` lager kartet på nytt bare når `Vei.signatur(o)` er endret (deler, bygg/gjerde, vegger/dører/låser/
  trapper/møbler i husene, antall endringer). `Vei.endrerVei(endring)` sier om en Bygning-endring (vegg, åpning, trapp, dekke, etasje, møbel,
  søyle, bjelke) gjør det. Å lage hele kartet på nytt er billig (3–14 ms for prøveleirene), så det deles ikke opp per bygg.

## API (`window.Vei`)
- `lag(o)` – o: `{ leir (Leir-tilstanden), deler (byggesettets deler; ellers fra leir), opphav {ox, oy}, bygninger [Bygning-modell],
  start [x, y] (leirens midte), margin, mål { navn: [[x, y, e?, hus?]] }, prøve (true: setter ikke Vei.nå) }` → kartet K (også `Vei.nå`).
- `finn(fra, til, { hvem, kart })` – fra/til `{ x, y, e?, hus? }` eller et mål-navn → `{ ok, punkter [{ x, y, e, hus }], lengde, rom, grunn }`.
  `hus`: `'leir'` (bakken/byggesettet) eller `'hus<id>'` for et hus i kartet; uten `hus` brukes huset punktet står i.
- `veikart(mål, { hvem, kart })` → `{ avstand(p), neste(p), vei(p), node(p), nesteNode(n), avstandNode(n), punkt(n), ms, kilder }`.
  F2: hold noden per person og slå opp `nesteNode` – ingen søking.
- `kanNå(plass, { hvem, kart })` – plass `{ x, y, e?, hus?, bruksplass? }` → `{ ok, grunn }`. Grunnene (`Vei.GRUNN`): «rommet har ingen dør»,
  «døra er låst», «ingen vei dit», «ingen vei til bruksplassen» (når `bruksplass: true`), «plassen er sperret», «ingen gulv her».
- `romNås(P, { e, hus, kart })` (minst én fri rute i omrisset nås), `romUtenVei(K, { minAreal })` (inne-rom som ikke nås, med grunn),
  `oppdater`, `signatur`, `endrerVei`, `lås`, `bruksplass`, `node`, `punkt`, `oversikt`, `REGLER`, `MÅL`, `GRUNN`.
- `window.VeiSpill` (konsollen): `feilsøk(true)` tegner rutenettet i 2D (sperret rødt, inne blått, dørkanter og lenker gult) for leiren slik
  den står, `vis('lager')` / `vis([x, y, e])` viser veien fra leirens midte, `etasje(2)`, `kart()`, `tilstand()`. Ingen knapp for spilleren.

## Byggesettet sjekker veien
Når du legger deler (ikke «Riv»), regnes rommene som ikke nås før og etter forslaget (alle deler som ferdige, Vei.lag med prøve: true). Et nytt
rom uten vei gir en oransje linje i verktøylinja: «Rommet på 23 m² har ingen dør – ingen kommer inn (sett inn en dør).», «Døra til rommet på …
er låst.» eller «Ingen vei inn til rommet på …». Det er en **advarsel**, ikke rødt – du bygger ofte veggene før døra (døra bytter ut en hel
vegg). Rommet trenger ikke tak for å telle (gulv + vegger rundt er nok). «Ingen vei til bruksplassen» for maskiner er klart i `kanNå`, men det
finnes ingen maskiner å sette ennå (B5/F3).

## Tall (alle er Claudes forslag – `Vei.REGLER`)
Rute 1,2 m (finere 0,6 / 0,3 i husene i kartet); område = alt + 12 m; hindring + 0,35 m; vegg forlenges 0,03 m; trapp koster 2 × løpet;
bruksplass 0,5 m foran; punkt → nærmeste frie rute innen 2 ruter; høyst 250 000 ruter i bakken (ellers 2,4 m osv.); 24 veikart huskes.

## Målt (Node, maskinen delt med andre hjelpere; test_vei.js skriver tallene)
| Prøveleir | ruter | Vei.lag | finn() per spørring | veikart per mål | 4 takter × alle folk med veikart |
|---|---|---|---|---|---|
| 10 folk, 2 hus | 4 539 | 1,4–1,7 ms | 0,23–0,33 ms | 1,8–2,5 ms | 0,04 ms |
| 50 folk, 10 hus | 7 956 | 3,7–4,2 ms | 0,21–0,25 ms | 2,9–3,3 ms | 0,09–0,20 ms |
| 200 folk, 40 hus | 15 264 | 12–14 ms | 0,38–0,43 ms | 4,1–8 ms | 0,28–0,36 ms (noder: 0,05 ms) |
Stor leir med gjerde 400 × 400 m: 126 000 ruter, Vei.lag 48 ms, ett veikart 101 ms. 200 folk 4 ganger i sekundet med veikartene tar altså under
0,1 ms per takt. Bygården 12 m (4 etasjer, 76 rom): alle rom nås, veien til 4. etasje går opp tre trapper. I nettleseren (vakta): ca. 75 ms for
alle prøvene (tre prøvehus, veikart, leirens kart).

## Prøvd
- `node pipeline/fliser/test_vei.js` (36 sjekker grønne), test_byggesett, test_leir, test_kommando, test_bygning (RASK) grønne.
- Nettleser PC (1400 × 860) og mobil (390 × 844): vakta grønn på begge, ingen sidefeil; bilder av feilsøkingsvisningen (veien fra leiren gjennom
  døra inn i en brakke, «Rom uten dør» uten dørkanter) og av byggesettet med advarselen (en ring av vegger rundt gulv og tak).
- Feil med vilje: dørene regnet som vegg (`h = [].find(...)` i lagLag) → vakta feilet på døra, trappa og veikartet. Satt tilbake.

## IKKE gjort (senere faser / åpent)
- Figurene følger ikke veien (F2), ingen trengsel/kø (planen: ikke i første versjon), ingen trafikkart (F5).
- Ute går veien bare i leirens område (rutenett rundt byggene + 12 m). Terrenget (bratt, vann) er ikke med – lagene ute går som før (terreng.js).
- Leirens ferdige bygg (brakke, kontrollrom …) er hindringer med én inngang; interiøret deres (interior3d LEIRBYGG) er ikke med i veien.
- Rom-kartet lages på nytt for hele leiren når noe endres (billig nok nå); `endrerVei`/signaturen sier når. Ikke delvis oppdatering per bygg.
- Kjeller/loft i husene i kartet virker (egne lag og trapper), men hull i dekket (`dekke.hull`) og rast dekke er ikke med.
- Låsene lagres ikke (ingen knapp ennå) – `åpning.lås` i modellen; lagring kommer med G0/B3.
