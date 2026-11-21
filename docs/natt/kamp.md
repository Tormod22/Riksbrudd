# Pakke «kamp»

## Runde 14 (21. nov kveld, kritikk I/J)

Alle tall er Claudes forslag.

### 1. Motangrepet kom 42 min etter «angrep tidligst om ca. 6 t» (J – høy)
- Årsak: `AI.styr` (eskalering-visning.js) slapp gjennom `angrip` for lag i en angrepsgruppe også mens gruppa samlet seg, og lagene sto
  alt et par hundre meter fra byen – de gikk løs på garnisonen med en gang.
- `eskalering.js`: `REGLER.varsel = { ved: 1000, fart: 4000, vern: 3000 }`, `tidligst({ nå, angripFra, sted, mål })` = ventetida + veien fra
  samlingsstedet (4 km/t), `holdIgjen(G, lag, v, nå)`: før `G.tidligst` går ingen fra siden løs på noe innen 3 km av målet og ingen tar målet
  (i fasen «angriper» får gruppa gå, men ikke skyte innen sonen før tida) – unntatt et lag som er beskutt (da er det spillerens kamp).
- Varselet: «… Målet er trolig Røysland (ditt). Fienden er ved byen nå (ca. 300 m unna), men venter på resten. Angrep tidligst om ca. 6,5 t.»
  når et lag i gruppa står innen 1 km. `G.tidligst` lagres med gruppa (gamle lagringer uten den: som før).

### 2. Banneret sa «ikke sett» etter «Fiende sett: Røvere 2.1, ca. 3,5 km nord» (J)
- `forsvar.js`: `STATUS.sistSettLang = 360` – en egen observasjon (lag via radio/`e.sett`, krigskartet, tårn, kamera, det banneret selv så) står i
  6 timer i stedet for 45 min, og den nyeste vinner. Teksten: «sist sett 3,5 km N kl. 08:53 · framme om …» (`retningKort`, `klTekst`).

### 3. Raidanslaget sa fire ting (I)
- «om under 1 min · trolig innen en time» var brikka for når bølgen DRAR UT. Nå: «Røverne drar ut om 3 t 20 min», og når tida er nådd:
  «Røverne drar ut nå» (`Forsvar.utTekst`) – «under 1 min» står aldri før de er på vei.
- «om 20 min» etter F5: `trussel-lagring.js` flyttet alle tider under 20 min fram til 20 min (`Math.max(t + nesteSnart, neste)`). Nå er
  `nesteSnart = 1`: en tid som ikke er passert, holdes nøyaktig.
- Loggens «Ventet om ca. N min» (spillet-visning.js) og banneret bruker samme rute (som før). Ikke endret: den teksten i spillet-visning.js.

### 4. Kampen om leiren var avgjort på ett spillminutt (J)
- `forsvar-visning.js` `KAMP = { nær: 500, innled: 3, ild: .4, minst: 2 }`: under 500 m fra leiren kommer en `alarm`-hendelse («røverne er
  450 m nord for leiren») – flyt.js senker farten til 1× før første skudd. De første 3 spillminuttene av kampen om leiren skyter begge sider
  med faktor 0,4 (`KROKER.ild`), og rapporten («Bølge 2 er slått tilbake») kommer tidligst 2 spillminutter etter «kampen har begynt»
  (`ventRapport`, sluppet i `KROKER.sim`). `ForsvarSpill.kamp14` for vakta.

### 5. Røverbølgene var for små (J)
- `forsvar-kamp.js` `BØLGE = { fra: 2, faktor: .95, soldater: 4, lag: 2, ekstra: 2, minst: 4, vinkel: 1.4 }`: `Spillet.Trussel.lagFor` og
  `.menn` pakkes inn (spillet.js er ikke endret). Fra bølge 2 på Vanlig/Hard, med minst 4 soldater, kommer minst 2 lag; de deler på
  mannskapet til ett lag + 2 (4 eller 8 soldater: bølge 1 = 6 mann, bølge 2 = 2 × 5 = 10). Lag nr. 2 flyttes 80° rundt leiren når bølgen
  starter (to kanter; ikke når stedet er under 1 moh.). Lett: som før.

### 6. Patruljen i fredstid (I)
- `flyt.js`: i fredstid (7 døgn / fiendens faktor, 4–10, som fraksjoner-visning.js) er et lag fra en motstander (ikke røvere, ikke i en
  angrepsgruppe mot noe av ditt) en patrulje: den teller ikke som «fienden er i sikte», men stopper ⏭ høyst én gang per spilldøgn med
  «fiendens patrulje – fredstid, angriper ikke» (`bilde().fred`). I testene er det aldri fredstid (som før).

