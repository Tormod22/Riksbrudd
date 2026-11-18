# Pakke «karakter» – eventyret til fots (natt til 18. nov)

Målet: det å gå rundt som deg selv skal være et lite overlevelsesspill med mening. ALLE TALL ER CLAUDES FORSLAG (samlet i
`Eventyr.REGLER` i `spill/eventyr.js`).

## Filer
- **`spill/eventyr.js`** (ny, regler uten DOM, `globalThis.Eventyr`, test `pipeline/fliser/test_eventyr.js`): `REGLER`, `Tur`
  (slit per meter, feltflaske), `Skader` (brukket bein, infeksjon), `Handverk` (deler, oppskrifter, funn per hus, «trolig»),
  `Felle`, `Snik` (rekkevidde, steg, dekning), `Hund`, `Historie` (tre kapitler per bakgrunn), `Slør` (kartsløret), `Lager`.
- **`spill/eventyr-visning.js`** (ny, `window.EventyrSpill`): alt som vises. Lagrer per leir i `riksbrudd-eventyr` (skader, feller,
  hund, historie, tellere, tilfluktslagre, valg) og `riksbrudd-kartslor` (sløret). `EventyrSpill.test = true` slår på det som
  ellers ikke skjer av seg selv i testene.
- **Vakt:** `pipeline/fliser/vakter/karakter.js`. **Hjelp:** `docs/natt/karakter-hjelp.json`.
- Skript-taggene står rett før `spill/meny.js` i `index.html`.

## Hva som er laget
### A. Forbedringer
1. **Behovene merkes ute.** Utenfor leiren (150 m) koster hver 45. meter ett poeng tørst (løping det dobbelte) og hver 140. meter
   ett poeng sult. **Feltflaska** (`vann` i sekken, 4 slurker à 35 tørst) fylles av seg selv i leiren (når leiren har vann) og
   når du står ved et vann. Knappene «Drikk» (X) og «Spis» (N) kommer i raden til venstre når du går og trenger dem; tydelig
   beskjed i loggen når du blir tørst/sulten, og om flaska er tom. «Pakk for tur» i karakterarket (i leiren): full flaske og opptil
   tre rasjoner fra leirens mat. En ny sekk starter med to rasjoner.
   **Feil rettet:** «Spis feltrasjon» i karakterarket virket aldri (koden lette etter `feltrasjon`, sekken kaller den `rasjon`).
2. **Tilflukter har et formål.** I et sikret hus: knappen «Tilflukt: sov og lager» -> panel med **Sov** (klokka spoles i 600× til du har sovet 6 spilltimer – høyst 45 ekte sekunder; +80 søvn,
   +40 helse for en hel natt, en andel hvis du vekkes; du vekkes av fiender innen 300 m, skade, angrep på leiren, eller et trykk på skjermen), **lager** (legg igjen / ta med ting og våpen, 60 kg per tilflukt), og valget
   **«Våkner her hvis du blir slått ut»**: blir du slått ut innen 1500 m fra en tilflukt (og den ligger i 3D-utsnittet), våkner du
   der med 45 helse i stedet for i leiren (ingen straff på moralen).
3. **Dekning.** Ny stilling **ligg** (Z på PC; på telefon blar Huk-knappen Huk -> Ligg -> Reis deg; kryper 0,4 m/s, øyehøyde
   0,35 m): skade ×0,5 (huk ×0,8). Står det en vegg eller et tre mellom deg og fienden innen 10 m fra deg: ×0,4 i tillegg.
4. **Ferdighetene åpner noe nytt** (`Overlev.Ferdigheter.ÅPNER`, nivå 3 og 6): Stødig hånd (+20 % treff liggende/på huk),
   Hodeskudd (15 % dobbel skade), Seig (fall skader sjeldnere, bein gror dobbelt så fort), Pakkesel (+10 kg), Lett til beins
   (ikke ekstra tørst av løping), Stille løp, Trent øye (leteknappen sier «(trolig mat og penger)»), Finner alt (dobbelt med deler).
   Meldes i loggen («NY EVNE …») og står i sekken under hver ferdighet.

