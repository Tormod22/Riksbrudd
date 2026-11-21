# Pakke «lasting» – 3D laster i tide når du flytter deg mye

## Runde 15 (21. nov kveld)

Brukeren: «ting laster kanskje litt sent i 3D hvis den flytter seg mye – det bør fikses». Gren `claude/natt18-verden`.
Alle tall er Claudes forslag (samlet i `Forut3d.REGLER`). Bilder og målinger: `<scratchpad>/natt15/lasting/`.

### 1. Målt først (ekte kartdata via dev.py, /rogaland, leir i Ryfylke 15607 6622779)
Måleskript `<scratchpad>/natt15/lasting/maal.js` (MODUS=fly|kjor, MOB=1, ROT=<kopi av koden> for «før»). Kameraet flyttes i rett linje
mot Sand i jevn fart (fly: 45 m/s, kamera 1200 m unna = utsnitt S ≈ 1980 m; kjør: 22 m/s i gåmodus, S = 1700 m) i 150 s. Tegningen er slått
av under målingen (`R3.målGanger = 0`, som «Mål ytelse» gjør): med programvare-grafikk tar hvert bilde ellers 0,75 s, og byggingen får bare
16 ms per bilde – da ble ingen nye utsnitt ferdige på 150 s (første forsøk). Uten tegning ligner tidsbruken mer et ekte grafikkort.
- «Uten detaljer» = sekunder punktet du ser på er utenfor det ferdige utsnittet; «600 m foran» = punktet 600 m foran det; «nær kanten» = over 75 %.
- Årsakene som ble funnet: (1) nytt utsnitt startes først ved 45 % fra midten, (2) det legges der du er DA, ikke der du er når det er ferdig,
  (3) byggingen tar 20–50 s her (16–49 s målt), og 45 m/s × 37 s = 1,7 km – du er forbi det før det er ferdig, (4) kartdataene hentes først
  når byggingen starter. HUS_S/manglerHus: i flyhøyden som ble målt (S ≈ 1980) var husene med – ikke årsaken her.

### 2. Endret
- NY `spill/forut3d.js` (regler uten DOM, `window.Forut3d`, test `pipeline/fliser/test_forut3d.js`):
  - `steg`: farten til punktet du ser på (eller står på) jevnes ut over 1,2 s; hopp over 2 × S nullstiller.
  - `byggTid`: hvert utsnitt måles fra bestilling til innsetting (glidende snitt, 3–45 s). Første anslag = tiden det første utsnittet tok × 1,5
    (`ny(førsteSek)`; det første bygges uten tegning ved siden av, så de neste tar lenger), minst 12 s.
  - `plan`: over 6 m/s bestilles neste utsnitt når du vil være 45 % fra midten NÅR det nye er ferdig (der du er om byggetiden), og midten legges
    foran deg: der du er når det er ferdig + 30 % av S, høyst 85 % av S fra der du er nå. Under 6 m/s (gange) gjelder den gamle regelen alene.
  - `forhentPunkt`: kartdataene til utsnittet ETTER det som bygges bes om (høyst hvert 1,5 s, ca. to byggetider fram, høyst 2,2 × S).
  - `ledd`: hvor langt foran deg neste utsnitt ventes ferdig (fjernkartet bruker det). `simuler`: prøveflyging for test og vakt.
- `index.html` (mine deler): `forut3d(R, u, b, S)` (ny, ved `byggVent`) kalles i `tegn3d` FØR den gamle regelen, så et utsnitt som bestilles mens du
  flyr, alltid legges foran deg. `nytt3dUtsnitt` måler byggetiden (`R3.byggSek`). `nivå3d(S)` (ny) gir N, zD, TW og zt for et utsnitt – brukt av
  `bygg3d` og `forhent3d` (samme tall som før). `forhent3d(cx, cy, S, b, mer)`: med `mer` også høydene i byggingens oppløsning (z ≤ 11) og
  dataene til kartflisene i kartbildet (`forhent` – bakgrunnstråden husker dem; høyst 64 fliser). Skript-taggen `spill/forut3d.js` står rett
  etter `fjernkart3d.js`.
