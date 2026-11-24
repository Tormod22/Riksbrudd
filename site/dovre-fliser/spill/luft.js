'use strict';
// LYS GJENNOM SKYENE, BYGER OG DIS (R19-2, 24. nov; brukerens bilder fra en fjelltur: solstråler fra skyhull ned over dalen, snø- og
// regnbyger som grå slør som driver over landskapet, blå dis på åser i lag bak hverandre). Regler uten DOM (test: pipeline/fliser/test_luft.js);
// visningen ligger i spill/luft3d.js.
//  - striper(V, e): hvor tydelige lysstripene er (0–1): bare i delvis skyet vær og med sola lavt til middels høyt.
//  - bygeMengde(V): hvor mange byger det er (0–1): i skyet vær og når det regner eller snør av og til; ingen i klart vær og tett tåke.
//  - felt(...): faste punkter i et rutenett som driver med skyene (forskyvningen D i meter), og som kommer og går over spilltiden.
//    Samme sted og samme tid gir samme punkt (ingen Math.random – spill/tilfeldig.js gjelder regler).
//  - her(byger, x, y): hvor mye av en byge som står over punktet (0–1) – når en byge driver over der du står, regner eller snør det.
//  - dis(V, dag, sky): styrken på det blå luftperspektivet (0–1) og fargen det trekker mot.
(function (rot) {
  // Claudes forslag (alle tallene):
  const REGLER = {
    // Lysstriper. sol: grader over horisonten (fra, full, avtar, borte); sky: skydekket (fra, full, avtar, borte); dis: under «borte» ingen
    // (tåke). celle: rutenettets side (m), sjanse: andel av rutene med et skyhull, nær/fjern: avstand fra kameraet (m), bredde (m),
    // levetid: et skyhull varer så mange spillminutter, maks: høyst så mange striper.
    stråle: { sol: [1, 6, 26, 42], sky: [.22, .42, .8, .95], dis: [.3, .6], celle: 1500, sjanse: .3, nær: 700, fjern: 8500, bredde: [140, 480], levetid: 22, maks: 18 },
    // Byger. sky: skydekket der de begynner og der det er flest; dis: under «borte» ingen (tåke). celle (m), sjanse: andel av rutene
    // med en byge når det er flest; radius (m); levetid (spillminutter fra den vokser fram til den har regnet ut); nær/fjern (m);
    // kant: andelen av radien der bygen er full (ytterst tones den ut); maks: høyst så mange; nedbør: når det alt regner/snør overalt
    // er det færre egne byger (ganges med 1 − nedbør · nedbør).
    byge: { sky: [.45, .8], dis: [.18, .4], celle: 4200, sjanse: .55, radius: [700, 1600], levetid: 75, nær: 0, fjern: 15000, kant: .5, maks: 10, nedbør: .7 },
    // Skyene driver med 2 × vindfarten (som skyskyggene i spill/natt3d.js), så stripene og bygene følger skyene.
    fart: 2,
    // Snø i bygen når bakken under den ligger høyere enn snøgrensen minus dette (m), og alltid om vinteren.
    snøMargin: 250,
    // Blå dis (luftperspektiv): styrke i klart vær om dagen; hvor mye skydekket tar bort; disen begynner så langt ute (m) når du går
    // og ganger kameraavstanden fra lufta; lengden (m) den tetner over (1 − e^(−d/L)); fargen den trekker mot i klart vær.
    dis: { styrke: .62, skyTrekk: .5, startGå: 1300, startLuft: .9, lengde: 11000, blå: [.44, .6, .86], blåAndel: .7 },
  };
  const klem = v => Math.max(0, Math.min(1, v)), glatt = (a, b, x) => { const t = klem((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  // fast heltallsblanding (samme tall inn gir samme tall ut), 0 ≤ svar < 1
  function hash(a, b, c, d) {
    let h = Math.imul((a | 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul((b | 0) + 0x632be5ab, 0xc2b2ae35) ^ Math.imul((c | 0) + 0x27d4eb2f, 0x165667b1) ^ Math.imul((d | 0) + 0x1b873593, 0x27d4eb2d);
    h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12; h = Math.imul(h, 0x297a2d39); h ^= h >>> 15;
    return (h >>> 0) / 4294967296;
  }
  // stige fra a til b, flatt, synke fra c til d
  const bue = ([a, b, c, d], x) => glatt(a, b, x) * (1 - glatt(c, d, x));

  // V = { sky, dis, regn, snø, vær }; e = solhøyden i grader
  function striper(V, e) {
    if (!V) return 0; const R = REGLER.stråle;
    return bue(R.sol, e) * bue(R.sky, V.sky || 0) * glatt(R.dis[0], R.dis[1], V.dis == null ? 1 : V.dis) * (1 - .6 * Math.max(V.regn || 0, V.snø || 0));
  }
  function bygeMengde(V) {
    if (!V || V.vær === 'tåke') return 0; const R = REGLER.byge, n = Math.max(V.regn || 0, V.snø || 0);
    return glatt(R.sky[0], R.sky[1], V.sky || 0) * glatt(R.dis[0], R.dis[1], V.dis == null ? 1 : V.dis) * (1 - R.nedbør * n * n);
  }
  // Punkter i et rutenett (side celle) rundt (cx, cy) som driver med D = [dx, dy]. Hver rute kan ha ett punkt i hver «epoke» (levetid
  // spillminutter, forskjøvet per rute); fase 0 → 1 over epoken. sjanse: andel av rutene med et punkt (0–1). Gir [{ x, y, fase, id, r1, r2 }].
  function felt(cx, cy, D, t, { celle, sjanse, levetid, nær, fjern, salt }) {
    const ut = [], fx = cx - D[0], fy = cy - D[1], n = Math.ceil(fjern / celle) + 1, i0 = Math.floor(fx / celle), j0 = Math.floor(fy / celle);
    if (!(sjanse > 0)) return ut;
    for (let j = j0 - n; j <= j0 + n; j++) for (let i = i0 - n; i <= i0 + n; i++) {
      const forsk = hash(i, j, salt, 1) * levetid, ep = Math.floor((t + forsk) / levetid), fase = (t + forsk) / levetid - ep;
      if (hash(i, j, ep, salt) >= sjanse) continue;
      const x = (i + .15 + .7 * hash(i, j, ep, salt + 7)) * celle + D[0], y = (j + .15 + .7 * hash(i, j, ep, salt + 13)) * celle + D[1];
      const d = Math.hypot(x - cx, y - cy); if (d < nær || d > fjern) continue;
      ut.push({ x, y, fase, d, id: i * 73856093 ^ j * 19349663 ^ ep * 83492791, r1: hash(i, j, ep, salt + 21), r2: hash(i, j, ep, salt + 29) });
    }
    return ut;
  }
  // livsløpet til en byge/et skyhull: vokser fram, står, dør ut (0–1)
  const liv = f => glatt(0, .25, f) * (1 - glatt(.7, 1, f));
  // Bygene rundt (cx, cy): [{ x, y, r, a (0–1), id }], de nærmeste først, høyst maks
  function byger(cx, cy, D, t, mengde, maks = REGLER.byge.maks) {
    const R = REGLER.byge; if (!(mengde > .01)) return [];
    const l = felt(cx, cy, D, t, { celle: R.celle, sjanse: R.sjanse * mengde, levetid: R.levetid, nær: R.nær, fjern: R.fjern, salt: 101 })
      .map(p => ({ x: p.x, y: p.y, r: R.radius[0] + (R.radius[1] - R.radius[0]) * p.r1, a: liv(p.fase) * (.6 + .4 * p.r2) * Math.min(1, .4 + mengde), id: p.id, d: p.d, frø: p.r2 }))
      .filter(b => b.a > .02);
    l.sort((a, b) => a.d - b.d); return l.slice(0, maks);
  }
  // Lysstripene rundt (cx, cy): [{ x, y, b (bredde), a (0–1), id }]
  function stråler(cx, cy, D, t, styrke, maks = REGLER.stråle.maks) {
    const R = REGLER.stråle; if (!(styrke > .01)) return [];
    const l = felt(cx, cy, D, t, { celle: R.celle, sjanse: R.sjanse, levetid: R.levetid, nær: R.nær, fjern: R.fjern, salt: 202 })
      .map(p => ({ x: p.x, y: p.y, b: R.bredde[0] + (R.bredde[1] - R.bredde[0]) * p.r1 * p.r1, a: liv(p.fase) * styrke * (.5 + .5 * p.r2), id: p.id, d: p.d, frø: p.r2 }))
      .filter(s => s.a > .02);
    l.sort((a, b) => a.d - b.d); return l.slice(0, maks);
  }
  // Hvor mye nedbør fra bygene det er i punktet (0–1) og hvilken byge (den sterkeste)
  function her(liste, x, y) {
    let m = 0, hvem = null; const k = REGLER.byge.kant;
    for (const b of liste || []) { const d = Math.hypot(x - b.x, y - b.y); if (d > b.r) continue; const v = b.a * (1 - glatt(b.r * k, b.r, d)); if (v > m) { m = v; hvem = b; } }
    return { mengde: m, byge: hvem };
  }
  // Snø eller regn i bygen: moh = bakken under bygen
  function type(moh, snøgrense, årstid) { return årstid === 'vinter' || moh > snøgrense - REGLER.snøMargin ? 'snø' : 'regn'; }
  // Forskyvningen skyene har drevet på dt spillminutter: [dx, dy] i meter (retning = vinkelen vinden blåser mot)
  function drift(fart, retning, dt) { const s = fart * REGLER.fart * 60 * dt; return [Math.cos(retning) * s, Math.sin(retning) * s]; }
  // Det blå luftperspektivet: { k (0–1), farge [r, g, b] } fra horisontfargen (disens farge nå), dag (0 natt – 1 dag) og skydekket
  function dis(V, dag, sky, horisont) {
    const R = REGLER.dis, d = V && V.dis != null ? V.dis : 1;
    const k = R.styrke * (1 - R.skyTrekk * (sky || 0)) * glatt(.15, .6, d) * (.35 + .65 * (dag == null ? 1 : dag));
    const h = horisont || [.72, .79, .86], b = R.blå.map(v => v * (.25 + .75 * (dag == null ? 1 : dag))), a = R.blåAndel * (1 - (sky || 0) * .8);
    return { k, farge: h.map((v, i) => v + (b[i] - v) * a) };
  }
  // Hvor disen begynner (m): når du går, eller ganger kameraavstanden fra lufta (nært terreng skal være klart)
  function disStart(gårDu, avst) { const R = REGLER.dis; return gårDu ? R.startGå : Math.max(R.startGå, (avst || 0) * R.startLuft); }
  // Disens andel i en avstand (det skyggeleggeren regner): k · (1 − e^(−(d − start)/L))
  function disAndel(k, d, start, L = REGLER.dis.lengde) { return d <= start ? 0 : k * (1 - Math.exp(-(d - start) / L)); }

  const Luft = { REGLER, hash, striper, bygeMengde, felt, byger, stråler, her, type, drift, dis, disStart, disAndel, liv };
  if (typeof module !== 'undefined' && module.exports) module.exports = Luft; else rot.Luft = Luft;
})(typeof globalThis !== 'undefined' ? globalThis : this);