### 7. Andre siders kamper (J)
- `forsvar-kamp.js`: `KampVarsel.andreTekst`, `KampSpill.andre(a, b, x, y)`, `KampSpill.sideNavn`. «Folkefronten og Kystalliansen sloss ved X.»

### Filer utenom mine
- `spill/enheter-visning.js` `motKjøretøy()`: når verken skytteren eller kjøretøyet er ditt, logges `KampSpill.andre(...)` i stedet for
  «… er under ild fra fienden», og skadeteksten bruker sidens navn (3 linjer).
- `index.html`: bare versjonsmerker (versjon.py).

### Vakt
`pipeline/fliser/vakter/kamp.js` har et nytt runde 14-ledd (alle sju punktene). Feil lagt inn med vilje (holdIgjen av, rapporten uten
venting) ble funnet: «laget i den varslede gruppa angrep før tidligst-tida; «slått tilbake» kom samme minutt som «kampen har begynt»».


## Runde 13 (21. nov, kritikk G/H)

Målet: spilleren skal se og forstå kampene sine. Alle tall er Claudes forslag.

### 1. Kamp utenfor radiokontakt (G, H – høy)
- **Ny fil `spill/forsvar-kamp.js`** (regler øverst uten DOM: `KampVarsel`, test `pipeline/fliser/test_forsvar_kamp.js`; visning nederst: `window.KampSpill`).
  Lastes rett etter `forsvar-visning.js` i `index.html`.
- En **kamp** begynner ved første skudd eller første tap (helsa går ned) for et eget lag (ikke karakteren, ikke Leirvakta), og er over når det
  har vært stille i `REGLER.slutt` = 30 spillminutter. Skudd hvert 10. minutt i timevis er altså ÉN kamp. Et tap uten skudd teller bare når det
  er bygdevern der eller en fiende innen `REGLER.tapFiende` = 2,5 km (ikke flom/ras/ulykker). En kamp med angriperne innen 3 km fra leiren
  meldes bare av `forsvar-visning.js` (ikke to stopp). Kampmerket tegnes bare for meldte kamper (ikke i testene).
- Når kampen begynner: én linje i loggen og hendelsen `kontakt` med stedet (x, y), f.eks.
  «⚔ Speidertropp 1 er i kamp med bygdevernet i Lærdalsøyri (7 mann)». Fienden: de som skyter på laget / som laget skyter på (røverne,
  fraksjonens navn), ellers bygdevernet når laget står i et tettsted med bygdevern (`KrigSpill.T().vern`), ellers «en fiende dere ikke ser».
  Stedet: «i X» (inne i tettstedet), «ved X» (innen 3 km), ellers «3,2 km sørvest for leiren». Uten radiokontakt: «– ingen radiokontakt: du ser
  bare siste kjente posisjon».
- `flyt.js`: hendelsen stopper ⏭ / setter 1× (som før for `kontakt`), og **bildet teller ikke ildkampene selv lenger** når `KampSpill` finnes
  (`strid: 0`) – det var det som ga «1× Et lag er i ildkamp» over ti ganger. Kampen om leiren meldes fortsatt av `forsvar-visning.js`.
- **«Vis» i stoppkortet** (`#flytvis`): alle hendelser med x, y (detail.x/y i `riksbrudd-hendelse`) gir knappen; den går til 2D (ikke når du går)
  og flytter kartet dit. `innboks` tar nå med x, y, og teksten kan være 200 tegn.
- **Kampmerke**: lag uten kontakt (`KROKER.skjul`) får to sverd i kartet der kampen er («Speidertropp 1 · kamp, ingen kontakt · skudd for 12 min
  siden»), og står i 120 spillminutter etter kampen («kamp her» / «slått ut her»). Kontrollrommet viser laget selv på siste kjente posisjon.
- **Årsaken når noen faller**: `FolkRegler.falneTekst` pakkes inn: «Oddvar Aasen (Vaktlaget) falt for bygdevernet i Vikeså.» (m.årsak).
- **Slutten**: «Kampen i Lærdalsøyri er over: Speidertropp 1 er slått ut – 4 falt for bygdevernet.»
- **Morgenoppgjøret** (`forsvar-oppgjor.js`): «Speidertropp 1 ble slått ut i kamp med bygdevernet i Lærdalsøyri» (kampene siste døgn fra
  `KampSpill.ferdige()`/`kamper()`, i bildet som `kamper`, høyst tre), i stedet for bare «ett lag er slått ut».

