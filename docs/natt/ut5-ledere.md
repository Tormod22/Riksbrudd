# ut5-ledere – formenn og ledere (fase G5)

28. nov, utbyggingen av `docs/plan-selskap-okonomi.md`, kapittel 13.1 «Formenn og ledere» og G5 i kapittel 16. Gren `claude/ut5-ledere`.
**Alle tall er Claudes forslag** (samlet i `Ledere.REGLER`, de valgbare reglene i `Ledere.ROLLER`, økonomitesten i `LM` i `okosim-ledere.js`).
Figuren «ledere» som oppdraget nevner, fant jeg ikke i docs/ – bygget etter teksten i 13.1.

Kapittel 18, spørsmål 19 (hvor mye skal lederne bestemme selv): **forslaget er brukt** – lederne følger reglene dine og sin egen dyktighet,
og kan av og til gjøre et dårlig valg (aldri fra ledelse 1,2 og oppover).

## Filer
- `site/dovre-fliser/spill/ledere.js` – NY, regler uten DOM (`globalThis.Ledere`, Node: `require`). Test: `pipeline/fliser/test_ledere.js`.
- `site/dovre-fliser/spill/ledere-visning.js` – NY, `window.LedereSpill` (delen «Ledere» i Folk-panelet, lederne som handler, kassereren, lokkingen, lagring).
- `pipeline/fliser/vakter/ut5-ledere.js` – NY vakt (0,5–0,9 s).
- `pipeline/fliser/okosim-ledere.js` – NY: økonomitestens strategi «bare kontrakter + leirsjef og kasserer» og tre krav.
- `docs/natt/ut5-ledere-hjelp.json` – to hjelpeemner (gruppe «Leiren»).

## Fellesfiler endret (nøyaktig)
- `spill/folk.js`: ny funksjon `ledelse(p)` (+ `LEDELSE_YRKE`) rett over `ny()`, og `ledelse` i `api`. Ingenting annet. Ferdigheten står **ikke** i
  `p.ferd` (da ville rekrutteringens lønnskrav og «best på» endret seg for alle), og `nyPerson` trekker ikke noe nytt tilfeldig tall
  (gjengene er like som før – test_folk og test_ledere sjekker det).
- `spill/folk-visning.js`: én linje (+ kommentar) rett etter jobbtavla i `fyll()`: `if (window.LedereSpill) panel.append(...LedereSpill.del({ el, knapp }));`
- `index.html`: to skript-tagger rett etter `rekruttering-visning.js` (`ledere.js`, `ledere-visning.js`) + `versjon.py`.
- IKKE endret: `jobber.js`, `rekruttering.js`, `byavtale.js`, `firma.js`, `selskapspanel.js`, `kommando.js`, `kommandoer.js`, `okosim.js`.
  Lederne bruker bare kommandoene som finnes (se under), og lokkingen går gjennom rekrutteringens tilbud (`RekrutteringSpill.tilstand().lokk`).

## Ferdigheten «ledelse»
`FolkRegler.ledelse(p)`: `p.ledelse` når den er satt, ellers et tall fast per person regnet av navnet (FNV-hash): 0,7 + 0,75 · u^1,6, lærer +0,15,
tidligere soldat +0,12, vekter +0,06, sykepleier +0,04, 0,7–1,45. Snitt ca. 0,95, ca. 12 % over 1,3. Gamle lagrede personer får samme tall hver gang.
I troppene: `m.person` når den finnes, ellers mannen selv (navnet).

