# ut4-fiksa – feil fra full kontroll (sjekk.js, PC) etter flettingen

Gren `claude/ut4-fiksa`. Gjenskapt på den nyeste koden med `SJEKK_PROFIL=PC SJEKK_DEL=rask` og med vaktene hver for seg
(scratchpad `vakt1/kn.js`). Alene feilet bare `ut1-selskap` («Byer viser ingenting»); de andre feilet bare i den lange kjøringen,
der vaktene før har latt tilstand stå igjen (lag, nivå, trinn, lager).

## Rettet i spillet
- `spill/byavtale-visning.js` (fanen Byer i Selskapet): uten tettsteder i området viste fanen bare innledningen. Nå står det
  «Ingen tettsteder i området ennå. Kartet laster kanskje fortsatt.» (samme tekst som selskapspanel.js hadde før byavtalene tok over fanen).

## Rettet i vaktene (gamle forventninger eller tilstand fra vaktene før)
- `vakter/ut1-selskap.js`: byene i fanen har klassen `.ba` (byavtale-visning.js), ikke `.by` – begge godtas. Storlia-kortet: etter
  ut3-varekontrakt sier kortet «Storlia har en tømmerkontrakt …» og åpner Kontrakter når selskapet alt er på trinn 2 (vaktene før har
  levert og bygd). Vakta forventer nå tekst og fane etter trinnet.
- `vakter/selskap.js`: prøvekontrakten krevde nivå 2 («Kjent i bygda») når tilbudet var laget med høyere nivå – kontrakten settes nå
  til `nivå: 1`, så «Ta» virker uansett hva tilbudene ellers krever.
- `vakter/ut2-byer.js`: «1. lag, Dombås» sto 1 km fra prøvebyen (6 km øst for leiren) etter vaktene før, holdt løftet og var «framme»
  ved bønnen om hjelp. Egne lag innen 6 km fra prøvebyene flyttes 20 km vest mens vakta går, og settes tilbake etterpå.
- `vakter/balanse.js` (runde 4): varelageret (G4) lar røverne ta bare det som ligger ute. Lå treet i et lagerbygg fra en vakt før,
  tok de betong/stål i stedet. Forventningen regnes nå fra `VarelagerSpill.ute()` (20 % av det som ligger ute, høyst av 10 m³) – planen
  sier at røvere stjeler bare det som ligger ute, så spillet har rett.
- `vakter/ut3-varer.js`: en vakt før kan skrive rett i `L.lager` uten at spillets egen avstemming (hvert sekund i sim) har gått. Vakta
  starter nå med `VarelagerSpill.avstem()`, ellers sto den gamle forskjellen igjen i alle sum-sjekkene (og «tilbake»).
- `vakter/luft.js` (lys og byger, ikke i lista, men feilet i rask kjøring): three.js lastes nå i bakgrunnen også i 2D (spill2d.js), mens
  tåka kobles først når 3D åpnes (init3d). Sjekken av `uLuftF` gjøres bare når `R3.renderer` finnes.

## Status
- Rask PC-kjøring (rask3, 05:15) etter rettingene: alle seks i oppdraget ok. rask7 (05:32): selskapet, ut1-selskap, ut2-byer,
  balanse og ut3-varer ok; lys og byger ok.
- ut3-varekontrakt («et døgn uten ved ga ikke bot») er USTABIL: ok i rask1–rask4, feil i rask7 med {"bot":60000,"kassa":0,"mist":0} –
  døgnet ble verken levert eller mistet (k.døgnGjort gikk ikke opp i SS.steg(1)). Årsaken er ikke funnet.
- Står ellers igjen (ikke i min liste): folk, lyd i 2D (fiksb), maskinfolk og bærere (F3), «FEIL i nettleseren» (RangeError i
  terreng.js nyttVindu fra oppdaterSikt, negativ lengde), og i rask7 også kamp (0 kamphendelser) og ui (Leir-menyen husker rullingen 799,
  tallflisene dekket) – de to siste var ok i rask1–rask3 og er trolig tidsavhengige under last.
- maskinfolk (F3): består alene og etter ut1-jobber … ut3-riving og ut3-varer/ut4-balanse2, men feiler i rask kjøring. Diagnose (rask7):
  tømmeret havnet i et lagertelt fra en vakt før (bygg 5, ca. 70 m fra leiren), ikke i vaktas eget lagertelt; fire bærere står i fasen
  «hent» med enhetene reservert og m: 0 i hele løpet (turer 0) – de kommer aldri fram til det lagerteltet. Ikke rettet.
- rask5/rask6 krasjet siden («Target crashed») på tilfeldige steder mens maskinen var hardt belastet (last 8–9 på fire kjerner).
