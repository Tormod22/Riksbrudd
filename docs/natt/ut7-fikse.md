# ut7-fikse – de siste feilene i full kontroll (28. nov)

Gren `claude/ut7-fikse` (fra `claude/nattfiks`). Tre feil fra kjøringen før retting D (snap-ut6pc/-mob).

## 1. «interiør: prøvehuset …» (PC og mobil) – ekte feil, rettet i spillet
- Kravet som feilet: `inne`/`påGulv`/`y > 1` (og på PC også `vegg`): du kom ikke inn gjennom døra, stoppet 0,2 m utenfor.
- Årsak: B2 (etasjer3d.js `tilpass` → `planFra`) lager 1. etasje av byggemodellen når planene er ulike. Modellens dør sto et annet sted
  (0,38 av veggen, hus3d-regelen for saltak) enn 3D-husets dør `P.dør` (prøvehuset har døra midt på), og en skillevegg fra modellen
  sto 0,25 m fra midten av døra – innenfor døråpningen. Inngangene og ytterveggene står som før (P.dør), så veggen sperret.
- Retting: `Interior.friInngang(pl)` (interior.js, regler uten DOM) tar bort veggbiter (Liang–Barsky) og sperrende møbler i en sone rett
  innenfor hver inngang: døras bredde, fra 0,3 m utenfor til 1,6 m inn (`Interior.FRI`, Claudes forslag). `planFra` kaller den.
  I vanlige hus (modellens dør = P.dør) og i planer fra `plan()` tar den ingenting (testet). Test: tre nye linjer i test_interior.js.
- Prøvd: ordrett kopi av sjekken i nettleseren (PC): før `inne false, y −0,2`; etter `inne true, påGulv true, y 1,27`.

## 2. «terreng … huset i den bratte lia ble ikke avvist» – regelen er den samme, forventningen rettet
- Regelen (byggesett-visning.js): et ferdig hus avvises når høydeforskjellen under det er over `max(Leir.BRATT = 8 m, 35 % av diagonalen)`.
  Den er ikke endret. Men i byggesett 3 (1,2 m-ruter) er brakka 9,6 × 6 m (før «3 × 4» ruter à 2,4 m = 9,6 × 7,2 m), og på stedet vakta
  finner (190600, 6902225) er det bare ca. 7 m forskjell under den – under 8 m. Per del (1,2 m) blir aldri noe for bratt.
- Retting: vakta (vakter/terreng.js, 3c) prøver Hallen 19,2 × 28,8 i lia: «For bratt for huset (29 m høydeforskjell under det)», og den
  samme hallen ved leiren godtas. Feil med vilje (grensen satt til 1e9) → vakta melder «huset i den bratte lia ble ikke avvist».
- Ikke gjort: å stramme regelen for små hus (f.eks. helling i grader i stedet for 8 m) – det er en fagregel brukeren bør bestemme.

## 3. «måling av ytelse» (bare PC) – ekte (tidsavhengig), rettet i spillet
- Kravet som feilet: `halvBredde < 0,7 × bredden` (840 av 840). Under «halv oppløsning» endret lerretet seg først i neste bilde
  (størrelse3d i tegn3d); med trege bilder fikk kontrollen bare sett lerretet før det, og målingen tok første bilde i full oppløsning.
- Retting (spill/ytelse.js): `nyStørrelse(R)` kaller størrelse3d straks når R.målPr settes og tas bort (forrige bildetid beholdes).
  I tillegg står oppløsningen i ro `ROLIG = 3000` ms etter målingen (Claudes forslag) – på en treg maskin gikk den ned fra 0,9 til 0,8
  rett etter, og da feiler `etter.pr === før.pr`.
- Prøvd: ordrett kopi av sjekken (PC): halv oppløsning 630 av 1260 i første avlesning, etter = før (0,9 / 1260), 0 på skjult lag.

## Annet
- ut5-bors og ut5-oppforsel (F4): grønne på PC (kn.js).
- Fellesfiler endret: `site/dovre-fliser/index.html` bare versjonsmerkene (versjon.py) for interior.js, etasjer3d.js og ytelse.js.

## Siste kjøring (SJEKK_PROFIL=PC, 28. nov ca. 07:30, 1209 s): 2 feil
Rettet og grønne nå: «måling av ytelse» (halv oppløsning 420 av 840), «interiør» (du går inn, står på gulvet), «terreng» (hallen
avvist i lia), ut5-bors og F4. Igjen (nye siden snap-ut6, ikke rettet – tiden rakk ikke):
- «spill i 2D» (vakter/spill2d.js): `{"mangler":true,"hva":"karakter"}` – ingen levende karakter (ENHETER med e.karakter) når vakta går.
- «etasjer (2D og 3D)» (vakter/ut3-etasjer.js): «ingen karakter i kartet» (Spill2D.karakter() er null) – samme årsak.
- Begge går grønt når vaktene lokke-r1 … regnskap, spill2d kjøres alene etter en ny start (karakteren lever hele veien), og karakteren
  lever etter interiørsjekken (prøvd). Karakteren forsvinner altså et sted i 3D-delen av sjekk.js eller i en vakt a–l. Neste steg: skriv
  ut `ENHETER.find(e => e.karakter)` etter hver vakt i kjørVakter (eller kn2.js i scratchpad natt/ut7-fikse med vaktene a–l).