## Rollene og reglene (enkle valg – trykk på knappen for neste valg)
| Rolle | Én per | Reglene (standard først) | Hva lederen gjør (kommandoen) |
|---|---|---|---|
| Leirsjef | leir | Mat: hold 2 / 0 / 1 / 3 / 5 døgn · Strøm: hold 1 / 0 / 2 / 3 døgn diesel · Bygging: bygg ferdig planen / bygger ikke · Senger: brakker først når noen sover i telt / planen i rekkefølge | `kjøpMat`, `kjøpDiesel`, `kjøpMateriale` + `byggPlan` (én skisse når byggekøen er tom) |
| Formann | maskinbygg (sagbruk, vedkløyver, fyrkjele) | Folk: hold maskinen i gang, men vakta først / for enhver pris / bare de som har fri · Skift: dine / dag / to / døgnet rundt | `jobbLås` (når tavla fordeler) eller `folk` – én person til «Maskiner» når maskinen står for «venter på folk»; `jobbSkift` for maskinjobben |
| Forhandler | selskap | Byene: ja over 20 / 15 / 25 / 30 kr per innbygger / forhandler ikke · Avtaler: bare beskyttelse / også handel · Firmaene: ja til fast kunde / også vern / svarer ikke | `byForhandle` (åpningsbud, grunnpris, grensen; ja til motbud over grensen), `firmaSamarbeid` |
| Troppsjef | tropp (blå lag uten karakter/leirvakt) | Ammunisjon: hjem under 25 / 15 / 40 % / aldri · Strid: dine regler / balansert / forsiktig / aggressiv / bakhold | `ordre` hjem til leiren (ikke når laget er hjemme eller på vei), `strid` (holdningen) |
| Kasserer | selskap | Kassa: hold minst 5 / 2 / 10 / 20 mill. / ingen grense · Utbytte: bare når uka gikk i pluss / aldri | stopper `bygg`, `byggPlan`, `kjøpMateriale` og `ansett` som ville tatt kassa under minimum (også spillerens egne). **Mat og diesel stoppes aldri** (Claudes valg: folk må spise). |

- **Dyktighet:** sjansen for et dårlig valg er 0,3 ved ledelse 0,7 og 0 fra 1,2. Dårlige valg: leirsjefen kjøper halvparten (eller glemmer
  brakka, tar det dyreste i planen først); formannen tar den som er dårligst ved maskinen; forhandleren godtar et motbud ned til 0,8 × grensen
  eller sier nei til et godt; kassereren slipper et kjøp gjennom. En lite dyktig leirsjef/troppsjef reagerer seinere (fra 0,6 × grensen).
- **Leirsjefen kjøper** når maten rekker under målet, opp til målet + 1 døgn (altså ca. ett kjøp i døgnet), i hele 5 rasjoner / 50 liter.
- **Forhandleren** prøver hver by høyst én gang i døgnet: åpningsbudet (grunnprisen × opptil 1,3 for de dyktigste), så grunnprisen, så grensen
  din; motbud over grensen godtas. Rivalens bud, tillit og frykt avgjøres av byavtale.js som før.
- **Lederne ser over sakene sine hvert 20. spillminutt** (KROKER.sim). Melder bare det viktige i loggen («Leirsjef Kari kjøpte 20 rasjoner –
  maten rakk 1 døgn.», «Formann Per satte Ola (fri) på sagbruket – den sto og ventet på folk.», «Troppsjef Erik tar 1. lag hjem til leiren –
  ammunisjonen er 10 %.», «Forhandler … avtalte beskyttelse med … for 66 000 kr per døgn (22 kr per innbygger).»). Resten (nei-svar, regler)
  står bare i lederens liste («Siste beslutninger»).
- **«Ta over selv»** (per leder) og **«Jeg styrer selv i dag»** (alle): lederen gjør ingenting til neste morgen kl. 06 (`lederSelv`).
  «La lederen styre» slår det av igjen.
- **Rydding:** en leder som har gått, er død eller er tatt inn i en tropp, mister rollen (melding); likeså en formann uten maskin og en troppsjef
  uten tropp.

## Verdi
- **Lønn:** grunnlønna (p.lønn eller 15 000) × 1,5 (ledelse 0,7) til 2 (1,45), avrundet til 500 kr. Settes på personen ved utnevnelsen
  (`lønnFør` huskes og settes tilbake når lederen går av). Startlagene (uten `fraFolk`) får ingen lønn i spillet – panelet sier det.
