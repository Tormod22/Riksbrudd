# ut2-sagbruk – fase Ø1: varer og sagbruk

28. nov, gren `claude/ut2-sagbruk`. Plan: `docs/plan-selskap-okonomi.md` kapittel 4 (hele), 13.2 (bakgrunn), Ø1 i kapittel 16.
Spørsmål 1 i kapittel 18 er besvart med planens forslag: **«tre» i leiren er nå PLANKER, hogst gir TØMMER som må sages – eller
selges billig.** Alle tall som ikke står i planen, er Claudes forslag (samlet i `Produksjon.REGLER` og kommentert der de står).

## Hva som er laget

### 1. Varene
- `Leir.MATERIALER` (leir.js): `tre` heter nå **«Planker»** for spilleren. **Nøkkelen er fortsatt `tre`** (valgt for ikke å ødelegge
  lagringer, bygg, kontrakter, marked og tester). Nye varer med egen lagerplass (samme `Leir.lagerplass` som de andre):
  **tømmer** (8 000 kr/m³, planen), **flis** (3 000 kr/m³) og **ved** (9 000 kr/m³) – flis og ved er Claudes forslag.
  `Leir.ny().lager` har dem; gamle lagringer får 0 (fraJSON slår sammen). De vises i Leir → Lager med +10 / Selg 10 som de andre,
  og kjøp/salg går gjennom de vanlige kommandoene (`kjøpMateriale`/`selgMateriale`).
- **Markedet** (`spillet.js`, `Marked`): tømmer, flis og ved er varer som de andre (pris som flytter seg, inflasjon, hyller, påslag 1,5
  ved kjøp, salg 80 % av markedsprisen). Claudes forslag: hyller tømmer 80/30, flis 40/15, ved 40/12 (maks/fyll per døgn); markedet
  kjøper høyst 40 m³ tømmer, 30 flis, 20 ved per døgn. Et lagret marked uten de nye varene får faktor 1 (ingen NaN).
  `spillet-visning.js`: grunnprisene og `settPriser` tar med de tre.
- **Hogst** (`ressurser.js`): `hogstUtbytte` gir `mat.tømmer` (samme m³ per m² og per arbeidstime som før). Riving gir fortsatt
  planker/betong/stål. Gamle hogstfelt i en lagring (`mat.tre`) gir planker som før. `Ressurser.MAT` har `tømmer`.
- Tekster: «Hogst – Feller trær og gir tømmer» (folk.js), mål «Ha 20 m³ planker på lager» (maal.js), «Sikre huset (3 m³ planker)»
  (overlev.js), flistips sTre = «Planker». IKKE endret (fordi `sjekk.js`/vakter leser teksten): morgenmøtet og handelsmannen
  (`morgen.js`/`morgen-visning.js`, vakten `morgen` krever «Legg av … m³ tre»), leting (`leting.js`, test_leting krever «m³ tre»),
  region.js, spillet.js (bytteTekst), penger-visning.js, spill2d.js. Disse sier fortsatt «tre» – bør endres samtidig med testene.

### 2. Maskinene (`spill/produksjon.js` + `spill/produksjon-visning.js`, test `pipeline/fliser/test_produksjon.js`)
Nye bygg i `Leir.BYGG` (leir.js, `maskin: true`): **sagbruk** (6 mill., 15 kW, modell «verksted»), **vedkløyver** (0,8 mill., 3 kW,
modell «container»), **fyrkjele** (4 mill., 0 kW – gir strøm, modell «aggregat»). Byggetid og materialer er Claudes forslag. De står i
byggelista under «Produksjon» (`LEIR2_GRUPPER`), har ikon (`Ikoner.BYGG`: sag/kloyver/kjele, CSS fra produksjon-visning.js),
2D-stil (leir2d.js `STIL`), tegning (tegninger.js) og virkningstekst (leirvirkning.js).

| Maskin | Inn per time | Ut per time | Folk | Strøm |
|---|---|---|---|---|
| Sagbruk | 2 m³ tømmer | 1,1 m³ planker + 0,7 m³ flis | 3 | 15 kW |
| Vedkløyver | 0,6 m³ flis | 0,5 m³ ved | 1 | 3 kW |
| Fyrkjele | 0,5 m³ flis (ellers 0,35 m³ ved) | 30 kW + varme til 3 fyringssteder | 1 | gir 30 kW |

