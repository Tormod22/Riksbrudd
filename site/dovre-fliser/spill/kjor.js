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
  // RUNDE 10 (20. nov, brukerens bilder 3 og 4: «bilen står vippet på skrå/på siden»). Bilen står nå på fire hjul: stigningen (fram/bak)
  // og sidehellingen regnes fra høyden under hvert hjul, begrenses til det en feltbil tåler, og glattes i visningen. Kjører du mot noe
  // brattere, stopper bilen (og sklir ned der det er for bratt å stå) i stedet for å vippe. Tallene er Claudes forslag.
  const STILLING = {
    // hjulene i modellen: halv akselavstand (fram +x) og halv sporvidde (venstre +y), i meter
    hx: 1.33, hy: .86,
    // største vinkel bilen vises med (radianer): ca. 34° stigning og 26° sidehelling
    maksStigning: .6, maksSide: .45,
    // brattere enn dette (tangens) kjører den ikke opp: ca. 37° (en terrenggående bil klarer ca. 35–40°); på skrå over ca. 31° og
    // bratt nedover kryper den
    tanOpp: .75, tanSide: .6,
    // står den der det er brattere enn dette (tangens, ca. 42°), sklir den nedover med denne farten (m/s); krabbe = høyeste fart (m/s)
    // bratt nedover eller på skrå
    tanGli: .9, gliFart: 1.6, krabbe: 3,
    // hvor fort vinklene i visningen følger bakken (per sekund)
    glatt: 9,
  };
  // Høyden under de fire hjulene (venstre foran, høyre foran, venstre bak, høyre bak) for en bil i (x, y) med kurs a.
  function hjulHøyder(x, y, a, høyde, S = STILLING) { const fx = -Math.sin(a), fy = Math.cos(a), lx = -fy, ly = fx, ut = [];
    for (const [sx, sy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) ut.push(høyde(x + fx * S.hx * sx + lx * S.hy * sy, y + fy * S.hx * sx + ly * S.hy * sy)); return ut; }
  // Stillingen bilen skal vises med: stigning (rotasjon om modellens y; negativ = nesa opp), side (om modellens x; positiv = venstre
  // side opp) og z (midten nederst), slik at ingen hjul står under bakken og minst ett står på den. Vinklene er begrenset.
  function stilling(x, y, a, høyde, S = STILLING) { const h = hjulHøyder(x, y, a, høyde, S);
    const fram = (h[0] + h[1]) / 2 - (h[2] + h[3]) / 2, side = (h[0] + h[2]) / 2 - (h[1] + h[3]) / 2;
    const st = Math.max(-S.maksStigning, Math.min(S.maksStigning, -Math.atan2(fram, 2 * S.hx))), sd = Math.max(-S.maksSide, Math.min(S.maksSide, Math.atan2(side, 2 * S.hy)));
    return { stigning: st, side: sd, z: zFor(h, st, sd, S), hjul: h, tanFram: fram / (2 * S.hx), tanSide: side / (2 * S.hy) }; }
  // z for gitte vinkler: hjulet i (wx, wy) ligger off = −wx·sin(st) + wy·sin(sd)·cos(st) over midten
  function zFor(h, st, sd, S = STILLING) { let z = -Infinity; [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([sx, sy], n) => { const off = -sx * S.hx * Math.sin(st) + sy * S.hy * Math.sin(sd) * Math.cos(st); z = Math.max(z, h[n] - off); }); return z; }
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
      // (runde 10) bakken under hjulene der bilen ville stått: for bratt opp -> bilen stopper (og sklir tilbake der det er svært bratt);
      // bratt ned eller på skrå -> den kryper (høyst STILLING.krabbe m/s) og sklir sidelengs nedover i stedet for å vippe. Slik kan du
      // alltid kjøre deg løs igjen (nedover eller langs), og bilen vises aldri med mer helling enn den tåler.
      const S = STILLING, p = stilling(nx, ny, k.a, verden.høyde), bakke = p.tanFram * Math.sign(k.v || 1);
      if (bakke > S.tanOpp) { k.v = 0; k.z = verden.høyde(k.x, k.y); gli(k, dt, verden); return { krasj: false, bratt: true }; }
      if (-bakke > S.tanOpp || Math.abs(p.tanSide) > S.tanSide) { if (Math.abs(k.v) > S.krabbe) k.v = Math.sign(k.v) * Math.max(S.krabbe, Math.abs(k.v) - 8 * dt); k.x = nx; k.y = ny; k.z = verden.høyde(k.x, k.y); gli(k, dt, verden, S.tanSide); return { krasj, bratt: true }; }
      k.x = nx; k.y = ny; }
    k.z = verden.høyde(k.x, k.y); if (Math.abs(k.v) < .5) gli(k, dt, verden); return { krasj };
  }
  // Står bilen der det er brattere enn STILLING.tanGli, sklir den sakte nedover (ikke inn i hindringer eller vann).
  function gli(k, dt, verden, grense = STILLING.tanGli) { const e = 1.5, gx = (verden.høyde(k.x + e, k.y) - verden.høyde(k.x - e, k.y)) / (2 * e), gy = (verden.høyde(k.x, k.y + e) - verden.høyde(k.x, k.y - e)) / (2 * e), g = Math.hypot(gx, gy);
    if (g <= grense) return false; const s = STILLING.gliFart * dt / g, nx = k.x - gx * s, ny = k.y - gy * s;
    if (verden.hindring(nx, ny) || verden.vann(nx, ny)) return false; k.x = nx; k.y = ny; k.z = verden.høyde(nx, ny); k.glir = true; return true; }
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
  // RUNDE 13 (21. nov, kritiker H: «Sett deg inn i feltbilen (F)» sto midt på skjermen uten at noen bil syntes – bilen sto bak ham).
  // Hvor kjøretøyet står sett fra deg: (dx, dy) = kjøretøyet minus deg (meter), a = kursen din (du ser mot (−sin a, cos a)).
  // Gir { d, rel (radianer, + = til høyre), foran, tekst ('foran deg' | 'til høyre' | 'til venstre' | 'bak deg') }.
  // Claudes forslag: «foran» innenfor 35° til hver side (godt inne i bildet), «bak» fra 130°.
  const RETNING = { foran: 35, bak: 130 };
  function retning(dx, dy, a, R = RETNING) {
    const d = Math.hypot(dx, dy), rel = Math.atan2(dx * Math.cos(a) + dy * Math.sin(a), -dx * Math.sin(a) + dy * Math.cos(a)), g = Math.abs(rel) * 180 / Math.PI;
    const foran = g <= R.foran;
    return { d, rel, foran, tekst: foran ? 'foran deg' : g >= R.bak ? 'bak deg' : rel > 0 ? 'til høyre' : 'til venstre' };
  }
  // Teksten på knappen: står kjøretøyet foran deg, som før; ellers med avstand og retning, så du vet hvor du skal snu deg
  // («Feltbilen 6 m bak deg · Sett deg inn (F)»). navn = «feltbilen», tast = ' (F)' på PC og '' på telefon.
  function innTekst(navn, r, tast) {
    if (r.foran) return `Sett deg inn i ${navn}${tast}`;
    return `${navn.charAt(0).toUpperCase() + navn.slice(1)} ${Math.max(1, Math.round(r.d))} m ${r.tekst} · Sett deg inn${tast}`;
  }
  const api = { BIL, HELI, STILLING, bilSteg, heliSteg, fram, stilling, hjulHøyder, zFor, RETNING, retning, innTekst };
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
  // (16. nov: «mer detaljerte 3D-modeller, typ helikopter») Byggeklosser: boks (kan vris om z og vippes om y), rør langs en akse, hjul med felg
  const farg = (g, c) => { const n = g.attributes.position.count, f = new Float32Array(n * 3); for (let q = 0; q < n; q++) f.set(c, q * 3); g.setAttribute('color', new THREE.BufferAttribute(f, 3)); return g; };
  function boks(d, x, y, z, sx, sy, sz, c, rz, ry) { const g = new THREE.BoxGeometry(sx, sy, sz).toNonIndexed(); if (ry) g.rotateY(ry); if (rz) g.rotateZ(rz); g.translate(x, y, z + sz / 2); d.push(farg(g, c)); }
  function rør(d, x, y, z, r, l, akse, c, seg, r2) { const g = new THREE.CylinderGeometry(r2 === undefined ? r : r2, r, l, seg || 8).toNonIndexed(); if (akse === 'x') g.rotateZ(-Math.PI / 2); else if (akse === 'z') g.rotateX(Math.PI / 2); g.translate(x, y, z); d.push(farg(g, c)); }
  function hjul(d, x, y, r) { const g = new THREE.CylinderGeometry(r, r, .3, 14).toNonIndexed(); g.translate(x, y, r); d.push(farg(g, [.08, .08, .09])); const f = new THREE.CylinderGeometry(r * .55, r * .55, .32, 10).toNonIndexed(); f.translate(x, y, r); d.push(farg(f, [.33, .35, .33])); }
  const ett = d => MODELLER.samle(d);
  // FELTBILEN: ramme, panser, førerhus med skrå frontrute, skjermer over hjulene, støtfangere, grill, lykter, reservehjul, takbøyle, speil
  function bilModell() { const d = [], o = [.3, .36, .24], m = [.22, .27, .18], sv = [.1, .1, .11], gl = [.5, .63, .7], lys = [.96, .94, .8];
    boks(d, 0, 0, .42, 4.1, 1.72, .5, o); boks(d, 0, 0, .34, 3.6, 1.3, .12, sv);                                     // karosseri og ramme
    boks(d, 1.38, 0, .92, 1.3, 1.6, .28, o); boks(d, 1.38, 0, 1.2, 1.0, .5, .04, m);                                  // panser med luftinntak
    boks(d, -.5, 0, .92, 2.4, 1.72, .32, o);                                                                           // kasse rundt førerhuset
    boks(d, -.62, 0, 1.24, 1.9, 1.62, .62, m); boks(d, -.62, 0, 1.86, 2.0, 1.7, .07, o);                               // førerhus og tak
    boks(d, .5, 0, 1.22, .06, 1.5, .66, gl, 0, -.38); boks(d, -1.6, 0, 1.3, .05, 1.4, .46, gl);                        // frontrute (skrå) og bakrute
    for (const sy of [-1, 1]) { boks(d, -.25, sy * .82, 1.32, .8, .04, .44, gl); boks(d, -1.05, sy * .82, 1.32, .62, .04, .44, gl);   // sideruter
      boks(d, -.66, sy * .87, .98, .04, .03, .86, sv);                                                                 // dørsprekk
      for (const sx of [1.35, -1.3]) { boks(d, sx, sy * .84, .82, 1.1, .2, .1, sv); boks(d, sx - .5, sy * .84, .5, .1, .2, .36, sv); boks(d, sx + .5, sy * .84, .5, .1, .2, .36, sv); }   // skjermer
      boks(d, 2.07, sy * .58, .74, .06, .3, .22, lys); boks(d, 2.07, sy * .22, .76, .05, .14, .14, [.9, .55, .1]);     // hovedlys og blinklys
      boks(d, -2.07, sy * .66, .78, .06, .2, .26, [.75, .1, .08]);                                                     // baklys
      boks(d, .62, sy * .95, 1.32, .12, .06, .2, sv); boks(d, .6, sy * 1.02, 1.36, .05, .16, .22, m);                   // speil
      boks(d, .1, sy * .8, 1.93, .06, .06, .3, sv); boks(d, -1.5, sy * .8, 1.93, .06, .06, .3, sv); boks(d, -.7, sy * .8, 2.2, 1.7, .05, .05, sv); }   // takbøyle
    boks(d, -.7, 0, 2.2, .05, 1.65, .05, sv); boks(d, .1, 0, 2.2, .05, 1.65, .05, sv); boks(d, -1.5, 0, 2.2, .05, 1.65, .05, sv);
    for (let q = -3; q <= 3; q++) boks(d, 2.06, q * .09, .82, .04, .04, .3, sv);                                       // grill
    boks(d, 2.14, 0, .36, .14, 1.86, .2, sv); boks(d, -2.14, 0, .36, .14, 1.86, .2, sv); boks(d, 2.24, 0, .5, .06, .9, .3, sv);   // støtfangere og kufanger
    rør(d, -2.2, 0, 1.05, .36, .26, 'x', [.08, .08, .09], 12); rør(d, -2.34, 0, 1.05, .2, .04, 'x', [.33, .35, .33], 10);   // reservehjul
    boks(d, -1.75, -.6, 1.0, .16, .34, .46, [.36, .12, .1]); rør(d, -1.2, .7, 2.6, .012, 1.4, 'z', sv, 4);              // bensinkanne og antenne
    for (const sx of [-1.3, 1.35]) for (const sy of [-.86, .86]) hjul(d, sx, sy, .44); return ett(d); }
  // (runde 10, brukerens bilder 3–5: «kantete og billig – rette klosser, svart hjulboks») FELTBILEN på nytt i stil med de avrundede
  // figurene: avrundet karosseri og førerhus som smalner mot taket, skrå frontrute, ruter med mørk ramme, skjermer som buer over hjulene,
  // hjul med runde dekkskuldre, felg og nav, runde lykter, grill, støtfangere, reservehjul bak, speil. Ca. 6500 trekanter (én bil).
  function bilModellRund() { const F = Kjoretoy3d.form, d = [], o = [.31, .37, .25], m = [.24, .29, .19], mm = [.2, .24, .16], sv = [.09, .09, .1], ra = [.13, .14, .12], gl = [.46, .58, .66], lys = [.97, .95, .84];
    F.rundBoks(d, 0, 0, .3, 3.7, 1.2, .3, .08, sv);                                                                      // understell
    F.rundBoks(d, -.05, 0, .5, 4.2, 1.76, .64, .17, o, { fin: true });                                                 // karosseriet nede
    F.rundBoks(d, 1.32, 0, 1.06, 1.56, 1.66, .2, .1, o); boks(d, 1.28, 0, 1.24, .8, .52, .04, m);   // panser med luftinntak
    F.rundBoks(d, -.62, 0, 1.06, 2.52, 1.72, .9, .2, o, { fin: true, smal: .9, skrå: .42 });                             // førerhuset
    F.rundBoks(d, -.72, 0, 1.92, 2.2, 1.56, .1, .05, m);                                                                // taket
    // frontrute (skrå) med ramme, sideruter og bakrute med mørk ramme
    boks(d, .44, 0, 1.27, .03, 1.46, .6, ra, 0, -.43); boks(d, .46, 0, 1.31, .03, 1.34, .52, gl, 0, -.43);
    for (const sy of [-1, 1]) { for (const [x, l] of [[.02, .78], [-.95, .9]]) { boks(d, x, sy * .815, 1.27, l + .08, .02, .52, ra); boks(d, x, sy * .83, 1.31, l, .02, .44, gl); }
      boks(d, -.43, sy * .885, .58, .03, .015, .95, sv); boks(d, .2, sy * .89, .98, .16, .03, .04, sv);                  // dørsprekk og håndtak
      F.skjerm(d, 1.33, sy * .83, .44, .55, .38, mm); F.skjerm(d, -1.33, sy * .83, .44, .55, .38, mm);                   // skjermene
      F.rundHjul(d, 1.33, sy * .83, .44, .3); F.rundHjul(d, -1.33, sy * .83, .44, .3);                                   // hjulene
      F.lykt(d, 2.07, sy * .6, .9, .13, lys); boks(d, 2.08, sy * .6, .68, .05, .2, .1, [.92, .58, .12]);       // lykter og blinklys
      F.rundBoks(d, -2.14, sy * .66, .78, .06, .2, .28, .03, [.76, .1, .08]);                                            // baklys
      boks(d, .62, sy * .95, 1.36, .05, .2, .04, sv); F.rundBoks(d, .62, sy * 1.06, 1.24, .1, .1, .22, .035, m); }   // speil
    F.rundBoks(d, 2.06, 0, .66, .08, .82, .46, .04, sv); for (const z of [.76, .88, 1.0]) boks(d, 2.1, 0, z, .02, .74, .03, m);   // grill
    F.rundBoks(d, 2.14, 0, .4, .16, 1.7, .15, .06, sv); F.rundBoks(d, -2.17, 0, .4, .16, 1.7, .15, .06, sv);           // støtfangere
    // reservehjulet på bakdøra (dreid fra langs y til langs x) og en kanne
    { const t = []; F.rundHjul(t, 0, 0, .36, .24); for (const g of t) { g.translate(0, 0, -.36); g.rotateZ(Math.PI / 2); g.translate(-2.3, 0, 1.08); d.push(g); } }
    F.rundBoks(d, -2.22, -.62, .64, .16, .32, .48, .04, [.36, .13, .1]); rør(d, -1.4, .7, 2.5, .012, 1.3, 'z', sv, 4);   // kanne og antenne
    return MODELLER.samle(d); }
  // HELIKOPTERET: avrundet skrog i trinn, nese med glass, motor på taket med eksosrør, halebom som smalner, halefinne og stabilisator,
  // meier på stag, dører, lanterner og antenner. Rotorene er egne nett (rotorModell) og går rundt.
  function heliModell() { const d = [], o = [.27, .33, .24], m = [.18, .22, .16], sv = [.1, .1, .11], gl = [.42, .58, .68], gl2 = [.3, .44, .54];
    boks(d, .3, 0, .78, 4.2, 1.9, 1.5, o); boks(d, .3, 0, .62, 3.9, 1.5, .2, m); boks(d, .3, 0, 2.26, 3.4, 1.5, .16, o);   // kabin, buk og tak
    for (const sy of [-1, 1]) { boks(d, .3, sy * .98, .95, 3.9, .1, 1.1, o);                                            // litt bredere midtparti
      boks(d, 1.3, sy * 1.04, 1.4, 1.0, .04, .62, gl); boks(d, .1, sy * 1.04, 1.4, 1.0, .04, .62, gl); boks(d, -1.0, sy * 1.04, 1.45, .7, .04, .5, gl2);   // vinduer
      boks(d, .7, sy * 1.045, .9, .04, .03, 1.2, sv); boks(d, -.45, sy * 1.045, .9, .04, .03, 1.2, sv); boks(d, .1, sy * 1.06, 1.1, .2, .04, .05, sv);   // dørsprekker og håndtak
      // meier: langt rør med oppbøyd tupp, på to skrå stag
      rør(d, .35, sy * 1.25, .1, .07, 3.9, 'x', sv); boks(d, 2.38, sy * 1.25, .1, .5, .12, .1, sv, 0, -.5);
      for (const sx of [-.8, 1.4]) boks(d, sx, sy * 1.12, .12, .1, .1, .74, sv, 0, 0), boks(d, sx, sy * 1.0, .62, .1, .34, .08, sv);
      boks(d, .5, sy * 1.1, 1.0, .1, .06, .1, sy < 0 ? [.1, .75, .2] : [.85, .1, .08]);                                 // lanterner: grønn styrbord, rød babord
      rør(d, -1.25, sy * .62, 2.5, .13, .9, 'x', [.2, .2, .21], 8); }                                                    // eksosrør
    // nesa i tre trinn, med frontruter
    boks(d, 2.75, 0, .8, 1.0, 1.7, 1.2, o); boks(d, 3.45, 0, .82, .6, 1.3, .9, o); boks(d, 3.85, 0, .9, .3, .8, .55, m);
    boks(d, 2.95, 0, 1.75, 1.2, 1.5, .06, gl, 0, .62); boks(d, 2.5, 0, 2.0, .5, 1.6, .28, gl); boks(d, 3.3, 0, 1.08, .06, 1.2, .5, gl2, 0, -.2);
    for (const sy of [-1, 1]) boks(d, 2.6, sy * .86, 1.42, .9, .04, .6, gl);
    // motorhus, rotormast og nav
    boks(d, -.2, 0, 2.42, 2.4, 1.0, .5, m); boks(d, .9, 0, 2.42, .5, .8, .34, o, 0, .5); boks(d, -1.5, 0, 2.42, .4, .7, .36, sv);
    rør(d, .2, 0, 3.08, .1, .4, 'z', sv, 8); rør(d, .2, 0, 3.26, .22, .1, 'z', [.3, .3, .32], 10);
    // halebom som smalner, med drivaksel på toppen, finne, stabilisator og halestøtte
    boks(d, -2.7, 0, 1.55, 1.8, .6, .7, o); boks(d, -4.3, 0, 1.68, 1.6, .44, .5, o); boks(d, -5.8, 0, 1.78, 1.5, .32, .36, o); rør(d, -4.4, 0, 2.3, .05, 4.6, 'x', sv, 6);
    boks(d, -6.75, 0, 2.0, 1.0, .1, 1.5, m, 0, .45); boks(d, -6.35, 0, 1.55, .5, .1, .5, m, 0, -.5); boks(d, -5.9, 0, 1.85, .5, 1.9, .07, m);
    for (const sy of [-1, 1]) boks(d, -5.9, sy * .95, 1.7, .5, .06, .4, m);
    boks(d, -6.5, 0, 1.2, .08, .08, .5, sv, 0, .5); boks(d, -6.95, 0, 3.05, .1, .1, .1, [.95, .95, .9]); boks(d, -6.75, 0, 2.6, .22, .2, .22, sv);   // halestøtte, hvit lanterne, girhus
    rør(d, 1.3, 0, 2.75, .012, .7, 'z', sv, 4); rør(d, -2.6, 0, 2.55, .012, .6, 'z', sv, 4); boks(d, 1.6, 0, .48, .5, .5, .1, sv);   // antenner og lyskaster
    boks(d, -3.2, .31, 1.75, 1.2, .01, .16, [.8, .78, .7]); boks(d, -3.2, -.31, 1.75, 1.2, .01, .16, [.8, .78, .7]);   // lys stripe på bommen
    return ett(d); }
  // rotor: n blader som smalner utover, med feste ved navet
  function rotorModell(r, b, n = 4) { const d = [], sv = [.07, .07, .08]; for (let q = 0; q < n; q++) { const v = q * 2 * Math.PI / n, c = Math.cos(v), s = Math.sin(v);
      boks(d, c * r * .3, s * r * .3, 0, r * .52, b * 1.15, .05, sv, v); boks(d, c * r * .76, s * r * .76, 0, r * .46, b * .8, .04, sv, v); boks(d, c * r * .985, s * r * .985, 0, r * .03, b * .8, .045, [.85, .7, .1], v); }
    rør(d, 0, 0, .03, b * 1.1, .12, 'z', [.3, .3, .32], 10); return ett(d); }
  let mat = null;
  function modell(R, k) { if (k.m && k.m.parent === R.scene) return k.m; if (!mat) mat = new THREE.MeshLambertMaterial({ vertexColors: true });
    const g = new THREE.Group(), kropp = new THREE.Mesh(k.type === 'bil' ? (rot.Kjoretoy3d && Kjoretoy3d.form ? bilModellRund() : bilModell()) : heliModell(), mat); g.add(kropp); g.userData.kilde = 'kjor.js';
    if (k.type === 'heli') { const ro = new THREE.Mesh(rotorModell(5.6, .36, 4), mat); ro.position.set(.2, 0, 3.32); g.add(ro); k.ro = ro; const hr = new THREE.Mesh(rotorModell(.95, .16, 2), mat); hr.rotation.x = Math.PI / 2; hr.position.set(-6.7, .3, 2.6); g.add(hr); k.hr = hr; }
    g.rotation.order = 'ZYX'; R.scene.add(g); k.m = g; return g; }

  // --- verden slik reglene ser den, i utsnittets meter ---
  // (runde 10) bakken = terrengnettet slik det er tegnet (nettHoyde i index.html) – vegene og brudekket ligger på det, så hjulene står
  // på det du ser (hoyde3d er jevnere enn nettet, og et hjul kunne stå i lufta eller under bakken)
  function verdenFor(R, u, k) { const terr = typeof nettHoyde === 'function' ? (x, y) => nettHoyde(u, x, y) : (x, y) => (hoyde3d(u.cx + x, u.cy + y) - u.h0) * R.EX, vann = rot.Gange && Gange.vannVed ? Gange.vannVed(u) : () => false;
    const dekke = (x, y) => (rot.Liv3d && Liv3d.dekke ? Liv3d.dekke(u, x, y) : null);
    // (runde 10) vegbanen ligger ofte litt over terrengnettet (målt 0,7 m ved Dombås). Et hjul på asfalten og et ved siden av ga bilen
    // på skrå (brukerens bilde 3). For bilen skrår bakken nå jevnt ned fra vegkanten over VEGSKULDER meter (bredere når
    // vegen ligger høyt: aldri brattere enn 1 : 2,5; opptil 6 m – så kjører du ikke inn under en høy veg), som en vegfylling.
    // Alle vegene innen 20 m teller (den høyeste fyllingen vinner): ved en rampe eller bru kan den nærmeste vegen ligge lavere enn en
    // annen rett ved siden av.
    const vegFylling = (x, y, t) => { const V = u.vegRute; if (!V || !V.ru) return t; const linjer = new Set(); V.ru.nærmest(x, y, 20, li => { linjer.add(li); return false; }); let h = t;
      for (const li of linjer) { const b = V.ru.nærmest(x, y, 20, l => l === li); if (!b) continue; const v = V.alle[b.li], kant = v.w + .3, p = v.P[b.i - 1], q = v.P[b.i]; if (!p || !q) continue;
        const z = p[2] + (q[2] - p[2]) * b.f; if (!(z > t) || z - t > 6) continue; const br = Math.max(VEGSKULDER, (z - t) * 2.5); if (b.d > kant + br) continue;
        let w = b.d <= kant ? 1 : 1 - (b.d - kant) / br; w = w * w * (3 - 2 * w); h = Math.max(h, t + (z - t) * w); }
      return h; };
    return { høyde: (x, y) => { const t = terr(x, y), d = k.type === 'bil' ? dekke(x, y) : null; return d !== null && d > t && d - t < 30 ? d : k.type === 'bil' ? vegFylling(x, y, t) : t; },
      hindring: (x, y) => typeof hindring3d === 'function' && !!hindring3d(x, y), vann: (x, y) => (vann(x, y) || !!(u.iElv && u.iElv(x, y))) && !(k.type === 'bil' && dekke(x, y) !== null),
      vei: (x, y) => !!(u.påVeg && u.påVeg(x, y)) || dekke(x, y) !== null || !!(rot.LeirSpill && LeirSpill.påEgenVeg && LeirSpill.påEgenVeg(u.cx + x, u.cy + y)) }; }
  // hvor bred vegfyllingen er for bilen (m) – Claudes forslag
  const VEGSKULDER = 2.5;
  // første gang kjøretøyene er i utsnittet: flytt dem til et fritt sted (ikke i hus, trær eller vann), helikopteret til helikopterplassen hvis den finnes
  function plasser(R, u) { const L = rot.LeirSpill && LeirSpill.tilstand();
    for (const k of K) { if (!k.ny) continue; let x = k.X - u.cx, y = k.Y - u.cy; if (Math.abs(x) > u.S * .9 || Math.abs(y) > u.S * .9) return false;
      const hp = k.type === 'heli' && L && L.bygg.find(b => b.type === 'helikopterplass' && rot.Leir.ferdig(b)); if (hp) { k.X = hp.x; k.Y = hp.y; k.ny = false; continue; }
      const V = verdenFor(R, u, k), fri = (px, py) => ![[0, 0], [2.5, 0], [-2.5, 0], [0, 2.5], [0, -2.5], [2, 2], [-2, -2], [2, -2], [-2, 2]].some(([dx, dy]) => V.hindring(px + dx, py + dy) || V.vann(px + dx, py + dy)) && !(rot.Interior3d && Interior3d.iLeirbygg(px, py));
      let ok = fri(x, y); for (let r = 3; r <= 90 && !ok; r += 3) for (let q = 0; q < 12 && !ok; q++) { const v = q / 12 * 6.283, px = x + Math.cos(v) * r, py = y + Math.sin(v) * r; if (fri(px, py)) { x = px; y = py; ok = true; } }
      k.X = u.cx + x; k.Y = u.cy + y; k.ny = false; }
    lagre(); return true; }

  // EGNE KJØRETØY (lastebilkolonner, speiderbil, stridsvogn … i KJORETOY) kan også kjøres: «egen» er en stedfortreder som følger
  // bilreglene og skriver plassen og retningen tilbake til kjøretøyet (resten av kolonnen følger rett bak). Ikke mens det har en ordre.
  let egen = null;
  const fører = () => egen || (i === null ? null : K[i]);
  const egneNær = (R, bd) => { const u = R.ut; let best = null; for (const kj of rot.KJORETOY || []) { if (kj.side !== 'blå' || kj.sti || kj.oppdrag) continue; const d = Math.hypot(kj.x - u.cx - R.bane.x, kj.y - u.cy - R.bane.y); if (d < bd) { bd = d; best = kj; } } return best; };
  function innEgen(kj) { const R = r3(); if (!R || !R.fot || fører()) return false; egen = { type: 'bil', kj, X: kj.x, Y: kj.y, a: kj.retning - Math.PI / 2, v: 0, vx: 0, vy: 0, vz: 0, rotor: 0, hp: 1, alt: null, over: 0, motor: true };
    kamA = R.fot.a = egen.a; R.fot.pitch = -.12; kamTid = 0; kamP = null; Gange.settFører(ramme, ['Brems', 'Gass']); document.body.classList.add('kjorer', 'kjorbil'); logg(`Du kjører ${kj.navn}. ${VW < 900 ? 'Styrespaken styrer og gir gass; «Gass» og «Brems» nede til høyre.' : 'W gass, S brems og rygg, A/D styrer. F går ut.'}`); return true; }
  // SKADE OG REPARASJON: krasj og harde landinger sliter på kjøretøyet; under 15 % starter det ikke før det er reparert
  const REP = { bil: 4e5, heli: 2e6 }, repPris = k => Math.max(1e4, Math.round(REP[k.type] * (1 - k.hp) / 1e4) * 1e4);
  function skad(k, d) { if (k.kj) return; k.hp = Math.max(0, k.hp - d); if (k.hp < .15) { logg(`${NAVN[k.type]}${k.type === 'bil' ? 'en' : 'et'} er ødelagt og må repareres.`); if (k === fører() && (k.type === 'bil' || k.over < .5)) ut(true); } lagre(); }
  function reparer(n) { const k = K[n]; if (!k || k.hp >= .995) return false; const p = repPris(k); if (!OppstartSpill.betal(p)) { logg(`Ikke nok penger til å reparere (${Math.round(p / 1000)} 000 kr).`); return false; } k.hp = 1; lagre(); logg(`${NAVN[k.type]}${k.type === 'bil' ? 'en' : 'et'} er reparert.`); return true; }
  // MOTORLYD: en enkel tone som følger farten (bil) eller rotoren (helikopter); følger ☰ «Lyd»
  let ac = null, osc = null, gain = null;
  function lyd(k) { try { if (localStorage.getItem('riksbrudd-lyd') === 'av') { if (gain) gain.gain.value = 0; return; } if (!ac) { ac = new (window.AudioContext || window.webkitAudioContext)(); osc = ac.createOscillator(); gain = ac.createGain(); const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 420; osc.type = 'sawtooth'; gain.gain.value = 0; osc.connect(f).connect(gain).connect(ac.destination); osc.start(); }
      if (!k) { gain.gain.value = 0; return; } const fart = k.type === 'bil' ? Math.abs(k.v) : Math.hypot(k.vx, k.vy); osc.frequency.value = k.type === 'bil' ? 48 + fart * 4.5 : 24 + k.rotor * 26 + fart * .3; gain.gain.value = k.type === 'bil' ? .05 + Math.min(.06, fart * .003) : .1 * k.rotor; } catch (e) { /* ingen lyd */ } }
  function inn(n) { const R = r3(); if (!R || !R.fot || !K[n]) return false; if (K[n].hp < .15) { logg(`${NAVN[K[n].type]}${K[n].type === 'bil' ? 'en' : 'et'} er ødelagt. Reparer ${K[n].type === 'bil' ? 'den' : 'det'} først.`); return false; } i = n; const k = K[n]; kamA = R.fot.a = k.a; R.fot.pitch = k.type === 'heli' ? -.22 : -.12; kamTid = 0; kamP = null; k.motor = true; if (k.type === 'heli') R.bane.avst = 2400;
    Gange.settFører(ramme, k.type === 'heli' ? ['Ned', 'Opp'] : ['Brems', 'Gass']); document.body.classList.add('kjorer'); document.body.classList.toggle('kjorbil', k.type === 'bil');
    logg(k.type === 'bil' ? (VW < 900 ? 'Du kjører feltbilen: styrespaken styrer og gir gass. «Gass» og «Brems» nede til høyre (hold «Brems» når bilen står for å rygge).' : 'Du kjører feltbilen: W gass, S brems og rygg, A/D styrer, mellomrom håndbrekk. F går ut.')
      : (VW < 900 ? 'Du flyr helikopteret: vent til rotoren går, hold «Opp» for å lette. Styrespaken flyr fram og svinger, «Ned» lander. «Gå ut» når du står på bakken.' : 'Du flyr helikopteret: vent til rotoren går, mellomrom opp, C ned, W/S fram og bak, A/D svinger, Q/E sidelengs. F går ut når du står på bakken.'));
    return true; }
  function ut(tving) { const R = r3(), k = fører(); if (!k) return false;
    if (k.type === 'heli' && !tving && R && R.ut && k.alt !== null && k.over > .3) { if (performance.now() - melding > 2500) { melding = performance.now(); logg('Land helikopteret før du går ut.'); } return false; }
    if (k.type === 'bil' && !tving && Math.abs(k.v) > 2) { if (performance.now() - melding > 2500) { melding = performance.now(); logg('Stopp bilen før du går ut.'); } return false; }
    k.motor = false; k.v = 0; k.vx = k.vy = 0; i = null; egen = null; lyd(null); Gange.settFører(null); document.body.classList.remove('kjorer', 'kjorbil'); pedal.gass = pedal.brems = false; lagre();
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
    // (runde 10) på telefonen: «Gass» gir full gass, «Brems» bremser – og rygger når bilen står. Styrespaken gir gass og styrer som før.
    let gass = I.fram, brems = !!(I.opp || I.ned); if (pedal.gass) gass = Math.max(gass, 1); if (pedal.brems) { if (k.v > .4) brems = true; else gass = -1; }
    if (k.type === 'bil') { const s = { x, y, z: 0, a: k.a, v: k.v }, r = bilSteg(s, { gass, sving: I.side, brems }, dt, V); Object.assign(k, { a: s.a, v: s.v }); x = s.x; y = s.y; k.z = s.z; k.over = 0;
      if (r.krasj) { const far = Math.abs(k.v) * 5; skad(k, Math.min(.3, far * far * .0009 + .03)); if (performance.now() - melding > 1500) { melding = performance.now(); logg(k.kj ? 'Du traff noe.' : `Du traff noe. Feltbilen: ${Math.round(k.hp * 100)} %.`); } } }
    else { if (k.alt === null) k.alt = hoyde3d(k.X, k.Y); const s = { x, y, z: (k.alt - u.h0) * R.EX, a: k.a, vx: k.vx, vy: k.vy, vz: k.vz, rotor: k.rotor, motor: true };
      const r = heliSteg(s, { fram: I.fram, gir: I.side, side: (sidelengs.e ? 1 : 0) - (sidelengs.q ? 1 : 0), opp: (I.opp ? 1 : 0) - (I.ned ? 1 : 0) }, dt, V);
      Object.assign(k, { a: s.a, vx: s.vx, vy: s.vy, vz: s.vz, rotor: s.rotor }); x = s.x; y = s.y; k.z = s.z; k.alt = s.z / R.EX + u.h0; k.over = r.over;
      if (r.hardt) { skad(k, .25); if (performance.now() - melding > 1500) { melding = performance.now(); logg(`Hard landing! Helikopteret: ${Math.round(k.hp * 100)} %.`); } }
      // helningen etter farten (nesa ned når du flyr fram)
      const [fx, fy] = fram(k.a), vf = k.vx * fx + k.vy * fy, vs = k.vx * fy - k.vy * fx; k.helning += ((r.landet ? 0 : vf / HELI.maks * .22) - k.helning) * Math.min(1, dt * 3); k.rull += ((r.landet ? 0 : vs / HELI.side * .18) - k.rull) * Math.min(1, dt * 3); }
    // ved kanten av utsnittet (det neste er ikke bygget ennå): stopp opp i stedet for å stange i en usynlig vegg
    if (Math.abs(x) > u.S * .93 || Math.abs(y) > u.S * .93) { k.v = Math.min(k.v || 0, 3); k.vx *= .9; k.vy *= .9; if (performance.now() - melding > 5000) { melding = performance.now(); logg('Venter på kartet lenger fram …'); } }
    k.X = u.cx + x; k.Y = u.cy + y; b.x = x; b.y = y; if (k.kj) { k.kj.x = k.X; k.kj.y = k.Y; k.kj.retning = k.a + Math.PI / 2; k.kj.sti = null; skitten = true; } const kr = Gange.kropp(); if (kr) { kr.x = x; kr.y = y; kr.z = k.z; kr.fart = 0; kr.vx = kr.vy = 0; if (kr.utholdenhet !== undefined) { kr.utholdenhet = 1; kr.sliten = false; } }
    // (runde 10, brukerens bilder 3–5: en lys strek lå over bilen = utholdenhetsstreken fra gange.js) du hviler mens du sitter på:
    // utholdenheten er full, og streken vises ikke. Farten står i ruta nede til høyre (spill/narhud.js).
    // kameraet: bak kjøretøyet. Ser du deg rundt (mus/dra), står kameraet der i to sekunder før det glir tilbake bak
    if (Math.abs(f.a - kamA) > 1e-4) kamTid = performance.now(); const fart = k.type === 'bil' ? Math.abs(k.v) : Math.hypot(k.vx, k.vy);
    if (performance.now() - kamTid > 2000 && fart > 1) { let d = k.a - f.a; d = Math.atan2(Math.sin(d), Math.cos(d)); f.a += d * Math.min(1, dt * 2.2); } kamA = f.a;
    // (runde 10, brukerens bilde 5: «nesten ok») bilen: kameraet litt høyere og lenger bak, ser på et punkt litt foran bilen, og glir mykt
    // etter (KAMERA_BIL – Claudes forslag), så både bilen og vegen foran synes.
    const KB = KAMERA_BIL, avst = k.type === 'bil' ? KB.avst : 17, opp = k.type === 'bil' ? KB.opp : 3.2, cp = Math.cos(f.pitch), c = R.cam;
    // står et hus mellom bilen og kameraet, kommer kameraet nærmere (ikke inne i veggen)
    // (runde 11, brukeren: kameraet gikk inn i trekronene i skogen) står en trekrone mellom bilen og kameraet, kommer kameraet også
    // nærmere – mykt: fort inn (treFor), sakte ut igjen (KAMERA_TRE)
    const hus = k.type === 'bil' ? husMellom(R, x, y, x + Math.sin(f.a) * cp * avst, y - Math.cos(f.a) * cp * avst) : 1;
    const treF = k.type === 'bil' ? treMellom(u, x, y, k.z + 1.6, x + Math.sin(f.a) * cp * avst, y - Math.cos(f.a) * cp * avst, k.z + opp - Math.sin(f.pitch) * avst) : 1;
    kamTre += (treF - kamTre) * Math.min(1, dt * (treF < kamTre ? KAMERA_TRE.inn : KAMERA_TRE.ut));
    const avstH = Math.max(2.6, avst * Math.min(hus, kamTre) - (hus < 1 ? 1 : 0)), oppH = opp * (.55 + .45 * avstH / avst);
    let cx = x + Math.sin(f.a) * cp * avstH, cy = y - Math.cos(f.a) * cp * avstH, cz = k.z + oppH - Math.sin(f.pitch) * avstH; const bak = Math.max((hoyde3d(u.cx + cx, u.cy + cy) - u.h0) * R.EX, V.høyde(cx, cy)) + 1; if (cz < bak) cz = bak;
    const [mx, my] = fram(f.a), mål = k.type === 'bil' ? [x + mx * KB.foran, y + my * KB.foran, k.z + KB.siktOpp] : [x, y, k.z + opp * .7];
    if (!kamP || Math.hypot(kamP.p[0] - cx, kamP.p[1] - cy) > 60) kamP = { p: [cx, cy, cz], m: mål.slice(), ok: true };
    else { const w = Math.min(1, dt * (k.type === 'bil' ? KB.følg : 8)); for (let q = 0; q < 3; q++) { kamP.p[q] += ([cx, cy, cz][q] - kamP.p[q]) * w; kamP.m[q] += (mål[q] - kamP.m[q]) * w; }
      const b2 = Math.max((hoyde3d(u.cx + kamP.p[0], u.cy + kamP.p[1]) - u.h0) * R.EX, V.høyde(kamP.p[0], kamP.p[1])) + 1; if (kamP.p[2] < b2) kamP.p[2] = b2;
      // henger kameraet etter inne i en trekrone, tar det igjen målet fort (ellers glir det gjennom greinene)
      if (k.type === 'bil' && iKrone(u, kamP.p[0], kamP.p[1], kamP.p[2])) { const w2 = Math.min(1, dt * KAMERA_TRE.ta); for (let q = 0; q < 3; q++) kamP.p[q] += ([cx, cy, cz][q] - kamP.p[q]) * w2; } }
    c.position.set(kamP.p[0], kamP.p[1], kamP.p[2]); c.up.set(0, 0, 1); c.lookAt(kamP.m[0], kamP.m[1], kamP.m[2]);
    R.scene.fog.near = 120; R.scene.fog.far = u.S * .95; c.fov = 62 + Math.min(10, fart * .25); c.aspect = VW / VH; c.near = .3; c.far = u.S * 4 + 3000; c.updateProjectionMatrix(); b.yaw = f.a;
    lyd(k); if (performance.now() - sistLagret > 5000) { sistLagret = performance.now(); lagre(); }
    return true; }
  // Hvor langt (0–1) fra (x0, y0) mot (x1, y1) det er til første husvegg (husomrissene i R.hindre; trær teller ikke). 1 = fritt.
  function husMellom(R, x0, y0, x1, y1) { const H = R.hindre; if (!H || !H.get) return 1; const L = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.ceil(L));
    const inni = (P, X, Y) => { let inn = false; for (let a = 0, b = P.length - 1; a < P.length; b = a++) { const p = P[a], q = P[b]; if ((p[1] > Y) !== (q[1] > Y) && X < (q[0] - p[0]) * (Y - p[1]) / (q[1] - p[1]) + p[0]) inn = !inn; } return inn; };
    for (let q = 1; q <= n; q++) { const t = q / n, X = x0 + (x1 - x0) * t, Y = y0 + (y1 - y0) * t;
      for (const o of H.get(Math.floor(X / 20) + ',' + Math.floor(Y / 20)) || []) { if (!o.P) continue; const b = o.bb; if (b && (X < b[0] || X > b[2] || Y < b[1] || Y > b[3])) continue; if (inni(o.P, X, Y)) return t; } }
    return 1; }
  // TREKRONENE (runde 11): trærne i utsnittet (u.trær: x, y, z, høyde, …) i ruter på 10 m, laget første gang de trengs per utsnitt.
  // KRONE per treslag (i trærnes egne mål, lest av modellene i index.html treGeo og spill/vegetasjon3d.js): kronen fra – til (andel av
  // høyden), radius (andel av høyden) og om den er en kjegle (gran: bredest nede) eller en klump (bredest midt i). Under kronen er
  // stammen (0,55 m). Claudes forslag (KAMERA_TRE): margin rundt kronen (m), inn/ut = hvor fort kameraet kommer nærmere / går tilbake
  // per sekund, ta = tar igjen målet når det henger etter inne i en krone.
  const KAMERA_TRE = { rute: 10, margin: .6, inn: 7, ut: 1.1, ta: 12 };
  const KRONE = { gran: [.08, 1, .33, 1], furu: [.55, 1, .28, 0], løv: [.35, 1, .25, 0], osp: [.45, 1, .3, 0], rogn: [.33, .92, .45, 0], fjellbjørk: [.3, .95, .4, 0],
    selje: [.22, .88, .45, 0], einer: [0, 1, .22, 0] };
  const KRONER = Object.keys(KRONE);
  const treMinne = new WeakMap();
  function treRute(u) { let T = treMinne.get(u); if (T) return T; T = new Map();
    for (const art in u.trær || {}) { const d = u.trær[art], nr = Math.max(0, KRONER.indexOf(art)); if (!d || !d.length) continue;
      for (let q = 0; q + 4 < d.length; q += 5) { if (!(d[q + 3] > 1.2)) continue; const key = Math.floor(d[q] / KAMERA_TRE.rute) * 65536 + Math.floor(d[q + 1] / KAMERA_TRE.rute); let l = T.get(key); if (!l) T.set(key, l = []); l.push(d[q], d[q + 1], d[q + 2], d[q + 3], nr); } }
    treMinne.set(u, T); return T; }
  // radius (m) til et tre i høyden z (andel t av treets høyde h), eller −1 over treet
  function kroneR(nr, h, t) { const [a, b, r, kjegle] = KRONE[KRONER[nr]]; if (t < -.1 || t > b + .05) return -1; if (t < a) return .55;
    if (kjegle) return r * h * (1 - t) / (1 - a) + KAMERA_TRE.margin;
    const c = (a + b) / 2, hh = (b - a) / 2, s = 1 - ((t - c) / hh) ** 2; return Math.max(.55, r * h * Math.sqrt(Math.max(0, s)) + KAMERA_TRE.margin); }
  function iKrone(u, x, y, z) { const T = treRute(u), C = KAMERA_TRE.rute, i0 = Math.floor(x / C), j0 = Math.floor(y / C);
    for (let i = i0 - 1; i <= i0 + 1; i++) for (let j = j0 - 1; j <= j0 + 1; j++) { const l = T.get(i * 65536 + j); if (!l) continue;
      for (let q = 0; q < l.length; q += 5) { const dx = x - l[q], dy = y - l[q + 1], h = l[q + 3]; if (dx * dx + dy * dy > h * h * .25 + 4) continue;
        const r = kroneR(l[q + 4], h, (z - l[q + 2]) / h); if (r > 0 && dx * dx + dy * dy < r * r) return true; } }
    return false; }
  // Hvor langt (0–1) fra bilen (x0, y0, z0) mot kameraet (x1, y1, z1) kameraet kan stå uten å være inne i en trekrone eller stamme
  // (også ca. 1 m foran og bak, så nærplanet ikke skjærer greinene). 1 = der det skal. Et tre MELLOM bilen og kameraet er greit (du ser
  // forbi det som i andre spill) – å trekke kameraet helt inn til taket for hver grein ga et dårligere bilde (prøvd).
  function treMellom(u, x0, y0, z0, x1, y1, z1) { if (!u || !u.trær) return 1; const L = Math.hypot(x1 - x0, y1 - y0, z1 - z0) || 1, e = 1 / L;
    const fri = t => ![t, t + e, t - e].some(v => iKrone(u, x0 + (x1 - x0) * v, y0 + (y1 - y0) * v, z0 + (z1 - z0) * v));
    for (let t = 1; t > .2; t -= .04) if (fri(t)) return t;
    return .2; }
  let kamTre = 1;
  // kameraet bak bilen (Claudes forslag): avstand og høyde (m), punktet det ser på (m foran bilen, m over bakken), hvor fort det følger (per s)
  const KAMERA_BIL = { avst: 9.6, opp: 3.0, foran: 5, siktOpp: 1.3, følg: 7 };
  let kamP = null;
  const sidelengs = { q: false, e: false };
  rot.addEventListener('keydown', e => { const k = e.key.toLowerCase(); if (k === 'q' || k === 'e') sidelengs[k] = true;
    if (k !== 'f' || e.repeat || /INPUT|TEXTAREA|SELECT/.test((e.target && e.target.tagName) || '')) return; const R = r3(); if (!R || !R.fot) return;
    if (fører()) ut(); else { const n = nær(R); if (n !== null) inn(n); else { const kj = egneNær(R, 9); if (kj) innEgen(kj); } } e.preventDefault(); });
  rot.addEventListener('keyup', e => { const k = e.key.toLowerCase(); if (k === 'q' || k === 'e') sidelengs[k] = false; });
  // nærmeste kjøretøy innen 8 m av deg (når du går)
  function nær(R) { const u = R.ut; if (!u || !R.fot || fører()) return null; let best = null, bd = 8; K.forEach((k, n) => { const d = Math.hypot(k.X - u.cx - R.bane.x, k.Y - u.cy - R.bane.y); if (d < bd) { bd = d; best = n; } }); return best; }

  // (runde 10, brukerens bilde 3–5: «to knapper heter Brems», «Gå ut står midt i bildet over bilen») På telefonen får bilen sine
  // egne knapper i den samme raden nede til høyre som Huk/Hopp (#gangeknapper): «Gå ut», «Brems» (rygger når bilen står) og «Gass»,
  // med tydelige tegn. Huk/Hopp skjules mens du kjører bil (helikopteret bruker dem fortsatt som Ned/Opp).
  const pedal = { gass: false, brems: false };
  const IKON = { gass: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4l7 8h-4v8H9v-8H5z" fill="currentColor"/></svg>',
    brems: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="5" width="14" height="14" rx="3" fill="none" stroke="currentColor" stroke-width="2.6"/><path d="M9 9h6v6H9z" fill="currentColor"/></svg>',
    ut: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 4H5v16h5M14 8l4 4-4 4M18 12H9" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>' };
  const pedalCss = document.createElement('style');
  pedalCss.textContent = `#gangeknapper > .pedal{ display:none; flex-direction:column; align-items:center; justify-content:center; gap:1px; padding:0; line-height:1; }
#gangeknapper > .pedal svg{ width:22px; height:22px; } #gangeknapper > .pedal span{ font-size:11.5px; letter-spacing:.02em; }
body.kjorbil #gangeknapper > .pedal{ display:flex; } body.kjorbil #gangeknapper > button:not(.pedal){ display:none; }
#gangeknapper > .pedal.gass{ border-color:rgba(159,196,106,.85); } #gangeknapper > .pedal.brems{ border-color:rgba(224,96,74,.85); } #gangeknapper > .pedal.ut{ border-color:rgba(201,178,106,.85); }
#gangeknapper > .pedal.holdt{ background:rgba(231,220,195,.38); }`;
  document.head.appendChild(pedalCss);
  function lagPedal(navn, tekst, holdt) { const b = document.createElement('button'); b.type = 'button'; b.className = 'pedal ' + navn; b.setAttribute('aria-label', tekst); b.innerHTML = IKON[navn] + '<span>' + tekst + '</span>';
    if (holdt) { b.addEventListener('pointerdown', e => { e.preventDefault(); pedal[navn] = true; b.classList.add('holdt'); try { b.setPointerCapture(e.pointerId); } catch (x) { /* eldre nettleser */ } });
      for (const t of ['pointerup', 'pointercancel', 'lostpointercapture']) b.addEventListener(t, () => { pedal[navn] = false; b.classList.remove('holdt'); }); }
    return b; }
  const pUt = lagPedal('ut', 'Gå ut', false), pBrems = lagPedal('brems', 'Brems', true), pGass = lagPedal('gass', 'Gass', true);
  pUt.addEventListener('click', e => { e.preventDefault(); if (fører()) ut(); });
  function festPedaler() { const mk = document.getElementById('gangeknapper'); if (!mk) return false; mk.append(pUt, pBrems, pGass); return true; }
  if (!festPedaler()) rot.addEventListener('DOMContentLoaded', festPedaler);

  // knappen midt nederst: «Sett deg inn» / «Gå ut»
  const css = document.createElement('style');
  css.textContent = `#kjorknapp{ position:fixed; left:50%; transform:translateX(-50%); bottom:calc(96px + env(safe-area-inset-bottom,0px)); z-index:6; display:none; min-width:190px; min-height:44px; padding:6px 18px;
  background:rgba(28,23,15,.92); border:1px solid #c9b26a; color:#f0e2b0; font:inherit; font-size:16px; cursor:pointer; } #kjorknapp.på{ display:block; }
body.kort #kjorknapp{ bottom:calc(226px + env(safe-area-inset-bottom,0px)); font-size:15px; min-width:170px; }
body.kjorer #kjorknapp{ left:auto; right:296px; transform:none; bottom:calc(136px + env(safe-area-inset-bottom,0px)); min-width:0; min-height:36px; padding:4px 14px; font-size:14px; }`;
  document.head.appendChild(css);
  const knapp = document.createElement('button'); knapp.id = 'kjorknapp'; knapp.type = 'button'; document.body.appendChild(knapp);
  knapp.addEventListener('click', e => { e.preventDefault(); const R = r3(); if (!R || !R.fot) return; if (fører()) ut(); else { const n = nær(R); if (n !== null) { if (K[n].hp < .15) reparer(n); else inn(n); } else { const kj = egneNær(R, 9); if (kj) innEgen(kj); } } });

  // hver ramme i 3D: modellene på plass, rotoren går rundt, knappen
  KROKER.ramme3d.push(R => { if (!klar || !R.ut || typeof THREE === 'undefined') return; const u = R.ut;
    if (!sett) sett = plasser(R, u);
    if (fører() && !R.fot) ut(true);
    for (const k of K) { const x = k.X - u.cx, y = k.Y - u.cy, m = modell(R, k); if (Math.abs(x) > u.S || Math.abs(y) > u.S) { m.visible = false; continue; } m.visible = true;
      const bak = (hoyde3d(k.X, k.Y) - u.h0) * R.EX; let z = bak;
      if (k === fører()) z = k.z; else if (k.type === 'heli') { if (k.alt !== null && k.alt > hoyde3d(k.X, k.Y) + .05) { k.vz = (k.vz || 0) - 4 * .016; k.alt = Math.max(hoyde3d(k.X, k.Y), k.alt + k.vz * .016); } z = k.alt !== null ? (k.alt - u.h0) * R.EX : bak; k.rotor = Math.max(0, k.rotor - .016 / HELI.spol); k.helning *= .95; k.rull *= .95; }
      else { const V = verdenFor(R, u, k); z = V.høyde(x, y); }
      m.position.set(x, y, z); m.rotation.set(k.type === 'heli' ? k.rull : 0, k.type === 'heli' ? k.helning : 0, k.a + Math.PI / 2);
      // (runde 10) bilen står på fire hjul: vinklene fra høyden under hvert hjul (begrenset), glattet over tid, og z slik at ingen hjul
      // står under bakken. Før ble nesa og siden regnet fra to punkter hver – et vegdekke under det ene ga bilen på skrå eller på siden.
      if (k.type === 'bil') { const V = verdenFor(R, u, k), p = stilling(x, y, k.a, V.høyde), dt = Math.min(.1, Math.max(.001, (performance.now() - (k.tStill || 0)) / 1000)), w = Math.min(1, dt * STILLING.glatt);
        if (!k.tStill || k.sSt === undefined || Math.abs(p.z - (k.sZ || 0)) > 6) { k.sSt = p.stigning; k.sSd = p.side; } else { k.sSt += (p.stigning - k.sSt) * w; k.sSd += (p.side - k.sSd) * w; }
        k.tStill = performance.now(); k.sZ = zFor(p.hjul, k.sSt, k.sSd); m.rotation.y = k.sSt; m.rotation.x = k.sSd; m.position.z = k.sZ; }
      if (k.ro) { k.ro.rotation.z += k.rotor * 38 * .016; k.hr.rotation.z += k.rotor * 60 * .016; } }
    const n = nær(R), f = fører(), ek = !f && n === null && R.fot ? egneNær(R, 9) : null, t = ek ? innTekst(ek.navn, retning(ek.x - R.ut.cx - R.bane.x, ek.y - R.ut.cy - R.bane.y, R.fot ? R.fot.a : 0), VW < 900 ? '' : ' (F)') : f ? (VW < 900 ? 'Gå ut' : 'Gå ut (F)') : n !== null && K[n].hp < .15 ? `Reparer ${NAVN[K[n].type].toLowerCase()}${K[n].type === 'bil' ? 'en' : 'et'} (${Math.round(repPris(K[n]) / 1000)} 000 kr)` : n !== null ? innTekst(NAVN[K[n].type].toLowerCase() + (K[n].type === 'bil' ? 'en' : 'et'), retning(K[n].X - R.ut.cx - R.bane.x, K[n].Y - R.ut.cy - R.bane.y, R.fot ? R.fot.a : 0), VW < 900 ? '' : ' (F)') : '';
    // på telefonen står «Gå ut» i knapperaden nede til høyre (pUt) – da vises ikke den store knappen
    const iRaden = !!f && f.type === 'bil' && pUt.offsetParent !== null;
    knapp.classList.toggle('på', !!t && !!R.fot && !iRaden); if (t && knapp.textContent !== t) knapp.textContent = t; });
  setInterval(() => { const R = r3(); if (!R || !R.fot || typeof på3d === 'undefined' || !på3d) knapp.classList.remove('på'); }, 500);

  // farten, høyden og rotoren nederst i bildet
  KROKER.tegn3d.push(g => { const k = fører(); if (!k || window.NarHud) return; g.save(); g.font = '600 15px sans-serif'; g.textAlign = 'center'; g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,.7)'; g.fillStyle = '#f0e2b0';
    const fart = k.type === 'bil' ? Math.abs(k.v) : Math.hypot(k.vx, k.vy), t = k.type === 'bil' ? `${Math.round(fart * 3.6)} km/t${k.v < -.3 ? ' · rygger' : ''}` : k.rotor < .9 ? `Rotoren spoler opp … ${Math.round(k.rotor / .9 * 100)} %` : `${Math.round(fart * 3.6)} km/t · ${Math.round(Math.max(0, k.over || 0))} m over bakken`;
    const y = VH - (VW < 900 ? 190 : 46); g.strokeText(t, VW / 2, y); g.fillText(t, VW / 2, y); g.restore(); });
  // 2D-kartet: et lite merke der kjøretøyene står
  KROKER.tegn.push((g, vx0, vy1) => { if (!klar || kam.m > 6) return; g.save(); g.font = '11px sans-serif'; g.textAlign = 'center';
    for (const k of K) { const x = (k.X - vx0) / kam.m, y = (vy1 - k.Y) / kam.m; if (x < -20 || y < -20 || x > VW + 20 || y > VH + 20) continue;
      g.fillStyle = 'rgba(22,18,12,.8)'; g.strokeStyle = '#d8c98a'; g.lineWidth = 1.2; g.beginPath(); g.arc(x, y, 7, 0, 6.283); g.fill(); g.stroke(); g.fillStyle = '#d8c98a'; g.textBaseline = 'middle'; g.fillText(k.type === 'bil' ? 'B' : 'H', x, y + .5); g.textBaseline = 'alphabetic';
      if (kam.m < 1.2) { const t = NAVN[k.type], ty = rot.Etikett ? Etikett.tekst(g, t, x, y + 20, 1) : y + 20; g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,.7)'; g.strokeText(t, x, ty); g.fillStyle = '#f2ead6'; g.fillText(t, x, ty); } }
    g.restore(); });
  rot.KjorSpill = { KAMERA_TRE, KRONE, kroneU: { iKrone, treMellom }, iKrone: (x, y, z) => (r3() && R3.ut ? iKrone(R3.ut, x, y, z) : false), treMellom: (...a) => (r3() && R3.ut ? treMellom(R3.ut, ...a) : 1), kamTre: () => kamTre, verden: k => { const R = r3(), f = k || fører() || K[0]; return R && R.ut && f ? verdenFor(R, R.ut, f) : null; }, innEgen, egneNær: () => (r3() && R3.fot ? egneNær(R3, 9) : null), reparer, skad, repPris, start, liste: () => K, fører, inn, ut, nær: () => (r3() ? nær(R3) : null), lagre, plassert: () => sett };
})(typeof window !== 'undefined' ? window : globalThis);
