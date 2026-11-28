'use strict';
// VAKT for pakka «etasjer» (fase B2 i docs/plan-selskap-okonomi.md: du kan bruke alle etasjene – i 2D og i 3D).
// Testsiden har ingen husdata, så vakta legger inn et prøvehus (leilighetsbygg 14 × 9 m, 13 m høyt: kjeller, 1–3, loft).
//  2D (uten 3D): karakteren går til 2. etasje gjennom trappa (Etasjer2D.gåTil – Spill2D.gåTil og veien i huset), etasjevelgeren
//    sier «Du er i 2. etasje», letingen der gir etasjens eget funn (kommandoen «etasjeLet», huskes i «riksbrudd-etasjer»), og
//    1. etasje er fortsatt ikke gjennomsøkt. Selvtest: 2. etasje kan ikke letes på nytt.
//  3D (når 3D er på): prøvehuset får interiør med modellen (P.etasjer), du går opp trappa med bevegelsesreglene (Bevegelse.steg og
//    Interior3d.høyde), står i 2. etasje (høyden = 1. etasjes gulv + etasjens z), etasjene over er skjult (den rett over bare når du
//    står ved en trapp opp), letingen i 2. etasje virker, en vegg i 2. etasje
//    stopper deg, og ingen feil i konsollen.
// Alt settes tilbake (kameraet, karakteren, lageret, maten, kassa, lagringen, prøvehuset, hindringene, gangen).
module.exports = {
  navn: 'etasjer (2D og 3D)',
  kjør: async (pg, profil) => {
    const r = await pg.evaluate(async () => {
      const ut = { feil: [] }, ok = (v, t) => { if (!v) ut.feil.push(t); };
      const P2 = window.Plantegning2D, E = window.Etasjer, E2 = window.Etasjer2D;
      ok(P2 && E && E2 && window.Etasjer3d, 'Etasjer/Etasjer2D/Etasjer3d/Plantegning2D mangler');
      if (!P2 || !E || !E2) return ut;
      const vent = ms => new Promise(r => setTimeout(r, ms)), i = 990555, i3d = typeof på3d !== 'undefined' && på3d;
      const S0 = OppstartSpill.tilstand(), lx = S0 && S0.leir ? S0.leir.x : kam.x, ly = S0 && S0.leir ? S0.leir.y : kam.y;
      const k = Spill2D.karakter(), L = window.LeirSpill && LeirSpill.tilstand(), F = window.FolkSpill && FolkSpill.tilstand();
      const før = { kam: { x: kam.x, y: kam.y, m: kam.m }, fokus: P2.S.fokus, etasje: P2.S.etasje, k: k ? { x: k.x, y: k.y } : null, lager: L && L.lager ? Object.assign({}, L.lager) : null,
        drivstoff: L ? L.drivstoff : 0, mat: F ? F.mat : 0, penger: S0 ? S0.penger : 0, ls: localStorage.getItem('riksbrudd-etasjer'), lett: window.LeteSpill ? new Map(LeteSpill.lett()) : null };
      const advarsler = [], gammel = console.warn; console.warn = (...a) => { advarsler.push(a.join(' ')); gammel.apply(console, a); };
      try {
        if (!i3d) {
          // ---------- 2D ----------
          const x = lx + 140, y = ly - 70, Pv = [[x, y], [x + 14, y], [x + 14, y + 9], [x, y + 9]], e = { i, t: 10, h: 13 };
          P2.prøvehus(Pv, e); P2.seInn({ Pv, e });
          for (let q = 0; q < 80; q++) { await vent(120); const h = P2.hus(i); if (h && (h.klar || h.feil)) break; }
          const h = P2.hus(i), m = h && h.m; ok(m && m.etasjer.length >= 3, 'prøvehuset fikk ikke flere etasjer: ' + (m ? m.etasjer.length : h && h.feil));
          ut.etasjer = m ? m.etasjer.map(q => q.kjeller ? 'K' : q.loft ? 'L' : String(q.n)).join(' ') : '';
          ok(!!k, 'ingen karakter i kartet'); if (!m || !k) return ut;
          // karakteren står like utenfor huset (gåTil går da rett inn), og så til 2. etasje
          k.x = x + 7; k.y = y - 6; P2.S.etasje = 2; P2.visVelger(); await vent(100);
          const kn = document.querySelector('#plan2d [data-et="gå"]'); ok(!!kn, 'etasjevelgeren har ikke «Gå til 2. etasje»'); if (kn) kn.click(); else E2.gåTil(h, 2);
          for (let q = 0; q < 120 && (E2.S.gang || E2.S.n !== 2); q++) { await vent(100); E2.spol(); }
          ut.etasje2d = E2.S.n; ok(E2.S.hus === i && E2.S.n === 2 && !E2.S.gang, 'karakteren kom ikke til 2. etasje: ' + JSON.stringify({ hus: E2.S.hus, n: E2.S.n, gang: !!E2.S.gang }));
          // karakteren står inne i huset, ved toppen av trappa
          const t = m.trapper.find(q => q.fra === 1 && q.til === 2); ok(!!t && Math.hypot(k.x - (h.o[0] + t.oppe[0]), k.y - (h.o[1] + t.oppe[1])) < .6, 'karakteren står ikke ved toppen av trappa');
          P2.visVelger(); await vent(50); ut.velger = (document.getElementById('plan2d') || {}).textContent || '';
          ok(/Du er i 2\. etasje/.test(ut.velger), 'velgeren sier ikke «Du er i 2. etasje»: ' + ut.velger.slice(-80));
          // leting i 2. etasje (spoles fram): eget funn, 1. etasje er urørt
          const funn = E.funn(h.info.kl, h.A, i, E.etasje(m, 2)); ut.funn = funn;
          const lk = document.querySelector('#plan2d [data-et="let"]'); ok(!!lk, 'ingen «Let gjennom 2. etasje»'); if (lk) lk.click(); else E2.let2d(h, 2);
          for (let q = 0; q < 40 && E2.S.leter; q++) { E2.spol(); await vent(150); }
          ok(E2.erLett(h, 2), '2. etasje ble ikke merket som gjennomsøkt');
          ok(!(window.LeteSpill && LeteSpill.lett().has(i)), '1. etasje ble merket som gjennomsøkt');
          const lagret = JSON.parse(localStorage.getItem('riksbrudd-etasjer') || 'null'); ok(lagret && lagret.lett && lagret.lett[i + ':2'] !== undefined, 'letingen ble ikke lagret');
          if (window.LeteSpill && LeteSpill.lukkFunn) LeteSpill.lukkFunn();
          // selvtest: samme etasje kan ikke letes igjen
          ut.selvtest = !E2.let2d(h, 2); ok(ut.selvtest, 'selvtest: 2. etasje kunne letes to ganger');
          // ned igjen til 1. etasje
          E2.gåTil(h, 1); for (let q = 0; q < 80 && (E2.S.gang || E2.S.n !== 1); q++) { await vent(100); E2.spol(); }
          ok(E2.S.n === 1, 'kom ikke ned til 1. etasje');
        } else if (typeof R3 !== 'undefined' && R3 && R3.ut && R3.hindre && window.Interior3d && window.Gange && window.Bevegelse) {
          // ---------- 3D ----------
          const R = R3, u = R.ut, varPå = !!R.fot, lagt = [], bane0 = { x: R.bane.x, y: R.bane.y };
          const x0 = 70, y0 = -90, w = 14, d = 9, P = [[x0, y0], [x0 + w, y0], [x0 + w, y0 + d], [x0, y0 + d]];
          P.bygg = { i, t: 10, h: 13, kl: 'leil', tett: 0 };
          const z0 = (hoyde3d(u.cx + x0 + w / 2, u.cy + y0 - 3, u) - u.h0) * R.EX;
          P.dør = { x: x0 + w / 2, y: y0, ux: 1, uy: 0, w: 1.2, hh: 2.1, z0 };
          const o = { P }; for (let a = Math.floor(x0 / 20); a <= Math.floor((x0 + w) / 20); a++) for (let c = Math.floor(y0 / 20); c <= Math.floor((y0 + d) / 20); c++) { const kk = a + ',' + c; if (!R.hindre.has(kk)) R.hindre.set(kk, []); R.hindre.get(kk).push(o); lagt.push([kk, o]); }
          // prøvehuset i plantegningen også (samme modell i 2D og 3D)
          P2.prøvehus(P.map(p => [p[0] + u.cx, p[1] + u.cy]), { i, t: 10, h: 13 });
          try {
            if (!R.fot) Gange.start();
            // først 20 m unna: interiøret kommer, men modellen venter (hus du går forbi, betaler ikke for den)
            const kr = Gange.kropp(); R.bane.x = kr.x = x0 + w / 2; R.bane.y = kr.y = y0 - 20;
            for (let q = 0; q < 20 && !P.inne; q++) Interior3d.oppdater(true);
            ok(!!P.inne, 'prøvehuset fikk ikke interiør i 3D'); if (!P.inne) return ut;
            ut.vent = !!P.etasjerVent; ok(P.etasjerVent && !P.etasjer, 'modellen ble laget for et hus 20 m unna');
            // så nær døra: interiøret bygges på nytt med modellen
            R.bane.y = kr.y = y0 - 3; Etasjer3d.steg();
            for (let q = 0; q < 20 && !(P.inne && P.etasjer); q++) Interior3d.oppdater(true);
            ok(!!P.etasjer, 'interiøret fikk ikke byggemodellen (P.etasjer)');
            const h = P2.hus(i), m = h && h.m; ok(m && m.etasjer.length >= 3, 'ingen modell med flere etasjer');
            if (!m || !P.etasjer) return ut;
            ut.like = P.etasjer.like; ut.fjernet = P.etasjer.fjernet;
            ok(P.inne.hullUV && P.inne.hullUV.tak.length >= 1, 'himlingen i 1. etasje har ikke hull for trappa');
            const { ox, oy } = P.etasjer, t = m.trapper.find(q => q.fra === 1 && q.til === 2), g0 = P.inne.gulv, e2 = E.etasje(m, 2);
            // inn i huset ved foten av trappa
            kr.x = t.nede[0] + ox; kr.y = t.nede[1] + oy; kr.z = g0; kr.vx = kr.vy = 0; kr.bakke = true; Etasjer3d.steg();
            ok(!!Etasjer3d.aktiv(), 'etasjene ble ikke tatt i bruk når du sto inne'); Etasjer3d.ferdig(); Etasjer3d.steg();
            // gå opp trappa med bevegelsesreglene (samme verden som gange.js)
            const terr = (x, y) => (hoyde3d(u.cx + x, u.cy + y) - u.h0) * R.EX;
            const verden = { høyde: (x, y) => { const g = Interior3d.høyde(x, y, terr); return g !== null ? g : terr(x, y); }, trapp: (x, y) => Interior3d.påTrapp(x, y), hindring: (x, y) => hindring3d(x, y), vann: () => false };
            const mål = [t.oppe[0] + ox, t.oppe[1] + oy]; let maksZ = -1e9;
            for (let s = 0; s < 400; s++) { const a = Math.atan2(-(mål[0] - kr.x), mål[1] - kr.y); Bevegelse.steg(kr, { fram: 1, side: 0, retning: a }, .05, verden); Etasjer3d.steg(); maksZ = Math.max(maksZ, kr.z);
              if (Math.hypot(mål[0] - kr.x, mål[1] - kr.y) < .15) break; }
            for (let s = 0; s < 30; s++) { Bevegelse.steg(kr, { fram: 0, side: 0, retning: 0 }, .05, verden); Etasjer3d.steg(); }
            ut.etasje3d = Etasjer3d.etasje(); ut.z = Math.round((kr.z - g0) * 100) / 100; ut.mål = e2.z; ut.form = t.form;
            ok(Etasjer3d.etasje() === 2, 'du kom ikke til 2. etasje i 3D (etasje ' + Etasjer3d.etasje() + ', ' + Math.hypot(mål[0] - kr.x, mål[1] - kr.y).toFixed(2) + ' m fra toppen)');
            ok(Math.abs(kr.z - g0 - e2.z) < .15, `høyden i 2. etasje er ${ut.z} m over 1. etasje, ikke ${e2.z}`);
            // nettene: 2. etasje synlig, etasjen over skjult
            const N = Etasjer3d.nett(); ut.nett = N; const n2 = N.find(q => q.n === 2), n3 = N.find(q => q.n === 3);
            ok(n2 && n2.synlig && n2.trekanter > 200, '2. etasje er ikke bygget/synlig i 3D'); ok(!n3 || !n3.synlig || Etasjer3d.aktiv().vedOpp, 'etasjen over er synlig (og du står ikke ved en trapp opp)');
            ok(!N.some(q => q.n > 3 && q.synlig), 'etasjer høyere opp er synlige');
            // en yttervegg i 2. etasje stopper deg (ingen dør der)
            const wv = e2.vegger.find(q => q.type !== 'skille'), mx = (wv.a[0] + wv.b[0]) / 2 + ox, my = (wv.a[1] + wv.b[1]) / 2 + oy;
            ok(Interior.blokkert(P.inne, mx, my), 'ytterveggen i 2. etasje stopper deg ikke'); ok(!Interior.blokkert(P.inne, kr.x, kr.y), 'du står fast der du står');
            // leting i 2. etasje i 3D (samme kommando som i 2D; knappen #etasjeknapp)
            { const hh = E2.husAv(i); ok(hh && E2.let2d(hh, 2), 'letingen i 2. etasje startet ikke i 3D'); for (let q = 0; q < 30 && E2.S.leter; q++) { E2.spol(); await vent(150); }
              ut.lett3d = !!(hh && E2.erLett(hh, 2)); ok(ut.lett3d, '2. etasje ble ikke gjennomsøkt i 3D'); if (window.LeteSpill && LeteSpill.lukkFunn) LeteSpill.lukkFunn(); }
            // og ned igjen: etasjen blir 1 og høyden 1. etasjes gulv
            const nedM = [t.nede[0] + ox, t.nede[1] + oy];
            for (let s = 0; s < 400; s++) { const a = Math.atan2(-(nedM[0] - kr.x), nedM[1] - kr.y); Bevegelse.steg(kr, { fram: 1, side: 0, retning: a }, .05, verden); Etasjer3d.steg(); if (Math.hypot(nedM[0] - kr.x, nedM[1] - kr.y) < .15) break; }
            for (let s = 0; s < 30; s++) { Bevegelse.steg(kr, { fram: 0, side: 0, retning: 0 }, .05, verden); Etasjer3d.steg(); }
            ut.ned = { etasje: Etasjer3d.etasje(), z: Math.round((kr.z - g0) * 100) / 100 }; ok(Etasjer3d.etasje() === 1 && Math.abs(kr.z - g0) < .15, 'ned trappa: ' + JSON.stringify(ut.ned));
            ut.stat = Etasjer3d.STAT;
          } finally {
            Etasjer3d.kast(); Interior3d.glem(P); for (const [kk, oo] of lagt) { const A = R.hindre.get(kk), j = A ? A.indexOf(oo) : -1; if (j >= 0) A.splice(j, 1); }
            R.bane.x = bane0.x; R.bane.y = bane0.y; if (!varPå && R.fot && Gange.stopp) Gange.stopp();
          }
        } else ut.hoppet = '3D er på, men uten utsnitt/gange';
        ok(!advarsler.some(a => /etasjer|interiør/.test(a)), 'advarsler: ' + advarsler.filter(a => /etasjer|interiør/.test(a)).slice(0, 2).join(' | '));
      } finally {
        console.warn = gammel;
        E2.nullstill(); P2.fjernPrøve(i); P2.S.fokus = før.fokus; P2.S.etasje = før.etasje; P2.visVelger && P2.visVelger();
        if (før.k && k) { k.x = før.k.x; k.y = før.k.y; k.sti = []; }
        if (før.lager && L) { L.lager = før.lager; L.drivstoff = før.drivstoff; } if (F) F.mat = før.mat;
        const S1 = OppstartSpill.tilstand(); if (S1 && S1.penger !== før.penger) { const dk = S1.penger - før.penger; if (dk > 0 && OppstartSpill.betal) OppstartSpill.betal(dk); }
        if (før.ls === null) localStorage.removeItem('riksbrudd-etasjer'); else localStorage.setItem('riksbrudd-etasjer', før.ls); E2.les();
        if (window.LeteSpill && LeteSpill.lukkFunn) LeteSpill.lukkFunn();
        kam.x = før.kam.x; kam.y = før.kam.y; kam.m = før.kam.m; skitten = true;
      }
      return ut;
    });
    return { ok: r.feil.length === 0, tekst: r.feil.length ? r.feil.join('; ') : `etasjer: ${r.etasjer || ''} 2D etasje ${r.etasje2d || '-'}; 3D etasje ${r.etasje3d || '-'} (${r.z !== undefined ? r.z + ' m' : '-'}, ${r.form || ''})`, data: r };
  },
};
