# ut5-bors – fase Ø7: investere i andre selskaper, investorer og Gråbørsen

28. nov, gren `claude/ut5-bors`. Plan: `docs/plan-selskap-okonomi.md` kapittel 9 og 10, Ø7 i kapittel 16. **Alle tall er Claudes forslag**
(samlet i `Bors.REGLER` i `spill/bors.js`, og `MB`/`KR` i `pipeline/fliser/okosim-bors.js`).

Kapittel 18, spørsmål 3 og 4: **forslagene er brukt** – navnet «Gråbørsen», notering fra nivå 4 (Ettertraktet), og en rival KAN kjøpe opp
selskapet ditt (da har rivalen vunnet på «penger»).

## Filer

| Fil | Hva |
|---|---|
| `site/dovre-fliser/spill/bors.js` (ny) | Reglene uten DOM (`window.Bors`): verdier, kurs, stemning, andeler, notering, utbytte, emisjon, tilbakekjøp, rivalene, investorer, ønsker/krav, lån, døgnet, `seierInn`, lagring. |
| `site/dovre-fliser/spill/bors-visning.js` (ny) | `window.BorsSpill`: tilstand per leir (`riksbrudd-bors`), verdiene fra spillet, døgnet, kommandoene, fanen Eiere, flisene i Oversikt, kursgrafen, Neste-lappen, telefonen. |
| `pipeline/fliser/test_bors.js` (ny) | Regeltest, 62 sjekker (også `Seier.penger` med børsen). |
| `pipeline/fliser/okosim-bors.js` (ny) | Økonomitesten: «børs tidlig» og «kontrakter + andeler», kravene «børsen». |
| `pipeline/fliser/vakter/ut5-bors.js` (ny) | Vakta (ca. 0,6 s). |
| `docs/natt/ut5-bors-hjelp.json` (ny) | Tre hjelpeemner («Lag og strid»). |

## Reglene (Bors)

- **Verdier.** Firma: grunnverdi per firma (Storlia 20 mill., Dalsnes 22, Tindvik 18, Brattli 16, Gråfjell 14, Ytterø 12, Kvernhaug 10, nye 6)
  × økonomien (helsa fra `firma.js`, normalisert til 1 ved helse 68) × trygghet (rival eier hjemstedet × 0,6, fiende innen 3 km × 0,85, innen 8 km × 0,95,
  kamp × 0,9) × handel (+2 % per levert kontrakt for dem, høyst +30 %). Konkurs = 0. Resultat per uke = 5 % av verdien × (frisk 1, presset 0,4, konkurstruet 0).
  Ditt selskap: eiendelene (kassa, bygg, lager, kjøretøy – `SeierSpill.minVerdi`) + andelene i andre + **ukas resultat** (dagboka over pengene, uten
  postene «børs og investorer» og «annet», ellers ville en notering løftet kursen igjen), × trygghet (−5 % per angrep på leiren siste uke, høyst −20 %).
  Rivalene: anslaget fra `Seier.rivalVerdi`.
- **Kurs** per andel = verdi / 100 × stemning (0,5–1,8). Stemningen drar 15 % mot 1 hvert døgn og endres av: levert kontrakt +1 %, ny by +3 %, tapt by −4 %,
  lag slått ut +0,5 %, eksportordre +1 %, brudd −5 %, angrep −4 %, «nei» til en eier −5 %, utbytte uteblitt −8 % (delvis betalt: forholdsvis), betalt +1 %,
  ønske holdt +2 % / brutt −3 %. (Økonomitesten viste at +3 % per levert og 8 % tilbake ga en stemning fast på ca. 1,6 – justert.)
- **Andeler i firmaene** (nivå 3): kjøp til kursen + 4 %, salg − 4 %. 10 % = 5 % rabatt (`Firma.rabatt`: felles anlegg og teknologi) + innsyn
  (kontraktene deres og helsa i fanen); 25 % = førsterett (tilbudene deres får `k.fast` – rivalene tar dem ikke); over 50 % = dere eier firmaet: hver
  morgen resultatet/7 × andelen, og varer fra hjemstedet (`REGLER.firma.varer`: Storlia 6 m³ tømmer, Kvernhaug 30 mat, Tindvik 400 l diesel som kroner,
  osv.). Ellers utbytte hver 7. døgn = 80 % av resultatet × andelen.
- **Rivalene i firmaene**: hver rival har 25 % sjanse per døgn for å kjøpe 2–5 % i et firma (Storlia teller tre ganger). Over 50 % = rivalen eier firmaet
  (`Firma.eierSkifte`: fast kunde og vern tar slutt, en felles anleggsdel går til rivalen), firmaet tilbyr ikke samarbeid, og `Selskap.firmaKilde` tar
  det bort fra tilbudene.
- **Notering** (nivå 4): 10–40 %, dere må beholde over 50 %. Investorene betaler kursen − 15 %. Kursen og fritt omsatte andeler fra da.
- **Utbytte**: eierne utenfra (børsen og investorer med andel) venter 1,5 % av sin del av børsverdien hver uke. Ikke betalt = stemningen ned og investorene
  misfornøyde. Utbyttet kan betales i fanen (kommando `borsUtbytte`).
