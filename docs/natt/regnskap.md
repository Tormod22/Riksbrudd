# Pakke «regnskap» – tall og tekster som må stemme

## Runde 12 (21. nov natt, kritikk E/F)

Kritiker F (PC, «Hold byen»): «Når du ikke kan stole på regnskapet, slutter du å bry deg om det.» Rettet:

### 1. De falne går ut av folket (høy)
- **Årsak:** Leirvakta (forsvar-visning.js) er folk på «vakt» som tar opp våpen; mennene peker på personen med `m.person = p.id`.
  Når angrepet var over, fikk en falt vakt bare `helse = 0,15` i Folk (`opphev`). Samtidig meldte både index.html
  («Håkon Rønning (rifle, Leirvakta) er falt.») og samfunn-visning.js («Håkon Rønning (Leirvakta) er falt. Ta farvel …») – derfor
  «to ganger på rad». Samfunn så på lagnavn|mannsnavn, så en mann kunne også meldes på nytt når Leirvakta ble satt opp igjen.
- **Nå: én kilde** – `FolkSpill.falne()` i folk-visning.js (kjører i `KROKER.sim`, også i testene): hver mann i et eget lag
  (ikke karakteren) som får `hp <= 0`, merkes `m.falt` én gang, går ut av folket hvis han hører til der (`FolkRegler.fjern`,
  `FolkRegler.personId` – bare Leirvaktas tall; tropper har personposten utenfor folket), meldes i én linje per lag
  (`FolkRegler.falneTekst`: «Håkon Rønning og Silje Berg (Leirvakta) har falt. Ta farvel i Samfunn-panelet.») og settes på lista
  over døde (`SamfunnSpill.falt(navn)` – samme vilkår som før: ikke av seg selv i testene uten `SamfunnSpill.test`).
  Rett etter start/lasting (2,5 s) merkes de som alt er falt, uten melding (lagring.js tar ikke vare på `m.falt`).
- Folketallet øverst, «Folk (n)», folkelista og «N døde venter på begravelse» følger altså hverandre.
- `ForsvarSpill.opphev` kaller `FolkSpill.falne()` først (liten endring i forsvar-visning.js), så en vakt som faller i samme øyeblikk
  som angrepet slutter, ikke får lav helse i stedet.

### 3. Doble tekster
- `FolkRegler.treffTekst(m, lag, hva, ekstra)` (folk.js) + `window.treffLogg` (folk-visning.js): «Du er såret.» for karakteren (før
  «Kari Kritiker (lagfører, Kari Kritiker (deg)) er såret»), «Ola Lie (lagfører i Leirvakta) er såret.» ellers. Falne meldes bare av
  `falne()`. index.html (kamprunden) og enheter-visning.js (artilleri/droner) bruker `treffLogg` (med reserve uten rolle).
- Lagre og last: «Automatisk: Automatisk: Kritikerlauget» – plassen heter alt «Automatisk», så navnet er nå bare fraksjonen; gamle
  lagringer med «Automatisk: » i navnet vises uten det (lagringsmeny.js).

### 2. Materialprisen (ett tall)
- **Årsak:** banneret/byggemenyen regnet `(behov − lager) × pris` med brøker (lageret fylles gradvis av hogsten), mens kjøpet runder
  hvert materiale opp til 0,1 – tre ulike tall (974 195 / 974 293 / 975 000).
- **Nå:** `Leir.manglerMat(L, mat)` (det som mangler, rundet opp til 0,1) og `Leir.manglerPris(L, mat)` (summen kjøpMateriale tar) i
  leir.js; leir-visning.js bruker dem både for tallene og for kjøpet. Banner = betalt = logg (prøvd: 644 000 kr alle tre steder med
  0,37 m³ tre på lageret). Prisen flytter seg bare når lageret får en hel tidel mer eller markedet setter nye priser (en gang i døgnet).
- byggesett-visning.js (ikke min fil, én linje): `matMangler` bruker også `Leir.manglerPris` (kjøpet der rundet alt opp til 0,1).

