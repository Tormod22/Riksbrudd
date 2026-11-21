# Pakke «inne» – interiøret

## Runde 15 (21. nov kveld)

Brukerens ønsker: skikkelig takhøyde, gang først (ikke rett inn på et soverom), flere innganger i store bygg, eldre og moderne bygg,
riktig interiør per type (butikk, fjøs, industri, helse, skole, kontor, kirke, hytte) og «systemer for framtiden» – nye typer skal
kunne legges til ved å fylle ut tabeller.

Filer: `site/dovre-fliser/spill/interior.js` (reglene, ingen DOM), `site/dovre-fliser/spill/interior3d.js` (3D),
`pipeline/fliser/test_interior.js` (utvidet), `pipeline/fliser/vakter/inne.js` (ny vakt). `index.html`: bare versjonsmerkene
(versjon.py). Alle tallene er Claudes forslag.

### Systemet (tabellene i interior.js)

| Tabell | Hva den sier |
|---|---|
| `TYPER[klasse]` | planform (`korridor`, `hall`, `bsp`), gangbredde, minste rom, rombredde, bredden på vindfanget/resepsjonen, takhøyde (`[min, maks]` eller `'full'`), stilvekter `[eldre, nyere, moderne]`, romsett, innganger (`bak`, `vare`, `nød` = fra hvor mange m²), og eventuelt `variant(info, frø)` + `varianter` |
| `ROMSETT[navn]` | korridorbygg: `inngang` (rommet døra går inn i), `gang` (korridorens rolle) og `rom` = liste av `{ rolle, velg, min, ellers, fraRom, hver }`; haller: `hall`, `bak` (bakrommet), `for` (forrommet ved døra) |
| `TILGANG[rolle]` | hvilke rom en rolle må ha dør til (soverom og bad: gang, korridor, stue …). Rom som ikke har det, blir kontor/bod |
| `ALDRI_VED_DØR` | roller som aldri får en ytterdør (soverom, bad, beboerrom, sykerom, behandlingsrom, vaskerom) |
| `MØBELSETT[rolle]` | møblene som oppskrift: `['vegg', type, antall, valg]`, `'rad'`, `'rutenett'`, `'midt'`, `'foran'`, `'bord'`, `'seng'`, `'par'` (pult + stol), `'kran'`. Antall kan være en funksjon av arealet |
| `STILER` | eldre/nyere/moderne: gang- og rombredde, hvor i takspennet, vindusbredde og -høyde, `åpen` (0 alle vegger, 1 ingen vegg mellom stue og kjøkken, 2 også åpent mot gangen) |
| `MØBLER` | mål og om møbelet sperrer |

`velg` i ROMSETT: `størst`, `minst`, `nær` (nærmest inngangen), `ved:<rolle>` (vegg i vegg, ellers rett over korridoren), `rest` (alle
som er igjen; for små rom får `ellers`). `fraRom` = bare når bygget har minst så mange rom; `hver` = én per så mange rom.

**Planene.** Korridorplanen (boliger, leiligheter, kontor, skole, helse): en gang/korridor langs byggets lengde, rommene i ett eller to
bånd langs den, hvert rom med én dør til korridoren. Døra går inn i korridoren (dør i gavlen) eller i et vindfang/en resepsjon/et
venterom som er åpent mot den. Brede bygg (bredere enn ca. 2 × DYP + gang, DYP = 7,5 m, skole 9 m) deles i 2–4 skiver med hver
sin korridor og en tverrkorridor ved døra som binder dem sammen (før: sykehjem 46 × 32 m fikk beboerrom på 4 × 15 m). Smale, skjeve eller L-formede bygg der korridoren ikke når alle rom, faller tilbake til den gamle
delingen (`bsp`) – der får boliger gang ved døra når det er flere enn to rom, og TILGANG-regelen rydder opp. Haller: hovedrom +
bakrom (lager, tørkeloft, kontrollrom, sakristi) eller forrom (melkerommet i fjøset når døra er i gavlen).

**Stilen** per bygg: byggeåret når det finnes (`info.år`: før 1965 eldre, før 2005 nyere, ellers moderne), ellers vektene i TYPER
justert for land/by (`info.tett`: under 6 bygg innen 100 m = flere eldre, over 25 = flere moderne), høyde over 14 m, mange hjørner og
stor grunnflate – fast per bygg via hash. Eldre = flere og smalere rom, smale vinduer; nyere = ingen vegg mellom stue og kjøkken;
moderne = stue/kjøkken åpent mot gangen, store, lave vinduer.

