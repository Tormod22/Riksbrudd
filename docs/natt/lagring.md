# Pakke «lagring» – lagrede spill

## Runde 7 (20. nov natt)

Gren `claude/natt18-test1` (mappa `/home/user/natt-test1`, port 8914). Bakgrunn: kritikken og runde 6 – «/dovre-fliser og /norge
deler fortsatt ett lagret spill», og hver side hadde sin egen lagring uten at spilleren kunne se eller styre den.

### Hva som er laget
1. **Hver side sitt lagrede spill** (`spill/lagringsside.js`, lastes FØRST på siden – før noen modul leser localStorage):
   /dovre-fliser bruker nøklene `riksbrudd-…` uten ending (som før), /norge `riksbrudd-…@norge` (NYTT), /rogaland `riksbrudd-…@rogaland`
   (som før). Modulene merker ingenting: `getItem/setItem/removeItem` på localStorage legger til endingen (det samme grepet som /rogaland
   hadde i en innebygd blokk i index.html – den er nå flyttet hit og utvidet).
   **Gamle spill:** første gang etter oppdateringen (rå nøkkel `riksbrudd-sider` mangler) deles det gamle felles spillet én gang:
   /norge får en kopi av alle de gamle nøklene uten ending (spillet og innstillingene). Ligger leiren UTENFOR Dovre-kartet, er det et
   Norge-spill: spillnøklene tas bort fra Dovre-siden (innstillingene blir), og Dovre-siden viser startskjermen med «Spillet ditt
   «X» i Norge (/norge) er lagret for seg». Ligger leiren på Dovre, har begge sidene spillet etterpå og går hver sin vei.
   Har /norge alt et spill (`riksbrudd-k1@norge`), røres ingenting.
