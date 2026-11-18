'use strict';
/* Riksbrudd – krigen i 3D (nattarbeidet 18. nov; reglene i spill/krig.js, tilstanden i spill/krig-visning.js).
 * Røyken er noen få myke flak (sprites) som driver sakte rundt stedet, lysraketten ett lysende punkt høyt over bakken.
 * Ingen egne lys i scenen (det ville gitt nye skyggeprogrammer for alt). Høyst 8 røykskyer og 4 lys vises samtidig.
 * Runde 4 (18. nov dag):
 *  - Fiendens stillinger (window.STILLINGER, spill/fraksjoner-visning.js) som en ring av sandsekker med lav brystvern og åpning bak,
 *    vendt mot leiren din. Bare stillinger du kjenner (q.kjent). Én InstancedMesh, modellen fra MODELLER.sandsekkvoll.
 *  - Helikopterfrakten: helikopteret fra spill/kjor.js flyttes ut på turen (stiger fra start, synker mot målet, rotoren går) og
 *    står på plassen sin igjen når turen er over. Ingen ny modell.
 *  - Etterretning: merker (rombe med «?», navnet og hvor gammel meldingen er) over stedet lagene sist ble meldt, i overlegget (KROKER.tegn3d).
 * Tallene er Claudes forslag.
 */
