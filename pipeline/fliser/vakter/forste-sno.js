// Vakt «første snø» (R19-1, spill/snodekke.js + snøpudder i spill/vaer.js): en lett snøbyge om høsten legger et tynt lag,
// som ligger flekkvis i 2D-kartflisene (ikke alt hvitt, ikke ingenting) og i bakken i 3D (skyggekoden kompilerer, bakken blir lysere).
// Setter været, VIS.snø og 3D-bildet tilbake som det var.
module.exports = { navn: 'første snø (lett snøbyge, flekkvis snø i 2D og 3D)', kjør: async (pg, profil) => {
  const d = await pg.evaluate(async () => {
    const ut = { feil: [] }, krev = (ok, t) => { if (!ok) ut.feil.push(t); };
    if (!window.Snodekke || !window.VaerSpill || !window.Vaer) return { feil: ['Snodekke/VaerSpill mangler'] };
    const S = VaerSpill.S, før = JSON.stringify(S), førVis = VIS.snø;
    const tilbake = () => { Object.assign(S, JSON.parse(før)); VaerSpill.straks(); VIS.snø = førVis; };
    try {
      // reglene: en lett snøbyge om høsten legger et tynt lag på et par timer
      const R = Vaer.ny('høst'); Vaer.låsVær(R, 'snøpudder'); for (let t = 0; t <= 180; t += 10) Vaer.steg(R, t);
      const T = Vaer.tilstand(R, 12, 180); ut.pudder = T.pudder; krev(T.pudder > .2 && T.pudder < .6 && T.nedbør === 'snø', 'lett snø legger ikke et tynt lag: ' + T.pudder);
      krev(Vaer.VÆRREKKE.includes('snøpudder'), 'lett snø kan ikke velges i menyen');
      // visningen: uniformene og VIS.snø
      Vaer.settÅrstid(S, 'høst', tid); Vaer.låsVær(S, 'klart'); S.pudder = .35; S.pg = 250; VaerSpill.straks();
      krev(Math.abs(VAER_U.uPudder.value - .35) < 1e-6 && VAER_U.uPudderGrense.value === 250, 'uPudder settes ikke');
      krev(VIS.snø && VIS.snø.pudder > 0, 'VIS.snø (2D) settes ikke');
      // 2D: samme flis ved Dombås med og uten snø. Snøen skal gjøre flisen lysere, men flekkvis (en del av punktene, ikke alle)
      const z = 13, s = span(z), X = 193400, Y = 6896600, fx = Math.floor((X - G.x0) / s), fy = Math.floor((G.y0 - Y) / s);
      const les = async sn => { const t = await lagFlis(z, fx, fy, { ...VIS, snø: sn }); const c = document.createElement('canvas'); c.width = c.height = G.T;
        const g = c.getContext('2d'); g.drawImage(t.c, 0, 0); return g.getImageData(0, 0, G.T, G.T).data; };
      const a = await les(null), b = await les({ grense: 1350, pudder: .35, pg: 250 });
      let lysere = 0, n = 0, sumA = 0, sumB = 0;
      for (let k = 0; k < a.length; k += 4) { const la = a[k] + a[k + 1] + a[k + 2], lb = b[k] + b[k + 1] + b[k + 2]; n++; sumA += la; sumB += lb; if (lb > la + 45) lysere++; }
      ut.andel2d = +(lysere / n).toFixed(3); ut.lys2d = +((sumB - sumA) / n / 3).toFixed(1);
      krev(ut.andel2d > .04 && ut.andel2d < .9, '2D: snøen er ikke flekkvis (andel lysere punkter ' + ut.andel2d + ')');
      // 3D: bakken kompilerer med snøen og blir lysere med førstesnø enn uten (bare når 3D er bygget)
      if (typeof R3 !== 'undefined' && R3 && R3.mesh && R3.renderer && på3d) {
        const r = R3.renderer, gl = r.getContext(), W = 64, H = 40, mål = new THREE.WebGLRenderTarget(W, H), px = new Uint8Array(W * H * 4);
        // bare terrenget, rett ovenfra (uavhengig av hvor kameraet står og hva som ellers er i bildet)
        const cam = new THREE.PerspectiveCamera(50, W / H, 10, 20000); R3.mesh.geometry.computeBoundingBox(); const bb = R3.mesh.geometry.boundingBox;
        cam.up.set(0, 1, 0); cam.position.set(0, 0, bb.max.z + 900); cam.lookAt(0, 0, (bb.min.z + bb.max.z) / 2);
        const skjult = []; R3.scene.traverse(o => { if (o !== R3.mesh && o !== R3.scene && (o.isMesh || o.isPoints || o.isLine || o.isSprite) && o.visible) skjult.push(o); });
        for (const o of skjult) o.visible = false;
        const middel = () => { r.setRenderTarget(mål); r.render(R3.scene, cam); r.readRenderTargetPixels(mål, 0, 0, W, H, px); r.setRenderTarget(null); let s = 0; for (let k = 0; k < px.length; k += 4) s += px[k] + px[k + 1] + px[k + 2]; return s / (W * H * 3); };
        S.pudder = 0; VaerSpill.straks(); const uten = middel(); S.pudder = 1; S.pg = -500; VaerSpill.straks(); const med = middel();
        for (const o of skjult) o.visible = true;
        mål.dispose(); ut.lys3d = +(med - uten).toFixed(1); ut.gl = gl.getError();
        const prog = (r.info.programs || []).filter(p => p.diagnostics && !p.diagnostics.runnable).length;
        krev(prog === 0 && ut.gl === 0, '3D: skyggekoden kompilerer ikke (' + prog + ' programmer, GL-feil ' + ut.gl + ')');
        krev(ut.lys3d > 1, '3D: førstesnøen synes ikke i bakken (' + ut.lys3d + ')');
      } else ut.lys3d = 'ikke i 3D';
    } catch (e) { ut.feil.push('unntak: ' + e.message); } finally { tilbake(); }
    return ut;
  });
  return { ok: !d.feil.length, tekst: d.feil.length ? d.feil.join('; ') : `lett snø legger ${(d.pudder || 0).toFixed(2)} på tre timer; 2D: ${Math.round(d.andel2d * 100)} % av punktene får snø (flekkvis), 3D: ${d.lys3d}`, data: d };
} };
