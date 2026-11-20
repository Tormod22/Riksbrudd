'use strict';
// VAKT for pakka «bakke» (runde 10, 20. nov – brukerens bilder fra iPhone kl. 06): bakken, vegen, gresset og skyggene nær deg i 3D.
// (1) Kryssflatens avskårne hjørner: ingen der hjørnet ville svevd over bakken (de svarte kilene ved Kleivane) og ingen asfaltstump
//     inn i en innkjørsel (P). Selvtest: med grensen satt ut av spill (avvik = 1e9) kommer det svevende hjørnet tilbake – kontrollen finner det.
// (2) Skyggene: three.js sin skyggekode har uSkF (lysere og kortere skygger ved lav sol), og Lys3d.SKF finnes.
// (3) Gresset og plantene: forsideLys tar bort baksidens lys (gl_FrontFacing-valget) i Lambert-skyggeleggeren. Selvtest: originalen har det.
// (4) Asfalten er ikke nesten svart (grunnfargen minst 75 av 255).
// (5) I 3D (hvis på): kryssflatene i utsnittet – ingen hjørnetrekant (enkelttrekant utenfor armene) svever mer enn 0,6 m over bakken.
// (6) Runde 11: vegen skåret inn i lia (Veg.skjær; selvtest: den gamle regelen gir høy fylling), kameraet utenfor trekronene
//     (KjorSpill.kroneU med et prøvetre), og i 3D: vegkantene ligger ikke under bakken.
// Endrer ingenting i spillet (KRYSS_REGLER.avvik settes tilbake).
module.exports = {
  navn: 'bakke, veg og gress',
  kjør: async (pg, profil) => {
    const r = await pg.evaluate(() => {
      const ut = { feil: [] }, ok = (v, t) => { if (!v) ut.feil.push(t); };
      const V = window.Veg;
      ok(V && typeof V.kryssFlate === 'function' && V.KRYSS_REGLER, 'Veg.kryssFlate / KRYSS_REGLER mangler');
      if (V && V.KRYSS_REGLER) {
        const z0 = P => P.map(([x, y]) => [x, y, 0]), jevn = P => (V.jevn ? V.jevn(P) : P);
        const vg = [{ k: 'E', w: 4, P: z0(jevn([[-100, 0], [0, 0]])) }, { k: 'E', w: 4, P: z0(jevn([[0, 0], [100, 0]])) }, { k: 'K', w: 2.75, P: z0(jevn([[0, 0], [0, 60]])) }];
        const tri = (v, bakke) => { const f = { pos: [], uv: [], idx: [] }; V.kryssFlate(V.finnKryss(v)[0], v, f, bakke); return f.idx.length / 3; };
        const hj = (v, bakke) => tri(v, bakke) - tri(v, () => 1e6), faller = (x, y) => (y > 0 ? -y * .4 : 0);
        const flat = hj(vg, () => 0), svev = hj(vg, faller), innk = hj(vg.map((v, i) => (i === 2 ? { ...v, k: 'P' } : v)), () => 0);
        const gammel = V.KRYSS_REGLER.avvik; let selv = 0;
        const utenHj = tri(vg, () => 1e6);
        try { V.KRYSS_REGLER.avvik = 1e9; selv = tri(vg, faller) - utenHj; } finally { V.KRYSS_REGLER.avvik = gammel; }
        ut.kryss = { flat, svev, innk, selv };
        ok(flat > 0, 'kryss på flat bakke skal ha avskårne hjørner');
        ok(svev === 0, 'et kryss der bakken faller bort fikk svevende hjørner (' + svev + ')');
        ok(innk === 0, 'en innkjørsel (P) fikk avskåret hjørne (' + innk + ')');
        ok(selv > 0, 'selvtest: uten grensen skulle det svevende hjørnet vært med');
        const medK = tri(vg, () => 1e6), medP = tri(vg.map((v, i) => (i === 2 ? { ...v, k: 'P' } : v)), () => 1e6);
        ok(medP < medK, 'innkjørselen fikk asfaltstump (' + medP + ' mot ' + medK + ' trekanter)');
      }
      ok(window.Lys3d && Lys3d.SKF && Lys3d.SKF.length === 4, 'Lys3d.SKF mangler');
      ok(window.Lys3d && Lys3d.REGLER && Lys3d.REGLER.lysLav > Lys3d.REGLER.lysHøy && Lys3d.REGLER.toneTil > Lys3d.REGLER.toneFra, 'skyggereglene (lysLav/lysHøy/toneFra/toneTil) er ikke fornuftige');
      if (typeof THREE !== 'undefined' && window.Lys3d && Lys3d.koblet) {
        const c = THREE.ShaderChunk.shadowmap_pars_fragment;
        ok(c.includes('uniform vec4 uSkF') && c.includes('distance * uSkF.w') && c.includes('mix(shadow, 1.0, uSkF.x)'), 'skyggekoden har ikke uSkF');
      }
      ok(typeof forsideLys === 'function', 'forsideLys mangler (index.html)');
      if (typeof THREE !== 'undefined' && typeof forsideLys === 'function') {
        const sh = { fragmentShader: THREE.ShaderLib.lambert.fragmentShader };
        ok(sh.fragmentShader.includes('( gl_FrontFacing ) ? vLightFront : vLightBack'), 'selvtest: Lambert-skyggeleggeren har ikke baksidevalget (three.js er endret?)');
        forsideLys(sh);
        ok(!sh.fragmentShader.includes('vLightBack') || !sh.fragmentShader.includes('( gl_FrontFacing ) ? vLightFront'), 'forsideLys tok ikke bort baksidens lys');
      }
      ok(typeof GRESS_FARGE !== 'undefined' && GRESS_FARGE.lyngBakke >= .5 && GRESS_FARGE.gress[1] < 1.4, 'gressets farger (GRESS_FARGE) mangler eller er for mettede');
      const F = window.Liv3d && Liv3d.VEG_FARGE;
      ok(F && F.asfalt && F.asfalt.every(v => v >= 75), 'asfalten er for mørk (' + (F && F.asfalt) + ')');
      // i 3D: hjørnetrekantene i kryssflatene i utsnittet
      const R = typeof R3 !== 'undefined' && R3, u = R && R.ut;
      if (R && u && typeof på3d !== 'undefined' && på3d && u.kryss && typeof nettHoyde === 'function') {
        let n = 0, svever = 0;
        R.scene.traverse(o => { if (!o.isMesh || o.isInstancedMesh || o.userData.kilde !== 'liv3d' || !o.material || o.material.polygonOffsetFactor !== -6 || !o.material.map) return;
          const p = o.geometry.attributes.position.array, ix = o.geometry.index ? o.geometry.index.array : null; if (!ix) return;
          // hjørnetrekantene har tre egne punkter som ingen annen trekant bruker; armene deler punkter mellom radene
          const bruk = new Uint8Array(p.length / 3); for (let t = 0; t < ix.length; t++) if (bruk[ix[t]] < 9) bruk[ix[t]]++;
          for (let t = 0; t < ix.length; t += 3) { const a = ix[t], b = ix[t + 1], c = ix[t + 2];
            if (bruk[a] !== 1 || bruk[b] !== 1 || bruk[c] !== 1) continue; n++;
            const mx = (p[a * 3] + p[b * 3] + p[c * 3]) / 3, my = (p[a * 3 + 1] + p[b * 3 + 1] + p[c * 3 + 1]) / 3, mz = (p[a * 3 + 2] + p[b * 3 + 2] + p[c * 3 + 2]) / 3;
            if (mz - nettHoyde(u, mx, my) > .6) svever++; } });
        ut.i3d = { hjørner: n, svever };
        ok(svever === 0, svever + ' hjørnetrekanter i kryssene svever mer enn 0,6 m over bakken');
      }
      // (runde 11) vegen skåret inn i lia: reglene på et lite gitter med en li på 40 % (selvtest: den gamle regelen gir høy fylling)
      if (V && V.skjær) {
        const N = 41, steg = 5, x0 = -100, y1 = 100, H = new Float32Array(N * N); for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) H[j * N + i] = (y1 - j * steg) * .4;
        const bil = (x, y) => { const fx = (x - x0) / steg, fy = (y1 - y) / steg, i = Math.floor(fx), j = Math.floor(fy), a = fx - i, b = fy - j, k = j * N + i; return (H[k] * (1 - a) + H[k + 1] * a) * (1 - b) + (H[k + N] * (1 - a) + H[k + N + 1] * a) * b; };
        const P = V.jevn([[-50, 2], [50, 2]]), w = 2.75, m = Math.floor(P.length / 2), gml = V.høyder(P, w, bil)[m], ny = V.senterHøyder(P, w, bil);
        const fyllFør = gml - bil(0, 2 - w), krav = V.skjærKrav(P, w, ny); V.skjær(H, N, steg, x0, y1, krav);
        let over = 0; for (let q = 0; q < krav.length; q += 3) over = Math.max(over, bil(krav[q], krav[q + 1]) - krav[q + 2]);
        const fyll = ny[m] - bil(0, 2 - w);
        ut.skjær = { fyllFør: +fyllFør.toFixed(2), fyll: +fyll.toFixed(2), over: +over.toFixed(3) };
        ok(fyllFør > 2, 'selvtest: den gamle regelen skulle gitt over 2 m fylling i lia (' + fyllFør.toFixed(2) + ')');
        ok(fyll < fyllFør * .7, 'vegen står fortsatt høyt over bakken på nedsiden (' + fyll.toFixed(2) + ' m mot ' + fyllFør.toFixed(2) + ')');
        ok(over < .03, 'bakken stikker opp gjennom vegbanen etter skjæringen (' + over.toFixed(3) + ' m)');
      }
      // (runde 11) kameraet bak bilen og trekronene: et prøvetre (gran, 20 m) – kameraet inne i kronen skal komme nærmere, fritt bak = som før
      const KS = window.KjorSpill;
      ok(KS && KS.kroneU && KS.KRONE, 'KjorSpill.kroneU / KRONE mangler (kjor.js)');
      if (KS && KS.kroneU) { const fu = { trær: { gran: new Float32Array([14, 0, 0, 20, .5]) } }, K = KS.kroneU;
        const inne = K.iKrone(fu, 16, 0, 4), ute = K.iKrone(fu, 24, 0, 4), t1 = K.treMellom(fu, 0, 0, 1.6, 14, 0, 4.5), t2 = K.treMellom(fu, 0, 0, 1.6, -9.6, 0, 4.5);
        ut.krone = { inne, ute, t1: +t1.toFixed(2), t2 };
        ok(inne && !ute, 'iKrone: punktet 2 m fra stammen skal være inne i kronen, 10 m unna ikke');
        ok(t1 < 1 && !K.iKrone(fu, 14 * t1, 0, 1.6 + 2.9 * t1), 'kameraet i trekronen kommer ikke nærmere bilen / står fortsatt i kronen (' + t1.toFixed(2) + ')');
        ok(t2 === 1, 'kameraet uten trær i veien skal stå der det står (' + t2 + ')'); }
      // i 3D: vegbanen ligger over bakken slik den tegnes (høyst 1 % av punktene med bakken mer enn 0,1 m over vegkanten)
      if (R && u && typeof på3d !== 'undefined' && på3d && u.veger && u.veger.length && typeof nettHoyde === 'function') {
        let n = 0, under = 0;
        for (const v of u.veger) { if (v.g || v.t) continue; for (let i = 1; i < v.P.length - 1; i += 3) { const p = v.P[i]; if (p[3]) continue; const a = v.P[i - 1], b = v.P[i + 1], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
          for (const o of [-1, 1]) { n++; if (nettHoyde(u, p[0] - (b[1] - a[1]) / l * v.w * o, p[1] + (b[0] - a[0]) / l * v.w * o) > p[2] + .1) under++; } } }
        ut.vegkant = { n, under, skjær: u.skjær ? { punkter: u.skjær.punkter, maks: u.skjær.maks, ms: u.skjær.ms } : null };
        ok(n === 0 || under / n < .01, under + ' av ' + n + ' vegkanter ligger under bakken');
      }
      return ut;
    });
    const ok = r.feil.length === 0;
    return { ok, tekst: ok ? `kryss ${JSON.stringify(r.kryss)} · skjær ${JSON.stringify(r.skjær)} · krone ${JSON.stringify(r.krone)}${r.vegkant ? ' · vegkant ' + JSON.stringify(r.vegkant) : ''}${r.i3d ? ' · 3D ' + JSON.stringify(r.i3d) : ''}` : r.feil.join('; '), data: r };
  },
};