### B. Nye ideer
- **39 Historie:** tre kapitler per bakgrunn (soldat, lege, ingeniør, bonde, forretningsmann, politi) med tekst, mål (tellere:
  meter gått, hus gjennomsøkt, tilflukter, fiender du selv slo ut, ting laget, fangst, hund, km² oppdaget, netter sovet) og
  belønning (penger, ting i sekken eller ferdighetspoeng). Står øverst i karakterarket («Din historie») med framgang.
- **40 Skader som varer:** brukket bein (fart ×0,5, verken løp eller hopp; spjelk -> ×0,8 og gror fire ganger så fort; 48
  spilltimer eller 20 ekte minutter) og infeksjon (−3 helse per spilltime til den er behandlet med førstehjelp; 72 t / 30 min).
  Fra fall (lander du fortere enn 8,5 m/s – ca. 3,7 m fritt fall; nytt i bevegelse.js: går du utfor en kant over 2,5 m, faller
  du), skudd (sjanse etter skaden du tar) og kulde (ute i vinter eller nedbør). I leiren gror alt fire ganger så fort, og med en
  sykestue som virker, blir du frisk straks.
- **41 Håndverk:** «Lag noe» (B) – førstehjelp (2 tøy + 1 sprit), spjelk (tøy + tau), snarefelle (ståltråd + tau), armbrøst
  (2 skrap + tau + ståltråd; stille våpen, 90 m) og fem bolter (skrap + tøy). Delene (tøy, tau, ståltråd, metallskrap, sprit)
  finnes når du leter gjennom hus (ca. sju av ti hus, 1–3 deler, etter byggtype, fast per bygg). **Fella** settes ut ute, vises i
  kartet og i 3D, og gir 1–2 rasjoner etter 6 spilltimer eller 5 ekte minutter (60 %, 85 % i skog).
- **42 Hund:** kommer når du går ute med en rasjon i sekken (liten sjanse per meter; sikkert etter 800 m når kapittelet ber om
  den) eller finnes i ca. hvert tjuende hus. Følger deg i 3D som en enkel figur (ett nett, ingen lys), og «knurrer mot nordøst»
  når en fiende dine ikke ser, er innen 350 m (høyst én gang i minuttet per fiende).
- **43 Sniking:** fienden oppdager deg fra 220 m når du står og går i dagslys (= som før). Huk ×0,6, ligg ×0,35, mørke opptil
  ×0,5, skog ×0,65, stille ×0,8, løping ×1,4; et skudd røper deg til 420 m i 20 s (armbrøst 126 m). Hver fiende har et nivå
  0–1; de skyter først når de har sett deg. Måleren «Skjult / Mistenkt / Sett» står under siktet når en fiende er innen 700 m.
- **44 Kartet du oppdager:** et lett slør (30 % mørkt) i 2D over det verken du (700 m), lagene dine (1200 m) eller leiren (3 km)
  har sett. Rutenett 512 × 512 celler à 250 m rundt leiren. Kan slås av i karakterarket («Slør: PÅ/AV»). Tegnes ikke i testene.

## API (window.EventyrSpill)
`T()`, `slør()`, `drikk()`, `spis()`, `pakk()`, `lag(id)`, `settFelle()`, `sjekkFelle(nr, r1, r2)`, `fåHund()`, `fåSkade(id, årsak)`,
`behandle(id)`, `sovNå(straks)`, `tilLager/fraLager(id)`, `historieSteg()`, `snikRekkevidde()`, `snikNivå()`, `åpne('lag'|'tilflukt'|'')`.
Kroker andre filer kaller: `fart()`, `kanLøpe()`, `fall(v)` (gange.js); `fiendeFaktor(d, e)`, `truffet(tap)`, `skudd(W)`, `treff()`,
`hodeskudd()`, `felt()`, `slåttUt(K)` (spillet-visning.js); `lettHus(kl, i, tomt)`, `trolig(kl, areal, i)` (leting-visning.js);
`sekkKnapp(id)` (utstyr.js). Nytt i andre moduler: `window.KARAKTERARK` (tillegg i karakterarket: `(f, { el, knapp, måler }) => …`),
`Gange.flytt(x, y, finnLedig)`, `Gange.ligg(bool)`, `Gange.stilling()`, `UtstyrSpill.leggTil/nyttVåpen`, `OverlevSpill.har(evne)`,
`KarakterSpill.iLeiren/harVann/vis`.

