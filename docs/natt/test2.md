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
