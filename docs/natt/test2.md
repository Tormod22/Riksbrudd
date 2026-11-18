# Nattarbeid 18. nov – pakke «test2»: gjennomspilling på telefon

Ingen nye funksjoner. Spillet er spilt som en ny spiller på en iPhone-stor skjerm (Playwright, isMobile + hasTouch, iPhone-Safari som
brukerstreng, `navigator.webdriver` slått av så startskjerm, opplæring og hendelser kommer av seg selv), stående 390 × 844 og liggende
844 × 390, med ekte trykk (touchscreen.tap) og bilde etter hvert trinn. Dovre-testsiden for det meste, /rogaland (dev.py) for
krigskartet, Region, Sjø, Samfunn og raden nederst med alle flisene. Skript og bilder: scratchpad `natt/test2/` (h.js = oppsettet).

## Ny fil: `spill/telefon.js` (lastes sist, etter taster.js)
Bare CSS og en liten vaktsløyfe (350 ms) for små berøringsskjermer – alt gjelder bare `body.kort`. `window.Telefon.pass()`.
Tallene (40 px, 38 px, sju fliser) er Claudes forslag. Sløyfa setter:
- `body.mkomfull` – raden nederst har mer enn seks fliser på smal skjerm: raden går over hele bredden, zoomknappene løftes over den.
- `body.tlfdekk` – et åpent panel (body-barn med klassen «på») når ned til raden nederst, eller leirvalget er oppe: raden skjules.
- `body.tlfopp` – opplæringslinja ligger nederst: Leir- og Folk-menyen får luft nederst.
- Paneler som står helt nederst får `border-bottom: env(safe-area-inset-bottom)` (hjemstreken) og, når de går fra kant til kant,
  luft på sidene (`env(safe-area-inset-left/right)`, hakket når telefonen ligger). Lukkekryss («×») i åpne paneler får 40 px bredde.

