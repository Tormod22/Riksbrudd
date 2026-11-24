# R19-2 – Lys gjennom skyene, byger og dis (24. nov)

Brukerens bilder fra en fjelltur: solstråler fra skyhull ned over dalen, snø- og regnbyger som grå slør som driver over
landskapet, blå dis på åser i lag bak hverandre (docs/plan-landskap.md punkt 2 og 3). Gren `claude/r19-lys`.

## Filer
- `site/dovre-fliser/spill/luft.js` – regler uten DOM (test: `node pipeline/fliser/test_luft.js`, 38 sjekker).
  `Luft.striper(V, e)`, `Luft.bygeMengde(V)`, `Luft.felt(...)` (faste punkter i et rutenett som driver med skyene og kommer
  og går over spilltiden – ingen Math.random), `Luft.byger`, `Luft.stråler`, `Luft.her(byger, x, y)`, `Luft.type(moh, snøgrense,
  årstid)`, `Luft.drift(fart, retning, dt)`, `Luft.dis(V, dag, sky, horisont)`, `Luft.disStart`, `Luft.disAndel`. Alle tall i `REGLER`.
- `site/dovre-fliser/spill/luft3d.js` – visningen (lastes rett etter spill/lys3d.js). `window.Luft3d` (`init`, `sjekk()`,
  `bygeOver(X, Y)`, `test`), `window.BYGE` = `{ regn, snø, mengde, type }` (nedbøren fra en byge over kameraet).
- `pipeline/fliser/vakter/luft.js` – vakta «lys og byger».
- `docs/natt/luft-hjelp.json` – to hjelpeemner.

## Hvordan
1. **Lysstriper**: høyst 18 (PC) / 10 (mobil) flater med additiv blanding. Hver flate går fra bakken opp langs retningen mot sola
   til skybasen (1500 m i scenen, som skylaget i natt3d.js), dreier om stråleaksen mot kameraet, er bredest nede og myk på tvers.
   Sterkest når du ser mot sola (fram-spredning), svake fra siden. Bare i delvis skyet vær (sky 0,22–0,95) og med sola 1–42° oppe;
   ikke i tåke. Ett tegnekall. Ingen på Lav grafikk.
2. **Byger**: høyst 10 (PC) / 6 (mobil) / 4 (Lav) loddrette slør fra skybasen og ned under bakken (terrenget skjuler resten),
   som dreier mot kameraet, holder seg nederst litt med vinden, har folder og striper (regn) og tones ut i disen. Snø (hvit) når
   bakken under bygen ligger over snøgrensen − 250 m eller det er vinter, ellers regn (grå). De driver med 2 × vindfarten i
   spilltid (samme fart som skyskyggene) og vokser fram og regner ut over ca. 75 spillminutter. Ingen i klart vær og i tåke; færre
   når det alt regner overalt. **Treffer deg**: `Luft.her` gir hvor mye av en byge som står over kameraet → `window.BYGE` →
   `spill/vaer-visning.js` viser regnet/snøen rundt kameraet (maks av været og bygen), sikten (tåkas ytterkant) kortes inn med
   inntil 55 %, sola dempes med inntil 60 % og himmelen blir grå. Loggen: «En regnbyge driver inn over deg.» (høyst hvert 20. spillminutt).
   Med vind 6 m/s driver en byge over et fast sted ca. hver 40. spillminutt (test_luft.js).
3. **Dis i lag**: three.js sin tåke (`THREE.ShaderChunk.fog_*`, som spill/lys3d.js gjør) får først et blått luftperspektiv:
   `k · (1 − e^(−(d − start)/11 km))`, tettest nede i dalene (55–100 % etter høyden). Begynner 1,3 km ute når du går, og ved 0,9 ×
   kameraavstanden fra lufta (bakken midt i bildet er klar). Styrken 0,62 i klart vær om dagen, mindre med skydekke, om natta og i
   tåke (der tar tåka over). Fargen: horisontfargen blandet 70 % mot blått. Gjelder alt som har tåke (terreng, fjernringen, trær, hus).
   Uniformene er tallrekker som alle materialer deler (`uLuftF`, `uLuftL`).

## Endret i felles filer
- `site/dovre-fliser/index.html`: `init3d` kaller `Luft3d.init(R3)` rett etter `Lys3d.init(R3)`; skript-taggene for luft.js og
  luft3d.js rett etter lys3d.js.
- `site/dovre-fliser/spill/vaer-visning.js` (ramme3d): regnet/snøen rundt kameraet bruker `max(V.regn, BYGE.regn)` og
  `max(V.snø, BYGE.snø)`.

## Ytelse (programvare-grafikk, 1400 × 820, Dovre-testsiden, Høy, skyet kl. 19:30, utsikt mot sola)
Tegnetid målt med `renderer.render` + `readPixels`, fire runder à tre bilder, median: uten endringene (git stash) ca. 700 ms
(640–750), med alt på ca. 690 ms (630–690); i samme økt med byger/striper/dis av ca. 655 ms. Forskjellen er innenfor støyen
(under ca. 5 %). Regnearbeidet per bilde er noen titalls punkter i et rutenett (under 0,1 ms).

## I testene
`navigator.webdriver`: ingen byger og striper før `Luft3d.test = true` (vakta slår det på og av). Disen er med.

## Ikke gjort
- Stripene og bygene er ikke koblet til de faktiske hullene i skylaget (skylaget i natt3d.js er en skyggelegger); de har sitt eget
  rutenett som driver like fort som skyene.
- Lyden (spill/lyd.js) hører ikke regnet fra en byge (den leser bare været).
- Inne i en byge blir himmelkuppelen grå, men skylaget på Høy/Middels (KVAL.fx.skyer) blir ikke mørkere.
- Bygene påvirker ikke lagenes sikt i reglene (bare 3D-bildet).
