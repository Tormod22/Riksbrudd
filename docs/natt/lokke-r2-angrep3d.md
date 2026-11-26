# Kritikerløkka runde 2 – pakke «angrep3d» (26. nov)

Anmeldelsene: docs/kritikk/2026-11-26-r2-ingrid-saether.md og -jonas-bakke.md. Alle tall under er Claudes forslag.

## 1. Forsvaret vender mot kanten røverne faktisk kommer fra
- Årsak: `sistV` i forsvar-visning.js startet på π/2 (= nord). «Forsvar leiren» før røverne hadde dratt ut (morgenmøtet) satte derfor
  lagene «mot nord». Etter at de dro ut, brukte retningen startstedet (`e.fra`), men ruta (veger/daler) kunne komme inn fra en helt annen
  kant – derfor «varslet fra vest, sett 1,6 km sør».
- `Forsvar.innfart(sti, leir, fra, radius)` (forsvar.js): første punkt på ruta innenfor `INNFART.radius` = 800 m av leiren.
  `retningMotFienden()` bruker den for røvere ingen ser (ellers startstedet), og varselet i loggen (spillet-visning.js `angrep()`) sier
  samme kant (snittet av lagenes innfart; `e.innfart` lagres på laget).
- Ukjent kant (ingen røvere ennå): `Forsvar.stillinger(leir, NaN, n)` gir en ring rundt leiren, loggen sier «går i stilling rundt
  leiren (kanten er ukjent til røverne drar ut)». Tekster med kant bruker `retn(v)` («ukjent kant» når v ikke er et tall).
- Forsvaret snur (`snuForsvar`, `SNU` = 60°, 350 m, høyst 3 ganger per angrep, 10 spillminutter mellom): viser ruta eller vaktene at
  kanten er en annen enn stillingene vender mot, og ingen er i ildkamp, settes forsvaret på nytt med en linje i loggen. Leirvakta som
  alt står, flyttes også. Bare `auto()` (ikke i testene).
- `Forsvar.ulik(a, b, grense)`: to retninger skiller seg.

## 2. Ingen ankomsttid i ildkamp
- `Forsvar.settTekst({ avstand, strid, venter, min, hvem })`: i ildkamp «750 m unna · i ildkamp med Vaktlaget», ellers som før.
  `ForsvarSpill.status()` bruker den.

## 3. Røverne varierer (spillet.js + spillet-visning.js)
- `Trussel.PLAN`, `PLANER`, `PLAN_TEKST`, `velgPlan(nr, r, time, sist)`, `omveiPunkt`, `speiderStart`. Bølge 1 er alltid «rett»; ellers
  aldri samme plan to ganger på rad (`T.sistPlan` i «riksbrudd-trussel»); «tyver» bare kl. 22–05.
  - omvei: via et punkt 1,2 km fra leiren, ca. 80° (± 14°) til siden for startstedet (`e.omvei`; en sim-krok sender laget videre når det
    er innen 120 m av punktet, eller står stille innen 400 m).
  - speider: et ekstra lag på 3 mann fra en annen kant (ca. 90° ± 17°), 2,0–2,6 km unna (`e.prøver`) – flykter ved første tap (Trussel.brutt).
  - tyver: går mot lagerteltet/containeren, herjer bare 35 min (`Trussel.herjet` med `q.tyv`), tar ikke penger (`trekkUt`).
- Bare når `auto()` (ikke i testene). `e.omvei`/`e.tyv` lagres ikke i trussel-lagring.js (ikke min fil): etter omlasting oppfører
  laget seg som «rett» (lag som står stille langt ute, sendes mot leiren av den gamle regelen).
- Krigshjelperens `K.røverVariant` (krig.js, ikke min) kan i tillegg gi «fra to kanter» når speiderlaget gjør bølgen til to lag – det
  speilvender da speiderlaget. Det er greit, men verdt å vite.

