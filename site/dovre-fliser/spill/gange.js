'use strict';
// Førsteperson i 3D: «Gå» (knapp øverst, bare i 3D) setter deg på bakken i øyehøyde der kameraet så, eller ved det valgte laget.
// Bevegelsen (spill/bevegelse.js, brukeren 11. nov: «bedre movement-system»): myk akselerasjon, løping med utholdenhet, huk, hopp,
// tregere i motbakke, stopp i bratte skråninger og ved vann, kroppen glir langs vegger og trær, og hodet gynger i takt med skrittene.
// PC: W/A/S/D eller piltastene, Shift løper, mellomrom hopper, C eller Ctrl går på huk. Klikk i bildet låser musa (se rundt uten å
// holde knappen inne); Esc slipper musa, Esc igjen (eller «Gå») flyr opp. Mobil: styrespak nede til venstre (helt ut = løp),
// dra ellers for å se rundt, knappene «Hopp» og «Huk» nede til høyre.
// Kroker i index.html: kamera3d() spør Gange.kamera når R3.fot er satt, og styringen i 3D sender pekerne hit først (Gange.peker).
(function () {
  const r3 = () => (typeof R3 !== 'undefined' ? R3 : null);   // R3 er en let i index.html, ikke window.R3
  const taster = new Set(); let sist = 0, spak = null, se = null, lagret = null, kropp = null, hoppVent = false, mobilHuk = false, fov = 50;
  const knapp = document.createElement('button'); knapp.id = 'gaaknapp'; knapp.textContent = 'Gå'; knapp.title = 'Gå selv i førsteperson'; knapp.hidden = true;
  document.querySelector('.knapper').insertBefore(knapp, document.getElementById('meny'));
  setInterval(() => { knapp.hidden = !(typeof på3d !== 'undefined' && på3d); if (knapp.hidden && r3() && R3.fot) stopp(); }, 400);
  knapp.onclick = () => (r3() && R3.fot ? stopp() : start());
  // knappene for hopp og huk på smale skjermer
  const css = document.createElement('style');
  css.textContent = `#gangeknapper{ position:fixed; right:70px; bottom:calc(40px + env(safe-area-inset-bottom,0px)); z-index:5; display:none; gap:10px; }
#gangeknapper.på{ display:flex; } #gangeknapper button{ width:64px; height:64px; border-radius:50%; border:2px solid rgba(231,220,195,.6); background:rgba(20,16,10,.55); color:#e7dcc3; font:600 15px sans-serif; touch-action:none; }
#gangeknapper button.på{ background:rgba(231,220,195,.35); }`;
  document.head.appendChild(css);
  const mk = document.createElement('div'); mk.id = 'gangeknapper'; const hb = document.createElement('button'), kb = document.createElement('button');
  hb.textContent = 'Hopp'; kb.textContent = 'Huk'; mk.append(kb, hb); document.body.appendChild(mk);
  hb.addEventListener('pointerdown', e => { e.preventDefault(); hoppVent = true; });
  kb.addEventListener('pointerdown', e => { e.preventDefault(); mobilHuk = !mobilHuk; kb.classList.toggle('på', mobilHuk); });

  function start() {
    if (!r3() || !R3.ut) return;
    const b = R3.bane; lagret = { avst: b.avst, pitch: b.pitch, x: b.x, y: b.y };
    if (valgt && Math.abs(valgt.x - R3.ut.cx) < R3.ut.S && Math.abs(valgt.y - R3.ut.cy) < R3.ut.S) { b.x = valgt.x - R3.ut.cx + 3; b.y = valgt.y - R3.ut.cy - 3; }   // ved siden av laget
    R3.fot = { a: b.yaw, pitch: -.05 }; b.avst = 1000;   // utsnittet rundt deg: ca. 3,4 km, skarpt kart nær
    const u = R3.ut; ledig(u, b);
    kropp = Bevegelse.ny(b.x, b.y, hoyde3d(u.cx + b.x, u.cy + b.y) - u.h0);
    knapp.classList.add('på'); sist = performance.now(); mobilHuk = false; kb.classList.remove('på'); mk.classList.toggle('på', VW < 900);
    logg(VW < 900 ? 'Du går selv: styrespaken nede til venstre (helt ut = løp), dra ellers for å se rundt, «Hopp» og «Huk» nede til høyre. «Gå» flyr opp.'
      : 'Du går selv: W/A/S/D, Shift løper, mellomrom hopper, C på huk. Klikk i bildet for å styre med musa; Esc slipper musa, Esc igjen flyr opp.');
  }
  // Start aldri inne i (eller tett inntil) et hus, et tre eller i vann: let utover i en spiral (høyst 60 m) til et sted der kroppen får plass
  function ledig(u, b) {
    const vann = vannVed(u), fri = (x, y) => !vann(x, y) && !(u.iElv && u.iElv(x, y)) && ![[0, 0], [.6, 0], [-.6, 0], [0, .6], [0, -.6], [1.6, 0], [-1.6, 0], [0, 1.6], [0, -1.6], [1.1, 1.1], [-1.1, -1.1], [1.1, -1.1], [-1.1, 1.1]].some(([dx, dy]) => typeof hindring3d === 'function' && hindring3d(x + dx, y + dy));
    if (fri(b.x, b.y)) return;
    for (let r = 1; r <= 60; r++) for (let k = 0; k < 8 + r * 2; k++) { const v = k / (8 + r * 2) * 6.283, x = b.x + Math.cos(v) * r, y = b.y + Math.sin(v) * r; if (fri(x, y)) { b.x = x; b.y = y; return; } }
  }
  function stopp() {
    if (!r3() || !R3.fot) return; const b = R3.bane;
    R3.fot = null; kropp = null; if (lagret) { b.avst = lagret.avst; b.pitch = lagret.pitch; } knapp.classList.remove('på'); spak = se = null; taster.clear(); mk.classList.remove('på');
    if (document.pointerLockElement) document.exitPointerLock();
    fov = 50; R3.cam.fov = 50; R3.cam.updateProjectionMatrix();
  }
  // Vannet i 3D-utsnittet (vannmasken fra bygg3d), lest én gang per utsnitt
  function vannVed(u) {
    if (!u.vann) return () => false;
    if (!u.vannData) { try { const W = u.vann.width; u.vannData = { W, d: u.vann.getContext('2d').getImageData(0, 0, W, W).data }; } catch (e) { u.vannData = { W: 0 }; } }
    const { W, d } = u.vannData; if (!W) return () => false;
    return (x, y) => { const i = Math.floor((x + u.S) / (2 * u.S) * W), j = Math.floor((u.S - y) / (2 * u.S) * W); return i >= 0 && j >= 0 && i < W && j < W && d[(j * W + i) * 4] > 128; };
  }
  // Kameraet i øyehøyde; flytter deg etter tastene/styrespaken (kalles hver ramme fra kamera3d).
  function kamera(R) {
    const b = R.bane, f = R.fot, c = R.cam, u = R.ut, nå = performance.now(), dt = Math.min(.1, (nå - sist) / 1000); sist = nå;
    if (!kropp) kropp = Bevegelse.ny(b.x, b.y, hoyde3d(u.cx + b.x, u.cy + b.y) - u.h0);
    let fram = 0, side = 0, løp = taster.has('shift');
    if (taster.has('w') || taster.has('arrowup')) fram++; if (taster.has('s') || taster.has('arrowdown')) fram--;
    if (taster.has('d') || taster.has('arrowright')) side++; if (taster.has('a') || taster.has('arrowleft')) side--;
    if (spak && spak.dx !== undefined) { const l = Math.min(1, Math.hypot(spak.dx, spak.dy) / 55); if (l > .12) { fram = -spak.dy / 55; side = spak.dx / 55; løp = l > .9; } }
    // utsnittets kant: hold deg innenfor (et nytt utsnitt bygges når du går langt)
    kropp.x = Math.max(-u.S * .97, Math.min(u.S * .97, kropp.x)); kropp.y = Math.max(-u.S * .97, Math.min(u.S * .97, kropp.y));
    // brede elver (u.iElv fra bekker-visning.js) stopper deg som annet vann – bekkene vasser du over
    // vegbanen og brudekkene (Liv3d.dekke) går du oppå når de ligger høyst 1,6 m over føttene dine (ellers går du under brua)
    const vann = vannVed(u), dekke = (x, y) => { const d = window.Liv3d && Liv3d.dekke ? Liv3d.dekke(u, x, y) : null; return d !== null && d - kropp.z < 1.6 ? d : null; };
    const verden = { høyde: (x, y) => { const t = (hoyde3d(u.cx + x, u.cy + y) - u.h0) * R.EX, d = dekke(x, y); return d !== null && d > t ? d : t; },
      hindring: (x, y) => typeof hindring3d === 'function' && hindring3d(x, y), vann: (x, y) => (vann(x, y) || !!(u.iElv && u.iElv(x, y))) && dekke(x, y) === null };
    const k = Bevegelse.steg(kropp, { fram, side, retning: f.a, løp, hopp: hoppVent, huk: taster.has('c') || taster.has('control') || mobilHuk }, dt, verden);
    hoppVent = false;
    b.x = kropp.x; b.y = kropp.y;
    c.position.set(k.kx, k.ky, k.kz); c.up.set(0, 0, 1);
    c.lookAt(k.kx - Math.sin(f.a) * Math.cos(f.pitch), k.ky + Math.cos(f.a) * Math.cos(f.pitch), k.kz + Math.sin(f.pitch));
    // litt større synsfelt når du løper
    fov += ((kropp.løper && kropp.fart > Bevegelse.REGLER.gå * 1.5 ? 74 : 68) - fov) * Math.min(1, dt * 6);
    R.scene.fog.near = 120; R.scene.fog.far = u.S * .95; c.fov = fov; c.aspect = VW / VH; c.near = .2; c.far = u.S * 4 + 3000; c.updateProjectionMatrix();
    b.yaw = f.a;
  }
  // Pekerne i 3D mens du går: styrespak (nede til venstre på smale skjermer) eller se rundt. Gir true når hendelsen er brukt.
  function peker(e) {
    if (!r3() || !R3.fot) return false;
    const r = e.target.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, låst = document.pointerLockElement === e.target;
    if (e.type === 'pointerdown') {
      // PC: klikk låser musa, så du ser rundt bare ved å bevege den
      if (VW >= 900 && e.pointerType === 'mouse' && !låst && e.target.requestPointerLock) { try { e.target.requestPointerLock(); } catch (_) { /* nettleseren sa nei */ } return true; }
      if (!låst) e.target.setPointerCapture(e.pointerId);
      if (VW < 900 && x < VW * .45 && y > VH * .5 && !spak) spak = { id: e.pointerId, x0: x, y0: y, dx: 0, dy: 0 }; else se = { id: e.pointerId, x, y }; }
    else if (e.type === 'pointermove') {
      if (låst) { R3.fot.a -= e.movementX * .0025; R3.fot.pitch = Math.max(-1.3, Math.min(1.3, R3.fot.pitch - e.movementY * .0025)); }
      else if (spak && spak.id === e.pointerId) { spak.dx = Math.max(-60, Math.min(60, x - spak.x0)); spak.dy = Math.max(-60, Math.min(60, y - spak.y0)); }
      else if (se && se.id === e.pointerId) { R3.fot.a -= (x - se.x) * .005; R3.fot.pitch = Math.max(-1.3, Math.min(1.3, R3.fot.pitch - (y - se.y) * .005)); se.x = x; se.y = y; } }
    else { if (spak && spak.id === e.pointerId) spak = null; if (se && se.id === e.pointerId) se = null; }
    return true;
  }
  const BRUKT = ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift', ' ', 'c', 'control'];
  window.addEventListener('keydown', e => { if (!r3() || !R3.fot) return; const k = e.key.toLowerCase();
    if (k === 'escape') { if (!document.pointerLockElement) stopp(); return; }
    // hoppet huskes til neste ramme, så et kort trykk ikke blir borte når bildet henger litt
    if (k === ' ' && !e.repeat) hoppVent = true;
    if (BRUKT.includes(k)) { taster.add(k); e.preventDefault(); } });
  window.addEventListener('keyup', e => taster.delete(e.key.toLowerCase()));
  window.addEventListener('blur', () => taster.clear());
  // styrespaken, siktet midt i bildet og utholdenheten tegnes i 3D-overlegget
  KROKER.tegn3d.push(g => {
    if (!r3() || !R3.fot || !kropp) return;
    g.save(); g.globalAlpha = .6; g.strokeStyle = '#e7dcc3'; g.lineWidth = 1.5; const cx = VW / 2, cy = VH / 2;
    g.beginPath(); g.moveTo(cx - 6, cy); g.lineTo(cx + 6, cy); g.moveTo(cx, cy - 6); g.lineTo(cx, cy + 6); g.stroke();
    if (kropp.utholdenhet < .999) { const w = 120, x = cx - w / 2, y = VH - (VW < 900 ? 140 : 52); g.globalAlpha = .7; g.fillStyle = 'rgba(20,16,10,.6)'; g.fillRect(x - 1, y - 1, w + 2, 7);
      g.fillStyle = kropp.sliten ? '#e0604a' : '#e7dcc3'; g.fillRect(x, y, w * kropp.utholdenhet, 5); }
    if (VW < 900) { const sx = spak ? spak.x0 : 90, sy = spak ? spak.y0 : VH - 120; g.globalAlpha = .55; g.lineWidth = 2;
      g.beginPath(); g.arc(sx, sy, 55, 0, 6.283); g.stroke(); g.fillStyle = '#e7dcc3'; g.beginPath(); g.arc(sx + (spak ? spak.dx : 0), sy + (spak ? spak.dy : 0), 22, 0, 6.283); g.fill(); }
    g.restore();
  });
  window.Gange = { start, stopp, kamera, peker, kropp: () => kropp };
})();
