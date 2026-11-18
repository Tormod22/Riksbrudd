# Pakke «test1» – gjennomspilling på PC (natt til 18. nov)

Gren `claude/natt18-test1`. Ingen nye funksjoner: spillet ble spilt som en ny spiller ville gjort (Playwright mot /rogaland med ekte data,
1400 × 820, `navigator.webdriver` slått av, ekte klikk), og feilene ble rettet. Leir ved Sand i Ryfylke (6825, 6627357), sju spilldøgn.
Skript og bilder: scratchpad `natt/test1/` (daemon.js holder nettleseren åpen, `s/*.js` er trinnene, `b/*.png` bildene).

## Rettet (fil → hva)
- `leir-visning.js`: «Bygg her» vises ikke når materialene mangler (ga bare feilmelding og fjernet kjøpsknappen). Teksten
  «Trykk der brakke skal stå» → «Brakke: trykk der bygget skal stå».
- `leir-visning.js` + `index.html` (kamprunde, én betingelse): **HERJER** – fiender som står innen 120 m av et bygg og ødelegger det, synes
  i kartet (KROKER.ser) og kan beskytes av (og skyter på) lag innen 300 m selv om terrenget skjuler dem. Før raserte ett røverlag hele
  leiren (30 mill. kr) på tolv timer mens et nedgravd lag sto 75 m unna uten å løsne skudd.
- `flyt.js`: samme fiende / samme ildkamp stopper spolingen én gang (husker 90 spillminutter) – før stoppet den hvert 2.–9. minutt under
  et angrep. Nytt: spolingen stopper når et bygg blir ødelagt eller hardt skadet (under halv helse) mens leiren angripes.
- `strid-visning.js`: lagets eget initiativ spør `kanOrdre` uten å skrive i loggen (før: «ingen radiokontakt – ordren når ikke fram»
  på nytt og på nytt for et lag uten kontakt).
- `kontrollrom-visning.js`: et nytt lag ved leiren har radiokontakt med en gang (før: «ingen radiokontakt: 0 km fra leiren» i noen sekunder).
- `maal-visning.js`: «få strøm» krever eget aggregat/solceller (strømnettet ga «Mål nådd» i første sekund); «gå selv i 3D», ikke «3d».
- `oppstart-visning.js`: et lagret spill åpner med kartet over leiren (før: hele Skandinavia, 200 km-målestokk); leirvalg-ruta ligger
  over kommandolinja på PC.
- `opplaering.js`: venter til «Slik spiller du» er lukket; flyttes opp mens et bygg plasseres på PC (byggebanneret lå oppå).
- `spillet-visning.js`: meldingen om tomme hyller sier når de fylles; **faltSteg** – karakteren (lag med én mann) ble liggende «falt» for
  godt i kartet mens arket sa helse 100. Nå: båret til leiren, nede i 6 spilltimer (KROKER.ild = 0 begge veger), helse høyst 40,
  moral −5, så «Du er på beina igjen». Ikke i testene. Tallene er Claudes forslag.
- `narhud.js`: «Strømnettet svikter snart – bygg aggregat eller solceller» vises ikke når leiren har det.
- `forsyning-visning.js`: småpåfyll av ammunisjon (< 0,05 t) meldes ikke; komma i tallet.
- `tegninger.js`: tegning til «minnesmerke» (vakten «ui» feilet etter flettingen: bygg uten tegning).
- `pipeline/fliser/test_flyt.js`: tre nye prøver. `versjon.py` er kjørt.

## Ikke rettet (se rapporten)
- Paneler oppå hverandre (lagpanelet under Folk, Samfunn under Region, Krig/Region over «Leir» i kommandolinja, Sjø over minikartet).
- Laster du siden på nytt midt i et angrep, er røverne borte (bølgen telles likevel).
- Balansen: startbyggene bruker nesten hele kassa, røverbytte gir ti ganger mer enn regionen, bølgene vokser fort.
- Karakteren blir «utslitt» når du spoler flere døgn uten å sove selv.
- Én gang stoppet spolingen fire ganger på rad uten grunn rett etter at kontrollrommet var ferdig (ikke gjenskapt).