## 4. 3D: telt og vegger
- Teltet: kunne IKKE gjenskapes – teltene ligger i `R3.hindre` (byggeplass3d.js `lagLeir`) og stopper kroppen (prøvd i nettleser fra fem
  kanter, 12 s gange/løp: kroppen stoppet 0,66–0,7 m fra teltduken). Bildet 29b viser trolig kameraet rett ved teltet.
- Kameraet i veggen: dørtrekket i gange.js (`dørTrekk`, trekker deg langs veggen mot døra) prøvde bare midtpunktet – med Interior-veggenes
  halve tykkelse på 0,12 m kunne hodet komme ca. 0,13 m fra veggen, innenfor kameraets near-plan (0,2 m). Nå prøves hele kroppen
  (`Bevegelse.fri`). bevegelse.js prøver kroppen i åtte retninger (før fire) og deler flyttingen i småsteg på høyst 8 cm (høyst 12 per
  steg). gange.js setter near-plan 0,05 m når en vegg er innen 0,7 m (`NÆR`), ellers 0,2 m som før.

## 5. Leirens lys om natta (natt3d.js, «LEIRLYS»)
- Additive glødpunkter (ingen nye lys): bålet (30 m glød + 56 m lysflekk på bakken), en lykt ved hvert telt, vinduslys i hvert ferdige
  bygg, lykt i vakttårn – og de samme punktene i fast skjermstørrelse (6–13 px), så leiren synes som varme prikker fra høyt oppe.
  Fram med mørket (`trinn(.3, .7, NATT.mørke)`, som gatelysene), flakker litt. Lages på nytt når leirens bygg eller teltene endres
  (sjekkes hvert 2. s i ramme3d). `NATT.leirLys` = antall punkter, `R3.leirLys` = objektene.

## 6. Ustabile vakter
- granater.js: `{"und":0}` kom når a sin første salve (to maskingevær + granater på 40 m) tilfeldig såret begge b sine maskingeværskyttere –
  da holdt ingen a nede. Spillet er riktig; vakta måler nå laget som faktisk holdes nede (b, ellers a).
- ga.js (telefon): på programvare-grafikk tar ett bilde flere sekunder. «Gå inn i huset» ventet høyst 10 s på kartet og 2,4 s på
  interiøret; vakta ga opp, og ventingen som sto igjen i Gange (venterUt) startet gangen igjen midt i de neste prøvene – derav «Esc lukket
  ikke valget» og reisen som «venter» med 600×. Nå ventes det etter tida (45 s kart, 20 s inn, 45 s reise), og `Gange.lukkValg()` rydder
  ventingen før valget.

## Vakt
pipeline/fliser/vakter/lokke-r2-angrep3d.js – ring før angrepet, kanten fra ruta (sør, selvtest uten rute = vest), ildkamp-teksten,
kroppen mot en tynn vegg, leirens lys i 3D.

## Ikke gjort
- Lagring av plan-flaggene på røverlagene (trussel-lagring.js er ikke min).
- Lyskaster i vakttårnet som kjegle (bare et glødpunkt).

## Etter beskjed fra koordinatoren
- forsvar-oppgjor.js `folkTekst`: «forlot gjengen» bare for så mange som folk.js telte som gått på lav moral (`borte`); de andre
  «er ikke lenger i leiren» (grunnen er ukjent der). Test i test_forsvar_oppgjor.js.
- gange.js `startValg`: et nytt valg rydder ventingen på kartet fra et tidligere «Gå inn i huset» / «Reis hit» (ellers startet gangen
  av seg selv midt i det nye valget – samme årsak som i ga-vakta).

## Prøvd
- ga.js på telefon 3 av 3 grønne (før: feilet av og til), og 1 på PC; granater.js på PC 4 av 4; lokke-r2-angrep3d.js på PC og telefon.
- Bilder: scratchpad lokke/r2/angrep3d/natt-pc-natt-luft.png og natt-mob-natt-luft.png (bålet og teltlyktene fra lufta om natta).
