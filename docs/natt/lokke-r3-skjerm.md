# Kritikerløkka r3 – pakke «skjerm» (26. nov)

Grenen claude/lokke-r3-skjerm. Vakt: pipeline/fliser/vakter/skjerm-r3.js (prøvd på PC og mobil, og med feilen lagt inn igjen: den slår til).

## Laget
1. **Byggelista hopper ikke** (Ingrid). Årsak funnet: spillhud.js gir hvert kort et ikon (24 px) via `[data-ikon]::before`, men data-ikon
   ble satt av ikoner.js *etter* at lista var tegnet på nytt (hvert sekund mens noe bygges). Da vokste alle kort 25 px etterpå, og
   kortet Dieseltank (tre rader ned) flyttet seg ~78 px til ankeret rettet det. På telefon var det flisene i hodet (ikon som float).
   Rettet: (a) spillhud.js holder ikonplassen for kort uten ikon, (b) leir-visning.js setter data-ikon på kortet med en gang
   (Ikoner.BYGG) og kaller Ikoner.merk() før kortet rettes, (c) visMeny bytter bare ut hodet og halen – kortene (lista) står når de ikke
   er endret. Målt: y står på én verdi i 3,5 s mens Brakke bygges (før 388/467 på PC, 416/431 på telefon).
2. **Loggen** (loggdemp.js, test_loggdemp.js): `REGLER.SAMLE` – «Radiomasten fanget opp samband: …» innen 60 spillminutter blir én linje
   «(n ganger siste time) – sist: …». `REGLER.UTSETT` – «Handelsruta fra X er truet/STENGT/åpen igjen» meldes først når den har stått
   i 90 spillminutter (LoggDemp.modne, sjekkes hvert 0,5 s); går den tilbake før det, meldes ingenting.
3. **Lesepause** (paneler.js, `Paneler.LESEPAUSE`): åpnes et panel du leser (funnet fra husleting, Selskapet, Krig, Region, Samfunn, Folk,
   Deg, Verden, Sjø, hele loggen, Mer-lista …) mens farten er 600× eller mer, eller ⏭ spoler, går farten til 1× (kort i «⏭»-lappen) og
   tilbake når panelene er lukket – ikke hvis du har valgt en annen fart imens. Ikke i testene uten Paneler.test = true.
4. **Overlegg**: Mer-lista lukker paneler den ville ligget oppå (spillhud.js åpneKomMer). «Velkommen tilbake» legger seg under #alarm /
   #fartgrunn (logglager.js).
5. **Navn** (etikett.js, test_etikett.js): lag/kjøretøy med merket utenfor skjermen får ikke navnet klemt inn (fiender og det valgte
   står med pil); navn som er flyttet mer enn `REGLER.pil` = 26 px fra merket, får en tynn strek med pil mot merket. «Nødlageret · 900 m»
   er en hindring for navnene (én linje i selskap-visning.js).
6. **Kronelapp** (flistips.js `KASSELAPP`): fra 60× (eller ⏭) vises lappen bare for beløp fra 50 000 kr; tallet blinker som før.
8. **Scenariodagen** følger klokka øverst (ny dag ved midnatt): strategi-visning.js (én linje) og Scenario.dag i scenario.js.
9. **Feltbil/Helikopter** (kartlapper.js): trykk på dem i 2D forklarer at de er leirens kjøretøy for 3D; med 3D av i ☰ skjules navnene.

## Ikke gjort / bare undersøkt
7. **Nedtellingen gikk opp** – ikke mine filer. Tida er `SpilletSpill.T().nesteSpill`. Steder som flytter den *fram*: morgen-visning.js:414
   (`T.nesteSpill = S.vernTil` når vern er kjøpt), morgen-visning.js:187 (utsett), trussel-lagring.js:148 (`hentNeste` etter omlasting – leser
   lagret tid; lagres hvert 5. s, så ved 600× kan tida og nesteSpill være lagret på ulike tidspunkt) og spillet-visning.js:356 (start uten
   lagret tid). Mest sannsynlig: omlasting (hentNeste) eller vern. Ikke gjenskapt.
10. **Funnet i 2D** – ikke gjenskapt: LeteSpill.ferdig(P, { i2d: true }) viser #funnpanel i 2D (prøvd på PC og telefon), og Ingrids eget
    bilde 52-let.png viser dialogen i 2D. Vakten sjekker det.
- Krigskartet: «Nødlageret · 900 m» over «Fyrvakta · 2 lag» – strategi-visning.js (kontrakt-pakka), ikke rørt.

## Fellesfiler endret (små)
- spill/selskap-visning.js, tegnLager: én linje `Etikett.hinder(...)` før lappen «Nødlageret · …» tegnes.
- spill/strategi-visning.js, scenarioBoks: `dag` regnes som klokka øverst (`(tid + 360) / 1440`), og en kommentar over funksjonen.
- spill/scenario.js: `dag(tid)` = klokkas dag; teksten «Dag n av 7» høyst 7.
- index.html: bare versjonsmerker (versjon.py).