- **Emisjon**: 5–15 % nye andeler om gangen (alle eier en mindre del), pris kursen − 12 %; ikke under 35 % egne. Under 50 % = varsel i loggen.
- **Tilbakekjøp**: fra børsen, kursen + 6 %.
- **Rivalene på børsen**: 40 % av deres andeler er på børsen. Dere kan kjøpe (2 % om gangen). De kjøper av de frie andelene i dere: 20 % sjanse per døgn
  per rival (× 2 når dere eier under halvparten, × 1,5 når stemningen er under 0,8), 1–3 % om gangen. Misfornøyde investorer (under 25) selger hele
  andelen til en rival. **Fiendtlig oppkjøp**: en rival over 50 % = `B.meg.oppkjøpt` – børsen stenges for dere, og seier-veien «penger» gir rivalen seieren
  (tapskortet «Ravnsund har kjøpt opp …»). Med 40 % notert og ingen emisjon kan ingen rival komme over 50 % (de kan få høyst 40) – det er emisjon,
  misfornøyde investorer og mislighold av lån som åpner for oppkjøp.
- **Ryktespredning** (valgfritt, lite): 250 000 kr, rivalens stemning −8 %, «pålitelig» −2.
- **Investorene** (fra nivå 3, oppdiktede): Aurelio Brandt (rederi-eier i Valletta) 10 % for kursen, ønske avkastning; Grenvik Säkerhet AB (svensk
  sikkerhetsfirma) lån 12 mill. kr til 2 % per uke i 4 uker, ønske «hold dere unna Ravnsund»; Fond 7 (anonymt) 16 %, ønske «lever en
  eskorte-/hold-/rydd-/redning-kontrakt». Én henvendelse per døgn med 35 % sjanse, i den rekkefølgen. Ønskene: avkastning (betal minst det eierne venter
  denne uka, 7 døgn), ro (ingen angrep på leiren, 5 døgn), unna (ingen kamp med rivalen, 7 døgn – registreres via `KROKER.ild`), kontrakt (8 døgn).
  Holdt: fornøyd +15, brutt −20. Renter trekkes hver uke; kan de ikke betales, tar långiveren andeler til kursen.
- **Aktive eiere** (investor over 15 %): et nytt krav hver uke (samme typer som ønskene). «Si nei» koster −10 i tilfredshet og −5 % stemning.

## Seier (seier.js, «penger»)
`Seier.penger(verdier, side, tid, R, o)` – nytt femte ledd `o` = `Bors.seierInn`: `{ oppkjøpt: { blå: 'rød' }, rivalAndel: { blå: 35 }, børs: true }`.
Kjøpt opp = 0 % og «Selskapet er kjøpt opp av …»; rivalen som kjøpte, har nådd «penger» (når `tidligst` er passert). Nytt krav: ingen rival kan eie
`REGLER.penger.trygg` = 30 % eller mer av deg når du vinner. Verdiene: din del (børsverdien × andelen dere eier selv) og rivalenes del (100 − det dere eier
i dem). `seier-visning.js` bruker `BorsSpill.seierInn()` når den finnes; uten børsen er alt som før (test_seier.js er urørt og grønn).

## Økonomitesten – valget om grensa
Grensa på 200 mill. gjelder fortsatt **kassa** (den felles kontrollen, for alle strategiene). I tillegg (kravene «børsen»): **din del av børsverdien**
dag 30 skal ha median under penger-målet (250 mill.) og høyst 10 % av kjøringene over, og «børs tidlig» skal ikke ende med mer verdi enn
«kontrakter + andeler» (høyst × 1,05) – en notering gir penger på én gang, men dere eier en mindre del.
Resultat (60 frø): «børs tidlig» noterer i 97 % (snitt dag 13,7, 26,5 mill. i median), kassa dag 30 median 135 mill., høyst 199,5 (100 frø: høyst 195,7),
din del 121 mill.; «kontrakter + andeler» kassa 97 mill. (mot 103 for «bare kontrakter»), utbytte i 95 % (median 1,2 mill.), Storlia eid i 88 %,
din del 174 mill. (1 av 60 over 250). Ingen oppkjøp. Båndene for de to nye strategiene er lagt til i `okonomitest-band.json` (de andre urørt).
**FUNNET:** modulene deler én tilfeldighet (`Tilfeldig.verden`) som ikke settes på nytt per kjøring, så en ny strategi forskjøv tallene til strategiene etter
den (eksporten gikk fra 99 til 85 mill. og feilet «eksporten koster ikke» uten at noe i den var endret). Børsstrategiene setter derfor tilfeldigheten
tilbake etter hver kjøring (`Tilf.lagre/les` i okosim-bors.js). En varig retting er `Tilfeldig.nyVerden(frø)` i `okosim.kjør` – endrer alle båndene, ikke gjort.

