'use strict';
// Førsteperson i 3D: «Gå» (knapp øverst, bare i 3D) setter deg på bakken i øyehøyde der kameraet så, eller ved det valgte laget.
// PC: W/A/S/D eller piltastene går, dra med musa for å se rundt, Shift løper. Mobil: styrespak nede til venstre, dra ellers for å se.
// Kroker i index.html: kamera3d() spør Gange.kamera når R3.fot er satt, og styringen i 3D sender pekerne hit først (Gange.peker).
(function () {
  const r3 = () => (typeof R3 !== 'undefined' ? R3 : null);   // R3 er en let i index.html, ikke window.R3
  const ØYE = 1.7, GÅ = 1.6, LØP = 7;   // meter, meter per sekund
  const taster = new Set(); let sist = 0, spak = null, se = null, lagret = null;
  const knapp = document.createElement('button'); knapp.id = 'gaaknapp'; knapp.textContent = 'Gå'; knapp.title = 'Gå selv i førsteperson'; knapp.hidden = true;
  document.querySelector('.knapper').insertBefore(knapp, document.getElementById('meny'));
  setInterval(() => { knapp.hidden = !(typeof på3d !== 'undefined' && på3d); if (knapp.hidden && r3() && R3.fot) stopp(); }, 400);
  knapp.onclick = () => (r3() && R3.fot ? stopp() : start());

  function start() {
    if (!r3() || !R3.ut) return;
    const b = R3.bane; lagret = { avst: b.avst, pitch: b.pitch, x: b.x, y: b.y };
    if (valgt && Math.abs(valgt.x - R3.ut.cx) < R3.ut.S && Math.abs(valgt.y - R3.ut.cy) < R3.ut.S) { b.x = valgt.x - R3.ut.cx + 3; b.y = valgt.y - R3.ut.cy - 3; }   // ved siden av laget
    R3.fot = { a: b.yaw, pitch: -.05 }; b.avst = 1000;   // utsnittet rundt deg: ca. 3,4 km, skarpt kart nær
    knapp.classList.add('på'); sist = performance.now();
    logg(VW < 700 ? 'Du går selv: styrespaken nede til venstre går, dra ellers for å se rundt. Trykk «Gå» igjen for å fly opp.'
      : 'Du går selv: W/A/S/D eller piltastene går, dra med musa for å se rundt, hold Shift for å løpe. «Gå» eller Esc for å fly opp.');
  }
  function stopp() {
    if (!r3() || !R3.fot) return; const b = R3.bane;
    R3.fot = null; if (lagret) { b.avst = lagret.avst; b.pitch = lagret.pitch; } knapp.classList.remove('på'); spak = se = null; taster.clear();
  }
  // Kameraet i øyehøyde; flytter deg etter tastene/styrespaken (kalles hver ramme fra kamera3d).
  function kamera(R) {
    const b = R.bane, f = R.fot, c = R.cam, u = R.ut, nå = performance.now(), dt = Math.min(.1, (nå - sist) / 1000); sist = nå;
    let fram = 0, side = 0;
    if (taster.has('w') || taster.has('arrowup')) fram++; if (taster.has('s') || taster.has('arrowdown')) fram--;
    if (taster.has('d') || taster.has('arrowright')) side++; if (taster.has('a') || taster.has('arrowleft')) side--;
    let fart = taster.has('shift') ? LØP : GÅ;
    if (spak && spak.dx !== undefined) { const l = Math.min(1, Math.hypot(spak.dx, spak.dy) / 50); if (l > .1) { fram = -spak.dy / 50; side = spak.dx / 50; fart = GÅ + (LØP - GÅ) * Math.max(0, l - .6) / .4; } }
    const l = Math.hypot(fram, side);
    if (l > 0) { const fx = -Math.sin(f.a), fy = Math.cos(f.a), sx = Math.cos(f.a), sy = Math.sin(f.a), k = fart * dt / Math.max(1, l);
      b.x = Math.max(-u.S * .97, Math.min(u.S * .97, b.x + (fx * fram + sx * side) * k)); b.y = Math.max(-u.S * .97, Math.min(u.S * .97, b.y + (fy * fram + sy * side) * k)); }
    const z = (hoyde3d(u.cx + b.x, u.cy + b.y) - u.h0) * R.EX + ØYE;
    c.position.set(b.x, b.y, z); c.up.set(0, 0, 1);
    c.lookAt(b.x - Math.sin(f.a) * Math.cos(f.pitch), b.y + Math.cos(f.a) * Math.cos(f.pitch), z + Math.sin(f.pitch));
    R.scene.fog.near = 120; R.scene.fog.far = u.S * .95; c.aspect = VW / VH; c.near = .25; c.far = u.S * 4 + 3000; c.updateProjectionMatrix();
    b.yaw = f.a;
  }
  // Pekerne i 3D mens du går: styrespak (nede til venstre på smale skjermer) eller se rundt. Gir true når hendelsen er brukt.
  function peker(e) {
    if (!r3() || !R3.fot) return false;
    const r = e.target.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    if (e.type === 'pointerdown') { e.target.setPointerCapture(e.pointerId);
      if (VW < 900 && x < VW * .45 && y > VH * .55 && !spak) spak = { id: e.pointerId, x0: x, y0: y, dx: 0, dy: 0 }; else se = { id: e.pointerId, x, y }; }
    else if (e.type === 'pointermove') {
      if (spak && spak.id === e.pointerId) { spak.dx = Math.max(-60, Math.min(60, x - spak.x0)); spak.dy = Math.max(-60, Math.min(60, y - spak.y0)); }
      else if (se && se.id === e.pointerId) { R3.fot.a -= (x - se.x) * .005; R3.fot.pitch = Math.max(-1.2, Math.min(1.2, R3.fot.pitch - (y - se.y) * .005)); se.x = x; se.y = y; } }
    else { if (spak && spak.id === e.pointerId) spak = null; if (se && se.id === e.pointerId) se = null; }
    return true;
  }
  window.addEventListener('keydown', e => { if (!r3() || !R3.fot) return; const k = e.key.toLowerCase();
    if (k === 'escape') { stopp(); return; } if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift'].includes(k)) { taster.add(k); e.preventDefault(); } });
  window.addEventListener('keyup', e => taster.delete(e.key.toLowerCase()));
  window.addEventListener('blur', () => taster.clear());
  // styrespaken tegnes i 3D-overlegget
  KROKER.tegn3d.push(g => {
    if (!r3() || !R3.fot || VW >= 900) return;
    const x = spak ? spak.x0 : 90, y = spak ? spak.y0 : VH - 120;
    g.save(); g.globalAlpha = .55; g.strokeStyle = '#e7dcc3'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 50, 0, 6.283); g.stroke();
    g.fillStyle = '#e7dcc3'; g.beginPath(); g.arc(x + (spak ? spak.dx : 0), y + (spak ? spak.dy : 0), 20, 0, 6.283); g.fill(); g.restore();
  });
  window.Gange = { start, stopp, kamera, peker };
})();
