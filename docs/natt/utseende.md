# Pakke «utseende» – kartet i 2D og 3D-kartet i dårlig vær (grenen claude/natt18-folk)

## Runde 8 (20. nov natt, ny kritikk)

Kritikken: `scratchpad/kritikk2/tlf/anmeldelse.md` (telefon, /norge, Lærdal) og `scratchpad/kritikk2/pc/anmeldelse.md` (PC, /rogaland).
Alle tall er Claudes forslag (samlet i `FLISLAST` i index.html, `Vaer.DIS3D`, `Vegetasjon.TREFARGE`, `Vegetasjon3d.NÆRSKOG`).

1. **Synlige skjøter i 2D-kartet – RETTET.** Årsaken var lastingen, ikke dataene: Norge-kartet har én fil per lag uten skjøter (manifestet:
   kart-0 z0–10, hoyde-0/-1, terreng-0, vektor-0), og bildene etter 8 s (tlf 09-etter-trykk-8s.png) er skarpe overalt. Mens flisene kommer,
   sto en ferdig skarp flis rett ved siden av en grov reserve (opptil fire nivåer opp, forstørret), med rett kant og litt annen tone
   (skyggen overdrives mer på grove nivåer). Gjenskapt på /norge i Lærdal med tregt nett (CDP 120 ms, 2,5 MB/s): «før»-bildet etter 7 s har
   en skarp loddrett stripe midt i et blekt, grovt kart – akkurat som kritikerens. Nå (`tegnFliser` i index.html, rett før `tegn()`):
   - en ny flis **tones inn** (FLISLAST.inn = 320 ms) over reserven / den gamle utgaven (en ny utgave etter et nettbrudd tones over den gamle);
   - en ferdig flis som står inntil en synlig flis som ikke er ferdig, får **myk kant** mot den (FLISLAST.kant = 36 punkter, grov -> skarp),
     tegnet via et lite lerret (`mykFlis`, destination-in med lineære overganger) – ingen rette sømmer;
   - **reserven** leter seks nivåer opp (før fire) og bruker de **fire finere flisene** når du zoomer ut (`tegnReserve`).
   - reserven leter **ni nivåer** opp (rett etter lasting er oversikten over landet det eneste som finnes – bedre enn blått), og de grove
     flisene **slipper foran** i køen (`kø(…, forrang)`, høyst FLISLAST.forrang = 10 i arbeid) når den er full av fliser som ikke lenger vises.
   **Ikke rettet – sømmer i selve satellittmosaikken:** ved Bryne (/rogaland, 1 km-målestokk, alle fliser ferdige) står et lysere rektangel
   med rette kanter. Den vannrette kanten følger en z7-blokkant (Y = 6 547 488): spranget er 25 % på den 2 km lange biten som synes, men bare
   3–4 % i median langs hele kanten (opptakene skifter langs kanten); den loddrette kanten (X ≈ −36 540) følger ingen blokkant i flisnettet
   (trolig kanten av et Sentinel-opptak). En retting i visningen ble prøvd (sprang målt bit for bit langs blokkantene på z8, fordelt over
   2,5 km på hver side) og tatt ut igjen: den fjernet ikke rektangelet (den andre kanten er ikke en blokkant) og kostet flere kartfliser.
   Dette må rettes når kartet bygges (blokk.py/sammen.py: mykere overgang mellom opptak) – bilde `scratchpad/natt8/utseende/sammen-mosaikk.png`.
