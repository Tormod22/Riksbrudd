# Startskjermen, karakteren og leirvalget

Pakka «start» eier spill/oppstart.js, spill/oppstart-visning.js, spill/leirvalg.js (ny) og det som legger ut lag/baser før
spilleren har startet (gjemmingen ligger i oppstart-visning.js). spill/portrett-motor.js (brukerens Karakterstudio v3) er IKKE endret.

## Runde 6 (19. nov, kritikken)

Punktene fra docs/anmeldelse-2026-11-19.md. Alle tall er Claudes forslag. Bilder før: scratchpad kritikk/pc og kritikk/tlf;
bilder etter: scratchpad natt6/start/ (tlf-*, pc-*, ligg-*, rog-pc-*, rog-tlf-*, norge-pc-*).

1. **«Kvinne» endrer ikke portrettet – RETTET.** Portrettmotoren tegner nøyaktig det som er valgt, og startverdiene var en mann
   (kort hår, skjeggstubb). Nå: `Oppstart.byttKjønn(p, kjønn, valgt)` gir et passende utgangspunkt når kjønnet byttes – kvinner
   får ikke skjegg, og en frisyre som ikke passer (Oppstart.KJØNN: hvilke frisyrer som passer hvert kjønn – Claudes inndeling),
   byttes til hestehale (kvinne) / kort (mann). Det spilleren selv trykker på, huskes i `karakter.valgt = { felt: kjønnet da det
   ble valgt }` og beholdes når samme kjønn velges igjen (velger hun «Kort» som kvinne, står det). `Oppstart.tilfeldigPortrett()`
   («Tilfeldig utseende»): aldri skjegg på kvinner, frisyre som passer, militært antrekk; menn skjegg i ca. halvparten.
   `Oppstart.rettKjønn` i fraJSON retter lagrede spill fra før: kvinner uten egenvalgt skjegg mister skjegget, og den som sto
   med startverdiene (kort + skjeggstubb), får hestehale – derfor riktig også i Deg-panelet (karakter.js leser portrettet herfra).
2. **Portrettet følger ikke med når du blar (telefon), kuttet liggende – RETTET.** Navn, utseende og bakgrunn står nå i én spalte
   med portrettet ved siden av (`.to > .bilde`, position: sticky). Telefon (≤ 700 px bred): portrettet står lite (92 px) og fast
   øverst i arket hele steg 1, på tett bakgrunn. Liggende/lav skjerm: portrettet høyst 92vh − 110 px, så hele bildet synes.
3. **Aldersglideren hadde nettleserens blåfarge – RETTET.** Egen stil (appearance: none, mørk skinne, gyllent håndtak, accent-color).
4. **Fanene sto rett under navnefeltet – RETTET.** Egen overskrift «Utseende» og fanene som en fanelinje (understreket valgt fane).
5. **Steg 3 sa «Hvor som helst i Norge» på /rogaland, og bakgrunnen viste Agder – RETTET.** `OppstartSpill.sted()` gir området:
   fylket (SPILLOMRÅDE, eller navnet fra adressen før grensa er hentet), «Dovre-kartet» på /dovre-fliser (gjenkjent på adressen –
   OMRÅDE byttes av manifestet), ellers Norge. Bak startskjermen fyller spillområdet hele skjermen (`visOmrådet(true)`).
6. **Omlasting under oppstarten slettet alt – RETTET.** Utkastet (steget og alle valgene) lagres hvert sekund mens startskjermen
   eller leirvalget er åpent, i `riksbrudd-k1-utkast` (på /rogaland automatisk med «@rogaland»). Ved omlasting fortsetter du på
   samme steg. Slettes når leiren er lagt og ved «Nytt spill». Leses ikke i testene (navigator.webdriver).
7. **Ferdige lag og baser fra Dovre-piloten før start – RETTET.** For vanlige spillere tar `gjemStart()` alle blå lag (unntatt
   karakteren) ut av ENHETER, alle blå kjøretøy ut av KJORETOY og flytter «Hovedbase Dombås» (OLJE.BASER[0]) til −9 000 000 m
   (utenfor alt kart) – ved DOMContentLoaded, når du trykker «Velg på kartet», og i en billig tegnekrok hvis en modul legger inn
   nye blå lag senere. `gjemTilbake()` (i bekreft, før bruk) setter dem inn på samme plass i listene og basen tilbake, og bruk(true)
   gjør som før: Vaktlaget (4 mann) blir igjen, de andre startlagene og de tunge kjøretøyene går, lastebil og speiderbil står ved
   leiren, basen heter «Leiren til …». PATRULJELAG er husket for seg i index.html, så indeksene i ENHETER betyr ingenting. Lagrede
   spill (S finnes) gjemmes ikke. I testene skjer ingenting av dette før OppstartSpill.test = true (kontrollskriptet bruker lagene).