- **Folk**: ny oppgave **«maskin»** (Maskiner) i `FolkRegler.OPPGAVER` (før «fri»). Arbeidskraften = antall × tempo (ferdighet, moral,
  helse og døgnplanen fra jobbtavla) fordeles fyrkjele → sagbruk → vedkløyver; færre folk = lavere fart. Maskinferdigheten trekker
  IKKE et nytt tilfeldig tall (snittet av bygg og verksted), så alle gjenger fra et frø er som før.
- **Jobbtavla**: jobbtypen «maskin» (`Jobber.TYPER`, produksjonsjobb som følger døgnplanen, standard «to skift», prioritet 3).
  Plassene kommer fra kroken `Jobber.maskiner` (summen av folk maskinene trenger); står ALLE maskinene for råvare/plass/av, er jobben
  sperret med grunnen (folkene sendes ikke dit).
- **Grunnene** (sjekket i denne rekkefølgen): «slått av», «ødelagt», «lageret fullt», «tom for tømmer / flis / brensel», «ingen folk»,
  «uten strøm»; delvis drift: «går 64 % – for få folk», «– lite tømmer», «– slitt, halv fart». Timene telles per grunn (`P.sto`).
- **Strøm**: `Leir.hviler` (ny krok i `Leir.steg`): en maskin som står, tar ikke strøm. `Leir.maskinKW` (ny krok): kjelens kW legges
  til nettet i `Leir.steg`, og steget gir `maskin` (kW fra kjelene) ved siden av `nett`. Sagbruk og vedkløyver står sist i `PRIORITET`.
  Med bare startaggregatet (20 kW) og kontrollrommet får saga IKKE strøm – kjelen må startes med litt flis (kjøpes i Lager). Det er med vilje.
- **Varme**: `FolkRegler.varmeAndel` (ny krok i folk.js): kjelene dekker fyringen først, så **ved** fra lageret, så planker (som før),
  så diesel. Uten kjele og ved er regnestykket nøyaktig som før.
- **Slitasje**: 0,0015 hp per driftstime (halvslitt etter ca. 14 døgn i full drift); under halv hp går maskinen med halv fart og
  grunnen «slitt – må repareres». Reparasjon som andre bygg (byggpanelet/verkstedet).
- **Kommando** `maskin { bygg, av }` (registrert fra produksjon-visning.js) slår en maskin av/på; folk flyttes med den vanlige `folkFlytt`.
- Stopp meldes én gang i loggen («Sagbruk står: tom for tømmer.»), og «… går igjen.».
- Tellingene lagres per leir i `riksbrudd-produksjon` (`{ leir, P: { laget, brukt, sto, gikk } }`).
- 2D: over hver maskin et lite tall («1,1 m³/t», «30 kW»), grønt når den går; zoomet inn står grunnen under. 3D: sagbruket er
  verkstedhallen med to tømmerstabler (LEIR2.tømmer) og en flishaug på plassen foran (`MODELLER.LEIR2.sagbruk`, lagt inn fra
  produksjon-visning.js; uten modeller-leir2.js brukes verkstedet). Vedkløyveren er en container, fyrkjelen et aggregat (gjenbrukt).
- KVALITET (planen 4.3): snittferdigheten til dem på «maskin» over 1,2 gir 10 % mer ut av sagbruk og vedkløyver (`REGLER.kvalitet`).

### 3. Tømmerbil
`Kjoretoy.TYPER.tømmerbil` (kopi av lastebilen, 70 km/t, 13 m; settes fra produksjon-visning.js). Kjøpes i fanen Produksjon
(2,5 mill., `Produksjon.REGLER.tømmerbil.pris`). `Ressurser.lastebil` tar også tømmerbil (bare hogstfelt), last 20 m³
(`Ressurser.REGLER.tømmerbil.last`). `ressurser-visning.js`: til hogst velges en ledig tømmerbil før lastebiler. 3D bruker
lastebilmodellen. **Prøvd i Node (test_ressurser), kjøpt i nettleseren, men ikke kjørt en tur i nettleseren** (testsiden har ikke vegnettet).

### 4. Fanen Produksjon i Selskapet
`selskapspanel.js` (bare tegn() og fanens klasse): fanen viser `ProduksjonSpill.html()` og kaller `ProduksjonSpill.etter(kropp)`.
Innholdet: hver maskin som rad (oppskrift, folk x av n, strøm, slitasje, tilstand/grunn, Slå av/på), lageret for tømmer, planker,
flis og ved, folk på «Maskiner» med − / +, «Laget hittil» (og verdien mot tømmeret), «Maskinene sto» per grunn, grafene
**Produksjon per døgn** (planker, flis, ved) og **Hvorfor saga sto** (tom, ingen folk, uten strøm, fullt, slitt – timer per døgn) via
`StatistikkSpill.leggTilKilde`, og knappene «Bygg en maskin» og «Kjøp tømmerbil». Fanen er ikke lenger «kommer».