2. **Liggende telefon: blekt og tomt kart de første sekundene – RETTET.** «Blått og hvitt» var bakgrunnen (havblått på /norge) med det lyse
   siktfeltet oppå: ingen flis var laget ennå, og reserven fantes ikke rett etter lasting. Nå bes en **grov flis for hele bildet** (fire
   nivåer opp, FLISLAST.grov) om FØRST, før de skarpe, så kartet fylles uskarpt på et øyeblikk. Målt med samme tregt-nett-oppsett: etter 4 s
   et helt (grovt) kart i stedet for blått; etter 12 s skarpt i midten med myke overganger.
   Også: et lagret spill la kartet over leiren («Velkommen tilbake»), men kom manifestet etterpå (treg linje), flyttet `KLAR` i index.html
   kartet tilbake til hele landet – og flisene for hele landet ble laget før leirens. Nå blir kartet stående over leiren (`lagretLeir`,
   ikke i testene og ikke når adressen sier hvor kartet skal stå). Prøvd: etter omlasting står kartet på leiren (m 8) fra første sekund.
   På den overbelastede testmaskinen (manifestet tok 9 s) kom det første grove kartet likevel først etter ca. 7 s; før det er bakgrunnen
   mørk og så (fra ni nivåer opp) en jevn landfarge.
3. **3D-kartet ovenfra nesten helt grått i regn – RETTET.** Før ble disens avstander ganget med været (regn 0,4) også høyt oppe, så bakken midt
   i bildet lå bak disens ytterkant. `Vaer.dis3d(near, far, dis, D)` (spill/vaer.js, test i test_vaer.js) brukes i vaer-visning.js: nede ved
   bakken (går, kjører, lavt kamera) som før; høyt oppe (overgang 160–1400 m kameraavstand) begynner disen ved 0,45–0,9 × avstanden til
   bakken midt i bildet og tetner bortover. Regn: bakken midt i bildet 29 % inn i disen (før over 100 %), tåke 46 %. Målt i Lærdal fra 5,4 km:
   disen [2791, 11165] -> [3410, 18462] m. Lyset (lys3d.js: grå himmel i regn) er ikke rørt (ytelse eide fila).
4. **3D-lia ved leiren: glatt, gul flate med bregner, ingen trær – RETTET.** To ting:
   - Hovedårsaken: utsnittet ovenfra var over 4200 m (trær3d lager bare trær når utsnittet er høyst 4200 m), og når du trykker Gå, bygges et
     mindre utsnitt med trær – på kritikerens maskin tok det over ett minutt, og så lenge sto du i en tom li (lyngtuene rundt kameraet fra
     gress3d kommer straks – det var «bregnene»). Nå: **nærskog** i spill/vegetasjon3d.js – når du går i et utsnitt uten trær, settes trærne
     innen 240 m rundt deg med en gang (samme 5 m-gitter og regel som trær3d og 2D-kartet: treVed, TRE_TETT, treIHøyden; ikke i vann, på
     veg, inntil hus, i leirens bygg eller innen 30 m fra leirens midte), regnes på nytt når du har gått 80 m, og tas bort så snart
     utsnittet har egne trær, og bare når kameraet er under 30 m over bakken (ikke en ring av skog under helikopteret). Prøvd: 296 trær rundt
     deg 4 s etter Gå, før det nye utsnittet er ferdig, på samme steder som etterpå (`sammen-gaa2.png`).
   - I tillegg satte trær3d (index.html) bare trær der satellittbildet var grønt; i tørr, gulbrun skog ble trær borte. Nå
     `Vegetasjon.trePåFarge(R, G, B, skog)`: i skogklassen også gult/brunt, aldri grått, blått, rødt tak eller kartets vegfarger.
     (I Lærdal utgjorde dette lite – 2374 mot 2420 trær nær – men det gjelder all gulbrun skog.)
5. **Mørk, halvmåneformet «skyggestripe» ved leiren i 3D ovenfra – FUNNET, se under (rettes i lys3d.js etter kl. 03:45).** Gjenskapt i
   Lærdal kl. 06:00 (sola 7,8° over horisonten), Høy grafikk: en skarp, mørk, tilspisset stripe ca. 1,1 km vest for leiren. Borte med
   skyggekartet av, borte kl. 09 (sola 28°), men IKKE borte når alle skyggekasterne (kraft3d, infra3d, portal3d) er skjult. Den forsvinner når
   skyggekameraets fjerne plan flyttes 6 km lenger ut: det er der planet skjærer terrenget. Med lav sol dekker skyggekartets boks (±700 m)
   en stripe på flere km langs sola (700 / tan 7,8° ≈ 5,1 km), men dybden går bare 1370 m forbi midten (far = lz + halv · 1,6 + 250), og
   punktene like innenfor planet blir mørke (VSM-presisjon ved z ≈ 1).
