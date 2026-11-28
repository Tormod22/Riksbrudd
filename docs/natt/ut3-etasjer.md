# ut3-etasjer – du kan bruke alle etasjene (fase B2)

28. nov, utbyggingen av docs/plan-selskap-okonomi.md, kapittel 5.3, 5.8, 5.9 og fasetabellen B2 i kapittel 16. Gren `claude/ut3-etasjer`.
Bygger på ut1-bygning (modellen, spill/bygning.js) og ut2-hus2d (plantegningen, spill/plantegning-visning.js).

## Hva spilleren ser
**2D (alt kan spilles i kartet):**
- Etasjevelgeren #plan2d har en linje til: «Du er i 2. etasje» / «Karakteren er ikke i huset» og knappene
  «Gå til 2. etasje» / «Gå hit (opp trappa)», «Let gjennom 2. etasje», «Hent det som ligger igjen» og «Bruk kjelleren som tilflukt».
- Huspanelet (trykk på et hus) har «Etasjer: Kjeller · 2 · 3 · Loft» (bare når modellen har flere etasjer; stengte er grå).
- Karakteren går til huset (Spill2D.gåTil, som før), og så langs veien inne i huset: rutenett i hver etasje rundt vegger, møbler og
  trapphull, og trappene mellom etasjene (Etasjer.vei). Plantegningen bytter etasje når karakteren går i trappa, og figuren får
  en lapp «2. etg.», «Loft» eller «Kjeller». Gir du karakteren en ny ordre, stopper gangen i huset.
- Letingen gjelder etasjen du står i: 1. etasje som før (leting-visning.js, samme funn som før). Andre etasjer har eget funn
  (Etasjer.funn); «Let gjennom huset» i huspanelet leter i etasjen karakteren står i (spill2d.js). Det som ikke får plass i leiren,
  ligger igjen og kan hentes («Hent det som ligger igjen»).
- Kjeller i store bygg (≥ 80 m² grunnflate) og alle tilfluktsrom kan brukes som tilfluktssted uten planker (OverlevSpill sin liste,
  med `kjeller: true`); «Hvil her» / «Sov her» virker da som for sikrede hus.

**3D:**
- Når du går inn i et hus med flere etasjer, bygges de andre etasjene (i biter, 6 ms per bilde): gulv med trapphull, innsiden av
  ytterveggene med vinduene som hull, skillevegger med døråpninger, himling med hull og «sjakt» opp til etasjen over, møbler
  (Interior3d.deler; egne kasser for flyttekasser, kister, skrot, fyrkjele, tønner), trapper med trinn, stolper og håndlist,
  stiger, loft med skråtak (to flater delt langs mønet, sperrer hver 0,6 m) og gavlvegger som følger taket, kjeller under bakken,
  og i stengte høyhusetasjer en sperret dør med planker ved trappa («… trapperommet er sperret» i loggen).
- Du går opp og ned trappene med de vanlige bevegelsesreglene (Bevegelse.steg). Du kommer bare inn på trappa fra den enden som
  hører til etasjen du står i; midt i trappa skifter etasjen. Gelender langs sidene, trapphullet i etasjen over sperrer.
- Bare etasjen du står i og den under (du ser ned trappa) vises; etasjen over vises mens du går i trappa. Interiøret i 1. etasje
  (interior3d.js) skjules når du er i 3. etasje eller høyere.
- Knappen «Let gjennom 2. etasje» kommer i #inneknapper når du står i en annen etasje enn 1. (samme kommando som i 2D);
  «Let gjennom huset» skjules da (den gjelder 1. etasje).

## Filer
- `site/dovre-fliser/spill/etasjer.js` – NY. Regler uten DOM (Node: `require('./etasjer')`, nettleser: `window.Etasjer`).
- `site/dovre-fliser/spill/etasjer-visning.js` – NY. 2D (`window.Etasjer2D`).
- `site/dovre-fliser/spill/etasjer3d.js` – NY. 3D (`window.Etasjer3d`).
- `pipeline/fliser/test_etasjer.js` – NY (ca. 48 000 sjekker på 70 prøvehus med flere etasjer, ca. 8 s; `RASK=1` ca. 1 s).
- `pipeline/fliser/vakter/ut3-etasjer.js` – NY vakt. `docs/natt/ut3-etasjer-hjelp.json` – hjelpetekst.

## Fellesfiler endret (små, samlede endringer)
- `site/dovre-fliser/index.html`: **tre linjer** rett etter `spill/interior3d.js`: `spill/etasjer.js`, `spill/etasjer-visning.js`,
  `spill/etasjer3d.js` (+ versjon.py).
