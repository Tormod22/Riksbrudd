'use strict';
// VAKT «fiendens granater» (R18-C, 23. nov): granater og maskingevær i kampen, samme regler i 2D og 3D.
// (1) 2D: to prøvelag 40 m fra hverandre tar en kamprunde (kamprunde() i index.html -> spill/simulering.js -> KROKER.salve) – begge bruker
//     granater, det kommer et blink i kartet, og maskingeværene holder det andre laget nede (KROKER.ild og KROKER.fart under 1).
//     Selvtest: med granatenes rekkevidde satt til 0 med vilje skal vakta se at ingen granater ble brukt. Ny ammunisjon fyller granatene.
// (2) 3D (når du går): et fiendelag 25 m foran deg kaster en granat (BakkekampSpill.fiendeKast) – den flyr, «Granat!» og en rød bue
//     mot kasteren, og den går av og skader deg. En prøvevegg mellom deg og smellet tar det meste (granatDekning ×0,25), en vegg bak
//     deg gjør det ikke; selvtest med veggens faktor satt til 1. Ildkraften mot deg følger 2D-tabellen, og det lette maskingeværet
//     holder laget du sikter på nede.
// Setter alt tilbake: lagene, hindringene, sekken, helsa, tempo, 3D og gangen.
module.exports = {
  navn: 'fiendens granater (granater i lagkampen og i 3D, maskingevær og undertrykking)',
  kjør: async (pg, profil) => {
    const r = await pg.evaluate(async () => {
      const ut = { feil: [] }, ok = (v, t) => { if (!v) ut.feil.push(t); }, vent = ms => new Promise(r => setTimeout(r, ms));
      const B = window.Bakkekamp, BK = window.BakkekampSpill;
      ok(B && BK && B.Lagkamp && BK.fiendeKast, 'Bakkekamp/BakkekampSpill (R18-C) mangler'); if (!B || !BK || !B.Lagkamp) return ut;
      const test0 = BK.test, tempo0 = tempo, tid0 = tid, nye = [], gamle = ENHETER.slice(), AIpå = window.AI ? AI.på : null; if (window.AI) AI.på = false;
      // granaten kan ramme egne lag ved siden av deg: helsa, granatene og undertrykkingen til alle lag settes tilbake etterpå
      // den felles tilfeldighetsstrømmen settes tilbake etterpå (ellers får vaktene etter denne andre tilfeldige navn og væremåter)
      const rng0 = window.Tilfeldig ? Tilfeldig.lagre() : null;
      const lagFør = gamle.map(s => ({ s, hp: (s.menn || []).map(m => m.hp), utMeldt: s.slattUtMeldt, leder: s.leder, gr: s.granater, und: s.undertrykt }));
      const R = typeof R3 !== 'undefined' ? R3 : null, lagt = [];
      try {
        BK.test = true; tempo = 0;
        // ---------- (1) 2D-kampen ----------
        const runde = (hold) => { const H = B.REGLER.lagGranat, h0 = H.hold; if (hold !== undefined) H.hold = hold;
          const x = gamle[0] ? gamle[0].x + 5000 : 200000, y = gamle[0] ? gamle[0].y : 6900000;
          const a = nyttLag('Vaktprøve granat blå', x, y, 'blå'), b = nyttLag('Vaktprøve granat rød', x + 40, y, 'rød'); a.strid = { ...(a.strid || {}), bev: 'standard' }; b.strid = { ...(b.strid || {}), bev: 'standard' };
          // kunstig siktfelt: de ser hverandre (ellers må terrengflisene for siktfeltet lastes først)
          for (const s of [a, b]) { s.sikt = { x0: x - 200, y0: y + 200, r: 10, mw: 40, mh: 40, m: new Uint8Array(1600).fill(1) }; s.siktSkitten = false; }
          ENHETER.length = 0; ENHETER.push(a, b); nye.push(a, b);
          const bl0 = BK.blink().length; let res;
          try { kamprunde(); res = { a: B.Lagkamp.antall(a), b: B.Lagkamp.antall(b), blink: BK.blink().length - bl0, und: B.Undertrykk.styrke(a, tid + 1), ild: KROKER.ild.reduce((v, f) => v * f(a, b), 1), fart: (KROKER.fart || []).reduce((v, f) => v * f(a), 1) }; }
          finally { H.hold = h0; ENHETER.length = 0; ENHETER.push(...gamle); }
          return { res, a, b }; };
        const { res: k2, a } = runde(); ut.lagkamp = k2;
        ok(k2.a < B.Lagkamp.start(a) && k2.b < 4, `lagene brukte ikke granater på 40 m (${k2.a}, ${k2.b})`);
        ok(k2.blink >= 1, 'ingen blink i kartet for granatene');
        ok(k2.und > 0 && k2.ild < 1 && k2.fart < 1, `maskingeværene holdt ikke laget nede (${JSON.stringify(k2)})`);
        const { res: selv } = runde(0); ut.selvtest2d = selv; ok(selv.a === 4 && selv.b === 4, 'selvtesten: granater med rekkevidde 0 ble likevel brukt');
        ENHETER.push(a); a.ammo = .2; BK.fyllSteg(); a.ammo = 1; BK.fyllSteg(); ENHETER.splice(ENHETER.indexOf(a), 1); ut.fylt = a.granater; ok(a.granater === B.Lagkamp.start(a), `granatene ble ikke etterfylt med ammunisjonen (${a.granater})`);
        // ---------- (2) 3D ----------
        if (!R || !R.ut || !R.hindre || !window.Gange || !window.SpilletSpill) { ut.i3d = 'ikke prøvd (3D er av)'; return ut; }
        const varPå3d = typeof på3d !== 'undefined' && på3d, varGår = !!R.fot, K = SpilletSpill.K(), hp0 = K.hp, bane0 = { x: R.bane.x, y: R.bane.y };
        ut.tilbake3d = () => {};
        try {
          if (!varPå3d) slå3d(true); if (!R.fot) Gange.start(); await vent(300); ok(!!R.fot, 'gange startet ikke'); if (!R.fot) return ut;
          const d = { x: R.ut.cx + R.bane.x, y: R.ut.cy + R.bane.y }, fa = R.fot.a, fx = -Math.sin(fa), fy = Math.cos(fa), rx = Math.cos(fa), ry = Math.sin(fa);
          const e = nyttLag('Vaktprøve kaster', d.x + fx * 25, d.y + fy * 25, 'rød'); e.strid = { ...(e.strid || {}), bev: 'standard' }; ENHETER.push(e); nye.push(e);
          // ildkraften mot deg: samme tabell som 2D
          ut.ildkraft = { lag: +BK.ildkraft(e, 25).toFixed(2), regel: +B.Fiende3d.ildkraft(e.menn, 25, Terreng).toFixed(2) }; ok(Math.abs(ut.ildkraft.lag - ut.ildkraft.regel) < 1e-6 && ut.ildkraft.lag > 0, 'ildkraften i 3D følger ikke 2D-tabellen: ' + JSON.stringify(ut.ildkraft));
          // det lette maskingeværet holder laget nede
          const u0 = B.Undertrykk.styrke(e, tid); BK.skudd(Utstyr.VÅPEN.lmg, e); ut.lmg = +(B.Undertrykk.styrke(e, tid) - u0).toFixed(3); ok(Utstyr.VÅPEN.lmg && ut.lmg > 0 && BK.ildkraft(e, 25) < ut.ildkraft.lag, 'maskingeværet undertrykker ikke: ' + ut.lmg);
          // kastet
          K.hp = 100; const b0 = BK.buer().length, n0 = B.Lagkamp.antall(e), g = BK.fiendeKast(e);
          // fast landing 3 m foran deg (ellers kan den tilfeldige landingen havne bak en stein eller et tre)
          if (g) { const n = B.Fiende3d.kast(g.x, g.y, g.z, R.bane.x + fx * 3, R.bane.y + fy * 3, BK.bakke(R.bane.x + fx * 3, R.bane.y + fy * 3) + .1); Object.assign(g, { vx: n.vx, vy: n.vy, vz: n.vz, t: n.t }); }
          const sm0 = BK.smellTall(); await vent(150);
          ut.kast = { g: !!g, flyr: BK.flyr().filter(q => q.fiende).length, varsel: performance.now() / 1000 - BK.varselTid() < 8, bue: BK.buer().length >= Math.min(1, b0 + 1), brukt: n0 - e.granater };
          ok(ut.kast.g && ut.kast.flyr === 1 && ut.kast.varsel && ut.kast.bue && ut.kast.brukt === 1, 'fiendens kast: ' + JSON.stringify(ut.kast));
          for (let i = 0; i < 60 && BK.flyr().some(q => q.fiende); i++) await vent(100);
          ut.smell = { igjen: BK.flyr().filter(q => q.fiende).length, hp: Math.round(K.hp), smell: BK.smellTall() - sm0, siste: BK.sisteSmell() }; ok(ut.smell.igjen === 0 && ut.smell.smell === 1 && K.hp < 100, 'fiendens granat gikk ikke av eller skadet deg ikke: ' + JSON.stringify(ut.smell)); K.hp = 100;
          // dekning: prøvevegg 2 m foran deg, smellet 8 m foran (bak veggen) og 8 m bak deg
          const lx = R.bane.x + fx * 2, ly = R.bane.y + fy * 2, P = [[lx - rx * 4, ly - ry * 4], [lx + rx * 4, ly + ry * 4], [lx + rx * 4 + fx * .4, ly + ry * 4 + fy * .4], [lx - rx * 4 + fx * .4, ly - ry * 4 + fy * .4]];
          const o = { P, bb: [Math.min(...P.map(p => p[0])), Math.min(...P.map(p => p[1])), Math.max(...P.map(p => p[0])), Math.max(...P.map(p => p[1]))] };
          for (let ax = Math.floor(o.bb[0] / 20); ax <= Math.floor(o.bb[2] / 20); ax++) for (let ay = Math.floor(o.bb[1] / 20); ay <= Math.floor(o.bb[3] / 20); ay++) { const k = ax + ',' + ay; if (!R.hindre.has(k)) R.hindre.set(k, []); R.hindre.get(k).push(o); lagt.push([k, o]); }
          const foran = BK.granatDekning(d.x + fx * 8, d.y + fy * 8), bak = BK.granatDekning(d.x - fx * 8, d.y - fy * 8);
          const T = B.REGLER.dekning.typer.hus, t0 = { ...T }; T.stå = T.huk = T.ligg = 1; const selv3 = BK.granatDekning(d.x + fx * 8, d.y + fy * 8); Object.assign(T, t0);
          ut.dekning = { foran: foran.faktor, bak: bak.faktor, selvtest: selv3.faktor };
          ok(foran.faktor <= .3 && foran.type === 'hus' && bak.faktor === 1, 'dekning mot granaten: ' + JSON.stringify(ut.dekning));
          ok(selv3.faktor === 1, 'selvtesten: en vegg uten dekning tok likevel granaten');
        } finally {
          for (const [k, q] of lagt) { const L = R.hindre.get(k), i = L ? L.indexOf(q) : -1; if (i >= 0) L.splice(i, 1); }
          for (const f of BK.flyr().splice(0)) if (f.mesh && f.mesh.parent) f.mesh.parent.remove(f.mesh);
          K.hp = hp0; R.bane.x = bane0.x; R.bane.y = bane0.y; if (!varGår && R.fot) Gange.stopp(); if (!varPå3d) slå3d(false); if (BK.lesHindre) BK.lesHindre();
        }
      } catch (err) { ut.feil.push('kastet: ' + (err && err.message)); }
      finally {
        for (const s of nye) { const i = ENHETER.indexOf(s); if (i >= 0) ENHETER.splice(i, 1); }
        for (const q of lagFør) { (q.s.menn || []).forEach((m, i) => { m.hp = q.hp[i]; }); q.s.slattUtMeldt = q.utMeldt; q.s.leder = q.leder; if (q.gr === undefined) delete q.s.granater; else q.s.granater = q.gr; if (q.und === undefined) delete q.s.undertrykt; else q.s.undertrykt = q.und; }
        if (rng0 !== null) Tilfeldig.les(rng0);
        BK.test = test0; tempo = tempo0; tid = Math.max(tid, tid0); if (window.AI) AI.på = AIpå; if (typeof skitten !== 'undefined') skitten = true; delete ut.tilbake3d;
      }
      return ut;
    });
    const ok = r.feil.length === 0;
    return { ok, data: r, tekst: ok ? `2D: granater brukt (${r.lagkamp.a}/${r.lagkamp.b} igjen), blink, undertrykt (ild ×${r.lagkamp.ild.toFixed(2)}), selvtest fanget, etterfylt; ` + (r.i3d || `3D: kast, «Granat!», smell (helse ${r.smell.hp}), vegg ×${r.dekning.foran}, ikke bak, selvtest fanget, maskingevær +${r.lmg}`) : r.feil.join('; ') };
  },
};