6. **«Fodnestunnelen hovedløp» – RETTET.** spill/kartnavn.js (`KartNavn.vis/rens`, test_kartnavn.js med 30 navn fra NVDB): tunneler mister
   «hovedløp», «løp mot …», «nordgående», «rampe …», «-arm …», «sekundær- og fellesløp» (kutt etter selve tunnelnavnet, nummer beholdes:
   «Breimsfjelltunnelen 2»); bruer bare retning og «rampe» («Åbrua Flomløp» og «Mesna Rampebru» er ekte navn). `lesInfra` i index.html kaller
   den, så 2D, 3D og panelet får samme navn; NVDB-navnet står i `e.nvdbNavn`.

### Filer
- `site/dovre-fliser/index.html`: `FLISLAST`, `flisReserve`, `tegnReserve`, `mykFlis`, `tegnFliser` (rett før `tegn()`), `tegn()` kaller
  `tegnFliser`, `kø()` setter `t.inn`/`t.gml` (toning); `lesInfra` kaller `KartNavn.rens`; `trær3d` bruker `Vegetasjon.trePåFarge`;
  skripttaggen for kartnavn.js rett etter kartbilde.js.
- `site/dovre-fliser/spill/kartnavn.js` (ny) – `window.KartNavn` (vis, rens). Test: `pipeline/fliser/test_kartnavn.js`.
- `site/dovre-fliser/spill/vaer.js` – `DIS3D`, `dis3d`. Test: `pipeline/fliser/test_vaer.js` (5 nye).
- `site/dovre-fliser/spill/vaer-visning.js` – disen i ramme3d bruker `Vaer.dis3d`; `VaerSpill.treVær` eksportert (nærskogen får årstid).
- `site/dovre-fliser/spill/vegetasjon.js` – `TREFARGE`, `trePåFarge`. Test: `pipeline/fliser/test_vegetasjon.js` (4 nye).
- `site/dovre-fliser/spill/vegetasjon3d.js` – nærskogen (`NÆRSKOG`, `lagSkog`, `fjernSkog`, ramme3d/sett3d), `Vegetasjon3d.nærskog()`.
- Vakt: `pipeline/fliser/vakter/utseende.js` (ca. 0,7 s): navneregelen og INFRA-tunnelene, `Vaer.dis3d`, `trePåFarge`, nærskogen finnes,
  og 2D på et hjørne av Dovre som ikke er vist nær: grov flis først, ingen tomme fliser etter høyst 9 s, myke kanter underveis
  (reserven settes midlertidig til fire nivåer, kameraet settes tilbake). Prøvd PC og mobil: ok.
- Bilder: `scratchpad/natt8/utseende/` – `for-liggende-7s-liten.png` / `etter-liggende-7s-liten.png` / `etter-liggende-12s-liten.png`
  (punkt 1–2), `sammen-z2.png` (navnet), `sammen-regn-pc.png` (punkt 3), `sammen-gaa2.png` (punkt 4), `sammen-halv*.png` (punkt 5).
  Skript: `last2d.js`, `tre3d.js`, `halvmane.js` (ROT=<site-mappe> UT=<navn>; `for/site` er koden før runde 8).

### Ikke gjort / svakheter
- De første ~2 s etter at et lagret spill lastes er 2D fortsatt tomt (oversiktsflisene for hele Norge lages før kameraet flyttes til leiren).
- Nærskogen har ikke stammer å kollidere med, ikke vind i greinene og bare enkle former utenfor 70 m – den står bare til det nye utsnittet er ferdig.
- Lyset i regn (grå himmel og mørkere sol i lys3d.js) er ikke endret – bare disen.
