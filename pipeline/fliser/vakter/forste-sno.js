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
        const r = R3.renderer, gl = r.getContext(), W = 160, H = 100, mål = new THREE.WebGLRenderTarget(W, H), px = new Uint8Array(W * H * 4);
        const middel = () => { r.setRenderTarget(mål); r.render(R3.scene, R3.cam); r.readRenderTargetPixels(mål, 0, 0, W, H, px); r.setRenderTarget(null); middel.siste = px.slice(); let s = 0; for (let k = 0; k < px.length; k += 4) s += px[k] + px[k + 1] + px[k + 2]; return s / (W * H * 3); };
        // bare bakken måles: alt annet (himmel, skyer, byger og dis fra R19-2, trær, hus) skjules mens det måles – ellers kunne en
        // byge eller himmelen foran kameraet gjøre forskjellen for liten (full kjøring 25. nov: 0,8)
        const skjult = [], forfedre = new Set(); for (let p = R3.mesh && R3.mesh.parent; p; p = p.parent) forfedre.add(p);
        R3.scene.traverse(o => { if (o !== R3.scene && o !== R3.mesh && !forfedre.has(o) && !o.isLight && o.visible && !(R3.mesh && o.parent === R3.mesh)) { let p = o.parent, iMesh = false; while (p) { if (p === R3.mesh) iMesh = true; p = p.parent; } if (!iMesh) { o.visible = false; skjult.push(o); } } });
        const tåke = R3.scene.fog; R3.scene.fog = null;
        // andre vakter kan ha latt kameraets lag (Mål ytelse) eller bakkens synlighet stå: sørg for at bakken faktisk tegnes
        const lag0 = R3.cam.layers.mask, synlig0 = R3.mesh.visible; R3.cam.layers.enableAll(); R3.mesh.visible = true;
        const nf0 = [R3.cam.near, R3.cam.far, R3.cam.fov]; R3.cam.near = 1; R3.cam.far = 60000; R3.cam.fov = 50; R3.cam.updateProjectionMatrix();
        // fast kamera: nesten rett ned på hele utsnittet fra 2,6 km, midt på dagen – ikke det kameraet tilfeldigvis så på (tett skog skal ha lite snø)
        const cam = R3.cam, p0 = cam.position.clone(), q0 = cam.quaternion.clone(), t0 = tid; tid = Math.floor(tid / 1440) * 1440 + 6 * 60;
        if (window.lys3d) try { lys3d(true); } catch (e) { /* ok */ }
        // vanlig snø (over snøgrensen) skrus av mens det måles: står utsnittet høyt til fjells (Snøhetta i full kjøring, 25. nov), er alt
        // hvitt fra før, og førstesnøen gjør ingen forskjell
        // (telefon: mindre utsnitt) prøv flere høyder og bruk den som viser mest av den åpne marka
        let uten = 0, med = 0, hvite = 0, beste = 0;
        for (const hh of [600, 1200, 2600]) { cam.position.set(0, -hh * .15, hh); cam.up.set(0, 0, 1); cam.lookAt(0, 0, 0); cam.updateMatrixWorld();
          S.pudder = 0; VaerSpill.straks(); VAER_U.uSnoGrense.value = 9000; const u0 = middel(), pxUten = middel.siste; S.pudder = .6; S.pg = -500; VaerSpill.straks(); VAER_U.uSnoGrense.value = 9000; const m0 = middel(), pxMed = middel.siste;
          let h = 0; for (let k = 0; k < pxMed.length; k += 4) if (pxMed[k] + pxMed[k + 1] + pxMed[k + 2] > pxUten[k] + pxUten[k + 1] + pxUten[k + 2] + 90) h++;
          if (h >= beste) { beste = h; hvite = h; uten = u0; med = m0; ut.høyde3d = hh; } }
        R3.scene.fog = tåke; for (const o of skjult) o.visible = true;
        cam.position.copy(p0); cam.quaternion.copy(q0); cam.updateMatrixWorld(); tid = t0; R3.cam.layers.mask = lag0; R3.mesh.visible = synlig0; [R3.cam.near, R3.cam.far, R3.cam.fov] = nf0; R3.cam.updateProjectionMatrix();
        // (25. nov) i tett skog skal det være lite snø, så snittet for hele bildet sier lite: tell punkter som blir tydelig lysere
        // (hvite er talt over, for den høyden som viste mest)
        ut.hvit3d = +(hvite / (W * H)).toFixed(3);
        mål.dispose(); ut.lys3d = +(med - uten).toFixed(1); ut.gl = gl.getError();
        const prog = (r.info.programs || []).filter(p => p.diagnostics && !p.diagnostics.runnable).length;
        krev(prog === 0 && ut.gl === 0, '3D: skyggekoden kompilerer ikke (' + prog + ' programmer, GL-feil ' + ut.gl + ')');
        krev(hvite >= 8 || ut.lys3d > 1, '3D: førstesnøen synes ikke i bakken (snitt ' + ut.lys3d + ', andel tydelig lysere ' + ut.hvit3d + ', lag ' + lag0 + ', synlig ' + synlig0 + ', uSno ' + VAER_U.uSno.value + ', nær/fjern ' + nf0.join('/') + ', går ' + !!R3.fot + ', utsnitt ' + Math.round(R3.ut.cx) + ',' + Math.round(R3.ut.cy) + ' S ' + Math.round(R3.ut.S) + ', bakke ' + R3.bakkeMerke + ')');
      } else ut.lys3d = 'ikke i 3D';
    } catch (e) { ut.feil.push('unntak: ' + e.message); } finally { tilbake(); }
    return ut;
  });
  return { ok: !d.feil.length, tekst: d.feil.length ? d.feil.join('; ') : `lett snø legger ${(d.pudder || 0).toFixed(2)} på tre timer; 2D: ${Math.round(d.andel2d * 100)} % av punktene får snø (flekkvis), 3D: ${d.lys3d}`, data: d };
} };
