/* Riksbrudd – LIV I LEIREN, VISNINGEN (ut9-liv, 28. nov): reglene står i spill/leirliv.js (uten DOM, test_leirliv.js).
 *  - 3D (KROKER.ramme3d): vasketøy på snor ved brakkene, kasser, verktøykasse og sagbukk ved byggeplassene, lys i vinduene om kvelden,
 *    røyk fra kjøkkenpipa (måltidene og kvelden), fyrkjelen og brakkeovnen (kalde kvelder), kikkerten til vakta i tårnet og plankene
 *    byggelaget bærer (folkene selv og stillingene – ligger i køya, sitter ved bordet – står i spill/folk3d.js), og hundene.
 *    Ingen nye lys: vinduene er selvlysende flater (MeshBasicMaterial), røyken er punkter. Alt er InstancedMesh eller ett nett.
 *    Ingenting av dette står i veien når du går (ikke i R3.hindre), og småtingene settes aldri inni et bygg eller på en hindring.
 *  - 2D (KROKER.tegn): hundene, vasketøyet og kassene når du er zoomet helt inn i leiren.
 *  - Hundene rusler i spilltid (KROKER.sim), og ligger ved bålet om natta. De lagres ikke (de er pynt).
 * window.Leirliv3d: antall(), ting(), hunder(), sjekk() – vakta pipeline/fliser/vakter/ut9-liv.js bruker dem.
 */