(function () {
  if (typeof KROKER === 'undefined' || !window.Krig) return;
  const FLAK = 6, SKYER = 8, LYS = 4; let tex = null, glød = null;
  // stillingene: høyst så mange, ringens radius (m), antall vollbiter og høyden (rader sandsekker); helikopteret: høyeste flyhøyde
  // over bakken og hvor fort det stiger (meter opp per meter fram) fra start og ned mot målet
  const ST = { maks: 12, radius: 4.2, biter: 7, bue: 300, rader: 3 }, FLY = { høyde: 110, stig: .3 };
  function rund(farger) { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    for (const [p, f] of farger) gr.addColorStop(p, f); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); }
  // ringen av sandsekker: biter langs en bue på «bue» grader, åpning bak (mot -x); fronten (+x) vender ut
  function stillingGeo() {
    const M = window.MODELLER; if (!M || !M.sandsekkvoll || !M.samle) return null; const deler = [], steg = ST.bue / ST.biter, L = 2 * ST.radius * Math.sin(steg / 2 * Math.PI / 180) + .25;
    for (let i = 0; i < ST.biter; i++) { const v = (-ST.bue / 2 + steg * (i + .5)) * Math.PI / 180, g = M.sandsekkvoll(L, ST.rader); g.rotateZ(v); g.translate(Math.cos(v) * ST.radius, Math.sin(v) * ST.radius, 0); deler.push(g); }
    const g = M.samle(deler); for (const d of deler) d.dispose(); return g;
  }
  function lag(R) {
    if (!tex) { tex = rund([[0, 'rgba(225,225,220,.85)'], [.5, 'rgba(205,205,200,.5)'], [1, 'rgba(200,200,195,0)']]); glød = rund([[0, 'rgba(255,255,240,1)'], [.15, 'rgba(255,240,180,.8)'], [.5, 'rgba(255,220,140,.2)'], [1, 'rgba(255,210,120,0)']]); }
    const G = { scene: R.scene, røyk: [], lys: [], st: null, stGeo: null, stNøkkel: '' };
    const mr = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }), ml = new THREE.SpriteMaterial({ map: glød, transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending });
    G.mat = [mr, ml];
    for (let i = 0; i < SKYER * FLAK; i++) { const s = new THREE.Sprite(mr); s.visible = false; s.userData.kilde = 'krig3d.js'; R.scene.add(s); G.røyk.push(s); }
    for (let i = 0; i < LYS; i++) { const s = new THREE.Sprite(ml); s.visible = false; s.userData.kilde = 'krig3d.js'; R.scene.add(s); G.lys.push(s); }
    return G;
  }
  // frigjør det denne fila har laget (materialene for røyk/lys og stillingenes geometri; MODELLER.materiale() er felles og blir stående)
  function frigjør(G) {
    for (const m of G.mat) m.dispose(); for (const s of G.røyk.concat(G.lys)) if (s.parent) s.parent.remove(s);
    if (G.st) { if (G.st.parent) G.st.parent.remove(G.st); G.st = null; } if (G.stGeo) { G.stGeo.dispose(); G.stGeo = null; }
  }
  const leir = () => { const s = window.OppstartSpill && OppstartSpill.tilstand(); return s && s.leir ? s.leir : null; };
  // stillingene: matrisene settes bare når lista, utsnittet eller høydeskalaen er endret
  function stillinger(R, G, u, z) {
    const L = leir(), Q = (window.STILLINGER || []).filter(q => q.kjent && Math.abs(q.x - u.cx) < u.S && Math.abs(q.y - u.cy) < u.S).slice(0, ST.maks);
    const nøkkel = Q.map(q => Math.round(q.x) + ',' + Math.round(q.y)).join(';') + '|' + u.cx + ',' + u.cy + ',' + R.EX;
    if (nøkkel === G.stNøkkel) return; G.stNøkkel = nøkkel;
    if (!Q.length) { if (G.st) G.st.count = 0; return; }
    if (!G.st) { G.stGeo = stillingGeo(); if (!G.stGeo) return; G.st = new THREE.InstancedMesh(G.stGeo, MODELLER.materiale(), ST.maks); G.st.userData.kilde = 'krig3d.js'; G.st.frustumCulled = false; R.scene.add(G.st); }
    const m = new THREE.Matrix4(), p = new THREE.Vector3(), q4 = new THREE.Quaternion(), e = new THREE.Euler(), sk = new THREE.Vector3(1, 1, R.EX || 1);
    Q.forEach((q, i) => { const v = L ? Math.atan2(L.y - q.y, L.x - q.x) : 0; e.set(0, 0, v); q4.setFromEuler(e); p.set(q.x - u.cx, q.y - u.cy, z(q.x, q.y) - .05); m.compose(p, q4, sk); G.st.setMatrixAt(i, m); });
    G.st.count = Q.length; G.st.instanceMatrix.needsUpdate = true; ryddTrær(R, Q.map(q => [q.x - u.cx, q.y - u.cy]));
  }
  // trær og busker inne i og inntil ringen tas bort (som leirens bygg i leir-visning.js: matrisen nulles, detaljnivået regnes på nytt)
  function ryddTrær(R, P) {
    const r2 = (ST.radius + 1.5) ** 2, inni = (x, y) => P.some(([px, py]) => (x - px) ** 2 + (y - py) ** 2 < r2), null16 = new Float32Array(16); let n = 0;
    for (const t of R.treLOD || []) for (let k = 0; k < t.n; k++) if (inni(t.data[k * 5], t.data[k * 5 + 1])) { t.M.set(null16, k * 16); n++; }
    if (n) R.lodVed = null;
    const mm = new THREE.Matrix4(), v = new THREE.Vector3(), nullM = new THREE.Matrix4().makeScale(0, 0, 0);
    for (const m of [...(R.treMesh || []), ...(R.småMesh || [])]) { if (!m.isInstancedMesh || (R.treLOD || []).some(t => t.nær === m || t.fjern === m)) continue;
      let endret = false; for (let k = 0; k < m.count; k++) { m.getMatrixAt(k, mm); v.setFromMatrixPosition(mm); if (inni(v.x, v.y)) { m.setMatrixAt(k, nullM); endret = true; } }
      if (endret) m.instanceMatrix.needsUpdate = true; }
  }
  // helikopteret på tur: modellen fra spill/kjor.js flyttes dit helikopteret er (kjor.js setter det på plassen igjen hver ramme)
  function helikopter(R, u, z) {
    const KS = window.KrigSpill, H = KS && KS.heli && KS.heli(), KJ = window.KjorSpill; if (!H || !KJ || !KJ.liste) return false;
    const k = KJ.liste().find(q => q.type === 'heli'); if (!k || !k.m || k.m.parent !== R.scene || (KJ.fører && KJ.fører() === k)) return false;
    const x = H.x - u.cx, y = H.y - u.cy; if (Math.abs(x) > u.S || Math.abs(y) > u.S) { k.m.visible = false; return true; }
    const dF = H.fra ? Math.hypot(H.x - H.fra[0], H.y - H.fra[1]) : 1e9, dM = Math.hypot(H.x - H.mål[0], H.y - H.mål[1]), over = Math.min(FLY.høyde, FLY.stig * Math.min(dF, dM));
    k.m.visible = true; k.m.position.set(x, y, z(H.x, H.y) + over * (R.EX || 1)); k.m.rotation.set(0, over > 3 ? .12 : 0, H.retning || 0);
    if (k.ro) k.ro.rotation.z += .6; if (k.hr) k.hr.rotation.z += .9;
    return true;
  }
  KROKER.ramme3d.push(R => {
    const KS = window.KrigSpill, u = R.ut; if (!KS || !u || !R.scene) return;
    const røyk = KS.røykSkyer, lys = KS.lysSkyer, harSt = (window.STILLINGER || []).some(q => q.kjent), harHeli = !!(KS.heli && KS.heli());
    if (!røyk.length && !lys.length && !harSt && !harHeli && !(R.krig3d && (R.krig3d.synlig || (R.krig3d.st && R.krig3d.st.count)))) return;
    if (!R.krig3d || R.krig3d.scene !== R.scene) { if (R.krig3d) frigjør(R.krig3d); R.krig3d = lag(R); }
    const G = R.krig3d, z = (X, Y) => (hoyde3d(X, Y) - u.h0) * (R.EX || 1), nå = performance.now() / 1000, rad = Krig.REGLER.røyk.radius; G.synlig = røyk.length + lys.length > 0;
    G.røyk.forEach((s, i) => { const q = røyk[Math.floor(i / FLAK)]; if (!q) { s.visible = false; return; } const k = i % FLAK, v = k * 1.047 + nå * .05 * (k % 2 ? 1 : -1), r = rad * (.25 + .12 * k), X = q.x + Math.cos(v) * r * .6, Y = q.y + Math.sin(v) * r * .6;
      const igjen = Math.max(0, Math.min(1, (q.til - tid) / 3)); s.visible = true; s.position.set(X - u.cx, Y - u.cy, z(X, Y) + 10 + 5 * Math.sin(nå * .3 + k)); const st = rad * (.9 + .15 * Math.sin(nå * .2 + k * 2)); s.scale.set(st, st * .55, 1); s.material.opacity = 1; s.visible = igjen > 0; });
    G.lys.forEach((s, i) => { const q = lys[i]; if (!q) { s.visible = false; return; } s.visible = true; const st = 60 + 8 * Math.sin(nå * 9 + i); s.position.set(q.x - u.cx, q.y - u.cy, z(q.x, q.y) + 140 - 60 * (1 - Math.max(0, Math.min(1, (q.til - tid) / Krig.REGLER.lys.varer)))); s.scale.set(st, st, 1); });
    stillinger(R, G, u, z); G.heli = helikopter(R, u, z);
  });
  // etterretning i 3D: en rombe med «?» over stedet laget sist ble meldt (ikke når du ser laget nå), med navn og alder
  if (KROKER.tegn3d) KROKER.tegn3d.push((g, proj) => {
    const KS = window.KrigSpill; if (!KS || !KS.T || typeof R3 === 'undefined' || !R3 || !R3.ut) return; const E = KS.T().etter; if (!E || !E.length) return;
    g.save(); g.textAlign = 'center'; let n = 0;
    for (const q of E) { const e = ENHETER.find(s => s.navn === q.navn); if (e && synlig(e)) continue; const p = proj(q.x, q.y); if (!p) continue; const x = p[0], y = p[1] - 30; n++;
      g.strokeStyle = 'rgba(20,16,10,.8)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(x, y + 11); g.stroke();
      g.fillStyle = 'rgba(20,16,10,.7)'; g.strokeStyle = sidefarge(q.side, 'lys') || '#b5503d'; g.lineWidth = 2; g.setLineDash([4, 3]); g.beginPath(); g.moveTo(x, y - 11); g.lineTo(x + 11, y); g.lineTo(x, y + 11); g.lineTo(x - 11, y); g.closePath(); g.fill(); g.stroke(); g.setLineDash([]);
      g.fillStyle = '#e7dcc3'; g.font = 'bold 13px sans-serif'; g.fillText('?', x, y + 4.5); g.font = '13px "Cormorant Garamond", serif'; g.fillText(`${q.navn} · ${Krig.alder(tid - q.t)}`, x, y - 16); }
    g.restore(); if (window.Krig3d) Krig3d.merker = n;
  });
  window.Krig3d = { merker: 0,
    antall: () => { const G = typeof R3 !== 'undefined' && R3 ? R3.krig3d : null; return G ? { røyk: G.røyk.filter(s => s.visible).length, lys: G.lys.filter(s => s.visible).length, stillinger: G.st ? G.st.count : 0, heli: !!G.heli, merker: window.Krig3d.merker } : { røyk: 0, lys: 0, stillinger: 0, heli: false, merker: 0 }; } };
})();
