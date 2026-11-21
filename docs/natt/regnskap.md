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

## Runde 13 (21. nov, kritikk G/H)

Oppdraget: «ingenting skal gå tapt, og tekstene skal stemme». Alle tall er Claudes forslag.

### 1. Ordre før omlasting gikk tapt, og klokka gikk tilbake (H)
- Årsaken: en ordre lagres som målet på marsjen (`d.mål` = siste punkt i `s.sti`), men mens ruta planlegges finnes ingen sti, og verden
  ble bare lagret hvert 5. sekund / hver 2. spillminutt. Mens spillet står på pause (morgenmøtet, et kort) går ikke `KROKER.sim`, så
  det ble ikke lagret i det hele tatt før `pagehide` – og den kommer ikke når nettleseren lukkes hardt.
- Nå (spill/lagring.js, visningen): `ordre()` pakkes inn – `s.ordreMål` merkes mens ruta planlegges (lagres som `mål`, `pakkLag`), og
  verden lagres når ordren er gitt og når ruta er klar. Hvert trykk på en knapp (kort, møter, paneler), `change` og tast lagrer
  like etterpå (`LAGRE.straksMs` 120 ms, slått sammen). Hvert sekund lagres det når klokka har flyttet seg (også i pause).
- Klokka: egen liten nøkkel `riksbrudd-klokke` ({ leir, tid }) høyst hvert 250. ms; `les()` tar `max(verden.tid, klokke.tid)`.
  Et nytt spill (ingen lagret spill da siden ble lastet) tar bort den gamle klokkenøkkelen. `LagringSpill.nyttSpill()`.
- Ikke mulig å love helt: lukkes nettleseren hardt midt i 600×, kan noen få spillminutter fortsatt gå tapt (høyst 250 ms ekte tid).
- «Forsvar leiren»-ordren og anslaget etter omlasting (H nr. 179) hører til forsvar/krig – ikke gjort her.

### 2. Loggen tømmes ved omlasting (H)
- Ny fil `spill/logglager.js` (regler øverst, `test_logglager.js`; visningen nederst, `window.LoggLager`). `logg()` i index.html kaller
  `LoggLager.ny(tekst, tid, slått)` (én linje). De siste 100 meldingene lagres per leir i `riksbrudd-logg` ({ v, leir, økt, linjer: [[tid, tekst, økt]] });
  sammenslåtte meldinger («×3») erstatter forrige linje.
- Når et lagret spill åpnes: boksen «Velkommen tilbake – Dette skjedde sist du spilte (dag 2, 15:12–15:54, 37 meldinger). Spillet sto stille
  mens du var borte.» med inntil fem viktige meldinger (varsler, tap, angrep, ferdig, bestilt, sendt, framme …; ikke vær, tips og
  oppstartsmeldinger), og knappene «Hele loggen» og «Fortsett». VALG: teksten sier «sist du spilte», ikke «mens du var borte» –
  spillet står stille når det er lukket, så «mens du var borte» ville vært feil. Kommer ikke av seg selv i testene (`LoggLager.test`).
