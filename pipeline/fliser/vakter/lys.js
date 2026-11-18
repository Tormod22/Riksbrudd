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
      return ut;
    });
    const ok = r.feil.length === 0;
    const r4 = [r.normaler ? 'normaler i biter like' : '', r.vegRute ? `vegRute i biter lik (${r.vegRute.veger} veger)` : '', r.tekstur ? 'kartbildet i striper likt lerretet' : ''].filter(Boolean).join(', ');
    return { ok, tekst: ok ? `lys og skygger (${profil}): ${r.i3d ? 'skygger, fargesetting, bakke, tåke og skyer slås på og av uten GL-feil' : 'innstillingene virker (3D var av – skyggene ble ikke prøvd)'}${r4 ? '; ' + r4 : ''}` : 'lys og skygger: ' + r.feil.join('; '), data: r };
  },
};
