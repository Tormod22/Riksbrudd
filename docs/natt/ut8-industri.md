# ut8-industri – industritype og innredning (28. nov)

Brukeren: «Se etter et system som kan ha forskjellige industrimaskiner til forskjellige industribygg – om du kan lese hva slags
industri et bygg hører til, f.eks. tømmer, olje, gass, bergarter, fiskeindustri osv. – for å ha korrekt innredning.»

Grenen `claude/ut8-industri`. Alle tall og regler under er **Claudes forslag**.

## Industritypene (IND)

Samme nummer i byggjobben (`IND` i `pipeline/fliser/bygninger.py`) og i spillet (`Industri.IND` i `spill/industri.js`):

| ind | type | hall / bakrom i interiøret | maskintype i produksjon.js |
|---|---|---|---|
| 0 | ukjent (spillet anslår) | – | – |
| 1 | tømmer/sagbruk | sagbrukshall / tørkeloft | sagbruk |
| 2 | trevare/snekker | snekkerverksted / lakkrom | – |
| 3 | olje | oljehall / styrerom | raffineri |
| 4 | gass | gasshall / styrerom | – |
| 5 | stein/pukk/gruve | knuserhall / lager | steinknuser |
| 6 | fisk/sjømat | fiskehall / fryselager | fiskemottak |
| 7 | mat/meieri/slakteri | mathall / kjølerom | mølle |
| 8 | metall/verksted/smie | metallverksted / lager | smie |
| 9 | båt/verft | verftshall / lager | – |
| 10 | kraft/energi | turbinhall / styrerom | – |
| 11 | lager/logistikk | lagerhall / kontor (som før) | – |
| 12 | gjenvinning/avfall | sorteringshall / kontor | – |
| 13 | bryggeri/drikke | bryggerhall / kjølerom | – |
| 14 | kjemi/plast | kjemihall / lager | – |

Begrunnelse: typene følger det OSM faktisk skiller på i Norge (sagbruk, fiskeforedling, steinbrudd, verft, kraft, havn/lager,
gjenvinning) og maskinene spillet alt har i `produksjon.js` (sagbruk, steinknuser, fiskemottak, mølle, raffineri, smie), så et
industribygg senere kan tas over som fabrikk av riktig slag (`Industri.IND[t].prod`).

## 1. Byggjobben (`pipeline/fliser/bygninger.py`)

Ny egenskap `ind` på byggene i hus.pmtiles (bare når den er kjent, så fila blir knapt større). Rekkefølgen:
1. **Byggets egne merker** (`industri_type(tags, building)`): `industrial=*`, `craft=*`, `man_made=works` + `product=*`,
   `man_made=storage_tank` (+ `content`), `silo`, `wastewater_plant`, `mineshaft/adit`, `power=plant/substation/generator`
   (ikke sol), `amenity=recycling` (ikke containere), `landuse=quarry/port/harbour/depot/landfill`, havn med
   `seamark:harbour:category=fishing` -> fisk, og til sist **navnet** (norske ord: «Fiskemottak», «Sag», «Mek. Verksted»,
   «Pukkverk» … – `IND_ORD`), men bare når bygget/området er industri (building=industrial/warehouse …, eller landuse=industrial).
2. **Et punkt inne i bygget** (node med industrial/craft/man_made/power – fra punktfila).
3. **Det minste industriområdet** byggets midte står i (`koble_industri`): områder med `er_industriområde(tags)`.
   Bare byggtyper som kan være industri får typen fra området: t 1 uthus, 2 næring, 5 annet, 6 industri, 12 lager (`IND_FRA_OMRÅDE`).
4. **Ny type**: bygg merket bare `building=yes` (t 5) på minst 60 m² inne i et industriområde blir t 6 (industri) eller 12
   (lager, når området er havn/depot/logistikk).

Manifestet får `statistikk.industritype` (antall per type) og `statistikk.industriområder`.
Test: `python3 pipeline/fliser/test_bygninger.py` – tagg-reglene og **hele byggjobben på en syntetisk .osm** (11 prøvebygg og
7 områder ved Dombås, skrevet som OSM-XML i testen og lest av osmium; pmtiles-fila leses tilbake og `t`/`ind` sjekkes).
`.github/workflows/hus.yml`: filtrene tar nå med industriområdene (bygg-fila) og industripunktene (punktfila).

