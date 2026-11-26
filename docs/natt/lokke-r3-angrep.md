# Kritikerløkka r3 – pakke «angrep» (26. nov)

Rettet etter Jonas Bakke og Ingrid Sæther (docs/kritikk/2026-11-26-r3-*.md). Alle nye tall er Claudes forslag.

## 1. Angrepet som gikk i stå (HØY, Jonas)
- `Spillet.Trussel.LEI = { nær: 1000, min: 60 }`, `Trussel.lei(q)`, `Trussel.stilleSteg(e, dt)` (spillet.js, test_spillet.js): et røverlag som
  er kommet innen 1 km av leiren (eller har vært i kamp), men så har stått utenfor leiren uten å skyte eller bli skutt på i 60 spillminutter
  til sammen, gir opp (`e.flykter`, `e.lei`) – «Røvere 2.3 har gitt opp angrepet og trekker seg unna.» Venter på mørket teller ikke.
  Telleren (`e.stille`, `e.leiNær`) går i en KROKER.sim i spillet-visning.js; bare `auto()` (ikke i testene).
- Når bølgen er over (slått/unna), fjernes ikke lenger levende lag som ga opp på denne måten (`e.lei`; lag som flyktet etter tap, fjernes
  som før – vakta «balanse» krever det): de får `raid = -bølge`, går bort (`bort`), og
  `utSteg` tar dem ut når de er 1,8 km unna eller etter 90 min (som herjerne før). flyt.js teller bare `raid > 0` som angrep.
- Ga de siste opp, står det i rapporten «slått tilbake – røverne trakk seg unna», og de regnes ikke som «slått ut» (forsvar-visning.js tap()).
- Banneret sier aldri «kan være framme når som helst» om røvere som alt har vært i leiren (`e.inne > 0` eller sist sett i leiren):
  «sist sett i leiren kl. 11:29 · de har vært i leiren – ikke sett siden» / «har vært i leiren – ikke sett siden» (status().varInne).
- Ikke gjenskapt i et ekte spill (to timer i sanntid); laget som «sto 600 m NØ» er lagt inn i vakta og ga opp.

## 2. Én retning (MIDDELS)
- forsvar-visning.js `retningMotFienden()`: sett utenfor leiren → der de er; ellers den siste observasjonen i dette angrepet (`sisteObs`: kartet,
  radioen, etterretningen, det banneret så – det samme som «sist sett …»); er den i leiren, står forrige retning; ellers `e.innfart` (fast fra
  starten, samme som loggen) for hovedlagene (ikke speiderne fra en annen kant). Før ble innfarten regnet på nytt fra `e.seg` hele tida.
- spillet-visning.js: varselet ved start teller alle lagene (også speiderne, som banneret) og tar kanten fra hovedlagenes `e.innfart`.
  Prøvd: varsel «et røverlag … fra vest» og banner «ett røverlag fra vest» (flere kjøringer, ulike kanter).

## 3. Bykampen (HØY, Ingrid) – garnison-visning.js
- Banneret `#bykamp` når et tettsted dere holder angripes (en angrepsgruppe fra eskalering-visning.js i fasen «angriper» mot det, eller fiender
  som skyter/blir skutt på i/ved byen): «Angrep på Gjøvik · Ravnsund: 2 lag, 18 mann · våre i byen: 3 lag, 36 mann · Tap siden kl. 00:13 – hos
  oss: 3 falt, 1 såret · hos dem: 4 falt», «Vis» (2D, hele byen og fiendene ved den i bildet) og ×. Etterpå «Kampen om … har stilnet» i 20
  spillminutter (`BYKAMP = { nær: 1200, slutt: 20 }`). Står det et angrepsbanner for leiren, legger bykampen seg under det.
- Første skudd i byen: logglinje + hendelsen «alarm» med stedet (⏭ stopper / farten ned én gang, kortet får «Vis»).
- Ingen rekrutter og ingen stell i en by mens det er kamp om den (`kampOm(by, eier)`, bare `gAuto()`).
- API: `GarnisonSpill.BYKAMP, kampOm, fienderVed, bykamp, bykampSteg, visBy`.