### 5. Økonomitesten (`pipeline/fliser/okosim-sagbruk.js`)
- Del `sagbruk` (maskinene time for time med Produksjon.steg, krokene for strøm/varme, salg av planker/flis/ved om morgenen;
  flis til ett døgn i kjelen beholdes) og strategiene **«bare sagbruk»** (sagbruk + fyrkjele + tømmerbil; 4 på maskinene, 2 på hogst)
  og **«kontrakter + sagbruk»** (som «bare kontrakter» + fire rekrutter til saga og hogst). Maskinene repareres under 60 % hp.
- `okosim-hogst.js`: hogsten gir tømmer (med tømmerbil fraktes det med bil), «hogst og salg» selger tømmer.
- `okosim.js`: én liten krok – `d.slutt(sim, res)` lar en del legge egne tall i resultatet.
- `test_okonomitest.js`: nye KJENT-linjer (se under). Båndet er lagret på nytt (`OKO_NYTT_BAND=1`) fordi «hogst og salg» flyttet seg
  med vilje (salget 13,1 -> 7,3 mill. på 30 døgn: tømmer er billig).
- **Kravet fra planen**: et sagbruk i full drift lager 26,4 m³ planker + 16,8 m³ flis av 48 m³ tømmer i døgnet. Verdien over tømmeret
  (til salgspris 80 %) er **155 500 kr i døgnet = 1,04 × lønna til ti** (150 000 kr). Kravet er 0,7–1,4. Ingen tall måtte justeres.
  «Ikke mer» holdes også av markedet: det kjøper høyst 25 m³ planker i døgnet (ca. 0,4 mill. kr).

Resultat (60 frø, sommer, kassa i mill. kr, median [10–90 %]):

| strategi | dag 1 | dag 5 | dag 10 | dag 20 | dag 30 |
|---|---|---|---|---|---|
| gjør ingenting | 17 | 19 | 14 [9–23] | 1 | 0 |
| hogst og salg | 18 | 20 | 14 [9–25] | 3 | 0 [0–7] |
| **bare sagbruk** | 17 | 4 [2–5] | 5 [2–11] | 0 [0–3] | 0 |
| bare kontrakter | 22 | 51 | 115 | 255 | 448 [349–529] |
| **kontrakter + sagbruk** | 16 | 28 | 101 | 260 | 432 [322–540] |

- «Bare sagbruk»: saga går 94 % av tida når den er klar, selger planker for ca. 0,4 mill. kr i døgnet (10,3 mill. på 30 døgn), men
  saga, kjele og tømmerbil koster 15 mill. oppå startleiren (21 mill.) – kassa er ca. 2 mill. på dag 3, røverne herjer uten tropp
  (35 av 41 bølger), folk drar, og leiren er blakk rundt dag 15–20. Sagbruket alene fra første dag bærer altså ikke leiren – som
  planen sier (trinn 2: kontrakter først). Står i KJENT.
- «Kontrakter + sagbruk» ender litt under «bare kontrakter»: de fire rekruttene på saga tar sengene troppen ellers ville fylt (færre
  kontrakter), og kontraktene er så sterke (funn 1 i ut1-okotest.md) at saga ikke synes. Når kontraktene settes ned, bør dette prøves igjen.
- Kjelen sparer mye diesel: 30 kW fra 0,5 m³ flis i timen (ca. 1 200 kr) mot ca. 27 000 kr i diesel fra aggregat. Dieselen er dyr i
  spillet (3 000 kr/l); kjelen er derfor et klart valg når saga går. Bør vurderes når balansen ses på.

## Fellesfiler endret (nøyaktig)
- `spill/leir.js`: MATERIALER (Planker + tømmer/flis/ved), `ny().lager`, tre nye BYGG (sagbruk, vedkløyver, fyrkjele), PRIORITET
  (+ vedkløyver, sagbruk), i `steg`: `api.hviler` filtrerer brukerne og `api.maskinKW` legges til nettet (returnerer `maskin`), api får
  `hviler: null, maskinKW: null`.
