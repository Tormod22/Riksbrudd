// VAKT «figurer» (runde 7, 20. nov natt; kritikerne 19. nov: «menneskene og geværet er kantete klosser»): den felles, avrundede figuren
// i spill/figur3d.js. Reglene (fargepakking, armene på geværet) alltid; når 3D er åpent: to prøvelag (ett nær kameraet som sikter og har en
// såret og en fallen, ett 300 m unna på marsj) gir riktig antall instanser i nær- og fjernnettet med riktig stilling, folkene i leiren
// er figurer, ingen GL-feil og programmet for figurene er laget, og trekantene per figur er under taket. Prøvelagene lages uten nyttLag
// (tilfeldighetsrekka røres ikke) og tas bort i samme slag; alt settes tilbake.
module.exports = {
  navn: 'figurer i 3D (avrundede folk og soldater)',
  kjør: async (pg, profil) => {
    const d = await pg.evaluate(async () => {
      const ut = { feil: [] }, krev = (ok, tekst) => { if (!ok) ut.feil.push(tekst); }, F = window.Figur3d;
      if (!F) return { feil: ['Figur3d mangler'] };
      // reglene: farge inn og ut, begge hendene på geværet
      { const c = [.79, .63, .5], u = F.pakkUt(F.pakk(c)); krev(c.every((v, i) => Math.abs(v - u[i]) < .005), 'fargepakkingen'); }
      { const st = F.REGLER.opp, [v, h] = F.armer(st), sv = [0, F.REGLER.skulderY, F.REGLER.skulderZ], sh = [0, -F.REGLER.skulderY, F.REGLER.skulderZ], hv = F.hånd(sv, v), hh = F.hånd(sh, h), m = F.påVåpen(F.REGLER.forskjefte, st);
        krev(Math.hypot(hh[0] - st.G[0], hh[1] - st.G[1], hh[2] - st.G[2]) < .01 && Math.hypot(hv[0] - m[0], hv[1] - m[1], hv[2] - m[2]) < .01, 'hendene er ikke på geværet'); }
      // Claudes forslag: tak for trekanter per figur (nær, fjern) – PC; telefonen har færre
      const TAK = [2200, 800], D = F.DEL;
      if (typeof THREE !== 'undefined') { const n = F.geo(true, D.hjelm | D.sekk | D.gevær), f = F.geo(false, D.hjelm | D.sekk | D.gevær); ut.tri = [n.index.count / 3, f.index.count / 3];
        krev(ut.tri[0] > 600 && ut.tri[0] < TAK[0] && ut.tri[1] > 150 && ut.tri[1] < TAK[1] && ut.tri[1] < ut.tri[0], 'trekanter per soldat (nær/fjern): ' + ut.tri.join('/'));
        krev(!!n.attributes.aLem && !!n.attributes.normal && n.attributes.position.count < 2000, 'geometrien mangler ledd/normaler eller har for mange hjørner'); }
      const R = typeof R3 !== 'undefined' && R3 && R3.ut && på3d ? R3 : null; ut.i3d = !!R;
      if (!R || typeof soldater3d !== 'function') return ut;
      const u = R.ut, c = R.cam.position, X = u.cx + c.x, Y = u.cy + c.y, mann = (hp, i) => ({ navn: 'Prøve ' + i, rolle: 'rifle', hp }), lag = [];
      // prøvelag: blå (alltid synlige), ett 8 m foran kameraet som skyter, ett 300 m unna på marsj
      const nær = { navn: 'Prøvelag figur nær', x: X + 8, y: Y + 8, side: 'blå', retning: 0, sti: null, menn: [1, 1, 1, 1, .5, 0].map(mann), skyterPå: new Set([1]) };
      const fjern = { navn: 'Prøvelag figur fjern', x: X + 300, y: Y - 40, side: 'blå', retning: 1, sti: [[X + 900, Y]], menn: [1, 1, 1, 1].map(mann) };
      const flokk = () => R.solFlokk, tellNå = () => (R.solMesh || []).map(m => m.count);
      try {
        soldater3d(); const før = tellNå(), førN = flokk() ? flokk().antall() : 0;
        ENHETER.push(nær, fjern); lag.push(nær, fjern); soldater3d();
        const fl = flokk(); krev(!!fl && R.solMesh.length === 2 && R.solMesh.every(m => m.isInstancedMesh && m.parent === R.scene), 'soldatnettene er ikke i scenen');
        const etter = tellNå(); ut.inst = { før, etter }; krev(fl && fl.antall() === førN + 10, 'antall figurer: ' + (fl && fl.antall()) + ' (ventet ' + (førN + 10) + ')');
        // laget foran kameraet havner i nær-nettet når kameraet er nede ved bakken (ellers i fjernnettet), laget 300 m unna i fjernnettet
        const bakke = (hoyde3d(nær.x, nær.y) - u.h0) * R.EX, nærVent = Math.hypot(8, 8, c.z - bakke) < (VW < 700 ? F.REGLER.nærMobil : F.REGLER.nærPC); ut.nærVent = nærVent;
        // (høyst maksNær figurer får full detalj – de nærmeste – resten går til fjernnettet)
        const maksNær = VW < 700 ? F.REGLER.maksNærMobil : F.REGLER.maksNærPC;
        krev(etter[0] + etter[1] === før[0] + før[1] + 10 && etter[0] <= maksNær && (nærVent ? etter[0] >= Math.min(før[0] + 6, maksNær) : etter[1] - før[1] >= 10), 'nær/fjern: ' + JSON.stringify(ut.inst));
        // stillingen: noen sikter (1), én kneler, én ligger uten gevær, og fire går
        let sikter = 0, kneler = 0, utenGevær = 0, går = 0;
        for (const m of R.solMesh) { const A = m.geometry.attributes, gA = A.aGang.array, pA = A.aPose.array;
          for (let i = 0; i < m.count; i++) { if (gA[i * 4 + 2] === 1) sikter++; if (gA[i * 4 + 1] === 1) går++; if (pA[i * 4 + 1] === 1) kneler++; if (!(pA[i * 4 + 2] & D.gevær)) utenGevær++; } }
        ut.stilling = { sikter, kneler, utenGevær, går }; krev(sikter >= 4 && kneler >= 1 && utenGevær >= 1 && går >= 4, 'stillingene: ' + JSON.stringify(ut.stilling));
        // folkene i leiren er figurer (når leiren er i utsnittet)
        const S = window.OppstartSpill && OppstartSpill.tilstand(), Fo = window.FolkSpill && FolkSpill.tilstand();
        if (S && S.leir && Fo && window.Folk3d && Math.abs(S.leir.x - u.cx) < u.S - 60 && Math.abs(S.leir.y - u.cy) < u.S - 60) { KROKER.ramme3d.forEach(f => { if (/Folk3d|folk3d\.js/.test(f.toString())) f(R); });
          const SS = window.SamfunnSpill && SamfunnSpill.tilstand && SamfunnSpill.tilstand(), venter = Fo.personer.slice(0, 14).filter(p => !p.borte).length + (SS && SS.avhengige ? SS.avhengige.slice(0, 8).filter(p => !p.borte).length : 0);
          ut.folk = Folk3d.antall(); krev(ut.folk === venter || venter === 0, 'folk i 3D: ' + ut.folk + ' (ventet ' + venter + ')'); }
        // ett bilde: ingen GL-feil, og programmet for figurene finnes (skyggeleggeren kompilerte)
        const gl = R.renderer.getContext(); gl.getError(); R.renderer.render(R.scene, R.cam); ut.gl = gl.getError(); krev(ut.gl === 0, 'GL-feil ' + ut.gl);
        const prog = (R.renderer.info.programs || []).filter(p => /figur3d/.test(p.cacheKey || '')); ut.program = prog.length; krev(prog.length >= 1, 'programmet for figurene mangler');
        krev(!prog.some(p => p.diagnostics && p.diagnostics.runnable === false), 'figurprogrammet kompilerte ikke');
        // trekanter i alle figurene til sammen er under taket (600 soldater i fjernnettet)
        ut.sum = (R.solMesh || []).reduce((a, m) => a + m.count * m.geometry.index.count / 3, 0); krev(ut.sum < 600 * TAK[1], 'for mange trekanter i figurene: ' + ut.sum);
      } finally {
        for (const e of lag) { const i = ENHETER.indexOf(e); if (i >= 0) ENHETER.splice(i, 1); }
        soldater3d(); ut.tilbake = (R.solMesh || []).map(m => m.count);
      }
      krev(JSON.stringify(ut.tilbake) === JSON.stringify(ut.inst.før), 'ikke satt tilbake: ' + JSON.stringify(ut.tilbake) + ' mot ' + JSON.stringify(ut.inst.før));
      // (runde 11) kjøretøyene: avrundede modeller innenfor taket, og en kolonne står på fire hjul i bakken (ingen hjul under bakken, minst
      // ett på den – samme regel som feltbilen, Kjor.stilling); bilene og folkene i trafikken er de avrundede formene / figurene
      if (window.Kjoretoy3d && window.Kjor && typeof kjøretøy3d === 'function') { ut.kj = {}; for (const t of Kjoretoy3d.typer) ut.kj[t] = Math.round(Kjoretoy3d.trekanter(t));
        krev(Object.values(ut.kj).every(n => n > 400 && n < 6000), 'trekanter per kjøretøy: ' + JSON.stringify(ut.kj));
        const k = Kjoretoy.ny({ navn: 'Prøve hjul', type: 'lastebil', antall: 1, x: X + 30, y: Y + 25, retning: .7 }); KJORETOY.push(k);
        try { kjøretøy3d(); const m = R.kjMesh.lastebil, M = new THREE.Matrix4(), T = Kjoretoy.TYPER.lastebil, hx = T.lengde * .35, hy = T.bredde * .4; let i = -1;
          for (let j = 0; j < m.count; j++) { m.getMatrixAt(j, M); if (Math.abs(M.elements[12] - (k.x - u.cx)) < .01 && Math.abs(M.elements[13] - (k.y - u.cy)) < .01) i = j; }
          krev(i >= 0, 'prøvekolonnen er ikke tegnet');
          if (i >= 0) { m.getMatrixAt(i, M); const v = new THREE.Vector3(), d = [];
            for (const [sx, sy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) { v.set(sx * hx, sy * hy, 0).applyMatrix4(M); d.push(v.z - (hoyde3d(u.cx + v.x, u.cy + v.y) - u.h0) * R.EX); }
            ut.hjul = d.map(x => +x.toFixed(2)); krev(Math.min(...d) > -.08 && Math.min(...d) < .25, 'hjulene i bakken: ' + JSON.stringify(ut.hjul)); } }
        finally { KJORETOY.splice(KJORETOY.indexOf(k), 1); kjøretøy3d(); } }
      if (window.Liv3d && Liv3d.trafikk && u.S <= 2200) { const T = Liv3d.trafikk(); ut.trafikk = { biler: T.biler.length, folk: T.folk.length };
        if (T.folk.length) { KROKER.ramme3d.forEach(f => { if (/folkFlokk/.test(f.toString())) f(R); }); krev(!!T.flokk && T.flokk.antall() === T.folk.length, 'folkene på fortauet er ikke figurer: ' + (T.flokk ? T.flokk.antall() : 'ingen flokk')); }
        if (T.biler.length) { const g = T.bilNett[0].geometry, n = (g.index ? g.index.count : g.attributes.position.count) / 3 + (T.bilNett[1] ? T.bilNett[1].geometry.attributes.position.count / 3 : 0); ut.trafikk.tri = n;
          krev(n > 300 && n < 1500, 'trekanter per bil i trafikken: ' + n); } }
      return ut;
    });
    const ok = !d.feil || !d.feil.length;
    return { ok: ok && !d.mangler, tekst: ok ? (d.i3d ? `figurer: ${d.tri ? d.tri.join('/') : '?'} trekanter (nær/fjern), prøvelagene ${JSON.stringify(d.inst)}, stilling ${JSON.stringify(d.stilling)}, folk ${d.folk === undefined ? '–' : d.folk}, kjøretøy ${JSON.stringify(d.kj || {})}, hjul ${JSON.stringify(d.hjul || [])}, trafikk ${JSON.stringify(d.trafikk || {})}, program ${d.program}, GL ${d.gl}`
      : `reglene og geometrien (${d.tri ? d.tri.join('/') : 'uten THREE'} trekanter; 3D er av)`) : 'FEIL: ' + d.feil.join('; '), data: d };
  },
};
