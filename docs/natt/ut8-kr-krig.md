# ut8-kr-krig – krigskartet, bekreftelser og kort som stables (28. nov)

Kritikken fra Ingrid Sæther 28. nov (docs/kritikk/2026-11-28-ut-ingrid-saether.md), sju punkter. Gren `claude/ut8-kr-krig`.

## 1. [HØY] Marsjruta står i bekreftelsen før «Send likevel»
- `spill/strategi-visning.js`: nytt avsnitt «MARSJRUTA FØR BEKREFTELSEN». `ruteSjekk(fra, by)` regner marsjruta med samme regel som
  `ordre()` og kroken i `krig-visning.js`: `lagVindu` + `Terreng.ruteTil`, de fiendtlige tettstedene (`KrigSpill.fiendtligeByer` – bygdevern
  som står, motstandernes byer), omvegen utenom dem når `Krig.omvegOk`. Svaret huskes per mål, lagets plass (300 m) og de fiendtlige byene
  (`RUTER`), ett om gangen (`ruteKø`). Bare byer innenfor vinduet tas med (er det ingen, trengs ingen utregning).
- `send()`: før advarselen regnes ruta («Sjekker radiodekningen og marsjruta mot …»), så sendes på nytt med `ruteSjekket`.
- `farer()`: kjent rute gir fare `rute` (alvor 2) per by ruta går gjennom: «Marsjen går gjennom Lillehammer – bygdevern ca. 14 mann. Det
  finnes ingen god omveg: laget (12 mann) er for svakt …», knappen «Avtale med Lillehammer (…) og send», og «Send likevel» blir rød.
  Omvegen står som opplysning (`omveg`, alvor 0). Ukjent rute: som før (rett linje).
- `Strategi.trekk(…, ruteAv)` (spill/strategi.js): ny 9. parameter. Forslag med farlig rute står etter de trygge (rang som et nylig tap),
  poengene × `REGLER.rute` = 0,3 (Claudes forslag), og forsvaret på ruta teller i «for sterkt». «Neste trekk» viser «⚠ Marsjen går gjennom …».
  Rutene for forslagene bestilles i bakgrunnen mens krigskartet er åpent (høyst 2 om gangen).
- I testene (navigator.webdriver) er dette AV til `StrategiSpill.ruteTest = true` (krig-vakta og sjekk.js sender lag og venter svar straks).
- API: `StrategiSpill.ruteSjekk`, `ruteKjent`, `ruteTest`, `glemRuter`.
- Prøvd på /norge med leir 258300, 6786600 (nordøst for Lillehammer, ekte data via dev.py): «Send» mot Vingnes ga «Marsjen går gjennom
  Lillehammer – bygdevern ca. 14 mann» i bekreftelsen før laget gikk.

