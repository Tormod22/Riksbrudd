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
Vakter: skjermvaktene fra sjekk.js og alle `vakter/*.js` grønne på telefon (stående) etter runde 3.
Ikke prøvd i runde 3: Gå i 3D på iPhone SE (styrespak, Huk/Hopp, Skyt, våpenrute, minikart) – 3D tar minutter i programvare-grafikk her,
og tiden strakk ikke til. Loggen kan stikke inn under et sidepanel liggende (den står øverst til venstre) – ikke rettet.
