// Test av reglene i spill/kjor.js (uten DOM): bilen og helikopteret.
const K = require('../../site/dovre-fliser/spill/kjor.js'); let feil = 0;
const ok = (b, t) => { console.log((b ? 'ok   ' : 'FEIL ') + t); if (!b) feil++; };
const flat = { høyde: () => 0, hindring: () => false, vann: () => false, vei: () => true };
const kjør = (k, inn, sek, v = flat) => { let r = {}; for (let t = 0; t < sek; t += .02) r = K.bilSteg(k, inn, .02, v); return r; };
{ const k = { x: 0, y: 0, z: 0, a: 0, v: 0 }; kjør(k, { gass: 1 }, 30); ok(k.v > 24 && k.v <= K.BIL.maksVei + .01 && k.y > 400 && Math.abs(k.x) < 1e-6, `bilen på veg: ${(k.v * 3.6).toFixed(0)} km/t rett nordover (${k.y.toFixed(0)} m på 30 s)`); }
{ const k = { x: 0, y: 0, z: 0, a: 0, v: 0 }; kjør(k, { gass: 1 }, 30, { ...flat, vei: () => false }); ok(k.v <= K.BIL.maksTerreng + .01 && k.v > 9, `i terrenget går den saktere (${(k.v * 3.6).toFixed(0)} km/t)`); }
{ const k = { x: 0, y: 0, z: 0, a: 0, v: 20 }; kjør(k, { brems: true }, 3); ok(k.v === 0, 'bremsen stopper bilen'); kjør(k, { gass: -1 }, 5); ok(k.v < -3 && k.v >= -K.BIL.rygg && k.y < 0, 'S rygger'); }
{ const k = { x: 0, y: 0, z: 0, a: 0, v: 8 }; kjør(k, { gass: .5, sving: 1 }, 2); ok(k.x > 1 && k.a < 0, 'sving til høyre går østover'); }
{ const k = { x: 0, y: 0, z: 0, a: 0, v: 15 }; const r = kjør(k, { gass: 1 }, 3, { ...flat, hindring: (x, y) => y > 20 }); ok(k.y < 20 && Math.abs(k.v) < 3, 'en vegg stopper bilen'); }
{ const k = { x: 0, y: 0, z: 0, a: 0, v: 5 }; kjør(k, { gass: 1 }, 5, { ...flat, vann: (x, y) => y > 10 }); ok(k.y < 10, 'bilen kjører ikke ut i vann'); }
{ const k = { x: 0, y: 0, z: 0, a: 0, v: 0 }; kjør(k, { gass: 1 }, 10, { ...flat, høyde: (x, y) => Math.max(0, y) }); ok(k.y < 3, 'for bratt (45°): kommer ikke opp'); }
// (runde 10) stillingen på fire hjul: flat, bakke, sideheng; aldri mer vinkel enn bilen tåler, ingen hjul under bakken
{ const S = K.STILLING, p = K.stilling(0, 0, 0, () => 3); ok(p.stigning === 0 && p.side === 0 && Math.abs(p.z - 3) < 1e-9, 'flat bakke: står rett'); }
{ const S = K.STILLING, p = K.stilling(0, 0, 0, (x, y) => y * .2); ok(p.stigning < -.15 && p.stigning > -.25 && Math.abs(p.side) < 1e-9, `motbakke 20 %: nesa opp ${(-p.stigning * 57.3).toFixed(0)}°`); }
{ const S = K.STILLING, h = (x, y) => -x * 1.2, p = K.stilling(0, 0, 0, h), off = (sx, sy) => -sx * S.hx * Math.sin(p.stigning) + sy * S.hy * Math.sin(p.side) * Math.cos(p.stigning);
  const hj = K.hjulHøyder(0, 0, 0, h), under = [[1, 1], [1, -1], [-1, 1], [-1, -1]].some(([sx, sy], n) => p.z + off(sx, sy) < hj[n] - 1e-9);
  ok(Math.abs(p.side) <= S.maksSide + 1e-9 && p.side > 0, `bratt sideheng (50°): vipper bare ${(p.side * 57.3).toFixed(0)}°, venstre side opp`); ok(!under, 'ingen hjul under bakken'); }
{ const S = K.STILLING, p = K.stilling(0, 0, 0, (x, y) => (x > .5 ? 2 : 0)); ok(Math.abs(p.side) <= S.maksSide + 1e-9 && p.z >= 0, `kant (2 m) under ett hjulpar: ${(Math.abs(p.side) * 57.3).toFixed(0)}°, ikke på siden`); }
{ const k = { x: 0, y: 0, z: 0, a: 0, v: 0 }, h = (x, y) => (x < -3 ? (-3 - x) * 1.0 : 0); let maks = 0; for (let t = 0; t < 6; t += .02) { K.bilSteg(k, { gass: 1, sving: -1 }, .02, { ...flat, høyde: h }); if (k.x < -4) maks = Math.max(maks, Math.abs(k.v)); }
  ok(maks <= K.STILLING.krabbe + .01, `inn i et sideheng på 45°: bare krabbefart (${maks.toFixed(1)} m/s)`); }
{ const k = { x: 0, y: 0, z: 0, a: -Math.PI / 2, v: 0 }, h = (x, y) => Math.max(0, x - 3) * 1.0; kjør(k, { gass: 1 }, 6, { ...flat, høyde: h }); ok(k.x < 4.5, `rett opp en 45° bakke: stopper (x = ${k.x.toFixed(1)})`); }
{ const k = { x: 0, y: 0, z: 0, a: 0, v: 0 }, h = (x, y) => -x * 1.1; kjør(k, {}, 3, { ...flat, høyde: h }); ok(k.x > 2, `står i 48° heng: sklir nedover (${k.x.toFixed(1)} m)`); }
{ const k = { x: 0, y: 0, z: 0, a: 0, v: 0 }, h = (x, y) => Math.max(0, y) * .68; kjør(k, { gass: 1 }, 4, { ...flat, høyde: h }); ok(k.y > 5, `en 34° bakke klarer den (${k.y.toFixed(0)} m på 4 s)`); }
{ const k = { x: 0, y: 0, z: 0, a: 0, v: 0 }, h = (x, y) => -x * .7; const x0 = k.x; kjør(k, { gass: 1 }, 4, { ...flat, høyde: h }); ok(k.y > 5 && k.x > x0, `langs et 35° sideheng: kryper fram og sklir litt ned (y ${k.y.toFixed(1)}, x ${k.x.toFixed(1)}) – sitter ikke fast`);
  const y1 = k.y; kjør(k, { gass: -1 }, 3, { ...flat, høyde: h }); ok(k.y < y1 - 2, 'og kan rygge ut igjen'); }
