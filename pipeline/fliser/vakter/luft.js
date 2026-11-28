'use strict';
// VAKT «lys og byger» (R19-2, 24. nov): lysstriper fra skyhull, byger som driver over dalen og treffer deg, og blå dis i lag.
// Reglene (spill/luft.js) prøves alltid. Er 3D på: vakta slår bygene og stripene på (Luft3d.test), låser «Skyet» om ettermiddagen,
// tegner, ser at byger og striper er i scenen, at disen er blå og begynner et stykke ute, flytter skyene så en byge står over
// kameraet og ser at det regner/snør rundt kameraet og at sikten korter inn – og setter alt tilbake (vær, klokke, test-flagget).
module.exports = {
  navn: 'lys og byger',
  kjør: async (pg) => {
    const r = await pg.evaluate(async () => {
      const ut = { feil: [] }, ok = (v, t) => { if (!v) ut.feil.push(t); };
      ok(window.Luft && window.Luft3d && window.BYGE, 'Luft, Luft3d eller window.BYGE mangler');
      if (ut.feil.length) return ut;
      // reglene
      ok(Luft.striper({ sky: .1, dis: 1, vær: 'klart' }, 15) === 0, 'lysstriper i klart vær');
      ok(Luft.striper({ sky: .6, dis: .8, vær: 'skyet' }, 15) > .8, 'ingen lysstriper i delvis skyet vær med lav sol');
      ok(Luft.bygeMengde({ sky: .1, dis: 1, vær: 'klart' }) === 0 && Luft.bygeMengde({ sky: .8, dis: .75, vær: 'skyet' }) > .8, 'bygemengden følger ikke skydekket');
      ok(Luft.her([{ x: 0, y: 0, r: 900, a: .9 }], 10, 10).mengde > .8, 'her() gir ikke nedbør midt i en byge');
      // (ut4-fiksa) three.js lastes nå i bakgrunnen i 2D (spill2d.js); tåka kobles først når 3D åpnes (init3d) – sjekk bare da
      ok(typeof THREE === 'undefined' || typeof R3 === 'undefined' || !R3 || !R3.renderer || /uLuftF/.test(THREE.ShaderChunk.fog_fragment), 'disen er ikke koblet inn i three.js sin tåke');
      for (let q = 0; q < 150 && typeof på3d !== 'undefined' && på3d && typeof R3 !== 'undefined' && R3 && (R3.bygger || !R3.ut); q++) await new Promise(r => setTimeout(r, 200));
      const R = typeof R3 !== 'undefined' && R3, i3d = !!(R && R.ut && R.mesh && typeof på3d !== 'undefined' && på3d && !R.bygger);
      ut.i3d = i3d; if (!i3d) return ut;
      const S = VaerSpill.S, lås0 = S.låst, vær0 = S.vær, tid0 = tid, tempo0 = tempo, D0 = Luft3d.T.D.slice(), fot = R.fot;
      const gl = R.renderer.getContext(); while (gl.getError()) { /* tøm */ } const t0 = performance.now(), tider = ut.ms = {};
      const tegn = n => { const mg = R.målGanger; R.målGanger = null; for (let i = 0; i < n; i++) { R.lysTid = null; tegn3d(); } R.målGanger = mg; };
      try {
        Luft3d.test = true; tempo = 0;
        // ettermiddag med lav sol (sommer på Dovre: ca. 15° kl. 19), skyet
        tid = Math.floor(tid / 1440) * 1440 + (19 - 6) * 60; Vaer.låsVær(S, 'skyet'); VaerSpill.oppdater(); VaerSpill.straks();
        tegn(3); tider.skyet = Math.round(performance.now() - t0);
        const a = Luft3d.sjekk(); ut.skyet = a;
        ok(a.byger > 0, 'ingen byger i skyet vær');
        ok(a.striper > 0, 'ingen lysstriper i skyet vær med sola ' + (window.NATT ? Math.round(NATT.e) : '?') + '°');
        ok(a.dis > .05 && a.disFarge[2] > a.disFarge[0], 'disen er ikke blå');
        ok(a.disStart >= 1200, 'disen begynner for nær (' + Math.round(a.disStart) + ' m)');
        ok(R.scene.children.some(o => o.name === 'byger' && o.visible) && R.scene.children.some(o => o.name === 'lysstriper' && o.visible), 'byger/striper er ikke i scenen');
        // en byge over kameraet: regn/snø rundt kameraet og kortere sikt
        const c = R.cam.position, X = R.ut.cx + c.x, Y = R.ut.cy + c.y;
        const farFør = R.scene.fog.far;
        ok(Luft3d.bygeOver(X, Y), 'fant ingen byge å flytte');
        tegn(2); tider.over = Math.round(performance.now() - t0);
        const b = Luft3d.sjekk(); ut.over = b; ut.BYGE = { ...window.BYGE };
        ok(b.her > .3, 'bygen står over kameraet, men her = ' + b.her.toFixed(2));
        ok(window.BYGE.regn + window.BYGE.snø > .3, 'window.BYGE gir ikke nedbør over kameraet');
        ok(R.scene.fog.far < farFør * .9, 'sikten korter ikke inn i bygen');
        // regnet/snøen fra spill/vaer-visning.js: LineSegments (regn) eller Points (snø) rundt kameraet er synlige
        const høyt = c.z - (hoyde3d(X, Y) - R.ut.h0) * R.EX > 600;
        if (!høyt) ok(R.scene.children.some(o => (o.isLineSegments || o.isPoints) && o.visible && o.material && o.material.transparent && (o.material.color && (o.material.color.getHex() === 0xaab4bf || o.material.size === .14))), 'regnet/snøen rundt kameraet vises ikke i bygen');
        ut.høyt = høyt;
        // klart vær: ingen byger eller striper
        Vaer.låsVær(S, 'klart'); VaerSpill.oppdater(); VaerSpill.straks(); tegn(2);
        const k = Luft3d.sjekk(); ut.klart = k;
        ok(k.byger === 0 && k.striper === 0 && window.BYGE.mengde === 0, 'byger eller striper i klart vær');
        ut.glFeil = gl.getError(); ok(ut.glFeil === 0, 'GL-feil ' + ut.glFeil);
      } catch (e) { ut.feil.push('unntak: ' + e.message); }
      finally {
        Luft3d.test = false; Luft3d.T.D[0] = D0[0]; Luft3d.T.D[1] = D0[1];
        S.låst = lås0; S.vær = vær0; tid = tid0; tempo = tempo0; R.fot = fot; VaerSpill.oppdater(); VaerSpill.straks(); tegn(1);
        // (i testene er bygene av når Luft3d.test er av; i en vanlig nettleser følger de været)
        if (navigator.webdriver) ok(!Luft3d.sjekk().byger && window.BYGE.mengde === 0, 'byger igjen etter vakta');
      }
      return ut;
    });
    return { ok: !r.feil.length, tekst: r.feil.length ? r.feil.join('; ') : (r.i3d ? `byger ${r.skyet.byger}, striper ${r.skyet.striper}, dis ${r.skyet.dis.toFixed(2)}, over kameraet ${r.over.her.toFixed(2)} (${r.over.type})` : 'reglene (3D av)'), data: r };
  },
};
