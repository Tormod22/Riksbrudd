'use strict';
// VAKT for pakka «lys» (18. nov): skygger fra sola, standard fargesetting, bakkens nye skyggelegger, tåke i dalene og skylaget.
// Effektene er av i testene (KVAL.fx = ingen) – vakta slår dem på, tegner to bilder, ser at alt er med uten GL-feil, slår dem av
// igjen og ser at bildet tegnes som før. Er 3D av, prøves bare det som ikke trenger 3D (3D bygges ikke her: det tar for lang tid).
// Runde 4 (hakk ved nytt utsnitt): normalerG = computeVertexNormals bit for bit, vegRuteAsynk = Vegetasjon.vegRute, og kartbildet og
// vannmasken som ble sendt til grafikkortet i striper, er like lerretet rad for rad (med to feil lagt inn med vilje som selvtest).
module.exports = {
  navn: 'lys og skygger',
  kjør: async (pg, profil) => {
    const r = await pg.evaluate(async () => {
      const ut = { feil: [] }, ok = (v, t) => { if (!v) ut.feil.push(t); };
      ok(window.KVAL && typeof KVAL.effekter === 'function' && KVAL.fx, 'KVAL.effekter/KVAL.fx mangler');
      ok(window.Lys3d && typeof Lys3d.init === 'function', 'Lys3d mangler');
      ok(window.Kvalitet && Kvalitet.FX && Kvalitet.FX.ingen.skygge[0] === 0 && !Kvalitet.NIVÅ.lav.fx, 'Lav grafikk skal ikke ha effektene');
      ok(document.getElementById('vis-effekter'), 'knappen «Lys og skygger» mangler i ☰');
      if (ut.feil.length) return ut;
      const før = KVAL.effekterPå, nivå = KVAL.valg; ut.før = før;
      ok(før || KVAL.fx.skygge[0] === 0, 'effektene skal være av til de slås på');
      // (19. nov: en vakt før denne kan ha satt i gang en ombygging – vent på den, ellers prøves skyggene aldri)
      for (let q = 0; q < 150 && typeof på3d !== 'undefined' && på3d && typeof R3 !== 'undefined' && R3 && (R3.bygger || !R3.ut); q++) await new Promise(r => setTimeout(r, 200));
      const R = typeof R3 !== 'undefined' && R3, i3d = !!(R && R.ut && R.mesh && typeof på3d !== 'undefined' && på3d && !R.bygger);
      ut.i3d = i3d;
      try {
        KVAL.bytt('høy'); KVAL.effekter(true, false);
        ok(KVAL.fx.skygge[0] > 0 && KVAL.fx.etter === 'full' && KVAL.fx.bakke, 'Høy med effektene på skal ha skygger, etterbehandling og ny bakke');
        KVAL.bytt('lav'); ok(KVAL.fx.skygge[0] === 0 && !KVAL.fx.etter, 'Lav skal ikke ha effektene selv om de er på'); KVAL.bytt('høy');
        if (i3d) {
          const gl = R.renderer.getContext(); while (gl.getError()) { /* tøm */ }
          const mg = R.målGanger; R.målGanger = null; R.lysTid = null; tegn3d(); tegn3d(); R.målGanger = mg;
          const s = Lys3d.sjekk(), f = window.Filtre && Filtre.sjekk ? Filtre.sjekk() : {}; ut.på = s; ut.filter = f;
          const dag = R.sol.intensity >= Lys3d.REGLER.minLys;
          ok(s.glFeil === 0, 'GL-feil med effektene på: ' + s.glFeil);
          if (dag) { ok(s.på && s.kart > 0, 'skyggekartet er ikke på'); ok(s.kaster > 0 && s.tar > 0, 'ingen kaster eller tar imot skygge'); ok(R.mesh.receiveShadow, 'terrenget tar ikke imot skygge'); }
          ok(Filtre.valgt() !== 'ingen' || f.standard === true, 'standard fargesetting ble ikke brukt');
          ok([].concat(R.mesh.material).every(m => m.userData.fx && m.defines && 'BAKKE_FX' in m.defines), 'bakken har ikke fått BAKKE_FX');
          ok(s.dal[0] > 0, 'tåka i dalene er ikke satt');
          ok(!window.NATT || NATT.skylag === true, 'skylaget er ikke på');
          // punkter i bildet er ikke svarte/ensfargede
          const px = new Uint8Array(4 * 9); let sum = 0, ulike = new Set();
          for (let k = 0; k < 9; k++) { const p = new Uint8Array(4); gl.readPixels(Math.floor(gl.drawingBufferWidth * (.2 + .075 * k)), Math.floor(gl.drawingBufferHeight * (.25 + .05 * k)), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, p); px.set(p, k * 4); sum += p[0] + p[1] + p[2]; ulike.add(p[0] + ',' + p[1] + ',' + p[2]); }
          ut.punkter = [sum, ulike.size];
          KVAL.effekter(false, false); R.målGanger = null; tegn3d(); R.målGanger = mg;
          const a = Lys3d.sjekk(); ut.av = a;
          ok(!a.på && a.kart === 0 && a.dal[0] === 0 && a.glFeil === 0, 'effektene ble ikke slått helt av');
          ok(!R.mesh.receiveShadow, 'terrenget tar fortsatt imot skygge');
          ok([].concat(R.mesh.material).every(m => !m.userData.fx), 'bakken har fortsatt BAKKE_FX');
          ok(!window.Filtre || !Filtre.sjekk().standard, 'standard fargesetting er fortsatt på');
          ok(R.skyer.visible === true, 'det gamle skybildet kom ikke tilbake');
        }
      } catch (e) { ut.feil.push('unntak: ' + (e && e.message || e)); }
      finally { KVAL.effekter(før, false); KVAL.bytt(nivå); }
      // RUNDE 4 (18. nov, hakk ved nytt utsnitt): det som nå lages i biter, skal gi det samme som før.
      try {
        // (1) normalerG = three.js sin computeVertexNormals, bit for bit, med og uten indeks
        if (typeof THREE !== 'undefined' && typeof normalerG === 'function' && typeof kjørRett === 'function') {
          let f = 7; const rnd = () => (f = (f * 16807) % 2147483647) / 2147483647;
          const a = new THREE.PlaneGeometry(100, 100, 40, 40), p = a.attributes.position; for (let k = 0; k < p.count; k++) p.setZ(k, rnd() * 9);
          const b = a.clone(), c = a.toNonIndexed(), d = c.clone();
          a.computeVertexNormals(); kjørRett(normalerG(b)); c.computeVertexNormals(); kjørRett(normalerG(d));
          const lik = (x, y) => { const A = x.attributes.normal.array, B = y.attributes.normal.array; if (A.length !== B.length) return false; for (let i = 0; i < A.length; i++) if (A[i] !== B[i]) return false; return true; };
          ok(lik(a, b), 'normalerG gir andre normaler enn three.js (med indeks)'); ok(lik(c, d), 'normalerG gir andre normaler enn three.js (uten indeks)');
          // feil med vilje: ett hjørne flyttet gir ulike normaler (sammenligningen virker)
          b.attributes.position.setZ(5, 50); kjørRett(normalerG(b)); ok(!lik(a, b), 'selvtest: normalene ble like selv med et flyttet hjørne');
          for (const g of [a, b, c, d]) g.dispose(); ut.normaler = true;
        }
        // (2) vegRuteAsynk (vegetasjon3d.js) = Vegetasjon.vegRute, på utsnittets veger eller på prøveveger
        if (window.Vegetasjon3d && Vegetasjon3d.vegRuteAsynk && window.Vegetasjon && Vegetasjon.vegRute) {
          const R2 = typeof R3 !== 'undefined' && R3, veger = R2 && R2.ut && R2.ut.veger && R2.ut.veger.length ? R2.ut.veger
            : [{ k: 'R', by: true, P: [[0, 0], [80, 30], [160, 20]] }, { k: 'K', by: false, P: [[-50, 90], [40, -60]] }, { k: 'P', P: [[10, 10], [12, 200]] }];
          const A = Vegetasjon.vegRute(veger), B = await Vegetasjon3d.vegRuteAsynk(veger); let ulik = 0, sanne = 0, f2 = 3;
          const rnd = () => (f2 = (f2 * 16807) % 2147483647) / 2147483647, S = R2 && R2.ut ? R2.ut.S : 220;
          for (let k = 0; k < 4000; k++) { const x = (rnd() * 2 - 1) * S, y = (rnd() * 2 - 1) * S, e = rnd() * 4, a = A(x, y, e); if (a !== B(x, y, e)) ulik++; if (a) sanne++; }
          // også punkter rett ved vegene (der svaret er sant)
          for (const v of veger.slice(0, 200)) { const q = v.P[0]; for (const [dx, dy] of [[0, 0], [1.5, 0], [0, 3], [6, 6]]) { const a = A(q[0] + dx, q[1] + dy); if (a !== B(q[0] + dx, q[1] + dy)) ulik++; if (a) sanne++; } }
          ok(ulik === 0, `vegRuteAsynk svarer ulikt Vegetasjon.vegRute i ${ulik} punkter`); ok(sanne > 0, 'vegRute: ingen punkter nær veg ble prøvd');
          ut.vegRute = { veger: veger.length, sanne, ulik };
        }
        // (3) kartbildet og vannmasken sendt i striper (lastOppIBiter): på grafikkortet står det samme som i lerretet, rad for rad
        const R = typeof R3 !== 'undefined' && R3;
        if (R && R.ut && R.tex && typeof på3d !== 'undefined' && på3d && !R.bygger) {
          const r = R.renderer, gl = r.getContext(), tx = {};
          for (const [navn, tex, c] of [['kart', R.tex, R.ut.base], ['vann', R.vannTex, R.ut.vann]]) {
            if (!tex || !c) continue; const t = r.properties.get(tex).__webglTexture, W = c.width, g = c.getContext('2d'), fb = gl.createFramebuffer();
            gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
            const fullt = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE, buf = new Uint8Array(W * 4); let ulik = 0, snudd = 0;
            if (fullt) for (const rad of [0, 255, 256, W >> 1, W - 257, W - 1]) { gl.readPixels(0, rad, W, 1, gl.RGBA, gl.UNSIGNED_BYTE, buf);
              const d = g.getImageData(0, W - 1 - rad, W, 1).data, e = g.getImageData(0, rad, W, 1).data;
              for (let i = 0; i < W * 4; i++) { if (d[i] !== buf[i]) ulik++; if (e[i] !== buf[i]) snudd++; } }
            gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.deleteFramebuffer(fb); r.resetState();
            tx[navn] = { fullt, ulik, snudd, iBiter: !!tex.iBiter, bilde: tex.image === c };
            if (fullt) { ok(ulik === 0, `${navn}bildet på grafikkortet er ulikt lerretet i ${ulik} verdier`);
              // feil med vilje: uten snuingen blir radene ulike (sammenligningen virker – bildet er ikke likt opp-ned)
              ok(snudd > 0, `selvtest: ${navn}bildet var likt også uten snuing`); }
            ok(tex.image === c, `${navn}teksturens bilde er ikke utsnittets lerret`);
            if (R.forberedt) ok(tex.iBiter, `${navn}bildet ble ikke sendt i striper (forberedt utsnitt)`);
          }
          ok(gl.getError() === 0, 'GL-feil etter kontrollen av kartbildet'); ut.tekstur = tx;
        }
      } catch (e) { ut.feil.push('unntak (runde 4): ' + (e && e.message || e)); }
      // RUNDE 5 (19. nov): grensa i 3D, hindring3d med boksen først, lysflekkene forberedt
      try {
        // (1) grensa: bare på et mindre spillkart. Her (Dovre/Norge) skal ingen skyggelegger ha fått oppslaget, og mørket er 0.
        ok(window.Grense3d && typeof Grense3d.maske === 'function', 'Grense3d mangler');
        const påOmr = typeof PÅ_OMRÅDE !== 'undefined' && PÅ_OMRÅDE;
        if (typeof THREE !== 'undefined' && window.Lys3d && Lys3d.koblet) ok(påOmr ? /uRgF/.test(THREE.ShaderChunk.fog_fragment) : !/uRgF/.test(THREE.ShaderChunk.fog_fragment), 'tåka har feil oppslag for grensa');
        if (!påOmr && window.Lys3d && Lys3d.RG) ok(Lys3d.RG.F[0] === 0 && !Lys3d.RG.tex, 'grensa er koblet på en side uten område');
        // masken for en prøvefirkant: midten inne, langt ute ute, kanten midt mellom; et hull med vilje blir funnet
        if (window.Grense3d) { const O = { navn: 'prøve', bb: [0, 0, 3000, 2000], P: [[0, 0], [3000, 0], [3000, 2000], [0, 2000]] }, M = Grense3d.maske(O, { ...Grense3d.REGLER, punkter: 128 });
          const v = (x, y) => Grense3d.verdi(M, x, y); ok(v(1500, 1000) > .99 && v(-2500, 1000) < .01 && v(1500, 4500) < .01 && v(0, 1000) > .2 && v(0, 1000) < .8, 'masken for prøvefirkanten er feil: ' + [v(1500, 1000), v(-2500, 1000), v(0, 1000)].map(x => x.toFixed(2)));
          const F = { ...M, d: M.d.slice() }, i = Math.floor((1500 - M.x0) / M.ts), j = Math.floor((1000 - M.y0) / M.ts); for (let b = j - 2; b <= j + 2; b++) for (let a = i - 2; a <= i + 2; a++) F.d[b * M.W + a] = 0;
          ok(Grense3d.verdi(F, 1500, 1000) < .5, 'selvtest: et hull i masken ble ikke sett');
          ut.grense = { W: M.W, H: M.H, side: påOmr ? 'område' : 'uten område' }; }
        // (2) hindring3d med boksen rundt omrisset (hindringer) svarer likt som uten boksen – prøvehus med mange hjørner
        if (typeof hindringer === 'function' && typeof hindring3d === 'function') {
          let f3 = 11; const rnd = () => (f3 = (f3 * 16807) % 2147483647) / 2147483647, omriss = [];
          for (let h = 0; h < 40; h++) { const cx = rnd() * 600 - 300, cy = rnd() * 600 - 300, n = 4 + Math.floor(rnd() * 14), P = []; for (let k = 0; k < n; k++) { const v = k / n * 6.283, r = 4 + rnd() * 14; P.push([cx + Math.cos(v) * r, cy + Math.sin(v) * r]); } omriss.push(P); }
          const H = hindringer({ hus: { omriss } }), U = new Map(); for (const [k, l] of H) U.set(k, l.map(o => o.P ? { P: o.P } : o));
          let ulik = 0, inne = 0; for (let k = 0; k < 20000; k++) { const x = rnd() * 680 - 340, y = rnd() * 680 - 340, a = hindring3d(x, y, H); if (a !== hindring3d(x, y, U)) ulik++; if (a) inne++; }
          ok(ulik === 0 && inne > 100, `hindring3d med boksen svarer ulikt i ${ulik} punkter (${inne} inne)`);
          // feil med vilje: en for liten boks gir ulike svar (sammenligningen virker)
          const G = new Map(); for (const [k, l] of H) G.set(k, l.map(o => o.P ? { P: o.P, bb: [o.bb[0] + 3, o.bb[1] + 3, o.bb[2] - 3, o.bb[3] - 3] } : o));
          let ulikG = 0; f3 = 11; for (let k = 0; k < 20000; k++) { const x = rnd() * 680 - 340, y = rnd() * 680 - 340; if (hindring3d(x, y, G) !== hindring3d(x, y, U)) ulikG++; }
          ok(ulikG > 0, 'selvtest: en for liten boks ga samme svar'); ut.hindring = { inne, ulik };
        }
        // (3) lysflekkene under gatelysene og vinduslyset: nettene har de plassene som regnes nå (forberedt i forbered3d)
        const R5 = typeof R3 !== 'undefined' && R3;
        if (R5 && R5.ut && !R5.bygger && window.NATT && NATT.plass && typeof på3d !== 'undefined' && på3d) {
          const P = NATT.plass(R5.ut, R5), lik = (a, b) => { if (!a || !b || a.length !== b.length) return false; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false; return true; };
          if (R5.nattLys && P.lys) ok(lik(R5.nattLys.flekk.instanceMatrix.array, P.lys.mat) && lik(R5.nattLys.glød.geometry.attributes.position.array, P.lys.gp), 'lysflekkene under gatelysene står ikke der de skal');
          ut.natt = { lys: P.lys ? P.lys.n : 0, lys2: P.lys2 ? P.lys2.n : 0, forberedt: !!NATT.forberedt };
        }
      } catch (e) { ut.feil.push('unntak (runde 5): ' + (e && e.message || e)); }
      // RUNDE 7 (20. nov natt, hakk når du går): interiøret bygges i biter, og huset blir likt det som bygges i ett strekk
      // (samme rom, møbler, trekanter og hvert hjørne). Et prøvehus legges i utsnittet; alt settes tilbake.
      try {
        const R = typeof R3 !== 'undefined' && R3;
        if (R && R.ut && R.hindre && typeof på3d !== 'undefined' && på3d && !R.bygger && window.Interior3d && Interior3d.prøvBygg && window.Gange) {
          const u = R.ut, x0 = 40, y0 = 60, P = [[x0, y0], [x0 + 10, y0], [x0 + 10, y0 + 8], [x0, y0 + 8]]; P.bygg = { i: 4747, t: 0, h: 6, kl: 'hus' };
          P.dør = { x: x0 + 5, y: y0, ux: 1, uy: 0, w: 1, hh: 2.1, z0: (hoyde3d(u.cx + x0 + 5, u.cy + y0 + 4, u) - u.h0) * R.EX };
          const o = { P }, nøkler = [], gikk = !!R.fot, bane = { ...R.bane }, kr = gikk && Gange.kropp() ? { ...Gange.kropp() } : null, r7 = {};
          const tall = q => ({ rom: q.plan.rom.length, møbler: q.plan.møbler.length, trekanter: q.trekanter, nett: q.nett.length, a: q.nett[0].geometry.attributes.position.array });
          const lik = (A, B) => { if (!A || !B || A.length !== B.length) return false; for (let i = 0; i < A.length; i++) if (A[i] !== B[i]) return false; return true; };
          const vent = ms => new Promise(r => setTimeout(r, ms));
          try {
            // (1) generatoren i ett strekk og steg for steg gir det samme
            const a = Interior3d.prøvBygg(P, false), b = Interior3d.prøvBygg(P, true), ta = tall(a.o), tb = tall(b.o);
            r7.steg = b.biter; ok(b.biter > 20, `interiøret har bare ${b.biter} steg`);
            ok(ta.rom === tb.rom && ta.møbler === tb.møbler && ta.trekanter === tb.trekanter && ta.nett === tb.nett && lik(ta.a, tb.a), 'interiøret steg for steg er ulikt det i ett strekk');
            // feil med vilje: ett hjørne flyttet blir sett (sammenligningen virker)
            const kopi = ta.a.slice(); kopi[7] += .01; ok(!lik(kopi, tb.a), 'selvtest: et flyttet hjørne ble ikke sett');
            Interior3d.kast(b.o);
            // (2) den ekte veien: du går ved huset, jobben tar én bit om gangen (som hvert bilde gjør), og huset blir likt
            for (let a2 = Math.floor(x0 / 20); a2 <= Math.floor((x0 + 10) / 20); a2++) for (let c = Math.floor(y0 / 20); c <= Math.floor((y0 + 8) / 20); c++) { const k = a2 + ',' + c; if (!R.hindre.has(k)) R.hindre.set(k, []); R.hindre.get(k).push(o); nøkler.push(k); }
            if (!gikk) Gange.start();
            const sett = (x, y) => { R.bane.x = x; R.bane.y = y; const k = Gange.kropp(); if (k) { k.x = x; k.y = y; k.vx = k.vy = 0; } if (R.fot) { R.fot.a = 0; R.fot.pitch = 0; } };
            for (let q = 0; q < 400 && Interior3d.jobb(); q++) Interior3d.drivBit(20);
            sett(x0 + 5, y0 - 5); Interior3d.nullstillStat(); await vent(280);
            if (!P.inne && !Interior3d.jobb()) Interior3d.oppdater(false);
            let n = 0; while (Interior3d.jobb() && n < 4000) { Interior3d.drivBit(4); n++; }
            const st = Interior3d.stat(), oo = Interior3d.aktive().find(q => q.plan === P.inne); r7.biter = st.sist ? st.sist.biter : 0; r7.lengst = st.lengst; r7.sist = st.sist;
            ok(!!oo, 'prøvehuset fikk ikke interiør på den ekte veien');
            ok(st.sist && st.sist.biter > 3, 'interiøret ble ikke bygget i biter: ' + JSON.stringify(st.sist));
            if (oo) { const tc = tall(oo); ok(tc.rom === ta.rom && tc.møbler === ta.møbler && tc.trekanter === ta.trekanter && lik(tc.a, ta.a), 'interiøret bygget i biter er ulikt det i ett strekk'); r7.hus = { rom: tc.rom, møbler: tc.møbler, trekanter: tc.trekanter }; }
            // (3) du går fra huset: det hviler; du snur: det samme nettet kommer tilbake uten ny bygging
            if (oo) { const g1 = oo.nett[0].geometry; sett(x0 + 5, y0 - 80); Interior3d.oppdater(true); ok(!P.inne && Interior3d.stat().hvile >= 1, 'interiøret hviler ikke når du går fra det');
              sett(x0 + 5, y0 - 5); Interior3d.oppdater(true); const o2 = Interior3d.aktive().find(q => q.plan === P.inne); ok(!!o2 && o2.nett[0].geometry === g1 && Interior3d.stat().gjenbrukt >= 1, 'interiøret ble bygget på nytt i stedet for å komme tilbake');
              // møbelflytting (bygOm) glemmer de hvilende og bygger på nytt i ett strekk som før
              ok(Interior3d.bygOm(4747) === true && !!P.inne && Interior3d.stat().hvile === 0, 'bygOm virket ikke som før'); }
            Interior3d.kast(a.o);
          } finally {
            Interior3d.glem(P); for (const k of nøkler) { const L = R.hindre.get(k), q = L ? L.indexOf(o) : -1; if (q >= 0) L.splice(q, 1); }
            if (!gikk) Gange.stopp(); else { Object.assign(R.bane, bane); const k = Gange.kropp(); if (k && kr) Object.assign(k, kr); }
            Interior3d.oppdater(true); Interior3d.nullstillStat();
          }
          ut.r7 = r7;
        }
      } catch (e) { ut.feil.push('unntak (runde 7): ' + (e && e.message || e)); }
      return ut;
    });
    const ok = r.feil.length === 0;
    const r4 = [r.normaler ? 'normaler i biter like' : '', r.vegRute ? `vegRute i biter lik (${r.vegRute.veger} veger)` : '', r.tekstur ? 'kartbildet i striper likt lerretet' : '', r.grense ? 'grensemasken riktig' : '', r.hindring ? 'hindring3d med boks lik' : '', r.natt ? `lysflekkene på plass (${r.natt.lys})` : '', r.r7 ? `interiøret i ${r.r7.biter} biter likt det i ett strekk (${r.r7.hus ? r.r7.hus.trekanter : '?'} trekanter, lengste bit ${Math.round(r.r7.lengst || 0)} ms), hviler og kommer tilbake` : ''].filter(Boolean).join(', ');
    return { ok, tekst: ok ? `lys og skygger (${profil}): ${r.i3d ? 'skygger, fargesetting, bakke, tåke og skyer slås på og av uten GL-feil' : 'innstillingene virker (3D var av – skyggene ble ikke prøvd)'}${r4 ? '; ' + r4 : ''}` : 'lys og skygger: ' + r.feil.join('; '), data: r };
  },
};