2. **«Lagre og last»** (`spill/lagringsmeny.js`, rett etter lagring.js): knappen «Lagre og last · lagret 12:04» øverst i ☰ (i overskriften
   ved «Innstillinger», `.mtopp` – meny.js hopper over knapper der; knappen settes inn ved DOMContentLoaded og på nytt hvis meny.js bygger
   menyen om, aldri rett i #lagmeny; i «Annet» nederst måtte man bla på PC),
   «Lagre» bak «Mer» i kommandolinja (PC og telefon), og «Last inn et lagret spill …» rett under «Steg 1 av 3» på startskjermen
   (der kan ☰ ikke nås). Panelet `#lagremeny`: status («Spillet lagres av seg selv … Lagret 12:04» eller en rød melding), «Spillet nå»
   (fraksjon, dag og klokke, karakter, kasse, «Last ned som fil»), navnefelt, **Plass 1–3** og **Automatisk** med navn, dag, fraksjon,
   kasse og når de ble lagret; knappene «Lagre her», «Last», «Last ned», «Slett». Overskriving, lasting og sletting spør først
   i raden («Ja, slett» / «Avbryt» – ingen nettleserdialog). «Hent fra fil …» leser en JSON-fil og viser den (dag, fraksjon, kasse)
   med «Last inn nå» eller «Legg i plass 1–3».
   - En plass (og fila) er ALLE spillnøklene for siden: `LagringSide.erSpill(navn, verdi)` = verdien er et JSON-objekt og navnet er ikke
     en innstilling (`INNSTILLINGER`: filter, grafikk, lyd, kompass, minikart, hjelp, opplæring, maler, venner, flyt, strid …) eller
     intern (`riksbrudd-plass-…`, `-sider`, `-lastet`, `-k1-utkast`, `-flytt`). Nye moduler som lagrer et JSON-objekt, kommer altså med
     av seg selv; en ny innstilling som lagres som JSON, må inn i `INNSTILLINGER`.
   - «Last»: spillet du har nå legges først i «Automatisk» (går ikke det – fullt – avbrytes lastingen med melding), så låses lagringen
     (`LagringSide.lås(true)`: det modulene lagrer når siden lukkes, ignoreres), alle spillnøklene byttes (det plassen ikke har, tas bort)
     og siden lastes på nytt. Hver modul leser da sitt eget som vanlig. Etter omlastingen: «Lastet inn «X». Spillet du hadde, ligger i
     «Automatisk» …» i loggen. Feiler skrivingen midt i, settes spillet du hadde tilbake.
   - Før «Lagre her» og fila sendes en `pagehide`-hendelse, så modulene som lagrer da (lut, møbler, krig, penger, verden …) skriver det
     de har i minnet – plassen blir det du ser.
3. **Automatisk lagring som før, men synlig:** `LagringSpill.sist()` (lagring.js) gir når «riksbrudd-verden» sist ble lagret / feilet;
   ☰-knappen og panelet viser «Lagret 12:04». I tillegg tas en automatisk kopi til plassen «Automatisk» hvert 10. minutt med spilling
   (bare når siden vises; ikke i testene – `LagringMeny.test`).
4. **Full eller sperret lagring:** alle skrivinger går gjennom innpakningen, som husker feil (`LagringSide.feil()`, `nårFeil`). Første feil
   gir én linje i loggen («Spillet fikk ikke lagret: nettleseren har ikke mer plass. Åpne «Lagre og last» …»), knappen sier «ikke lagret»,
   panelet er rødt med råd (slett en plass / last ned som fil). Er localStorage **sperret** (kaster ved oppslag), får spillet en lagring
   i minnet for økten (`LagringSide.iMinne()`): alt virker, og «Last ned som fil» gir hele spillet; plassene og «Hent fra fil» er slått av
   der (en omlasting ville tømt minnet), og panelet sier hvorfor. Prøvd: ingen sidefeil i noen av tilfellene.

### Filer
- NY `site/dovre-fliser/spill/lagringsside.js` – regler øverst (`LagringSide`: side, ending, hvem, tilRå, egen, erSpill, leirAv,
  påDovre, delPlan, INNSTILLINGER, INTERNE, MERKE), på siden: her, delt, lås/låst, feil/nårFeil, rå.get/set/del/alle, virker, iMinne,
  simuler (bare for vakten). Test: `node pipeline/fliser/test_lagringsside.js` (21 prøver, med selvtest).
- NY `site/dovre-fliser/spill/lagringsmeny.js` – `window.LagringMeny`: åpne, lukk, erÅpen, plass(id), plasser(), lagreHer(id, navn),
  last(id | plass, { lastInn }), slett(id), legg(id, plass), filTekst(id | 'nå'), hentFil(tekst), lastNed(id | 'nå'), status(), taAuto(),
  spillNå(), REGLER, test. Plass-id: '1', '2', '3', 'auto'.
- `site/dovre-fliser/spill/lagring.js` (min): `Lagring.Plass` (regler uten DOM: info, pakk, les, byttPlan, tilFil, filnavn, REGLER,
  SIDENAVN) og `LagringSpill.sist()`. Test: `node pipeline/fliser/test_lagring.js` (13 nye prøver).
- NY `pipeline/fliser/vakter/lagring.js`, `pipeline/fliser/test_lagringsside.js`, `docs/natt/lagring-hjelp.json`.

Format (plass i localStorage `riksbrudd-plass-<id>` + sidens ending, og fila `riksbrudd-<fraksjon>-dag-<n>-<dato>.json`):
```js
{ spill: 'Riksbrudd', type: 'lagring', versjon: 1, side: 'dovre' | 'norge' | 'rogaland', navn, laget: ms,
  info: { fraksjon, karakter, dag, klokke, penger, leir: { x, y }, tid },
  nøkler: { 'riksbrudd-k1': '<tekst>', 'riksbrudd-k2': '<tekst>', … } }   // navnene UTEN sidens ending
```
En fil fra en annen side avvises med «Spillet er lagret på Norge (/norge). Åpne den siden og hent det der.»

### Tall (Claudes forslag, i REGLER-objektene)
- `LagringMeny.REGLER`: 3 plasser, automatisk kopi hvert 10. minutt, panelet tegnes hvert sekund.
- `Lagring.Plass.REGLER`: fil/plass høyst 8 millioner tegn, navn høyst 40 tegn.
- En lagringsfeil regnes som «ny» i 10 minutter (eller til neste vellykkede lagring av verden).

### Fellesfiler endret
- `site/dovre-fliser/index.html`: den innebygde blokken øverst (linje ca. 85–90) som la «@rogaland» på nøklene, er byttet ut med
  `<script src="/dovre-fliser/spill/lagringsside.js">` rett etter den (konstanten `PÅ_OMRÅDE` står igjen). Skript-taggen for
  `spill/lagringsmeny.js` står rett etter `spill/lagring.js`. `versjon.py` er kjørt.
- `site/dovre-fliser/spill/oppstart-visning.js` `andreSpill()`: «her» = `LagringSide.her` (/norge har nå egen ending), og et spill uten
  ending er alltid Dovre-siden (to linjer + kommentar).
- `site/dovre-fliser/spill/oppstart-visning.js` «Nytt spill» i ☰: legger spillet du har i «Automatisk» først (`LagringMeny.taAuto`), og
  spørsmålet sier det (to linjer). «Nytt spill» kan altså angres.
- `site/dovre-fliser/spill/scenario-visning.js` (leir som flyttes, `FLYTT`): går bare over nøklene til denne siden (`LagringSide.egen`)
  og sammenligner `riksbrudd-k1` uten ending (før kunne et spill med samme leir på en annen side bli flyttet med, og på /rogaland ble
  `riksbrudd-k1@rogaland` ikke holdt utenfor).

### Prøvd i nettleser (bilder i scratchpad `natt7/lagring/`)
- Dovre, PC og telefon: lagre i plass 1, bruke penger og spole tida, «Last» med omlasting → pengene og klokka tilbake, «Automatisk» har
  spillet fra før (95 mill. kr), meldingen i loggen (`meny-pc.png`, `meny2-pc.png`, `meny-mobil.png`).
- Telefon som vanlig spiller (webdriver av): startskjermen viser «Last inn et lagret spill …», panelet over startskjermen, «Hent fra fil»
  med ekte fil (setInputFiles) → «Last inn nå» → spillet fra fila kjører (`start-mobil.png`, `fil-mobil.png`).
- /norge med dev.py (ekte kartdata): et gammelt felles spill med leir i Ryfylke flyttes til /norge (Dovre viser startskjermen med
  meldingen), et gammelt Dovre-spill finnes på begge sidene, og penger brukt på Dovre merkes ikke på /norge (`norge-meny-pc.png`,
  `dovre-start-pc.png`).
- Sperret localStorage (oppslaget kaster) og full lagring (setItem kaster QuotaExceededError): ingen sidefeil, melding i loggen og i
  panelet, «Last ned som fil» har hele spillet også når lagringen er sperret (`sperret-pc.png`, `fullt-pc.png`).
- ☰ før/etter, PC og telefon: `hamburger-for-pc.png`, `hamburger-for-mobil.png`, `hamburger-etter-pc.png`, `hamburger-etter-mobil.png`
  (knappen i overskriften; utsnitt `hode-pc.png`, `hode-mobil.png`).
- Vakten på PC og telefon (under 1 s), to ganger etter hverandre; vaktene «start», «spillform» og «ui» er grønne med endringene.
- Hele kontrollen på telefon (`SJEKK_PROFIL=mobil PORT=8914 node pipeline/fliser/sjekk.js`): «Alt i orden», 120 ok, 0 FEIL (778 s),
  med vakten «lagre og last (lagring)» (0,3 s) og ☰-vakten (knappen i overskriften telles ikke som løs knapp).

### IKKE gjort / begrensninger
- Plassene ligger i samme localStorage som spillet (5–10 MB for hele riksbrudd.vercel.app, alle tre sidene). Et spill er ca. 20 kB
  i starten; store spill (leting i tusenvis av hus, etterspillets øyeblikksbilder) kan bli flere hundre kB. Blir det fullt, sier panelet
  fra – men plassene komprimeres ikke.
- «Last» laster hele siden på nytt (tryggest: alle modulene leser sitt eget). Det tar like lang tid som å åpne spillet.
- Lagringen i minnet ved sperret localStorage bygger på at nettleseren lar `window.localStorage` byttes ut; går ikke det, sier spillet
  fra, men kan da ikke lage fila.
- Innstillingene (grafikk, lyd, filter …) følger siden (hver side har sine, /norge fikk en kopi), men følger ikke med i en plass eller fil.