## 4. Farten (MIDDELS) – flyt.js
- Mens leiren angripes (ForsvarSpill.angrep) filtreres alarm/kontakt/framme/bygg/tapt bort; ÉN stopp/nedbremsing per angrep, først når
  `ForsvarSpill.fase()` sier sett, under 500 m eller kampen har begynt. «Leiren angripes» før noen har sett dem senker ikke farten. Etter den ene
  stoppen gjelder «Spol videre» resten av angrepet; et kort som venter, ny dag og «angrepet er over» stopper som før. Nøkkelen er angrepet +
  starttidspunkt + løpenummer (et nytt spill i samme side har bølge 1 igjen); startAngrep nullstiller det som er husket om samme id.
- Automatisk nedbremsing gir bare lappen ved fartsknappene – ikke også kortet «⏭ Senket farten …».
- Lappen («⚠ Farten ble senket …») tas bort når angrepet den gjaldt er over, eller etter 20 spillminutter (`GRUNN_SPILL`).

## 5. Prognose og rapport (MIDDELS)
- forsvar.js `tapAnslag(q, menn)` (Lanchester, røverne gir opp ved en tredel ute): «Med dette forsvaret: god sjanse til å holde leiren, men regn
  med tap (trolig opptil 1 av 4 falne eller sårede)»; «usikker» får tapene også. Testene for ordet (god/usikker/dårlig) er uendret.
- tap(): sårede telles per mann (navnTap) – nye folk i lagene underveis veier ikke opp for de sårede («Ingen tap hos oss» mens Mari ble såret).
- Rapporten vises én gang: er den vist og banneret trenger plassen (nytt angrep, forsvaret satt), tas den bort; høyst 240 spillminutter.

## 6. Småting (LAV)
- morgen-visning.js: «Lagene står i stilling» bare når et lag har en forsvarsplass (eller Leirvakta står).
- spillet-visning.js: hendelseskortet venter til angrepsrapporten er lukket (ikke to kort oppå hverandre).
- IKKE rettet: «Leirvakta/Speidertropp 1 forlater stillingen» (feltarbeid-visning.js, ikke min fil – lagene som var nedgravd fra før, går til
  de nye stillingene når forsvaret settes).

## Etter beskjed fra koordinatoren: nedtellingen som gikk opp
- trussel-lagring.js `neste()`: etter omlasting aldri mer igjen enn det som var igjen da tida ble lagret (d.tid og d.neste i samme lagring;
  klokka fra «riksbrudd-verden» kunne være fra et tidligere øyeblikk). Test i test_trussel_lagring.js.
- morgen-visning.js: flytter beskyttelsen (vern) tida ved lasting, står det i loggen. Kjøpet («Neste angrep kommer et døgn senere») sa det fra før.

## Tester og vakt
test_spillet.js, test_forsvar.js, test_flyt.js, test_morgen.js, test_skjermlag.js, test_forsvar_kamp.js, test_forsvar_oppgjor.js,
test_garnison.js, test_eskalering.js, test_trussel_lagring.js – grønne.
Ny vakt `pipeline/fliser/vakter/lokke-r3-angrep.js` (PC ca. 5 s, mobil ca. 5,3 s, tåler to kjøringer etter hverandre). Feil lagt inn med vilje
(Trussel.lei av, fasen alltid «sett») → vakta fant sju feil. Vaktene angrep, morgen, kamp, krig, balanse, r17-ui, lokke-r2-angrep3d (3D av), regnskap, spillform og ui er kjørt på nytt: ok
(balanse og r17-ui feilet på et mellomsteg og er rettet: lag som flyktet etter tap fjernes som før, og fartslappen vises alltid).

## Fellesfiler
- `spill/trussel-lagring.js` (etter beskjed fra koordinatoren): bare `neste()`.
- index.html: ikke endret (ingen nye skript).