## Funn (R = rettet, I = ikke rettet)
1. R Knappene øverst (3D, ☰, pause, fart, ⏭, ?) var 30 × 31 px. Nå 40 px høye stående (38 brede, ni får plass når du går), 36 liggende.
2. R Raden nederst (#mkom) fikk ni fliser i natt: 33 px brede, «Tropper» gikk ut over flisa. Nå hele bredden (ca. 39–44 px).
3. R Fliser i raden nederst som ikke finnes ennå (`hidden`), vistes likevel (`display:flex` slo ut `hidden`).
4. R Raden nederst lå under / skinte gjennom Region, Verden og Sjø (de sto ikke i DEKKER-lista i spillhud.js), og vistes mens du valgte leirplass.
5. R Krigskartet uten kartdata (tregt nett) viste bare en tekst uten lukkeknapp – på telefon er Krig-flisa da borte, så du satt fast.
   (`strategi-visning.js` vis(): overskrift og × også da.)
6. R Krigskartet, «Lag noe» og Verden var gjennomsiktige: panelet bak skinte gjennom teksten.
7. R Knapper i panelene var 28–36 px høye (kjøp, +/−, Hogst, faner, banneret). Nå minst 40 px på telefon; nedtrekkslister også.
8. R Nye bunnpaneler (Region, Sjø, Tropper, Deg, Stridsregler, krigskartet, «Lag noe») tok ikke hensyn til hjemstreken/hakket.
   Kan ikke prøves i Chromium (env() er 0 der) – se «Ikke prøvd».
9. R Startskjermen, hjelpen og kortene midt på skjermen lå under klokka/hakket øverst (padding med safe-area, arket fyller resten).
10. R Tiltak-panelet (#krigpanel) gikk 6 px ut over venstre kant.
11. R Flyktning-/hendelseskort lå oppå knapperaden; personkortet kunne bli høyere enn en liggende skjerm uten å kunne rulles.
12. R Når du går: zoomknappene (gjør ingenting da) sto tett i Hopp. Skjult mens du går; Huk/Hopp står helt til høyre.
13. R Liggende, når du går: helse- og våpenruta lå oppå Skyt, Huk og Hopp, og våpenbyttet oppå minikartet. Rutene står nå nederst i
    midten, våpenbyttet til venstre for Skyt.
14. R Byggebanneret: uten materialer svarte «Bygg her» bare «Mangler materialer», og kjøpeknappen ble borte. Nå vises bare
    «Kjøp materialene … og bygg» (og «Legg i planen») da. (`leir-visning.js`, én linje.)
15. R Opplæringslinja nederst dekket det siste i Leir-menyen. Linja under hvert navn i Folk brakk midt i («% · telt» alene).
16. I Krigskartet liggende: bunnarket tar halve høyden, så kartet over blir bare 150 px høyt og navnene ligger oppå hverandre.
    Bør være et sidepanel på liggende skjerm – det krever at `strategi-visning.js` passer kartet inn ved siden av (ikke bare CSS).
17. I Hjelpen («Slik spiller du») og opplæringen kommer samtidig første gang; hjelpen ligger oppå. (hjelp.js skulle ikke røres.)
18. I ☰-menyen har 32 px høye rader på telefon (bevisst kompakt fra før; rullbar). Ikke endret.
19. I Stoppkortet etter spoling («Stoppet: …») ligger oppå loggmeldingen som sier det samme.
20. I Vakta `vakter/ui.js` feiler på «bygg uten tegning: minnesmerke» (bygget kom fra folk-pakka, tegningen mangler i tegninger.js) –
    ikke en telefonfeil; må rettes av den som samler (en tegning i `Tegninger.bygg`).
21. I `vakter/okonomi.js` kaster feil på testserveren uten infrastruktur (INFRA er null) – gjelder bare lokalt uten INFRA_DIR.
22. I Marsjtid ved pekeren finnes ikke på telefon (ingen peker) – men bekreft-kortet viser avstand og tid, så det savnes lite.

## Fellesfiler som er endret
- `site/dovre-fliser/index.html`: én skript-tagg for `spill/telefon.js` rett etter taster.js.
- `spill/strategi-visning.js`: vis() – lukkeknapp og overskrift også når kartdataene mangler (én linje).
- `spill/leir-visning.js`: visBanner – «Bygg her» ikke når materialene mangler (én linje + kommentar).
- `pipeline/fliser/vakter/ui.js`: «telefonlinja ligger oppå zoomknappene» godtar nå at zoomknappene står OVER raden
  (`|| zr.bottom <= siste.top + 1`).

## Prøvd (og sett på bilder)
Startskjermen steg 1–3 med trykk (stående og liggende), leirvalg, opplæringen steg 1–2, Leir-menyen alle fanene, byggekort, banneret,
kjøp og bygg, byggesettet, hogst, Folk med «Vis folkene», Samfunn, personkort, flyktningkort (svar), Tropper/troppebyggeren, Deg,
Region, Verden, Sjø, krigskartet (/rogaland), lagpanelet, Marsjer med bekreft, kø («Legg til»), Tiltak, Stridsregler, ⏭ spol og
stoppkortet, ☰, hjelpen, 3D, Gå (Huk → Ligg → Reis deg, Skyt, «Lag noe», Deg-menyen). Nattvaktene på telefonprofil: folk, karakter,
krig, sjo, spillform, verden ok; ui og okonomi se 20 og 21.

## Ikke prøvd
- Ekte Safari/WebKit (bare Chromium med telefonprofil) – safe-area (hjemstrek, hakk) er skrevet etter boka, men ikke sett.
- Å gå inn i et hus på /rogaland, hund, snikemåler, Drikk/Spis-knappene (3D går i programvare-grafikk her: flere sekunder per bilde).
- Styrespaken ble dratt med berøring, men flyttingen ble ikke målt.
- Hele sjekk.js er ikke kjørt.

## Runde 2 (pakke «telefon2», samme natt)
Gren `claude/natt18-test2`, flettet med `origin/claude/nattfiks` først (bare skript-tagger i index.html, versjon.py kjørt).
Prøvd med Playwright i telefonprofil (390 × 844 og 844 × 390, isMobile, hasTouch, iPhone-brukerstreng, webdriver av) med ekte trykk,
og på PC (1400 × 820). Dovre-testsiden, og /rogaland med dev.py for krigskartet, Region og Sjø. Bilder: scratchpad `natt/test2/r2-*.png`.

Rettet:
1. (funn 16) KRIGSKARTET LIGGENDE: på liggende telefon (`body.tlfligg` = kort og bredere enn 1,2 × høyden) er krigskartet et sidepanel
   til venstre med full høyde (fra under knappene øverst til bunnen), og `strategi-visning.js` åpne() passer området inn i den frie
   delen til høyre for panelet – som på PC (måler panelets høyre kant; kartet midt i det frie feltet, under statuslinja). Før: bunnark
   med halve høyden og ca. 150 px kart. Nå ca. 430 × 340 px kart, og hele området (stiplet ring) står ved siden av panelet.
   Noen navn kan fortsatt ligge tett der tettstedene ligger tett (Sauda/Saudasjøen), men langt færre.
2. (funn 16) De andre bunnpanelene liggende: Region, Samfunn (venstre), Sjø, Verden, Tropper, Deg (#karakterark), Stridsregler,
   «Lag noe» (#evpanel) og Tiltak (#krigpanel) (høyre) er sidepaneler med full høyde, bredde min(400 px, 50 %) (Claudes forslag).
   Venstre/høyre følger plassene i `paneler.js` (PLASS) og PC. Raden nederst skjules mens de står (som før, `tlfdekk`).
   Stående telefon er uendret (bunnark / fullt panel som før).
3. (funn 17) FØRSTE GANG: opplæringen kommer først. `hjelp.js` første() åpner ikke «Slik spiller du» av seg selv når opplæringen er på
   og ikke ferdig (merker den likevel som sett). Opplæringskortet har fått knappen «Les mer i hjelpen» (`opplaering.js`, #opphjelp),
   og ?-knappen øverst virker som før. Opplæringen gjemmer seg mens hjelpen er oppe og kommer tilbake når den lukkes. Er opplæringen
   slått av, kommer hjelpen første gang som før. Gjelder PC og telefon. Tekstene i hjelpen er ikke rørt.
4. (funn 19) STOPPKORTET: loggen viker (skjules, `body.flytvik`) mens stoppkortet står oppå den – på PC bare når de faktisk overlapper
   (der står loggen til høyre, så den vises). Loggmeldingen er der når kortet lukkes eller går bort etter 9 s. På telefon er kortet nå
   sentrert i full bredde (før ble det klemt til 195 px stående: «left:50%» ga halve skjermen) med teksten til venstre og knappene på
   samme linje.
5. (funn 18) ☰-MENYEN: radene er minst 40 px høye på telefon (før 32). Menyen rulles som før.

Filer: `spill/telefon.js` (CSS + pass(): tlfligg, flytvik; `Telefon.SIDE`, `Telefon.ligg()`), `spill/strategi-visning.js` (åpne(): liggende),
`spill/hjelp.js` (første(): 4 linjer, bare oppstartslogikken), `spill/opplaering.js` (tegn(): knappen «Les mer i hjelpen», 3 linjer),
`index.html` (bare versjonsmerker fra versjon.py).

Vakter: de utklipte skjermvaktene fra sjekk.js (kompakt skjerm, ikoner, samlet utseende, hurtigtaster, ☰-menyen, Leir-menyen og målene,
folk innenfor skjermen, spillskjermen, knapperaden i 3D) og alle `vakter/*.js` (ui, folk, karakter, krig, natur, okonomi, sjo, spillform,
verden) er grønne på PC, stående telefon og liggende telefon (knapperaden bare PC og stående – den trenger 3D).
Skript: scratchpad `natt/test2/t1.js` (Dovre: første gang, ☰, stoppkort, panelene liggende), `t2.js` (/rogaland: krigskartet, Region,
Verden, Sjø), `t4.js` (PC), `vk.js` (vaktene; bruker `../ui/u2.js`).

Ikke gjort / ikke prøvd i runde 2:
- Ekte Safari (bare Chromium med telefonprofil). «Lag noe» liggende er bare prøvd med CSS-en (panelet åpnes bare når du går i 3D).
- Liggende iPhone SE (667 × 375) får også sidepanelene (bredere enn 1,2 × høyden); ikke prøvd.

## Runde 3 (samme natt): små iPhoner, «Lag noe», byggekortene, lagpanelet
Prøvd som iPhone SE: 375 × 667 stående og 667 × 375 liggende (telefonprofil, webdriver av, ekte trykk). Bilder: scratchpad `natt/test2/r2-se-*.png`.
1. iPhone SE: startskjermen (ruller, ingenting utenfor), Leir-menyen, krigskartet liggende (/rogaland: sidepanel 334 px, området til
   høyre), Region/Verden/Sjø liggende og lagpanelet er sett. Ingen knapper havner utenfor skjermen. SE liggende er både `smal` og `tlfligg`.
2. «Lag noe» liggende (`EventyrSpill.åpne('lag')`): sidepanel til høyre med full høyde, ruller; sett på SE liggende.
3. FANEN BYGG: på telefon tre kolonner med liten tegning (34 px), navn og pris på én linje; hele kortet er Bygg-knappen (knappen ligger
   usynlig over kortet, så vakten og «Planlegg»-modus virker som før), kort du ikke har råd til er dempet (`:has(button:disabled)`),
   forklaringen og materialene kommer i byggebanneret når du har trykket. Leir-menyen med fanen Bygg: 3206 → 1796 px høy på SE
   (resten er statusflisene øverst). Trykk på et kort starter plasseringen (prøvd).
4. LAGPANELET: stående 52 % av høyden (før 46 %: «Mer (2) ▾» havnet under kanten på SE), liggende sidepanel til venstre med full høyde.
   Når panelet åpnes for et lag som havner under det, flyttes kartet én gang så laget står midt i den frie delen (over panelet stående,
   til høyre liggende). Ikke i testene (navigator.webdriver), `Telefon.test = true` slår det på. På SE liggende står «Mer (2) ▾» fortsatt
   9 px under kanten – panelet ruller.
5. GÅ I 3D PÅ iPhone SE: liggende (667 × 375 er både `smal` og `tlfligg`) lå helse- og våpenruta oppå Huk/Hopp og våpenbyttet og Skyt
   oppå minikartet (reglene for liggende gjaldt bare `:not(.smal)`). Nå gjelder de også `tlfligg`, minikartet er 80 px og Skyt/våpenbyttet
   står litt lenger til venstre. Målt: ingen knapper utenfor skjermen eller oppå hverandre (bortsett fra testvarselet om programvare-
   grafikk). Stående SE: styrespak, Skyt, våpenbytte, Huk/Hopp, ruter og minikart står fritt.
Vakter: skjermvaktene fra sjekk.js og alle `vakter/*.js` er grønne på stående og liggende telefon etter runde 3 (knapperaden ikke kjørt
på nytt – den trenger 3D).
Ikke rettet: stående SE når du går – loggmeldingen (to linjer) ligger oppå «Flaske 4/4 · rasjoner» til den tones ut (10 s).
Loggen kan også stikke inn under et sidepanel liggende (den står øverst til venstre).

## Runde 5 (18.–19. nov kveld): ny spiller fra startskjermen, og kontrollen raskere
Gren `claude/natt18-test2` (flettet med `origin/claude/nattfiks` først). Maskinen ble startet på nytt kl. 00:15 norsk tid midt i
PC-runden; alt var committet eller ble committet etterpå. Skript og bilder: scratchpad `natt5/test2/` (h5.js = oppsettet, p1.js =
gjennomspillingen, e1–e3.js = målingene av 3D-byggingen; bilder i `b/` = PC, `b2/` = telefon, `b1/` = første telefonforsøk).

### 1. Spilt som ny spiller (webdriver av, ekte trykk/klikk, telefon 390 × 844 og PC 1400 × 820)
Startskjermen steg 1–3 (navn på karakter og fraksjon), leirplass på kartet, opplæringen steg 1–6 (Leir, brakke med «Kjøp materialene
og bygg», + på Bygg i Folk, tropp fra forslaget «Speidertropp» med navn, 3D og Gå), inn i brakka, inventaret (Tab på PC), spoling med
⏭ til natta og gjennom to angrep (telefon: dag 1 kl. 00:06 og dag 2 kl. 02:49, «Forsvar leiren», «Angrepet er slått tilbake»),
spørsmålskort fra folket. PC-runden kom til inventaret før omstarten (spolingen på PC er ikke sett).

Funn (R = rettet her, I = ikke rettet – eier i parentes):
1. R Stoppkortet («⏭ Stoppet: Leiren angripes» osv.) lå på telefon oppå alarmen øverst («Angrep: ett røverlag fra …» – overskriften
   og deler av «Forsvar leiren» var skjult) og oppå spørsmålskortet fra folket (spørsmålet var skjult, bare svarene synlige).
   Bilder: `b1/tlf-17-stopp-1.png`, `b1/tlf-27-forsvar-1.png`. Nå flyttes kortet ned under dem (`telefon.js` ned(), punkt 19);
   etter: `b2/tlf-31-sporsmal-4.png`, `b2/tlf-35-runde-6.png`.
2. R Varselet «Varsel: et røverlag er på vei …» og «Angrepet er slått tilbake!» (#varsel, spillet-visning.js) står like høyt som
   alarmen (#alarm) – også på PC – og dekket «Forsvar leiren» i 9 s, og senere skadebanneret slik at «Lukk» der så ut til å høre til
   varselet. Bilder: `b2/tlf-29-runde-3.png`, `b2/tlf-35-runde-6.png`. Varselet flyttes nå ned under alarmen (samme ned()).
3. R Lagpanelet fra kartet ble stående når du gikk inn i 3D og trykket Gå: på telefon under Skyt, Huk, Hopp og våpenbyttet
   (`b2/tlf-20-gaa.png`), på PC under helsestreken (`b/pc-20-gaa.png`). Skjult mens du går (`body.gaar #panel`, spillhud.js).
4. R Værbrikken på telefon: «Klart, 8 °C3 m/s SV» – mellomrommet før vinden forsvant i flex-boksen (`b1/tlf-04-leirvalg.png`).
5. R PC: «Velg lag» i kommandolinja sto under leirvalg-banneret før du hadde noen lag (`b/pc-04-leirvalg.png`). Skjult mens du
   velger leirplass (spillhud.js).
6. I Spolingen stopper igjen og igjen under et angrep: «Vaktlaget er framme» og «Et lag er i ildkamp» annenhver gang, 0–2
   spillminutter mellom (p1-mobil.txt, runde 8–12). «framme» kommer hver gang forsvaret flytter laget litt. Forslag: ikke meld
   «framme» mens alarmen står, eller ikke for samme lag oftere enn hvert 30. spillminutt (flyt.js hendelser() – ikke rørt, det er
   oppførsel, ikke tekst).
7. I Første angrep kom allerede første natt (dag 1 kl. 00:06), før en ny spiller har bygd noe annet enn én brakke; opplæringen
   står da på steg 2–6. Det gikk bra (vaktlaget slo dem), men det er brått. (balanse: trussel/spillregler)
8. I Merket rundt det opplæringen peker på (Brakke-kortet, Folk-flisa) er større enn kortet og dekker kanten av nabokortet
   («Kjøkken», «3 mill. kr»), `b2/tlf-08-leirmeny-bygg.png`, `b2/tlf-11-brakke-bestilt.png`. (balanse: opplaering.js)
9. I Navnene ved leiren ligger oppå hverandre: leirflagget står oppå «1. lastebilkolonne» og «Leiren til Dovrefolket», og «0 t olje»
   ser ut som «o t olje» med skriftens gammeldagse sifre. `b2/tlf-16-tropp-laget.png`, `b/pc-06-forste-blikk.png`.
   (oppstart-visning.js tegner flagget, okonomi-visning.js basens navn – ingen eier i kveld, men ikke en liten tekstretting.)
10. I Inventaret (#lutpanel) er gjennomskinnelig: teksten bak (her testvarselet om programvaregrafikk) skinner gjennom
    (`b/pc-23-lutpanel.png`). (lut: lut-visning.js)
11. I Opplæringskortet nederst på telefon dekker en melding nede til venstre («⚠ Angrep: 1 røverlag …», skimtes gjennom kortet,
    `b2/tlf-29-runde-3.png`). Ikke funnet hvilket element det er før omstarten.
12. I Opplæringen steg 3 sier «bruk + ved Bygg til det står to der», men det står alt fire på Bygg i et nytt spill – steget blir
    ferdig straks Folk åpnes. (balanse: opplaering.js)
13. I Byggebanneret på telefon: «… mangler for 975 000 / kr» – «kr» alene på neste linje (vanlig mellomrom før kr i LB.kroner).
14. I Fraksjonsnavnet mangler: feilen «Fraksjonen må ha et navn» står nederst ved knappen, men feltet står øverst (rullet bort).
    Feltet burde få fokus/rulles fram. (oppstart-visning.js)
15. I Startskjermen: alder-glideren har nettleserens blå farge (ikke spillets gull), og tittelen «Riksbrudd - nytt spill» har bindestrek
    der det skal være tankestrek. Små ting i oppstart-visning.js.
16. I Telefon, Gå: loggmeldingen på to linjer ligger litt oppå «Flaske 4/4 · rasjoner 2» til den tones ut (som i runde 3).
17. I Kartflisene nær leiren har rektangulære felt med ulik skogtone (`b2/tlf-10-brakke-plass.png`). (natur: kartbilde)
Ikke et funn: testvarselet «Nettleseren tegner 3D uten grafikkortet» kommer fordi testmaskinen bruker programvaregrafikk.
Prøvd etter rettingene (`p2.js`, bilder `b/tlf-r5-01-alarm-varsel-stopp.png`, `b/pc-r5-01-…`, `b/*-r5-02-gaa-uten-lagpanel.png`):
alarm, varsel og stoppkort står under hverandre uten overlapp på telefon (alarm 120–226, varsel 232–304, stoppkort 310–364 px) og
PC; lagpanelet er skjult mens du går (display none, body.gaar) og tilbake når du slutter, på begge.

### 2. Kontrollen raskere (pipeline/fliser/sjekk.js, gjennomgang nr. 50)
Målt med tidtaking (ny): hver linje får «(12,3 s)» = tiden siden forrige linje i samme profil (AsyncLocalStorage, så PC/mobil/eldre
iPhone som kjører samtidig, har hver sin klokke), og til slutt «TID: … i alt, <profil> …, N ok, M FEIL» med de 25 tregeste linjene og
de 30 tregeste kallene til siden (evaluate/waitForFunction/click/goto over 1 s) med linjenummer i sjekk.js eller vakta.
Funnet: nesten all tid gikk til å TEGNE 3D-scenen mens et utsnitt ble bygd ved siden av. Bygging tar pust (pust/pusterom i
index.html) mellom bitene, og i hvert pust tegnes scenen på nytt – i programvaregrafikk 0,2–1 s per bilde. Målt på mobil (e2.js):
bygg3d på heia 90 s med tegning, 3,2 s uten; et utsnitt som bygges på skjermen etter «Gå» ble ventet på i 166 s (e3.js).
Endret (ingenting av det som sjekkes er tatt bort):
- `utenTegning(f)` (lagt inn i siden med addInitScript): renderer.render er en tom funksjon mens f bygger; samme kode, samme pust,
  samme utsnitt. Brukt rundt bygg3d/hus3d/nytt3dUtsnitt i vaktene «rare ting», hogst og riving, byhus, dyr (3 utsnitt), bekker 3D og
  bygging i biter (pust-tellingen der er uendret: 50–63). Tegningen er tilbake før vakta ser på scenen.
- `ventPåBygging()` i stedet for `while (R3.bygger) await …` (12 steder): venter på det samme, uten å tegne det gamle bildet imens.
- Syntakssjekken: filene leses i samme prosess (vm.compileFunction = det node --check gjør for CommonJS) i stedet for 157 nye
  node-prosesser – 13 s -> 0,2 s. En fil som ikke lar seg lese slik, sjekkes med node --check som før (prøvd: feil fanges, `return`
  på toppnivå godtas, ESM-fil går via node --check).
- Infrastruktur- og vegnettfilene leses én gang (før: hele fila fra disk for hver Range-henting).
- `SJEKK_DEL=rask`: bare det som ikke trenger 3D – 2D-delen og vaktene i vakter/*.js (bruene i 3D og hele 3D-delen hoppes over).
  Full kjøring uten SJEKK_DEL er som før.
Tider (SJEKK_PROFIL=mobil, PORT=8806; maskinen delt med de andre hjelperne, «hele bildet» = tid per 3D-bilde i vakta «måling av
ytelse» viser lasten):
| kjøring | tid | godkjent | last | hele bildet |
|---|---|---|---|---|
| før (ingen endring, bare tidtaking) | 1082,8 s (18,0 min) | 116 ok, 0 FEIL | 10 -> 20 | 167 ms |
| etter 1 (utenTegning, syntaks, filer) | 555,4 s (9,3 min) | 116 ok, 0 FEIL | 15 -> 25 | 625 ms |
| etter 2 (+ ventPåBygging, telefonrettingene) | 537,8 s (9,0 min) | 116 ok, 0 FEIL | 15 -> 24 | 817 ms |
| rask (SJEKK_DEL=rask) | 53,3 s | 47 ok, 1 FEIL (se under) | ca. 12 | – |
De tregeste før -> etter 2: dyr i 3D 279 -> 25 s, bekker 3D 247 -> 26 s, hogst og riving (med «rare ting»-utsnittet) 159 -> 16 s,
bygging i biter 145 -> 20 s, knapperaden 34 -> 11 s, syntaks 13 -> 0,2 s. Etter-kjøringene gikk med 4–5 ganger tregere tegning
(mer last) enn før-kjøringen og ble likevel halvparten så lange; med samme last ville forskjellen vært større.
Rask-kjøringen: vakta `vakter/krig.js` (eier: krig) feiler når 3D-delen ikke har kjørt før den: «knust lag ga seg: false»,
TypeError «reading 'avhørt'». I full kjøring er den grønn. Vakta tåler altså ikke at den kjøres uten det de andre vaktene har satt
opp – må rettes i krig.js (eller rask-delen må hoppe over den).
Det som fortsatt tar tid (etter 2): gå selv 30 s, vegetasjon 27 s, første høyde (sidelasting) 26 s, bekker 26 s, måling av ytelse
25 s, dyr 25 s, ferjer 22 s – her tegnes bilder med vilje (målinger, kamera, kompass), så de er ikke rørt.
PC-profilen (SJEKK_PROFIL=PC, etter alle endringene, last 12–18, «hele bildet» 992 ms): 963,0 s (16,0 min), 115 ok, 1 FEIL. Før-tiden
for PC er ikke målt her (oppdraget sier ca. 60–70 min). Feilen: `vakter/sjo.js` «trykk på båten i 3D åpner den» –
`SjoSpill.trykk3d` svarer false når et levende lag står innen 30 m av trykket (sjo-visning.js linje 368), og vakta flytter ikke egne
lag bort fra prøvebåten først. Hvor lagene står, avhenger av hvor mye spilltid som har gått under de andre vaktene, og det går
mindre sanntid nå. Grønn i begge mobilkjøringene. Rettes i vakta (flytt lag innen 30 m av båten bort mens den trykker, og sett dem
tilbake) – ikke gjort her (sjø-pakkas vakt, og ingen tid til å prøve den på PC før fristen).
Tidtakingen på PC: gå selv 69 s, dyr 64 s, bygging i biter 45 s, bekker 42 s, måling av ytelse 42 s, hogst og riving 39 s.
