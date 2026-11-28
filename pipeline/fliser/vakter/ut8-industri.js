'use strict';
// VAKT for pakka «industri» (ut8, 28. nov – brukeren: «forskjellige industrimaskiner til forskjellige industribygg … korrekt innredning»).
// (1) Reglene i siden (spill/industri.js): Industri.type gir typen fra `ind` i dataene, fra navnet og – uten begge – fra omgivelsene
//     (et fiskevær gir fisk, oljeterminal olje/gass, bratt fjell stein); samme bygg gir samme svar. Interiøret er koblet til
//     (Industri.koble): et industribygg med ind 6 får fiskehall med sløyebenk, filetmaskin og kar med is – ikke verkstedmaskinen.
//     Selvtest: et metallverksted (ind 8) skal IKKE ha fiskeinnredning, ellers sier vakta ingenting.
// (2) Omgivelsene på testsiden (IndustriSpill.omgivelser ved leiren: høyden er lest) og navnet i huspanelet («Industri – fiskeforedling»).
// (3) Plantegningen (2D): et prøvehus av type industri med ind 6 får rommet «fiskehall», maskinene og linja «Industri – fiskeforedling».
// (4) I 3D (når 3D er på): et prøvebygg med P.bygg.ind = 6 får fiskeinnredning, og maskinene tegnes med kasse-modellene uten feil.
// Setter alt tilbake: prøvehusene tas bort, kameraet, fokuset og gangen som før.
module.exports = {
  navn: 'industri (industritype og innredning)',
  kjør: async (pg, profil) => {
    const r = await pg.evaluate(async () => {
      const ut = { feil: [] }, ok = (v, t) => { if (!v) ut.feil.push(t); }, I = window.Industri, In = window.Interior;
      ok(I && In && I.koble && window.IndustriSpill, 'Industri/IndustriSpill mangler (lastes rett etter interior.js)');
      if (!I || !In) return ut;
      const vent = ms => new Promise(r => setTimeout(r, ms));
      // (1) reglene
      ok(In.TYPER.industri.gammelVariant && In.ROMSETT.ind_6 && In.MØBLER.sløyebenk, 'interiøret er ikke koblet til (Industri.koble)');
      ok(I.type({ i: 3, ind: 6 }, { olje: 10 }) === 6 && I.type({ i: 3, ind: 1 }, null) === 1, 'ind fra dataene går ikke foran');
      ok(I.type({ i: 3, navn: 'Nergård Fiskemottak' }, null) === 6, 'navnet «Fiskemottak» gir ikke fisk');
      const telle = omg => { const c = {}; for (let i = 0; i < 200; i++) { const t = I.type({ i: 500 + i }, omg); c[t] = (c[t] || 0) + 1; } return c; };
      const fv = telle({ kai: 120, fiskevær: true, moh: 4 }), ol = telle({ olje: 800, moh: 10 }), st = telle({ bratt: .6, moh: 700, kai: 50000 });
      ut.anslag = { fiskevær: fv[6] || 0, olje: (ol[3] || 0) + (ol[4] || 0), stein: st[5] || 0 };
      ok(ut.anslag.fiskevær > 100 && ut.anslag.olje > 100 && ut.anslag.stein > 60, 'anslaget fra omgivelsene: ' + JSON.stringify(ut.anslag));
      ok(I.type({ i: 42 }, { kai: 300, olje: 5000, moh: 9 }) === I.type({ i: 42 }, { kai: 300, olje: 5000, moh: 9 }), 'samme bygg gir ikke samme svar');
      const rekt = (w, h) => [[0, 0], [w, 0], [w, h], [0, h]], P0 = rekt(32, 18), dør = { x: 16, y: 0, ux: 1, uy: 0, w: 4 };
      const plan = ind => { const pl = In.plan(P0, { i: 71, kl: 'industri', h: 8, ind, dør }); return { pl, t: new Set(pl.møbler.map(m => m.type)), r: new Set(pl.rom.map(q => q.rolle)) }; };
      const fisk = b => b.r.has('fiskehall') && b.t.has('sløyebenk') && b.t.has('filetmaskin') && b.t.has('iskar') && !b.t.has('maskin');
      const a = plan(6), b = plan(8); ut.fisk = [...a.t]; ut.metall = [...b.t].slice(0, 8);
      ok(fisk(a), 'industribygg av type fisk fikk ikke fiskeinnredning: ' + [...a.r].join(', ') + ' / ' + ut.fisk.join(', '));
      ut.selvtest = fisk(b); ok(!ut.selvtest && b.t.has('dreiebenk'), 'selvtest: metallverkstedet ble lest som fisk, eller mangler dreiebenk');
      ok(I.innredning(5).some(x => x.type === 'knuser') && I.innredning(1).some(x => x.type === 'tømmerstabel'), 'innredning(): stein/tømmer mangler maskinene');
      // (2) omgivelsene ved leiren og huspanelets navn
      const S0 = OppstartSpill.tilstand(), lx = S0 && S0.leir ? S0.leir.x : kam.x, ly = S0 && S0.leir ? S0.leir.y : kam.y;
      IndustriSpill.cache.delete(990881); const omg = IndustriSpill.omgivelser({ i: 990881, X: lx, Y: ly }); ut.omg = omg;
      ok(omg && Number.isFinite(omg.moh) && Number.isFinite(omg.bratt), 'omgivelsene ved leiren mangler høyde/helning: ' + JSON.stringify(omg));
      IndustriSpill.cache.delete(990881);
      const Pk = [[lx, ly], [lx + 30, ly], [lx + 30, ly + 20], [lx, ly + 20]];
      ut.panel = [I.panelNavn({ i: 1, t: 6, h: 8, ind: 6 }, Pk), I.panelNavn({ i: 2, t: 12, h: 8, ind: 6 }, Pk), I.panelNavn({ i: 3, t: 0, h: 6 }, Pk)];
      ok(ut.panel[0] === 'Industri – fiskeforedling' && ut.panel[1] === 'Lager – fiskeforedling' && ut.panel[2] === null, 'navnet i huspanelet: ' + JSON.stringify(ut.panel));
      // (3) plantegningen
      const P2 = window.Plantegning2D, PT = window.Plantegning, i3d = typeof på3d !== 'undefined' && på3d, i = 990882;
      if (P2 && PT) {
        const før = { kam: { x: kam.x, y: kam.y, m: kam.m }, fokus: P2.S.fokus, etasje: P2.S.etasje };
        const x = lx + 140, y = ly + 70, Pv = [[x, y], [x + 30, y], [x + 30, y + 18], [x, y + 18]], e = { i, t: 6, h: 8, ind: 6 };
        try {
          P2.prøvehus(Pv, e); if (!P2.hus(i)) P2.nyttHus(Pv, e, 0);
          if (!i3d) { P2.seInn({ Pv, e }); for (let k = 0; k < 80; k++) { await vent(150); const h = P2.hus(i); if (h && (h.klar || h.feil)) break; } skitten = true; await vent(500); }
          else for (let k = 0; k < 80; k++) { await vent(100); const h = P2.hus(i); if (h && (h.klar || h.feil)) break; if (!P2.modell(i)) { /* bygges i køen */ } }
          const m = P2.modell(i); ok(m && m.etasjer.length, 'prøvehuset fikk ingen modell');
          if (m) { const F = PT.figur(m, 1), rom = new Set(F.rom.map(q => q.rolle)), mt = new Set(F.møbler.map(q => q.type)); ut.plan = { rom: [...rom], møbler: [...mt].slice(0, 10) };
            ok(rom.has('fiskehall') && mt.has('sløyebenk') && mt.has('filetmaskin'), 'plantegningen: fiskehall/sløyebenk mangler: ' + JSON.stringify(ut.plan)); }
          if (!i3d) { const el = document.getElementById('plan2dind'); ut.linje = el ? el.parentNode.textContent : null; ok(ut.linje && /Industri – fiskeforedling/.test(el.textContent) && /sløye(benk|linje)/i.test(ut.linje), 'linja i plantegningen: ' + ut.linje); }
        } finally {
          P2.fjernPrøve(i); P2.S.fokus = før.fokus; P2.S.etasje = før.etasje; kam.x = før.kam.x; kam.y = før.kam.y; kam.m = før.kam.m; skitten = true;
        }
      } else ut.plantegning = 'ikke prøvd (Plantegning2D mangler)';
      // (4) i 3D
      if (i3d && typeof R3 !== 'undefined' && R3 && R3.ut && R3.hindre && window.Interior3d && window.Gange) {
        const R = R3, u = R.ut, varPå = !!R.fot, adv = [], gml = console.warn; console.warn = (...q) => { adv.push(q.join(' ')); gml.apply(console, q); };
        const lagt = [], bane0 = { x: R.bane.x, y: R.bane.y };
        try {
          if (!R.fot) Gange.start();
          const x0 = 160, y0 = 60, w = 30, h = 18, P = [[x0, y0], [x0 + w, y0], [x0 + w, y0 + h], [x0, y0 + h]];
          P.bygg = { i: 990883, t: 6, h: 8, kl: 'industri', ind: 6, X: u.cx + x0 + w / 2, Y: u.cy + y0 + h / 2 };
          P.dør = { x: x0 + w / 2, y: y0, ux: 1, uy: 0, w: 4, hh: 4.2, z0: (hoyde3d(u.cx + x0 + w / 2, u.cy + y0 + 4, u) - u.h0) * R.EX };
          const o = { P }; for (let a2 = Math.floor(x0 / 20); a2 <= Math.floor((x0 + w) / 20); a2++) for (let c = Math.floor(y0 / 20); c <= Math.floor((y0 + h) / 20); c++) { const k = a2 + ',' + c; if (!R.hindre.has(k)) R.hindre.set(k, []); R.hindre.get(k).push(o); lagt.push([k, o]); }
          R.bane.x = x0 + w / 2; R.bane.y = y0 - 4; const kr = Gange.kropp(); kr.x = R.bane.x; kr.y = R.bane.y;
          for (let k = 0; k < 16 && !P.inne; k++) Interior3d.oppdater(true);
          const pl = P.inne; ok(!!pl, '3D: prøvebygget fikk ikke interiør');
          if (pl) { const t = new Set(pl.møbler.map(m => m.type)); ut.i3d = { rom: pl.rom.map(q => q.rolle), maskiner: [...t].slice(0, 8), variant: pl.variant };
            ok(pl.rom.some(q => q.rolle === 'fiskehall') && t.has('sløyebenk') && t.has('filetmaskin'), '3D: ikke fiskeinnredning: ' + JSON.stringify(ut.i3d)); }
        } finally {
          console.warn = gml; for (const [k, o] of lagt) { const L = R.hindre.get(k), j = L.indexOf(o); if (j >= 0) L.splice(j, 1); }
          R.bane.x = bane0.x; R.bane.y = bane0.y; if (!varPå) Gange.stopp(); Interior3d.oppdater(true);
        }
        ut.advarsler = adv.filter(t => /interiør/.test(t)); ok(!ut.advarsler.length, '3D: feil i interiøret: ' + ut.advarsler.slice(0, 2).join(' | '));
      } else ut.i3d = 'ikke prøvd (3D er av)';
      return ut;
    });
    return { ok: r.feil.length === 0, tekst: r.feil.length ? r.feil.join('; ') : `fisk ${r.anslag.fiskevær}/200 i fiskevær, olje ${r.anslag.olje}/200, stein ${r.anslag.stein}/200; fiskehall i reglene` +
      (r.plan ? `, plantegningen (${r.plan.rom.join(', ')})` : '') + (r.linje ? ` «${r.linje}»` : '') + (r.i3d && r.i3d.rom ? `, 3D: ${r.i3d.rom.join(', ')}` : ', 3D ikke prøvd'), data: r };
  },
};