- «Hele loggen» (#logghel): alle lagrede meldinger, nyeste øverst, per dag med klokkeslett. Nås fra velkomstboksen, fra lappen
  «📜 Hele loggen (n)» under loggen når «les alt» er åpen, og fra Leir → Mål («Loggen»).
- Meldinger fra før det lagrede spillet er lest inn, får klokka spillet står på nå (ikke 06:00).

### 3. Kortene
- «Tilgi – alle er sultne» (samfunn.js, kortet `tyv`): teksten følger matlageret – under 3 døgn «Tilgi – alle er sultne», under 7 «Tilgi – hen
  er redd maten tar slutt», ellers «Tilgi denne gangen». `kortTekst` gir nå `{ ...k, S, F }` til valgteksten.
- Krangel (spillet.js, `krangel` med `to: true`): to forskjellige personer som er i leiren (ikke `p.borte` – speidertur, jakt, ærend),
  og begge navngis («Ingrid Rønning og Per Moen har røket i tottene …»). spillet-visning.js `hendelse()` velger bare folk hjemme for alle
  hendelsene. Samfunnets kort valgte allerede bare folk hjemme.

### 4. Navn (G)
- `FolkRegler.nyPerson` (folk.js): et fullt navn som er brukt i spillet før, gis aldri igjen. `tatteNavn(F)` = gjengen + `F.navnBrukt` (alle
  navn gjengen har hatt, lagres med folket; eldre lagringer: de som er med nå) + `FolkRegler.opptatteNavn()` fra folk-visning.js (folk i
  egne lag – levende og falne –, karakteren, de døde og gravlagte, barn og gamle). Finnes ingen ledig kombinasjon etter 60 forsøk, tas
  første ledige fra lista (1080 kombinasjoner), og til slutt et mellomnavn. Test i test_folk.js (300 nye, ingen like, ingen døde).

### 5. Opplæringen
- Steg 6 «Mer forsvar før dag 4»: kravet står med tallene («Nå: 1 på Vakt (trenger 2) – eller 1 tropp (trenger 2)», sammenlagt
  «1/2 på vakt»), og «eller» betyr eller: to på Vakt holder alene (før krevde det også en tropp, uten at teksten sa det – derfor sto
  steget i tre døgn). Også krav på «Sett to på bygg» («På Bygg: 1 av 2») og «Mat til tre døgn» («Mat nå: 1,4 døgn av 3»). `Opplaering.krav(s, bilde, kort)`.
- Steg 4 «Lag en tropp»: stegene sjekkes nå også mens et kort eller hjelpen står oppe (før returnerte `kjørInn` før sjekken), straks
  etter hvert trykk, og ✓ telles ikke ned mens lagpanelet dekker ruta (innholdet byttes til ✓ med en gang).

### 6. Folk og priser (H)
- Folk (folk-visning.js): «+»/«−» har verktøytips («Ingen har fri – tar en fra Bygg»), og etter et trykk står «Flyttet: Astrid Vik fra Bygg
  til Vakt. (ingen hadde fri)» over oppgavene (og i loggen). Bygg-linja: «3 på bygg = 2 byggelag (det ene har bare én – halv fart)» – samme
  regel som `FolkRegler.byggelag` (to = ett lag, ett med én går halvt så fort). Reglene er uendret.
- Prisene: grunnprisen i `Leir.BYGG` betaler utstyret og de ferdige delene; arbeidet gjør byggelagene uten lønn. VALG: forklare, ikke
  endre balansen. leir.js: ny konstant `Leir.PRISDEL` (navn «utstyr og deler», forklaring) – ingen regel endret. leir-visning.js: menyen
  («… i alt (utstyr og deler 8 mill. kr + materialer du mangler 360 000 kr) · byggelagene dine: 1 t»), banneret («… byggelagene dine
  bygger det – ferdig om 1 t») og loggen («… byggetid for byggelagene dine»); byggesett-visning.js likt.

### Fellesfiler endret (små, samlet)
- index.html: `logg()` kaller `LoggLager.ny` (3 linjer); skript-taggen `spill/logglager.js` rett etter loggdemp.js.
- leir.js: `PRISDEL` (konstant + eksport). leir-visning.js: tre tekststrenger (meny, banner, logg). byggesett-visning.js: én tekst.
- folk.js: `tatteNavn`, `nyPerson` (unike navn), `fraJSON` (`navnBrukt`), `api.opptatteNavn`. samfunn.js: tyverivalget og `kortTekst`
  (k med S og F). spillet.js / spillet-visning.js: krangel med to navn, bare folk hjemme.
- pipeline/fliser/vakter/terreng.js: regexen for prisen i loggen godtar «utstyr og deler» (en linje).

### Tester og vakt
- Nye/utvidede: test_logglager.js (ny), test_lagring.js (ordreMål), test_folk.js (unike navn), test_samfunn.js (tyveri), test_spillet.js
  (krangel), test_opplaering.js (krav, steg 6).
- Vakt `pipeline/fliser/vakter/regnskap.js` – ny del «RUNDE 13»: ordre lagret mens ruta planlegges og av seg selv like etter, klokkenøkkelen,
  loggen lagret, tyverikortet, krangel, navn, opplæringens krav, Folk (+ sier hvem), prisen sier «utstyr og deler». Feilen lagt inn med
  vilje (ordreMål ikke lagret) -> vakten sa false; uten feilen true (PC 6,5 s, mobil 6,0 s).

### Ikke gjort
- «Forsvar leiren» og anslaget lagres ikke (forsvar-pakka), tankbilbanneret «Send Vaktlaget» etter at laget er sendt (morgen-pakka),
  morgenmøtet to ganger (morgen-pakka – men klokka går ikke lenger tilbake over 06:00, som var én av årsakene).
