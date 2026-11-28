'use strict';
// VAKT for «stabil industritype» (ut9-industri2, 28. nov). Brukeren så samme bygg som «fiskeforedling» i én visning og «mathall» i en annen:
// anslaget fra omgivelsene (IndustriSpill.omgivelser) ble bare husket når høyden var lest, og hoydeVed leser bare flisene på nivået
// kartet står på nå.
// (1) Omgivelsene ved leiren har høyde og helning (høyden fra et hvilket som helst flisnivå) – det var årsaken til at vakta ut8-industri
//     feilet på PC.
// (2) Et sted uten lest høyde gir et svar som huskes (utenHøyde) og ikke skifter: samme svar og samme industritype ved neste spørsmål.
// (3) Et prøvehus (industri uten ind i dataene): huspanelet, plantegningens hall og forInfo gir samme type; i 3D også interiøret.
//     Selvtest: sammenligningen skal se forskjell på to ulike typer.
// Setter alt tilbake (prøvehus, kamera, fokus, hurtigminnet for prøvebyggene).
module.exports = {
  navn: 'ut9-industri2 (stabil industritype)',
  kjør: async (pg) => {
    const r = await pg.evaluate(async () => {
      const ut = { feil: [] }, ok = (v, t) => { if (!v) ut.feil.push(t); }, I = window.Industri, IS = window.IndustriSpill, vent = ms => new Promise(r => setTimeout(r, ms));
      if (!I || !IS) { ut.feil.push('Industri/IndustriSpill mangler'); return ut; }
      const S0 = OppstartSpill.tilstand(), lx = S0 && S0.leir ? S0.leir.x : kam.x, ly = S0 && S0.leir ? S0.leir.y : kam.y;
      // (1) ved leiren
      IS.cache.delete(990971); const o1 = IS.omgivelser({ i: 990971, X: lx, Y: ly }); ut.leir = o1 && { moh: o1.moh, bratt: o1.bratt }; IS.cache.delete(990971);
      ok(o1 && Number.isFinite(o1.moh) && Number.isFinite(o1.bratt), 'omgivelsene ved leiren mangler høyde: ' + JSON.stringify(ut.leir));
      // (2) et sted 60 km unna (ingen fliser lest der): svaret huskes uten høyde og skifter ikke
      const fx = lx + 60000, fy = ly + 60000; IS.cache.delete(990972);
      const a = IS.omgivelser({ i: 990972, X: fx, Y: fy }), b = IS.omgivelser({ i: 990972, X: fx, Y: fy });
      const ta = I.forInfo({ i: 990972, kl: 'industri', h: 8, areal: 600, X: fx, Y: fy }), tb = I.forInfo({ i: 990972, kl: 'industri', h: 8, areal: 600, X: fx, Y: fy });
      ut.fjernt = { utenHøyde: a && a.utenHøyde, samme: a === b, type: [ta, tb] }; IS.cache.delete(990972);
      ok(a && a === b && ta === tb, 'svaret uten høyde huskes ikke / skifter: ' + JSON.stringify(ut.fjernt));
      // (3) samme type i huspanelet, plantegningen og forInfo
      const P2 = window.Plantegning2D, PT = window.Plantegning, i = 990973, i3d = typeof på3d !== 'undefined' && på3d;
      const fraRom = rom => { for (const q of rom) for (const t of I.ALLE) if (I.IND[t].hall === q) return t; return 0; };
      ut.selvtest = fraRom(['fiskehall']) !== fraRom(['mathall']); ok(ut.selvtest, 'selvtest: sammenligningen ser ikke forskjell på fiskehall og mathall');
      if (P2 && PT && !i3d) {
        const før = { kam: { x: kam.x, y: kam.y, m: kam.m }, fokus: P2.S.fokus, etasje: P2.S.etasje };
        const x = lx + 160, y = ly - 90, Pv = [[x, y], [x + 34, y], [x + 34, y + 20], [x, y + 20]], e = { i, t: 6, h: 8 };
        try {
          IS.cache.delete(i); P2.prøvehus(Pv, e); if (!P2.hus(i)) P2.nyttHus(Pv, e, 0); P2.seInn({ Pv, e });
          for (let k = 0; k < 80; k++) { await vent(150); const h = P2.hus(i); if (h && (h.klar || h.feil)) break; }
          const m = P2.modell(i), F = m ? PT.figur(m, 1) : null, tPlan = F ? fraRom(F.rom.map(q => q.rolle)) : 0;
          const navn = I.panelNavn(e, Pv), tPanel = I.ALLE.find(t => navn === I.tekst(t)) || 0;
          const midt = [x + 17, y + 10], tInfo = I.forInfo({ i, t: 6, kl: 'industri', h: 8, areal: 680, X: midt[0], Y: midt[1] });
          skitten = true; await vent(600); const el = document.getElementById('plan2dind'), linje = el ? el.textContent : '', tLinje = I.ALLE.find(t => linje.indexOf(I.tekst(t)) === 0) || 0;
          ut.typer = { plan: tPlan, panel: tPanel, info: tInfo, linje: tLinje, navn, linjeTekst: linje };
          ok(tPlan && tPlan === tPanel && tPanel === tInfo && (!el || tLinje === tPlan), 'ulik type for samme bygg: ' + JSON.stringify(ut.typer));
        } finally { P2.fjernPrøve(i); IS.cache.delete(i); P2.S.fokus = før.fokus; P2.S.etasje = før.etasje; kam.x = før.kam.x; kam.y = før.kam.y; kam.m = før.kam.m; skitten = true; }
      } else ut.typer = i3d ? 'plantegningen ikke prøvd (3D er på)' : 'ikke prøvd (Plantegning2D mangler)';
      if (i3d && typeof R3 !== 'undefined' && R3 && R3.ut && R3.hindre && window.Interior3d && window.Gange) {
        const R = R3, u = R.ut, varPå = !!R.fot, lagt = [], bane0 = { x: R.bane.x, y: R.bane.y };
        try {
          if (!R.fot) Gange.start();
          const x0 = 170, y0 = -120, w = 34, h = 20, P = [[x0, y0], [x0 + w, y0], [x0 + w, y0 + h], [x0, y0 + h]], X = u.cx + x0 + w / 2, Y = u.cy + y0 + h / 2;
          IS.cache.delete(990974); P.bygg = { i: 990974, t: 6, h: 8, kl: 'industri', X, Y };
          P.dør = { x: x0 + w / 2, y: y0, ux: 1, uy: 0, w: 4, hh: 4.2, z0: (hoyde3d(u.cx + x0 + w / 2, u.cy + y0 + 4, u) - u.h0) * R.EX };
          const o = { P }; for (let a2 = Math.floor(x0 / 20); a2 <= Math.floor((x0 + w) / 20); a2++) for (let c = Math.floor(y0 / 20); c <= Math.floor((y0 + h) / 20); c++) { const k = a2 + ',' + c; if (!R.hindre.has(k)) R.hindre.set(k, []); R.hindre.get(k).push(o); lagt.push([k, o]); }
          R.bane.x = x0 + w / 2; R.bane.y = y0 - 4; const kr = Gange.kropp(); kr.x = R.bane.x; kr.y = R.bane.y;
          for (let k = 0; k < 20 && !P.inne; k++) Interior3d.oppdater(true);
          const t3 = P.inne ? I.fraPlan(P.inne) : null, tP = I.ALLE.find(t => I.panelNavn({ i: 990974, t: 6, h: 8 }, P.map(([a, b]) => [a + u.cx, b + u.cy])) === I.tekst(t)) || 0;
          ut.i3d = { interiør: t3, panel: tP }; ok(t3 && t3 === tP, '3D: interiøret og huspanelet gir ulik type: ' + JSON.stringify(ut.i3d));
        } finally { for (const [k, o] of lagt) { const L = R.hindre.get(k), j = L.indexOf(o); if (j >= 0) L.splice(j, 1); } IS.cache.delete(990974); R.bane.x = bane0.x; R.bane.y = bane0.y; if (!varPå) Gange.stopp(); Interior3d.oppdater(true); }
      } else ut.i3d = 'ikke prøvd (3D er av)';
      return ut;
    });
    return { ok: r.feil.length === 0, tekst: r.feil.length ? r.feil.join('; ') : `leiren moh ${r.leir && Math.round(r.leir.moh)}, uten høyde huskes (${JSON.stringify(r.fjernt)}), typer ${JSON.stringify(r.typer && r.typer.plan !== undefined ? [r.typer.plan, r.typer.panel, r.typer.info, r.typer.linje] : r.typer)}` + (r.i3d && r.i3d.interiør ? `, 3D ${r.i3d.interiør}/${r.i3d.panel}` : ''), data: r };
  },
};
