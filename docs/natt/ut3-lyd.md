# ut3 – lyd i 2D (fase Ø4, plan-selskap-okonomi.md kap. 15 punkt 5)

Gren `claude/ut3-lyd`. Alt laget i koden med Web Audio (ingen lydfiler), dempet og rolig.

## Filer
- `site/dovre-fliser/spill/lyd2d.js` (NY) – reglene øverst uten DOM (`Lyd2d.*`, Node: `require`), visningen nederst.
- `site/dovre-fliser/spill/lyd.js` (endret) – hovedkanal: `hoved` (☰ «Lyd» av/på, stille i skjult fane) -> høyttaler; `ut` = 3D-lydene
  (av i 2D, som før) -> hoved; måleren (`Lyd.sjekk().rms`) sitter nå på hoved. Nytt: `Lyd.motor()` ({ ac, hoved, støy, brun } eller
  null før første trykk) og `Lyd.på()`. 3D-lydene er uendret.
- `site/dovre-fliser/index.html` – én linje: `<script src="/dovre-fliser/spill/lyd2d.js?v=…">` rett etter lyd.js (versjon.py kjørt).
- `pipeline/fliser/test_lyd2d.js` (NY, 49 sjekker), `pipeline/fliser/vakter/ut3-lyd.js` (NY).
- `docs/natt/ut3-lyd-hjelp.json` – to hjelpeemner («Vær, lyd og bilde»).

## Hva som gir lyd (hendelsene)
| Lyd | Hendelse | Kanal |
|---|---|---|
| radio (sprak + pip) | `logg(tekst)` der teksten begynner med navnet på et av dine lag (side blå, ikke AI, ikke karakteren), fulgt av mellomrom/kolon/komma | meldinger |
| ordre (to pip + kort sprak) | loggteksten «<lag>: planlegger rute …» (det `ordre()` skriver), «… kjører til/mot …» | meldinger |
| stille (sus) | «<lag>: ingen radiokontakt …» (kontrollrom-visning.js) | meldinger |
| alarm (to toner × 3, ca. 2,6 s) | `riksbrudd-hendelse` med `type: 'alarm'` (røverbølgen/forsvaret, eskaleringen, garnisonen, flyt) | meldinger |
| kasse | `OppstartSpill.gi`/`betal` – kassa økte minst 20 000 kr i ett kall (kontrakt levert, avtaler, salg) | meldinger |
| klunk | kassa sank minst 250 000 kr i ett kall (bygg, kjøp) – lønn/vedlikehold hver time er mindre | meldinger |
| telefon (gammel ringeklokke, to ring) | `#storliakort` legges i body (selskapspanel.js), `riksbrudd-by-ber`, og NY hendelse `riksbrudd-telefon` ({ detail: { tekst } }) for investorer/firmaer senere | meldinger |
| torden langt unna | `VAER.torden > 0,2` i 2D, høyst hvert 25.–75. s | kart |
| vind og regn (vedvarende) | `VAER.vind.fart`, `VAER.regn`, `VAER.snø`; bare i 2D (i 3D tar lyd.js over) | kart |
| sag, aggregat, fyrkjele (vedvarende) | `ProduksjonSpill.siste().status[id].går` (sag, kjele), `LeirSpill.siste().agg > 0` (aggregat); bare når kartet er zoomet inn på leiren | kart |

Innpakning: `window.logg` pakkes inn én gang ved lasting (flaggene kopieres, `ny.lyd = true`). `OppstartSpill.gi/betal` pakkes inn
SYNKRONT på første `riksbrudd-spill` – altså innenfor dagboka i penger-visning.js (den pakker inn etter setTimeout og leser kallstakken
etter kallet; lå lydens innpakning ytterst, ville alle poster blitt «annet»). Kontrollert: `OppstartSpill.gi.dagbok === true` ytterst.