- `site/dovre-fliser/spill/plantegning-visning.js` (hjelperen B3 «riving» endrer også denne): **to steder**, ingenting annet:
  1. i `visVelger()`, rett etter linja `} else html += \`<div class="rad"><small>${esc(et ? et.navn …` :
     `for (const f of window.PLAN2D_RAD || []) { try { html += f(h, n) || ''; } catch (e) { console.warn('plantegning:', e); } }` (+ kommentar);
  2. i klikklytteren på velgeren, før `if (b.dataset.n !== undefined)`: en ny gren
     `if (b.dataset.et !== undefined) { for (const f of window.PLAN2D_KLIKK || []) try { f(b.dataset.et); } catch (e) { … } } else …`.
  Uten etasjer-visning.js er velgeren som før.
- `site/dovre-fliser/spill/interior3d.js` (fire steder): (1) i `byggG` rett etter `yield 'plan';`:
  `if (window.Etasjer3d && !P.leir) { const sv = yield* Etasjer3d.modellG(R, u, P); if (sv) Etasjer3d.tilpass(pl, P, u, sv); }`;
  (2) gulvet per rom deles rundt trapphull (`pl.hullUV.gulv`, Etasjer.hull); (3) himlingen deles rundt trapphull (`pl.hullUV.tak`);
  (4) `høyde()` og `påTrapp()` spør `Etasjer3d.høyde/påTrapp` først.
- `site/dovre-fliser/spill/interior.js`: `blokkert(pl, x, y)` – første linje: `if (pl.over) { const v = pl.over(x, y); if (v !== undefined) return v; }`
  (etasjer3d.js setter `pl.over` mens du er i et hus med flere etasjer; undefined = som før).
- `site/dovre-fliser/spill/leting-visning.js`: i `ramme()`, etter `const P = klar ? her : null;`: i en annen etasje enn 1. skjules
  «Let gjennom huset» (`Etasjer3d.etasje(P) !== 1`).
- `site/dovre-fliser/spill/spill2d.js`: i `let2d()`: står karakteren i en annen etasje i huset, går letingen til `Etasjer2D.let2d`.
- gange.js og bevegelse.js er IKKE endret (høyden og trappene går gjennom Interior3d.høyde/påTrapp som før).

## Slik virker det
- **Samme modell i 2D og 3D:** etasjer3d bruker Plantegning2D sitt hus (`nyttHus` med omrisset i kartets meter, `modell` + endringsloggen),
  så id-ene i loggen (barrikader nå, riving i B3) peker på de samme delene. Modellen lages i biter inne i interiørets bygging
  (`modellG` = Bygning.fraKartG med yield). Haller (industri, lager, låve, kirke, hangar, terminal) får ingen modell.
- **1. etasje (punkt 3):** Bygning lager 1. etasje av den samme planen som interiøret (Interior.plan). `tilpass` sammenligner møblene
  (nr. k på samme sted): er planene like, tas bare møblene trappene har tatt bort i modellen, bort også i 3D (P.etasjer.fjernet). Er de
  ulike (bygård med trapperom, sykehjem, eller små forskjeller i det kartet vet – prøvehuset 14 × 9 m var ulikt), lages rom, skillevegger,
  døråpninger og møbler i interiøret av modellens 1. etasje (`planFra`, P.etasjer.fraModell) – inngangene, omrisset og ytterveggene
  står som før. Da er 1. etasje lik i 2D og 3D. Trapphullene skjæres ut av himling og gulv.
- **Høyden:** `Etasjer.stå(m, n, x, y)` – på trappa interpoleres høyden (0 ved foten, 1 på toppen); fra etasjen under kommer du bare
  inn fra foten (k ≤ 0,62), fra etasjen over bare fra toppen (k ≥ 0,38); etasjen skifter ved 0,5. Etasjer3d holder etasjen du står i
  (oppdatert hver ramme fra kroppen) og deler den med 2D (`Etasjer2D.S`).
- **Kollisjon:** `Etasjer.blokkert(m, n, x, y)`: yttervegger uten dører, skillevegger utenom døråpningene, møbler som sperrer,
  gelender og trapphull, loft der skråtaket er under 1,1 m, stengt etasje utenfor reposet (1,6 m fra trappa). I 1. etasje bare trappene.
- **Åpning der trappa møter en vegg:** byggemodellen legger av og til toppen/foten av trappa tett inntil – eller på andre siden av – en
  skillevegg (repos 0,25 m fra veggen; test_etasjer.js teller 6 av 190 veier etter rettingen, 15 før). Da får veggen en åpning i trappas
  bredde der trappa møter den (`Etasjer.trappÅpninger`, korridor 0,75 m ut fra enden), både i kollisjonen og i 3D-tegningen.
  Plantegningen i 2D tegner IKKE den åpningen (den tegner modellen) – B3 eller bygning.js bør rette selve trappeplasseringen.