const fly = (h, inn, sek, v = flat) => { let r = {}; for (let t = 0; t < sek; t += .02) r = K.heliSteg(h, inn, .02, v); return r; };
const ny = () => ({ x: 0, y: 0, z: 0, a: 0, vx: 0, vy: 0, vz: 0, rotor: 0, motor: true });
{ const h = ny(); fly(h, { opp: 1 }, 1.5); ok(h.z === 0 && h.rotor < .9, 'rotoren må spole opp før helikopteret letter'); fly(h, { opp: 1 }, 6); ok(h.z > 20, `så stiger det (${h.z.toFixed(0)} m)`); }
{ const h = ny(); h.rotor = 1; fly(h, { opp: 1 }, 5); fly(h, {}, 2); const z = h.z; const r = fly(h, { fram: 1 }, 12); ok(h.y > 250 && Math.abs(h.z - z) < .5 && Math.hypot(h.vx, h.vy) <= K.HELI.maks + .01 && !r.landet, `flyr framover i samme høyde (${(Math.hypot(h.vx, h.vy) * 3.6).toFixed(0)} km/t)`);
  fly(h, { gir: 1 }, 1); ok(h.a < 0, 'A/D svinger'); const r2 = fly(h, { opp: -1 }, 30); ok(r2.landet && h.z === 0 && Math.hypot(h.vx, h.vy) < .5, 'ned til bakken: landet og står stille'); }
{ const h = ny(); h.rotor = 1; fly(h, { fram: 1 }, 3); ok(h.y === 0, 'på bakken flyr det ikke framover'); }
{ const h = ny(); h.rotor = 1; h.z = 4; const r = fly(h, { fram: 1 }, 6, { ...flat, hindring: (x, y) => y > 30 }); ok(h.y <= 30, 'lavt: hus og trær stopper det'); h.z = 30; h.y = 0; fly(h, { fram: 1 }, 6, { ...flat, hindring: (x, y) => y > 30 }); ok(h.y > 60, 'høyt: flyr over'); }
{ const h = ny(); h.rotor = 1; h.z = 20; fly(h, { opp: -1 }, 20, { ...flat, vann: () => true }); ok(Math.abs(h.z - 1.5) < 1e-9, 'over vann holder det seg 1,5 m oppe'); }
{ const h = ny(); h.rotor = 1; h.z = 50; h.motor = false; const r = fly(h, {}, 12); ok(h.z === 0, 'uten motor synker det til bakken'); }
// (runde 13) hvor bilen står sett fra deg: du ser nordover (a = 0), øst er til høyre
{ const r = K.retning(0, 6, 0); ok(r.foran && r.tekst === 'foran deg' && Math.abs(r.d - 6) < 1e-9, 'bil 6 m nord, du ser nord: foran deg'); ok(K.innTekst('feltbilen', r, ' (F)') === 'Sett deg inn i feltbilen (F)', 'foran: knappen som før'); }
{ const r = K.retning(0, -6, 0); ok(!r.foran && r.tekst === 'bak deg', 'bil sør for deg: bak deg'); ok(K.innTekst('feltbilen', r, ' (F)') === 'Feltbilen 6 m bak deg · Sett deg inn (F)', 'bak: avstand og retning på knappen'); }
{ ok(K.retning(5, 0, 0).tekst === 'til høyre' && K.retning(-5, 0, 0).tekst === 'til venstre', 'øst = til høyre, vest = til venstre når du ser nord'); }
{ const a = Math.PI / 2, f = K.fram(a), r = K.retning(f[0] * 4, f[1] * 4, a); ok(r.foran, 'bilen rett i synsretningen er foran også når du ser vest'); ok(K.retning(-f[1] * 4, f[0] * 4, a).tekst === 'til venstre', 'og 90° mot klokka er til venstre'); }
{ ok(K.innTekst('feltbilen', K.retning(0, -.2, 0), '') === 'Feltbilen 1 m bak deg · Sett deg inn', 'telefon: uten (F), minst 1 m'); }
console.log(feil ? feil + ' feil' : 'alle kjøretestene ok'); process.exit(feil ? 1 : 0);