**Takhøyde** (`Interior.takhøyde(regel, { vegg, saltak, stilTak, h })`): bolig 2,4–2,7, hytte 2,3–2,5, kontor og skole 3–3,5, butikk
3,2–4, sykehjem 2,6–2,9, sykehus 2,8–3,3, uthus 2,3–3,4, full høyde (opp til taket, høyst 14 m, 0,35 m konstruksjon under flatt tak) i
låve, industri, lager, kirke, hangar og terminal. Aldri over veggtoppen, aldri under 2,2 m. Saltak: himlingen rett under veggtoppen når
veggen er innenfor spennet (+0,35 m). I 3D senkes gulvet (høyst 0,6 m under det høyeste terrenget) heller enn at himlingen kommer under
2,2 m. FUNNET: før var himlingen 1,95 m når gulvet var løftet i en skråning, butikkene 3,4 m uansett, og hallene «høyde − 0,6, høyst 7 m»
– også når veggen var lavere.

**Innganger** (`pl.innganger`, `pl.inngang` = hovedinngangen som før): vareinngang (port 2,6–3,2 m) i bakrommet i butikker, industri og
lager; bakdør fra 100–150 m² (bolig 110, leilighet 140); nødutgang fra 300–500 m². Døra settes midt på (eller litt til siden av) en
ytterkant der ingen skillevegg møter veggen, minst 4 m fra andre dører, og aldri inn i et rom i ALDRI_VED_DØR. 3D: hver dør har åpning,
karm, dørblad og trapp (`i.trapp`), nødutgangen grønt skilt; `Interior.høyde`/`påTrapp` gjelder alle dørene.

**Varianter.** Industri: `tre` (sagbenk, plankestabler, tørkeloft), `metall` (maskinhall, traverskran, sveisebås, stålplater) eller `olje`
(tanker, rørgate, ventiler, kontrollrom) – OSM `industrial`/`craft` eller navnet går foran (sag/tre/olje/gass/mek/stål …), ellers etter
høyden over havet (olje nær sjøen), tetthet og hash. Helse (klassen `sykehus`): `sykehjem` (korridor med beboerrom med seng og eget bad,
dagligstue, vaktrom, kjøkken), `legevakt` (venterom med skranke, behandlingsrom, vaktrom) eller `sykehus` (sykerom og vaktrom) – OSM
`amenity` (nursing_home, clinic, doctors, hospital) går foran, ellers størrelse og høyde. Låven er et fjøs: båsrekker langs langveggene
(gjødselkanal bak, båser, fôrbrett mot fôrgangen), fôrvogn, høyballer, melkerom/melketank; høyloftet og redskapen kommer fortsatt fra
`spill/lave3d.js`.

**Butikken**: kassene på rad rett innenfor fronten ved siden av døra, frukt og grønt like innenfor på den andre siden, reolene i rader
innover fra fronten med 1,9 m gang og en midtgang på tvers, kjøledisker langs bakveggen og én langvegg, lageret bak med vareinngang.

### Slik legges en ny type til (eksempel: «barnehage»)

1. hus3d må gi klassen (bygg-pakka: `klasse()` i index.html, f.eks. `t === 9 && A < 800 ? 'barnehage'`), og `KLASSE.barnehage = { maks: 30, min: 3, tak: 2.8 }`.
2. `TYPER.barnehage = { plan: 'korridor', gang: 1.8, minRom: 3, romB: 5, vindfang: 3, tak: [2.6, 3], stil: [.3, .4, .3], romsett: 'barnehage', inn: { bak: 120, nød: 300 } }`
3. `ROMSETT.barnehage = { inngang: 'garderobe', gang: 'korridor', rom: [{ rolle: 'kjøkken', velg: 'minst', min: 8 }, { rolle: 'stellerom', velg: 'minst', min: 4 }, { rolle: 'lekerom', velg: 'rest', min: 15, ellers: 'bod' }] }`
4. `MØBELSETT.garderobe = [['rad', 'knagger', 8, { fri: .5 }], ['rad', 'benk', 4, { fri: .6 }]]`, `MØBELSETT.lekerom = [['bord', 'spisebord', 6], ['vegg', 'bokhylle', 2], ['vegg', 'plante', 1, { fri: .5 }]]` (nye møbler: legg mål i `MØBLER` og deler i `deler()` i interior3d.js; uten deler blir det en grå kloss).
5. Skal et rom ikke ha ytterdør / bare dør fra gangen: legg rollen i `ALDRI_VED_DØR` / `TILGANG`. Gulv og vegger: `romStil()` i interior3d.js.
6. `node pipeline/fliser/test_interior.js` prøver alle klassene i fire former.