### 4. Uklare tekster
- Senger: «8 senger, 2 i bruk» / «8 senger, 8 i bruk – 4 sover i telt» / «Ingen senger – 9 sover i telt» (før «Senger: 2 av 2 (6 ledige)»).
- Døgnoppgjøret (forsvar-oppgjor.js – liten endring, ikke min fil, men teksten står på morgenmøtet): bildet har nå navnene i folket, hvem
  som står i en tropp, de døde (Samfunn + falne) og `F.borte`. «Siste døgn: 2 har dratt» er blitt f.eks. «Per Lie gikk inn i Stormtropp 1.
  Håkon Rønning og Silje Berg falt. Ola Dahl forlot gjengen fordi moralen var for lav. Nina Ås er ny i gjengen.» Gamle bilder uten navn:
  «2 har forlatt leiren». «Røverne slapp unna (herjet eller sabotasje)» er delt i «Røverne kom inn i leiren og dro med bytte» og
  «Sabotører gjorde skade og slapp unna» (bildet har nå `slapp` for seg; gamle bilder får en forklarende fellestekst).

### 5. Funn uten tilbakemelding
- `Leting.hvor(funn, { mat })` (leting.js) + leting-visning.js: «Du fant 17 rasjoner. Lagt i leiren: rasjonene i leirens matlager (63 i alt)
  – ikke i sekken din.» (også materialene på lageret, dieselen på tankene, pengene i kassa). HUD-ens «rasjoner» er feltrasjonene i sekken.

### 6. Småting
- «Neste: bygg en brakke» etter at brakka er bestilt: målet har `nå()` – «Vent til brakka er ferdig (byggelaget er i gang)» når
  `T.bestilt.brakke` (maal-visning.js teller bestilte, uferdige bygg i `bestilt`).
- Klokka under karakterbyggingen: `holdTid` i oppstart-visning.js trykker pause (sp0) når startskjermen åpnes, og fortsetter når leiren
  er bekreftet eller skjermen lukkes (bare hvis ingen har endret farten imens). Ikke i testene uten `OppstartSpill.test`. Prøvd: 0
  spillminutter går fra «Nytt spill» til leiren er bekreftet, og farten er 1× igjen etterpå.
- Pronomen: `Samfunn.pron(p)` / `Samfunn.medPron(tekst, p)` (samfunn.js) – han/hun etter samme kjønn som portrettet bruker (`kvinne(p)`),
  ham/henne etter «La/Utvis/Gi»; kortene, valgknappene, spionkortet, løftene, Grålungen og historien. «hender» røres ikke; ukjent person beholder «hen».
- Folk-panelet: «Rekrutter» flyttet seg fordi linja «Bare 2 igjen i gjengen …» over knappene forsvant. Linjene om det som mangler, står
  nå under knappene. «Innholdet står dobbelt i DOM-en» er IKKE gjenskapt: `document.body.textContent` har «Kjøp 50 rasjoner» én gang,
  og det finnes ett `#folkmeny` (panelet bygges ved siden av og byttes inn). Kanskje kritikerens verktøy leste et øyeblikk midt i byttet.

### Filer
- Mine: folk.js (treffTekst, falneTekst, fjern, personId), folk-visning.js (falne, treffLogg, senger, rekkefølgen), samfunn.js (pron,
  medPron), samfunn-visning.js (soldatFalt/SamfunnSpill.falt i stedet for soldater()), leir.js (manglerMat, manglerPris), leir-visning.js
  (matPris, kjøpManglende), lagringsmeny.js, oppstart-visning.js (holdTid).
- Fellesfiler (små endringer): index.html (kamprundens treff-logg -> treffLogg), enheter-visning.js (samme), forsvar-visning.js (opphev
  kaller FolkSpill.falne), forsvar-oppgjor.js (tekstene og bildet), byggesett-visning.js (matMangler), leting.js/leting-visning.js (hvor), maal.js/maal-visning.js (bestilt).
- Tester: test_folk.js, test_leir.js, test_samfunn.js, test_forsvar_oppgjor.js, test_leting.js, test_maal.js. Vakt: pipeline/fliser/vakter/regnskap.js.

### Ikke gjort
- Leirvakta som ikke ble forsvart automatisk ved bølge 2 (krig/forsvar – annen pakke).
- De døde i Samfunn skiller ikke «falt» og «døde» etter begravelsen (gravlagte er bare navn).

### Kontrollert
- Regeltestene: test_folk, test_leir, test_samfunn, test_forsvar_oppgjor, test_leting, test_maal, test_morgen, test_dagbok, test_forsvar, test_tropper – alle ok.
- Nettleser (Playwright, 1400 × 820 og 844 × 390 mobil): vakten «regnskap» ok på begge (ca. 6 s); klokka står på 0 spillminutter fra
  «Nytt spill» til leiren er bekreftet (med `OppstartSpill.test = true`), og farten er 1× igjen etterpå.
- Hele mobilkontrollen (sjekk.js, SJEKK_PROFIL=mobil, kopi av treet ved commit 0527897): 129 ok, 0 FEIL (626 s).
