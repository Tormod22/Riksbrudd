# Kritikerløkka runde 3 – pakke «kontrakt» (26. nov)

Anmeldelsene: docs/kritikk/2026-11-26-r3-jonas-bakke.md og -r3-ingrid-saether.md. Alle tall er Claudes forslag.

## Hva er gjort
1. **Nødlageret i vann (Jonas, Nesvik/Hjelmeland).** `landLager()` i spill/selskap-visning.js er skrevet om: ett lagVindu (32 m-ruter) rundt
   leiren, flomfylling fra leiren over ruter med `Terreng.fart > 0` (samme regel som `ordre()`), kandidatene må være fast mark med fast mark
   rundt (`LAND.kant`), utenfor tettstedene (`fri0`), 300–1050 m fra leiren, og ha en ekte `Terreng.ruteTil` på høyst 1,5 t. Poeng: nær
   900 m, nær veg, samme retning (tittelen). Ingen kandidat: alle retninger, så et punkt 110–220 m fra leiren. Årsaken til feilen: den gamle
   sjekken ble bare prøvd én gang (feilet kartet, ble lageret liggende) og sjekket ikke om troppen kunne gå dit. Nå prøves den hvert 15. sekund
   (steg) til `k.sted.land = 2`. Gamle lagrede kontrakter (land 1 eller uten) sjekkes på nytt så lenge lageret ikke er hentet.
   Gjenskapt på /norge ved leir (-1600, 6603300): lageret lå i fjorden (klasse 3), flyttes til land øst for leiren (rute 0,5 t).
2. **Ingen nye tilbud dag 2–3, opplæringen sto fast.** `steg()` sperret nye tilbud mens den første kontrakten pågikk (`tidlig`). Nå kommer nye
   tilbud HVER morgen (første dag bare den første kontrakten). `lagTilbud` tar aldri ut den første kontrakten når lista er full. Den første
   kontrakten har «Gi opp (ingen bot)» og en linje «Kommer ikke troppen fram?»; å gi den opp koster ingen bot og ingen rykte
   (`Selskap.bryt`), og tråden går til «Neste kontrakt» med egen tekst. Steget «Send troppen» nevner at jobben kan gis opp.
3. **Luftlinje i kontraktene (Ingrid, Byflaten).** Tilbudskortene regner marsjen fra leiren som `ordre()`: lagVindu + `Terreng.ruteTil`,
   `MÅL_PÅ_LAND`, og utenom fiendtlige tettsteder (`Krig.sperrByer`/`omvegOk`) – ellers står byene ruta går gjennom. Bare for tilbudene som
   vises, én om gangen, husket per kontrakt og leir (`SelskapSpill.marsj(k)`). Kortet viser «marsj ca. 35 km, ca. 9,4 t, gjennom Moelv
   (Mosevakt holder det)». `Selskap.marsjVurdering(k, m)` (regel, testet): ⚠ i stedet for ✓ når marsj × 1,3 (+ hold, + 1 t kamp for
   rydd, × 2 for hent) går over fristen, eller ruta går gjennom et fiendtlig tettsted, eller det ikke finnes rute. `REGLER.marsj = { slakk: 1.3, kamp: 1 }`.
4. **To tilbud på samme sted (Ingrid).** `lagTilbud`: aldri to tilbud/aktive kontrakter av samme type på samme sted (eskorte: samme fra og til);
   da velges et annet sted, ellers prøves en annen type (høyst 4 × antall forsøk).
5. **Avtalen i Krig (Ingrid).** spill/strategi-visning.js: `avtale(by, etter)` viser boksen #avtalekort («Det gir: bygdevernet slåss ikke mot
   dere og slipper dere inn … Det gir ikke byen: minst N egne mann må stå i byen …», «Ja, betal 8 mill. kr» / «Nei, tilbake») før pengene
   trekkes. Gjelder alle avtaleknappene (scenarioraden, valgt tettsted, advarselen før ordren, og lista i krig-visning.js via
   `StrategiSpill.avtale(id)`). Etter avtalen sier kravlinja «Avtalen gjelder: bygdevernet slipper dere inn uten kamp. For å ta byen må minst
   N egne mann stå der» (tallet er garnisonskravet `Garnison.minstFor`, det endres ikke av avtalen). I testene (webdriver) uten boksen til
   `StrategiSpill.test = true`.
6. **Om bord.** spill/tropper-visning.js: «Gå om bord i X» innen 60 m som før (nå med id `ombordknapp`); ellers «Hent X (850 m)» for et ledig
   eget kjøretøy innen 3 km (`HENT_BIL`) – troppen marsjerer dit og går om bord når den er framme (ny ordre avbryter). spill/kjoretoy-visning.js:
   trykk på NAVNET til et kjøretøy i kartet velger det (Etikett.tegnet()). **Båter** (spill/sjo-visning.js): lagpanelet har «Gå til Småbåt 1
   (2,1 km)» (innen 15 km), båtpanelet «Send <lag> til båten» / «Send <lag> hit» når ingen står ved båten; laget går (eller kjører med
   kjøretøyet) til land ved båten og går om bord. Et lag som sitter i et kjøretøy ved båten, går av og om bord. `SjoSpill.sendTilBåt(s, b)`.
7. **Småting.** «er framme ved målet og går resten av vegen til fots» (strategi-visning.js) i stedet for «går inn i tettstedet» etter «Kjør dit».
   Oppløses en tropp, legges kjøpte våpen (de levendes) og utstyr på lager i leiren (localStorage «riksbrudd-troppslager», per leir;
   `Tropper.tilLager/prisMedLager/lagerTekst`), og en ny tropp tar det derfra gratis (troppbyggeren viser «Fra lageret i leiren (gratis): …»).

## Fellesfiler endret
- site/dovre-fliser/index.html: bare versjonsmerkene (`python3 pipeline/fliser/versjon.py`). Ingen nye skriptfiler.
- spill/strategi-visning.js (avtaleknappen, avtaleboksen og CSS-en #avtalekort, kravlinja, ett ord i «framme ved målet»).
- spill/krig-visning.js: én linje – Avtale-knappen i lista går gjennom `StrategiSpill.avtale`.
- spill/kjoretoy-visning.js: trykk på navnet.  spill/sjo-visning.js: om bord.  spill/tropper.js/-visning.js: hent kjøretøy, lager.

## Tester og vakt
- `node pipeline/fliser/test_selskap.js` (91; nye: ingen like tilbud, marsjvurdering Byflaten), `node pipeline/fliser/test_tropper.js` (lager).
- Vakt `pipeline/fliser/vakter/kontrakt-r3.js` – ok på PC og mobil (Dovre-testsiden, 3–4 s) og på /norge ved Gjøvik (12 sjekker, også avtalen).
  Feilen lagt inn med vilje (landLager flytter ikke): vakta feilet på «gammelt mål i vann flyttet».
- kontrakt-r1, kontrakter, selskap, kjoring: ok. kjor-dit og krig-r2 feiler i dette miljøet også på utgangspunktet (ba95513) – ikke fra denne pakka.

## Ikke gjort / svakt
- Marsjen i tilbudene regnes fra leiren, ikke fra lagene der de står; eskorter får bare linja (ingen frist-vurdering – bilen kjører).
- «Hent kjøretøy» finnes bare i lagpanelet (ikke i kjøretøypanelet).
- Bykampen uten «Vis»-knapp, radiorådet, rekrutter midt i kampen, byggelista som hopper: andre pakker.