- **Lokking:** hver morgen (bare i ekte spill) kan en leder med ledelse over 0,9 og lojalitet under 0,8 få et bud fra Ravnsund eller Mosevakt:
  sjanse 0,08 × (ledelse − 0,9)/0,55, budet = lønna × 1,2. Budet legges i rekrutteringens tilbud (`S.lokk`), så det er samme kort i Folk-panelet
  («Gi lønnstillegg» / «La gå»). Går lederen, mister hen rollen.
- **`LedereSpill.verdi()`** (for børsen, Ø7): `{ kr, antall, snitt, roller }`. Per leder 3 mill. × (ledelse − 1)/0,45 (en middels leder ca. 0,
  en svært dyktig ca. 3 mill., en dårlig trekker ned), og 2 mill. ekstra når alle fem rollene er fylt.
- **`LedereSpill.utbytte(kr)`** (for børsen): `{ ok, grunn }` – kassereren sier ja bare når kassa nå er høyere enn for sju morgener siden og
  kassa holder minimum etter utbyttet. Uten kasserer: alltid ok. (Ukas resultat = kassa nå − kassa for sju morgener siden; ikke et ekte
  regnskap.)

## Kommandoene (KOMMANDO, registrert fra ledere-visning.js med reglene i `Ledere.registrerKommandoer`; alle `leir: true`)
`lederUtnevn { rolle, del (byggets id / lagets navn for formann og troppsjef), person (id, eller mannens navn i troppen) }`,
`lederAv { nøkkel }`, `lederRegel { nøkkel, regel, verdi }`, `lederSelv { nøkkel | null, på }`. Nøklene: `leirsjef`, `forhandler`, `kasserer`,
`formann:<bygg-id>`, `troppsjef:<lagnavn>`.

## API
- `Ledere`: `REGLER, ROLLER, RO, VERN, ledelse, dyk, feilSjanse, lønnFaktor, lederLønn, dyktighetOrd, rng, ny, fraJSON, nøkkel, nøkkelRolle, renRegler,
  standardRegler, regelTekst, ref, iArbeid, nesteMorgen, lederFor, utnevn, av, settRegel, notér, tittel, fornavn, des, matValg, dieselValg, byggValg,
  formannValg, skiftValg, byTilbud, svarMotbud, firmaTyper, troppValg, kassaValg, utbytteLov, lokkBud, verdi, registrerKommandoer`.
- `LedereSpill`: `test, tilstand(), sett(o), les(), lagre(), steg(tving), morgen(), del({ el, knapp }), verdi(), utbytte(kr), kassaSjekk(pris, hva),
  prisFor(k), kandidater(rolle, del), person(rolle, del, id), nullstill(), NØKKEL`.
- Lagring: `riksbrudd-ledere` = `{ leir: 'x,y', S }` (lederne, reglene, «selv til», siste beslutninger, kassa per morgen). «Vis lederne»:
  `riksbrudd-ledervis`.
- I testene (navigator.webdriver) gjør lederne ingenting og ingen lokkes før `LedereSpill.test = true`.

## Visningen
Delen «Ledere» i Folk-panelet (etter jobbtavla): én statuslinje, «Vis lederne» (sammenslått som standard – rolig på telefon) og «Jeg styrer
selv i dag». Åpnet: leirsjef, formenn (én rad per maskin som har en; maskinene uten står som knapper på én rad), forhandler, troppsjefer (samme
måte), kasserer. Hver leder: navn, dyktighet og ledelse, lønn, reglene som knapper, «Ta over selv», «Bytt», «Fjern», og siste beslutning.
«Utnevn …» viser de seks dyktigste ledige med ledelse og lønna de vil kreve. Nederst: hva lederne er verdt og de fem siste beslutningene.