## Tall (Claudes forslag – Etasjer.REGLER)
Funn per 100 m² – loft: tomt 15 %, tre 80 % 0,6–2,5 m³, stål 45 % 0,1–0,6 t, mat 35 % 1–5, penger 20 % 2–20 000 kr, diesel 10 % 5–20 l;
kjeller: tomt 20 %, mat 75 % 3–12, tre 50 % 0,4–1,8, diesel 35 % 10–40 l, stål 15 %; tilfluktsrom: tomt 10 %, mat 90 % 10–30, diesel 40 %
20–60 l, tre 30 %; andre etasjer: som huset ellers (Leting.KLASSER) med eget frø × 0,8, ingen overlevende. Skrot: +12 % per flyttekasse/
kiste/skrot/hylle/tønne, høyst × 1,8. Tilflukt: kjeller fra 80 m². Gange i huset 1,3 m/s, høyst 12 s. Trapp: bytte 0,5, luft 0,12,
gelender 0,12 m, korridor 0,75 m. Vegg 0,18 m + halv tykkelse, loft 1,1 m, repos i stengt etasje 1,6 m, rutenett 0,25 m. 3D: 6 ms per bilde,
etasjene kastes 25 m fra huset.

## Lagring
localStorage **«riksbrudd-etasjer»** = `{ v: 1, leir: 'x,y', lett: { 'hus:etasje': 1 | { tre, betong, stål, diesel } (det som ligger igjen) } }` – per leir
(leses bare når leiren stemmer). 1. etasje bruker «riksbrudd-leting» som før. Tilflukt i kjeller: OverlevSpill sin liste («riksbrudd-tilflukt»).
Kommandoene: `etasjeLet` { hus, n, hent? } og `etasjeTilflukt` { hus } (Kommando.registrer første gang de brukes).

## API
- `Etasjer`: REGLER, etasje, navn, slag, nøkkel, funn, tilflukt, sperret, påTrapp, trappHøyde, trapperVed, stå, trappSperrer, blokkert, rute,
  korridor, iKorridor, trappÅpninger, vei, lengde, hull, trappUV, loftHøyde, lokal, areal, står.
- `Etasjer2D`: S { hus, n, p, gang, leter }, gåTil(h, n, ferdig), let2d(h, n, hent), etasjeI(h), husAv(i), modell(h), kjør(k), erLett, rest,
  husKnapper, spol(), nullstill().
- `Etasjer3d`: modellG, tilpass, høyde, påTrapp, sperrer, aktiv(), etasje(P), ferdig(), nett(), kast(), steg(), sett(n), STAT, BIT.

## Prøvd
- Node: test_etasjer.js (0 feil), test_interior.js, test_spill2d.js.
- Nettleser (Dovre-testsiden, prøvehus leilighetsbygg 14 × 9 m, 13 m: kjeller, 1–3, loft): 2D på PC – karakteren gikk til huset og opp
  til 2. etasje (bilde: plantegningen i 2. etasje, figuren ved toppen av trappa, velgeren «Du er i 2. etasje · Let gjennom 2. etasje»), leting
  der. Vakta: 2D ok på PC og telefon; 3D ok (opp trappa til 3,07 m = 2. etasjes z, etasjen over skjult, ytterveggen stopper deg, ned igjen).
  Se rapporten for bildene i 3D.
- Målt i 3D (vakta, programvare-grafikk, delt maskin): modellen for prøvehuset 170–525 ms i biter (lengste bit 8–150 ms – fra Bygning.fraKartG),
  etasjenettene 20–33 ms i biter, ca. 12 000 trekanter for kjeller + 2 + 3 + loft.

## Ikke gjort / kjent
- **Kostnad for hus du ikke går inn i:** modellen lages for alle hus som får interiør (innen 30 m mens du går, unntatt haller) – det kommer
  i tillegg til interiøret (som tar 160–370 ms i biter). Nettene for de andre etasjene lages bare når du går inn. En snarvei senere:
  la Bygning gi «bare antall etasjer og kjeller» uten planene (B2 hadde ikke tid).
- Lengste bit i Bygning.fraKartG kan være over 100 ms på en treg maskin (trappesøket) – det gir et hakk når et hus får interiør.
- Plantegningen tegner ikke åpningene der trappa møter en vegg (se over), og veien i 2D kan i sjeldne hus gå rett gjennom en vegg
  (1 av 190 i testen: rutenettet fant ingen vei).
- I 3D er etasjene enklere enn 1. etasje: hjørnefarger uten mønstre, ingen lamper, gardiner, dørblader eller bilder.
- Skap/beholdere (LutSpill) og «Plukk opp» i de andre etasjene finnes ikke (bare i 1. etasje); står du i 2. etasje, kan E fortsatt nå
  skap i 1. etasje rett under deg.
- Leirens egne bygg og byggesettets hus har ingen etasjer her.
- Kamp, siktlinjer og vinduer i høyere etasjer har ingen virkning ennå (B3/5.7).