8. **Oversiktskartet hadde et stort tomt, mørkt felt – RETTET.** «Velg på kartet» passer spillområdet inn mellom statuslinja og
   banneret; på høy, smal skjerm (telefon) fyller området høyden (bredden kan dras), på PC hele området synlig. /norge som før.
9. **Leiren kunne legges på snaufjell med bare kaibeskjeden – RETTET.** spill/leirvalg.js (regler uten DOM, test_leirvalg.js):
   `Leirvalg.måle(vindu, x, y)` (andel skog, åpent fjell, avstand til veg, sjø = vann under 3 moh. innen 2,5 km) og
   `Leirvalg.vurder` gir advarsler: høyfjell over tregrensen (Vegetasjon.tregrense: kaldt og værhardt, ingen skog å hogge),
   nesten ingen skog innen 2,5 km, ingen veg / over 1,5 km til veg (lastebilene kommer ikke fram), over 20 km til nærmeste
   tettsted (få hus å lete i), og fakta («skog: mye · veg 340 m unna · Dombås 4,0 km»). `Leirvalg.kaiTekst`: «Ingen kai innen
   10 km» ties når det ikke er sjø i nærheten (Dovre), og «for langt til å være leirens kai» får forklaringen «En kai innen 3 km gir
   leiren båter, fiske og varer sjøveien». kaier.js er ikke endret – teksten fra LEIRVALG_TILLEGG tolkes her. Banneret viser først
   «Her? … moh.» og fyller inn vurderingen når terrengvinduet (lagVindu ± 2,5 km med veger) er hentet; høyden tas fra vinduet når
   kartet ikke hadde den. REGLER: radius 2500, skogLite 0,04, skogMye 0,3, vegLangt 1500, byLangt 20000, sjøMoh 3.
10. **Egen lagring per side uten å si fra – RETTET.** `andreSpill()` leser de rå nøklene (localStorage.key / localStorage[nøkkel] –
    getItem legger til «@rogaland» på /rogaland) og steg 1 sier f.eks. «Dette er et eget spill i Rogaland. Spillet ditt
    «Dovregubbene» på Dovre er lagret der og blir ikke rørt.» (eller «på Norgeskartet», «i Rogaland»). Uten andre spill: på
    /rogaland «Det lagres i denne nettleseren, for seg», ellers ingenting.

Også: lappen «Leiren her?» står rett under flagget (Etikett flyttet den ca. 100 px unna, pc 17-leir-etter-5s.png).

### API (window.OppstartSpill, nytt)
`UTKAST`, `lukk()`, `sted()`, `andreSpill()`, `lesUtkast()`, `lagreUtkast(tving)`, `glemUtkast()`, `gjemStart(tving)`,
`gjemTilbake()`, `gjemt()`, `visOmrådet(dekk)`. Regler: `Oppstart.KJØNN`, `byttKjønn`, `tilfeldigPortrett`, `rettKjønn`;
`Leirvalg.REGLER`, `måle`, `vurder`, `kaiTekst`, `km`.

### Vakt og tester
- `node pipeline/fliser/test_oppstart.js` (nye: kjønn, tilfeldig 400 ganger, gamle lagringer) og `node pipeline/fliser/test_leirvalg.js`.
- `pipeline/fliser/vakter/start.js` («startskjermen (runde 6)»): Kvinne gir passende portrett og nytt bilde, egenvalgt frisyre står,
  30 × Tilfeldig uten skjeggete kvinner, fanene under «Utseende», portrettet sticky, glideren stylet, utkastet lagres/leses, steg 3
  sier området, gjemStart(true)/gjemTilbake gir samme lister og base, leirvalget på fjellet ved Dombås gir «Høyfjell». Setter
  startskjermen, banneret, kameraet, valgt, OppstartSpill.test og utkastnøkkelen tilbake. Ca. 1 s.

### Ikke gjort / gjenstår
- Navnelappene som klumper seg rundt leiren etter start (kart-pakka) og «o t olje»-lappen (økonomi/kart).
- Leirvalget sier ikke noe om hus utenfor tettstedene (bare avstand til nærmeste tettsted) – husdataene ligger i kartlageret.
- /dovre-fliser og /norge deler fortsatt ett lagret spill (som før); bare /rogaland har sitt eget.
- Omlasting midt i leirvalget fortsetter på steg 3, ikke i selve kartvalget.