(function () {
  'use strict';
  const LL = window.Leirliv; if (!LL || typeof KROKER === 'undefined') return;
  // Claudes forslag: høyst så mange av hvert slag, og 2D-tingene vises når kartet er nærmere enn så mange meter per punkt
  const MAKS = { ting: 48, vindu: 160, røyk: 12, figur: 40, hund: 2 }, NÆR2D = .45;
  const HUNDFARGER = [[.5, .48, .44], [.36, .25, .16]];
  const r3 = () => (typeof R3 !== 'undefined' ? R3 : null);
  const klokka = () => ((((6 + (typeof tid !== 'undefined' ? tid : 0) / 60) % 24) + 24) % 24);
  const leirTils = () => { const S = window.OppstartSpill && OppstartSpill.tilstand(); return S && S.leir ? S.leir : null; };
  const byggListe = () => { const L = window.LeirSpill && LeirSpill.tilstand(), lr = leirTils(); if (!L || !lr || !window.Leir) return [];
    return L.bygg.filter(b => b.x !== undefined && Leir.BYGG[b.type] && !Leir.BYGG[b.type].linje && !Leir.BYGG[b.type].del && Math.hypot(b.x - lr.x, b.y - lr.y) < 200)
      .map(b => ({ id: b.id, type: b.type, x: b.x, y: b.y, ret: b.ret || 0, nivå: b.nivå || 1, ferdig: Leir.ferdig ? Leir.ferdig(b) : !(b.igjen > 0), fot: Leir.BYGG[b.type].fot, b })); };

  // ---------- hundene (spilltid) ----------
  let hunder = [], hundLeir = '';
  const polysFor = B => B.map(b => Leir.hjørner(b.b));
  function hundFri(polys) {
    const R = r3(), u = R && R.ut && typeof på3d !== 'undefined' && på3d ? R.ut : null;
    return (x, y) => { for (const P of polys) if (LL.avstPoly(P, x, y) < .6) return false;
      if (u && typeof hindring3d === 'function' && hindring3d(x - u.cx, y - u.cy)) return false;
      if (u && typeof iVann3d === 'function' && Math.abs(x - u.cx) < u.S && Math.abs(y - u.cy) < u.S && iVann3d(u, x - u.cx, y - u.cy)) return false;
      return true; };
  }
  const hundSim = dt => {
    const lr = leirTils(), F = window.FolkSpill && FolkSpill.tilstand(); if (!lr || !F || !(dt > 0)) { hunder = []; return; }
    const n = Math.min(MAKS.hund, LL.antallHunder(F.personer.filter(p => !p.borte).length)), nøk = Math.round(lr.x) + ',' + Math.round(lr.y);
    if (nøk !== hundLeir) { hunder = []; hundLeir = nøk; }
    while (hunder.length < n) hunder.push(LL.nyHund(hunder.length, lr)); hunder.length = n; if (!n) return;
    const B = byggListe(), polys = polysFor(B), fri = hundFri(polys), G = window.FolkgangSpill && FolkgangSpill.tilstand ? FolkgangSpill.tilstand() : null;
    const folk = G ? Object.values(G.pers).filter(s => !s.inne && Number.isFinite(s.x)).slice(0, 30).map(s => [s.x, s.y]) : [];
    const ctx = { leir: lr, h: klokka(), folk, bygg: B.map(b => [b.x, b.y]), fri };
    // høyst 20 steg på 0,5 s per kall (ved høy fart går hundene altså saktere enn tida – de er pynt)
    let s = Math.min(dt * 60, 10); while (s > 1e-3) { const d = Math.min(.5, s); for (const h of hunder) LL.hundSteg(h, d, ctx); s -= d; }
  };
  hundSim.leirliv = true; KROKER.sim.push(hundSim);

  // ---------- 2D ----------
  KROKER.tegn.push((g, vx0, vy1) => {
    if (typeof kam === 'undefined' || kam.m > NÆR2D || (typeof på3d !== 'undefined' && på3d)) return;
    const sx = x => (x - vx0) / kam.m, sy = y => (vy1 - y) / kam.m, m = kam.m;
    g.save();
    for (const t of tingNå()) { const x = sx(t.x), y = sy(t.y);
      if (t.k === 'snor') { const dx = Math.cos(t.a) * LL.REGLER.snor.lengde / 2 / m, dy = -Math.sin(t.a) * LL.REGLER.snor.lengde / 2 / m;
        g.strokeStyle = 'rgba(40,36,30,.8)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x - dx, y - dy); g.lineTo(x + dx, y + dy); g.stroke();
        const F = ['#c9c2b0', '#6d7f97', '#9a4f3c', '#d8d4c8', '#55684a'];
        for (let i = 0; i < 5; i++) { const f = (i + .5) / 5 - .5; g.fillStyle = F[i]; g.fillRect(x + dx * 2 * f - .25 / m, y + dy * 2 * f - .25 / m, .5 / m, .5 / m); } }
      else { g.fillStyle = t.k === 'verktøy' ? '#8b2f24' : t.k === 'bukk' ? '#8a6a44' : '#7c6444'; const s = (t.k === 'bukk' ? .5 : .8) / m; g.fillRect(x - s / 2, y - s / 2, s, s); } }
    for (const h of hunder) { const x = sx(h.x), y = sy(h.y), c = HUNDFARGER[h.nr % 2], f = `rgb(${c.map(v => Math.round(v * 255)).join(',')})`;
      g.fillStyle = f; g.translate(x, y); g.rotate(-h.a); g.beginPath(); g.ellipse(0, 0, .36 / m, (h.ligger ? .2 : .13) / m, 0, 0, 6.283); g.fill();
      g.beginPath(); g.arc(.38 / m, 0, .11 / m, 0, 6.283); g.fill(); g.setTransform(1, 0, 0, 1, 0, 0); }
    g.restore();
  });
  // småtingene (samme plasser i 2D og 3D): legges på nytt når byggene endres
  let tingNøk = '', tingL = [];
  function tingNå(fritt) {
    const B = byggListe(), nøk = B.map(b => `${b.id}:${b.type}:${Math.round(b.x * 2)}:${Math.round(b.y * 2)}:${Math.round(b.ret * 100)}:${b.ferdig ? 1 : 0}`).join('|') + (fritt ? '|3d' : '');
    if (nøk === tingNøk) return tingL; tingNøk = nøk; tingL = LL.småting(B, b => Leir.hjørner(b.b), fritt).slice(0, MAKS.ting); return tingL;
  }

  // ---------- 3D ----------
  let S = null;
  const farg = (g, c) => { if (g.index) g = g.toNonIndexed(); g.deleteAttribute('uv'); if (!g.attributes.normal) g.computeVertexNormals(); const n = g.attributes.position.count, a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { a[i * 3] = c[0]; a[i * 3 + 1] = c[1]; a[i * 3 + 2] = c[2]; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; };
  const boks = (x0, x1, y0, y1, z0, z1, c, rz) => { const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0); g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); if (rz) g.rotateZ(rz); return farg(g, c); };
  const syl = (x, y, z0, r, h, c, akse) => { const g = new THREE.CylinderGeometry(r, r, h, 8); if (akse === 'x') g.rotateZ(Math.PI / 2); else if (akse !== 'y') g.rotateX(Math.PI / 2);
    g.translate(x, y, z0 + (akse ? 0 : h / 2)); return farg(g, c); };
  const samle = d => window.MODELLER.samle(d);
  const TRE = [.55, .42, .27], TREM = [.4, .3, .19], STÅL = [.32, .33, .34], MØRK = [.1, .1, .1];
  function geometrier() {
    // vasketøy: to stolper, snora langs x (4,2 m) og fem plagg (skjorte, laken, bukse, håndkle, genser) som henger under
    const L = LL.REGLER.snor.lengde, H = LL.REGLER.snor.høyde, snor = [syl(-L / 2, 0, 0, .04, H, TREM), syl(L / 2, 0, 0, .04, H, TREM), boks(-L / 2, L / 2, -.006, .006, H - .06, H - .045, [.85, .85, .8])];
    const PL = [[.55, .6, [.82, .8, .72]], [.9, .85, [.88, .88, .86]], [.42, .8, [.3, .36, .48]], [.5, .4, [.62, .25, .2]], [.55, .55, [.36, .45, .32]]];
    let x = -L / 2 + .35; for (const [w, h, c] of PL) { snor.push(boks(x, x + w, -.012, .012, H - .06 - h, H - .06, c)); x += w + .18; }
    // kasser: to trekasser på hverandre og en liten ved siden av
    const kasse = [boks(-.4, .4, -.3, .3, 0, .5, TRE), boks(-.38, .38, -.28, .28, .5, .52, TREM), boks(-.3, .25, -.25, .25, .52, .95, TRE), boks(.5, .9, -.2, .2, 0, .35, TREM)];
    // verktøy: rød verktøykasse, bøtte og en spade som ligger
    const verk = [boks(-.25, .25, -.12, .12, 0, .22, [.7, .16, .12]), boks(-.12, .12, -.02, .02, .22, .26, MØRK), syl(.45, .1, 0, .14, .3, [.45, .46, .44]),
      boks(-.6, .4, .35, .38, .02, .05, TREM), boks(.4, .7, .28, .45, .01, .04, STÅL)];
    // sagbukk med en planke over
    const bukk = [boks(-.6, .6, -.06, .06, .62, .72, TRE), boks(-.9, .9, -.12, .12, .72, .76, [.66, .53, .36])];
    for (const sx of [-.5, .5]) for (const sy of [-1, 1]) bukk.push(boks(sx - .03, sx + .03, sy * .22 - .03, sy * .22 + .03, 0, .66, TREM, 0));
    // kikkerten (figurens egne meter: x fram, z opp; foran øynene) og plankene på skulderen (byggelaget)
    const kikk = [syl(.2, .035, 1.56, .026, .14, MØRK, 'x'), syl(.2, -.035, 1.56, .026, .14, MØRK, 'x'), boks(.17, .23, -.035, .035, 1.55, 1.57, MØRK)];
    const plank = [0, 1, 2].map(i => boks(-1.1, 1.3, -.27 + i * .005, -.17, 1.46 + i * .028, 1.485 + i * .028, i === 1 ? [.7, .58, .4] : [.66, .53, .36]));
    // hunden: stående i to steg (beina fram/bak) og liggende; hvit pels ganges med fargen per hund (instanceColor)
    const P = [.95, .95, .95], N = [.15, .13, .12];
    const hode = (z, x0) => [boks(x0, x0 + .2, -.08, .08, z, z + .18, P), boks(x0 + .2, x0 + .32, -.045, .045, z + .02, z + .1, P), boks(x0 + .3, x0 + .34, -.03, .03, z + .06, z + .1, N),
      boks(x0 + .04, x0 + .1, -.075, -.04, z + .18, z + .27, P), boks(x0 + .04, x0 + .1, .04, .075, z + .18, z + .27, P)];
    const kropp = [boks(-.33, .33, -.11, .11, .3, .55, P), boks(.26, .38, -.07, .07, .45, .62, P), ...hode(.55, .3), boks(-.48, -.32, -.035, .035, .5, .58, P, 0)];
    const bein = sv => [[.24, sv], [-.24, -sv]].flatMap(([x, s]) => [-1, 1].map(sy => boks(x + s * sy - .035, x + s * sy + .035, sy * .085 - .035, sy * .085 + .035, 0, .33, P)));
    const ligg = [boks(-.35, .32, -.14, .14, .03, .27, P), boks(.3, .58, -.06, .06, .02, .09, P), boks(.3, .58, .07, .13, .02, .09, P), ...hode(.06, .34), boks(-.62, -.33, -.04, .04, .03, .09, P)];
    // (ut9-liv2) kråke (svart, x fram), katt (stående og liggende) og måke (hvit med grå vinger som en flat V)
    const SV = [.07, .07, .08], NEB = [.25, .24, .22];
    const kråke = [boks(-.13, .13, -.06, .06, .07, .19, SV), boks(.11, .21, -.045, .045, .16, .25, SV), boks(.21, .27, -.014, .014, .19, .215, NEB), boks(-.27, -.12, -.04, .04, .11, .15, SV),
      boks(-.01, .01, -.03, -.015, 0, .08, NEB), boks(-.01, .01, .015, .03, 0, .08, NEB)];
    const KF = [.62, .4, .2], KM = [.95, .9, .82];
    const katt = [boks(-.2, .2, -.07, .07, .13, .27, KF), boks(.17, .3, -.065, .065, .21, .33, KF), boks(.26, .31, -.03, .03, .22, .27, KM), boks(.19, .23, -.06, -.025, .33, .38, KF), boks(.19, .23, .025, .06, .33, .38, KF),
      boks(-.36, -.19, -.02, .02, .24, .28, KF), boks(-.4, -.34, -.02, .02, .27, .38, KF), ...[[.13, -1], [.13, 1], [-.14, -1], [-.14, 1]].map(([x, sy]) => boks(x - .025, x + .025, sy * .045 - .02, sy * .045 + .02, 0, .14, KF))];
    const kattL = [boks(-.2, .18, -.1, .1, .01, .14, KF), boks(.12, .26, -.065, .065, .03, .15, KF), boks(.15, .19, -.06, -.025, .15, .2, KF), boks(.15, .19, .025, .06, .15, .2, KF), boks(-.15, .2, .1, .14, .01, .06, KF)];
    const MH = [.94, .94, .92], MG = [.62, .64, .66], vinge = sy => { const g = new THREE.BoxGeometry(.24, .5, .015); g.translate(0, sy * .27, 0); g.rotateX(sy * .22); g.translate(.02, 0, .02); return farg(g, MG); };
    const måke = [boks(-.22, .2, -.05, .05, -.05, .05, MH), boks(.17, .27, -.04, .04, -.02, .07, MH), boks(.27, .32, -.012, .012, .01, .03, [.9, .7, .2]), boks(-.32, -.2, -.05, .05, -.02, .01, MG), vinge(1), vinge(-1)];
    return { kråke: samle(kråke), katt: samle(katt), kattL: samle(kattL), måke: samle(måke), snor: samle(snor), kasse: samle(kasse), verktøy: samle(verk), bukk: samle(bukk), kikkert: samle(kikk), planker: samle(plank),
      hundA: samle([...kropp, ...bein(.06)]), hundB: samle([...kropp, ...bein(-.06)]), hundL: samle(ligg) };
  }
  function lagInst(geo, mat, n, R) { const m = new THREE.InstancedMesh(geo, mat, n); m.count = 0; m.frustumCulled = false; m.userData.kilde = 'leirliv3d.js'; R.scene.add(m); return m; }
  function røykTekstur() { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 2, 32, 32, 31);
    gr.addColorStop(0, 'rgba(255,255,255,.75)'); gr.addColorStop(.55, 'rgba(255,255,255,.32)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); }
  function lag(R) {
    kast(); const geo = geometrier(), mat = window.MODELLER.materiale(), M = {};
    for (const k of ['snor', 'kasse', 'verktøy', 'bukk']) M[k] = lagInst(geo[k], mat, MAKS.ting, R);
    M.kikkert = lagInst(geo.kikkert, mat, MAKS.figur, R); M.kråke = lagInst(geo.kråke, mat, 16, R); M.katt = lagInst(geo.katt, mat, 1, R); M.kattL = lagInst(geo.kattL, mat, 1, R); M.måke = lagInst(geo.måke, mat, 8, R); M.planker = lagInst(geo.planker, mat, MAKS.figur, R);
    const hmat = new THREE.MeshLambertMaterial({ vertexColors: true });
    for (const k of ['hundA', 'hundB', 'hundL']) { M[k] = lagInst(geo[k], hmat, MAKS.hund, R); M[k].instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAKS.hund * 3), 3); }
    // vinduene: en firkant som vender ut (+x), selvlysende og varm
    const q = new THREE.PlaneGeometry(1, 1); q.rotateY(Math.PI / 2); const vmat = new THREE.MeshBasicMaterial({ color: 0xffc77a, fog: true });
    M.vindu = lagInst(q, vmat, MAKS.vindu, R);
    // (ut9-liv2) lyskasterens stråle: en åpen kjegle langs +x med spissen i lykta, svak og additiv (ikke et lys – lyser ikke opp noe)
    const LK = LL.REGLER.lyskaster, kj = new THREE.ConeGeometry(LK.lengde * Math.tan(LK.vidde), LK.lengde, 18, 1, true); kj.rotateZ(Math.PI / 2); kj.translate(LK.lengde / 2, 0, 0);
    const smat = new THREE.MeshBasicMaterial({ color: 0xfff1c8, transparent: true, opacity: .09, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: true });
    M.stråle = lagInst(kj, smat, 6, R);
    // røyken: punkter med egen alder (aA 0–1), gjennomsiktige og grå
    const N = MAKS.røyk * LL.REGLER.røyk.dotter, pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3)); pg.setAttribute('aA', new THREE.BufferAttribute(new Float32Array(N).fill(1), 1));
    const tex = røykTekstur(), rmat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { uT: { value: tex }, uC: { value: new THREE.Color(.55, .55, .56) }, uS: { value: 600 }, uB: { value: new THREE.Vector2(LL.REGLER.røyk.bredde[0], LL.REGLER.røyk.bredde[1]) } },
      vertexShader: 'attribute float aA; uniform float uS; uniform vec2 uB; varying float vA; void main() { vA = aA; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = uS * mix(uB.x, uB.y, aA) / max(1.0, -mv.z); gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'uniform sampler2D uT; uniform vec3 uC; varying float vA; void main() { float a = texture2D(uT, gl_PointCoord).a * (1.0 - vA) * min(1.0, vA * 8.0); if (a < 0.01) discard; gl_FragColor = vec4(uC, a); }' });
    M.røyk = new THREE.Points(pg, rmat); M.røyk.frustumCulled = false; M.røyk.userData.kilde = 'leirliv3d.js'; R.scene.add(M.røyk);
    geo.stråle = kj; S = { scene: R.scene, geo, mat, hmat, vmat, smat, tex, q, M, tårn: [], nøk: '', kilder: [], vinduer: [], sistStatisk: 0, sistLys: '' };
  }
  function kast() { if (!S) return; for (const m of Object.values(S.M)) { if (m.parent) m.parent.remove(m); if (m.dispose) m.dispose(); }
    for (const g of Object.values(S.geo)) g.dispose(); S.q.dispose(); S.M.røyk.geometry.dispose(); S.M.røyk.material.dispose(); S.tex.dispose(); S.hmat.dispose(); S.vmat.dispose(); S.smat.dispose(); S = null; }
  const o3 = () => (lag.o || (lag.o = new THREE.Object3D()));
  function zVed(x, y, u, R) { return (hoyde3d(x, y, u) - u.h0) * R.EX; }
  // småtingene, vinduene og pipene når byggene eller utsnittet er endret (sjekkes hvert sekund)
  function statisk(R, u) {
    const B = byggListe(), fritt = (x, y, r) => { for (const [dx, dy] of [[0, 0], [r, 0], [-r, 0], [0, r], [0, -r]]) { const lx = x + dx - u.cx, ly = y + dy - u.cy;
      if (Math.abs(lx) > u.S - 5 || Math.abs(ly) > u.S - 5) return false; if (typeof hindring3d === 'function' && hindring3d(lx, ly)) return false; if (typeof iVann3d === 'function' && iVann3d(u, lx, ly)) return false; } return true; };
    const T = tingNå(fritt), nøk = tingNøk + '|' + u.cx + ',' + u.cy; if (nøk === S.nøk) return; S.nøk = nøk;
    const o = o3(), n = { snor: 0, kasse: 0, verktøy: 0, bukk: 0 };
    for (const t of T) { const m = S.M[t.k]; if (!m) continue; o.position.set(t.x - u.cx, t.y - u.cy, zVed(t.x, t.y, u, R)); o.rotation.set(0, 0, t.a); o.scale.setScalar(1); o.updateMatrix(); m.setMatrixAt(n[t.k]++, o.matrix); }
    for (const k in n) { S.M[k].count = n[k]; S.M[k].instanceMatrix.needsUpdate = true; }
    // vinduene og pipene står på bygget (samme grunnhøyde og størrelse som modellen i leir-visning.js)
    S.vinduer = []; S.kilder = []; S.tårn = []; S.B = B; S.grunn = new Map(); S.polys = polysFor(B);
    // vann innen 250 m fra leiren (måkene): første punkt i ringene som er vann i 3D
    S.vann = null; const lr = leirTils(); if (lr && typeof iVann3d === 'function') { ytre: for (const r of [70, 130, 190, 250]) for (let k = 0; k < 16; k++) { const a = k / 16 * 6.283, x = lr.x + Math.cos(a) * r, y = lr.y + Math.sin(a) * r;
      if (Math.abs(x - u.cx) < u.S - 40 && Math.abs(y - u.cy) < u.S - 40 && iVann3d(u, x - u.cx, y - u.cy)) { S.vann = [x, y, zVed(x, y, u, R)]; break ytre; } } }
    for (const b of B) { if (!b.ferdig) continue; const G = window.LeirSpill && LeirSpill.grunn3d ? LeirSpill.grunn3d(b.b, u, R) : null, z0 = (G ? G.topp : zVed(b.x, b.y, u, R)) - .05, k = 1 + (b.nivå - 1) * .08; S.grunn.set(b.id, z0);
      LL.vinduer(b.type).forEach((v, i) => { const [x, y] = LL.tilKart(b, v.lx * k, v.ly * k); S.vinduer.push({ type: b.type, id: b.id, i, x: x - u.cx, y: y - u.cy, z: z0 + v.z * k, a: v.a + b.ret, w: v.w * k, h: v.h * k }); });
      if (b.type === 'vakttårn' && S.tårn.length < 6) { const [x, y] = LL.tilKart(b, 1.53 * k, .6 * k); S.tårn.push({ id: b.id, x: x - u.cx, y: y - u.cy, z: z0 + 6.62 * k, ret: b.ret }); }
      const p = LL.PIPE[b.type]; if (p && S.kilder.length < MAKS.røyk) { const [x, y] = LL.tilKart(b, p[0] * k, p[1] * k); S.kilder.push({ type: b.type, id: b.id, x: x - u.cx, y: y - u.cy, z: z0 + p[2] * k }); } }
    S.sistLys = '';
  }
  function vinduLys() {
    const m = window.NATT ? NATT.mørke : 0, h = klokka(), lit = S.vinduer.filter(v => LL.lys(v.type, h, m) && LL.vinduPå(v.type, v.id, v.i)), nøk = lit.length + ':' + Math.round(m * 10) + ':' + S.vinduer.length;
    if (nøk === S.sistLys) return; S.sistLys = nøk; const o = o3(); let n = 0;
    for (const v of lit) { if (n >= MAKS.vindu) break; o.position.set(v.x, v.y, v.z); o.rotation.set(0, 0, v.a); o.scale.set(1, v.w, v.h); o.updateMatrix(); S.M.vindu.setMatrixAt(n++, o.matrix); }
    S.M.vindu.count = n; S.M.vindu.instanceMatrix.needsUpdate = true;
    // svakere i skumringen, fullt når det er mørkt
    const s = Math.min(1, .45 + (m - LL.REGLER.lysMørke) * 2); S.vmat.color.setRGB(1 * s, .78 * s, .48 * s);
  }
  function røyk(R) {
    const p = S.M.røyk.geometry.attributes.position, A = S.M.røyk.geometry.attributes.aA, D = LL.REGLER.røyk.dotter, liv = LL.REGLER.røyk.liv, h = klokka(), nå = performance.now() / 1000;
    const st = window.ProduksjonSpill && ProduksjonSpill.status ? ProduksjonSpill.status() || {} : {}, kaldt = !(window.VAER && VAER.årstid === 'sommer'), V = window.Vind3d && Vind3d.VIND ? Vind3d.VIND : { vx: .6, vy: .3 };
    const vx = Math.max(-3, Math.min(3, V.vx || 0)) * .45, vy = Math.max(-3, Math.min(3, V.vy || 0)) * .45;
    for (let k = 0; k < MAKS.røyk; k++) { const q = S.kilder[k], styrke = q ? LL.røyk(q.type, h, !!(st[q.id] && st[q.id].går), kaldt) : 0;
      for (let i = 0; i < D; i++) { const j = k * D + i; if (!q || i >= D * styrke) { A.setX(j, 1); continue; }
        const a = (nå / liv + i / D + k * .37) % 1, t = a * liv; A.setX(j, a);
        p.setXYZ(j, q.x + vx * t + Math.sin(i * 1.7 + nå * .4) * .25 * a, q.y + vy * t + Math.cos(i * 2.3) * .25 * a, q.z + LL.REGLER.røyk.stig * t); } }
    p.needsUpdate = true; A.needsUpdate = true;
    S.M.røyk.material.uniforms.uS.value = R.renderer ? R.renderer.domElement.height * 1.05 : 600;
  }
  // kråker på mønet og ved bålet, katten og måkene over vann (spill/leirliv.js)
  function dyr(R, u, lr) {
    const h = klokka(), t = (typeof tid !== 'undefined' ? tid : 0) * 60, o = o3(), B = S.B || [];
    let n = 0; for (const k of LL.kråker(B, lr, t, h)) { if (n >= 16) break; const z = k.bygg ? (S.grunn.get(k.bygg) ?? zVed(k.x, k.y, u, R)) + k.z : zVed(k.x, k.y, u, R);
      if (!k.bygg && !LL.fri(k.x, k.y, .3, S.polys || [], [])) continue; o.position.set(k.x - u.cx, k.y - u.cy, z); o.rotation.set(0, 0, k.a); o.scale.setScalar(1); o.updateMatrix(); S.M.kråke.setMatrixAt(n++, o.matrix); }
    S.M.kråke.count = n; S.M.kråke.instanceMatrix.needsUpdate = true;
    const fri = (x, y) => LL.fri(x, y, .35, S.polys || [], []) && !(typeof hindring3d === 'function' && hindring3d(x - u.cx, y - u.cy)), K = LL.katt(B, lr, t, h, fri);
    S.M.katt.count = S.M.kattL.count = 0;
    if (K) { const m = K.sover || (!K.går && hash01(Math.floor(t / 20)) < .4) ? S.M.kattL : S.M.katt; o.position.set(K.x - u.cx, K.y - u.cy, zVed(K.x, K.y, u, R)); o.rotation.set(0, 0, K.a); o.updateMatrix(); m.setMatrixAt(0, o.matrix); m.count = 1; }
    S.M.katt.instanceMatrix.needsUpdate = S.M.kattL.instanceMatrix.needsUpdate = true;
    n = 0; if (S.vann) for (const g of LL.måker(S.vann[0], S.vann[1], t, h)) { o.position.set(g.x - u.cx, g.y - u.cy, S.vann[2] + g.z); o.rotation.order = 'ZYX'; o.rotation.set(g.krenging, 0, g.a); o.updateMatrix(); S.M.måke.setMatrixAt(n++, o.matrix); }
    o.rotation.order = 'XYZ'; S.M.måke.count = n; S.M.måke.instanceMatrix.needsUpdate = true;
  }
  const hash01 = k => LL.hash(k, 13);
  // lyskasteren feier sakte om natta
  function stråler() {
    const m = window.NATT ? NATT.mørke : 0, t = performance.now() / 1000, o = o3(); let n = 0;
    for (const T of S.tårn) { const L = LL.lyskaster(m, t, T.id); if (!L.på) continue; o.position.set(T.x, T.y, T.z); o.rotation.order = 'ZYX'; o.rotation.set(0, LL.REGLER.lyskaster.ned, T.ret + L.vinkel); o.scale.setScalar(1); o.updateMatrix(); S.M.stråle.setMatrixAt(n++, o.matrix); }
    o.rotation.order = 'XYZ'; S.M.stråle.count = n; S.M.stråle.instanceMatrix.needsUpdate = true;
  }
  function figurer(u) {
    const F = window.Folk3d && Folk3d.figurer ? Folk3d.figurer() || [] : [], synlig = window.Folk3d && Folk3d.antall() > 0, o = o3(); let nk = 0, np = 0;
    if (synlig) for (const p of F) { if (p.stilling !== 'kikkert' && p.stilling !== 'planker') continue; const m = p.stilling === 'kikkert' ? S.M.kikkert : S.M.planker, n = p.stilling === 'kikkert' ? nk++ : np++; if (n >= MAKS.figur) continue;
      o.position.set(p.x - u.cx, p.y - u.cy, p.z3 || 0); o.rotation.set(0, 0, p.a3 || 0); o.scale.setScalar(p.s || 1); o.updateMatrix(); m.setMatrixAt(n, o.matrix); }
    S.M.kikkert.count = Math.min(nk, MAKS.figur); S.M.planker.count = Math.min(np, MAKS.figur); S.M.kikkert.instanceMatrix.needsUpdate = S.M.planker.instanceMatrix.needsUpdate = true;
  }
  function hunder3d(R, u) {
    const o = o3(), n = { hundA: 0, hundB: 0, hundL: 0 }, nå = performance.now() / 1000;
    for (const h of hunder) { const lx = h.x - u.cx, ly = h.y - u.cy; if (Math.abs(lx) > u.S - 5 || Math.abs(ly) > u.S - 5) continue;
      h.fase = (h.fase || 0) + (h.går ? .25 * h.går : 0); const k = h.ligger ? 'hundL' : h.går && Math.sin(h.fase) > 0 ? 'hundA' : 'hundB';
      o.position.set(lx, ly, zVed(h.x, h.y, u, R) + (h.går ? Math.abs(Math.sin(h.fase)) * .03 : 0)); o.rotation.set(0, 0, h.a + (h.ligger ? 0 : Math.sin(nå * .7 + h.nr) * .05)); o.scale.setScalar(1); o.updateMatrix();
      const m = S.M[k], i = n[k]++; m.setMatrixAt(i, o.matrix); const c = HUNDFARGER[h.nr % 2]; m.instanceColor.setXYZ(i, c[0], c[1], c[2]); }
    for (const k in n) { S.M[k].count = n[k]; S.M[k].instanceMatrix.needsUpdate = true; S.M[k].instanceColor.needsUpdate = true; }
  }
  KROKER.ramme3d.push(R => {
    if (!R.ut || typeof THREE === 'undefined' || !window.MODELLER || !window.Leir) return; const u = R.ut, lr = leirTils();
    if (!S || S.scene !== R.scene || !S.M.røyk.parent) lag(R);
    const nær = !!lr && Math.abs(lr.x - u.cx) < u.S - 60 && Math.abs(lr.y - u.cy) < u.S - 60;
    for (const m of Object.values(S.M)) m.visible = nær; if (!nær) return;
    const ms = performance.now(); if (ms - S.sistStatisk > 1000 || S.u !== u) { S.sistStatisk = ms; if (S.u !== u) S.nøk = ''; S.u = u; statisk(R, u); vinduLys(); }
    røyk(R); figurer(u); hunder3d(R, u); stråler(); dyr(R, u, lr);
  });

  // ---------- vakta ----------
  function sjekk() {
    const R = r3(), u = R && R.ut; if (!S || !u) return null; const ut = { ting: {}, vinduer: S.M.vindu.count, røykKilder: S.kilder.length, kikkert: S.M.kikkert.count, planker: S.M.planker.count, hunder: hunder.length, kråker: S.M.kråke.count, måker: S.M.måke.count, vann: !!S.vann, stråler: S.M.stråle.count, iBygg: 0, svever: 0 };
    const B = byggListe(), polys = polysFor(B), m = new THREE.Matrix4(), v = new THREE.Vector3();
    for (const k of ['snor', 'kasse', 'verktøy', 'bukk', 'hundA', 'hundB', 'hundL', 'katt', 'kattL']) { const M = S.M[k]; ut.ting[k] = M.count;
      for (let i = 0; i < M.count; i++) { M.getMatrixAt(i, m); v.setFromMatrixPosition(m); const X = v.x + u.cx, Y = v.y + u.cy;
        if (polys.some(P => LL.avstPoly(P, X, Y) < .3)) ut.iBygg++; if (Math.abs(v.z - zVed(X, Y, u, R)) > .25) ut.svever++; } }
    return ut;
  }
  // tvinger småtingene, vinduene og pipene til å legges på nytt i neste bilde (vakta, og når noe er endret utenom byggene)
  const oppdater = () => { tingNøk = ''; if (S) { S.nøk = ''; S.sistStatisk = 0; S.sistLys = ''; } };
  // ett steg for hundene (vakta): dt i spillminutter
  const steg = dt => { for (const f of KROKER.sim) if (f.leirliv) f(dt); };
  window.Leirliv3d = { oppdater, steg, antall: () => (S ? Object.fromEntries(Object.entries(S.M).map(([k, m]) => [k, m.count !== undefined ? m.count : 0])) : null), ting: () => tingNå(), hunder: () => hunder, sjekk, kilder: () => (S ? S.kilder : []), vinduer: () => (S ? S.vinduer : []), MAKS };
})();
