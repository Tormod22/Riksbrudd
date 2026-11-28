# ut8-kr-telefon – det Jonas Bakke (telefon) fant om skjermen, klikk og angrep (28. nov)

Kritikken: `docs/kritikk/2026-11-28-ut-jonas-bakke.md`. Alle nye tall er Claudes forslag (står i REGLER-objektene).

## 1. Trykk som forsvant på høy fart (MIDDELS)
- Årsaken (målt): paneler som tegnes på nytt bytter ut knappen mellom «ned» og «opp». Med mus fyrer Chrome da INGEN click (pointerdown på den
  gamle knappen, pointerup på den nye). Med berøring treffer Chrome det som står der fingeren slapp (målt med tap), så på ekte telefon er
  faren mindre – men Folk-panelet ble også tegnet på nytt fra KROKER.sim (lederne hvert 20. spillminutt, jobbtavla, søkerne:
  `FolkSpill.vis()` uten noen sjekk – på 600× hvert 2. sekund), og et skript som holder på en knapp (slik kritikerens Playwright gjør), mister
  den når panelet tegnes på nytt. Leir → Bygg: `visMeny()` ble kalt fra steget (bygg ferdig, ny jobb) uten sjekk.
- Ny fil `spill/trykkvakt.js` (lastes rett etter etikett.js), generelt for alle paneler:
  1. `pekerNede(el)` svarer også sant i `Trykkvakt.REGLER.hold` = 350 ms etter at fingeren slapp – men ikke mens nettleseren behandler en
     hendelse (`window.event`), så et panel som knappen selv oppdaterer, gjør det straks. Paneler som tegnes av seg selv, venter.
  2. Tapt klikk leveres: ble knappen fingeren gikk ned på, byttet ut, og står det en lik knapp (samme merke, tekst, id, data-felter,
     aria-label) der fingeren slapp, får den klikket – én gang (venter 60 ms på nettleserens eget klikk; et sent ekte klikk etter at vi
     leverte, stoppes). Bare ekte (isTrusted) peker-hendelser teller. `Trykkvakt.spor` = de siste avgjørelsene, `Trykkvakt.levert` = antall.
  3. `Trykkvakt.bytt(boks, nye)`: delene av et panel som ikke er endret, blir stående (samme node). Bokser med samme merke og ident
     (id/data-*) og uten hendelser gås inn i; knapper og felt med hendelser beholdes bare når de er helt like (ellers byttes de – ingen
     gamle lukkinger). Folk-panelet bruker den, så «Gi lønnstillegg» beholder identiteten når «Svar innen 12 t» blir «11 t».
- `spill/folk-visning.js` vis(): venter når `pekerNede(panel)`, og bytter inn med `Trykkvakt.bytt`.
- `spill/leir-visning.js` visMeny(): kall som ikke kommer fra selve trykket, venter når `pekerNede(menyEl)` (utsatt = true; neste sekund tegner).
- Ikke rettet her: andre paneler som tegner hele `innerHTML` på nytt med delegering (Selskapet, firma, børs …) – de har allerede
  `pekerNede`-sjekken og får nå 350 ms-holdet gratis; identiteten beholdes ikke der (Selskapet eies av andre i denne runden).

## 2. Bølge 2 som gikk i stå (MIDDELS)
- `Spillet.Trussel.LEI` fikk `stå: 45, fram: 100` og `Trussel.framSteg(q, d, dt)`: et røverlag som ikke er kommet 100 m nærmere leiren på 45
  spillminutter (ikke i leiren, ikke i kamp, venter ikke på mørket; går det, teller tida halvt – omveier rundt fjorden), gir opp som før
  (`e.flykter`, `e.lei` – «har gitt opp angrepet og trekker seg unna»), UANSETT hvor langt unna det står. Før talte «går lei» bare for lag som
  hadde vært innen 1 km – et lag som sto fast 1–2,5 km unna (eller som hadde vært i leiren og sto 420 m ute), holdt bølgen i gang.
  Kroken er nå `SpilletSpill.leiSteg(dt)` (samme som før, pluss framSteg); `e.leiNærmest`, `e.stå` på laget.
- ⏭ på 10×: `ForsvarSpill.kampPågår()` (forsvar-visning.js) – etter at kampen har begynt, regnes den bare som i gang når noen har skutt de siste
  `KAMP_STILLE` = 20 spillminuttene (eller røverne er innen 500 m). Før holdt ⏭ seg på 10× resten av angrepet.
- Ikke laget: å vise et lag som kommer igjen fra en annen kant som «ny bølge» – laget gir heller opp og går.

## 3. Kort om fest midt under angrepet (LAV)
- `spill/telefonro.js` kobler seg på kortkøen (`Kortkø` i samfunn-visning.js): `ta(id)` og `ledig()` svarer nei for kort som ikke haster mens
  `ForsvarSpill.angrep()` finnes – kortet står i køen og kommer når angrepet er over. «Et kort venter» (Kortkø.nå) viser det likevel.
  Virker ikke i testene før `Telefonro.test = true`. Hvis kr-krig bytter ut Kortkø, kobler telefonro.js seg på det nye objektet så lenge
  metodene heter ta/ledig/nå/be/eier (det prøves hvert 0,3 s i 20 s etter lasting).