### Slik bygger du husdataene på nytt (det du må gjøre)
1. Flett grenen og push til GitHub (workflowen leser bygninger.py fra grenen du kjører den på).
2. GitHub → Actions → **«Bygg byggomriss»** (`hus.yml`) → *Run workflow* på den grenen. Tar ca. 1–2 timer (hele Norge).
   Sammendraget viser `industritype` per type – sjekk at f.eks. «fisk/sjømat» og «tømmer/sagbruk» har tusenvis.
3. Releasen heter `kart-hus-<hash>` (står i sammendraget). Lokalt: `python3 pipeline/fliser/bruk_hus.py kart-hus-<hash>`
   (setter `HUS_TAG` i `site/dovre-fliser/index.html` og sjekker at manifestet finnes).
4. `python3 pipeline/fliser/versjon.py` (versjonsmerkene), commit, publiser.
Til dette er gjort, har ingen bygg `ind` – spillet anslår da typen fra omgivelsene (punkt 2 under), så alt virker også uten.

## 2. Spillet: `spill/industri.js` (regler uten DOM, test `pipeline/fliser/test_industri.js`)

- `Industri.type(bygg, omg)`: `bygg.ind` når dataene har den; ellers navnet (`bygg.navn`/`bygg.industri`, `fraNavn`); ellers en
  **fast trekning med vekter** fra omgivelsene (`vekter(bygg, omg)`, frø = byggets nummer – samme bygg og samme omgivelser gir alltid
  samme svar). REGLER: kai < 400 m og fiskevær (eller < 15 moh.) -> fisk ×8; kai < 260 m -> båt; oljeterminal < 3 km -> olje/gass
  ×5 (30 % gass); kraftverk < 800 m -> kraft ×4; helning > 0,35 -> stein ×3, > 600 moh. -> stein; skogbygd (glissent, 100–750 moh.,
  > 3 km fra kai) -> tømmer ×3 og snekker; naboer med kjent type (`omg.nabo`) trekker; grunnvekter verksted 1,5, lager 1, mat 0,6 …
  Uten omgivelser (Node) som den gamle regelen i interior.js (tre/olje/metall).
- `Industri.kjent(bygg)`, `navn(t)`, `kort(t)`, `tekst(t, forran)` -> «Industri – fiskeforedling».
- `Industri.innredning(t)` -> `[{ type, navn, b, d, h, plass, antall, rom }]` (antall for en hall på 400 m²; plass 'midt' | 'vegg' |
  'rad' | 'rutenett' | 'tak'; rom 'hall' | 'bak').
- `Industri.koble(Interior)` (skjer av seg selv i nettleseren): maskinene inn i `Interior.MØBLER`, oppskriftene (`Industri.OPPSKRIFT`,
  samme form som `MØBELSETT`) inn i `MØBELSETT`, romsettene `ind_<t>` inn i `ROMSETT`; `TYPER.industri.variant` blir industritypen
  (`TYPER.industri.gammelVariant` er den gamle), `TYPER.lager` får varianter (industrilokale bare når dataene har `ind` ≠ 11).
  Variantnavnene: `tre` (1), `olje` (3), `metall` (8) – de gamle, som vakta «interiør» kjenner – ellers `ind<t>`. `Industri.fraPlan(pl)`
  gir typen tilbake fra en plan.
- `Industri.forInfo(info)` / `forBygg(info)` – typen (og navn/innredning) for planens info `{ i, ind, navn, kl, areal, h, moh, tett, X, Y }`.
- **3D-modellene**: `Industri.MODELLER[type] = (m, k, b, d, h, F)` – enkle kasse-modeller (2–8 kasser) for alle de nye maskinene.
  `k(x0, x1, y0, y1, z0, z1, farge, stoff, rund)` i møbelets akser (x langs bredden −b … b, y fra ryggen −d til fronten d, z opp;
  stoff 'glatt' | 'tre' | 'tøy' | 'betong'). `interior3d.js` kaller `Industri.deler(m, k)` for møbeltyper den ikke kjenner.
  **Til hjelperen som lager finere modeller**: bytt ut funksjonen i `Industri.MODELLER` (eller legg typen inn i `switch` i
  `deler()` i interior3d.js – den går foran). Navnene: kantverk, tømmerstabel, transportbånd, tørkeovn, høvelbenk, bordsag, båndsag,
  limpresse, lakkbås, pumpe, gasstank, kompressor, gassflasker, knuser, sikt, grushaug, hjullaster, sløyebenk, filetmaskin,
  frysetunnel, iskar, pakkebord, kokekar, pakkemaskin, stålbenk, kjølereol, dreiebenk, platesaks, esse, ambolt, båtbukk, generator,
  transformator, avfallscontainer, ballepresse, skraphaug, bryggekjele, gjæringstank, tappelinje, fat, reaktor, blandetank,
  sprøytestøper, kjemikalieskap, truck. Mål og visningsnavn: `Industri.MASKINER[type] = [b, d, h, sperrer, navn]`.
