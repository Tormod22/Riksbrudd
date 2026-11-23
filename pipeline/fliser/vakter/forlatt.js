'use strict';
// VAKT «forlatte steder» (R18-F, 23. nov – brukeren: Silent Hill som inspirasjon for stemningen, valgte «forlatte steder»).
// (1) Reglene (spill/spor.js) i siden: 40–60 lapper, samme bygg gir samme historie, lappene passer byggtypen.
// (2) I 3D (hvis på): et prøvehus med mange spor og en lapp får interiør med sporene (pl.spor), ingen spordel utenfor huset eller i
//     døråpningen, sporene sperrer ikke (Interior.blokkert er lik med og uten), lappen kan leses («Les lappen»), havner i lista og i
//     sekken, og huset har høyst ca. 20 % flere trekanter enn uten sporene. Gatene: ingen forlatt bil eller skilt inne i et hus.
// (3) Selvtest: en spordel lagt med vilje utenfor huset og en bil lagt med vilje inne i et hus skal bli funnet.
// Setter alt tilbake: prøvehuset tas ut av hindringene, lappelista settes tilbake, gangen stoppes hvis den ikke var på.
module.exports = {
  navn: 'forlatte steder (spor i husene, lapper, gatene)',
  kjør: async (pg, profil) => {
    const r = await pg.evaluate(async () => {
      const ut = { feil: [] }, ok = (v, t) => { if (!v) ut.feil.push(t); }, S = window.Spor, SS = window.SporSpill;
      ok(S && SS && S.LAPPER && S.LAPPER.length >= 40 && S.LAPPER.length <= 60, 'Spor/SporSpill mangler eller feil antall lapper');
      if (!S || !SS) return ut;
      ok(JSON.stringify(S.historie('hus', 31)) === JSON.stringify(S.historie('hus', 31)), 'historien er ikke fast per bygg');
      { let galt = 0; for (let i = 0; i < 500; i++) { const l = S.lapp('skole', i); if (l && l.g !== 'skole') galt++; } ok(galt === 0, 'skoler får lapper fra andre byggtyper'); }
      // finner spordeler (kassene i sporene) utenfor huset: tar opp kallene til kasse() mens sporene lages
      const utenfor = (P, deler) => deler.filter(([x, y]) => !Interior.inni(P, x, y) && Interior.avstKant(P, x, y) > .1).length;
      const iDøra = (pl, deler) => deler.filter(([x, y, a, d]) => d[4] < 1.9 && Math.hypot(x - pl.inngang.inn[0], y - pl.inngang.inn[1]) < .35).length;
      ut.selvtest = utenfor([[0, 0], [10, 0], [10, 8], [0, 8]], [[5, 4, 0, [0, 0, 0, 0, 0, 1]], [14, 4, 0, [0, 0, 0, 0, 0, 1]]]); ok(ut.selvtest === 1, 'selvtest: en spordel utenfor huset ble ikke funnet');
      if (typeof R3 !== 'undefined' && R3 && R3.ut && R3.hindre && window.Interior3d && window.Gange) {
        const R = R3, u = R.ut, varPå = !!R.fot, lagt = [], bane0 = { x: R.bane.x, y: R.bane.y }, T0 = SS.tilstand(), advarsler = [], gammel = console.warn;
        console.warn = (...a) => { advarsler.push(a.join(' ')); gammel.apply(console, a); };
        try {
          if (!R.fot) Gange.start();
          // et bygg-nummer med mange spor og en lapp inne
          let i0 = 5000; for (let i = 5000; i < 9000; i++) { const h = S.historie('hus', i), l = S.lapp('hus', i, h); if (l && !S.ute(l) && Object.keys(h.ting).length >= 3 && (h.ting.sykeseng || h.ting.koffert)) { i0 = i; break; } }
          const x0 = 60, y0 = 80, w = 11, hh = 9, P = [[x0, y0], [x0 + w, y0], [x0 + w, y0 + hh], [x0, y0 + hh]]; P.bygg = { i: i0, t: 0, h: 6, kl: 'hus' };
          P.dør = { x: x0 + w / 2, y: y0, ux: 1, uy: 0, w: 1, hh: 2.1, z0: (hoyde3d(u.cx + x0 + w / 2, u.cy + y0 + 4, u) - u.h0) * R.EX };
          const o = { P }; for (let a = Math.floor(x0 / 20); a <= Math.floor((x0 + w) / 20); a++) for (let c = Math.floor(y0 / 20); c <= Math.floor((y0 + hh) / 20); c++) { const k = a + ',' + c; if (!R.hindre.has(k)) R.hindre.set(k, []); R.hindre.get(k).push(o); lagt.push([k, o]); }
          // byggingen uten scenen (Interior3d.prøvBygg): med og uten sporene, og kassene i sporene tatt opp
          const inne0 = SS.inne, deler = [];
          SS.inne = function* (c) { const k0 = c.kasse; c.kasse = (x, y, a, d) => { deler.push([x, y, a, d]); k0(x, y, a, d); }; yield* inne0(c); };
          const med = Interior3d.prøvBygg(P, true); SS.inne = null; const uten = Interior3d.prøvBygg(P, true); SS.inne = inne0;
          const pl = med.o.plan, sp = pl.spor || {};
          ut.hus = { i: i0, historie: sp.historie, ting: sp.ting, deler: sp.deler, med: Math.round(med.o.trekanter), uten: Math.round(uten.o.trekanter) };
          ok(sp.deler > 3 && deler.length === sp.deler, 'prøvehuset fikk ikke spor (' + sp.deler + ')');
          ok(utenfor(P, deler) === 0, utenfor(P, deler) + ' spordeler står utenfor huset');
          ok(iDøra(pl, deler) === 0, 'spordeler står i døråpningen');
          ok(med.o.trekanter <= uten.o.trekanter * 1.2 + 300, `sporene gir ${ut.hus.med} mot ${ut.hus.uten} trekanter (over 20 %)`);
          { let lik = true; for (let k = 0; k < 200; k++) { const x = x0 + .3 + (k % 20) / 20 * (w - .6), y = y0 + .3 + Math.floor(k / 20) / 10 * (hh - .6); if (Interior.blokkert(pl, x, y) !== Interior.blokkert(uten.o.plan, x, y)) lik = false; } ok(lik, 'sporene sperrer (blokkert er ulik med og uten)'); }
          Interior3d.kast(med.o); Interior3d.kast(uten.o);
          // i scenen: gå inn, lappen kan leses og havner i lista og i sekken
          const kr = Gange.kropp(); R.bane.x = kr.x = x0 + w / 2; R.bane.y = kr.y = y0 - 3;
          for (let q = 0; q < 30 && !P.inne; q++) { Interior3d.oppdater(true); await new Promise(r => setTimeout(r, 60)); }
          ok(!!P.inne && !!P.inne.spor, 'prøvehuset fikk ikke interiør med spor i 3D');
          if (P.inne && P.inne.spor && P.inne.spor.lapp) { const I = P.inne.inngang; kr.x = R.bane.x = I.inn[0] - I.nx * 1.2; kr.y = R.bane.y = I.inn[1] - I.ny * 1.2;
            for (let q = 0; q < 20 && !SS.lesbar(); q++) await new Promise(r => setTimeout(r, 60));
            ok(!!SS.lesbar() && document.getElementById('leseknapp').classList.contains('på'), '«Les lappen» kom ikke inne i huset');
            const n0 = SS.lest().length; document.getElementById('leseknapp').click(); await new Promise(r => setTimeout(r, 50));
            ok(document.getElementById('lapppanel').classList.contains('på') && /\S/.test(document.querySelector('#lapppanel p').textContent), 'lappen ble ikke vist');
            ok(SS.lest().length === n0 + 1, 'lappen kom ikke i lista'); SS.lukk();
            const p = document.createElement('div'), e = (t, a, ...b) => { const x = document.createElement(t); x.append(...b.map(v => typeof v === 'string' ? v : v)); return x; }, kn = (t, f) => { const b = document.createElement('button'); b.textContent = t; b.onclick = f; return b; };
            for (const f of window.SEKK_TILLEGG || []) try { f(p, e, kn); } catch (x) { /* andre tillegg trenger mer */ }
            ok(/Lapper du har funnet \(\d+/.test(p.textContent), 'lappene står ikke i sekken'); }
          // gatene: ingen forlatt bil eller skilt inne i et hus (og selvtest: en bil lagt med vilje i et hus blir funnet)
          const iHus = (s, n) => { let k = 0; if (s && u.hus && typeof nærHus === 'function') for (let q = 0; q < s.length; q += n) if (nærHus(u, s[q], s[q + 1])) k++; return k; };
          if (u.spor) { ut.gate = SS.antall(); ok(iHus(u.spor.bil, 6) === 0 && iHus(u.spor.skilt, 5) === 0, 'forlatt bil eller skilt inne i et hus');
            const Q = u.hus && u.hus.omriss && u.hus.omriss.find(q => q && q.length > 2); if (Q) { let sx = 0, sy = 0; for (const p of Q) { sx += p[0]; sy += p[1]; } ut.gateSelvtest = iHus(new Float32Array([sx / Q.length, sy / Q.length, 0, 0, 1, 0]), 6); ok(ut.gateSelvtest === 1, 'selvtest: en bil i et hus ble ikke funnet'); } }
          else ut.gate = 'ingen tettsted i utsnittet';
        } finally {
          console.warn = gammel; for (const [k, o] of lagt) { const L = R.hindre.get(k), i = L.indexOf(o); if (i >= 0) L.splice(i, 1); }
          for (const P of Interior3d.aktivP()) if (P.bygg && P.bygg.i >= 5000 && P.bygg.i < 9000 && lagt.some(([, o]) => o.P === P)) Interior3d.glem(P);
          R.bane.x = bane0.x; R.bane.y = bane0.y; SS.settTilstand(T0); SS.lukk(); if (!varPå) Gange.stopp(); Interior3d.oppdater(true);
        }
        ut.advarsler = advarsler.filter(t => /interiør|spor/.test(t)); ok(ut.advarsler.length === 0, 'feil når sporene ble bygget: ' + ut.advarsler.slice(0, 2).join(' | '));
      } else ut.i3d = 'ikke prøvd (3D er av)';
      return ut;
    });
    return { ok: r.feil.length === 0, tekst: r.feil.length ? r.feil.join('; ') : `${r.hus ? `prøvehuset «${r.hus.historie}» med ${r.hus.deler} spordeler (${r.hus.ting.join(', ')}), ${r.hus.med} mot ${r.hus.uten} trekanter` : r.i3d || ''}; gatene: ${JSON.stringify(r.gate || '')}; selvtest fant ${r.selvtest} feil`, data: r };
  },
};