## Fellesfiler endret (nøyaktig)
- `site/dovre-fliser/index.html`: to skript-tagger rett etter `firma-visning.js` (`bors.js`, `bors-visning.js`) + `versjon.py`.
- `spill/firma.js` (merket «ut5-bors»): `api.rabatt` (krok, standard null = som før) brukes i `vilkår('felles').pris` og `brukTekno(...).pris`;
  `eierSkifte(F, f, side)`; `kanSamarbeid` sier nei når en rival eier firmaet; `døgn` ringer ikke om samarbeid da; `fraJSON` tar med `eier`. test_firma grønn.
- `spill/seier.js`: `penger(…, o)` (over), `REGLER.penger.trygg`, `alle` sender `inn.børs`, `avis` har teksten for oppkjøp. `spill/seier-visning.js`: `bilde()`
  bruker `BorsSpill.seierInn()`, `vis()` sender `oppkjøp`/`børs` til avisa.
- `spill/selskapspanel.js`: fanen Eiere er ikke «kommer» når BorsSpill finnes, `tegn` spør `BorsSpill.fane()` og kaller `BorsSpill.etter(kropp)` (grafen),
  klikk på `[data-sp^="bo-"]` går til `BorsSpill.trykk`, og `oversikt()` har to fliser «Verdi» og «Kurs» (`BorsSpill.flisLinjer()`).
- `spill/neste.js`: `window.NESTE_KILDER` (generell krok: andre moduler kan legge til en linje), ny prioritet `investor: 48` og navnet «Investor».
- `spill/penger-visning.js`: én linje i `HVA` – filene `bors*` blir posten «børs og investorer» i dagboka.

## Kommandoer (KOMMANDO)
`borsKjøp { navn, n }`, `borsSelg { navn, n }`, `borsNoter { p }`, `borsUtbytte { kr }`, `borsEmisjon { q }`, `borsTilbakekjøp { n }`,
`borsRival { side, n, salg }`, `borsRykte { side }`, `borsInvestor { id, ja }`, `borsKrav { id }`. Alle knappene i fanen går gjennom dem.

## API (window.BorsSpill)
`test` (true = døgnet og telefonen også under webdriver), `tilstand()`, `sett(d)`, `nullstill()`, `start()`, `lagre()`, `døgn(tving)`, `kurser()`,
`seierInn()`, `fane()`, `etter(el)`, `trykk(knapp)`, `flisLinjer()`, `klar()`, `kamp` (sist dere skjøt med hver rival), `NØKKEL`, `rett`.
Kursgrafen: serier `kursMeg`, `kursRød`, `kursGrønn` i grafen `kurs` (StatistikkSpill – også i Statistikk-panelet).

## Prøvd
- `node pipeline/fliser/test_bors.js` (62), test_seier, test_firma, test_neste, test_kommando, test_selskapsbilde, test_dagbok og `test_okonomitest.js`
  (grønn, også med `OKO_FRO=100` for grensa).
- Nettleser, Dovre-testsiden, PC 1400 × 860 og mobil 390 × 844: fanen Eiere (kurs, graf, eierstolpe, notering, utbytte, emisjon/tilbakekjøp, investorer
  med ja/nei og ønsker, andeler i firmaene med innsyn og knapper, rivalene), flisene i Oversikt, tapskortet etter et oppkjøp («Ravnsund har kjøpt opp Har»).
  Med `BorsSpill.test = true`: dagskiftet i spilløkka kjører døgnet, tre investorer ringer (`riksbrudd-telefon`), rivalene kjøper i Storlia og andre,
  investorens ønske står i Neste-lappen. 0 sidefeil. Bilder sett.
- Vakta `pipeline/fliser/vakter/ut5-bors.js`: ok på PC og mobil (ca. 0,6 s), setter alt tilbake (kasse, tid, børsen, firmaene, selskapet, seieren, lagringen).
  Med en feil lagt inn med vilje (`Firma.rabatt` alltid 1) sa den «10 % gir ikke rabatt (3000000 -> 3000000)».
- I samme side etter vakta: ut2-seier, ut4-firmaer, ut4-eksport ok. **ut1-selskap feiler («Byer viser ingenting») – også før denne pakka (se ut4-firmaer.md).**

## IKKE gjort / forenklet
- Rivalene bruker ikke børsen smart (Ø8): de kjøper tilfeldig, betaler ikke utbytte, noterer ikke selv (de er notert fra start med 40 % fritt).
- Et firma dere eier blir ikke et eget anlegg/folk i leiren – bare resultatet og varene fra hjemstedet hver morgen.
- Aktive eiere krever ikke «ny leder i en tropp» eller «selg et anlegg» – kravene er de samme fire typene som ønskene.
- Innsidehandel er ikke laget (bare ryktespredning). Den gamle svartebørsen i `region.js` er ikke flyttet hit.
- Henvendelser fra investorer går ikke ut på tid; en investor som sa nei eller solgte, ringer ikke igjen.
- Kursen for firmaene har egen stemning i tilstanden, men den endres ikke ennå (verdien følger krigen og helsa).
- Statistikken tar kursen som snitt gjennom døgnet (en notering midt i døgnet gir et snitt mellom før og etter).
