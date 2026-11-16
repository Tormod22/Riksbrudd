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
const fly = (h, inn, sek, v = flat) => { let r = {}; for (let t = 0; t < sek; t += .02) r = K.heliSteg(h, inn, .02, v); return r; };
const ny = () => ({ x: 0, y: 0, z: 0, a: 0, vx: 0, vy: 0, vz: 0, rotor: 0, motor: true });
{ const h = ny(); fly(h, { opp: 1 }, 1.5); ok(h.z === 0 && h.rotor < .9, 'rotoren må spole opp før helikopteret letter'); fly(h, { opp: 1 }, 6); ok(h.z > 20, `så stiger det (${h.z.toFixed(0)} m)`); }
{ const h = ny(); h.rotor = 1; fly(h, { opp: 1 }, 5); fly(h, {}, 2); const z = h.z; const r = fly(h, { fram: 1 }, 12); ok(h.y > 250 && Math.abs(h.z - z) < .5 && Math.hypot(h.vx, h.vy) <= K.HELI.maks + .01 && !r.landet, `flyr framover i samme høyde (${(Math.hypot(h.vx, h.vy) * 3.6).toFixed(0)} km/t)`);
  fly(h, { gir: 1 }, 1); ok(h.a < 0, 'A/D svinger'); const r2 = fly(h, { opp: -1 }, 30); ok(r2.landet && h.z === 0 && Math.hypot(h.vx, h.vy) < .5, 'ned til bakken: landet og står stille'); }
{ const h = ny(); h.rotor = 1; fly(h, { fram: 1 }, 3); ok(h.y === 0, 'på bakken flyr det ikke framover'); }
{ const h = ny(); h.rotor = 1; h.z = 4; const r = fly(h, { fram: 1 }, 6, { ...flat, hindring: (x, y) => y > 30 }); ok(h.y <= 30, 'lavt: hus og trær stopper det'); h.z = 30; h.y = 0; fly(h, { fram: 1 }, 6, { ...flat, hindring: (x, y) => y > 30 }); ok(h.y > 60, 'høyt: flyr over'); }
{ const h = ny(); h.rotor = 1; h.z = 20; fly(h, { opp: -1 }, 20, { ...flat, vann: () => true }); ok(Math.abs(h.z - 1.5) < 1e-9, 'over vann holder det seg 1,5 m oppe'); }
{ const h = ny(); h.rotor = 1; h.z = 50; h.motor = false; const r = fly(h, {}, 12); ok(h.z === 0, 'uten motor synker det til bakken'); }
console.log(feil ? feil + ' feil' : 'alle kjøretestene ok'); process.exit(feil ? 1 : 0);