- `Industri.ROMSTIL[rolle]` – gulv/vegg/lampe for de nye hallene (interior3d.js `romStil` spør for roller den ikke kjenner).

## 2b. Visningen: `spill/industri-visning.js` (window.IndustriSpill)
- `Industri.omgivelser(info)` (info.X/Y = midten i kartets meter): avstand til oljeterminal (INFRA.olje type 3), kraftverk
  (INFRA.kraft), kai (INFRA.ferjekai + kaiene fra `KaierSpill`: havner/småbåthavner og kaier ≥ 30 m), fiskevær (tettsted under
  3000 innbyggere under 25 moh. innen 3 km), høyden (hoydeVed, ellers hoyde3d) og helningen (80 m ut i fire retninger). Huskes per
  bygg når INFRA og høyden er lest (`IndustriSpill.cache`), så 2D og 3D gir samme type. Skog og naboene er **ikke** med i
  nettleseren ennå (skogen krever lagVindu, naboene ville gjort svaret avhengig av hva som er lastet).
- Huspanelet (`visByggVed`): navnet «Industri – fiskeforedling», «Lager – fiskeforedling», «Lager og logistikk», og hintet sier
  om typen er fra kartdataene eller anslått (`Industri.panelNavn/panelHint`).
- Plantegningen: en linje (`#plan2dind`, `window.PLAN2D_RAD`) «Industri – fiskeforedling · sløyebenk, filetmaskin …» (maskinene
  skjules på telefon); rommene heter Fiskehall, Fryselager osv.
- 2D-tegnet på taket (`byggmerke` i kartflis.js, `INDMERKE`): tømmerstokk (1), oljedråpe (3), flamme (4), fjell (5), fisk (6),
  båt (9), lyn (10) – bare når husdataene har `ind` (bakgrunnstråden har ikke anslaget). Andre typer: tannhjulet som før.

## Fellesfiler endret (små, samlet)
- `index.html`: skript-taggene `industri.js` + `industri-visning.js` rett etter `interior.js`; hus3d: `P.bygg.ind/X/Y` for klassene
  industri og lager (én linje etter `P.bygg = …`); `visByggVed`: navnet (`Industri.panelNavn`) og hintet (`Industri.panelHint`).
- `spill/interior.js`: bare en kommentar i hodet (koblingen skjer fra industri.js).
- `spill/interior3d.js`: `default:` i `deler()` spør `Industri.deler`; `default:` i `romStil` spør `Industri.romStil`; info til
  planen får `ind: B.ind, X: B.X, Y: B.Y`.
- `spill/plantegning.js` (info()): `ind: e.ind, X: o[0], Y: o[1]` – så 2D-modellen får samme industritype som 3D.
- `kartflis.js`: `byggmerke(…, ind)` og `INDMERKE`.

## Prøvd
- `test_bygninger.py` (72 ok), `test_industri.js`, `test_interior.js`, `test_interior_biter.js`, `test_plantegning.js`,
  `test_bygning.js`, `test_kommando.js` – alle ok.
- Nettleser (Dovre-testsiden, PC 1400 × 860 og mobil 390 × 844): vakta `vakter/ut8-industri.js` ok i 2D (ca. 1 s) og i 3D
  (ca. 9 s); vaktene `inne.js` og `ut2-hus2d.js` ok med Industri koblet til. Bilder: plantegningen av et fiskebygg (Fiskehall 443 m² +
  Fryselager, linja vises også på telefon), inne i fiskehallen i 3D (flisgulv, kar med is, sløyebenker), tegnene på taket.
- Feil med vilje: romsettet for fisk byttet til det gamle verkstedet -> vakta feilet («fikk ikke fiskeinnredning»).

## Ikke gjort
- Den ekte byggjobben er ikke kjørt (Geofabrik er stengt herfra) – se «Slik bygger du husdataene på nytt».
- Skog rundt bygget og naboenes type er ikke med i anslaget i nettleseren.
- `#innelapp` (gange.js) sier fortsatt «Industribygg» når du står inne; leting (`leting.js`) gir det samme for alle industribygg.
- Ingen kobling ennå til produksjonen (ta over et sagbruk som fabrikk) – `Industri.IND[t].prod` er klar for det.
- Modellene er enkle kasser (venter på hjelperen med 3D-modeller).
