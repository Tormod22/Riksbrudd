'use strict';
// VAKT «kamp på bakken» (W2, 22. nov, R17-3): når du går selv i 3D.
// (1) Dekning: en prøvevegg 2 m foran deg mot en prøvefiende 80 m unna gir faktor 0,25, og kampSteg (spillet-visning.js) gir da en firedel
//     av skaden; uten veggen full skade. Selvtest: med veggens faktor satt til 1 med vilje skal vakten se at dekningen er borte.
// (2) Skadeindikatoren får en bue mot fienden når du blir skadet; treffmarkøren slår til når K.treff endres.
// (3) Siktekikkert: skarpskyttergeværet med sikte gir synsfelt under 25° og ekstra treffsjanse på langt hold; uten sikte 1.
// (4) Granat: et smell midt i et fiendelag 40 m foran deg rammer laget og ikke deg; et kast fra beltet flyr og går av.
// (5) Lagkamerater: «Følg meg» gir et eget lag i nærheten en ordre mot plassen bak deg, «Hold her» stopper det.
// Setter alt tilbake: lagene, hindringene, sekken (granatene og våpnene), helsa, siktet, gangen og 3D av/på.
module.exports = {
  navn: 'kamp på bakken (dekning, kikkert, granater, lagkamerater, treffmarkør)',
  kjør: async (pg, profil) => {
    const r = await pg.evaluate(async () => {
      const ut = { feil: [] }, ok = (v, t) => { if (!v) ut.feil.push(t); }, vent = ms => new Promise(r => setTimeout(r, ms));
      const B = window.Bakkekamp, BK = window.BakkekampSpill;
      ok(B && BK, 'Bakkekamp eller BakkekampSpill mangler'); if (!B || !BK) return ut;
      if (!window.UtstyrSpill || !window.SpilletSpill || !SpilletSpill.K) { ut.feil.push('UtstyrSpill/SpilletSpill mangler'); return ut; }
      if (!UtstyrSpill.klar()) UtstyrSpill.start();
      ok(Utstyr.TING.granat && Utstyr.TING.granat.del, 'granaten er ikke en ting i sekken');
      if (typeof R3 === 'undefined' || !R3 || !R3.ut || !R3.hindre || !window.Gange) { ut.i3d = 'ikke prøvd (3D er av)'; return ut; }
      const R = R3, varPå3d = typeof på3d !== 'undefined' && på3d, varGår = !!R.fot, K = SpilletSpill.K(), hp0 = K.hp, nye = [], lagt = [];
      const I = UtstyrSpill.tilstand(), sekk0 = JSON.stringify(I), bane0 = { x: R.bane.x, y: R.bane.y };
      const AIpå = window.AI ? AI.på : null; if (window.AI) AI.på = false;
      try {
        if (!varPå3d) slå3d(true);
        if (!R.fot) Gange.start(); await vent(300);
        ok(!!R.fot, 'gange startet ikke'); if (!R.fot) return ut;
        const d = { x: R.ut.cx + R.bane.x, y: R.ut.cy + R.bane.y }, a = R.fot.a, fx = -Math.sin(a), fy = Math.cos(a), rx = Math.cos(a), ry = Math.sin(a);
        // ---------- (1) dekning ----------
        const e = nyttLag('Vaktprøve skytter', d.x + fx * 80, d.y + fy * 80, 'rød'); ENHETER.push(e); nye.push(e);
        const lx = R.bane.x + fx * 2, ly = R.bane.y + fy * 2, P = [[lx - rx * 4, ly - ry * 4], [lx + rx * 4, ly + ry * 4], [lx + rx * 4 + fx * .4, ly + ry * 4 + fy * .4], [lx - rx * 4 + fx * .4, ly - ry * 4 + fy * .4]];
        const o = { P, bb: [Math.min(...P.map(p => p[0])), Math.min(...P.map(p => p[1])), Math.max(...P.map(p => p[0])), Math.max(...P.map(p => p[1]))] };
        for (let ax = Math.floor(o.bb[0] / 20); ax <= Math.floor(o.bb[2] / 20); ax++) for (let ay = Math.floor(o.bb[1] / 20); ay <= Math.floor(o.bb[3] / 20); ay++) { const k = ax + ',' + ay; if (!R.hindre.has(k)) R.hindre.set(k, []); R.hindre.get(k).push(o); lagt.push([k, o]); }
        const fjernVegg = () => { for (const [k, q] of lagt) { const L = R.hindre.get(k), i = L ? L.indexOf(q) : -1; if (i >= 0) L.splice(i, 1); } lagt.length = 0; BK.lesHindre(); };
        BK.lesHindre(); const med = BK.dekning(d, e, 1);
        K.hp = 100; SpilletSpill.kampSteg(); const tapMed = 100 - K.hp; await vent(250); ut.buer = BK.buer().length;
        // selvtest: veggen dekker ikke (feilen lagt inn med vilje) – vakten skal se det
        const T = B.REGLER.dekning.typer.hus, t0 = { ...T }; T.stå = T.huk = T.ligg = 1; BK.lesHindre(); ut.selvtest = BK.dekning(d, e, 1); Object.assign(T, t0);
        fjernVegg(); const uten = BK.dekning(d, e, 1); K.hp = 100; SpilletSpill.kampSteg(); const tapUten = 100 - K.hp; K.hp = 100;
        ut.dekning = { med, uten, tapMed: +tapMed.toFixed(2), tapUten: +tapUten.toFixed(2) };
        ok(med === B.REGLER.dekning.typer.hus[Gange.stilling()] || med === B.REGLER.dekning.typer.hus.stå, `veggen gir ikke dekning (${med})`);
        ok(tapUten > 0 && Math.abs(tapMed / tapUten - med / uten) < .02, `kampSteg bruker ikke dekningen (tap ${tapMed.toFixed(2)} med vegg, ${tapUten.toFixed(2)} uten)`);
        ok(ut.selvtest === 1, 'selvtesten: en vegg uten dekning ga likevel dekning');
        ok(ut.buer >= 1, 'skadeindikatoren fikk ingen bue mot skytteren');
        (ENHETER.indexOf(e) >= 0 && ENHETER.splice(ENHETER.indexOf(e), 1));
        // ---------- (2) treffmarkøren ----------
        K.treff = performance.now(); await vent(250); ut.markør = BK.treffAlfa(); ok(ut.markør > 0 || BK.treffSist() > 0, 'treffmarkøren slo ikke til');
        // ---------- (3) siktekikkert ----------
        if (!I.våpen.some(w => w.id === 'rifle')) { if (I.våpen.length >= Utstyr.MAKS_VÅPEN) I.våpen.pop(); I.våpen.push({ id: 'rifle', mag: 5 }); }
        UtstyrSpill.velg(I.våpen.findIndex(w => w.id === 'rifle')); BK.sikt(true);
        ut.kikkert = { fov: BK.fov(68), treff: +BK.treff(600).toFixed(2), på: BK.kikkertPå() }; BK.sikt(false); ut.kikkert.av = BK.treff(600);
        ok(ut.kikkert.på && ut.kikkert.fov < 25 && ut.kikkert.treff > 1.2 && ut.kikkert.av === 1, 'kikkerten: ' + JSON.stringify(ut.kikkert));
        // ---------- (4) granater ----------
        const g = nyttLag('Vaktprøve granatmål', d.x + fx * 40, d.y + fy * 40, 'rød'); ENHETER.push(g); nye.push(g); K.hp = 100;
        const sm = BK.smell(g.x, g.y); ut.granat = { rammet: sm && sm.rammet, hp: K.hp }; ok(sm && sm.rammet > 0 && K.hp === 100, 'granaten: ' + JSON.stringify(ut.granat));
        (ENHETER.indexOf(g) >= 0 && ENHETER.splice(ENHETER.indexOf(g), 1));
        I.ting.granat = 1; const kastet = BK.kast(), fløy = BK.flyr().length; for (let i = 0; i < 60 && BK.flyr().length; i++) await vent(100);
        ut.kast = { kastet, fløy, igjen: BK.flyr().length, belte: I.ting.granat || 0 }; ok(kastet && fløy === 1 && ut.kast.igjen === 0 && !ut.kast.belte, 'kastet: ' + JSON.stringify(ut.kast));
        K.hp = 100;
        // ---------- (5) lagkamerater ----------
        const s = nyttLag('Vaktprøve kamerater', d.x + rx * 60, d.y + ry * 60, 'blå'); ENHETER.push(s); nye.push(s);
        BK.gi('følg', [s]); await vent(200); const følg = BK.følger().includes(s), mål = s.sti || s.planlegger;
        BK.gi('hold', [s]); const holdt = !BK.følger().includes(s) && !s.sti;
        ut.lag = { følg, mål: !!mål, holdt }; ok(følg && mål && holdt, 'lagkameratene: ' + JSON.stringify(ut.lag));
      } catch (err) { ut.feil.push('kastet: ' + (err && err.message)); }
      finally {
        for (const [k, q] of lagt) { const L = R.hindre.get(k), i = L ? L.indexOf(q) : -1; if (i >= 0) L.splice(i, 1); }
        for (const s of nye) { const i = ENHETER.indexOf(s); if (i >= 0) ENHETER.splice(i, 1); }
        BK.sikt(false); BK.meny(false); for (const f of BK.flyr().splice(0)) if (f.mesh && f.mesh.parent) f.mesh.parent.remove(f.mesh);
        const S0 = JSON.parse(sekk0); I.våpen = S0.våpen; I.aktiv = S0.aktiv; I.ting = S0.ting; UtstyrSpill.lagre(); UtstyrSpill.vis();
        K.hp = hp0; R.bane.x = bane0.x; R.bane.y = bane0.y; if (!varGår && R.fot) Gange.stopp(); if (!varPå3d) slå3d(false);
        if (window.AI) AI.på = AIpå; if (typeof skitten !== 'undefined') skitten = true;
      }
      return ut;
    });
    const ok = r.feil.length === 0;
    return { ok, data: r, tekst: ok ? (r.i3d || `dekning ×${r.dekning.med} (tap ${r.dekning.tapMed} mot ${r.dekning.tapUten}), selvtest fanget, kikkert ${Math.round(r.kikkert.fov)}° og ×${r.kikkert.treff}, granaten rammet ${r.granat.rammet} mann, «Følg meg» og «Hold her» virker`) : r.feil.join('; ') };
  },
};