## Endringer i filer pakka eier
`bevegelse.js` (ligg, faktor, ikkeLøp, stup/landet), `gange.js` (Z, Huk-knappen blar, flytt, stilling), `spillet-visning.js`
(bare kampdelen: skyt/slåttUt/kampSteg – seks små kroker), `karakter.js` (rasjon-feilen, KARAKTERARK, tekst), `utstyr.js`
(del/selges, sekkKnapp, startsekk med rasjoner), `overlev.js` (ÅPNER, har, Pakkesel i kg()), `leting-visning.js` (to kroker).
Tester oppdatert: `test_overlev.js` (styrke 10 = 30 kg), `test_utstyr.js` (startvekt).

## Fellesfiler endret
Bare `site/dovre-fliser/index.html`: to skript-tagger rett før `spill/meny.js` (+ versjonsmerkene fra `versjon.py`).

## Ikke gjort / svakheter
- Hunden er en enkel kloss-figur uten gange-animasjon; den trenger ikke mat og kan ikke skades.
- Veggdekningen bruker hindringene i 3D (hus og trestammer) – terreng (en bakketopp) teller ikke.
- Sløret gjelder bare 2D (ikke 3D eller minikartet), og det skjuler ingenting (det demper bare). Det dekker 128 × 128 km rundt
  leiren; utenfor er alt «uoppdaget».
- Historiens kapitler er korte (tre per bakgrunn), og teksten er Claudes.
- narhud.js (pakka «ui») viser ikke skadene; de står som lapper i raden til venstre.

## Runde 2 (etter sammenfletting med claude/nattfiks)
- **Ekte hus på /rogaland** (leir 15607, 6622779, dev.py): fem bygg gått inn i og gjennomsøkt – delene kom i sekken og i funnteksten,
  «Trent øye» sto på leteknappen («trolig trevirke og diesel», «ser tomt ut»), huset ble sikret, lageret tok imot og ga tilbake
  ammunisjon og et våpen, søvnen spolte klokka og satte farten tilbake, og «slått ut 120 m unna» satte meg på gulvet inne i
  tilflukten. RETTET: uten interiør lastet er huset en massiv kloss – `slåttUt` bygger nå interiøret straks (Interior3d.oppdater)
  og flytter deg til et fritt sted på gulvet. Ingen av de fem husene hadde hund (5 % sjanse), så hund-i-hus er ikke sett i ekte hus.
- **Søvn og klokka:** se over. På en treg maskin rekker ikke spolingen seks timer; etter 45 s regnes natta som ferdig likevel.
- **Koblinger:** kulde – under −8 °C der du står (værets temperatur, −0,6 °C per 100 m over leiren, som i verden.js) er sjansen for
  å bli syk tre ganger så stor, uansett årstid. Jakt – `EventyrSpill.felteDyr(rasjoner, navn, avst)` kalles fra verden-visning.js:
  lenger enn 500 m fra leiren legges kjøttet i sekken (det som får plass; resten blir liggende), nærmere går alt til leiren som før.
  Sniking – mørket hentes fra NATT.mørke (3D) eller Krig.natt (klokka); fiender med nattsikt (`e.nattsikt` / `e.utstyr.nattsikt`,
  f.eks. røvere som ventet på mørket) ser deg som om det var dag.
- **Raden til venstre** har en fast linje «Flaske 3/4 · rasjoner 2», og lapper for skader og hund. Sett på bilde på PC 1280 og
  telefon 390: ligger ikke oppå minikart, våpenrute, styrespak eller Huk/Hopp.
- **Fellesfil/andres fil endret i runde 2:** `spill/verden-visning.js` (pakka «verden»), én linje i jaktløkka: spør
  `EventyrSpill.felteDyr` før kjøttet legges i leiren.
- Ikke gjort: fanger og brann er ikke koblet til karakteren; soving er ikke prøvd mens et angrep faktisk starter (bare koden for vekking).
