// Test for spill/bevegelse.js: node pipeline/fliser/test_bevegelse.js
const B = require('../../site/dovre-fliser/spill/bevegelse.js'), R = B.REGLER;
let feil = 0; const ok = (b, t) => { console.log((b ? 'ok   ' : 'FEIL ') + t); if (!b) feil++; };
const flatt = { høyde: () => 100 }, kjør = (s, inn, sek, v = flatt) => { let k; for (let i = Math.round(sek * 60); i > 0; i--) k = B.steg(s, inn, 1 / 60, v); return k; };
let s = B.ny(0, 0, 100); B.steg(s, { fram: 1 }, 1 / 60, flatt); ok(s.fart > 0 && s.fart < .3, 'myk start: ' + s.fart.toFixed(2) + ' m/s etter første ramme');
kjør(s, { fram: 1 }, 1); ok(Math.abs(s.fart - R.gå) < .01 && s.y > 1, 'gange: 1,7 m/s mot nord');
kjør(s, {}, .2); ok(s.fart < .01, 'bremser til stopp på 0,2 s');
s = B.ny(0, 0, 100); kjør(s, { fram: 1, løp: true }, 2); ok(Math.abs(s.fart - R.løp) < .01, 'løping: 5,5 m/s');
let t = 2; while (!s.sliten && t < 20) { kjør(s, { fram: 1, løp: true }, .1); t += .1; } kjør(s, { fram: 1, løp: true }, .3);
ok(s.sliten && Math.abs(t - 12) < .3 && Math.abs(s.fart - R.gå) < .2, `etter ${t.toFixed(1)} s løping er du sliten og går`);
kjør(s, {}, .8); ok(s.sliten, 'må hvile litt før du kan løpe igjen'); kjør(s, {}, 1); ok(!s.sliten && s.utholdenhet >= .25, 'etter ca. 1,5 s hvile kan du løpe igjen');
s = B.ny(0, 0, 100); kjør(s, { fram: 1, huk: true }, 1); ok(Math.abs(s.fart - R.huk) < .01 && Math.abs(s.øye - 1) < .02, 'på huk: 0,9 m/s og øynene 1 m over bakken');
s = B.ny(0, 0, 100); B.steg(s, { hopp: true }, 1 / 60, flatt); let top = 0; for (let i = 0; i < 120; i++) { B.steg(s, {}, 1 / 60, flatt); top = Math.max(top, s.z - 100); }
ok(top > .8 && top < 1 && s.bakke && s.z === 100, 'hopp: ' + top.toFixed(2) + ' m høyt, lander igjen');
// bakker: 20 % motbakke tregere, 100 % (45°) stopper
const bakke20 = { høyde: (x, y) => 100 + y * .2 }, bratt = { høyde: (x, y) => 100 + Math.max(0, y - 1) * 1 };
s = B.ny(0, 0, 100); kjør(s, { fram: 1 }, 2, bakke20); ok(s.fart < R.gå * .85 && s.fart > R.gå * .7, 'motbakke 20 %: ' + s.fart.toFixed(2) + ' m/s');
s = B.ny(0, 0, 100); kjør(s, { fram: 1 }, 3, bratt); ok(s.y < 1.3, 'bratt (45°): stopper ved foten (y = ' + s.y.toFixed(2) + ')');
// vegg: glir langs; vann: stopper
const vegg = { høyde: () => 100, hindring: (x, y) => y > 2 }; s = B.ny(0, 0, 100); kjør(s, { fram: 1, side: 1 }, 3, vegg);
ok(s.y < 2 && s.y > 1.5 && s.x > 2.5, 'går skrått mot en vegg: glir langs den (x = ' + s.x.toFixed(1) + ')');
const vann = { høyde: () => 100, vann: (x, y) => y > 3 }; s = B.ny(0, 0, 100); kjør(s, { fram: 1 }, 4, vann); ok(s.y <= 3 && s.y > 2.5, 'stopper i vannkanten');
const k = B.steg(B.ny(0, 0, 100), {}, 1 / 60, flatt); ok(Math.abs(k.kz - 101.7) < .05, 'øynene 1,7 m over bakken');
process.exit(feil ? 1 : 0);