### 2. Angrepsanslaget går baklengs (G – høy)
- `forsvar.js`: `monoton(før, rå, t, nytt)` (anslaget kan bare minke), `harSnudd(minNær, nær, trekker)` (250 m lenger unna enn nærmest, eller de
  trekker seg), `klokke(t)`, `når(nå, ankomst)` («trolig i natt (ca. kl. 03–05)», klokkeslett bare under 12 timer), `nedtelling(min)`.
- `forsvar-visning.js` `status()`: ser noen røverne, teller anslaget bare ned (nytt anslag første gang de er sett, og når de har snudd); står de
  stille/venter på mørket, står det stille («de venter (trolig på mørket)»). **Ser ingen dem, står det ingen minutter**: «ikke sett – kommer
  trolig i natt (ca. kl. 03–05)»; brikka: «ikke sett · trolig i natt». Anslaget uten syn holdes også fast og teller ned; det byttes bare når ruta
  deres blir kjent første gang i de første 5 spillminuttene etter starten (`RUTE_FRIST`). «Sist sett» fra kartet/radioen går foran det banneret
  selv husker. Banneret husker selv hvor de sist ble sett (`est.sistSett`), så det ikke sier «ikke sett» rett etter «sett».
- «Snart framme» uten syn: «røverne kan være framme snart (ikke sett ennå)».
- **H: «røverne kom aldri»** – `spillet-visning.js start()` setter `T.nesteSpill` på nytt ved hver lasting (halv ventetid fram). Nå lagrer
  `trussel-lagring.js` `neste` (og bølgen) og setter den tilbake første gang SpilletSpill er klar (`hentNeste`; passert tid = om 20 min, over tre
  døgn fram = brukes ikke). Spillet-visning.js er IKKE endret. NB: bølgen kan fortsatt komme før tida om du spiller lenge i sanntid (`nesteEkte`).
- **Nedtelling**: Leir-menyen → Forsvar: «Røverne drar ut mot leiren trolig i natt (ca. kl. 01–04) – om 17 t 40 min.» (`#nestebolge`), og en
  varselbrikke (VARSEL_TILLEGG) «Røverne om 3 t 20 min · trolig i kveld» når det er under 12 timer igjen. `ForsvarSpill.neste()`.

### 3. Lagres
- Forsvarsordren ble borte etter omlasting fordi `TrusselLagringSpill.tilbake` kalles fra `start()` før SpilletSpill er klar – `gjenopprett()`
  krevde `T()`. Nå settes forsvaret også da. Anslaget (`ForsvarSpill.anslagTilstand/settAnslag`) lagres i `riksbrudd-angrep` (`d.anslag`).
  Prøvd med omlasting: «lagene holder stillingen» og samme bølge står igjen; tida for neste bølge var 600 før og 600 etter.

### 4. Kampen om leiren
- «Røverne er sett 430 m vest for leiren» (første gang noen ser angriperne) er en ny `alarm`-hendelse med stedet; «Kampen om leiren har begynt»
  og «… er i ildkamp med …» har nå stedet. Begge stopper ⏭ med «Vis». Prøvd uten webdriver: ⏭ stoppet ved «Røverne er sett … snart framme»,
  «Kampen om leiren har begynt» og «Angrepet er over».

### 5. Angrepsbanneret i gåmodus
- `plasserAlarm()` i `forsvar-visning.js` (hvert `vis()`): når du går og banneret treffer en synlig knapp, flyttes det under `#inneknapper`,
  ellers nederst. Stoppkortet (`flyt.js plasserKort`) plasseres på nytt hvert 0,1 s mens det står, og står øverst når banneret er nederst.

### Filer utenom mine
- `site/dovre-fliser/index.html`: én skript-tagg `spill/forsvar-kamp.js` rett etter `forsvar-visning.js`.
- `pipeline/fliser/vakter/krig.js`: regexen for anslaget i banneret godtar nå også «ikke sett – kommer trolig …» (før «ventet om ca. N min»).
- `FolkRegler.falneTekst` pakkes inn fra `forsvar-kamp.js` (folk.js er ikke endret).

### Vakt
`pipeline/fliser/vakter/kamp.js` (PC 5 s, mobil 10 s). Feil lagt inn med vilje (banneret ikke flyttet, hvert skudd ny kamp) ble funnet.

### Ikke gjort
- Mattyveri-kortet («Tilgi – alle er sultne») ligger i `samfunn.js` (ikke mine filer) – latt være.
- «Send» med for få mann (G nr. 2 i lista) og speidere som går inn i et forsvart sted (H) – krig-pakka.
- Kampmerket står der kampen begynte (ikke der laget er nå); ingen 3D-merke.
