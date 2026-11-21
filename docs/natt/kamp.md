# Pakke «kamp»

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
