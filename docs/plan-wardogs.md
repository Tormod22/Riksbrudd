# Plan: inspirasjon fra Wardogs (21. nov 2026)

Brukeren: «Wardogs er også en inspirasjon til spillet vi lager». Brukeren valgte alle fire delene: selskapet ditt, kamp på bakken,
kjøretøy i kamp og bygg og ødelegg.

Wardogs (Bulkhead/Team17) er et taktisk flerspiller-skytespill om private militære selskaper som slåss om en oppdiktet region.
Vi henter **bare ideer**. Selskapsnavn, kart, logoer, våpen- og kjøretøydesign og utseende fra Wardogs skal ikke brukes.
Alt bygger videre på det som finnes: gjengen (plan-gjeng.md), leiren, troppene, kjøretøyene, gåmodus, strid.js og odeleggelse.js.

Alle tall er Claudes forslag til brukeren har bestemt noe annet.

## W1 – Selskapet ditt (private militærselskap)
- Fraksjonen din får rolle som et **selskap**. Selskapet har:
  - et navn og et flagg, som allerede finnes fra oppstarten;
  - et **rykte**: pålitelig, hardhendt eller billig;
  - en **kontraktliste**.
- **Kontrakter** er betalt arbeid med frist og krav. Eksempler:
  - eskorter en tankbil fra A til B;
  - hold en bru i 12 timer;
  - rydd et veisperre-lag;
  - hent en person.
  - Betaling ved levering, og bot hvis du bryter kontrakten.
  - Bygger på oppdrag i spillet.js og Mål i Leir-menyen.
- **Motstanderne** er andre selskaper med egne navn (oppdiktet). Kystalliansen og Folkefronten kan beholdes eller døpes om, og brukeren velger.
- Ryktet styrer hvilke kontrakter som kommer, og hva bygdene mener om deg.

## W2 – Kamp på bakken (gåmodus)
- **Dekning:** hukk bak vegger, biler og steiner, og ta mindre skade der.
- **Siktekikkert** (høyre museknapp / knapp på telefon).
- **Flere våpen i sekken:** rifle, maskingevær og granater.
- **Lagkamerater som følger deg** når du går. Enkle ordre: «følg meg», «hold her», «angrip dit».
- **Treffmarkør og skadeindikator** som sier hvor skuddene kommer fra.
- Bygger på gange.js, narhud.js, utstyr.js og strid.js. Fiendene i 3D bruker de samme kampreglene som i 2D.

## W3 – Kjøretøy i kamp
- **Kjøre og skyte** fra pansret bil eller stridsvogn i 3D: tårnet dreies med musa eller fingeren.
- **Helikopter** som kan flys lavt.
- **Skade på kjøretøy:**
  - hjul og motor kan ødelegges;
  - et kjøretøy kan brenne ut;
  - folk kan gå ut av det.
- Kjøretøy er viktige i krigen: de er raskere, tåler mer og er dyre å miste.
- Bygger på kjor.js, kjoretoy3d.js og enheter.js (Enheter.skad).

## W4 – Bygg og ødelegg
- **Feltbygg der du står:** sandsekker, vegsperre, piggtråd og skyttergrav.
  - Byggetid og materialer fra lageret.
  - Bygger på feltarbeid.js og byggesett.
- **Ødeleggelse:**
  - Bygg og bruer kan skytes i stykker med tunge våpen.
  - Hus får hull og kan rase.
  - Dette viser seg i 2D og 3D og lagres.
  - Bygger på odeleggelse.js, INFRA_TILSTAND og bruer3d med gap.

## Rekkefølge (forslag)
1. **W1 Selskapet og kontraktene.** Det gir et mål og en grunn til å spille videre, noe kritikerne har savnet.
2. **W4 Bygg og ødelegg:** feltbygg først.
3. **W2 Kamp på bakken.**
4. **W3 Kjøretøy i kamp.**

## Besluttet av brukeren (21. nov)
- Motstanderne får **nye navn som selskaper**. Kystalliansen (rød) og Folkefronten (grønn) døpes om til oppdiktede private militærselskaper.
  Navnene er Claudes forslag. Brukeren kan bytte dem, og de skal ikke ligne Wardogs sine selskaper eller ekte firmaer.
- **Flerspiller kommer senere.** Derfor:
  - Lag tilstanden for selskap, kontrakter og rykte så den kan deles. Den skal være ren JSON, lagres per leir og være skilt fra visningen.
  - Ingen regler skal anta at det bare finnes én spiller. Bruk sidens id, ikke «spilleren».
  - Selve flerspilleren (tjener, innlogging) bygges ikke nå.
