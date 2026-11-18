/* Riksbrudd – FOLKENE I LEIREN SOM FIGURER (16. nov, brukeren: «mer detaljerte karakterer»).
 * Hver person i gjengen (høyst 14) er en figur med kropp, hode med hår eller lue, sekk på noen, og armer og bein som svinger når de går.
 * Fire instansnett: jakke (farget per person), fast (hode, hår, belte, støvler i hofta), bein (to per person) og armer (to per person).
 * De går mellom byggene, stopper opp, og går rundt hindringer. Erstatter de enkle klossfigurene fra spillet-visning.js.
 * RUNDE 4 (18. nov dag): barna og de gamle (SamfunnSpill.tilstand().avhengige, høyst 8) er også figurer – barna mindre og raskere, de
 * gamle krumme (overkroppen bøyd fram) og langsomme. Operatørene står INNE i kontrollrommet, kokken i kjøkkenet, stell og syke i
 * karantene i sykestua (eller brakka), mekanikeren i verkstedet – på en fri plass på gulvet i interiøret (Interior3d.egne(), samme plan
 * og gulvhøyde som når du går inn). Vakta står oppe på plattformen i vakttårnet og speider utover.
 */
(function () {
  'use strict';
  const r3 = () => (typeof R3 !== 'undefined' ? R3 : null), MAKS = 14, MAKS_AVH = 8, ALLE = MAKS + MAKS_AVH;
  const JAKKER = [[.35, .42, .3], [.5, .32, .22], [.25, .33, .45], [.55, .5, .35], [.42, .25, .25], [.3, .3, .32], [.62, .46, .2], [.2, .36, .3], [.48, .44, .5]];
  const BUKSER = [[.2, .21, .25], [.26, .22, .17], [.16, .2, .16], [.3, .3, .32], [.18, .18, .2]];
  // barna går i friskere farger, de gamle i grått og brunt
  const BARNJAKKER = [[.75, .22, .2], [.2, .45, .75], [.85, .7, .2], [.3, .62, .35], [.7, .35, .6]], GAMLEJAKKER = [[.42, .4, .38], [.38, .3, .24], [.3, .32, .3], [.5, .46, .4]];
  // Claudes forslag: fart (m/s), størrelse og hvor krum overkroppen er (radianer fram) per slags figur
  const SLAG = { voksen: { fart: 1.25, s: 1, krum: 0 }, barn: { fart: 1.7, s: .62, krum: 0 }, gammel: { fart: .75, s: .95, krum: .32 } };
  let nett = null, figurer = null, nøkkel = '', hjelp = null;
  // PÅ PLASS (18. nov): folk holder seg ved bygget der oppgaven deres hører hjemme (vakta ved tårnet, kokken ved kjøkkenet,
  // operatørene ved kontrollrommet, byggelaget ved byggeplassen). De som er syke i karantene, står ved sykestua eller brakka.
  const ARBEIDSSTED = { vakt: ['vakttårn', 'port'], kjøkken: ['kjøkken'], stell: ['sykestue'], verksted: ['verksted'], overvåking: ['kontrollrom'], frakt: ['lagertelt', 'container'] };
  // (runde 4) disse byggene har interiør (spill/interior3d.js LEIRBYGG): her står folk inne
  const INNE = new Set(['kontrollrom', 'kjøkken', 'sykestue', 'verksted', 'brakke']);
  // halve bredden av bygget (fra fotavtrykket), så folk står like utenfor veggen – også ved det smale vakttårnet
  const halv = b => { const f = window.Leir && Leir.BYGG[b.type] && Leir.BYGG[b.type].fot; return f ? Math.max(1.5, Math.min(7, Math.max(Math.abs(f[0]), Math.abs(f[1]), Math.abs(f[2]), Math.abs(f[3])))) : 5; };
  function arbeidssted(pers, bygg, i) {
    if (!pers || !bygg.length) return null; let typer = ARBEIDSSTED[pers.oppgave];
    if (pers.karantene) typer = bygg.some(b => b.type === 'sykestue' && !(b.igjen > 0)) ? ['sykestue'] : ['brakke'];
    if (pers.oppgave === 'bygg' && !pers.karantene) { const u = bygg.filter(b => b.igjen > 0); return u.length ? u[i % u.length] : null; }
    if (!typer) return null; const B = bygg.filter(b => typer.includes(b.type) && !(b.igjen > 0)); return B.length ? B[i % B.length] : null;
  }
  const hash = (a, b) => { let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

  // ---------- plassene inne i byggene og oppe i tårnet ----------
  const planer = new WeakMap(), tårnZ = new Map();
  // en fri plass på gulvet inne i leirbygget b til figur nr. i: { x, y (kartets meter), z (3D), a, uteX, uteY (like utenfor døra), u }
  function innePlass(b, i, R, u) {
    if (!window.Interior3d || !Interior3d.egne || !window.Interior) return null;
    const e = Interior3d.egne().find(q => q.P.bygg && q.P.bygg.i === 9000000 + b.id); if (!e) return null; const P = e.P;
    let c = planer.get(P);
    if (!c) { let pl = null; try { pl = Interior.plan(P, { i: P.bygg.i, kl: P.bygg.kl, h: P.bygg.h, dør: P.dør, senger: P.bygg.senger }); } catch (er) { pl = null; } if (!pl) return null;
      // gulvet som i interior3d.js: over det høyeste terrenget under bygget, men minst P.gulvFast
      let maks = -Infinity, mx = 0, my = 0; for (const [x, y] of P) { maks = Math.max(maks, (hoyde3d(u.cx + x, u.cy + y, u) - u.h0) * R.EX); mx += x; my += y; } mx /= P.length; my /= P.length;
      const gulv = Math.max(P.gulvFast, Math.min(maks + .06, (P.veggTopp || P.gulvFast + 2.6) - 2));
      let nx = -P.dør.uy, ny = P.dør.ux; if (nx * (P.dør.x - mx) + ny * (P.dør.y - my) < 0) { nx = -nx; ny = -ny; }
      c = { pl, gulv, mx, my, ute: [P.dør.x + nx * 1.3, P.dør.y + ny * 1.3] }; planer.set(P, c); }
    const bb = c.pl.bb; let x = null, y = null;
    for (let f = 0; f < 30 && x === null; f++) { const px = bb[0] + .4 + hash(i * 31 + f, b.id) * (bb[2] - bb[0] - .8), py = bb[1] + .4 + hash(i * 31 + f, b.id + 7) * (bb[3] - bb[1] - .8);
      if (Interior.inni(P, px, py) && Interior.avstKant(P, px, py) > .55 && !Interior.blokkert(c.pl, px, py) && Math.hypot(px - P.dør.x, py - P.dør.y) > 1.3) { x = px; y = py; } }
    if (x === null) return null;
    const gulv = P.inne && typeof P.inne.gulv === 'number' ? P.inne.gulv : c.gulv;
    return { x: u.cx + x, y: u.cy + y, z: gulv, a: Math.atan2(c.my - y, c.mx - x) + (hash(i, b.id + 3) - .5) * 2, uteX: u.cx + c.ute[0], uteY: u.cy + c.ute[1], u, b: b.id };
  }
  // vakta oppe på plattformen i vakttårnet (modeller.js: plattformen ligger 5,65 m over grunnen, ganget med nivået)
  function tårnPlass(b, i, R, u) {
    const k = 1 + ((b.nivå || 1) - 1) * .08, c = Math.cos(b.ret || 0), s = Math.sin(b.ret || 0), pk = (lx, ly) => [b.x + (lx * c - ly * s) * k, b.y + (lx * s + ly * c) * k];
    let z = tårnZ.get(b.id); if (!z || z.u !== u || z.x !== b.x || z.y !== b.y) { const G = window.LeirSpill && LeirSpill.grunn3d ? LeirSpill.grunn3d(b, u, R) : null; z = { u, x: b.x, y: b.y, topp: G ? G.topp : (hoyde3d(b.x, b.y, u) - u.h0) * R.EX }; tårnZ.set(b.id, z); }
    const lx = (hash(i, b.id) - .5) * 1.2, ly = (hash(i, b.id + 1) - .5) * 1.2, [x, y] = pk(lx, ly), [fx, fy] = pk(.9, -2.5);
    return { x, y, z: z.topp + 5.65 * k, a: Math.atan2(ly, lx) + (b.ret || 0), uteX: fx, uteY: fy, u, b: b.id, tårn: true };
  }
  function plassVed(b, i, R, u) { if (!b || b.igjen > 0) return null; if (b.type === 'vakttårn') return tårnPlass(b, i, R, u); return INNE.has(b.type) ? innePlass(b, i, R, u) : null; }

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
  // Leddene: hoftene på rot, overkroppen (jakke og fast) dreier om hofta (z 0,82) – de gamle er krumme – og skuldrene sitter på overkroppen.
  function lag(R) { const G = deler(), mat = new THREE.MeshLambertMaterial({ vertexColors: true }), mk = (g, n) => { const m = new THREE.InstancedMesh(g, mat, n); m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3).fill(1), 3); m.frustumCulled = false; m.count = 0; m.userData.kilde = 'folk3d.js'; R.scene.add(m); return m; };
    nett = { jakke: mk(G.jakke, ALLE), fast: mk(G.fast, ALLE), bein: mk(G.bein, ALLE * 2), arm: mk(G.arm, ALLE * 2), scene: R.scene };
    const rot = new THREE.Object3D(), over = new THREE.Object3D(); over.position.set(0, 0, .82); rot.add(over);
    const ledd = [[0, -.1, .82], [0, .1, .82]].map(([x, y, z]) => { const o = new THREE.Object3D(); o.position.set(x, y, z); rot.add(o); return o; });
    for (const y of [-.28, .28]) { const o = new THREE.Object3D(); o.position.set(0, y, 1.4 - .82); over.add(o); ledd.push(o); }
    hjelp = { rot, over, ledd, ned: new THREE.Matrix4().makeTranslation(0, 0, -.82), m: new THREE.Matrix4() }; figurer = null; nøkkel = ''; }
  KROKER.ramme3d.push(R => { if (!R.ut || typeof THREE === 'undefined' || !window.MODELLER || !window.FolkSpill || !window.OppstartSpill) return; const F = FolkSpill.tilstand(), S = OppstartSpill.tilstand(), leir = S && S.leir, u = R.ut; if (!F || !leir) return;
    if (!nett || nett.scene !== R.scene || nett.jakke.parent !== R.scene) lag(R);
    const SS = window.SamfunnSpill && SamfunnSpill.tilstand && SamfunnSpill.tilstand(), AVH = SS && SS.avhengige ? SS.avhengige.slice(0, MAKS_AVH) : [];
    const nV = Math.min(MAKS, F.personer.length), n = nV + AVH.length, nær = Math.abs(leir.x - u.cx) < u.S - 60 && Math.abs(leir.y - u.cy) < u.S - 60, vis = nær && n > 0; for (const k of ['jakke', 'fast', 'bein', 'arm']) nett[k].visible = vis; if (!vis) return;
    const pers = i => (i < nV ? F.personer[i] : AVH[i - nV]);
    const ny = F.personer.slice(0, nV).map(p => p.id).join(',') + '|' + AVH.map(a => a.id).join(',');
    if (!figurer || ny !== nøkkel) { const gamle = new Map((figurer || []).map(p => [p.nøkkel, p])); figurer = []; nøkkel = ny; const c = new THREE.Color();
      for (let i = 0; i < n; i++) { const p = pers(i), slag = i < nV ? 'voksen' : p.type === 'barn' ? 'barn' : 'gammel', id = (i < nV ? 'p' : 'a') + (p.id || i), h = (((p.id || i) + (i < nV ? 0 : 977)) * 2654435761) >>> 0;
        const liste = slag === 'barn' ? BARNJAKKER : slag === 'gammel' ? GAMLEJAKKER : JAKKER, j = liste[h % liste.length], bk = BUKSER[(h >>> 8) % BUKSER.length], før = gamle.get(id);
        figurer.push(før || { nøkkel: id, slag, x: leir.x + (Math.random() - .5) * 40, y: leir.y + (Math.random() - .5) * 40, tx: 0, ty: 0, vent: Math.random() * 6, a: Math.random() * 6.28, fase: 0, går: 0, s: SLAG[slag].s * (.94 + ((h >>> 16) % 13) / 100), inne: null, mål: null });
        c.setRGB(j[0], j[1], j[2]); nett.jakke.setColorAt(i, c); nett.arm.setColorAt(i * 2, c); nett.arm.setColorAt(i * 2 + 1, c); c.setRGB(bk[0], bk[1], bk[2]); nett.bein.setColorAt(i * 2, c); nett.bein.setColorAt(i * 2 + 1, c); }
      for (const k of ['jakke', 'arm', 'bein']) nett[k].instanceColor.needsUpdate = true; }
    const L = window.LeirSpill && LeirSpill.tilstand(), bygg = L && window.Leir ? L.bygg.filter(b => b.x !== undefined && !Leir.BYGG[b.type].del && Math.hypot(b.x - leir.x, b.y - leir.y) < 150) : [], dt = tempo > 0 ? .016 : 0, { rot, over, ledd, ned, m } = hjelp;
    const brakker = bygg.filter(b => b.type === 'brakke' && !(b.igjen > 0));
    nett.jakke.count = nett.fast.count = n; nett.bein.count = nett.arm.count = n * 2;
    figurer.forEach((p, i) => { let går = 0; const q = pers(i), G = SLAG[p.slag] || SLAG.voksen, syk = !!(q && q.syk);
      // et nytt utsnitt: plassen inne gjelder ikke lenger (høyden er regnet fra det gamle) – gå ut døra
      if (p.inne && p.inne.u !== u) { p.x = p.inne.uteX; p.y = p.inne.uteY; p.inne = null; p.tx = 0; }
      if (p.mål && p.mål.u !== u) p.mål = null;
      if (p.inne) { if (p.vent > 0) p.vent -= dt; else { p.x = p.inne.uteX; p.y = p.inne.uteY; p.inne = null; p.tx = 0; p.vent = 1 + Math.random() * 3; } }
      else if (p.vent > 0) p.vent -= dt; else { const dx = p.tx - p.x, dy = p.ty - p.y, d = Math.hypot(dx, dy);
        if (p.tx && d < .6 && p.etter) { p.tx = p.etter[0]; p.ty = p.etter[1]; p.etter = null; }
        else if (p.tx && d < .6 && p.mål) { p.inne = p.mål; p.mål = null; p.omveg = 0; p.x = p.inne.x; p.y = p.inne.y; p.a = p.inne.a; p.vent = 25 + Math.random() * 60; }
        else if (!p.tx || d < .6) { velgMål(p, i, q, bygg, brakker, leir, R, u); }
        else { const v = G.fart * (syk ? .7 : 1), nx = p.x + dx / d * v * dt, ny = p.y + dy / d * v * dt; if (typeof hindring3d === 'function' && hindring3d(nx - u.cx, ny - u.cy)) {
            // på vei til døra: gå en omveg til siden (høyst fire ganger), ellers finn et nytt mål
            if (p.mål && (p.omveg || 0) < 4) { p.omveg = (p.omveg || 0) + 1; if (!p.etter) p.etter = [p.tx, p.ty]; const sd = p.omveg % 2 ? 1 : -1; p.tx = p.x - dy / d * 3 * sd; p.ty = p.y + dx / d * 3 * sd; }
            else { p.tx = 0; p.mål = null; p.etter = null; p.omveg = 0; } } else { p.x = nx; p.y = ny; let da = Math.atan2(dy, dx) - p.a; da = Math.atan2(Math.sin(da), Math.cos(da)); p.a += da * Math.min(1, dt * 6); p.fase += v * dt * 4.2; går = 1; } } }
      p.går += (går - p.går) * Math.min(1, dt * 8 + (dt ? 0 : 1));
      // vakta i tårnet speider sakte fram og tilbake
      const a = p.inne && p.inne.tårn ? p.inne.a + Math.sin(performance.now() / 4000 + i) * .7 : p.a;
      const sv = Math.sin(p.fase) * .6 * p.går, z = p.inne ? p.inne.z : (hoyde3d(p.x, p.y) - u.h0) * R.EX; rot.position.set(p.x - u.cx, p.y - u.cy, z); rot.rotation.set(0, 0, a); rot.scale.setScalar(q && q.borte ? .001 : p.s);
      over.rotation.y = G.krum + (syk ? .12 : 0); ledd[0].rotation.y = sv; ledd[1].rotation.y = -sv; ledd[2].rotation.y = -sv * .7 - G.krum * .6; ledd[3].rotation.y = sv * .7 - G.krum * .6; rot.updateMatrixWorld(true);
      m.multiplyMatrices(over.matrixWorld, ned); nett.jakke.setMatrixAt(i, m); nett.fast.setMatrixAt(i, m); nett.bein.setMatrixAt(i * 2, ledd[0].matrixWorld); nett.bein.setMatrixAt(i * 2 + 1, ledd[1].matrixWorld); nett.arm.setMatrixAt(i * 2, ledd[2].matrixWorld); nett.arm.setMatrixAt(i * 2 + 1, ledd[3].matrixWorld); });
    for (const k of ['jakke', 'fast', 'bein', 'arm']) nett[k].instanceMatrix.needsUpdate = true; });
  // hvor en figur går nå: til arbeidsplassen (inn i bygget eller opp i tårnet), et tilfeldig bygg, eller (barn og gamle) rundt brakka
  function velgMål(p, i, q, bygg, brakker, leir, R, u) {
    const rnd = Math.random; let b = null, r = 0, hos = false;
    if (p.slag === 'voksen' || (q && q.karantene)) { const jobb = arbeidssted(q, bygg, i); hos = !!jobb && rnd() < .85;
      if (hos) { const pl = plassVed(jobb, i, R, u); if (pl) { p.mål = pl; p.tx = pl.uteX; p.ty = pl.uteY; p.etter = null; p.omveg = 0; p.hos = jobb.type; return; } }
      b = hos ? jobb : bygg.length && rnd() < .75 ? bygg[Math.floor(rnd() * bygg.length)] : null; r = hos ? halv(jobb) + 1 + rnd() * 2 : b ? 7 + rnd() * 5 : rnd() * 30; }
    else { const ved = brakker.length ? brakker[Math.floor(rnd() * brakker.length)] : null;
      // barna leker rundt brakka og leiren; de gamle holder seg nær brakka og står lenge
      b = ved && rnd() < (p.slag === 'gammel' ? .85 : .6) ? ved : null; r = b ? halv(b) + 1.5 + rnd() * (p.slag === 'barn' ? 10 : 4) : rnd() * (p.slag === 'barn' ? 25 : 12); }
    const v = rnd() * 6.283; p.tx = (b ? b.x : leir.x) + Math.cos(v) * r; p.ty = (b ? b.y : leir.y) + Math.sin(v) * r; p.mål = null;
    p.etter = null; p.omveg = 0; p.vent = p.slag === 'gammel' ? 10 + rnd() * 40 : hos ? 8 + rnd() * 30 : 2 + rnd() * 14; p.hos = hos && b ? b.type : '';
  }
  window.Folk3d = { antall: () => (nett && nett.jakke.visible ? nett.jakke.count : 0), figurer: () => figurer, nett: () => nett, plassVed: (b, i) => { const R = r3(); return R && R.ut ? plassVed(b, i, R, R.ut) : null; } };
})();