## Regler (alle tall er Claudes forslag, i `Lyd2d.REGLER`)
- Minste tid mellom like lyder (s): radio 2,5, ordre 1,2, sus 5, alarm 75, kasse 5, klunk 4, telefon 25, torden 25.
- Radiomelding innen 3 s etter en ordre høres ikke (svaret «marsj 3 km …»).
- Høyst 10 radio-/ordre-/pengelyder per minutt til sammen. Alarmen høyst 3 ganger på 15 min (aldri i loop).
- Penger: kasse fra 20 000 kr inn, klunk fra 250 000 kr ut.
- Trinn: Av 0, Lav 0,4, Middels 0,7, Høy 1. Standard: Kartlyd Lav, Meldingslyd Middels.
- Maskiner: fullt ved kam.m ≤ 1,5, borte ved ≥ 5; leiren nær skjermens midte (avstand/lengste side: fullt < 0,3, borte > 0,8).
- Funksjoner: `lagIMelding`, `meldingLyd`, `pengeLyd`, `tillat`, `maskinNær`, `maskiner`, `bakgrunn`, `nesteTrinn`, `gyldigTrinn`.

## ☰ og lagring
- «Kartlyd: Lav» og «Meldingslyd: Middels» (id `lyd-kart`, `lyd-meld`) legges i `#lagmeny` fra lyd2d.js, som lastes FØR meny.js
  (ingen ring). For at de skal stå i «Bilde og lyd» rett etter «Lyd» og ikke under «Annet», legger lyd2d.js ved DOMContentLoaded
  navnene inn i `Meny.GRUPPER` (det eksporterte arrayet) og kaller `Meny.ordne()` én gang. meny.js er IKKE endret.
  **Ved fletting:** legg gjerne `'Kartlyd', 'Meldingslyd'` etter `'Lyd'` i GRUPPER i meny.js – koden hopper da over sitt eget innlegg.
- Valgene i localStorage «riksbrudd-lydnivå» = { kart, meld } (en innstilling, ikke per leir). «riksbrudd-lyd» (av/på) som før.
- Trykk på Meldingslyd spiller en prøvelyd (radio).

## For vakter og testing
- `Lyd2d.sjekk()` → { startet, på, valg, kanaler { kart, meld, vedvarende }, nivå { bakgrunn, maskiner, nær, lyd (forsterkningene) },
  siste: [{ navn, t, spilt, grunn, hva }] (12 siste), teller, knapper }.
- `Lyd2d.hør(navn, { tving, hva })`, `Lyd2d.måle(navn, sek)` (OfflineAudioContext → { rms, topp }), `Lyd2d.steg()`, `Lyd2d.velg(hva, trinn)`,
  `Lyd2d.nullstill()` (glemmer når lydene sist gikk), `Lyd2d.test = { maskiner: { sag, kjele } }` (lat som maskiner går).
- Lydene føres alltid (også uten AudioContext/før første trykk – da `spilt: false`, grunn «lyden er ikke startet»). Lyden endrer aldri
  spillet, så ingenting er slått av for webdriver.

## Prøvd
- `node pipeline/fliser/test_lyd2d.js` (alle ok), `node pipeline/fliser/test_lyd.js` (ok).
- Nettleser PC 1400 × 860 og mobil 390 × 844: alle hendelser gir riktig lyd, ingen sidefeil; ekte `ordre()` gir ordrelyd og svaret holdes
  igjen; ekte sagbruk + fyrkjele (oppsett som ut2-sagbruk-vakta, sim) høres zoomet inn (rms 0,007 ved Lav) og ikke zoomet ut (0,0007 = bare
  vind); 3D: lyd.js som før (9 kanaler, vind 0,31), 2D-bakgrunn 0 i 3D, vakta går også i 3D og setter 3D tilbake.
- Vakta: ca. 2–5 s; feil lagt inn med vilje (alarm-typen feil) → vakta melder «alarmen kom ikke».
- Bilder: scratchpad natt/ut3-lyd/meny.png, meny-mob.png, leir2d.png.

## Ikke gjort / merknader
- Vakta prøver kasse/klunk med `betal` + `gi` av samme beløp: kassa er lik etterpå, men dagboka (PengerSpill) har to poster «annet».
- Maskinene høres ikke i 3D (der står 3D-lydene). Ingen egen lyd for vedkløyver.
- Ingen motorlyd for kjøretøy i 2D, ingen lyd for skudd/kamp i 2D (ikke i oppdraget).
- Investor-/firmatelefon: bare hendelsen `riksbrudd-telefon` – modulene i Ø5/Ø7 må sende den.
- Lydnivåene er stilt etter målinger i testmaskinen, ikke hørt på ekte høyttalere.