## Økonomitesten
Ny strategi `kontrakterLedere` – «bare kontrakter + leirsjef og kasserer»: leirsjefen holder 5 døgn mat (slår til før driftens egen regel på 3
døgn), kassereren holder minst 5 mill. (stopper rekruttering, bygg, tømmerbil, teknologi), og de to får lederlønn. Resultat (60 frø):
median dag 30 **98,0 mill.** mot 103,0 for «bare kontrakter» (−5 % – lederlønna og kassererens stopp), 2 % blakk til slutt mot 0 %, leirsjefen
kjøpte mat ca. 33 ganger per kjøring, kassereren stoppet ca. 1 kjøp per kjøring. Kravene (0,85–1,1 ×, blakk høyst +5 prosentpoeng, minst ett
matkjøp) og de vanlige kravene er grønne. **Båndet er ikke lagret** (OKO_NYTT_BAND=1 skriver hele fila, og flere pakker endrer den i natt) –
testen skriver «ny … har ikke noe lagret bånd». Kjør `OKO_NYTT_BAND=1` etter flettingen.

## Prøvd
- `node pipeline/fliser/test_ledere.js` (alle ok; feil lagt inn med vilje – formannen tok fra vakta – ble funnet), test_folk, test_jobber,
  test_rekruttering, test_kommando grønne. `node pipeline/fliser/test_okonomitest.js`: «økonomitesten ok».
- Nettleser (Dovre-testsiden, 1400 × 860 og 390 × 844 mobil, bilder sett): Folk-panelet med lederne, reglene, «Utnevn …» med kandidater, kasserer
  utnevnt med knappene, troppsjef for «1. lag» via knappene – laget 3 km unna med 10 % ammunisjon fikk ordre hjem («Troppsjef Erik tar 1. lag,
  Dombås hjem til leiren – ammunisjonen er 10 %.»), regelknappen for kassa byttet til 10 mill. Lokkingen: en dyktig kasserer med lav lojalitet
  fikk bud fra Ravnsund, kortet sto i Folk-panelet, «La gå» – rollen ble tom og meldt. Ingen sidefeil.
- Vakta `ut5-ledere` grønn på PC og mobil (0,5–0,9 s), to ganger på rad, og alt er som før etter den (penger, mat, lønn, oppgaver, jobbtavla).
  Feil lagt inn med vilje (formannen reagerer ikke på «venter på folk») → vakta feilet på «formannen flyttet ingen til saga». Etter den: vaktene
  ut1-jobber, ut3-rekruttering, ut2-byer, folk, ut4-maskinfolk, lonn grønne.
- Forhandleren: på Dovre-testsiden finnes ingen tettsteder (infrastrukturen lastes ikke) – vakta legger inn et prøvetettsted på 3000 innb. 7 km
  unna (som ut2-byer) og tar det bort igjen. Første versjon fikk «Altfor dyrt for byen» på åpningsbudet og ga opp – derfor går forhandleren nå
  ned i pris (åpning, grunnpris, grensen).

## IKKE gjort / å vite
- Leirsjefen bygger bare fra **planen** (skisser du har lagt) – hen finner ikke selv plass til en brakke. Står ingen brakke i planen eller køen og
  noen sover i telt, sier hen fra i loggen (høyst én gang i døgnet).
- Formannen styrer operatørene og skiftene, men ikke bærerne direkte (bærerne er folk på «Maskiner» som ikke er operatører – en ekstra person
  på Maskiner blir bærer når operatørplassene er fulle). Skiftet gjelder hele maskinjobben, ikke én maskin.
- Forhandleren tar ikke initiativ til medlemskap, svarer ikke på byenes bønner om hjelp og forhandler ikke varekontrakter.
- Troppsjefen bruker de stridsreglene som finnes; «hjem» er det eneste nye. Lagets egen regel «Lite ammunisjon: gå og hent selv (under 25 %)»
  og `forsvar-hjemme.js` (hjem under 30 % når laget står i ro) virker ved siden av.
- Utbyttet finnes ikke ennå – `LedereSpill.utbytte(kr)` er klart for Ø7. Verdien (`verdi()`) brukes ikke i Selskapet → Oversikt (selskapspanel.js er
  ikke endret; Ø7 endrer den i natt).
- Opplæring i ledelse (øvingsfeltet) finnes ikke; `p.ledelse` kan settes av en senere pakke.
- Rivalene har ikke ledere (Ø8).
