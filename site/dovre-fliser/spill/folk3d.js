/* Riksbrudd – FOLKENE I LEIREN SOM FIGURER (16. nov, brukeren: «mer detaljerte karakterer»).
 * Hver person i gjengen (høyst 14) er en figur med kropp, hode med hår eller lue, sekk på noen, og armer og bein som svinger når de går.
 * Fire instansnett: jakke (farget per person), fast (hode, hår, belte, støvler i hofta), bein (to per person) og armer (to per person).
 * De går mellom byggene, stopper opp, og går rundt hindringer. Erstatter de enkle klossfigurene fra spillet-visning.js.
 */
(function () {
  'use strict';
  const r3 = () => (typeof R3 !== 'undefined' ? R3 : null), MAKS = 14;
  const JAKKER = [[.35, .42, .3], [.5, .32, .22], [.25, .33, .45], [.55, .5, .35], [.42, .25, .25], [.3, .3, .32], [.62, .46, .2], [.2, .36, .3], [.48, .44, .5]];
  const BUKSER = [[.2, .21, .25], [.26, .22, .17], [.16, .2, .16], [.3, .3, .32], [.18, .18, .2]];
  let nett = null, figurer = null, hjelp = null;
  const farg = (g, c) => { const n = g.attributes.position.count, f = new Float32Array(n * 3); for (let q = 0; q < n; q++) f.set(c, q * 3); g.setAttribute('color', new THREE.BufferAttribute(f, 3)); return g; };
  const boks = (d, x, y, z, sx, sy, sz, c) => { const g = new THREE.BoxGeometry(sx, sy, sz).toNonIndexed(); g.translate(x, y, z + sz / 2); d.push(farg(g, c)); };
  // figuren ser mot +x, føttene i origo. Lemmene har origo i leddet (hofta / skulderen) og henger nedover.
  function deler() { const jakke = [], fast = [], bein = [], arm = [], hud = [.86, .69, .56], hv = [1, 1, 1];
    boks(jakke, 0, 0, .86, .26, .44, .58, hv); boks(jakke, 0, 0, 1.4, .2, .3, .06, hv); boks(jakke, -.02, 0, .8, .28, .46, .1, [.8, .8, .8]);          // overkropp, krage, nederkant
    boks(fast, 0, 0, 1.45, .12, .13, .08, hud); boks(fast, .01, 0, 1.52, .21, .2, .23, hud); boks(fast, .1, 0, 1.6, .03, .06, .06, [.8, .62, .5]);       // hals, hode, nese
    boks(fast, -.02, 0, 1.7, .24, .22, .08, [.22, .17, .12]); boks(fast, -.1, 0, 1.56, .08, .21, .16, [.22, .17, .12]);                                  // hår
    boks(fast, 0, 0, .8, .27, .45, .06, [.16, .13, .1]); boks(fast, .13, 0, .81, .03, .08, .05, [.6, .55, .4]);                                           // belte og spenne
    boks(bein, 0, 0, -.82, .17, .17, .82, hv); boks(bein, .04, 0, -.86, .27, .18, .12, [.3, .3, .3]);                                                       // bukse og støvel (mørkere)
    boks(arm, 0, 0, -.56, .12, .12, .56, hv); boks(arm, .01, 0, -.66, .1, .1, .1, [.35, .3, .28]);                                                          // erme og hanske
    // (17. nov: «gjør alt mer detaljert») øyne, bryn, ører og munn, glidelås, brystlommer, skulderklaffer, mansjetter, knelapper og såler
    const mørk = [.12, .1, .09], dus = [.72, .72, .72];
    for (const sy of [-1, 1]) { boks(fast, .112, sy * .05, 1.64, .012, .035, .022, [.95, .95, .93]); boks(fast, .118, sy * .05, 1.645, .008, .016, .016, [.15, .2, .25]); boks(fast, .112, sy * .05, 1.672, .014, .05, .012, [.22, .17, .12]);
      boks(fast, .0, sy * .105, 1.6, .05, .02, .07, [.8, .62, .5]); boks(jakke, .132, sy * .11, 1.18, .012, .13, .12, dus); boks(jakke, .14, sy * .11, 1.28, .012, .14, .025, [.62, .62, .62]);
      boks(jakke, 0, sy * .19, 1.42, .14, .1, .025, dus); boks(jakke, .1, sy * .07, 1.4, .06, .09, .07, [.9, .9, .9]); }
    boks(fast, .112, 0, 1.565, .012, .07, .012, [.6, .36, .32]); boks(jakke, .134, 0, .9, .01, .02, .5, [.5, .5, .5]); boks(jakke, -.135, 0, 1.0, .012, .3, .34, [.86, .86, .86]);
    boks(bein, .09, 0, -.46, .02, .15, .14, dus); boks(bein, .05, 0, -.87, .3, .19, .03, mørk); boks(bein, -.085, 0, -.3, .012, .12, .12, dus);
    boks(arm, 0, 0, -.57, .13, .13, .04, dus); boks(arm, .065, 0, -.2, .012, .08, .08, [.8, .8, .8]); boks(arm, .05, .03, -.7, .05, .03, .05, [.32, .27, .25]);
    return { jakke: MODELLER.samle(jakke), fast: MODELLER.samle(fast), bein: MODELLER.samle(bein), arm: MODELLER.samle(arm) }; }
  function lag(R) { const G = deler(), mat = new THREE.MeshLambertMaterial({ vertexColors: true }), mk = (g, n) => { const m = new THREE.InstancedMesh(g, mat, n); m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3).fill(1), 3); m.frustumCulled = false; m.count = 0; m.userData.kilde = 'folk3d.js'; R.scene.add(m); return m; };
    nett = { jakke: mk(G.jakke, MAKS), fast: mk(G.fast, MAKS), bein: mk(G.bein, MAKS * 2), arm: mk(G.arm, MAKS * 2), scene: R.scene };
    const rot = new THREE.Object3D(), ledd = [[0, -.1, .82], [0, .1, .82], [0, -.28, 1.4], [0, .28, 1.4]].map(([x, y, z]) => { const o = new THREE.Object3D(); o.position.set(x, y, z); rot.add(o); return o; }); hjelp = { rot, ledd }; }
  KROKER.ramme3d.push(R => { if (!R.ut || typeof THREE === 'undefined' || !window.MODELLER || !window.FolkSpill || !window.OppstartSpill) return; const F = FolkSpill.tilstand(), S = OppstartSpill.tilstand(), leir = S && S.leir, u = R.ut; if (!F || !leir) return;
    if (!nett || nett.scene !== R.scene || nett.jakke.parent !== R.scene) lag(R);
    const n = Math.min(MAKS, F.personer.length), nær = Math.abs(leir.x - u.cx) < u.S - 60 && Math.abs(leir.y - u.cy) < u.S - 60, vis = nær && n > 0; for (const k of ['jakke', 'fast', 'bein', 'arm']) nett[k].visible = vis; if (!vis) return;
    if (!figurer || figurer.length !== n) { figurer = []; const c = new THREE.Color(); for (let i = 0; i < n; i++) { const p = F.personer[i], h = ((p.id || i) * 2654435761) >>> 0, j = JAKKER[h % JAKKER.length], b = BUKSER[(h >>> 8) % BUKSER.length];
        figurer.push({ x: leir.x + (Math.random() - .5) * 40, y: leir.y + (Math.random() - .5) * 40, tx: 0, ty: 0, vent: Math.random() * 6, a: Math.random() * 6.28, fase: 0, går: 0, s: .94 + ((h >>> 16) % 13) / 100 });
        c.setRGB(j[0], j[1], j[2]); nett.jakke.setColorAt(i, c); nett.arm.setColorAt(i * 2, c); nett.arm.setColorAt(i * 2 + 1, c); c.setRGB(b[0], b[1], b[2]); nett.bein.setColorAt(i * 2, c); nett.bein.setColorAt(i * 2 + 1, c); }
      for (const k of ['jakke', 'arm', 'bein']) nett[k].instanceColor.needsUpdate = true; }
    const L = window.LeirSpill && LeirSpill.tilstand(), bygg = L && window.Leir ? L.bygg.filter(b => b.x !== undefined && !Leir.BYGG[b.type].del && Math.hypot(b.x - leir.x, b.y - leir.y) < 150) : [], dt = tempo > 0 ? .016 : 0, { rot, ledd } = hjelp;
    nett.jakke.count = nett.fast.count = n; nett.bein.count = nett.arm.count = n * 2;
    figurer.forEach((p, i) => { let går = 0;
      if (p.vent > 0) p.vent -= dt; else { const dx = p.tx - p.x, dy = p.ty - p.y, d = Math.hypot(dx, dy);
        if (!p.tx || d < .6) { const b = bygg.length && Math.random() < .75 ? bygg[Math.floor(Math.random() * bygg.length)] : null, v = Math.random() * 6.283, r = b ? 7 + Math.random() * 5 : Math.random() * 30; p.tx = (b ? b.x : leir.x) + Math.cos(v) * r; p.ty = (b ? b.y : leir.y) + Math.sin(v) * r; p.vent = 2 + Math.random() * 14; }
        else { const nx = p.x + dx / d * 1.25 * dt, ny = p.y + dy / d * 1.25 * dt; if (typeof hindring3d === 'function' && hindring3d(nx - u.cx, ny - u.cy)) p.tx = 0; else { p.x = nx; p.y = ny; let da = Math.atan2(dy, dx) - p.a; da = Math.atan2(Math.sin(da), Math.cos(da)); p.a += da * Math.min(1, dt * 6); p.fase += 1.25 * dt * 4.2; går = 1; } } }
      p.går += (går - p.går) * Math.min(1, dt * 8 + (dt ? 0 : 1));
      const sv = Math.sin(p.fase) * .6 * p.går; rot.position.set(p.x - u.cx, p.y - u.cy, (hoyde3d(p.x, p.y) - u.h0) * R.EX); rot.rotation.set(0, 0, p.a); rot.scale.setScalar(p.s);
      ledd[0].rotation.y = sv; ledd[1].rotation.y = -sv; ledd[2].rotation.y = -sv * .7; ledd[3].rotation.y = sv * .7; rot.updateMatrixWorld(true);
      nett.jakke.setMatrixAt(i, rot.matrixWorld); nett.fast.setMatrixAt(i, rot.matrixWorld); nett.bein.setMatrixAt(i * 2, ledd[0].matrixWorld); nett.bein.setMatrixAt(i * 2 + 1, ledd[1].matrixWorld); nett.arm.setMatrixAt(i * 2, ledd[2].matrixWorld); nett.arm.setMatrixAt(i * 2 + 1, ledd[3].matrixWorld); });
    for (const k of ['jakke', 'fast', 'bein', 'arm']) nett[k].instanceMatrix.needsUpdate = true; });
  window.Folk3d = { antall: () => (nett && nett.jakke.visible ? nett.jakke.count : 0), figurer: () => figurer, nett: () => nett };
})();
