/* Riksbrudd – KJØRBARE BILER OG HELIKOPTER (16. nov, brukeren: «legg til kjørbare helikopter og biler»).
 * En feltbil og et helikopter står i leiren. Når du går selv (Gå) og står ved en av dem, kommer knappen «Sett deg inn» (F).
 * Bil: W/S gass og brems/rygg, A/D styrer, mellomrom håndbrekk. Helikopter: W/S fram og bak, A/D svinger, mellomrom opp, C ned.
 * Telefon: styrespaken kjører og svinger, knappene nede til høyre er brems (bil) eller Ned/Opp (helikopter). F eller knappen: gå ut.
 * Reglene (bilSteg, heliSteg) ligger øverst uten DOM og testes i pipeline/fliser/test_kjor.js. Kursen a er som i gange.js:
 * du ser mot (−sin a, cos a), nord = +y. Tallene er Claudes forslag.
 * Kjøretøyene står i kartets meter (X, Y) – ikke i utsnittets – så de står riktig når 3D-utsnittet bytter.
 */
(function (rot) {
  'use strict';
  const BIL = { aks: 4.5, brems: 10, rull: .35, maksVei: 27, maksTerreng: 11, rygg: 6, aksel: 2.7, sving: .6, r: 1.3 };
  const HELI = { maks: 40, side: 9, aks: 7, stig: 7, synk: 6, gir: 1.1, spol: 3, fri: 9 };
  const fram = a => [-Math.sin(a), Math.cos(a)];
  // Bilen ett steg. k = { x, y, z, a, v }, inn = { gass −1..1, sving −1..1 (1 = høyre), brems }, verden = { høyde, hindring, vann, vei }.
  // Gir { krasj } når den traff noe. På veg (verden.vei) går den fortere enn i terrenget; motbakke bremser, vann og hindringer stopper.
  function bilSteg(k, inn, dt, verden) {
    const maks = verden.vei && verden.vei(k.x, k.y) ? BIL.maksVei : BIL.maksTerreng, g = Math.max(-1, Math.min(1, inn.gass || 0)); let krasj = false;
    if (inn.brems) k.v -= Math.sign(k.v) * Math.min(Math.abs(k.v), BIL.brems * dt);
    else if (g > 0) k.v += (k.v < 0 ? BIL.brems : BIL.aks * (1 - Math.max(0, k.v) / maks)) * g * dt;
    else if (g < 0) k.v += (k.v > 0 ? BIL.brems : BIL.aks * .7) * g * dt;
    else k.v -= Math.sign(k.v) * Math.min(Math.abs(k.v), (BIL.rull + Math.abs(k.v) * .06) * dt);
    // over toppfarten for underlaget (kjørte av vegen): rull ned
    if (k.v > maks) k.v = Math.max(maks, k.v - 6 * dt); if (k.v < -BIL.rygg) k.v = -BIL.rygg;
    // styring: mindre utslag i fart (sykkelmodell)
    const s = Math.max(-1, Math.min(1, inn.sving || 0)) * BIL.sving / (1 + Math.abs(k.v) / 9); k.a -= k.v / BIL.aksel * Math.tan(s) * dt;
    const [fx, fy] = fram(k.a), nx = k.x + fx * k.v * dt, ny = k.y + fy * k.v * dt, r = BIL.r * Math.sign(k.v || 1);
    // fronten (eller hekken når du rygger) må være fri
    if (verden.hindring(nx + fx * r, ny + fy * r) || verden.vann(nx + fx * r, ny + fy * r)) { krasj = Math.abs(k.v) > 3; k.v *= -.2; }
    else { const z0 = verden.høyde(k.x, k.y), z1 = verden.høyde(nx, ny), d = Math.hypot(nx - k.x, ny - k.y);
      // motbakke bremser, og brattere enn ca. 35° kommer du ikke opp
      if (d > 1e-6) { const st = (z1 - z0) / d * Math.sign(k.v); if (st > .7) { k.v *= .5; return { krasj: false, bratt: true }; } k.v -= Math.sign(k.v) * Math.max(0, st) * 9.81 * .5 * dt; }
      k.x = nx; k.y = ny; }
    k.z = verden.høyde(k.x, k.y); return { krasj };
  }
  // Helikopteret ett steg. h = { x, y, z, a, vx, vy, vz, rotor 0..1, motor }, inn = { fram, side, gir (1 = høyre), opp −1..1 }.
  // Rotoren spoler opp på HELI.spol sekunder; under 90 % løfter den ikke. På bakken står det stille. Gir { landet, hardt, stanget }.
  function heliSteg(h, inn, dt, verden) {
    h.rotor = Math.max(0, Math.min(1, h.rotor + (h.motor ? 1 : -1) * dt / HELI.spol)); const løft = h.rotor > .9, bakke = verden.høyde(h.x, h.y);
    const påBakken = h.z <= bakke + .05; let hardt = false, stanget = false;
    h.a -= (inn.gir || 0) * HELI.gir * dt * (løft && !påBakken ? 1 : 0);
    const [fx, fy] = fram(h.a), hx = fy, hy = -fx;   // høyre for kursen
    let mx = 0, my = 0, mz = løft ? 0 : -HELI.synk;
    if (løft && !påBakken) { mx = fx * (inn.fram || 0) * (inn.fram < 0 ? HELI.side : HELI.maks) + hx * (inn.side || 0) * HELI.side; my = fy * (inn.fram || 0) * (inn.fram < 0 ? HELI.side : HELI.maks) + hy * (inn.side || 0) * HELI.side; }
    if (løft) mz = (inn.opp || 0) > 0 ? HELI.stig * inn.opp : (inn.opp || 0) < 0 ? HELI.synk * inn.opp : 0;
    const nær = (v, m, a) => v + Math.max(-a * dt, Math.min(a * dt, m - v));
    h.vx = nær(h.vx, mx, HELI.aks); h.vy = nær(h.vy, my, HELI.aks); h.vz = nær(h.vz, mz, 9);
    let nx = h.x + h.vx * dt, ny = h.y + h.vy * dt;
    // lavt over bakken stopper hus og trær deg (over HELI.fri meter flyr du fritt)
    if (h.z - verden.høyde(nx, ny) < HELI.fri && !påBakken && verden.hindring(nx, ny)) { nx = h.x; ny = h.y; h.vx *= -.2; h.vy *= -.2; stanget = true; }
    h.x = nx; h.y = ny; h.z += h.vz * dt;
    const b2 = verden.høyde(h.x, h.y) + (verden.vann(h.x, h.y) ? 1.5 : 0);   // over vann holder det seg en og en halv meter oppe
    if (h.z <= b2) { hardt = h.vz < -4.5; h.z = b2; h.vz = 0; const br = Math.min(1, 6 * dt); h.vx -= h.vx * br; h.vy -= h.vy * br; }
    return { landet: h.z <= b2 + .05, hardt, stanget, over: h.z - b2 };
  }
  const api = { BIL, HELI, bilSteg, heliSteg, fram };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; return; }
  rot.Kjor = api;

  // ---------- visningen ----------
  const r3 = () => (typeof R3 !== 'undefined' ? R3 : null), NØKKEL = 'riksbrudd-kjor', NAVN = { bil: 'Feltbil', heli: 'Helikopter' };
  let K = [], leirId = '', klar = false, i = null, sett = false, sistLagret = 0, kamA = 0, kamTid = 0, melding = 0;
  const spill = () => rot.OppstartSpill && OppstartSpill.tilstand();
  const lagre = () => { try { localStorage.setItem(NØKKEL, JSON.stringify({ leir: leirId, k: K.map(k => ({ type: k.type, X: Math.round(k.X * 10) / 10, Y: Math.round(k.Y * 10) / 10, a: Math.round(k.a * 100) / 100, hp: Math.round((k.hp === undefined ? 1 : k.hp) * 100) / 100 })) })); } catch (e) { /* fullt eller sperret */ } };
  function start() { const S = spill(); if (!S || !S.leir) return; leirId = Math.round(S.leir.x) + ',' + Math.round(S.leir.y); let d = null; try { d = JSON.parse(localStorage.getItem(NØKKEL) || 'null'); } catch (e) { d = null; }
    K = d && d.leir === leirId && Array.isArray(d.k) && d.k.length ? d.k.map(k => ({ ...k, ny: false })) : [{ type: 'bil', X: S.leir.x + 16, Y: S.leir.y - 12, a: 0, ny: true }, { type: 'heli', X: S.leir.x - 24, Y: S.leir.y + 16, a: 0, ny: true }];
    for (const k of K) Object.assign(k, { v: 0, vx: 0, vy: 0, vz: 0, rotor: 0, motor: false, alt: null, helning: 0, rull: 0, hp: k.hp === undefined ? 1 : k.hp }); klar = true; sett = false; i = null; }
  rot.addEventListener('riksbrudd-spill', () => setTimeout(start, 0));

  // --- modellene (fronten mot +x, origo midt på bunnen), hjørnefarger ---
  function boks(d, x, y, z, sx, sy, sz, c, rz) { const g = new THREE.BoxGeometry(sx, sy, sz).toNonIndexed(); if (rz) g.rotateZ(rz); g.translate(x, y, z + sz / 2); const n = g.attributes.position.count, f = new Float32Array(n * 3); for (let q = 0; q < n; q++) f.set(c, q * 3); g.setAttribute('color', new THREE.BufferAttribute(f, 3)); d.push(g); }
  function hjul(d, x, y, r) { const g = new THREE.CylinderGeometry(r, r, .28, 10).toNonIndexed(); g.translate(x, y, r); const n = g.attributes.position.count, f = new Float32Array(n * 3); for (let q = 0; q < n; q++) f.set([.09, .09, .1], q * 3); g.setAttribute('color', new THREE.BufferAttribute(f, 3)); d.push(g); }
  const ett = d => MODELLER.samle(d);
  function bilModell() { const d = [], o = [.3, .36, .24], m = [.22, .27, .18], gl = [.5, .62, .68];
    boks(d, 0, 0, .45, 4.1, 1.8, .7, o); boks(d, -.35, 0, 1.15, 2.2, 1.7, .75, m); boks(d, .78, 0, 1.2, .06, 1.5, .55, gl); boks(d, -1.48, 0, 1.2, .06, 1.5, .5, gl);
    for (const sy of [-1, 1]) { boks(d, -.35, sy * .86, 1.25, 1.7, .04, .45, gl); boks(d, 2.06, sy * .6, .78, .06, .3, .2, [.95, .93, .8]); boks(d, -2.06, sy * .65, .8, .06, .25, .18, [.75, .1, .08]); }
    boks(d, 2.1, 0, .4, .12, 1.9, .25, [.12, .12, .12]); boks(d, -2.1, 0, .4, .12, 1.9, .25, [.12, .12, .12]); boks(d, -2.2, 0, .95, .25, .7, .7, [.1, .1, .1]);
    for (const sx of [-1.3, 1.35]) for (const sy of [-.86, .86]) hjul(d, sx, sy, .42); return ett(d); }
  function heliModell() { const d = [], o = [.27, .33, .24], m = [.18, .22, .16], gl = [.45, .6, .68];
    boks(d, .3, 0, .75, 4.4, 1.9, 1.7, o); boks(d, 2.3, 0, .85, 1.1, 1.6, 1.2, gl); boks(d, 2.75, 0, .8, .5, 1.1, .7, o); boks(d, .2, 0, 2.45, 1.6, .9, .45, m);
    boks(d, -4.2, 0, 1.75, 5.2, .42, .5, o); boks(d, -6.7, 0, 2.1, .9, .12, 1.5, m); boks(d, -6.5, 0, 1.9, .6, 1.5, .08, m);
    for (const sy of [-1, 1]) { boks(d, .3, sy * 1.15, 0, 3.6, .14, .14, [.12, .12, .12]); for (const sx of [-.8, 1.4]) boks(d, sx, sy * 1.05, .1, .1, .1, .7, [.12, .12, .12]); boks(d, 1.2, sy * .96, 1.5, 1.2, .04, .7, gl); }
    boks(d, .2, 0, 2.9, .22, .22, .35, [.1, .1, .1]); return ett(d); }
  function rotorModell(r, b) { const d = []; boks(d, 0, 0, 0, r * 2, b, .05, [.08, .08, .09]); boks(d, 0, 0, 0, b, r * 2, .05, [.08, .08, .09]); return ett(d); }
  let mat = null;
  function modell(R, k) { if (k.m && k.m.parent === R.scene) return k.m; if (!mat) mat = new THREE.MeshLambertMaterial({ vertexColors: true });
    const g = new THREE.Group(), kropp = new THREE.Mesh(k.type === 'bil' ? bilModell() : heliModell(), mat); g.add(kropp); g.userData.kilde = 'kjor.js';
    if (k.type === 'heli') { const ro = new THREE.Mesh(rotorModell(5.4, .34), mat); ro.position.set(.2, 0, 3.28); g.add(ro); k.ro = ro; const hr = new THREE.Mesh(rotorModell(.95, .16), mat); hr.rotation.x = Math.PI / 2; hr.position.set(-6.7, .3, 2.6); g.add(hr); k.hr = hr; }
    g.rotation.order = 'ZYX'; R.scene.add(g); k.m = g; return g; }

  // --- verden slik reglene ser den, i utsnittets meter ---
  function verdenFor(R, u, k) { const terr = (x, y) => (hoyde3d(u.cx + x, u.cy + y) - u.h0) * R.EX, vann = rot.Gange && Gange.vannVed ? Gange.vannVed(u) : () => false;
    const dekke = (x, y) => (rot.Liv3d && Liv3d.dekke ? Liv3d.dekke(u, x, y) : null);
    return { høyde: (x, y) => { const t = terr(x, y), d = k.type === 'bil' ? dekke(x, y) : null; return d !== null && d > t && d - t < 30 ? d : t; },
      hindring: (x, y) => typeof hindring3d === 'function' && !!hindring3d(x, y), vann: (x, y) => (vann(x, y) || !!(u.iElv && u.iElv(x, y))) && !(k.type === 'bil' && dekke(x, y) !== null),
      vei: (x, y) => !!(u.påVeg && u.påVeg(x, y)) || dekke(x, y) !== null || !!(rot.LeirSpill && LeirSpill.påEgenVeg && LeirSpill.påEgenVeg(u.cx + x, u.cy + y)) }; }
  // første gang kjøretøyene er i utsnittet: flytt dem til et fritt sted (ikke i hus, trær eller vann), helikopteret til helikopterplassen hvis den finnes
  function plasser(R, u) { const L = rot.LeirSpill && LeirSpill.tilstand();
    for (const k of K) { if (!k.ny) continue; let x = k.X - u.cx, y = k.Y - u.cy; if (Math.abs(x) > u.S * .9 || Math.abs(y) > u.S * .9) return false;
      const hp = k.type === 'heli' && L && L.bygg.find(b => b.type === 'helikopterplass' && rot.Leir.ferdig(b)); if (hp) { k.X = hp.x; k.Y = hp.y; k.ny = false; continue; }
      const V = verdenFor(R, u, k), fri = (px, py) => ![[0, 0], [2.5, 0], [-2.5, 0], [0, 2.5], [0, -2.5], [2, 2], [-2, -2], [2, -2], [-2, 2]].some(([dx, dy]) => V.hindring(px + dx, py + dy) || V.vann(px + dx, py + dy)) && !(rot.Interior3d && Interior3d.iLeirbygg(px, py));
      let ok = fri(x, y); for (let r = 3; r <= 90 && !ok; r += 3) for (let q = 0; q < 12 && !ok; q++) { const v = q / 12 * 6.283, px = x + Math.cos(v) * r, py = y + Math.sin(v) * r; if (fri(px, py)) { x = px; y = py; ok = true; } }
      k.X = u.cx + x; k.Y = u.cy + y; k.ny = false; }
    lagre(); return true; }

  const fører = () => (i === null ? null : K[i]);
  // SKADE OG REPARASJON: krasj og harde landinger sliter på kjøretøyet; under 15 % starter det ikke før det er reparert
  const REP = { bil: 4e5, heli: 2e6 }, repPris = k => Math.max(1e4, Math.round(REP[k.type] * (1 - k.hp) / 1e4) * 1e4);
  function skad(k, d) { k.hp = Math.max(0, k.hp - d); if (k.hp < .15) { logg(`${NAVN[k.type]}${k.type === 'bil' ? 'en' : 'et'} er ødelagt og må repareres.`); if (k === fører() && (k.type === 'bil' || k.over < .5)) ut(true); } lagre(); }
  function reparer(n) { const k = K[n]; if (!k || k.hp >= .995) return false; const p = repPris(k); if (!OppstartSpill.betal(p)) { logg(`Ikke nok penger til å reparere (${Math.round(p / 1000)} 000 kr).`); return false; } k.hp = 1; lagre(); logg(`${NAVN[k.type]}${k.type === 'bil' ? 'en' : 'et'} er reparert.`); return true; }
  // MOTORLYD: en enkel tone som følger farten (bil) eller rotoren (helikopter); følger ☰ «Lyd»
  let ac = null, osc = null, gain = null;
  function lyd(k) { try { if (localStorage.getItem('riksbrudd-lyd') === 'av') { if (gain) gain.gain.value = 0; return; } if (!ac) { ac = new (window.AudioContext || window.webkitAudioContext)(); osc = ac.createOscillator(); gain = ac.createGain(); const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 420; osc.type = 'sawtooth'; gain.gain.value = 0; osc.connect(f).connect(gain).connect(ac.destination); osc.start(); }
      if (!k) { gain.gain.value = 0; return; } const fart = k.type === 'bil' ? Math.abs(k.v) : Math.hypot(k.vx, k.vy); osc.frequency.value = k.type === 'bil' ? 48 + fart * 4.5 : 24 + k.rotor * 26 + fart * .3; gain.gain.value = k.type === 'bil' ? .05 + Math.min(.06, fart * .003) : .1 * k.rotor; } catch (e) { /* ingen lyd */ } }
  function inn(n) { const R = r3(); if (!R || !R.fot || !K[n]) return false; if (K[n].hp < .15) { logg(`${NAVN[K[n].type]}${K[n].type === 'bil' ? 'en' : 'et'} er ødelagt. Reparer ${K[n].type === 'bil' ? 'den' : 'det'} først.`); return false; } i = n; const k = K[n]; kamA = R.fot.a = k.a; R.fot.pitch = k.type === 'heli' ? -.22 : -.16; kamTid = 0; k.motor = true; if (k.type === 'heli') R.bane.avst = 2400;
    Gange.settFører(ramme, k.type === 'heli' ? ['Ned', 'Opp'] : ['Brems', 'Brems']); document.body.classList.add('kjorer');
    logg(k.type === 'bil' ? (VW < 900 ? 'Du kjører feltbilen: styrespaken gir gass og styrer, «Brems» nede til høyre. «Gå ut» øverst.' : 'Du kjører feltbilen: W gass, S brems og rygg, A/D styrer, mellomrom håndbrekk. F går ut.')
      : (VW < 900 ? 'Du flyr helikopteret: vent til rotoren går, hold «Opp» for å lette. Styrespaken flyr fram og svinger, «Ned» lander. «Gå ut» når du står på bakken.' : 'Du flyr helikopteret: vent til rotoren går, mellomrom opp, C ned, W/S fram og bak, A/D svinger, Q/E sidelengs. F går ut når du står på bakken.'));
    return true; }
  function ut(tving) { const R = r3(), k = fører(); if (!k) return false;
    if (k.type === 'heli' && !tving && R && R.ut && k.alt !== null && k.over > .3) { if (performance.now() - melding > 2500) { melding = performance.now(); logg('Land helikopteret før du går ut.'); } return false; }
    if (k.type === 'bil' && !tving && Math.abs(k.v) > 2) { if (performance.now() - melding > 2500) { melding = performance.now(); logg('Stopp bilen før du går ut.'); } return false; }
    k.motor = false; k.v = 0; k.vx = k.vy = 0; i = null; lyd(null); Gange.settFører(null); document.body.classList.remove('kjorer'); lagre();
    if (R && R.fot && R.ut && !tving) { const u = R.ut, x = k.X - u.cx, y = k.Y - u.cy, [fx, fy] = fram(k.a), kr = Gange.kropp(); R.bane.avst = 1000;
      // ut på venstre side (eller der det er fritt)
      let px = x - fy * 2.4, py = y + fx * 2.4; for (const [sx, sy] of [[-fy, fx], [fy, -fx], [-fx, -fy], [fx, fy]]) { const qx = x + sx * 2.6, qy = y + sy * 2.6; if (!(typeof hindring3d === 'function' && hindring3d(qx, qy))) { px = qx; py = qy; break; } }
      if (kr) { kr.x = px; kr.y = py; kr.z = (hoyde3d(u.cx + px, u.cy + py) - u.h0) * R.EX; kr.vx = kr.vy = 0; kr.vz = 0; } R.bane.x = px; R.bane.y = py; }
    return true; }
  ramme.ut = () => ut(true);   // «Gå» slått av (eller 3D av) mens du kjører: kjøretøyet blir stående der det er

  // Rammen mens du kjører (kalles fra Gange.kamera): styring, fysikk, kamera bak kjøretøyet
  function ramme(R, I) {
    const k = fører(), u = R.ut; if (!k || !u) return false; const V = verdenFor(R, u, k), dt = I.dt, f = R.fot, b = R.bane;
    let x = k.X - u.cx, y = k.Y - u.cy; x = Math.max(-u.S * .97, Math.min(u.S * .97, x)); y = Math.max(-u.S * .97, Math.min(u.S * .97, y));
    if (k.type === 'bil') { const s = { x, y, z: 0, a: k.a, v: k.v }, r = bilSteg(s, { gass: I.fram, sving: I.side, brems: I.opp || I.ned }, dt, V); Object.assign(k, { a: s.a, v: s.v }); x = s.x; y = s.y; k.z = s.z; k.over = 0;
      if (r.krasj) { const far = Math.abs(k.v) * 5; skad(k, Math.min(.3, far * far * .0009 + .03)); if (performance.now() - melding > 1500) { melding = performance.now(); logg(`Du traff noe. Feltbilen: ${Math.round(k.hp * 100)} %.`); } } }
    else { if (k.alt === null) k.alt = hoyde3d(k.X, k.Y); const s = { x, y, z: (k.alt - u.h0) * R.EX, a: k.a, vx: k.vx, vy: k.vy, vz: k.vz, rotor: k.rotor, motor: true };
      const r = heliSteg(s, { fram: I.fram, gir: I.side, side: (sidelengs.e ? 1 : 0) - (sidelengs.q ? 1 : 0), opp: (I.opp ? 1 : 0) - (I.ned ? 1 : 0) }, dt, V);
      Object.assign(k, { a: s.a, vx: s.vx, vy: s.vy, vz: s.vz, rotor: s.rotor }); x = s.x; y = s.y; k.z = s.z; k.alt = s.z / R.EX + u.h0; k.over = r.over;
      if (r.hardt) { skad(k, .25); if (performance.now() - melding > 1500) { melding = performance.now(); logg(`Hard landing! Helikopteret: ${Math.round(k.hp * 100)} %.`); } }
      // helningen etter farten (nesa ned når du flyr fram)
      const [fx, fy] = fram(k.a), vf = k.vx * fx + k.vy * fy, vs = k.vx * fy - k.vy * fx; k.helning += ((r.landet ? 0 : vf / HELI.maks * .22) - k.helning) * Math.min(1, dt * 3); k.rull += ((r.landet ? 0 : vs / HELI.side * .18) - k.rull) * Math.min(1, dt * 3); }
    // ved kanten av utsnittet (det neste er ikke bygget ennå): stopp opp i stedet for å stange i en usynlig vegg
    if (Math.abs(x) > u.S * .93 || Math.abs(y) > u.S * .93) { k.v = Math.min(k.v || 0, 3); k.vx *= .9; k.vy *= .9; if (performance.now() - melding > 5000) { melding = performance.now(); logg('Venter på kartet lenger fram …'); } }
    k.X = u.cx + x; k.Y = u.cy + y; b.x = x; b.y = y; const kr = Gange.kropp(); if (kr) { kr.x = x; kr.y = y; kr.z = k.z; kr.fart = 0; kr.vx = kr.vy = 0; }
    // kameraet: bak kjøretøyet. Ser du deg rundt (mus/dra), står kameraet der i to sekunder før det glir tilbake bak
    if (Math.abs(f.a - kamA) > 1e-4) kamTid = performance.now(); const fart = k.type === 'bil' ? Math.abs(k.v) : Math.hypot(k.vx, k.vy);
    if (performance.now() - kamTid > 2000 && fart > 1) { let d = k.a - f.a; d = Math.atan2(Math.sin(d), Math.cos(d)); f.a += d * Math.min(1, dt * 2.2); } kamA = f.a;
    const avst = k.type === 'bil' ? 8.5 : 17, opp = k.type === 'bil' ? 2.2 : 3.2, cp = Math.cos(f.pitch), c = R.cam;
    let cx = x + Math.sin(f.a) * cp * avst, cy = y - Math.cos(f.a) * cp * avst, cz = k.z + opp - Math.sin(f.pitch) * avst; const bak = (hoyde3d(u.cx + cx, u.cy + cy) - u.h0) * R.EX + 1; if (cz < bak) cz = bak;
    c.position.set(cx, cy, cz); c.up.set(0, 0, 1); c.lookAt(x, y, k.z + opp * .7);
    R.scene.fog.near = 120; R.scene.fog.far = u.S * .95; c.fov = 62 + Math.min(10, fart * .25); c.aspect = VW / VH; c.near = .3; c.far = u.S * 4 + 3000; c.updateProjectionMatrix(); b.yaw = f.a;
    lyd(k); if (performance.now() - sistLagret > 5000) { sistLagret = performance.now(); lagre(); }
    return true; }
  const sidelengs = { q: false, e: false };
  rot.addEventListener('keydown', e => { const k = e.key.toLowerCase(); if (k === 'q' || k === 'e') sidelengs[k] = true;
    if (k !== 'f' || e.repeat || /INPUT|TEXTAREA|SELECT/.test((e.target && e.target.tagName) || '')) return; const R = r3(); if (!R || !R.fot) return;
    if (fører()) ut(); else { const n = nær(R); if (n !== null) inn(n); } e.preventDefault(); });
  rot.addEventListener('keyup', e => { const k = e.key.toLowerCase(); if (k === 'q' || k === 'e') sidelengs[k] = false; });
  // nærmeste kjøretøy innen 8 m av deg (når du går)
  function nær(R) { const u = R.ut; if (!u || !R.fot || fører()) return null; let best = null, bd = 8; K.forEach((k, n) => { const d = Math.hypot(k.X - u.cx - R.bane.x, k.Y - u.cy - R.bane.y); if (d < bd) { bd = d; best = n; } }); return best; }

  // knappen midt nederst: «Sett deg inn» / «Gå ut»
  const css = document.createElement('style');
  css.textContent = `#kjorknapp{ position:fixed; left:50%; transform:translateX(-50%); bottom:calc(96px + env(safe-area-inset-bottom,0px)); z-index:6; display:none; min-width:190px; min-height:44px; padding:6px 18px;
  background:rgba(28,23,15,.92); border:1px solid #c9b26a; color:#f0e2b0; font:inherit; font-size:16px; cursor:pointer; } #kjorknapp.på{ display:block; }
body.kort #kjorknapp{ bottom:calc(226px + env(safe-area-inset-bottom,0px)); font-size:15px; min-width:170px; } body.kjorer #kjorknapp{ bottom:auto; top:calc(var(--topp,58px) + 112px); min-width:0; min-height:36px; padding:4px 14px; font-size:14px; }`;
  document.head.appendChild(css);
  const knapp = document.createElement('button'); knapp.id = 'kjorknapp'; knapp.type = 'button'; document.body.appendChild(knapp);
  knapp.addEventListener('click', e => { e.preventDefault(); const R = r3(); if (!R || !R.fot) return; if (fører()) ut(); else { const n = nær(R); if (n !== null) { if (K[n].hp < .15) reparer(n); else inn(n); } } });

  // hver ramme i 3D: modellene på plass, rotoren går rundt, knappen
  KROKER.ramme3d.push(R => { if (!klar || !R.ut || typeof THREE === 'undefined') return; const u = R.ut;
    if (!sett) sett = plasser(R, u);
    if (fører() && !R.fot) ut(true);
    for (const k of K) { const x = k.X - u.cx, y = k.Y - u.cy, m = modell(R, k); if (Math.abs(x) > u.S || Math.abs(y) > u.S) { m.visible = false; continue; } m.visible = true;
      const bak = (hoyde3d(k.X, k.Y) - u.h0) * R.EX; let z = bak;
      if (k === fører()) z = k.z; else if (k.type === 'heli') { if (k.alt !== null && k.alt > hoyde3d(k.X, k.Y) + .05) { k.vz = (k.vz || 0) - 4 * .016; k.alt = Math.max(hoyde3d(k.X, k.Y), k.alt + k.vz * .016); } z = k.alt !== null ? (k.alt - u.h0) * R.EX : bak; k.rotor = Math.max(0, k.rotor - .016 / HELI.spol); k.helning *= .95; k.rull *= .95; }
      else { const V = verdenFor(R, u, k); z = V.høyde(x, y); }
      m.position.set(x, y, z); m.rotation.set(k.type === 'heli' ? k.rull : 0, k.type === 'heli' ? k.helning : 0, k.a + Math.PI / 2);
      // bilen følger bakken: nesa opp og ned etter terrenget foran og bak
      if (k.type === 'bil') { const V = verdenFor(R, u, k), [fx, fy] = fram(k.a), zf = V.høyde(x + fx * 1.4, y + fy * 1.4), zb = V.høyde(x - fx * 1.4, y - fy * 1.4), zh = V.høyde(x + fy * .9, y - fx * .9), zv = V.høyde(x - fy * .9, y + fx * .9);
        m.rotation.y = -Math.atan2(zf - zb, 2.8); m.rotation.x = Math.atan2(zv - zh, 1.8); m.position.z = Math.max(z, (zf + zb) / 2); }
      if (k.ro) { k.ro.rotation.z += k.rotor * 38 * .016; k.hr.rotation.z += k.rotor * 60 * .016; } }
    const n = nær(R), f = fører(), t = f ? (VW < 900 ? 'Gå ut' : 'Gå ut (F)') : n !== null && K[n].hp < .15 ? `Reparer ${NAVN[K[n].type].toLowerCase()}${K[n].type === 'bil' ? 'en' : 'et'} (${Math.round(repPris(K[n]) / 1000)} 000 kr)` : n !== null ? `Sett deg inn i ${NAVN[K[n].type].toLowerCase()}${K[n].type === 'bil' ? 'en' : 'et'}${VW < 900 ? '' : ' (F)'}` : '';
    knapp.classList.toggle('på', !!t && !!R.fot); if (t && knapp.textContent !== t) knapp.textContent = t; });
  setInterval(() => { const R = r3(); if (!R || !R.fot || typeof på3d === 'undefined' || !på3d) knapp.classList.remove('på'); }, 500);

  // farten, høyden og rotoren nederst i bildet
  KROKER.tegn3d.push(g => { const k = fører(); if (!k) return; g.save(); g.font = '600 15px sans-serif'; g.textAlign = 'center'; g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,.7)'; g.fillStyle = '#f0e2b0';
    const fart = k.type === 'bil' ? Math.abs(k.v) : Math.hypot(k.vx, k.vy), t = k.type === 'bil' ? `${Math.round(fart * 3.6)} km/t${k.v < -.3 ? ' · rygger' : ''}` : k.rotor < .9 ? `Rotoren spoler opp … ${Math.round(k.rotor / .9 * 100)} %` : `${Math.round(fart * 3.6)} km/t · ${Math.round(Math.max(0, k.over || 0))} m over bakken`;
    const y = VH - (VW < 900 ? 190 : 46); g.strokeText(t, VW / 2, y); g.fillText(t, VW / 2, y); g.restore(); });
  // 2D-kartet: et lite merke der kjøretøyene står
  KROKER.tegn.push((g, vx0, vy1) => { if (!klar || kam.m > 6) return; g.save(); g.font = '11px sans-serif'; g.textAlign = 'center';
    for (const k of K) { const x = (k.X - vx0) / kam.m, y = (vy1 - k.Y) / kam.m; if (x < -20 || y < -20 || x > VW + 20 || y > VH + 20) continue;
      g.fillStyle = 'rgba(22,18,12,.8)'; g.strokeStyle = '#d8c98a'; g.lineWidth = 1.2; g.beginPath(); g.arc(x, y, 7, 0, 6.283); g.fill(); g.stroke(); g.fillStyle = '#d8c98a'; g.textBaseline = 'middle'; g.fillText(k.type === 'bil' ? 'B' : 'H', x, y + .5); g.textBaseline = 'alphabetic';
      if (kam.m < 1.2) { const t = NAVN[k.type], ty = rot.Etikett ? Etikett.tekst(g, t, x, y + 20, 1) : y + 20; g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,.7)'; g.strokeText(t, x, ty); g.fillStyle = '#f2ead6'; g.fillText(t, x, ty); } }
    g.restore(); });
  rot.KjorSpill = { reparer, skad, repPris, start, liste: () => K, fører, inn, ut, nær: () => (r3() ? nær(R3) : null), lagre, plassert: () => sett };
})(typeof window !== 'undefined' ? window : globalThis);
