# Kritikerløkka 26. nov, runde 1 – pakke «telefon»

Grunnlag: Jonas Bakke (390 × 844, berøring). Alt er prøvd med Playwright (isMobile, hasTouch, touchscreen.tap, webdriver av)
i 390 × 844 og 1400 × 860. Skript og bilder: scratchpad `natt/telefon/` (drv.js + s1–s11.js, bilder/).

## Rettet

1. **«Ta kontrakten» under bunnmenyen / to paneler oppå hverandre.** Selskapet (`#selskap`) var ikke med i lista over paneler
   som slutter over bunnmenyen (`Skjermlag.LØFT`) og ikke med i `spill/paneler.js` sin «ett panel om gangen». `kompakt.js`
   legger nå `selskap` (og funnpanel, lapppanel, logghel, lagremeny, ressursvalg, gaavalg) inn i `Skjermlag.LØFT` og `selskap` i
   `Skjermlag.SELV`, og på telefon lukkes Selskapet når et annet panel åpnes (og omvendt). Neste-lappen skjules på telefon mens
   et stort panel er åpent (`body.tlfpanel`). Prøvd: «Ta kontrakten» står over fanene og trykket tar kontrakten; Tropper over
   Selskapet lukker Selskapet.
2. **«Kjør dit» med berøring.** Årsak: med berøring tok marsjkroken i `flyt.js` trykket først (bekreftelsen «Gå / Avbryt») og
   spurte `KROKER.kanOrdre` – der stopper `ombordKrok` alle ordre til en tropp om bord, med meldingen «… trykk «Kjør dit»».
   Ny krok `ombordMål` i `tropper-visning.js` (først i `KROKER.trykk` og `trykk3d`) sender målet rett til kjøretøyet
   (`OMBORD_ORDRE`). «Marsjer» med berøring virket (Gå/Avbryt). NB: testserveren har ikke vegnettet, så selve kjøringen ble ikke
   sett – men ordren går ut (`s.avstigning` satt, `KOMMANDO kjør` ok).
3. **Leirmerket tok marsjtrykket.** `velgerMål()` og `målKrok(f)` i `index.html`: mens du velger mål (Marsjer, Kjør dit, gruppa
   i flyt.js, «Kjør til …» på kjøretøy) får bare kroker med `f.mål = true` (og `FlytSpill.trykk`) trykket – i 2D og 3D. Bygger du
   samtidig (LeirSpill.plassering / byggesettet), er alt som før. `kjoretoy-visning.js` har `window.kjørModusPå()` og
   `window.avbrytKjørModus()`. Prøvd: trykk på leiren i marsjmodus gir «Vaktlaget: 0,8 km · 30 min / Gå / Avbryt».
4. **Paneler dekket kartet og var gjennomsiktige.** På telefon (`body.kort.tlfaktiv`) er `--panel` ugjennomsiktig, `#panel` er
   høyst 44 vh, og mens du velger mål er panelene borte (`body.målvalg`) – en stripe øverst sier «Trykk på kartet der Vaktlaget
   skal gå.» med «Avbryt» (`#maalstripe`). Når flyt.js viser «Gå / Avbryt», viker stripa for den.
5. **Topplinja på telefon.** Flisene står uten ord på stående telefon (ikonene og tipsene forklarer), rekkefølgen er klokke, kasse,
   folk, diesel, strøm; «+9 tall» heter nå «Mer ▾» (lista bak har ordene, f.eks. «Olje», «Vær»). Været står i egen flis
   (`#tlfvaer`) til venstre for knapperaden (der var det ledig). Strøm går bak «Mer» når raden er full (diesel står).
6. **«− 6 305 kr» over 3D-knappen.** På telefon flyttes kasselappen (laget i flistips.js) til høyre under knapperaden
   (MutationObserver i spillhud.js – flistips.js er ikke endret).
7. **«Jonas BakkeJonas Bakke (deg)».** IKKE en feil i etiketten: navnet var lagret dobbelt (`riksbrudd-k1` i Jonas sin profil:
   `"navn":"Jonas BakkeJonas Bakke"`) – skriptet hans skrev navnet i feltet to ganger. Etiketten bruker navnet som det er. Ikke endret.
8. **Navn kuttet i høyre kant.** `kompakt.js` pakker inn `Etikett.tekst`: navn skyves inn så hele navnet står på skjermen (4 px luft).
   «Kontrakt: Her…» tegnes av `selskap-visning.js` rett på lerretet (ikke via Etikett) – den lappen kan fortsatt kuttes og ligge
   under et lagnavn. Forslag til kontrakt-hjelperen: tegn den via `Etikett.tekst` eller meld rammen med `Etikett.merk`.
9. **Flagget over «Farge 3».** Flagget står fast øverst som før, men mindre (120 × 80), og innholdet som ruller under tones ut
   (gradient `::after`) i stedet for å kuttes midt i en overskrift (bare CSS i oppstart-visning.js).
10. **3D-HUD på telefon.** Helse og våpen står nede til venstre under styrespaken, side om side, mindre gjennomsiktige (narhud.js,
    stående telefon). «Sikt», «Granat» og «Lag» har samme skrift som «Skyt» (tema.js).
11. **Vegnett-meldingen.** «Henter vegkartet, så kjøretøyene finner fram …» / «Vegkartet er klart: kjøretøyene kan kjøre.» –
    MB, antall vegstrekninger og NVDB bare med «Tekniske tall» (body.teknisk).

## Tall (Claudes forslag)
`Kompakt` REGLER: panelhøyde 44 vh, sjekk hvert 150 ms; navneluft 4 px; flagget 120 × 80.

## Fellesfiler endret
- `index.html`: `velgerMål()` / `målKrok()` og filteret i `trykkPå` (2D) og i 3D-trykket (`KROKER.trykk3d`), samlet rett over
  `trykkPå`. Versjonsmerkene (versjon.py).
- `spill/skjermlag.js`: én linje – `LØFT` eksporteres (`Skjermlag.LØFT`) så andre filer kan legge til paneler.
- `spill/tropper-visning.js`: krokene `ombordMål` (trykk-delen).

## Vakt
`pipeline/fliser/vakter/telefon.js` – målvalg (et falskt merke får ikke trykket), Kjør dit om bord med berøring
(FlytSpill.test + falsk berøring), Selskapet i LØFT, navneklampen, og på telefon: body.målvalg, stripa, panelet skjult, Avbryt.
Prøvd på mobil og PC (ok, ca. 2 s). Feil lagt inn med vilje: uten `velgerMål` og uten `ombordMål` – vakta fant begge.

## Ikke gjort
- PC-topplinja har fortsatt «+5 tall» (oppdraget gjaldt telefon).
- Etiketten «Kontrakt: …» fra selskap-visning.js (se 8).
- Kjøringen med ekte vegnett er ikke sett i nettleser (testserveren har ikke vegnettet).