- `spill/folk.js`: OPPGAVER + «maskin», OPPGAVE.maskin, hogst-teksten, `ferd.maskin` uten nytt tilfeldig tall, varmen (kroken
  `api.varmeAndel`, ved før planker), api `varmeAndel: null`.
- `spill/jobber.js`: TYPER/PRODUKSJON + «maskin», prio/skift for maskin, `lag()` har grenen for «maskin» (`api.maskiner`), hauger teller tømmer.
- `spill/ressurser.js`: MAT + tømmer, hogst gir tømmer, tømmerbil i `lastebil`/`kapasitet`, REGLER.tømmerbil.
- `spill/ressurser-visning.js`: `ledigBil(type)` (tømmerbil til hogst), 3D-haugen teller tømmer som tre.
- `spill/spillet.js` (Marked): VARER, `ny`, `steg`/`pris`/`endring` tåler gamle markeder, LAGER, ENHET, erMateriale, KJØPER.
- `spill/spillet-visning.js`: GRUNN og `settPriser` for tømmer/flis/ved.
- `spill/selskapspanel.js`: fanen Produksjon (tegn() og fanens klasse).
- `spill/leir-visning.js`: én linje – strømteksten nevner fyrkjelen.
- `spill/leir2d.js` (STIL), `spill/tegninger.js` (BYGG), `spill/leirvirkning.js` (VIRKNING): tre linjer hver for maskinene
  (test_leir2d, test_merker og test_leirvirkning krever det).
- `spill/flistips.js`, `spill/maal.js`, `spill/overlev.js`: «tre» -> «planker» i teksten.
- `index.html`: to skript-tagger rett etter `ressurser-visning.js` (`produksjon.js`, `produksjon-visning.js`) + `versjon.py`.
- Tester: `test_folk.js` (oppgavelista), `test_ressurser.js` (hogst gir tømmer + tømmerbil), `test_okonomitest.js` (KJENT),
  `okosim.js` (slutt-kroken), `okosim-hogst.js` (tømmer), `okonomitest-band.json` (nytt bånd).

## MÅ RETTES I sjekk.js (jeg har ikke lov å endre den)
- Linje ca. 555 («materialer fra verden»): `v.ut.mat.tre > 0` -> `v.ut.mat.tømmer > 0` (hogst gir nå tømmer). Ellers feiler
  «panelet viser utbytte». `rs.tre > 0` holder fortsatt (riving av huset gir planker).

## Prøvd
- Regeltester: test_produksjon (alle), test_folk, test_jobber, test_leir, test_ressurser, test_spillet, test_balanse, test_kommando,
  test_okonomitest (60 frø: «økonomitesten ok – men 8 kjente brudd»), og ALLE `pipeline/fliser/test_*.js` (grønne etter rettingene).
- Nettleser (Dovre-testsiden, 1400 × 860 og 390 × 844 mobil): sagbruk og fyrkjele i leiren med fire på Maskiner – saga gikk, kjelen ga
  30 kW (Leir: «bruker 15 av 30 kW»), fanen Produksjon (rader, lager, folk, grafer), Leir → Lager med tømmer/flis/ved, 2D-tallene over
  maskinene, kjøp av tømmerbil (2,5 mill.), hogstfeltet viser «46,2 m³ tømmer». Ingen sidefeil.
- Vakt `pipeline/fliser/vakter/ut2-sagbruk.js`: ok på PC (0,2 s) og mobil (0,4 s). Med en feil lagt inn med vilje (feil tekst for
  «tom for tømmer») feilet den på «tom».

## IKKE gjort
- Tømmerbilen er ikke kjørt en tur i nettleseren (bare Node-testen med falsk Kjoretoy).
- 3D: vedkløyver og fyrkjele har ingen egne modeller. Sett på bilde i 3D (Dombås-testsiden): sagbruket med stabler og flishaug, ingen feil.
- Høvleri (nivå 2), maskinlyd, maskiner i byggesettets haller (B5), bærejobber (F3).
- Tømmerkontrakt fra Storlia Tømmer som låser opp saga (Ø2) – saga kan bygges med en gang.
- «Spol til saga er tom» / pause når en maskin står (Tida) – ikke lagt inn.
- Tekstene som fortsatt sier «tre» (se punkt 1) – må endres sammen med testene/vaktene som leser dem.
- Strømpanelet (strom-visning.js) viser ikke kjelen som egen kilde i stolpen (bare i teksten i Leir-menyen).
