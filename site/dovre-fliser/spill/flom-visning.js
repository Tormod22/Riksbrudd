'use strict';
// S5 del 3 i kartet: en sprengt dam (ingeniørene, odeleggelse-visning.js) gir flom nedover dalen (regler: spill/flom.js).
// Lag og kjøretøy i flomfeltet rammes, vegene der stenges i 12 spilltimer (kjøretøy kjører om), og vannet tegnes blått over kartet.
(function () {
  const Fl = Flom, R = Fl.REGLER, FLOMMER = [], rng = Terreng.frø(1953);
  window.FLOMMER = FLOMMER;
  KROKER.ødelagt.push((o, hva) => { if (o.lag === 'dam' && hva === 'ødelegg') slippUt(o).catch(e => console.error(e)); });

  async function slippUt(o) {
    const a = o.deler[0], k = (a.length >> 2) << 1, X = a[k], Y = a[k + 1], D = R.lengde + 1000;
    const v = await lagVindu([X - D, Y - D, X + D, Y + D], false);
    const sti = Fl.flomvei(v, X, Y), { maske, antall } = Fl.flomfelt(v, sti);
    if (!antall) { logg(`Vannet fra ${o.e.navn || 'dammen'} renner bort uten å gjøre skade.`); return null; }
    // beskjær til der det er vann, og lag et mykt blått bilde (som siktfeltet)
    let i0 = v.w, j0 = v.h, i1 = -1, j1 = -1;
    for (let j = 0; j < v.h; j++) for (let i = 0; i < v.w; i++) if (maske[j * v.w + i]) { if (i < i0) i0 = i; if (i > i1) i1 = i; if (j < j0) j0 = j; if (j > j1) j1 = j; }
    const w = i1 - i0 + 1, h = j1 - j0 + 1, m = new Uint8Array(w * h), c = lerret(w, h), g = c.getContext('2d'), im = g.createImageData(w, h);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (maske[(j0 + j) * v.w + i0 + i]) { m[j * w + i] = 1; const q = (j * w + i) * 4; im.data[q] = 74; im.data[q + 1] = 127; im.data[q + 2] = 176; im.data[q + 3] = 255; }
    g.putImageData(im, 0, 0);
    const c4 = lerret(w * 4, h * 4), g4 = c4.getContext('2d'); g4.imageSmoothingEnabled = true; if ('filter' in g4) g4.filter = 'blur(3px)'; g4.drawImage(c, 0, 0, w * 4, h * 4);
    const felt = { navn: o.e.navn || 'dammen', x0: v.x0 + i0 * v.r, y0: v.y0 - j0 * v.r, r: v.r, w, h, maske: m, c: c4, fra: tid, til: tid + R.varighet / 60, lenker: [], km: Math.round(Math.hypot(sti[sti.length - 1][0] - sti[0][0], sti[sti.length - 1][1] - sti[0][1]) * v.r / 100) / 10 };
    FLOMMER.push(felt); logg(`Flommen fra ${felt.navn} går ${nf.format(felt.km)} km nedover dalen (${nf.format(Math.round(antall * v.r * v.r / 1e4) / 100)} km² under vann).`);
    rammer(felt); skitten = true;
    return felt;
  }
  // Det som står i flomfeltet: lag får tap og mister marsjen, kjøretøy skades, vegene stenges.
  function rammer(felt) {
    for (const s of ENHETER) { if (!levende(s) || !Fl.iFlom(felt, s.x, s.y)) continue;
      const t = R.tap[0] + Math.floor(rng() * (R.tap[1] - R.tap[0] + 1)), ut = Terreng.fordelTreff(s.menn, t, rng); s.sti = null; s.siktSkitten = true;
      if (s.side === 'blå') logg(`${s.navn} ble tatt av flommen: ${ut.map(([m, h]) => `${m.navn} ${h}`).join(', ')}.`); else if (synlig(s)) logg(`${s.navn} ble tatt av flommen (${t} treff).`);
      if (Terreng.slattUt(s.menn) && !s.slattUtMeldt) { s.slattUtMeldt = true; logg(`${s.navn} er slått ut av kamp.`); }
      if (s.menn[s.leder] && s.menn[s.leder].hp < 1) { const ny = s.menn.findIndex(q => q.hp >= 1); if (ny >= 0) s.leder = ny; }
      if (valgt === s) visPanel(); }
    for (const k of KJORETOY.slice()) if (Fl.iFlom(felt, k.x, k.y) && window.skadKjoretoy) { logg(`${k.navn} ble tatt av flommen.`); skadKjoretoy(k, R.kjøretøy, false, 'flommen'); }
    return lastVegnett().then(g => stengVeger(felt, g)).catch(() => {});
  }
  // Veglenker med et endepunkt under vann stenges til vannet har trukket seg tilbake. Gjøres i biter så siden ikke henger.
  async function stengVeger(felt, g) {
    const x1 = felt.x0 + felt.w * felt.r, y0 = felt.y0 - felt.h * felt.r, inne = n => { const [x, y] = g.punkt(n); return x >= felt.x0 && x <= x1 && y >= y0 && y <= felt.y0 && Fl.iFlom(felt, x, y); };
    const under = new Map(), nede = n => { if (!under.has(n)) under.set(n, inne(n)); return under.get(n); };
    for (let e = 0; e < g.antallLenker; e += 50000) {
      for (let f = e; f < Math.min(g.antallLenker, e + 50000); f++) { const l = g.lenke(f); if (nede(l.fra) || nede(l.til)) { g.sperr(f); felt.lenker.push(f); } }
      await new Promise(r => setTimeout(r, 0));
    }
    if (!felt.lenker.length) return;
    logg(`${felt.lenker.length} veglenker står under vann i ${R.varighet / 3600} timer.`);
    const stengt = new Set(felt.lenker);
    for (const k of KJORETOY) { if (!k.sti || !Kjoretoy.lenkerIgjen(k).some(e => stengt.has(e))) continue;
      const P = k.sti.P, r = Kjoretoy.planlegg(k, g, [P[P.length - 2], P[P.length - 1]]);
      if (r.feil) { Kjoretoy.stopp(k); k.oppdrag = null; logg(`${k.navn}: vegen er under vann, og det finnes ingen omkjøring.`); } else logg(`${k.navn} kjører om flommen.`); }
  }
  KROKER.sim.push(() => {
    for (let i = FLOMMER.length - 1; i >= 0; i--) { const f = FLOMMER[i]; if (tid < f.til) continue;
      FLOMMER.splice(i, 1); const g = window.VEGNETT, sperret = g && g._sperretAv;
      if (g) for (const e of f.lenker) if (!sperret || !sperret.has(e)) g.åpne(e);
      logg(`Vannet etter ${f.navn} har trukket seg tilbake${f.lenker.length ? '; vegene er åpne igjen' : ''}.`); skitten = true; }
  });
  window.FLOM = { slippUt, rammer };   // for sjekk.js

  KROKER.tegn.push((g, vx0, vy1) => {
    if (!FLOMMER.length) return; const m = kam.m;
    g.save(); g.imageSmoothingEnabled = true;
    for (const f of FLOMMER) { const igjen = f.til - tid, alfa = .6 * Math.min(1, igjen / (2 * TIME)) * Math.min(1, (tid - f.fra) / 5 + .3);   // stiger de første minuttene, synker de siste 2 timene
      g.globalAlpha = Math.max(.08, alfa); g.drawImage(f.c, (f.x0 - vx0) / m, (vy1 - f.y0) / m, f.w * f.r / m, f.h * f.r / m); }
    g.restore();
  });
  KROKER.tegn3d.push((g, proj) => {   // i 3D: bare et blått merke ved dammen og nederst (overflaten bakes ikke om)
    for (const f of FLOMMER) { const q = proj(f.x0 + f.w * f.r / 2, f.y0 - f.h * f.r / 2); if (!q) continue;
      g.font = 'italic 12px "Cormorant Garamond",serif'; g.textAlign = 'center'; g.fillStyle = '#a9c6df'; g.fillText(`flom fra ${f.navn}`, q[0], q[1]); }
  });
})();
