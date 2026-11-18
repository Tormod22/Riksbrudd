'use strict';
/* Riksbrudd – røyk og lysrakett i 3D (nattarbeidet 18. nov; reglene i spill/krig.js, tilstanden i spill/krig-visning.js).
 * Røyken er noen få myke flak (sprites) som driver sakte rundt stedet, lysraketten ett lysende punkt høyt over bakken.
 * Ingen egne lys i scenen (det ville gitt nye skyggeprogrammer for alt). Høyst 8 røykskyer og 4 lys vises samtidig.
 */
(function () {
  if (typeof KROKER === 'undefined' || !window.Krig) return;
  const FLAK = 6, SKYER = 8, LYS = 4; let tex = null, glød = null;
  function rund(farger) { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    for (const [p, f] of farger) gr.addColorStop(p, f); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); }
  function lag(R) {
    if (!tex) { tex = rund([[0, 'rgba(225,225,220,.85)'], [.5, 'rgba(205,205,200,.5)'], [1, 'rgba(200,200,195,0)']]); glød = rund([[0, 'rgba(255,255,240,1)'], [.15, 'rgba(255,240,180,.8)'], [.5, 'rgba(255,220,140,.2)'], [1, 'rgba(255,210,120,0)']]); }
    const G = { scene: R.scene, røyk: [], lys: [] };
    const mr = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }), ml = new THREE.SpriteMaterial({ map: glød, transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending });
    G.mat = [mr, ml];
    for (let i = 0; i < SKYER * FLAK; i++) { const s = new THREE.Sprite(mr); s.visible = false; s.userData.kilde = 'krig3d.js'; R.scene.add(s); G.røyk.push(s); }
    for (let i = 0; i < LYS; i++) { const s = new THREE.Sprite(ml); s.visible = false; s.userData.kilde = 'krig3d.js'; R.scene.add(s); G.lys.push(s); }
    return G;
  }
  KROKER.ramme3d.push(R => {
    const KS = window.KrigSpill, u = R.ut; if (!KS || !u || !R.scene) return;
    const røyk = KS.røykSkyer, lys = KS.lysSkyer;
    if (!røyk.length && !lys.length && !(R.krig3d && R.krig3d.synlig)) return;
    if (!R.krig3d || R.krig3d.scene !== R.scene) { if (R.krig3d) for (const m of R.krig3d.mat) m.dispose(); R.krig3d = lag(R); }
    const G = R.krig3d, z = (X, Y) => (hoyde3d(X, Y) - u.h0) * (R.EX || 1), nå = performance.now() / 1000, rad = Krig.REGLER.røyk.radius; G.synlig = røyk.length + lys.length > 0;
    G.røyk.forEach((s, i) => { const q = røyk[Math.floor(i / FLAK)]; if (!q) { s.visible = false; return; } const k = i % FLAK, v = k * 1.047 + nå * .05 * (k % 2 ? 1 : -1), r = rad * (.25 + .12 * k), X = q.x + Math.cos(v) * r * .6, Y = q.y + Math.sin(v) * r * .6;
      const igjen = Math.max(0, Math.min(1, (q.til - tid) / 3)); s.visible = true; s.position.set(X - u.cx, Y - u.cy, z(X, Y) + 10 + 5 * Math.sin(nå * .3 + k)); const st = rad * (.9 + .15 * Math.sin(nå * .2 + k * 2)); s.scale.set(st, st * .55, 1); s.material.opacity = 1; s.visible = igjen > 0; });
    G.lys.forEach((s, i) => { const q = lys[i]; if (!q) { s.visible = false; return; } s.visible = true; const st = 60 + 8 * Math.sin(nå * 9 + i); s.position.set(q.x - u.cx, q.y - u.cy, z(q.x, q.y) + 140 - 60 * (1 - Math.max(0, Math.min(1, (q.til - tid) / Krig.REGLER.lys.varer)))); s.scale.set(st, st, 1); });
  });
  window.Krig3d = { antall: () => (typeof R3 !== 'undefined' && R3 && R3.krig3d ? { røyk: R3.krig3d.røyk.filter(s => s.visible).length, lys: R3.krig3d.lys.filter(s => s.visible).length } : { røyk: 0, lys: 0 }) };
})();
