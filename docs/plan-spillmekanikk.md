# Plan: forsyning, olje, infrastruktur og detaljnivå

Skrevet 8. nov 2026. Brukeren vil ha **alt** fra WarFront (Shu'la Lab, Steam, ut 29.1.2027:
https://store.steampowered.com/app/5344530/WarFront/), **også detaljnivået**: olje som eneste penger, lastebiler på ekte veger,
bruer og veger som kan sprenges, ingeniører, garnisoner i tettsteder, speidere/radar/drone, mange enhetstyper, tåke med
«spøkelser», kampanje på ekte kart.

**Inspirasjon, ikke kopi:** vi tar sjangergrepene (forsyningslinjer, sprenging, tåke). Ikke navn, grafikk, lyd, kart eller tekst.
Riksbrudd har sitt eget: det ekte Norge 2023, politiske fraksjoner, stil 1, og zoom fra hele landet til hver soldat.

## Hvorfor dette passer Norge
- **Få veger, mange flaskehalser:** én E6, smale dalfører, lange tunneler, store bruer. Én sprengt bru kan kutte en landsdel.
- **Ferjer** binder Vestlandet og Nord-Norge sammen. Den som holder ferjekaiene, styrer kysten.
- **Ekte olje og kraft:** Nordsjøfeltene, ilandføringsterminalene (Mongstad, Kårstø, Sture, Kollsnes) og ca. 1 900 vannkraftverk.

## Åpne data (sjekket 8. nov)
| Hva | Kilde | Notat |
|---|---|---|
| Bruer | NVDB vegobjekttype 60 `Bru` | navn, byggeår, lengde – flaskehalser som kan sprenges |
| Tunneler | NVDB 581 `Tunnel`, 67 `Tunnelløp`, 69 `Tunnelportal` | åpningsår, lengde; portalene kan sperres |
| Ferjer | NVDB 770 `Ferjesamband`, 64 `Ferjekai`, 41 `Ferjeoppstillingsplass` | sambandene blir «sjøveger» |
| Olje og gass | Sokkeldirektoratet FactMaps: `field`, `facility`, `pipeline`, `wellbore` | plattformer, rør, felt |
| Kraft | NVE `GetHydroPowerPlantsInOperation` (1 866 verk, ytelse, byggeår) | demninger kan sprenges |
| Tettsteder | SSB tettsteder (Geonorge) | garnisoner, rekruttering, folketall |
| Veger, bygg, terreng | finnes allerede (NVDB 2023, OSM, Kartverket, Sentinel-2) | |
| Militære leirer | ikke åpne som data | lages som spillinnhold (oppdiktede baser på trygge steder) |

## Mekanikken
1. **Olje er pengene.** Oljen kommer fra oljefelt (offshore, via rør til terminal) og fra lagre/raffinerier på land.
   Den må **kjøres** fra terminal til base med lastebiler som følger NVDB-vegnettet, inkludert ferjer.
2. **Forsyning:** enheter trenger drivstoff og ammunisjon. Uten forsyning går de saktere, skyter mindre og kan ikke bygges.
3. **Infrastruktur kan ødelegges og repareres:** bruer, tunneler (portalene), ferjekaier, veger (krater), demninger
   (oversvømmer dalen nedenfor, beregnet fra høydemodellen), kraftverk (strøm til byene → produksjon).
   **Ingeniører** sprenger, reparerer, graver skyttergraver og legger miner.
4. **Rutesøket** bruker vegnettet som graf (A* på NVDB-lenker) for kjøretøy, og terrengrutene vi har for infanteri.
   Ødelagte bruer og tunneler fjernes fra grafen, så lastebilene finner omveier (eller ingen vei).
5. **Garnisoner:** lag i et tettsted gjør det til ditt; tettsteder reparerer kjøretøy, rekrutterer og bygger raskere etter størrelse.
6. **Speiding:** speiderbil, radar (fast, lang rekkevidde over åpen mark), drone (kort levetid, ser over fjell).
   Tåken med «sist sett» finnes allerede – utvides til alle enheter og bygninger.
7. **Enheter:** infanterilag (finnes), speiderbil, lastebil, ingeniører, stridsvogn, rakettartilleri, luftlandsatte,
   fartøy på sjø og fjord (Sjøforsvaret: fregatt, MTB), fly/helikopter senere. Ingen atomvåpen (passer ikke tonen) – brukeren avgjør.
8. **Kampanje på ekte kart:** for eksempel Mongstad, E6 over Dovre, Tromsøbrua, Ofotbanen/Narvik, Nordsjøen.

## Detaljnivået
WarFront viser hver lastebil, hver bro og hver eksplosjon. Hos oss, i stil 1:
- **Kjøretøy synlige på vegene** (lastebilkolonner, speiderbiler), med retning og fart, også når man zoomer ut (som symboler).
- **Bruer, tunnelportaler og ferjekaier tegnet** i kartet, med tilstand (hel, skadet, sprengt) og røyk/brann.
- **Eksplosjoner, røyk, kratere og brannruiner** i 2D og 3D; ødelagte bygg vises (OSM-omrissene) som ruiner.
- **Plattformer og rørledninger** i Nordsjøen; **demninger** med magasin.
- **Lyd**: ekte opptak (WarFront fremhever det) – åpne lydbanker (CC0) eller egne opptak.
- Stil 1 beholdes (mørkt operasjonsrom), men med flere små, levende detaljer. Pikselgrafikk er WarFronts stil, ikke vår.

## Hva som må til teknisk
- **Server (Colyseus, fra HANDOFF):** med forsyning, lastebiler og ødeleggelse må én autoritativ simulering kjøre for alle.
  Den bruker `terreng.js` og de samme flisene. Aktive vinduer (bare der det skjer noe).
- **Infrastruktur som eget lag** (`infra.pmtiles`, MVT): bruer, tunneler, ferjer, kraftverk, oljeinnretninger, rør, tettsteder,
  med ID-er som serveren bruker for tilstand (sprengt/hel). Bygges i GitHub som byggomrissene.
- **Vegnettet som graf** for hele Norge (noder/lenker fra NVDB) – kompakt binærfil, ca. 1–2 mill. lenker.

## Faser (forslag)
| Fase | Innhold |
|---|---|
| A | **Infrastruktur-laget**: bruer, tunneler, ferjer, kraftverk, olje, tettsteder for hele Norge, tegnet i kartet – **gjort 8. nov** (se under) |
| B | **Vegnett som graf** + lastebiler som kjører langs vegene (også ferjer), synlige på kartet |
| C | **Olje-økonomi**: felt → terminal → lastebil → base; forsyning til enhetene |
| D | **Ødeleggelse og ingeniører**: sprenge/reparere bruer, tunneler, veger, demninger (flom fra høydemodellen) |
| E | **Flere enheter**: speiderbil, stridsvogn, artilleri, radar, drone, luftlandsatte, fartøy |
| F | **Garnisoner og tettsteder**, fraksjonene på hele kartet, AI-motstandere |
| G | **Server og flerspiller** |
| H | **Kampanje** på ekte steder; lyd |

## Åpne spørsmål til brukeren
1. Stil: beholde stil 1 (mørkt, realistisk) med mer detalj – eller gå mot WarFronts pikselstil?
2. Atomvåpen og massevåpen: med eller ikke?
3. Kampanje først eller fritt spill på hele kartet først?

## Fase A – gjort 8. nov 2026
- `pipeline/fliser/infra.py` -> `infra.json` (én fil, ca. 4 MB / 1,5 MB pakket), release `kart-infra-2023-<hash>` (Actions -> «Bygg infrastruktur»).
- Innhold 2023: ca. 14 800 bruer (veg, gang/sykkel, jernbane; ikke kulverter), 1 500 tunnelløp (endene = portaler), 137 ferjesamband,
  342 ferjekaier, 1 890 vannkraftverk, 3 260 dammer, 1 500 magasin, 780 olje-/gassinnretninger (plattformer, havbunn, flytende,
  terminaler som Mongstad, Kårstø, Sture, Kollsnes), 69 rørledninger, 141 felt, 990 tettsteder med folketall.
- Hvert objekt har kildens egen id (NVDB, NVE, Sodir npdid, SSB tettstedsnr.): grunnlaget for tilstand (hel/skadet/sprengt) i fase D.
- Visningen tegner laget oppå kartet, viktigst først når man zoomer ut (lange bruer og tunneler, store kraftverk, byer); trykk gir info.
- Ikke gjort ennå: lag i 3D, Svalbard, jernbane (Bane NOR-data) og bru-/tunneltilstand.