## 4. Navn oppå hverandre / Speiderbil på fjorden (LAV)
- Speiderbil 1 «midt på fjorden» var navnet på en bil UTENFOR skjermen, klemt inn fra kanten av `klampNavn` i spill/kompakt.js – da så
  etikett.js aldri at merket var utenfor (den har regelen: kjøretøy utenfor skjermen = ikke noe navn; fiender/valgt = navn med pil). Nå klemmes
  et navn bare inn når selve punktet er på skjermen.
- `spill/etikett.js`: tekst som en modul tegner rett i kartet med fillText mens rammen pågår (uten Etikett.tekst), blir en hindring for
  navnene som plasseres til slutt (`direkte()`; prioritet som kartnavn, så de viktigste kan fortsatt stå oppå). Høyden på et navn følger
  skriftstørrelsen (15–16 px får 16–17 px ramme i stedet for 15).
- Koblet til Etikett: «inn/ut 3,3 m³» ved maskinene (baering-visning.js: feltet er hindring, teksten plasseres), «Vårt · Kaserne»
  (husvern-visning.js), produksjonstavla over maskinen (produksjon-visning.js: hindring).
- Ikke gjenskapt i Ulvik: «Nattskift» over «Helikopter» (begge går alt gjennom Etikett; bildet viste dem dempet bak byggevisningens slør).
  På /norge ved Ulvik (telefon) sto navnene ved leiren fritt (bilde i scratchpad natt/ut8-kr-telefon/norge-naer.png).

## 5. «Vis i kartet» bak panelet og marsjmålet utenfor skjermen (MIDDELS)
- `spill/telefonro.js`: et trykk på en knapp med teksten «Vis i kartet» (alle paneler: Selskapet, Leir → Mål, byer …): flyttet knappens
  handling kartet, og står målet (midt på skjermen) under panelet, legges målet midt i det frie feltet over/under panelet når det er minst
  `REGLER.minFri` = 170 px høyt og panelet går over hele bredden – ellers lukkes panelet (×-knappen i panelet). Prøvd på /norge (Selskapet,
  kontrakten «Hent nødlageret»): panelet lukkes, nødlageret står midt på skjermen.
- Marsjer: når et eget lag får `modus = 'marsj'`, og det finnes et oppdrag du har tatt eller en aktiv kontrakt innen 15 km som ikke står i
  bildet, zoomer kartet ut (aldri inn, høyst 60 m per punkt) så både troppen og målet står i det frie feltet (`Telefonro.passInn`).
- Regler uten DOM: `Telefonro.friFelt`, `Telefonro.passInn` (test_telefonro.js).

## 6. Tekster (LAV)
- leirvirkning.js KORT_ELDRE: øvingsfelt «opplæring av folk», minnesmerke «moral +2–5» (var «bare utseende»).
- forsvar-visning.js visRapport: nevner rapporten skadde bygg med navn («Brakke, Kjøkken og Sagbruk skadet»), legges ikke «2 bygg er skadet»
  til (det tallet telte bare byggene under 98 % nå).
- Flyktninger og folkenes historie: `Samfunn.nærSteder` (samfunn.js) – telefonro.js setter de 12 nærmeste tettstedene 3–60 km fra leiren
  (Ulvik: Granvin, Eidfjord, Kinsarvik, Ålvik …). Færre enn tre (Dovre-testsiden) = den gamle lista.
- Krigskartet: tunnelnavnene tegnes ikke når krigskartet er åpent (index.html, tegnInfra – én betingelse).

## Fellesfiler endret
- index.html: to skripttagger (trykkvakt.js etter etikett.js, telefonro.js før kompakt.js) og tunnelnavnet (`StrategiSpill.erÅpen()`).
- etikett.js (direkte(), høyden), kompakt.js (klampNavn), folk-visning.js (vis), leir-visning.js (visMeny), spillet.js (LEI, framSteg, lei),
  spillet-visning.js (leiSteg), forsvar-visning.js (kampPågår, rapportteksten), samfunn.js (nærSteder), leirvirkning.js (to tekster),
  baering-visning.js, husvern-visning.js, produksjon-visning.js (Etikett).

## Tester og vakt
- Nye: test_trykkvakt.js, test_telefonro.js; utvidet test_spillet.js (framSteg).
- Kjørt grønt: test_etikett, test_spillet, test_samfunn, test_leirvirkning, test_forsvar, test_flyt, test_tida, test_kommando.
- Vakt `pipeline/fliser/vakter/ut8-kr-telefon.js` (PC og mobil, 5–8 s): lønnstillegg med panelet tegnet på nytt mens knappen er nede,
  identiteten, klikk på en byttet knapp levert én gang, røverlaget som står fast gir opp, ⏭ ikke låst uten skudd, kort holdes tilbake under
  angrep, navn unna direkte tekst, kjøretøy utenfor skjermen ikke klemt inn, Vis i kartet / Marsjer. Feil lagt inn med vilje (pekerNede-
  sjekken, leveringen, framSteg, klampen, direkte()) ble fanget.
- Vaktene ui, skjerm-r2, skjerm-r3, lokke-r3-angrep, telefon og krig er grønne på PC og mobil hver for seg. NB: «krig» feiler når den kjøres
  rett etter ui/skjerm-r2/skjerm-r3/lokke-r3-angrep/telefon i samme side – det gjør den også på grenen før mine endringer (ikke min feil).