### Hva lederen må gi meg fra hus3d (bygg-pakka eier `hus3d`)

`P.bygg = { i, t, h, kl }` finnes. Planen bruker også disse når de kommer (alle er valgfrie; uten dem gjettes det):
`P.bygg.tett = tettI` (finnes alt i hus3d – én linje), `P.bygg.k = o.e.k` (kjeden), og fra byggjobben (bygninger.py, nye felt i
hus-flisene): `år` (byggeår, OSM `start_date`/`building:year` – sjelden i OSM; matrikkelen har det), `am` (OSM `amenity`, f.eks.
nursing_home, clinic, doctors), `navn` (OSM `name`) og `industri` (OSM `industrial`/`craft`). Interior3d sender dem videre (`info`).

### Prøvd

- `node pipeline/fliser/test_interior.js`: 560 nye prøvebygg (14 klasser × 4 former × 10 størrelser) + de gamle 648: alle rom nås, ingen
  møbler i døråpninger, ingen ytterdør inn i soverom/bad/beboerrom/sykerom, alle soverom/bad har dør til gang/korridor/stue, takhøyden
  innenfor grensene (alle klasser × stiler × saltak/flatt × 10 vegghøyder), alle 321 store bygg har minst to innganger,
  stilene, byggeåret, eldre har flere vegger enn moderne, butikk/fjøs/industri/helse/skole/kontor/kirke/hytte har riktig innhold.
  `test_interior_biter.js`, `test_lave3d.js`, `test_lut.js` ok.
- Vakt `pipeline/fliser/vakter/inne.js` på PC med 3D (2 s): reglene på 15 prøvebygg, prøvehuset 10 × 8 m 7996 trekanter (grensen i
  sjekk.js er 9000), butikken med tre innganger og trapper, ingen byggefeil. Mobil (uten 3D) ok. Feil lagt inn med vilje: boligens
  inngang satt til soverom og kontorets innganger fjernet → vakta meldte 5 brudd; med runde 14-filen → «TYPER mangler». Vakta fant
  ikke en feil jeg laget i 3D underveis (trappa ga «Cannot access 'ute'») – den ble funnet i bildeskriptet; derfor bygger vakta nå
  interiøret i 3D og fanger «interiør:»-advarslene.
- Bilder (scratchpad `natt15/inne/`): `plan-*.png` (romplaner før/etter for 13 bygg, også et bredt sykehjem 46 × 32 m), `for-etter-3d.png` (før/etter i 3D: bolig,
  butikk, fjøs, industri, sykehjem, 1400 × 820), `etter-*-mobil.png` (844 × 390), `etter-butikk.png` (nye reoler).

### Sammenlignet med virkeligheten

- Butikk: Wikimedia Commons, «Category:Interiors of supermarkets in Norway» (f.eks. «Aisle for snack food … in Spar Supermarket in
  Tjøme, Norway 2017-12-05 01.jpg», CC BY-SA). Ekte: hvite metallreoler ca. 2 m med 6–7 hyller, tettpakket med sterke farger, mørk
  prislist i hyllekanten, skilt over gangene, lyst terrazzogulv, lysrør. Spillet før: reolene så ut som bokhyller (smale «bøker» i
  dempede tøyfarger, store hull). Nå: hvit bakplate, prislist, 5 hyller, varer i grupper i sterke pakkefarger (gruppert for å holde
  trekantene nede). Skilt over gangene er IKKE laget.
- Fjøs: norske båsfjøs (2005: 88 % av kyrne på bås; NIBIO/«Tie stall» på Wikipedia) har to rader båser mot en fôrgang, gjødselkanal bak
  kyrne – slik er det lagt opp nå. Kyr inne i fjøset er ikke laget (dyrene finnes bare ute, spill/dyr3d.js).

### IKKE gjort / gjenstår

- L- og T-formede boliger bruker fortsatt den gamle delingen (korridoren når ikke alle rom); TILGANG-regelen gjør da noen rom til
  kontor/bod.
- Bare første etasje. Ingen kyr i fjøset, ingen gangskilt i butikken, traverskranen har ingen skinner langs veggene.
- Hus3d tegner fortsatt bare én dør utenfra; de andre dørene er en mørk åpning i veggen sett utenfra (interiørets eget nett).
