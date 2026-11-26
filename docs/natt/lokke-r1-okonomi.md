# Kritikerløkka runde 1 – pakke «økonomi» (tall, mål og tekster), 26. nov

Gren: `claude/lokke-r1-okonomi`. Anmeldelsene: docs/kritikk/2026-11-26-r1-*.md. Bilder etter: scratchpad lokke/r1/okonomi/.

## Hva som er laget
1. **Én lapp og én prioritert liste** – ny `spill/neste.js` (regler uten DOM: `Neste.sorter`, test `pipeline/fliser/test_neste.js`;
   visning `window.NesteSpill`). Kildene: angrep, den første kontrakten (tråden), aktiv kontrakt, opplæringssteget, scenariet,
   ledige tilbud og neste mål. Prioritet (Claudes forslag, `Neste.REGLER.prio`): angrep 100, tråd 90, kontrakt med frist under 6 t 80,
   opplæring 70, kontrakt 60, scenario 55, tilbud 50, utsatt opplæringssteg 45, mål 40. Like tekster står én gang.
   - Neste-lappen (spill/selskap-visning.js) viser den øverste, og på PC «Så: …» (nummer to) i samme lapp (trykk på «Så» = det).
   - Opplæringsruta (spill/opplaering.js) står ikke lenger som egen lapp: steget står i Neste-lappen («Opplæring 6/9: Mer forsvar før
     dag 4 · 1/2 på vakt»), og trykk på lappen folder ut ruta med tekst og knapper (Hopp over, Senere, Slå av, Hjelp); nytt trykk
     eller «–» legger den inn igjen. Ringen som peker, står som før. API: `OpplaeringSpill.lappInfo()`, `.utvid(på)`, `.utvidet()`.
   - Leir → Mål: delen «Nå» øverst (Nå: … / Så: … med «Gå til» / «Vis steget»), og boksen over fanene sier «Nå (…): …» – det samme
     som lappen. Systemene (scenario, krig, mål, oppdrag, historie, opplæring) er urørt; bare visningen er samlet.
   - I testene (navigator.webdriver) er alt som før til `NesteSpill.test = true`.
2. **Én regel for inntekt per tettsted** – `Region.inntekt(folk, type, { b, holdt, strøm, rute, garnison, utenStrøm })` og
   `Region.krRund` (spill/region.js). `RegionSpill.inntekt(id)` / `.inntektTekst(id)` (region-visning.js): holder du stedet, det det gir nå
   (= Lager og Region); ellers det det gir rett etter at du tar det (start-lojalitet, eller lavere hvis du har mistet det før, og
   handelsruta/strømmen slik de er nå). Krig («Hvis du tar det …», «ville gitt …») bruker den, og sier fra når ruta hjem er truet/stengt.
   Loggen «Kvam er deres» sier nå «folket la til 250 000 kr i dag (engangsbeløp). Deretter gir Kvam ca. 40 000 kr per døgn i skatt.»
   Lager → Penger inn runder til nærmeste tusen som Krig.
3. **Kontrollrommets pris** – Mål og startrådet bruker `LeirSpill.totalPris('kontrollrom')` (samme som byggelistas «i alt»), med
   `Leir.kroner`. Målteksten har ikke lenger «ca. 12 mill.»/«9 mill. arbeid» (`Maal.hjelpNå`, `hjelpT`).
4. **Loggspam** (spill/loggdemp.js): en melding som gjentar seg innen vinduet, flyttes bare øverst igjen ved ×2, 3, 5, 10, 25, 50 …
   (`REGLER.visVed`); «… har lastet nødlageret» / «… har med seg …» bare én gang per døgn (`REGLER.ENGANG`).
   ÅRSAKEN til ×22 ligger i spill/selskap-visning.js (ikke min fil): `vurder()` for forsyningskontrakten logger «har lastet
   nødlageret» hver gang den kalles, og lappen kaller den hvert halve sekund før `k.hentet` er satt av `Selskap.steg`. Forslag: logg bare
   når `k.bærer !== her.navn` (linje ca. 116 og 122).
5. **Velkommen tilbake** (spill/logglager.js): `oppsummer(L, R, nå)` tar bare meldinger fra de siste `REGLER.nylig` = 120 spillminuttene
   før lagringen; er ingen så nye, bare den siste viktige med klokkeslett og «etter det var det stille til spillet ble lagret».
   Boksen sier hvilken dag og klokke spillet står på.
6. **Gått til fots** (spill/karakter.js): viser det største av karakterens 3D-teller og `EventyrSpill.tellere().gått` (samme tall som
   historien og målene; spill2d.js legger meterne i kartet der).
7. **Lojalitet** (index.html, visPanel): egen karakter (`s.karakter`) vises uten «lojalitet …».
8. **Været** (spill/vaer-visning.js `siktTekst`): «Det klarner opp. Sikten er 30 % av vanlig nå og blir bedre den neste timen.» –
   eller «Sikten går ned mot 30 % av vanlig (nå 70 %).» (været blandes over en time eller to).
9. **Funn i hus** (spill/leting.js `STEMNING`, `stemning(kl, i, f)`, `medStemning`): 40 korte setninger etter byggtype (bolig, hytte,
   gård, butikk, offentlig, industri, kirke) og det viktigste som ble funnet (eller tomt), fast per bygg. I funnpanelet (kursiv) og i
   meldingen etter første setning («Du fant … . Kassaapparatet er brutt opp … Lagt i leiren: …»). Gjelder 2D og 3D (samme `ferdig`).
10. Morgenmøtet/«Mer forsvar før dag 4»/«Reparer byggene»: dette er opplæringssteg 6 og 9 – se punkt 1.

## Fellesfiler endret (små, samlede endringer)
- `index.html`: én linje i visPanel (`s.karakter ? '' : ' · lojalitet …'`) og skript-taggen `spill/neste.js` etter scenario-visning.js.
- `spill/selskap-visning.js` (kontrakt-hjelperen): klikk på lappen bruker `vistLapp` (trykk/såTrykk), plasserLapp spør
  `NesteSpill.velg(l0)` og legger «Så: …» i `<i class="saa">`; loggen «… er deres» sier engangsbeløpet og skatten per døgn.
- `spill/penger-visning.js`: «betaler ca. X kr i skatt» rundes med `Region.krRund`.
- `spill/oppstart-visning.js`: startrådet bruker `LeirSpill.totalPris('kontrollrom')`.
- `spill/leir-visning.js`: `/^Nå$/` først i `DELREKKE.mål` (delen «Nå» øverst i fanen Mål).

## Prøvd
- Regeltester: test_neste, test_loggdemp, test_logglager, test_leting, test_region, test_maal, test_opplaering, test_leir.
- Vakt `pipeline/fliser/vakter/lokke-r1-okonomi.js` (PC og mobil ok, ca. 6 s; feil lagt inn med vilje – lappen uten Neste og
  loggdemping av – ble funnet). Kjørt også: ui, nybegynner, regnskap, balanse, spill2d, leir2d, morgen, selskap, karakter (ok).
  kontrakter og okonomi feiler – likt på grunnlaget 2b3109c (ikke fra denne pakka).

## Ikke gjort
- garnison-visning.js «X er vårt.» sier ikke inntekten (ikke min fil) – kan bruke `RegionSpill.inntektTekst(id)`.
- hjelp-natt.js sier fortsatt «Kontrollrommet (9 mill. kr)» i ett emne.
- Krig-panelets prosent/scenario er ikke flyttet; «Din historie» står fortsatt i Deg (den er med i ingen liste).
