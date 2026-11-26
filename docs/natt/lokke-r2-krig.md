# Kritikerløkka runde 2 – pakke «krig» (26. nov)

Grunnlag: docs/kritikk/2026-11-26-r2-ingrid-saether.md («Hold byen» ved Elverum). Alle nye tall er Claudes forslag.

## Rettet
1. **Scenariobyen i Krig** (strategi-visning.js `scenarioBy`): byen i «Hold byen» står øverst i Krig (i scenarioboksen) med folketall, eier,
   avstand fra leiren, forsvar, «Send minst N mann – dere har X innen 30 km», og knappene «Send …» / «Send N lag», «Gjør avtale (pris)» og «Vis».
   Bygdevernets melding i loggen henviser nå til Krig (før «Leir → Mål», der avtalen ikke fantes).
   Tettstedspanelet (trykk på et tettsted du ikke holder, region-visning.js KROKER.info): bygdevernets styrke (eller «anslått – ikke møtt ennå»),
   fiender dere vet om, «Send minst N mann – dere har X», og knappene «Send …» (åpner Krig med stedet valgt og sender – advarslene står der),
   «Gjør avtale (pris)» og «Vis i Krig».
2. **Lagene regnes sammen og ett tall** – `Strategi.anbefalt(minst, forsvar)` = det inntaket krever, og mer enn det kjente forsvaret.
   Brukt i speiderrapporten (før «flere enn 7»), «framme men tar det ikke» (hvorforIkkeTar: én melding med alle lagene ved stedet og summen,
   lag utenfor kanten nevnes), garnison-visning «For få til å ta …» (alle lagene, summen, ny melding når summen endrer seg) og bygdevernets
   melding. Strategi.trekk samler nå lag til de er flere enn forsvaret (t.flere), ikke bare til inntakets krav.
3. **Låsen i tettstedet**: ingen lagret økt å lese, så «den andre siden» ble ikke funnet sikkert. Sannsynlig: et fiendelag (røvere på vei mot
   leiren nord for Elverum, et motstanderlag i fredstiden, eller rivalens «angrepslag» fra eskortekontrakten, som aldri fjernes – selskap-visning.js)
   sto i eller gikk gjennom byen. Rettet: (a) et lag som bare går gjennom et tettsted (målet utenfor), sperrer ikke når en annen side står der
   (garnison-visning `holdere()`); (b) «Kamp om …» sier nå hvem som står der («Røvere 2.1 (røverne)» / «et lag dere ikke ser») og meldes høyst én gang i
   timen for de samme lagene. Et bygdevern som har gitt opp (T.vern = 0) sperret ikke fra før (sjekket i krig-visning, garnison-visning, strategi-visning).
4. **Egne lag live med radiokontakt**: Kontrollrom.innsyn('ute') gir live = kontakt. «Sist meldt» bare uten kontakt, med «(for 2 t 10 min siden)».
5. **Varsel ved marsjordren** (KROKER.rute): kontrollrom-visning.js – «Merk: Vaktlaget mister radiokontakten etter ca. 2,9 km av marsjen – håndradioen
   når 3 km …; feltradio eller radiomast gir lengre rekkevidde» (luftlinje fra leiren, terrenget ikke regnet). krig-visning.js – en speidertropp som
   får ordre inn i et forsvart sted, får beskjed straks om at den stopper før og hvordan den sendes inn likevel.
6. **Neste trekk**: Strategi.trekk tar `forsvarAv` (kjentForsvar: bygdevern, fiender sett, anslått garnison). Et sted der forsvaret er minst like stort
   som alle lagene innen marsjavstand, er «for sterkt» (rang som «for få», poeng × REGLER.sterk = 0,15) og raden sier «send minst N mann».
   Avstanden i raden er nå fra leiren.
7. **Kontrakter** (selskap.js, liten endring i økonomi-hjelperens fil): jobber (ikke bare eskorte) legges ikke i et tettsted et annet selskap holder
   når det finnes andre; ellers får de k.fare, teksten sier «holdes av et annet selskap – regn med kamp mot garnisonen der», og «bygdevernet slipper
   dere inn» står ikke (vernetVet krever ingen k.fare). Test i test_selskap.js.
8. **Samme punkt**: scenario-visning.js velger byen som leirvalget (Garnison.nærmeste – avstand til omrisset) og husker den (T.sc.målId; lagrede spill
   som alt holder byen beholder den gamle). Ringen «Scenariets by» og avstanden står ved navnepunktet (navnP). Teksten: «3,8 km SV – 2,5 km til kanten».

## Fellesfiler endret
- spill/strategi-visning.js (eies av kjoring for NaN): `bilde()` sender forsvarAv til trekk; raden i Neste trekk (avstand fra leiren, «for sterkt»);
  `speidRapport` (ett tall); `hvorforIkkeTar` + nye `samletVed`/`liste`; fram-løkka merker de andre lagene ved samme sted; `scenarioBoks(T0)` + ny
  `scenarioBy`; CSS `.scenby`.
- spill/selskap.js (økonomi): se punkt 7.
- pipeline/fliser/test_kontrollrom.js, test_strategi.js, test_selskap.js: nye/endrede tester.
- index.html: bare versjonsmerker (versjon.py).

## MÅ ENDRES I sjekk.js (jeg rørte den ikke)
K3-testen (linje ca. 574 og 645) krever `k3.bSkjultUte` – at et lag 1 km ute MED radiokontakt er skjult ute. Det er nettopp feilen Ingrid meldte.
Endre kravet til `!k3.bSkjultUte` (og teksten «ute bare «sist meldt»» til «ute: lag med kontakt vises»).

## Vakt
pipeline/fliser/vakter/krig-r2.js (ca. 1 s): for sterkt sted trekkes ned, scenariobyen i Krig med krav/Send/avtale/avstand fra leiren, lagene regnes
sammen i én melding, tettstedspanelet har Send og bygdevernets styrke, hvem som sperrer, lag med kontakt live / uten kontakt skjult, varsel ved marsjordren. Prøvd på PC og mobil (OK), og med feilen
lagt inn igjen (innsyn ute = live false) – vakta svarte FEIL. Den gamle krig-vakta er grønn på PC og mobil.

## Ikke gjort
- Rivalens «angrepslag» fra eskortekontrakten fjernes aldri (selskap-visning.js, økonomi) – kan stå igjen i et tettsted og sperre. Bør ryddes når kontrakten er levert.
- Varselet om radiokontakt regner ikke terrenget (bare luftlinje); Krig-advarselen før «Send» gjør det fortsatt.
- Nettbrettet gir nå ikke mer enn å være ute for egne lag (begge viser lag med kontakt; fiender bare meldt).
