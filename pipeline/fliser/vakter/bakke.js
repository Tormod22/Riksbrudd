'use strict';
// VAKT for pakka «bakke» (runde 10, 20. nov – brukerens bilder fra iPhone kl. 06): bakken, vegen, gresset og skyggene nær deg i 3D.
// (1) Kryssflatens avskårne hjørner: ingen der hjørnet ville svevd over bakken (de svarte kilene ved Kleivane) og ingen asfaltstump
//     inn i en innkjørsel (P). Selvtest: med grensen satt ut av spill (avvik = 1e9) kommer det svevende hjørnet tilbake – kontrollen finner det.
// (2) Skyggene: three.js sin skyggekode har uSkF (lysere og kortere skygger ved lav sol), og Lys3d.SKF finnes.
// (3) Gresset og plantene: forsideLys tar bort baksidens lys (gl_FrontFacing-valget) i Lambert-skyggeleggeren. Selvtest: originalen har det.
// (4) Asfalten er ikke nesten svart (grunnfargen minst 75 av 255).
// (5) I 3D (hvis på): kryssflatene i utsnittet – ingen hjørnetrekant (enkelttrekant utenfor armene) svever mer enn 0,6 m over bakken.
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
      return ut;
    });
    const ok = r.feil.length === 0;
    return { ok, tekst: ok ? `kryss ${JSON.stringify(r.kryss)}${r.i3d ? ' · 3D ' + JSON.stringify(r.i3d) : ''}` : r.feil.join('; '), data: r };
  },
};
