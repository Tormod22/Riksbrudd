'use strict';
// S5 del 2 i kartet: «Grav ned» for lagene, «Legg miner her» for ingeniørene (regler: spill/feltarbeid.js).
// Nedgravde lag får færre treff (KROKER.ild ganger med vernet); AI-lag som holder et sted, graver seg ned av seg selv.
(function () {
  const FA = Feltarbeid, R = FA.REGLER, MINEFELT = [], rng = Terreng.frø(1905);
  window.MINEFELT = MINEFELT;
  KROKER.ild.push((a, b) => FA.vern(b));

  let akk = 0, nr = 0;
  KROKER.sim.push(dt => {
    akk += dt * 3600 / TIME; if (akk < 60) return; const sek = akk; akk = 0;
    for (const s of ENHETER) {
      if (!levende(s)) continue;
      if (s.ai && s.ai.hva === 'hold' && !s.sti && !s.nedgravd && s.graver == null) FA.startGrav(s);
      const h = FA.grav(s, sek, s.ingeniør);
      if (h === 'nedgravd') { if (s.side === 'blå') logg(`${s.navn} har gravd seg ned (færre treff fra fienden).`); skitten = true; if (valgt === s) visPanel(); }
      if (h === 'flyttet' && s.side === 'blå') logg(`${s.navn} forlater stillingen.`);
      if (s.minelegging) {
        if (s.sti) { s.minelegging = null; if (s.side === 'blå') logg(`${s.navn}: mineleggingen er avbrutt.`); }
        else if ((s.minelegging.igjen -= sek) <= 0) { s.minelegging = null; const f = FA.nyttMinefelt({ x: s.x, y: s.y, side: s.side, navn: `Minefelt ${++nr}` }); MINEFELT.push(f);
          if (s.side === 'blå') logg(`${s.navn} har lagt ${f.navn} (${R.mine.ladninger} miner, ${R.mine.radius} m).`); skitten = true; if (valgt === s) visPanel(); }
      }
    }
    for (let i = MINEFELT.length - 1; i >= 0; i--) {
      const f = MINEFELT[i];
      for (const [e, t] of FA.mineSteg(f, [...ENHETER.filter(levende), ...KJORETOY], rng)) {
        if (e.menn) { const ut = Terreng.fordelTreff(e.menn, t, rng);
          logg(e.side === 'blå' ? `${e.navn} gikk på en mine: ${ut.map(([m, h]) => `${m.navn} ${h}`).join(', ')}.` : synlig(e) ? `${e.navn} gikk på en mine (${t} treff).` : 'En mine gikk av i ' + f.navn + '.');
          if (Terreng.slattUt(e.menn) && !e.slattUtMeldt) { e.slattUtMeldt = true; logg(`${e.navn} er slått ut av kamp.`); }
          if (e.menn[e.leder] && e.menn[e.leder].hp < 1) { const ny = e.menn.findIndex(m => m.hp >= 1); if (ny >= 0) e.leder = ny; } }
        else if (window.skadKjoretoy) { logg(`${e.navn} kjørte på en mine.`); skadKjoretoy(e, t, false, 'en mine'); }
        skitten = true;
      }
      if (f.ladninger <= 0) { if (f.side === 'blå') logg(`${f.navn} er brukt opp.`); MINEFELT.splice(i, 1); }
    }
  });

  KROKER.lagTekst.push(s => s.nedgravd ? 'nedgravd' : s.graver != null ? `graver seg ned (${Math.round(100 * s.graver / (s.ingeniør ? R.gravIngeniør : R.grav))} %)` : null);
  KROKER.lagTekst.push(s => s.minelegging ? `legger miner (${Math.round(100 * (1 - s.minelegging.igjen / R.mine.tid))} %)` : null);
  KROKER.lagKnapper.push((s, H) => {
    if (s.sti) return;
    if (!s.nedgravd && s.graver == null) H.appendChild(knapp('Grav ned', false, () => { const r = FA.startGrav(s);
      logg(r.feil ? `${s.navn}: ${r.feil}` : `${s.navn} graver seg ned (${(s.ingeniør ? R.gravIngeniør : R.grav) / 60} min).`); visPanel(); }));
    if (s.ingeniør && !s.minelegging) H.appendChild(knapp('Legg miner her', false, () => { s.minelegging = { igjen: R.mine.tid };
      logg(`${s.navn} legger miner der laget står (${R.mine.tid / 60} min). Fiender som går eller kjører gjennom, kan løse dem ut.`); visPanel(); }));
  });

  // ---------- tegning: skyttergrav under nedgravde lag, minefeltene (bare våre egne) ----------
  KROKER.tegn.push((g, vx0, vy1) => {
    const m = kam.m, S = (X, Y) => [(X - vx0) / m, (vy1 - Y) / m]; g.save();
    for (const s of ENHETER) { if (!s.nedgravd || !levende(s) || (VIS.taake && !synlig(s))) continue; const [x, y] = S(s.x, s.y); if (x < -40 || y < -40 || x > VW + 40 || y > VH + 40) continue;
      const r = Math.max(16, 18 / m); g.strokeStyle = 'rgba(70,52,32,.9)'; g.lineWidth = Math.max(3, 4 / m); g.lineJoin = 'round'; g.beginPath();
      for (let i = 0; i <= 8; i++) { const a = Math.PI * (.15 + .7 * i / 8), rr = r * (i % 2 ? 1 : .85); g[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.stroke();
      g.strokeStyle = 'rgba(200,180,140,.6)'; g.lineWidth = 1; g.stroke(); }
    for (const f of MINEFELT) { if (f.side !== 'blå') continue; const [x, y] = S(f.x, f.y), r = R.mine.radius / m; if (x < -r || y < -r || x > VW + r || y > VH + r) continue;
      g.strokeStyle = 'rgba(200,85,61,.8)'; g.lineWidth = 1.4; g.setLineDash([5, 4]); g.beginPath(); g.arc(x, y, Math.max(r, 8), 0, 6.283); g.stroke(); g.setLineDash([]);
      if (r > 14) for (let i = 0; i < f.ladninger; i++) { const a = i * 2.4, q = r * .55 * Math.sqrt((i + 1) / R.mine.ladninger), mx = x + Math.cos(a) * q, my = y + Math.sin(a) * q;
        g.beginPath(); g.moveTo(mx - 3, my - 3); g.lineTo(mx + 3, my + 3); g.moveTo(mx + 3, my - 3); g.lineTo(mx - 3, my + 3); g.stroke(); }
      if (m < 30) { g.font = 'italic 12px "Cormorant Garamond",serif'; g.textAlign = 'center'; g.fillStyle = '#e8b0a0'; g.fillText(`${f.navn} (${f.ladninger})`, x, y - Math.max(r, 8) - 4); } }
    g.restore();
  });
})();