## 2. [MIDDELS] Store kjøp bekreftes – felles regel over 1 mill. kr
- NY `spill/storkjop.js` (window.StortKjøp, regler øverst uten DOM, test `pipeline/fliser/test_storkjop.js`). Et trykk på en knapp med pris
  over `REGLER.grense` = 1 mill. kr i teksten fanges i fangstfasen før knappens egen handling; boksen #stortkjop spør «Tilby våpenhvile for
  2,7 mill. kr?» med «Ja, betal …» / «Nei, tilbake» (Esc). «Ja» trykker knappen igjen (eller samme tekst i samme panel når panelet er tegnet på
  nytt). Dekker pakter (våpenhvile, allianse), firma-samarbeid, børs (kjøp, tilbakekjøp), byavtaler («Gjør avtale» i region-visning), utstyr,
  morgenmøtets kjøp (leiesoldater) osv. uten å endre de filene. Ikke kjøp: Ja/Nei, Selg, Riv, Avbestill, «By over», oppdrag som betaler,
  emisjon/notering, «Legg av»; knapper med egen bekreftelse hoppes over (#byggvalg, #avtalekort, data-advarsel avtale/avtale-rute).
  Per døgn-priser («kr/døgn») teller ikke. I testene av til `StortKjøp.test = true`.
- `spill/leir-visning.js`: `BEKREFT.kr` 3 mill. → over 1 mill. (leser StortKjøp.REGLER.grense) – samme regel for bygg.
- «8 døgn igjen» med 7 valgt: `Firma.paktTekst` rundet opp når klokka ikke var et helt minutt (slutt er rundet). Nå ett minutts slakk
  (test i test_firma.js).
- Skript-tagg: `storkjop.js` rett etter `strategi-visning.js` i index.html.

## 3. [MIDDELS] Ett pausekort om gangen
- `spill/morgen-visning.js`: den store beslutningen er sitt eget kort. Etter valget i morgenmøtet lukkes møtet, og beslutningen står i
  kortkøen («Et kort venter: Viktig beslutning: …») og kommer etter `STOR_PAUSE` = 45 s ekte tid (Claudes forslag) eller straks fra brikka.
  Kortet har overskriften «Viktig beslutning», uten røverlinja og «I dag: …». I testene som før (straks i samme kort) til `MorgenSpill.køTest`.
- `spill/forsvar-visning.js`: banneret «Forsvaret er satt» (ingen røvere i kartet: klassen `stille`) skjules mens morgenmøtet, et
  hendelseskort, et samfunnskort eller velkomsten står (CSS `:has`). Når røverne er i kartet, står banneret som før.
- `spill/logglager.js`: «Velkommen tilbake» venter mens Selskapet, Krig, Leir, Folk, Tropper, Deg eller verdenspanelet er åpent; åpnes et slikt
  panel mens velkomsten står, viker den og kommer igjen når panelet er lukket (farten den stoppet, huskes).
- IKKE gjort: morgenmøtet selv kan fortsatt komme mens Selskapet er åpent (bilde 45).

## 4. [LAV] Morgenrapporten
- `spill/forsvar-oppgjor.js`: `Oppgjor.tekst(før, nå, { utenTropp })` – morgenmøtet tar ikke med «… gikk inn i Speidertropp 1» (spilleren gjorde
  det selv; de står heller ikke som «ikke lenger i leiren»). Loggens døgnoppgjør er som før. Test i test_forsvar_oppgjor.js.
- `spill/simulering.js`: et lag uten kampklare menn (hp ≥ 1) skriver ikke «… er framme».

## 5. [LAV] Skade på karakteren i angrepsrapporten
- `spill/forsvar-visning.js`: helsa (SpilletSpill.K().hp) og mannen i karakterlaget huskes ved angrepets start og laveste underveis
  (KROKER.sim). `Forsvar.sluttRapport` (spill/forsvar.js) får `u.karakter` og skriver «Ingen tap i lagene. Du ble truffet – helse 64 av 100.»
  (eller «Du (…) ble slått ut.») i stedet for «Ingen tap hos oss». Test i test_forsvar.js. Ikke prøvd i et ekte angrep i nettleseren.

## 6. [LAV] Farten senkes ikke ved hvert ferdig bygg
- `spill/flyt.js`: ferdig bygg senker farten bare når `valg.bygg` er på (ny knapp «Senk farten også når et bygg er ferdig: av» i Leir → Mål).
  ⏭ stopper fortsatt ved ferdige bygg. Reglene (Flyt.HENDELSER) er uendret.

## 7. [LAV] Kjøretøyene starter i leiren
- `Oppstart.startplasser` (spill/oppstart.js): kjøretøyene står innen `o.kjNær` = 250 m (Claudes forslag; troppene kan bruke kjøretøy innen
  300 m) – på veg når det finnes så nær, ellers flatt land; først uten land så nær, lenger ut som før. Test i test_oppstart.js. På /norge ved
  Lillehammer: 101–219 m.

## Vakt
`pipeline/fliser/vakter/ut8-kr-krig.js` (ca. 2–5 s): prøvetettsteder (et belte med bygdevern på tvers og et mål bak) – bekreftelsen sier
«Marsjen går gjennom Vakt kr-belte – bygdevern ca. N mann» før laget går, «Send likevel» er rød, «Neste trekk» vet om ruta, ingen rute uten
ruteTest; store kjøp (2,7 mill. stoppes og spør, «Ja» kjøper, «Nei» ikke, 900 000 kr rett gjennom); morgenmøtet + stor beslutning som to kort;
velkomsten venter på Selskapet; ferdige bygg senker ikke farten. Feil med vilje (rutefaren tatt ut, grensen 1 mrd.) ble funnet.
Vakta trenger INFRA.tettsted (sjekk.js leverer infrastrukturen).

## Fellesfiler endret (små, samlede endringer)
index.html (én skript-tagg), leir-visning.js (BEKREFT), logglager.js (velkomsten), forsvar-visning.js (banneret, karakteren), forsvar.js
(sluttRapport), forsvar-oppgjor.js (utenTropp), morgen-visning.js (to kort), flyt.js (bygg), oppstart.js (startplasser), simulering.js
(framme), firma.js (paktTekst), strategi.js (trekk), strategi-visning.js.