- `spill/fjernkart3d.js`: midten legges der du er når neste utsnitt er ferdig (`Forut3d.ledd`), fjernkartet vises også når du KJØRER (før
  skjult så lenge `R3.fot` var satt – også i bilen), `midten` er eksportert, og «Laster landskapet …» kommer først ved 75 % (før 55 %; neste
  utsnitt bestilles nå tidlig, så meldingen sto midt i et ferdig landskap).
- Pusten (`børPuste`/`pust`) er ikke endret.

### 3. Målt før og etter (150 s, tegning av)
| | uten detaljer | 600 m foran utenfor | nær kanten | utsnitt bestilt ved | pauser > 200 ms / > 500 ms |
|---|---|---|---|---|---|
| Fly PC før | 30 s | 57 s | 61 s | 32 % (diagonalt = 45 %) | 191 / 49 |
| Fly PC etter | **0 s** | **11,5 s** | **13,7 s** | 14 % (1352 m foran deg) | 195 / 53 |
| Fly mobil før | 18,1 s | 59,3 s | 67,2 s | 33 % | 165 / 56 |
| Fly mobil etter | **6,3 s** | **30,7 s** | **33,2 s** | 7 % (1189 m foran deg) | 183 / 56 |
| Fly PC etter, siste (med første byggetid × 1,5) | **0 s** | **0 s** | **0 s** | 2 % (1676 m foran deg) | 155 / 60 |
| Fly mobil etter, siste | **0 s** | **0 s** | **0 s** | 2–6 % (1320–1440 m foran deg) | 91 / 13 |
| Kjør PC før (22 m/s) | 0 s | 0 s | 0 s | 32 % | 151 / 34 |
| Kjør PC etter | 0 s | 0 s | 0 s | 9–25 % (800–1060 m foran) | 168 / 36 |

Maskinen deles med flere hjelpere, så tallene varierer mellom kjøringer (byggetiden 13–49 s for samme slags utsnitt; mobil siste kjøring bygget
fortere enn de andre). Pausene er derfor bare grovt sammenlignbare. Mobil etter (første) ble målt før byggetiden fra det første utsnittet ble brukt (anslaget var 12 s mot 48 s i virkeligheten, så det første ble lagt for
nær). Pausene: like mange før og etter, ett utsnitt bygges fortsatt om gangen, men det bygges oftere når du flyr fort (4 mot 1–2 utsnitt på 150 s).
De lengste pausene (7–17 s) finnes både før og etter, alltid rett ved et bytte – programvare-grafikken (trolig mipmaps/teksturer); på brukerens
maskiner er de lengste 200–400 ms («Mål hakk» 15.–17. nov). Bilder: `før-fly-pc-6.png` (fjernkart + «Laster landskapet …») mot `etter-fly-pc-6.png`
(tettstedet med hus, veger og trær), og `før-fly-mob-9.png` / `etter-fly-mob-9.png`. Kjøringen er en rett linje i gåmodus (kroppen flyttes),
ikke feltbilen langs en veg – utsnittsregelen er den samme (bilen setter `R3.bane` på samme måte).

### 4. Vakt
`pipeline/fliser/vakter/lasting.js`: prøveflyging (45 m/s, 30 s byggetid: uten detaljer 52,5 -> 0 s, første bestilling ved 3 % i stedet for 45 %),
og i 3D en flyging østover i 50 m/s (farten lagt inn i `R3.forut`; `nytt3dUtsnitt` og `forhent3d` byttes ut mens vakta går, så ingenting bygges):
utsnittet bestilles foran deg (1631–2226 m), kartdataene lenger fram bes om, fjernkartet ligger foran deg, og uten fart bestilles ingenting.
Prøvd på Dovre PC og mobil (ok, 2–3 s). Feilen med vilje (`Forut3d.REGLER.grense = 99`): vakta melder tre feil.

### IKKE gjort
- Gjenbruk av det forrige utsnittet (hus, trær og veger som alt er ferdige) og bygging i ringer (nærmest først) – vurdert, men det krever at
  `bygg3d` og alle `KROKER.bygg3d`/`sett3d`-modulene kan bygge en del av et utsnitt; for stort til denne runden. Ett utsnitt bygges om gangen som før.
- Ikke prøvd med feltbilen langs en ekte veg eller med helikopteret (bare samme regel via `R3.bane`).
- Hakkene i et bytte er ikke gjort mindre (bare ikke verre).
